// test-inventory-diagnostic.js - Diagnóstico detallado de problemas
const axios = require('axios');

class InventoryDiagnosticTester {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.adminToken = null;
  }

  async runDiagnostic() {
    console.log('🔍 ELITE FITNESS CLUB - DIAGNÓSTICO DETALLADO DE INVENTARIO');
    console.log('=' .repeat(80));
    
    try {
      await this.loginAdmin();
      await this.checkAllRoutes();
      await this.checkMiddleware();
      await this.checkDatabase();
      await this.showRecommendations();
      
    } catch (error) {
      console.error('\n❌ Error crítico:', error.message);
      process.exit(1);
    }
  }

  async loginAdmin() {
    console.log('\n🔐 Iniciando sesión admin...');
    
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'admin@gym.com',
        password: 'Admin123!'
      });

      if (response.data.success && response.data.data.token) {
        this.adminToken = response.data.data.token;
        console.log('   ✅ Login exitoso');
        console.log(`   👤 Usuario: ${response.data.data.user.firstName} - Rol: ${response.data.data.user.role}`);
        
        // Verificar permisos
        if (['admin', 'colaborador'].includes(response.data.data.user.role)) {
          console.log('   ✅ Usuario tiene permisos de staff');
        } else {
          console.log('   ⚠️ Usuario podría no tener permisos suficientes');
        }
      }
    } catch (error) {
      throw new Error(`Login falló: ${error.message}`);
    }
  }

  async checkAllRoutes() {
    console.log('\n🛣️ VERIFICANDO RUTAS Y ENDPOINTS');
    console.log('=' .repeat(60));

    const routesToCheck = [
      {
        name: 'Estadísticas Generales',
        method: 'GET',
        url: '/api/inventory/stats',
        expectedController: 'InventoryStatsController.getInventoryStats'
      },
      {
        name: 'Dashboard Principal', 
        method: 'GET',
        url: '/api/inventory/dashboard',
        expectedController: 'InventoryStatsController.getDashboard'
      },
      {
        name: 'Reporte Financiero',
        method: 'GET', 
        url: '/api/inventory/financial-report',
        expectedController: 'InventoryStatsController.getFinancialReport'
      },
      {
        name: 'Stock Bajo',
        method: 'GET',
        url: '/api/inventory/low-stock', 
        expectedController: 'InventoryStatsController.getLowStockReport'
      },
      {
        name: 'Performance Empleados',
        method: 'GET',
        url: '/api/inventory/employee-performance',
        expectedController: 'InventoryStatsController.getEmployeePerformance'
      },
      {
        name: 'Ventas Locales',
        method: 'GET',
        url: '/api/local-sales/',
        expectedController: 'LocalSalesController.getSales'
      },
      {
        name: 'Reporte Diario',
        method: 'GET', 
        url: '/api/local-sales/reports/daily',
        expectedController: 'LocalSalesController.getDailyReport'
      }
    ];

    for (const route of routesToCheck) {
      await this.checkSingleRoute(route);
    }
  }

  async checkSingleRoute(route) {
    console.log(`\n📍 ${route.name}`);
    console.log(`   🛣️ Ruta: ${route.method} ${route.url}`);
    console.log(`   🎯 Controlador esperado: ${route.expectedController}`);
    
    try {
      const response = await axios({
        method: route.method.toLowerCase(),
        url: `${this.baseURL}${route.url}`,
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: route.url.includes('financial-report') || route.url.includes('employee-performance') ? {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        } : undefined,
        timeout: 5000
      });

      if (response.data.success) {
        console.log('   ✅ FUNCIONANDO CORRECTAMENTE');
        console.log(`   📊 Datos: ${JSON.stringify(response.data.data).substring(0, 100)}...`);
      } else {
        console.log('   ⚠️ Respuesta sin success flag');
        console.log(`   📋 Respuesta: ${JSON.stringify(response.data)}`);
      }
      
    } catch (error) {
      console.log('   ❌ ERROR DETECTADO');
      
      if (error.response) {
        console.log(`   📊 Status: ${error.response.status} ${error.response.statusText}`);
        console.log(`   📋 Error del servidor: ${JSON.stringify(error.response.data, null, 2)}`);
        
        // Diagnóstico específico por tipo de error
        switch (error.response.status) {
          case 404:
            console.log('   🔧 SOLUCIÓN: Esta ruta no está registrada en el servidor');
            console.log('   📝 Verifica que esté en app.js: app.use("/api/inventory", inventoryRoutes)');
            break;
          case 403:
            console.log('   🔧 SOLUCIÓN: Problemas de permisos');
            console.log('   📝 Verifica middleware de autorización');
            break;
          case 500:
            console.log('   🔧 SOLUCIÓN: Error interno del servidor');
            console.log('   📝 Revisa logs del servidor para el stack trace');
            console.log('   📝 Verifica que el controlador existe y está importado');
            break;
        }
      } else if (error.code === 'ECONNREFUSED') {
        console.log('   🔧 SOLUCIÓN: Servidor no está ejecutándose');
      } else {
        console.log(`   📋 Error: ${error.message}`);
      }
    }
  }

  async checkMiddleware() {
    console.log('\n🛡️ VERIFICANDO MIDDLEWARE Y PERMISOS');
    console.log('=' .repeat(60));

    // Verificar token
    console.log('\n🔐 Verificando token de autorización...');
    if (this.adminToken) {
      try {
        // Decodificar el token para ver su contenido
        const tokenParts = this.adminToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          console.log('   ✅ Token válido y decodificable');
          console.log(`   👤 Usuario ID: ${payload.id || payload.userId || 'No encontrado'}`);
          console.log(`   🏷️ Rol: ${payload.role || 'No especificado'}`);
          console.log(`   ⏰ Expira: ${payload.exp ? new Date(payload.exp * 1000).toLocaleString() : 'No especificado'}`);
        }
      } catch (error) {
        console.log('   ⚠️ No se pudo decodificar el token');
      }
    }

    // Verificar rutas de inventario directamente
    console.log('\n📁 Verificando registro de rutas...');
    try {
      // Intentar acceso directo sin autenticación para verificar si las rutas existen
      const testRoutes = [
        '/api/inventory/stats',
        '/api/inventory/dashboard', 
        '/api/local-sales/'
      ];

      for (const route of testRoutes) {
        try {
          await axios.get(`${this.baseURL}${route}`, { timeout: 2000 });
          console.log(`   ✅ ${route} - Ruta registrada (debería dar 401 sin auth)`);
        } catch (error) {
          if (error.response && error.response.status === 401) {
            console.log(`   ✅ ${route} - Ruta registrada (401 sin auth es correcto)`);
          } else if (error.response && error.response.status === 403) {
            console.log(`   ✅ ${route} - Ruta registrada (403 sin permisos es correcto)`);
          } else if (error.response && error.response.status === 404) {
            console.log(`   ❌ ${route} - Ruta NO registrada (404)`);
          } else {
            console.log(`   ⚠️ ${route} - Estado: ${error.response?.status || 'Sin respuesta'}`);
          }
        }
      }
    } catch (error) {
      console.log(`   ❌ Error verificando rutas: ${error.message}`);
    }
  }

  async checkDatabase() {
    console.log('\n🗄️ VERIFICANDO BASE DE DATOS Y DATOS');
    console.log('=' .repeat(60));

    // Verificar algunos endpoints básicos que deberían funcionar
    console.log('\n📊 Verificando datos básicos...');
    
    try {
      // Intentar obtener stats del low-stock que sabemos que funciona
      const lowStockResponse = await axios.get(`${this.baseURL}/api/inventory/low-stock`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      if (lowStockResponse.data.success) {
        console.log('   ✅ Conexión a BD funcional (low-stock responde)');
        console.log(`   📦 Productos en BD: ${lowStockResponse.data.data.summary?.totalProducts || 0}`);
      }
    } catch (error) {
      console.log('   ❌ Problemas de conexión a BD');
    }

    // Verificar modelos requeridos
    console.log('\n🏗️ Modelos requeridos para inventario:');
    const requiredModels = [
      'StoreProduct - Productos de la tienda',
      'StoreCategory - Categorías',
      'StoreBrand - Marcas', 
      'StoreOrder - Órdenes online',
      'StoreOrderItem - Items de órdenes',
      'LocalSale - Ventas locales',
      'LocalSaleItem - Items de ventas locales',
      'FinancialMovements - Movimientos financieros',
      'User - Usuarios/Empleados'
    ];

    requiredModels.forEach(model => {
      console.log(`   📋 ${model}`);
    });
  }

  async showRecommendations() {
    console.log('\n💡 RECOMENDACIONES DE SOLUCIÓN');
    console.log('=' .repeat(60));

    console.log('\n🔧 PASOS PARA RESOLVER LOS ERRORES:');
    
    console.log('\n1️⃣ VERIFICAR RUTAS EN app.js:');
    console.log('   📝 Agrega estas líneas en tu app.js:');
    console.log('```javascript');
    console.log('const inventoryStatsRoutes = require("./routes/inventoryStats");');
    console.log('const localSalesRoutes = require("./routes/localSales");');
    console.log('');
    console.log('app.use("/api/inventory", inventoryStatsRoutes);');
    console.log('app.use("/api/local-sales", localSalesRoutes);');
    console.log('```');

    console.log('\n2️⃣ VERIFICAR CONTROLADORES:');
    console.log('   📁 Confirma que existen:');
    console.log('      - src/controllers/InventoryStatsController.js');
    console.log('      - src/controllers/LocalSalesController.js');

    console.log('\n3️⃣ VERIFICAR MODELOS:');
    console.log('   📁 Confirma que todos los modelos están en:');
    console.log('      - src/models/index.js (con exports correctos)');
    console.log('      - Todos los modelos de Store* y LocalSale*');

    console.log('\n4️⃣ VERIFICAR MIDDLEWARE:');
    console.log('   🛡️ En las rutas debe haber:');
    console.log('      - authenticateToken (verificar JWT)');
    console.log('      - requireStaff (verificar permisos)');

    console.log('\n5️⃣ REVISAR LOGS DEL SERVIDOR:');
    console.log('   👀 En la consola del servidor busca:');
    console.log('      - Stack traces de errores 500');
    console.log('      - Errores de importación de módulos');
    console.log('      - Errores de conexión a BD');

    console.log('\n6️⃣ DATOS DE PRUEBA:');
    console.log('   🗄️ Para que funcionen completamente necesitas:');
    console.log('      - Productos en StoreProduct');
    console.log('      - Órdenes en StoreOrder');
    console.log('      - Ventas locales en LocalSale');
    console.log('      - Usuarios empleados activos');

    console.log('\n🚀 COMANDO PARA DEPURAR:');
    console.log('   📊 Ejecuta el servidor con logs detallados:');
    console.log('   npm start');
    console.log('   (Y mira la consola cuando hagas las peticiones)');
  }

  // Método para generar datos de prueba
  async generateTestData() {
    console.log('\n🧪 GENERADOR DE DATOS DE PRUEBA (OPCIONAL)');
    console.log('=' .repeat(60));
    
    console.log('\n💡 Si necesitas datos de prueba, puedes crear:');
    
    console.log('\n📦 PRODUCTOS DE EJEMPLO:');
    console.log('```sql');
    console.log('INSERT INTO "StoreCategories" (name, slug, "isActive", "createdAt", "updatedAt")');
    console.log('VALUES (\'Suplementos\', \'suplementos\', true, NOW(), NOW());');
    console.log('');
    console.log('INSERT INTO "StoreProducts" (name, price, "stockQuantity", "minStock", "categoryId", "isActive", sku, "createdAt", "updatedAt")');
    console.log('VALUES (\'Proteína Whey\', 299.99, 50, 10, 1, true, \'PROT-WHY-001\', NOW(), NOW());');
    console.log('```');

    console.log('\n🛒 VENTAS LOCALES DE EJEMPLO:');
    console.log('```sql');
    console.log('INSERT INTO "LocalSales" ("saleNumber", "employeeId", "workDate", "subtotal", "taxAmount", "totalAmount", "paymentMethod", status, "createdAt", "updatedAt")');
    console.log('VALUES (\'SALE-001\', 1, CURRENT_DATE, 250.00, 30.00, 280.00, \'cash\', \'completed\', NOW(), NOW());');
    console.log('```');
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('\n🔍 Elite Fitness Club - Diagnóstico de Inventario\n');
    console.log('Este script diagnostica problemas en los endpoints de inventario:\n');
    console.log('Opciones:');
    console.log('  node test-inventory-diagnostic.js           # Ejecutar diagnóstico');
    console.log('  node test-inventory-diagnostic.js --help    # Mostrar ayuda');
    console.log('  node test-inventory-diagnostic.js --testdata # Info sobre datos de prueba');
    return;
  }
  
  const tester = new InventoryDiagnosticTester();
  
  try {
    await tester.runDiagnostic();
    
    if (args.includes('--testdata')) {
      await tester.generateTestData();
    }
    
  } catch (error) {
    console.error('\n💡 SOLUCIONES RÁPIDAS:');
    console.error('   1. Verifica que el servidor esté ejecutándose: npm start');
    console.error('   2. Confirma que las rutas estén registradas en app.js');
    console.error('   3. Revisa que los controladores existan y estén bien importados');
    console.error('   4. Mira los logs del servidor para errores específicos');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { InventoryDiagnosticTester };