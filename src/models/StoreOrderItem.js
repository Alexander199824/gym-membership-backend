// src/models/StoreOrderItem.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StoreOrderItem = sequelize.define('StoreOrderItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // ✅ Relaciones
  orderId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'order_id',
    references: {
      model: 'store_orders',
      key: 'id'
    }
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
  // ✅ Snapshot del producto (por si cambia después)
  productName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'product_name'
  },
  productSku: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'product_sku'
  },
  // ✅ Cantidad y precios
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'unit_price'
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'total_price'
  },
  // ✅ Variantes seleccionadas (si las hubiera)
  selectedVariants: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'selected_variants'
    // { color: 'rojo', size: 'L', flavor: 'chocolate' }
  }
}, {
  tableName: 'store_order_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['order_id'] },
    { fields: ['product_id'] }
  ]
});

module.exports = StoreOrderItem;