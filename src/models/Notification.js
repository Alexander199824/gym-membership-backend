// src/models/Notification.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM(
      'membership_expiring',
      'membership_expired',
      'payment_received',
      'welcome',
      'promotion',
      'motivational'
    ),
    allowNull: false
  },
  channel: {
    type: DataTypes.ENUM('email', 'whatsapp', 'both'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'failed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  scheduledFor: {
    type: DataTypes.DATE,
    allowNull: true
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Referencias relacionadas
  membershipId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Memberships',
      key: 'id'
    }
  },
  paymentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Payments',
      key: 'id'
    }
  }
}, {
  tableName: 'notifications',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['channel'] },
    { fields: ['scheduledFor'] },
    { fields: ['sentAt'] }
  ]
});

module.exports = Notification;