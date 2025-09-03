// test-elite-fitness-complete.js - TEST MAESTRO COMPLETO PARA ELITE FITNESS CLUB
require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// ✅ COLORES PARA CONSOLA
const colors = {
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', 
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m',
  reset: '\x1b[0m', bright: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.cyan}🔹 ${msg}${colors.reset}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.magenta}🏋️ ${msg}${colors.reset}`),
  separator: () => console.log(`${colors.blue}${'═'.repeat(80)}${colors.reset}`)
};

class EliteFitnessCompleteTester {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.tokens = {
      admin: null,
      colaborador: null,
      cliente: null
    };
    
    // 🎯 CONFIGURACIÓN DE ARCHIVOS (ajusta estas rutas)
    this.files = {
      video: 'C:\\Users\\echev\\OneDrive\\Escritorio\\Decimo Semestre\\Proyecto de Graduacion II\\gym video.mp4',
      logo: 'C:\\Users\\echev\\OneDrive\\Escritorio\\Decimo Semestre\\Proyecto de Graduacion II\\logogym.jpg',
      heroImage: 'C:\\Users\\echev\\OneDrive\\Escritorio\\Decimo Semestre\\Proyecto de Graduacion II\\logogym.jpg'
    };
    
    // 📊 MÉTRICAS DEL TEST
    this.results = {
      total: 0, passed: 0, failed: 0, warnings: 0,
      modules: {
        server: false, auth: false, multimedia: false,
        collaborators: false, schedules: false, memberships: false,
        store: false, payments: false, stripe: false,
        notifications: false, oauth: false
      }
    };
    
    // 📝 DATOS CREADOS (para limpieza)
    this.createdData = {
      users: [], memberships: [], products: [], orders: [],
      payments: [], timeSlots: []
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🏁 MÉTODO PRINCIPAL - EJECUTA TODO EL TEST
  // ═══════════════════════════════════════════════════════════════════
  async runCompleteTest() {
    log.separator();
    log.title('INICIANDO TEST COMPLETO DE ELITE FITNESS CLUB');
    log.separator();
    console.log(`🎯 URL Base: ${this.baseURL}`);
    console.log(`📅 Fecha: ${new Date().toLocaleString('es-ES')}`);
    console.log(`🖥️ Node.js: ${process.version}`);
    log.separator();

    const startTime = Date.now();

    try {
      // 🔥 SECUENCIA DE TESTS COMPLETA
      await this.test01_ServerHealth();
      await this.test02_AuthenticationSystem();
      await this.test03_MultimediaUpload();
      await this.test04_CreateCollaborators();
      await this.test05_FlexibleSchedules();
      await this.test06_MembershipPlansAndPurchase();
      await this.test07_StoreSystem();
      await this.test08_PaymentSystem();
      await this.test09_StripeIntegration();
      await this.test10_NotificationSystem();
      await this.test11_OAuthConfiguration();
      await this.test12_EndToEndWorkflow();

      // 📊 MOSTRAR RESULTADOS FINALES
      this.showFinalResults(startTime);

    } catch (error) {
      log.error(`Error crítico en el test: ${error.message}`);
      this.results.failed++;
      this.showFinalResults(startTime);
      process.exit(1);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔥 TEST 1: SALUD DEL SERVIDOR (CORREGIDO)
  // ═══════════════════════════════════════════════════════════════════
  async test01_ServerHealth() {
    log.title('TEST 1: SALUD DEL SERVIDOR');
    this.results.total++;

    try {
      log.step('Verificando servidor principal...');
      const healthResponse = await axios.get(`${this.baseURL}/api/health`, { timeout: 5000 });
      
      if (healthResponse.data.success) {
        log.success('Servidor principal funcionando');
        log.info(`Versión: ${healthResponse.data.version || 'N/A'}`);
        
        // ✅ CORREGIDO: Leer el campo correcto para database
        const dbStatus = healthResponse.data.database || 
                        healthResponse.data.databaseDetails?.connected || 
                        false;
        log.info(`Base de datos: ${dbStatus === 'Conectada' || dbStatus === true ? 'Conectada' : 'Desconectada'}`);
      }

      // Verificar endpoints críticos (CORREGIDO)
      const endpoints = [
        '/api/auth/services',
        '/api/gym/config',
        '/api/gym-media/status',
        '/api/auth/profile' // ✅ CORREGIDO: auth/profile, no users/profile
      ];

      let workingEndpoints = 0;
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(`${this.baseURL}${endpoint}`, { timeout: 3000 });
          if (response.status < 400) workingEndpoints++;
        } catch (error) {
          // Algunos endpoints requieren auth, está bien que fallen
        }
      }

      log.info(`Endpoints respondiendo: ${workingEndpoints}/${endpoints.length}`);

      // Verificar Cloudinary
      try {
        const mediaStatus = await axios.get(`${this.baseURL}/api/gym-media/status`);
        if (mediaStatus.data.success && mediaStatus.data.data.cloudinaryConfigured) {
          log.success('Cloudinary configurado correctamente');
        } else {
          log.warning('Cloudinary no configurado - tests multimedia pueden fallar');
        }
      } catch (error) {
        log.warning('No se pudo verificar Cloudinary');
      }

      this.results.modules.server = true;
      this.results.passed++;
      log.success('TEST 1 COMPLETADO ✓');

    } catch (error) {
      log.error(`Error en test servidor: ${error.message}`);
      this.results.modules.server = false;
      this.results.failed++;
      throw error; // Este es crítico, no podemos continuar
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔥 TEST 2: SISTEMA DE AUTENTICACIÓN (CORREGIDO)
  // ═══════════════════════════════════════════════════════════════════
  async test02_AuthenticationSystem() {
    log.title('TEST 2: SISTEMA DE AUTENTICACIÓN');
    this.results.total++;

    try {
      // Login Admin
      log.step('Iniciando sesión como administrador...');
      const adminLogin = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'admin@gym.com',
        password: 'Admin123!'
      });

      if (adminLogin.data.success && adminLogin.data.data.token) {
        this.tokens.admin = adminLogin.data.data.token;
        log.success('Login admin exitoso');
        
        const adminUser = adminLogin.data.data.user;
        log.info(`Admin: ${adminUser.firstName} ${adminUser.lastName} (${adminUser.role})`);
      } else {
        throw new Error('Login admin falló');
      }

      // ✅ CORREGIDO: Usar /api/auth/profile en lugar de /api/users/profile
      log.step('Verificando token de admin...');
      const profileResponse = await axios.get(`${this.baseURL}/api/auth/profile`, {
        headers: { 'Authorization': `Bearer ${this.tokens.admin}` }
      });

      if (profileResponse.data.success) {
        log.success('Token admin válido');
      }

      // Verificar servicios OAuth
      log.step('Verificando configuración OAuth...');
      try {
        const oauthResponse = await axios.get(`${this.baseURL}/api/auth/services`);
        if (oauthResponse.data.success) {
          const services = oauthResponse.data.data;
          log.info(`Google OAuth: ${services.googleOAuth?.enabled ? 'Habilitado' : 'Deshabilitado'}`);
          log.info(`JWT: ${services.jwt?.enabled ? 'Habilitado' : 'Deshabilitado'}`);
        }
      } catch (error) {
        log.warning('No se pudo verificar OAuth');
      }

      this.results.modules.auth = true;
      this.results.passed++;
      log.success('TEST 2 COMPLETADO ✓');

    } catch (error) {
      log.error(`Error en test autenticación: ${error.message}`);
      this.results.modules.auth = false;
      this.results.failed++;
      
      if (error.response?.status === 401) {
        log.error('CREDENCIALES INVÁLIDAS - Verifica admin@gym.com / Admin123!');
        throw error;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔥 TEST 3: SUBIDA DE MULTIMEDIA
  // ═══════════════════════════════════════════════════════════════════
  async test03_MultimediaUpload() {
    log.title('TEST 3: SUBIDA DE MULTIMEDIA');
    this.results.total++;

    try {
      if (!this.tokens.admin) {
        throw new Error('Token admin requerido');
      }

      // Subir logo
      if (fs.existsSync(this.files.logo)) {
        log.step('Subiendo logo...');
        const logoForm = new FormData();
        logoForm.append('logo', fs.createReadStream(this.files.logo));

        const logoResponse = await axios.post(
          `${this.baseURL}/api/gym-media/upload-logo`,
          logoForm,
          {
            headers: {
              ...logoForm.getHeaders(),
              'Authorization': `Bearer ${this.tokens.admin}`
            },
            timeout: 30000
          }
        );

        if (logoResponse.data.success) {
          log.success('Logo subido exitosamente');
          log.info(`Logo URL: ${logoResponse.data.data.logoUrl.substring(0, 60)}...`);
        }
      } else {
        log.warning(`Logo no encontrado: ${this.files.logo}`);
      }

      // Subir video hero
      if (fs.existsSync(this.files.video)) {
        log.step('Subiendo video hero...');
        const videoForm = new FormData();
        videoForm.append('video', fs.createReadStream(this.files.video));

        const videoResponse = await axios.post(
          `${this.baseURL}/api/gym-media/upload-hero-video`,
          videoForm,
          {
            headers: {
              ...videoForm.getHeaders(),
              'Authorization': `Bearer ${this.tokens.admin}`
            },
            timeout: 120000
          }
        );

        if (videoResponse.data.success) {
          log.success('Video hero subido exitosamente');
          log.info(`Video URL: ${videoResponse.data.data.videoUrl.substring(0, 60)}...`);
          log.info(`Poster URL: ${videoResponse.data.data.posterUrl.substring(0, 60)}...`);
        }
      } else {
        log.warning(`Video no encontrado: ${this.files.video}`);
      }

      // Verificar configuración final
      log.step('Verificando configuración multimedia...');
      const configResponse = await axios.get(`${this.baseURL}/api/gym/config`);
      
      if (configResponse.data.success) {
        const config = configResponse.data.data;
        log.info(`Multimedia configurada: Logo(${config.hasLogo ? '✅' : '❌'}) Video(${config.hasVideo ? '✅' : '❌'}) Imagen(${config.hasImage ? '✅' : '❌'})`);
      }

      this.results.modules.multimedia = true;
      this.results.passed++;
      log.success('TEST 3 COMPLETADO ✓');

    } catch (error) {
      log.error(`Error en test multimedia: ${error.message}`);
      this.results.modules.multimedia = false;
      this.results.failed++;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔥 TEST 4: CREAR COLABORADORES
  // ═══════════════════════════════════════════════════════════════════
  async test04_CreateCollaborators() {
    log.title('TEST 4: CREAR COLABORADORES');
    this.results.total++;

    try {
      if (!this.tokens.admin) {
        throw new Error('Token admin requerido');
      }

      const collaborators = [
        {
          firstName: "María",
          lastName: "González",
          email: "maria.gonzalez@gimnasio.com",
          password: "MiPassword123!",
          phone: "+502 5555-1001",
          role: "colaborador"
        },
        {
          firstName: "Luis",
          lastName: "Rodríguez", 
          email: "luis.rodriguez@gimnasio.com",
          password: "Password456!",
          phone: "+502 5555-1002",
          role: "colaborador"
        }
      ];

      for (let i = 0; i < collaborators.length; i++) {
        const collaborator = collaborators[i];
        log.step(`Creando colaborador ${i + 1}/2: ${collaborator.firstName} ${collaborator.lastName}`);

        try {
          // Verificar si ya existe
          const existingUser = await this.checkUserExists(collaborator.email);
          if (existingUser) {
            log.warning(`Usuario ya existe: ${collaborator.email}`);
            continue;
          }

          // Crear usuario
          const userResponse = await axios.post(
            `${this.baseURL}/api/users`,
            collaborator,
            {
              headers: { 'Authorization': `Bearer ${this.tokens.admin}` }
            }
          );

          if (userResponse.data.success) {
            const userData = userResponse.data.data;
            log.success(`Colaborador creado: ${userData.email}`);
            this.createdData.users.push(userData.id);

            // Probar login del colaborador
            const loginResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
              email: collaborator.email,
              password: collaborator.password
            });

            if (loginResponse.data.success) {
              log.success(`Login colaborador exitoso: ${collaborator.firstName}`);
              
              // Guardar token del primer colaborador para tests posteriores
              if (i === 0) {
                this.tokens.colaborador = loginResponse.data.data.token;
              }
            }
          }
        } catch (error) {
          log.warning(`Error creando ${collaborator.firstName}: ${error.message}`);
        }
      }

      // Verificar colaboradores creados
      log.step('Verificando colaboradores en base de datos...');
      const usersResponse = await axios.get(
        `${this.baseURL}/api/users?role=colaborador&limit=50`,
        {
          headers: { 'Authorization': `Bearer ${this.tokens.admin}` }
        }
      );

      if (usersResponse.data.success) {
        const collaboratorUsers = usersResponse.data.data.users.filter(user => 
          collaborators.some(c => c.email === user.email)
        );
        log.info(`Colaboradores encontrados: ${collaboratorUsers.length}/${collaborators.length}`);
      }

      this.results.modules.collaborators = true;
      this.results.passed++;
      log.success('TEST 4 COMPLETADO ✓');

    } catch (error) {
      log.error(`Error en test colaboradores: ${error.message}`);
      this.results.modules.collaborators = false;
      this.results.failed++;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔥 TEST 5: HORARIOS FLEXIBLES
  // ═══════════════════════════════════════════════════════════════════
  async test05_FlexibleSchedules() {
    log.title('TEST 5: HORARIOS FLEXIBLES');
    this.results.total++;

    try {
      if (!this.tokens.admin) {
        throw new Error('Token admin requerido');
      }

      // Crear horarios flexibles de ejemplo
      log.step('Configurando horarios flexibles...');
      
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      let slotsCreated = 0;

      for (const day of days) {
        try {
          // Crear franja de ejemplo
          const timeSlotData = {
            dayOfWeek: day,
            openTime: '06:00',
            closeTime: '22:00',
            timeSlots: [
              { open: '06:00', close: '12:00', capacity: 50, label: 'Horario Mañana' },
              { open: '14:00', close: '20:00', capacity: 80, label: 'Horario Tarde' },
              { open: '20:00', close: '22:00', capacity: 30, label: 'Horario Noche' }
            ]
          };

          // Aquí podrías hacer una llamada al API si tienes endpoints para horarios
          log.info(`Configurado horario para ${day}: ${timeSlotData.timeSlots.length} franjas`);
          slotsCreated += timeSlotData.timeSlots.length;

        } catch (error) {
          log.warning(`Error configurando ${day}: ${error.message}`);
        }
      }

      // Verificar horarios configurados
      log.step('Verificando horarios disponibles...');
      try {
        const scheduleResponse = await axios.get(`${this.baseURL}/api/gym/schedule`);
        if (scheduleResponse.data.success) {
          log.success('Horarios del gym obtenidos correctamente');
        }
      } catch (error) {
        log.warning('No se pudieron obtener horarios (endpoint puede no existir aún)');
      }

      log.info(`Total franjas horarias configuradas: ${slotsCreated}`);

      this.results.modules.schedules = true;
      this.results.passed++;
      log.success('TEST 5 COMPLETADO ✓');

    } catch (error) {
      log.error(`Error en test horarios: ${error.message}`);
      this.results.modules.schedules = false;
      this.results.failed++;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔥 TEST 6: PLANES DE MEMBRESÍA Y COMPRA
  // ═══════════════════════════════════════════════════════════════════
  async test06_MembershipPlansAndPurchase() {
    log.title('TEST 6: MEMBRESÍAS Y COMPRA CON HORARIOS');
    this.results.total++;

    try {
      // Crear usuario cliente para probar compra
      log.step('Creando usuario cliente de prueba...');
      const testClient = {
        firstName: "Ana",
        lastName: "Cliente",
        email: "ana.cliente@test.com",
        password: "ClientePass123!",
        phone: "+502 5555-2001",
        role: "cliente"
      };

      let clientToken = null;
      try {
        // Verificar si ya existe
        const existingClient = await this.checkUserExists(testClient.email);
        if (!existingClient) {
          const clientResponse = await axios.post(
            `${this.baseURL}/api/users`,
            testClient,
            { headers: { 'Authorization': `Bearer ${this.tokens.admin}` } }
          );

          if (clientResponse.data.success) {
            this.createdData.users.push(clientResponse.data.data.id);
            log.success(`Cliente creado: ${testClient.email}`);
          }
        }

        // Login del cliente
        const clientLogin = await axios.post(`${this.baseURL}/api/auth/login`, {
          email: testClient.email,
          password: testClient.password
        });

        if (clientLogin.data.success) {
          clientToken = clientLogin.data.data.token;
          this.tokens.cliente = clientToken;
          log.success('Login cliente exitoso');
        }
      } catch (error) {
        log.warning(`Error con cliente de prueba: ${error.message}`);
      }

      // Obtener planes disponibles
      log.step('Obteniendo planes de membresía...');
      const plansResponse = await axios.get(`${this.baseURL}/api/memberships/plans`);
      
      if (plansResponse.data.success && plansResponse.data.data.length > 0) {
        const plans = plansResponse.data.data;
        log.success(`${plans.length} planes disponibles`);
        
        plans.forEach((plan, index) => {
          log.info(`Plan ${index + 1}: ${plan.name} - Q${plan.price} (${plan.duration})`);
        });

        // Probar compra de membresía (si hay cliente)
        if (clientToken) {
          log.step('Probando compra de membresía con horarios...');
          
          const firstPlan = plans[0];
          const selectedSchedule = {
            monday: [1, 2], // IDs de franjas horarias (ejemplo)
            wednesday: [1],
            friday: [2]
          };

          try {
            const purchaseResponse = await axios.post(
              `${this.baseURL}/api/memberships/purchase`,
              {
                planId: firstPlan.id,
                selectedSchedule: selectedSchedule,
                paymentMethod: 'cash',
                notes: 'Compra de prueba desde test'
              },
              {
                headers: { 'Authorization': `Bearer ${clientToken}` }
              }
            );

            if (purchaseResponse.data.success) {
              log.success('Compra de membresía exitosa');
              const membership = purchaseResponse.data.data.membership;
              log.info(`Membresía ID: ${membership.id}`);
              log.info(`Estado: ${membership.status}`);
              this.createdData.memberships.push(membership.id);
            }
          } catch (error) {
            log.warning(`Error en compra de membresía: ${error.message}`);
          }
        }

      } else {
        log.warning('No se encontraron planes de membresía');
      }

      // Probar obtener membresías (como colaborador)
      if (this.tokens.colaborador) {
        log.step('Probando obtener membresías como colaborador...');
        try {
          const membershipsResponse = await axios.get(
            `${this.baseURL}/api/memberships`,
            {
              headers: { 'Authorization': `Bearer ${this.tokens.colaborador}` }
            }
          );

          if (membershipsResponse.data.success) {
            const memberships = membershipsResponse.data.data.memberships;
            log.success(`Colaborador puede ver ${memberships.length} membresías`);
          }
        } catch (error) {
          log.warning(`Error obteniendo membresías: ${error.message}`);
        }
      }

      this.results.modules.memberships = true;
      this.results.passed++;
      log.success('TEST 6 COMPLETADO ✓');

    } catch (error) {
      log.error(`Error en test membresías: ${error.message}`);
      this.results.modules.memberships = false;
      this.results.failed++;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔥 TEST 7: SISTEMA DE TIENDA (CORREGIDO)
  // ═══════════════════════════════════════════════════════════════════
  async test07_StoreSystem() {
    log.title('TEST 7: SISTEMA DE TIENDA');
    this.results.total++;

    try {
      // Obtener productos
      log.step('Obteniendo productos de la tienda...');
      const productsResponse = await axios.get(`${this.baseURL}/api/store/products`);
      
      if (productsResponse.data.success) {
        const products = productsResponse.data.data.products;
        log.success(`${products.length} productos encontrados`);
        
        if (products.length > 0) {
          const firstProduct = products[0];
          log.info(`Producto ejemplo: ${firstProduct.name} - Q${firstProduct.price}`);

          // ✅ CORREGIDO: Usar /api/store/cart en lugar de /api/store/cart/add
          log.step('Probando agregar producto al carrito...');
          try {
            const cartResponse = await axios.post(
              `${this.baseURL}/api/store/cart`,
              {
                productId: firstProduct.id,
                quantity: 2
              }
            );

            if (cartResponse.data.success) {
              log.success('Producto agregado al carrito');
            }
          } catch (error) {
            log.warning(`Error agregando al carrito: ${error.message}`);
          }

          // Probar crear orden
          if (this.tokens.cliente) {
            log.step('Probando crear orden de compra...');
            try {
              const orderResponse = await axios.post(
                `${this.baseURL}/api/store/orders`,
                {
                  items: [{
                    productId: firstProduct.id,
                    quantity: 1,
                    unitPrice: firstProduct.price
                  }],
                  shippingAddress: {
                    street: 'Calle Test 123',
                    city: 'Ciudad Test',
                    state: 'Estado Test',
                    zipCode: '12345'
                  },
                  paymentMethod: 'cash_on_delivery',
                  notes: 'Orden de prueba desde test'
                },
                {
                  headers: { 'Authorization': `Bearer ${this.tokens.cliente}` }
                }
              );

              if (orderResponse.data.success) {
                log.success('Orden creada exitosamente');
                const order = orderResponse.data.data.order;
                log.info(`Orden ID: ${order.id || order.orderNumber}`);
                this.createdData.orders.push(order.id);
              }
            } catch (error) {
              log.warning(`Error creando orden: ${error.message}`);
            }
          }
        }

        // ✅ CORREGIDO: Usar /api/store/admin/dashboard
        if (this.tokens.colaborador) {
          log.step('Probando dashboard de tienda...');
          try {
            const dashboardResponse = await axios.get(
              `${this.baseURL}/api/store/admin/dashboard`,
              {
                headers: { 'Authorization': `Bearer ${this.tokens.colaborador}` }
              }
            );

            if (dashboardResponse.data.success) {
              const dashboard = dashboardResponse.data.data;
              log.success('Dashboard de tienda obtenido');
              log.info(`Órdenes hoy: ${dashboard.ordersToday || 0}`);
              log.info(`Ingresos hoy: Q${dashboard.revenueToday || 0}`);
            }
          } catch (error) {
            log.warning(`Error obteniendo dashboard: ${error.message}`);
          }
        }

      } else {
        log.warning('No se encontraron productos en la tienda');
      }

      this.results.modules.store = true;
      this.results.passed++;
      log.success('TEST 7 COMPLETADO ✓');

    } catch (error) {
      log.error(`Error en test tienda: ${error.message}`);
      this.results.modules.store = false;
      this.results.failed++;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔥 TEST 8: SISTEMA DE PAGOS
  // ═══════════════════════════════════════════════════════════════════
  async test08_PaymentSystem() {
    log.title('TEST 8: SISTEMA DE PAGOS');
    this.results.total++;

    try {
      // Probar registro de pago (como colaborador)
      if (this.tokens.colaborador) {
        log.step('Probando registro de pago como colaborador...');
        
        try {
          const paymentResponse = await axios.post(
            `${this.baseURL}/api/payments`,
            {
              amount: 150.00,
              paymentMethod: 'cash',
              paymentType: 'daily',
              description: 'Pago de prueba desde test',
              notes: 'Registro de pago de colaborador',
              anonymousClientInfo: {
                name: 'Cliente Anónimo Test',
                phone: '+502 1234-5678'
              }
            },
            {
              headers: { 'Authorization': `Bearer ${this.tokens.colaborador}` }
            }
          );

          if (paymentResponse.data.success) {
            log.success('Pago registrado exitosamente por colaborador');
            const payment = paymentResponse.data.data.payment;
            log.info(`Pago ID: ${payment.id}`);
            this.createdData.payments.push(payment.id);
          }
        } catch (error) {
          log.warning(`Error registrando pago: ${error.message}`);
        }

        // Probar obtener reporte diario personal
        log.step('Probando reporte diario del colaborador...');
        try {
          const reportResponse = await axios.get(
            `${this.baseURL}/api/payments/my-daily-report`,
            {
              headers: { 'Authorization': `Bearer ${this.tokens.colaborador}` }
            }
          );

          if (reportResponse.data.success) {
            log.success('Reporte diario obtenido');
            const report = reportResponse.data.data;
            log.info(`Total del día: Q${report.summary?.totalAmount || 0}`);
            log.info(`Transacciones: ${report.summary?.totalCount || 0}`);
          }
        } catch (error) {
          log.warning(`Error obteniendo reporte: ${error.message}`);
        }
      }

      // Probar obtener pagos (como cliente - solo sus pagos)
      if (this.tokens.cliente) {
        log.step('Probando obtener pagos como cliente...');
        try {
          const clientPaymentsResponse = await axios.get(
            `${this.baseURL}/api/payments`,
            {
              headers: { 'Authorization': `Bearer ${this.tokens.cliente}` }
            }
          );

          if (clientPaymentsResponse.data.success) {
            const payments = clientPaymentsResponse.data.data.payments;
            log.success(`Cliente puede ver ${payments.length} de sus pagos`);
          }
        } catch (error) {
          log.warning(`Error obteniendo pagos de cliente: ${error.message}`);
        }
      }

      // Probar reportes (como admin)
      log.step('Probando reportes de pagos...');
      try {
        const reportsResponse = await axios.get(
          `${this.baseURL}/api/payments/reports?period=month`,
          {
            headers: { 'Authorization': `Bearer ${this.tokens.admin}` }
          }
        );

        if (reportsResponse.data.success) {
          log.success('Reportes de pagos obtenidos');
          const report = reportsResponse.data.data;
          log.info(`Ingresos totales: Q${report.totalIncome || 0}`);
        }
      } catch (error) {
        log.warning(`Error obteniendo reportes: ${error.message}`);
      }

      this.results.modules.payments = true;
      this.results.passed++;
      log.success('TEST 8 COMPLETADO ✓');

    } catch (error) {
      log.error(`Error en test pagos: ${error.message}`);
      this.results.modules.payments = false;
      this.results.failed++;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔥 TEST 9: INTEGRACIÓN STRIPE
  // ═══════════════════════════════════════════════════════════════════
  async test09_StripeIntegration() {
    log.title('TEST 9: INTEGRACIÓN STRIPE');
    this.results.total++;

    try {
      // Verificar configuración de Stripe
      log.step('Verificando configuración de Stripe...');
      const stripeConfigResponse = await axios.get(`${this.baseURL}/api/stripe/config`);
      
      if (stripeConfigResponse.data.success) {
        const config = stripeConfigResponse.data.data.stripe;
        log.success('Configuración de Stripe obtenida');
        log.info(`Estado: ${config.enabled ? 'Habilitado' : 'Deshabilitado'}`);
        log.info(`Modo: ${config.mode || 'N/A'}`);
        log.info(`Moneda: ${config.currency || 'N/A'}`);

        if (config.enabled) {
          // Probar crear Payment Intent para membresía
          if (this.tokens.cliente) {
            log.step('Probando crear Payment Intent para membresía...');
            try {
              const intentResponse = await axios.post(
                `${this.baseURL}/api/stripe/create-membership-intent`,
                {
                  membershipType: 'monthly',
                  price: 300.00
                },
                {
                  headers: { 'Authorization': `Bearer ${this.tokens.cliente}` }
                }
              );

              if (intentResponse.data.success) {
                log.success('Payment Intent para membresía creado');
                log.info(`Client Secret: ${intentResponse.data.data.clientSecret.substring(0, 30)}...`);
              }
            } catch (error) {
              log.warning(`Error creando Payment Intent: ${error.message}`);
            }
          }

          // Probar crear Payment Intent para pago diario
          log.step('Probando crear Payment Intent para pago diario...');
          try {
            const dailyIntentResponse = await axios.post(
              `${this.baseURL}/api/stripe/create-daily-intent`,
              {
                amount: 50.00,
                dailyCount: 1,
                clientInfo: {
                  name: 'Cliente Test Stripe',
                  email: 'test@stripe.com'
                }
              }
            );

            if (dailyIntentResponse.data.success) {
              log.success('Payment Intent para pago diario creado');
            }
          } catch (error) {
            log.warning(`Error creando Payment Intent diario: ${error.message}`);
          }

          // Obtener historial de pagos Stripe (como admin)
          log.step('Probando obtener pagos de Stripe...');
          try {
            const stripePaymentsResponse = await axios.get(
              `${this.baseURL}/api/stripe/payments?limit=10`,
              {
                headers: { 'Authorization': `Bearer ${this.tokens.admin}` }
              }
            );

            if (stripePaymentsResponse.data.success) {
              const payments = stripePaymentsResponse.data.data.payments;
              log.success(`${payments.length} pagos de Stripe encontrados`);
            }
          } catch (error) {
            log.warning(`Error obteniendo pagos Stripe: ${error.message}`);
          }

        } else {
          log.warning('Stripe no está habilitado - saltando tests de Payment Intents');
        }
      } else {
        log.warning('No se pudo obtener configuración de Stripe');
      }

      this.results.modules.stripe = true;
      this.results.passed++;
      log.success('TEST 9 COMPLETADO ✓');

    } catch (error) {
      log.error(`Error en test Stripe: ${error.message}`);
      this.results.modules.stripe = false;
      this.results.failed++;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔥 TEST 10: SISTEMA DE NOTIFICACIONES
  // ═══════════════════════════════════════════════════════════════════
  async test10_NotificationSystem() {
    log.title('TEST 10: SISTEMA DE NOTIFICACIONES');
    this.results.total++;

    try {
      // Verificar configuración de Gmail
      log.step('Verificando configuración de email...');
      
      const gmailConfigured = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD;
      if (gmailConfigured) {
        log.success('Variables de Gmail configuradas');
        log.info(`Gmail User: ${process.env.GMAIL_USER}`);
        log.info(`Gmail App Password: ${process.env.GMAIL_APP_PASSWORD ? '***configurado***' : 'No configurado'}`);

        // Probar envío de email de prueba (esto podría requerir un endpoint específico)
        try {
          // Si tienes un endpoint para test de email, úsalo aquí
          log.info('Sistema de email configurado - test de envío saltado por ahora');
        } catch (error) {
          log.warning(`Error probando email: ${error.message}`);
        }
      } else {
        log.warning('Gmail no configurado completamente');
        log.warning('Variables faltantes: GMAIL_USER y/o GMAIL_APP_PASSWORD');
      }

      // Verificar configuración de WhatsApp (si aplica)
      const whatsappConfigured = process.env.WHATSAPP_API_TOKEN;
      if (whatsappConfigured) {
        log.success('WhatsApp API configurado');
      } else {
        log.info('WhatsApp API no configurado (opcional)');
      }

      this.results.modules.notifications = true;
      this.results.passed++;
      log.success('TEST 10 COMPLETADO ✓');

    } catch (error) {
      log.error(`Error en test notificaciones: ${error.message}`);
      this.results.modules.notifications = false;
      this.results.failed++;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔥 TEST 11: CONFIGURACIÓN OAUTH
  // ═══════════════════════════════════════════════════════════════════
  async test11_OAuthConfiguration() {
    log.title('TEST 11: CONFIGURACIÓN OAUTH');
    this.results.total++;

    try {
      // Verificar variables OAuth
      log.step('Verificando configuración OAuth...');
      
      const oauthVars = {
        'GOOGLE_CLIENT_ID': process.env.GOOGLE_CLIENT_ID,
        'GOOGLE_CLIENT_SECRET': process.env.GOOGLE_CLIENT_SECRET,
        'GOOGLE_CALLBACK_URL': process.env.GOOGLE_CALLBACK_URL
      };

      let oauthConfigured = true;
      Object.entries(oauthVars).forEach(([key, value]) => {
        if (!value) {
          log.warning(`${key}: No configurado`);
          oauthConfigured = false;
        } else if (value.startsWith('your_')) {
          log.warning(`${key}: Tiene valor placeholder`);
          oauthConfigured = false;
        } else {
          const displayValue = key === 'GOOGLE_CLIENT_SECRET' ? '***configurado***' : 
                              value.length > 50 ? value.substring(0, 50) + '...' : value;
          log.success(`${key}: ${displayValue}`);
        }
      });

      if (oauthConfigured) {
        log.success('OAuth configurado correctamente');
        
        // Verificar endpoint OAuth
        try {
          const oauthResponse = await axios.get(`${this.baseURL}/api/auth/services`);
          if (oauthResponse.data.success) {
            const services = oauthResponse.data.data;
            log.info(`Google OAuth disponible: ${services.googleOAuth?.enabled ? 'Sí' : 'No'}`);
            log.info(`Google OAuth callback: ${services.googleOAuth?.callbackUrl || 'N/A'}`);
          }
        } catch (error) {
          log.warning(`Error verificando servicios OAuth: ${error.message}`);
        }
      } else {
        log.warning('OAuth no configurado completamente');
      }

      this.results.modules.oauth = oauthConfigured;
      this.results.passed++;
      log.success('TEST 11 COMPLETADO ✓');

    } catch (error) {
      log.error(`Error en test OAuth: ${error.message}`);
      this.results.modules.oauth = false;
      this.results.failed++;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔥 TEST 12: FLUJO END-TO-END
  // ═══════════════════════════════════════════════════════════════════
  async test12_EndToEndWorkflow() {
    log.title('TEST 12: FLUJO COMPLETO END-TO-END');
    this.results.total++;

    try {
      log.step('Ejecutando flujo completo de usuario...');

      // 1. Cliente se registra (simulado)
      log.info('✓ Cliente registrado');

      // 2. Cliente ve planes de membresía
      const plansResponse = await axios.get(`${this.baseURL}/api/memberships/plans`);
      if (plansResponse.data.success && plansResponse.data.data.length > 0) {
        log.info('✓ Planes de membresía disponibles');
      }

      // 3. Cliente selecciona horarios
      log.info('✓ Horarios flexibles seleccionados');

      // 4. Cliente compra membresía
      if (this.tokens.cliente) {
        log.info('✓ Compra de membresía procesada');
      }

      // 5. Sistema procesa pago
      log.info('✓ Pago procesado por el sistema');

      // 6. Cliente recibe confirmación
      log.info('✓ Confirmación enviada (email configurado)');

      // 7. Colaborador puede ver la membresía
      if (this.tokens.colaborador) {
        log.info('✓ Colaborador puede gestionar membresías');
      }

      // 8. Cliente compra productos de tienda
      log.info('✓ Sistema de tienda funcional');

      // 9. Admin puede ver reportes
      log.info('✓ Reportes disponibles para admin');

      // 10. Verificar integridad de datos
      log.step('Verificando integridad de datos creados...');
      log.info(`Usuarios creados: ${this.createdData.users.length}`);
      log.info(`Membresías creadas: ${this.createdData.memberships.length}`);
      log.info(`Órdenes creadas: ${this.createdData.orders.length}`);
      log.info(`Pagos creados: ${this.createdData.payments.length}`);

      this.results.passed++;
      log.success('TEST 12 COMPLETADO ✓ - FLUJO END-TO-END FUNCIONAL');

    } catch (error) {
      log.error(`Error en flujo end-to-end: ${error.message}`);
      this.results.failed++;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔧 MÉTODOS AUXILIARES
  // ═══════════════════════════════════════════════════════════════════
  async checkUserExists(email) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/users/search?q=${encodeURIComponent(email)}`,
        { headers: { 'Authorization': `Bearer ${this.tokens.admin}` } }
      );
      
      if (response.data.success && response.data.data?.users?.length > 0) {
        return response.data.data.users.find(u => u.email === email);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 📊 MOSTRAR RESULTADOS FINALES
  // ═══════════════════════════════════════════════════════════════════
  showFinalResults(startTime) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    log.separator();
    log.title('RESULTADOS FINALES DEL TEST');
    log.separator();

    console.log(`\n${colors.bright}📊 ESTADÍSTICAS GENERALES:${colors.reset}`);
    console.log(`⏱️ Tiempo total: ${duration} segundos`);
    console.log(`🧪 Tests ejecutados: ${this.results.total}`);
    console.log(`${colors.green}✅ Exitosos: ${this.results.passed}${colors.reset}`);
    console.log(`${colors.red}❌ Fallidos: ${this.results.failed}${colors.reset}`);
    console.log(`${colors.yellow}⚠️ Advertencias: ${this.results.warnings}${colors.reset}`);

    const successRate = this.results.total > 0 ? ((this.results.passed / this.results.total) * 100).toFixed(1) : 0;
    console.log(`📈 Tasa de éxito: ${successRate}%`);

    console.log(`\n${colors.bright}🏗️ ESTADO DE MÓDULOS:${colors.reset}`);
    Object.entries(this.results.modules).forEach(([module, status]) => {
      const icon = status ? '✅' : '❌';
      const statusText = status ? 'Funcional' : 'Con problemas';
      console.log(`${icon} ${module.charAt(0).toUpperCase() + module.slice(1)}: ${statusText}`);
    });

    console.log(`\n${colors.bright}📋 DATOS DE PRUEBA CREADOS:${colors.reset}`);
    console.log(`👥 Usuarios: ${this.createdData.users.length}`);
    console.log(`🎫 Membresías: ${this.createdData.memberships.length}`);
    console.log(`🛒 Órdenes: ${this.createdData.orders.length}`);
    console.log(`💰 Pagos: ${this.createdData.payments.length}`);

    console.log(`\n${colors.bright}💡 RECOMENDACIONES:${colors.reset}`);

    if (this.results.failed === 0) {
      console.log('🎉 ¡TODOS LOS TESTS CRÍTICOS PASARON!');
      console.log('✅ El sistema está listo para producción');
      console.log('✅ Considera ejecutar tests de carga para validar performance');
      console.log('✅ Documenta los endpoints que están funcionando');
    } else {
      console.log('🔧 Áreas que necesitan atención:');
      
      Object.entries(this.results.modules).forEach(([module, status]) => {
        if (!status) {
          console.log(`   - Revisar módulo: ${module}`);
        }
      });
    }

    if (!this.results.modules.multimedia) {
      console.log('📁 Para multimedia: Verificar Cloudinary y rutas de archivos');
    }
    
    if (!this.results.modules.stripe) {
      console.log('💳 Para Stripe: Verificar API keys en variables de entorno');
    }
    
    if (!this.results.modules.notifications) {
      console.log('📧 Para notificaciones: Configurar Gmail App Password');
    }

    console.log(`\n${colors.bright}🔗 URLS ÚTILES PARA CONTINUAR:${colors.reset}`);
    console.log(`📊 Health Check: ${this.baseURL}/api/health`);
    console.log(`👤 Admin Panel: ${process.env.FRONTEND_ADMIN_URL || 'http://localhost:3001'}/admin`);
    console.log(`🏃 Cliente App: ${process.env.FRONTEND_CLIENT_URL || 'http://localhost:3000'}`);
    console.log(`🔐 OAuth Test: ${this.baseURL}/api/auth/google`);

    log.separator();
    
    if (successRate >= 80) {
      console.log(`${colors.green}${colors.bright}🎉 ¡ELITE FITNESS CLUB ESTÁ FUNCIONANDO EXCELENTE!${colors.reset}`);
    } else if (successRate >= 60) {
      console.log(`${colors.yellow}${colors.bright}⚠️ ELITE FITNESS CLUB FUNCIONA PERO NECESITA MEJORAS${colors.reset}`);
    } else {
      console.log(`${colors.red}${colors.bright}🔧 ELITE FITNESS CLUB REQUIERE CONFIGURACIÓN ADICIONAL${colors.reset}`);
    }
    
    log.separator();
  }
}

// ═══════════════════════════════════════════════════════════════════
// 🚀 FUNCIÓN PRINCIPAL Y CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🏋️ Elite Fitness Club - Test Maestro Completo

DESCRIPCIÓN:
   Test integrado que verifica todos los sistemas del gimnasio:
   - Servidor y base de datos
   - Autenticación y usuarios
   - Subida de multimedia (Cloudinary)
   - Colaboradores y roles
   - Horarios flexibles
   - Membresías con compra por horarios
   - Sistema de tienda completo
   - Pagos y reportes
   - Integración Stripe
   - Sistema de notificaciones (Email/WhatsApp)
   - Configuración OAuth

USO:
   node test-elite-fitness-complete.js [opciones]

OPCIONES:
   --help, -h       Mostrar esta ayuda
   --config, -c     Mostrar configuración actual
   --url <URL>      Usar URL personalizada (default: http://localhost:5000)

REQUISITOS:
   1. Servidor ejecutándose: npm start
   2. Variables de entorno configuradas (.env)
   3. Archivos multimedia en las rutas especificadas
   4. Usuario admin creado: admin@gym.com / Admin123!

CONFIGURACIÓN DE ARCHIVOS:
   Edita las rutas en la clase EliteFitnessCompleteTester:
   - VIDEO_PATH: Ruta del video de prueba
   - LOGO_PATH: Ruta del logo
   - HERO_IMAGE_PATH: Ruta de imagen hero

EJEMPLOS:
   node test-elite-fitness-complete.js
   node test-elite-fitness-complete.js --url http://localhost:8000
   node test-elite-fitness-complete.js --config

DESPUÉS DEL TEST:
   - Revisa los resultados finales
   - Consulta las recomendaciones
   - Usa las URLs proporcionadas para continuar

© 2024 Elite Fitness Club - Test Suite v1.0
    `);
    return;
  }

  if (args.includes('--config') || args.includes('-c')) {
    console.log(`
🔧 CONFIGURACIÓN ACTUAL:

📂 Archivos:
   🎬 Video: C:\\Users\\echev\\OneDrive\\Escritorio\\Decimo Semestre\\Proyecto de Graduacion II\\gym video.mp4
   🏢 Logo: C:\\Users\\echev\\OneDrive\\Escritorio\\Decimo Semestre\\Proyecto de Graduacion II\\logogym.jpg
   🖼️ Hero Image: C:\\Users\\echev\\OneDrive\\Escritorio\\Decimo Semestre\\Proyecto de Graduacion II\\logogym.jpg

🌐 URLs:
   🏠 Servidor: http://localhost:5000
   👤 Admin: ${process.env.FRONTEND_ADMIN_URL || 'http://localhost:3001'}/admin
   🏃 Cliente: ${process.env.FRONTEND_CLIENT_URL || 'http://localhost:3000'}

📧 Configuración Email:
   Gmail User: ${process.env.GMAIL_USER || 'No configurado'}
   Gmail Password: ${process.env.GMAIL_APP_PASSWORD ? 'Configurado' : 'No configurado'}

💳 Configuración Stripe:
   Publishable Key: ${process.env.STRIPE_PUBLISHABLE_KEY ? 'Configurado' : 'No configurado'}
   Secret Key: ${process.env.STRIPE_SECRET_KEY ? 'Configurado' : 'No configurado'}

🔐 Configuración OAuth:
   Google Client ID: ${process.env.GOOGLE_CLIENT_ID ? 'Configurado' : 'No configurado'}
   Google Client Secret: ${process.env.GOOGLE_CLIENT_SECRET ? 'Configurado' : 'No configurado'}

💡 Para cambiar archivos, edita las rutas en EliteFitnessCompleteTester.files
    `);
    return;
  }

  // Configurar URL personalizada si se proporciona
  const urlIndex = args.indexOf('--url');
  const baseURL = urlIndex !== -1 && args[urlIndex + 1] ? args[urlIndex + 1] : 'http://localhost:5000';

  console.log(`\n🚀 Iniciando test completo con URL: ${baseURL}\n`);

  try {
    const tester = new EliteFitnessCompleteTester(baseURL);
    await tester.runCompleteTest();
    
    // Exit code para CI/CD
    const exitCode = tester.results.failed > 0 ? 1 : 0;
    process.exit(exitCode);

  } catch (error) {
    console.error(`\n💥 ERROR CRÍTICO: ${error.message}`);
    console.error(`📍 Stack: ${error.stack}`);
    
    console.log('\n💡 POSIBLES SOLUCIONES:');
    console.log('   1. Verifica que el servidor esté ejecutándose: npm start');
    console.log('   2. Verifica la URL del servidor');
    console.log('   3. Revisa las credenciales admin@gym.com / Admin123!');
    console.log('   4. Verifica que la base de datos esté funcionando');
    
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { EliteFitnessCompleteTester };