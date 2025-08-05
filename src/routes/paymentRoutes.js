// src/routes/paymentRoutes.js - CAMBIOS MÍNIMOS SEGUROS
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

// ✅ NUEVO: Importar middleware de autorización
const { 
  authorizeClientOwnData, 
  authorizeResourceOwner
} = require('../middleware/authorization');

const router = express.Router();

// Verificar si Cloudinary está configurado (sin cambios)
const hasCloudinary = 
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name';

let uploadTransferProof;
if (hasCloudinary) {
  try {
    const { uploadTransferProof: cloudinaryUpload } = require('../config/cloudinary');
    uploadTransferProof = cloudinaryUpload;
  } catch (error) {
    console.warn('⚠️ Error al importar configuración de Cloudinary para pagos');
    uploadTransferProof = null;
  }
}

if (!uploadTransferProof) {
  uploadTransferProof = {
    single: () => (req, res, next) => {
      return res.status(503).json({
        success: false,
        message: 'Servicio de archivos no configurado. Los comprobantes no se pueden subir en este momento.'
      });
    }
  };
}

// ✅ Rutas de reportes ANTES de rutas con parámetros (sin cambios)
router.get('/reports/enhanced', 
  authenticateToken, 
  requireAdmin,
  paymentController.getEnhancedPaymentReports
);

router.get('/reports', 
  authenticateToken,
  requireAdmin,
  paymentController.getPaymentReports
);

// ✅ CAMBIO 1: Permitir a clientes ver sus propios pagos
router.get('/', 
  authenticateToken,
  authorizeClientOwnData, // ✅ NUEVO MIDDLEWARE - Esta es la corrección principal
  paymentController.getPayments
);

// Obtener transferencias pendientes (solo staff - sin cambios)
router.get('/transfers/pending', 
  authenticateToken,
  requireStaff,
  paymentController.getPendingTransfers
);

// Crear nuevo pago (solo staff - sin cambios)
router.post('/', 
  authenticateToken,
  requireStaff,
  createPaymentValidator,
  handleValidationErrors,
  paymentController.createPayment
);

// Registrar ingresos diarios totales (solo staff - sin cambios)
router.post('/daily-income', 
  authenticateToken,
  requireStaff,
  dailyIncomeValidator,
  handleValidationErrors,
  paymentController.registerDailyIncome
);

// Crear pago desde orden de tienda (solo staff - sin cambios)
router.post('/from-order', 
  authenticateToken, 
  requireStaff,
  paymentController.createPaymentFromOrder
);

// ✅ RUTAS CON PARÁMETROS AL FINAL

// ✅ CAMBIO 2: Permitir a clientes ver sus propios pagos por ID
router.get('/:id', 
  authenticateToken,
  authorizeResourceOwner('Payment', 'id', 'userId'), // ✅ NUEVO MIDDLEWARE
  paymentController.getPaymentById
);

// ✅ CAMBIO 3: Permitir a clientes subir comprobantes de sus propios pagos
router.post('/:id/transfer-proof', 
  authenticateToken,
  authorizeResourceOwner('Payment', 'id', 'userId'), // ✅ NUEVO MIDDLEWARE
  uploadLimiter,
  uploadTransferProof.single('proof'),
  paymentController.uploadTransferProof
);

// Validar transferencia (solo admin - sin cambios)
router.post('/:id/validate-transfer', 
  authenticateToken,
  requireAdmin,
  validateTransferValidator,
  handleValidationErrors,
  paymentController.validateTransfer
);

module.exports = router;