const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  court: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Court',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  startTime: {
    type: String,
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
  },
  endTime: {
    type: String,
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'],
    default: 'confirmed',
    index: true
  },
  players: [{
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Player name cannot exceed 100 characters']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format']
    },
    isGuest: {
      type: Boolean,
      default: true
    }
  }],
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  totalPrice: {
    type: Number,
    default: 0,
    min: [0, 'Price cannot be negative']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'free'],
    default: 'free'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'online', 'membership'],
    required: function() { return this.paymentStatus === 'paid'; }
  },
  cancellationReason: {
    type: String,
    maxlength: [500, 'Cancellation reason cannot exceed 500 characters']
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: Date,
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderSentAt: Date,
  checkInTime: Date,
  checkOutTime: Date,
  recurring: {
    isRecurring: {
      type: Boolean,
      default: false
    },
    recurringId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecurringBooking'
    }
  }
}, {
  timestamps: true
});

// Indexes
bookingSchema.index({ user: 1, date: 1 });
bookingSchema.index({ court: 1, date: 1, startTime: 1 });
bookingSchema.index({ status: 1, date: 1 });
bookingSchema.index({ createdAt: -1 });

// Compound unique index to prevent double bookings
bookingSchema.index(
  { court: 1, date: 1, startTime: 1, status: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: { $in: ['confirmed', 'pending'] } }
  }
);

// Pre-save validation
bookingSchema.pre('save', function(next) {
  // Ensure end time is after start time
  if (this.startTime >= this.endTime) {
    next(new Error('End time must be after start time'));
  }
  
  // Ensure booking date is not in the past
  const bookingDate = new Date(this.date);
  bookingDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (bookingDate < today && this.isNew) {
    next(new Error('Cannot create bookings for past dates'));
  }
  
  next();
});

// Methods
bookingSchema.methods.canBeCancelled = function(cancellationDeadlineHours = 2) {
  if (this.status !== 'confirmed') {
    return false;
  }
  
  const now = new Date();
  const bookingDateTime = new Date(this.date);
  const [hours, minutes] = this.startTime.split(':');
  bookingDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);
  return hoursUntilBooking >= cancellationDeadlineHours;
};

bookingSchema.methods.getDurationMinutes = function() {
  const [startHours, startMinutes] = this.startTime.split(':').map(Number);
  const [endHours, endMinutes] = this.endTime.split(':').map(Number);
  
  return (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
};

// Virtual for booking datetime
bookingSchema.virtual('startDateTime').get(function() {
  const dateTime = new Date(this.date);
  const [hours, minutes] = this.startTime.split(':');
  dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return dateTime;
});

bookingSchema.virtual('endDateTime').get(function() {
  const dateTime = new Date(this.date);
  const [hours, minutes] = this.endTime.split(':');
  dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return dateTime;
});

// Transform output
bookingSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Booking', bookingSchema);