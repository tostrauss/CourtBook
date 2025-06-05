// server/models/Payment.js
const paymentSchema = new mongoose.Schema({
  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  membership: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Membership'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'EUR'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'succeeded', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'sepa_debit', 'eps', 'sofort', 'klarna', 'cash', 'invoice']
  },
  provider: {
    type: String,
    enum: ['stripe', 'klarna', 'manual'],
    default: 'stripe'
  },
  providerPaymentId: String,
  providerRefundId: String,
  refundAmount: Number,
  platformFee: Number,
  netAmount: Number,
  description: String,
  metadata: mongoose.Schema.Types.Mixed,
  invoiceNumber: String,
  invoiceUrl: String,
  receiptUrl: String
}, {
  timestamps: true
});