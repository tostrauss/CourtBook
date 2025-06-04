const express = require('express');
const router = express.Router();
const {
  getMe,
  updateMe,
  updatePassword,
  getAllUsers,
  getUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');
const { validateMongoId } = require('../middleware/validationMiddleware');

// User routes (authenticated)
router.use(protect);
router.get('/me', getMe);
router.put('/me', updateMe);
router.put('/me/password', updatePassword);

// Admin routes
router.use(admin);
router.get('/', getAllUsers);
router.get('/:id', validateMongoId(), getUser);
router.put('/:id', validateMongoId(), updateUser);
router.delete('/:id', validateMongoId(), deleteUser);

module.exports = router;

// server/routes/courtRoutes.js
const express = require('express');
const router = express.Router();
const {
  getCourts,
  getCourt,
  createCourt,
  updateCourt,
  deleteCourt,
  blockCourt,
  unblockCourt
} = require('../controllers/courtController');
const { protect, admin } = require('../middleware/authMiddleware');
const { 
  validateCreateCourt, 
  validateMongoId 
} = require('../middleware/validationMiddleware');

// Public routes
router.get('/', getCourts);
router.get('/:id', validateMongoId(), getCourt);

// Protected admin routes
router.use(protect, admin);
router.post('/', validateCreateCourt, createCourt);
router.put('/:id', validateMongoId(), updateCourt);
router.delete('/:id', validateMongoId(), deleteCourt);
router.post('/:id/block', validateMongoId(), blockCourt);
router.post('/:id/unblock/:blockId', validateMongoId(), unblockCourt);

module.exports = router;
