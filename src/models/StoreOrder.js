// ===== StoreOrder.js - CORREGIDO =====
// src/models/StoreOrder.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StoreOrder = sequelize.define('StoreOrder', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  orderNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'order_number'
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  taxAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'tax_amount'
  },
  shippingAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'shipping_amount'
  },
  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'discount_amount'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'total_amount'
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash_on_delivery', 'card_on_delivery', 'online_card', 'transfer'),
    allowNull: false,
    field: 'payment_method'
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
    allowNull: false,
    defaultValue: 'pending',
    field: 'payment_status'
  },
  customerInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'customer_info'
  },
  shippingAddress: {
    type: DataTypes.JSON,
    allowNull: false,
    field: 'shipping_address'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  deliveryDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'delivery_date'
  },
  deliveryTimeSlot: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'delivery_time_slot'
  },
  trackingNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'tracking_number'
  },
  processedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'processed_by',
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'store_orders',
  timestamps: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['order_number'], unique: true },
    { fields: ['status'] },
    { fields: ['payment_status'] },
    { fields: ['createdAt'] }
  ]
});

// ✅ AGREGAR ASOCIACIONES
StoreOrder.associate = function(models) {
  console.log('🔗 Configurando asociaciones para StoreOrder...');
  
  if (models.User) {
    StoreOrder.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    StoreOrder.belongsTo(models.User, {
      foreignKey: 'processedBy',
      as: 'processor'
    });
    console.log('   ✅ StoreOrder -> User (user, processor)');
  }
  
  if (models.StoreOrderItem) {
    StoreOrder.hasMany(models.StoreOrderItem, {
      foreignKey: 'orderId',
      as: 'items'
    });
    console.log('   ✅ StoreOrder -> StoreOrderItem (items)');
  }
};

module.exports = StoreOrder;
