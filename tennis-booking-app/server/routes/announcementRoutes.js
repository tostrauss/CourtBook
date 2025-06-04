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

// Public routes (with optional auth for view tracking if implemented)
router.get('/', optionalAuth, validatePagination, getAnnouncements);
router.get('/:id', optionalAuth, validateMongoId(), getAnnouncement);

// Admin routes
// All subsequent routes in this file will use 'protect' and 'admin' middleware
router.use(protect, admin);

router.post('/', validateCreateAnnouncement, createAnnouncement);
router.put('/:id', validateMongoId(), updateAnnouncement);
router.delete('/:id', validateMongoId(), deleteAnnouncement);

module.exports = router;
