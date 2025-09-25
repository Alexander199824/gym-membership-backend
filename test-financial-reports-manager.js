// test-financial-reports-manager.js - GESTOR DE REPORTES FINANCIEROS v1.0
const axios = require('axios');
const readline = require('readline');
require('dotenv').config();

class FinancialReportsManager {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.adminToken = null;
    
    // Cache de datos
    this.financialData = null;
    this.employeePerformance = null;
    this.productReports = null;
    this.dailySalesReports = null;
    this.inventoryStats = null;
    
    // Configurar readline
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.log('📊 Elite Fitness Club - Gestor de Reportes Financieros v1.0');
    console.log('='.repeat(80));
    console.log('💰 REPORTES FINANCIEROS: Análisis completo por fechas');
    console.log('👥 PERFORMANCE EMPLEADOS: Métricas de ventas por vendedor');
    console.log('📦 REPORTES PRODUCTOS: Stock, rotación, rentabilidad');
    console.log('📈 VENTAS DIARIAS: Análisis detallado día por día\n');
    
    try {
      await this.loginAdmin();
      await this.showMainMenu();
      
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      if (error.response) {
        console.error('📋 Detalles:', {
          status: error.response.status,
          data: error.response.data,
          url: error.response.config?.url
        });
      }
    } finally {
      this.rl.close();
    }
  }

  // ✅ AUTENTICACIÓN
  async loginAdmin() {
    console.log('1. 🔐 Autenticando como administrador...');
    
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'admin@gym.com',
        password: 'Admin123!'
      });

      if (response.data.success && response.data.data.token) {
        this.adminToken = response.data.data.token;
        console.log('   ✅ Autenticación exitosa');
        console.log(`   👤 Usuario: ${response.data.data.user.firstName} ${response.data.data.user.lastName}`);
        console.log(`   🎭 Rol: ${response.data.data.user.role}`);
      } else {
        throw new Error('Respuesta de login inválida');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error(`Credenciales incorrectas. Verifica email y contraseña.`);
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error(`No se puede conectar al servidor en ${this.baseURL}. ¿Está ejecutándose?`);
      }
      throw new Error(`Autenticación falló: ${error.message}`);
    }
  }

  // ✅ MENÚ PRINCIPAL
  async showMainMenu() {
    console.log('\n📊 GESTOR DE REPORTES FINANCIEROS - MENÚ PRINCIPAL');
    console.log('=' .repeat(70));
    console.log('1. 💰 Reportes Financieros por Rango de Fechas');
    console.log('2. 👥 Performance de Empleados');
    console.log('3. 📦 Reportes de Productos y Stock');
    console.log('4. 📈 Reportes de Ventas Diarias');
    console.log('5. 📊 Dashboard Completo de Inventario');
    console.log('6. 🔍 Análisis Comparativo de Períodos');
    console.log('7. 📋 Reporte Ejecutivo Completo');
    console.log('8. 💾 Exportar Datos (Consola)');
    console.log('9. 🔄 Recargar Todos los Datos');
    console.log('0. 🚪 Salir');
    
    const choice = await this.askQuestion('\n📊 Selecciona una opción (0-9): ');
    
    switch (choice.trim()) {
      case '1':
        await this.showFinancialReports();
        break;
      case '2':
        await this.showEmployeePerformance();
        break;
      case '3':
        await this.showProductReports();
        break;
      case '4':
        await this.showDailySalesReports();
        break;
      case '5':
        await this.showInventoryDashboard();
        break;
      case '6':
        await this.showComparativeAnalysis();
        break;
      case '7':
        await this.showExecutiveReport();
        break;
      case '8':
        await this.exportData();
        break;
      case '9':
        await this.reloadAllData();
        break;
      case '0':
        console.log('\n👋 ¡Hasta luego!');
        return;
      default:
        console.log('\n❌ Opción inválida. Intenta de nuevo.');
    }
    
    await this.showMainMenu();
  }

  // ✅ 1. REPORTES FINANCIEROS POR RANGO DE FECHAS
  async showFinancialReports() {
    console.log('\n💰 REPORTES FINANCIEROS POR RANGO DE FECHAS');
    console.log('=' .repeat(70));
    console.log('1. Reporte del último mes');
    console.log('2. Reporte de los últimos 3 meses');
    console.log('3. Reporte del año actual');
    console.log('4. Rango personalizado');
    console.log('0. Volver');

    const choice = await this.askQuestion('\n💰 Selecciona período: ');
    
    let startDate, endDate;
    const now = new Date();

    switch (choice.trim()) {
      case '1':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case '2':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        endDate = now;
        break;
      case '3':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
        break;
      case '4':
        const startStr = await this.askQuestion('📅 Fecha inicio (YYYY-MM-DD): ');
        const endStr = await this.askQuestion('📅 Fecha fin (YYYY-MM-DD): ');
        if (!startStr || !endStr) {
          console.log('❌ Fechas inválidas');
          return;
        }
        startDate = new Date(startStr);
        endDate = new Date(endStr);
        break;
      case '0':
        return;
      default:
        console.log('❌ Opción inválida');
        return;
    }

    await this.generateFinancialReport(startDate, endDate);
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async generateFinancialReport(startDate, endDate) {
    console.log('\n💰 GENERANDO REPORTE FINANCIERO...');
    console.log(`📅 Período: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
    
    try {
      // Intentar obtener reporte financiero combinado
      const response = await axios.get(`${this.baseURL}/api/inventory/financial-report`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }
      });

      if (response.data.success) {
        this.financialData = response.data.data;
        this.displayFinancialReport();
      } else {
        console.log('❌ No se pudo obtener el reporte financiero');
      }
    } catch (error) {
      console.error('❌ Error obteniendo reporte financiero:', error.response?.status || error.message);
      
      // Fallback: obtener datos de rutas individuales
      await this.generateFallbackFinancialReport(startDate, endDate);
    }
  }

  displayFinancialReport() {
    if (!this.financialData) return;

    const data = this.financialData;
    
    console.log('\n💰 REPORTE FINANCIERO DETALLADO');
    console.log('='.repeat(50));

    // Ingresos
    if (data.revenue) {
      console.log('\n📈 INGRESOS:');
      console.log(`   💰 Total ingresos: Q${(data.revenue.total || 0).toFixed(2)}`);
      console.log(`   💵 Ventas en efectivo: Q${(data.revenue.cash || 0).toFixed(2)}`);
      console.log(`   🏦 Ventas por transferencia: Q${(data.revenue.transfer || 0).toFixed(2)}`);
      console.log(`   📦 Ventas de productos: Q${(data.revenue.products || 0).toFixed(2)}`);
      console.log(`   🏃 Membresías: Q${(data.revenue.memberships || 0).toFixed(2)}`);
    }

    // Ventas
    if (data.sales) {
      console.log('\n📊 VENTAS:');
      console.log(`   📊 Total transacciones: ${data.sales.totalTransactions || 0}`);
      console.log(`   💰 Ventas locales: ${data.sales.localSales || 0}`);
      console.log(`   📦 Órdenes online: ${data.sales.onlineOrders || 0}`);
      console.log(`   💰 Ticket promedio: Q${(data.sales.averageTicket || 0).toFixed(2)}`);
    }

    // Productos más vendidos
    if (data.topProducts && data.topProducts.length > 0) {
      console.log('\n🔥 PRODUCTOS MÁS VENDIDOS:');
      data.topProducts.slice(0, 5).forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name} - ${product.quantity} unidades - Q${(product.revenue || 0).toFixed(2)}`);
      });
    }

    // Análisis de rentabilidad
    if (data.profitability) {
      console.log('\n💎 RENTABILIDAD:');
      console.log(`   📈 Margen bruto: ${(data.profitability.grossMargin || 0).toFixed(2)}%`);
      console.log(`   💰 Utilidad estimada: Q${(data.profitability.estimatedProfit || 0).toFixed(2)}`);
    }
  }

  async generateFallbackFinancialReport(startDate, endDate) {
    console.log('\n📊 Generando reporte con datos individuales...');
    
    try {
      // Obtener estadísticas generales
      const statsResponse = await axios.get(`${this.baseURL}/api/inventory/stats`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }
      });

      if (statsResponse.data.success) {
        console.log('\n📊 ESTADÍSTICAS DEL PERÍODO');
        console.log('='.repeat(40));
        const stats = statsResponse.data.data;
        
        Object.keys(stats).forEach(key => {
          if (typeof stats[key] === 'number') {
            if (key.includes('amount') || key.includes('revenue') || key.includes('total')) {
              console.log(`   ${key}: Q${stats[key].toFixed(2)}`);
            } else {
              console.log(`   ${key}: ${stats[key]}`);
            }
          }
        });
      }
    } catch (error) {
      console.error('❌ Error en reporte fallback:', error.message);
    }
  }

  // ✅ 2. PERFORMANCE DE EMPLEADOS
  async showEmployeePerformance() {
    console.log('\n👥 PERFORMANCE DE EMPLEADOS');
    console.log('=' .repeat(60));
    
    // Solicitar período
    console.log('📅 Período para análisis:');
    console.log('1. Último mes');
    console.log('2. Últimos 3 meses');
    console.log('3. Año actual');
    console.log('4. Rango personalizado');

    const periodChoice = await this.askQuestion('\n👥 Selecciona período: ');
    
    let startDate, endDate;
    const now = new Date();

    switch (periodChoice.trim()) {
      case '1':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case '2':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        endDate = now;
        break;
      case '3':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
        break;
      case '4':
        const startStr = await this.askQuestion('📅 Fecha inicio (YYYY-MM-DD): ');
        const endStr = await this.askQuestion('📅 Fecha fin (YYYY-MM-DD): ');
        if (!startStr || !endStr) {
          console.log('❌ Fechas inválidas');
          return;
        }
        startDate = new Date(startStr);
        endDate = new Date(endStr);
        break;
      default:
        console.log('❌ Opción inválida');
        return;
    }

    await this.generateEmployeePerformanceReport(startDate, endDate);
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async generateEmployeePerformanceReport(startDate, endDate) {
    console.log('\n👥 GENERANDO REPORTE DE PERFORMANCE...');
    console.log(`📅 Período: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
    
    try {
      const response = await axios.get(`${this.baseURL}/api/inventory/employee-performance`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }
      });

      if (response.data.success) {
        this.employeePerformance = response.data.data;
        this.displayEmployeePerformance();
      } else {
        console.log('❌ No se pudo obtener el reporte de empleados');
      }
    } catch (error) {
      console.error('❌ Error obteniendo performance de empleados:', error.response?.status || error.message);
      
      // Fallback manual
      await this.generateFallbackEmployeeReport();
    }
  }

  displayEmployeePerformance() {
    if (!this.employeePerformance) return;

    const data = this.employeePerformance;
    
    console.log('\n👥 REPORTE DE PERFORMANCE DE EMPLEADOS');
    console.log('='.repeat(50));

    if (data.employees && Array.isArray(data.employees)) {
      data.employees.forEach((employee, index) => {
        console.log(`\n   ${index + 1}. 👤 ${employee.name || employee.firstName + ' ' + employee.lastName}`);
        console.log(`      💰 Total ventas: Q${(employee.totalSales || 0).toFixed(2)}`);
        console.log(`      📊 Número de ventas: ${employee.salesCount || 0}`);
        console.log(`      💳 Ticket promedio: Q${(employee.averageTicket || 0).toFixed(2)}`);
        console.log(`      🏆 Ranking: ${employee.ranking || index + 1}°`);
        
        if (employee.paymentMethods) {
          console.log(`      💵 Efectivo: Q${(employee.paymentMethods.cash || 0).toFixed(2)}`);
          console.log(`      🏦 Transferencias: Q${(employee.paymentMethods.transfer || 0).toFixed(2)}`);
        }
        
        if (employee.topProducts && employee.topProducts.length > 0) {
          console.log(`      🔥 Producto principal: ${employee.topProducts[0].name} (${employee.topProducts[0].quantity} unidades)`);
        }
      });
    }

    // Resumen general
    if (data.summary) {
      console.log('\n📊 RESUMEN GENERAL:');
      console.log(`   👥 Total empleados activos: ${data.summary.totalEmployees || 0}`);
      console.log(`   💰 Total ventas del equipo: Q${(data.summary.totalTeamSales || 0).toFixed(2)}`);
      console.log(`   📈 Promedio por empleado: Q${(data.summary.averagePerEmployee || 0).toFixed(2)}`);
      console.log(`   🏆 Mejor vendedor: ${data.summary.topPerformer || 'N/A'}`);
    }
  }

  async generateFallbackEmployeeReport() {
    console.log('\n📊 Generando reporte de empleados con datos disponibles...');
    
    try {
      // Intentar obtener datos de ventas locales para calcular performance
      const salesResponse = await axios.get(`${this.baseURL}/api/local-sales/`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { limit: 100 }
      });

      if (salesResponse.data.success && salesResponse.data.data.sales) {
        const sales = salesResponse.data.data.sales;
        const employeeStats = {};

        // Procesar ventas por empleado
        sales.forEach(sale => {
          const employeeName = sale.employee ? 
            `${sale.employee.firstName} ${sale.employee.lastName}` : 'Sin asignar';
          
          if (!employeeStats[employeeName]) {
            employeeStats[employeeName] = {
              name: employeeName,
              totalSales: 0,
              salesCount: 0,
              cash: 0,
              transfer: 0
            };
          }

          const amount = parseFloat(sale.totalAmount || 0);
          employeeStats[employeeName].totalSales += amount;
          employeeStats[employeeName].salesCount += 1;

          if (sale.paymentMethod === 'cash') {
            employeeStats[employeeName].cash += amount;
          } else {
            employeeStats[employeeName].transfer += amount;
          }
        });

        // Mostrar resultados
        console.log('\n👥 PERFORMANCE DE EMPLEADOS (DATOS LOCALES)');
        console.log('='.repeat(50));

        const sortedEmployees = Object.values(employeeStats)
          .sort((a, b) => b.totalSales - a.totalSales);

        sortedEmployees.forEach((employee, index) => {
          console.log(`\n   ${index + 1}. 👤 ${employee.name}`);
          console.log(`      💰 Total ventas: Q${employee.totalSales.toFixed(2)}`);
          console.log(`      📊 Número de ventas: ${employee.salesCount}`);
          console.log(`      💳 Ticket promedio: Q${(employee.totalSales / employee.salesCount).toFixed(2)}`);
          console.log(`      💵 Efectivo: Q${employee.cash.toFixed(2)}`);
          console.log(`      🏦 Transferencias: Q${employee.transfer.toFixed(2)}`);
        });
      }
    } catch (error) {
      console.error('❌ Error en reporte fallback de empleados:', error.message);
    }
  }

  // ✅ 3. REPORTES DE PRODUCTOS Y STOCK
  async showProductReports() {
    console.log('\n📦 REPORTES DE PRODUCTOS Y STOCK');
    console.log('=' .repeat(60));
    console.log('1. Productos con stock bajo');
    console.log('2. Productos más vendidos');
    console.log('3. Análisis de rotación de inventario');
    console.log('4. Valor total del inventario');
    console.log('5. Productos sin movimiento');
    console.log('0. Volver');

    const choice = await this.askQuestion('\n📦 Selecciona reporte: ');
    
    switch (choice.trim()) {
      case '1':
        await this.showLowStockReport();
        break;
      case '2':
        await this.showTopSellingProducts();
        break;
      case '3':
        await this.showInventoryRotation();
        break;
      case '4':
        await this.showInventoryValue();
        break;
      case '5':
        await this.showInactiveProducts();
        break;
      case '0':
        return;
      default:
        console.log('❌ Opción inválida');
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async showLowStockReport() {
    console.log('\n🟡 PRODUCTOS CON STOCK BAJO');
    console.log('='.repeat(40));
    
    try {
      const response = await axios.get(`${this.baseURL}/api/inventory/low-stock`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      if (response.data.success) {
        const products = response.data.data.products || response.data.data;
        
        if (Array.isArray(products) && products.length > 0) {
          products.forEach((product, index) => {
            console.log(`\n   ${index + 1}. 📦 ${product.name}`);
            console.log(`      🆔 SKU: ${product.sku}`);
            console.log(`      📊 Stock actual: ${product.stockQuantity || product.stock}`);
            console.log(`      ⚠️ Stock mínimo: ${product.minStock || 5}`);
            console.log(`      💰 Precio: Q${parseFloat(product.price || 0).toFixed(2)}`);
            console.log(`      💎 Valor en stock: Q${((product.stockQuantity || 0) * (product.price || 0)).toFixed(2)}`);
            console.log(`      📂 Categoría: ${product.category?.name || 'N/A'}`);
            
            // Urgencia
            const stockLevel = product.stockQuantity || product.stock || 0;
            const minStock = product.minStock || 5;
            if (stockLevel === 0) {
              console.log(`      🔴 URGENTE: SIN STOCK`);
            } else if (stockLevel <= minStock / 2) {
              console.log(`      🟠 CRÍTICO: Stock muy bajo`);
            } else {
              console.log(`      🟡 ALERTA: Stock bajo`);
            }
          });

          // Resumen
          const totalProducts = products.length;
          const totalValue = products.reduce((sum, p) => 
            sum + ((p.stockQuantity || 0) * (p.price || 0)), 0);
          const outOfStock = products.filter(p => (p.stockQuantity || 0) === 0).length;

          console.log('\n📊 RESUMEN STOCK BAJO:');
          console.log(`   📦 Total productos con stock bajo: ${totalProducts}`);
          console.log(`   🔴 Productos sin stock: ${outOfStock}`);
          console.log(`   💎 Valor total afectado: Q${totalValue.toFixed(2)}`);
        } else {
          console.log('✅ No hay productos con stock bajo');
        }
      } else {
        console.log('❌ No se pudo obtener el reporte de stock bajo');
      }
    } catch (error) {
      console.error('❌ Error obteniendo productos con stock bajo:', error.response?.status || error.message);
    }
  }

  async showTopSellingProducts() {
    console.log('\n🔥 PRODUCTOS MÁS VENDIDOS');
    console.log('='.repeat(40));
    
    const period = await this.askQuestion('📅 Período (últimos 30 días = Enter, o días): ') || '30';
    const days = parseInt(period);
    
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      // Intentar obtener datos de productos más vendidos
      const response = await axios.get(`${this.baseURL}/api/inventory/stats`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          includeTopProducts: true
        }
      });

      if (response.data.success && response.data.data.topProducts) {
        const products = response.data.data.topProducts;
        
        products.slice(0, 10).forEach((product, index) => {
          console.log(`\n   ${index + 1}. 🔥 ${product.name}`);
          console.log(`      🆔 SKU: ${product.sku || 'N/A'}`);
          console.log(`      📊 Unidades vendidas: ${product.totalSold || product.quantity}`);
          console.log(`      💰 Ingresos generados: Q${(product.revenue || product.total || 0).toFixed(2)}`);
          console.log(`      💳 Precio promedio: Q${(product.averagePrice || product.price || 0).toFixed(2)}`);
          console.log(`      📈 Participación en ventas: ${((product.salesPercentage || 0) * 100).toFixed(1)}%`);
        });
      } else {
        console.log('❌ No se encontraron datos de productos más vendidos');
      }
    } catch (error) {
      console.error('❌ Error obteniendo productos más vendidos:', error.message);
      
      // Fallback: mostrar información básica
      console.log('\n📊 Intentando obtener datos básicos de productos...');
      await this.showBasicProductStats();
    }
  }

  async showBasicProductStats() {
    try {
      const response = await axios.get(`${this.baseURL}/api/store/management/products/stats`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      if (response.data.success) {
        const stats = response.data.data;
        
        console.log('\n📊 ESTADÍSTICAS BÁSICAS DE PRODUCTOS:');
        console.log(`   📦 Total productos: ${stats.totalProducts || 0}`);
        console.log(`   ✅ Productos activos: ${stats.activeProducts || 0}`);
        console.log(`   ⭐ Productos destacados: ${stats.featuredProducts || 0}`);
        console.log(`   🔴 Sin stock: ${stats.outOfStock || 0}`);
        console.log(`   🟡 Stock bajo: ${stats.lowStock || 0}`);
        console.log(`   💰 Precio promedio: Q${(stats.averagePrice || 0).toFixed(2)}`);
      }
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas básicas:', error.message);
    }
  }

  async showInventoryRotation() {
    console.log('\n🔄 ANÁLISIS DE ROTACIÓN DE INVENTARIO');
    console.log('='.repeat(50));
    console.log('⚠️ Funcionalidad en desarrollo - Mostrando análisis básico\n');
    
    // Simulación de análisis de rotación
    try {
      const productsResponse = await axios.get(`${this.baseURL}/api/store/management/products`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { limit: 20, status: 'active' }
      });

      if (productsResponse.data.success && productsResponse.data.data.products) {
        const products = productsResponse.data.data.products;
        
        console.log('📊 ANÁLISIS BÁSICO DE ROTACIÓN:');
        
        // Categorizar por velocidad de rotación estimada
        const fastMoving = products.filter(p => (p.stockQuantity || 0) < 10);
        const slowMoving = products.filter(p => (p.stockQuantity || 0) > 50);
        const normalMoving = products.filter(p => 
          (p.stockQuantity || 0) >= 10 && (p.stockQuantity || 0) <= 50);

        console.log(`\n🚀 ROTACIÓN RÁPIDA (Stock < 10): ${fastMoving.length} productos`);
        fastMoving.slice(0, 5).forEach((product, index) => {
          console.log(`   ${index + 1}. ${product.name} - Stock: ${product.stockQuantity}`);
        });

        console.log(`\n🐌 ROTACIÓN LENTA (Stock > 50): ${slowMoving.length} productos`);
        slowMoving.slice(0, 5).forEach((product, index) => {
          console.log(`   ${index + 1}. ${product.name} - Stock: ${product.stockQuantity}`);
        });

        console.log(`\n⚖️ ROTACIÓN NORMAL (Stock 10-50): ${normalMoving.length} productos`);

        // Valor total por categoría
        const fastValue = fastMoving.reduce((sum, p) => sum + (p.stockQuantity * p.price), 0);
        const slowValue = slowMoving.reduce((sum, p) => sum + (p.stockQuantity * p.price), 0);
        
        console.log(`\n💰 VALOR POR CATEGORÍA:`);
        console.log(`   🚀 Rotación rápida: Q${fastValue.toFixed(2)}`);
        console.log(`   🐌 Rotación lenta: Q${slowValue.toFixed(2)}`);
      }
    } catch (error) {
      console.error('❌ Error en análisis de rotación:', error.message);
    }
  }

  async showInventoryValue() {
    console.log('\n💎 VALOR TOTAL DEL INVENTARIO');
    console.log('='.repeat(40));
    
    try {
      const response = await axios.get(`${this.baseURL}/api/store/management/products`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { limit: 500, status: 'active' }
      });

      if (response.data.success && response.data.data.products) {
        const products = response.data.data.products;
        
        let totalValue = 0;
        let totalUnits = 0;
        const categoryValues = {};

        products.forEach(product => {
          const stock = product.stockQuantity || 0;
          const price = parseFloat(product.price || 0);
          const value = stock * price;
          
          totalValue += value;
          totalUnits += stock;

          const categoryName = product.category?.name || 'Sin categoría';
          if (!categoryValues[categoryName]) {
            categoryValues[categoryName] = { value: 0, units: 0, products: 0 };
          }
          categoryValues[categoryName].value += value;
          categoryValues[categoryName].units += stock;
          categoryValues[categoryName].products += 1;
        });

        console.log('\n💎 VALOR TOTAL DEL INVENTARIO:');
        console.log(`   💰 Valor total: Q${totalValue.toFixed(2)}`);
        console.log(`   📦 Total unidades: ${totalUnits}`);
        console.log(`   📊 Total productos: ${products.length}`);
        console.log(`   💳 Valor promedio por producto: Q${(totalValue / products.length).toFixed(2)}`);

        console.log('\n📂 VALOR POR CATEGORÍA:');
        Object.keys(categoryValues)
          .sort((a, b) => categoryValues[b].value - categoryValues[a].value)
          .forEach((category, index) => {
            const cat = categoryValues[category];
            console.log(`   ${index + 1}. ${category}:`);
            console.log(`      💰 Valor: Q${cat.value.toFixed(2)} (${((cat.value / totalValue) * 100).toFixed(1)}%)`);
            console.log(`      📦 Unidades: ${cat.units}`);
            console.log(`      📊 Productos: ${cat.products}`);
          });
      }
    } catch (error) {
      console.error('❌ Error calculando valor del inventario:', error.message);
    }
  }

  async showInactiveProducts() {
    console.log('\n😴 PRODUCTOS SIN MOVIMIENTO RECIENTE');
    console.log('='.repeat(50));
    
    try {
      const response = await axios.get(`${this.baseURL}/api/store/management/products`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { limit: 100, featured: false }
      });

      if (response.data.success && response.data.data.products) {
        const products = response.data.data.products;
        
        // Filtrar productos que podrían tener poco movimiento
        const potentialInactive = products.filter(product => {
          const stock = product.stockQuantity || 0;
          const isFeatured = product.isFeatured;
          const hasHighStock = stock > 30;
          
          return !isFeatured && hasHighStock;
        });

        console.log(`\n📊 PRODUCTOS CON POTENCIAL BAJO MOVIMIENTO: ${potentialInactive.length}`);
        
        if (potentialInactive.length > 0) {
          potentialInactive.slice(0, 15).forEach((product, index) => {
            const value = product.stockQuantity * product.price;
            
            console.log(`\n   ${index + 1}. 😴 ${product.name}`);
            console.log(`      🆔 SKU: ${product.sku}`);
            console.log(`      📦 Stock: ${product.stockQuantity}`);
            console.log(`      💰 Precio: Q${parseFloat(product.price).toFixed(2)}`);
            console.log(`      💎 Valor inmovilizado: Q${value.toFixed(2)}`);
            console.log(`      📅 Creado: ${new Date(product.createdAt).toLocaleDateString()}`);
            console.log(`      📂 Categoría: ${product.category?.name || 'N/A'}`);
            
            // Días desde creación
            const daysSinceCreated = Math.floor(
              (new Date() - new Date(product.createdAt)) / (1000 * 60 * 60 * 24)
            );
            console.log(`      ⏱️ Días en inventario: ${daysSinceCreated}`);
          });

          // Resumen
          const totalInactiveValue = potentialInactive.reduce((sum, p) => 
            sum + (p.stockQuantity * p.price), 0);
          
          console.log(`\n📊 RESUMEN PRODUCTOS INACTIVOS:`);
          console.log(`   📦 Total productos: ${potentialInactive.length}`);
          console.log(`   💎 Valor total inmovilizado: Q${totalInactiveValue.toFixed(2)}`);
          console.log(`   💡 Recomendación: Considerar promociones o liquidación`);
        } else {
          console.log('✅ No se identificaron productos con bajo movimiento');
        }
      }
    } catch (error) {
      console.error('❌ Error obteniendo productos inactivos:', error.message);
    }
  }

  // ✅ 4. REPORTES DE VENTAS DIARIAS
  async showDailySalesReports() {
    console.log('\n📈 REPORTES DE VENTAS DIARIAS');
    console.log('=' .repeat(60));
    console.log('1. Reporte del día actual');
    console.log('2. Reporte de ayer');
    console.log('3. Reporte de fecha específica');
    console.log('4. Comparativo últimos 7 días');
    console.log('5. Tendencia mensual (día por día)');
    console.log('0. Volver');

    const choice = await this.askQuestion('\n📈 Selecciona reporte: ');
    
    switch (choice.trim()) {
      case '1':
        await this.showDailyReport(new Date());
        break;
      case '2':
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        await this.showDailyReport(yesterday);
        break;
      case '3':
        const dateStr = await this.askQuestion('📅 Fecha (YYYY-MM-DD): ');
        if (dateStr.trim()) {
          await this.showDailyReport(new Date(dateStr));
        }
        break;
      case '4':
        await this.showWeeklyComparison();
        break;
      case '5':
        await this.showMonthlyTrend();
        break;
      case '0':
        return;
      default:
        console.log('❌ Opción inválida');
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async showDailyReport(date) {
    const dateStr = date.toISOString().split('T')[0];
    console.log(`\n📈 REPORTE DE VENTAS DIARIAS - ${date.toLocaleDateString()}`);
    console.log('='.repeat(60));
    
    try {
      const response = await axios.get(`${this.baseURL}/api/local-sales/reports/daily`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { date: dateStr }
      });

      if (response.data.success) {
        const report = response.data.data;
        
        console.log('\n💰 RESUMEN DEL DÍA:');
        console.log(`   📊 Total ventas: ${report.totalSales || 0}`);
        console.log(`   ✅ Ventas completadas: ${report.completedSales || 0}`);
        console.log(`   ⏳ Ventas pendientes: ${report.pendingSales || 0}`);
        console.log(`   💰 Monto total: Q${(report.totalAmount || 0).toFixed(2)}`);
        
        console.log('\n💳 POR MÉTODO DE PAGO:');
        console.log(`   💵 Efectivo: Q${(report.cashAmount || 0).toFixed(2)}`);
        console.log(`   🏦 Transferencias: Q${(report.transferAmount || 0).toFixed(2)}`);
        console.log(`   ⏳ Pendiente confirmación: Q${(report.pendingAmount || 0).toFixed(2)}`);
        
        // Calcular porcentajes
        const totalConfirmed = (report.cashAmount || 0) + (report.transferAmount || 0);
        if (totalConfirmed > 0) {
          const cashPercentage = ((report.cashAmount || 0) / totalConfirmed * 100);
          const transferPercentage = ((report.transferAmount || 0) / totalConfirmed * 100);
          
          console.log('\n📊 DISTRIBUCIÓN DE PAGOS:');
          console.log(`   💵 Efectivo: ${cashPercentage.toFixed(1)}%`);
          console.log(`   🏦 Transferencias: ${transferPercentage.toFixed(1)}%`);
        }

        // Productos más vendidos del día
        if (report.topProducts && report.topProducts.length > 0) {
          console.log('\n🔥 PRODUCTOS MÁS VENDIDOS HOY:');
          report.topProducts.slice(0, 5).forEach((product, index) => {
            console.log(`   ${index + 1}. ${product.productName} - ${product.totalSold} unidades`);
          });
        }

        // Estadísticas por hora (si están disponibles)
        if (report.hourlyStats) {
          console.log('\n⏰ VENTAS POR HORA:');
          report.hourlyStats.forEach(hour => {
            console.log(`   ${hour.hour}:00 - Q${hour.amount.toFixed(2)} (${hour.sales} ventas)`);
          });
        }

      } else {
        console.log(`❌ No hay datos de ventas para ${date.toLocaleDateString()}`);
      }
    } catch (error) {
      console.error('❌ Error obteniendo reporte diario:', error.response?.status || error.message);
    }
  }

  async showWeeklyComparison() {
    console.log('\n📊 COMPARATIVO ÚLTIMOS 7 DÍAS');
    console.log('='.repeat(50));
    
    const reports = [];
    const promises = [];

    // Generar reportes para los últimos 7 días
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const promise = axios.get(`${this.baseURL}/api/local-sales/reports/daily`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { date: dateStr }
      }).then(response => ({
        date: date,
        dateStr: dateStr,
        data: response.data.success ? response.data.data : null
      })).catch(error => ({
        date: date,
        dateStr: dateStr,
        data: null,
        error: error.message
      }));

      promises.push(promise);
    }

    try {
      const results = await Promise.all(promises);
      
      console.log('\n📈 VENTAS POR DÍA (ÚLTIMOS 7 DÍAS):');
      results.reverse().forEach((result, index) => {
        const dayName = result.date.toLocaleDateString('es', { weekday: 'long' });
        const dateStr = result.date.toLocaleDateString();
        
        if (result.data) {
          const totalAmount = result.data.totalAmount || 0;
          const totalSales = result.data.totalSales || 0;
          const avgTicket = totalSales > 0 ? (totalAmount / totalSales) : 0;
          
          console.log(`   ${dayName} ${dateStr}:`);
          console.log(`     💰 Total: Q${totalAmount.toFixed(2)} (${totalSales} ventas)`);
          console.log(`     💳 Ticket promedio: Q${avgTicket.toFixed(2)}`);
        } else {
          console.log(`   ${dayName} ${dateStr}: Sin datos`);
        }
      });

      // Calcular promedios y totales
      const validReports = results.filter(r => r.data && r.data.totalAmount);
      if (validReports.length > 0) {
        const totalWeekAmount = validReports.reduce((sum, r) => sum + (r.data.totalAmount || 0), 0);
        const totalWeekSales = validReports.reduce((sum, r) => sum + (r.data.totalSales || 0), 0);
        const avgDailyAmount = totalWeekAmount / validReports.length;
        
        console.log('\n📊 RESUMEN SEMANAL:');
        console.log(`   💰 Total 7 días: Q${totalWeekAmount.toFixed(2)}`);
        console.log(`   📊 Total ventas: ${totalWeekSales}`);
        console.log(`   💳 Promedio diario: Q${avgDailyAmount.toFixed(2)}`);
        console.log(`   📈 Días con datos: ${validReports.length}/7`);
      }

    } catch (error) {
      console.error('❌ Error en comparativo semanal:', error.message);
    }
  }

  async showMonthlyTrend() {
    console.log('\n📈 TENDENCIA MENSUAL (ÚLTIMOS 30 DÍAS)');
    console.log('='.repeat(60));
    console.log('⚠️ Generando reporte extenso, esto puede tomar unos segundos...\n');
    
    const reports = [];
    const batchSize = 5; // Procesar de 5 en 5 para no sobrecargar

    try {
      // Procesar en lotes
      for (let batch = 0; batch < 6; batch++) {
        const promises = [];
        
        for (let i = batch * batchSize; i < (batch + 1) * batchSize && i < 30; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];

          const promise = axios.get(`${this.baseURL}/api/local-sales/reports/daily`, {
            headers: { 'Authorization': `Bearer ${this.adminToken}` },
            params: { date: dateStr }
          }).then(response => ({
            date: date,
            dateStr: dateStr,
            data: response.data.success ? response.data.data : null
          })).catch(error => ({
            date: date,
            dateStr: dateStr,
            data: null
          }));

          promises.push(promise);
        }

        const batchResults = await Promise.all(promises);
        reports.push(...batchResults);
        
        // Mostrar progreso
        console.log(`📊 Procesando lote ${batch + 1}/6...`);
      }

      // Organizar y mostrar resultados
      reports.sort((a, b) => b.date - a.date);
      
      console.log('\n📈 TENDENCIA DIARIA (ÚLTIMOS 30 DÍAS):');
      console.log('📅 Fecha        💰 Ventas    📊 Cantidad   💳 Ticket Prom.');
      console.log('-'.repeat(65));
      
      let totalAmount = 0;
      let totalSales = 0;
      let daysWithData = 0;
      
      reports.forEach(result => {
        const dateStr = result.date.toLocaleDateString();
        
        if (result.data && result.data.totalAmount > 0) {
          const amount = result.data.totalAmount;
          const salesCount = result.data.totalSales || 0;
          const avgTicket = salesCount > 0 ? (amount / salesCount) : 0;
          
          console.log(`${dateStr.padEnd(12)} Q${amount.toFixed(2).padStart(8)} ${salesCount.toString().padStart(8)} Q${avgTicket.toFixed(2).padStart(8)}`);
          
          totalAmount += amount;
          totalSales += salesCount;
          daysWithData++;
        } else {
          console.log(`${dateStr.padEnd(12)} ${'---'.padStart(8)} ${'---'.padStart(8)} ${'---'.padStart(8)}`);
        }
      });

      // Estadísticas del período
      if (daysWithData > 0) {
        const avgDailyAmount = totalAmount / daysWithData;
        const avgDailySales = totalSales / daysWithData;
        const avgTicket = totalSales > 0 ? (totalAmount / totalSales) : 0;
        
        console.log('\n📊 ESTADÍSTICAS DEL PERÍODO (30 DÍAS):');
        console.log(`   💰 Total ingresos: Q${totalAmount.toFixed(2)}`);
        console.log(`   📊 Total ventas: ${totalSales}`);
        console.log(`   💳 Ticket promedio general: Q${avgTicket.toFixed(2)}`);
        console.log(`   📈 Promedio diario: Q${avgDailyAmount.toFixed(2)}`);
        console.log(`   📊 Ventas promedio/día: ${avgDailySales.toFixed(1)}`);
        console.log(`   📅 Días con ventas: ${daysWithData}/30`);
        console.log(`   📈 Tasa de actividad: ${((daysWithData / 30) * 100).toFixed(1)}%`);
      }

    } catch (error) {
      console.error('❌ Error en tendencia mensual:', error.message);
    }
  }

  // ✅ 5. DASHBOARD COMPLETO DE INVENTARIO
  async showInventoryDashboard() {
    console.log('\n📊 DASHBOARD COMPLETO DE INVENTARIO');
    console.log('='.repeat(60));
    
    try {
      const response = await axios.get(`${this.baseURL}/api/inventory/dashboard`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      if (response.data.success) {
        const dashboard = response.data.data;
        
        console.log('\n🎛️ DASHBOARD PRINCIPAL:');
        
        // Estadísticas generales
        if (dashboard.summary) {
          console.log('\n📊 RESUMEN GENERAL:');
          Object.keys(dashboard.summary).forEach(key => {
            const value = dashboard.summary[key];
            if (typeof value === 'number') {
              if (key.includes('amount') || key.includes('revenue') || key.includes('value')) {
                console.log(`   ${key}: Q${value.toFixed(2)}`);
              } else {
                console.log(`   ${key}: ${value}`);
              }
            }
          });
        }

        // Alertas
        if (dashboard.alerts && dashboard.alerts.length > 0) {
          console.log('\n🚨 ALERTAS IMPORTANTES:');
          dashboard.alerts.forEach((alert, index) => {
            console.log(`   ${index + 1}. ${alert.type}: ${alert.message}`);
          });
        }

        // Métricas clave
        if (dashboard.metrics) {
          console.log('\n📈 MÉTRICAS CLAVE:');
          Object.keys(dashboard.metrics).forEach(key => {
            console.log(`   ${key}: ${dashboard.metrics[key]}`);
          });
        }

      } else {
        console.log('❌ No se pudo obtener el dashboard de inventario');
      }
    } catch (error) {
      console.error('❌ Error obteniendo dashboard:', error.response?.status || error.message);
      
      // Fallback: mostrar estadísticas básicas disponibles
      await this.showFallbackDashboard();
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async showFallbackDashboard() {
    console.log('\n📊 DASHBOARD BÁSICO (DATOS DISPONIBLES):');
    
    try {
      // Obtener estadísticas de productos
      const productsResponse = await axios.get(`${this.baseURL}/api/store/management/products/stats`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      if (productsResponse.data.success) {
        console.log('\n📦 PRODUCTOS:');
        const stats = productsResponse.data.data;
        Object.keys(stats).forEach(key => {
          const value = stats[key];
          if (typeof value === 'number') {
            console.log(`   ${key}: ${value}`);
          }
        });
      }

      // Obtener dashboard de tienda
      const storeResponse = await axios.get(`${this.baseURL}/api/store/management/dashboard`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      if (storeResponse.data.success) {
        console.log('\n🛒 TIENDA:');
        const storeStats = storeResponse.data.data;
        Object.keys(storeStats).forEach(key => {
          const value = storeStats[key];
          if (typeof value === 'number') {
            if (key.includes('revenue') || key.includes('Today')) {
              console.log(`   ${key}: Q${value.toFixed(2)}`);
            } else {
              console.log(`   ${key}: ${value}`);
            }
          }
        });
      }

    } catch (error) {
      console.error('❌ Error en dashboard fallback:', error.message);
    }
  }

  // ✅ FUNCIONES AUXILIARES

  async showComparativeAnalysis() {
    console.log('\n🔍 ANÁLISIS COMPARATIVO DE PERÍODOS');
    console.log('='.repeat(60));
    console.log('⚠️ Funcionalidad avanzada en desarrollo');
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async showExecutiveReport() {
    console.log('\n📋 REPORTE EJECUTIVO COMPLETO');
    console.log('='.repeat(50));
    console.log('📊 Generando reporte ejecutivo...\n');
    
    // Compilar datos de todas las fuentes
    console.log('💰 RESUMEN FINANCIERO:');
    if (this.financialData) {
      console.log('   ✅ Datos financieros disponibles');
    } else {
      console.log('   ⚠️ Ejecutar reporte financiero primero');
    }

    console.log('\n👥 PERFORMANCE DE EQUIPO:');
    if (this.employeePerformance) {
      console.log('   ✅ Datos de empleados disponibles');
    } else {
      console.log('   ⚠️ Ejecutar reporte de empleados primero');
    }

    console.log('\n📦 ESTADO DE INVENTARIO:');
    console.log('   ✅ Consulte el reporte de productos y stock');

    console.log('\n📈 TENDENCIAS DE VENTAS:');
    console.log('   ✅ Consulte los reportes de ventas diarias');

    console.log('\n💡 RECOMENDACIONES:');
    console.log('   1. Ejecutar todos los reportes para obtener datos completos');
    console.log('   2. Revisar productos con stock bajo regularmente');
    console.log('   3. Monitorear performance de empleados mensualmente');
    console.log('   4. Analizar tendencias de ventas semanalmente');

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async exportData() {
    console.log('\n💾 EXPORTAR DATOS A CONSOLA');
    console.log('='.repeat(40));
    console.log('1. Exportar datos financieros');
    console.log('2. Exportar performance de empleados');  
    console.log('3. Exportar datos de productos');
    console.log('4. Exportar todo (JSON)');
    console.log('0. Volver');

    const choice = await this.askQuestion('\n💾 Selecciona qué exportar: ');
    
    switch (choice.trim()) {
      case '1':
        console.log('\n📊 DATOS FINANCIEROS (JSON):');
        console.log(JSON.stringify(this.financialData, null, 2));
        break;
      case '2':
        console.log('\n👥 PERFORMANCE EMPLEADOS (JSON):');
        console.log(JSON.stringify(this.employeePerformance, null, 2));
        break;
      case '3':
        console.log('\n📦 DATOS DE PRODUCTOS (JSON):');
        console.log(JSON.stringify(this.productReports, null, 2));
        break;
      case '4':
        console.log('\n📋 TODOS LOS DATOS (JSON):');
        console.log(JSON.stringify({
          financial: this.financialData,
          employees: this.employeePerformance,
          products: this.productReports,
          inventory: this.inventoryStats,
          timestamp: new Date().toISOString()
        }, null, 2));
        break;
      case '0':
        return;
      default:
        console.log('❌ Opción inválida');
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async reloadAllData() {
    console.log('\n🔄 RECARGANDO TODOS LOS DATOS...');
    
    // Limpiar cache
    this.financialData = null;
    this.employeePerformance = null;
    this.productReports = null;
    this.dailySalesReports = null;
    this.inventoryStats = null;
    
    console.log('✅ Cache limpiado - Los datos se cargarán cuando los solicites');
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }
}

// ✅ FUNCIÓN DE AYUDA
function showHelp() {
  console.log('\n📊 Elite Fitness Club - Gestor de Reportes Financieros v1.0\n');
  
  console.log('🎯 CARACTERÍSTICAS:');
  console.log('  💰 Reportes financieros detallados por rango de fechas');
  console.log('  👥 Análisis de performance individual de empleados');
  console.log('  📦 Reportes completos de productos y gestión de stock');
  console.log('  📈 Análisis de ventas diarias con tendencias');
  console.log('  📊 Dashboard ejecutivo con métricas clave');
  console.log('  🔍 Análisis comparativo entre períodos\n');
  
  console.log('📋 REPORTES DISPONIBLES:');
  console.log('  ✅ Reportes financieros (mensual, trimestral, anual, personalizado)');
  console.log('  ✅ Performance de empleados (ventas, comisiones, rankings)');
  console.log('  ✅ Stock bajo, productos más vendidos, rotación de inventario');
  console.log('  ✅ Ventas diarias, tendencias semanales y mensuales');
  console.log('  ✅ Dashboard ejecutivo con alertas y métricas');
  console.log('  ✅ Análisis de valor de inventario por categorías\n');
  
  console.log('🔧 RUTAS UTILIZADAS:');
  console.log('  /api/inventory/financial-report - Reportes financieros');
  console.log('  /api/inventory/employee-performance - Performance empleados');
  console.log('  /api/inventory/low-stock - Productos con stock bajo');
  console.log('  /api/local-sales/reports/daily - Reportes de ventas diarias');
  console.log('  /api/inventory/dashboard - Dashboard principal\n');
  
  console.log('🚀 USO:');
  console.log('  node test-financial-reports-manager.js        # Gestor interactivo');
  console.log('  node test-financial-reports-manager.js --help # Esta ayuda\n');
  
  console.log('📋 REQUISITOS:');
  console.log('  • Servidor corriendo en puerto 5000');
  console.log('  • Usuario admin: admin@gym.com / Admin123!');
  console.log('  • Rutas de inventario y reportes configuradas');
  console.log('  • Base de datos con historial de ventas\n');
  
  console.log('💡 El gestor proporciona análisis financiero completo');
  console.log('   para toma de decisiones ejecutivas y operativas.');
}

// ✅ FUNCIÓN PRINCIPAL
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const manager = new FinancialReportsManager();
  await manager.start();
}

// ✅ EJECUTAR
if (require.main === module) {
  main().catch(error => {
    console.error('\n🚨 ERROR CRÍTICO:', error.message);
    process.exit(1);
  });
}

module.exports = { FinancialReportsManager };