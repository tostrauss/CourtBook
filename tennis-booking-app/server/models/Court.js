// server/models/Court.js
const { Model, DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  class Court extends Model {
    // Instance methods
    getOperatingHoursForDate(date) {
      const dateObj = date instanceof Date ? date : new Date(date);
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = days[dateObj.getUTCDay()];
      return this.operatingHours?.[dayName] || null;
    }

    async isAvailable(startDateTime, endDateTime) {
      if (!this.isActive || this.maintenanceMode) {
        return false;
      }
      
      // Check for blocks
      const CourtBlock = sequelize.models.CourtBlock;
      if (!CourtBlock) return true;
      
      const blockCount = await CourtBlock.count({
        where: {
          court_id: this.id,
          start_date_time: { [Op.lt]: endDateTime },
          end_date_time: { [Op.gt]: startDateTime }
        }
      });
      
      return blockCount === 0;
    }

    // Get active blocks (not expired)
    async getActiveBlocks() {
      const CourtBlock = sequelize.models.CourtBlock;
      if (!CourtBlock) return [];
      
      return await CourtBlock.findAll({
        where: {
          court_id: this.id,
          end_date_time: { [Op.gt]: new Date() }
        },
        order: [['start_date_time', 'ASC']]
      });
    }

    // Calculate price for a given time slot
    calculatePrice(date, startTime, durationMinutes = 60) {
      const basePrice = this.pricing?.basePrice || 0;
      if (basePrice === 0) return 0;

      // Check if it's peak hour
      const dateObj = date instanceof Date ? date : new Date(date);
      const dayOfWeek = dateObj.getUTCDay();
      const [startHour, startMinute] = startTime.split(':').map(Number);
      
      let isPeakHour = false;
      const peakHours = this.pricing?.peakHours || [];
      
      for (const peak of peakHours) {
        if (peak.dayOfWeek !== dayOfWeek) continue;
        
        const [peakStartH, peakStartM] = peak.startTime.split(':').map(Number);
        const [peakEndH, peakEndM] = peak.endTime.split(':').map(Number);
        
        const slotStartMinutes = startHour * 60 + startMinute;
        const peakStartMinutes = peakStartH * 60 + peakStartM;
        const peakEndMinutes = peakEndH * 60 + peakEndM;
        
        if (slotStartMinutes >= peakStartMinutes && slotStartMinutes < peakEndMinutes) {
          isPeakHour = true;
          break;
        }
      }

      let price = basePrice * (durationMinutes / 60);
      if (isPeakHour && this.pricing?.peakHourMultiplier) {
        price *= this.pricing.peakHourMultiplier;
      }

      return parseFloat(price.toFixed(2));
    }
  }

  Court.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: {
        msg: 'Court name already exists'
      },
      validate: {
        notEmpty: {
          msg: 'Court name is required'
        },
        len: {
          args: [1, 50],
          msg: 'Court name cannot exceed 50 characters'
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
    type: {
      type: DataTypes.ENUM('indoor', 'outdoor', 'covered'),
      allowNull: false,
      defaultValue: 'outdoor',
      validate: {
        isIn: {
          args: [['indoor', 'outdoor', 'covered']],
          msg: 'Invalid court type'
        }
      }
    },
    surface: {
      type: DataTypes.ENUM('hard', 'clay', 'grass', 'synthetic'),
      allowNull: false,
      defaultValue: 'hard',
      validate: {
        isIn: {
          args: [['hard', 'clay', 'grass', 'synthetic']],
          msg: 'Invalid surface type'
        }
      }
    },
    features: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      validate: {
        isValidFeatures(value) {
          const validFeatures = ['lights', 'seating', 'scoreboard', 'practice_wall'];
          if (Array.isArray(value)) {
            for (const feature of value) {
              if (!validFeatures.includes(feature)) {
                throw new Error(`Invalid feature: ${feature}`);
              }
            }
          }
        }
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    maintenanceMode: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'maintenance_mode'
    },
    bookingRules: {
      type: DataTypes.JSONB,
      defaultValue: {
        minBookingDuration: 30,
        maxBookingDuration: 120,
        advanceBookingDays: 7,
        cancellationDeadlineHours: 2,
        slotIncrementMinutes: 30
      },
      field: 'booking_rules',
      validate: {
        isValidRules(value) {
          if (!value || typeof value !== 'object') {
            throw new Error('Booking rules must be an object');
          }
          
          const { minBookingDuration, maxBookingDuration, slotIncrementMinutes } = value;
          
          if (minBookingDuration && (minBookingDuration < 15 || minBookingDuration > 240)) {
            throw new Error('Minimum booking duration must be between 15 and 240 minutes');
          }
          
          if (maxBookingDuration && (maxBookingDuration < 15 || maxBookingDuration > 240)) {
            throw new Error('Maximum booking duration must be between 15 and 240 minutes');
          }
          
          if (minBookingDuration && maxBookingDuration && minBookingDuration > maxBookingDuration) {
            throw new Error('Minimum duration cannot exceed maximum duration');
          }
          
          if (slotIncrementMinutes && ![15, 30, 60].includes(slotIncrementMinutes)) {
            throw new Error('Slot increment must be 15, 30, or 60 minutes');
          }
        }
      }
    },
    operatingHours: {
      type: DataTypes.JSONB,
      defaultValue: {
        monday: { open: '08:00', close: '22:00' },
        tuesday: { open: '08:00', close: '22:00' },
        wednesday: { open: '08:00', close: '22:00' },
        thursday: { open: '08:00', close: '22:00' },
        friday: { open: '08:00', close: '22:00' },
        saturday: { open: '08:00', close: '20:00' },
        sunday: { open: '08:00', close: '20:00' }
      },
      field: 'operating_hours',
      validate: {
        isValidHours(value) {
          if (!value || typeof value !== 'object') return;
          
          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
          
          for (const day of days) {
            if (value[day]) {
              const { open, close } = value[day];
              if (!timeRegex.test(open) || !timeRegex.test(close)) {
                throw new Error(`Invalid operating hours for ${day}`);
              }
              if (open >= close) {
                throw new Error(`Close time must be after open time for ${day}`);
              }
            }
          }
        }
      }
    },
    pricing: {
      type: DataTypes.JSONB,
      defaultValue: {
        basePrice: 0,
        peakHourMultiplier: 1.5,
        peakHours: []
      },
      validate: {
        isValidPricing(value) {
          if (!value || typeof value !== 'object') return;
          
          if (value.basePrice !== undefined && value.basePrice < 0) {
            throw new Error('Base price cannot be negative');
          }
          
          if (value.peakHourMultiplier !== undefined && value.peakHourMultiplier < 1) {
            throw new Error('Peak hour multiplier must be at least 1');
          }
        }
      }
    },
    amenities: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    location: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    images: {
      type: DataTypes.JSONB,
      defaultValue: []
    }
  }, {
    sequelize,
    modelName: 'Court',
    tableName: 'courts',
    underscored: true,
    indexes: [
      {
        fields: ['name'],
        unique: true
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['type', 'surface']
      }
    ]
  });

  return Court;
};