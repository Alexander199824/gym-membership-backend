// src/routes/paymentRoutes.js - CORREGIDO: Orden de rutas y configuración
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

const router = express.Router();

// Verificar si Cloudinary está configurado
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

// ✅ CORREGIDO: Rutas de reportes ANTES de rutas con parámetros
// Reportes mejorados (nueva ruta principal)
router.get('/reports/enhanced', 
  authenticateToken, 
  requireAdmin,
  paymentController.getEnhancedPaymentReports
);

// Reportes básicos (compatibilidad)
router.get('/reports', 
  authenticateToken,
  requireAdmin,
  paymentController.getPaymentReports
);

// ✅ Obtener todos los pagos
router.get('/', 
  authenticateToken,
  requireStaff,
  paymentController.getPayments
);

// ✅ Obtener transferencias pendientes
router.get('/transfers/pending', 
  authenticateToken,
  requireStaff,
  paymentController.getPendingTransfers
);

// ✅ Crear nuevo pago
router.post('/', 
  authenticateToken,
  requireStaff,
  createPaymentValidator,
  handleValidationErrors,
  paymentController.createPayment
);

// ✅ Registrar ingresos diarios totales
router.post('/daily-income', 
  authenticateToken,
  requireStaff,
  dailyIncomeValidator,
  handleValidationErrors,
  paymentController.registerDailyIncome
);

// ✅ Crear pago desde orden de tienda
router.post('/from-order', 
  authenticateToken, 
  requireStaff,
  paymentController.createPaymentFromOrder
);

// ✅ RUTAS CON PARÁMETROS AL FINAL
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