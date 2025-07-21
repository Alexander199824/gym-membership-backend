// src/routes/index.js - CORREGIDO: Agregar rutas faltantes
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
const dashboardRoutes = require('./dashboardRoutes'); // ✅ AGREGADO

const router = express.Router();

// ✅ Health check mejorado con Stripe
router.get('/health', (req, res) => {
  const stripeService = require('../services/stripeService');
  const stripeConfig = stripeService.getPublicConfig();
  
  res.json({
    success: true,
    message: 'Elite Fitness Club API - Sistema Completo con Pagos',
    timestamp: new Date().toISOString(),
    version: '2.1.0',
    services: {
      core: 'Active',
      auth: 'Active',
      gym: 'Active',
      financial: 'Active',
      schedule: 'Active',
      stripe: stripeConfig.enabled ? 'Active' : 'Disabled'
    },
    payments: {
      cash: 'Available',
      card: 'Available',
      transfer: 'Available',
      stripe: stripeConfig.enabled ? `Available (${stripeConfig.mode})` : 'Not configured'
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
    version: '2.1.0',
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
        config: 'GET,PUT /api/gym/config',
        services: 'GET /api/gym/services',
        plans: 'GET /api/gym/plans'
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
      store: {
        products: 'GET /api/store/products',
        cart: 'GET,POST,PUT,DELETE /api/store/cart',
        orders: 'POST /api/store/orders',
        myOrders: 'GET /api/store/my-orders',
        admin: 'GET /api/store/admin/* (staff only)'
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
      dashboard: { // ✅ AGREGADO
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
router.use('/dashboard', dashboardRoutes); // ✅ AGREGADO

// ✅ Manejo de rutas no encontradas
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado',
    path: req.originalUrl,
    method: req.method,
    suggestion: 'Consulta GET /api/endpoints para ver rutas disponibles'
  });
});

module.exports = router;