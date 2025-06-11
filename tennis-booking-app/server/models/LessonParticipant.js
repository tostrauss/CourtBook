// server/models/LessonParticipant.js - Junction table for lesson participants
module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  
  const LessonParticipant = sequelize.define('LessonParticipant', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    lesson_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'paid', 'refunded', 'waived'),
      defaultValue: 'pending'
    },
    payment_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    attended: {
      type: DataTypes.BOOLEAN,
      defaultValue: null,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'lesson_participants',
    timestamps: true,
    indexes: [
      {
        fields: ['lesson_id', 'user_id'],
        unique: true
      },
      {
        fields: ['user_id'],
        unique: false
      },
      {
        fields: ['payment_status'],
        unique: false
      }
    ]
  });

  return LessonParticipant;
};