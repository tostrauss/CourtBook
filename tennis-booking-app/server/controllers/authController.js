const crypto = require('crypto');
const User = require('../models/User');
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

  // Check if user exists
  const userExists = await User.findOne({
    $or: [{ email }, { username }]
  });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists with this email or username');
  }

  // Generate email verification token
  const { token, hashedToken } = generateEmailVerificationToken();

  // Create user
  const user = await User.create({
    username,
    email,
    password,
    firstName,
    lastName,
    phoneNumber,
    emailVerificationToken: hashedToken,
    emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  });

  if (user) {
    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    // Send verification email
    try {
      const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
      await emailService.sendWelcomeEmail(user, verificationUrl);
    } catch (error) {
      console.error('Failed to send verification email:', error);
    }

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified
        },
        accessToken
      }
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check for user
  const user = await User.findOne({ email }).select('+password');

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

  // Generate tokens
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  // Clean expired tokens and save new refresh token
  user.cleanExpiredTokens();
  user.refreshTokens.push({ token: refreshToken });
  user.lastLogin = new Date();
  await user.save();

  // Set refresh token cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified
      },
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
    // Find user and remove refresh token
    const user = await User.findOne({
      'refreshTokens.token': refreshToken
    });

    if (user) {
      user.refreshTokens = user.refreshTokens.filter(
        tokenObj => tokenObj.token !== refreshToken
      );
      await user.save();
    }
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

  // Find user with this refresh token
  const user = await User.findOne({
    _id: decoded.id,
    'refreshTokens.token': refreshToken
  });

  if (!user) {
    res.status(401);
    throw new Error('Invalid refresh token');
  }

  // Generate new access token
  const accessToken = generateAccessToken(user._id, user.role);

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

  const user = await User.findOne({ email });

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
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save();

  // Send email
  try {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    await emailService.sendPasswordResetEmail(user, resetUrl);
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
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

  // Find user with valid reset token
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired reset token');
  }

  // Set new password
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  // Generate new tokens for auto-login
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  // Save refresh token
  user.refreshTokens.push({ token: refreshToken });
  await user.save();

  // Set refresh token cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.json({
    success: true,
    message: 'Password reset successful',
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      },
      accessToken
    }
  });
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
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() }
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired verification token');
  }

  // Verify email
  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

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