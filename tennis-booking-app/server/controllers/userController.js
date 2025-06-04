const User = require('../models/User');
const Booking = require('../models/Booking');
const { asyncHandler } = require('../middleware/errorMiddleware');

// @desc    Get current user
// @route   GET /api/users/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

// @desc    Update current user
// @route   PUT /api/users/me
// @access  Private
const updateMe = asyncHandler(async (req, res) => {
  const fieldsToUpdate = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    phoneNumber: req.body.phoneNumber,
    preferences: req.body.preferences
  };
  
  // Remove undefined fields
  Object.keys(fieldsToUpdate).forEach(key => 
    fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
  );
  
  const user = await User.findByIdAndUpdate(
    req.user._id,
    fieldsToUpdate,
    {
      new: true,
      runValidators: true
    }
  );
  
  res.json({
    success: true,
    data: user
  });
});

// @desc    Update password
// @route   PUT /api/users/me/password
// @access  Private
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error('Please provide both current and new password');
  }
  
  const user = await User.findById(req.user._id).select('+password');
  
  // Check current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    res.status(401);
    throw new Error('Current password is incorrect');
  }
  
  // Update password
  user.password = newPassword;
  await user.save();
  
  res.json({
    success: true,
    message: 'Password updated successfully'
  });
});

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = asyncHandler(async (req, res) => {
  const { 
    role, 
    isActive, 
    search, 
    page = 1, 
    limit = 20, 
    sort = '-createdAt' 
  } = req.query;
  
  const query = {};
  
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  
  if (search) {
    query.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } }
    ];
  }
  
  const users = await User.find(query)
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const count = await User.countDocuments(query);
  
  res.json({
    success: true,
    count,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(count / limit)
    },
    data: users
  });
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  
  // Get user statistics
  const stats = await Booking.aggregate([
    { $match: { user: user._id } },
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        completedBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        cancelledBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        totalSpent: { $sum: '$totalPrice' }
      }
    }
  ]);
  
  res.json({
    success: true,
    data: {
      user,
      stats: stats[0] || {
        totalBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        totalSpent: 0
      }
    }
  });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
  const { password, refreshTokens, ...updateData } = req.body;
  
  const user = await User.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  );
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  
  res.json({
    success: true,
    data: user
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  
  // Check if user has any active bookings
  const activeBookings = await Booking.countDocuments({
    user: req.params.id,
    date: { $gte: new Date() },
    status: 'confirmed'
  });
  
  if (activeBookings > 0) {
    res.status(400);
    throw new Error('Cannot delete user with active bookings');
  }
  
  // Soft delete - just deactivate the account
  user.isActive = false;
  await user.save();
  
  res.json({
    success: true,
    message: 'User account deactivated'
  });
});

module.exports = {
  getMe,
  updateMe,
  updatePassword,
  getAllUsers,
  getUser,
  updateUser,
  deleteUser
};
