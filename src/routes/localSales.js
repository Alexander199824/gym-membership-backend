// src/routes/localSales.js - CORREGIDO: Validaciones flexibles
const express = require('express');
const { authenticateToken, requireStaff } = require('../middleware/auth');
const localSalesController = require('../controllers/LocalSalesController');
const { body, param, query, validationResult } = require('express-validator');

const router = express.Router();

// ✅ MIDDLEWARE: Solo personal autorizado
router.use(authenticateToken, requireStaff);

// ✅ Logging específico
router.use((req, res, next) => {
  console.log(`🏪 Local Sales: ${req.method} ${req.originalUrl} - Staff: ${req.user?.email}`);
  next();
});

// ✅ MIDDLEWARE DE VALIDACIÓN
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación en ventas locales',
      errors: errors.array()
    });
  }
  next();
};

// ===================================================================
// 💰 CREAR VENTAS
// ===================================================================

const validateCashSale = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Se requiere al menos un producto'),
  body('items.*.productId')
    .isInt({ min: 1 })
    .withMessage('ID de producto inválido'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Cantidad debe ser mayor a 0'),
  body('items.*.price')
    .isFloat({ min: 0.01 })
    .withMessage('Precio debe ser mayor a 0'),
  body('cashReceived')
    .isFloat({ min: 0.01 })
    .withMessage('Efectivo recibido debe ser mayor a 0'),
  body('discountAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Descuento debe ser mayor o igual a 0'),
  body('customerInfo.name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Nombre del cliente muy largo'),
  // ✅ CORREGIDO: Validación flexible de teléfono
  body('customerInfo.phone')
    .optional()
    .matches(/^[0-9\-\s\+\(\)]{7,20}$/)
    .withMessage('Teléfono inválido (7-20 caracteres, números y símbolos permitidos)'),
  body('customerInfo.email')
    .optional()
    .isEmail()
    .withMessage('Email inválido'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notas muy largas'),
  handleValidationErrors
];

const validateTransferSale = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Se requiere al menos un producto'),
  body('items.*.productId')
    .isInt({ min: 1 })
    .withMessage('ID de producto inválido'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Cantidad debe ser mayor a 0'),
  body('items.*.price')
    .isFloat({ min: 0.01 })
    .withMessage('Precio debe ser mayor a 0'),
  body('transferVoucher')
    .isLength({ min: 10, max: 500 })
    .withMessage('Descripción del voucher debe tener entre 10 y 500 caracteres'),
  body('bankReference')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Referencia bancaria muy larga'),
  body('discountAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Descuento debe ser mayor o igual a 0'),
  body('customerInfo.name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Nombre del cliente muy largo'),
  // ✅ CORREGIDO: Validación flexible de teléfono (acepta 1234-5678, 50212345678, etc.)
  body('customerInfo.phone')
    .optional()
    .matches(/^[0-9\-\s\+\(\)]{7,20}$/)
    .withMessage('Teléfono inválido (7-20 caracteres, números y símbolos permitidos)'),
  body('customerInfo.email')
    .optional()
    .isEmail()
    .withMessage('Email inválido'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notas muy largas'),
  handleValidationErrors
];

// Crear venta en efectivo
router.post('/cash', validateCashSale, localSalesController.createCashSale);

// Crear venta por transferencia
router.post('/transfer', validateTransferSale, localSalesController.createTransferSale);

// ===================================================================
// ✅ CONFIRMAR TRANSFERENCIAS (Solo admin)
// ===================================================================

const validateConfirmTransfer = [
  param('saleId')
    .isUUID()
    .withMessage('ID de venta inválido'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notas muy largas'),
  handleValidationErrors
];

router.post('/:saleId/confirm-transfer', validateConfirmTransfer, localSalesController.confirmTransferPayment);

// ===================================================================
// 📋 LISTAR Y CONSULTAR VENTAS
// ===================================================================

const validateSalesFilters = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de inicio inválida'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de fin inválida'),
  query('status')
    .optional()
    .isIn(['completed', 'transfer_pending', 'cancelled'])
    .withMessage('Estado inválido'),
  query('paymentMethod')
    .optional()
    .isIn(['cash', 'transfer'])
    .withMessage('Método de pago inválido'),
  query('employeeId')
    .optional()
    .isUUID()
    .withMessage('ID de empleado inválido'),
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

// Obtener ventas con filtros
router.get('/', validateSalesFilters, localSalesController.getSales);

// Obtener transferencias pendientes
router.get('/pending-transfers', localSalesController.getPendingTransfers);

// Obtener venta por ID
router.get('/:id', [
  param('id').isUUID().withMessage('ID de venta inválido'),
  handleValidationErrors
], localSalesController.getSaleById);

// ===================================================================
// 🔍 BÚSQUEDA DE PRODUCTOS
// ===================================================================

const validateProductSearch = [
  query('q')
    .isLength({ min: 2, max: 100 })
    .withMessage('Búsqueda debe tener entre 2 y 100 caracteres'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Límite debe estar entre 1 y 50'),
  handleValidationErrors
];

router.get('/products/search', validateProductSearch, localSalesController.searchProducts);

// ===================================================================
// 📊 REPORTES Y ESTADÍSTICAS
// ===================================================================

const validateDateParam = [
  query('date')
    .optional()
    .isISO8601()
    .withMessage('Fecha inválida'),
  handleValidationErrors
];

// Reporte diario
router.get('/reports/daily', validateDateParam, localSalesController.getDailyReport);

// Estadísticas personales (colaborador)
router.get('/my-stats', localSalesController.getMyStats);

// ===================================================================
// 🚨 MANEJO DE ERRORES
// ===================================================================

router.use((error, req, res, next) => {
  console.error('Error en ventas locales:', error);
  
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
      message: 'Producto no encontrado o referencia inválida'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Error interno en ventas locales',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
  });
});

module.exports = router;