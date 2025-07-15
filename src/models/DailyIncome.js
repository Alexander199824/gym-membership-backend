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
      model: 'users',
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

module.exports = DailyIncome;