// src/routes/statisticsRoutes.js - NUEVO: Rutas para estadísticas
const express = require('express');
const statisticsController = require('../controllers/statisticsController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { body, param } = require('express-validator');

const router = express.Router();

// Middleware de validación de errores
const handleValidationErrors = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: errors.array()
    });
  }
  next();
};

// Validadores
const createStatisticValidation = [
  body('statKey')
    .notEmpty().withMessage('statKey es requerido')
    .isLength({ max: 50 }).withMessage('statKey no debe exceder 50 caracteres')
    .matches(/^[a-z_]+$/).withMessage('statKey solo debe contener letras minúsculas y guiones bajos'),
  body('statValue')
    .notEmpty().withMessage('statValue es requerido')
    .isInt({ min: 0 }).withMessage('statValue debe ser un número positivo'),
  body('label')
    .notEmpty().withMessage('label es requerido')
    .isLength({ max: 50 }).withMessage('label no debe exceder 50 caracteres'),
  body('iconName')
    .optional()
    .isLength({ max: 50 }).withMessage('iconName no debe exceder 50 caracteres'),
  body('valueSuffix')
    .optional()
    .isLength({ max: 10 }).withMessage('valueSuffix no debe exceder 10 caracteres'),
  body('colorScheme')
    .optional()
    .isIn(['primary', 'secondary', 'success', 'warning', 'danger', 'info'])
    .withMessage('colorScheme debe ser: primary, secondary, success, warning, danger o info'),
  body('displayOrder')
    .optional()
    .isInt({ min: 0 }).withMessage('displayOrder debe ser un número positivo'),
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('description no debe exceder 500 caracteres'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive debe ser verdadero o falso')
];

const updateStatisticValidation = [
  body('statKey')
    .optional()
    .isLength({ max: 50 }).withMessage('statKey no debe exceder 50 caracteres')
    .matches(/^[a-z_]+$/).withMessage('statKey solo debe contener letras minúsculas y guiones bajos'),
  body('statValue')
    .optional()
    .isInt({ min: 0 }).withMessage('statValue debe ser un número positivo'),
  body('label')
    .optional()
    .isLength({ max: 50 }).withMessage('label no debe exceder 50 caracteres'),
  body('iconName')
    .optional()
    .isLength({ max: 50 }).withMessage('iconName no debe exceder 50 caracteres'),
  body('valueSuffix')
    .optional()
    .isLength({ max: 10 }).withMessage('valueSuffix no debe exceder 10 caracteres'),
  body('colorScheme')
    .optional()
    .isIn(['primary', 'secondary', 'success', 'warning', 'danger', 'info'])
    .withMessage('colorScheme debe ser: primary, secondary, success, warning, danger o info'),
  body('displayOrder')
    .optional()
    .isInt({ min: 0 }).withMessage('displayOrder debe ser un número positivo'),
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('description no debe exceder 500 caracteres'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive debe ser verdadero o falso')
];

const idParamValidation = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID debe ser un número positivo')
];

const reorderValidation = [
  body('order')
    .isArray({ min: 1 }).withMessage('order debe ser un array con al menos un elemento'),
  body('order.*.id')
    .isInt({ min: 1 }).withMessage('Cada elemento debe tener un id válido'),
  body('order.*.displayOrder')
    .isInt({ min: 0 }).withMessage('Cada elemento debe tener un displayOrder válido')
];

// ========== RUTAS PÚBLICAS ==========

// Obtener estadísticas activas (para el frontend)
router.get('/active', statisticsController.getActiveStatistics);

// ========== RUTAS ADMINISTRATIVAS (REQUIEREN AUTENTICACIÓN) ==========

// Obtener todas las estadísticas
router.get(
  '/',
  authenticateToken,
  requireAdmin,
  statisticsController.getAllStatistics
);

// Obtener una estadística específica
router.get(
  '/:id',
  authenticateToken,
  requireAdmin,
  idParamValidation,
  handleValidationErrors,
  statisticsController.getStatisticById
);

// Crear nueva estadística
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  createStatisticValidation,
  handleValidationErrors,
  statisticsController.createStatistic
);

// Actualizar estadística
router.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  idParamValidation,
  updateStatisticValidation,
  handleValidationErrors,
  statisticsController.updateStatistic
);

// Eliminar estadística
router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  idParamValidation,
  handleValidationErrors,
  statisticsController.deleteStatistic
);

// Activar/Desactivar estadística
router.patch(
  '/:id/toggle',
  authenticateToken,
  requireAdmin,
  idParamValidation,
  handleValidationErrors,
  statisticsController.toggleStatistic
);

// Reordenar estadísticas
router.put(
  '/reorder/batch',
  authenticateToken,
  requireAdmin,
  reorderValidation,
  handleValidationErrors,
  statisticsController.reorderStatistics
);

// Crear estadísticas por defecto (seed)
router.post(
  '/seed/defaults',
  authenticateToken,
  requireAdmin,
  statisticsController.seedDefaultStatistics
);

module.exports = router;