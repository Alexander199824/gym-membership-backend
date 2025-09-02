// test-membership-purchase.js - DOCTOR DEL SISTEMA v2: Usando rutas reales del backend - REPARADO
const axios = require('axios');

class SystemDoctorV2 {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.tokens = {};
    this.diagnosis = {
      server: { status: 'unknown', details: [], issues: [], critical: true },
      database: { status: 'unknown', details: [], issues: [], critical: true },
      tables: { status: 'unknown', details: [], issues: [], critical: true },
      routes: { status: 'unknown', details: [], issues: [], critical: true },
      auth: { status: 'unknown', details: [], issues: [], critical: true },
      membership: { status: 'unknown', details: [], issues: [], critical: false },
      payments: { status: 'unknown', details: [], issues: [], critical: false }
    };
    this.recommendations = [];
    this.realRoutes = this.getRealRoutes();
  }

 getRealRoutes() {
    return {
      // Rutas básicas y críticas
      critical: [
        { method: 'GET', url: '/api/health', description: 'Salud del sistema', auth: false },
        { method: 'POST', url: '/api/auth/login', description: 'Login usuarios', auth: false },
        { method: 'GET', url: '/api/gym/config', description: 'Config gimnasio', auth: false },
        { method: 'GET', url: '/api/users', description: 'Lista usuarios', auth: true }
      ],
      
      // ✅ CORREGIDO: Rutas REALES de membresías (según gymRoutes.js)
      membership: [
        { method: 'GET', url: '/api/gym/membership-plans', description: 'Planes públicos', auth: false },
        { method: 'GET', url: '/api/gym/services', description: 'Servicios gym', auth: false },
        { method: 'GET', url: '/api/gym/testimonials', description: 'Testimonios', auth: false },
        { method: 'GET', url: '/api/gym/stats', description: 'Estadísticas gym', auth: false },
        { method: 'GET', url: '/api/gym/hours/flexible', description: 'Horarios flexibles', auth: false },
        { method: 'GET', url: '/api/gym/availability?day=monday', description: 'Disponibilidad gym', auth: false } // ✅ CORREGIDO: Agregar parámetro day requerido
      ],
      
      // ✅ CORREGIDO: Rutas REALES de pagos (según paymentRoutes.js)
      payments: [
        { method: 'GET', url: '/api/payments', description: 'Mis pagos', auth: true },
        { method: 'POST', url: '/api/payments', description: 'Crear pago', auth: true, requireStaff: true },
        { method: 'POST', url: '/api/payments/daily-income', description: 'Ingreso diario', auth: true, requireStaff: true },
        { method: 'POST', url: '/api/payments/activate-cash-membership', description: 'Activar efectivo', auth: true, requireStaff: true },
        { method: 'GET', url: '/api/payments/reports/enhanced', description: 'Reportes mejorados', auth: true, requireStaff: true }
      ]
    };
  }

  async runDiagnosis() {
    console.log('🏥 ELITE FITNESS CLUB - DOCTOR DEL SISTEMA v2.0');
    console.log('═'.repeat(80));
    console.log('Diagnosticando con las rutas REALES de tu backend...\n');
    
    try {
      await this.diagnosticar1_ConexionServidor();
      await this.diagnosticar2_BaseDatos();
      await this.diagnosticar3_TablasEspecificas();
      await this.diagnosticar4_RutasCriticas();
      await this.diagnosticar5_SistemaAutenticacion();
      await this.diagnosticar6_SistemaMembresias();
      await this.diagnosticar7_SistemaPagos();
      
      this.generarDiagnosticoCompleto();
      
    } catch (error) {
      console.error('\n💀 ERROR CRÍTICO:', error.message);
      process.exit(1);
    }
  }

  async diagnosticar1_ConexionServidor() {
    console.log('🏥 DIAGNÓSTICO 1: CONEXIÓN AL SERVIDOR');
    console.log('─'.repeat(50));
    
    try {
      const startTime = Date.now();
      const response = await axios.get(`${this.baseURL}/api/health`, { timeout: 10000 });
      const responseTime = Date.now() - startTime;
      
      if (response.status === 200 && response.data?.success) {
        this.diagnosis.server.status = 'healthy';
        this.diagnosis.server.details.push(`✅ Servidor responde en ${responseTime}ms`);
        this.diagnosis.server.details.push(`✅ API funcional en puerto 5000`);
        
        // Analizar respuesta detallada
        const data = response.data;
        if (data.version) {
          this.diagnosis.server.details.push(`✅ Versión: ${data.version}`);
        }
        
        if (data.database) {
          this.diagnosis.server.details.push(`✅ BD status: ${data.database.status || 'connected'}`);
          if (data.database.dialect) {
            this.diagnosis.server.details.push(`✅ BD tipo: ${data.database.dialect}`);
          }
        } else {
          this.diagnosis.server.issues.push('⚠️ Sin info de BD en /api/health');
          this.recommendations.push('Agregar info de BD al endpoint /api/health');
        }
        
        if (data.services) {
          const services = Object.keys(data.services);
          this.diagnosis.server.details.push(`✅ Servicios: ${services.join(', ')}`);
        }
        
        if (data.payments) {
          const paymentMethods = Object.keys(data.payments);
          this.diagnosis.server.details.push(`✅ Métodos pago: ${paymentMethods.join(', ')}`);
        }
        
      } else {
        this.diagnosis.server.status = 'error';
        this.diagnosis.server.issues.push('❌ API responde pero success=false');
      }
      
    } catch (error) {
      this.diagnosis.server.status = 'error';
      
      if (error.code === 'ECONNREFUSED') {
        this.diagnosis.server.issues.push('❌ SERVIDOR NO ESTÁ CORRIENDO');
        this.diagnosis.server.issues.push('   🔥 SOLUCIÓN: Ejecutar "npm start"');
        this.diagnosis.server.issues.push('   🔥 Verificar que el puerto 5000 esté libre');
        this.recommendations.push('CRÍTICO: npm start (el servidor no está corriendo)');
      } else if (error.code === 'ECONNABORTED') {
        this.diagnosis.server.issues.push('❌ SERVIDOR MUY LENTO O COLGADO');
        this.diagnosis.server.issues.push('   🔥 SOLUCIÓN: Reiniciar servidor o revisar logs');
        this.recommendations.push('CRÍTICO: Reiniciar servidor - performance crítica');
      } else {
        this.diagnosis.server.issues.push(`❌ Error: ${error.message}`);
      }
    }
    
    this.mostrarResultadoDiagnostico('SERVIDOR', this.diagnosis.server);
  }

  async diagnosticar2_BaseDatos() {
    console.log('\n🗄️ DIAGNÓSTICO 2: BASE DE DATOS');
    console.log('─'.repeat(50));
    
    try {
      // Test 1: Consulta básica de configuración
      console.log('   🔍 Test 1: Conexión básica via /api/gym/config...');
      try {
        const configResponse = await axios.get(`${this.baseURL}/api/gym/config`);
        if (configResponse.data?.success) {
          this.diagnosis.database.details.push('✅ BD responde - consulta básica OK');
          this.diagnosis.database.details.push(`✅ Gym: "${configResponse.data.data.gymName || configResponse.data.data.name}"`); // ✅ CORREGIDO: Manejar ambos nombres de campo
        } else {
          this.diagnosis.database.issues.push('❌ BD responde pero sin datos válidos');
        }
      } catch (dbError) {
        if (dbError.response?.status === 500) {
          this.diagnosis.database.issues.push('❌ ERROR SQL EN CONSULTA BÁSICA');
          this.diagnosis.database.issues.push(`   📋 Error: ${dbError.response.data?.message || dbError.message}`);
          
          // Interpretar errores específicos de BD
          const errorMsg = dbError.response.data?.message || dbError.message || '';
          
          if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('ECONNREFUSED')) {
            this.diagnosis.database.issues.push('   🔥 PROBLEMA: Servidor de BD no está corriendo');
            this.recommendations.push('CRÍTICO: Iniciar MySQL/PostgreSQL');
          } else if (errorMsg.includes('Access denied') || errorMsg.includes('authentication failed')) {
            this.diagnosis.database.issues.push('   🔥 PROBLEMA: Credenciales incorrectas');
            this.recommendations.push('CRÍTICO: Verificar DB_USER y DB_PASSWORD en .env');
          } else if (errorMsg.includes('database') && errorMsg.includes('does not exist')) {
            this.diagnosis.database.issues.push('   🔥 PROBLEMA: Base de datos no existe');
            this.recommendations.push('CRÍTICO: Crear BD especificada en DB_NAME');
          } else if (errorMsg.includes('relation') && errorMsg.includes('does not exist')) {
            this.diagnosis.database.issues.push('   🔥 PROBLEMA: Tablas no existen');
            this.recommendations.push('CRÍTICO: Ejecutar migraciones: npx sequelize-cli db:migrate');
          } else if (errorMsg.includes('column') && errorMsg.includes('does not exist')) {
            const columnMatch = errorMsg.match(/column "([^"]+)" does not exist/);
            if (columnMatch) {
              this.diagnosis.database.issues.push(`   🔥 PROBLEMA: Columna "${columnMatch[1]}" no existe`);
              this.recommendations.push(`CRÍTICO: Migrar columna faltante: ${columnMatch[1]}`);
            }
          } else {
            this.diagnosis.database.issues.push(`   🔥 Error SQL específico: ${errorMsg.substring(0, 100)}...`);
          }
          
          this.diagnosis.database.status = 'error';
          return; // No continuar si hay error SQL crítico
        }
      }
      
      // Test 2: Verificar planes de membresía
      console.log('   🔍 Test 2: Tabla membership_plans...');
      try {
        const planesResponse = await axios.get(`${this.baseURL}/api/gym/membership-plans`); // ✅ CORREGIDO: Usar ruta real
        if (planesResponse.data?.success && planesResponse.data.data?.plans) {
          const plans = planesResponse.data.data.plans;
          this.diagnosis.database.details.push(`✅ Tabla membership_plans: ${plans.length} registros`);
          
          if (plans.length > 0) {
            const plan = plans[0];
            const campos = Object.keys(plan);
            this.diagnosis.database.details.push(`✅ Campos plan: ${campos.slice(0, 6).join(', ')}...`);
            
            // Verificar campos críticos
            const camposCriticos = ['id', 'planName', 'price', 'durationType'];
            const camposFaltantes = camposCriticos.filter(campo => !campos.includes(campo));
            
            if (camposFaltantes.length > 0) {
              this.diagnosis.database.issues.push(`⚠️ Campos faltantes en plans: ${camposFaltantes.join(', ')}`);
              this.recommendations.push(`Agregar campos a membership_plans: ${camposFaltantes.join(', ')}`);
            }
          } else {
            this.diagnosis.database.issues.push('⚠️ Tabla membership_plans está vacía');
            this.recommendations.push('Ejecutar seeders para membership_plans');
          }
        }
      } catch (error) {
        this.diagnosis.database.issues.push('❌ Error accediendo tabla membership_plans');
      }
      
      // Test 3: Verificar usuarios (con auth si está disponible)
      if (this.tokens.admin) {
        console.log('   🔍 Test 3: Tabla users...');
        try {
          const usersResponse = await axios.get(`${this.baseURL}/api/users?limit=1`, {
            headers: { Authorization: `Bearer ${this.tokens.admin}` }
          });
          
          if (usersResponse.data?.success && usersResponse.data.data?.users) {
            this.diagnosis.database.details.push('✅ Tabla users: accesible');
          }
        } catch (error) {
          if (error.response?.status === 500) {
            this.diagnosis.database.issues.push('❌ Error SQL en tabla users');
          }
        }
      }
      
      if (this.diagnosis.database.status === 'unknown') {
        this.diagnosis.database.status = 'healthy';
        this.diagnosis.database.details.push('✅ Base de datos funcionando correctamente');
      }
      
    } catch (error) {
      this.diagnosis.database.status = 'error';
      this.diagnosis.database.issues.push(`❌ Error diagnosticando BD: ${error.message}`);
    }
    
    this.mostrarResultadoDiagnostico('BASE DE DATOS', this.diagnosis.database);
  }

  async diagnosticar3_TablasEspecificas() {
    console.log('\n📋 DIAGNÓSTICO 3: TABLAS ESPECÍFICAS DEL SISTEMA');
    console.log('─'.repeat(50));
    
    const tablasEsenciales = [
      {
        name: 'users',
        test: async () => {
          if (!this.tokens.admin) return { status: 'skip', reason: 'Sin token admin' };
          
          const response = await axios.get(`${this.baseURL}/api/users?limit=1`, {
            headers: { Authorization: `Bearer ${this.tokens.admin}` }
          });
          return { 
            status: 'ok', 
            data: response.data.data?.users?.[0],
            count: response.data.data?.users?.length || 0
          };
        },
        requiredFields: ['id', 'firstName', 'lastName', 'email', 'role'],
        description: 'Usuarios del sistema'
      },
      {
        name: 'gym_configuration', // ✅ CORREGIDO: Nombre singular como en la tabla real
        test: async () => {
          const response = await axios.get(`${this.baseURL}/api/gym/config`);
          return { 
            status: 'ok', 
            data: response.data.data,
            count: response.data.data ? 1 : 0
          };
        },
        requiredFields: ['id', 'gymName', 'gymDescription'], // ✅ CORREGIDO: Campos reales del modelo
        description: 'Configuración del gimnasio'
      },
      {
        name: 'membership_plans',
        test: async () => {
          const response = await axios.get(`${this.baseURL}/api/gym/membership-plans`); // ✅ CORREGIDO: Ruta real
          return { 
            status: 'ok', 
            data: response.data.data?.plans?.[0],
            count: response.data.data?.plans?.length || 0
          };
        },
        requiredFields: ['id', 'planName', 'price', 'durationType'],
        description: 'Planes de membresía'
      },
      {
        name: 'memberships',
        test: async () => {
          if (!this.tokens.client) return { status: 'skip', reason: 'Sin token cliente' };
          
          const response = await axios.get(`${this.baseURL}/api/memberships`, {
            headers: { Authorization: `Bearer ${this.tokens.client}` }
          });
          return { 
            status: 'ok', 
            data: response.data.data?.[0] || null,
            count: response.data.data?.length || 0
          };
        },
        requiredFields: ['id', 'userId', 'planId', 'status'],
        description: 'Membresías de usuarios'
      },
      {
        name: 'payments',
        test: async () => {
          if (!this.tokens.client) return { status: 'skip', reason: 'Sin token cliente' };
          
          const response = await axios.get(`${this.baseURL}/api/payments?limit=1`, {
            headers: { Authorization: `Bearer ${this.tokens.client}` }
          });
          return { 
            status: 'ok', 
            data: response.data.data?.[0] || null,
            count: response.data.data?.length || 0
          };
        },
        requiredFields: ['id', 'amount', 'paymentMethod', 'status'],
        description: 'Pagos del sistema'
      }
    ];

    let tablasOK = 0;
    let totalTablas = tablasEsenciales.length;

    for (const tabla of tablasEsenciales) {
      console.log(`   🔍 Verificando tabla: ${tabla.name}`);
      
      try {
        const result = await tabla.test();
        
        if (result.status === 'skip') {
          this.diagnosis.tables.details.push(`⏭️ ${tabla.name}: ${result.reason}`);
          totalTablas--; // No contar las que no se pudieron probar
          continue;
        }
        
        if (result.status === 'ok') {
          tablasOK++;
          this.diagnosis.tables.details.push(`✅ ${tabla.name}: EXISTE (${result.count} registros)`);
          
          // Verificar campos si hay datos
          if (result.data && typeof result.data === 'object') {
            const camposEncontrados = Object.keys(result.data);
            const camposFaltantes = tabla.requiredFields.filter(campo => !camposEncontrados.includes(campo));
            
            if (camposFaltantes.length === 0) {
              this.diagnosis.tables.details.push(`   📊 Campos: ${camposEncontrados.slice(0, 6).join(', ')}...`);
            } else {
              this.diagnosis.tables.issues.push(`   ❌ Campos faltantes en ${tabla.name}: ${camposFaltantes.join(', ')}`);
              this.recommendations.push(`CRÍTICO: Agregar campos a tabla ${tabla.name}: ${camposFaltantes.join(', ')}`);
              
              // Mostrar campos encontrados para debug
              this.diagnosis.tables.details.push(`   📊 Campos encontrados: ${camposEncontrados.slice(0, 6).join(', ')}...`);
            }
          } else if (result.count === 0) {
            this.diagnosis.tables.issues.push(`   ⚠️ Tabla ${tabla.name} está vacía`);
            if (tabla.name === 'membership_plans' || tabla.name === 'users') {
              this.recommendations.push(`Ejecutar seeders para ${tabla.name}`);
            }
          }
        }
        
      } catch (error) {
        if (error.response?.status === 500) {
          this.diagnosis.tables.issues.push(`❌ ${tabla.name}: ERROR SQL - Tabla probablemente no existe`);
          
          const errorMsg = error.response.data?.message || error.message || '';
          if (errorMsg.includes('relation') && errorMsg.includes('does not exist')) {
            this.diagnosis.tables.issues.push(`   🔥 TABLA "${tabla.name}" NO EXISTE EN LA BD`);
            this.recommendations.push(`CRÍTICO: Crear tabla ${tabla.name} - ejecutar migración correspondiente`);
          } else if (errorMsg.includes('column') && errorMsg.includes('does not exist')) {
            this.diagnosis.tables.issues.push(`   🔥 COLUMNA FALTANTE en tabla ${tabla.name}`);
            this.recommendations.push(`CRÍTICO: Ejecutar migraciones para actualizar ${tabla.name}`);
          }
        } else if (error.response?.status === 404) {
          this.diagnosis.tables.issues.push(`❌ ${tabla.name}: Endpoint no existe - ruta no implementada`);
        } else if (error.response?.status === 401) {
          this.diagnosis.tables.issues.push(`⚠️ ${tabla.name}: Sin permisos de acceso`);
        } else {
          this.diagnosis.tables.issues.push(`❌ ${tabla.name}: ${error.message}`);
        }
      }
    }

    // Evaluar status general
    if (tablasOK === totalTablas && totalTablas > 0) {
      this.diagnosis.tables.status = 'healthy';
      this.diagnosis.tables.details.push(`🎉 Todas las tablas esenciales (${totalTablas}) funcionan correctamente`);
    } else if (tablasOK > totalTablas / 2) {
      this.diagnosis.tables.status = 'warning';
      this.diagnosis.tables.details.push(`⚠️ ${tablasOK}/${totalTablas} tablas funcionan correctamente`);
    } else {
      this.diagnosis.tables.status = 'error';
      this.diagnosis.tables.issues.push(`❌ Solo ${tablasOK}/${totalTablas} tablas funcionan - sistema crítico`);
      this.recommendations.push('CRÍTICO: Ejecutar todas las migraciones: npx sequelize-cli db:migrate');
    }

    this.mostrarResultadoDiagnostico('TABLAS ESPECÍFICAS', this.diagnosis.tables);
  }

  async diagnosticar4_RutasCriticas() {
    console.log('\n🛤️ DIAGNÓSTICO 4: RUTAS CRÍTICAS DEL SISTEMA');
    console.log('─'.repeat(50));
    
    let rutasCriticasOK = 0;
    let totalCriticas = this.realRoutes.critical.length;
    
    console.log('   🔍 Probando rutas críticas del sistema...');
    
    for (const ruta of this.realRoutes.critical) {
      try {
        let response;
        const headers = ruta.auth && this.tokens.admin ? 
          { Authorization: `Bearer ${this.tokens.admin}` } : {};
        
        if (ruta.method === 'GET') {
          response = await axios.get(`${this.baseURL}${ruta.url}`, { 
            headers,
            timeout: 5000
          });
        } else if (ruta.method === 'POST') {
          const testData = this.generarDatosPrueba(ruta.url);
          response = await axios.post(`${this.baseURL}${ruta.url}`, testData, { 
            headers,
            timeout: 5000
          });
        }
        
        if (response?.data?.success) {
          rutasCriticasOK++;
          this.diagnosis.routes.details.push(`✅ ${ruta.method} ${ruta.url}: FUNCIONA`);
        } else {
          this.diagnosis.routes.issues.push(`❌ ${ruta.method} ${ruta.url}: Responde pero success=false`);
        }
        
      } catch (error) {
        const errorDetail = this.interpretarErrorRuta(error, ruta.url);
        
        if (error.response?.status === 404) {
          this.diagnosis.routes.issues.push(`❌ ${ruta.method} ${ruta.url}: NO IMPLEMENTADA (404)`);
          this.recommendations.push(`CRÍTICO: Implementar ruta ${ruta.url}`);
        } else if (error.response?.status === 500) {
          this.diagnosis.routes.issues.push(`❌ ${ruta.method} ${ruta.url}: ERROR SERVIDOR (500)`);
          this.diagnosis.routes.issues.push(`   🔥 Detalles: ${error.response.data?.message || 'Error interno'}`);
          this.recommendations.push(`CRÍTICO: Corregir error en ${ruta.url} - revisar logs`);
        } else if (error.response?.status === 401 && ruta.auth) {
          // Error de auth en ruta protegida puede ser normal si no hay token
          if (!this.tokens.admin) {
            this.diagnosis.routes.details.push(`⚠️ ${ruta.method} ${ruta.url}: Requiere auth (sin token para probar)`);
          } else {
            this.diagnosis.routes.issues.push(`❌ ${ruta.method} ${ruta.url}: Token inválido`);
          }
        } else {
          this.diagnosis.routes.issues.push(`❌ ${ruta.method} ${ruta.url}: ${errorDetail}`);
        }
      }
    }
    
    console.log(`   📊 Rutas críticas funcionando: ${rutasCriticasOK}/${totalCriticas}`);
    
    if (rutasCriticasOK === totalCriticas) {
      this.diagnosis.routes.status = 'healthy';
      this.diagnosis.routes.details.push('🎉 Todas las rutas críticas funcionan correctamente');
    } else if (rutasCriticasOK > totalCriticas / 2) {
      this.diagnosis.routes.status = 'warning';
      this.diagnosis.routes.details.push(`⚠️ ${rutasCriticasOK}/${totalCriticas} rutas críticas funcionan`);
    } else {
      this.diagnosis.routes.status = 'error';
      this.diagnosis.routes.issues.push(`❌ Solo ${rutasCriticasOK}/${totalCriticas} rutas críticas funcionan`);
    }
    
    this.mostrarResultadoDiagnostico('RUTAS CRÍTICAS', this.diagnosis.routes);
  }

  async diagnosticar5_SistemaAutenticacion() {
    console.log('\n🔐 DIAGNÓSTICO 5: SISTEMA DE AUTENTICACIÓN');
    console.log('─'.repeat(50));
    
    try {
      // Test 1: Login admin por defecto
      console.log('   🔍 Test 1: Login admin por defecto...');
      try {
        const loginResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
          email: 'admin@gym.com',
          password: 'Admin123!'
        });
        
        if (loginResponse.data?.success && loginResponse.data.data?.token) {
          this.tokens.admin = loginResponse.data.data.token;
          this.diagnosis.auth.status = 'healthy';
          this.diagnosis.auth.details.push('✅ Usuario admin por defecto EXISTE y funciona');
          this.diagnosis.auth.details.push(`✅ Email: admin@gym.com`);
          this.diagnosis.auth.details.push(`✅ Token generado correctamente`);
          this.diagnosis.auth.details.push(`✅ Usuario: ${loginResponse.data.data.user.firstName} ${loginResponse.data.data.user.lastName}`);
          this.diagnosis.auth.details.push(`✅ Rol: ${loginResponse.data.data.user.role}`);
          
          // Test 2: Validar token en ruta protegida
          console.log('   🔍 Test 2: Validando token en ruta protegida...');
          try {
            const protectedResponse = await axios.get(`${this.baseURL}/api/users?limit=1`, {
              headers: { Authorization: `Bearer ${this.tokens.admin}` }
            });
            
            if (protectedResponse.data?.success) {
              this.diagnosis.auth.details.push('✅ Token válido para rutas protegidas');
            } else {
              this.diagnosis.auth.issues.push('⚠️ Token generado pero rutas protegidas fallan');
            }
          } catch (authError) {
            this.diagnosis.auth.issues.push(`⚠️ Error validando token: ${authError.response?.status} - ${authError.message}`);
          }
          
        } else {
          this.diagnosis.auth.issues.push('❌ Login responde pero sin token válido');
        }
        
      } catch (loginError) {
        this.diagnosis.auth.status = 'error';
        
        if (loginError.response?.status === 401) {
          this.diagnosis.auth.issues.push('❌ USUARIO ADMIN POR DEFECTO NO EXISTE');
          this.diagnosis.auth.issues.push('   🔥 PROBLEMA: No hay admin@gym.com en la tabla users');
          this.diagnosis.auth.issues.push('   🔥 O la contraseña no es Admin123!');
          this.diagnosis.auth.issues.push('   🔥 SOLUCIÓN: Crear usuario admin manualmente');
          this.recommendations.push('CRÍTICO: Crear usuario admin@gym.com con password Admin123! y role=admin');
          this.recommendations.push('O ejecutar seeder: npx sequelize-cli db:seed:all');
        } else if (loginError.response?.status === 500) {
          this.diagnosis.auth.issues.push('❌ ERROR SERVIDOR EN LOGIN');
          this.diagnosis.auth.issues.push(`   🔥 Error SQL: ${loginError.response.data?.message}`);
          this.diagnosis.auth.issues.push('   🔥 PROBLEMA: Tabla users no existe o está mal configurada');
          this.recommendations.push('CRÍTICO: Verificar tabla users y ejecutar migraciones');
        } else {
          this.diagnosis.auth.issues.push(`❌ Error desconocido en login: ${loginError.message}`);
        }
      }
      
      // Test 3: Crear usuario de prueba (si admin funciona)
      if (this.tokens.admin) {
        console.log('   🔍 Test 3: Creando usuario cliente de prueba...');
        
        const testEmail = `testclient.${Date.now()}@test.com`;
        try {
          const userResponse = await axios.post(`${this.baseURL}/api/users`, {
            firstName: 'Test',
            lastName: 'Client',
            email: testEmail,
            password: 'Test123!',
            role: 'cliente'
          }, {
            headers: { Authorization: `Bearer ${this.tokens.admin}` }
          });
          
          if (userResponse.data?.success) {
            this.diagnosis.auth.details.push('✅ Creación de usuarios funciona');
            
            // Test login del nuevo usuario
            try {
              const clientLoginResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
                email: testEmail,
                password: 'Test123!'
              });
              
              if (clientLoginResponse.data?.success && clientLoginResponse.data.data?.token) {
                this.tokens.client = clientLoginResponse.data.data.token;
                this.diagnosis.auth.details.push('✅ Login de usuarios creados funciona');
              }
            } catch (clientLoginError) {
              this.diagnosis.auth.issues.push('⚠️ Usuario se crea pero no puede hacer login');
            }
          }
          
        } catch (createError) {
          if (createError.response?.status === 400) {
            this.diagnosis.auth.details.push('⚠️ Creación requiere validaciones específicas (normal)');
          } else if (createError.response?.status === 404) {
            this.diagnosis.auth.issues.push('❌ Ruta POST /api/users no implementada');
            this.recommendations.push('Implementar creación de usuarios via /api/users');
          } else {
            this.diagnosis.auth.issues.push(`⚠️ Error creando usuario: ${createError.message}`);
          }
        }
      }
      
    } catch (error) {
      this.diagnosis.auth.status = 'error';
      this.diagnosis.auth.issues.push(`❌ Error diagnosticando autenticación: ${error.message}`);
    }
    
    this.mostrarResultadoDiagnostico('SISTEMA DE AUTENTICACIÓN', this.diagnosis.auth);
  }

  async diagnosticar6_SistemaMembresias() {
    console.log('\n🎫 DIAGNÓSTICO 6: SISTEMA DE MEMBRESÍAS');
    console.log('─'.repeat(50));
    
    try {
      let funcionesOK = 0;
      const totalFunciones = this.realRoutes.membership.length;
      
      for (const ruta of this.realRoutes.membership) {
        console.log(`   🔍 Probando: ${ruta.description}...`);
        
        try {
          // Determinar headers necesarios
          let headers = {};
          if (ruta.auth) {
            if (ruta.requireStaff && this.tokens.admin) {
              headers.Authorization = `Bearer ${this.tokens.admin}`;
            } else if (this.tokens.client) {
              headers.Authorization = `Bearer ${this.tokens.client}`;
            } else if (this.tokens.admin) {
              headers.Authorization = `Bearer ${this.tokens.admin}`;
            } else {
              this.diagnosis.membership.details.push(`⏭️ ${ruta.description}: Sin token para probar`);
              continue;
            }
          }
          
          let response;
          
          if (ruta.method === 'GET') {
            response = await axios.get(`${this.baseURL}${ruta.url}`, { headers });
          } else if (ruta.method === 'POST') {
            const testData = this.generarDatosPruebaMembership(ruta.url);
            response = await axios.post(`${this.baseURL}${ruta.url}`, testData, { headers });
          }
          
          if (response?.data?.success) {
            funcionesOK++;
            this.diagnosis.membership.details.push(`✅ ${ruta.description}: FUNCIONA`);
            
            // Analizar datos específicos
            if (ruta.url.includes('/plans') && response.data.data?.plans) {
              const plans = response.data.data.plans;
              this.diagnosis.membership.details.push(`   📊 ${plans.length} planes disponibles`);
            } else if (ruta.url.includes('/memberships') && response.data.data) {
              const memberships = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
              this.diagnosis.membership.details.push(`   📊 ${memberships.length} membresías encontradas`);
            }
            
          } else {
            this.diagnosis.membership.issues.push(`❌ ${ruta.description}: Responde pero success=false`);
          }
          
        } catch (error) {
          const errorDetail = this.interpretarErrorRuta(error, ruta.url);
          
          if (error.response?.status === 404) {
            this.diagnosis.membership.issues.push(`❌ ${ruta.description}: Ruta no implementada (404)`);
            this.recommendations.push(`Implementar ruta de membresías: ${ruta.url}`);
          } else if (error.response?.status === 500) {
            this.diagnosis.membership.issues.push(`❌ ${ruta.description}: Error servidor (500)`);
            if (error.response.data?.message) {
              this.diagnosis.membership.issues.push(`   🔥 ${error.response.data.message}`);
            }
          } else if (error.response?.status === 401) {
            this.diagnosis.membership.details.push(`⚠️ ${ruta.description}: Requiere autenticación`);
          } else if (error.response?.status === 400) {
            this.diagnosis.membership.issues.push(`❌ ${ruta.description}: VALIDACIÓN FALLIDA (400) - ${error.response.data?.message || 'Datos inválidos'}`);
          } else {
            this.diagnosis.membership.issues.push(`❌ ${ruta.description}: ${errorDetail}`);
          }
        }
      }
      
      // Evaluar status del sistema de membresías
      if (funcionesOK === totalFunciones) {
        this.diagnosis.membership.status = 'healthy';
        this.diagnosis.membership.details.push('🎉 Sistema de membresías completamente funcional');
      } else if (funcionesOK > totalFunciones / 2) {
        this.diagnosis.membership.status = 'warning';
        this.diagnosis.membership.details.push(`⚠️ ${funcionesOK}/${totalFunciones} funciones de membresías funcionan`);
      } else {
        this.diagnosis.membership.status = 'error';
        this.diagnosis.membership.issues.push(`❌ Solo ${funcionesOK}/${totalFunciones} funciones funcionan`);
      }
      
      console.log(`   📊 Funciones de membresías: ${funcionesOK}/${totalFunciones}`);
      
    } catch (error) {
      this.diagnosis.membership.status = 'error';
      this.diagnosis.membership.issues.push(`❌ Error diagnosticando membresías: ${error.message}`);
    }
    
    this.mostrarResultadoDiagnostico('SISTEMA DE MEMBRESÍAS', this.diagnosis.membership);
  }

  async diagnosticar7_SistemaPagos() {
    console.log('\n💳 DIAGNÓSTICO 7: SISTEMA DE PAGOS');
    console.log('─'.repeat(50));
    
    try {
      let funcionesOK = 0;
      const totalFunciones = this.realRoutes.payments.length;
      
      for (const ruta of this.realRoutes.payments) {
        console.log(`   🔍 Probando: ${ruta.description}...`);
        
        try {
          // Determinar headers necesarios
          let headers = {};
          if (ruta.auth) {
            if (ruta.requireStaff && this.tokens.admin) {
              headers.Authorization = `Bearer ${this.tokens.admin}`;
            } else if (this.tokens.client) {
              headers.Authorization = `Bearer ${this.tokens.client}`;
            } else if (this.tokens.admin) {
              headers.Authorization = `Bearer ${this.tokens.admin}`;
            } else {
              this.diagnosis.payments.details.push(`⏭️ ${ruta.description}: Sin token para probar`);
              continue;
            }
          }
          
          let response;
          
          if (ruta.method === 'GET') {
            response = await axios.get(`${this.baseURL}${ruta.url}`, { headers });
          } else if (ruta.method === 'POST') {
            const testData = this.generarDatosPruebaPagos(ruta.url);
            response = await axios.post(`${this.baseURL}${ruta.url}`, testData, { headers });
          }
          
          if (response?.data?.success) {
            funcionesOK++;
            this.diagnosis.payments.details.push(`✅ ${ruta.description}: FUNCIONA`);
            
            // Analizar datos específicos
            if (ruta.url.includes('/reports') && response.data.data) {
              this.diagnosis.payments.details.push(`   📊 Reportes financieros disponibles`);
            } else if (ruta.url === '/api/payments' && response.data.data) {
              const payments = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
              this.diagnosis.payments.details.push(`   📊 ${payments.length} pagos encontrados`);
            }
            
          } else {
            this.diagnosis.payments.issues.push(`❌ ${ruta.description}: Responde pero success=false`);
          }
          
        } catch (error) {
          const errorDetail = this.interpretarErrorRuta(error, ruta.url);
          
          if (error.response?.status === 404) {
            this.diagnosis.payments.issues.push(`❌ ${ruta.description}: Ruta no implementada (404)`);
            this.recommendations.push(`Implementar ruta de pagos: ${ruta.url}`);
          } else if (error.response?.status === 500) {
            this.diagnosis.payments.issues.push(`❌ ${ruta.description}: Error servidor (500)`);
            if (error.response.data?.message) {
              this.diagnosis.payments.issues.push(`   🔥 ${error.response.data.message}`);
            }
          } else if (error.response?.status === 401) {
            this.diagnosis.payments.details.push(`⚠️ ${ruta.description}: Requiere autenticación`);
          } else if (error.response?.status === 403) {
            this.diagnosis.payments.details.push(`⚠️ ${ruta.description}: Requiere permisos específicos`);
          } else if (error.response?.status === 400) {
            this.diagnosis.payments.issues.push(`❌ ${ruta.description}: VALIDACIÓN FALLIDA (400) - ${error.response.data?.message || 'Errores de validación'}`);
          } else {
            this.diagnosis.payments.issues.push(`❌ ${ruta.description}: ${errorDetail}`);
          }
        }
      }
      
      // Evaluar status del sistema de pagos
      if (funcionesOK === totalFunciones) {
        this.diagnosis.payments.status = 'healthy';
        this.diagnosis.payments.details.push('🎉 Sistema de pagos completamente funcional');
      } else if (funcionesOK > totalFunciones / 2) {
        this.diagnosis.payments.status = 'warning';
        this.diagnosis.payments.details.push(`⚠️ ${funcionesOK}/${totalFunciones} funciones de pagos funcionan`);
      } else {
        this.diagnosis.payments.status = 'error';
        this.diagnosis.payments.issues.push(`❌ Solo ${funcionesOK}/${totalFunciones} funciones funcionan`);
      }
      
      console.log(`   📊 Funciones de pagos: ${funcionesOK}/${totalFunciones}`);
      
    } catch (error) {
      this.diagnosis.payments.status = 'error';
      this.diagnosis.payments.issues.push(`❌ Error diagnosticando pagos: ${error.message}`);
    }
    
    this.mostrarResultadoDiagnostico('SISTEMA DE PAGOS', this.diagnosis.payments);
  }

  // ✅ CORREGIDO: Datos de prueba mejorados
  generarDatosPrueba(url) {
    if (url.includes('/auth/login')) {
      return { email: 'admin@gym.com', password: 'Admin123!' };
    } else if (url.includes('/auth/register')) {
      return { 
        firstName: 'Test', 
        lastName: 'User', 
        email: `test${Date.now()}@test.com`, 
        password: 'Test123!' 
      };
    } else if (url.includes('/users')) {
      return { 
        firstName: 'Test', 
        lastName: 'User', 
        email: `test${Date.now()}@test.com`, 
        password: 'Test123!',
        role: 'cliente'
      };
    }
    return {};
  }

  generarDatosPruebaMembership(url) {
    if (url.includes('/purchase')) {
      return {
        planId: 1,
        selectedSchedule: { monday: [1] },
        paymentMethod: 'cash',
        // ✅ AGREGADO: Datos adicionales que podrían requerirse
        userId: 'test-user-id',
        type: 'monthly'
      };
    }
    return {};
  }

  // ✅ CORREGIDO: Datos de prueba para pagos mejorados
  generarDatosPruebaPagos(url) {
    if (url.includes('/daily-income')) {
      return {
        amount: 25.00,
        paymentMethod: 'cash',
        paymentType: 'daily', // ✅ AGREGADO: Campo que requiere el modelo Payment
        description: 'Pago diario de prueba',
        // ✅ AGREGADO: Para pagos anónimos
        anonymousClientInfo: {
          name: 'Cliente Prueba',
          phone: '+502 1234-5678'
        }
      };
    } else if (url.includes('/activate-cash-membership')) {
      return {
        membershipId: 'test-id'
      };
    } else if (url === '/api/payments') {
      return {
        amount: 100.00,
        paymentMethod: 'cash',
        paymentType: 'membership', // ✅ AGREGADO: Campo requerido
        // ✅ AGREGADO: Información del cliente anónimo
        anonymousClientInfo: {
          name: 'Cliente Test',
          phone: '+502 9999-9999',
          notes: 'Pago de prueba'
        }
      };
    }
    return {};
  }

  interpretarErrorRuta(error, url) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      switch (status) {
        case 404:
          return 'NO IMPLEMENTADA (404)';
        case 401:
          return 'SIN AUTORIZACIÓN (401)';
        case 403:
          return 'PROHIBIDO (403)';
        case 400:
          return `VALIDACIÓN FALLIDA (400) - ${data?.message || 'Datos inválidos'}`;
        case 500:
          return `ERROR SERVIDOR (500) - ${data?.message || 'Error interno'}`;
        default:
          return `HTTP ${status} - ${data?.message || 'Error desconocido'}`;
      }
    } else if (error.code === 'ECONNABORTED') {
      return 'TIMEOUT';
    } else {
      return error.message;
    }
  }

  mostrarResultadoDiagnostico(categoria, diagnosis) {
    const statusIcon = {
      'healthy': '💚',
      'warning': '⚠️',
      'error': '❤️',
      'unknown': '❓'
    };
    
    console.log(`\n   ${statusIcon[diagnosis.status]} ${categoria}: ${diagnosis.status.toUpperCase()}`);
    
    if (diagnosis.details.length > 0) {
      diagnosis.details.forEach(detail => console.log(`      ${detail}`));
    }
    
    if (diagnosis.issues.length > 0) {
      diagnosis.issues.forEach(issue => console.log(`      ${issue}`));
    }
  }

  generarDiagnosticoCompleto() {
    console.log('\n📋 DIAGNÓSTICO COMPLETO DEL SISTEMA');
    console.log('═'.repeat(80));
    
    const sistemas = [
      { name: 'Servidor', data: this.diagnosis.server, critical: true },
      { name: 'Base de Datos', data: this.diagnosis.database, critical: true },
      { name: 'Tablas', data: this.diagnosis.tables, critical: true },
      { name: 'Rutas', data: this.diagnosis.routes, critical: true },
      { name: 'Autenticación', data: this.diagnosis.auth, critical: true },
      { name: 'Membresías', data: this.diagnosis.membership, critical: false },
      { name: 'Pagos', data: this.diagnosis.payments, critical: false }
    ];
    
    let sistemasHealthy = 0;
    let sistemasWarning = 0;
    let sistemasCriticos = 0;
    let sistemasCriticosTotal = 0;
    
    sistemas.forEach(sistema => {
      const status = sistema.data.status;
      const icon = this.getStatusIcon(status);
      const criticalMark = sistema.critical ? ' 🔥' : '';
      
      console.log(`${icon} ${sistema.name}${criticalMark}: ${status.toUpperCase()}`);
      
      if (sistema.critical) {
        sistemasCriticosTotal++;
        if (status === 'healthy') sistemasHealthy++;
        else if (status === 'error') sistemasCriticos++;
      } else {
        if (status === 'healthy') sistemasHealthy++;
        else if (status === 'warning') sistemasWarning++;
        else if (status === 'error') sistemasCriticos++;
      }
    });
    
    const totalSistemas = sistemas.length;
    const sistemasOK = sistemas.filter(s => s.data.status === 'healthy').length;
    const healthPercentage = ((sistemasOK / totalSistemas) * 100).toFixed(1);
    
    console.log('\n📊 RESUMEN EJECUTIVO:');
    console.log(`   💚 Sistemas funcionando: ${sistemasOK}/${totalSistemas} (${healthPercentage}%)`);
    console.log(`   ⚠️ Sistemas con advertencias: ${sistemasWarning}`);
    console.log(`   ❤️ Sistemas con errores: ${sistemasCriticos}`);
    console.log(`   🔥 Sistemas críticos fallando: ${sistemas.filter(s => s.critical && s.data.status === 'error').length}/${sistemasCriticosTotal}`);
    
    // Diagnóstico específico
    if (sistemasCriticos === 0 && sistemasOK >= totalSistemas * 0.8) {
      console.log('\n🎉 DIAGNÓSTICO: SISTEMA COMPLETAMENTE SALUDABLE');
      console.log('   Tu backend está funcionando correctamente');
      console.log('   Todas las funcionalidades críticas operativas');
    } else if (sistemas.filter(s => s.critical && s.data.status === 'error').length === 0) {
      console.log('\n✅ DIAGNÓSTICO: SISTEMA FUNCIONAL');
      console.log('   Los componentes críticos funcionan correctamente');
      console.log('   Algunas funcionalidades avanzadas pueden necesitar mejoras');
    } else {
      console.log('\n🚨 DIAGNÓSTICO: PROBLEMAS CRÍTICOS DETECTADOS');
      console.log('   Hay componentes esenciales que requieren atención inmediata');
    }
    
    console.log('\n🔧 RECOMENDACIONES PRIORIZADAS POR CRITICIDAD:');
    console.log('═'.repeat(50));
    
    if (this.recommendations.length === 0) {
      console.log('✅ No hay recomendaciones críticas - Tu sistema está bien configurado');
    } else {
      // Separar recomendaciones críticas de normales
      const criticasRecs = this.recommendations.filter(rec => rec.includes('CRÍTICO'));
      const normalesRecs = this.recommendations.filter(rec => !rec.includes('CRÍTICO'));
      
      if (criticasRecs.length > 0) {
        console.log('\n🚨 CRÍTICAS (Resolver PRIMERO):');
        criticasRecs.forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec.replace('CRÍTICO: ', '')}`);
        });
      }
      
      if (normalesRecs.length > 0) {
        console.log('\n💡 MEJORAS (Resolver después):');
        normalesRecs.forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec}`);
        });
      }
    }
    
    console.log('\n📋 PLAN DE ACCIÓN ESPECÍFICO:');
    console.log('─'.repeat(50));
    
    // Plan de acción basado en diagnóstico específico
    if (this.diagnosis.server.status === 'error') {
      console.log('🚨 PASO 1: INICIAR SERVIDOR');
      console.log('   → npm start');
      console.log('   → Verificar puerto 5000 libre');
    } else if (this.diagnosis.database.status === 'error') {
      console.log('🚨 PASO 1: SOLUCIONAR BASE DE DATOS');
      if (this.diagnosis.database.issues.some(i => i.includes('no está corriendo'))) {
        console.log('   → Iniciar MySQL/PostgreSQL');
        console.log('   → sudo service mysql start  (Linux)');
        console.log('   → brew services start mysql  (Mac)');
      } else if (this.diagnosis.database.issues.some(i => i.includes('Credenciales'))) {
        console.log('   → Verificar DB_USER y DB_PASSWORD en .env');
        console.log('   → Verificar que el usuario tenga permisos');
      } else if (this.diagnosis.database.issues.some(i => i.includes('no existe'))) {
        console.log('   → Crear base de datos especificada en DB_NAME');
        console.log('   → CREATE DATABASE nombrebd;');
      }
    } else if (this.diagnosis.tables.status === 'error') {
      console.log('🚨 PASO 1: EJECUTAR MIGRACIONES');
      console.log('   → npx sequelize-cli db:migrate');
      console.log('   → npx sequelize-cli db:seed:all');
    } else if (this.diagnosis.auth.status === 'error') {
      console.log('🚨 PASO 1: CREAR USUARIO ADMIN');
      console.log('   → Insertar usuario admin manualmente en BD');
      console.log('   → O ejecutar seeder correspondiente');
    } else {
      console.log('✅ PASOS BÁSICOS COMPLETADOS');
      console.log('💡 PASO SIGUIENTE: Implementar funcionalidades del manual');
      console.log('   → Revisar rutas faltantes del sistema de membresías');
      console.log('   → Implementar validaciones específicas');
      console.log('   → Configurar servicios opcionales');
    }
    
    console.log('\n🏥 DIAGNÓSTICO ESPECÍFICO COMPLETADO');
    console.log('Ahora tienes un plan exacto de qué arreglar y en qué orden');
  }

  getStatusIcon(status) {
    const icons = {
      'healthy': '💚',
      'warning': '⚠️',
      'error': '❤️',
      'unknown': '❓'
    };
    return icons[status] || '❓';
  }
}

// Función para mostrar ayuda
function showHelp() {
  console.log('\n🏥 Elite Fitness Club - Doctor del Sistema v2.0\n');
  console.log('Uso:');
  console.log('   node test-membership-purchase.js        # Diagnóstico con rutas reales');
  console.log('   node test-membership-purchase.js --help # Mostrar ayuda\n');
  
  console.log('🩺 Esta versión usa las rutas REALES de tu backend:');
  console.log('   📋 Basado en membershipRoutes.js y paymentRoutes.js');
  console.log('   🎯 Prueba rutas que SÍ tienes implementadas');
  console.log('   🔍 Detecta exactamente qué tabla o columna falta');
  console.log('   💡 Da pasos específicos para solucionar cada problema\n');
  
  console.log('📊 Diagnóstico por capas:');
  console.log('   🏥 Servidor (¿está corriendo?)');
  console.log('   🗄️ Base de datos (¿conecta? ¿credenciales OK?)');
  console.log('   📋 Tablas específicas (¿existen? ¿campos correctos?)');
  console.log('   🛤️ Rutas reales (según tus archivos de rutas)');
  console.log('   🔐 Autenticación (¿admin existe? ¿tokens OK?)');
  console.log('   🎫 Sistema membresías (rutas específicas)');
  console.log('   💳 Sistema pagos (rutas específicas)\n');
  
  console.log('🎯 Resultado: Plan de acción exacto y priorizado');
}

// Ejecutar script
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const doctor = new SystemDoctorV2();
  
  try {
    await doctor.runDiagnosis();
    
  } catch (error) {
    console.error('\n💀 DIAGNÓSTICO FALLÓ:');
    console.error(`Error: ${error.message}`);
    
    console.error('\n🚨 VERIFICACIONES BÁSICAS:');
    console.error('1. ¿Servidor corriendo? → npm start');
    console.error('2. ¿Puerto 5000 libre? → netstat -an | grep 5000');
    console.error('3. ¿BD corriendo? → sudo service mysql status');
    console.error('4. ¿Variables .env OK? → cat .env');
    
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { SystemDoctorV2 };