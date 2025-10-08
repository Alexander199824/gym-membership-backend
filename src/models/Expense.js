// src/models/Expense.js - MODELO COMPLETO DE GASTOS
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Expense = sequelize.define('Expense', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // ✅ Categoría del gasto (sincronizada con FinancialMovements)
  category: {
    type: DataTypes.ENUM(
      'rent',                    // Alquiler
      'utilities',               // Servicios (agua, luz, internet)
      'equipment_purchase',      // Compra de equipo
      'equipment_maintenance',   // Mantenimiento de equipo
      'staff_salary',           // Salarios del personal
      'cleaning_supplies',      // Suministros de limpieza
      'marketing',              // Marketing y publicidad
      'insurance',              // Seguros
      'taxes',                  // Impuestos
      'other_expense'           // Otros gastos
    ),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'La categoría del gasto es requerida'
      }
    }
  },
  
  // ✅ Información básica del gasto
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'El título del gasto es requerido'
      },
      len: {
        args: [3, 200],
        msg: 'El título debe tener entre 3 y 200 caracteres'
      }
    }
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'La descripción es requerida'
      },
      len: {
        args: [5, 2000],
        msg: 'La descripción debe tener entre 5 y 2000 caracteres'
      }
    }
  },
  
  // ✅ Monto del gasto
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
  
  // ✅ Fecha del gasto
  expenseDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'expense_date'
  },
  
  // ✅ Método de pago
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'transfer', 'check', 'online'),
    allowNull: false,
    defaultValue: 'cash',
    field: 'payment_method'
  },
  
  // ✅ Proveedor/Beneficiario
  vendor: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Proveedor o beneficiario del pago'
  },
  
  vendorContact: {
    type: DataTypes.STRING(200),
    allowNull: true,
    field: 'vendor_contact',
    comment: 'Teléfono o email del proveedor'
  },
  
  // ✅ Información de factura/recibo
  invoiceNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'invoice_number',
    comment: 'Número de factura o recibo'
  },
  
  receiptUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'receipt_url',
    validate: {
      isUrl: {
        msg: 'La URL del recibo debe ser válida'
      }
    },
    comment: 'URL del comprobante/recibo (Cloudinary)'
  },
  
  // ✅ Estado del gasto
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'paid', 'cancelled', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  
  // ✅ ¿Es recurrente?
  isRecurring: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_recurring',
    comment: '¿Este gasto se repite mensualmente?'
  },
  
  recurringFrequency: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly'),
    allowNull: true,
    field: 'recurring_frequency'
  },
  
  nextRecurringDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'next_recurring_date'
  },
  
  // ✅ Referencias
  registeredBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'registered_by',
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Usuario que registró el gasto'
  },
  
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'approved_by',
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Usuario que aprobó el gasto'
  },
  
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at'
  },
  
  // ✅ Referencia a FinancialMovements
  financialMovementId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'financial_movement_id',
    references: {
      model: 'financial_movements',
      key: 'id'
    },
    comment: 'Referencia al movimiento financiero creado'
  },
  
  // ✅ Notas y metadata
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notas adicionales sobre el gasto'
  },
  
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: [],
    comment: 'Etiquetas para clasificación adicional'
  }
}, {
  tableName: 'expenses',
  timestamps: true,
  indexes: [
    { fields: ['category'] },
    { fields: ['status'] },
    { fields: ['expense_date'] },
    { fields: ['registered_by'] },
    { fields: ['approved_by'] },
    { fields: ['vendor'] },
    { fields: ['is_recurring'] },
    { fields: ['payment_method'] },
    { fields: ['financial_movement_id'] }
  ],
  validate: {
    recurringValidation() {
      if (this.isRecurring && !this.recurringFrequency) {
        throw new Error('Los gastos recurrentes deben tener una frecuencia definida');
      }
    }
  }
});

// ============================================================================
// MÉTODOS DE INSTANCIA
// ============================================================================

// Verificar si el gasto está pendiente de aprobación
Expense.prototype.isPending = function() {
  return this.status === 'pending';
};

// Verificar si el gasto fue aprobado
Expense.prototype.isApproved = function() {
  return this.status === 'approved' || this.status === 'paid';
};

// Verificar si necesita aprobación
Expense.prototype.needsApproval = function() {
  return this.status === 'pending' && this.amount >= 500; // Gastos mayores a Q500 requieren aprobación
};

// Calcular días desde el registro
Expense.prototype.getDaysSinceRegistered = function() {
  const now = new Date();
  const registered = new Date(this.createdAt);
  const diffTime = Math.abs(now - registered);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Verificar si el gasto está vencido (>30 días sin pagar)
Expense.prototype.isOverdue = function() {
  return this.status === 'pending' && this.getDaysSinceRegistered() > 30;
};

// Obtener información del gasto formateada
Expense.prototype.getSummary = function() {
  return {
    id: this.id,
    title: this.title,
    category: this.category,
    amount: parseFloat(this.amount),
    vendor: this.vendor || 'No especificado',
    status: this.status,
    expenseDate: this.expenseDate,
    daysOld: this.getDaysSinceRegistered(),
    isOverdue: this.isOverdue(),
    isRecurring: this.isRecurring,
    hasReceipt: !!this.receiptUrl
  };
};

// Calcular próxima fecha de recurrencia
Expense.prototype.calculateNextRecurringDate = function() {
  if (!this.isRecurring || !this.recurringFrequency) return null;
  
  const baseDate = this.nextRecurringDate || this.expenseDate;
  const date = new Date(baseDate);
  
  switch(this.recurringFrequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  
  return date;
};

// ============================================================================
// MÉTODOS ESTÁTICOS
// ============================================================================

// Crear gasto con movimiento financiero automático
Expense.createWithFinancialMovement = async function(expenseData, userId, options = {}) {
  const transaction = options.transaction || await sequelize.transaction();
  const shouldCommit = !options.transaction;
  
  try {
    console.log('💰 Creando gasto con movimiento financiero...');
    
    // 1. Crear el gasto
    const expense = await this.create({
      ...expenseData,
      registeredBy: userId,
      status: expenseData.status || 'pending'
    }, { transaction });
    
    console.log(`✅ Gasto creado: ${expense.title} - Q${expense.amount}`);
    
    // 2. Si el gasto está aprobado o pagado, crear movimiento financiero
    if (expense.status === 'approved' || expense.status === 'paid') {
      const { FinancialMovements } = require('./index');
      
      const movementData = {
        type: 'expense',
        category: expense.category,
        description: `${expense.title} - ${expense.description}`,
        amount: expense.amount,
        movementDate: expense.expenseDate,
        paymentMethod: expense.paymentMethod,
        notes: expense.notes || `Gasto registrado: ${expense.invoiceNumber || 'Sin factura'}`,
        receiptUrl: expense.receiptUrl,
        referenceId: expense.id,
        referenceType: 'manual',
        isAutomatic: false,
        registeredBy: userId
      };
      
      const movement = await FinancialMovements.create(movementData, { transaction });
      
      // Asociar el movimiento financiero al gasto
      expense.financialMovementId = movement.id;
      await expense.save({ transaction });
      
      console.log(`✅ Movimiento financiero creado: ${movement.id}`);
    }
    
    if (shouldCommit) {
      await transaction.commit();
    }
    
    console.log(`✅ Proceso completado: Gasto ${expense.id}`);
    return expense;
    
  } catch (error) {
    if (shouldCommit) {
      await transaction.rollback();
    }
    console.error('❌ Error creando gasto:', error.message);
    throw error;
  }
};

// Aprobar gasto y crear movimiento financiero
Expense.approveExpense = async function(expenseId, approverId, options = {}) {
  const transaction = options.transaction || await sequelize.transaction();
  const shouldCommit = !options.transaction;
  
  try {
    const expense = await this.findByPk(expenseId, { transaction });
    
    if (!expense) {
      throw new Error('Gasto no encontrado');
    }
    
    if (expense.status !== 'pending') {
      throw new Error('Solo se pueden aprobar gastos pendientes');
    }
    
    console.log(`✅ Aprobando gasto: ${expense.title}`);
    
    // Actualizar estado del gasto
    expense.status = 'approved';
    expense.approvedBy = approverId;
    expense.approvedAt = new Date();
    await expense.save({ transaction });
    
    // Crear movimiento financiero
    const { FinancialMovements } = require('./index');
    
    const movement = await FinancialMovements.create({
      type: 'expense',
      category: expense.category,
      description: `${expense.title} - ${expense.description}`,
      amount: expense.amount,
      movementDate: expense.expenseDate,
      paymentMethod: expense.paymentMethod,
      notes: `Gasto aprobado por admin - ${expense.notes || ''}`,
      receiptUrl: expense.receiptUrl,
      referenceId: expense.id,
      referenceType: 'manual',
      isAutomatic: false,
      registeredBy: approverId
    }, { transaction });
    
    expense.financialMovementId = movement.id;
    await expense.save({ transaction });
    
    if (shouldCommit) {
      await transaction.commit();
    }
    
    console.log(`✅ Gasto aprobado y movimiento financiero creado`);
    return expense;
    
  } catch (error) {
    if (shouldCommit) {
      await transaction.rollback();
    }
    console.error('❌ Error aprobando gasto:', error.message);
    throw error;
  }
};

// Obtener gastos pendientes de aprobación
Expense.getPendingApproval = async function(minAmount = 500) {
  try {
    return await this.findAll({
      where: {
        status: 'pending',
        amount: {
          [sequelize.Sequelize.Op.gte]: minAmount
        }
      },
      include: [
        {
          association: 'registeredByUser',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['expenseDate', 'ASC'], ['amount', 'DESC']]
    });
  } catch (error) {
    console.error('❌ Error obteniendo gastos pendientes:', error);
    return [];
  }
};

// Obtener gastos por categoría en un período
Expense.getByCategory = async function(category, startDate, endDate) {
  try {
    const where = {
      category,
      status: { [sequelize.Sequelize.Op.in]: ['approved', 'paid'] }
    };
    
    if (startDate && endDate) {
      where.expenseDate = {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      };
    }
    
    return await this.findAll({
      where,
      include: [
        {
          association: 'registeredByUser',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['expenseDate', 'DESC']]
    });
  } catch (error) {
    console.error('❌ Error obteniendo gastos por categoría:', error);
    return [];
  }
};

// Obtener estadísticas de gastos por período
Expense.getExpenseStats = async function(startDate, endDate) {
  try {
    const stats = await this.findOne({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalExpenses'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
        [sequelize.fn('AVG', sequelize.col('amount')), 'averageAmount'],
        [sequelize.fn('MAX', sequelize.col('amount')), 'maxAmount'],
        [sequelize.fn('MIN', sequelize.col('amount')), 'minAmount']
      ],
      where: {
        expenseDate: {
          [sequelize.Sequelize.Op.between]: [startDate, endDate]
        },
        status: { [sequelize.Sequelize.Op.in]: ['approved', 'paid'] }
      }
    });
    
    return {
      totalExpenses: parseInt(stats?.dataValues?.totalExpenses || 0),
      totalAmount: parseFloat(stats?.dataValues?.totalAmount || 0),
      averageAmount: parseFloat(stats?.dataValues?.averageAmount || 0),
      maxAmount: parseFloat(stats?.dataValues?.maxAmount || 0),
      minAmount: parseFloat(stats?.dataValues?.minAmount || 0)
    };
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    return {
      totalExpenses: 0,
      totalAmount: 0,
      averageAmount: 0,
      maxAmount: 0,
      minAmount: 0
    };
  }
};

// Obtener breakdown por categoría
Expense.getCategoryBreakdown = async function(startDate, endDate) {
  try {
    const breakdown = await this.findAll({
      attributes: [
        'category',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      where: {
        expenseDate: {
          [sequelize.Sequelize.Op.between]: [startDate, endDate]
        },
        status: { [sequelize.Sequelize.Op.in]: ['approved', 'paid'] }
      },
      group: ['category'],
      order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']]
    });
    
    return breakdown.map(item => ({
      category: item.category,
      count: parseInt(item.dataValues.count),
      total: parseFloat(item.dataValues.total)
    }));
  } catch (error) {
    console.error('❌ Error obteniendo breakdown por categoría:', error);
    return [];
  }
};

// Obtener gastos recurrentes próximos a vencer
Expense.getUpcomingRecurring = async function(daysAhead = 7) {
  try {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    return await this.findAll({
      where: {
        isRecurring: true,
        status: { [sequelize.Sequelize.Op.ne]: 'cancelled' },
        nextRecurringDate: {
          [sequelize.Sequelize.Op.between]: [new Date(), futureDate]
        }
      },
      include: [
        {
          association: 'registeredByUser',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['nextRecurringDate', 'ASC']]
    });
  } catch (error) {
    console.error('❌ Error obteniendo gastos recurrentes:', error);
    return [];
  }
};

// Procesar gastos recurrentes (cron job)
Expense.processRecurringExpenses = async function() {
  try {
    console.log('🔄 Procesando gastos recurrentes...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueExpenses = await this.findAll({
      where: {
        isRecurring: true,
        status: { [sequelize.Sequelize.Op.ne]: 'cancelled' },
        nextRecurringDate: {
          [sequelize.Sequelize.Op.lte]: today
        }
      }
    });
    
    let processed = 0;
    
    for (const expense of dueExpenses) {
      try {
        // Crear nuevo gasto basado en el recurrente
        const newExpense = await this.createWithFinancialMovement({
          category: expense.category,
          title: `${expense.title} (Recurrente)`,
          description: expense.description,
          amount: expense.amount,
          expenseDate: new Date(),
          paymentMethod: expense.paymentMethod,
          vendor: expense.vendor,
          vendorContact: expense.vendorContact,
          notes: `Gasto recurrente generado automáticamente desde ${expense.id}`,
          status: 'pending',
          isRecurring: false
        }, expense.registeredBy);
        
        // Actualizar próxima fecha en el gasto original
        expense.nextRecurringDate = expense.calculateNextRecurringDate();
        await expense.save();
        
        processed++;
        console.log(`✅ Gasto recurrente procesado: ${newExpense.title}`);
      } catch (error) {
        console.error(`❌ Error procesando gasto ${expense.id}:`, error.message);
      }
    }
    
    console.log(`✅ ${processed} gastos recurrentes procesados`);
    return { processed, total: dueExpenses.length };
    
  } catch (error) {
    console.error('❌ Error en proceso de gastos recurrentes:', error);
    return { processed: 0, total: 0 };
  }
};

// Obtener top proveedores por monto gastado
Expense.getTopVendors = async function(startDate, endDate, limit = 10) {
  try {
    const vendors = await this.findAll({
      attributes: [
        'vendor',
        [sequelize.fn('COUNT', sequelize.col('id')), 'transactionCount'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalSpent'],
        [sequelize.fn('AVG', sequelize.col('amount')), 'averageTransaction']
      ],
      where: {
        vendor: { [sequelize.Sequelize.Op.ne]: null },
        expenseDate: {
          [sequelize.Sequelize.Op.between]: [startDate, endDate]
        },
        status: { [sequelize.Sequelize.Op.in]: ['approved', 'paid'] }
      },
      group: ['vendor'],
      order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
      limit
    });
    
    return vendors.map(v => ({
      vendor: v.vendor,
      transactionCount: parseInt(v.dataValues.transactionCount),
      totalSpent: parseFloat(v.dataValues.totalSpent),
      averageTransaction: parseFloat(v.dataValues.averageTransaction)
    }));
  } catch (error) {
    console.error('❌ Error obteniendo top proveedores:', error);
    return [];
  }
};

// ============================================================================
// HOOKS
// ============================================================================

Expense.addHook('beforeCreate', (expense) => {
  // Si es recurrente y no tiene próxima fecha, calcularla
  if (expense.isRecurring && !expense.nextRecurringDate) {
    expense.nextRecurringDate = expense.calculateNextRecurringDate();
  }
  
  console.log(`💰 Creando gasto: ${expense.title} - Q${expense.amount}`);
});

Expense.addHook('afterCreate', (expense) => {
  console.log(`✅ Gasto creado exitosamente: ${expense.id}`);
});

Expense.addHook('afterUpdate', (expense) => {
  if (expense.changed('status')) {
    console.log(`📊 Estado del gasto ${expense.id} cambió a: ${expense.status}`);
  }
});

// ============================================================================
// ASOCIACIONES
// ============================================================================

Expense.associate = function(models) {
  console.log('🔗 Configurando asociaciones para Expense...');
  
  if (models.User) {
    Expense.belongsTo(models.User, {
      foreignKey: 'registeredBy',
      as: 'registeredByUser'
    });
    
    Expense.belongsTo(models.User, {
      foreignKey: 'approvedBy',
      as: 'approvedByUser'
    });
    
    console.log('   ✅ Expense -> User (registeredByUser, approvedByUser)');
  }
  
  if (models.FinancialMovements) {
    Expense.belongsTo(models.FinancialMovements, {
      foreignKey: 'financialMovementId',
      as: 'financialMovement'
    });
    
    console.log('   ✅ Expense -> FinancialMovements (financialMovement)');
  }
};

module.exports = Expense;