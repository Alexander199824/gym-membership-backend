// src/server.js
const app = require('./app');
const { testConnection, initializeDatabase } = require('./config/database');
const notificationScheduler = require('./services/notificationScheduler');
const { runSeeds } = require('./config/seeds'); // Agregar esta línea

class Server {
  constructor() {
    this.port = process.env.PORT || 5000;
    this.host = process.env.HOST || '0.0.0.0';
  }

  async start() {
    try {
      console.log('🚀 Iniciando Gym Management System API...');
      console.log('🌍 Entorno:', process.env.NODE_ENV || 'development');

      // Verificar variables de entorno críticas
      this.checkEnvironmentVariables();

      // Probar conexión a la base de datos
      await testConnection();

      // Inicializar base de datos
      await initializeDatabase();

      // Inicializar modelos y relaciones
      require('./models');

      // Ejecutar seeds (AGREGAR AQUÍ DENTRO DE LA FUNCIÓN ASYNC)
      console.log('🌱 Ejecutando seeds...');
      await runSeeds();

      // Iniciar programador de notificaciones
      if (process.env.NODE_ENV !== 'test') {
        notificationScheduler.start();
      }

      // Iniciar servidor
      const server = app.listen(this.port, this.host, () => {
        console.log(`✅ Servidor ejecutándose en http://${this.host}:${this.port}`);
        console.log(`📚 API Docs: http://${this.host}:${this.port}/api/health`);
        console.log('📱 Endpoints disponibles:');
        console.log(`   - Auth: http://${this.host}:${this.port}/api/auth`);
        console.log(`   - Users: http://${this.host}:${this.port}/api/users`);
        console.log(`   - Memberships: http://${this.host}:${this.port}/api/memberships`);
        console.log(`   - Payments: http://${this.host}:${this.port}/api/payments`);
        console.log('🎯 Sistema listo para recibir peticiones');
      });

      // Graceful shutdown
      this.setupGracefulShutdown(server);

    } catch (error) {
      console.error('❌ Error al iniciar el servidor:', error);
      process.exit(1);
    }
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

    // Warnings para servicios opcionales
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      console.warn('⚠️ Cloudinary no configurado - Las imágenes no funcionarán');
    }

    if (!process.env.EMAIL_USER) {
      console.warn('⚠️ Email no configurado - Las notificaciones por email no funcionarán');
    }

    if (!process.env.TWILIO_ACCOUNT_SID) {
      console.warn('⚠️ Twilio no configurado - WhatsApp no funcionará');
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      console.warn('⚠️ Google OAuth no configurado - El login con Google no funcionará');
    }

    // Verificar credenciales de admin
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      console.warn('⚠️ Credenciales de admin no configuradas - Se usarán valores por defecto');
    }
  }

  setupGracefulShutdown(server) {
    // Manejar señales de terminación
    ['SIGTERM', 'SIGINT'].forEach(signal => {
      process.on(signal, () => {
        console.log(`\n📴 Recibida señal ${signal}, cerrando servidor graciosamente...`);
        
        // Parar programador de notificaciones
        notificationScheduler.stop();
        
        // Cerrar servidor HTTP
        server.close(() => {
          console.log('✅ Servidor HTTP cerrado');
          
          // Cerrar conexión a base de datos
          require('./config/database').sequelize.close().then(() => {
            console.log('✅ Conexión a base de datos cerrada');
            console.log('👋 Proceso terminado exitosamente');
            process.exit(0);
          });
        });
      });
    });
  }
}

// Iniciar servidor si este archivo se ejecuta directamente
if (require.main === module) {
  new Server().start();
}

module.exports = Server;