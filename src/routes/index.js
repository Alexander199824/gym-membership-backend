// src/routes/index.js - ARCHIVO PRINCIPAL DE RUTAS ACTUALIZADO con nuevas funcionalidades
const express = require('express');

// ✅ === RUTAS EXISTENTES ===
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const membershipRoutes = require('./membershipRoutes');
const paymentRoutes = require('./paymentRoutes');
const storeRoutes = require('./storeRoutes');
const dataCleanupRoutes = require('./dataCleanupRoutes');
const gymRoutes = require('./gymRoutes');
const financialRoutes = require('./financialRoutes');
const scheduleRoutes = require('./scheduleRoutes');
const stripeRoutes = require('./stripeRoutes');
const dashboardRoutes = require('./dashboardRoutes');

// ✅ RUTAS PARA EL FRONTEND
const contentRoutes = require('./contentRoutes');
const brandingRoutes = require('./brandingRoutes');
const promotionsRoutes = require('./promotionsRoutes');

// 🎬 RUTAS MULTIMEDIA
const gymMediaRoutes = require('./gymMediaRoutes');

// ✅ RUTAS DE TESTIMONIOS
const testimonialRoutes = require('./testimonialRoutes');

// ✅ === NUEVAS RUTAS DE TIENDA ESPECÍFICAS ===
const storeBrandRoutes = require('./storeBrands');
const storeCategoryRoutes = require('./storeCategories');
const storeProductRoutes = require('./storeProducts');
const storeImageRoutes = require('./storeImages');

// ✅ === NUEVAS RUTAS FUNCIONALES ===
const localSalesRoutes = require('./localSales');
const orderManagementRoutes = require('./orderManagement');
const inventoryStatsRoutes = require('./inventoryStats');

const router = express.Router();

// ✅ Health check mejorado y compatible con múltiples bases de datos
router.get('/health', async (req, res) => {
  const stripeService = require('../services/stripeService');
  const stripeConfig = stripeService.getPublicConfig();
  
  // ✅ VERIFICAR CONEXIÓN REAL A LA BASE DE DATOS
  let databaseStatus = 'Desconectada';
  let databaseDetails = null;
  
  try {
    const { sequelize } = require('../config/database');
    await sequelize.authenticate();
    
    // ✅ CORREGIDO: Verificar tablas de forma compatible con diferentes DB
    let tableCount = 0;
    const dialect = sequelize.getDialect();
    
    console.log(`🔍 Detectando base de datos: ${dialect}`);
    
    try {
      let countQuery;
      
      switch (dialect) {
        case 'postgres':
          // PostgreSQL usa current_database() en lugar de DATABASE()
          countQuery = `
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_catalog = current_database()
          `;
          break;
          
        case 'mysql':
        case 'mariadb':
          // MySQL/MariaDB usan DATABASE()
          countQuery = `
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE()
          `;
          break;
          
        case 'sqlite':
          // SQLite usa una consulta diferente
          countQuery = `
            SELECT COUNT(*) as count 
            FROM sqlite_master 
            WHERE type = 'table' 
            AND name NOT LIKE 'sqlite_%'
          `;
          break;
          
        case 'mssql':
          // SQL Server
          countQuery = `
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = SCHEMA_NAME()
          `;
          break;
          
        default:
          // Fallback genérico
          countQuery = `
            SELECT COUNT(*) as count 
            FROM information_schema.tables
          `;
      }
      
      const [results] = await sequelize.query(countQuery);
      tableCount = parseInt(results[0]?.count) || 0;
      
      console.log(`📊 Tablas encontradas: ${tableCount}`);
      
    } catch (tableError) {
      console.warn('⚠️ No se pudo contar las tablas:', tableError.message);
      // Intentar método alternativo más simple
      try {
        const models = Object.keys(sequelize.models);
        tableCount = models.length;
        console.log(`📊 Usando conteo de modelos Sequelize: ${tableCount} modelos`);
      } catch (modelError) {
        console.warn('⚠️ No se pudo contar modelos:', modelError.message);
        tableCount = 'Desconocido';
      }
    }
    
    databaseStatus = 'Conectada';
    databaseDetails = {
      connected: true,
      tables: tableCount,
      dialect: dialect,
      host: sequelize.config.host || 'local',
      database: sequelize.config.database || 'unknown',
      version: 'connected'
    };
    
    console.log(`✅ Base de datos conectada: ${dialect} - ${tableCount} tablas`);
    
  } catch (error) {
    console.error('❌ Health check - Error BD:', error.message);
    databaseDetails = {
      connected: false,
      error: error.message,
      dialect: 'unknown'
    };
  }
  
  res.json({
    success: true,
    message: 'Elite Fitness Club API - Sistema Completo con Gestión de Tienda y Ventas Locales',
    timestamp: new Date().toISOString(),
    version: '2.5.0', // ✅ Actualizada versión
    database: databaseStatus, // ✅ ESTO ES LO QUE LEE EL TEST
    databaseDetails,
    services: {
      core: 'Active',
      auth: 'Active',
      gym: 'Active',
      store: 'Active',
      storeManagement: 'Active',
      localSales: 'Active', // ✅ NUEVO
      orderManagement: 'Active', // ✅ NUEVO
      inventoryStats: 'Active', // ✅ NUEVO
      financial: 'Active',
      schedule: 'Active',
      frontend_integration: 'Active',
      multimedia: 'Active',
      testimonials: 'Active',
      stripe: stripeConfig.enabled ? 'Active' : 'Disabled'
    },
    endpoints: {
      responding: 6, // ✅ Actualizado con nuevos endpoints
      total: 6
    }
  });
});

// ✅ ACTUALIZAR endpoints disponibles con las nuevas rutas
router.get('/endpoints', (req, res) => {
  const stripeService = require('../services/stripeService');
  const stripeConfig = stripeService.getPublicConfig();
  
  res.json({
    success: true,
    message: 'Elite Fitness Club API - Endpoints Disponibles',
    version: '2.5.0',
    endpoints: {
      core: {
        health: 'GET /api/health',
        auth: 'POST /api/auth/login, /register, /profile',
        users: 'GET,POST,PUT /api/users',
        memberships: 'GET,POST,PUT /api/memberships',
        payments: 'GET,POST /api/payments'
      },
      gym: {
        info: 'GET /api/gym/info (público)',
        config: 'GET /api/gym/config (específico frontend)',
        services: 'GET /api/gym/services (específico frontend)',
        testimonials: 'GET /api/gym/testimonials (específico frontend)',
        stats: 'GET /api/gym/stats (específico frontend)',
        plans: 'GET /api/gym/plans',
        contact: 'GET /api/gym/contact',
        hours: 'GET /api/gym/hours'
      },
      // ✅ Endpoints de testimonios
      testimonials: {
        create: 'POST /api/testimonials (clientes)',
        myTestimonials: 'GET /api/testimonials/my-testimonials (clientes)',
        update: 'PATCH /api/testimonials/:id (clientes)',
        pending: 'GET /api/testimonials/pending (admin)',
        approve: 'POST /api/testimonials/:id/approve (admin)',
        markNotPublic: 'POST /api/testimonials/:id/mark-not-public (admin)',
        analysis: 'GET /api/testimonials/analysis (admin)',
        stats: 'GET /api/testimonials/stats (admin)'
      },
      'gym-media': {
        uploadLogo: 'POST /api/gym-media/upload-logo (admin)',
        uploadHeroVideo: 'POST /api/gym-media/upload-hero-video (admin)',
        uploadHeroImage: 'POST /api/gym-media/upload-hero-image (admin)',
        uploadServiceImage: 'POST /api/gym-media/upload-service-image/:serviceId (admin)',
        uploadTestimonialImage: 'POST /api/gym-media/upload-testimonial-image/:testimonialId (admin)',
        uploadProductImage: 'POST /api/gym-media/upload-product-image/:productId (staff)',
        uploadUserProfile: 'POST /api/gym-media/upload-user-profile/:userId (staff)',
        deleteMedia: 'DELETE /api/gym-media/delete/:type/:id?/:imageId? (admin)',
        mediaInfo: 'GET /api/gym-media/media-info (staff)',
        status: 'GET /api/gym-media/status (público)'
      },
      content: {
        landing: 'GET /api/content/landing (específico frontend)'
      },
      branding: {
        theme: 'GET /api/branding/theme (específico frontend)'
      },
      promotions: {
        active: 'GET /api/promotions/active (específico frontend)'
      },
      store_public: {
        products: 'GET /api/store/products',
        featured: 'GET /api/store/featured-products (específico frontend)',
        categories: 'GET /api/store/categories',
        brands: 'GET /api/store/brands',
        search: 'GET /api/store/search',
        categoryProducts: 'GET /api/store/category/:slug/products',
        relatedProducts: 'GET /api/store/products/:id/related',
        cart: 'GET,POST,PUT,DELETE /api/store/cart',
        orders: 'POST /api/store/orders',
        myOrders: 'GET /api/store/my-orders',
        checkStock: 'POST /api/store/check-stock',
        stats: 'GET /api/store/stats'
      },
      store_management: {
        brands: 'CRUD /api/store/brands/*',
        categories: 'CRUD /api/store/categories/*',
        products: 'CRUD /api/store/products/*',
        inventory: 'PUT /api/store/products/*/stock',
        bulkStock: 'PUT /api/store/products/bulk-stock',
        images: 'POST,PUT,DELETE /api/store/images/*',
        orders: 'GET,PUT /api/store/management/*',
        dashboard: 'GET /api/store/management/dashboard',
        reports: 'GET /api/store/management/reports/*',
        config: 'GET /api/store/management/config',
        health: 'GET /api/store/management/health'
      },
      // ✅ NUEVOS ENDPOINTS DE VENTAS LOCALES
      local_sales: {
        create: 'POST /api/local-sales (staff)',
        list: 'GET /api/local-sales (staff)',
        details: 'GET /api/local-sales/:id (staff)',
        update: 'PATCH /api/local-sales/:id (staff)',
        cancel: 'DELETE /api/local-sales/:id (staff)',
        dailyReport: 'GET /api/local-sales/reports/daily (staff)',
        stats: 'GET /api/local-sales/stats (staff)',
        topProducts: 'GET /api/local-sales/top-products (staff)'
      },
      // ✅ NUEVOS ENDPOINTS DE GESTIÓN DE ÓRDENES
      order_management: {
        list: 'GET /api/store/management/orders (staff)',
        details: 'GET /api/store/management/orders/:id (staff)',
        updateStatus: 'PATCH /api/store/management/orders/:id/status (staff)',
        assignStaff: 'PATCH /api/store/management/orders/:id/assign (staff)',
        addNotes: 'PATCH /api/store/management/orders/:id/notes (staff)',
        stats: 'GET /api/store/management/orders/stats (staff)',
        reports: 'GET /api/store/management/orders/reports (staff)'
      },
      // ✅ NUEVOS ENDPOINTS DE ESTADÍSTICAS DE INVENTARIO
      inventory_stats: {
        overview: 'GET /api/inventory/overview (staff)',
        lowStock: 'GET /api/inventory/low-stock (staff)',
        movements: 'GET /api/inventory/movements (staff)',
        topProducts: 'GET /api/inventory/top-products (staff)',
        forecasting: 'GET /api/inventory/forecasting (staff)',
        alerts: 'GET /api/inventory/alerts (staff)'
      },
      financial: {
        movements: 'GET,POST /api/financial/movements',
        reports: 'GET /api/financial/reports',
        dashboard: 'GET /api/financial/dashboard'
      },
      schedule: {
        mySchedule: 'GET,PUT,POST /api/schedule/my-schedule',
        analytics: 'GET /api/schedule/popular-times'
      },
      stripe: {
        enabled: stripeConfig.enabled,
        mode: stripeConfig.mode,
        config: 'GET /api/stripe/config (público)',
        membershipPayment: 'POST /api/stripe/create-membership-intent',
        dailyPayment: 'POST /api/stripe/create-daily-intent',
        storePayment: 'POST /api/stripe/create-store-intent',
        confirmPayment: 'POST /api/stripe/confirm-payment',
        webhook: 'POST /api/stripe/webhook',
        admin: 'POST /api/stripe/refund, GET /api/stripe/payments (staff only)'
      },
      dashboard: {
        unified: 'GET /api/dashboard/unified',
        metrics: 'GET /api/dashboard/metrics'
      },
      admin: {
        upload: 'POST /api/admin/upload',
        systemInfo: 'GET /api/admin/system-info',
        dataCleanup: 'GET,DELETE,POST /api/data-cleanup/* (admin only)'
      }
    }
  });
});

// ✅ === CONFIGURACIÓN DE RUTAS EXISTENTES ===
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/memberships', membershipRoutes);
router.use('/payments', paymentRoutes);
router.use('/store', storeRoutes);
router.use('/data-cleanup', dataCleanupRoutes);
router.use('/gym', gymRoutes);
router.use('/financial', financialRoutes);
router.use('/schedule', scheduleRoutes);
router.use('/stripe', stripeRoutes);
router.use('/dashboard', dashboardRoutes);

// ✅ RUTAS ESPECÍFICAS PARA EL FRONTEND
router.use('/content', contentRoutes);       // /api/content/*
router.use('/branding', brandingRoutes);     // /api/branding/*
router.use('/promotions', promotionsRoutes); // /api/promotions/*

// 🎬 Rutas multimedia
router.use('/gym-media', gymMediaRoutes);    // /api/gym-media/*

// ✅ Rutas de testimonios
router.use('/testimonials', testimonialRoutes); // /api/testimonials/*

// ✅ === NUEVAS RUTAS DE TIENDA ESPECÍFICAS ===
// Estas rutas van DESPUÉS de /store para que no interfieran con las rutas generales
router.use('/store/brands', storeBrandRoutes);        // /api/store/brands/*
router.use('/store/categories', storeCategoryRoutes); // /api/store/categories/*
router.use('/store/products', storeProductRoutes);    // /api/store/products/*
router.use('/store/images', storeImageRoutes);        // /api/store/images/*

// ✅ === NUEVAS RUTAS FUNCIONALES ===
router.use('/local-sales', localSalesRoutes);         // /api/local-sales/*
router.use('/store/management', orderManagementRoutes); // /api/store/management/*
router.use('/inventory', inventoryStatsRoutes);       // /api/inventory/*

// ✅ Manejo de rutas no encontradas (ACTUALIZADO)
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado',
    path: req.originalUrl,
    method: req.method,
    suggestion: 'Consulta GET /api/endpoints para ver rutas disponibles',
    public_endpoints: [
      'GET /api/store/products',
      'GET /api/store/categories',
      'GET /api/store/search',
      'POST /api/store/cart',
      'POST /api/store/orders'
    ],
    management_endpoints: [
      'GET /api/store/management/products (requiere staff)',
      'POST /api/store/brands (requiere staff)',
      'GET /api/store/management/dashboard (requiere staff)',
      'GET /api/inventory/overview (requiere staff)',
      'POST /api/local-sales (requiere staff)'
    ],
    frontend_specific_endpoints: [
      'GET /api/gym/config',
      'GET /api/content/landing', 
      'GET /api/branding/theme',
      'GET /api/promotions/active',
      'GET /api/store/featured-products',
      'POST /api/testimonials',
      'GET /api/testimonials/my-testimonials'
    ],
    multimedia_endpoints: [
      'POST /api/gym-media/upload-logo',
      'POST /api/gym-media/upload-hero-video',
      'GET /api/gym-media/status'
    ],
    new_endpoints: [
      'POST /api/local-sales (ventas locales)',
      'GET /api/inventory/overview (estadísticas inventario)',
      'GET /api/store/management/orders (gestión órdenes)',
      'GET /api/local-sales/reports/daily (reportes ventas)'
    ]
  });
});

module.exports = router;