// server/routes/userRoutes.js
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
// All subsequent routes in this file will use the 'protect' middleware
router.use(protect);

router.get('/me', getMe);
router.put('/me', updateMe);
router.put('/me/password', updatePassword);

// Admin routes
// All subsequent routes from this point will also require 'admin' privileges
router.get('/', admin, getAllUsers); // Apply admin middleware specifically here or use router.use(admin) if all below are admin
router.get('/:id', admin, validateMongoId(), getUser);
router.put('/:id', admin, validateMongoId(), updateUser);
router.delete('/:id', admin, validateMongoId(), deleteUser);

module.exports = router;
