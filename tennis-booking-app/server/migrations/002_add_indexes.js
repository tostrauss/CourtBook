module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Bookings indexes
    await queryInterface.addIndex('bookings', ['user_id', 'status']);
    await queryInterface.addIndex('bookings', ['court_id', 'date']);
    await queryInterface.addIndex('bookings', ['date', 'status']);
    
    // Users indexes
    await queryInterface.addIndex('users', ['email_verified', 'is_active']);
    
    // Courts indexes
    await queryInterface.addIndex('courts', ['is_active', 'type']);
    
    // Announcements indexes
    await queryInterface.addIndex('announcements', ['is_active', 'publish_date', 'expiry_date']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes in reverse order
  }
};