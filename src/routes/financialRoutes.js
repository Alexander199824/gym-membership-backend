// src/routes/financialRoutes.js - ACTUALIZADO con rutas para movimientos automáticos
const express = require('express');
const financialController = require('../controllers/financialController');
const { 
  createFinancialMovementValidator,
  financialReportValidator,
  incomeVsExpensesValidator
} = require('../validators/financialValidators');
const { handleValidationErrors } = require('../middleware/validation');
const { authenticateToken, requireStaff, requireAdmin } = require('../middleware/auth');
const { FinancialMovements } = require('../models');
const { query } = require('express-validator');
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

// ✅ NUEVO: Obtener movimientos automáticos sin asignar
router.get('/movements/unassigned', 
  authenticateToken, 
  requireStaff, 
  async (req, res) => {
    try {
      const { limit = 20 } = req.query;

      const movements = await FinancialMovements.findUnassignedAutomatic(parseInt(limit));

      res.json({
        success: true,
        data: {
          movements,
          total: movements.length,
          message: movements.length > 0 
            ? 'Movimientos automáticos pendientes de asignar a un usuario'
            : 'No hay movimientos automáticos sin asignar'
        }
      });
    } catch (error) {
      console.error('Error al obtener movimientos sin asignar:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener movimientos sin asignar',
        error: error.message
      });
    }
  }
);

// ✅ NUEVO: Adoptar movimiento automático
router.post('/movements/:movementId/adopt', 
  authenticateToken, 
  requireStaff, 
  async (req, res) => {
    try {
      const { movementId } = req.params;
      const userId = req.user.id;

      const movement = await FinancialMovements.adoptAutomaticMovement(movementId, userId);

      res.json({
        success: true,
        message: 'Movimiento adoptado exitosamente',
        data: {
          movement: {
            id: movement.id,
            description: movement.description,
            amount: movement.amount,
            registeredBy: movement.registeredBy,
            adoptedAt: new Date(),
            adoptedBy: req.user.getFullName()
          }
        }
      });
    } catch (error) {
      console.error('Error al adoptar movimiento:', error);
      const statusCode = error.message.includes('no encontrado') ? 404 : 
                         error.message.includes('ya tiene un usuario') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error al adoptar movimiento',
        error: error.message
      });
    }
  }
);

// ✅ NUEVO: Estadísticas de movimientos automáticos
router.get('/movements/automatic-stats', 
  authenticateToken, 
  requireAdmin, 
  async (req, res) => {
    try {
      const { period = 'month' } = req.query;
      
      let startDate, endDate;
      const now = new Date();
      
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          endDate = now;
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          endDate = now;
      }

      const { Op } = require('sequelize');

      const [totalAutomatic, unassigned, totalAmount] = await Promise.all([
        FinancialMovements.count({
          where: {
            isAutomatic: true,
            movementDate: { [Op.between]: [startDate, endDate] }
          }
        }),
        FinancialMovements.count({
          where: {
            isAutomatic: true,
            registeredBy: null,
            movementDate: { [Op.between]: [startDate, endDate] }
          }
        }),
        FinancialMovements.sum('amount', {
          where: {
            isAutomatic: true,
            movementDate: { [Op.between]: [startDate, endDate] }
          }
        })
      ]);

      res.json({
        success: true,
        data: {
          period,
          totalAutomatic,
          unassigned,
          assigned: totalAutomatic - unassigned,
          totalAmount: parseFloat(totalAmount) || 0,
          assignmentRate: totalAutomatic > 0 ? ((totalAutomatic - unassigned) / totalAutomatic * 100).toFixed(1) : '0'
        }
      });
    } catch (error) {
      console.error('Error al obtener estadísticas automáticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }
);

// ✅ NUEVO: Obtener movimientos financieros combinados con pagos
router.get('/movements-with-payments',
  authenticateToken,
  requireStaff,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser un número entero positivo'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe estar entre 1 y 100'),
    query('startDate').optional().isISO8601().withMessage('Fecha de inicio debe ser válida'),
    query('endDate').optional().isISO8601().withMessage('Fecha de fin debe ser válida'),
    query('type').optional().isIn(['income', 'expense']).withMessage('Tipo debe ser income o expense'),
    query('paymentMethod').optional().isIn(['cash', 'card', 'transfer', 'online']).withMessage('Método de pago inválido'),
    query('status').optional().isIn(['pending', 'completed', 'failed', 'cancelled']).withMessage('Estado inválido')
  ],
  handleValidationErrors,
  financialController.getMovementsWithPayments
);

// ✅ Reportes financieros (existentes)
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