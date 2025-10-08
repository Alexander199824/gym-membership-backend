// src/routes/expenseRoutes.js - RUTAS DE GASTOS
const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { authenticate, authorize } = require('../middleware/auth');

// ============================================================================
// RUTAS PÚBLICAS (Ninguna - todos requieren autenticación)
// ============================================================================

// ============================================================================
// RUTAS PROTEGIDAS - Requieren autenticación
// ============================================================================

// Aplicar autenticación a todas las rutas
router.use(authenticate);

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
  authorize(['admin', 'colaborador']),
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
  authorize(['admin', 'colaborador']),
  expenseController.getAllExpenses
);

/**
 * @route   GET /api/expenses/:id
 * @desc    Obtener gasto por ID
 * @access  Private (Admin, Colaborador)
 */
router.get(
  '/:id',
  authorize(['admin', 'colaborador']),
  expenseController.getExpenseById
);

/**
 * @route   PUT /api/expenses/:id
 * @desc    Actualizar gasto
 * @access  Private (Admin, Colaborador)
 */
router.put(
  '/:id',
  authorize(['admin', 'colaborador']),
  expenseController.updateExpense
);

/**
 * @route   DELETE /api/expenses/:id
 * @desc    Eliminar gasto
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authorize(['admin']),
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
  authorize(['admin', 'colaborador']),
  expenseController.approveExpense
);

/**
 * @route   POST /api/expenses/:id/reject
 * @desc    Rechazar gasto pendiente
 * @access  Private (Admin, Colaborador)
 */
router.post(
  '/:id/reject',
  authorize(['admin', 'colaborador']),
  expenseController.rejectExpense
);

/**
 * @route   POST /api/expenses/:id/cancel
 * @desc    Cancelar gasto
 * @access  Private (Admin, Colaborador)
 */
router.post(
  '/:id/cancel',
  authorize(['admin', 'colaborador']),
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
  authorize(['admin', 'colaborador']),
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
  authorize(['admin', 'colaborador']),
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
  authorize(['admin', 'colaborador']),
  expenseController.getRecurringExpenses
);

/**
 * @route   POST /api/expenses/recurring/process
 * @desc    Procesar gastos recurrentes manualmente
 * @access  Private (Admin only)
 */
router.post(
  '/recurring/process',
  authorize(['admin']),
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
  authorize(['admin', 'colaborador']),
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
  authorize(['admin', 'colaborador']),
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
  authorize(['admin', 'colaborador']),
  expenseController.getTopVendors
);

// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;