// server/config/db.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME || 'tennis_booking_multiclub',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASS || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      underscored: true, // Use snake_case for database columns
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    },
    dialectOptions: {
      // Use this for SSL connections (e.g., Heroku)
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
);

// Test and connect to database
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL Connected Successfully');
    
    // Only sync in development with alter (be careful!)
    if (process.env.NODE_ENV === 'development' && process.env.DB_SYNC === 'true') {
      console.log('Syncing database models...');
      await sequelize.sync({ alter: true });
      console.log('Database sync completed');
    }
    
    return sequelize;
  } catch (error) {
    console.error('Unable to connect to PostgreSQL:', error);
    // Retry logic
    if (process.env.NODE_ENV === 'production') {
      console.log('Retrying database connection in 5 seconds...');
      setTimeout(connectDB, 5000);
    } else {
      process.exit(1);
    }
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing database connection...');
  await sequelize.close();
  console.log('Database connection closed');
  process.exit(0);
});

module.exports = { sequelize, connectDB };