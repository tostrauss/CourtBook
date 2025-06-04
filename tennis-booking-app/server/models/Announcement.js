const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    maxlength: [5000, 'Content cannot exceed 5000 characters']
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'urgent', 'maintenance', 'event'],
    default: 'info'
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  targetAudience: {
    type: String,
    enum: ['all', 'members', 'guests', 'staff'],
    default: 'all'
  },
  publishDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiryDate: {
    type: Date,
    index: true
  },
  attachments: [{
    filename: String,
    url: String,
    fileType: String,
    fileSize: Number
  }],
  tags: [{
    type: String,
    trim: true
  }],
  viewCount: {
    type: Number,
    default: 0
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
announcementSchema.index({ isActive: 1, publishDate: -1 });
announcementSchema.index({ isPinned: -1, priority: -1, publishDate: -1 });
announcementSchema.index({ tags: 1 });
announcementSchema.index({ expiryDate: 1 });

// Methods
announcementSchema.methods.isExpired = function() {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate;
};

announcementSchema.methods.isPublished = function() {
  return new Date() >= this.publishDate;
};

announcementSchema.methods.shouldDisplay = function() {
  return this.isActive && this.isPublished() && !this.isExpired();
};

announcementSchema.methods.incrementViewCount = async function() {
  this.viewCount += 1;
  await this.save();
};

// Virtuals
announcementSchema.virtual('isNew').get(function() {
  const daysSincePublish = (new Date() - this.publishDate) / (1000 * 60 * 60 * 24);
  return daysSincePublish <= 3; // Consider new if published within 3 days
});

// Pre-save
announcementSchema.pre('save', function(next) {
  if (this.expiryDate && this.expiryDate <= this.publishDate) {
    next(new Error('Expiry date must be after publish date'));
  }
  next();
});

module.exports = mongoose.model('Announcement', announcementSchema);