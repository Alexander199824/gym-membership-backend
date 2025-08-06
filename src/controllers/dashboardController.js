// src/controllers/dashboardController.js - CORREGIDO: Dashboard con filtros para colaborador
const { User, Membership, Payment, StoreOrder, StoreProduct, FinancialMovements } = require('../models');
const { Op } = require('sequelize');

class DashboardController {

  // ✅ CORREGIDO: Dashboard unificado con filtros por rol
  async getUnifiedDashboard(req, res) {
    try {
      const { period = 'month' } = req.query;
      const now = new Date();

      // ✅ NUEVO: Definir período según rol
      let dateRange = {};
      if (req.user.role === 'colaborador') {
        // Colaborador solo ve datos del día actual
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateRange = { [Op.between]: [today, tomorrow] };
        console.log('🔍 Colaborador consultando dashboard del DÍA ACTUAL');
      } else {
        // Admin puede ver diferentes períodos
        switch (period) {
          case 'today':
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateRange = { [Op.between]: [today, tomorrow] };
            break;
          case 'week':
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            dateRange = { [Op.gte]: weekAgo };
            break;
          case 'month':
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            dateRange = { [Op.gte]: monthAgo };
            break;
          default:
            const defaultStart = new Date();
            defaultStart.setMonth(defaultStart.getMonth() - 1);
            dateRange = { [Op.gte]: defaultStart };
        }
      }

      // ✅ NUEVO: Construir whereClause base para pagos
      const paymentsBaseWhere = {
        status: 'completed',
        paymentDate: dateRange
      };

      // Colaborador solo ve SUS pagos
      if (req.user.role === 'colaborador') {
        paymentsBaseWhere.registeredBy = req.user.id;
      }

      try {
        // ✅ Obtener datos en paralelo con manejo de errores individual
        const [
          totalIncome,
          paymentsCount,
          paymentsBreakdown,
          activeMemberships,
          expiringSoonCount,
          newUsersCount,
          topPaymentMethods
        ] = await Promise.allSettled([
          // Total de ingresos
          Payment.sum('amount', { where: paymentsBaseWhere }),
          
          // Cantidad de pagos
          Payment.count({ where: paymentsBaseWhere }),
          
          // Desglose de pagos por tipo
          Payment.findAll({
            attributes: [
              'paymentType',
              [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'total'],
              [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'count']
            ],
            where: paymentsBaseWhere,
            group: ['paymentType']
          }),
          
          // Membresías activas (colaborador solo ve de clientes)
          this.getActiveMembershipsCount(req.user.role),
          
          // Membresías próximas a vencer (colaborador solo ve de clientes)
          this.getExpiringSoonCount(req.user.role),
          
          // Nuevos usuarios (colaborador solo ve clientes que creó)
          this.getNewUsersCount(req.user.role, req.user.id, dateRange),
          
          // Métodos de pago más usados
          Payment.findAll({
            attributes: [
              'paymentMethod',
              [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'count']
            ],
            where: paymentsBaseWhere,
            group: ['paymentMethod'],
            order: [[Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'DESC']],
            limit: 5
          })
        ]);

        // ✅ Procesar resultados con valores por defecto en caso de error
        const dashboardData = {
          period: req.user.role === 'colaborador' ? 'today' : period,
          userRole: req.user.role,
          summary: {
            totalIncome: totalIncome.status === 'fulfilled' ? (totalIncome.value || 0) : 0,
            paymentsCount: paymentsCount.status === 'fulfilled' ? (paymentsCount.value || 0) : 0,
            activeMemberships: activeMemberships.status === 'fulfilled' ? (activeMemberships.value || 0) : 0,
            expiringSoon: expiringSoonCount.status === 'fulfilled' ? (expiringSoonCount.value || 0) : 0,
            newUsers: newUsersCount.status === 'fulfilled' ? (newUsersCount.value || 0) : 0
          },
          breakdown: {
            paymentsBy: paymentsBreakdown.status === 'fulfilled' 
              ? paymentsBreakdown.value.map(item => ({
                  type: item.paymentType,
                  total: parseFloat(item.dataValues.total || 0),
                  count: parseInt(item.dataValues.count || 0)
                }))
              : [],
            topPaymentMethods: topPaymentMethods.status === 'fulfilled'
              ? topPaymentMethods.value.map(item => ({
                  method: item.paymentMethod,
                  count: parseInt(item.dataValues.count || 0)
                }))
              : []
          }
        };

        // ✅ NUEVO: Información específica para colaboradores
        if (req.user.role === 'colaborador') {
          dashboardData.collaboratorInfo = {
            id: req.user.id,
            name: req.user.getFullName(),
            todayOnly: true,
            message: 'Dashboard personal del día actual'
          };
        }

        // ✅ Datos adicionales para admin (solo si no es colaborador)
        if (req.user.role === 'admin') {
          try {
            // Órdenes de tienda recientes
            const recentOrders = await StoreOrder.findAll({
              where: { 
                createdAt: dateRange 
              },
              limit: 5,
              order: [['createdAt', 'DESC']],
              include: [
                { 
                  association: 'user', 
                  attributes: ['firstName', 'lastName'] 
                }
              ]
            });

            dashboardData.store = {
              recentOrders: recentOrders.length,
              ordersList: recentOrders
            };
          } catch (storeError) {
            console.warn('⚠️ Error al obtener datos de tienda:', storeError.message);
            dashboardData.store = { recentOrders: 0, ordersList: [] };
          }
        }

        console.log(`✅ ${req.user.role} obtuvo dashboard unificado - Ingresos: $${dashboardData.summary.totalIncome}`);

        res.json({
          success: true,
          data: dashboardData
        });

      } catch (dataError) {
        console.error('Error al obtener datos del dashboard:', dataError);
        // Respuesta de fallback con datos vacíos pero estructura válida
        res.json({
          success: true,
          data: {
            period: req.user.role === 'colaborador' ? 'today' : period,
            userRole: req.user.role,
            summary: {
              totalIncome: 0,
              paymentsCount: 0,
              activeMemberships: 0,
              expiringSoon: 0,
              newUsers: 0
            },
            breakdown: {
              paymentsBy: [],
              topPaymentMethods: []
            },
            error: 'Algunos datos no pudieron cargarse completamente'
          }
        });
      }

    } catch (error) {
      console.error('Error crítico en dashboard unificado:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener dashboard',
        error: error.message
      });
    }
  }

  // ✅ CORREGIDO: Métricas de rendimiento filtradas por rol
  async getPerformanceMetrics(req, res) {
    try {
      const { days = 30 } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      // ✅ NUEVO: Base where para colaboradores
      const baseWhere = {
        paymentDate: { [Op.gte]: startDate },
        status: 'completed'
      };

      if (req.user.role === 'colaborador') {
        baseWhere.registeredBy = req.user.id;
        console.log(`🔍 Colaborador ${req.user.id} consultando métricas de últimos ${days} días`);
      }

      try {
        // ✅ Métricas diarias
        const dailyMetrics = await Payment.findAll({
          attributes: [
            [Payment.sequelize.fn('DATE', Payment.sequelize.col('paymentDate')), 'date'],
            [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'income'],
            [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'transactions']
          ],
          where: baseWhere,
          group: [Payment.sequelize.fn('DATE', Payment.sequelize.col('paymentDate'))],
          order: [[Payment.sequelize.fn('DATE', Payment.sequelize.col('paymentDate')), 'ASC']]
        });

        // ✅ Promedio de ingresos diarios
        const avgDailyIncome = dailyMetrics.length > 0 
          ? dailyMetrics.reduce((sum, day) => sum + parseFloat(day.dataValues.income), 0) / dailyMetrics.length
          : 0;

        // ✅ Mejor día
        const bestDay = dailyMetrics.length > 0 
          ? dailyMetrics.reduce((best, current) => 
              parseFloat(current.dataValues.income) > parseFloat(best.dataValues.income) ? current : best
            )
          : null;

        // ✅ Tendencia (comparar primera y última semana)
        const weeklyTrend = this.calculateWeeklyTrend(dailyMetrics);

        // ✅ Métricas específicas para colaboradores
        let collaboratorSpecific = {};
        if (req.user.role === 'colaborador') {
          collaboratorSpecific = {
            personalMetrics: true,
            collaboratorId: req.user.id,
            collaboratorName: req.user.getFullName(),
            period: `Últimos ${days} días - Solo tus registros`,
            note: 'Estas métricas incluyen únicamente los pagos que registraste'
          };
        }

        const metricsData = {
          period: parseInt(days),
          userRole: req.user.role,
          totalDays: dailyMetrics.length,
          averageDailyIncome: parseFloat(avgDailyIncome.toFixed(2)),
          bestDay: bestDay ? {
            date: bestDay.dataValues.date,
            income: parseFloat(bestDay.dataValues.income),
            transactions: parseInt(bestDay.dataValues.transactions)
          } : null,
          weeklyTrend: weeklyTrend,
          dailyMetrics: dailyMetrics.map(day => ({
            date: day.dataValues.date,
            income: parseFloat(day.dataValues.income),
            transactions: parseInt(day.dataValues.transactions)
          })),
          ...collaboratorSpecific
        };

        console.log(`✅ ${req.user.role} obtuvo métricas de rendimiento - Promedio diario: $${avgDailyIncome.toFixed(2)}`);

        res.json({
          success: true,
          data: metricsData
        });

      } catch (metricsError) {
        console.warn('⚠️ Error al calcular métricas:', metricsError.message);
        res.json({
          success: true,
          data: {
            period: parseInt(days),
            userRole: req.user.role,
            totalDays: 0,
            averageDailyIncome: 0,
            bestDay: null,
            weeklyTrend: { direction: 'stable', percentage: 0 },
            dailyMetrics: [],
            error: 'No se pudieron calcular las métricas completamente'
          }
        });
      }

    } catch (error) {
      console.error('Error al obtener métricas de rendimiento:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener métricas de rendimiento',
        error: error.message
      });
    }
  }

  // ✅ MÉTODOS AUXILIARES

  async getActiveMembershipsCount(userRole) {
    try {
      const where = { status: 'active' };
      const include = [];

      if (userRole === 'colaborador') {
        include.push({
          association: 'user',
          where: { role: 'cliente' }
        });
      }

      return await Membership.count({ 
        where,
        ...(include.length > 0 && { include })
      });
    } catch (error) {
      console.warn('⚠️ Error al contar membresías activas:', error.message);
      return 0;
    }
  }

  async getExpiringSoonCount(userRole) {
    try {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const where = {
        status: 'active',
        endDate: { [Op.between]: [new Date(), nextWeek] }
      };

      const include = [];
      if (userRole === 'colaborador') {
        include.push({
          association: 'user',
          where: { role: 'cliente' }
        });
      }

      return await Membership.count({ 
        where,
        ...(include.length > 0 && { include })
      });
    } catch (error) {
      console.warn('⚠️ Error al contar membresías próximas a vencer:', error.message);
      return 0;
    }
  }

  async getNewUsersCount(userRole, userId, dateRange) {
    try {
      const where = {
        isActive: true,
        createdAt: dateRange
      };

      if (userRole === 'colaborador') {
        // Colaborador solo ve usuarios que él creó y que son clientes
        where.createdBy = userId;
        where.role = 'cliente';
      }

      return await User.count({ where });
    } catch (error) {
      console.warn('⚠️ Error al contar nuevos usuarios:', error.message);
      return 0;
    }
  }

  calculateWeeklyTrend(dailyMetrics) {
    try {
      if (dailyMetrics.length < 14) {
        return { direction: 'insufficient_data', percentage: 0 };
      }

      // Primeros 7 días vs últimos 7 días
      const firstWeek = dailyMetrics.slice(0, 7);
      const lastWeek = dailyMetrics.slice(-7);

      const firstWeekTotal = firstWeek.reduce((sum, day) => sum + parseFloat(day.dataValues.income), 0);
      const lastWeekTotal = lastWeek.reduce((sum, day) => sum + parseFloat(day.dataValues.income), 0);

      if (firstWeekTotal === 0) {
        return { direction: 'up', percentage: 100 };
      }

      const percentageChange = ((lastWeekTotal - firstWeekTotal) / firstWeekTotal) * 100;
      
      let direction = 'stable';
      if (percentageChange > 5) direction = 'up';
      else if (percentageChange < -5) direction = 'down';

      return {
        direction,
        percentage: Math.abs(parseFloat(percentageChange.toFixed(1))),
        firstWeekTotal: parseFloat(firstWeekTotal.toFixed(2)),
        lastWeekTotal: parseFloat(lastWeekTotal.toFixed(2))
      };
    } catch (error) {
      console.warn('⚠️ Error al calcular tendencia semanal:', error.message);
      return { direction: 'error', percentage: 0 };
    }
  }
}

module.exports = new DashboardController();