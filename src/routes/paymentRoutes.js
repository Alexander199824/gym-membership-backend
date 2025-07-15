// src/routes/paymentRoutes.js
const express = require('express');
const paymentController = require('../controllers/paymentController');
const { 
  createPaymentValidator, 
  validateTransferValidator,
  dailyIncomeValidator 
} = require('../validators/paymentValidators');
const { handleValidationErrors } = require('../middleware/validation');
const { authenticateToken, requireStaff, requireAdmin } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { uploadTransferProof } = require('../config/cloudinary');

const router = express.Router();

// Obtener todos los pagos
router.get('/', 
  authenticateToken,
  requireStaff,
  paymentController.getPayments
);

// Obtener transferencias pendientes
router.get('/transfers/pending', 
  authenticateToken,
  requireStaff,
  paymentController.getPendingTransfers
);

// Obtener reportes de pagos
router.get('/reports', 
  authenticateToken,
  requireAdmin,
  paymentController.getPaymentReports
);

// Crear nuevo pago
router.post('/', 
  authenticateToken,
  requireStaff,
  createPaymentValidator,
  handleValidationErrors,
  paymentController.createPayment
);

// Registrar ingresos diarios totales
router.post('/daily-income', 
  authenticateToken,
  requireStaff,
  dailyIncomeValidator,
  handleValidationErrors,
  paymentController.registerDailyIncome
);

// Obtener pago por ID
router.get('/:id', 
  authenticateToken,
  requireStaff,
  paymentController.getPaymentById
);

// Subir comprobante de transferencia
router.post('/:id/transfer-proof', 
  authenticateToken,
  uploadLimiter,
  uploadTransferProof.single('proof'),
  paymentController.uploadTransferProof
);

// Validar transferencia
router.post('/:id/validate-transfer', 
  authenticateToken,
  requireAdmin,
  validateTransferValidator,
  handleValidationErrors,
  paymentController.validateTransfer
);

module.exports = router;