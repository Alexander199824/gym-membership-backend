// src/routes/expenseRoutes.js - RUTAS DE GASTOS (CORREGIDO)
const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { authenticateToken, requireRole, requireStaff, requireAdmin } = require('../middleware/auth');

// ============================================================================
// RUTAS PÚBLICAS (Ninguna - todos requieren autenticación)
// ============================================================================

// ============================================================================
// RUTAS PROTEGIDAS - Requieren autenticación
// ============================================================================

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// ========================================
// CRUD BÁSICO
// ========================================

/**
 * @route   POST /api/expenses
 * @desc    Crear nuevo gasto
 * @access  Private (Admin, Colaborador)
 */
router.post(
  '/',
  requireStaff,
  expenseController.createExpense
);

/**
 * @route   GET /api/expenses
 * @desc    Obtener todos los gastos con filtros
 * @access  Private (Admin, Colaborador)
 * @query   page, limit, status, category, startDate, endDate, vendor, isRecurring
 */
router.get(
  '/',
  requireStaff,
  expenseController.getAllExpenses
);

/**
 * @route   GET /api/expenses/:id
 * @desc    Obtener gasto por ID
 * @access  Private (Admin, Colaborador)
 */
router.get(
  '/:id',
  requireStaff,
  expenseController.getExpenseById
);

/**
 * @route   PUT /api/expenses/:id
 * @desc    Actualizar gasto
 * @access  Private (Admin, Colaborador)
 */
router.put(
  '/:id',
  requireStaff,
  expenseController.updateExpense
);

/**
 * @route   DELETE /api/expenses/:id
 * @desc    Eliminar gasto
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  requireAdmin,
  expenseController.deleteExpense
);

// ========================================
// GESTIÓN DE ESTADOS
// ========================================

/**
 * @route   POST /api/expenses/:id/approve
 * @desc    Aprobar gasto pendiente
 * @access  Private (Admin, Colaborador)
 */
router.post(
  '/:id/approve',
  requireStaff,
  expenseController.approveExpense
);

/**
 * @route   POST /api/expenses/:id/reject
 * @desc    Rechazar gasto pendiente
 * @access  Private (Admin, Colaborador)
 */
router.post(
  '/:id/reject',
  requireStaff,
  expenseController.rejectExpense
);

/**
 * @route   POST /api/expenses/:id/cancel
 * @desc    Cancelar gasto
 * @access  Private (Admin, Colaborador)
 */
router.post(
  '/:id/cancel',
  requireStaff,
  expenseController.cancelExpense
);

// ========================================
// CONSULTAS ESPECIALES
// ========================================

/**
 * @route   GET /api/expenses/pending/approval
 * @desc    Obtener gastos pendientes de aprobación
 * @access  Private (Admin, Colaborador)
 * @query   minAmount (default: 500)
 */
router.get(
  '/pending/approval',
  requireStaff,
  expenseController.getPendingApproval
);

/**
 * @route   GET /api/expenses/category/:category
 * @desc    Obtener gastos por categoría
 * @access  Private (Admin, Colaborador)
 * @query   startDate, endDate
 */
router.get(
  '/category/:category',
  requireStaff,
  expenseController.getByCategory
);

/**
 * @route   GET /api/expenses/recurring/upcoming
 * @desc    Obtener gastos recurrentes próximos
 * @access  Private (Admin, Colaborador)
 * @query   daysAhead (default: 7)
 */
router.get(
  '/recurring/upcoming',
  requireStaff,
  expenseController.getRecurringExpenses
);

/**
 * @route   POST /api/expenses/recurring/process
 * @desc    Procesar gastos recurrentes manualmente
 * @access  Private (Admin only)
 */
router.post(
  '/recurring/process',
  requireAdmin,
  expenseController.processRecurring
);

// ========================================
// REPORTES Y ESTADÍSTICAS
// ========================================

/**
 * @route   GET /api/expenses/stats/summary
 * @desc    Obtener estadísticas de gastos
 * @access  Private (Admin, Colaborador)
 * @query   startDate, endDate (required)
 */
router.get(
  '/stats/summary',
  requireStaff,
  expenseController.getExpenseStats
);

/**
 * @route   GET /api/expenses/stats/breakdown
 * @desc    Obtener breakdown por categoría
 * @access  Private (Admin, Colaborador)
 * @query   startDate, endDate (required)
 */
router.get(
  '/stats/breakdown',
  requireStaff,
  expenseController.getCategoryBreakdown
);

/**
 * @route   GET /api/expenses/stats/vendors
 * @desc    Obtener top proveedores
 * @access  Private (Admin, Colaborador)
 * @query   startDate, endDate (required), limit (default: 10)
 */
router.get(
  '/stats/vendors',
  requireStaff,
  expenseController.getTopVendors
);

// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;