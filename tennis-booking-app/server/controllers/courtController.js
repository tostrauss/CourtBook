const Court = require('../models/Court');
const Booking = require('../models/Booking');
const { asyncHandler } = require('../middleware/errorMiddleware');

// @desc    Get all courts with available slots
// @route   GET /api/courts
// @access  Public
const getCourts = asyncHandler(async (req, res) => {
  const { date, duration, type, surface, showInactive } = req.query;
  
  // Build filter query
  const filter = {};
  if (!showInactive || showInactive !== 'true') {
    filter.isActive = true;
  }
  if (type) filter.type = type;
  if (surface) filter.surface = surface;
  
  const courts = await Court.find(filter)
    .select('-blocks')
    .sort('name');
  
  // If date is provided, calculate available slots
  if (date) {
    const requestedDate = new Date(date);
    const durationMinutes = parseInt(duration) || 60;
    
    // Get all bookings for the requested date
    const startOfDay = new Date(requestedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(requestedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const bookings = await Booking.find({
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $in: ['confirmed', 'pending'] }
    });
    
    // Calculate available slots for each court
    const courtsWithAvailability = await Promise.all(
      courts.map(async (court) => {
        const courtObj = court.toObject();
        const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][requestedDate.getDay()];
        const operatingHours = court.operatingHours[dayName];
        
        // Generate time slots
        const slots = [];
        const [openHour, openMinute] = operatingHours.open.split(':').map(Number);
        const [closeHour, closeMinute] = operatingHours.close.split(':').map(Number);
        
        const startMinutes = openHour * 60 + openMinute;
        const endMinutes = closeHour * 60 + closeMinute;
        
        for (let minutes = startMinutes; minutes + durationMinutes <= endMinutes; minutes += 30) {
          const startHour = Math.floor(minutes / 60);
          const startMin = minutes % 60;
          const endHour = Math.floor((minutes + durationMinutes) / 60);
          const endMin = (minutes + durationMinutes) % 60;
          
          const startTime = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
          const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
          
          // Check if slot is available
          const isBooked = bookings.some(booking => 
            booking.court.toString() === court._id.toString() &&
            booking.startTime < endTime &&
            booking.endTime > startTime
          );
          
          // Check if slot is blocked
          const isBlocked = court.blocks.some(block => {
            const blockStart = new Date(block.startDateTime);
            const blockEnd = new Date(block.endDateTime);
            const slotStart = new Date(requestedDate);
            slotStart.setHours(startHour, startMin, 0, 0);
            const slotEnd = new Date(requestedDate);
            slotEnd.setHours(endHour, endMin, 0, 0);
            
            return slotStart < blockEnd && slotEnd > blockStart;
          });
          
          if (!isBooked && !isBlocked) {
            slots.push({
              startTime,
              endTime,
              available: true
            });
          }
        }
        
        return {
          ...courtObj,
          availableSlots: slots
        };
      })
    );
    
    res.json({
      success: true,
      count: courtsWithAvailability.length,
      data: courtsWithAvailability
    });
  } else {
    res.json({
      success: true,
      count: courts.length,
      data: courts
    });
  }
});

// @desc    Get single court
// @route   GET /api/courts/:id
// @access  Public
const getCourt = asyncHandler(async (req, res) => {
  const court = await Court.findById(req.params.id);
  
  if (!court) {
    res.status(404);
    throw new Error('Court not found');
  }
  
  res.json({
    success: true,
    data: court
  });
});

// @desc    Create new court
// @route   POST /api/courts
// @access  Private/Admin
const createCourt = asyncHandler(async (req, res) => {
  const court = await Court.create(req.body);
  
  res.status(201).json({
    success: true,
    data: court
  });
});

// @desc    Update court
// @route   PUT /api/courts/:id
// @access  Private/Admin
const updateCourt = asyncHandler(async (req, res) => {
  let court = await Court.findById(req.params.id);
  
  if (!court) {
    res.status(404);
    throw new Error('Court not found');
  }
  
  court = await Court.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  
  res.json({
    success: true,
    data: court
  });
});

// @desc    Delete court
// @route   DELETE /api/courts/:id
// @access  Private/Admin
const deleteCourt = asyncHandler(async (req, res) => {
  const court = await Court.findById(req.params.id);
  
  if (!court) {
    res.status(404);
    throw new Error('Court not found');
  }
  
  // Check if there are any future bookings
  const futureBookings = await Booking.countDocuments({
    court: req.params.id,
    date: { $gte: new Date() },
    status: { $in: ['confirmed', 'pending'] }
  });
  
  if (futureBookings > 0) {
    res.status(400);
    throw new Error('Cannot delete court with active bookings');
  }
  
  await court.deleteOne();
  
  res.json({
    success: true,
    data: {}
  });
});

// @desc    Block court
// @route   POST /api/courts/:id/block
// @access  Private/Admin
const blockCourt = asyncHandler(async (req, res) => {
  const { reason, description, startDateTime, endDateTime, isRecurring, recurringPattern, recurringEndDate } = req.body;
  
  const court = await Court.findById(req.params.id);
  
  if (!court) {
    res.status(404);
    throw new Error('Court not found');
  }
  
  // Validate dates
  if (new Date(startDateTime) >= new Date(endDateTime)) {
    res.status(400);
    throw new Error('End time must be after start time');
  }
  
  // Add block
  const block = {
    reason,
    description,
    startDateTime,
    endDateTime,
    createdBy: req.user._id,
    isRecurring,
    recurringPattern,
    recurringEndDate
  };
  
  court.blocks.push(block);
  await court.save();
  
  // Cancel affected bookings
  const affectedBookings = await Booking.find({
    court: court._id,
    date: {
      $gte: new Date(startDateTime),
      $lte: new Date(endDateTime)
    },
    status: 'confirmed'
  }).populate('user');
  
  // Update bookings and send notifications
  for (const booking of affectedBookings) {
    booking.status = 'cancelled';
    booking.cancellationReason = `Court blocked for ${reason}`;
    booking.cancelledBy = req.user._id;
    booking.cancelledAt = new Date();
    await booking.save();
    
    // Send cancellation email
    try {
      await emailService.sendBookingCancellation(booking.user, booking, court);
    } catch (error) {
      console.error('Failed to send cancellation email:', error);
    }
  }
  
  res.json({
    success: true,
    data: court,
    affectedBookings: affectedBookings.length
  });
});

// @desc    Unblock court
// @route   POST /api/courts/:id/unblock/:blockId
// @access  Private/Admin
const unblockCourt = asyncHandler(async (req, res) => {
  const court = await Court.findById(req.params.id);
  
  if (!court) {
    res.status(404);
    throw new Error('Court not found');
  }
  
  court.blocks = court.blocks.filter(
    block => block._id.toString() !== req.params.blockId
  );
  
  await court.save();
  
  res.json({
    success: true,
    data: court
  });
});

module.exports = {
  getCourts,
  getCourt,
  createCourt,
  updateCourt,
  deleteCourt,
  blockCourt,
  unblockCourt
};