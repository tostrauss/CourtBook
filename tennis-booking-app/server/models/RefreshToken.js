const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class RefreshToken extends Model {
    // Instance methods
    isExpired() {
      return new Date() > this.expiresAt;
    }

    // Class methods
    static async cleanExpiredTokens(userId = null) {
      const where = {
        expires_at: {
          [sequelize.Sequelize.Op.lt]: new Date()
        }
      };

      if (userId) {
        where.user_id = userId;
      }

      return await this.destroy({ where });
    }

    static async findValidToken(token) {
      return await this.findOne({
        where: {
          token,
          expires_at: {
            [sequelize.Sequelize.Op.gt]: new Date()
          }
        },
        include: [{
          model: sequelize.models.User,
          as: 'user'
        }]
      });
    }
  }

  RefreshToken.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at'
    }
  }, {
    sequelize,
    modelName: 'RefreshToken',
    tableName: 'refresh_tokens',
    underscored: true,
    updatedAt: false, // Refresh tokens don't need update tracking
    indexes: [
      {
        fields: ['token'],
        unique: true
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['expires_at']
      }
    ],
    hooks: {
      beforeCreate: (token) => {
        // Set default expiration if not provided (7 days)
        if (!token.expiresAt) {
          token.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        }
      }
    }
  });

  return RefreshToken;
};