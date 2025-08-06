// src/routes/dashboardRoutes.js - CORREGIDO: Solo STAFF puede acceder al dashboard
const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, requireStaff } = require('../middleware/auth');

const router = express.Router();

// ✅ CORREGIDO: Dashboard unificado solo para STAFF - CLIENTES NO PUEDEN ACCEDER
router.get('/unified', 
  authenticateToken, 
  requireStaff, // ✅ Solo admin y colaborador - CLIENTES EXCLUIDOS
  dashboardController.getUnifiedDashboard
);

// ✅ CORREGIDO: Métricas de rendimiento solo para STAFF - CLIENTES NO PUEDEN ACCEDER
router.get('/metrics', 
  authenticateToken, 
  requireStaff, // ✅ Solo admin y colaborador - CLIENTES EXCLUIDOS
  dashboardController.getPerformanceMetrics
);

module.exports = router;