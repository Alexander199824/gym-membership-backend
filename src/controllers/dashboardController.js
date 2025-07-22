// src/controllers/dashboardController.js - CORREGIDO: Problemas de consultas y métodos auxiliares
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

  // ✅ Dashboard principal unificado - CORREGIDO
  async getUnifiedDashboard(req, res) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      // ✅ Obtener todos los datos en paralelo con mejor manejo de errores
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
        this.safeSum(Payment, 'amount', {
          paymentType: 'membership',
          status: 'completed',
          paymentDate: { [Op.between]: [today, tomorrow] }
        }),
        
        // Ingresos de pagos diarios (hoy)
        this.safeSum(Payment, 'amount', {
          paymentType: ['daily', 'bulk_daily'],
          status: 'completed',
          paymentDate: { [Op.between]: [today, tomorrow] }
        }),
        
        // Ingresos de productos (hoy)
        this.safeSum(Payment, 'amount', {
          paymentType: ['store_cash_delivery', 'store_card_delivery', 'store_online', 'store_transfer'],
          status: 'completed',
          paymentDate: { [Op.between]: [today, tomorrow] }
        }),

        // Estadísticas generales
        this.safeCount(User, { isActive: true }),
        this.safeCount(Membership, { status: 'active' }),
        this.safeCount(StoreOrder, { createdAt: { [Op.between]: [today, tomorrow] } }),
        
        // ✅ CORREGIDO: Productos con stock bajo
        this.getProductsLowStockCount(),

        // Resumen financiero del mes
        this.getMonthlyFinancialSummary(thisMonth, new Date())
      ]);

      // ✅ Calcular totales
      const totalIncomeToday = (membershipIncome || 0) + (dailyIncome || 0) + (productsIncome || 0);

      // ✅ Obtener tendencia semanal con mejor manejo de errores
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      let weeklyTrend = [];
      try {
        const weeklyData = await Payment.findAll({
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

        weeklyTrend = this.organizeWeeklyTrend(weeklyData);
      } catch (trendError) {
        console.warn('⚠️ Error al obtener tendencia semanal (no crítico):', trendError.message);
        weeklyTrend = [];
      }

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
            totalUsers: totalUsers || 0,
            activeMemberships: activeMemberships || 0,
            ordersToday: ordersToday || 0,
            productsLowStock: productsLowStock || 0
          },
          
          // ✅ Resumen financiero mensual
          monthlyFinancial: monthlyFinancialSummary,
          
          // ✅ Tendencia semanal
          weeklyTrend
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

  // ✅ CORREGIDO: Método auxiliar para obtener productos con stock bajo
  async getProductsLowStockCount() {
    try {
      // Verificar si el modelo StoreProduct existe
      if (!StoreProduct) {
        console.warn('⚠️ Modelo StoreProduct no disponible');
        return 0;
      }

      const count = await StoreProduct.count({
        where: {
          [Op.and]: [
            { isActive: true },
            StoreProduct.sequelize.where(
              StoreProduct.sequelize.col('stock_quantity'),
              Op.lte,
              StoreProduct.sequelize.col('min_stock')
            )
          ]
        }
      });
      
      return count || 0;
    } catch (error) {
      console.warn('⚠️ Error al obtener productos con stock bajo:', error.message);
      return 0;
    }
  }

  // ✅ CORREGIDO: Método auxiliar para obtener resumen financiero mensual
  async getMonthlyFinancialSummary(startDate, endDate) {
    try {
      // Verificar si FinancialMovements existe y tiene el método
      if (!FinancialMovements || typeof FinancialMovements.getFinancialSummary !== 'function') {
        console.warn('⚠️ FinancialMovements.getFinancialSummary no disponible, usando fallback');
        
        // Fallback: calcular manualmente desde pagos
        const totalIncome = await this.safeSum(Payment, 'amount', {
          status: 'completed',
          paymentDate: { [Op.between]: [startDate, endDate] }
        });

        return {
          totalIncome: totalIncome || 0,
          totalExpenses: 0,
          netProfit: totalIncome || 0
        };
      }

      return await FinancialMovements.getFinancialSummary(startDate, endDate);
    } catch (error) {
      console.warn('⚠️ Error al obtener resumen financiero mensual:', error.message);
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netProfit: 0
      };
    }
  }

  // ✅ NUEVO: Método auxiliar para suma segura
  async safeSum(model, field, where) {
    try {
      const result = await model.sum(field, { where });
      return result || 0;
    } catch (error) {
      console.warn(`⚠️ Error en suma segura de ${model.name}.${field}:`, error.message);
      return 0;
    }
  }

  // ✅ NUEVO: Método auxiliar para conteo seguro
  async safeCount(model, where) {
    try {
      const result = await model.count({ where });
      return result || 0;
    } catch (error) {
      console.warn(`⚠️ Error en conteo seguro de ${model.name}:`, error.message);
      return 0;
    }
  }

  // ✅ Organizar datos de tendencia semanal
  organizeWeeklyTrend(weeklyData) {
    const organized = {};
    
    weeklyData.forEach(item => {
      const date = item.dataValues.date;
      const source = item.dataValues.source;
      const total = parseFloat(item.dataValues.total || 0);
      
      if (!organized[date]) {
        organized[date] = { date, memberships: 0, daily: 0, products: 0, other: 0, total: 0 };
      }
      
      organized[date][source] = total;
      organized[date].total += total;
    });
    
    return Object.values(organized).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  // ✅ Obtener métricas de rendimiento - CORREGIDO
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

      // ✅ Métricas de rendimiento con mejor manejo de errores
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
            avgOrderValue: parseFloat((avgOrderValue || 0).toFixed(2)),
            conversionRate,
            customerRetention: customerRetention || 0,
            revenueGrowth: parseFloat((revenueGrowth || 0).toFixed(2))
          },
          topProducts: productPerformance || []
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

  // ✅ CORREGIDO: Métodos auxiliares para métricas
  async getAvgOrderValue(startDate, endDate) {
    try {
      if (!StoreOrder) return 0;

      const result = await StoreOrder.findOne({
        attributes: [[StoreOrder.sequelize.fn('AVG', StoreOrder.sequelize.col('totalAmount')), 'avg_order']],
        where: {
          status: 'delivered',
          createdAt: { [Op.between]: [startDate, endDate] }
        }
      });
      
      return parseFloat(result?.dataValues?.avg_order || 0);
    } catch (error) {
      console.warn('⚠️ Error al calcular valor promedio de orden:', error.message);
      return 0;
    }
  }

  async getConversionRate(startDate, endDate) {
    try {
      if (!StoreOrder) {
        return { total: 0, completed: 0, rate: 0 };
      }

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
        total: total || 0,
        completed: completed || 0,
        rate: total > 0 ? ((completed / total) * 100).toFixed(1) : '0'
      };
    } catch (error) {
      console.warn('⚠️ Error al calcular tasa de conversión:', error.message);
      return { total: 0, completed: 0, rate: '0' };
    }
  }

  async getCustomerRetention() {
    try {
      if (!User || !StoreOrder) return 0;

      const result = await User.sequelize.query(`
        SELECT COUNT(DISTINCT user_id) as retention_count
        FROM store_orders 
        WHERE status = 'delivered' 
        AND user_id IN (
          SELECT user_id 
          FROM store_orders 
          WHERE status = 'delivered' 
          AND user_id IS NOT NULL
          GROUP BY user_id 
          HAVING COUNT(*) > 1
        )
      `, {
        type: User.sequelize.QueryTypes.SELECT
      });

      return parseInt(result[0]?.retention_count || 0);
    } catch (error) {
      console.warn('⚠️ Error al calcular retención de clientes:', error.message);
      return 0;
    }
  }

  async getProductPerformance(startDate, endDate) {
    try {
      if (!StoreOrder || !StoreProduct) return [];

      const performance = await User.sequelize.query(`
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
        type: User.sequelize.QueryTypes.SELECT
      });

      return performance.map(item => ({
        id: item.id,
        name: item.name || 'Producto desconocido',
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
      const result = await this.safeSum(Payment, 'amount', {
        paymentType: ['store_cash_delivery', 'store_card_delivery', 'store_online', 'store_transfer'],
        status: 'completed',
        paymentDate: { [Op.between]: [startDate, endDate] }
      });

      return result || 0;
    } catch (error) {
      console.warn('⚠️ Error al calcular crecimiento de ingresos:', error.message);
      return 0;
    }
  }
}

module.exports = new DashboardController();