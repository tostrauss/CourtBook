// server/models/index.js
const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

// Initialize all models
const User = require('./User')(sequelize);
const Court = require('./Court')(sequelize);
const Booking = require('./Booking')(sequelize);
const Announcement = require('./Announcement')(sequelize);
const CourtBlock = require('./CourtBlock')(sequelize);
const RefreshToken = require('./RefreshToken')(sequelize);
const Lesson = require('./Lesson')(sequelize);
const LessonParticipant = require('./LessonParticipant')(sequelize);

// Define associations after all models are initialized

// User associations
User.hasMany(Booking, { 
  foreignKey: 'user_id', 
  as: 'bookings',
  onDelete: 'RESTRICT' 
});

User.hasMany(Announcement, { 
  foreignKey: 'author_id', 
  as: 'announcements',
  onDelete: 'RESTRICT'
});

User.hasMany(RefreshToken, { 
  foreignKey: 'user_id', 
  as: 'refreshTokens',
  onDelete: 'CASCADE' 
});

User.hasMany(CourtBlock, { 
  foreignKey: 'created_by', 
  as: 'createdBlocks',
  onDelete: 'RESTRICT'
});

User.hasMany(Booking, {
  foreignKey: 'cancelled_by',
  as: 'cancelledBookings',
  onDelete: 'SET NULL'
});

User.hasMany(Announcement, {
  foreignKey: 'last_modified_by',
  as: 'modifiedAnnouncements',
  onDelete: 'SET NULL'
});

// Court associations
Court.hasMany(Booking, { 
  foreignKey: 'court_id', 
  as: 'bookings',
  onDelete: 'RESTRICT'
});

Court.hasMany(CourtBlock, { 
  foreignKey: 'court_id', 
  as: 'blocks',
  onDelete: 'CASCADE'
});

// Booking associations
Booking.belongsTo(User, { 
  foreignKey: 'user_id', 
  as: 'user'
});

Booking.belongsTo(Court, { 
  foreignKey: 'court_id', 
  as: 'court'
});

Booking.belongsTo(User, { 
  foreignKey: 'cancelled_by', 
  as: 'cancelledByUser'
});

// Announcement associations
Announcement.belongsTo(User, { 
  foreignKey: 'author_id', 
  as: 'author'
});

Announcement.belongsTo(User, { 
  foreignKey: 'last_modified_by', 
  as: 'lastModifiedBy'
});

// CourtBlock associations
CourtBlock.belongsTo(Court, { 
  foreignKey: 'court_id', 
  as: 'court'
});

CourtBlock.belongsTo(User, { 
  foreignKey: 'created_by', 
  as: 'creator'
});

// RefreshToken associations
RefreshToken.belongsTo(User, { 
  foreignKey: 'user_id', 
  as: 'user'
});

// Lesson associations
Lesson.belongsTo(User, {
  foreignKey: 'coach_id',
  as: 'coach',
  onDelete: 'RESTRICT'
});

Lesson.belongsTo(Court, {
  foreignKey: 'court_id',
  as: 'court',
  onDelete: 'SET NULL'
});

User.hasMany(Lesson, {
  foreignKey: 'coach_id',
  as: 'coachedLessons',
  onDelete: 'RESTRICT'
});

Court.hasMany(Lesson, {
  foreignKey: 'court_id',
  as: 'lessons',
  onDelete: 'SET NULL'
});

// LessonParticipant associations
LessonParticipant.belongsTo(Lesson, {
  foreignKey: 'lesson_id',
  as: 'lesson',
  onDelete: 'CASCADE'
});

LessonParticipant.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'participant',
  onDelete: 'RESTRICT'
});

Lesson.hasMany(LessonParticipant, {
  foreignKey: 'lesson_id',
  as: 'participants',
  onDelete: 'CASCADE'
});

User.hasMany(LessonParticipant, {
  foreignKey: 'user_id',
  as: 'lessonBookings',
  onDelete: 'RESTRICT'
});

// Helper function to sync database in correct order
const syncDatabase = async (options = {}) => {
  try {
    // Sync in order of dependencies
    await User.sync(options);
    await Court.sync(options);
    await RefreshToken.sync(options);
    await Announcement.sync(options);
    await CourtBlock.sync(options);
    await Booking.sync(options);
    await Lesson.sync(options);
    await LessonParticipant.sync(options);
    
    console.log('All models synchronized successfully');
  } catch (error) {
    console.error('Error synchronizing models:', error);
    throw error;
  }
};

// Export models and helper functions
module.exports = {
  sequelize,
  User,
  Court,
  Booking,
  Announcement,
  CourtBlock,
  RefreshToken,
  Lesson,
  LessonParticipant,
  syncDatabase,
  // Sequelize operators for convenience
  Op: sequelize.Sequelize.Op,
  fn: sequelize.Sequelize.fn,
  col: sequelize.Sequelize.col,
  literal: sequelize.Sequelize.literal
};