// server/models/Announcement.js
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Announcement extends Model {
    // Instance methods
    isExpired() {
      if (!this.expiryDate) return false;
      return new Date() > this.expiryDate;
    }

    isPublished() {
      return new Date() >= this.publishDate;
    }

    shouldDisplay() {
      return this.isActive && this.isPublished() && !this.isExpired();
    }

    async incrementViewCount() {
      this.viewCount += 1;
      await this.save({ fields: ['viewCount'] });
    }

    get isNew() {
      const daysSincePublish = (new Date() - this.publishDate) / (1000 * 60 * 60 * 24);
      return daysSincePublish <= 3;
    }
  }

  Announcement.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Title is required'
        },
        len: {
          args: [1, 200],
          msg: 'Title cannot exceed 200 characters'
        }
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Content is required'
        },
        len: {
          args: [1, 5000],
          msg: 'Content cannot exceed 5000 characters'
        }
      }
    },
    type: {
      type: DataTypes.ENUM('info', 'warning', 'urgent', 'maintenance', 'event'),
      defaultValue: 'info',
      validate: {
        isIn: {
          args: [['info', 'warning', 'urgent', 'maintenance', 'event']],
          msg: 'Invalid announcement type'
        }
      }
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Priority must be at least 0'
        },
        max: {
          args: [10],
          msg: 'Priority cannot exceed 10'
        }
      }
    },
    authorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'author_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    isPinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_pinned'
    },
    targetAudience: {
      type: DataTypes.ENUM('all', 'members', 'guests', 'staff'),
      defaultValue: 'all',
      field: 'target_audience',
      validate: {
        isIn: {
          args: [['all', 'members', 'guests', 'staff']],
          msg: 'Invalid target audience'
        }
      }
    },
    publishDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'publish_date'
    },
    expiryDate: {
      type: DataTypes.DATE,
      field: 'expiry_date',
      validate: {
        isAfterPublishDate(value) {
          if (value && this.publishDate && value <= this.publishDate) {
            throw new Error('Expiry date must be after publish date');
          }
        }
      }
    },
    attachments: {
      type: DataTypes.JSONB,
      defaultValue: [],
      validate: {
        isValidAttachments(value) {
          if (!Array.isArray(value)) {
            throw new Error('Attachments must be an array');
          }
          
          for (const attachment of value) {
            if (!attachment.filename || !attachment.url) {
              throw new Error('Each attachment must have filename and url');
            }
          }
        }
      }
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      validate: {
        isArray(value) {
          if (!Array.isArray(value)) {
            throw new Error('Tags must be an array');
          }
        }
      }
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'view_count',
      validate: {
        min: {
          args: [0],
          msg: 'View count cannot be negative'
        }
      }
    },
    lastModifiedBy: {
      type: DataTypes.UUID,
      field: 'last_modified_by',
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Announcement',
    tableName: 'announcements',
    underscored: true,
    indexes: [
      {
        fields: ['is_active', 'publish_date']
      },
      {
        fields: [
          { name: 'is_pinned', order: 'DESC' },
          { name: 'priority', order: 'DESC' },
          { name: 'publish_date', order: 'DESC' }
        ]
      },
      {
        fields: ['tags'],
        using: 'GIN' // PostgreSQL GIN index for array search
      },
      {
        fields: ['expiry_date'],
        where: {
          expiry_date: {
            [sequelize.Sequelize.Op.ne]: null
          }
        }
      }
    ]
  });

  return Announcement;
};