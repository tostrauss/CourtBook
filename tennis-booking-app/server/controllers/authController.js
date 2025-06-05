// server/controllers/authController.js
const crypto = require('crypto');
const { Op } = require('sequelize');
const { User, RefreshToken, sequelize } = require('../models');
const { asyncHandler } = require('../middleware/errorMiddleware');
const {
  generateAccessToken,
  generateRefreshToken,
  generateEmailVerificationToken,
  generatePasswordResetToken
} = require('../utils/generateToken');
const emailService = require('../utils/emailService');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName, phoneNumber } = req.body;

  // Start transaction
  const transaction = await sequelize.transaction();

  try {
    // Check if user exists
    const userExists = await User.findOne({
      where: {
        [Op.or]: [
          { email: email.toLowerCase() },
          { username: username }
        ]
      },
      transaction
    });

    if (userExists) {
      await transaction.rollback();
      res.status(400);
      throw new Error('User already exists with this email or username');
    }

    // Generate email verification token
    const { token, hashedToken } = generateEmailVerificationToken();

    // Create user
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      phoneNumber,
      emailVerificationToken: hashedToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    }, { transaction });

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshTokenValue = generateRefreshToken(user.id);

    // Save refresh token
    await RefreshToken.create({
      userId: user.id,
      token: refreshTokenValue,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }, { transaction });

    // Commit transaction
    await transaction.commit();

    // Send verification email (outside transaction)
    try {
      const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
      await emailService.sendWelcomeEmail(user, verificationUrl);
    } catch (error) {
      console.error('Failed to send verification email:', error);
    }

    // Set refresh token cookie
    res.cookie('refreshToken', refreshTokenValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      success: true,
      data: {
        user: user.toJSON(),
        accessToken
      }
    });

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user with password field
  const user = await User.findOne({
    where: { email: email.toLowerCase() },
    attributes: { 
      include: ['password'] // Include password field for comparison
    }
  });

  if (!user) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  // Check if account is active
  if (!user.isActive) {
    res.status(401);
    throw new Error('Account is deactivated. Please contact support.');
  }

  // Check password
  const isPasswordMatch = await user.comparePassword(password);

  if (!isPasswordMatch) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  // Clean expired tokens
  await RefreshToken.cleanExpiredTokens(user.id);

  // Generate new tokens
  const accessToken = generateAccessToken(user.id, user.role);
  const refreshTokenValue = generateRefreshToken(user.id);

  // Save new refresh token
  await RefreshToken.create({
    userId: user.id,
    token: refreshTokenValue,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  });

  // Update last login
  await user.update({ lastLogin: new Date() });

  // Set refresh token cookie
  res.cookie('refreshToken', refreshTokenValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  // Remove password from response
  const userResponse = user.toJSON();

  res.json({
    success: true,
    data: {
      user: userResponse,
      accessToken
    }
  });
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Public
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (refreshToken) {
    // Delete the refresh token from database
    await RefreshToken.destroy({
      where: { token: refreshToken }
    });
  }

  // Clear cookie
  res.cookie('refreshToken', '', {
    httpOnly: true,
    expires: new Date(0)
  });

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
// @access  Public
const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    res.status(401);
    throw new Error('No refresh token provided');
  }

  // Verify refresh token
  let decoded;
  try {
    decoded = require('jsonwebtoken').verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    res.status(401);
    throw new Error('Invalid refresh token');
  }

  // Find the refresh token in database
  const tokenRecord = await RefreshToken.findOne({
    where: { 
      token: refreshToken,
      userId: decoded.id
    },
    include: [{
      model: User,
      as: 'user',
      attributes: ['id', 'role', 'isActive']
    }]
  });

  if (!tokenRecord || tokenRecord.isExpired()) {
    res.status(401);
    throw new Error('Invalid or expired refresh token');
  }

  if (!tokenRecord.user || !tokenRecord.user.isActive) {
    res.status(401);
    throw new Error('User not found or inactive');
  }

  // Generate new access token
  const accessToken = generateAccessToken(tokenRecord.user.id, tokenRecord.user.role);

  res.json({
    success: true,
    data: {
      accessToken
    }
  });
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ 
    where: { email: email.toLowerCase() } 
  });

  if (!user) {
    // Don't reveal if user exists
    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    });
    return;
  }

  // Generate reset token
  const { token, hashedToken } = generatePasswordResetToken();

  // Save hashed token to user
  await user.update({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
  });

  // Send email
  try {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    await emailService.sendPasswordResetEmail(user, resetUrl);
  } catch (error) {
    await user.update({
      resetPasswordToken: null,
      resetPasswordExpires: null
    });
    
    res.status(500);
    throw new Error('Failed to send email. Please try again later.');
  }

  res.json({
    success: true,
    message: 'If an account exists with this email, a password reset link has been sent.'
  });
});

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const { token } = req.params;

  // Hash the token to compare with stored hash
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Start transaction
  const transaction = await sequelize.transaction();

  try {
    // Find user with valid reset token
    const user = await User.findOne({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { [Op.gt]: new Date() }
      },
      transaction
    });

    if (!user) {
      await transaction.rollback();
      res.status(400);
      throw new Error('Invalid or expired reset token');
    }

    // Update password and clear reset token fields
    await user.update({
      password: password,
      resetPasswordToken: null,
      resetPasswordExpires: null
    }, { transaction });

    // Generate new tokens for auto-login
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshTokenValue = generateRefreshToken(user.id);

    // Save refresh token
    await RefreshToken.create({
      userId: user.id,
      token: refreshTokenValue,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }, { transaction });

    // Commit transaction
    await transaction.commit();

    // Set refresh token cookie
    res.cookie('refreshToken', refreshTokenValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: 'Password reset successful',
      data: {
        user: user.toJSON(),
        accessToken
      }
    });

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  // Hash the token to compare with stored hash
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Find user with valid verification token
  const user = await User.findOne({
    where: {
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { [Op.gt]: new Date() }
    }
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired verification token');
  }

  // Verify email
  await user.update({
    emailVerified: true,
    emailVerificationToken: null,
    emailVerificationExpires: null
  });

  res.json({
    success: true,
    message: 'Email verified successfully'
  });
});

module.exports = {
  register,
  login,
  logout,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  verifyEmail
};