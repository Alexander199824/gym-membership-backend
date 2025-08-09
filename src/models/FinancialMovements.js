// src/models/FinancialMovements.js - CORREGIDO para manejar pagos de invitados
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FinancialMovements = sequelize.define('FinancialMovements', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('income', 'expense'),
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM(
      'membership_sale', 'daily_sale', 'products_sale', 'other_income',
      'equipment', 'maintenance', 'utilities', 'salaries', 'supplies', 'other_expense'
    ),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'transfer', 'online', 'other'),
    allowNull: true
  },
  referenceId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  referenceType: {
    type: DataTypes.ENUM('payment', 'order', 'membership', 'expense', 'other'),
    allowNull: true
  },
  // ✅ CORREGIDO: Permitir null para movimientos automáticos de pagos de invitados
  registeredBy: {
    type: DataTypes.UUID,
    allowNull: true, // ✅ FIX: Permitir null para movimientos automáticos
    references: {
      model: 'users',
      key: 'id'
    }
  },
  receiptUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  movementDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  // ✅ NUEVO: Campo para identificar si es automático
  isAutomatic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'financial_movements',
  timestamps: true,
  indexes: [
    { fields: ['type'] },
    { fields: ['category'] },
    { fields: ['registeredBy'] },
    { fields: ['movementDate'] },
    { fields: ['referenceId', 'referenceType'] },
    { fields: ['isAutomatic'] }
  ],
  validate: {
    // ✅ NUEVO: Validación condicional para registeredBy
    registeredByValidation() {
      // Si no es automático, debe tener registeredBy
      if (!this.isAutomatic && !this.registeredBy) {
        throw new Error('Los movimientos manuales requieren un usuario que los registre');
      }
    }
  }
});

// ✅ MÉTODO CORREGIDO: Crear movimiento desde cualquier pago
FinancialMovements.createFromAnyPayment = async function(payment) {
  try {
    // Determinar la categoría basada en el tipo de pago
    let category = 'other_income';
    switch (payment.paymentType) {
      case 'membership':
        category = 'membership_sale';
        break;
      case 'daily':
      case 'bulk_daily':
        category = 'daily_sale';
        break;
      case 'store_cash_delivery':
      case 'store_card_delivery':
      case 'store_online':
      case 'store_transfer':
      case 'store_other':
        category = 'products_sale';
        break;
      default:
        category = 'other_income';
    }

    // Crear descripción automática
    let description = `Ingreso automático - ${payment.description || 'Pago procesado'}`;
    if (payment.paymentType.startsWith('store_')) {
      description = `Venta de productos - ${payment.description || 'Orden procesada'}`;
    } else if (payment.paymentType === 'membership') {
      description = `Venta de membresía - ${payment.description || 'Membresía procesada'}`;
    } else if (payment.paymentType.includes('daily')) {
      description = `Pago diario - ${payment.description || 'Entrada procesada'}`;
    }

    // ✅ CORREGIDO: Datos del movimiento con manejo de registeredBy null
    const movementData = {
      type: 'income',
      category,
      description,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      referenceId: payment.id,
      referenceType: 'payment',
      registeredBy: payment.registeredBy || null, // ✅ FIX: Permitir null
      movementDate: payment.paymentDate || new Date(),
      isAutomatic: true, // ✅ Marcar como automático
      notes: payment.registeredBy 
        ? `Movimiento automático generado desde pago ID: ${payment.id}`
        : `Movimiento automático - Pago de invitado ID: ${payment.id}`
    };

    const movement = await this.create(movementData);
    
    console.log(`✅ Movimiento financiero creado: ${movement.id} (${payment.registeredBy ? 'con usuario' : 'automático'})`);
    return movement;

  } catch (error) {
    console.error('❌ Error al crear movimiento financiero desde pago:', error);
    throw error;
  }
};

// ✅ NUEVO: Método para adoptar movimientos automáticos
FinancialMovements.adoptAutomaticMovement = async function(movementId, userId) {
  try {
    const movement = await this.findByPk(movementId);
    
    if (!movement) {
      throw new Error('Movimiento no encontrado');
    }

    if (!movement.isAutomatic) {
      throw new Error('Solo se pueden adoptar movimientos automáticos');
    }

    if (movement.registeredBy) {
      throw new Error('Este movimiento ya tiene un usuario asignado');
    }

    movement.registeredBy = userId;
    movement.notes = movement.notes 
      ? `${movement.notes}\n\nAdoptado por usuario ${userId} el ${new Date().toISOString()}`
      : `Adoptado por usuario ${userId} el ${new Date().toISOString()}`;
    
    await movement.save();
    
    console.log(`✅ Movimiento ${movementId} adoptado por usuario ${userId}`);
    return movement;

  } catch (error) {
    console.error('❌ Error al adoptar movimiento automático:', error);
    throw error;
  }
};

// ✅ NUEVO: Método para obtener movimientos automáticos sin asignar
FinancialMovements.findUnassignedAutomatic = function(limit = null) {
  const options = {
    where: {
      isAutomatic: true,
      registeredBy: null
    },
    order: [['createdAt', 'DESC']]
  };
  
  if (limit) options.limit = limit;
  
  return this.findAll(options);
};

// Métodos estáticos existentes
FinancialMovements.findByDateRange = function(startDate, endDate, type = null) {
  const where = {
    movementDate: {
      [sequelize.Sequelize.Op.between]: [startDate, endDate]
    }
  };
  
  if (type) where.type = type;
  
  return this.findAll({
    where,
    order: [['movementDate', 'DESC']]
  });
};

FinancialMovements.getMonthlyStats = async function(year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const stats = await this.findAll({
    where: {
      movementDate: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      }
    },
    attributes: [
      'type',
      'category',
      [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['type', 'category']
  });

  return stats.map(stat => ({
    type: stat.type,
    category: stat.category,
    total: parseFloat(stat.dataValues.total),
    count: parseInt(stat.dataValues.count)
  }));
};

FinancialMovements.getTotalsByType = async function(startDate, endDate) {
  const totals = await this.findAll({
    where: {
      movementDate: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      }
    },
    attributes: [
      'type',
      [sequelize.fn('SUM', sequelize.col('amount')), 'total']
    ],
    group: ['type']
  });

  const result = { income: 0, expense: 0 };
  totals.forEach(total => {
    result[total.type] = parseFloat(total.dataValues.total);
  });

  return {
    ...result,
    netProfit: result.income - result.expense
  };
};

module.exports = FinancialMovements;