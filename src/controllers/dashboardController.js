// src/controllers/dashboardController.js - Dashboard unificado
const { 
  Payment, 
  Membership, 
  User, 
  StoreOrder,
  StoreProduct,
  FinancialMovements
} = require('../models');
const { Op } = require('sequelize');

class DashboardController {

  // ✅ Dashboard principal unificado
  async getUnifiedDashboard(req, res) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      // ✅ Obtener todos los datos en paralelo
      const [
        // Ingresos por fuente
        membershipIncome,
        dailyIncome,
        productsIncome,
        
        // Estadísticas generales
        totalUsers,
        activeMemberships,
        ordersToday,
        productsLowStock,
        
        // Resumen financiero
        monthlyFinancialSummary
      ] = await Promise.all([
        // Ingresos de membresías (hoy)
        Payment.sum('amount', {
          where: {
            paymentType: 'membership',
            status: 'completed',
            paymentDate: { [Op.between]: [today, tomorrow] }
          }
        }),
        
        // Ingresos de pagos diarios (hoy)
        Payment.sum('amount', {
          where: {
            paymentType: ['daily', 'bulk_daily'],
            status: 'completed',
            paymentDate: { [Op.between]: [today, tomorrow] }
          }
        }),
        
        // Ingresos de productos (hoy)
        Payment.sum('amount', {
          where: {
            paymentType: ['store_cash_delivery', 'store_card_delivery', 'store_online', 'store_transfer'],
            status: 'completed',
            paymentDate: { [Op.between]: [today, tomorrow] }
          }
        }),

        // Estadísticas generales
        User.count({ where: { isActive: true } }),
        Membership.count({ where: { status: 'active' } }),
        StoreOrder.count({ where: { createdAt: { [Op.between]: [today, tomorrow] } } }),
        StoreProduct.count({ 
          where: { 
            stockQuantity: { [Op.lte]: sequelize.col('min_stock') },
            isActive: true 
          } 
        }),

        // Resumen financiero del mes
        FinancialMovements.getFinancialSummary(thisMonth, new Date())
      ]);

      // ✅ Calcular totales
      const totalIncomeToday = (membershipIncome || 0) + (dailyIncome || 0) + (productsIncome || 0);

      // ✅ Obtener tendencia semanal
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const weeklyTrend = await Payment.findAll({
        attributes: [
          [Payment.sequelize.fn('DATE', Payment.sequelize.col('payment_date')), 'date'],
          [Payment.sequelize.literal(`
            CASE 
              WHEN payment_type IN ('membership') THEN 'memberships'
              WHEN payment_type IN ('daily', 'bulk_daily') THEN 'daily'
              WHEN payment_type IN ('store_cash_delivery', 'store_card_delivery', 'store_online', 'store_transfer') THEN 'products'
              ELSE 'other'
            END
          `), 'source'],
          [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'total']
        ],
        where: {
          status: 'completed',
          paymentDate: { [Op.gte]: weekAgo }
        },
        group: [
          Payment.sequelize.fn('DATE', Payment.sequelize.col('payment_date')),
          Payment.sequelize.literal(`
            CASE 
              WHEN payment_type IN ('membership') THEN 'memberships'
              WHEN payment_type IN ('daily', 'bulk_daily') THEN 'daily'
              WHEN payment_type IN ('store_cash_delivery', 'store_card_delivery', 'store_online', 'store_transfer') THEN 'products'
              ELSE 'other'
            END
          `)
        ],
        order: [[Payment.sequelize.fn('DATE', Payment.sequelize.col('payment_date')), 'ASC']]
      });

      res.json({
        success: true,
        data: {
          // ✅ Resumen del día
          today: {
            totalIncome: parseFloat(totalIncomeToday.toFixed(2)),
            breakdown: {
              memberships: parseFloat((membershipIncome || 0).toFixed(2)),
              daily: parseFloat((dailyIncome || 0).toFixed(2)),
              products: parseFloat((productsIncome || 0).toFixed(2))
            }
          },
          
          // ✅ Estadísticas generales
          stats: {
            totalUsers,
            activeMemberships,
            ordersToday,
            productsLowStock
          },
          
          // ✅ Resumen financiero mensual
          monthlyFinancial: {
            totalIncome: monthlyFinancialSummary.totalIncome,
            totalExpenses: monthlyFinancialSummary.totalExpenses,
            netProfit: monthlyFinancialSummary.netProfit
          },
          
          // ✅ Tendencia semanal
          weeklyTrend: this.organizeWeeklyTrend(weeklyTrend)
        }
      });
    } catch (error) {
      console.error('Error al obtener dashboard unificado:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener dashboard',
        error: error.message
      });
    }
  }

  // ✅ Organizar datos de tendencia semanal
  organizeWeeklyTrend(weeklyData) {
    const organized = {};
    
    weeklyData.forEach(item => {
      const date = item.dataValues.date;
      const source = item.dataValues.source;
      const total = parseFloat(item.dataValues.total);
      
      if (!organized[date]) {
        organized[date] = { date, memberships: 0, daily: 0, products: 0, total: 0 };
      }
      
      organized[date][source] = total;
      organized[date].total += total;
    });
    
    return Object.values(organized).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  // ✅ Obtener métricas de rendimiento
  async getPerformanceMetrics(req, res) {
    try {
      const { period = 'month' } = req.query;
      
      // ✅ Definir fechas según período
      let startDate, endDate = new Date();
      
      switch (period) {
        case 'week':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case 'year':
          startDate = new Date();
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
      }

      // ✅ Métricas de rendimiento
      const [
        avgOrderValue,
        conversionRate,
        customerRetention,
        productPerformance,
        revenueGrowth
      ] = await Promise.all([
        // Valor promedio de orden
        StoreOrder.findOne({
          attributes: [[StoreOrder.sequelize.fn('AVG', StoreOrder.sequelize.col('total_amount')), 'avg_order']],
          where: {
            status: 'delivered',
            createdAt: { [Op.between]: [startDate, endDate] }
          }
        }),

        // Tasa de conversión (órdenes completadas vs creadas)
        Promise.all([
          StoreOrder.count({ where: { createdAt: { [Op.between]: [startDate, endDate] } } }),
          StoreOrder.count({ 
            where: { 
              status: 'delivered',
              createdAt: { [Op.between]: [startDate, endDate] } 
            } 
          })
        ]).then(([total, completed]) => ({
          total,
          completed,
          rate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0
        })),

        // Retención de clientes (clientes que compraron más de una vez)
        User.count({
          include: [{
            model: StoreOrder,
            as: 'storeOrders',
            where: { status: 'delivered' },
            having: sequelize.where(sequelize.fn('COUNT', sequelize.col('storeOrders.id')), '>', 1)
          }],
          group: ['User.id']
        }),

        // Productos más vendidos
        StoreProduct.findAll({
          include: [{
            model: StoreOrderItem,
            as: 'orderItems',
            include: [{
              model: StoreOrder,
              as: 'order',
              where: { 
                status: 'delivered',
                createdAt: { [Op.between]: [startDate, endDate] }
              }
            }]
          }],
          attributes: [
            'id', 'name',
            [sequelize.fn('SUM', sequelize.col('orderItems.quantity')), 'total_sold'],
            [sequelize.fn('SUM', sequelize.col('orderItems.total_price')), 'total_revenue']
          ],
          group: ['StoreProduct.id'],
          order: [[sequelize.fn('SUM', sequelize.col('orderItems.quantity')), 'DESC']],
          limit: 10
        }),

        // Crecimiento de ingresos (comparar con período anterior)
        Payment.sum('amount', {
          where: {
            paymentType: ['store_cash_delivery', 'store_card_delivery', 'store_online', 'store_transfer'],
            status: 'completed',
            paymentDate: { [Op.between]: [startDate, endDate] }
          }
        })
      ]);

      res.json({
        success: true,
        data: {
          period,
          metrics: {
            avgOrderValue: parseFloat(avgOrderValue?.dataValues?.avg_order || 0).toFixed(2),
            conversionRate,
            customerRetention: Array.isArray(customerRetention) ? customerRetention.length : 0,
            revenueGrowth: parseFloat(revenueGrowth || 0).toFixed(2)
          },
          topProducts: productPerformance.map(product => ({
            id: product.id,
            name: product.name,
            totalSold: parseInt(product.dataValues.total_sold),
            totalRevenue: parseFloat(product.dataValues.total_revenue)
          }))
        }
      });
    } catch (error) {
      console.error('Error al obtener métricas de rendimiento:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener métricas',
        error: error.message
      });
    }
  }
}

module.exports = new DashboardController();