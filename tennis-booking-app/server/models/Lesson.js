// server/models/Lesson.js - Tennis lessons with certified coaches
const lessonSchema = new mongoose.Schema({
  club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  coach: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  court: { type: mongoose.Schema.Types.ObjectId, ref: 'Court' },
  type: {
    type: String,
    enum: ['individual', 'group', 'kids', 'beginner', 'advanced', 'tournament_prep'],
    required: true
  },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  duration: { type: Number, required: true }, // in minutes
  maxParticipants: { type: Number, default: 1 },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  price: { type: Number, required: true },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  notes: String,
  recurringPattern: {
    type: { type: String, enum: ['weekly', 'biweekly', 'monthly'] },
    endDate: Date,
    exceptions: [Date]
  }
});
