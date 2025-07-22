// src/controllers/dashboardController.js 
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
        
        // ✅ CORREGIDO: Usar consulta SQL directa para productos con stock bajo
        this.getProductsLowStockCount(),

        // Resumen financiero del mes
        this.getMonthlyFinancialSummary(thisMonth, new Date())
      ]);

      // ✅ Calcular totales
      const totalIncomeToday = (membershipIncome || 0) + (dailyIncome || 0) + (productsIncome || 0);

      // ✅ Obtener tendencia semanal
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const weeklyTrend = await Payment.findAll({
        attributes: [
          [Payment.sequelize.fn('DATE', Payment.sequelize.col('paymentDate')), 'date'],
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
          Payment.sequelize.fn('DATE', Payment.sequelize.col('paymentDate')),
          Payment.sequelize.literal(`
            CASE 
              WHEN payment_type IN ('membership') THEN 'memberships'
              WHEN payment_type IN ('daily', 'bulk_daily') THEN 'daily'
              WHEN payment_type IN ('store_cash_delivery', 'store_card_delivery', 'store_online', 'store_transfer') THEN 'products'
              ELSE 'other'
            END
          `)
        ],
        order: [[Payment.sequelize.fn('DATE', Payment.sequelize.col('paymentDate')), 'ASC']]
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
          monthlyFinancial: monthlyFinancialSummary,
          
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

  // ✅ Método auxiliar para obtener productos con stock bajo
  async getProductsLowStockCount() {
    try {
      const result = await StoreProduct.sequelize.query(`
        SELECT COUNT(*) as count 
        FROM store_products 
        WHERE stock_quantity <= min_stock 
        AND is_active = true
      `, {
        type: StoreProduct.sequelize.QueryTypes.SELECT
      });
      
      return parseInt(result[0].count || 0);
    } catch (error) {
      console.warn('⚠️ Error al obtener productos con stock bajo:', error.message);
      return 0;
    }
  }

  // ✅ Método auxiliar para obtener resumen financiero mensual
  async getMonthlyFinancialSummary(startDate, endDate) {
    try {
      if (FinancialMovements && typeof FinancialMovements.getFinancialSummary === 'function') {
        return await FinancialMovements.getFinancialSummary(startDate, endDate);
      } else {
        // Fallback si el método no está disponible
        return {
          totalIncome: 0,
          totalExpenses: 0,
          netProfit: 0
        };
      }
    } catch (error) {
      console.warn('⚠️ Error al obtener resumen financiero:', error.message);
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netProfit: 0
      };
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
        this.getAvgOrderValue(startDate, endDate),

        // Tasa de conversión (órdenes completadas vs creadas)
        this.getConversionRate(startDate, endDate),

        // Retención de clientes
        this.getCustomerRetention(),

        // Productos más vendidos
        this.getProductPerformance(startDate, endDate),

        // Crecimiento de ingresos
        this.getRevenueGrowth(startDate, endDate)
      ]);

      res.json({
        success: true,
        data: {
          period,
          metrics: {
            avgOrderValue: parseFloat(avgOrderValue).toFixed(2),
            conversionRate,
            customerRetention,
            revenueGrowth: parseFloat(revenueGrowth || 0).toFixed(2)
          },
          topProducts: productPerformance
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

  // ✅ Métodos auxiliares para métricas
  async getAvgOrderValue(startDate, endDate) {
    try {
      const result = await StoreOrder.findOne({
        attributes: [[StoreOrder.sequelize.fn('AVG', StoreOrder.sequelize.col('totalAmount')), 'avg_order']],
        where: {
          status: 'delivered',
          createdAt: { [Op.between]: [startDate, endDate] }
        }
      });
      
      return result?.dataValues?.avg_order || 0;
    } catch (error) {
      console.warn('⚠️ Error al calcular valor promedio de orden:', error.message);
      return 0;
    }
  }

  async getConversionRate(startDate, endDate) {
    try {
      const [total, completed] = await Promise.all([
        StoreOrder.count({ where: { createdAt: { [Op.between]: [startDate, endDate] } } }),
        StoreOrder.count({ 
          where: { 
            status: 'delivered',
            createdAt: { [Op.between]: [startDate, endDate] } 
          } 
        })
      ]);

      return {
        total,
        completed,
        rate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0
      };
    } catch (error) {
      console.warn('⚠️ Error al calcular tasa de conversión:', error.message);
      return { total: 0, completed: 0, rate: 0 };
    }
  }

  async getCustomerRetention() {
    try {
      const retentionResult = await User.sequelize.query(`
        SELECT COUNT(DISTINCT user_id) as retention_count
        FROM store_orders 
        WHERE status = 'delivered' 
        AND user_id IN (
          SELECT user_id 
          FROM store_orders 
          WHERE status = 'delivered' 
          GROUP BY user_id 
          HAVING COUNT(*) > 1
        )
      `, {
        type: User.sequelize.QueryTypes.SELECT
      });

      return parseInt(retentionResult[0]?.retention_count || 0);
    } catch (error) {
      console.warn('⚠️ Error al calcular retención de clientes:', error.message);
      return 0;
    }
  }

  async getProductPerformance(startDate, endDate) {
    try {
      const { StoreOrderItem } = require('../models');
      
      const performance = await StoreOrderItem.sequelize.query(`
        SELECT 
          soi.product_id as id,
          sp.name,
          SUM(soi.quantity) as total_sold,
          SUM(soi.total_price) as total_revenue
        FROM store_order_items soi
        JOIN store_orders so ON soi.order_id = so.id
        JOIN store_products sp ON soi.product_id = sp.id
        WHERE so.status = 'delivered'
        AND so.created_at BETWEEN :startDate AND :endDate
        GROUP BY soi.product_id, sp.name
        ORDER BY SUM(soi.quantity) DESC
        LIMIT 10
      `, {
        replacements: { startDate, endDate },
        type: StoreOrderItem.sequelize.QueryTypes.SELECT
      });

      return performance.map(item => ({
        id: item.id,
        name: item.name,
        totalSold: parseInt(item.total_sold || 0),
        totalRevenue: parseFloat(item.total_revenue || 0)
      }));
    } catch (error) {
      console.warn('⚠️ Error al obtener rendimiento de productos:', error.message);
      return [];
    }
  }

  async getRevenueGrowth(startDate, endDate) {
    try {
      const result = await Payment.sum('amount', {
        where: {
          paymentType: ['store_cash_delivery', 'store_card_delivery', 'store_online', 'store_transfer'],
          status: 'completed',
          paymentDate: { [Op.between]: [startDate, endDate] }
        }
      });

      return result || 0;
    } catch (error) {
      console.warn('⚠️ Error al calcular crecimiento de ingresos:', error.message);
      return 0;
    }
  }
}

module.exports = new DashboardController();