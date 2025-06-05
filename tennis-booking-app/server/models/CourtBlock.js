// server/models/CourtBlock.js
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class CourtBlock extends Model {
    // Instance methods
    isActive() {
      const now = new Date();
      return this.startDateTime <= now && this.endDateTime > now;
    }

    isUpcoming() {
      return this.startDateTime > new Date();
    }

    isPast() {
      return this.endDateTime <= new Date();
    }

    getDurationHours() {
      return (this.endDateTime - this.startDateTime) / (1000 * 60 * 60);
    }

    // Check if this block overlaps with a date range
    overlapsWithDateRange(startDate, endDate) {
      return this.startDateTime < endDate && this.endDateTime > startDate;
    }
  }

  CourtBlock.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    courtId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'court_id',
      references: {
        model: 'courts',
        key: 'id'
      }
    },
    reason: {
      type: DataTypes.ENUM('maintenance', 'event', 'weather', 'other'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['maintenance', 'event', 'weather', 'other']],
          msg: 'Invalid block reason'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      validate: {
        len: {
          args: [0, 500],
          msg: 'Description cannot exceed 500 characters'
        }
      }
    },
    startDateTime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'start_date_time',
      validate: {
        isDate: {
          msg: 'Invalid start date/time'
        }
      }
    },
    endDateTime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'end_date_time',
      validate: {
        isDate: {
          msg: 'Invalid end date/time'
        },
        isAfterStart(value) {
          if (this.startDateTime && value <= this.startDateTime) {
            throw new Error('End date/time must be after start date/time');
          }
        }
      }
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    isRecurring: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_recurring'
    },
    recurringPattern: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
      field: 'recurring_pattern',
      allowNull: true,
      validate: {
        requiredIfRecurring(value) {
          if (this.isRecurring && !value) {
            throw new Error('Recurring pattern is required for recurring blocks');
          }
        }
      }
    },
    recurringEndDate: {
      type: DataTypes.DATE,
      field: 'recurring_end_date',
      allowNull: true,
      validate: {
        requiredIfRecurring(value) {
          if (this.isRecurring && !value) {
            throw new Error('End date is required for recurring blocks');
          }
        },
        isAfterStart(value) {
          if (value && this.endDateTime && value <= this.endDateTime) {
            throw new Error('Recurring end date must be after block end time');
          }
        }
      }
    }
  }, {
    sequelize,
    modelName: 'CourtBlock',
    tableName: 'court_blocks',
    underscored: true,
    indexes: [
      {
        fields: ['court_id', 'start_date_time', 'end_date_time']
      }
    ]
  });

  return CourtBlock;
};