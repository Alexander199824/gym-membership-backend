// src/models/StoreOrder.js - CORREGIDO con métodos estáticos
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

// ✅ MÉTODO ESTÁTICO AGREGADO: Generar número de orden
StoreOrder.generateOrderNumber = function() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const timestamp = now.getTime().toString().slice(-6); // Últimos 6 dígitos del timestamp
  
  return `ORD-${year}${month}${day}-${timestamp}`;
};

// ✅ MÉTODO ESTÁTICO: Obtener reporte de ventas
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
          [this.sequelize.Sequelize.Op.in]: ['delivered', 'confirmed']
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

// ✅ MÉTODO ESTÁTICO: Obtener órdenes pendientes
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

// ✅ MÉTODO ESTÁTICO: Estadísticas de órdenes
StoreOrder.getOrderStats = async function(days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.findOne({
      attributes: [
        [this.sequelize.fn('COUNT', this.sequelize.col('id')), 'totalOrders'],
        [this.sequelize.fn('SUM', this.sequelize.col('totalAmount')), 'totalRevenue'],
        [this.sequelize.fn('AVG', this.sequelize.col('totalAmount')), 'averageOrderValue']
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
      averageOrderValue: parseFloat(stats?.dataValues?.averageOrderValue || 0)
    };
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de órdenes:', error);
    return {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0
    };
  }
};

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