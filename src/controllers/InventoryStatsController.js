// src/controllers/InventoryStatsController.js - ESTADÍSTICAS COMBINADAS (ONLINE + LOCAL)
const { 
  StoreProduct, 
  StoreCategory, 
  StoreBrand,
  StoreOrder,
  StoreOrderItem,
  LocalSale,
  LocalSaleItem,
  FinancialMovements,
  User 
} = require('../models');
const { Op, literal, fn, col } = require('sequelize');

class InventoryStatsController {

  // ✅ Dashboard principal de inventario
  async getInventoryStats(req, res) {
    try {
      const { period = 'month' } = req.query;
      
      console.log('📊 Generando estadísticas de inventario...');

      const [
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        totalValue,
        salesData,
        topProducts,
        pendingTransfers,
        categoryStats
      ] = await Promise.all([
        // Total de productos activos
        StoreProduct.count({ where: { isActive: true } }),
        
        // Productos con poco stock
        StoreProduct.count({
          where: {
            isActive: true,
            stockQuantity: { [Op.lte]: col('min_stock') }
          }
        }),
        
        // Productos sin stock
        StoreProduct.count({
          where: { isActive: true, stockQuantity: 0 }
        }),
        
        // Valor total del inventario
        StoreProduct.sum(
          literal('price * stock_quantity'),
          { where: { isActive: true } }
        ),
        
        // Datos de ventas por período
        this.getSalesDataByPeriod(period),
        
        // Productos más vendidos
        this.getTopSellingProducts(10),
        
        // Transferencias pendientes (online + local)
        this.getPendingTransfersCount(),
        
        // Estadísticas por categoría
        this.getCategoryStats()
      ]);

      const stats = {
        inventory: {
          totalProducts,
          lowStockProducts,
          outOfStockProducts,
          totalValue: parseFloat(totalValue || 0)
        },
        sales: {
          period,
          data: salesData
        },
        products: {
          topSelling: topProducts
        },
        alerts: {
          pendingTransfers,
          lowStockProducts
        },
        categories: categoryStats
      };

      console.log('✅ Estadísticas generadas exitosamente');

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error al obtener estadísticas de inventario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }

  // ✅ Datos de ventas combinadas (online + local)
  async getSalesDataByPeriod(period) {
    try {
      let startDate = new Date();
      
      switch (period) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        default:
          startDate.setMonth(startDate.getMonth() - 1);
      }

      // Ventas online (órdenes entregadas)
      const onlineSales = await StoreOrder.findAll({
        attributes: [
          [fn('DATE', col('createdAt')), 'date'],
          [fn('COUNT', col('id')), 'orders'],
          [fn('SUM', col('totalAmount')), 'revenue']
        ],
        where: {
          createdAt: { [Op.gte]: startDate },
          status: { [Op.in]: ['delivered', 'picked_up'] }
        },
        group: [fn('DATE', col('createdAt'))],
        order: [[fn('DATE', col('createdAt')), 'ASC']],
        raw: true
      });

      // Ventas locales (completadas)
      const localSales = await LocalSale.findAll({
        attributes: [
          [fn('DATE', col('workDate')), 'date'],
          [fn('COUNT', col('id')), 'sales'],
          [fn('SUM', col('totalAmount')), 'revenue']
        ],
        where: {
          workDate: { [Op.gte]: startDate },
          status: 'completed'
        },
        group: [fn('DATE', col('workDate'))],
        order: [[fn('DATE', col('workDate')), 'ASC']],
        raw: true
      });

      // Combinar datos por fecha
      const combinedSales = {};

      onlineSales.forEach(item => {
        const date = item.date;
        combinedSales[date] = {
          date,
          onlineOrders: parseInt(item.orders || 0),
          onlineRevenue: parseFloat(item.revenue || 0),
          localSales: 0,
          localRevenue: 0
        };
      });

      localSales.forEach(item => {
        const date = item.date;
        if (combinedSales[date]) {
          combinedSales[date].localSales = parseInt(item.sales || 0);
          combinedSales[date].localRevenue = parseFloat(item.revenue || 0);
        } else {
          combinedSales[date] = {
            date,
            onlineOrders: 0,
            onlineRevenue: 0,
            localSales: parseInt(item.sales || 0),
            localRevenue: parseFloat(item.revenue || 0)
          };
        }
      });

      // Calcular totales por día
      return Object.values(combinedSales).map(item => ({
        ...item,
        totalOrders: item.onlineOrders + item.localSales,
        totalRevenue: parseFloat((item.onlineRevenue + item.localRevenue).toFixed(2))
      })).sort((a, b) => new Date(a.date) - new Date(b.date));

    } catch (error) {
      console.error('Error obteniendo datos de ventas por período:', error);
      return [];
    }
  }

  // ✅ Productos más vendidos (combinando online + local)
  async getTopSellingProducts(limit = 10) {
    try {
      // Ventas online
      const onlineItems = await StoreOrderItem.findAll({
        attributes: [
          'productId',
          'productName',
          [fn('SUM', col('quantity')), 'totalSold'],
          [fn('SUM', col('totalPrice')), 'totalRevenue']
        ],
        include: [{
          model: StoreOrder,
          as: 'order',
          where: { status: { [Op.in]: ['delivered', 'picked_up'] } },
          attributes: []
        }],
        group: ['productId', 'productName'],
        raw: true
      });

      // Ventas locales
      const localItems = await LocalSaleItem.findAll({
        attributes: [
          'productId',
          'productName',
          [fn('SUM', col('quantity')), 'totalSold'],
          [fn('SUM', col('totalPrice')), 'totalRevenue']
        ],
        include: [{
          model: LocalSale,
          as: 'localSale',
          where: { status: 'completed' },
          attributes: []
        }],
        group: ['productId', 'productName'],
        raw: true
      });

      // Combinar resultados
      const productMap = {};

      [...onlineItems, ...localItems].forEach(item => {
        const productId = item.productId;
        const sold = parseInt(item.totalSold || 0);
        const revenue = parseFloat(item.totalRevenue || 0);

        if (productMap[productId]) {
          productMap[productId].totalSold += sold;
          productMap[productId].totalRevenue += revenue;
        } else {
          productMap[productId] = {
            productId,
            productName: item.productName,
            totalSold: sold,
            totalRevenue: revenue
          };
        }
      });

      return Object.values(productMap)
        .sort((a, b) => b.totalSold - a.totalSold)
        .slice(0, limit);

    } catch (error) {
      console.error('Error obteniendo productos más vendidos:', error);
      return [];
    }
  }

  // ✅ Contar transferencias pendientes (online + local)
  async getPendingTransfersCount() {
    try {
      const [onlinePending, localPending] = await Promise.all([
        StoreOrder.count({
          where: {
            paymentMethod: 'transfer_on_delivery',
            transferConfirmed: false,
            status: { [Op.ne]: 'cancelled' }
          }
        }),
        
        LocalSale.count({
          where: {
            paymentMethod: 'transfer',
            transferConfirmed: false,
            status: 'transfer_pending'
          }
        })
      ]);

      return {
        total: onlinePending + localPending,
        online: onlinePending,
        local: localPending
      };
    } catch (error) {
      console.error('Error obteniendo transferencias pendientes:', error);
      return { total: 0, online: 0, local: 0 };
    }
  }

  // ✅ Estadísticas por categoría
  async getCategoryStats() {
    try {
      const categories = await StoreCategory.findAll({
        where: { isActive: true },
        include: [{
          model: StoreProduct,
          as: 'products',
          where: { isActive: true },
          required: false,
          attributes: []
        }],
        attributes: [
          'id', 'name', 'slug',
          [fn('COUNT', col('products.id')), 'productCount'],
          [fn('SUM', literal('products.price * products.stock_quantity')), 'categoryValue'],
          [fn('AVG', col('products.price')), 'averagePrice']
        ],
        group: ['StoreCategory.id'],
        order: [['name', 'ASC']]
      });

      return categories.map(category => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        productCount: parseInt(category.dataValues.productCount || 0),
        categoryValue: parseFloat(category.dataValues.categoryValue || 0),
        averagePrice: parseFloat(category.dataValues.averagePrice || 0)
      }));
    } catch (error) {
      console.error('Error obteniendo estadísticas por categoría:', error);
      return [];
    }
  }

  // ✅ Reporte financiero combinado
  async getFinancialReport(req, res) {
    try {
      const { 
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate = new Date().toISOString().split('T')[0]
      } = req.query;

      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      console.log(`📊 Generando reporte financiero: ${startDate} a ${endDate}`);

      const [
        onlineRevenue,
        localRevenue,
        financialMovements,
        paymentMethods
      ] = await Promise.all([
        // Ingresos online
        StoreOrder.sum('totalAmount', {
          where: {
            createdAt: { [Op.between]: [start, end] },
            status: { [Op.in]: ['delivered', 'picked_up'] }
          }
        }),

        // Ingresos locales
        LocalSale.sum('totalAmount', {
          where: {
            workDate: { [Op.between]: [start, end] },
            status: 'completed'
          }
        }),

        // Movimientos financieros
        FinancialMovements.findAll({
          attributes: [
            'type',
            [fn('COUNT', col('id')), 'count'],
            [fn('SUM', col('amount')), 'total']
          ],
          where: {
            movementDate: { [Op.between]: [start, end] }
          },
          group: ['type']
        }),

        // Métodos de pago combinados
        this.getPaymentMethodsBreakdown(start, end)
      ]);

      const totalOnline = parseFloat(onlineRevenue || 0);
      const totalLocal = parseFloat(localRevenue || 0);
      const totalRevenue = totalOnline + totalLocal;

      // Procesar movimientos financieros
      const movements = {};
      financialMovements.forEach(movement => {
        movements[movement.type] = {
          count: parseInt(movement.dataValues.count),
          total: parseFloat(movement.dataValues.total)
        };
      });

      const report = {
        period: { startDate, endDate },
        revenue: {
          online: totalOnline,
          local: totalLocal,
          total: totalRevenue
        },
        movements: {
          income: movements.income || { count: 0, total: 0 },
          expense: movements.expense || { count: 0, total: 0 }
        },
        paymentMethods,
        netIncome: (movements.income?.total || 0) - (movements.expense?.total || 0)
      };

      console.log('✅ Reporte financiero generado');

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Error generando reporte financiero:', error);
      res.status(500).json({
        success: false,
        message: 'Error generando reporte financiero',
        error: error.message
      });
    }
  }

  // ✅ Desglose por métodos de pago
  async getPaymentMethodsBreakdown(startDate, endDate) {
    try {
      const [onlinePayments, localPayments] = await Promise.all([
        StoreOrder.findAll({
          attributes: [
            'paymentMethod',
            [fn('COUNT', col('id')), 'count'],
            [fn('SUM', col('totalAmount')), 'total']
          ],
          where: {
            createdAt: { [Op.between]: [startDate, endDate] },
            status: { [Op.in]: ['delivered', 'picked_up'] }
          },
          group: ['paymentMethod'],
          raw: true
        }),

        LocalSale.findAll({
          attributes: [
            'paymentMethod',
            [fn('COUNT', col('id')), 'count'],
            [fn('SUM', col('totalAmount')), 'total']
          ],
          where: {
            workDate: { [Op.between]: [startDate, endDate] },
            status: 'completed'
          },
          group: ['paymentMethod'],
          raw: true
        })
      ]);

      const methodsMap = {};

      [...onlinePayments, ...localPayments].forEach(payment => {
        const method = payment.paymentMethod;
        const count = parseInt(payment.count || 0);
        const total = parseFloat(payment.total || 0);

        if (methodsMap[method]) {
          methodsMap[method].count += count;
          methodsMap[method].total += total;
        } else {
          methodsMap[method] = { count, total };
        }
      });

      return methodsMap;
    } catch (error) {
      console.error('Error obteniendo desglose de métodos de pago:', error);
      return {};
    }
  }

  // ✅ Productos con poco stock detallado
  async getLowStockReport(req, res) {
    try {
      const products = await StoreProduct.findAll({
        where: {
          isActive: true,
          stockQuantity: { [Op.lte]: col('min_stock') }
        },
        include: [
          { model: StoreCategory, as: 'category', attributes: ['id', 'name'] },
          { model: StoreBrand, as: 'brand', attributes: ['id', 'name'] }
        ],
        order: [['stockQuantity', 'ASC']]
      });

      const lowStockProducts = products.map(product => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        currentStock: product.stockQuantity,
        minStock: product.minStock,
        shortage: Math.max(0, product.minStock - product.stockQuantity),
        category: product.category?.name || 'Sin categoría',
        brand: product.brand?.name || 'Sin marca',
        price: parseFloat(product.price),
        isOutOfStock: product.stockQuantity === 0,
        urgency: product.stockQuantity === 0 ? 'critical' : 
                product.stockQuantity < (product.minStock * 0.5) ? 'high' : 'medium'
      }));

      res.json({
        success: true,
        data: {
          products: lowStockProducts,
          summary: {
            totalProducts: lowStockProducts.length,
            outOfStock: lowStockProducts.filter(p => p.isOutOfStock).length,
            critical: lowStockProducts.filter(p => p.urgency === 'critical').length,
            high: lowStockProducts.filter(p => p.urgency === 'high').length,
            medium: lowStockProducts.filter(p => p.urgency === 'medium').length
          }
        }
      });
    } catch (error) {
      console.error('Error obteniendo reporte de stock bajo:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo reporte de stock',
        error: error.message
      });
    }
  }

  // ✅ Reporte de performance por empleado
  async getEmployeePerformance(req, res) {
    try {
      const { 
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate = new Date().toISOString().split('T')[0]
      } = req.query;

      const start = new Date(startDate);
      const end = new Date(endDate);

      // Solo empleados que han hecho ventas locales
      const employeeStats = await LocalSale.findAll({
        attributes: [
          'employeeId',
          [fn('COUNT', col('LocalSale.id')), 'totalSales'],
          [fn('SUM', col('totalAmount')), 'totalRevenue'],
          [fn('AVG', col('totalAmount')), 'averageSale'],
          [fn('COUNT', literal('CASE WHEN payment_method = \'cash\' THEN 1 END')), 'cashSales'],
          [fn('COUNT', literal('CASE WHEN payment_method = \'transfer\' THEN 1 END')), 'transferSales'],
          [fn('COUNT', literal('CASE WHEN status = \'transfer_pending\' THEN 1 END')), 'pendingTransfers']
        ],
        include: [{
          model: User,
          as: 'employee',
          attributes: ['id', 'firstName', 'lastName', 'role']
        }],
        where: {
          workDate: { [Op.between]: [start, end] },
          status: { [Op.in]: ['completed', 'transfer_pending'] }
        },
        group: ['employeeId', 'employee.id', 'employee.firstName', 'employee.lastName', 'employee.role'],
        order: [[fn('SUM', col('totalAmount')), 'DESC']]
      });

      const performance = employeeStats.map(stat => ({
        employee: {
          id: stat.employee.id,
          name: `${stat.employee.firstName} ${stat.employee.lastName}`,
          role: stat.employee.role
        },
        sales: {
          total: parseInt(stat.dataValues.totalSales),
          revenue: parseFloat(stat.dataValues.totalRevenue),
          average: parseFloat(stat.dataValues.averageSale),
          cash: parseInt(stat.dataValues.cashSales),
          transfer: parseInt(stat.dataValues.transferSales),
          pending: parseInt(stat.dataValues.pendingTransfers)
        }
      }));

      res.json({
        success: true,
        data: {
          period: { startDate, endDate },
          employees: performance
        }
      });
    } catch (error) {
      console.error('Error obteniendo performance de empleados:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo performance',
        error: error.message
      });
    }
  }

  // ✅ Dashboard resumido
  async getDashboard(req, res) {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const [
        todayStats,
        monthStats,
        pendingActions,
        recentActivity
      ] = await Promise.all([
        this.getDayStats(today),
        this.getPeriodStats(startOfMonth, today),
        this.getPendingActions(),
        this.getRecentActivity()
      ]);

      res.json({
        success: true,
        data: {
          today: todayStats,
          thisMonth: monthStats,
          pending: pendingActions,
          recent: recentActivity
        }
      });
    } catch (error) {
      console.error('Error obteniendo dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo dashboard',
        error: error.message
      });
    }
  }

  // ✅ MÉTODOS AUXILIARES
  
  async getDayStats(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [onlineSales, localSales] = await Promise.all([
      StoreOrder.findOne({
        attributes: [
          [fn('COUNT', col('id')), 'orders'],
          [fn('SUM', col('totalAmount')), 'revenue']
        ],
        where: {
          createdAt: { [Op.between]: [startOfDay, endOfDay] },
          status: { [Op.in]: ['delivered', 'picked_up'] }
        }
      }),
      LocalSale.findOne({
        attributes: [
          [fn('COUNT', col('id')), 'sales'],
          [fn('SUM', col('totalAmount')), 'revenue']
        ],
        where: {
          workDate: date.toISOString().split('T')[0],
          status: 'completed'
        }
      })
    ]);

    return {
      onlineOrders: parseInt(onlineSales?.dataValues?.orders || 0),
      onlineRevenue: parseFloat(onlineSales?.dataValues?.revenue || 0),
      localSales: parseInt(localSales?.dataValues?.sales || 0),
      localRevenue: parseFloat(localSales?.dataValues?.revenue || 0)
    };
  }

  async getPeriodStats(startDate, endDate) {
    const [onlineStats, localStats] = await Promise.all([
      StoreOrder.findOne({
        attributes: [
          [fn('COUNT', col('id')), 'orders'],
          [fn('SUM', col('totalAmount')), 'revenue']
        ],
        where: {
          createdAt: { [Op.between]: [startDate, endDate] },
          status: { [Op.in]: ['delivered', 'picked_up'] }
        }
      }),
      LocalSale.findOne({
        attributes: [
          [fn('COUNT', col('id')), 'sales'],
          [fn('SUM', col('totalAmount')), 'revenue']
        ],
        where: {
          workDate: { [Op.between]: [startDate, endDate] },
          status: 'completed'
        }
      })
    ]);

    return {
      onlineOrders: parseInt(onlineStats?.dataValues?.orders || 0),
      onlineRevenue: parseFloat(onlineStats?.dataValues?.revenue || 0),
      localSales: parseInt(localStats?.dataValues?.sales || 0),
      localRevenue: parseFloat(localStats?.dataValues?.revenue || 0)
    };
  }

  async getPendingActions() {
    const [transfers, lowStock, pendingOrders] = await Promise.all([
      this.getPendingTransfersCount(),
      StoreProduct.count({
        where: {
          isActive: true,
          stockQuantity: { [Op.lte]: col('min_stock') }
        }
      }),
      StoreOrder.count({
        where: {
          status: { [Op.in]: ['pending', 'confirmed'] }
        }
      })
    ]);

    return {
      pendingTransfers: transfers.total,
      lowStockProducts: lowStock,
      pendingOrders
    };
  }

  async getRecentActivity() {
    // Implementar actividad reciente si es necesario
    return [];
  }
}

module.exports = new InventoryStatsController();