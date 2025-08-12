// ===== StoreCategory.js - CORREGIDO =====
// src/models/StoreCategory.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StoreCategory = sequelize.define('StoreCategory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  iconName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'package',
    field: 'icon_name'
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'display_order'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'store_categories',
  timestamps: true,
  indexes: [
    { fields: ['slug'], unique: true },
    { fields: ['is_active'] },
    { fields: ['display_order'] }
  ]
});

// ✅ AGREGAR ASOCIACIONES
StoreCategory.associate = function(models) {
  console.log('🔗 Configurando asociaciones para StoreCategory...');
  
  if (models.StoreProduct) {
    StoreCategory.hasMany(models.StoreProduct, {
      foreignKey: 'categoryId',
      as: 'products'
    });
    console.log('   ✅ StoreCategory -> StoreProduct (products)');
  }
};

module.exports = StoreCategory;
