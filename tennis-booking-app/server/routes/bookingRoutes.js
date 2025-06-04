const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getAllBookings,
  getBooking,
  cancelBooking,
  updateBooking,
  deleteBooking
} = require('../controllers/bookingController');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  validateCreateBooking,
  validateMongoId,
  validatePagination
} = require('../middleware/validationMiddleware');

// All routes require authentication
router.use(protect);

// User routes
router.post('/', validateCreateBooking, createBooking);
router.get('/my-bookings', validatePagination, getMyBookings);
router.get('/:id', validateMongoId(), getBooking);
router.put('/:id/cancel', validateMongoId(), cancelBooking);

// Admin routes
router.get('/', admin, validatePagination, getAllBookings);
router.put('/:id', admin, validateMongoId(), updateBooking);
router.delete('/:id', admin, validateMongoId(), deleteBooking);

module.exports = router;

// server/routes/announcementRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} = require('../controllers/announcementController');
const { protect, admin, optionalAuth } = require('../middleware/authMiddleware');
const {
  validateCreateAnnouncement,
  validateMongoId,
  validatePagination
} = require('../middleware/validationMiddleware');

// Public routes (with optional auth for view tracking)
router.get('/', optionalAuth, validatePagination, getAnnouncements);
router.get('/:id', optionalAuth, validateMongoId(), getAnnouncement);

// Admin routes
router.use(protect, admin);
router.post('/', validateCreateAnnouncement, createAnnouncement);
router.put('/:id', validateMongoId(), updateAnnouncement);
router.delete('/:id', validateMongoId(), deleteAnnouncement);

module.exports = router;