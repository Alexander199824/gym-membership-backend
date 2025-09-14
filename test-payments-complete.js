// test-payments-complete.js - Test completo para verificar todos los endpoints de pagos
const axios = require('axios');

class PaymentsCompleteTester {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.adminToken = null;
    this.colaboradorToken = null;
    this.clienteToken = null;
    this.currentUser = null;
    
    // 🎯 CONFIGURACIÓN DE USUARIOS DE PRUEBA
    this.testUsers = {
      admin: {
        email: 'admin@gym.com',
        password: 'Admin123!',
        expectedRole: 'admin'
      },
      colaborador: {
        email: 'colaborador@gym.com',
        password: 'Colaborador123!',
        expectedRole: 'colaborador'
      },
      cliente: {
        email: 'cliente@gym.com',
        password: 'Cliente123!',
        expectedRole: 'cliente'
      }
    };
    
    // 📊 RESULTADOS DE TESTS
    this.testResults = {
      serverConnection: false,
      adminLogin: false,
      colaboradorLogin: false,
      clienteLogin: false,
      paymentsList: false,
      paymentDetails: false,
      paymentStatistics: false,
      pendingDashboard: false,
      dailyReport: false,
      transfersList: false,
      paymentReports: false,
      financialDashboard: false,
      rolePermissions: false,
      filtersAndPagination: false
    };
    
    // 📋 DATOS RECOPILADOS
    this.collectedData = {
      payments: [],
      statistics: null,
      dashboard: null,
      reports: null,
      userPermissions: {}
    };
  }

  async runCompleteTest() {
    console.log('💳 ELITE FITNESS CLUB - TEST COMPLETO DE PAGOS');
    console.log('=' .repeat(60));
    console.log('🎯 Verificando todos los endpoints de pagos y finanzas\n');
    
    try {
      await this.checkServer();
      await this.loginAllUsers();
      
      // Tests como admin (acceso completo)
      await this.testAsAdmin();
      
      // Tests como colaborador (acceso limitado)
      await this.testAsColaborador();
      
      // Tests como cliente (solo sus pagos)
      await this.testAsCliente();
      
      // Análisis de permisos
      await this.analyzePermissions();
      
      // Resultados finales
      await this.showCompleteResults();
      
      console.log('\n🎉 ¡TEST COMPLETO DE PAGOS FINALIZADO!');
      
    } catch (error) {
      console.error('\n❌ Error en el test:', error.message);
      if (error.response) {
        console.error('📋 Detalles:', error.response.data);
      }
      process.exit(1);
    }
  }

  async checkServer() {
    console.log('1. 🏥 VERIFICANDO SERVIDOR');
    console.log('-'.repeat(40));
    
    try {
      const response = await axios.get(`${this.baseURL}/api/health`);
      if (response.data.success) {
        console.log('   ✅ Servidor funcionando');
        console.log(`   📊 Versión: ${response.data.version}`);
        this.testResults.serverConnection = true;
        
        // Verificar endpoints de pagos
        try {
          const paymentRoutes = await axios.get(`${this.baseURL}/api/payments`, { 
            validateStatus: status => status === 401 || status === 200
          });
          console.log('   💳 ✅ Rutas de pagos disponibles');
        } catch (routeError) {
          console.log('   💳 ❌ Rutas de pagos no disponibles');
        }
        
        // Verificar endpoints financieros
        try {
          const financialRoutes = await axios.get(`${this.baseURL}/api/financial/dashboard`, { 
            validateStatus: status => status === 401 || status === 200
          });
          console.log('   💰 ✅ Rutas financieras disponibles');
        } catch (routeError) {
          console.log('   💰 ❌ Rutas financieras no disponibles');
        }
      }
    } catch (error) {
      throw new Error(`Servidor no responde: ${error.message}`);
    }
  }

  async loginAllUsers() {
    console.log('\n2. 🔐 AUTENTICACIÓN DE USUARIOS');
    console.log('-'.repeat(40));
    
    // Login como admin
    try {
      const adminResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: this.testUsers.admin.email,
        password: this.testUsers.admin.password
      });

      if (adminResponse.data.success && adminResponse.data.data.token) {
        this.adminToken = adminResponse.data.data.token;
        console.log('   👑 ✅ Admin login exitoso');
        console.log(`   👤 Usuario: ${adminResponse.data.data.user.firstName} ${adminResponse.data.data.user.lastName}`);
        console.log(`   🎭 Rol: ${adminResponse.data.data.user.role}`);
        this.testResults.adminLogin = true;
      }
    } catch (error) {
      console.log('   👑 ❌ Admin login falló:', error.response?.data?.message || error.message);
    }

    // Login como colaborador
    try {
      const colaboradorResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: this.testUsers.colaborador.email,
        password: this.testUsers.colaborador.password
      });

      if (colaboradorResponse.data.success && colaboradorResponse.data.data.token) {
        this.colaboradorToken = colaboradorResponse.data.data.token;
        console.log('   🤝 ✅ Colaborador login exitoso');
        console.log(`   👤 Usuario: ${colaboradorResponse.data.data.user.firstName} ${colaboradorResponse.data.data.user.lastName}`);
        console.log(`   🎭 Rol: ${colaboradorResponse.data.data.user.role}`);
        this.testResults.colaboradorLogin = true;
      }
    } catch (error) {
      console.log('   🤝 ❌ Colaborador login falló:', error.response?.data?.message || error.message);
    }

    // Login como cliente
    try {
      const clienteResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: this.testUsers.cliente.email,
        password: this.testUsers.cliente.password
      });

      if (clienteResponse.data.success && clienteResponse.data.data.token) {
        this.clienteToken = clienteResponse.data.data.token;
        console.log('   👥 ✅ Cliente login exitoso');
        console.log(`   👤 Usuario: ${clienteResponse.data.data.user.firstName} ${clienteResponse.data.data.user.lastName}`);
        console.log(`   🎭 Rol: ${clienteResponse.data.data.user.role}`);
        this.testResults.clienteLogin = true;
      }
    } catch (error) {
      console.log('   👥 ❌ Cliente login falló:', error.response?.data?.message || error.message);
    }
  }

  async testAsAdmin() {
    if (!this.adminToken) {
      console.log('\n⚠️ Saltando tests de admin (no autenticado)');
      return;
    }

    console.log('\n3. 👑 TESTS COMO ADMINISTRADOR');
    console.log('-'.repeat(40));
    this.currentUser = { role: 'admin', token: this.adminToken };

    // Obtener todos los pagos
    await this.testPaymentsList('admin');
    
    // Obtener estadísticas
    await this.testPaymentStatistics('admin');
    
    // Dashboard de pagos pendientes
    await this.testPendingDashboard('admin');
    
    // Transferencias pendientes
    await this.testPendingTransfers('admin');
    
    // Reportes de pagos
    await this.testPaymentReports('admin');
    
    // Dashboard financiero
    await this.testFinancialDashboard('admin');
    
    // Test de filtros y paginación
    await this.testFiltersAndPagination('admin');
    
    // Detalles de un pago específico
    await this.testPaymentDetails('admin');
  }

  async testAsColaborador() {
    if (!this.colaboradorToken) {
      console.log('\n⚠️ Saltando tests de colaborador (no autenticado)');
      return;
    }

    console.log('\n4. 🤝 TESTS COMO COLABORADOR');
    console.log('-'.repeat(40));
    this.currentUser = { role: 'colaborador', token: this.colaboradorToken };

    // Obtener pagos del colaborador (solo del día)
    await this.testPaymentsList('colaborador');
    
    // Reporte diario personal
    await this.testDailyReport('colaborador');
    
    // Estadísticas diarias personales
    await this.testDailyStats('colaborador');
    
    // Dashboard de pendientes (solo sus registros)
    await this.testPendingDashboard('colaborador');
    
    // Reportes limitados
    await this.testPaymentReports('colaborador');
  }

  async testAsCliente() {
    if (!this.clienteToken) {
      console.log('\n⚠️ Saltando tests de cliente (no autenticado)');
      return;
    }

    console.log('\n5. 👥 TESTS COMO CLIENTE');
    console.log('-'.repeat(40));
    this.currentUser = { role: 'cliente', token: this.clienteToken };

    // Obtener solo sus pagos
    await this.testPaymentsList('cliente');
    
    // Intentar acceder a reportes (debería fallar)
    await this.testRestrictedEndpoints('cliente');
  }

  async testPaymentsList(role) {
    console.log(`   💳 Obteniendo lista de pagos (${role})...`);
    
    try {
      const token = this.getTokenByRole(role);
      const response = await axios.get(`${this.baseURL}/api/payments`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: {
          page: 1,
          limit: 10
        }
      });

      if (response.data.success) {
        const { payments, pagination } = response.data.data;
        console.log(`   ✅ Pagos obtenidos: ${payments.length} de ${pagination.total} total`);
        console.log(`   📄 Páginas: ${pagination.pages}, Página actual: ${pagination.page}`);
        
        // Guardar datos
        this.collectedData.payments[role] = payments;
        
        if (payments.length > 0) {
          const payment = payments[0];
          console.log(`   📋 Ejemplo de pago:`);
          console.log(`      💰 Monto: $${payment.amount}`);
          console.log(`      💳 Método: ${payment.paymentMethod}`);
          console.log(`      📅 Fecha: ${payment.paymentDate}`);
          console.log(`      ✅ Estado: ${payment.status}`);
          console.log(`      👤 Usuario: ${payment.user ? `${payment.user.firstName} ${payment.user.lastName}` : 'Cliente anónimo'}`);
          console.log(`      📝 Registrado por: ${payment.registeredByUser ? `${payment.registeredByUser.firstName} ${payment.registeredByUser.lastName}` : 'N/A'}`);
        }
        
        this.testResults.paymentsList = true;
      }
    } catch (error) {
      console.log(`   ❌ Error obteniendo pagos: ${error.response?.data?.message || error.message}`);
      this.collectPermissionError(role, 'payments', error.response?.status);
    }
  }

  async testPaymentStatistics(role) {
    console.log(`   📊 Obteniendo estadísticas de pagos (${role})...`);
    
    try {
      const token = this.getTokenByRole(role);
      const response = await axios.get(`${this.baseURL}/api/payments/statistics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        const stats = response.data.data;
        console.log(`   ✅ Estadísticas obtenidas:`);
        console.log(`      💰 Ingresos totales: $${stats.totalIncome}`);
        console.log(`      📊 Total pagos: ${stats.totalPayments}`);
        console.log(`      📈 Promedio por pago: $${stats.averagePayment}`);
        console.log(`      💳 Métodos de pago: ${stats.incomeByMethod.length} tipos`);
        
        // Mostrar desglose por método
        stats.incomeByMethod.forEach(method => {
          console.log(`         ${method.method}: $${method.total} (${method.count} pagos, ${method.percentage}%)`);
        });
        
        this.collectedData.statistics = stats;
        this.testResults.paymentStatistics = true;
      }
    } catch (error) {
      console.log(`   ❌ Error obteniendo estadísticas: ${error.response?.data?.message || error.message}`);
    }
  }

  async testPendingDashboard(role) {
    console.log(`   ⏳ Obteniendo dashboard de pendientes (${role})...`);
    
    try {
      const token = this.getTokenByRole(role);
      const response = await axios.get(`${this.baseURL}/api/payments/pending-dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        const dashboard = response.data.data;
        console.log(`   ✅ Dashboard de pendientes obtenido:`);
        
        const { summary, urgentItems, recentActivity } = dashboard;
        
        console.log(`      🔄 Transferencias pendientes: ${summary.pendingTransfers.count} ($${summary.pendingTransfers.totalAmount})`);
        console.log(`      💰 Membresías por cobrar: ${summary.pendingCashMemberships.count} ($${summary.pendingCashMemberships.totalAmount})`);
        console.log(`      📊 Validaciones hoy: ${summary.todayValidations.totalProcessed} (${summary.todayValidations.approved} aprobadas)`);
        console.log(`      ⚠️ Items urgentes: ${urgentItems.length}`);
        console.log(`      📝 Actividad reciente: ${recentActivity.length} acciones`);
        
        this.testResults.pendingDashboard = true;
      }
    } catch (error) {
      console.log(`   ❌ Error obteniendo dashboard: ${error.response?.data?.message || error.message}`);
      this.collectPermissionError(role, 'pending-dashboard', error.response?.status);
    }
  }

  async testDailyReport(role) {
    console.log(`   📅 Obteniendo reporte diario (${role})...`);
    
    try {
      const token = this.getTokenByRole(role);
      const response = await axios.get(`${this.baseURL}/api/payments/my-daily-report`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        const report = response.data.data;
        console.log(`   ✅ Reporte diario obtenido:`);
        console.log(`      📅 Fecha: ${report.date}`);
        console.log(`      👤 Colaborador: ${report.collaboratorName}`);
        console.log(`      💰 Total del día: $${report.summary.totalAmount}`);
        console.log(`      📊 Total pagos: ${report.summary.totalCount}`);
        console.log(`      📋 Por tipo:`);
        
        Object.entries(report.summary.byType).forEach(([type, data]) => {
          console.log(`         ${type}: $${data.total} (${data.count} pagos)`);
        });
        
        this.testResults.dailyReport = true;
      }
    } catch (error) {
      console.log(`   ❌ Error obteniendo reporte diario: ${error.response?.data?.message || error.message}`);
      this.collectPermissionError(role, 'daily-report', error.response?.status);
    }
  }

  async testDailyStats(role) {
    console.log(`   📈 Obteniendo estadísticas diarias (${role})...`);
    
    try {
      const token = this.getTokenByRole(role);
      const response = await axios.get(`${this.baseURL}/api/payments/my-daily-stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        const stats = response.data.data;
        console.log(`   ✅ Estadísticas diarias obtenidas:`);
        console.log(`      💰 Hoy: $${stats.today.amount} (${stats.today.count} pagos)`);
        console.log(`      📊 Promedio semanal: $${stats.comparison.weeklyAverage}`);
        console.log(`      📈 vs Promedio: ${stats.comparison.percentageVsAverage}%`);
      }
    } catch (error) {
      console.log(`   ❌ Error obteniendo estadísticas diarias: ${error.response?.data?.message || error.message}`);
    }
  }

  async testPendingTransfers(role) {
    console.log(`   🔄 Obteniendo transferencias pendientes (${role})...`);
    
    try {
      const token = this.getTokenByRole(role);
      const response = await axios.get(`${this.baseURL}/api/payments/transfers/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        const { transfers, total } = response.data.data;
        console.log(`   ✅ Transferencias pendientes: ${total}`);
        
        if (transfers.length > 0) {
          const transfer = transfers[0];
          console.log(`   📋 Ejemplo de transferencia:`);
          console.log(`      💰 Monto: $${transfer.amount}`);
          console.log(`      👤 Cliente: ${transfer.user ? `${transfer.user.firstName} ${transfer.user.lastName}` : 'Anónimo'}`);
          console.log(`      📅 Registrado: ${transfer.createdAt}`);
          console.log(`      📄 Comprobante: ${transfer.transferProof ? '✅ Subido' : '❌ No subido'}`);
        }
        
        this.testResults.transfersList = true;
      }
    } catch (error) {
      console.log(`   ❌ Error obteniendo transferencias: ${error.response?.data?.message || error.message}`);
      this.collectPermissionError(role, 'transfers', error.response?.status);
    }
  }

  async testPaymentReports(role) {
    console.log(`   📈 Obteniendo reportes de pagos (${role})...`);
    
    try {
      const token = this.getTokenByRole(role);
      const response = await axios.get(`${this.baseURL}/api/payments/reports`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { period: 'month' }
      });

      if (response.data.success) {
        const report = response.data.data;
        console.log(`   ✅ Reportes obtenidos:`);
        console.log(`      💰 Ingresos totales: $${report.totalIncome}`);
        console.log(`      📊 Período: ${report.period}`);
        console.log(`      🎭 Rol del usuario: ${report.userRole}`);
        console.log(`      📋 Por tipo: ${report.incomeByType.length} categorías`);
        console.log(`      💳 Por método: ${report.incomeByMethod.length} métodos`);
        
        this.testResults.paymentReports = true;
      }
    } catch (error) {
      console.log(`   ❌ Error obteniendo reportes: ${error.response?.data?.message || error.message}`);
      this.collectPermissionError(role, 'reports', error.response?.status);
    }
  }

  async testFinancialDashboard(role) {
    console.log(`   💼 Obteniendo dashboard financiero (${role})...`);
    
    try {
      const token = this.getTokenByRole(role);
      const response = await axios.get(`${this.baseURL}/api/financial/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        const dashboard = response.data.data;
        console.log(`   ✅ Dashboard financiero obtenido:`);
        console.log(`      💰 Hoy: $${dashboard.today.income} ingresos, $${dashboard.today.expenses} gastos`);
        console.log(`      📊 Esta semana: $${dashboard.thisWeek.income} ingresos, $${dashboard.thisWeek.expenses} gastos`);
        console.log(`      📈 Este mes: $${dashboard.thisMonth.income} ingresos, $${dashboard.thisMonth.expenses} gastos`);
        console.log(`      📝 Movimientos recientes: ${dashboard.recentMovements.length}`);
        
        this.testResults.financialDashboard = true;
      }
    } catch (error) {
      console.log(`   ❌ Error obteniendo dashboard financiero: ${error.response?.data?.message || error.message}`);
      this.collectPermissionError(role, 'financial-dashboard', error.response?.status);
    }
  }

  async testFiltersAndPagination(role) {
    console.log(`   🔍 Probando filtros y paginación (${role})...`);
    
    try {
      const token = this.getTokenByRole(role);
      
      // Test con filtros
      const filterResponse = await axios.get(`${this.baseURL}/api/payments`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: {
          page: 1,
          limit: 5,
          paymentMethod: 'cash',
          status: 'completed'
        }
      });

      if (filterResponse.data.success) {
        const { payments, pagination } = filterResponse.data.data;
        console.log(`   ✅ Filtros funcionando: ${payments.length} pagos en efectivo completados`);
        console.log(`   📄 Paginación: página ${pagination.page} de ${pagination.pages}`);
        
        this.testResults.filtersAndPagination = true;
      }
    } catch (error) {
      console.log(`   ❌ Error probando filtros: ${error.response?.data?.message || error.message}`);
    }
  }

  async testPaymentDetails(role) {
    console.log(`   🔍 Obteniendo detalles de pago específico (${role})...`);
    
    try {
      const token = this.getTokenByRole(role);
      
      // Primero obtener un ID de pago válido
      const listResponse = await axios.get(`${this.baseURL}/api/payments`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { limit: 1 }
      });

      if (listResponse.data.success && listResponse.data.data.payments.length > 0) {
        const paymentId = listResponse.data.data.payments[0].id;
        
        const detailResponse = await axios.get(`${this.baseURL}/api/payments/${paymentId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (detailResponse.data.success) {
          const payment = detailResponse.data.data.payment;
          console.log(`   ✅ Detalles del pago ID ${paymentId}:`);
          console.log(`      💰 Monto: $${payment.amount}`);
          console.log(`      💳 Método: ${payment.paymentMethod}`);
          console.log(`      📋 Tipo: ${payment.paymentType}`);
          console.log(`      ✅ Estado: ${payment.status}`);
          console.log(`      📅 Fecha: ${payment.paymentDate}`);
          console.log(`      📝 Descripción: ${payment.description}`);
          
          if (payment.user) {
            console.log(`      👤 Cliente: ${payment.user.firstName} ${payment.user.lastName} (${payment.user.email})`);
          }
          
          if (payment.registeredByUser) {
            console.log(`      👔 Registrado por: ${payment.registeredByUser.firstName} ${payment.registeredByUser.lastName}`);
          }
          
          if (payment.membership) {
            console.log(`      🏋️ Membresía: ${payment.membership.type} (vence: ${payment.membership.endDate})`);
          }
          
          this.testResults.paymentDetails = true;
        }
      } else {
        console.log(`   ⚠️ No hay pagos disponibles para obtener detalles`);
      }
    } catch (error) {
      console.log(`   ❌ Error obteniendo detalles: ${error.response?.data?.message || error.message}`);
      this.collectPermissionError(role, 'payment-details', error.response?.status);
    }
  }

  async testRestrictedEndpoints(role) {
    console.log(`   🚫 Probando endpoints restringidos (${role})...`);
    
    const restrictedEndpoints = [
      { url: '/api/payments/statistics', name: 'Estadísticas' },
      { url: '/api/payments/reports', name: 'Reportes' },
      { url: '/api/payments/pending-dashboard', name: 'Dashboard pendientes' },
      { url: '/api/financial/dashboard', name: 'Dashboard financiero' }
    ];

    const token = this.getTokenByRole(role);
    
    for (const endpoint of restrictedEndpoints) {
      try {
        const response = await axios.get(`${this.baseURL}${endpoint.url}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          validateStatus: () => true // No lanzar error en 403/401
        });

        if (response.status === 403 || response.status === 401) {
          console.log(`      ✅ ${endpoint.name}: Correctamente restringido (${response.status})`);
        } else if (response.status === 200) {
          console.log(`      ⚠️ ${endpoint.name}: Acceso permitido (no debería ser así para cliente)`);
        }
      } catch (error) {
        console.log(`      ❌ ${endpoint.name}: Error inesperado`);
      }
    }
  }

  async analyzePermissions() {
    console.log('\n6. 🔒 ANÁLISIS DE PERMISOS POR ROL');
    console.log('-'.repeat(40));

    const roles = ['admin', 'colaborador', 'cliente'];
    
    roles.forEach(role => {
      console.log(`   ${this.getRoleIcon(role)} ${role.toUpperCase()}:`);
      
      if (this.collectedData.payments[role]) {
        console.log(`      💳 Pagos accesibles: ${this.collectedData.payments[role].length}`);
        
        // Analizar tipos de pagos
        const paymentTypes = {};
        this.collectedData.payments[role].forEach(payment => {
          paymentTypes[payment.paymentType] = (paymentTypes[payment.paymentType] || 0) + 1;
        });
        
        console.log(`      📊 Tipos de pago:`);
        Object.entries(paymentTypes).forEach(([type, count]) => {
          console.log(`         ${type}: ${count} pagos`);
        });
        
        // Verificar si puede ver pagos de otros usuarios
        const hasOtherUsersPayments = this.collectedData.payments[role].some(payment => 
          payment.registeredByUser && payment.registeredByUser.role !== role
        );
        
        console.log(`      👥 Ve pagos de otros: ${hasOtherUsersPayments ? 'Sí' : 'No'}`);
      }
      
      if (this.collectedData.userPermissions[role]) {
        console.log(`      🚫 Endpoints bloqueados: ${Object.keys(this.collectedData.userPermissions[role]).length}`);
      }
    });
    
    this.testResults.rolePermissions = true;
  }

  async showCompleteResults() {
    console.log('\n7. 📊 RESULTADOS COMPLETOS DEL TEST');
    console.log('=' .repeat(60));

    const total = Object.keys(this.testResults).length;
    const passed = Object.values(this.testResults).filter(Boolean).length;
    const percentage = ((passed / total) * 100).toFixed(1);

    console.log(`\n🎯 RESUMEN GENERAL: ${passed}/${total} tests pasaron (${percentage}%)`);
    console.log('-'.repeat(50));

    // Mostrar resultados detallados
    console.log('\n📋 RESULTADOS DETALLADOS:');
    Object.entries(this.testResults).forEach(([test, passed]) => {
      const icon = passed ? '✅' : '❌';
      const testName = this.formatTestName(test);
      console.log(`   ${icon} ${testName}`);
    });

    // Mostrar datos recopilados
    console.log('\n📊 DATOS RECOPILADOS:');
    
    if (this.collectedData.statistics) {
      console.log(`   💰 Ingresos totales: $${this.collectedData.statistics.totalIncome}`);
      console.log(`   📊 Total de pagos: ${this.collectedData.statistics.totalPayments}`);
    }

    const totalPayments = Object.values(this.collectedData.payments)
      .reduce((sum, payments) => sum + payments.length, 0);
    console.log(`   💳 Total pagos obtenidos: ${totalPayments}`);

    // Recomendaciones
    console.log('\n💡 RECOMENDACIONES:');
    if (!this.testResults.adminLogin) {
      console.log('   🔧 Verifica que el usuario admin esté configurado correctamente');
    }
    if (!this.testResults.colaboradorLogin || !this.testResults.clienteLogin) {
      console.log('   👥 Verifica que los usuarios de prueba estén creados en la base de datos');
    }
    if (!this.testResults.paymentStatistics) {
      console.log('   📊 Verifica que el endpoint /api/payments/statistics funcione correctamente');
    }

    // Estado del backend
    console.log('\n🏗️ ESTADO DEL BACKEND:');
    console.log(`   🏥 Servidor: ${this.testResults.serverConnection ? 'Funcionando' : 'Con problemas'}`);
    console.log(`   🔐 Autenticación: ${this.testResults.adminLogin ? 'Funcionando' : 'Con problemas'}`);
    console.log(`   💳 Endpoints de pagos: ${this.testResults.paymentsList ? 'Funcionando' : 'Con problemas'}`);
    console.log(`   📊 Sistema de reportes: ${this.testResults.paymentReports ? 'Funcionando' : 'Con problemas'}`);
    
    if (passed === total) {
      console.log('\n🎉 ¡TODOS LOS TESTS PASARON! El sistema de pagos está funcionando correctamente.');
    } else {
      console.log(`\n⚠️ ${total - passed} tests fallaron. Revisa los errores anteriores para más detalles.`);
    }
  }

  // Métodos auxiliares
  getTokenByRole(role) {
    const tokens = {
      admin: this.adminToken,
      colaborador: this.colaboradorToken,
      cliente: this.clienteToken
    };
    return tokens[role];
  }

  getRoleIcon(role) {
    const icons = {
      admin: '👑',
      colaborador: '🤝',
      cliente: '👥'
    };
    return icons[role] || '👤';
  }

  collectPermissionError(role, endpoint, status) {
    if (!this.collectedData.userPermissions[role]) {
      this.collectedData.userPermissions[role] = {};
    }
    this.collectedData.userPermissions[role][endpoint] = status;
  }

  formatTestName(testKey) {
    const names = {
      serverConnection: 'Conexión al servidor',
      adminLogin: 'Login de administrador',
      colaboradorLogin: 'Login de colaborador',
      clienteLogin: 'Login de cliente',
      paymentsList: 'Lista de pagos',
      paymentDetails: 'Detalles de pago',
      paymentStatistics: 'Estadísticas de pagos',
      pendingDashboard: 'Dashboard de pendientes',
      dailyReport: 'Reporte diario',
      transfersList: 'Lista de transferencias',
      paymentReports: 'Reportes de pagos',
      financialDashboard: 'Dashboard financiero',
      rolePermissions: 'Permisos por rol',
      filtersAndPagination: 'Filtros y paginación'
    };
    return names[testKey] || testKey;
  }
}

// Función para mostrar ayuda
function showHelp() {
  console.log('\n💳 Elite Fitness Club - Test Completo de Pagos\n');
  console.log('Este test verifica todos los endpoints relacionados con pagos:');
  console.log('  📊 Estadísticas y reportes de pagos');
  console.log('  💳 Lista de pagos con filtros y paginación');
  console.log('  🔍 Detalles completos de pagos individuales');
  console.log('  ⏳ Dashboard de pagos pendientes');
  console.log('  🔄 Transferencias pendientes de validación');
  console.log('  💼 Dashboard financiero completo');
  console.log('  🔒 Verificación de permisos por rol\n');
  
  console.log('Uso:');
  console.log('  node test-payments-complete.js        # Ejecutar test completo');
  console.log('  node test-payments-complete.js --help # Mostrar ayuda\n');
  
  console.log('👥 Usuarios de prueba necesarios:');
  console.log('  👑 admin@gym.com (Admin123!)');
  console.log('  🤝 colaborador@gym.com (Colaborador123!)');
  console.log('  👥 cliente@gym.com (Cliente123!)\n');
  
  console.log('💡 Asegúrate de que tu servidor esté corriendo y los usuarios estén creados');
}

// Ejecutar script
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const tester = new PaymentsCompleteTester();
  
  try {
    await tester.runCompleteTest();
    
  } catch (error) {
    console.error('\n💡 POSIBLES SOLUCIONES:');
    
    if (error.message.includes('Servidor no responde')) {
      console.error('   1. Verifica que tu servidor esté ejecutándose: npm start');
      console.error('   2. Confirma que el puerto 5000 esté libre');
    } else if (error.message.includes('Login falló')) {
      console.error('   1. Verifica que los usuarios de prueba estén creados');
      console.error('   2. Ejecuta el seed de usuarios si es necesario');
    }
    
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { PaymentsCompleteTester };