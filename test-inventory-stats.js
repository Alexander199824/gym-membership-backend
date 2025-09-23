// test-inventory-stats.js - Test completo para estadísticas de inventario
const axios = require('axios');

class InventoryStatsTestRunner {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.adminToken = null;
    this.collaboratorToken = null;
    this.testResults = {
      generalStats: false,
      dashboard: false,
      financialReport: false,
      lowStockReport: false,
      dailySalesReport: false,
      employeePerformance: false,
      recentSales: false
    };
  }

  async runCompleteTest() {
    console.log('📊 ELITE FITNESS CLUB - TEST COMPLETO DE ESTADÍSTICAS DE INVENTARIO');
    console.log('=' .repeat(80));
    
    try {
      await this.checkServer();
      await this.loginUsers();
      
      // Ejecutar todas las pruebas de estadísticas
      await this.testGeneralStats();
      await this.testDashboard();
      await this.testFinancialReport();
      await this.testLowStockReport();
      await this.testDailySalesReport();
      await this.testEmployeePerformance();
      await this.testRecentSales();
      
      await this.showTestResults();
      console.log('\n✅ ¡Test de estadísticas completado exitosamente!');
      
    } catch (error) {
      console.error('\n❌ Error en el test:', error.message);
      if (error.response) {
        console.error('📋 Detalles del error:', error.response.data);
      }
      process.exit(1);
    }
  }

  async checkServer() {
    console.log('\n1. 🏥 Verificando servidor...');
    
    try {
      const response = await axios.get(`${this.baseURL}/api/health`);
      if (response.data.success) {
        console.log('   ✅ Servidor funcionando');
        console.log(`   📊 Versión: ${response.data.version}`);
      }
    } catch (error) {
      throw new Error(`Servidor no responde: ${error.message}`);
    }
  }

  async loginUsers() {
    console.log('\n2. 🔐 Iniciando sesiones...');
    
    // Login como administrador
    try {
      const adminResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'admin@gym.com',
        password: 'Admin123!'
      });

      if (adminResponse.data.success && adminResponse.data.data.token) {
        this.adminToken = adminResponse.data.data.token;
        console.log('   ✅ Login admin exitoso');
        console.log(`   👤 Admin: ${adminResponse.data.data.user.firstName} ${adminResponse.data.data.user.lastName}`);
      }
    } catch (error) {
      throw new Error(`Login admin falló: ${error.message}`);
    }

    // Intentar login como colaborador (opcional)
    try {
      const collabResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'colaborador@gym.com',
        password: 'Colaborador123!'
      });

      if (collabResponse.data.success && collabResponse.data.data.token) {
        this.collaboratorToken = collabResponse.data.data.token;
        console.log('   ✅ Login colaborador exitoso');
      }
    } catch (error) {
      console.log('   ⚠️ No se pudo hacer login como colaborador (opcional)');
    }
  }

  async testGeneralStats() {
    console.log('\n3. 📊 PROBANDO ESTADÍSTICAS GENERALES DEL INVENTARIO');
    console.log('=' .repeat(60));
    
    try {
      const response = await axios.get(`${this.baseURL}/api/inventory/stats`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { period: 'month' }
      });

      if (response.data.success) {
        const stats = response.data.data;
        
        console.log('   🏢 INFORMACIÓN GENERAL DEL INVENTARIO:');
        console.log(`   📦 Total de productos: ${stats.inventory?.totalProducts || 'N/A'}`);
        console.log(`   ⚠️ Productos con stock bajo: ${stats.inventory?.lowStockProducts || 'N/A'}`);
        console.log(`   🚫 Productos sin stock: ${stats.inventory?.outOfStockProducts || 'N/A'}`);
        console.log(`   💰 Valor total del inventario: Q${stats.inventory?.totalValue?.toFixed(2) || 'N/A'}`);
        
        console.log('\n   💼 DATOS DE VENTAS:');
        console.log(`   📅 Período analizado: ${stats.sales?.period || 'N/A'}`);
        if (stats.sales?.data && stats.sales.data.length > 0) {
          const totalRevenue = stats.sales.data.reduce((sum, day) => sum + (day.totalRevenue || 0), 0);
          const totalOrders = stats.sales.data.reduce((sum, day) => sum + (day.totalOrders || 0), 0);
          console.log(`   💵 Ingresos del período: Q${totalRevenue.toFixed(2)}`);
          console.log(`   📊 Total de órdenes/ventas: ${totalOrders}`);
          console.log(`   📈 Días con datos: ${stats.sales.data.length}`);
        }
        
        console.log('\n   🏆 PRODUCTOS MÁS VENDIDOS:');
        if (stats.products?.topSelling && stats.products.topSelling.length > 0) {
          stats.products.topSelling.slice(0, 5).forEach((product, index) => {
            console.log(`   ${index + 1}. ${product.productName} - ${product.totalSold} unidades - Q${product.totalRevenue?.toFixed(2) || 'N/A'}`);
          });
        } else {
          console.log('   📝 No hay datos de productos más vendidos');
        }
        
        console.log('\n   🚨 ALERTAS:');
        console.log(`   📦 Transferencias pendientes: ${stats.alerts?.pendingTransfers?.total || 'N/A'}`);
        console.log(`     - Online: ${stats.alerts?.pendingTransfers?.online || 'N/A'}`);
        console.log(`     - Local: ${stats.alerts?.pendingTransfers?.local || 'N/A'}`);
        console.log(`   ⚠️ Productos con stock bajo: ${stats.alerts?.lowStockProducts || 'N/A'}`);
        
        console.log('\n   📂 ESTADÍSTICAS POR CATEGORÍA:');
        if (stats.categories && stats.categories.length > 0) {
          stats.categories.slice(0, 3).forEach(category => {
            console.log(`   📁 ${category.name}: ${category.productCount} productos - Q${category.categoryValue?.toFixed(2) || 'N/A'} valor`);
          });
        }

        this.testResults.generalStats = true;
        console.log('\n   ✅ ESTADÍSTICAS GENERALES: EXITOSAS');
        
      } else {
        console.log('   ❌ Respuesta inválida del servidor');
      }
    } catch (error) {
      console.log(`   ❌ Error obteniendo estadísticas generales: ${error.message}`);
    }
  }

  async testDashboard() {
    console.log('\n4. 🏠 PROBANDO DASHBOARD PRINCIPAL');
    console.log('=' .repeat(60));
    
    try {
      const response = await axios.get(`${this.baseURL}/api/inventory/dashboard`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      if (response.data.success) {
        const dashboard = response.data.data;
        
        console.log('   📅 RESUMEN DE HOY:');
        if (dashboard.today) {
          console.log(`   💰 Ingresos online hoy: Q${dashboard.today.onlineRevenue?.toFixed(2) || '0.00'}`);
          console.log(`   🛒 Órdenes online hoy: ${dashboard.today.onlineOrders || 0}`);
          console.log(`   💵 Ingresos locales hoy: Q${dashboard.today.localRevenue?.toFixed(2) || '0.00'}`);
          console.log(`   🏪 Ventas locales hoy: ${dashboard.today.localSales || 0}`);
        }
        
        console.log('\n   📊 RESUMEN DEL MES:');
        if (dashboard.thisMonth) {
          console.log(`   💰 Ingresos online del mes: Q${dashboard.thisMonth.onlineRevenue?.toFixed(2) || '0.00'}`);
          console.log(`   🛒 Órdenes online del mes: ${dashboard.thisMonth.onlineOrders || 0}`);
          console.log(`   💵 Ingresos locales del mes: Q${dashboard.thisMonth.localRevenue?.toFixed(2) || '0.00'}`);
          console.log(`   🏪 Ventas locales del mes: ${dashboard.thisMonth.localSales || 0}`);
        }
        
        console.log('\n   🚨 ACCIONES PENDIENTES:');
        if (dashboard.pending) {
          console.log(`   📋 Transferencias pendientes: ${dashboard.pending.pendingTransfers || 0}`);
          console.log(`   ⚠️ Productos con stock bajo: ${dashboard.pending.lowStockProducts || 0}`);
          console.log(`   📦 Órdenes pendientes: ${dashboard.pending.pendingOrders || 0}`);
        }

        this.testResults.dashboard = true;
        console.log('\n   ✅ DASHBOARD PRINCIPAL: EXITOSO');
        
      } else {
        console.log('   ❌ Respuesta inválida del dashboard');
      }
    } catch (error) {
      console.log(`   ❌ Error obteniendo dashboard: ${error.message}`);
    }
  }

  async testFinancialReport() {
    console.log('\n5. 💰 PROBANDO REPORTE FINANCIERO');
    console.log('=' .repeat(60));
    
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const response = await axios.get(`${this.baseURL}/api/inventory/financial-report`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { startDate, endDate }
      });

      if (response.data.success) {
        const report = response.data.data;
        
        console.log(`   📅 PERÍODO: ${report.period?.startDate} a ${report.period?.endDate}`);
        
        console.log('\n   💵 INGRESOS TOTALES:');
        console.log(`   🛒 Ventas online: Q${report.revenue?.online?.toFixed(2) || '0.00'}`);
        console.log(`   🏪 Ventas locales: Q${report.revenue?.local?.toFixed(2) || '0.00'}`);
        console.log(`   💰 Total ingresos: Q${report.revenue?.total?.toFixed(2) || '0.00'}`);
        
        console.log('\n   📊 MOVIMIENTOS FINANCIEROS:');
        if (report.movements) {
          console.log(`   📈 Ingresos: ${report.movements.income?.count || 0} movimientos - Q${report.movements.income?.total?.toFixed(2) || '0.00'}`);
          console.log(`   📉 Gastos: ${report.movements.expense?.count || 0} movimientos - Q${report.movements.expense?.total?.toFixed(2) || '0.00'}`);
          console.log(`   💎 Ingreso neto: Q${report.netIncome?.toFixed(2) || '0.00'}`);
        }
        
        console.log('\n   💳 MÉTODOS DE PAGO:');
        if (report.paymentMethods) {
          Object.entries(report.paymentMethods).forEach(([method, data]) => {
            console.log(`   💰 ${method}: ${data.count || 0} transacciones - Q${data.total?.toFixed(2) || '0.00'}`);
          });
        }

        this.testResults.financialReport = true;
        console.log('\n   ✅ REPORTE FINANCIERO: EXITOSO');
        
      } else {
        console.log('   ❌ Respuesta inválida del reporte financiero');
      }
    } catch (error) {
      console.log(`   ❌ Error obteniendo reporte financiero: ${error.message}`);
    }
  }

  async testLowStockReport() {
    console.log('\n6. ⚠️ PROBANDO REPORTE DE STOCK BAJO');
    console.log('=' .repeat(60));
    
    try {
      const response = await axios.get(`${this.baseURL}/api/inventory/low-stock`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      if (response.data.success) {
        const report = response.data.data;
        
        console.log('   📊 RESUMEN DE STOCK CRÍTICO:');
        if (report.summary) {
          console.log(`   📦 Total productos con stock bajo: ${report.summary.totalProducts || 0}`);
          console.log(`   🚫 Sin stock: ${report.summary.outOfStock || 0}`);
          console.log(`   🔴 Urgencia crítica: ${report.summary.critical || 0}`);
          console.log(`   🟠 Urgencia alta: ${report.summary.high || 0}`);
          console.log(`   🟡 Urgencia media: ${report.summary.medium || 0}`);
        }
        
        console.log('\n   🚨 PRODUCTOS CON STOCK CRÍTICO:');
        if (report.products && report.products.length > 0) {
          report.products.slice(0, 10).forEach((product, index) => {
            const urgencyIcon = product.urgency === 'critical' ? '🔴' : 
                               product.urgency === 'high' ? '🟠' : '🟡';
            console.log(`   ${index + 1}. ${urgencyIcon} ${product.name}`);
            console.log(`      📦 Stock actual: ${product.currentStock} | Mínimo: ${product.minStock} | Faltante: ${product.shortage || 0}`);
            console.log(`      🏷️ SKU: ${product.sku} | 📂 Categoría: ${product.category}`);
            console.log(`      💰 Precio: Q${product.price?.toFixed(2) || 'N/A'}`);
          });
        } else {
          console.log('   🎉 ¡No hay productos con stock bajo!');
        }

        this.testResults.lowStockReport = true;
        console.log('\n   ✅ REPORTE DE STOCK BAJO: EXITOSO');
        
      } else {
        console.log('   ❌ Respuesta inválida del reporte de stock bajo');
      }
    } catch (error) {
      console.log(`   ❌ Error obteniendo reporte de stock bajo: ${error.message}`);
    }
  }

  async testDailySalesReport() {
    console.log('\n7. 🏪 PROBANDO REPORTE DIARIO DE VENTAS LOCALES');
    console.log('=' .repeat(60));
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const response = await axios.get(`${this.baseURL}/api/local-sales/reports/daily`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { date: today }
      });

      if (response.data.success) {
        const report = response.data.data;
        
        console.log(`   📅 REPORTE DEL DÍA: ${today}`);
        
        console.log('\n   💰 RESUMEN DE VENTAS:');
        console.log(`   🛒 Total ventas: ${report.sales?.count || 0}`);
        console.log(`   💵 Ingresos totales: Q${report.sales?.revenue?.toFixed(2) || '0.00'}`);
        console.log(`   💸 Descuentos aplicados: Q${report.sales?.discounts?.toFixed(2) || '0.00'}`);
        console.log(`   🧾 Impuestos: Q${report.sales?.taxes?.toFixed(2) || '0.00'}`);
        
        console.log('\n   💳 MÉTODOS DE PAGO:');
        console.log(`   💵 Efectivo: ${report.paymentMethods?.cash?.count || 0} ventas - Q${report.paymentMethods?.cash?.amount?.toFixed(2) || '0.00'}`);
        console.log(`   🏦 Transferencia: ${report.paymentMethods?.transfer?.count || 0} ventas - Q${report.paymentMethods?.transfer?.amount?.toFixed(2) || '0.00'}`);
        
        console.log('\n   📊 ESTADÍSTICAS:');
        console.log(`   📦 Productos vendidos: ${report.stats?.totalItems || 0} unidades`);
        console.log(`   💰 Venta promedio: Q${report.stats?.averageSale?.toFixed(2) || '0.00'}`);
        console.log(`   🏆 Venta más alta: Q${report.stats?.highestSale?.toFixed(2) || '0.00'}`);
        
        console.log('\n   🚨 TRANSFERENCIAS PENDIENTES:');
        console.log(`   ⏳ Pendientes hoy: ${report.pendingTransfers || 0}`);
        
        if (report.topProducts && report.topProducts.length > 0) {
          console.log('\n   🏆 PRODUCTOS MÁS VENDIDOS HOY:');
          report.topProducts.slice(0, 5).forEach((product, index) => {
            console.log(`   ${index + 1}. ${product.productName}: ${product.totalSold} unidades`);
          });
        }

        this.testResults.dailySalesReport = true;
        console.log('\n   ✅ REPORTE DIARIO DE VENTAS: EXITOSO');
        
      } else {
        console.log('   ❌ Respuesta inválida del reporte diario');
      }
    } catch (error) {
      console.log(`   ❌ Error obteniendo reporte diario: ${error.message}`);
    }
  }

  async testEmployeePerformance() {
    console.log('\n8. 👥 PROBANDO PERFORMANCE DE EMPLEADOS');
    console.log('=' .repeat(60));
    
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const response = await axios.get(`${this.baseURL}/api/inventory/employee-performance`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { startDate, endDate }
      });

      if (response.data.success) {
        const performance = response.data.data;
        
        console.log(`   📅 PERÍODO ANALIZADO: ${performance.period?.startDate} a ${performance.period?.endDate}`);
        
        if (performance.employees && performance.employees.length > 0) {
          console.log('\n   🏆 RANKING DE EMPLEADOS:');
          performance.employees.forEach((emp, index) => {
            console.log(`   ${index + 1}. 👤 ${emp.employee?.name || 'N/A'} (${emp.employee?.role || 'N/A'})`);
            console.log(`      💰 Ingresos generados: Q${emp.sales?.revenue?.toFixed(2) || '0.00'}`);
            console.log(`      🛒 Total ventas: ${emp.sales?.total || 0}`);
            console.log(`      📊 Venta promedio: Q${emp.sales?.average?.toFixed(2) || '0.00'}`);
            console.log(`      💵 Ventas en efectivo: ${emp.sales?.cash || 0}`);
            console.log(`      🏦 Ventas por transferencia: ${emp.sales?.transfer || 0}`);
            console.log(`      ⏳ Transferencias pendientes: ${emp.sales?.pending || 0}`);
            console.log('');
          });
        } else {
          console.log('   📝 No hay datos de performance de empleados en este período');
        }

        this.testResults.employeePerformance = true;
        console.log('   ✅ PERFORMANCE DE EMPLEADOS: EXITOSA');
        
      } else {
        console.log('   ❌ Respuesta inválida de performance de empleados');
      }
    } catch (error) {
      console.log(`   ❌ Error obteniendo performance de empleados: ${error.message}`);
    }
  }

  async testRecentSales() {
    console.log('\n9. 🔄 PROBANDO VENTAS LOCALES RECIENTES');
    console.log('=' .repeat(60));
    
    try {
      const response = await axios.get(`${this.baseURL}/api/local-sales/`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { 
          page: 1, 
          limit: 10,
          sortBy: 'createdAt',
          sortOrder: 'DESC'
        }
      });

      if (response.data.success) {
        const salesData = response.data.data;
        
        console.log('   📊 INFORMACIÓN DE PAGINACIÓN:');
        if (salesData.pagination) {
          console.log(`   📄 Página: ${salesData.pagination.page} de ${salesData.pagination.pages}`);
          console.log(`   📦 Total ventas: ${salesData.pagination.total}`);
          console.log(`   📋 Límite por página: ${salesData.pagination.limit}`);
        }
        
        if (salesData.sales && salesData.sales.length > 0) {
          console.log('\n   🛒 VENTAS LOCALES RECIENTES:');
          salesData.sales.forEach((sale, index) => {
            const statusIcon = sale.status === 'completed' ? '✅' : 
                              sale.status === 'transfer_pending' ? '⏳' : '❓';
            const paymentIcon = sale.paymentMethod === 'cash' ? '💵' : '🏦';
            
            console.log(`   ${index + 1}. ${statusIcon} ${paymentIcon} Venta #${sale.saleNumber || sale.id}`);
            console.log(`      💰 Total: Q${sale.totalAmount?.toFixed(2) || 'N/A'}`);
            console.log(`      📅 Fecha: ${new Date(sale.createdAt).toLocaleDateString('es-GT')}`);
            console.log(`      👤 Empleado: ${sale.employee?.name || 'N/A'}`);
            console.log(`      📦 Productos: ${sale.itemsCount || 0} artículos`);
            console.log(`      🏷️ Estado: ${sale.status || 'N/A'}`);
            
            if (sale.customer) {
              console.log(`      👥 Cliente: ${sale.customer.name || 'Cliente anónimo'}`);
            }
            
            if (sale.hoursWaiting && sale.status === 'transfer_pending') {
              console.log(`      ⏰ Esperando: ${sale.hoursWaiting} horas`);
            }
            console.log('');
          });
        } else {
          console.log('   📝 No hay ventas locales registradas');
        }

        this.testResults.recentSales = true;
        console.log('   ✅ VENTAS LOCALES RECIENTES: EXITOSAS');
        
      } else {
        console.log('   ❌ Respuesta inválida de ventas recientes');
      }
    } catch (error) {
      console.log(`   ❌ Error obteniendo ventas recientes: ${error.message}`);
    }
  }

  async showTestResults() {
    console.log('\n📊 RESUMEN DE RESULTADOS DEL TEST');
    console.log('=' .repeat(80));
    
    const results = this.testResults;
    const total = Object.keys(results).length;
    const passed = Object.values(results).filter(Boolean).length;
    
    console.log(`📈 Tests exitosos: ${passed}/${total}`);
    console.log(`🎯 Porcentaje de éxito: ${((passed / total) * 100).toFixed(1)}%`);
    console.log('');
    
    // Mostrar resultados detallados
    console.log('📋 DETALLES POR MÓDULO:');
    console.log(`📊 Estadísticas generales: ${results.generalStats ? '✅ EXITOSO' : '❌ FALLÓ'}`);
    console.log(`🏠 Dashboard principal: ${results.dashboard ? '✅ EXITOSO' : '❌ FALLÓ'}`);
    console.log(`💰 Reporte financiero: ${results.financialReport ? '✅ EXITOSO' : '❌ FALLÓ'}`);
    console.log(`⚠️ Reporte stock bajo: ${results.lowStockReport ? '✅ EXITOSO' : '❌ FALLÓ'}`);
    console.log(`🏪 Reporte diario ventas: ${results.dailySalesReport ? '✅ EXITOSO' : '❌ FALLÓ'}`);
    console.log(`👥 Performance empleados: ${results.employeePerformance ? '✅ EXITOSO' : '❌ FALLÓ'}`);
    console.log(`🔄 Ventas recientes: ${results.recentSales ? '✅ EXITOSO' : '❌ FALLÓ'}`);
    
    if (passed === total) {
      console.log('\n🎉 ¡TODOS LOS MÓDULOS DE ESTADÍSTICAS FUNCIONAN CORRECTAMENTE!');
      console.log('   ✅ El sistema de inventario está completamente operativo');
      console.log('   ✅ Los reportes financieros están disponibles');
      console.log('   ✅ Las alertas de stock funcionan correctamente');
      console.log('   ✅ El seguimiento de ventas está activo');
    } else {
      console.log('\n⚠️ ALGUNOS MÓDULOS NECESITAN ATENCIÓN');
      console.log('   💡 Verifica que todos los servicios estén ejecutándose');
      console.log('   💡 Revisa que haya datos de prueba en la base de datos');
      console.log('   💡 Confirma que los usuarios tengan los permisos correctos');
    }
    
    console.log('\n💡 DATOS IMPORTANTES VERIFICADOS:');
    console.log('   📦 Inventario general (productos, stock, valor)');
    console.log('   💰 Métricas financieras (ingresos, gastos, métodos pago)');
    console.log('   🚨 Alertas críticas (stock bajo, transferencias pendientes)');
    console.log('   👥 Performance de empleados en ventas locales');
    console.log('   📊 Reportes diarios y estadísticas operativas');
  }

  // Método para mostrar ayuda
  showHelp() {
    console.log('\n📊 Elite Fitness Club - Test de Estadísticas de Inventario\n');
    console.log('Este test verifica todos los endpoints de estadísticas e inventario:\n');
    
    console.log('🔍 MÓDULOS VERIFICADOS:');
    console.log('   📊 Estadísticas generales del inventario');
    console.log('   🏠 Dashboard principal con resúmenes');
    console.log('   💰 Reportes financieros combinados');
    console.log('   ⚠️ Productos con stock crítico');
    console.log('   🏪 Ventas locales diarias');
    console.log('   👥 Performance de empleados');
    console.log('   🔄 Ventas recientes y tendencias\n');
    
    console.log('📋 ENDPOINTS PROBADOS:');
    console.log('   GET /api/inventory/stats');
    console.log('   GET /api/inventory/dashboard');
    console.log('   GET /api/inventory/financial-report');
    console.log('   GET /api/inventory/low-stock');
    console.log('   GET /api/inventory/employee-performance');
    console.log('   GET /api/local-sales/reports/daily');
    console.log('   GET /api/local-sales/\n');
    
    console.log('⚡ REQUISITOS:');
    console.log('   🔐 Usuario admin configurado (admin@gym.com)');
    console.log('   🗄️ Base de datos con datos de prueba');
    console.log('   🏃 Servidor ejecutándose en puerto 5000');
  }
}

// Función para mostrar ayuda
function showHelp() {
  const tester = new InventoryStatsTestRunner();
  tester.showHelp();
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const tester = new InventoryStatsTestRunner();
  
  try {
    await tester.runCompleteTest();
    
  } catch (error) {
    console.error('\n💡 POSIBLES SOLUCIONES:');
    
    if (error.message.includes('Servidor no responde')) {
      console.error('   1. Verifica que tu servidor esté ejecutándose: npm start');
      console.error('   2. Confirma que el puerto 5000 esté disponible');
    } else if (error.message.includes('Login admin falló')) {
      console.error('   1. Verifica que el usuario admin existe en la BD');
      console.error('   2. Confirma las credenciales: admin@gym.com / Admin123!');
    } else if (error.message.includes('forbidden') || error.message.includes('403')) {
      console.error('   1. Verifica que el usuario tenga permisos de staff/admin');
      console.error('   2. Revisa la configuración de roles en la BD');
    } else if (error.message.includes('not found') || error.message.includes('404')) {
      console.error('   1. Confirma que las rutas de inventario estén registradas');
      console.error('   2. Verifica que el servidor tenga las rutas correctas');
    }
    
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { InventoryStatsTestRunner };