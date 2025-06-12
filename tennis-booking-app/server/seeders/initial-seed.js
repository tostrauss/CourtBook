// server/seeders/initial-seed.js
const bcrypt = require('bcryptjs');
const { sequelize, User, Court, Announcement } = require('../models');

const seedDatabase = async () => {
  try {
    console.log('Starting database seed...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const [adminUser] = await User.findOrCreate({
      where: { email: 'admin@tennisclub.at' },
      defaults: {
        username: 'admin',
        email: 'admin@tennisclub.at',
        password: adminPassword,
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        emailVerified: true,
        isActive: true
      }
    });
    console.log('Admin user created:', adminUser.email);

    // Create test member
    const memberPassword = await bcrypt.hash('member123', 10);
    const [memberUser] = await User.findOrCreate({
      where: { email: 'member@tennisclub.at' },
      defaults: {
        username: 'testmember',
        email: 'member@tennisclub.at',
        password: memberPassword,
        role: 'member',
        firstName: 'Test',
        lastName: 'Member',
        emailVerified: true,
        isActive: true
      }
    });
    console.log('Member user created:', memberUser.email);

    // Create courts
    const courts = [
      {
        name: 'Center Court',
        description: 'Our main court with stadium seating',
        type: 'outdoor',
        surface: 'clay',
        isActive: true,
        features: ['lights', 'seating', 'scoreboard'],
        bookingRules: {
          minBookingDuration: 60,
          maxBookingDuration: 120,
          advanceBookingDays: 7,
          cancellationDeadlineHours: 2,
          slotIncrementMinutes: 60
        },
        operatingHours: {
          monday: { open: '08:00', close: '22:00' },
          tuesday: { open: '08:00', close: '22:00' },
          wednesday: { open: '08:00', close: '22:00' },
          thursday: { open: '08:00', close: '22:00' },
          friday: { open: '08:00', close: '22:00' },
          saturday: { open: '08:00', close: '20:00' },
          sunday: { open: '08:00', close: '20:00' }
        },
        pricing: {
          basePrice: 30,
          peakHourMultiplier: 1.5,
          peakHours: [
            { dayOfWeek: 1, startTime: '17:00', endTime: '20:00' },
            { dayOfWeek: 2, startTime: '17:00', endTime: '20:00' },
            { dayOfWeek: 3, startTime: '17:00', endTime: '20:00' },
            { dayOfWeek: 4, startTime: '17:00', endTime: '20:00' },
            { dayOfWeek: 5, startTime: '17:00', endTime: '20:00' }
          ]
        }
      },
      {
        name: 'Court 2',
        description: 'Outdoor clay court with lighting',
        type: 'outdoor',
        surface: 'clay',
        isActive: true,
        features: ['lights'],
        bookingRules: {
          minBookingDuration: 60,
          maxBookingDuration: 120,
          advanceBookingDays: 7,
          cancellationDeadlineHours: 2,
          slotIncrementMinutes: 60
        },
        operatingHours: {
          monday: { open: '08:00', close: '22:00' },
          tuesday: { open: '08:00', close: '22:00' },
          wednesday: { open: '08:00', close: '22:00' },
          thursday: { open: '08:00', close: '22:00' },
          friday: { open: '08:00', close: '22:00' },
          saturday: { open: '08:00', close: '20:00' },
          sunday: { open: '08:00', close: '20:00' }
        },
        pricing: {
          basePrice: 25,
          peakHourMultiplier: 1.5,
          peakHours: []
        }
      },
      {
        name: 'Indoor Court 1',
        description: 'Climate-controlled indoor court',
        type: 'indoor',
        surface: 'hard',
        isActive: true,
        features: ['lights'],
        bookingRules: {
          minBookingDuration: 60,
          maxBookingDuration: 120,
          advanceBookingDays: 7,
          cancellationDeadlineHours: 2,
          slotIncrementMinutes: 60
        },
        operatingHours: {
          monday: { open: '07:00', close: '23:00' },
          tuesday: { open: '07:00', close: '23:00' },
          wednesday: { open: '07:00', close: '23:00' },
          thursday: { open: '07:00', close: '23:00' },
          friday: { open: '07:00', close: '23:00' },
          saturday: { open: '07:00', close: '22:00' },
          sunday: { open: '07:00', close: '22:00' }
        },
        pricing: {
          basePrice: 40,
          peakHourMultiplier: 1.25,
          peakHours: []
        }
      }
    ];

    for (const courtData of courts) {
      const [court] = await Court.findOrCreate({
        where: { name: courtData.name },
        defaults: courtData
      });
      console.log('Court created:', court.name);
    }

    // Create welcome announcement
    const [announcement] = await Announcement.findOrCreate({
      where: { title: 'Welcome to Our Tennis Club Booking System!' },
      defaults: {
        title: 'Welcome to Our Tennis Club Booking System!',
        content: 'We are excited to launch our new online booking system. You can now book courts online 24/7. Please read the booking rules and enjoy your game!',
        type: 'info',
        priority: 5,
        authorId: adminUser.id,
        isActive: true,
        isPinned: true,
        targetAudience: 'all',
        publishDate: new Date(),
        tags: ['welcome', 'booking', 'announcement']
      }
    });
    console.log('Welcome announcement created');

    console.log('\n=== Seed completed successfully! ===');
    console.log('\nYou can now login with:');
    console.log('Admin - Email: admin@tennisclub.at, Password: admin123');
    console.log('Member - Email: member@tennisclub.at, Password: member123\n');

  } catch (error) {
    console.error('Seed error:', error);
    throw error;
  }
};

// Run seed if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeding complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedDatabase;