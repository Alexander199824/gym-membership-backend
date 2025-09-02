// src/models/UserPromotions.js - REEMPLAZAR COMPLETO
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserPromotions = sequelize.define('UserPromotions', {
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
    },
    field: 'user_id'
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
  
  status: {
    type: DataTypes.ENUM('redeemed', 'used', 'expired'),
    allowNull: false,
    defaultValue: 'redeemed'
  },
  
  redeemedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'redeemed_at'
  },
  
  usedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'used_at'
  },
  
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expires_at'
  },
  
  // ✅ NUEVO: Beneficios calculados al momento del canje
  calculatedBenefits: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'calculated_benefits'
    // Almacena el resultado completo de calculateBenefits()
  },
  
  // Datos del canje cuando se usa
  redemptionData: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'redemption_data'
  }
}, {
  tableName: 'user_promotions',
  timestamps: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['promotion_code_id'] },
    { fields: ['status'] },
    { fields: ['redeemed_at'] }
  ]
});

UserPromotions.prototype.isActive = function() {
  return this.status === 'redeemed' && 
         (!this.expiresAt || new Date() < this.expiresAt);
};

UserPromotions.prototype.markAsUsed = async function() {
  this.status = 'used';
  this.usedAt = new Date();
  await this.save();
};

// Asociaciones
UserPromotions.associate = function(models) {
  UserPromotions.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
  
  UserPromotions.belongsTo(models.PromotionCodes, {
    foreignKey: 'promotionCodeId',
    as: 'promotionCode'
  });
};

module.exports = UserPromotions;