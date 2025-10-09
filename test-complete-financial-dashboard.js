// test-complete-financial-dashboard.js - VERSIÓN FINAL CON GRÁFICAS COHERENTES
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000';

class CompleteFinancialDashboardTest {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.adminToken = null;
    this.adminUserId = null;
    
    this.testResults = {
      timestamp: new Date().toISOString(),
      testType: 'COMPLETE_FINANCIAL_ANALYSIS_WITH_BUSINESS_CHARTS',
      purpose: 'Análisis financiero completo con gráficas empresariales coherentes',
      steps: [],
      success: false,
      financialData: {
        memberships: { total: 0, count: 0, breakdown: {}, details: [] },
        onlineOrders: { total: 0, count: 0, breakdown: {}, details: [] },
        localSales: { total: 0, count: 0, breakdown: {}, details: [] },
        totalIncome: 0,
        expenses: { total: 0, count: 0, breakdown: {}, details: [] },
        netProfit: 0,
        profitMargin: 0,
        statistics: {
          income: {},
          expenses: {},
          combined: {}
        },
        chartData: {
          incomeVsExpenses: [],
          categoryBreakdown: [],
          trends: [],
          paymentMethods: []
        },
        businessCharts: {} // NUEVO: Gráficas empresariales coherentes
      },
      errors: []
    };
  }

  // ========================================
  // HELPER: Paginación automática
  // ========================================
  async fetchAllPaginated(endpoint, filterFn = null) {
    const allItems = [];
    let page = 1;
    const limit = 100;
    let hasMore = true;

    console.log(`   📥 Obteniendo datos paginados de ${endpoint}...`);

    while (hasMore) {
      try {
        const response = await this.makeRequest('GET', `${endpoint}?page=${page}&limit=${limit}`);
        
        if (response.data.success) {
          let items = [];
          let pagination = null;

          if (response.data.data.payments) {
            items = response.data.data.payments;
            pagination = response.data.data.pagination;
          } else if (response.data.data.orders) {
            items = response.data.data.orders;
            pagination = response.data.data.pagination;
          } else if (response.data.data.sales) {
            items = response.data.data.sales;
            pagination = response.data.data.pagination;
          } else if (Array.isArray(response.data.data)) {
            items = response.data.data;
            pagination = response.data.pagination;
          }

          const itemsToAdd = filterFn ? items.filter(filterFn) : items;
          allItems.push(...itemsToAdd);

          console.log(`   📄 Página ${page}: ${items.length} items (${itemsToAdd.length} después del filtro)`);

          if (pagination) {
            hasMore = page < pagination.pages;
          } else {
            hasMore = items.length === limit;
          }

          page++;
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error(`   ❌ Error en página ${page}:`, error.message);
        hasMore = false;
      }
    }

    console.log(`   ✅ Total obtenido: ${allItems.length} items`);
    return allItems;
  }

  // ========================================
  // STEP 1: Autenticación
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
          userId: this.adminUserId
        });
        
        return true;
      }
    } catch (error) {
      console.error('❌ Error en autenticación:', error.response?.data || error.message);
      this.testResults.errors.push(`Autenticación: ${error.message}`);
      return false;
    }
  }

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

      if (data) config.data = data;
      return await axios(config);
    } catch (error) {
      if (error.response?.status === 404 || error.response?.status === 403) {
        console.log(`⚠️ Endpoint no disponible: ${endpoint}`);
        return { data: { success: false, data: null } };
      }
      throw error;
    }
  }

  // ========================================
  // STEP 2: Membresías
  // ========================================
  async getMembershipIncome() {
    console.log('\n💳 STEP 2: Obteniendo ingresos por membresías...');
    
    try {
      const allPayments = await this.fetchAllPaginated(
        '/api/payments',
        (p) => (p.paymentType === 'membership' || p.referenceType === 'membership') && p.status === 'completed'
      );
      
      const total = allPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      
      const breakdown = { cash: 0, card: 0, transfer: 0, other: 0 };
      
      allPayments.forEach(payment => {
        const amount = parseFloat(payment.amount || 0);
        if (payment.paymentMethod === 'cash') breakdown.cash += amount;
        else if (payment.paymentMethod === 'card') breakdown.card += amount;
        else if (payment.paymentMethod === 'transfer') breakdown.transfer += amount;
        else breakdown.other += amount;
      });
      
      this.testResults.financialData.memberships = {
        total,
        count: allPayments.length,
        breakdown,
        details: allPayments.map(p => ({
          id: p.id,
          amount: parseFloat(p.amount || 0),
          method: p.paymentMethod,
          date: p.paymentDate,
          userId: p.userId,
          description: p.description
        }))
      };
      
      console.log(`✅ Membresías: Q${total.toFixed(2)} (${allPayments.length} pagos)`);
      console.log(`   💵 Efectivo: Q${breakdown.cash.toFixed(2)}`);
      console.log(`   💳 Tarjeta: Q${breakdown.card.toFixed(2)}`);
      console.log(`   🏦 Transferencia: Q${breakdown.transfer.toFixed(2)}`);

      this.testResults.steps.push({
        step: 2,
        action: 'Obtener ingresos por membresías',
        success: true,
        total: total,
        count: allPayments.length
      });

      return true;
    } catch (error) {
      console.error('❌ Error obteniendo membresías:', error.message);
      this.testResults.errors.push(`Membresías: ${error.message}`);
      return false;
    }
  }

  // ========================================
  // STEP 3: Ventas Online
  // ========================================
  async getOnlineOrdersIncome() {
    console.log('\n🛒 STEP 3: Obteniendo ingresos por ventas online...');
    
    try {
      const allOrders = await this.fetchAllPaginated(
        '/api/store/management/orders',
        (o) => o.status === 'delivered' || o.status === 'picked_up'
      );
      
      const total = allOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0);
      const breakdown = { pickup: 0, delivery: 0, express: 0 };
      
      allOrders.forEach(order => {
        const amount = parseFloat(order.totalAmount || 0);
        if (order.deliveryType === 'pickup') breakdown.pickup += amount;
        else if (order.deliveryType === 'delivery') breakdown.delivery += amount;
        else if (order.deliveryType === 'express') breakdown.express += amount;
      });
      
      this.testResults.financialData.onlineOrders = {
        total,
        count: allOrders.length,
        breakdown,
        details: allOrders.map(o => ({
          id: o.id,
          orderNumber: o.orderNumber,
          amount: parseFloat(o.totalAmount || 0),
          deliveryType: o.deliveryType,
          paymentMethod: o.paymentMethod,
          date: o.deliveryDate || o.createdAt,
          userId: o.userId
        }))
      };
      
      console.log(`✅ Ventas Online: Q${total.toFixed(2)} (${allOrders.length} órdenes)`);
      console.log(`   📦 Pickup: Q${breakdown.pickup.toFixed(2)}`);
      console.log(`   🚚 Delivery: Q${breakdown.delivery.toFixed(2)}`);
      console.log(`   ⚡ Express: Q${breakdown.express.toFixed(2)}`);

      this.testResults.steps.push({
        step: 3,
        action: 'Obtener ventas online',
        success: true,
        total: total,
        count: allOrders.length
      });

      return true;
    } catch (error) {
      console.error('❌ Error obteniendo ventas online:', error.message);
      this.testResults.errors.push(`Ventas online: ${error.message}`);
      return false;
    }
  }

  // ========================================
  // STEP 4: Ventas Locales
  // ========================================
  async getLocalSalesIncome() {
    console.log('\n🏪 STEP 4: Obteniendo ingresos por ventas locales...');
    
    try {
      const allSales = await this.fetchAllPaginated(
        '/api/local-sales',
        (s) => s.status === 'completed'
      );
      
      const total = allSales.reduce((sum, s) => sum + parseFloat(s.totalAmount || 0), 0);
      const breakdown = { cash: 0, transfer: 0 };
      
      allSales.forEach(sale => {
        const amount = parseFloat(sale.totalAmount || 0);
        if (sale.paymentMethod === 'cash') breakdown.cash += amount;
        else if (sale.paymentMethod === 'transfer') breakdown.transfer += amount;
      });
      
      this.testResults.financialData.localSales = {
        total,
        count: allSales.length,
        breakdown,
        details: allSales.map(s => ({
          id: s.id,
          saleNumber: s.saleNumber,
          amount: parseFloat(s.totalAmount || 0),
          paymentMethod: s.paymentMethod,
          date: s.createdAt,
          employeeId: s.employeeId,
          customerName: s.customer?.name || 'Cliente local'
        }))
      };
      
      console.log(`✅ Ventas Locales: Q${total.toFixed(2)} (${allSales.length} ventas)`);
      console.log(`   💵 Efectivo: Q${breakdown.cash.toFixed(2)}`);
      console.log(`   🏦 Transferencia: Q${breakdown.transfer.toFixed(2)}`);

      this.testResults.steps.push({
        step: 4,
        action: 'Obtener ventas locales',
        success: true,
        total: total,
        count: allSales.length
      });

      return true;
    } catch (error) {
      console.error('❌ Error obteniendo ventas locales:', error.message);
      this.testResults.errors.push(`Ventas locales: ${error.message}`);
      return false;
    }
  }

  // ========================================
  // STEP 5: Gastos
  // ========================================
  async getExpenses() {
    console.log('\n💸 STEP 5: Obteniendo gastos operativos...');
    
    try {
      const allExpenses = await this.fetchAllPaginated(
        '/api/expenses',
        (e) => e.status === 'paid' || e.status === 'approved'
      );
      
      const total = allExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      
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
      
      allExpenses.forEach(expense => {
        const amount = parseFloat(expense.amount || 0);
        if (breakdown.hasOwnProperty(expense.category)) {
          breakdown[expense.category] += amount;
        }
      });
      
      this.testResults.financialData.expenses = {
        total,
        count: allExpenses.length,
        breakdown,
        details: allExpenses.map(e => ({
          id: e.id,
          title: e.title,
          amount: parseFloat(e.amount || 0),
          category: e.category,
          date: e.expenseDate,
          vendor: e.vendor,
          status: e.status
        }))
      };
      
      console.log(`✅ Gastos: Q${total.toFixed(2)} (${allExpenses.length} gastos)`);
      console.log(`   🏢 Alquiler: Q${breakdown.rent.toFixed(2)}`);
      console.log(`   💡 Servicios: Q${breakdown.utilities.toFixed(2)}`);
      console.log(`   🏋️ Equipamiento: Q${(breakdown.equipment_purchase + breakdown.equipment_maintenance).toFixed(2)}`);
      console.log(`   👥 Salarios: Q${breakdown.staff_salary.toFixed(2)}`);

      this.testResults.steps.push({
        step: 5,
        action: 'Obtener gastos',
        success: true,
        total: total,
        count: allExpenses.length
      });

      return true;
    } catch (error) {
      console.error('❌ Error obteniendo gastos:', error.message);
      this.testResults.errors.push(`Gastos: ${error.message}`);
      return false;
    }
  }

  // ========================================
  // STEP 6: Calcular Totales
  // ========================================
  calculateTotalsAndBalance() {
    console.log('\n📊 STEP 6: Calculando totales y balance...');
    
    try {
      const { memberships, onlineOrders, localSales, expenses } = this.testResults.financialData;
      
      const totalIncome = memberships.total + onlineOrders.total + localSales.total;
      const netProfit = totalIncome - expenses.total;
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
  // STEP 7: Análisis Estadístico
  // ========================================
  performStatisticalAnalysis() {
    console.log('\n📈 STEP 7: Realizando análisis estadístico avanzado...');
    
    try {
      const { memberships, onlineOrders, localSales, expenses } = this.testResults.financialData;
      
      const incomeAmounts = [
        ...memberships.details.map(d => d.amount),
        ...onlineOrders.details.map(d => d.amount),
        ...localSales.details.map(d => d.amount)
      ];
      
      const expenseAmounts = expenses.details.map(d => d.amount);
      
      this.testResults.financialData.statistics.income = this.calculateStatistics(incomeAmounts, 'Ingresos');
      this.testResults.financialData.statistics.expenses = this.calculateStatistics(expenseAmounts, 'Gastos');
      
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

  calculateStatistics(data, label = 'Dataset') {
    if (!data || data.length === 0) {
      return {
        count: 0, sum: 0, mean: 0, median: 0, min: 0, max: 0,
        range: 0, variance: 0, stdDev: 0, q1: 0, q3: 0, iqr: 0, cv: 0
      };
    }
    
    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length;
    const sum = data.reduce((acc, val) => acc + val, 0);
    const mean = sum / n;
    const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const q1 = this.percentile(sorted, 25);
    const q3 = this.percentile(sorted, 75);
    const iqr = q3 - q1;
    
    console.log(`\n📊 Estadísticas de ${label}:`);
    console.log(`   Total: Q${sum.toFixed(2)}`);
    console.log(`   Media: Q${mean.toFixed(2)}`);
    console.log(`   Mediana: Q${median.toFixed(2)}`);
    
    return {
      count: n, sum, mean, median,
      min: sorted[0],
      max: sorted[n - 1],
      range: sorted[n - 1] - sorted[0],
      variance, stdDev, q1, q3, iqr,
      cv: mean !== 0 ? (stdDev / mean) * 100 : 0
    };
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

  // ========================================
  // STEP 8: Gráficas Básicas
  // ========================================
  generateChartData() {
    console.log('\n📊 STEP 8: Generando datos para gráficas básicas...');
    
    try {
      const { memberships, onlineOrders, localSales, expenses } = this.testResults.financialData;
      
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
            backgroundColor: 'rgba(16, 185, 129, 0.1)'
          },
          {
            label: 'Gastos Diarios',
            data: dailyData.map(d => d.expenses),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)'
          }
        ]
      };
      
      console.log(`✅ Gráficas básicas generadas`);
      
      this.testResults.steps.push({
        step: 8,
        action: 'Generar datos para gráficas básicas',
        success: true
      });

      return true;
    } catch (error) {
      console.error('❌ Error generando gráficas básicas:', error.message);
      this.testResults.errors.push(`Gráficas básicas: ${error.message}`);
      return false;
    }
  }

  groupByDay(incomeDetails, expenseDetails) {
    const dailyMap = new Map();
    
    incomeDetails.forEach(detail => {
      const date = new Date(detail.date).toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { date, income: 0, expenses: 0 });
      }
      dailyMap.get(date).income += detail.amount;
    });
    
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
  // STEP 9: GRÁFICAS FINANCIERAS COHERENTES
  // ========================================
  generateBusinessCharts() {
    console.log('\n💼 STEP 9: Generando gráficas financieras empresariales...');
    
    try {
      const { memberships, onlineOrders, localSales, expenses } = this.testResults.financialData;
      
      const dailyData = this.groupByDay([
        ...memberships.details,
        ...onlineOrders.details,
        ...localSales.details
      ], expenses.details);

      // 1. FLUJO DE CAJA
      console.log('   💰 Generando flujo de caja...');
      this.testResults.financialData.businessCharts.cashFlow = this.generateCashFlowChart(dailyData);

      // 2. COMPOSICIÓN DE INGRESOS
      console.log('   📊 Calculando composición de ingresos...');
      this.testResults.financialData.businessCharts.incomeComposition = this.generateIncomeCompositionChart(
        memberships, onlineOrders, localSales
      );

      // 3. COMPOSICIÓN DE GASTOS
      console.log('   💸 Analizando distribución de gastos...');
      this.testResults.financialData.businessCharts.expenseComposition = this.generateExpenseCompositionChart(expenses);

      // 4. COMPARATIVO MENSUAL
      console.log('   📅 Comparando resultados mensuales...');
      this.testResults.financialData.businessCharts.monthlyComparison = this.generateMonthlyComparisonChart(dailyData);

      // 5. MARGEN DE GANANCIA
      console.log('   📈 Calculando margen de ganancia...');
      this.testResults.financialData.businessCharts.profitMargin = this.generateProfitMarginChart(dailyData);

      // 6. MÉTODOS DE PAGO
      console.log('   💳 Analizando métodos de pago...');
      this.testResults.financialData.businessCharts.paymentMethods = this.generatePaymentMethodsChart(
        memberships, localSales
      );

      // 7. BURN RATE
      console.log('   🔥 Calculando burn rate...');
      this.testResults.financialData.businessCharts.burnRate = this.generateBurnRateChart(dailyData);

      // 8. PROYECCIÓN
      console.log('   🔮 Generando proyección...');
      this.testResults.financialData.businessCharts.forecast = this.generateForecastChart(dailyData, 30);

      // 9. DETECCIÓN DE ANOMALÍAS
      console.log('   🚨 Detectando anomalías...');
      const incomeAmounts = [
        ...memberships.details.map(d => d.amount),
        ...onlineOrders.details.map(d => d.amount),
        ...localSales.details.map(d => d.amount)
      ];
      const expenseAmounts = expenses.details.map(d => d.amount);
      this.testResults.financialData.businessCharts.anomalyDetection = this.generateAnomalyDetectionChart(
        incomeAmounts, expenseAmounts
      );

      console.log(`\n✅ Gráficas empresariales generadas exitosamente`);
      console.log(`   💰 Críticas: 5 (Cash Flow, Composición, Margen)`);
      console.log(`   📊 Importantes: 2 (Métodos Pago, Burn Rate)`);
      console.log(`   📈 Estratégicas: 2 (Proyección, Anomalías)`);
      
      this.testResults.steps.push({
        step: 9,
        action: 'Generar gráficas empresariales',
        success: true,
        chartsGenerated: 9
      });

      return true;
    } catch (error) {
      console.error('❌ Error generando gráficas empresariales:', error.message);
      this.testResults.errors.push(`Gráficas empresariales: ${error.message}`);
      return false;
    }
  }

  // === MÉTODOS DE GRÁFICAS EMPRESARIALES ===

  generateCashFlowChart(dailyData) {
    let cumulativeBalance = 0;
    const cashFlow = dailyData.map(day => {
      const netFlow = day.income - day.expenses;
      cumulativeBalance += netFlow;
      return {
        date: day.date,
        dailyIncome: day.income,
        dailyExpenses: day.expenses,
        dailyNet: netFlow,
        cumulativeBalance: cumulativeBalance
      };
    });

    return {
      type: 'line',
      title: 'Flujo de Caja Acumulado',
      subtitle: `Balance actual: Q${cumulativeBalance.toFixed(2)}`,
      data: {
        labels: cashFlow.map(d => d.date),
        datasets: [{
          label: 'Balance Acumulado',
          data: cashFlow.map(d => d.cumulativeBalance),
          borderColor: cumulativeBalance >= 0 ? '#10b981' : '#ef4444',
          backgroundColor: cumulativeBalance >= 0 
            ? 'rgba(16, 185, 129, 0.1)' 
            : 'rgba(239, 68, 68, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4
        }]
      },
      insights: {
        currentBalance: cumulativeBalance,
        trend: cumulativeBalance > 0 ? 'positivo' : 'negativo',
        avgDailyNet: cashFlow.reduce((sum, d) => sum + d.dailyNet, 0) / cashFlow.length
      }
    };
  }

  generateIncomeCompositionChart(memberships, onlineOrders, localSales) {
    const total = memberships.total + onlineOrders.total + localSales.total;
    if (total === 0) return null;

    return {
      type: 'pie',
      title: 'Composición de Ingresos',
      subtitle: `Total: Q${total.toFixed(2)}`,
      data: {
        labels: ['Membresías', 'Ventas Online', 'Ventas Locales'],
        datasets: [{
          data: [memberships.total, onlineOrders.total, localSales.total],
          backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      insights: {
        total,
        percentages: {
          memberships: ((memberships.total / total) * 100).toFixed(1),
          onlineOrders: ((onlineOrders.total / total) * 100).toFixed(1),
          localSales: ((localSales.total / total) * 100).toFixed(1)
        }
      }
    };
  }

  generateExpenseCompositionChart(expenses) {
    const validExpenses = Object.entries(expenses.breakdown)
      .filter(([_, amount]) => amount > 0)
      .sort((a, b) => b[1] - a[1]);

    if (validExpenses.length === 0) return null;

    const categoryNames = {
      rent: 'Alquiler', utilities: 'Servicios',
      equipment_purchase: 'Equipamiento', equipment_maintenance: 'Mantenimiento',
      staff_salary: 'Salarios', cleaning_supplies: 'Limpieza',
      marketing: 'Marketing', insurance: 'Seguros',
      taxes: 'Impuestos', other_expense: 'Otros'
    };

    return {
      type: 'doughnut',
      title: 'Distribución de Gastos',
      subtitle: `Total: Q${expenses.total.toFixed(2)}`,
      data: {
        labels: validExpenses.map(([cat]) => categoryNames[cat] || cat),
        datasets: [{
          data: validExpenses.map(([_, amount]) => amount),
          backgroundColor: ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6']
        }]
      },
      insights: {
        total: expenses.total,
        topExpenses: validExpenses.slice(0, 3).map(([cat, amount]) => ({
          category: categoryNames[cat] || cat,
          amount,
          percentage: ((amount / expenses.total) * 100).toFixed(1)
        }))
      }
    };
  }

  generateMonthlyComparisonChart(dailyData) {
    const monthlyData = new Map();

    dailyData.forEach(day => {
      const date = new Date(day.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { income: 0, expenses: 0, net: 0 });
      }
      
      const month = monthlyData.get(monthKey);
      month.income += day.income;
      month.expenses += day.expenses;
      month.net = month.income - month.expenses;
    });

    const months = Array.from(monthlyData.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    return {
      type: 'bar',
      title: 'Comparativo Mensual',
      subtitle: `Últimos ${months.length} meses`,
      data: {
        labels: months.map(([key]) => {
          const [year, month] = key.split('-');
          return `${monthNames[parseInt(month) - 1]} ${year}`;
        }),
        datasets: [
          { label: 'Ingresos', data: months.map(([_, data]) => data.income), backgroundColor: '#10b981' },
          { label: 'Gastos', data: months.map(([_, data]) => data.expenses), backgroundColor: '#ef4444' },
          { label: 'Utilidad Neta', data: months.map(([_, data]) => data.net), backgroundColor: '#3b82f6', type: 'line' }
        ]
      },
      insights: {
        avgMonthlyIncome: months.reduce((sum, [_, data]) => sum + data.income, 0) / months.length,
        avgMonthlyExpenses: months.reduce((sum, [_, data]) => sum + data.expenses, 0) / months.length
      }
    };
  }

  generateProfitMarginChart(dailyData) {
    const profitMargins = dailyData.map(day => ({
      date: day.date,
      margin: day.income > 0 ? ((day.income - day.expenses) / day.income) * 100 : 0,
      income: day.income,
      expenses: day.expenses
    }));

    const avgMargin = profitMargins.reduce((sum, d) => sum + d.margin, 0) / profitMargins.length;

    return {
      type: 'line',
      title: 'Margen de Ganancia',
      subtitle: `Promedio: ${avgMargin.toFixed(1)}%`,
      data: {
        labels: profitMargins.map(d => d.date),
        datasets: [{
          label: 'Margen de Ganancia (%)',
          data: profitMargins.map(d => d.margin),
          borderColor: avgMargin >= 30 ? '#10b981' : avgMargin >= 15 ? '#f59e0b' : '#ef4444',
          borderWidth: 2,
          fill: true
        }]
      },
      insights: {
        avgMargin,
        healthStatus: avgMargin >= 30 ? 'excelente' : avgMargin >= 15 ? 'saludable' : 'crítico'
      }
    };
  }

  generatePaymentMethodsChart(memberships, localSales) {
    const cash = memberships.breakdown.cash + localSales.breakdown.cash;
    const card = memberships.breakdown.card;
    const transfer = memberships.breakdown.transfer + localSales.breakdown.transfer;
    const total = cash + card + transfer;

    if (total === 0) return null;

    return {
      type: 'pie',
      title: 'Métodos de Pago Preferidos',
      subtitle: `Total procesado: Q${total.toFixed(2)}`,
      data: {
        labels: ['Efectivo', 'Tarjeta', 'Transferencia'],
        datasets: [{
          data: [cash, card, transfer],
          backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6']
        }]
      },
      insights: {
        percentages: {
          cash: ((cash / total) * 100).toFixed(1),
          card: ((card / total) * 100).toFixed(1),
          transfer: ((transfer / total) * 100).toFixed(1)
        }
      }
    };
  }

  generateBurnRateChart(dailyData) {
    const last30Days = dailyData.slice(-30);
    const avgDailyExpenses = last30Days.reduce((sum, d) => sum + d.expenses, 0) / 30;
    const avgDailyIncome = last30Days.reduce((sum, d) => sum + d.income, 0) / 30;
    const avgDailyNet = avgDailyIncome - avgDailyExpenses;

    return {
      type: 'bar',
      title: 'Análisis de Burn Rate',
      subtitle: `Gastos promedio diarios: Q${avgDailyExpenses.toFixed(2)}`,
      data: {
        labels: ['Ingresos Diarios', 'Gastos Diarios', 'Neto Diario'],
        datasets: [{
          label: 'Promedio últimos 30 días',
          data: [avgDailyIncome, avgDailyExpenses, avgDailyNet],
          backgroundColor: ['#10b981', '#ef4444', avgDailyNet >= 0 ? '#3b82f6' : '#f59e0b']
        }]
      },
      insights: { avgDailyExpenses, avgDailyIncome, avgDailyNet }
    };
  }

  generateForecastChart(dailyData, forecastDays = 30) {
    const last90Days = dailyData.slice(-90);
    const n = last90Days.length;
    
    if (n < 7) return null;

    const sumX = (n * (n - 1)) / 2;
    const sumY = last90Days.reduce((sum, d) => sum + d.income, 0);
    const sumXY = last90Days.reduce((sum, d, i) => sum + (i * d.income), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const forecast = [];
    for (let i = 0; i < forecastDays; i++) {
      const forecastValue = slope * (n + i) + intercept;
      const date = new Date();
      date.setDate(date.getDate() + i + 1);
      forecast.push({
        date: date.toISOString().split('T')[0],
        predicted: Math.max(0, forecastValue)
      });
    }

    return {
      type: 'line',
      title: 'Proyección de Ingresos',
      subtitle: `Próximos ${forecastDays} días`,
      data: {
        labels: [...last90Days.map(d => d.date), ...forecast.map(d => d.date)],
        datasets: [
          {
            label: 'Histórico',
            data: [...last90Days.map(d => d.income), ...Array(forecastDays).fill(null)],
            borderColor: '#10b981'
          },
          {
            label: 'Proyección',
            data: [...Array(90).fill(null), ...forecast.map(d => d.predicted)],
            borderColor: '#3b82f6',
            borderDash: [5, 5]
          }
        ]
      },
      insights: {
        trend: slope > 0 ? 'creciente' : slope < 0 ? 'decreciente' : 'estable'
      }
    };
  }

  generateAnomalyDetectionChart(incomeAmounts, expenseAmounts) {
    const sortedIncome = [...incomeAmounts].sort((a, b) => a - b);
    const sortedExpenses = [...expenseAmounts].sort((a, b) => a - b);

    const incomeQ1 = this.percentile(sortedIncome, 25);
    const incomeQ3 = this.percentile(sortedIncome, 75);
    const incomeIQR = incomeQ3 - incomeQ1;
    const incomeOutliers = sortedIncome.filter(v => 
      v < (incomeQ1 - 1.5 * incomeIQR) || v > (incomeQ3 + 1.5 * incomeIQR)
    );

    const expenseQ1 = this.percentile(sortedExpenses, 25);
    const expenseQ3 = this.percentile(sortedExpenses, 75);
    const expenseIQR = expenseQ3 - expenseQ1;
    const expenseOutliers = sortedExpenses.filter(v => 
      v < (expenseQ1 - 1.5 * expenseIQR) || v > (expenseQ3 + 1.5 * expenseIQR)
    );

    return {
      type: 'boxplot',
      title: 'Detección de Transacciones Inusuales',
      subtitle: `Outliers: ${incomeOutliers.length + expenseOutliers.length}`,
      data: {
        labels: ['Ingresos', 'Gastos'],
        datasets: [{
          label: 'Distribución',
          data: [
            {
              min: sortedIncome[0],
              q1: incomeQ1,
              median: this.percentile(sortedIncome, 50),
              q3: incomeQ3,
              max: sortedIncome[sortedIncome.length - 1],
              outliers: incomeOutliers
            },
            {
              min: sortedExpenses[0],
              q1: expenseQ1,
              median: this.percentile(sortedExpenses, 50),
              q3: expenseQ3,
              max: sortedExpenses[sortedExpenses.length - 1],
              outliers: expenseOutliers
            }
          ]
        }]
      },
      insights: {
        incomeOutliers: { count: incomeOutliers.length, values: incomeOutliers.slice(0, 5) },
        expenseOutliers: { count: expenseOutliers.length, values: expenseOutliers.slice(0, 5) }
      }
    };
  }

  // ========================================
  // MÉTODO PRINCIPAL
  // ========================================
  async runCompleteFinancialTest() {
    console.log('💰 ==========================================');
    console.log('🏋️ ELITE FITNESS - ANÁLISIS FINANCIERO COMPLETO');
    console.log('💰 ==========================================');
    console.log(`🎯 Análisis integral con gráficas empresariales`);
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
        { method: () => this.generateChartData(), name: 'Generar Datos Básicos' },
        { method: () => this.generateBusinessCharts(), name: 'Generar Gráficas Empresariales' }
      ];

      for (let i = 0; i < steps.length; i++) {
        try {
          await steps[i].method();
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
      console.log(this.testResults.success ? '✅ ANÁLISIS COMPLETADO EXITOSAMENTE' : '⚠️ ANÁLISIS COMPLETADO CON ADVERTENCIAS');
      console.log('💰 ==========================================');
      console.log(`⏱️ Duración: ${duration}s`);
      console.log(`📊 Pasos ejecutados: ${steps.length}`);
      console.log(`⚠️ Errores: ${this.testResults.errors.length}`);
      
      return this.testResults;

    } catch (error) {
      console.error('\n💥 ERROR CRÍTICO:', error.message);
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
  
  console.log('\n💾 Guardando resultados...');
  const filename = `financial-analysis-complete-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`✅ Resultados guardados en: ${filename}`);
  
  const chartFilename = `business-charts-${Date.now()}.json`;
  fs.writeFileSync(chartFilename, JSON.stringify(results.financialData.businessCharts, null, 2));
  console.log(`📊 Gráficas empresariales guardadas en: ${chartFilename}`);
  
  console.log('\n🎯 RESUMEN EJECUTIVO:');
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`💰 Ingresos Totales:     Q${results.financialData.totalIncome.toFixed(2)}`);
  console.log(`💸 Gastos Totales:       Q${results.financialData.expenses.total.toFixed(2)}`);
  console.log(`${results.financialData.netProfit >= 0 ? '✅' : '❌'} Utilidad Neta:       Q${results.financialData.netProfit.toFixed(2)}`);
  console.log(`📊 Margen de Ganancia:   ${results.financialData.profitMargin.toFixed(2)}%`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  console.log('\n📈 GRÁFICAS GENERADAS:');
  console.log(`   💰 Flujo de Caja (Cash Flow)`);
  console.log(`   📊 Composición de Ingresos`);
  console.log(`   💸 Distribución de Gastos`);
  console.log(`   📅 Comparativo Mensual`);
  console.log(`   📈 Margen de Ganancia`);
  console.log(`   💳 Métodos de Pago`);
  console.log(`   🔥 Burn Rate`);
  console.log(`   🔮 Proyección (30 días)`);
  console.log(`   🚨 Detección de Anomalías`);
  
  if (results.success) {
    console.log('\n🏆 ¡Análisis financiero completado con éxito!');
    console.log('📊 Todos los datos están listos para dashboard ejecutivo');
  } else {
    console.log('\n⚠️ Análisis completado con algunas limitaciones');
    console.log(`❌ Errores: ${results.errors.length}`);
  }
  
  process.exit(results.success ? 0 : 1);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('\n💥 ERROR FATAL:', error);
    process.exit(1);
  });
}

module.exports = { CompleteFinancialDashboardTest, main };