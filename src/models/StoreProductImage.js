// ===== StoreProductImage.js - CORREGIDO =====
// src/models/StoreProductImage.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StoreProductImage = sequelize.define('StoreProductImage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'product_id',
    references: {
      model: 'store_products',
      key: 'id'
    }
  },
  imageUrl: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'image_url'
  },
  altText: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'alt_text'
  },
  isPrimary: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_primary'
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'display_order'
  }
}, {
  tableName: 'store_product_images',
  timestamps: true,
  indexes: [
    { fields: ['product_id'] },
    { fields: ['is_primary'] },
    { fields: ['display_order'] }
  ]
});

// ✅ AGREGAR ASOCIACIONES
StoreProductImage.associate = function(models) {
  console.log('🔗 Configurando asociaciones para StoreProductImage...');
  
  if (models.StoreProduct) {
    StoreProductImage.belongsTo(models.StoreProduct, {
      foreignKey: 'productId',
      as: 'product'
    });
    console.log('   ✅ StoreProductImage -> StoreProduct (product)');
  }
};

module.exports = StoreProductImage;