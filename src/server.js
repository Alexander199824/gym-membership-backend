// src/server.js - INTEGRADO: HTTP server + Servicios de Membresías + Garantía de Admin
const app = require('./app');
const { 
  testConnection, 
  initializeDatabase, 
  getDatabaseStatus,
  closeConnection 
} = require('./config/database');
const notificationScheduler = require('./services/notificationScheduler');
const { runSeeds } = require('./config/seeds');
// ✅ NUEVA IMPORTACIÓN: Servicio de membresías diarias
const dailyMembershipService = require('./services/dailyMembershipService');

class Server {
  constructor() {
    this.port = process.env.PORT || 5000;
    this.host = '0.0.0.0'; // ✅ FORZAR 0.0.0.0 para Render
    this.server = null;
  }

  async start() {
    try {
      console.log('🚀 Iniciando Elite Fitness Club Management System...');
      console.log('🌍 Entorno:', process.env.NODE_ENV || 'development');
      console.log(`🔗 Puerto configurado: ${this.port}`);
      console.log(`🔗 Host configurado: ${this.host}`);

      // ✅ RENDER FIX: Iniciar servidor HTTP PRIMERO
      console.log('⚡ INICIANDO SERVIDOR HTTP PRIMERO (Render Fix)...');
      await this.startHttpServerFirst();

      // ✅ Ahora hacer inicializaciones en segundo plano
      console.log('🔄 Iniciando procesos de inicialización en segundo plano...');
      this.initializeInBackground();

    } catch (error) {
      console.error('❌ Error crítico al iniciar el servidor:', error.message);
      console.log('\n💡 Soluciones sugeridas:');
      console.log('   1. Verifica las variables de entorno en Render');
      console.log('   2. Verifica la conexión a la base de datos');
      console.log('   3. Revisa los logs completos en Render');
      process.exit(1);
    }
  }

  // ✅ NUEVO: Iniciar servidor HTTP inmediatamente
  async startHttpServerFirst() {
    return new Promise((resolve, reject) => {
      this.server = app.listen(this.port, this.host, (error) => {
        if (error) {
          console.error('❌ Error al iniciar servidor HTTP:', error);
          reject(error);
        } else {
          console.log('\n🎯 ¡SERVIDOR HTTP INICIADO EXITOSAMENTE!');
          console.log(`✅ URL: http://${this.host}:${this.port}`);
          console.log(`📚 Health Check: http://${this.host}:${this.port}/api/health`);
          console.log(`🌐 Endpoints: http://${this.host}:${this.port}/api/endpoints`);
          console.log('\n📱 Endpoints principales:');
          console.log(`   🔐 Auth: http://${this.host}:${this.port}/api/auth`);
          console.log(`   👥 Users: http://${this.host}:${this.port}/api/users`);
          console.log(`   🎫 Memberships: http://${this.host}:${this.port}/api/memberships`);
          console.log(`   💰 Payments: http://${this.host}:${this.port}/api/payments`);
          console.log(`   🏢 Gym Config: http://${this.host}:${this.port}/api/gym`);
          console.log(`   🛍️ Store: http://${this.host}:${this.port}/api/store`);
          console.log(`   ⚙️ Admin: http://${this.host}:${this.port}/api/admin`);
          console.log('\n🎉 Servidor respondiendo en Render! ');
          console.log('⏳ Inicializando base de datos en segundo plano...');
          resolve();
        }
      });
    });
  }

  // ✅ NUEVO: Inicialización completa en segundo plano
  async initializeInBackground() {
    try {
      // ✅ Verificar variables de entorno críticas (sin salir)
      this.checkEnvironmentVariables();

      // ✅ Probar conexión a la base de datos
      console.log('🔄 Conectando a base de datos...');
      await testConnection();
      console.log('✅ Base de datos conectada');

      // ✅ Mostrar estado actual de la base de datos
      await this.showDatabaseStatus();

      // ✅ Inicializar base de datos (con reset automático si es necesario)
      console.log('🔄 Inicializando base de datos...');
      await initializeDatabase();
      console.log('✅ Base de datos inicializada');

      // ✅ Inicializar modelos y relaciones
      console.log('🔄 Cargando modelos...');
      require('./models');
      console.log('✅ Modelos cargados');

      // ✅ CRÍTICO: Garantizar que el admin exista ANTES de seeds
      console.log('🔄 Garantizando usuario administrador...');
      await this.ensureAdminExists();
      console.log('✅ Usuario administrador garantizado');

      // ✅ Verificar e inicializar datos del gimnasio
      await this.initializeGymData();

      // ✅ NUEVO: Inicializar servicios de membresías
      await this.initializeMembershipServices();

      // ✅ Ejecutar seeds (opcional y sin fallar) - pero el admin ya está garantizado
      await this.runSeedsWithErrorHandling();

      // ✅ Mostrar estado final de la base de datos
      await this.showFinalDatabaseStatus();

      // ✅ Verificar servicios de notificación (sin fallar)
      await this.checkNotificationServices();

      // ✅ Iniciar programador de notificaciones (solo si no es test)
      if (process.env.NODE_ENV !== 'test') {
        this.startNotificationScheduler();
      }

      // ✅ Configurar graceful shutdown
      this.setupGracefulShutdown();

      // ✅ VERIFICACIÓN FINAL DEL ADMIN
      console.log('\n🔍 VERIFICACIÓN FINAL DEL SISTEMA...');
      const models = require('./models');
      const finalAdmin = await models.User.findOne({ where: { role: 'admin' } });
      
      if (finalAdmin) {
        console.log('✅ Usuario administrador verificado al final de la inicialización');
        console.log(`   📧 ${finalAdmin.email}`);
        console.log(`   🆔 ${finalAdmin.id}`);
      } else {
        console.error('❌ ADVERTENCIA: Usuario administrador no existe al final');
      }

      console.log('\n🎉 ¡INICIALIZACIÓN COMPLETA! Sistema listo para usar');
      console.log('\n💡 Para testing completo ejecuta:');
      console.log('   GET /api/health (verificar estado)');
      console.log('   POST /api/auth/login (login admin)');
      console.log('   GET /api/admin/stats (panel admin)');

    } catch (error) {
      console.error('❌ Error en inicialización en segundo plano:', error.message);
      console.log('⚠️ El servidor HTTP sigue funcionando, pero algunas funciones pueden estar limitadas');
      
      // ✅ Intentar crear admin como último recurso
      try {
        console.log('🔄 Último intento de crear admin...');
        await this.createAdminDirectly();
        console.log('✅ Admin creado en último intento');
      } catch (lastError) {
        console.error('❌ Último intento falló:', lastError.message);
      }
      
      // No terminar el proceso, solo logear el error
      console.log('💡 El servidor continuará funcionando con funcionalidad básica');
    }
  }

  // ✅ NUEVA FUNCIÓN: Garantizar que el admin esté creado
  async ensureAdminExists() {
    try {
      console.log('\n🔐 VERIFICACIÓN CRÍTICA: Usuario Administrador...');
      
      // ✅ Cargar modelos
      const models = require('./models');
      
      if (!models.User) {
        throw new Error('Modelo User no disponible - no se puede verificar admin');
      }
      
      // ✅ Buscar admin existente
      let admin = await models.User.findOne({ 
        where: { role: 'admin' }
      });
      
      if (admin) {
        console.log('✅ Usuario administrador encontrado:');
        console.log(`   📧 Email: ${admin.email}`);
        console.log(`   👤 Nombre: ${admin.firstName} ${admin.lastName}`);
        console.log(`   📊 Estado: ${admin.isActive ? 'Activo' : 'Inactivo'}`);
        
        // ✅ Verificar que tenga el email correcto
        if (admin.email !== 'admin@gym.com') {
          console.log('🔄 Corrigiendo email del administrador...');
          await admin.update({ email: 'admin@gym.com' });
          console.log('✅ Email corregido a admin@gym.com');
        }
        
        // ✅ Mostrar credenciales
        this.showAdminCredentials();
        return admin;
      }
      
      // ✅ Si no existe, crear uno nuevo
      console.log('⚠️ Usuario administrador NO existe - creando automáticamente...');
      
      const adminData = {
        firstName: 'Administrador',
        lastName: 'Sistema',
        email: 'admin@gym.com',
        password: 'Admin123!',
        phone: '+502 0000-0000',
        role: 'admin',
        isActive: true,
        emailVerified: true
      };
      
      console.log('🔄 Creando usuario administrador...');
      admin = await models.User.create(adminData);
      
      console.log('🎉 ¡Usuario administrador creado exitosamente!');
      console.log(`   📧 Email: ${admin.email}`);
      console.log(`   👤 Nombre: ${admin.firstName} ${admin.lastName}`);
      console.log(`   🆔 ID: ${admin.id}`);
      
      this.showAdminCredentials();
      return admin;
      
    } catch (error) {
      console.error('❌ ERROR CRÍTICO: No se pudo asegurar la existencia del admin');
      console.error('📝 Error:', error.message);
      console.error('📝 Stack:', error.stack);
      
      // ✅ Este es un error crítico, pero no detener el servidor
      console.log('🚨 ADVERTENCIA: El sistema funcionará con funcionalidad limitada');
      console.log('💡 Soluciones:');
      console.log('   1. Ejecuta: node create-admin-user.js');
      console.log('   2. Verifica la conexión a la base de datos');
      console.log('   3. Verifica que las tablas estén creadas');
      
      throw error;
    }
  }

  // ✅ NUEVA FUNCIÓN: Mostrar credenciales del admin
  showAdminCredentials() {
    console.log('\n🎯 CREDENCIALES DE ADMINISTRADOR LISTAS:');
    console.log('=' .repeat(50));
    console.log('   📧 Email: admin@gym.com');
    console.log('   🔑 Password: Admin123!');
    console.log('=' .repeat(50));
    console.log('   🌐 Login: POST /api/auth/login');
    console.log('   📊 Panel: GET /api/admin/stats');
    console.log('   👥 Usuarios: GET /api/users');
    console.log('=' .repeat(50));
  }

  // ✅ FUNCIÓN MEJORADA: Seeds con mejor manejo de errores
  async runSeedsWithErrorHandling() {
    try {
      console.log('\n🌱 Ejecutando seeds...');
      
      // ✅ CRÍTICO: Asegurar que los modelos estén cargados
      console.log('🔄 Verificando que los modelos estén cargados...');
      const models = require('./models');
      
      if (!models.User) {
        throw new Error('Modelo User no está disponible - no se pueden ejecutar seeds');
      }
      
      console.log('✅ Modelos verificados correctamente');
      
      // ✅ Ejecutar seeds con debugging mejorado
      await runSeeds();
      console.log('✅ Seeds ejecutados correctamente');
      
      // ✅ VERIFICACIÓN POSTERIOR: Confirmar que el admin fue creado
      await this.verifyAdminCreation();
      
    } catch (error) {
      // ✅ MOSTRAR ERROR COMPLETO para debugging
      console.error('\n❌ ERROR COMPLETO EN SEEDS:');
      console.error('📝 Mensaje:', error.message);
      console.error('📝 Stack:', error.stack);
      
      // ✅ Intentos de recuperación automática
      console.log('\n🔄 Intentando recuperación automática...');
      
      try {
        // Intento 1: Crear solo el admin
        await this.createAdminDirectly();
        console.log('✅ Usuario admin creado en recuperación automática');
        
      } catch (recoveryError) {
        console.error('❌ Error en recuperación automática:', recoveryError.message);
        console.log('\n💡 SOLUCIONES SUGERIDAS:');
        console.log('   1. Verifica que la base de datos esté funcionando');
        console.log('   2. Ejecuta: node create-admin-user.js');
        console.log('   3. Verifica las variables de entorno');
        console.log('   4. Revisa los logs de la base de datos');
        
        // ✅ No terminar el servidor, solo continuar con advertencia
        console.warn('⚠️ El servidor continuará sin seeds - funcionalidad limitada');
      }
    }
  }

  // ✅ NUEVA FUNCIÓN: Verificar que el admin fue creado correctamente
  async verifyAdminCreation() {
    try {
      console.log('\n🔍 Verificando creación del usuario administrador...');
      
      const models = require('./models');
      const admin = await models.User.findOne({ where: { role: 'admin' } });
      
      if (admin) {
        console.log('✅ Usuario administrador verificado:');
        console.log(`   📧 Email: ${admin.email}`);
        console.log(`   👤 Nombre: ${admin.firstName} ${admin.lastName}`);
        console.log(`   🆔 ID: ${admin.id}`);
        console.log(`   📊 Estado: ${admin.isActive ? 'Activo' : 'Inactivo'}`);
        
        // ✅ Mostrar credenciales para login
        console.log('\n🔐 CREDENCIALES DE ADMINISTRADOR:');
        console.log('   📧 Email: admin@gym.com');
        console.log('   🔑 Password: Admin123!');
        
        return true;
      } else {
        console.error('❌ Usuario administrador NO existe después de seeds');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error verificando admin:', error.message);
      return false;
    }
  }

  // ✅ NUEVA FUNCIÓN: Crear admin directamente (recuperación)
  async createAdminDirectly() {
    try {
      console.log('🔧 Creando usuario administrador directamente...');
      
      const models = require('./models');
      
      if (!models.User) {
        throw new Error('Modelo User no disponible');
      }
      
      // Verificar si ya existe
      const existingAdmin = await models.User.findOne({
        where: { email: 'admin@gym.com' }
      });
      
      if (existingAdmin) {
        console.log('✅ Usuario admin ya existe');
        return existingAdmin;
      }
      
      // Crear nuevo admin
      const adminData = {
        firstName: process.env.ADMIN_FIRST_NAME || 'Administrador',
        lastName: process.env.ADMIN_LAST_NAME || 'Sistema',
        email: process.env.ADMIN_EMAIL || 'admin@gym.com',
        password: process.env.ADMIN_PASSWORD || 'Admin123!',
        phone: '+502 0000-0000',
        role: 'admin',
        isActive: true,
        emailVerified: true
      };
      
      const admin = await models.User.create(adminData);
      
      console.log('✅ Usuario administrador creado directamente:');
      console.log(`   📧 Email: ${admin.email}`);
      console.log(`   🔑 Password: ${adminData.password}`);
      console.log(`   🏷️ Rol: ${admin.role}`);
      console.log(`   🆔 ID: ${admin.id}`);
      
      return admin;
      
    } catch (error) {
      throw new Error(`Error creando admin directamente: ${error.message}`);
    }
  }

  // ✅ FUNCIÓN EXISTENTE: Inicializar servicios de membresías
  async initializeMembershipServices() {
    console.log('\n🎫 INICIALIZANDO SERVICIOS DE MEMBRESÍAS...');
    
    try {
      // ✅ Verificar si la función de deducción automática está habilitada
      const autoDeductionEnabled = process.env.MEMBERSHIP_AUTO_DEDUCTION !== 'false';
      
      if (autoDeductionEnabled) {
        // ✅ Inicializar servicio de deducción diaria
        console.log('🕒 Iniciando servicio de deducción diaria...');
        dailyMembershipService.start();
        
        const status = dailyMembershipService.getStatus();
        console.log(`   ✅ Estado: ${status.isRunning ? 'ACTIVO' : 'INACTIVO'}`);
        console.log(`   📅 Programación: ${status.cronExpression} (${status.timezone})`);
        console.log(`   📧 Email: ${status.emailService ? 'Configurado' : 'No configurado'}`);
        
        // ✅ Ejecutar proceso inicial si es necesario
        const runInitialProcess = process.env.MEMBERSHIP_RUN_INITIAL_PROCESS === 'true';
        if (runInitialProcess) {
          console.log('🔄 Ejecutando proceso inicial de deducción...');
          try {
            const result = await dailyMembershipService.runManually();
            console.log('   📊 Resultado:', result);
          } catch (initialError) {
            console.warn('   ⚠️ Error en proceso inicial:', initialError.message);
          }
        }
      } else {
        console.log('⏸️ Servicio de deducción diaria DESHABILITADO por configuración');
      }
      
      console.log('✅ Servicios de membresías inicializados correctamente\n');
      
    } catch (error) {
      console.error('❌ Error inicializando servicios de membresías:', error);
      
      // No detener el servidor si falla la inicialización del servicio
      console.warn('⚠️ El servidor continuará sin el servicio de deducción automática');
    }
  }

  // ✅ FUNCIÓN EXISTENTE: Mostrar estado de la BD
  async showDatabaseStatus() {
    try {
      console.log('\n📊 Estado actual de la base de datos:');
      const status = await getDatabaseStatus();
      
      if (status.totalTables === -1) {
        console.log('   ⚠️ No se pudo verificar el estado de la base de datos');
        return;
      }

      console.log(`   📋 Total de tablas existentes: ${status.totalTables}`);
      console.log(`   🏋️ Tablas del sistema de gimnasio: ${status.gymTables}/5`);
      
      if (status.isEmpty) {
        console.log('   ✅ Base de datos vacía - Lista para inicializar');
      } else if (status.hasGymTables && status.gymTables === 5) {
        console.log('   ✅ Sistema de gimnasio ya instalado');
      } else if (status.totalTables > 0) {
        console.log('   ⚠️ Base de datos contiene tablas de otros sistemas');
        if (process.env.RESET_DATABASE === 'true') {
          console.log('   🗑️ Se eliminarán TODAS las tablas por RESET_DATABASE=true');
        }
      }
    } catch (error) {
      console.log('   ⚠️ Error al verificar estado:', error.message);
    }
  }

  // ✅ FUNCIÓN EXISTENTE: Mostrar estado final de la BD
  async showFinalDatabaseStatus() {
    try {
      console.log('\n📊 Estado final de la base de datos:');
      const status = await getDatabaseStatus();
      
      console.log(`   📋 Total de tablas: ${status.totalTables}`);
      console.log(`   🏋️ Tablas del gimnasio: ${status.gymTables}/5`);
      
      if (status.gymTables === 5) {
        console.log('   ✅ Sistema de gimnasio completamente instalado');
      } else {
        console.log('   ⚠️ Instalación del sistema incompleta');
      }
    } catch (error) {
      console.log('   ⚠️ Error al verificar estado final:', error.message);
    }
  }

  // ✅ FUNCIÓN EXISTENTE: Inicializar datos del gimnasio
  async initializeGymData() {
    try {
      console.log('🏢 Verificando configuración del gimnasio...');
      
      const models = require('./models');
      
      // ✅ Verificar modelos disponibles
      const requiredModels = [
        'GymConfiguration', 'GymContactInfo', 'GymHours', 'GymStatistics',
        'GymServices', 'MembershipPlans', 'StoreCategory', 'StoreBrand'
      ];
      
      const availableModels = requiredModels.filter(model => models[model]);
      const missingModels = requiredModels.filter(model => !models[model]);
      
      console.log(`📦 Modelos disponibles: ${availableModels.length}/${requiredModels.length}`);
      
      if (missingModels.length > 0) {
        console.warn(`⚠️ Modelos faltantes: ${missingModels.join(', ')}`);
      }

      // ✅ PASO 1: Configuración básica del gimnasio
      console.log('🔧 Inicializando configuración básica...');
      
      if (models.GymConfiguration) {
        try {
          const config = await models.GymConfiguration.findOne();
          if (!config) {
            console.log('   🆕 Primera instalación detectada');
            await models.GymConfiguration.getConfig();
            console.log('   ✅ GymConfiguration inicializada');
          } else {
            console.log('   ✅ GymConfiguration ya existe');
          }
        } catch (error) {
          console.warn('   ⚠️ Error en GymConfiguration:', error.message);
        }
      }

      // ✅ PASO 2: Otros datos del gimnasio
      const gymDataPromises = [];
      
      if (models.GymContactInfo) {
        gymDataPromises.push(
          models.GymContactInfo.getContactInfo()
            .then(() => console.log('   ✅ GymContactInfo verificada'))
            .catch(e => console.warn('   ⚠️ Error en GymContactInfo:', e.message))
        );
      }
      
      if (models.GymHours) {
        gymDataPromises.push(
          models.GymHours.getWeeklySchedule()
            .then(() => console.log('   ✅ GymHours verificados'))
            .catch(e => console.warn('   ⚠️ Error en GymHours:', e.message))
        );
      }
      
      if (models.GymStatistics && models.GymStatistics.seedDefaultStats) {
        gymDataPromises.push(
          models.GymStatistics.seedDefaultStats()
            .then(() => console.log('   ✅ GymStatistics verificadas'))
            .catch(e => console.warn('   ⚠️ Error en GymStatistics:', e.message))
        );
      }
      
      if (models.GymServices && models.GymServices.seedDefaultServices) {
        gymDataPromises.push(
          models.GymServices.seedDefaultServices()
            .then(() => console.log('   ✅ GymServices verificados'))
            .catch(e => console.warn('   ⚠️ Error en GymServices:', e.message))
        );
      }
      
      if (models.MembershipPlans && models.MembershipPlans.seedDefaultPlans) {
        gymDataPromises.push(
          models.MembershipPlans.seedDefaultPlans()
            .then(() => console.log('   ✅ MembershipPlans verificados'))
            .catch(e => console.warn('   ⚠️ Error en MembershipPlans:', e.message))
        );
      }

      // ✅ Ejecutar en paralelo (sin esperar que fallen)
      if (gymDataPromises.length > 0) {
        await Promise.allSettled(gymDataPromises);
      }

      // ✅ PASO 3: Datos de tienda (EN ORDEN SECUENCIAL)
      console.log('🛍️ Verificando datos de tienda...');
      
      // 3.1: Verificar y crear categorías PRIMERO
      if (models.StoreCategory) {
        try {
          const categoryCount = await models.StoreCategory.count();
          if (categoryCount === 0) {
            console.log('   🗂️ Creando categorías de tienda...');
            if (models.StoreCategory.seedDefaultCategories) {
              await models.StoreCategory.seedDefaultCategories();
              console.log('   ✅ Categorías de tienda creadas');
            }
          } else {
            console.log(`   ✅ Categorías ya existen (${categoryCount})`);
          }
        } catch (error) {
          console.warn('   ⚠️ Error con categorías:', error.message);
        }
      }

      // 3.2: Verificar y crear marcas SEGUNDO
      if (models.StoreBrand) {
        try {
          const brandCount = await models.StoreBrand.count();
          if (brandCount === 0) {
            console.log('   🏷️ Creando marcas de tienda...');
            if (models.StoreBrand.seedDefaultBrands) {
              await models.StoreBrand.seedDefaultBrands();
              console.log('   ✅ Marcas de tienda creadas');
            }
          } else {
            console.log(`   ✅ Marcas ya existen (${brandCount})`);
          }
        } catch (error) {
          console.warn('   ⚠️ Error con marcas:', error.message);
        }
      }

      // ✅ PASO 4: Mostrar estadísticas
      console.log('📊 Estado actual de la tienda:');
      
      try {
        if (models.StoreCategory) {
          const catCount = await models.StoreCategory.count();
          console.log(`   🗂️ Categorías: ${catCount}`);
        }
        
        if (models.StoreBrand) {
          const brandCount = await models.StoreBrand.count();
          console.log(`   🏷️ Marcas: ${brandCount}`);
        }
        
        if (models.StoreProduct) {
          const productCount = await models.StoreProduct.count();
          console.log(`   📦 Productos: ${productCount}`);
          
          if (productCount === 0) {
            console.log('   💡 Los productos se crearán en los seeds');
          }
        }
        
      } catch (error) {
        console.warn('   ⚠️ Error obteniendo estadísticas:', error.message);
      }
      
      console.log('✅ Inicialización de datos del gimnasio completada');
      
    } catch (error) {
      console.warn('⚠️ Error al verificar configuración del gimnasio (no crítico):', error.message);
    }
  }

  // ✅ Verificar servicios de notificación con Gmail
  async checkNotificationServices() {
    try {
      console.log('\n📧 Verificando servicios de notificación...');
      
      const { EmailService, WhatsAppService } = require('./services/notificationServices');
      
      // Verificar Gmail
      const emailService = new EmailService();
      if (emailService.isConfigured) {
        console.log('   ✅ Gmail Email Service configurado correctamente');
        
        // ✅ NO enviar email de prueba automáticamente en Render
        try {
          const stats = await emailService.getEmailStats();
          if (stats.success) {
            console.log(`   📊 Cuenta Gmail: ${stats.stats.senderEmail} (${stats.stats.senderName})`);
          }
        } catch (error) {
          console.log('   📊 Gmail configurado (detalles de cuenta no disponibles)');
        }
      } else {
        console.log('   ⚠️ Gmail no configurado - Emails deshabilitados');
        console.log('   💡 Configura GMAIL_USER y GMAIL_APP_PASSWORD para habilitar emails');
      }
      
      // Verificar WhatsApp (Twilio)
      const whatsappService = new WhatsAppService();
      if (whatsappService.client) {
        console.log('   ✅ WhatsApp (Twilio) configurado correctamente');
      } else {
        console.log('   ⚠️ WhatsApp no configurado - Mensajes WhatsApp deshabilitados');
      }
      
    } catch (error) {
      console.warn('⚠️ Error al verificar servicios de notificación:', error.message);
    }
  }

  // ✅ FUNCIÓN EXISTENTE: Iniciar programador de notificaciones
  startNotificationScheduler() {
    try {
      notificationScheduler.start();
      console.log('✅ Programador de notificaciones iniciado');
    } catch (error) {
      console.warn('⚠️ Error al iniciar programador de notificaciones:', error.message);
      console.log('💡 Las notificaciones automáticas no funcionarán');
    }
  }

  // ✅ FUNCIÓN EXISTENTE: Verificar variables de entorno (mejorada)
  checkEnvironmentVariables() {
    const required = [
      'DB_HOST',
      'DB_PORT', 
      'DB_NAME',
      'DB_USER',
      'DB_PASSWORD',
      'JWT_SECRET'
    ];

    const missing = required.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      console.error('❌ Variables de entorno faltantes:', missing.join(', '));
      console.error('💡 Revisa tu configuración en Render');
      // ✅ NO hacer process.exit(1) en Render - continuar
      return false;
    }

    // ✅ Mostrar estado de RESET_DATABASE
    if (process.env.RESET_DATABASE === 'true') {
      console.log('🚨 MODO RESET ACTIVADO: Se eliminará toda la base de datos');
    } else {
      console.log('✅ Modo normal: Se mantendrán los datos existentes');
    }

    // ✅ NUEVO: Mostrar configuración de servicios de membresías
    const membershipAutoDeduction = process.env.MEMBERSHIP_AUTO_DEDUCTION !== 'false';
    const membershipInitialProcess = process.env.MEMBERSHIP_RUN_INITIAL_PROCESS === 'true';
    console.log(`🎫 Deducción automática de membresías: ${membershipAutoDeduction ? 'Habilitada' : 'Deshabilitada'}`);
    console.log(`🔄 Proceso inicial de deducción: ${membershipInitialProcess ? 'Habilitado' : 'Deshabilitado'}`);

    // ✅ Verificar servicios opcionales
    const serviceStatus = {
      cloudinary: process.env.CLOUDINARY_CLOUD_NAME && !process.env.CLOUDINARY_CLOUD_NAME.startsWith('your_') ? 'Configurado' : 'Pendiente',
      gmail: process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD && !process.env.GMAIL_USER.includes('yourEmail') ? 'Configurado' : 'Pendiente',
      whatsapp: process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID.startsWith('AC') ? 'Configurado' : 'Pendiente',
      googleOAuth: process.env.GOOGLE_CLIENT_ID && !process.env.GOOGLE_CLIENT_ID.startsWith('your_') ? 'Configurado' : 'Pendiente',
      stripe: process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('sk_test_51234') ? 'Configurado' : 'Pendiente'
    };

    const configuredServices = Object.entries(serviceStatus)
      .filter(([service, status]) => status === 'Configurado')
      .map(([service]) => service);

    if (configuredServices.length > 0) {
      console.log(`🟢 Servicios configurados: ${configuredServices.join(', ')}`);
    }

    return true;
  }

  // ✅ FUNCIÓN EXISTENTE: Graceful shutdown (actualizada)
  setupGracefulShutdown() {
    ['SIGTERM', 'SIGINT'].forEach(signal => {
      process.on(signal, async () => {
        console.log(`\n📴 Recibida señal ${signal}, cerrando servidor...`);
        
        try {
          // ✅ NUEVO: Detener servicio de membresías
          console.log('🎫 Deteniendo servicios de membresías...');
          dailyMembershipService.stop();
          console.log('   ✅ Servicio de membresías detenido');
          
          if (notificationScheduler) {
            notificationScheduler.stop();
            console.log('   ✅ Programador de notificaciones detenido');
          }
          
          if (this.server) {
            this.server.close(() => {
              console.log('   ✅ Servidor HTTP cerrado');
            });
          }
          
          await closeConnection();
          console.log('👋 Elite Fitness Club cerrado correctamente. ¡Hasta luego!');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error durante el cierre:', error.message);
          process.exit(1);
        }
      });
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });
  }
}

// ✅ Iniciar servidor si este archivo se ejecuta directamente
if (require.main === module) {
  new Server().start();
}

module.exports = Server;