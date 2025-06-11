// server/models/Lesson.js - Tennis lessons with certified coaches
module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  
  const Lesson = sequelize.define('Lesson', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    club_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    coach_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    court_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('individual', 'group', 'kids', 'beginner', 'advanced', 'tournament_prep'),
      allowNull: false
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Duration in minutes'
    },
    max_participants: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'confirmed', 'completed', 'cancelled'),
      defaultValue: 'scheduled'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    recurring_type: {
      type: DataTypes.ENUM('weekly', 'biweekly', 'monthly'),
      allowNull: true
    },
    recurring_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    }
  }, {
    tableName: 'lessons',
    timestamps: true,
    indexes: [
      {
        fields: ['coach_id', 'date', 'start_time'],
        unique: false
      },
      {
        fields: ['court_id', 'date', 'start_time'],
        unique: false
      },
      {
        fields: ['club_id'],
        unique: false
      }
    ]
  });

  return Lesson;
};