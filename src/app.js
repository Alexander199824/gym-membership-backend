// src/app.js - MEJORADO: CORS optimizado para Vercel deployments dinámicos

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const passport = require('./config/passport');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

// Rate limiter con importación segura
let rateLimiter;
try {
  const rateLimiterModule = require('./middleware/rateLimiter');
  rateLimiter = rateLimiterModule.generalLimiter || rateLimiterModule.developmentLimiter;
  console.log('✅ Rate limiter importado correctamente');
} catch (error) {
  console.warn('⚠️ Rate limiter no disponible:', error.message);
  rateLimiter = (req, res, next) => next();
}

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

    // ✅ CORS MEJORADO: Parsear URLs y permitir todos los deployments de Vercel
    const parseUrls = (envVar) => {
      if (!envVar) return [];
      return envVar.split(',').map(url => url.trim()).filter(Boolean);
    };

    const allowedOrigins = [
      ...parseUrls(process.env.FRONTEND_URL),
      ...parseUrls(process.env.FRONTEND_CLIENT_URL),
      ...parseUrls(process.env.ADMIN_PANEL_URL),
      ...parseUrls(process.env.FRONTEND_ADMIN_URL),
      'http://localhost:3000',
      'http://localhost:3001'
    ].filter(Boolean);

    console.log('✅ CORS - URLs exactas permitidas:', allowedOrigins);

    this.app.use(cors({
      origin: (origin, callback) => {
        // Permitir requests sin origin (Postman, curl, mobile apps)
        if (!origin) {
          return callback(null, true);
        }
        
        // ✅ Método 1: Permitir URLs exactas desde .env
        if (allowedOrigins.includes(origin)) {
          console.log(`✅ CORS permitido (exacto): ${origin}`);
          return callback(null, true);
        }
        
        // ✅ Método 2: Permitir CUALQUIER deployment de Vercel con 'gym-frontend'
        if (origin.includes('gym-frontend') && origin.endsWith('.vercel.app')) {
          console.log(`✅ CORS permitido (Vercel pattern): ${origin}`);
          return callback(null, true);
        }
        
        // ✅ Método 3: Permitir localhost en cualquier puerto
        if (origin.includes('localhost')) {
          console.log(`✅ CORS permitido (localhost): ${origin}`);
          return callback(null, true);
        }
        
        // ❌ Bloquear todo lo demás
        console.warn(`❌ CORS bloqueado: ${origin}`);
        console.warn(`📋 Permitidos:`, allowedOrigins);
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['Content-Length', 'Content-Type'],
      maxAge: 86400
    }));

    // Logging de requests
    this.app.use((req, res, next) => {
      console.log(`📥 ${req.method} ${req.path} - Origin: ${req.headers.origin || 'sin origin'}`);
      next();
    });

    // Rate limiting
    if (rateLimiter && typeof rateLimiter === 'function') {
      this.app.use('/api', rateLimiter);
      console.log('✅ Rate limiter aplicado a /api');
    } else {
      console.warn('⚠️ Rate limiter no aplicado');
    }

    // Logging
    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // Parsear JSON
    this.app.use(express.json({ limit: '500mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '500mb' }));

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
          payments: '/api/payments',
          gym: '/api/gym',
          store: '/api/store',
          localSales: '/api/local-sales',
          inventory: '/api/inventory',
          orderManagement: '/api/order-management'
        },
        documentation: 'https://docs.gym-system.com'
      });
    });

    // Rutas de la API
    this.app.use('/api', routes);

    // Manejo de rutas no encontradas
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
          'GET /api/auth/google',
          'GET /api/gym/config',
          'GET /api/gym/services',
          'GET /api/store/products',
          'GET /api/inventory/stats',
          'GET /api/inventory/dashboard',
          'GET /api/local-sales/',
          'POST /api/local-sales/cash',
          'POST /api/local-sales/transfer'
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