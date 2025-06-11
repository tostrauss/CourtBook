// server/controllers/lessonController.js
const { Lesson, LessonParticipant, User, Court, sequelize, Op } = require('../models');
const { validationResult } = require('express-validator');

// Get all lessons (with filtering)
exports.getLessons = async (req, res) => {
  try {
    const {
      clubId,
      coachId,
      courtId,
      type,
      startDate,
      endDate,
      status
    } = req.query;

    // Build filter object based on query parameters
    const filter = { club_id: req.clubId };

    if (clubId) filter.club_id = clubId;
    if (coachId) filter.coach_id = coachId;
    if (courtId) filter.court_id = courtId;
    if (type) filter.type = type;
    if (status) filter.status = status;
    
    // Date range filtering
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date[Op.gte] = startDate;
      if (endDate) filter.date[Op.lte] = endDate;
    }

    const lessons = await Lesson.findAll({
      where: filter,
      include: [
        {
          model: User,
          as: 'coach',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: Court,
          as: 'court',
          attributes: ['id', 'name', 'type', 'surface']
        },
        {
          model: LessonParticipant,
          as: 'participants',
          include: [
            {
              model: User,
              as: 'participant',
              attributes: ['id', 'first_name', 'last_name', 'email']
            }
          ]
        }
      ],
      order: [['date', 'ASC'], ['start_time', 'ASC']]
    });

    return res.status(200).json(lessons);
  } catch (error) {
    console.error('Error fetching lessons:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get lesson by ID
exports.getLessonById = async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findOne({
      where: { 
        id,
        club_id: req.clubId
      },
      include: [
        {
          model: User,
          as: 'coach',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: Court,
          as: 'court',
          attributes: ['id', 'name', 'type', 'surface']
        },
        {
          model: LessonParticipant,
          as: 'participants',
          include: [
            {
              model: User,
              as: 'participant',
              attributes: ['id', 'first_name', 'last_name', 'email']
            }
          ]
        }
      ]
    });

    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    return res.status(200).json(lesson);
  } catch (error) {
    console.error('Error fetching lesson:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Create a new lesson
exports.createLesson = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const transaction = await sequelize.transaction();

  try {
    const {
      coachId,
      courtId,
      type,
      date,
      startTime,
      duration,
      maxParticipants,
      price,
      notes,
      recurringType,
      recurringEndDate
    } = req.body;

    // Check if coach exists and is a coach
    const coach = await User.findOne({
      where: { 
        id: coachId,
        role: 'coach'
      },
      transaction
    });

    if (!coach) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Invalid coach' });
    }

    // Check if court exists
    if (courtId) {
      const court = await Court.findOne({
        where: { 
          id: courtId,
          club_id: req.clubId
        },
        transaction
      });
  
      if (!court) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Invalid court' });
      }
    }

    // Create the lesson
    const lesson = await Lesson.create({
      club_id: req.clubId,
      coach_id: coachId,
      court_id: courtId,
      type,
      date,
      start_time: startTime,
      duration,
      max_participants: maxParticipants || 1,
      price,
      status: 'scheduled',
      notes,
      recurring_type: recurringType,
      recurring_end_date: recurringEndDate
    }, { transaction });

    await transaction.commit();
    
    return res.status(201).json(lesson);
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating lesson:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Update a lesson
exports.updateLesson = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const {
      coachId,
      courtId,
      type,
      date,
      startTime,
      duration,
      maxParticipants,
      price,
      status,
      notes,
      recurringType,
      recurringEndDate
    } = req.body;

    // Check if lesson exists
    const lesson = await Lesson.findOne({
      where: { 
        id, 
        club_id: req.clubId
      },
      transaction
    });

    if (!lesson) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // Verify coach if it's being updated
    if (coachId) {
      const coach = await User.findOne({
        where: { 
          id: coachId,
          role: 'coach'
        },
        transaction
      });
  
      if (!coach) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Invalid coach' });
      }
    }

    // Verify court if it's being updated
    if (courtId) {
      const court = await Court.findOne({
        where: { 
          id: courtId,
          club_id: req.clubId
        },
        transaction
      });
  
      if (!court) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Invalid court' });
      }
    }

    // Update the lesson
    await lesson.update({
      coach_id: coachId || lesson.coach_id,
      court_id: courtId || lesson.court_id,
      type: type || lesson.type,
      date: date || lesson.date,
      start_time: startTime || lesson.start_time,
      duration: duration || lesson.duration,
      max_participants: maxParticipants || lesson.max_participants,
      price: price || lesson.price,
      status: status || lesson.status,
      notes: notes !== undefined ? notes : lesson.notes,
      recurring_type: recurringType || lesson.recurring_type,
      recurring_end_date: recurringEndDate || lesson.recurring_end_date
    }, { transaction });

    await transaction.commit();

    return res.status(200).json({ message: 'Lesson updated successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating lesson:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Delete a lesson
exports.deleteLesson = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    // Check if lesson exists
    const lesson = await Lesson.findOne({
      where: { 
        id, 
        club_id: req.clubId
      },
      transaction
    });

    if (!lesson) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // Delete the lesson
    await lesson.destroy({ transaction });

    await transaction.commit();

    return res.status(200).json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting lesson:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Book a lesson (add participant)
exports.bookLesson = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { userId } = req.body;

    // Verify user ID or use authenticated user
    const participantId = userId || req.user.id;

    // Check if lesson exists
    const lesson = await Lesson.findOne({
      where: { 
        id, 
        club_id: req.clubId,
        status: {
          [Op.ne]: 'cancelled'
        }
      },
      include: [
        {
          model: LessonParticipant,
          as: 'participants'
        }
      ],
      transaction
    });

    if (!lesson) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Lesson not found or cancelled' });
    }

    // Check if lesson is full
    if (lesson.participants.length >= lesson.max_participants) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Lesson is fully booked' });
    }

    // Check if user is already participating
    const existingParticipant = await LessonParticipant.findOne({
      where: {
        lesson_id: id,
        user_id: participantId
      },
      transaction
    });

    if (existingParticipant) {
      await transaction.rollback();
      return res.status(400).json({ message: 'User is already booked for this lesson' });
    }

    // Add participant
    const participant = await LessonParticipant.create({
      lesson_id: id,
      user_id: participantId,
      payment_status: 'pending'
    }, { transaction });

    await transaction.commit();

    return res.status(201).json({ 
      message: 'Lesson booked successfully',
      participant
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error booking lesson:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Cancel lesson booking (remove participant)
exports.cancelBooking = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id, participantId } = req.params;

    // Verify user ID or use authenticated user
    const userId = participantId || req.user.id;

    // Check if booking exists
    const booking = await LessonParticipant.findOne({
      where: {
        lesson_id: id,
        user_id: userId
      },
      include: [
        {
          model: Lesson,
          as: 'lesson',
          where: { club_id: req.clubId }
        }
      ],
      transaction
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Delete the booking
    await booking.destroy({ transaction });

    await transaction.commit();

    return res.status(200).json({ message: 'Lesson booking cancelled successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error cancelling lesson booking:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get user's lesson bookings
exports.getUserLessons = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;

    const bookings = await LessonParticipant.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Lesson,
          as: 'lesson',
          where: { club_id: req.clubId },
          include: [
            {
              model: User,
              as: 'coach',
              attributes: ['id', 'first_name', 'last_name', 'email']
            },
            {
              model: Court,
              as: 'court',
              attributes: ['id', 'name', 'type', 'surface']
            }
          ]
        }
      ],
      order: [
        [{ model: Lesson, as: 'lesson' }, 'date', 'ASC'],
        [{ model: Lesson, as: 'lesson' }, 'start_time', 'ASC']
      ]
    });

    return res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching user lessons:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get coach's lessons
exports.getCoachLessons = async (req, res) => {
  try {
    const coachId = req.params.coachId || req.user.id;

    const lessons = await Lesson.findAll({
      where: { 
        coach_id: coachId,
        club_id: req.clubId
      },
      include: [
        {
          model: Court,
          as: 'court',
          attributes: ['id', 'name', 'type', 'surface']
        },
        {
          model: LessonParticipant,
          as: 'participants',
          include: [
            {
              model: User,
              as: 'participant',
              attributes: ['id', 'first_name', 'last_name', 'email']
            }
          ]
        }
      ],
      order: [['date', 'ASC'], ['start_time', 'ASC']]
    });

    return res.status(200).json(lessons);
  } catch (error) {
    console.error('Error fetching coach lessons:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Update lesson participant status (for attendance or payment)
exports.updateParticipantStatus = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { lessonId, participantId } = req.params;
    const { attended, paymentStatus, notes } = req.body;

    // Check if booking exists
    const booking = await LessonParticipant.findOne({
      where: {
        lesson_id: lessonId,
        user_id: participantId
      },
      include: [
        {
          model: Lesson,
          as: 'lesson',
          where: { club_id: req.clubId }
        }
      ],
      transaction
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Update the booking
    await booking.update({
      attended: attended !== undefined ? attended : booking.attended,
      payment_status: paymentStatus || booking.payment_status,
      notes: notes !== undefined ? notes : booking.notes
    }, { transaction });

    await transaction.commit();

    return res.status(200).json({ message: 'Participant status updated successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating participant status:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};