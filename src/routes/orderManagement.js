// src/routes/orderManagement.js - RUTAS PARA GESTIÓN DE ÓRDENES
const express = require('express');
const { authenticateToken, requireStaff } = require('../middleware/auth');
const orderManagementController = require('../controllers/OrderManagementController');
const { body, param, query, validationResult } = require('express-validator');

const router = express.Router();

// ✅ MIDDLEWARE: Solo personal autorizado
router.use(authenticateToken, requireStaff);

// ✅ Logging específico
router.use((req, res, next) => {
  console.log(`📦 Order Management: ${req.method} ${req.originalUrl} - Staff: ${req.user?.email}`);
  next();
});

// ✅ MIDDLEWARE DE VALIDACIÓN
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación en gestión de órdenes',
      errors: errors.array()
    });
  }
  next();
};

// ===================================================================
// ✅ CONFIRMAR ÓRDENES
// ===================================================================

const validateConfirmOrder = [
  param('orderId')
    .isInt({ min: 1 })
    .withMessage('ID de orden inválido'),
  body('estimatedDelivery')
    .optional()
    .isISO8601()
    .withMessage('Fecha de entrega estimada inválida'),
  body('estimatedPickup')
    .optional()
    .isISO8601()
    .withMessage('Fecha de recogida estimada inválida'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notas muy largas'),
  handleValidationErrors
];

router.post('/:orderId/confirm', validateConfirmOrder, orderManagementController.confirmOrder);

// ===================================================================
// 💳 CONFIRMAR TRANSFERENCIAS
// ===================================================================

const validateConfirmTransfer = [
  param('orderId')
    .isInt({ min: 1 })
    .withMessage('ID de orden inválido'),
  body('voucherDetails')
    .isLength({ min: 10, max: 500 })
    .withMessage('Detalles del voucher deben tener entre 10 y 500 caracteres'),
  body('bankReference')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Referencia bancaria muy larga'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notas muy largas'),
  handleValidationErrors
];

router.post('/:orderId/confirm-transfer', validateConfirmTransfer, orderManagementController.confirmTransferPayment);

// ===================================================================
// 📋 LISTAR ÓRDENES
// ===================================================================

const validateOrderFilters = [
  query('deliveryType')
    .optional()
    .isIn(['pickup', 'delivery', 'express'])
    .withMessage('Tipo de entrega inválido'),
  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'preparing', 'ready_pickup', 'packed', 'shipped', 'delivered', 'picked_up', 'cancelled', 'refunded'])
    .withMessage('Estado inválido'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página debe ser mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Límite debe estar entre 1 y 100'),
  handleValidationErrors
];

// Obtener transferencias pendientes
router.get('/pending-transfers', orderManagementController.getPendingTransfers);

// Dashboard de órdenes
router.get('/dashboard', orderManagementController.getOrdersDashboard);

// Obtener órdenes por tipo de entrega
router.get('/by-delivery-type', validateOrderFilters, orderManagementController.getOrdersByDeliveryType);

// ===================================================================
// 📦 ACTUALIZAR ESTADO DE ÓRDENES
// ===================================================================

const validateUpdateStatus = [
  param('orderId')
    .isInt({ min: 1 })
    .withMessage('ID de orden inválido'),
  body('status')
    .isIn(['pending', 'confirmed', 'preparing', 'ready_pickup', 'packed', 'shipped', 'delivered', 'picked_up', 'cancelled', 'refunded'])
    .withMessage('Estado inválido'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notas muy largas'),
  body('trackingNumber')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Número de seguimiento muy largo'),
  handleValidationErrors
];

router.patch('/:orderId/status', validateUpdateStatus, orderManagementController.updateOrderStatus);

// ===================================================================
// 📊 ESTADÍSTICAS Y REPORTES
// ===================================================================

const validateStatsFilters = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de inicio inválida'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de fin inválida'),
  handleValidationErrors
];

// Estadísticas de órdenes
router.get('/stats', validateStatsFilters, orderManagementController.getOrderStats);

// ===================================================================
// 🚨 MANEJO DE ERRORES
// ===================================================================

router.use((error, req, res, next) => {
  console.error('Error en gestión de órdenes:', error);
  
  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Error de validación en base de datos',
      errors: error.errors.map(err => ({
        field: err.path,
        message: err.message
      }))
    });
  }
  
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Orden no encontrada o referencia inválida'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Error interno en gestión de órdenes',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
  });
});

module.exports = router;