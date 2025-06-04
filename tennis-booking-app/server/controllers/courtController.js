// server/controllers/courtController.js
const mongoose = require('mongoose'); // Added for ObjectId.isValid check
const Court = require('../models/Court');
const Booking = require('../models/Booking');
const { asyncHandler } = require('../middleware/errorMiddleware');
const emailService = require('../utils/emailService'); // Corrected and ensured import

// @desc    Get all courts, optionally with available slots, and support searching
// @route   GET /api/courts
// @access  Public
const getCourts = asyncHandler(async (req, res) => {
  const { date, type, surface, showInactive, searchTerm, includeDetails, page = 1, limit = 1000 } = req.query; // Added pagination, default limit high for non-paginated frontend

  const filter = {};
  if (!showInactive || showInactive === 'false') {
    filter.isActive = true;
  }
  if (type) filter.type = type;
  if (surface) filter.surface = surface;

  if (searchTerm) {
    const regex = new RegExp(searchTerm, 'i');
    filter.$or = [
      { name: { $regex: regex } },
      { description: { $regex: regex } }
    ];
  }

  let courtsQuery = Court.find(filter).sort('name');
  const totalCourtsMatchingFilter = await Court.countDocuments(filter); // Get total count for pagination if needed

  // Basic pagination if params are provided by client, otherwise fetch all matching
  // Note: If client-side pagination is used on `Courts.jsx` for the main list,
  // this server-side pagination might not be fully utilized unless client sends page/limit.
  // For now, keeping a high default limit to return most/all courts if not paginated by client.
  // const pageNum = parseInt(page, 10);
  // const limitNum = parseInt(limit, 10);
  // courtsQuery = courtsQuery.skip((pageNum - 1) * limitNum).limit(limitNum);


  // Conditional select based on whether detailed info (like blocks for availability) is needed
  if (!date && (!includeDetails || includeDetails === 'false')) {
    courtsQuery = courtsQuery.select('-blocks -operatingHours -pricing.peakHours -amenities -location -images');
  } else {
    // When date is present for availability, or details are explicitly requested,
    // ensure 'blocks' and 'operatingHours' are fetched.
    // Default behavior (no .select()) fetches all fields.
  }

  const courts = await courtsQuery;

  if (date) {
    const requestedDate = new Date(date); // User's local date
    // Normalize requestedDate to UTC midnight for consistent date-only operations
    const normalizedQueryDate = new Date(Date.UTC(requestedDate.getUTCFullYear(), requestedDate.getUTCMonth(), requestedDate.getUTCDate()));

    const durationMinutes = 60; // Fixed slot duration

    // Fetch bookings only for the courts that passed the initial filter for efficiency
    const courtIds = courts.map(c => c._id);
    const bookingsForDate = await Booking.find({
      court: { $in: courtIds },
      date: normalizedQueryDate, // Query against normalized UTC date
      status: { $in: ['confirmed', 'pending'] },
    });

    const courtsWithAvailability = await Promise.all(
      courts.map(async (court) => {
        const courtObj = court.toObject();

        if (!court.isActive || court.maintenanceMode) {
          return { ...courtObj, availableSlots: [], reason: "Court is not active or in maintenance." };
        }
        
        const operatingHours = court.getOperatingHoursForDate(normalizedQueryDate); // Pass normalized date
        if (!operatingHours || !operatingHours.open || !operatingHours.close) {
          return { ...courtObj, availableSlots: [], reason: "Operating hours not defined for this day." };
        }

        const slots = [];
        const [openHour, openMinute] = operatingHours.open.split(':').map(Number);
        const [closeHour, closeMinute] = operatingHours.close.split(':').map(Number);

        const startTotalMinutes = openHour * 60 + openMinute;
        const endTotalMinutes = closeHour * 60 + closeMinute;
        const slotStep = court.bookingRules?.slotIncrementMinutes || 30;

        for (let currentMinute = startTotalMinutes; currentMinute + durationMinutes <= endTotalMinutes; currentMinute += slotStep) {
          const slotStartHour = Math.floor(currentMinute / 60);
          const slotStartMin = currentMinute % 60;
          const slotEndHour = Math.floor((currentMinute + durationMinutes) / 60);
          const slotEndMin = (currentMinute + durationMinutes) % 60;

          const startTimeString = `${slotStartHour.toString().padStart(2, '0')}:${slotStartMin.toString().padStart(2, '0')}`;
          const endTimeString = `${slotEndHour.toString().padStart(2, '0')}:${slotEndMin.toString().padStart(2, '0')}`;

          // Construct slot DateTimes in UTC for comparison with block DateTimes (which should also be UTC)
          const slotStartDateTime = new Date(Date.UTC(normalizedQueryDate.getUTCFullYear(), normalizedQueryDate.getUTCMonth(), normalizedQueryDate.getUTCDate(), slotStartHour, slotStartMin));
          const slotEndDateTime = new Date(Date.UTC(normalizedQueryDate.getUTCFullYear(), normalizedQueryDate.getUTCMonth(), normalizedQueryDate.getUTCDate(), slotEndHour, slotEndMin));
          
          const isBooked = bookingsForDate.some(
            (b) =>
              b.court.toString() === court._id.toString() &&
              b.startTime < endTimeString && // String comparison for HH:MM
              b.endTime > startTimeString
          );

          let isBlockedByAdmin = false;
          if (court.blocks && court.blocks.length > 0) {
            isBlockedByAdmin = court.blocks.some((block) => {
              const blockStart = new Date(block.startDateTime); // Assuming blocks are stored in UTC
              const blockEnd = new Date(block.endDateTime);   // Assuming blocks are stored in UTC
              return slotStartDateTime < blockEnd && slotEndDateTime > blockStart;
            });
          }

          if (!isBooked && !isBlockedByAdmin) {
            slots.push({
              startTime: startTimeString,
              endTime: endTimeString,
              available: true,
            });
          }
        }
        // Clean up potentially large fields from individual court objects if not needed by client for slot view
        // e.g., if blocks were fetched but only used for calculation above.
        // delete courtObj.blocks; 
        return {
          ...courtObj,
          availableSlots: slots,
        };
      })
    );

    res.json({
      success: true,
      count: courtsWithAvailability.length,
      data: courtsWithAvailability,
    });
  } else {
    res.json({
      success: true,
      count: courts.length, // or totalCourtsMatchingFilter if using server-side pagination
      // pagination: { // if server-side pagination is implemented
      //   page: pageNum,
      //   limit: limitNum,
      //   pages: Math.ceil(totalCourtsMatchingFilter / limitNum)
      // },
      data: courts,
    });
  }
});

// @desc    Get single court
// @route   GET /api/courts/:id
// @access  Public
const getCourt = asyncHandler(async (req, res) => {
  const court = await Court.findById(req.params.id)
    .populate('blocks.createdBy', 'username firstName lastName');

  if (!court) {
    res.status(404);
    throw new Error('Court not found');
  }
  res.json({ success: true, data: court });
});

// @desc    Create new court
// @route   POST /api/courts
// @access  Private/Admin
const createCourt = asyncHandler(async (req, res) => {
  // Consider adding input validation here or via middleware
  const court = await Court.create(req.body);
  res.status(201).json({ success: true, data: court });
});

// @desc    Update court
// @route   PUT /api/courts/:id
// @access  Private/Admin
const updateCourt = asyncHandler(async (req, res) => {
  const courtId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(courtId)) {
    res.status(400);
    throw new Error('Invalid Court ID format');
  }

  let court = await Court.findById(courtId);
  if (!court) {
    res.status(404);
    throw new Error('Court not found');
  }
  
  // Prevent direct update of blocks array via this general update endpoint.
  // Blocks should be managed via /block and /unblock endpoints.
  const { blocks, ...updateData } = req.body;

  court = await Court.findByIdAndUpdate(courtId, updateData, {
    new: true, // Return the modified document
    runValidators: true, // Ensure schema validations are run
  });
  res.json({ success: true, data: court });
});

// @desc    Delete court
// @route   DELETE /api/courts/:id
// @access  Private/Admin
const deleteCourt = asyncHandler(async (req, res) => {
  const courtId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(courtId)) {
    res.status(400);
    throw new Error('Invalid Court ID format');
  }
  const court = await Court.findById(courtId);
  if (!court) {
    res.status(404);
    throw new Error('Court not found');
  }

  const todayNormalized = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
  const futureBookings = await Booking.countDocuments({
    court: courtId,
    date: { $gte: todayNormalized },
    status: { $in: ['confirmed', 'pending'] },
  });

  if (futureBookings > 0) {
    res.status(400);
    throw new Error(`Cannot delete court. It has ${futureBookings} upcoming booking(s). Please cancel them first.`);
  }
  await court.deleteOne();
  res.json({ success: true, message: 'Court deleted successfully', data: {} });
});

// @desc    Block court
// @route   POST /api/courts/:id/block
// @access  Private/Admin
const blockCourt = asyncHandler(async (req, res) => {
  const courtId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(courtId)) {
    res.status(400);
    throw new Error('Invalid Court ID format');
  }
  const { reason, description, startDateTime, endDateTime, isRecurring, recurringPattern, recurringEndDate } = req.body;
  
  const court = await Court.findById(courtId);
  if (!court) {
    res.status(404); throw new Error('Court not found');
  }

  const blockStart = new Date(startDateTime);
  const blockEnd = new Date(endDateTime);

  if (isNaN(blockStart.getTime()) || isNaN(blockEnd.getTime())) {
    res.status(400); throw new Error('Invalid start or end date/time for the block.');
  }
  if (blockStart >= blockEnd) {
    res.status(400); throw new Error('Block end date/time must be after start date/time.');
  }

  const newBlock = {
    reason: reason || 'Other', description, startDateTime: blockStart, endDateTime: blockEnd,
    createdBy: req.user._id, isRecurring: isRecurring || false,
    recurringPattern: isRecurring ? recurringPattern : undefined,
    recurringEndDate: isRecurring ? new Date(recurringEndDate) : undefined,
  };
  court.blocks.push(newBlock);
  await court.save();

  // Cancel affected bookings
  const affectedBookings = await Booking.find({
    court: court._id, status: 'confirmed',
  }).populate('user', 'email firstName username'); // Populate necessary user fields

  let cancelledCount = 0;
  for (const booking of affectedBookings) {
    const bookingDateNormalized = new Date(Date.UTC(booking.date.getUTCFullYear(), booking.date.getUTCMonth(), booking.date.getUTCDate()));
    const [bStartH, bStartM] = booking.startTime.split(':').map(Number);
    const bookingStartDt = new Date(bookingDateNormalized);
    bookingStartDt.setUTCHours(bStartH, bStartM, 0, 0);

    const [bEndH, bEndM] = booking.endTime.split(':').map(Number);
    const bookingEndDt = new Date(bookingDateNormalized);
    bookingEndDt.setUTCHours(bEndH, bEndM, 0, 0);

    if (bookingStartDt < blockEnd && bookingEndDt > blockStart) {
      booking.status = 'cancelled';
      booking.cancellationReason = `Court automatically cancelled due to administrative block: ${reason || 'general maintenance/event'}. Period: ${blockStart.toLocaleString()} - ${blockEnd.toLocaleString()}. ${description || ''}`.trim();
      booking.cancelledBy = req.user._id;
      booking.cancelledAt = new Date();
      await booking.save();
      cancelledCount++;
      if (booking.user && booking.user.email) {
        try {
          await emailService.sendBookingCancellation(booking.user, booking, court);
        } catch (emailError) {
          console.error(`Failed to send cancellation email to ${booking.user.email} for booking ${booking._id}:`, emailError);
        }
      }
    }
  }
  const updatedCourt = await Court.findById(courtId).populate('blocks.createdBy', 'username firstName lastName');
  res.json({
    success: true,
    message: `Court '${court.name}' blocked successfully. ${cancelledCount} booking(s) were cancelled.`,
    data: updatedCourt,
    affectedBookings: cancelledCount,
  });
});

// @desc    Unblock court (remove a specific block instance)
// @route   POST /api/courts/:id/unblock/:blockId
// @access  Private/Admin
const unblockCourt = asyncHandler(async (req, res) => {
  const courtId = req.params.id;
  const blockIdToRemove = req.params.blockId;

  if (!mongoose.Types.ObjectId.isValid(courtId) || !mongoose.Types.ObjectId.isValid(blockIdToRemove)) {
    res.status(400);
    throw new Error('Invalid Court or Block ID format');
  }

  const court = await Court.findById(courtId);
  if (!court) {
    res.status(404); throw new Error('Court not found');
  }
  
  const initialBlockCount = court.blocks.length;
  court.blocks = court.blocks.filter((block) => block._id.toString() !== blockIdToRemove);
  if (court.blocks.length === initialBlockCount) {
    return res.status(404).json({ success: false, message: `Block with ID ${blockIdToRemove} not found on this court.` });
  }
  await court.save();
  const updatedCourt = await Court.findById(courtId).populate('blocks.createdBy', 'username firstName lastName');
  res.json({
    success: true,
    message: `Block removed successfully from court '${court.name}'.`,
    data: updatedCourt,
  });
});

module.exports = {
  getCourts,
  getCourt,
  createCourt,
  updateCourt,
  deleteCourt,
  blockCourt,
  unblockCourt,
};