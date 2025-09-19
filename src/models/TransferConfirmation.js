// src/models/TransferConfirmation.js - MODELO NUEVO PARA CONFIRMACIONES DE TRANSFERENCIA
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TransferConfirmation = sequelize.define('TransferConfirmation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // ✅ Referencias (una confirmación puede ser para LocalSale O StoreOrder)
  localSaleId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'local_sale_id',
    references: {
      model: 'local_sales',
      key: 'id'
    }
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'order_id',
    references: {
      model: 'store_orders',
      key: 'id'
    }
  },
  
  // ✅ Detalles de la transferencia
  voucherDescription: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'voucher_description',
    comment: 'Descripción del voucher de transferencia (generalmente de WhatsApp)'
  },
  bankReference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'bank_reference',
    comment: 'Número de referencia bancaria'
  },
  transferAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'transfer_amount',
    validate: {
      min: 0
    }
  },
  
  // ✅ Información de quien confirma
  confirmedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'confirmed_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  confirmedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'confirmed_at'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notas adicionales del staff que confirma'
  }
}, {
  tableName: 'transfer_confirmations',
  timestamps: true,
  indexes: [
    { fields: ['local_sale_id'] },
    { fields: ['order_id'] },
    { fields: ['confirmed_by'] },
    { fields: ['confirmed_at'] },
    { fields: ['transfer_amount'] }
  ],
  validate: {
    // Validar que tenga al menos una referencia (LocalSale O StoreOrder)
    mustHaveReference() {
      if (!this.localSaleId && !this.orderId) {
        throw new Error('La confirmación debe estar asociada a una venta local o una orden online');
      }
    },
    // Validar que no tenga ambas referencias al mismo tiempo
    onlyOneReference() {
      if (this.localSaleId && this.orderId) {
        throw new Error('La confirmación no puede estar asociada a ambos tipos de venta simultáneamente');
      }
    }
  }
});

// ✅ MÉTODOS DE INSTANCIA
TransferConfirmation.prototype.getTransferType = function() {
  if (this.localSaleId) return 'local_sale';
  if (this.orderId) return 'store_order';
  return 'unknown';
};

TransferConfirmation.prototype.isForLocalSale = function() {
  return !!this.localSaleId;
};

TransferConfirmation.prototype.isForStoreOrder = function() {
  return !!this.orderId;
};

TransferConfirmation.prototype.getConfirmationDelay = function() {
  // Calcular tiempo transcurrido desde la confirmación
  const now = new Date();
  const confirmed = new Date(this.confirmedAt);
  const diffHours = (now - confirmed) / (1000 * 60 * 60);
  return Math.round(diffHours * 10) / 10;
};

TransferConfirmation.prototype.formatForDisplay = function() {
  return {
    id: this.id,
    type: this.getTransferType(),
    voucherDescription: this.voucherDescription,
    bankReference: this.bankReference,
    amount: parseFloat(this.transferAmount),
    confirmedAt: this.confirmedAt,
    notes: this.notes,
    hoursAgo: this.getConfirmationDelay()
  };
};

// ✅ MÉTODOS ESTÁTICOS
TransferConfirmation.getRecentConfirmations = async function(days = 7, limit = 50) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await this.findAll({
      where: {
        confirmedAt: {
          [this.sequelize.Sequelize.Op.gte]: startDate
        }
      },
      include: [
        { 
          association: 'confirmer', 
          attributes: ['id', 'firstName', 'lastName', 'role'] 
        },
        { 
          association: 'localSale', 
          attributes: ['id', 'saleNumber', 'totalAmount'],
          required: false 
        },
        { 
          association: 'storeOrder', 
          attributes: ['id', 'orderNumber', 'totalAmount'],
          required: false 
        }
      ],
      order: [['confirmedAt', 'DESC']],
      limit
    });
  } catch (error) {
    console.error('❌ Error obteniendo confirmaciones recientes:', error);
    return [];
  }
};

TransferConfirmation.getConfirmationsByUser = async function(userId, startDate, endDate) {
  try {
    const where = { confirmedBy: userId };
    
    if (startDate && endDate) {
      where.confirmedAt = {
        [this.sequelize.Sequelize.Op.between]: [startDate, endDate]
      };
    }

    return await this.findAll({
      where,
      include: [
        { 
          association: 'localSale', 
          attributes: ['id', 'saleNumber', 'totalAmount'],
          required: false 
        },
        { 
          association: 'storeOrder', 
          attributes: ['id', 'orderNumber', 'totalAmount'],
          required: false 
        }
      ],
      order: [['confirmedAt', 'DESC']]
    });
  } catch (error) {
    console.error('❌ Error obteniendo confirmaciones por usuario:', error);
    return [];
  }
};

TransferConfirmation.getDailyStats = async function(date) {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [localSaleStats, storeOrderStats] = await Promise.all([
      // Estadísticas de ventas locales
      this.findOne({
        attributes: [
          [this.sequelize.fn('COUNT', this.sequelize.col('TransferConfirmation.id')), 'count'],
          [this.sequelize.fn('SUM', this.sequelize.col('transfer_amount')), 'totalAmount']
        ],
        where: {
          confirmedAt: { [this.sequelize.Sequelize.Op.between]: [startOfDay, endOfDay] },
          localSaleId: { [this.sequelize.Sequelize.Op.not]: null }
        }
      }),
      
      // Estadísticas de órdenes online
      this.findOne({
        attributes: [
          [this.sequelize.fn('COUNT', this.sequelize.col('TransferConfirmation.id')), 'count'],
          [this.sequelize.fn('SUM', this.sequelize.col('transfer_amount')), 'totalAmount']
        ],
        where: {
          confirmedAt: { [this.sequelize.Sequelize.Op.between]: [startOfDay, endOfDay] },
          orderId: { [this.sequelize.Sequelize.Op.not]: null }
        }
      })
    ]);

    return {
      date: date.toISOString().split('T')[0],
      localSales: {
        count: parseInt(localSaleStats?.dataValues?.count || 0),
        totalAmount: parseFloat(localSaleStats?.dataValues?.totalAmount || 0)
      },
      onlineOrders: {
        count: parseInt(storeOrderStats?.dataValues?.count || 0),
        totalAmount: parseFloat(storeOrderStats?.dataValues?.totalAmount || 0)
      },
      total: {
        count: parseInt(localSaleStats?.dataValues?.count || 0) + parseInt(storeOrderStats?.dataValues?.count || 0),
        totalAmount: parseFloat(localSaleStats?.dataValues?.totalAmount || 0) + parseFloat(storeOrderStats?.dataValues?.totalAmount || 0)
      }
    };
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas diarias:', error);
    return {
      date: date.toISOString().split('T')[0],
      localSales: { count: 0, totalAmount: 0 },
      onlineOrders: { count: 0, totalAmount: 0 },
      total: { count: 0, totalAmount: 0 }
    };
  }
};

TransferConfirmation.getStaffPerformance = async function(startDate, endDate) {
  try {
    const performance = await this.findAll({
      attributes: [
        'confirmedBy',
        [this.sequelize.fn('COUNT', this.sequelize.col('TransferConfirmation.id')), 'confirmationsCount'],
        [this.sequelize.fn('SUM', this.sequelize.col('transfer_amount')), 'totalAmount'],
        [this.sequelize.fn('AVG', this.sequelize.col('transfer_amount')), 'averageAmount'],
        [this.sequelize.fn('COUNT', this.sequelize.literal('CASE WHEN local_sale_id IS NOT NULL THEN 1 END')), 'localSalesCount'],
        [this.sequelize.fn('COUNT', this.sequelize.literal('CASE WHEN order_id IS NOT NULL THEN 1 END')), 'onlineOrdersCount']
      ],
      include: [{
        association: 'confirmer',
        attributes: ['id', 'firstName', 'lastName', 'role']
      }],
      where: {
        confirmedAt: {
          [this.sequelize.Sequelize.Op.between]: [startDate, endDate]
        }
      },
      group: ['confirmedBy', 'confirmer.id', 'confirmer.firstName', 'confirmer.lastName', 'confirmer.role'],
      order: [[this.sequelize.fn('COUNT', this.sequelize.col('TransferConfirmation.id')), 'DESC']]
    });

    return performance.map(item => ({
      staff: {
        id: item.confirmer.id,
        name: `${item.confirmer.firstName} ${item.confirmer.lastName}`,
        role: item.confirmer.role
      },
      confirmationsCount: parseInt(item.dataValues.confirmationsCount),
      totalAmount: parseFloat(item.dataValues.totalAmount),
      averageAmount: parseFloat(item.dataValues.averageAmount),
      localSalesCount: parseInt(item.dataValues.localSalesCount),
      onlineOrdersCount: parseInt(item.dataValues.onlineOrdersCount)
    }));
  } catch (error) {
    console.error('❌ Error obteniendo performance del staff:', error);
    return [];
  }
};

// ✅ ASOCIACIONES
TransferConfirmation.associate = function(models) {
  console.log('🔗 Configurando asociaciones para TransferConfirmation...');
  
  if (models.LocalSale) {
    TransferConfirmation.belongsTo(models.LocalSale, {
      foreignKey: 'localSaleId',
      as: 'localSale'
    });
    console.log('   ✅ TransferConfirmation -> LocalSale (localSale)');
  }
  
  if (models.StoreOrder) {
    TransferConfirmation.belongsTo(models.StoreOrder, {
      foreignKey: 'orderId',
      as: 'storeOrder'
    });
    console.log('   ✅ TransferConfirmation -> StoreOrder (storeOrder)');
  }
  
  if (models.User) {
    TransferConfirmation.belongsTo(models.User, {
      foreignKey: 'confirmedBy',
      as: 'confirmer'
    });
    console.log('   ✅ TransferConfirmation -> User (confirmer)');
  }
};

module.exports = TransferConfirmation;