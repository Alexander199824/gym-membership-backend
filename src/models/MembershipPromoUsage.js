// src/models/MembershipPromotions.js - NUEVO ARCHIVO
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MembershipPromotions = sequelize.define('MembershipPromotions', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  membershipId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'memberships',
      key: 'id'
    },
    field: 'membership_id'
  },
  
  promotionCodeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'promotion_codes',
      key: 'id'
    },
    field: 'promotion_code_id'
  },
  
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'user_id'
  },
  
  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'discount_amount'
  },
  
  freeDaysAdded: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'free_days_added'
  },
  
  appliedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'applied_at'
  }
}, {
  tableName: 'membership_promotions',
  timestamps: true
});

module.exports = MembershipPromotions;