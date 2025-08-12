// ===== StoreBrand.js - CORREGIDO =====
// src/models/StoreBrand.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StoreBrand = sequelize.define('StoreBrand', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  logoUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'logo_url'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'store_brands',
  timestamps: true
});

// ✅ AGREGAR ASOCIACIONES
StoreBrand.associate = function(models) {
  console.log('🔗 Configurando asociaciones para StoreBrand...');
  
  if (models.StoreProduct) {
    StoreBrand.hasMany(models.StoreProduct, {
      foreignKey: 'brandId',
      as: 'products'
    });
    console.log('   ✅ StoreBrand -> StoreProduct (products)');
  }
};

module.exports = StoreBrand;







