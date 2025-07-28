// src/routes/index.js - ACTUALIZADO: Incluir nuevas rutas para el frontend
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

// ✅ NUEVAS RUTAS para el frontend
const contentRoutes = require('./contentRoutes');
const brandingRoutes = require('./brandingRoutes');
const promotionsRoutes = require('./promotionsRoutes');

const router = express.Router();

// ✅ Health check mejorado
router.get('/health', (req, res) => {
  const stripeService = require('../services/stripeService');
  const stripeConfig = stripeService.getPublicConfig();
  
  res.json({
    success: true,
    message: 'Elite Fitness Club API - Sistema Completo con Frontend Integration',
    timestamp: new Date().toISOString(),
    version: '2.2.0',
    services: {
      core: 'Active',
      auth: 'Active',
      gym: 'Active',
      financial: 'Active',
      schedule: 'Active',
      frontend_integration: 'Active',
      stripe: stripeConfig.enabled ? 'Active' : 'Disabled'
    },
    frontend_endpoints: {
      gym_config: '/api/gym/config',
      landing_content: '/api/content/landing',
      branding_theme: '/api/branding/theme',
      active_promotions: '/api/promotions/active',
      featured_products: '/api/store/featured-products'
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
    version: '2.2.0',
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
      'GET /api/store/featured-products'
    ]
  });
});

module.exports = router;