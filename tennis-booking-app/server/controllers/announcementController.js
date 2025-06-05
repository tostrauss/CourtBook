// server/controllers/announcementController.js
const { Announcement, User, sequelize } = require('../models');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { Op } = require('sequelize');

// @desc    Get all announcements
// @route   GET /api/announcements
// @access  Public
const getAnnouncements = asyncHandler(async (req, res) => {
  const { 
    type, 
    isActive = true, 
    targetAudience,
    page = 1, 
    limit = 10, 
    sort = '-priority,-publishDate' 
  } = req.query;
  
  const where = {};
  
  // Filter active announcements by default
  if (isActive !== 'all') {
    where.isActive = true;
    where.publishDate = { [Op.lte]: new Date() };
    where[Op.or] = [
      { expiryDate: null },
      { expiryDate: { [Op.gt]: new Date() } }
    ];
  }
  
  if (type) where.type = type;
  if (targetAudience) {
    where.targetAudience = { [Op.in]: ['all', targetAudience] };
  }
  
  // Parse sort parameter
  const order = sort.split(',').map(field => {
    const isDesc = field.startsWith('-');
    const fieldName = isDesc ? field.substring(1) : field;
    const fieldMap = {
      priority: 'priority',
      publishDate: 'publish_date',
      isPinned: 'is_pinned'
    };
    return [fieldMap[fieldName] || fieldName, isDesc ? 'DESC' : 'ASC'];
  });
  
  const { count, rows: announcements } = await Announcement.findAndCountAll({
    where,
    include: [{
      model: User,
      as: 'author',
      attributes: ['id', 'username', 'firstName', 'lastName']
    }],
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
    data: announcements
  });
});

// @desc    Get single announcement
// @route   GET /api/announcements/:id
// @access  Public
const getAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findByPk(req.params.id, {
    include: [{
      model: User,
      as: 'author',
      attributes: ['id', 'username', 'firstName', 'lastName']
    }]
  });
  
  if (!announcement) {
    res.status(404);
    throw new Error('Announcement not found');
  }
  
  // Increment view count if user is logged in
  if (req.user) {
    await announcement.incrementViewCount();
  }
  
  res.json({
    success: true,
    data: announcement
  });
});

// @desc    Create announcement
// @route   POST /api/announcements
// @access  Private/Admin
const createAnnouncement = asyncHandler(async (req, res) => {
  req.body.authorId = req.user.id;
  
  const announcement = await Announcement.create(req.body);
  
  // Reload with associations
  await announcement.reload({
    include: [{
      model: User,
      as: 'author',
      attributes: ['id', 'username', 'firstName', 'lastName']
    }]
  });
  
  res.status(201).json({
    success: true,
    data: announcement
  });
});

// @desc    Update announcement
// @route   PUT /api/announcements/:id
// @access  Private/Admin
const updateAnnouncement = asyncHandler(async (req, res) => {
  let announcement = await Announcement.findByPk(req.params.id);
  
  if (!announcement) {
    res.status(404);
    throw new Error('Announcement not found');
  }
  
  req.body.lastModifiedBy = req.user.id;
  
  await announcement.update(req.body);
  
  // Reload with associations
  await announcement.reload({
    include: [{
      model: User,
      as: 'author',
      attributes: ['id', 'username', 'firstName', 'lastName']
    }]
  });
  
  res.json({
    success: true,
    data: announcement
  });
});

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
// @access  Private/Admin
const deleteAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findByPk(req.params.id);
  
  if (!announcement) {
    res.status(404);
    throw new Error('Announcement not found');
  }
  
  await announcement.destroy();
  
  res.json({
    success: true,
    data: {}
  });
});

module.exports = {
  getAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
};