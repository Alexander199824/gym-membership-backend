// src/controllers/expenseController.js - CONTROLADOR DE GASTOS
const { Expense, User, FinancialMovements } = require('../models');
const { Op } = require('sequelize');

const expenseController = {
  // ========================================
  // CREAR GASTO
  // ========================================
  createExpense: async (req, res) => {
    try {
      const userId = req.user.id; // Del middleware de autenticación
      const expenseData = req.body;
      
      // Validaciones básicas
      if (!expenseData.category || !expenseData.title || !expenseData.amount) {
        return res.status(400).json({
          success: false,
          message: 'Faltan campos requeridos: category, title, amount'
        });
      }
      
      // Crear gasto con movimiento financiero si está aprobado/pagado
      const expense = await Expense.createWithFinancialMovement(
        {
          ...expenseData,
          expenseDate: expenseData.expenseDate || new Date()
        },
        userId
      );
      
      // Cargar relaciones
      await expense.reload({
        include: [
          { association: 'registeredByUser', attributes: ['id', 'firstName', 'lastName'] },
          { association: 'approvedByUser', attributes: ['id', 'firstName', 'lastName'] },
          { association: 'financialMovement' }
        ]
      });
      
      return res.status(201).json({
        success: true,
        message: 'Gasto creado exitosamente',
        data: expense
      });
      
    } catch (error) {
      console.error('❌ Error creando gasto:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al crear el gasto',
        error: error.message
      });
    }
  },
  
  // ========================================
  // OBTENER TODOS LOS GASTOS
  // ========================================
  getAllExpenses: async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 20, 
        status, 
        category, 
        startDate, 
        endDate,
        vendor,
        isRecurring
      } = req.query;
      
      // Construir filtros
      const where = {};
      
      if (status) where.status = status;
      if (category) where.category = category;
      if (vendor) where.vendor = { [Op.iLike]: `%${vendor}%` };
      if (isRecurring !== undefined) where.isRecurring = isRecurring === 'true';
      
      if (startDate && endDate) {
        where.expenseDate = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }
      
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const { rows: expenses, count } = await Expense.findAndCountAll({
        where,
        include: [
          { 
            association: 'registeredByUser', 
            attributes: ['id', 'firstName', 'lastName', 'email'] 
          },
          { 
            association: 'approvedByUser', 
            attributes: ['id', 'firstName', 'lastName'] 
          },
          { 
            association: 'financialMovement',
            attributes: ['id', 'type', 'category', 'amount']
          }
        ],
        limit: parseInt(limit),
        offset,
        order: [['expenseDate', 'DESC'], ['createdAt', 'DESC']]
      });
      
      return res.json({
        success: true,
        data: expenses,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / parseInt(limit))
        }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo gastos:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener gastos',
        error: error.message
      });
    }
  },
  
  // ========================================
  // OBTENER GASTO POR ID
  // ========================================
  getExpenseById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const expense = await Expense.findByPk(id, {
        include: [
          { association: 'registeredByUser', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { association: 'approvedByUser', attributes: ['id', 'firstName', 'lastName'] },
          { association: 'financialMovement' }
        ]
      });
      
      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Gasto no encontrado'
        });
      }
      
      return res.json({
        success: true,
        data: expense
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo gasto:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener el gasto',
        error: error.message
      });
    }
  },
  
  // ========================================
  // ACTUALIZAR GASTO
  // ========================================
  updateExpense: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const expense = await Expense.findByPk(id);
      
      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Gasto no encontrado'
        });
      }
      
      // No permitir actualizar gastos que ya fueron pagados
      if (expense.status === 'paid' && updateData.amount && updateData.amount !== expense.amount) {
        return res.status(400).json({
          success: false,
          message: 'No se puede modificar el monto de un gasto ya pagado'
        });
      }
      
      await expense.update(updateData);
      
      // Recargar con relaciones
      await expense.reload({
        include: [
          { association: 'registeredByUser' },
          { association: 'approvedByUser' },
          { association: 'financialMovement' }
        ]
      });
      
      return res.json({
        success: true,
        message: 'Gasto actualizado exitosamente',
        data: expense
      });
      
    } catch (error) {
      console.error('❌ Error actualizando gasto:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar el gasto',
        error: error.message
      });
    }
  },
  
  // ========================================
  // APROBAR GASTO
  // ========================================
  approveExpense: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Verificar que el usuario sea admin o colaborador
      if (req.user.role !== 'admin' && req.user.role !== 'colaborador') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para aprobar gastos'
        });
      }
      
      const expense = await Expense.approveExpense(id, userId);
      
      // Recargar con relaciones
      await expense.reload({
        include: [
          { association: 'registeredByUser' },
          { association: 'approvedByUser' },
          { association: 'financialMovement' }
        ]
      });
      
      return res.json({
        success: true,
        message: 'Gasto aprobado exitosamente',
        data: expense
      });
      
    } catch (error) {
      console.error('❌ Error aprobando gasto:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error al aprobar el gasto',
        error: error.message
      });
    }
  },
  
  // ========================================
  // RECHAZAR GASTO
  // ========================================
  rejectExpense: async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      // Verificar permisos
      if (req.user.role !== 'admin' && req.user.role !== 'colaborador') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para rechazar gastos'
        });
      }
      
      const expense = await Expense.findByPk(id);
      
      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Gasto no encontrado'
        });
      }
      
      if (expense.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Solo se pueden rechazar gastos pendientes'
        });
      }
      
      expense.status = 'rejected';
      expense.notes = `${expense.notes || ''}\n\nRECHAZADO: ${reason || 'Sin razón especificada'}`;
      await expense.save();
      
      return res.json({
        success: true,
        message: 'Gasto rechazado',
        data: expense
      });
      
    } catch (error) {
      console.error('❌ Error rechazando gasto:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al rechazar el gasto',
        error: error.message
      });
    }
  },
  
  // ========================================
  // CANCELAR GASTO
  // ========================================
  cancelExpense: async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const expense = await Expense.findByPk(id);
      
      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Gasto no encontrado'
        });
      }
      
      if (expense.status === 'paid') {
        return res.status(400).json({
          success: false,
          message: 'No se puede cancelar un gasto ya pagado'
        });
      }
      
      expense.status = 'cancelled';
      expense.notes = `${expense.notes || ''}\n\nCANCELADO: ${reason || 'Sin razón especificada'}`;
      await expense.save();
      
      return res.json({
        success: true,
        message: 'Gasto cancelado',
        data: expense
      });
      
    } catch (error) {
      console.error('❌ Error cancelando gasto:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al cancelar el gasto',
        error: error.message
      });
    }
  },
  
  // ========================================
  // ELIMINAR GASTO
  // ========================================
  deleteExpense: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Solo admin puede eliminar
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo administradores pueden eliminar gastos'
        });
      }
      
      const expense = await Expense.findByPk(id);
      
      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Gasto no encontrado'
        });
      }
      
      // No permitir eliminar gastos pagados con movimiento financiero
      if (expense.status === 'paid' && expense.financialMovementId) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar un gasto pagado con movimiento financiero asociado'
        });
      }
      
      await expense.destroy();
      
      return res.json({
        success: true,
        message: 'Gasto eliminado exitosamente'
      });
      
    } catch (error) {
      console.error('❌ Error eliminando gasto:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar el gasto',
        error: error.message
      });
    }
  },
  
  // ========================================
  // GASTOS PENDIENTES DE APROBACIÓN
  // ========================================
  getPendingApproval: async (req, res) => {
    try {
      const { minAmount = 500 } = req.query;
      
      const expenses = await Expense.getPendingApproval(parseFloat(minAmount));
      
      return res.json({
        success: true,
        data: expenses,
        count: expenses.length
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo gastos pendientes:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener gastos pendientes',
        error: error.message
      });
    }
  },
  
  // ========================================
  // ESTADÍSTICAS DE GASTOS
  // ========================================
  getExpenseStats: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren fechas de inicio y fin'
        });
      }
      
      const stats = await Expense.getExpenseStats(
        new Date(startDate),
        new Date(endDate)
      );
      
      return res.json({
        success: true,
        data: stats
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  },
  
  // ========================================
  // BREAKDOWN POR CATEGORÍA
  // ========================================
  getCategoryBreakdown: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren fechas de inicio y fin'
        });
      }
      
      const breakdown = await Expense.getCategoryBreakdown(
        new Date(startDate),
        new Date(endDate)
      );
      
      return res.json({
        success: true,
        data: breakdown
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo breakdown:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener breakdown por categoría',
        error: error.message
      });
    }
  },
  
  // ========================================
  // GASTOS POR CATEGORÍA
  // ========================================
  getByCategory: async (req, res) => {
    try {
      const { category } = req.params;
      const { startDate, endDate } = req.query;
      
      const expenses = await Expense.getByCategory(
        category,
        startDate ? new Date(startDate) : null,
        endDate ? new Date(endDate) : null
      );
      
      return res.json({
        success: true,
        data: expenses,
        count: expenses.length
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo gastos por categoría:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener gastos por categoría',
        error: error.message
      });
    }
  },
  
  // ========================================
  // TOP PROVEEDORES
  // ========================================
  getTopVendors: async (req, res) => {
    try {
      const { startDate, endDate, limit = 10 } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren fechas de inicio y fin'
        });
      }
      
      const vendors = await Expense.getTopVendors(
        new Date(startDate),
        new Date(endDate),
        parseInt(limit)
      );
      
      return res.json({
        success: true,
        data: vendors
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo top proveedores:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener top proveedores',
        error: error.message
      });
    }
  },
  
  // ========================================
  // GASTOS RECURRENTES
  // ========================================
  getRecurringExpenses: async (req, res) => {
    try {
      const { daysAhead = 7 } = req.query;
      
      const expenses = await Expense.getUpcomingRecurring(parseInt(daysAhead));
      
      return res.json({
        success: true,
        data: expenses,
        count: expenses.length
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo gastos recurrentes:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener gastos recurrentes',
        error: error.message
      });
    }
  },
  
  // ========================================
  // PROCESAR GASTOS RECURRENTES (CRON)
  // ========================================
  processRecurring: async (req, res) => {
    try {
      // Solo admin puede ejecutar esto manualmente
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo administradores pueden procesar gastos recurrentes'
        });
      }
      
      const result = await Expense.processRecurringExpenses();
      
      return res.json({
        success: true,
        message: `${result.processed} gastos recurrentes procesados`,
        data: result
      });
      
    } catch (error) {
      console.error('❌ Error procesando recurrentes:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al procesar gastos recurrentes',
        error: error.message
      });
    }
  }
};

module.exports = expenseController;