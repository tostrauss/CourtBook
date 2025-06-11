const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Admin123!', salt);
    
    await queryInterface.bulkInsert('users', [{
      id: '550e8400-e29b-41d4-a716-446655440000',
      username: 'admin',
      email: 'admin@tennisbooking.at',
      password: hashedPassword,
      role: 'admin',
      first_name: 'System',
      last_name: 'Administrator',
      is_active: true,
      email_verified: true,
      created_at: new Date(),
      updated_at: new Date()
    }]);

    // Create sample courts
    await queryInterface.bulkInsert('courts', [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Center Court',
        type: 'outdoor',
        surface: 'clay',
        description: 'Main competition court with seating for 200 spectators',
        is_active: true,
        features: ['lights', 'seating', 'scoreboard'],
        booking_rules: JSON.stringify({
          minBookingDuration: 60,
          maxBookingDuration: 120,
          advanceBookingDays: 14,
          cancellationDeadlineHours: 4,
          slotIncrementMinutes: 60
        }),
        operating_hours: JSON.stringify({
          monday: { open: '08:00', close: '22:00' },
          tuesday: { open: '08:00', close: '22:00' },
          wednesday: { open: '08:00', close: '22:00' },
          thursday: { open: '08:00', close: '22:00' },
          friday: { open: '08:00', close: '22:00' },
          saturday: { open: '08:00', close: '20:00' },
          sunday: { open: '09:00', close: '18:00' }
        }),
        pricing: JSON.stringify({
          basePrice: 25,
          peakHourMultiplier: 1.5,
          peakHours: [
            { dayOfWeek: 1, startTime: '17:00', endTime: '21:00' },
            { dayOfWeek: 2, startTime: '17:00', endTime: '21:00' },
            { dayOfWeek: 3, startTime: '17:00', endTime: '21:00' },
            { dayOfWeek: 4, startTime: '17:00', endTime: '21:00' },
            { dayOfWeek: 5, startTime: '17:00', endTime: '21:00' }
          ]
        }),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Court 2',
        type: 'outdoor',
        surface: 'hard',
        description: 'Practice court with lighting for evening play',
        is_active: true,
        features: ['lights'],
        booking_rules: JSON.stringify({
          minBookingDuration: 60,
          maxBookingDuration: 120,
          advanceBookingDays: 7,
          cancellationDeadlineHours: 2,
          slotIncrementMinutes: 60
        }),
        operating_hours: JSON.stringify({
          monday: { open: '07:00', close: '23:00' },
          tuesday: { open: '07:00', close: '23:00' },
          wednesday: { open: '07:00', close: '23:00' },
          thursday: { open: '07:00', close: '23:00' },
          friday: { open: '07:00', close: '23:00' },
          saturday: { open: '08:00', close: '22:00' },
          sunday: { open: '08:00', close: '20:00' }
        }),
        pricing: JSON.stringify({
          basePrice: 20,
          peakHourMultiplier: 1.2,
          peakHours: []
        }),
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Create welcome announcement
    await queryInterface.bulkInsert('announcements', [{
      id: '550e8400-e29b-41d4-a716-446655440003',
      title: 'Welcome to Our Tennis Club Booking System!',
      content: 'We are excited to launch our new online booking system. You can now easily book courts, manage your reservations, and stay updated with club news.',
      type: 'info',
      priority: 10,
      author_id: '550e8400-e29b-41d4-a716-446655440000',
      is_active: true,
      is_pinned: true,
      target_audience: 'all',
      publish_date: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    }]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('announcements', null, {});
    await queryInterface.bulkDelete('courts', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};