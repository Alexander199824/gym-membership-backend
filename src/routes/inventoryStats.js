// src/routes/inventoryStats.js - RUTAS PARA ESTADÍSTICAS DE INVENTARIO
const express = require('express');
const router = express.Router();
const InventoryStatsController = require('../controllers/InventoryStatsController');
const { authenticateToken } = require('../middleware/auth');
const { 
  authorizeInventoryStats,
  authorizeAdminOnlyReports,
  validateInventoryQueryParams,
  rateLimitInventory
} = require('../middleware/inventoryAuthorization');

// ✅ === ESTADÍSTICAS GENERALES ===

// ✅ === ESTADÍSTICAS GENERALES ===

// GET /api/inventory/stats - Estadísticas generales de inventario
router.get('/stats', 
  authenticateToken, 
  authorizeInventoryStats, 
  validateInventoryQueryParams,
  InventoryStatsController.getInventoryStats
);

// GET /api/inventory/dashboard - Dashboard principal
router.get('/dashboard', 
  authenticateToken, 
  authorizeInventoryStats, 
  InventoryStatsController.getDashboard
);

// ✅ === REPORTES FINANCIEROS ===

// GET /api/inventory/financial-report - Reporte financiero combinado
router.get('/financial-report', 
  authenticateToken, 
  authorizeInventoryStats, 
  validateInventoryQueryParams,
  rateLimitInventory(5, 60000), // 5 requests por minuto
  InventoryStatsController.getFinancialReport
);

// ✅ === REPORTES DE PRODUCTOS ===

// GET /api/inventory/low-stock - Reporte de productos con poco stock
router.get('/low-stock', 
  authenticateToken, 
  authorizeInventoryStats, 
  InventoryStatsController.getLowStockReport
);

// ✅ === PERFORMANCE DE EMPLEADOS (Solo admin) ===

// GET /api/inventory/employee-performance - Performance por empleado
router.get('/employee-performance', 
  authenticateToken, 
  authorizeAdminOnlyReports, 
  validateInventoryQueryParams,
  rateLimitInventory(3, 60000), // 3 requests por minuto
  InventoryStatsController.getEmployeePerformance
);

module.exports = router;