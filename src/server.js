// src/server.js - ACTUALIZADO para Gmail
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
    this.host = process.env.HOST || '0.0.0.0';
    this.server = null;
  }

  async start() {
    try {
      console.log('🚀 Iniciando Elite Fitness Club Management System...');
      console.log('🌍 Entorno:', process.env.NODE_ENV || 'development');

      // ✅ Verificar variables de entorno críticas
      this.checkEnvironmentVariables();

      // ✅ Probar conexión a la base de datos
      await testConnection();

      // ✅ Mostrar estado actual de la base de datos
      await this.showDatabaseStatus();

      // ✅ Inicializar base de datos (con reset automático si es necesario)
      await initializeDatabase();

      // ✅ Inicializar modelos y relaciones
      require('./models');

      // ✅ Verificar e inicializar datos del gimnasio
      await this.initializeGymData();

      // ✅ Ejecutar seeds
      await this.runSeedsWithErrorHandling();

      // ✅ Mostrar estado final de la base de datos
      await this.showFinalDatabaseStatus();

      // ✅ Verificar servicios de notificación
      await this.checkNotificationServices();

      // ✅ Iniciar programador de notificaciones
      if (process.env.NODE_ENV !== 'test') {
        this.startNotificationScheduler();
      }

      // ✅ Iniciar servidor HTTP
      await this.startHttpServer();

      // ✅ Configurar graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      console.error('❌ Error crítico al iniciar el servidor:', error.message);
      console.log('\n💡 Soluciones sugeridas:');
      console.log('   1. Verifica tu conexión a internet');
      console.log('   2. Verifica las credenciales de la base de datos en .env');
      console.log('   3. Verifica la configuración de Gmail (GMAIL_USER, GMAIL_APP_PASSWORD)');
      console.log('   4. Intenta con RESET_DATABASE=true');
      console.log('   5. Contacta al administrador del sistema');
      process.exit(1);
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

      // ✅ Mostrar nuevas tablas instaladas
      try {
        const { sequelize } = require('./config/database');
        const [tables] = await sequelize.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name LIKE 'gym_%' OR table_name LIKE 'store_%'
          ORDER BY table_name;
        `);

        if (tables.length > 0) {
          console.log('\n📋 Nuevas tablas del sistema Elite Fitness:');
          tables.forEach(table => {
            const emoji = table.table_name.startsWith('gym_') ? '🏢' : 
                         table.table_name.startsWith('store_') ? '🛍️' : '📊';
            console.log(`   ${emoji} ${table.table_name}`);
          });
        }
      } catch (error) {
        // Ignorar errores de consulta de tablas
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

  // ✅ ACTUALIZADO: Verificar servicios de notificación con Gmail
  async checkNotificationServices() {
    try {
      console.log('\n📧 Verificando servicios de notificación...');
      
      const { EmailService, WhatsAppService } = require('./services/notificationServices');
      
      // Verificar Gmail
      const emailService = new EmailService();
      if (emailService.isConfigured) {
        console.log('   ✅ Gmail Email Service configurado correctamente');
        
        // Opcional: Obtener información de la cuenta
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

  async startHttpServer() {
    return new Promise((resolve, reject) => {
      this.server = app.listen(this.port, this.host, (error) => {
        if (error) {
          reject(error);
        } else {
          console.log('\n🎯 ¡ELITE FITNESS CLUB INICIADO EXITOSAMENTE!');
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
          console.log(`   📊 Dashboard: http://${this.host}:${this.port}/api/dashboard`);
          console.log(`   💸 Financial: http://${this.host}:${this.port}/api/financial`);
          console.log('\n🎉 Sistema completo listo para recibir peticiones');
          console.log('\n💡 Para testing completo ejecuta:');
          console.log('   npm run test:enhanced  (sistema general)');
          console.log('   npm run test:store     (sistema de tienda)');
          console.log('\n🧹 Para limpiar datos de prueba:');
          console.log('   POST /api/data-cleanup/clean-test-users');
          console.log('\n🔄 Para reset completo: Cambia RESET_DATABASE=true y reinicia');
          console.log('\n📧 Servicios de notificación:');
          console.log('   - Email: Gmail (configurar GMAIL_USER y GMAIL_APP_PASSWORD)');
          console.log('   - WhatsApp: Twilio (configurar TWILIO_ACCOUNT_SID)');
          resolve();
        }
      });
    });
  }

  // ✅ ACTUALIZADO: Verificación de variables de entorno para Gmail
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
      console.error('💡 Revisa tu archivo .env');
      process.exit(1);
    }

    // ✅ Mostrar estado de RESET_DATABASE
    if (process.env.RESET_DATABASE === 'true') {
      console.log('🚨 MODO RESET ACTIVADO: Se eliminará toda la base de datos');
    } else {
      console.log('✅ Modo normal: Se mantendrán los datos existentes');
    }

    // ✅ ACTUALIZADO: Verificar servicios opcionales con Gmail
    const serviceStatus = {
      cloudinary: process.env.CLOUDINARY_CLOUD_NAME && !process.env.CLOUDINARY_CLOUD_NAME.startsWith('your_') ? 'Configurado' : 'Pendiente',
      gmail: process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD && !process.env.GMAIL_USER.includes('yourEmail') ? 'Configurado' : 'Pendiente',
      whatsapp: process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID.startsWith('AC') ? 'Configurado' : 'Pendiente',
      googleOAuth: process.env.GOOGLE_CLIENT_ID && !process.env.GOOGLE_CLIENT_ID.startsWith('your_') ? 'Configurado' : 'Pendiente',
      stripe: process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('sk_test_51234') ? 'Configurado' : 'Pendiente'
    };

    const pendingServices = Object.entries(serviceStatus)
      .filter(([service, status]) => status === 'Pendiente')
      .map(([service]) => service);

    if (pendingServices.length > 0) {
      console.log(`⚠️ Servicios opcionales pendientes: ${pendingServices.join(', ')}`);
      console.log('💡 Se pueden configurar más tarde para funcionalidades completas');
      
      // ✅ Mensaje específico para Gmail
      if (pendingServices.includes('gmail')) {
        console.log('   📧 Para emails: Configura GMAIL_USER y GMAIL_APP_PASSWORD');
        console.log('   💡 Usa elitefitnesnoreply@gmail.com y tu App Password de Gmail');
      }
    } else {
      console.log('✅ Todos los servicios opcionales están configurados');
    }

    // ✅ Mostrar servicios configurados
    const configuredServices = Object.entries(serviceStatus)
      .filter(([service, status]) => status === 'Configurado')
      .map(([service]) => service);

    if (configuredServices.length > 0) {
      console.log(`🟢 Servicios configurados: ${configuredServices.join(', ')}`);
      
      // ✅ Mensaje específico para Gmail
      if (configuredServices.includes('gmail')) {
        console.log('   📧 Gmail configurado - Notificaciones por email habilitadas');
      }
    }

    // ✅ NUEVO: Advertencia sobre migración de Brevo a Gmail
    if (process.env.BREVO_API_KEY || process.env.EMAIL_HOST || process.env.EMAIL_USER) {
      console.log('\n🔄 MIGRACIÓN DETECTADA:');
      console.log('   ⚠️ Variables de Brevo/SMTP detectadas en el .env');
      console.log('   ✅ Sistema migrado a Gmail - usa GMAIL_USER y GMAIL_APP_PASSWORD');
      console.log('   💡 Puedes eliminar las variables BREVO_* y EMAIL_* del archivo .env');
    }

    // ✅ Instrucciones específicas para Gmail
    if (serviceStatus.gmail === 'Pendiente') {
      console.log('\n📧 CONFIGURACIÓN DE GMAIL:');
      console.log('   1. Habilita 2FA en tu cuenta de Gmail');
      console.log('   2. Ve a Configuración > Seguridad > Contraseñas de aplicaciones');
      console.log('   3. Genera una contraseña de aplicación para "Correo"');
      console.log('   4. Usa esa contraseña en GMAIL_APP_PASSWORD (no la contraseña normal)');
      console.log('   5. GMAIL_USER=elitefitnesnoreply@gmail.com');
    }
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