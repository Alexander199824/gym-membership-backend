// ===== StoreOrderItem.js - CORREGIDO =====
// src/models/StoreOrderItem.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StoreOrderItem = sequelize.define('StoreOrderItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
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
  selectedVariants: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'selected_variants'
  }
}, {
  tableName: 'store_order_items',
  timestamps: true,
  indexes: [
    { fields: ['order_id'] },
    { fields: ['product_id'] }
  ]
});

// ✅ AGREGAR ASOCIACIONES
StoreOrderItem.associate = function(models) {
  console.log('🔗 Configurando asociaciones para StoreOrderItem...');
  
  if (models.StoreOrder) {
    StoreOrderItem.belongsTo(models.StoreOrder, {
      foreignKey: 'orderId',
      as: 'order'
    });
    console.log('   ✅ StoreOrderItem -> StoreOrder (order)');
  }
  
  if (models.StoreProduct) {
    StoreOrderItem.belongsTo(models.StoreProduct, {
      foreignKey: 'productId',
      as: 'product'
    });
    console.log('   ✅ StoreOrderItem -> StoreProduct (product)');
  }
};

module.exports = StoreOrderItem;