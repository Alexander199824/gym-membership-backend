// src/models/StoreOrder.js - MODELO COMPLETO ACTUALIZADO
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
    type: DataTypes.ENUM('pending', 'confirmed', 'preparing', 'ready', 'ready_pickup', 'packed', 'shipped', 'delivered', 'picked_up', 'cancelled', 'refunded'),
    allowNull: false,
    defaultValue: 'pending'
  },
  
  // ✅ NUEVO: Tipo de entrega
  deliveryType: {
    type: DataTypes.ENUM('pickup', 'delivery', 'express'),
    allowNull: false,
    defaultValue: 'delivery',
    field: 'delivery_type'
  },
  
  // Totales (existentes)
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
  
  // Pago (actualizado con nuevas opciones)
  paymentMethod: {
    type: DataTypes.ENUM('cash_on_delivery', 'cash_on_pickup', 'card_on_delivery', 'online_card', 'transfer', 'transfer_on_delivery'),
    allowNull: false,
    field: 'payment_method'
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'transfer_pending', 'transfer_confirmed', 'paid', 'failed', 'refunded'),
    allowNull: false,
    defaultValue: 'pending',
    field: 'payment_status'
  },
  
  // ✅ NUEVOS: Fechas de entrega y pickup
  estimatedDelivery: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'estimated_delivery'
  },
  pickupDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'pickup_date'
  },
  pickupTimeSlot: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'pickup_time_slot'
  },
  
  // ✅ NUEVOS: Gestión de transferencias
  transferVoucherDetails: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'transfer_voucher_details'
  },
  transferConfirmed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'transfer_confirmed'
  },
  transferConfirmedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'transfer_confirmed_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  transferConfirmedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'transfer_confirmed_at'
  },
  
  // ✅ NUEVOS: Gestión y confirmación
  specialInstructions: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'special_instructions'
  },
  requiresConfirmation: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'requires_confirmation'
  },
  confirmedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'confirmed_at'
  },
  confirmedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'confirmed_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Existentes
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
    { fields: ['delivery_type'] },
    { fields: ['transfer_confirmed'] },
    { fields: ['requires_confirmation'] },
    { fields: ['createdAt'] }
  ]
});

// ✅ MÉTODOS DE INSTANCIA
StoreOrder.prototype.needsTransferValidation = function() {
  return this.paymentMethod === 'transfer_on_delivery' && !this.transferConfirmed;
};

StoreOrder.prototype.canBeConfirmed = function() {
  return this.status === 'pending' && this.requiresConfirmation;
};

StoreOrder.prototype.isPickupOrder = function() {
  return this.deliveryType === 'pickup';
};

StoreOrder.prototype.isDeliveryOrder = function() {
  return this.deliveryType === 'delivery' || this.deliveryType === 'express';
};

StoreOrder.prototype.getClientInfo = function() {
  if (this.userId && this.user) {
    return {
      name: `${this.user.firstName} ${this.user.lastName}`,
      email: this.user.email,
      phone: this.user.phone,
      type: 'registered'
    };
  } else if (this.customerInfo) {
    return {
      name: this.customerInfo.name || 'Cliente anónimo',
      email: this.customerInfo.email || null,
      phone: this.customerInfo.phone || null,
      type: 'guest'
    };
  }
  return {
    name: 'Cliente anónimo',
    email: null,
    phone: null,
    type: 'guest'
  };
};

// ✅ MÉTODOS ESTÁTICOS EXISTENTES (mantenidos)
StoreOrder.generateOrderNumber = function() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const timestamp = now.getTime().toString().slice(-6);
  
  return `ORD-${year}${month}${day}-${timestamp}`;
};

StoreOrder.getSalesReport = async function(startDate, endDate) {
  try {
    const salesData = await this.findAll({
      attributes: [
        [this.sequelize.fn('DATE', this.sequelize.col('createdAt')), 'date'],
        [this.sequelize.fn('COUNT', this.sequelize.col('id')), 'orders'],
        [this.sequelize.fn('SUM', this.sequelize.col('totalAmount')), 'revenue']
      ],
      where: {
        createdAt: {
          [this.sequelize.Sequelize.Op.between]: [startDate, endDate]
        },
        status: {
          [this.sequelize.Sequelize.Op.in]: ['delivered', 'picked_up', 'confirmed']
        }
      },
      group: [this.sequelize.fn('DATE', this.sequelize.col('createdAt'))],
      order: [[this.sequelize.fn('DATE', this.sequelize.col('createdAt')), 'ASC']]
    });

    return salesData;
  } catch (error) {
    console.error('❌ Error en getSalesReport:', error);
    return [];
  }
};

StoreOrder.getPendingOrders = async function() {
  try {
    return await this.findAll({
      where: {
        status: {
          [this.sequelize.Sequelize.Op.in]: ['pending', 'confirmed', 'preparing']
        }
      },
      include: [
        { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { association: 'items' }
      ],
      order: [['createdAt', 'ASC']]
    });
  } catch (error) {
    console.error('❌ Error obteniendo órdenes pendientes:', error);
    return [];
  }
};

// ✅ NUEVOS MÉTODOS ESTÁTICOS
StoreOrder.getPendingTransferOrders = async function() {
  try {
    return await this.findAll({
      where: {
        paymentMethod: 'transfer_on_delivery',
        transferConfirmed: false,
        status: { [this.sequelize.Sequelize.Op.ne]: 'cancelled' }
      },
      include: [
        { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { association: 'items' }
      ],
      order: [['createdAt', 'ASC']]
    });
  } catch (error) {
    console.error('❌ Error obteniendo órdenes con transferencias pendientes:', error);
    return [];
  }
};

StoreOrder.getOrdersByDeliveryType = async function(deliveryType, status = null) {
  try {
    const where = { deliveryType };
    if (status) where.status = status;

    return await this.findAll({
      where,
      include: [
        { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { association: 'items' }
      ],
      order: [['createdAt', 'DESC']]
    });
  } catch (error) {
    console.error('❌ Error obteniendo órdenes por tipo de entrega:', error);
    return [];
  }
};

StoreOrder.getOrderStats = async function(days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.findOne({
      attributes: [
        [this.sequelize.fn('COUNT', this.sequelize.col('id')), 'totalOrders'],
        [this.sequelize.fn('SUM', this.sequelize.col('totalAmount')), 'totalRevenue'],
        [this.sequelize.fn('AVG', this.sequelize.col('totalAmount')), 'averageOrderValue'],
        [this.sequelize.fn('COUNT', this.sequelize.literal('CASE WHEN delivery_type = \'pickup\' THEN 1 END')), 'pickupOrders'],
        [this.sequelize.fn('COUNT', this.sequelize.literal('CASE WHEN delivery_type = \'delivery\' THEN 1 END')), 'deliveryOrders'],
        [this.sequelize.fn('COUNT', this.sequelize.literal('CASE WHEN payment_method = \'transfer_on_delivery\' AND transfer_confirmed = false THEN 1 END')), 'pendingTransfers']
      ],
      where: {
        createdAt: {
          [this.sequelize.Sequelize.Op.gte]: startDate
        },
        status: {
          [this.sequelize.Sequelize.Op.ne]: 'cancelled'
        }
      }
    });

    return {
      totalOrders: parseInt(stats?.dataValues?.totalOrders || 0),
      totalRevenue: parseFloat(stats?.dataValues?.totalRevenue || 0),
      averageOrderValue: parseFloat(stats?.dataValues?.averageOrderValue || 0),
      pickupOrders: parseInt(stats?.dataValues?.pickupOrders || 0),
      deliveryOrders: parseInt(stats?.dataValues?.deliveryOrders || 0),
      pendingTransfers: parseInt(stats?.dataValues?.pendingTransfers || 0)
    };
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de órdenes:', error);
    return {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      pickupOrders: 0,
      deliveryOrders: 0,
      pendingTransfers: 0
    };
  }
};

// ✅ ASOCIACIONES EXISTENTES (mantenidas)
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
    
    // ✅ NUEVAS ASOCIACIONES
    StoreOrder.belongsTo(models.User, {
      foreignKey: 'confirmedBy',
      as: 'confirmer'
    });
    
    StoreOrder.belongsTo(models.User, {
      foreignKey: 'transferConfirmedBy',
      as: 'transferConfirmer'
    });
    
    console.log('   ✅ StoreOrder -> User (user, processor, confirmer, transferConfirmer)');
  }
  
  if (models.StoreOrderItem) {
    StoreOrder.hasMany(models.StoreOrderItem, {
      foreignKey: 'orderId',
      as: 'items'
    });
    console.log('   ✅ StoreOrder -> StoreOrderItem (items)');
  }
  
  // ✅ NUEVA ASOCIACIÓN con TransferConfirmation
  if (models.TransferConfirmation) {
    StoreOrder.hasOne(models.TransferConfirmation, {
      foreignKey: 'orderId',
      as: 'transferConfirmation'
    });
    console.log('   ✅ StoreOrder -> TransferConfirmation (transferConfirmation)');
  }
};

module.exports = StoreOrder;