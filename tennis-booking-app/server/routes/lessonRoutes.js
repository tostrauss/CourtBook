// server/routes/lessonRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const lessonController = require('../controllers/lessonController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { handleValidationErrors, validateUUID } = require('../middleware/validationMiddleware');

// Validation rules for lessons
const validateCreateLesson = [
  body('coachId')
    .custom((value) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(value);
    })
    .withMessage('Valid coach ID is required'),
  body('type')
    .isIn(['individual', 'group', 'kids', 'beginner', 'advanced', 'tournament_prep'])
    .withMessage('Valid lesson type is required'),
  body('date')
    .isISO8601()
    .withMessage('Valid date is required'),
  body('startTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Valid start time is required (HH:MM)'),
  body('duration')
    .isInt({ min: 15, max: 360 })
    .withMessage('Duration must be between 15 and 360 minutes'),
  body('maxParticipants')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Max participants must be between 1 and 20'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Valid price is required'),
  handleValidationErrors
];

const validateUpdateLesson = [
  body('coachId')
    .optional()
    .custom((value) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(value);
    })
    .withMessage('Valid coach ID is required'),
  body('type')
    .optional()
    .isIn(['individual', 'group', 'kids', 'beginner', 'advanced', 'tournament_prep'])
    .withMessage('Valid lesson type is required'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Valid date is required'),
  body('startTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Valid start time is required (HH:MM)'),
  body('duration')
    .optional()
    .isInt({ min: 15, max: 360 })
    .withMessage('Duration must be between 15 and 360 minutes'),
  body('maxParticipants')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Max participants must be between 1 and 20'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Valid price is required'),
  body('status')
    .optional()
    .isIn(['scheduled', 'confirmed', 'completed', 'cancelled'])
    .withMessage('Valid status is required'),
  handleValidationErrors
];

// Apply auth middleware to all routes
router.use(protect);

// Middleware to add club context (simplified for single-club setup)
router.use((req, res, next) => {
  // For now, we'll use a default club ID
  // In a multi-tenant setup, this would come from subdomain or user's selected club
  req.clubId = process.env.DEFAULT_CLUB_ID || 'default-club-id';
  next();
});

// Public routes (for authenticated users)
router.get('/', lessonController.getLessons);
router.get('/user/:userId?', lessonController.getUserLessons);
router.get('/:id', validateUUID(), lessonController.getLessonById);

// Booking routes
router.post('/:id/book', 
  validateUUID(),
  body('userId').optional().custom((value) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }).withMessage('Valid user ID is required'),
  handleValidationErrors,
  lessonController.bookLesson
);

router.delete('/:id/participants/:participantId?', 
  validateUUID('id'),
  lessonController.cancelBooking
);

// Coach routes
router.use(authorize('admin', 'coach'));

router.get('/coach/:coachId?', lessonController.getCoachLessons);

router.post('/', 
  validateCreateLesson,
  lessonController.createLesson
);

router.put('/:id',
  validateUUID(),
  validateUpdateLesson,
  lessonController.updateLesson
);

router.delete('/:id', 
  validateUUID(),
  lessonController.deleteLesson
);

router.patch('/:lessonId/participants/:participantId',
  validateUUID('lessonId'),
  validateUUID('participantId'),
  body('paymentStatus')
    .optional()
    .isIn(['pending', 'paid', 'refunded', 'waived'])
    .withMessage('Valid payment status is required'),
  handleValidationErrors,
  lessonController.updateParticipantStatus
);

module.exports = router;