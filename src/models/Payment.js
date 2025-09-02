// src/models/Payment.js - CORREGIDO: Validaciones simplificadas y mejoradas
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
    allowNull: true, // ✅ Permite pagos anónimos/invitados
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
    allowNull: false,
    defaultValue: 'cash'
  },
  // ✅ AMPLIADO: Incluir tipos de pago de tienda
  paymentType: {
    type: DataTypes.ENUM(
      'membership', 'daily', 'bulk_daily',
      'store_cash_delivery', 'store_card_delivery', 'store_online', 'store_transfer', 'store_other'
    ),
    allowNull: false,
    defaultValue: 'daily'
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled', 'refunded'),
    allowNull: false,
    defaultValue: 'completed'
  },
  // ✅ CORREGIDO: Información del cliente anónimo - más flexible
  anonymousClientInfo: {
    type: DataTypes.JSONB,
    allowNull: true
    // Estructura: { name: 'Juan Pérez', phone: '+502...', email: 'juan@example.com', notes: 'Cliente ocasional' }
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
    allowNull: true,
    defaultValue: 'Pago registrado'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // ✅ CORREGIDO: Quien registró el pago - Permitir NULL para pagos automatizados
  registeredBy: {
    type: DataTypes.UUID,
    allowNull: true, // ✅ FIX: Permitir null para pagos automatizados
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
  // ✅ VALIDACIONES SIMPLIFICADAS Y MÁS FLEXIBLES
  validate: {
    // ✅ CORREGIDO: Validación más simple para membresías
    basicMembershipValidation() {
      if (this.paymentType === 'membership') {
        if (!this.userId && !this.anonymousClientInfo?.name) {
          throw new Error('Los pagos de membresía requieren usuario registrado o información del cliente');
        }
      }
    },
    
    // ✅ CORREGIDO: Validación más flexible para pagos diarios
    dailyPaymentsValidation() {
      if (this.paymentType === 'daily' || this.paymentType === 'bulk_daily') {
        // Si no hay usuario, debe haber al menos un nombre
        if (!this.userId && (!this.anonymousClientInfo || !this.anonymousClientInfo.name)) {
          throw new Error('Los pagos diarios requieren usuario registrado o al menos el nombre del cliente');
        }
      }
    },
    
    // ✅ CORREGIDO: Validación simplificada para pagos en lote
    bulkPaymentValidation() {
      if (this.paymentType === 'bulk_daily') {
        if (!this.dailyPaymentCount || this.dailyPaymentCount < 2) {
          throw new Error('Los pagos en lote deben tener al menos 2 entradas');
        }
      }
    }
  },
  // ✅ HOOKS SIMPLIFICADOS para calcular automáticamente valores
  hooks: {
    beforeValidate: (payment) => {
      // Asegurar valores por defecto
      if (!payment.description) {
        payment.description = `Pago ${payment.paymentType} - ${payment.paymentMethod}`;
      }
      
      // Si es bulk_daily, calcular unitPrice automáticamente
      if (payment.paymentType === 'bulk_daily' && payment.amount && payment.dailyPaymentCount) {
        payment.unitPrice = (payment.amount / payment.dailyPaymentCount).toFixed(2);
      }
      
      // Si es daily simple, dailyPaymentCount = 1
      if (payment.paymentType === 'daily') {
        payment.dailyPaymentCount = 1;
        payment.unitPrice = payment.amount;
      }

      // ✅ CORREGIDO: Para pagos automatizados, no requiere registeredBy
      if (!payment.registeredBy && payment.userId && ['membership', 'daily'].includes(payment.paymentType)) {
        // Solo asignar si es un pago normal de usuario
        console.log('ℹ️ Pago sin registeredBy asignado - puede ser automatizado');
      }
    },
    
    afterCreate: (payment) => {
      console.log(`✅ Pago creado: ID ${payment.id} - $${payment.amount} (${payment.paymentType})`);
    }
  }
});

// ✅ MÉTODOS DE INSTANCIA MEJORADOS
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
  if (this.user && typeof this.user.getFullName === 'function') {
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
      name: typeof this.user.getFullName === 'function' ? this.user.getFullName() : `${this.user.firstName} ${this.user.lastName}`,
      email: this.user.email,
      phone: this.user.phone
    };
  }
  if (this.anonymousClientInfo) {
    return {
      type: 'anonymous',
      name: this.anonymousClientInfo.name || 'Anónimo',
      email: this.anonymousClientInfo.email || null,
      phone: this.anonymousClientInfo.phone || null,
      notes: this.anonymousClientInfo.notes || null
    };
  }
  return {
    type: 'unknown',
    name: 'Cliente anónimo'
  };
};

// ✅ NUEVO: Método para verificar si es pago de invitado
Payment.prototype.isGuestPayment = function() {
  return !this.userId && !!this.anonymousClientInfo;
};

// ✅ NUEVO: Método para verificar si es pago de tienda
Payment.prototype.isStorePayment = function() {
  const storeTypes = ['store_cash_delivery', 'store_card_delivery', 'store_online', 'store_transfer', 'store_other'];
  return storeTypes.includes(this.paymentType);
};

// ✅ MÉTODOS ESTÁTICOS MEJORADOS
Payment.findPendingTransfers = function() {
  return this.findAll({
    where: {
      paymentMethod: 'transfer',
      transferValidated: false,
      status: 'pending'
    },
    include: [
      {
        association: 'user',
        required: false,
        attributes: ['id', 'firstName', 'lastName', 'email']
      }
    ],
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
    include: [
      {
        association: 'user',
        required: false,
        attributes: ['id', 'firstName', 'lastName', 'email']
      }
    ],
    order: [['paymentDate', 'DESC']]
  });
};

// ✅ NUEVO: Método para obtener pagos de invitados
Payment.findGuestPayments = function(limit = null) {
  const options = {
    where: {
      userId: null,
      anonymousClientInfo: { [sequelize.Sequelize.Op.not]: null }
    },
    order: [['paymentDate', 'DESC']]
  };
  
  if (limit) options.limit = limit;
  
  return this.findAll(options);
};

// ✅ NUEVO: Método para verificar y crear datos de prueba
Payment.createTestData = async function() {
  try {
    console.log('🧪 Creando datos de prueba para pagos...');
    
    const testPayments = [
      {
        amount: 25.00,
        paymentMethod: 'cash',
        paymentType: 'daily',
        description: 'Pago diario de prueba',
        anonymousClientInfo: {
          name: 'Cliente Prueba',
          phone: '+502 1234-5678'
        },
        status: 'completed'
      }
    ];
    
    let createdCount = 0;
    for (const paymentData of testPayments) {
      try {
        const payment = await this.create(paymentData);
        createdCount++;
        console.log(`✅ Pago de prueba creado: $${payment.amount}`);
      } catch (error) {
        console.log(`⚠️ Error creando pago de prueba: ${error.message}`);
      }
    }
    
    console.log(`🧪 ${createdCount} pagos de prueba creados`);
    return createdCount;
    
  } catch (error) {
    console.error('❌ Error creando datos de prueba de pagos:', error.message);
    throw error;
  }
};

// ✅ Asociaciones
Payment.associate = function(models) {
  Payment.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
  
  Payment.belongsTo(models.Membership, {
    foreignKey: 'membershipId',
    as: 'membership'
  });
  
  Payment.belongsTo(models.User, {
    foreignKey: 'registeredBy',
    as: 'registeredByUser'
  });
  
  Payment.belongsTo(models.User, {
    foreignKey: 'transferValidatedBy',
    as: 'transferValidator'
  });
};

module.exports = Payment;