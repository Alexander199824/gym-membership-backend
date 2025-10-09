// test-complete-financial-dashboard.js - TEST FINANCIERO COMPLETO CON ANÁLISIS ESTADÍSTICO
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

// ✅ CONFIGURACIÓN
const API_BASE_URL = process.env.API_URL || 'http://localhost:5000';

// ═══════════════════════════════════════════════════════════════════════════
// 📚 DOCUMENTACIÓN DE RUTAS DEL BACKEND
// ═══════════════════════════════════════════════════════════════════════════
//
// 🔐 AUTENTICACIÓN:
//    POST /api/auth/login
//    Body: { email, password }
//    Response: { success, data: { token, user } }
//
// 💳 PAGOS/MEMBRESÍAS:
//    GET /api/payments?limit=1000
//    Response: { success, data: { payments: [...], pagination } }
//    Filtro en cliente: paymentType === 'membership' && status === 'completed'
//
// 🛒 VENTAS ONLINE (Tienda):
//    GET /api/store/management/orders?limit=1000
//    Query params: status, page, limit, startDate, endDate
//    Response: { success, data: { orders: [...], pagination } }
//    Según: storeController.getAllOrders
//
// 🏪 VENTAS LOCALES:
//    GET /api/local-sales?limit=1000
//    Query params: startDate, endDate, status, paymentMethod, employeeId, page, limit
//    Response: { success, data: { sales: [...], ... } }
//    Según: LocalSalesController.getSales
//
// 💸 GASTOS:
//    GET /api/expenses?limit=1000
//    Query params: page, limit, status, category, startDate, endDate, vendor, isRecurring
//    Response: { success, data: expenses (ARRAY), pagination }
//    IMPORTANTE: data es array directo, NO data.expenses
//    Según: expenseController.getAllExpenses
//
// ═══════════════════════════════════════════════════════════════════════════

// ✅ CLASE PRINCIPAL DEL TEST FINANCIERO COMPLETO
class CompleteFinancialDashboardTest {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.adminToken = null;
    this.adminUserId = null;
    
    this.testResults = {
      timestamp: new Date().toISOString(),
      testType: 'COMPLETE_FINANCIAL_ANALYSIS',
      purpose: 'Análisis financiero completo: Ingresos (membresías + ventas online + ventas locales) + Gastos + Estadísticas Avanzadas',
      steps: [],
      success: false,
      financialData: {
        // Ingresos
        memberships: { total: 0, count: 0, breakdown: {}, details: [] },
        onlineOrders: { total: 0, count: 0, breakdown: {}, details: [] },
        localSales: { total: 0, count: 0, breakdown: {}, details: [] },
        totalIncome: 0,
        
        // Gastos
        expenses: { total: 0, count: 0, breakdown: {}, details: [] },
        
        // Balance
        netProfit: 0,
        profitMargin: 0,
        
        // Análisis temporal
        dailyData: [],
        weeklyData: [],
        monthlyData: [],
        
        // Estadísticas avanzadas
        statistics: {
          income: {},
          expenses: {},
          combined: {}
        },
        
        // Datos para gráficas
        chartData: {
          incomeVsExpenses: [],
          categoryBreakdown: [],
          trends: [],
          paymentMethods: []
        }
      },
      errors: []
    };
  }

  // ========================================
  // STEP 1: Autenticación Admin (ESTILO ORIGINAL)
  // ========================================
  async loginAdmin() {
    console.log('\n🔐 STEP 1: Autenticando como administrador...');
    
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'admin@gym.com',
        password: 'Admin123!'
      });

      if (response.data.success) {
        this.adminToken = response.data.data.token;
        this.adminUserId = response.data.data.user.id;
        console.log(`✅ Login admin exitoso: admin@gym.com`);
        console.log(`👤 Admin ID: ${this.adminUserId}`);
        
        this.testResults.steps.push({
          step: 1,
          action: 'Autenticación Admin',
          success: true,
          userId: this.adminUserId,
          email: 'admin@gym.com'
        });
        
        return true;
      }
    } catch (error) {
      console.error('❌ Error en autenticación:', error.response?.data || error.message);
      this.testResults.errors.push(`Autenticación: ${error.message}`);
      this.testResults.steps.push({
        step: 1,
        action: 'Autenticación Admin',
        success: false,
        error: error.message
      });
      return false;
    }
  }

  // ========================================
  // HELPER: Request con axios (estilo original)
  // ========================================
  async makeRequest(method, endpoint, data = null) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.adminToken}`,
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response;
    } catch (error) {
      // Si es 404 o 403, devolver respuesta vacía en lugar de error
      if (error.response?.status === 404 || error.response?.status === 403) {
        console.log(`⚠️ Endpoint no disponible o sin permisos: ${endpoint}`);
        return { data: { success: false, data: null } };
      }
      throw error;
    }
  }

  // ========================================
  // STEP 2: Obtener Ingresos por Membresías
  // ========================================
  async getMembershipIncome() {
    console.log('\n💳 STEP 2: Obteniendo ingresos por membresías...');
    
    try {
      // ✅ Ruta correcta: /api/payments con query params
      const response = await this.makeRequest('GET', '/api/payments?limit=1000');
      
      // ✅ Estructura de respuesta: { success, data: { payments: [...], pagination } }
      if (response.data.success && response.data.data?.payments) {
        // Filtrar solo membresías completadas en el cliente
        const allPayments = response.data.data.payments;
        const payments = allPayments.filter(p => 
          (p.paymentType === 'membership' || p.referenceType === 'membership') && 
          p.status === 'completed'
        );
        
        const total = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        
        // Breakdown por método de pago
        const breakdown = {
          cash: 0,
          card: 0,
          transfer: 0,
          other: 0
        };
        
        payments.forEach(payment => {
          const amount = parseFloat(payment.amount || 0);
          if (payment.paymentMethod === 'cash') breakdown.cash += amount;
          else if (payment.paymentMethod === 'card') breakdown.card += amount;
          else if (payment.paymentMethod === 'transfer') breakdown.transfer += amount;
          else breakdown.other += amount;
        });
        
        this.testResults.financialData.memberships = {
          total,
          count: payments.length,
          breakdown,
          details: payments.map(p => ({
            id: p.id,
            amount: parseFloat(p.amount || 0),
            method: p.paymentMethod,
            date: p.paymentDate,
            userId: p.userId,
            description: p.description
          }))
        };
        
        console.log(`✅ Membresías: Q${total.toFixed(2)} (${payments.length} pagos)`);
        console.log(`   💵 Efectivo: Q${breakdown.cash.toFixed(2)}`);
        console.log(`   💳 Tarjeta: Q${breakdown.card.toFixed(2)}`);
        console.log(`   🏦 Transferencia: Q${breakdown.transfer.toFixed(2)}`);
      } else {
        console.log('⚠️ No se encontraron pagos de membresías');
      }

      this.testResults.steps.push({
        step: 2,
        action: 'Obtener ingresos por membresías',
        success: true,
        total: this.testResults.financialData.memberships.total,
        count: this.testResults.financialData.memberships.count
      });

      return true;
    } catch (error) {
      console.error('❌ Error obteniendo membresías:', error.message);
      this.testResults.errors.push(`Membresías: ${error.message}`);
      return false;
    }
  }

  // ========================================
  // STEP 3: Obtener Ingresos por Ventas Online
  // ========================================
  async getOnlineOrdersIncome() {
    console.log('\n🛒 STEP 3: Obteniendo ingresos por ventas online...');
    
    try {
      // ✅ Ruta correcta según storeAdminRoutes.js: /api/store/management/orders
      const response = await this.makeRequest('GET', '/api/store/management/orders?limit=1000');
      
      // ✅ Estructura según storeController.getAllOrders: { success, data: { orders, pagination } }
      if (response.data.success && response.data.data?.orders) {
        // Filtrar solo órdenes completadas (delivered o picked_up)
        const allOrders = response.data.data.orders;
        const orders = allOrders.filter(o => 
          o.status === 'delivered' || o.status === 'picked_up'
        );
        
        const total = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0);
        
        // Breakdown por tipo de entrega
        const breakdown = {
          pickup: 0,
          delivery: 0,
          express: 0
        };
        
        orders.forEach(order => {
          const amount = parseFloat(order.totalAmount || 0);
          if (order.deliveryType === 'pickup') breakdown.pickup += amount;
          else if (order.deliveryType === 'delivery') breakdown.delivery += amount;
          else if (order.deliveryType === 'express') breakdown.express += amount;
        });
        
        this.testResults.financialData.onlineOrders = {
          total,
          count: orders.length,
          breakdown,
          details: orders.map(o => ({
            id: o.id,
            orderNumber: o.orderNumber,
            amount: parseFloat(o.totalAmount || 0),
            deliveryType: o.deliveryType,
            paymentMethod: o.paymentMethod,
            date: o.deliveryDate || o.createdAt,
            userId: o.userId
          }))
        };
        
        console.log(`✅ Ventas Online: Q${total.toFixed(2)} (${orders.length} órdenes)`);
        console.log(`   📦 Pickup: Q${breakdown.pickup.toFixed(2)}`);
        console.log(`   🚚 Delivery: Q${breakdown.delivery.toFixed(2)}`);
        console.log(`   ⚡ Express: Q${breakdown.express.toFixed(2)}`);
      } else {
        console.log('⚠️ No se encontraron ventas online');
      }

      this.testResults.steps.push({
        step: 3,
        action: 'Obtener ventas online',
        success: true,
        total: this.testResults.financialData.onlineOrders.total,
        count: this.testResults.financialData.onlineOrders.count
      });

      return true;
    } catch (error) {
      console.error('❌ Error obteniendo ventas online:', error.message);
      this.testResults.errors.push(`Ventas online: ${error.message}`);
      return false;
    }
  }

  // ========================================
  // STEP 4: Obtener Ingresos por Ventas Locales
  // ========================================
  async getLocalSalesIncome() {
    console.log('\n🏪 STEP 4: Obteniendo ingresos por ventas locales...');
    
    try {
      // ✅ Ruta correcta según localSales.js: /api/local-sales
      const response = await this.makeRequest('GET', '/api/local-sales?limit=1000');
      
      // ✅ Estructura según LocalSalesController.getSales: { success, data: { sales, ... } }
      if (response.data.success && response.data.data?.sales) {
        // Filtrar solo ventas completadas
        const allSales = response.data.data.sales;
        const sales = allSales.filter(s => s.status === 'completed');
        
        const total = sales.reduce((sum, s) => sum + parseFloat(s.totalAmount || 0), 0);
        
        // Breakdown por método de pago
        const breakdown = {
          cash: 0,
          transfer: 0
        };
        
        sales.forEach(sale => {
          const amount = parseFloat(sale.totalAmount || 0);
          if (sale.paymentMethod === 'cash') breakdown.cash += amount;
          else if (sale.paymentMethod === 'transfer') breakdown.transfer += amount;
        });
        
        this.testResults.financialData.localSales = {
          total,
          count: sales.length,
          breakdown,
          details: sales.map(s => ({
            id: s.id,
            saleNumber: s.saleNumber,
            amount: parseFloat(s.totalAmount || 0),
            paymentMethod: s.paymentMethod,
            date: s.createdAt,
            employeeId: s.employeeId,
            customerName: s.customerInfo?.name || 'Cliente local'
          }))
        };
        
        console.log(`✅ Ventas Locales: Q${total.toFixed(2)} (${sales.length} ventas)`);
        console.log(`   💵 Efectivo: Q${breakdown.cash.toFixed(2)}`);
        console.log(`   🏦 Transferencia: Q${breakdown.transfer.toFixed(2)}`);
      } else {
        console.log('⚠️ No se encontraron ventas locales');
      }

      this.testResults.steps.push({
        step: 4,
        action: 'Obtener ventas locales',
        success: true,
        total: this.testResults.financialData.localSales.total,
        count: this.testResults.financialData.localSales.count
      });

      return true;
    } catch (error) {
      console.error('❌ Error obteniendo ventas locales:', error.message);
      this.testResults.errors.push(`Ventas locales: ${error.message}`);
      return false;
    }
  }

  // ========================================
  // STEP 5: Obtener Gastos
  // ========================================
  async getExpenses() {
    console.log('\n💸 STEP 5: Obteniendo gastos operativos...');
    
    try {
      // ✅ Ruta correcta según expenseRoutes.js: /api/expenses
      const response = await this.makeRequest('GET', '/api/expenses?limit=1000');
      
      // ✅ IMPORTANTE: Estructura según expenseController.getAllExpenses:
      // res.json({ success, data: expenses, pagination })
      // data es ARRAY DIRECTO, no data.expenses
      if (response.data.success && response.data.data) {
        // Filtrar solo gastos pagados o aprobados
        const allExpenses = response.data.data;
        const expenses = Array.isArray(allExpenses) 
          ? allExpenses.filter(e => e.status === 'paid' || e.status === 'approved')
          : [];
        
        const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
        
        // Breakdown por categoría
        const breakdown = {
          rent: 0,
          utilities: 0,
          equipment_purchase: 0,
          equipment_maintenance: 0,
          staff_salary: 0,
          cleaning_supplies: 0,
          marketing: 0,
          insurance: 0,
          taxes: 0,
          other_expense: 0
        };
        
        expenses.forEach(expense => {
          const amount = parseFloat(expense.amount || 0);
          if (breakdown.hasOwnProperty(expense.category)) {
            breakdown[expense.category] += amount;
          }
        });
        
        this.testResults.financialData.expenses = {
          total,
          count: expenses.length,
          breakdown,
          details: expenses.map(e => ({
            id: e.id,
            title: e.title,
            amount: parseFloat(e.amount || 0),
            category: e.category,
            date: e.expenseDate,
            vendor: e.vendor,
            status: e.status
          }))
        };
        
        console.log(`✅ Gastos: Q${total.toFixed(2)} (${expenses.length} gastos)`);
        console.log(`   🏢 Alquiler: Q${breakdown.rent.toFixed(2)}`);
        console.log(`   💡 Servicios: Q${breakdown.utilities.toFixed(2)}`);
        console.log(`   🏋️ Equipamiento: Q${(breakdown.equipment_purchase + breakdown.equipment_maintenance).toFixed(2)}`);
        console.log(`   👥 Salarios: Q${breakdown.staff_salary.toFixed(2)}`);
        console.log(`   📢 Marketing: Q${breakdown.marketing.toFixed(2)}`);
        console.log(`   🧹 Limpieza: Q${breakdown.cleaning_supplies.toFixed(2)}`);
      } else {
        console.log('⚠️ No se encontraron gastos');
      }

      this.testResults.steps.push({
        step: 5,
        action: 'Obtener gastos',
        success: true,
        total: this.testResults.financialData.expenses.total,
        count: this.testResults.financialData.expenses.count
      });

      return true;
    } catch (error) {
      console.error('❌ Error obteniendo gastos:', error.message);
      this.testResults.errors.push(`Gastos: ${error.message}`);
      return false;
    }
  }

  // ========================================
  // STEP 6: Calcular Totales y Balance
  // ========================================
  calculateTotalsAndBalance() {
    console.log('\n📊 STEP 6: Calculando totales y balance...');
    
    try {
      const { memberships, onlineOrders, localSales, expenses } = this.testResults.financialData;
      
      // Total de ingresos
      const totalIncome = memberships.total + onlineOrders.total + localSales.total;
      
      // Balance neto
      const netProfit = totalIncome - expenses.total;
      
      // Margen de ganancia
      const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
      
      this.testResults.financialData.totalIncome = totalIncome;
      this.testResults.financialData.netProfit = netProfit;
      this.testResults.financialData.profitMargin = profitMargin;
      
      console.log(`\n💰 RESUMEN FINANCIERO:`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📈 INGRESOS TOTALES:     Q${totalIncome.toFixed(2)}`);
      console.log(`   💳 Membresías:        Q${memberships.total.toFixed(2)} (${memberships.count})`);
      console.log(`   🛒 Ventas Online:     Q${onlineOrders.total.toFixed(2)} (${onlineOrders.count})`);
      console.log(`   🏪 Ventas Locales:    Q${localSales.total.toFixed(2)} (${localSales.count})`);
      console.log(`\n📉 GASTOS TOTALES:       Q${expenses.total.toFixed(2)} (${expenses.count})`);
      console.log(`\n${netProfit >= 0 ? '✅' : '❌'} UTILIDAD NETA:       Q${netProfit.toFixed(2)}`);
      console.log(`📊 MARGEN DE GANANCIA:   ${profitMargin.toFixed(2)}%`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      
      this.testResults.steps.push({
        step: 6,
        action: 'Calcular totales y balance',
        success: true,
        totalIncome,
        totalExpenses: expenses.total,
        netProfit,
        profitMargin
      });

      return true;
    } catch (error) {
      console.error('❌ Error calculando balance:', error.message);
      this.testResults.errors.push(`Cálculo balance: ${error.message}`);
      return false;
    }
  }

  // ========================================
  // STEP 7: Análisis Estadístico Avanzado
  // ========================================
  performStatisticalAnalysis() {
    console.log('\n📈 STEP 7: Realizando análisis estadístico avanzado...');
    
    try {
      const { memberships, onlineOrders, localSales, expenses } = this.testResults.financialData;
      
      // Preparar datasets
      const incomeAmounts = [
        ...memberships.details.map(d => d.amount),
        ...onlineOrders.details.map(d => d.amount),
        ...localSales.details.map(d => d.amount)
      ];
      
      const expenseAmounts = expenses.details.map(d => d.amount);
      
      // Calcular estadísticas para ingresos
      this.testResults.financialData.statistics.income = this.calculateStatistics(incomeAmounts, 'Ingresos');
      
      // Calcular estadísticas para gastos
      this.testResults.financialData.statistics.expenses = this.calculateStatistics(expenseAmounts, 'Gastos');
      
      // Análisis combinado
      this.testResults.financialData.statistics.combined = {
        totalTransactions: incomeAmounts.length + expenseAmounts.length,
        incomeTransactions: incomeAmounts.length,
        expenseTransactions: expenseAmounts.length,
        avgIncomePerTransaction: incomeAmounts.length > 0 ? this.mean(incomeAmounts) : 0,
        avgExpensePerTransaction: expenseAmounts.length > 0 ? this.mean(expenseAmounts) : 0,
        incomeToExpenseRatio: expenses.total > 0 ? this.testResults.financialData.totalIncome / expenses.total : 0
      };
      
      console.log(`✅ Análisis estadístico completado`);
      console.log(`   📊 Transacciones de ingreso: ${incomeAmounts.length}`);
      console.log(`   💸 Transacciones de gasto: ${expenseAmounts.length}`);
      console.log(`   💰 Ingreso promedio: Q${this.testResults.financialData.statistics.combined.avgIncomePerTransaction.toFixed(2)}`);
      console.log(`   💵 Gasto promedio: Q${this.testResults.financialData.statistics.combined.avgExpensePerTransaction.toFixed(2)}`);
      
      this.testResults.steps.push({
        step: 7,
        action: 'Análisis estadístico',
        success: true,
        statistics: this.testResults.financialData.statistics.combined
      });

      return true;
    } catch (error) {
      console.error('❌ Error en análisis estadístico:', error.message);
      this.testResults.errors.push(`Análisis estadístico: ${error.message}`);
      return false;
    }
  }

  // ========================================
  // STEP 8: Generar Datos para Gráficas
  // ========================================
  generateChartData() {
    console.log('\n📊 STEP 8: Generando datos para gráficas...');
    
    try {
      const { memberships, onlineOrders, localSales, expenses } = this.testResults.financialData;
      
      // 1. Datos de Ingresos vs Gastos por categoría
      this.testResults.financialData.chartData.incomeVsExpenses = {
        labels: ['Membresías', 'Ventas Online', 'Ventas Locales', 'Gastos'],
        datasets: [
          {
            label: 'Ingresos',
            data: [memberships.total, onlineOrders.total, localSales.total, 0],
            backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#ef4444']
          },
          {
            label: 'Gastos',
            data: [0, 0, 0, expenses.total],
            backgroundColor: '#ef4444'
          }
        ]
      };
      
      // 2. Breakdown detallado de gastos por categoría
      const expenseLabels = [];
      const expenseData = [];
      const expenseColors = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6'];
      
      Object.entries(expenses.breakdown).forEach(([category, amount], index) => {
        if (amount > 0) {
          expenseLabels.push(this.formatCategoryName(category));
          expenseData.push(amount);
        }
      });
      
      this.testResults.financialData.chartData.categoryBreakdown = {
        labels: expenseLabels,
        datasets: [{
          label: 'Gastos por Categoría',
          data: expenseData,
          backgroundColor: expenseColors.slice(0, expenseData.length)
        }]
      };
      
      // 3. Tendencias temporales (agrupar por día)
      const dailyData = this.groupByDay([
        ...memberships.details,
        ...onlineOrders.details,
        ...localSales.details
      ], expenses.details);
      
      this.testResults.financialData.chartData.trends = {
        labels: dailyData.map(d => d.date),
        datasets: [
          {
            label: 'Ingresos Diarios',
            data: dailyData.map(d => d.income),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4
          },
          {
            label: 'Gastos Diarios',
            data: dailyData.map(d => d.expenses),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4
          },
          {
            label: 'Utilidad Diaria',
            data: dailyData.map(d => d.income - d.expenses),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4
          }
        ]
      };
      
      // 4. Comparación de métodos de pago (ingresos)
      const paymentMethods = {
        cash: memberships.breakdown.cash + localSales.breakdown.cash,
        card: memberships.breakdown.card,
        transfer: memberships.breakdown.transfer + localSales.breakdown.transfer,
        online: onlineOrders.total
      };
      
      this.testResults.financialData.chartData.paymentMethods = {
        labels: ['Efectivo', 'Tarjeta', 'Transferencia', 'Ventas Online'],
        datasets: [{
          label: 'Ingresos por Método de Pago',
          data: [paymentMethods.cash, paymentMethods.card, paymentMethods.transfer, paymentMethods.online],
          backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b']
        }]
      };
      
      console.log(`✅ Datos para gráficas generados exitosamente`);
      console.log(`   📈 Tendencias: ${dailyData.length} días de datos`);
      console.log(`   🎨 Categorías de gastos: ${expenseLabels.length}`);
      
      this.testResults.steps.push({
        step: 8,
        action: 'Generar datos para gráficas',
        success: true,
        chartsGenerated: 4
      });

      return true;
    } catch (error) {
      console.error('❌ Error generando datos de gráficas:', error.message);
      this.testResults.errors.push(`Gráficas: ${error.message}`);
      return false;
    }
  }

  // ========================================
  // HELPER: Funciones estadísticas
  // ========================================
  calculateStatistics(data, label = 'Dataset') {
    if (!data || data.length === 0) {
      return {
        count: 0,
        sum: 0,
        mean: 0,
        median: 0,
        mode: 0,
        min: 0,
        max: 0,
        range: 0,
        variance: 0,
        stdDev: 0,
        q1: 0,
        q3: 0,
        iqr: 0,
        cv: 0
      };
    }
    
    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length;
    
    const sum = data.reduce((acc, val) => acc + val, 0);
    const mean = sum / n;
    
    const median = n % 2 === 0 
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 
      : sorted[Math.floor(n / 2)];
    
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    const q1 = this.percentile(sorted, 25);
    const q3 = this.percentile(sorted, 75);
    const iqr = q3 - q1;
    
    const stats = {
      count: n,
      sum,
      mean,
      median,
      min: sorted[0],
      max: sorted[n - 1],
      range: sorted[n - 1] - sorted[0],
      variance,
      stdDev,
      q1,
      q3,
      iqr,
      cv: mean !== 0 ? (stdDev / mean) * 100 : 0 // Coeficiente de variación
    };
    
    console.log(`\n📊 Estadísticas de ${label}:`);
    console.log(`   Total: Q${sum.toFixed(2)}`);
    console.log(`   Media: Q${mean.toFixed(2)}`);
    console.log(`   Mediana: Q${median.toFixed(2)}`);
    console.log(`   Desv. Std: Q${stdDev.toFixed(2)}`);
    console.log(`   Rango: Q${sorted[0].toFixed(2)} - Q${sorted[n - 1].toFixed(2)}`);
    
    return stats;
  }

  mean(data) {
    return data.length > 0 ? data.reduce((a, b) => a + b, 0) / data.length : 0;
  }

  percentile(sortedData, p) {
    const index = (p / 100) * (sortedData.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    if (lower === upper) return sortedData[lower];
    return sortedData[lower] * (1 - weight) + sortedData[upper] * weight;
  }

  formatCategoryName(category) {
    const names = {
      rent: 'Alquiler',
      utilities: 'Servicios',
      equipment_purchase: 'Compra de Equipo',
      equipment_maintenance: 'Mantenimiento',
      staff_salary: 'Salarios',
      cleaning_supplies: 'Limpieza',
      marketing: 'Marketing',
      insurance: 'Seguros',
      taxes: 'Impuestos',
      other_expense: 'Otros'
    };
    return names[category] || category;
  }

  groupByDay(incomeDetails, expenseDetails) {
    const dailyMap = new Map();
    
    // Procesar ingresos
    incomeDetails.forEach(detail => {
      const date = new Date(detail.date).toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { date, income: 0, expenses: 0 });
      }
      dailyMap.get(date).income += detail.amount;
    });
    
    // Procesar gastos
    expenseDetails.forEach(detail => {
      const date = new Date(detail.date).toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { date, income: 0, expenses: 0 });
      }
      dailyMap.get(date).expenses += detail.amount;
    });
    
    return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  // ========================================
  // MÉTODO PRINCIPAL
  // ========================================
  async runCompleteFinancialTest() {
    console.log('💰 ==========================================');
    console.log('🏋️ ELITE FITNESS - ANÁLISIS FINANCIERO COMPLETO');
    console.log('💰 ==========================================');
    console.log(`🎯 Análisis integral de ingresos y gastos`);
    console.log(`🌐 API Base: ${this.baseURL}`);
    console.log(`📅 Fecha: ${new Date().toLocaleString('es-ES')}`);
    
    const startTime = Date.now();

    try {
      const steps = [
        { method: () => this.loginAdmin(), name: 'Autenticar Admin' },
        { method: () => this.getMembershipIncome(), name: 'Obtener Ingresos - Membresías' },
        { method: () => this.getOnlineOrdersIncome(), name: 'Obtener Ingresos - Ventas Online' },
        { method: () => this.getLocalSalesIncome(), name: 'Obtener Ingresos - Ventas Locales' },
        { method: () => this.getExpenses(), name: 'Obtener Gastos' },
        { method: () => this.calculateTotalsAndBalance(), name: 'Calcular Balance' },
        { method: () => this.performStatisticalAnalysis(), name: 'Análisis Estadístico' },
        { method: () => this.generateChartData(), name: 'Generar Datos para Gráficas' }
      ];

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        
        try {
          const success = await step.method();
          
          if (!success) {
            console.log(`⚠️ Step ${i + 1} tuvo advertencias - Continuando...`);
          }
          
        } catch (stepError) {
          console.error(`💥 Error en step ${i + 1}:`, stepError.message);
          this.testResults.errors.push(`Step ${i + 1}: ${stepError.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      this.testResults.success = this.testResults.errors.length === 0;
      
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      console.log('\n💰 ==========================================');
      if (this.testResults.success) {
        console.log('✅ ANÁLISIS COMPLETADO EXITOSAMENTE');
      } else {
        console.log('⚠️ ANÁLISIS COMPLETADO CON ADVERTENCIAS');
      }
      console.log('💰 ==========================================');
      console.log(`⏱️ Duración: ${duration}s`);
      console.log(`📊 Pasos ejecutados: ${steps.length}`);
      console.log(`⚠️ Errores: ${this.testResults.errors.length}`);
      
      return this.testResults;

    } catch (error) {
      console.error('\n💥 ERROR CRÍTICO EN TEST:', error.message);
      this.testResults.success = false;
      this.testResults.errors.push(`Error crítico: ${error.message}`);
      return this.testResults;
    }
  }
}

// ========================================
// FUNCIÓN PRINCIPAL
// ========================================
async function main() {
  const tester = new CompleteFinancialDashboardTest();
  const results = await tester.runCompleteFinancialTest();
  
  console.log('\n💾 Guardando resultados del análisis financiero...');
  const filename = `financial-analysis-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`✅ Resultados guardados en: ${filename}`);
  
  // Guardar datos para gráficas en archivo separado
  const chartFilename = `financial-charts-data-${Date.now()}.json`;
  fs.writeFileSync(chartFilename, JSON.stringify(results.financialData.chartData, null, 2));
  console.log(`📊 Datos para gráficas guardados en: ${chartFilename}`);
  
  console.log('\n🎯 RESUMEN EJECUTIVO:');
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`💰 Ingresos Totales:     Q${results.financialData.totalIncome.toFixed(2)}`);
  console.log(`💸 Gastos Totales:       Q${results.financialData.expenses.total.toFixed(2)}`);
  console.log(`${results.financialData.netProfit >= 0 ? '✅' : '❌'} Utilidad Neta:       Q${results.financialData.netProfit.toFixed(2)}`);
  console.log(`📊 Margen de Ganancia:   ${results.financialData.profitMargin.toFixed(2)}%`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  console.log('\n📈 DESGLOSE DE INGRESOS:');
  console.log(`   💳 Membresías:        Q${results.financialData.memberships.total.toFixed(2)} (${results.financialData.memberships.count} transacciones)`);
  console.log(`   🛒 Ventas Online:     Q${results.financialData.onlineOrders.total.toFixed(2)} (${results.financialData.onlineOrders.count} órdenes)`);
  console.log(`   🏪 Ventas Locales:    Q${results.financialData.localSales.total.toFixed(2)} (${results.financialData.localSales.count} ventas)`);
  
  console.log('\n💸 PRINCIPALES GASTOS:');
  const sortedExpenses = Object.entries(results.financialData.expenses.breakdown)
    .filter(([_, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  const formatter = new CompleteFinancialDashboardTest();
  sortedExpenses.forEach(([category, amount]) => {
    const percentage = (amount / results.financialData.expenses.total) * 100;
    console.log(`   ${formatter.formatCategoryName(category)}: Q${amount.toFixed(2)} (${percentage.toFixed(1)}%)`);
  });
  
  if (results.success) {
    console.log('\n🏆 ¡Análisis financiero completado con éxito!');
    console.log('📊 Todos los datos están listos para visualización');
  } else {
    console.log('\n⚠️ Análisis completado con algunas limitaciones');
    console.log(`❌ Errores encontrados: ${results.errors.length}`);
  }
  
  process.exit(results.success ? 0 : 1);
}

// ========================================
// EJECUTAR
// ========================================
if (require.main === module) {
  main().catch((error) => {
    console.error('\n💥 ERROR FATAL:', error);
    process.exit(1);
  });
}

module.exports = { CompleteFinancialDashboardTest, main };