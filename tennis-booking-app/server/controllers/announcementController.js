const Announcement = require('../models/Announcement');
const { asyncHandler } = require('../middleware/errorMiddleware');

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
  
  const query = {};
  
  // Filter active announcements by default
  if (isActive !== 'all') {
    query.isActive = true;
    query.publishDate = { $lte: new Date() };
    query.$or = [
      { expiryDate: null },
      { expiryDate: { $gt: new Date() } }
    ];
  }
  
  if (type) query.type = type;
  if (targetAudience) query.targetAudience = { $in: ['all', targetAudience] };
  
  const announcements = await Announcement.find(query)
    .populate('author', 'username firstName lastName')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const count = await Announcement.countDocuments(query);
  
  res.json({
    success: true,
    count,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(count / limit)
    },
    data: announcements
  });
});

// @desc    Get single announcement
// @route   GET /api/announcements/:id
// @access  Public
const getAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id)
    .populate('author', 'username firstName lastName');
  
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
  req.body.author = req.user._id;
  
  const announcement = await Announcement.create(req.body);
  
  res.status(201).json({
    success: true,
    data: announcement
  });
});

// @desc    Update announcement
// @route   PUT /api/announcements/:id
// @access  Private/Admin
const updateAnnouncement = asyncHandler(async (req, res) => {
  let announcement = await Announcement.findById(req.params.id);
  
  if (!announcement) {
    res.status(404);
    throw new Error('Announcement not found');
  }
  
  req.body.lastModifiedBy = req.user._id;
  
  announcement = await Announcement.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );
  
  res.json({
    success: true,
    data: announcement
  });
});

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
// @access  Private/Admin
const deleteAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  
  if (!announcement) {
    res.status(404);
    throw new Error('Announcement not found');
  }
  
  await announcement.deleteOne();
  
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