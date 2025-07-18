// src/routes/dashboardRoutes.js
const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, requireStaff } = require('../middleware/auth');

const router = express.Router();

// ✅ Dashboard unificado (membresías + productos + finanzas)
router.get('/unified', 
  authenticateToken, 
  requireStaff, 
  dashboardController.getUnifiedDashboard
);

// ✅ Métricas de rendimiento
router.get('/metrics', 
  authenticateToken, 
  requireStaff, 
  dashboardController.getPerformanceMetrics
);

module.exports = router;