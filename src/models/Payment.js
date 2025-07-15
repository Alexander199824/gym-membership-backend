// src/models/Payment.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  membershipId: {
    type: DataTypes.UUID,
    allowNull: true, // Puede ser null para pagos por día
    references: {
      model: 'Memberships',
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
  paymentType: {
    type: DataTypes.ENUM('membership', 'daily', 'bulk_daily'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled', 'refunded'),
    allowNull: false,
    defaultValue: 'completed'
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
      model: 'Users',
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
      model: 'Users',
      key: 'id'
    }
  },
  // Para pagos por día en lote
  dailyPaymentCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1
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
    { fields: ['transferValidated'] }
  ]
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

// Métodos estáticos
Payment.findPendingTransfers = function() {
  return this.findAll({
    where: {
      paymentMethod: 'transfer',
      transferValidated: false,
      status: 'pending'
    },
    include: ['User'],
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
    include: ['User'],
    order: [['paymentDate', 'DESC']]
  });
};

Payment.getTotalIncomeByPeriod = async function(startDate, endDate, groupBy = 'day') {
  const dateFormat = groupBy === 'day' ? '%Y-%m-%d' : 
                    groupBy === 'week' ? '%Y-%u' : 
                    groupBy === 'month' ? '%Y-%m' : '%Y';
  
  return await this.findAll({
    attributes: [
      [sequelize.fn('DATE_TRUNC', groupBy, sequelize.col('paymentDate')), 'period'],
      [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalPayments']
    ],
    where: {
      paymentDate: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      },
      status: 'completed'
    },
    group: [sequelize.fn('DATE_TRUNC', groupBy, sequelize.col('paymentDate'))],
    order: [[sequelize.fn('DATE_TRUNC', groupBy, sequelize.col('paymentDate')), 'ASC']]
  });
};

module.exports = Payment;