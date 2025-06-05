// server/controllers/bookingController.js
const { Op, fn, col, literal } = require('sequelize');
const { sequelize, Booking, Court, User, CourtBlock } = require('../models');
const emailService = require('../utils/emailService');
const { asyncHandler } = require('../middleware/errorMiddleware');

// Helper function to calculate price
const calculatePrice = (court, date, startTime, durationMinutes = 60) => {
  return court.calculatePrice(date, startTime, durationMinutes);
};

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
const createBooking = asyncHandler(async (req, res) => {
  const { courtId, date, startTime, endTime, players, notes } = req.body;

  // Start transaction for data consistency
  const transaction = await sequelize.transaction();

  try {
    // 1. Validate Court
    const court = await Court.findByPk(courtId, { transaction });
    if (!court) {
      await transaction.rollback();
      res.status(404);
      throw new Error('Court not found');
    }

    if (!court.isActive || court.maintenanceMode) {
      await transaction.rollback();
      res.status(400);
      throw new Error('This court is currently not available for booking.');
    }

    // 2. Validate Booking Date
    const bookingDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      await transaction.rollback();
      res.status(400);
      throw new Error('Cannot book for past dates.');
    }

    const advanceBookingDays = court.bookingRules?.advanceBookingDays || 
                              parseInt(process.env.BOOKING_WINDOW_DAYS, 10) || 7;
    const maxBookingDate = new Date(today);
    maxBookingDate.setDate(today.getDate() + advanceBookingDays);

    if (bookingDate > maxBookingDate) {
      await transaction.rollback();
      res.status(400);
      throw new Error(`Bookings can only be made up to ${advanceBookingDays} days in advance.`);
    }

    // 3. Validate Booking Duration
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    const durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);

    if (durationMinutes !== 60) {
      await transaction.rollback();
      res.status(400);
      throw new Error('Bookings must be exactly 60 minutes long.');
    }

    const courtMinDuration = court.bookingRules?.minBookingDuration || 30;
    const courtMaxDuration = court.bookingRules?.maxBookingDuration || 120;

    if (durationMinutes < courtMinDuration || durationMinutes > courtMaxDuration) {
      await transaction.rollback();
      res.status(400);
      throw new Error(`Booking duration must be between ${courtMinDuration} and ${courtMaxDuration} minutes.`);
    }

    // 4. Validate against Operating Hours
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][bookingDate.getDay()];
    const operatingHours = court.operatingHours?.[dayOfWeek];

    if (!operatingHours || !operatingHours.open || !operatingHours.close) {
      await transaction.rollback();
      res.status(400);
      throw new Error('Court operating hours are not defined for the selected day.');
    }

    if (startTime < operatingHours.open || endTime > operatingHours.close) {
      await transaction.rollback();
      res.status(400);
      throw new Error(`Booking time is outside court operating hours (${operatingHours.open} - ${operatingHours.close}).`);
    }

    // 5. Check for Court Blocks
    const bookingStartDateTime = new Date(bookingDate);
    bookingStartDateTime.setHours(startHours, startMinutes, 0, 0);
    const bookingEndDateTime = new Date(bookingDate);
    bookingEndDateTime.setHours(endHours, endMinutes, 0, 0);

    const blockingConflict = await CourtBlock.findOne({
      where: {
        court_id: courtId,
        start_date_time: { [Op.lt]: bookingEndDateTime },
        end_date_time: { [Op.gt]: bookingStartDateTime }
      },
      transaction
    });

    if (blockingConflict) {
      await transaction.rollback();
      res.status(400);
      throw new Error('Court is blocked during this time slot.');
    }

    // 6. Check for Double Bookings using PostgreSQL
    // Note: The database exclusion constraint will also prevent this at the DB level
    const existingBooking = await Booking.findOne({
      where: {
        court_id: courtId,
        date: bookingDate,
        status: { [Op.in]: ['confirmed', 'pending'] },
        [Op.and]: [
          literal(`(start_time, end_time) OVERLAPS (TIME '${startTime}', TIME '${endTime}')`)
        ]
      },
      transaction
    });

    if (existingBooking) {
      await transaction.rollback();
      res.status(400);
      throw new Error('This court is already booked for the selected time slot.');
    }

    // 7. Check for User's Overlapping Bookings
    const userOverlappingBooking = await Booking.findOne({
      where: {
        user_id: req.user.id,
        date: bookingDate,
        status: { [Op.in]: ['confirmed', 'pending'] },
        [Op.and]: [
          literal(`(start_time, end_time) OVERLAPS (TIME '${startTime}', TIME '${endTime}')`)
        ]
      },
      transaction
    });

    if (userOverlappingBooking) {
      await transaction.rollback();
      res.status(400);
      throw new Error('You already have another booking scheduled at this time.');
    }

    // 8. Calculate Price
    const totalPrice = calculatePrice(court, bookingDate, startTime, durationMinutes);

    // 9. Create Booking
    const newBooking = await Booking.create({
      userId: req.user.id,
      courtId: courtId,
      date: bookingDate,
      startTime: startTime,
      endTime: endTime,
      players: players || [],
      notes: notes,
      totalPrice: totalPrice,
      paymentStatus: totalPrice > 0 ? 'pending' : 'free',
      status: 'confirmed'
    }, { transaction });

    // Commit transaction
    await transaction.commit();

    // 10. Fetch complete booking with associations
    const populatedBooking = await Booking.findByPk(newBooking.id, {
      include: [
        { 
          model: User, 
          as: 'user', 
          attributes: ['id', 'firstName', 'lastName', 'username', 'email'] 
        },
        { 
          model: Court, 
          as: 'court',
          attributes: ['id', 'name', 'type', 'surface', 'location']
        }
      ]
    });

    // 11. Send confirmation email
    if (populatedBooking && populatedBooking.user && populatedBooking.court) {
      try {
        await emailService.sendBookingConfirmation(
          populatedBooking.user,
          populatedBooking.toJSON(),
          populatedBooking.court.toJSON()
        );
      } catch (error) {
        console.error('Failed to send booking confirmation email:', error);
        // Non-critical error, booking is still successful
      }
    }

    res.status(201).json({
      success: true,
      message: 'Booking created successfully!',
      data: populatedBooking
    });

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

// @desc    Get my bookings
// @route   GET /api/bookings/my-bookings
// @access  Private
const getMyBookings = asyncHandler(async (req, res) => {
  const { 
    status, 
    startDate, 
    endDate, 
    page = 1, 
    limit = 10, 
    sort = '-date,-startTime' 
  } = req.query;
  
  const where = { userId: req.user.id };
  
  if (status) {
    where.status = Array.isArray(status) ? { [Op.in]: status } : status;
  }
  
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date[Op.gte] = startDate;
    if (endDate) where.date[Op.lte] = endDate;
  }

  // Parse sort parameter
  const order = sort.split(',').map(field => {
    const isDesc = field.startsWith('-');
    const fieldName = isDesc ? field.substring(1) : field;
    // Map field names to database columns
    const fieldMap = {
      date: 'date',
      startTime: 'start_time',
      createdAt: 'created_at'
    };
    return [fieldMap[fieldName] || fieldName, isDesc ? 'DESC' : 'ASC'];
  });
  
  const { count, rows: bookings } = await Booking.findAndCountAll({
    where,
    include: [
      { 
        model: Court, 
        as: 'court', 
        attributes: ['id', 'name', 'type', 'surface', 'bookingRules']
      }
    ],
    order,
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit)
  });
  
  res.json({
    success: true,
    count,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(count / parseInt(limit))
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
    search
  } = req.query;
  
  const where = {};
  
  if (status) where.status = status;
  if (courtId) where.courtId = courtId;
  if (userId) where.userId = userId;
  
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date[Op.gte] = startDate;
    if (endDate) where.date[Op.lte] = endDate;
  }

  // Include conditions for user search
  const include = [
    {
      model: User,
      as: 'user',
      attributes: ['id', 'username', 'email', 'firstName', 'lastName'],
      where: search ? {
        [Op.or]: [
          { email: { [Op.iLike]: `%${search}%` } },
          { username: { [Op.iLike]: `%${search}%` } },
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } }
        ]
      } : undefined
    },
    {
      model: Court,
      as: 'court',
      attributes: ['id', 'name', 'type', 'surface']
    }
  ];

  // Parse sort
  const order = sort.split(',').map(field => {
    const isDesc = field.startsWith('-');
    const fieldName = isDesc ? field.substring(1) : field;
    const fieldMap = {
      date: 'date',
      startTime: 'start_time',
      createdAt: 'created_at'
    };
    return [fieldMap[fieldName] || fieldName, isDesc ? 'DESC' : 'ASC'];
  });
  
  const { count, rows: bookings } = await Booking.findAndCountAll({
    where,
    include,
    order,
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    distinct: true // Important for correct count with includes
  });
  
  res.json({
    success: true,
    count,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(count / parseInt(limit))
    },
    data: bookings
  });
});

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
const getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findByPk(req.params.id, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email', 'firstName', 'lastName']
      },
      {
        model: Court,
        as: 'court',
        attributes: ['id', 'name', 'type', 'surface', 'location', 'bookingRules']
      }
    ]
  });
  
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  
  // Check authorization
  if (booking.userId !== req.user.id && req.user.role !== 'admin') {
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
  const { reason } = req.body;
  
  const booking = await Booking.findByPk(req.params.id, {
    include: [
      { model: Court, as: 'court' },
      { model: User, as: 'user' }
    ]
  });
  
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  
  if (booking.status === 'cancelled') {
    res.status(400);
    throw new Error('This booking has already been cancelled.');
  }

  if (['completed', 'no-show'].includes(booking.status)) {
    res.status(400);
    throw new Error(`Cannot cancel a booking with status: ${booking.status}`);
  }

  const isOwner = booking.userId === req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    res.status(403);
    throw new Error('Not authorized to cancel this booking.');
  }
  
  // Check cancellation deadline for non-admin users
  if (isOwner && !isAdmin) {
    const cancellationDeadlineHours = booking.court.bookingRules?.cancellationDeadlineHours ?? 
                                     parseInt(process.env.CANCELLATION_NOTICE_HOURS, 10) ?? 2;
    if (!booking.canBeCancelled(cancellationDeadlineHours)) {
      res.status(400);
      throw new Error(`Bookings must be cancelled at least ${cancellationDeadlineHours} hours in advance.`);
    }
  }
  
  // Update booking
  booking.status = 'cancelled';
  booking.cancellationReason = isAdmin && !isOwner 
    ? `Cancelled by admin: ${reason || 'Administrative action'}` 
    : reason || 'Cancelled by user';
  booking.cancelledBy = req.user.id;
  booking.cancelledAt = new Date();
  
  await booking.save();
  
  // Send cancellation email
  if (booking.user && booking.user.email && booking.court) {
    try {
      await emailService.sendBookingCancellation(
        booking.user.toJSON(),
        booking.toJSON(),
        booking.court.toJSON()
      );
    } catch (error) {
      console.error(`Failed to send cancellation email for booking ${booking.id}:`, error);
    }
  }
  
  res.json({
    success: true,
    message: 'Booking cancelled successfully.',
    data: booking
  });
});

// @desc    Update booking (Admin only)
// @route   PUT /api/bookings/:id
// @access  Private/Admin
const updateBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findByPk(req.params.id);
  
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  
  // Only allow specific field updates
  const allowedUpdates = ['status', 'notes', 'paymentStatus', 'paymentMethod', 
                         'checkInTime', 'checkOutTime'];
  const updates = {};
  
  for (const field of allowedUpdates) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }
  
  // Special handling for status changes to cancelled
  if (updates.status === 'cancelled' && booking.status !== 'cancelled') {
    updates.cancellationReason = req.body.cancellationReason || 'Cancelled by admin';
    updates.cancelledBy = req.user.id;
    updates.cancelledAt = new Date();
  }
  
  // Update booking
  await booking.update(updates);
  
  // Reload with associations
  await booking.reload({
    include: [
      { model: User, as: 'user' },
      { model: Court, as: 'court' }
    ]
  });
  
  // Send cancellation email if status changed to cancelled
  if (updates.status === 'cancelled' && booking.user && booking.court) {
    try {
      await emailService.sendBookingCancellation(
        booking.user.toJSON(),
        booking.toJSON(),
        booking.court.toJSON()
      );
    } catch (error) {
      console.error(`Failed to send cancellation email:`, error);
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
  const booking = await Booking.findByPk(req.params.id);
  
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  await booking.destroy();
  
  res.json({
    success: true,
    message: 'Booking deleted successfully.',
    data: {}
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