// src/server.js - CORREGIDO para Render: HTTP server primero
const app = require('./app');
const { 
  testConnection, 
  initializeDatabase, 
  getDatabaseStatus,
  closeConnection 
} = require('./config/database');
const notificationScheduler = require('./services/notificationScheduler');
const { runSeeds } = require('./config/seeds');

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

    } catch (error) {
      console.error('❌ Error en inicialización en segundo plano:', error.message);
      console.log('⚠️ El servidor HTTP sigue funcionando, pero algunas funciones pueden estar limitadas');
      
      // No terminar el proceso, solo logear el error
      console.log('💡 El servidor continuará funcionando con funcionalidad básica');
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

  async initializeGymData() {
    try {
      console.log('🏢 Verificando configuración del gimnasio...');
      
      const { 
        GymConfiguration,
        GymContactInfo, 
        GymHours,
        GymStatistics,
        GymServices,
        MembershipPlans,
        StoreCategory,
        StoreBrand
      } = require('./models');

      // ✅ Verificar si el sistema ya está configurado
      const config = await GymConfiguration.findOne();
      
      if (!config) {
        console.log('🔄 Primera instalación detectada, inicializando datos del gimnasio...');
        
        await Promise.all([
          GymConfiguration.getConfig(),
          GymContactInfo.getContactInfo(),
          GymHours.getWeeklySchedule(),
          GymStatistics.seedDefaultStats(),
          GymServices.seedDefaultServices(),
          MembershipPlans.seedDefaultPlans()
        ]);
        
        console.log('   ✅ Configuración básica del gimnasio inicializada');
      } else {
        console.log('   ✅ Configuración del gimnasio ya existe');
      }

      // ✅ Verificar datos de tienda
      const categoryCount = await StoreCategory.count();
      if (categoryCount === 0) {
        console.log('🛍️ Inicializando datos de tienda...');
        
        await Promise.all([
          StoreCategory.seedDefaultCategories(),
          StoreBrand.seedDefaultBrands()
        ]);
        
        console.log('   ✅ Datos básicos de tienda inicializados');
      } else {
        console.log('   ✅ Datos de tienda ya existen');
      }
      
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

  setupGracefulShutdown() {
    ['SIGTERM', 'SIGINT'].forEach(signal => {
      process.on(signal, async () => {
        console.log(`\n📴 Recibida señal ${signal}, cerrando servidor...`);
        
        try {
          if (notificationScheduler) {
            notificationScheduler.stop();
          }
          
          if (this.server) {
            this.server.close(() => {
              console.log('✅ Servidor HTTP cerrado');
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