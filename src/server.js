// src/server.js - INTEGRADO: HTTP server + Servicios de Membresías
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

      // ✅ Verificar e inicializar datos del gimnasio
      await this.initializeGymData();

      // ✅ NUEVO: Inicializar servicios de membresías
      await this.initializeMembershipServices();

      // ✅ Ejecutar seeds (opcional y sin fallar)
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

      console.log('\n🎉 ¡INICIALIZACIÓN COMPLETA! Sistema listo para usar');
      console.log('\n💡 Para testing completo ejecuta:');
      console.log('   GET /api/health (verificar estado)');
      console.log('   GET /api/endpoints (ver todos los endpoints)');
      console.log('   GET /api/admin/membership-service/status (servicios de membresías)');

    } catch (error) {
      console.error('❌ Error en inicialización en segundo plano:', error.message);
      console.log('⚠️ El servidor HTTP sigue funcionando, pero algunas funciones pueden estar limitadas');
      
      // No terminar el proceso, solo logear el error
      console.log('💡 El servidor continuará funcionando con funcionalidad básica');
    }
  }

  // ✅ NUEVA FUNCIÓN: Inicializar servicios de membresías
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

  // ✅ FUNCIÓN CORREGIDA para server.js - initializeGymData
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

  async runSeedsWithErrorHandling() {
    try {
      console.log('\n🌱 Ejecutando seeds...');
      await runSeeds();
      console.log('✅ Seeds ejecutados correctamente');
    } catch (error) {
      console.warn('⚠️ Error en seeds (no crítico):', error.message.split('\n')[0]);
      console.log('💡 El servidor continuará sin datos de ejemplo');
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

  startNotificationScheduler() {
    try {
      notificationScheduler.start();
      console.log('✅ Programador de notificaciones iniciado');
    } catch (error) {
      console.warn('⚠️ Error al iniciar programador de notificaciones:', error.message);
      console.log('💡 Las notificaciones automáticas no funcionarán');
    }
  }

  // ✅ ACTUALIZADO: Verificación de variables de entorno para Gmail (sin process.exit)
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

  // ✅ ACTUALIZADO: Graceful shutdown con servicios de membresías
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