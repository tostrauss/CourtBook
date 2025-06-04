// server.js
const express = require('express');
const mongoose = require('mongoose'); // Make sure mongoose is required if not already
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/db');
// Correctly import specific middleware functions
const { errorHandler, notFound } = require('./middleware/errorMiddleware'); // Destructure here

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const courtRoutes = require('./routes/courtRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const announcementRoutes = require('./routes/announcementRoutes');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Trust proxy - important for rate limiting behind reverse proxies
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter); // Apply to all /api routes

// Auth-specific rate limiting for login/register attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 failed auth attempts per window
  skipSuccessfulRequests: true, // Don't count successful requests against this limit
  message: 'Too many authentication attempts, please try again later.'
});


// Routes
app.use('/api/auth', authLimiter, authRoutes); // Apply authLimiter specifically to auth routes
app.use('/api/users', userRoutes);
app.use('/api/courts', courtRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/announcements', announcementRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
// IMPORTANT: notFound should come AFTER your routes but BEFORE the general errorHandler
app.use(notFound); // Handles 404 errors - routes not found
app.use(errorHandler); // Handles all other errors

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});
