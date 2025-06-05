// server/models/Club.js
const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  domain: {
    type: String,
    unique: true,
    sparse: true // For custom domains
  },
  
  // Contact & Location
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: { type: String, default: 'Austria' }
  },
  contactInfo: {
    email: String,
    phone: String,
    website: String
  },
  
  // Branding
  branding: {
    logo: String,
    primaryColor: { type: String, default: '#4f46e5' },
    secondaryColor: { type: String, default: '#818cf8' },
    favicon: String
  },
  
  // Settings
  settings: {
    timezone: { type: String, default: 'Europe/Vienna' },
    currency: { type: String, default: 'EUR' },
    language: { type: String, default: 'de' },
    bookingRules: {
      advanceBookingDays: { type: Number, default: 7 },
      cancellationDeadlineHours: { type: Number, default: 2 },
      maxBookingsPerUser: { type: Number, default: 3 },
      allowGuestBookings: { type: Boolean, default: false },
      requirePayment: { type: Boolean, default: true },
      slotDurations: [{ type: Number, default: [30, 60] }]
    },
    features: {
      enableLessons: { type: Boolean, default: false },
      enableTournaments: { type: Boolean, default: false },
      enableMemberships: { type: Boolean, default: true },
      enableWaitlist: { type: Boolean, default: false },
      enableRecurringBookings: { type: Boolean, default: false }
    }
  },
  
  // Subscription
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'professional', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'cancelled'],
      default: 'active'
    },
    courtLimit: Number,
    userLimit: Number,
    billingCycle: String,
    nextBillingDate: Date,
    paymentMethod: String
  },
  
  // Stats
  stats: {
    totalMembers: { type: Number, default: 0 },
    totalBookings: { type: Number, default: 0 },
    monthlyRevenue: { type: Number, default: 0 }
  },
  
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Add club reference to existing models
// Update User model
userSchema.add({
  clubs: [{
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
    role: { type: String, enum: ['member', 'admin', 'super_admin'], default: 'member' },
    membershipStatus: { type: String, enum: ['active', 'inactive', 'pending'] },
    membershipExpiry: Date,
    joinedAt: { type: Date, default: Date.now }
  }],
  currentClub: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' }
});

// Update Court model
courtSchema.add({
  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    required: true,
    index: true
  }
});

// Update Booking model
bookingSchema.add({
  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    required: true,
    index: true
  }
});

// Update Announcement model
announcementSchema.add({
  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    required: true,
    index: true
  }
});