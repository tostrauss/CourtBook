// server/models/User.js
const bcrypt = require('bcryptjs');
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class User extends Model {
    // Instance methods
    async comparePassword(candidatePassword) {
      return await bcrypt.compare(candidatePassword, this.password);
    }

    async cleanExpiredTokens() {
      // This is now handled by the RefreshToken model
      const RefreshToken = sequelize.models.RefreshToken;
      if (RefreshToken) {
        await RefreshToken.destroy({
          where: {
            user_id: this.id,
            expires_at: {
              [sequelize.Sequelize.Op.lt]: new Date()
            }
          }
        });
      }
    }

    get fullName() {
      if (this.firstName && this.lastName) {
        return `${this.firstName} ${this.lastName}`;
      }
      return this.firstName || this.lastName || this.username;
    }

    // Override toJSON to remove sensitive fields
    toJSON() {
      const values = { ...this.get() };
      delete values.password;
      delete values.resetPasswordToken;
      delete values.resetPasswordExpires;
      delete values.emailVerificationToken;
      delete values.emailVerificationExpires;
      delete values.refreshTokens; // Remove association data
      return values;
    }
  }

  User.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: {
        msg: 'Username already exists'
      },
      validate: {
        len: {
          args: [3, 30],
          msg: 'Username must be between 3 and 30 characters'
        },
        is: {
          args: /^[a-zA-Z0-9_-]+$/,
          msg: 'Username can only contain letters, numbers, underscores and hyphens'
        }
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: {
        msg: 'Email already exists'
      },
      validate: {
        isEmail: {
          msg: 'Please provide a valid email address'
        }
      },
      set(value) {
        this.setDataValue('email', value?.toLowerCase()?.trim());
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: {
          args: [6, 255],
          msg: 'Password must be at least 6 characters'
        }
      }
    },
    role: {
      type: DataTypes.ENUM('member', 'admin'),
      defaultValue: 'member',
      allowNull: false
    },
    firstName: {
      type: DataTypes.STRING(50),
      field: 'first_name',
      validate: {
        len: {
          args: [0, 50],
          msg: 'First name cannot exceed 50 characters'
        }
      },
      set(value) {
        this.setDataValue('firstName', value?.trim());
      }
    },
    lastName: {
      type: DataTypes.STRING(50),
      field: 'last_name',
      validate: {
        len: {
          args: [0, 50],
          msg: 'Last name cannot exceed 50 characters'
        }
      },
      set(value) {
        this.setDataValue('lastName', value?.trim());
      }
    },
    phoneNumber: {
      type: DataTypes.STRING(50),
      field: 'phone_number',
      validate: {
        is: {
          args: /^\+?[\d\s-()]*$/,
          msg: 'Please provide a valid phone number'
        }
      },
      set(value) {
        this.setDataValue('phoneNumber', value?.trim());
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'email_verified'
    },
    emailVerificationToken: {
      type: DataTypes.STRING(255),
      field: 'email_verification_token'
    },
    emailVerificationExpires: {
      type: DataTypes.DATE,
      field: 'email_verification_expires'
    },
    resetPasswordToken: {
      type: DataTypes.STRING(255),
      field: 'reset_password_token'
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      field: 'reset_password_expires'
    },
    lastLogin: {
      type: DataTypes.DATE,
      field: 'last_login'
    },
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: {
        emailNotifications: true,
        smsNotifications: false,
        reminderTime: 60
      },
      validate: {
        isValidPreferences(value) {
          if (!value || typeof value !== 'object') {
            throw new Error('Preferences must be an object');
          }
        }
      }
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    underscored: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    },
    indexes: [
      {
        fields: ['email']
      },
      {
        fields: ['username']
      },
      {
        fields: ['reset_password_token'],
        where: {
          reset_password_token: {
            [sequelize.Sequelize.Op.ne]: null
          }
        }
      },
      {
        fields: ['email_verification_token'],
        where: {
          email_verification_token: {
            [sequelize.Sequelize.Op.ne]: null
          }
        }
      },
      {
        fields: ['is_active']
      }
    ]
  });

  return User;
};