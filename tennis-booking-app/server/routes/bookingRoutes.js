// server/routes/bookingRoutes.js
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
// All subsequent routes from this point will also require 'admin' privileges
router.get('/', admin, validatePagination, getAllBookings);
router.put('/:id', admin, validateMongoId(), updateBooking);
router.delete('/:id', admin, validateMongoId(), deleteBooking);

module.exports = router;
