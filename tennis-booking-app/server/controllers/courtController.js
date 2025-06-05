// server/controllers/courtController.js
const { Court, Booking, CourtBlock, User, sequelize } = require('../models');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { Op } = require('sequelize');
const emailService = require('../utils/emailService');

// @desc    Get all courts, optionally with available slots
// @route   GET /api/courts
// @access  Public
const getCourts = asyncHandler(async (req, res) => {
  const { date, type, surface, showInactive, searchTerm, includeDetails, page = 1, limit = 1000 } = req.query;

  const where = {};
  if (!showInactive || showInactive === 'false') {
    where.isActive = true;
  }
  if (type) where.type = type;
  if (surface) where.surface = surface;

  if (searchTerm) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${searchTerm}%` } },
      { description: { [Op.iLike]: `%${searchTerm}%` } }
    ];
  }

  const courtsQuery = {
    where,
    order: [['name', 'ASC']]
  };

  // Include blocks if date is provided or details are requested
  if (date || includeDetails === 'true') {
    courtsQuery.include = [{
      model: CourtBlock,
      as: 'blocks',
      required: false,
      where: {
        endDateTime: { [Op.gt]: new Date() }
      }
    }];
  }

  const courts = await Court.findAll(courtsQuery);

  if (date) {
    const requestedDate = new Date(date);
    const normalizedQueryDate = new Date(Date.UTC(
      requestedDate.getUTCFullYear(), 
      requestedDate.getUTCMonth(), 
      requestedDate.getUTCDate()
    ));

    const durationMinutes = 60;

    // Fetch bookings for the date
    const courtIds = courts.map(c => c.id);
    const bookingsForDate = await Booking.findAll({
      where: {
        courtId: { [Op.in]: courtIds },
        date: normalizedQueryDate,
        status: { [Op.in]: ['confirmed', 'pending'] }
      }
    });

    const courtsWithAvailability = await Promise.all(
      courts.map(async (court) => {
        const courtObj = court.toJSON();

        if (!court.isActive || court.maintenanceMode) {
          return { ...courtObj, availableSlots: [], reason: "Court is not active or in maintenance." };
        }
        
        const operatingHours = court.getOperatingHoursForDate(normalizedQueryDate);
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

          const slotStartDateTime = new Date(Date.UTC(
            normalizedQueryDate.getUTCFullYear(), 
            normalizedQueryDate.getUTCMonth(), 
            normalizedQueryDate.getUTCDate(), 
            slotStartHour, 
            slotStartMin
          ));
          const slotEndDateTime = new Date(Date.UTC(
            normalizedQueryDate.getUTCFullYear(), 
            normalizedQueryDate.getUTCMonth(), 
            normalizedQueryDate.getUTCDate(), 
            slotEndHour, 
            slotEndMin
          ));
          
          const isBooked = bookingsForDate.some(
            (b) =>
              b.courtId === court.id &&
              b.startTime < endTimeString &&
              b.endTime > startTimeString
          );

          const isBlockedByAdmin = await court.isAvailable(slotStartDateTime, slotEndDateTime) === false;

          if (!isBooked && !isBlockedByAdmin) {
            slots.push({
              startTime: startTimeString,
              endTime: endTimeString,
              available: true,
            });
          }
        }

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
      count: courts.length,
      data: courts,
    });
  }
});

// @desc    Get single court
// @route   GET /api/courts/:id
// @access  Public
const getCourt = asyncHandler(async (req, res) => {
  const court = await Court.findByPk(req.params.id, {
    include: [{
      model: CourtBlock,
      as: 'blocks',
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'firstName', 'lastName']
      }]
    }]
  });

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
  const court = await Court.create(req.body);
  res.status(201).json({ success: true, data: court });
});

// @desc    Update court
// @route   PUT /api/courts/:id
// @access  Private/Admin
const updateCourt = asyncHandler(async (req, res) => {
  const court = await Court.findByPk(req.params.id);
  
  if (!court) {
    res.status(404);
    throw new Error('Court not found');
  }
  
  // Prevent direct update of blocks array
  const { blocks, ...updateData } = req.body;

  await court.update(updateData);
  
  res.json({ success: true, data: court });
});

// @desc    Delete court
// @route   DELETE /api/courts/:id
// @access  Private/Admin
const deleteCourt = asyncHandler(async (req, res) => {
  const court = await Court.findByPk(req.params.id);
  
  if (!court) {
    res.status(404);
    throw new Error('Court not found');
  }

  const todayNormalized = new Date();
  todayNormalized.setHours(0, 0, 0, 0);
  
  const futureBookings = await Booking.count({
    where: {
      courtId: req.params.id,
      date: { [Op.gte]: todayNormalized },
      status: { [Op.in]: ['confirmed', 'pending'] },
    }
  });

  if (futureBookings > 0) {
    res.status(400);
    throw new Error(`Cannot delete court. It has ${futureBookings} upcoming booking(s). Please cancel them first.`);
  }
  
  await court.destroy();
  
  res.json({ success: true, message: 'Court deleted successfully', data: {} });
});

// @desc    Block court
// @route   POST /api/courts/:id/block
// @access  Private/Admin
const blockCourt = asyncHandler(async (req, res) => {
  const { reason, description, startDateTime, endDateTime, isRecurring, recurringPattern, recurringEndDate } = req.body;
  
  const court = await Court.findByPk(req.params.id);
  if (!court) {
    res.status(404);
    throw new Error('Court not found');
  }

  const blockStart = new Date(startDateTime);
  const blockEnd = new Date(endDateTime);

  if (isNaN(blockStart.getTime()) || isNaN(blockEnd.getTime())) {
    res.status(400);
    throw new Error('Invalid start or end date/time for the block.');
  }
  if (blockStart >= blockEnd) {
    res.status(400);
    throw new Error('Block end date/time must be after start date/time.');
  }

  // Create court block
  const newBlock = await CourtBlock.create({
    courtId: court.id,
    reason: reason || 'other',
    description,
    startDateTime: blockStart,
    endDateTime: blockEnd,
    createdBy: req.user.id,
    isRecurring: isRecurring || false,
    recurringPattern: isRecurring ? recurringPattern : null,
    recurringEndDate: isRecurring && recurringEndDate ? new Date(recurringEndDate) : null
  });

  // Cancel affected bookings
  const affectedBookings = await Booking.findAll({
    where: {
      courtId: court.id,
      status: 'confirmed'
    },
    include: [{
      model: User,
      as: 'user',
      attributes: ['id', 'email', 'firstName', 'username']
    }]
  });

  let cancelledCount = 0;
  for (const booking of affectedBookings) {
    const bookingDateNormalized = new Date(booking.date);
    const [bStartH, bStartM] = booking.startTime.split(':').map(Number);
    const bookingStartDt = new Date(bookingDateNormalized);
    bookingStartDt.setUTCHours(bStartH, bStartM, 0, 0);

    const [bEndH, bEndM] = booking.endTime.split(':').map(Number);
    const bookingEndDt = new Date(bookingDateNormalized);
    bookingEndDt.setUTCHours(bEndH, bEndM, 0, 0);

    if (bookingStartDt < blockEnd && bookingEndDt > blockStart) {
      booking.status = 'cancelled';
      booking.cancellationReason = `Court automatically cancelled due to administrative block: ${reason || 'general maintenance/event'}. Period: ${blockStart.toLocaleString()} - ${blockEnd.toLocaleString()}. ${description || ''}`.trim();
      booking.cancelledBy = req.user.id;
      booking.cancelledAt = new Date();
      await booking.save();
      cancelledCount++;
      
      if (booking.user && booking.user.email) {
        try {
          await emailService.sendBookingCancellation(
            booking.user.toJSON(),
            booking.toJSON(),
            court.toJSON()
          );
        } catch (emailError) {
          console.error(`Failed to send cancellation email to ${booking.user.email} for booking ${booking.id}:`, emailError);
        }
      }
    }
  }
  
  // Reload court with blocks
  const updatedCourt = await Court.findByPk(req.params.id, {
    include: [{
      model: CourtBlock,
      as: 'blocks',
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'firstName', 'lastName']
      }]
    }]
  });
  
  res.json({
    success: true,
    message: `Court '${court.name}' blocked successfully. ${cancelledCount} booking(s) were cancelled.`,
    data: updatedCourt,
    affectedBookings: cancelledCount,
  });
});

// @desc    Unblock court
// @route   POST /api/courts/:id/unblock/:blockId
// @access  Private/Admin
const unblockCourt = asyncHandler(async (req, res) => {
  const { id: courtId, blockId } = req.params;

  const court = await Court.findByPk(courtId);
  if (!court) {
    res.status(404);
    throw new Error('Court not found');
  }
  
  const block = await CourtBlock.findOne({
    where: {
      id: blockId,
      courtId: courtId
    }
  });
  
  if (!block) {
    res.status(404);
    throw new Error('Block not found on this court');
  }
  
  await block.destroy();
  
  // Reload court with remaining blocks
  const updatedCourt = await Court.findByPk(courtId, {
    include: [{
      model: CourtBlock,
      as: 'blocks',
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'firstName', 'lastName']
      }]
    }]
  });
  
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