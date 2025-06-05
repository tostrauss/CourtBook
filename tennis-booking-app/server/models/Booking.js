module.exports = (sequelize, DataTypes) => {
  const Booking = sequelize.define('Booking', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id'
    },
    courtId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'court_id'
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: false,
      field: 'start_time'
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false,
      field: 'end_time'
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no-show'),
      defaultValue: 'confirmed'
    },
    players: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    notes: {
      type: DataTypes.TEXT
    },
    totalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'total_price'
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'paid', 'refunded', 'free'),
      defaultValue: 'free',
      field: 'payment_status'
    },
    paymentMethod: {
      type: DataTypes.ENUM('cash', 'card', 'online', 'membership'),
      field: 'payment_method'
    },
    cancellationReason: {
      type: DataTypes.TEXT,
      field: 'cancellation_reason'
    },
    cancelledBy: {
      type: DataTypes.UUID,
      field: 'cancelled_by'
    },
    cancelledAt: {
      type: DataTypes.DATE,
      field: 'cancelled_at'
    },
    reminderSent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'reminder_sent'
    },
    reminderSentAt: {
      type: DataTypes.DATE,
      field: 'reminder_sent_at'
    },
    checkInTime: {
      type: DataTypes.DATE,
      field: 'check_in_time'
    },
    checkOutTime: {
      type: DataTypes.DATE,
      field: 'check_out_time'
    }
  }, {
    tableName: 'bookings',
    validate: {
      endTimeAfterStartTime() {
        if (this.endTime <= this.startTime) {
          throw new Error('End time must be after start time');
        }
      }
    }
  });

  // Instance methods
  Booking.prototype.canBeCancelled = function(cancellationDeadlineHours = 2) {
    if (this.status !== 'confirmed') {
      return false;
    }
    
    const now = new Date();
    const bookingDateTime = new Date(this.date);
    const [hours, minutes] = this.startTime.split(':');
    bookingDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);
    return hoursUntilBooking >= cancellationDeadlineHours;
  };

  Booking.prototype.getDurationMinutes = function() {
    const [startHours, startMinutes] = this.startTime.split(':').map(Number);
    const [endHours, endMinutes] = this.endTime.split(':').map(Number);
    
    return (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
  };

  return Booking;
};