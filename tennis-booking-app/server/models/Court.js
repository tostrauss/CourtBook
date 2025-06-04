// server/models/Court.js
const mongoose = require('mongoose');

const courtSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Court name is required'],
    unique: true, // This creates the unique index for 'name'
    trim: true,
    maxlength: [50, 'Court name cannot exceed 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  type: {
    type: String,
    required: true,
    enum: ['indoor', 'outdoor', 'covered'],
    default: 'outdoor'
  },
  surface: {
    type: String,
    required: true,
    enum: ['hard', 'clay', 'grass', 'synthetic'],
    default: 'hard'
  },
  features: [{
    type: String,
    enum: ['lights', 'seating', 'scoreboard', 'practice_wall']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  bookingRules: {
    minBookingDuration: {
      type: Number,
      default: 30, // minutes
      min: [15, 'Minimum booking duration must be at least 15 minutes']
    },
    maxBookingDuration: {
      type: Number,
      default: 120, // minutes
      max: [240, 'Maximum booking duration cannot exceed 4 hours']
    },
    advanceBookingDays: {
      type: Number,
      default: 7,
      min: [1, 'Advance booking must be at least 1 day'],
      max: [30, 'Advance booking cannot exceed 30 days']
    },
    cancellationDeadlineHours: {
      type: Number,
      default: 2,
      min: [0, 'Cancellation deadline cannot be negative']
    },
    slotIncrementMinutes: {
        type: Number,
        default: 30,
        enum: [15, 30, 60]
    }
  },
  operatingHours: {
    monday: { open: { type: String, default: '08:00' }, close: { type: String, default: '22:00' } },
    tuesday: { open: { type: String, default: '08:00' }, close: { type: String, default: '22:00' } },
    wednesday: { open: { type: String, default: '08:00' }, close: { type: String, default: '22:00' } },
    thursday: { open: { type: String, default: '08:00' }, close: { type: String, default: '22:00' } },
    friday: { open: { type: String, default: '08:00' }, close: { type: String, default: '22:00' } },
    saturday: { open: { type: String, default: '08:00' }, close: { type: String, default: '20:00' } },
    sunday: { open: { type: String, default: '08:00' }, close: { type: String, default: '20:00' } }
  },
  pricing: {
    basePrice: {
      type: Number,
      default: 0,
      min: [0, 'Price cannot be negative']
    },
    peakHourMultiplier: {
      type: Number,
      default: 1.5,
      min: [1, 'Peak hour multiplier must be at least 1']
    },
    peakHours: [{
      dayOfWeek: {
        type: Number,
        min: 0,
        max: 6
      },
      startTime: String,
      endTime: String
    }]
  },
  blocks: [{
    reason: {
      type: String,
      required: true,
      enum: ['maintenance', 'event', 'weather', 'other']
    },
    description: String,
    startDateTime: {
      type: Date,
      required: true
    },
    endDateTime: {
      type: Date,
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isRecurring: {
      type: Boolean,
      default: false
    },
    recurringPattern: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: function() { return this.isRecurring; }
    },
    recurringEndDate: {
      type: Date,
      required: function() { return this.isRecurring; }
    }
  }],
  images: [{
    url: String,
    caption: String
  }],
  amenities: {
    type: [String],
    default: []
  },
  location: {
    building: String,
    floor: String,
    section: String
  }
}, {
  timestamps: true
});

// Indexes
// The unique index for 'name' is created by 'unique: true' in the schema definition above.
// So, we remove the duplicate explicit index definition for 'name'.
// courtSchema.index({ name: 1 }, { unique: true }); // REMOVE THIS LINE

courtSchema.index({ isActive: 1 });
courtSchema.index({ type: 1, surface: 1 });
courtSchema.index({ 'blocks.startDateTime': 1, 'blocks.endDateTime': 1 });

// Methods
courtSchema.methods.isAvailable = function(startTime, endTime) {
  if (!this.isActive || this.maintenanceMode) {
    return false;
  }
  const start = new Date(startTime);
  const end = new Date(endTime);
  return !this.blocks.some(block => {
    const blockStart = new Date(block.startDateTime);
    const blockEnd = new Date(block.endDateTime);
    return start < blockEnd && end > blockStart;
  });
};

courtSchema.methods.getOperatingHoursForDate = function(date) {
  const checkDate = (date instanceof Date) ? date : new Date(date);
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = days[checkDate.getUTCDay()];
  return this.operatingHours[dayName];
};

// Virtual for active blocks
courtSchema.virtual('activeBlocks').get(function() {
  const now = new Date();
  return this.blocks.filter(block => block.endDateTime > now);
});

module.exports = mongoose.model('Court', courtSchema);