// server/controllers/userController.js
const { User, Booking, sequelize } = require('../models');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { Op } = require('sequelize');

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
  
  const user = await User.findByPk(req.user.id);
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  
  await user.update(fieldsToUpdate);
  
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
  
  // Get user with password field
  const user = await User.findByPk(req.user.id, {
    attributes: { include: ['password'] }
  });
  
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
  
  const where = {};
  
  if (role) where.role = role;
  if (isActive !== undefined) where.isActive = isActive === 'true';
  
  if (search) {
    where[Op.or] = [
      { username: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
      { firstName: { [Op.iLike]: `%${search}%` } },
      { lastName: { [Op.iLike]: `%${search}%` } }
    ];
  }
  
  // Parse sort parameter
  const order = sort.split(',').map(field => {
    const isDesc = field.startsWith('-');
    const fieldName = isDesc ? field.substring(1) : field;
    const fieldMap = {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };
    return [fieldMap[fieldName] || fieldName, isDesc ? 'DESC' : 'ASC'];
  });
  
  const { count, rows: users } = await User.findAndCountAll({
    where,
    order,
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit)
  });
  
  res.json({
    success: true,
    count,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(count / parseInt(limit))
    },
    data: users
  });
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  
  // Get user statistics using Sequelize
  const bookingStats = await Booking.findOne({
    where: { userId: user.id },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalBookings'],
      [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'completed' THEN 1 END")), 'completedBookings'],
      [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'cancelled' THEN 1 END")), 'cancelledBookings'],
      [sequelize.fn('SUM', sequelize.col('total_price')), 'totalSpent']
    ],
    raw: true
  });
  
  res.json({
    success: true,
    data: {
      user,
      stats: bookingStats || {
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
  const { password, ...updateData } = req.body;
  
  const user = await User.findByPk(req.params.id);
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  
  await user.update(updateData);
  
  res.json({
    success: true,
    data: user
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  
  // Check if user has any active bookings
  const activeBookings = await Booking.count({
    where: {
      userId: req.params.id,
      date: { [Op.gte]: new Date() },
      status: 'confirmed'
    }
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