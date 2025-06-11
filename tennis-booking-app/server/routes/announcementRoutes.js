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
  validateUUID,
  validatePagination
} = require('../middleware/validationMiddleware');

// Public routes with optional auth for view tracking
router.get('/', optionalAuth, validatePagination, getAnnouncements);
router.get('/:id', optionalAuth, validateUUID(), getAnnouncement);

// Admin routes
router.use(protect, admin);
router.post('/', validateCreateAnnouncement, createAnnouncement);
router.put('/:id', validateUUID(), updateAnnouncement);
router.delete('/:id', validateUUID(), deleteAnnouncement);

module.exports = router;