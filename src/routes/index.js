// src/routes/index.js (Actualizado)
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

const router = express.Router();

// ✅ Health check mejorado
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Elite Fitness Club API - Sistema Completo',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    services: {
      core: 'Active',
      auth: 'Active',
      gym: 'Active',
      financial: 'Active',
      schedule: 'Active'
    }
  });
});

router.use('/store', storeRoutes);
router.use('/data-cleanup', dataCleanupRoutes);

// ✅ ACTUALIZAR la información de endpoints
router.get('/endpoints', (req, res) => {
  res.json({
    success: true,
    message: 'Elite Fitness Club API - Endpoints Disponibles',
    version: '2.1.0', // ← Incrementar versión
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
      // ✅ NUEVO: Endpoints de tienda
      store: {
        products: 'GET /api/store/products',
        cart: 'GET,POST,PUT,DELETE /api/store/cart',
        orders: 'POST /api/store/orders',
        myOrders: 'GET /api/store/my-orders',
        admin: 'GET /api/store/admin/* (staff only)'
      },
      admin: {
        upload: 'POST /api/admin/upload',
        systemInfo: 'GET /api/admin/system-info',
        // ✅ NUEVO: Limpieza de datos
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

// ✅ Nuevas rutas
router.use('/gym', gymRoutes);
router.use('/financial', financialRoutes);
router.use('/schedule', scheduleRoutes);
router.use('/admin', adminRoutes);

// ✅ Ruta de información de la API
router.get('/endpoints', (req, res) => {
  res.json({
    success: true,
    message: 'Elite Fitness Club API - Endpoints Disponibles',
    version: '2.0.0',
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
      admin: {
        upload: 'POST /api/admin/upload',
        systemInfo: 'GET /api/admin/system-info'
      }
    }
  });
});

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