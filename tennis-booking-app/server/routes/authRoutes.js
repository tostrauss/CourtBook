const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  verifyEmail
} = require('../controllers/authController');
const {
  validateRegister,
  validateLogin
} = require('../middleware/validationMiddleware');

// Authentication routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/logout', logout);
router.post('/refresh-token', refreshAccessToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/verify-email/:token', verifyEmail);

module.exports = router;