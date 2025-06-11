// server/routes/lessonRoutes.js
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const lessonController = require('../controllers/lessonController');
const authMiddleware = require('../middleware/authMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware.protect);

// Get all lessons (with filtering)
router.get('/', lessonController.getLessons);

// Get lesson by ID
router.get('/:id', lessonController.getLessonById);

// Create a new lesson
router.post('/',
  [
    authMiddleware.restrictTo('admin', 'coach'),
    check('coachId').isUUID().withMessage('Valid coach ID is required'),
    check('type').isIn(['individual', 'group', 'kids', 'beginner', 'advanced', 'tournament_prep'])
      .withMessage('Valid lesson type is required'),
    check('date').isDate().withMessage('Valid date is required'),
    check('startTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time is required (HH:MM)'),
    check('duration').isInt({ min: 15, max: 360 }).withMessage('Duration must be between 15 and 360 minutes'),
    check('maxParticipants').optional().isInt({ min: 1, max: 20 }).withMessage('Max participants must be between 1 and 20'),
    check('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
    validationMiddleware
  ],
  lessonController.createLesson
);

// Update a lesson
router.put('/:id',
  [
    authMiddleware.restrictTo('admin', 'coach'),
    check('coachId').optional().isUUID().withMessage('Valid coach ID is required'),
    check('type').optional().isIn(['individual', 'group', 'kids', 'beginner', 'advanced', 'tournament_prep'])
      .withMessage('Valid lesson type is required'),
    check('date').optional().isDate().withMessage('Valid date is required'),
    check('startTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time is required (HH:MM)'),
    check('duration').optional().isInt({ min: 15, max: 360 }).withMessage('Duration must be between 15 and 360 minutes'),
    check('maxParticipants').optional().isInt({ min: 1, max: 20 }).withMessage('Max participants must be between 1 and 20'),
    check('price').optional().isFloat({ min: 0 }).withMessage('Valid price is required'),
    check('status').optional().isIn(['scheduled', 'confirmed', 'completed', 'cancelled']).withMessage('Valid status is required'),
    validationMiddleware
  ],
  lessonController.updateLesson
);

// Delete a lesson
router.delete('/:id', 
  authMiddleware.restrictTo('admin', 'coach'),
  lessonController.deleteLesson
);

// Book a lesson (add participant)
router.post('/:id/book',
  [
    check('userId').optional().isUUID().withMessage('Valid user ID is required'),
    validationMiddleware
  ],
  lessonController.bookLesson
);

// Cancel lesson booking (remove participant)
router.delete('/:id/participants/:participantId?', lessonController.cancelBooking);

// Get user's lesson bookings
router.get('/user/:userId?', lessonController.getUserLessons);

// Get coach's lessons
router.get('/coach/:coachId?', lessonController.getCoachLessons);

// Update lesson participant status (for attendance or payment)
router.patch('/:lessonId/participants/:participantId',
  [
    authMiddleware.restrictTo('admin', 'coach'),
    check('paymentStatus').optional().isIn(['pending', 'paid', 'refunded', 'waived']).withMessage('Valid payment status is required'),
    validationMiddleware
  ],
  lessonController.updateParticipantStatus
);

module.exports = router;