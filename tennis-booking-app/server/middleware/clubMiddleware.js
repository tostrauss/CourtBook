// server/middleware/clubMiddleware.js
const { asyncHandler } = require('./errorMiddleware');

// Temporary club middleware for single-club setup
// This will be replaced with proper multi-tenant logic later
const clubContext = asyncHandler(async (req, res, next) => {
  // For single-club setup, we'll use a default club configuration
  req.club = {
    id: process.env.DEFAULT_CLUB_ID || 'default-club',
    name: process.env.CLUB_NAME || 'Tennis Club Austria',
    settings: {
      timezone: 'Europe/Vienna',
      currency: 'EUR',
      language: 'de',
      bookingRules: {
        advanceBookingDays: parseInt(process.env.BOOKING_WINDOW_DAYS) || 7,
        cancellationDeadlineHours: parseInt(process.env.CANCELLATION_NOTICE_HOURS) || 2,
        maxBookingsPerUser: 3,
        allowGuestBookings: false,
        requirePayment: true,
        slotDurations: [30, 60]
      }
    }
  };
  
  // Add club ID to request for use in controllers
  req.clubId = req.club.id;
  
  next();
});

// Optional club context for public routes
const optionalClubContext = (req, res, next) => {
  // Set default club for public routes
  req.clubId = process.env.DEFAULT_CLUB_ID || 'default-club';
  next();
};

module.exports = {
  clubContext,
  optionalClubContext
};