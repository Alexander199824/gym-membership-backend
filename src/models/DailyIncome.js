// src/models/DailyIncome.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DailyIncome = sequelize.define('DailyIncome', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    unique: true
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  membershipPayments: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  dailyPayments: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  registeredBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  tableName: 'daily_incomes',
  timestamps: true,
  indexes: [
    { fields: ['date'] },
    { fields: ['registeredBy'] }
  ]
});

// src/models/Notification.js
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
      model: 'Users',
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

// src/models/index.js - Archivo para relaciones
const User = require('./User');
const Membership = require('./Membership');
const Payment = require('./Payment');

// Relaciones
// User - Membership (Un usuario puede tener múltiples membresías)
User.hasMany(Membership, { foreignKey: 'userId', as: 'memberships' });
Membership.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User - Payment (Un usuario puede tener múltiples pagos)
User.hasMany(Payment, { foreignKey: 'userId', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Membership - Payment (Una membresía puede tener múltiples pagos)
Membership.hasMany(Payment, { foreignKey: 'membershipId', as: 'payments' });
Payment.belongsTo(Membership, { foreignKey: 'membershipId', as: 'membership' });

// User - User (Quien registró a quien)
User.hasMany(User, { foreignKey: 'createdBy', as: 'createdUsers' });
User.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// User - Membership (Quien registró la membresía)
User.hasMany(Membership, { foreignKey: 'registeredBy', as: 'registeredMemberships' });
Membership.belongsTo(User, { foreignKey: 'registeredBy', as: 'registeredByUser' });

// User - Payment (Quien registró el pago)
User.hasMany(Payment, { foreignKey: 'registeredBy', as: 'registeredPayments' });
Payment.belongsTo(User, { foreignKey: 'registeredBy', as: 'registeredByUser' });

// User - Payment (Quien validó transferencia)
User.hasMany(Payment, { foreignKey: 'transferValidatedBy', as: 'validatedTransfers' });
Payment.belongsTo(User, { foreignKey: 'transferValidatedBy', as: 'transferValidator' });

// User - DailyIncome
User.hasMany(DailyIncome, { foreignKey: 'registeredBy', as: 'registeredIncomes' });
DailyIncome.belongsTo(User, { foreignKey: 'registeredBy', as: 'registeredByUser' });

// User - Notification
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Membership - Notification
Membership.hasMany(Notification, { foreignKey: 'membershipId', as: 'notifications' });
Notification.belongsTo(Membership, { foreignKey: 'membershipId', as: 'membership' });

// Payment - Notification
Payment.hasMany(Notification, { foreignKey: 'paymentId', as: 'notifications' });
Notification.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });

module.exports = {
  User,
  Membership,
  Payment,
  DailyIncome,
  Notification
};