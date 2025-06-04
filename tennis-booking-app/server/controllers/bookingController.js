const Booking = require('../models/Booking');
const Court = require('../models/Court');
const User = require('../models/User');
const emailService = require('../utils/emailService');
const { asyncHandler } = require('../middleware/errorMiddleware');

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
const createBooking = asyncHandler(async (req, res) => {
  const { courtId, date, startTime, endTime, players, notes } = req.body;
  
  // Get court details
  const court = await Court.findById(courtId);
  if (!court) {
    res.status(404);
    throw new Error('Court not found');
  }
  
  if (!court.isActive) {
    res.status(400);
    throw new Error('Court is not available for booking');
  }
  
  // Validate booking date
  const bookingDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  bookingDate.setHours(0, 0, 0, 0);
  
  const daysDifference = (bookingDate - today) / (1000 * 60 * 60 * 24);
  const maxAdvanceDays = court.bookingRules?.advanceBookingDays || 
                        parseInt(process.env.BOOKING_WINDOW_DAYS) || 7;
  
  if (daysDifference < 0) {
    res.status(400);
    throw new Error('Cannot book for past dates');
  }
  
  if (daysDifference > maxAdvanceDays) {
    res.status(400);
    throw new Error(`Cannot book more than ${maxAdvanceDays} days in advance`);
  }
  
  // Validate booking duration
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  const durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
  
  const minDuration = court.bookingRules?.minBookingDuration || 30;
  const maxDuration = court.bookingRules?.maxBookingDuration || 
                     parseInt(process.env.MAX_BOOKING_DURATION_MINUTES) || 120;
  
  if (durationMinutes < minDuration) {
    res.status(400);
    throw new Error(`Minimum booking duration is ${minDuration} minutes`);
  }
  
  if (durationMinutes > maxDuration) {
    res.status(400);
    throw new Error(`Maximum booking duration is ${maxDuration} minutes`);
  }
  
  // Check if court is available at requested time
  const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][bookingDate.getDay()];
  const operatingHours = court.operatingHours[dayName];
  
  if (startTime < operatingHours.open || endTime > operatingHours.close) {
    res.status(400);
    throw new Error('Booking time is outside court operating hours');
  }
  
  // Check for court blocks
  const isBlocked = court.blocks.some(block => {
    const blockStart = new Date(block.startDateTime);
    const blockEnd = new Date(block.endDateTime);
    const bookingStart = new Date(bookingDate);
    bookingStart.setHours(startHours, startMinutes, 0, 0);
    const bookingEnd = new Date(bookingDate);
    bookingEnd.setHours(endHours, endMinutes, 0, 0);
    
    return bookingStart < blockEnd && bookingEnd > blockStart;
  });
  
  if (isBlocked) {
    res.status(400);
    throw new Error('Court is not available during this time');
  }
  
  // Check for existing bookings
  const existingBooking = await Booking.findOne({
    court: courtId,
    date: bookingDate,
    status: { $in: ['confirmed', 'pending'] },
    $or: [
      { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
    ]
  });
  
  if (existingBooking) {
    res.status(400);
    throw new Error('Court is already booked for this time slot');
  }
  
  // Check if user has another booking at the same time
  const userConflict = await Booking.findOne({
    user: req.user._id,
    date: bookingDate,
    status: { $in: ['confirmed', 'pending'] },
    $or: [
      { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
    ]
  });
  
  if (userConflict) {
    res.status(400);
    throw new Error('You already have a booking at this time');
  }
  
  // Calculate price (if applicable)
  let totalPrice = 0;
  if (court.pricing?.basePrice) {
    totalPrice = court.pricing.basePrice * (durationMinutes / 60);
    
    // Check for peak hours
    const bookingStartMinutes = startHours * 60 + startMinutes;
    const isPeakHour = court.pricing.peakHours?.some(peak => {
      if (peak.dayOfWeek !== bookingDate.getDay()) return false;
      const [peakStartHours, peakStartMinutes] = peak.startTime.split(':').map(Number);
      const [peakEndHours, peakEndMinutes] = peak.endTime.split(':').map(Number);
      const peakStart = peakStartHours * 60 + peakStartMinutes;
      const peakEnd = peakEndHours * 60 + peakEndMinutes;
      
      return bookingStartMinutes >= peakStart && bookingStartMinutes < peakEnd;
    });
    
    if (isPeakHour) {
      totalPrice *= court.pricing.peakHourMultiplier;
    }
  }
  
  // Create booking
  const booking = await Booking.create({
    user: req.user._id,
    court: courtId,
    date: bookingDate,
    startTime,
    endTime,
    players,
    notes,
    totalPrice,
    paymentStatus: totalPrice > 0 ? 'pending' : 'free'
  });
  
  // Populate booking details
  await booking.populate(['user', 'court']);
  
  // Send confirmation email
  try {
    await emailService.sendBookingConfirmation(req.user, booking, court);
  } catch (error) {
    console.error('Failed to send booking confirmation:', error);
  }
  
  res.status(201).json({
    success: true,
    data: booking
  });
});

// @desc    Get my bookings
// @route   GET /api/bookings/my-bookings
// @access  Private
const getMyBookings = asyncHandler(async (req, res) => {
  const { status, startDate, endDate, page = 1, limit = 10, sort = '-date' } = req.query;
  
  const query = { user: req.user._id };
  
  if (status) {
    query.status = status;
  }
  
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }
  
  const bookings = await Booking.find(query)
    .populate('court', 'name type surface')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const count = await Booking.countDocuments(query);
  
  res.json({
    success: true,
    count,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(count / limit)
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
    sort = '-date' 
  } = req.query;
  
  const query = {};
  
  if (status) query.status = status;
  if (courtId) query.court = courtId;
  if (userId) query.user = userId;
  
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }
  
  const bookings = await Booking.find(query)
    .populate('user', 'username email firstName lastName')
    .populate('court', 'name type surface')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const count = await Booking.countDocuments(query);
  
  res.json({
    success: true,
    count,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(count / limit)
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
    .populate('court', 'name type surface');
  
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  
  // Check if user has access to this booking
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
  const { reason } = req.body;
  
  const booking = await Booking.findById(req.params.id)
    .populate('court')
    .populate('user');
  
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  
  // Check if user has access to cancel this booking
  if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to cancel this booking');
  }
  
  // Check if booking can be cancelled
  if (booking.status !== 'confirmed') {
    res.status(400);
    throw new Error('Only confirmed bookings can be cancelled');
  }
  
  // Check cancellation deadline
  const cancellationDeadline = booking.court.bookingRules?.cancellationDeadlineHours || 
                               parseInt(process.env.CANCELLATION_NOTICE_HOURS) || 2;
  
  if (!booking.canBeCancelled(cancellationDeadline) && req.user.role !== 'admin') {
    res.status(400);
    throw new Error(`Bookings must be cancelled at least ${cancellationDeadline} hours in advance`);
  }
  
  // Cancel booking
  booking.status = 'cancelled';
  booking.cancellationReason = reason;
  booking.cancelledBy = req.user._id;
  booking.cancelledAt = new Date();
  await booking.save();
  
  // Send cancellation email
  try {
    await emailService.sendBookingCancellation(booking.user, booking, booking.court);
  } catch (error) {
    console.error('Failed to send cancellation email:', error);
  }
  
  res.json({
    success: true,
    data: booking
  });
});

// @desc    Update booking
// @route   PUT /api/bookings/:id
// @access  Private/Admin
const updateBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  
  // Only allow certain fields to be updated
  const allowedUpdates = ['status', 'notes', 'paymentStatus', 'checkInTime', 'checkOutTime'];
  const updates = Object.keys(req.body)
    .filter(key => allowedUpdates.includes(key))
    .reduce((obj, key) => {
      obj[key] = req.body[key];
      return obj;
    }, {});
  
  Object.assign(booking, updates);
  await booking.save();
  
  res.json({
    success: true,
    data: booking
  });
});

// @desc    Delete booking
// @route   DELETE /api/bookings/:id
// @access  Private/Admin
const deleteBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  
  await booking.deleteOne();
  
  res.json({
    success: true,
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