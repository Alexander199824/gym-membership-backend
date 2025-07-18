// src/models/StoreProductImage.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StoreProductImage = sequelize.define('StoreProductImage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // ✅ Relación con producto
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'product_id',
    references: {
      model: 'store_products',
      key: 'id'
    }
  },
  // ✅ Información de la imagen
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
  // ✅ Si es imagen principal
  isPrimary: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_primary'
  },
  // ✅ Orden de visualización
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'display_order'
  }
}, {
  tableName: 'store_product_images',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['product_id'] },
    { fields: ['is_primary'] },
    { fields: ['display_order'] }
  ]
});

module.exports = StoreProductImage;