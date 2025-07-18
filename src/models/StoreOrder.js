// src/models/StoreOrder.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StoreOrder = sequelize.define('StoreOrder', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // ✅ Usuario (puede ser null para órdenes de invitados)
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // ✅ Número de orden único
  orderNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'order_number'
  },
  // ✅ Estado de la orden
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  // ✅ Información financiera
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
  // ✅ Información de pago
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
  // ✅ Información del cliente (para órdenes sin usuario)
  customerInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'customer_info'
    // { name, email, phone, address }
  },
  // ✅ Dirección de entrega
  shippingAddress: {
    type: DataTypes.JSON,
    allowNull: false,
    field: 'shipping_address'
    // { street, city, state, zipCode, country, instructions }
  },
  // ✅ Notas de la orden
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // ✅ Información de entrega
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
  // ✅ Tracking
  trackingNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'tracking_number'
  },
  // ✅ Quien procesó la orden
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
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['order_number'], unique: true },
    { fields: ['status'] },
    { fields: ['payment_status'] },
    { fields: ['created_at'] }
  ]
});

// ✅ Generar número de orden único
StoreOrder.generateOrderNumber = function() {
  const prefix = 'EFC';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${random}`;
};

// ✅ Métodos de instancia
StoreOrder.prototype.canBeCancelled = function() {
  return ['pending', 'confirmed'].includes(this.status);
};

StoreOrder.prototype.isDelivered = function() {
  return this.status === 'delivered';
};

// ✅ Métodos estáticos para reportes
StoreOrder.getOrdersByStatus = async function(status) {
  return await this.findAll({
    where: { status },
    include: ['user', 'items'],
    order: [['createdAt', 'DESC']]
  });
};

StoreOrder.getSalesReport = async function(startDate, endDate) {
  return await this.findAll({
    where: {
      status: 'delivered',
      createdAt: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      }
    },
    attributes: [
      [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'orders'],
      [sequelize.fn('SUM', sequelize.col('total_amount')), 'revenue']
    ],
    group: [sequelize.fn('DATE', sequelize.col('created_at'))],
    order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']]
  });
};

module.exports = StoreOrder;