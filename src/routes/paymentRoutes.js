// src/routes/paymentRoutes.js - CORREGIDO: Clientes protegidos, colaboradores habilitados
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

// ✅ ========== NUEVAS RUTAS ESPECÍFICAS PARA COLABORADORES ==========

// 📊 NUEVO: Reporte diario personal del colaborador (solo colaboradores)
router.get('/my-daily-report', 
  authenticateToken,
  paymentController.getMyDailyReport
);

// 📈 NUEVO: Estadísticas diarias personales del colaborador (solo colaboradores)
router.get('/my-daily-stats',
  authenticateToken, 
  paymentController.getMyDailyStats
);

// 💰 NUEVO: Pagos anónimos solo para tipo 'daily' (solo staff)
router.post('/daily-anonymous',
  authenticateToken,
  requireStaff, // ✅ Solo admin y colaborador - CLIENTES NO PUEDEN
  async (req, res) => {
    try {
      const {
        amount,
        paymentMethod = 'cash',
        description = 'Pago diario anónimo',
        notes,
        dailyPaymentCount = 1,
        paymentDate,
        anonymousClientInfo
      } = req.body;

      if (!anonymousClientInfo || !anonymousClientInfo.name) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere información del cliente anónimo (al menos nombre)'
        });
      }

      const paymentData = {
        userId: null,
        membershipId: null,
        amount,
        paymentMethod,
        paymentType: 'daily',
        description,
        notes,
        anonymousClientInfo,
        registeredBy: req.user.id,
        dailyPaymentCount: parseInt(dailyPaymentCount),
        paymentDate: paymentDate || new Date(),
        status: 'completed'
      };

      const { Payment, FinancialMovements } = require('../models');
      const payment = await Payment.create(paymentData);

      try {
        await FinancialMovements.createFromAnyPayment(payment);
      } catch (financialError) {
        console.warn('⚠️ Error al crear movimiento financiero (no crítico):', financialError.message);
      }

      console.log(`✅ ${req.user.role} creó pago anónimo: $${amount} para ${anonymousClientInfo.name}`);

      res.status(201).json({
        success: true,
        message: 'Pago anónimo registrado exitosamente',
        data: { 
          payment: {
            ...payment.toJSON(),
            clientInfo: anonymousClientInfo
          }
        }
      });
    } catch (error) {
      console.error('Error al crear pago anónimo:', error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar pago anónimo',
        error: error.message
      });
    }
  }
);

// ✅ ========== RUTAS DE REPORTES (Solo STAFF) ==========

// ✅ CORREGIDO: Solo STAFF puede ver reportes - CLIENTES NO PUEDEN
router.get('/reports/enhanced', 
  authenticateToken, 
  requireStaff, // ✅ Solo admin y colaborador - CLIENTES EXCLUIDOS
  paymentController.getEnhancedPaymentReports
);

// ✅ CORREGIDO: Solo STAFF puede ver reportes - CLIENTES NO PUEDEN
router.get('/reports', 
  authenticateToken,
  requireStaff, // ✅ Solo admin y colaborador - CLIENTES EXCLUIDOS
  paymentController.getPaymentReports
);

// ✅ ========== RUTAS PRINCIPALES ==========

// ✅ CORREGIDO: Cliente puede ver SUS pagos, staff ve según permisos
router.get('/', 
  authenticateToken,
  // ✅ Permitir a clientes acceso - el controlador filtra por userId para clientes
  paymentController.getPayments
);

// ✅ CORREGIDO: Solo STAFF puede ver transferencias pendientes - CLIENTES NO PUEDEN
router.get('/transfers/pending', 
  authenticateToken,
  requireStaff, // ✅ Solo admin y colaborador - CLIENTES EXCLUIDOS
  paymentController.getPendingTransfers
);

// ✅ Solo STAFF puede crear pagos (sin cambios)
router.post('/', 
  authenticateToken,
  requireStaff, // ✅ Solo admin y colaborador - CLIENTES NO PUEDEN CREAR PAGOS
  createPaymentValidator,
  handleValidationErrors,
  paymentController.createPayment
);

// ✅ Solo STAFF puede registrar ingresos diarios (sin cambios)
router.post('/daily-income', 
  authenticateToken,
  requireStaff, // ✅ Solo admin y colaborador - CLIENTES NO PUEDEN
  dailyIncomeValidator,
  handleValidationErrors,
  paymentController.registerDailyIncome
);

// ✅ Solo STAFF puede crear pagos desde órdenes (sin cambios)
router.post('/from-order', 
  authenticateToken, 
  requireStaff, // ✅ Solo admin y colaborador - CLIENTES NO PUEDEN
  paymentController.createPaymentFromOrder
);

// ✅ ========== RUTAS CON PARÁMETROS ==========

// ✅ CORREGIDO: Cliente puede ver SUS pagos por ID, staff ve según permisos
router.get('/:id', 
  authenticateToken,
  // ✅ Permitir a clientes acceso - validación específica en controlador
  paymentController.getPaymentById
);

// ✅ CORREGIDO: Cliente puede subir comprobantes de SUS pagos, staff también
router.post('/:id/transfer-proof', 
  authenticateToken,
  // ✅ Permitir a clientes acceso - validación específica en controlador
  uploadLimiter,
  uploadTransferProof.single('proof'),
  paymentController.uploadTransferProof
);

// ✅ Solo ADMIN puede validar transferencias (sin cambios)
router.post('/:id/validate-transfer', 
  authenticateToken,
  requireAdmin, // ✅ SOLO ADMIN
  validateTransferValidator,
  handleValidationErrors,
  paymentController.validateTransfer
);

module.exports = router;