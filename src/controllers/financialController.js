// src/controllers/financialController.js - NUEVO: Gestión completa de finanzas
const { FinancialMovements, User } = require('../models');
const { Op } = require('sequelize');

class FinancialController {

  // ✅ Crear movimiento financiero manual
  async createMovement(req, res) {
    try {
      const {
        type,
        category,
        description,
        amount,
        movementDate,
        paymentMethod,
        notes,
        receiptUrl
      } = req.body;

      const movement = await FinancialMovements.create({
        type,
        category,
        description,
        amount,
        movementDate: movementDate || new Date(),
        paymentMethod,
        notes,
        receiptUrl,
        referenceType: 'manual',
        registeredBy: req.user.id
      });

      const movementWithUser = await FinancialMovements.findByPk(movement.id, {
        include: [{
          association: 'registeredByUser',
          attributes: ['id', 'firstName', 'lastName']
        }]
      });

      res.status(201).json({
        success: true,
        message: 'Movimiento financiero registrado exitosamente',
        data: { movement: movementWithUser }
      });
    } catch (error) {
      console.error('Error al crear movimiento financiero:', error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar movimiento financiero',
        error: error.message
      });
    }
  }

  // ✅ Obtener movimientos financieros con filtros
  async getMovements(req, res) {
    try {
      const {
        type,
        category,
        startDate,
        endDate,
        paymentMethod,
        page = 1,
        limit = 20
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // ✅ Aplicar filtros
      if (type) where.type = type;
      if (category) where.category = category;
      if (paymentMethod) where.paymentMethod = paymentMethod;

      // ✅ Filtro por rango de fechas
      if (startDate || endDate) {
        where.movementDate = {};
        if (startDate) where.movementDate[Op.gte] = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          where.movementDate[Op.lte] = end;
        }
      }

      const { count, rows } = await FinancialMovements.findAndCountAll({
        where,
        include: [{
          association: 'registeredByUser',
          attributes: ['id', 'firstName', 'lastName']
        }],
        order: [['movementDate', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      res.json({
        success: true,
        data: {
          movements: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener movimientos financieros:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener movimientos financieros',
        error: error.message
      });
    }
  }

  // ✅ Reporte financiero completo por período
  async getFinancialReport(req, res) {
    try {
      const { period = 'month', startDate, endDate } = req.query;

      let dateRange = this.calculateDateRange(period, startDate, endDate);

      // ✅ Obtener resumen financiero
      const summary = await FinancialMovements.getFinancialSummary(dateRange.start, dateRange.end);

      // ✅ Tendencias por día (últimos 30 días)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const dailyTrends = await FinancialMovements.findAll({
        attributes: [
          [FinancialMovements.sequelize.fn('DATE', FinancialMovements.sequelize.col('movement_date')), 'date'],
          'type',
          [FinancialMovements.sequelize.fn('SUM', FinancialMovements.sequelize.col('amount')), 'total']
        ],
        where: {
          movementDate: { [Op.gte]: thirtyDaysAgo }
        },
        group: [
          FinancialMovements.sequelize.fn('DATE', FinancialMovements.sequelize.col('movement_date')),
          'type'
        ],
        order: [[FinancialMovements.sequelize.fn('DATE', FinancialMovements.sequelize.col('movement_date')), 'ASC']]
      });

      // ✅ Organizar tendencias por día
      const organizedTrends = this.organizeDailyTrends(dailyTrends);

      res.json({
        success: true,
        data: {
          period: {
            start: dateRange.start,
            end: dateRange.end,
            type: period
          },
          summary,
          dailyTrends: organizedTrends
        }
      });
    } catch (error) {
      console.error('Error al generar reporte financiero:', error);
      res.status(500).json({
        success: false,
        message: 'Error al generar reporte financiero',
        error: error.message
      });
    }
  }

  // ✅ Reporte de ingresos vs egresos por semana/mes
  async getIncomeVsExpensesReport(req, res) {
    try {
      const { groupBy = 'week' } = req.query; // 'week', 'month'

      let dateGroupFunction;
      let startDate;

      if (groupBy === 'week') {
        // ✅ Últimas 12 semanas
        dateGroupFunction = "DATE_TRUNC('week', movement_date)";
        startDate = new Date();
        startDate.setDate(startDate.getDate() - (12 * 7));
      } else {
        // ✅ Últimos 12 meses
        dateGroupFunction = "DATE_TRUNC('month', movement_date)";
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 12);
      }

      const results = await FinancialMovements.findAll({
        attributes: [
          [FinancialMovements.sequelize.literal(dateGroupFunction), 'period'],
          'type',
          [FinancialMovements.sequelize.fn('SUM', FinancialMovements.sequelize.col('amount')), 'total']
        ],
        where: {
          movementDate: { [Op.gte]: startDate }
        },
        group: [
          FinancialMovements.sequelize.literal(dateGroupFunction),
          'type'
        ],
        order: [[FinancialMovements.sequelize.literal(dateGroupFunction), 'ASC']]
      });

      // ✅ Organizar resultados por período
      const organizedResults = this.organizeIncomeVsExpenses(results);

      res.json({
        success: true,
        data: {
          groupBy,
          periods: organizedResults
        }
      });
    } catch (error) {
      console.error('Error al generar reporte de ingresos vs egresos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al generar reporte de ingresos vs egresos',
        error: error.message
      });
    }
  }

  // ✅ Dashboard financiero resumen
  async getDashboard(req, res) {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());

      // ✅ Obtener datos en paralelo
      const [
        todayIncome,
        todayExpenses,
        weekIncome,
        weekExpenses,
        monthIncome,
        monthExpenses,
        recentMovements
      ] = await Promise.all([
        FinancialMovements.getIncomeByPeriod(today, today),
        FinancialMovements.getExpensesByPeriod(today, today),
        FinancialMovements.getIncomeByPeriod(startOfWeek, today),
        FinancialMovements.getExpensesByPeriod(startOfWeek, today),
        FinancialMovements.getIncomeByPeriod(startOfMonth, today),
        FinancialMovements.getExpensesByPeriod(startOfMonth, today),
        FinancialMovements.findAll({
          limit: 10,
          order: [['movementDate', 'DESC']],
          include: [{
            association: 'registeredByUser',
            attributes: ['id', 'firstName', 'lastName']
          }]
        })
      ]);

      res.json({
        success: true,
        data: {
          today: {
            income: todayIncome,
            expenses: todayExpenses,
            net: todayIncome - todayExpenses
          },
          thisWeek: {
            income: weekIncome,
            expenses: weekExpenses,
            net: weekIncome - weekExpenses
          },
          thisMonth: {
            income: monthIncome,
            expenses: monthExpenses,
            net: monthIncome - monthExpenses
          },
          recentMovements
        }
      });
    } catch (error) {
      console.error('Error al obtener dashboard financiero:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener dashboard financiero',
        error: error.message
      });
    }
  }

  // ✅ Métodos auxiliares
  calculateDateRange(period, customStartDate, customEndDate) {
    const now = new Date();
    let start, end = now;

    switch (period) {
      case 'today':
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start = new Date(now);
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start = new Date(now);
        start.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        start = new Date(now);
        start.setFullYear(now.getFullYear() - 1);
        break;
      case 'custom':
        start = customStartDate ? new Date(customStartDate) : new Date(now.getFullYear(), 0, 1);
        end = customEndDate ? new Date(customEndDate) : now;
        break;
      default:
        start = new Date(now);
        start.setMonth(now.getMonth() - 1);
    }

    return { start, end };
  }

  organizeDailyTrends(trends) {
    const organized = {};
    
    trends.forEach(item => {
      const date = item.dataValues.date;
      if (!organized[date]) {
        organized[date] = { date, income: 0, expenses: 0 };
      }
      
      const amount = parseFloat(item.dataValues.total);
      if (item.type === 'income') {
        organized[date].income = amount;
      } else {
        organized[date].expenses = amount;
      }
    });

    return Object.values(organized).map(day => ({
      ...day,
      net: day.income - day.expenses
    }));
  }

  organizeIncomeVsExpenses(results) {
    const organized = {};
    
    results.forEach(item => {
      const period = item.dataValues.period;
      if (!organized[period]) {
        organized[period] = { period, income: 0, expenses: 0 };
      }
      
      const amount = parseFloat(item.dataValues.total);
      if (item.type === 'income') {
        organized[period].income = amount;
      } else {
        organized[period].expenses = amount;
      }
    });

    return Object.values(organized).map(period => ({
      ...period,
      net: period.income - period.expenses
    }));
  }

  // ✅ NUEVO: Obtener movimientos financieros combinados con pagos
async getMovementsWithPayments(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      type,
      category,
      paymentMethod,
      status,
      userSearch
    } = req.query;

    const offset = (page - 1) * limit;
    const { Op } = require('sequelize');

    // Construir filtros de fecha
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter = {};
      if (startDate) dateFilter[Op.gte] = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter[Op.lte] = end;
      }
    }

    // Obtener movimientos financieros
    let movementWhere = {};
    if (type) movementWhere.type = type;
    if (category) movementWhere.category = category;
    if (paymentMethod) movementWhere.paymentMethod = paymentMethod;
    if (Object.keys(dateFilter).length > 0) {
      movementWhere.movementDate = dateFilter;
    }

    // Obtener pagos
    let paymentWhere = {};
    if (status) paymentWhere.status = status;
    if (paymentMethod) paymentWhere.paymentMethod = paymentMethod;
    if (Object.keys(dateFilter).length > 0) {
      paymentWhere.paymentDate = dateFilter;
    }

    const [movements, payments] = await Promise.all([
      FinancialMovements.findAll({
        where: movementWhere,
        include: [
          {
            association: 'registeredByUser',
            attributes: ['id', 'firstName', 'lastName']
          }
        ],
        order: [['movementDate', 'DESC']],
        limit: Math.ceil(limit / 2)
      }),

      Payment.findAll({
        where: paymentWhere,
        include: [
          {
            association: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            required: false
          },
          {
            association: 'membership',
            attributes: ['id', 'type', 'endDate'],
            required: false
          },
          {
            association: 'registeredByUser',
            attributes: ['id', 'firstName', 'lastName']
          }
        ],
        order: [['paymentDate', 'DESC']],
        limit: Math.ceil(limit / 2)
      })
    ]);

    // Combinar y formatear resultados
    const items = [];

    // Agregar movimientos financieros
    movements.forEach(movement => {
      items.push({
        id: movement.id,
        type: 'financial_movement',
        date: movement.movementDate,
        description: movement.description,
        amount: parseFloat(movement.amount),
        category: movement.category,
        paymentMethod: movement.paymentMethod,
        status: null,
        movementType: movement.type,
        referenceId: movement.referenceId,
        referenceType: movement.referenceType,
        registeredBy: movement.registeredByUser ? {
          id: movement.registeredByUser.id,
          name: `${movement.registeredByUser.firstName} ${movement.registeredByUser.lastName}`,
          role: 'staff'
        } : null,
        needsValidation: false
      });
    });

    // Agregar pagos
    payments.forEach(payment => {
      items.push({
        id: payment.id,
        type: 'payment',
        date: payment.paymentDate,
        description: payment.description,
        amount: parseFloat(payment.amount),
        category: this.mapPaymentTypeToCategory(payment.paymentType),
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        paymentType: payment.paymentType,
        userId: payment.userId,
        membershipId: payment.membershipId,
        transferProof: payment.transferProof,
        needsValidation: payment.needsValidation(),
        user: payment.user ? {
          id: payment.user.id,
          name: `${payment.user.firstName} ${payment.user.lastName}`,
          email: payment.user.email
        } : payment.getClientInfo(),
        membership: payment.membership ? {
          id: payment.membership.id,
          type: payment.membership.type,
          endDate: payment.membership.endDate
        } : null,
        registeredBy: payment.registeredByUser ? {
          id: payment.registeredByUser.id,
          name: `${payment.registeredByUser.firstName} ${payment.registeredByUser.lastName}`,
          role: 'staff'
        } : null
      });
    });

    // Ordenar por fecha descendente
    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Aplicar paginación manual
    const totalItems = items.length;
    const paginatedItems = items.slice(offset, offset + parseInt(limit));

    // Calcular resumen
    const summary = {
      totalAmount: items.reduce((sum, item) => sum + item.amount, 0),
      pendingAmount: items
        .filter(item => item.status === 'pending')
        .reduce((sum, item) => sum + item.amount, 0),
      pendingCount: items.filter(item => item.status === 'pending').length
    };

    res.json({
      success: true,
      data: {
        items: paginatedItems,
        pagination: {
          total: totalItems,
          page: parseInt(page),
          pages: Math.ceil(totalItems / limit),
          limit: parseInt(limit)
        },
        summary
      }
    });

  } catch (error) {
    console.error('Error al obtener movimientos con pagos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener movimientos financieros',
      error: error.message
    });
  }
}

// Helper para mapear tipos de pago a categorías
mapPaymentTypeToCategory(paymentType) {
  const mapping = {
    'membership': 'membership_payment',
    'daily': 'daily_payment',
    'bulk_daily': 'daily_payment',
    'store_cash_delivery': 'products_sale',
    'store_card_delivery': 'products_sale',
    'store_online': 'products_sale',
    'store_transfer': 'products_sale'
  };
  return mapping[paymentType] || 'other_income';
}

// ✅ NUEVO: Dashboard de pagos pendientes
async getPendingDashboard(req, res) {
  try {
    if (!['admin', 'colaborador'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo el personal puede acceder al dashboard'
      });
    }

    const { Payment, Membership } = require('../models');
    const { Op } = require('sequelize');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Transferencias pendientes
    const pendingTransfersQuery = {
      paymentMethod: 'transfer',
      status: 'pending',
      transferProof: { [Op.not]: null }
    };

    if (req.user.role === 'colaborador') {
      pendingTransfersQuery.registeredBy = req.user.id;
    }

    const [
      pendingTransfers,
      pendingCashMemberships,
      todayValidations
    ] = await Promise.all([
      // Transferencias pendientes
      Payment.findAll({
        where: pendingTransfersQuery,
        include: [
          { association: 'user', attributes: ['firstName', 'lastName'] }
        ],
        order: [['createdAt', 'ASC']]
      }),

      // Membresías pendientes de pago en efectivo
      Membership.findAll({
        where: {
          status: 'pending',
          ...(req.user.role === 'colaborador' && { '$user.role$': 'cliente' })
        },
        include: [
          {
            association: 'user',
            attributes: ['id', 'firstName', 'lastName', 'role'],
            ...(req.user.role === 'colaborador' && { where: { role: 'cliente' } })
          },
          {
            association: 'payments',
            required: false,
            attributes: ['status']
          }
        ],
        order: [['createdAt', 'ASC']]
      }),

      // Validaciones de hoy
      Payment.findAll({
        where: {
          transferValidatedAt: { [Op.between]: [today, tomorrow] },
          ...(req.user.role === 'colaborador' && { transferValidatedBy: req.user.id })
        },
        attributes: ['transferValidated']
      })
    ]);

    // Filtrar membresías sin pago completado
    const actualPendingCash = pendingCashMemberships.filter(membership => {
      return !membership.payments || !membership.payments.some(p => p.status === 'completed');
    });

    // Calcular estadísticas
    const transfersAmount = pendingTransfers.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const cashAmount = actualPendingCash.reduce((sum, m) => sum + parseFloat(m.price), 0);
    
    const oldestTransfer = pendingTransfers.length > 0 ? pendingTransfers[0] : null;
    const oldestCash = actualPendingCash.length > 0 ? actualPendingCash[0] : null;

    const transferHours = oldestTransfer ? 
      (new Date() - oldestTransfer.createdAt) / (1000 * 60 * 60) : 0;
    const cashHours = oldestCash ? 
      (new Date() - oldestCash.createdAt) / (1000 * 60 * 60) : 0;

    const approved = todayValidations.filter(v => v.transferValidated === true).length;
    const rejected = todayValidations.filter(v => v.transferValidated === false).length;

    // Items urgentes (más de 24 horas)
    const urgentItems = [];
    
    pendingTransfers.forEach(transfer => {
      const hours = (new Date() - transfer.createdAt) / (1000 * 60 * 60);
      if (hours > 24) {
        urgentItems.push({
          type: 'transfer',
          id: transfer.id,
          clientName: transfer.user ? 
            `${transfer.user.firstName} ${transfer.user.lastName}` : 
            'Cliente anónimo',
          amount: parseFloat(transfer.amount),
          hoursWaiting: Math.round(hours * 10) / 10,
          priority: hours > 48 ? 'critical' : 'high'
        });
      }
    });

    actualPendingCash.forEach(membership => {
      const hours = (new Date() - membership.createdAt) / (1000 * 60 * 60);
      if (hours > 24) {
        urgentItems.push({
          type: 'cash_membership',
          id: membership.id,
          clientName: `${membership.user.firstName} ${membership.user.lastName}`,
          amount: parseFloat(membership.price),
          hoursWaiting: Math.round(hours * 10) / 10,
          priority: hours > 48 ? 'critical' : 'high'
        });
      }
    });

    // Actividad reciente (últimas 10)
    const recentActivity = await Payment.findAll({
      where: {
        transferValidatedAt: { [Op.not]: null },
        ...(req.user.role === 'colaborador' && { transferValidatedBy: req.user.id })
      },
      include: [
        { association: 'user', attributes: ['firstName', 'lastName'] },
        { association: 'transferValidator', attributes: ['firstName', 'lastName'] }
      ],
      order: [['transferValidatedAt', 'DESC']],
      limit: 10
    });

    const formattedActivity = recentActivity.map(payment => ({
      action: payment.transferValidated ? 'transfer_approved' : 'transfer_rejected',
      clientName: payment.user ? 
        `${payment.user.firstName} ${payment.user.lastName}` : 
        'Cliente anónimo',
      amount: parseFloat(payment.amount),
      timestamp: payment.transferValidatedAt,
      performedBy: payment.transferValidator ? 
        `${payment.transferValidator.firstName} ${payment.transferValidator.lastName}` :
        'Sistema'
    }));

    res.json({
      success: true,
      data: {
        summary: {
          pendingTransfers: {
            count: pendingTransfers.length,
            totalAmount: transfersAmount,
            oldestHours: Math.round(transferHours * 10) / 10
          },
          pendingCashMemberships: {
            count: actualPendingCash.length,
            totalAmount: cashAmount,
            oldestHours: Math.round(cashHours * 10) / 10
          },
          todayValidations: {
            approved,
            rejected,
            totalProcessed: approved + rejected
          }
        },
        urgentItems: urgentItems.sort((a, b) => b.hoursWaiting - a.hoursWaiting),
        recentActivity: formattedActivity
      }
    });

  } catch (error) {
    console.error('Error al obtener dashboard de pagos pendientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener dashboard',
      error: error.message
    });
  }
}
  
}

module.exports = new FinancialController();