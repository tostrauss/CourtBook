// server/controllers/bookingController.js
const Booking = require('../models/Booking');
const Court = require('../models/Court');
const User = require('../models/User'); // Not directly used in createBooking but good for context
const emailService = require('../utils/emailService');
const { asyncHandler } = require('../middleware/errorMiddleware');

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
const createBooking = asyncHandler(async (req, res) => {
  const { courtId, date, startTime, endTime, players, notes } = req.body;

  // 1. Validate Court
  const court = await Court.findById(courtId);
  if (!court) {
    res.status(404);
    throw new Error('Court not found');
  }
  if (!court.isActive || court.maintenanceMode) {
    res.status(400);
    throw new Error('This court is currently not available for booking.');
  }

  // 2. Validate Booking Date (Normalize to UTC midnight for date-only comparisons)
  const requestedDate = new Date(date); // User input, could be any time
  const normalizedBookingDate = new Date(Date.UTC(requestedDate.getUTCFullYear(), requestedDate.getUTCMonth(), requestedDate.getUTCDate()));

  const today = new Date();
  const normalizedToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  if (normalizedBookingDate < normalizedToday) {
    res.status(400);
    throw new Error('Cannot book for past dates.');
  }

  const advanceBookingDays = court.bookingRules?.advanceBookingDays || parseInt(process.env.BOOKING_WINDOW_DAYS, 10) || 7;
  const maxAdvanceTimestamp = new Date(normalizedToday).setDate(normalizedToday.getDate() + advanceBookingDays);
  
  if (normalizedBookingDate.getTime() > maxAdvanceTimestamp) {
    res.status(400);
    throw new Error(`Bookings can only be made up to ${advanceBookingDays} days in advance.`);
  }
  
  // 3. Validate Booking Duration (Enforce 60 minutes)
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  const durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);

  if (durationMinutes !== 60) {
    res.status(400);
    throw new Error('Bookings must be exactly 60 minutes long.');
  }

  // Validate against court's specific min/max duration rules (should align with 60 min for consistency)
  const courtMinDuration = court.bookingRules?.minBookingDuration || 30;
  const courtMaxDuration = court.bookingRules?.maxBookingDuration || 120;

  if (durationMinutes < courtMinDuration || durationMinutes > courtMaxDuration) {
     // This error might be less likely if admins set court rules to 60 min, but good to have
    res.status(400);
    throw new Error(`Booking duration of ${durationMinutes} minutes is not permitted for this court (allows ${courtMinDuration}-${courtMaxDuration} min).`);
  }

  // 4. Validate against Operating Hours
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][normalizedBookingDate.getUTCDay()]; // Use UTC day for consistency
  const operatingHours = court.operatingHours ? court.operatingHours[dayOfWeek] : null;

  if (!operatingHours || !operatingHours.open || !operatingHours.close) {
    res.status(400);
    throw new Error('Court operating hours are not defined for the selected day.');
  }
  if (startTime < operatingHours.open || endTime > operatingHours.close) {
    res.status(400);
    throw new Error(`Booking time is outside court operating hours (${operatingHours.open} - ${operatingHours.close}).`);
  }

  // 5. Check for Court Blocks
  const bookingStartDateTime = new Date(normalizedBookingDate);
  bookingStartDateTime.setUTCHours(startHours, startMinutes, 0, 0);
  const bookingEndDateTime = new Date(normalizedBookingDate);
  bookingEndDateTime.setUTCHours(endHours, endMinutes, 0, 0);

  if (court.blocks && court.blocks.length > 0) {
    const isBlocked = court.blocks.some(block => {
      const blockStart = new Date(block.startDateTime);
      const blockEnd = new Date(block.endDateTime);
      return bookingStartDateTime < blockEnd && bookingEndDateTime > blockStart;
    });
    if (isBlocked) {
      res.status(400);
      throw new Error('Court is administratively blocked during this time slot.');
    }
  }
  
  // 6. Check for Double Bookings on the Same Court
  const existingBookingOnCourt = await Booking.findOne({
    court: courtId,
    date: normalizedBookingDate,
    status: { $in: ['confirmed', 'pending'] },
    $or: [ { startTime: { $lt: endTime }, endTime: { $gt: startTime } } ],
  });
  if (existingBookingOnCourt) {
    res.status(400);
    throw new Error('This court is already booked for the selected time slot.');
  }

  // 7. Check for User's Overlapping Bookings (on any court)
  const userOverlappingBooking = await Booking.findOne({
    user: req.user._id, // req.user must be populated by auth middleware
    date: normalizedBookingDate,
    status: { $in: ['confirmed', 'pending'] },
    $or: [ { startTime: { $lt: endTime }, endTime: { $gt: startTime } } ],
  });
  if (userOverlappingBooking) {
    res.status(400);
    throw new Error('You already have another booking scheduled at this time.');
  }

  // 8. Calculate Price
  let totalPrice = 0;
  if (court.pricing?.basePrice && court.pricing.basePrice > 0) {
    totalPrice = court.pricing.basePrice * (durationMinutes / 60); // durationMinutes is 60
    
    const bookingStartTotalMinutes = startHours * 60 + startMinutes;
    const isPeakHour = court.pricing.peakHours?.some(peak => {
      if (peak.dayOfWeek !== normalizedBookingDate.getUTCDay()) return false;
      const [peakStartH, peakStartM] = peak.startTime.split(':').map(Number);
      const [peakEndH, peakEndM] = peak.endTime.split(':').map(Number);
      const peakStartTotalMinutes = peakStartH * 60 + peakStartM;
      const peakEndTotalMinutes = peakEndH * 60 + peakEndM;
      return bookingStartTotalMinutes >= peakStartTotalMinutes && bookingStartTotalMinutes < peakEndTotalMinutes;
    });
    
    if (isPeakHour && court.pricing.peakHourMultiplier && court.pricing.peakHourMultiplier > 1) {
      totalPrice *= court.pricing.peakHourMultiplier;
    }
  }

  // 9. Create Booking
  const newBooking = await Booking.create({
    user: req.user._id,
    court: courtId,
    date: normalizedBookingDate, // Store UTC normalized date
    startTime,
    endTime,
    players: players || [],
    notes,
    totalPrice: parseFloat(totalPrice.toFixed(2)),
    paymentStatus: totalPrice > 0 ? 'pending' : 'free',
    status: 'confirmed', // Defaulting to confirmed as per existing model
  });

  // 10. Populate and Send Confirmation Email
  const populatedBooking = await Booking.findById(newBooking._id)
    .populate({ path: 'user', select: 'firstName username email' })
    .populate({ path: 'court', select: 'name type surface' }); // Removed bookingRules from populate for email

  if (populatedBooking && populatedBooking.user && populatedBooking.court) {
    try {
      await emailService.sendBookingConfirmation(populatedBooking.user, populatedBooking, populatedBooking.court);
    } catch (error) {
      console.error('Failed to send booking confirmation email for booking ID ' + populatedBooking._id + ':', error);
      // Non-critical error, booking is still made.
    }
  }

  res.status(201).json({
    success: true,
    message: 'Booking created successfully!',
    data: populatedBooking, // Send populated booking
  });
});

// @desc    Get my bookings
// @route   GET /api/bookings/my-bookings
// @access  Private
const getMyBookings = asyncHandler(async (req, res) => {
  const { status, startDate, endDate, page = 1, limit = 10, sort = '-date,-startTime' } = req.query;
  
  const query = { user: req.user._id };
  
  if (status) {
    query.status = status;
  }
  
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(new Date(startDate).setUTCHours(0,0,0,0));
    if (endDate) query.date.$lte = new Date(new Date(endDate).setUTCHours(23,59,59,999));
  }
  
  const bookings = await Booking.find(query)
    .populate('court', 'name type surface')
    .sort(sort)
    .limit(parseInt(limit, 10))
    .skip((parseInt(page, 10) - 1) * parseInt(limit, 10));
  
  const count = await Booking.countDocuments(query);
  
  res.json({
    success: true,
    count,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(count / parseInt(limit, 10))
    },
    data: bookings
  });
});

// @desc    Get all bookings (admin)
// @route   GET /api/bookings
// @access  Private/Admin
const getAllBookings = asyncHandler(async (req, res) => {
  const { 
    status, 
    courtId, 
    userId, 
    startDate, 
    endDate, 
    page = 1, 
    limit = 20, 
    sort = '-date,-startTime',
    search // For searching user name/email or booking ID
  } = req.query;
  
  const query = {};
  
  if (status) query.status = status;
  if (courtId) query.court = courtId;
  if (userId) query.user = userId;
  
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(new Date(startDate).setUTCHours(0,0,0,0));
    if (endDate) query.date.$lte = new Date(new Date(endDate).setUTCHours(23,59,59,999));
  }

  if (search) {
    // If search is a valid ObjectId, look for booking ID
    if (mongoose.Types.ObjectId.isValid(search)) {
        query._id = search;
    } else {
        // Otherwise, search in user fields (requires populating or a more complex query/aggregation)
        // This simple text search on populated fields won't work directly in .find() like this.
        // For a robust search on user details, you'd typically:
        // 1. Find users matching the search term.
        // 2. Then find bookings for those user IDs.
        // Or use $lookup in an aggregation pipeline.
        // For now, this search part is a placeholder for more complex logic if needed.
        // console.warn("Search by user name/email in getAllBookings requires aggregation or multi-step query.");
    }
  }
  
  const bookings = await Booking.find(query)
    .populate('user', 'username email firstName lastName')
    .populate('court', 'name type surface')
    .sort(sort)
    .limit(parseInt(limit, 10))
    .skip((parseInt(page, 10) - 1) * parseInt(limit, 10));
  
  const count = await Booking.countDocuments(query);
  
  res.json({
    success: true,
    count,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(count / parseInt(limit, 10))
    },
    data: bookings
  });
});

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
const getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('user', 'username email firstName lastName')
    .populate('court', 'name type surface location'); // Added location
  
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  
  if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to view this booking');
  }
  
  res.json({
    success: true,
    data: booking
  });
});

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
const cancelBooking = asyncHandler(async (req, res) => {
  const { reason } = req.body; // Reason for cancellation from user/admin
  
  const booking = await Booking.findById(req.params.id)
    .populate('court') // Need court for cancellationDeadlineHours and for email
    .populate('user');  // Need user for email and authorization check
  
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  
  if (booking.status === 'cancelled') {
    res.status(400);
    throw new Error('This booking has already been cancelled.');
  }
  if (booking.status === 'completed' || booking.status === 'no-show') {
    res.status(400);
    throw new Error(`Cannot cancel a booking with status: ${booking.status}`);
  }

  const isOwner = booking.user._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    res.status(403);
    throw new Error('Not authorized to cancel this booking.');
  }
  
  // Check cancellation deadline ONLY if the user is the owner and NOT an admin
  if (isOwner && !isAdmin) {
    const cancellationDeadlineHours = booking.court.bookingRules?.cancellationDeadlineHours ?? 
                                     parseInt(process.env.CANCELLATION_NOTICE_HOURS, 10) ?? 2;
    if (!booking.canBeCancelled(cancellationDeadlineHours)) { // canBeCancelled is a method on Booking model
      res.status(400);
      throw new Error(`Bookings must be cancelled at least ${cancellationDeadlineHours} hours in advance.`);
    }
  }
  
  booking.status = 'cancelled';
  booking.cancellationReason = isAdmin && !isOwner ? `Cancelled by admin: ${reason || 'Administrative action'}` : reason || 'Cancelled by user';
  booking.cancelledBy = req.user._id;
  booking.cancelledAt = new Date();
  await booking.save();
  
  // Send cancellation email
  if (booking.user && booking.user.email && booking.court) {
    try {
      await emailService.sendBookingCancellation(booking.user, booking, booking.court);
    } catch (error) {
      console.error(`Failed to send cancellation email for booking ${booking._id}:`, error);
    }
  }
  
  res.json({
    success: true,
    message: 'Booking cancelled successfully.',
    data: booking
  });
});

// @desc    Update booking (Admin only - limited fields)
// @route   PUT /api/bookings/:id
// @access  Private/Admin
const updateBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  
  // Admin can only update specific fields like status (e.g. to 'completed' or 'no-show'), notes, paymentStatus
  const { status, notes, paymentStatus, paymentMethod, checkInTime, checkOutTime } = req.body;
  const allowedUpdates = {};

  if (status && ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'].includes(status)) {
    allowedUpdates.status = status;
    if(status === 'cancelled' && booking.status !== 'cancelled') {
        allowedUpdates.cancellationReason = req.body.cancellationReason || 'Cancelled by admin via update.';
        allowedUpdates.cancelledBy = req.user._id;
        allowedUpdates.cancelledAt = new Date();
    }
  }
  if (notes !== undefined) allowedUpdates.notes = notes;
  if (paymentStatus && ['pending', 'paid', 'refunded', 'free'].includes(paymentStatus)) {
      allowedUpdates.paymentStatus = paymentStatus;
      if(paymentStatus === 'paid' && paymentMethod) {
          allowedUpdates.paymentMethod = paymentMethod;
      }
  }
  if (checkInTime) allowedUpdates.checkInTime = checkInTime;
  if (checkOutTime) allowedUpdates.checkOutTime = checkOutTime;

  if (Object.keys(allowedUpdates).length === 0) {
    return res.status(400).json({ success: false, message: 'No valid fields to update provided.'});
  }
  
  Object.assign(booking, allowedUpdates);
  await booking.save();
  
  // Potentially send email if status changed to cancelled by admin
  if (allowedUpdates.status === 'cancelled' && booking.status !== 'cancelled' /* before save */) {
      const populatedBooking = await Booking.findById(booking._id).populate('user').populate('court');
      if (populatedBooking.user && populatedBooking.court) {
          try {
            await emailService.sendBookingCancellation(populatedBooking.user, populatedBooking, populatedBooking.court);
          } catch (error) {
            console.error(`Failed to send cancellation email for booking ${booking._id} after admin update:`, error);
          }
      }
  }

  res.json({
    success: true,
    message: 'Booking updated successfully.',
    data: booking
  });
});

// @desc    Delete booking (Admin only - hard delete)
// @route   DELETE /api/bookings/:id
// @access  Private/Admin
const deleteBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  // Consider implications: is hard delete what's wanted? Or soft delete / archiving?
  // For now, a hard delete as per original structure.
  await booking.deleteOne();
  
  res.json({
    success: true,
    message: 'Booking deleted successfully.',
    data: {} // No data to return after deletion
  });
});

module.exports = {
  createBooking,
  getMyBookings,
  getAllBookings,
  getBooking,
  cancelBooking,
  updateBooking,
  deleteBooking
};