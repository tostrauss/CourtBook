module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create database functions for exclusion constraints
    await queryInterface.sequelize.query(`
      CREATE EXTENSION IF NOT EXISTS btree_gist;
    `);

    // Add exclusion constraint for bookings
    await queryInterface.sequelize.query(`
      ALTER TABLE bookings 
      ADD CONSTRAINT no_double_booking 
      EXCLUDE USING gist (
        court_id WITH =,
        date WITH =,
        tsrange(start_time::timestamp, end_time::timestamp) WITH &&
      ) WHERE (status IN ('confirmed', 'pending'));
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE bookings DROP CONSTRAINT IF EXISTS no_double_booking;
    `);
  }
};