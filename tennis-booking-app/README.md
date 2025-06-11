# Tennis Court Booking System 🎾

A comprehensive multi-club tennis court booking platform designed for Austrian tennis clubs with plans for expansion to Germany and other European markets.

## 🌟 Features

### For Players
- **Real-time Court Availability**: View and book courts with live availability updates
- **Smart Booking System**: 60-minute time slots with configurable duration options
- **Calendar Integration**: Visual calendar view for easy scheduling
- **Booking Management**: View, modify, and cancel bookings with automated email notifications
- **Multi-language Support**: Optimized for Austrian/German market (ready for localization)

### For Club Administrators
- **Court Management**: Add, edit, and maintain multiple courts with different surfaces and types
- **Dynamic Pricing**: Set base prices and peak hour multipliers
- **Booking Rules**: Configure advance booking days, cancellation policies, and operating hours
- **Block Management**: Block courts for maintenance, events, or weather conditions
- **User Management**: Manage members, view statistics, and control access
- **Announcements**: Create and manage club announcements with priority levels
- **Analytics Dashboard**: Track bookings, revenue, and usage patterns

### For Platform (Multi-Club Support)
- **White-label Solution**: Each club gets their own subdomain or custom domain
- **Centralized Management**: Manage multiple clubs from a single platform
- **Flexible Subscription Plans**: Different tiers for clubs of various sizes
- **Payment Integration**: Support for Austrian payment methods (EPS, SEPA, Sofort)

## 🚀 Technology Stack

### Frontend
- **React 18** with Vite for fast development
- **React Router v6** for navigation
- **React Query** for server state management
- **React Hook Form** with Yup validation
- **Tailwind CSS** for styling
- **React Big Calendar** for court scheduling
- **Recharts** for analytics
- **Lucide React** for icons

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database
- **Sequelize ORM** for database operations
- **JWT Authentication** with refresh tokens
- **Nodemailer** for email notifications
- **Express Rate Limiting** for API protection
- **Helmet** for security headers

## 📋 Prerequisites

- Node.js 16+ and npm/yarn
- PostgreSQL 13+
- SMTP server for emails (Gmail, SendGrid, etc.)
- Stripe account for payments (optional)

## 🛠️ Installation

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/tennis-booking-app.git
cd tennis-booking-app
```

### 2. Install dependencies

**Backend:**
```bash
cd server
npm install
```

**Frontend:**
```bash
cd ../client
npm install
```

### 3. Database Setup

Create a PostgreSQL database:
```sql
CREATE DATABASE tennis_booking_multiclub;
CREATE USER tennis_app_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE tennis_booking_multiclub TO tennis_app_user;
```

### 4. Environment Configuration

**Backend (.env):**
```env
# Server Configuration
PORT=5001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tennis_booking_multiclub
DB_USER=tennis_app_user
DB_PASS=your_secure_password
DB_SSL=false

# JWT Secrets (generate secure random strings)
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_specific_password
EMAIL_FROM_NAME=Tennis Court Booking

# Client URL
CLIENT_URL=http://localhost:3000

# Booking Configuration
BOOKING_WINDOW_DAYS=7
DEFAULT_BOOKING_DURATION_MINUTES=60
MAX_BOOKING_DURATION_MINUTES=120
CANCELLATION_NOTICE_HOURS=2

# Optional: Payment Integration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional: External APIs
OPENWEATHER_API_KEY=your_weather_api_key
OTV_API_URL=https://api.oetv.at/v1
```

**Frontend (.env):**
```env
VITE_API_BASE_URL=http://localhost:5001/api
```

### 5. Database Initialization

Run migrations and seed initial data:
```bash
cd server
npm run db:migrate
npm run db:seed
```

### 6. Start the Application

**Development mode:**

Backend:
```bash
cd server
npm run dev
```

Frontend:
```bash
cd client
npm run dev
```

**Production mode:**
```bash
# Backend
cd server
npm start

# Frontend
cd client
npm run build
npm run preview
```

## 🏗️ Project Structure

```
tennis-booking-app/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── context/         # React Context providers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Page components
│   │   ├── routes/          # Route guards
│   │   ├── services/        # API service layer
│   │   └── utils/           # Helper functions
│   └── public/              # Static assets
├── server/                   # Node.js backend
│   ├── config/              # Configuration files
│   ├── controllers/         # Request handlers
│   ├── middleware/          # Express middleware
│   ├── models/              # Sequelize models
│   ├── routes/              # API routes
│   ├── services/            # Business logic
│   └── utils/               # Helper utilities
└── docs/                    # Documentation
```

## 🔧 Configuration

### Court Types
- Indoor
- Outdoor  
- Covered

### Court Surfaces
- Hard
- Clay
- Grass
- Synthetic

### User Roles
- **Member**: Can book courts, view announcements
- **Admin**: Full club management access
- **Platform Admin**: Manage multiple clubs (future)

### Booking Rules
- Minimum duration: 30 minutes
- Maximum duration: 120 minutes
- Slot increments: 15, 30, or 60 minutes
- Advance booking: 1-90 days
- Cancellation deadline: 0-168 hours

## 🚦 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Reset password
- `GET /api/auth/verify-email/:token` - Verify email

### Courts
- `GET /api/courts` - List courts with availability
- `GET /api/courts/:id` - Get court details
- `POST /api/courts` - Create court (admin)
- `PUT /api/courts/:id` - Update court (admin)
- `DELETE /api/courts/:id` - Delete court (admin)
- `POST /api/courts/:id/block` - Block court (admin)

### Bookings
- `GET /api/bookings/my-bookings` - User's bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/:id` - Get booking details
- `PUT /api/bookings/:id/cancel` - Cancel booking
- `GET /api/bookings` - All bookings (admin)

### Users
- `GET /api/users/me` - Current user profile
- `PUT /api/users/me` - Update profile
- `PUT /api/users/me/password` - Update password
- `GET /api/users` - List users (admin)

### Announcements
- `GET /api/announcements` - List announcements
- `GET /api/announcements/:id` - Get announcement
- `POST /api/announcements` - Create (admin)
- `PUT /api/announcements/:id` - Update (admin)
- `DELETE /api/announcements/:id` - Delete (admin)

## 🧪 Testing

Run tests:
```bash
# Backend tests
cd server
npm test

# Frontend tests
cd client
npm test
```

## 🚀 Deployment

### Using Docker

```dockerfile
# Dockerfile for backend
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5001
CMD ["node", "server.js"]
```

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start backend
pm2 start server/server.js --name tennis-api

# Start frontend (after build)
pm2 serve client/dist 3000 --spa --name tennis-app
```

### Database Backups

```bash
# Backup
pg_dump -U tennis_app_user -h localhost tennis_booking_multiclub > backup.sql

# Restore
psql -U tennis_app_user -h localhost tennis_booking_multiclub < backup.sql
```

## 🔒 Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **HTTPS**: Always use HTTPS in production
3. **Rate Limiting**: Configured for API endpoints
4. **Input Validation**: All inputs are validated
5. **SQL Injection**: Protected via Sequelize ORM
6. **XSS Protection**: React handles this by default
7. **CORS**: Configured for specific origins
8. **Password Hashing**: Using bcrypt with salt rounds

## 🌍 Localization

The app is ready for internationalization:

1. Install i18next:
```bash
npm install i18next react-i18next
```

2. Add language files in `client/src/locales/`
3. Wrap app with I18nextProvider

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For support, email support@tennisbooking.at or join our Slack channel.

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Tournament management
- [ ] Coaching session bookings
- [ ] Equipment rental system
- [ ] Integration with Austrian Tennis Association (ÖTV)
- [ ] Multi-language support (German, English, Italian)
- [ ] Club shop integration
- [ ] Member ranking system
- [ ] Social features (find playing partners)

## 👥 Authors

- **Your Name** - *Initial work* - [YourGithub](https://github.com/yourusername)

## 🙏 Acknowledgments

- Austrian Tennis Association for API integration
- All contributing tennis clubs for feedback
- Open source community for amazing tools