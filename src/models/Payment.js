// src/models/Payment.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // ✅ CORREGIDO: Permitir pagos sin usuario registrado
  userId: {
    type: DataTypes.UUID,
    allowNull: true, // ← Cambiar a true para pagos anónimos
    references: {
      model: 'users',
      key: 'id'
    }
  },
  membershipId: {
    type: DataTypes.UUID,
    allowNull: true, // Puede ser null para pagos por día
    references: {
      model: 'memberships',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'transfer', 'online'),
    allowNull: false
  },
  // ✅ AMPLIADO: Incluir tipos de pago de tienda
  paymentType: {
    type: DataTypes.ENUM(
      'membership', 'daily', 'bulk_daily',
      'store_cash_delivery', 'store_card_delivery', 'store_online', 'store_transfer', 'store_other'
    ),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled', 'refunded'),
    allowNull: false,
    defaultValue: 'completed'
  },
  // ✅ NUEVO: Información del cliente anónimo
  anonymousClientInfo: {
    type: DataTypes.JSONB,
    allowNull: true,
    // Estructura: { name: 'Juan Pérez', phone: '+502...', notes: 'Cliente ocasional' }
  },
  // Para pagos por transferencia
  transferProof: {
    type: DataTypes.TEXT,
    allowNull: true // URL de Cloudinary del comprobante
  },
  transferValidated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  transferValidatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  transferValidatedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Para pagos con tarjeta (futuras fases)
  cardTransactionId: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  cardLast4: {
    type: DataTypes.STRING(4),
    allowNull: true
  },
  // Información general
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Quien registró el pago
  registeredBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // ✅ MEJORADO: Para múltiples pagos por día
  dailyPaymentCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  // ✅ NUEVO: Precio unitario para pagos múltiples
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  // ✅ NUEVO: Referencias para pagos de tienda
  referenceId: {
    type: DataTypes.UUID,
    allowNull: true
    // Para referenciar orderId de StoreOrder
  },
  referenceType: {
    type: DataTypes.ENUM('membership', 'daily', 'store_order', 'other'),
    allowNull: true
  },
  // Fecha del pago (puede ser diferente a createdAt)
  paymentDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'payments',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['membershipId'] },
    { fields: ['paymentMethod'] },
    { fields: ['paymentType'] },
    { fields: ['status'] },
    { fields: ['registeredBy'] },
    { fields: ['paymentDate'] },
    { fields: ['transferValidated'] },
    { fields: ['referenceId', 'referenceType'] }
  ],
  // ✅ VALIDACIONES PERSONALIZADAS
  validate: {
    membershipRequiresUser() {
      if (this.paymentType === 'membership' && !this.userId) {
        throw new Error('Los pagos de membresía requieren un usuario registrado');
      }
    },
    membershipRequiresMembershipId() {
      if (this.paymentType === 'membership' && !this.membershipId) {
        throw new Error('Los pagos de membresía requieren un ID de membresía');
      }
    },
    dailyPaymentsValidation() {
      if ((this.paymentType === 'daily' || this.paymentType === 'bulk_daily') && !this.userId && !this.anonymousClientInfo) {
        throw new Error('Los pagos diarios sin usuario requieren información del cliente (anonymousClientInfo)');
      }
    },
    bulkPaymentValidation() {
      if (this.paymentType === 'bulk_daily' && (!this.dailyPaymentCount || this.dailyPaymentCount < 2)) {
        throw new Error('Los pagos en lote deben tener al menos 2 entradas');
      }
    }
  },
  // ✅ HOOKS para calcular automáticamente valores
  hooks: {
    beforeValidate: (payment) => {
      // Si es bulk_daily, calcular unitPrice automáticamente
      if (payment.paymentType === 'bulk_daily' && payment.amount && payment.dailyPaymentCount) {
        payment.unitPrice = (payment.amount / payment.dailyPaymentCount).toFixed(2);
      }
      
      // Si es daily simple, dailyPaymentCount = 1
      if (payment.paymentType === 'daily') {
        payment.dailyPaymentCount = 1;
        payment.unitPrice = payment.amount;
      }
    }
  }
});

// Métodos de instancia
Payment.prototype.isPending = function() {
  return this.status === 'pending';
};

Payment.prototype.isCompleted = function() {
  return this.status === 'completed';
};

Payment.prototype.needsValidation = function() {
  return this.paymentMethod === 'transfer' && !this.transferValidated;
};

Payment.prototype.getClientName = function() {
  if (this.user) {
    return this.user.getFullName();
  }
  if (this.anonymousClientInfo && this.anonymousClientInfo.name) {
    return this.anonymousClientInfo.name;
  }
  return 'Cliente anónimo';
};

Payment.prototype.getClientInfo = function() {
  if (this.user) {
    return {
      type: 'registered',
      name: this.user.getFullName(),
      email: this.user.email,
      phone: this.user.phone
    };
  }
  if (this.anonymousClientInfo) {
    return {
      type: 'anonymous',
      name: this.anonymousClientInfo.name || 'Anónimo',
      phone: this.anonymousClientInfo.phone || null,
      notes: this.anonymousClientInfo.notes || null
    };
  }
  return {
    type: 'unknown',
    name: 'Cliente anónimo'
  };
};

// Métodos estáticos existentes...
Payment.findPendingTransfers = function() {
  return this.findAll({
    where: {
      paymentMethod: 'transfer',
      transferValidated: false,
      status: 'pending'
    },
    include: ['user'],
    order: [['createdAt', 'ASC']]
  });
};

Payment.findByUser = function(userId, limit = null) {
  const options = {
    where: { userId },
    order: [['paymentDate', 'DESC']]
  };
  
  if (limit) options.limit = limit;
  
  return this.findAll(options);
};

Payment.findByDateRange = function(startDate, endDate, paymentType = null) {
  const where = {
    paymentDate: {
      [sequelize.Sequelize.Op.between]: [startDate, endDate]
    },
    status: 'completed'
  };
  
  if (paymentType) where.paymentType = paymentType;
  
  return this.findAll({
    where,
    include: ['user'],
    order: [['paymentDate', 'DESC']]
  });
};

// ✅ NUEVO: Método para obtener estadísticas de pagos diarios
Payment.getDailyPaymentStats = async function(startDate, endDate) {
  const dailyPayments = await this.findAll({
    where: {
      paymentType: ['daily', 'bulk_daily'],
      status: 'completed',
      paymentDate: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      }
    },
    attributes: [
      [sequelize.fn('DATE', sequelize.col('paymentDate')), 'date'],
      [sequelize.fn('SUM', sequelize.col('dailyPaymentCount')), 'totalEntries'],
      [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalTransactions']
    ],
    group: [sequelize.fn('DATE', sequelize.col('paymentDate'))],
    order: [[sequelize.fn('DATE', sequelize.col('paymentDate')), 'DESC']]
  });

  return dailyPayments.map(payment => ({
    date: payment.dataValues.date,
    totalEntries: parseInt(payment.dataValues.totalEntries),
    totalAmount: parseFloat(payment.dataValues.totalAmount),
    totalTransactions: parseInt(payment.dataValues.totalTransactions),
    averagePerEntry: parseFloat(payment.dataValues.totalAmount) / parseInt(payment.dataValues.totalEntries)
  }));
};

module.exports = Payment;