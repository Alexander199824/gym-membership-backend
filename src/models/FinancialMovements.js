// src/models/FinancialMovements.js - NUEVO: Para gestión completa de ingresos y egresos
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FinancialMovements = sequelize.define('FinancialMovements', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // ✅ Tipo de movimiento
  type: {
    type: DataTypes.ENUM('income', 'expense'),
    allowNull: false
  },
  // ✅ Categoría específica
  category: {
    type: DataTypes.ENUM(
      // Ingresos
      'membership_payment', 'daily_payment', 'personal_training', 'products_sale', 'other_income',
      // Egresos
      'rent', 'utilities', 'equipment_purchase', 'equipment_maintenance', 'staff_salary', 
      'cleaning_supplies', 'marketing', 'insurance', 'taxes', 'other_expense'
    ),
    allowNull: false
  },
  // ✅ Información del movimiento
  description: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  // ✅ Fecha del movimiento (puede ser diferente a created_at)
  movementDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'movement_date'
  },
  // ✅ Método de pago (para ingresos) o método de pago (para egresos)
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'transfer', 'check', 'online'),
    allowNull: true,
    field: 'payment_method'
  },
  // ✅ Referencias opcionales
  referenceId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'reference_id'
    // Puede apuntar a Payment.id, User.id, etc.
  },
  referenceType: {
    type: DataTypes.ENUM('payment', 'user', 'membership', 'product', 'manual'),
    allowNull: true,
    field: 'reference_type'
  },
  // ✅ Comprobante o factura
  receiptUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'receipt_url'
  },
  // ✅ Notas adicionales
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // ✅ Quien registró el movimiento
  registeredBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'registered_by'
  }
}, {
  tableName: 'financial_movements',
  timestamps: true,
  indexes: [
    { fields: ['type'] },
    { fields: ['category'] },
    { fields: ['movement_date'] },
    { fields: ['registered_by'] },
    { fields: ['reference_id', 'reference_type'] }
  ]
});

// ✅ Métodos estáticos para reportes financieros
FinancialMovements.getIncomeByPeriod = async function(startDate, endDate, category = null) {
  const where = {
    type: 'income',
    movementDate: {
      [sequelize.Sequelize.Op.between]: [startDate, endDate]
    }
  };
  
  if (category) where.category = category;
  
  const result = await this.sum('amount', { where });
  return result || 0;
};

FinancialMovements.getExpensesByPeriod = async function(startDate, endDate, category = null) {
  const where = {
    type: 'expense',
    movementDate: {
      [sequelize.Sequelize.Op.between]: [startDate, endDate]
    }
  };
  
  if (category) where.category = category;
  
  const result = await this.sum('amount', { where });
  return result || 0;
};

// ✅ Reporte de ingresos vs egresos por período
FinancialMovements.getFinancialSummary = async function(startDate, endDate) {
  const totalIncome = await this.getIncomeByPeriod(startDate, endDate);
  const totalExpenses = await this.getExpensesByPeriod(startDate, endDate);
  const netProfit = totalIncome - totalExpenses;
  
  // ✅ Desglose por categorías
  const incomeByCategory = await this.findAll({
    attributes: [
      'category',
      [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    where: {
      type: 'income',
      movementDate: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      }
    },
    group: ['category']
  });
  
  const expensesByCategory = await this.findAll({
    attributes: [
      'category',
      [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    where: {
      type: 'expense',
      movementDate: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      }
    },
    group: ['category']
  });
  
  return {
    totalIncome,
    totalExpenses,
    netProfit,
    incomeByCategory: incomeByCategory.map(item => ({
      category: item.category,
      total: parseFloat(item.dataValues.total),
      count: parseInt(item.dataValues.count)
    })),
    expensesByCategory: expensesByCategory.map(item => ({
      category: item.category,
      total: parseFloat(item.dataValues.total),
      count: parseInt(item.dataValues.count)
    }))
  };
};

// ✅ Método estático para crear movimiento desde pago
FinancialMovements.createFromPayment = async function(payment) {
  const categoryMap = {
    'membership': 'membership_payment',
    'daily': 'daily_payment',
    'bulk_daily': 'daily_payment'
  };
  
  return await this.create({
    type: 'income',
    category: categoryMap[payment.paymentType] || 'other_income',
    description: `Pago de ${payment.paymentType === 'membership' ? 'membresía' : 'entrada diaria'} - ${payment.getClientName()}`,
    amount: payment.amount,
    movementDate: payment.paymentDate,
    paymentMethod: payment.paymentMethod,
    referenceId: payment.id,
    referenceType: 'payment',
    registeredBy: payment.registeredBy
  });
};

// ✅ NUEVO: Método para crear movimiento desde cualquier tipo de pago
FinancialMovements.createFromAnyPayment = async function(payment) {
  const categoryMap = {
    'membership': 'membership_payment',
    'daily': 'daily_payment',
    'bulk_daily': 'daily_payment',
    'store_cash_delivery': 'products_sale',
    'store_card_delivery': 'products_sale',
    'store_online': 'products_sale',
    'store_transfer': 'products_sale',
    'store_other': 'products_sale'
  };
  
  const descriptionMap = {
    'membership': 'Pago de membresía',
    'daily': 'Pago de entrada diaria',
    'bulk_daily': 'Pago de entradas diarias múltiples',
    'store_cash_delivery': 'Venta de productos - Efectivo contraentrega',
    'store_card_delivery': 'Venta de productos - Tarjeta contraentrega',
    'store_online': 'Venta de productos - Pago online',
    'store_transfer': 'Venta de productos - Transferencia',
    'store_other': 'Venta de productos - Otro método'
  };
  
  return await this.create({
    type: 'income',
    category: categoryMap[payment.paymentType] || 'other_income',
    description: `${descriptionMap[payment.paymentType] || 'Pago'} - ${payment.getClientName()}`,
    amount: payment.amount,
    movementDate: payment.paymentDate,
    paymentMethod: payment.paymentMethod,
    referenceId: payment.id,
    referenceType: 'payment',
    registeredBy: payment.registeredBy
  });
};

module.exports = FinancialMovements;