// src/routes/index.js - ARCHIVO PRINCIPAL DE RUTAS COMPLETO Y ACTUALIZADO
const express = require('express');

// ✅ === RUTAS BÁSICAS DEL SISTEMA ===
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const membershipRoutes = require('./membershipRoutes');
const paymentRoutes = require('./paymentRoutes');
const gymRoutes = require('./gymRoutes');
const financialRoutes = require('./financialRoutes');
const scheduleRoutes = require('./scheduleRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const dataCleanupRoutes = require('./dataCleanupRoutes');

// ✅ === NUEVAS RUTAS DE MEMBERSHIP PLANS ===
const membershipPlansRoutes = require('./membershipPlansRoutes');

// ✅ === NUEVAS RUTAS DE STATISTICS ===
const statisticsRoutes = require('./statisticsRoutes');

// ✅ === RUTAS DE TIENDA ===
const storeRoutes = require('./storeRoutes');

// ✅ === RUTAS MULTIMEDIA Y FRONTEND ===
const gymMediaRoutes = require('./gymMediaRoutes');
const testimonialRoutes = require('./testimonialRoutes');
const contentRoutes = require('./contentRoutes');
const brandingRoutes = require('./brandingRoutes');
const promotionsRoutes = require('./promotionsRoutes');

// ✅ === RUTAS DE PAGOS ===
const stripeRoutes = require('./stripeRoutes');

// ✅ === RUTAS ESPECÍFICAS DE FUNCIONALIDADES ===
const localSalesRoutes = require('./localSales');
const orderManagementRoutes = require('./orderManagement');
const inventoryStatsRoutes = require('./inventoryStats');

const router = express.Router();

// ✅ === HEALTH CHECK MEJORADO ===
router.get('/health', async (req, res) => {
  let databaseStatus = 'Desconectada';
  let databaseDetails = null;
  
  try {
    const { sequelize } = require('../config/database');
    await sequelize.authenticate();
    
    const dialect = sequelize.getDialect();
    let tableCount = 0;
    
    try {
      let countQuery;
      
      switch (dialect) {
        case 'postgres':
          countQuery = `
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_catalog = current_database()
          `;
          break;
        case 'mysql':
        case 'mariadb':
          countQuery = `
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE()
          `;
          break;
        case 'sqlite':
          countQuery = `
            SELECT COUNT(*) as count 
            FROM sqlite_master 
            WHERE type = 'table' 
            AND name NOT LIKE 'sqlite_%'
          `;
          break;
        default:
          countQuery = `
            SELECT COUNT(*) as count 
            FROM information_schema.tables
          `;
      }
      
      const [results] = await sequelize.query(countQuery);
      tableCount = parseInt(results[0]?.count) || 0;
      
    } catch (tableError) {
      console.warn('⚠️ No se pudo contar las tablas:', tableError.message);
      try {
        const models = Object.keys(sequelize.models);
        tableCount = models.length;
      } catch (modelError) {
        tableCount = 'Desconocido';
      }
    }
    
    databaseStatus = 'Conectada';
    databaseDetails = {
      connected: true,
      tables: tableCount,
      dialect: dialect,
      host: sequelize.config.host || 'local',
      database: sequelize.config.database || 'unknown'
    };
    
  } catch (error) {
    console.error('❌ Health check - Error BD:', error.message);
    databaseDetails = {
      connected: false,
      error: error.message,
      dialect: 'unknown'
    };
  }

  // Verificar Stripe
  let stripeConfig = { enabled: false };
  try {
    const stripeService = require('../services/stripeService');
    stripeConfig = stripeService.getPublicConfig();
  } catch (error) {
    console.warn('⚠️ Stripe service not available');
  }
  
  res.json({
    success: true,
    message: 'Elite Fitness Club API - Sistema Completo de Gestión',
    timestamp: new Date().toISOString(),
    version: '3.2.0', // ✅ ACTUALIZADA para incluir statistics
    database: databaseStatus,
    databaseDetails,
    services: {
      core: 'Active',
      auth: 'Active',
      gym: 'Active',
      membershipPlans: 'Active',
      statistics: 'Active', // ✅ NUEVA
      store: 'Active',
      storeManagement: 'Active',
      localSales: 'Active',
      orderManagement: 'Active',
      inventoryStats: 'Active',
      financial: 'Active',
      schedule: 'Active',
      multimedia: 'Active',
      testimonials: 'Active',
      frontend: 'Active',
      stripe: stripeConfig.enabled ? 'Active' : 'Disabled'
    },
    endpoints: {
      total: 14, // ✅ ACTUALIZADO
      responding: 14
    }
  });
});

// ✅ === ENDPOINTS DISPONIBLES ===
router.get('/endpoints', (req, res) => {
  let stripeConfig = { enabled: false, mode: 'unknown' };
  try {
    const stripeService = require('../services/stripeService');
    stripeConfig = stripeService.getPublicConfig();
  } catch (error) {
    // Stripe no disponible
  }
  
  res.json({
    success: true,
    message: 'Elite Fitness Club API - Documentación de Endpoints',
    version: '3.2.0',
    categories: {
      // === AUTENTICACIÓN Y USUARIOS ===
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        profile: 'GET /api/auth/profile',
        refresh: 'POST /api/auth/refresh-token',
        logout: 'POST /api/auth/logout'
      },
      users: {
        list: 'GET /api/users (admin)',
        create: 'POST /api/users (admin)',
        update: 'PUT /api/users/:id',
        delete: 'DELETE /api/users/:id (admin)',
        profile: 'GET /api/users/profile'
      },
      
      // === GIMNASIO ===
      gym: {
        info: 'GET /api/gym/info (público)',
        config: 'GET /api/gym/config (frontend)',
        services: 'GET /api/gym/services (frontend)',
        testimonials: 'GET /api/gym/testimonials (frontend)',
        stats: 'GET /api/gym/stats (frontend)',
        plans: 'GET /api/gym/plans',
        contact: 'GET /api/gym/contact',
        hours: 'GET /api/gym/hours'
      },
      
      // === MEMBRESÍAS ===
      memberships: {
        list: 'GET /api/memberships',
        create: 'POST /api/memberships (admin)',
        update: 'PUT /api/memberships/:id (admin)',
        userMembership: 'GET /api/memberships/my-membership',
        purchase: 'POST /api/memberships/purchase',
        mySchedule: 'GET /api/memberships/my-schedule (cliente)',
        changeSchedule: 'POST /api/memberships/my-schedule/change (cliente)'
      },
      
      // ✅ === PLANES DE MEMBRESÍA ===
      membershipPlans: {
        listAll: 'GET /api/membership-plans (admin)',
        getActive: 'GET /api/membership-plans/active (público)',
        getById: 'GET /api/membership-plans/:id (admin)',
        create: 'POST /api/membership-plans (admin)',
        update: 'PUT /api/membership-plans/:id (admin)',
        delete: 'DELETE /api/membership-plans/:id (admin)',
        toggleStatus: 'PATCH /api/membership-plans/:id/toggle-status (admin)',
        duplicate: 'POST /api/membership-plans/:id/duplicate (admin)',
        reorder: 'PATCH /api/membership-plans/reorder (admin)',
        stats: 'GET /api/membership-plans/stats (admin)',
        checkName: 'POST /api/membership-plans/check-name-availability (admin)',
        metadata: 'GET /api/membership-plans/metadata/duration-types (público)'
      },
      
      // ✅ === ESTADÍSTICAS (NUEVO) ===
      statistics: {
        getActive: 'GET /api/statistics/active (público)',
        listAll: 'GET /api/statistics (admin)',
        getById: 'GET /api/statistics/:id (admin)',
        create: 'POST /api/statistics (admin)',
        update: 'PUT /api/statistics/:id (admin)',
        delete: 'DELETE /api/statistics/:id (admin)',
        toggle: 'PATCH /api/statistics/:id/toggle (admin)',
        reorder: 'PUT /api/statistics/reorder/batch (admin)',
        seed: 'POST /api/statistics/seed/defaults (admin)'
      },
      
      // === PAGOS ===
      payments: {
        list: 'GET /api/payments',
        create: 'POST /api/payments',
        myPayments: 'GET /api/payments/my-payments'
      },
      
      // === TIENDA PÚBLICA ===
      store: {
        products: 'GET /api/store/products',
        featured: 'GET /api/store/featured-products',
        categories: 'GET /api/store/categories',
        brands: 'GET /api/store/brands',
        search: 'GET /api/store/search',
        productDetails: 'GET /api/store/products/:id',
        categoryProducts: 'GET /api/store/category/:slug/products',
        relatedProducts: 'GET /api/store/products/:id/related',
        cart: 'GET,POST,PUT,DELETE /api/store/cart',
        orders: 'POST /api/store/orders',
        myOrders: 'GET /api/store/my-orders',
        orderDetails: 'GET /api/store/orders/:id',
        checkStock: 'POST /api/store/check-stock',
        stats: 'GET /api/store/stats'
      },
      
      // === GESTIÓN DE TIENDA (STAFF) ===
      storeManagement: {
        brands: 'CRUD /api/store/management/brands/*',
        categories: 'CRUD /api/store/management/categories/*',
        products: 'CRUD /api/store/management/products/*',
        images: 'POST,PUT,DELETE /api/store/management/products/*/images',
        inventory: 'PUT /api/store/management/products/*/stock',
        bulkStock: 'PUT /api/store/management/products/bulk-stock',
        orders: 'GET,PUT /api/store/management/orders/*',
        dashboard: 'GET /api/store/management/dashboard',
        reports: 'GET /api/store/management/reports/*'
      },
      
      // === VENTAS LOCALES (STAFF) ===
      localSales: {
        createCash: 'POST /api/local-sales/cash',
        createTransfer: 'POST /api/local-sales/transfer',
        confirmTransfer: 'POST /api/local-sales/:id/confirm-transfer (admin)',
        list: 'GET /api/local-sales',
        details: 'GET /api/local-sales/:id',
        pendingTransfers: 'GET /api/local-sales/pending-transfers',
        searchProducts: 'GET /api/local-sales/products/search',
        dailyReport: 'GET /api/local-sales/reports/daily',
        myStats: 'GET /api/local-sales/my-stats (colaborador)'
      },
      
      // === GESTIÓN DE ÓRDENES (STAFF) ===
      orderManagement: {
        confirmOrder: 'POST /api/order-management/:id/confirm',
        confirmTransfer: 'POST /api/order-management/:id/confirm-transfer (admin)',
        pendingTransfers: 'GET /api/order-management/pending-transfers',
        dashboard: 'GET /api/order-management/dashboard',
        byDeliveryType: 'GET /api/order-management/by-delivery-type',
        updateStatus: 'PATCH /api/order-management/:id/status',
        stats: 'GET /api/order-management/stats'
      },
      
      // === ESTADÍSTICAS DE INVENTARIO (STAFF) ===
      inventory: {
        stats: 'GET /api/inventory/stats',
        dashboard: 'GET /api/inventory/dashboard',
        financialReport: 'GET /api/inventory/financial-report',
        lowStockReport: 'GET /api/inventory/low-stock',
        employeePerformance: 'GET /api/inventory/employee-performance (admin)'
      },
      
      // === TESTIMONIOS ===
      testimonials: {
        create: 'POST /api/testimonials (clientes)',
        myTestimonials: 'GET /api/testimonials/my-testimonials',
        update: 'PATCH /api/testimonials/:id',
        pending: 'GET /api/testimonials/pending (admin)',
        approve: 'POST /api/testimonials/:id/approve (admin)',
        stats: 'GET /api/testimonials/stats (admin)'
      },
      
      // === MULTIMEDIA ===
      gymMedia: {
        uploadLogo: 'POST /api/gym-media/upload-logo (admin)',
        uploadHeroVideo: 'POST /api/gym-media/upload-hero-video (admin)',
        uploadHeroImage: 'POST /api/gym-media/upload-hero-image (admin)',
        uploadServiceImage: 'POST /api/gym-media/upload-service-image/:id (admin)',
        uploadTestimonialImage: 'POST /api/gym-media/upload-testimonial-image/:id (admin)',
        uploadProductImage: 'POST /api/gym-media/upload-product-image/:id (staff)',
        uploadUserProfile: 'POST /api/gym-media/upload-user-profile/:id (staff)',
        deleteMedia: 'DELETE /api/gym-media/delete/:type/:id (admin)',
        mediaInfo: 'GET /api/gym-media/media-info (staff)',
        status: 'GET /api/gym-media/status (público)'
      },
      
      // === FRONTEND ESPECÍFICO ===
      frontend: {
        landing: 'GET /api/content/landing',
        theme: 'GET /api/branding/theme',
        promotions: 'GET /api/promotions/active'
      },
      
      // === FINANZAS ===
      financial: {
        movements: 'GET,POST /api/financial/movements',
        reports: 'GET /api/financial/reports',
        dashboard: 'GET /api/financial/dashboard'
      },
      
      // === HORARIOS ===
      schedule: {
        mySchedule: 'GET,PUT,POST /api/schedule/my-schedule',
        analytics: 'GET /api/schedule/popular-times'
      },
      
      // === STRIPE ===
      stripe: {
        enabled: stripeConfig.enabled,
        mode: stripeConfig.mode,
        config: 'GET /api/stripe/config',
        membershipPayment: 'POST /api/stripe/create-membership-intent',
        dailyPayment: 'POST /api/stripe/create-daily-intent',
        storePayment: 'POST /api/stripe/create-store-intent',
        confirmPayment: 'POST /api/stripe/confirm-payment',
        webhook: 'POST /api/stripe/webhook',
        refund: 'POST /api/stripe/refund (admin)',
        payments: 'GET /api/stripe/payments (admin)'
      },
      
      // === DASHBOARD ===
      dashboard: {
        unified: 'GET /api/dashboard/unified',
        metrics: 'GET /api/dashboard/metrics'
      },
      
      // === ADMINISTRACIÓN ===
      admin: {
        dataCleanup: 'GET,DELETE,POST /api/data-cleanup/* (admin)',
        systemInfo: 'GET /api/admin/system-info (admin)'
      }
    },
    permissions: {
      public: 'No requiere autenticación',
      cliente: 'Requiere token de cliente',
      colaborador: 'Requiere token de colaborador o admin',
      admin: 'Requiere token de admin'
    }
  });
});

// ✅ === CONFIGURACIÓN DE RUTAS ===

// Rutas básicas del sistema
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/memberships', membershipRoutes);
router.use('/payments', paymentRoutes);
router.use('/gym', gymRoutes);
router.use('/financial', financialRoutes);
router.use('/schedule', scheduleRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/data-cleanup', dataCleanupRoutes);

// ✅ === NUEVAS RUTAS ===
router.use('/membership-plans', membershipPlansRoutes);
router.use('/statistics', statisticsRoutes); // ✅ NUEVA RUTA DE ESTADÍSTICAS

// Rutas de tienda (incluye gestión en /management)
router.use('/store', storeRoutes);

// Rutas multimedia y frontend
router.use('/gym-media', gymMediaRoutes);
router.use('/testimonials', testimonialRoutes);
router.use('/content', contentRoutes);
router.use('/branding', brandingRoutes);
router.use('/promotions', promotionsRoutes);

// Rutas de pagos
router.use('/stripe', stripeRoutes);

// ✅ === RUTAS ESPECÍFICAS ===

// Ventas locales (efectivo y transferencias)
router.use('/local-sales', localSalesRoutes);

// Gestión avanzada de órdenes online
router.use('/order-management', orderManagementRoutes);

// Estadísticas e inventario
router.use('/inventory', inventoryStatsRoutes);

console.log('✅ Sistema de rutas cargado completamente:');
console.log('   🔐 Autenticación y usuarios');
console.log('   🏋️ Gimnasio y membresías');
console.log('   📋 Planes de membresía (CRUD)');
console.log('   📊 Estadísticas configurables (CRUD)'); // ✅ NUEVA
console.log('   🛒 Tienda online completa');
console.log('   🏪 Ventas locales (efectivo/transferencia)');
console.log('   📦 Gestión avanzada de órdenes');
console.log('   📈 Estadísticas e inventario');
console.log('   💳 Pagos (Stripe + locales)');
console.log('   🎬 Multimedia (Cloudinary)');
console.log('   💬 Testimonios');
console.log('   🎨 Frontend (branding/contenido)');
console.log('   💰 Finanzas y reportes');

// ✅ === MANEJO DE RUTAS NO ENCONTRADAS ===
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado',
    path: req.originalUrl,
    method: req.method,
    suggestion: 'Consulta GET /api/endpoints para ver todas las rutas disponibles',
    quickLinks: {
      documentation: 'GET /api/endpoints',
      health: 'GET /api/health',
      storeProducts: 'GET /api/store/products',
      gymInfo: 'GET /api/gym/info',
      membershipPlans: 'GET /api/membership-plans/active',
      statistics: 'GET /api/statistics/active', // ✅ NUEVA
      auth: 'POST /api/auth/login'
    },
    categories: [
      'Públicas: /api/store/*, /api/gym/info, /api/content/*, /api/membership-plans/active, /api/statistics/active',
      'Clientes: /api/auth/*, /api/testimonials/*, /api/store/cart, /api/memberships/my-*',
      'Staff: /api/local-sales/*, /api/store/management/*, /api/inventory/*, /api/membership-plans (admin)',
      'Admin: /api/users/*, /api/gym-media/*, /api/data-cleanup/*, /api/membership-plans/*, /api/statistics/*'
    ]
  });
});

module.exports = router;