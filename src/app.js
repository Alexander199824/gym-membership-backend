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