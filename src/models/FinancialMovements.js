// src/models/FinancialMovements.js - CORREGIDO: Formato estándar de Sequelize
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
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'El tipo de movimiento es requerido'
      }
    }
  },
  category: {
    type: DataTypes.ENUM(
      // Ingresos
      'membership_payment', 'daily_payment', 'personal_training', 'products_sale', 'other_income',
      // Egresos  
      'rent', 'utilities', 'equipment_purchase', 'equipment_maintenance', 'staff_salary',
      'cleaning_supplies', 'marketing', 'insurance', 'taxes', 'other_expense'
    ),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'La categoría es requerida'
      }
    }
  },
  description: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'La descripción es requerida'
      },
      len: {
        args: [5, 500],
        msg: 'La descripción debe tener entre 5 y 500 caracteres'
      }
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: {
        args: [0],
        msg: 'El monto debe ser positivo'
      },
      notEmpty: {
        msg: 'El monto es requerido'
      }
    }
  },
  movementDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'transfer', 'check', 'online'),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  receiptUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: {
        msg: 'La URL del comprobante debe ser válida'
      }
    }
  },
  referenceId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  referenceType: {
    type: DataTypes.ENUM('payment', 'store_order', 'membership', 'manual'),
    allowNull: true
  },
  isAutomatic: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  registeredBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'financial_movements',
  timestamps: true,
  validate: {
    manualMovementsRequireUser() {
      if (!this.isAutomatic && !this.registeredBy) {
        throw new Error('Los movimientos manuales requieren un usuario que los registre');
      }
    }
  }
});

// Métodos estáticos
FinancialMovements.createFromAnyPayment = async function(payment) {
  console.log('Creando movimiento financiero desde pago:', payment.id);
  
  try {
    if (!payment || !payment.id || !payment.amount) {
      console.warn('Payment inválido para crear movimiento financiero:', payment);
      return null;
    }

    let category = 'other_income';
    if (payment.paymentType?.includes('membership')) {
      category = 'membership_payment';
    } else if (payment.paymentType?.includes('daily')) {
      category = 'daily_payment';
    } else if (payment.paymentType?.includes('store')) {
      category = 'products_sale';
    }

    const isAutomatic = !payment.registeredBy || payment.paymentType?.includes('store');

    const movementData = {
      type: 'income',
      category: category,
      description: payment.description || `Pago ${payment.paymentType} - ID: ${payment.id}`,
      amount: parseFloat(payment.amount) || 0,
      paymentMethod: payment.paymentMethod || 'card',
      referenceId: payment.id,
      referenceType: 'payment',
      registeredBy: payment.registeredBy || null,
      isAutomatic: isAutomatic,
      movementDate: payment.paymentDate || new Date(),
      notes: payment.notes || `Movimiento generado automáticamente desde pago ${payment.id}`
    };

    const movement = await this.create(movementData);
    console.log('Movimiento financiero creado exitosamente:', movement.id);
    return movement;
    
  } catch (error) {
    console.error('Error al crear movimiento financiero:', error.message);
    return null;
  }
};

FinancialMovements.createAutomaticForGuest = async function(paymentData) {
  console.log('Creando movimiento automático para invitado');
  
  try {
    if (!paymentData || !paymentData.amount) {
      console.warn('PaymentData inválido para invitado:', paymentData);
      return null;
    }

    const movementData = {
      type: 'income',
      category: 'products_sale',
      description: `Venta online (invitado) - ${paymentData.description || 'Compra online'}`,
      amount: parseFloat(paymentData.amount) || 0,
      paymentMethod: paymentData.paymentMethod || 'card',
      referenceId: paymentData.referenceId || null,
      referenceType: 'payment',
      registeredBy: null,
      isAutomatic: true,
      movementDate: new Date(),
      notes: `Movimiento automático - Pago de invitado: ${paymentData.paymentIntentId || 'N/A'}`
    };

    const movement = await this.create(movementData);
    console.log('Movimiento automático para invitado creado:', movement.id);
    return movement;
    
  } catch (error) {
    console.error('Error al crear movimiento para invitado:', error.message);
    return null;
  }
};

// Método para obtener movimientos sin asignar
FinancialMovements.findUnassignedAutomatic = function(limit = 20) {
  return this.findAll({
    where: {
      isAutomatic: true,
      registeredBy: null
    },
    order: [['movementDate', 'DESC']],
    limit
  });
};

// Método para adoptar movimiento automático
FinancialMovements.adoptAutomaticMovement = async function(movementId, userId) {
  const movement = await this.findByPk(movementId);
  
  if (!movement) {
    throw new Error('Movimiento financiero no encontrado');
  }
  
  if (movement.registeredBy) {
    throw new Error('Este movimiento ya tiene un usuario asignado');
  }
  
  if (!movement.isAutomatic) {
    throw new Error('Solo se pueden adoptar movimientos automáticos');
  }
  
  movement.registeredBy = userId;
  movement.isAutomatic = false; // Ya no es automático, ahora está asignado
  await movement.save();
  
  return movement;
};

// Asociaciones
FinancialMovements.associate = function(models) {
  FinancialMovements.belongsTo(models.User, {
    foreignKey: 'registeredBy',
    as: 'registeredByUser',
    allowNull: true
  });
};

module.exports = FinancialMovements;