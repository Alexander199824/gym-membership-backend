// src/server.js
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
      console.log('🚀 Iniciando Gym Management System API...');
      console.log('🌍 Entorno:', process.env.NODE_ENV || 'development');

      // Verificar variables de entorno críticas
      this.checkEnvironmentVariables();

      // Probar conexión a la base de datos
      await testConnection();

      // Mostrar estado actual de la base de datos
      await this.showDatabaseStatus();

      // Inicializar base de datos (con reset automático si es necesario)
      await initializeDatabase();

      // Inicializar modelos y relaciones
      require('./models');

      // Ejecutar seeds
      await this.runSeedsWithErrorHandling();

      // Mostrar estado final de la base de datos
      await this.showFinalDatabaseStatus();

      // Iniciar programador de notificaciones
      if (process.env.NODE_ENV !== 'test') {
        this.startNotificationScheduler();
      }

      // Iniciar servidor HTTP
      await this.startHttpServer();

      // Configurar graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      console.error('❌ Error crítico al iniciar el servidor:', error.message);
      console.log('\n💡 Soluciones sugeridas:');
      console.log('   1. Verifica tu conexión a internet');
      console.log('   2. Verifica las credenciales de la base de datos en .env');
      console.log('   3. Intenta con RESET_DATABASE=true');
      console.log('   4. Contacta al administrador del sistema');
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
    } catch (error) {
      console.log('   ⚠️ Error al verificar estado final:', error.message);
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
          console.log('\n🎯 ¡SERVIDOR INICIADO EXITOSAMENTE!');
          console.log(`✅ URL: http://${this.host}:${this.port}`);
          console.log(`📚 Health Check: http://${this.host}:${this.port}/api/health`);
          console.log('\n📱 Endpoints principales:');
          console.log(`   🔐 Auth: http://${this.host}:${this.port}/api/auth`);
          console.log(`   👥 Users: http://${this.host}:${this.port}/api/users`);
          console.log(`   🎫 Memberships: http://${this.host}:${this.port}/api/memberships`);
          console.log(`   💰 Payments: http://${this.host}:${this.port}/api/payments`);
          console.log('\n🎉 Sistema listo para recibir peticiones');
          console.log('\n💡 Para hacer reset completo: Cambia RESET_DATABASE=true y reinicia');
          resolve();
        }
      });
    });
  }

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

    // Mostrar estado de RESET_DATABASE
    if (process.env.RESET_DATABASE === 'true') {
      console.log('🚨 MODO RESET ACTIVADO: Se eliminará toda la base de datos');
    } else {
      console.log('✅ Modo normal: Se mantendrán los datos existentes');
    }

    // Warnings para servicios opcionales (resumidos)
    const disabledServices = [];
    if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME.startsWith('your_')) {
      disabledServices.push('Cloudinary');
    }
    if (!process.env.EMAIL_USER || process.env.EMAIL_USER.startsWith('your_')) {
      disabledServices.push('Email');
    }
    if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID.startsWith('your_')) {
      disabledServices.push('WhatsApp');
    }
    if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID.startsWith('your_')) {
      disabledServices.push('Google OAuth');
    }

    if (disabledServices.length > 0) {
      console.log(`⚠️ Servicios deshabilitados: ${disabledServices.join(', ')}`);
      console.log('💡 Se pueden habilitar más tarde en las fases finales');
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
          console.log('👋 ¡Hasta luego!');
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

// Iniciar servidor si este archivo se ejecuta directamente
if (require.main === module) {
  new Server().start();
}

module.exports = Server;