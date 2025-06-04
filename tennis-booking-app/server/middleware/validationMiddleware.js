// server/middleware/validationMiddleware.js
const { body, param, query, validationResult } = require('express-validator');

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param || err.path, // Use err.path if err.param is undefined
        message: err.msg
      }))
    });
  }
  next();
};

// User validation rules
const validateRegister = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores and hyphens'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Booking validation rules
const validateCreateBooking = [
  body('courtId')
    .isMongoId()
    .withMessage('Invalid court ID'),
  body('date')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      const bookingDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize today to start of day
      // Allow booking for today or future dates
      return bookingDate >= today;
    })
    .withMessage('Cannot book for past dates'),
  body('startTime')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Invalid start time format (HH:MM)'),
  body('endTime')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Invalid end time format (HH:MM)')
    .custom((value, { req }) => {
      // Basic check, more complex validation (e.g., duration) should be in controller
      return value > req.body.startTime;
    })
    .withMessage('End time must be after start time'),
  body('players')
    .optional()
    .isArray()
    .withMessage('Players must be an array'),
  body('players.*.name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Player name cannot exceed 100 characters'),
  body('players.*.email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid player email'),
  handleValidationErrors
];

// Court validation rules
const validateCreateCourt = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Court name is required')
    .isLength({ max: 50 })
    .withMessage('Court name cannot exceed 50 characters'),
  body('type')
    .isIn(['indoor', 'outdoor', 'covered'])
    .withMessage('Invalid court type'),
  body('surface')
    .isIn(['hard', 'clay', 'grass', 'synthetic'])
    .withMessage('Invalid court surface'),
  body('bookingRules.minBookingDuration')
    .optional()
    .isInt({ min: 15, max: 240 }) // Assuming duration in minutes
    .withMessage('Minimum booking duration must be between 15 and 240 minutes'),
  body('bookingRules.maxBookingDuration')
    .optional()
    .isInt({ min: 15, max: 240 })
    .withMessage('Maximum booking duration must be between 15 and 240 minutes'),
  body('bookingRules.advanceBookingDays')
    .optional()
    .isInt({ min: 1, max: 90 }) // Increased max for admin flexibility
    .withMessage('Advance booking days must be between 1 and 90'),
  handleValidationErrors
];

// Announcement validation rules
const validateCreateAnnouncement = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ max: 5000 })
    .withMessage('Content cannot exceed 5000 characters'),
  body('type')
    .optional()
    .isIn(['info', 'warning', 'urgent', 'maintenance', 'event'])
    .withMessage('Invalid announcement type'),
  body('priority')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('Priority must be between 0 and 10'),
  handleValidationErrors
];

// Common validation rules
const validateMongoId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format (must be a MongoID)`),
  handleValidationErrors
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('sort')
    .optional()
    // Updated regex to allow comma-separated fields, optional '-', and alphanumeric characters including underscore
    .matches(/^-?([a-zA-Z0-9_]+)(,-?([a-zA-Z0-9_]+))*$/)
    .withMessage('Invalid sort field format. Allowed characters: a-z, A-Z, 0-9, _. Can be comma-separated and optionally start with "-". Examples: "fieldName", "-fieldName", "field1,-field2"'),
  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validateCreateBooking,
  validateCreateCourt,
  validateCreateAnnouncement,
  validateMongoId,
  validatePagination,
  handleValidationErrors // Export this if used elsewhere, though typically it's internal to this module
};
