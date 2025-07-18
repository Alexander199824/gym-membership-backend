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
}

module.exports = new FinancialController();