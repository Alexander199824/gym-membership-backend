// src/routes/index.js - ACTUALIZADO con testimonios
const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const membershipRoutes = require('./membershipRoutes');
const paymentRoutes = require('./paymentRoutes');
const storeRoutes = require('./storeRoutes');
const dataCleanupRoutes = require('./dataCleanupRoutes');
const gymRoutes = require('./gymRoutes');
const financialRoutes = require('./financialRoutes');
const scheduleRoutes = require('./scheduleRoutes');
const adminRoutes = require('./adminRoutes');
const stripeRoutes = require('./stripeRoutes');
const dashboardRoutes = require('./dashboardRoutes');
//const promotionRoutes = require('./promotionsRoutes');

// ✅ NUEVAS RUTAS para el frontend
const contentRoutes = require('./contentRoutes');
const brandingRoutes = require('./brandingRoutes');
const promotionsRoutes = require('./promotionsRoutes');

// 🎬 RUTAS multimedia
const gymMediaRoutes = require('./gymMediaRoutes');

// ✅ NUEVO: Rutas de testimonios
const testimonialRoutes = require('./testimonialRoutes');

const router = express.Router();

// ✅ Health check mejorado
router.get('/health', (req, res) => {
  const stripeService = require('../services/stripeService');
  const stripeConfig = stripeService.getPublicConfig();
  
  res.json({
    success: true,
    message: 'Elite Fitness Club API - Sistema Completo con Frontend Integration',
    timestamp: new Date().toISOString(),
    version: '2.3.0',
    services: {
      core: 'Active',
      auth: 'Active',
      gym: 'Active',
      financial: 'Active',
      schedule: 'Active',
      frontend_integration: 'Active',
      multimedia: 'Active',
      testimonials: 'Active', // ✅ NUEVO
      stripe: stripeConfig.enabled ? 'Active' : 'Disabled'
    },
    frontend_endpoints: {
      gym_config: '/api/gym/config',
      landing_content: '/api/content/landing',
      branding_theme: '/api/branding/theme',
      active_promotions: '/api/promotions/active',
      featured_products: '/api/store/featured-products',
      upload_logo: '/api/gym-media/upload-logo',
      upload_video: '/api/gym-media/upload-hero-video',
      create_testimonial: '/api/testimonials', // ✅ NUEVO
      my_testimonials: '/api/testimonials/my-testimonials' // ✅ NUEVO
    }
  });
});

// ✅ ACTUALIZAR endpoints disponibles
router.get('/endpoints', (req, res) => {
  const stripeService = require('../services/stripeService');
  const stripeConfig = stripeService.getPublicConfig();
  
  res.json({
    success: true,
    message: 'Elite Fitness Club API - Endpoints Disponibles',
    version: '2.3.0',
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
      // ✅ NUEVO: Endpoints de testimonios
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
      store: {
        products: 'GET /api/store/products',
        featured: 'GET /api/store/featured-products (específico frontend)',
        cart: 'GET,POST,PUT,DELETE /api/store/cart',
        orders: 'POST /api/store/orders',
        myOrders: 'GET /api/store/my-orders',
        admin: 'GET /api/store/admin/* (staff only)'
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

// ✅ Rutas existentes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/memberships', membershipRoutes);
router.use('/payments', paymentRoutes);
router.use('/store', storeRoutes);
router.use('/data-cleanup', dataCleanupRoutes);
router.use('/gym', gymRoutes);
router.use('/financial', financialRoutes);
router.use('/schedule', scheduleRoutes);
router.use('/admin', adminRoutes);
router.use('/stripe', stripeRoutes);
router.use('/dashboard', dashboardRoutes);

// ✅ NUEVAS RUTAS específicas para el frontend
router.use('/content', contentRoutes);       // /api/content/*
router.use('/branding', brandingRoutes);     // /api/branding/*
router.use('/promotions', promotionsRoutes); // /api/promotions/*
router.use('/promotions', promotionsRoutes);

// 🎬 Rutas multimedia
router.use('/gym-media', gymMediaRoutes);    // /api/gym-media/*

// ✅ NUEVO: Rutas de testimonios
router.use('/testimonials', testimonialRoutes); // /api/testimonials/*

// ✅ Manejo de rutas no encontradas
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado',
    path: req.originalUrl,
    method: req.method,
    suggestion: 'Consulta GET /api/endpoints para ver rutas disponibles',
    frontend_specific_endpoints: [
      'GET /api/gym/config',
      'GET /api/content/landing', 
      'GET /api/branding/theme',
      'GET /api/promotions/active',
      'GET /api/store/featured-products',
      'POST /api/testimonials', // ✅ NUEVO
      'GET /api/testimonials/my-testimonials' // ✅ NUEVO
    ],
    multimedia_endpoints: [
      'POST /api/gym-media/upload-logo',
      'POST /api/gym-media/upload-hero-video',
      'GET /api/gym-media/status'
    ]
  });
});

module.exports = router;