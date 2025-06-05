// server/models/Tournament.js - Local club tournaments
const tournamentSchema = new mongoose.Schema({
  club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['singles', 'doubles', 'mixed_doubles', 'youth', 'senior'],
    required: true
  },
  category: {
    type: String,
    enum: ['open', 'members_only', 'beginners', 'advanced', 'u14', 'u16', 'u18', '35+', '50+']
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  registrationDeadline: { type: Date, required: true },
  maxParticipants: Number,
  participants: [{
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // for doubles
    seed: Number,
    registeredAt: { type: Date, default: Date.now }
  }],
  courts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Court' }],
  entryFee: Number,
  prizes: [{
    position: Number,
    description: String,
    value: Number
  }],
  rules: String,
  schedule: mongoose.Schema.Types.Mixed,
  results: mongoose.Schema.Types.Mixed
});

// server/models/SeasonPass.js - Common in Austrian clubs
const seasonPassSchema = new mongoose.Schema({
  club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['summer', 'winter', 'annual', 'student', 'family'],
    required: true
  },
  validFrom: { type: Date, required: true },
  validUntil: { type: Date, required: true },
  price: {
    adult: Number,
    youth: Number, // Under 18
    student: Number,
    senior: Number, // 65+
    family: Number
  },
  benefits: [{
    type: { type: String, enum: ['unlimited_booking', 'discount', 'priority_booking', 'guest_passes'] },
    value: mongoose.Schema.Types.Mixed
  }],
  courtAccess: [{
    court: { type: mongoose.Schema.Types.ObjectId, ref: 'Court' },
    restrictions: {
      timeSlots: [{
        dayOfWeek: Number,
        startTime: String,
        endTime: String
      }]
    }
  }],
  maxActiveBookings: { type: Number, default: 2 },
  purchasedBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    purchaseDate: Date,
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    status: { type: String, enum: ['active', 'expired', 'cancelled'] }
  }]
});