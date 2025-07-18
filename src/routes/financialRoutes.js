// src/routes/financialRoutes.js 
const express = require('express');
const financialController = require('../controllers/financialController');
const { 
  createFinancialMovementValidator,
  financialReportValidator,
  incomeVsExpensesValidator
} = require('../validators/financialValidators');
const { handleValidationErrors } = require('../middleware/validation');
const { authenticateToken, requireStaff, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ✅ Gestión de movimientos financieros
router.post('/movements', 
  authenticateToken, 
  requireStaff, 
  createFinancialMovementValidator,
  handleValidationErrors,
  financialController.createMovement
);

router.get('/movements', 
  authenticateToken, 
  requireStaff, 
  financialController.getMovements
);

// ✅ Reportes financieros
router.get('/reports', 
  authenticateToken, 
  requireAdmin, 
  financialReportValidator,
  handleValidationErrors,
  financialController.getFinancialReport
);

router.get('/reports/income-vs-expenses', 
  authenticateToken, 
  requireAdmin, 
  incomeVsExpensesValidator,
  handleValidationErrors,
  financialController.getIncomeVsExpensesReport
);

router.get('/dashboard', 
  authenticateToken, 
  requireStaff, 
  financialController.getDashboard
);

module.exports = router;