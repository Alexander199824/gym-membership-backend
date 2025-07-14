// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const passport = require('./config/passport');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
require('dotenv').config();

class App {
  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  initializeMiddlewares() {
    // Seguridad básica
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    }));

    // Compresión de respuestas
    this.app.use(compression());

    // CORS configurado
    this.app.use(cors({
      origin: [
        process.env.FRONTEND_URL,
        process.env.ADMIN_PANEL_URL,
        'http://localhost:3000',
        'http://localhost:3001'
      ].filter(Boolean),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Rate limiting
    this.app.use('/api', apiLimiter);

    // Logging
    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // Parsear JSON
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Inicializar Passport
    this.app.use(passport.initialize());

    // Headers adicionales
    this.app.use((req, res, next) => {
      res.header('X-API-Version', '1.0.0');
      res.header('X-Powered-By', 'Gym Management System');
      next();
    });
  }

  initializeRoutes() {
    // Ruta de bienvenida
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Gym Management System API - Fase 1',
        version: '1.0.0',
        endpoints: {
          health: '/api/health',
          auth: '/api/auth',
          users: '/api/users',
          memberships: '/api/memberships',
          payments: '/api/payments'
        },
        documentation: 'https://docs.gym-system.com'
      });
    });

    // Rutas de la API
    this.app.use('/api', routes);

    // Manejo de rutas no encontradas a nivel de aplicación
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint no encontrado',
        path: req.originalUrl,
        method: req.method,
        availableEndpoints: [
          'GET /',
          'GET /api/health',
          'POST /api/auth/login',
          'POST /api/auth/register',
          'GET /api/auth/google'
        ]
      });
    });
  }

  initializeErrorHandling() {
    // Middleware global de manejo de errores
    this.app.use(errorHandler);

    // Manejo de errores no capturados
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });
  }

  getApp() {
    return this.app;
  }
}

module.exports = new App().getApp();

// src/server.js
const app = require('./app');
const { testConnection, initializeDatabase } = require('./config/database');
const notificationScheduler = require('./services/notificationScheduler');

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

// src/utils/resetDatabase.js
const { initializeDatabase } = require('../config/database');
const { seedAdmin } = require('./seedAdmin');

async function resetDatabase() {
  try {
    console.log('🔄 Iniciando reset de base de datos...');
    
    // Forzar recreación de todas las tablas
    await initializeDatabase(true);
    
    console.log('✅ Base de datos reseteada exitosamente');
    
    // Crear usuario administrador por defecto
    console.log('👤 Creando usuario administrador por defecto...');
    await seedAdmin();
    
    console.log('🎉 Reset completo exitoso');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al resetear la base de datos:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  resetDatabase();
}

module.exports = resetDatabase;

// src/utils/seedAdmin.js
const { User } = require('../models');

async function seedAdmin() {
  try {
    // Verificar si ya existe un administrador
    const existingAdmin = await User.findOne({
      where: { role: 'admin' }
    });

    if (existingAdmin) {
      console.log('⚠️ Ya existe un usuario administrador:', existingAdmin.email);
      return existingAdmin;
    }

    // Crear administrador por defecto
    const adminData = {
      firstName: 'Admin',
      lastName: 'Sistema',
      email: 'admin@gym.com',
      password: 'Admin123!',
      role: 'admin',
      isActive: true,
      emailVerified: true,
      notificationPreferences: {
        email: true,
        whatsapp: true,
        membershipReminders: true,
        promotions: false,
        motivationalMessages: false
      }
    };

    const admin = await User.create(adminData);
    
    console.log('✅ Usuario administrador creado:');
    console.log('   📧 Email:', admin.email);
    console.log('   🔑 Contraseña: Admin123!');
    console.log('   ⚠️  IMPORTANTE: Cambia la contraseña después del primer login');

    return admin;
  } catch (error) {
    console.error('❌ Error al crear usuario administrador:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedAdmin().then(() => {
    console.log('🎯 Proceso completado');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

module.exports = { seedAdmin };

// src/utils/initDatabase.js
const { initializeDatabase } = require('../config/database');
const { seedAdmin } = require('./seedAdmin');

async function initDatabase() {
  try {
    console.log('🔧 Inicializando base de datos...');
    
    // Inicializar sin resetear (solo crear tablas faltantes)
    await initializeDatabase(false);
    
    console.log('✅ Base de datos inicializada');
    
    // Crear administrador si no existe
    await seedAdmin();
    
    console.log('🎉 Inicialización completa');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;