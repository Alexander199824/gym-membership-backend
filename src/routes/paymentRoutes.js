// src/routes/paymentRoutes.js - COMPLETO: Todas las funciones + Rutas corregidas
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
const { query } = require('express-validator');

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

// ✅ ========== RUTAS ESPECÍFICAS (DEBEN IR ANTES DE /:id) ==========

// ✅ NUEVO: Estadísticas de pagos - CRÍTICO: DEBE IR ANTES DE /:id
router.get('/statistics', 
  authenticateToken, 
  requireStaff, 
  paymentController.getPaymentStatistics
);

// ✅ Dashboard de pagos pendientes
router.get('/pending-dashboard',
  authenticateToken,
  requireStaff,
  paymentController.getPendingDashboard
);

// ✅ Transferencias pendientes con detalles mejorados
router.get('/transfers/pending-detailed',
  authenticateToken,
  requireStaff,
  async (req, res) => {
    try {
      const { hoursFilter = 0 } = req.query;
      const { Payment } = require('../models');
      const { Op } = require('sequelize');

      let where = {
        paymentMethod: 'transfer',
        status: 'pending',
        transferProof: { [Op.not]: null }
      };

      // Colaborador solo ve sus transferencias
      if (req.user.role === 'colaborador') {
        where.registeredBy = req.user.id;
      }

      // Filtro por horas
      if (parseInt(hoursFilter) > 0) {
        const hoursAgo = new Date(Date.now() - parseInt(hoursFilter) * 60 * 60 * 1000);
        where.createdAt = { [Op.lte]: hoursAgo };
      }

      const pendingTransfers = await Payment.findAll({
        where,
        include: [
          {
            association: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
            required: false
          },
          {
            association: 'membership',
            attributes: ['id', 'type', 'endDate'],
            required: false
          },
          {
            association: 'registeredByUser',
            attributes: ['id', 'firstName', 'lastName']
          }
        ],
        order: [['createdAt', 'ASC']]
      });

      const formattedTransfers = pendingTransfers.map(payment => {
        const hoursWaiting = (new Date() - payment.createdAt) / (1000 * 60 * 60);
        
        return {
          id: payment.id,
          amount: parseFloat(payment.amount),
          paymentDate: payment.paymentDate,
          createdAt: payment.createdAt,
          description: payment.description,
          transferProof: payment.transferProof,
          
          user: payment.user ? {
            id: payment.user.id,
            name: `${payment.user.firstName} ${payment.user.lastName}`,
            email: payment.user.email,
            phone: payment.user.phone
          } : payment.getClientInfo(),
          
          membership: payment.membership ? {
            id: payment.membership.id,
            type: payment.membership.type,
            endDate: payment.membership.endDate
          } : null,
          
          registeredBy: payment.registeredByUser ? {
            name: `${payment.registeredByUser.firstName} ${payment.registeredByUser.lastName}`
          } : { name: 'Sistema' },
          
          hoursWaiting: Math.round(hoursWaiting * 10) / 10,
          priority: hoursWaiting > 48 ? 'critical' : 
                   hoursWaiting > 24 ? 'high' : 
                   hoursWaiting > 12 ? 'medium' : 'normal',
          canValidate: true
        };
      });

      // Agrupar por prioridad
      const groupedByPriority = {
        critical: formattedTransfers.filter(t => t.priority === 'critical'),
        high: formattedTransfers.filter(t => t.priority === 'high'),
        medium: formattedTransfers.filter(t => t.priority === 'medium'),
        normal: formattedTransfers.filter(t => t.priority === 'normal')
      };

      res.json({
        success: true,
        data: {
          transfers: formattedTransfers,
          total: formattedTransfers.length,
          groupedByPriority,
          summary: {
            totalAmount: formattedTransfers.reduce((sum, t) => sum + t.amount, 0),
            averageWaitingHours: formattedTransfers.length > 0 ? 
              formattedTransfers.reduce((sum, t) => sum + t.hoursWaiting, 0) / formattedTransfers.length : 0,
            criticalCount: groupedByPriority.critical.length,
            oldestHours: formattedTransfers.length > 0 ? 
              Math.max(...formattedTransfers.map(t => t.hoursWaiting)) : 0
          }
        }
      });

    } catch (error) {
      console.error('Error al obtener transferencias pendientes detalladas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener transferencias pendientes',
        error: error.message
      });
    }
  }
);

// ✅ Transferencias pendientes básicas
router.get('/transfers/pending', 
  authenticateToken,
  requireStaff,
  paymentController.getPendingTransfers
);

// ✅ Reporte diario personal del colaborador
router.get('/my-daily-report', 
  authenticateToken,
  paymentController.getMyDailyReport
);

// ✅ Estadísticas diarias personales del colaborador
router.get('/my-daily-stats',
  authenticateToken, 
  paymentController.getMyDailyStats
);

// ✅ Pago anónimo solo para tipo 'daily' (solo staff)
router.post('/daily-anonymous',
  authenticateToken,
  requireStaff,
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

// ✅ ========== ESTADÍSTICAS DE INVITADOS ==========

// ✅ Estadísticas de pagos de invitados
router.get('/guest-stats', 
  authenticateToken, 
  requireStaff, 
  async (req, res) => {
    try {
      const { period = 'month', startDate, endDate } = req.query;
      const { Payment, StoreOrder, StoreOrderItem } = require('../models');
      const { Op } = require('sequelize');

      let dateRange = {};
      const now = new Date();

      // Establecer rango de fechas
      switch (period) {
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateRange = { [Op.gte]: weekAgo };
          break;
        case 'month':
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          dateRange = { [Op.gte]: monthAgo };
          break;
        case 'custom':
          if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateRange = { [Op.between]: [start, end] };
          }
          break;
        default:
          dateRange = { [Op.gte]: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
      }

      const baseWhere = {
        status: 'completed',
        paymentDate: dateRange
      };

      // Estadísticas de pagos de invitados
      const guestPayments = await Payment.findAll({
        where: {
          ...baseWhere,
          userId: null,
          anonymousClientInfo: { [Op.not]: null }
        },
        attributes: [
          [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'total'],
          [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'totalAmount'],
          [Payment.sequelize.fn('AVG', Payment.sequelize.col('amount')), 'averageAmount']
        ]
      });

      // Estadísticas de pagos de usuarios registrados
      const registeredPayments = await Payment.findAll({
        where: {
          ...baseWhere,
          userId: { [Op.not]: null }
        },
        attributes: [
          [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'total'],
          [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'totalAmount'],
          [Payment.sequelize.fn('AVG', Payment.sequelize.col('amount')), 'averageAmount']
        ]
      });

      // Productos más comprados por invitados
      let topGuestProducts = [];
      try {
        topGuestProducts = await StoreOrderItem.findAll({
          attributes: [
            'productName',
            [Payment.sequelize.fn('SUM', Payment.sequelize.col('quantity')), 'totalQuantity'],
            [Payment.sequelize.fn('SUM', Payment.sequelize.col('totalPrice')), 'totalRevenue']
          ],
          include: [{
            model: StoreOrder,
            as: 'order',
            where: {
              userId: null,
              status: { [Op.in]: ['confirmed', 'delivered'] },
              createdAt: dateRange
            },
            attributes: []
          }],
          group: ['productName'],
          order: [[Payment.sequelize.fn('SUM', Payment.sequelize.col('quantity')), 'DESC']],
          limit: 10
        });
      } catch (error) {
        console.warn('⚠️ No se pudieron obtener productos de invitados:', error.message);
        topGuestProducts = [];
      }

      // Convertir datos de respuesta
      const guestData = guestPayments[0]?.dataValues || { total: 0, totalAmount: 0, averageAmount: 0 };
      const registeredData = registeredPayments[0]?.dataValues || { total: 0, totalAmount: 0, averageAmount: 0 };

      const guestTotal = parseInt(guestData.total) || 0;
      const guestAmount = parseFloat(guestData.totalAmount) || 0;
      const guestAverage = parseFloat(guestData.averageAmount) || 0;

      const registeredTotal = parseInt(registeredData.total) || 0;
      const registeredAmount = parseFloat(registeredData.totalAmount) || 0;
      const registeredAverage = parseFloat(registeredData.averageAmount) || 0;

      const totalPayments = guestTotal + registeredTotal;
      const guestPercentage = totalPayments > 0 ? (guestTotal / totalPayments * 100).toFixed(1) : '0';

      res.json({
        success: true,
        data: {
          period,
          guestPayments: {
            total: guestTotal,
            totalAmount: guestAmount,
            averageOrderValue: guestAverage,
            percentage: parseFloat(guestPercentage)
          },
          registeredPayments: {
            total: registeredTotal,
            totalAmount: registeredAmount,
            averageOrderValue: registeredAverage,
            percentage: parseFloat((100 - guestPercentage).toFixed(1))
          },
          comparison: {
            totalPayments,
            guestVsRegisteredRatio: registeredTotal > 0 ? (guestTotal / registeredTotal).toFixed(2) : 'N/A',
            averageOrderComparison: registeredAverage > 0 ? ((guestAverage / registeredAverage) * 100).toFixed(1) + '%' : 'N/A'
          },
          topGuestProducts: topGuestProducts.map(item => ({
            productName: item.productName,
            totalQuantity: parseInt(item.dataValues.totalQuantity),
            totalRevenue: parseFloat(item.dataValues.totalRevenue)
          })),
          insights: {
            guestConversionOpportunity: guestTotal > 0,
            averageOrderHigher: guestAverage > registeredAverage,
            significantGuestVolume: guestTotal > (totalPayments * 0.2)
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener estadísticas de invitados:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas de invitados',
        error: error.message
      });
    }
  }
);

// ✅ Pagos de invitados detallados
router.get('/guest-payments', 
  authenticateToken, 
  requireStaff, 
  async (req, res) => {
    try {
      const { page = 1, limit = 20, startDate, endDate } = req.query;
      const { Payment } = require('../models');
      const { Op } = require('sequelize');
      const offset = (page - 1) * limit;

      let dateFilter = {};
      if (startDate || endDate) {
        dateFilter.paymentDate = {};
        if (startDate) dateFilter.paymentDate[Op.gte] = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          dateFilter.paymentDate[Op.lte] = end;
        }
      }

      const { count, rows } = await Payment.findAndCountAll({
        where: {
          userId: null,
          anonymousClientInfo: { [Op.not]: null },
          ...dateFilter
        },
        include: [
          { 
            association: 'registeredByUser', 
            attributes: ['id', 'firstName', 'lastName', 'role']
          }
        ],
        order: [['paymentDate', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      const paymentsWithClientInfo = rows.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        paymentType: payment.paymentType,
        status: payment.status,
        paymentDate: payment.paymentDate,
        description: payment.description,
        clientInfo: payment.getClientInfo(),
        registeredBy: payment.registeredByUser ? {
          id: payment.registeredByUser.id,
          name: `${payment.registeredByUser.firstName} ${payment.registeredByUser.lastName}`,
          role: payment.registeredByUser.role
        } : null,
        isGuestPayment: true
      }));

      res.json({
        success: true,
        data: {
          payments: paymentsWithClientInfo,
          pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener pagos de invitados:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener pagos de invitados',
        error: error.message
      });
    }
  }
);

// ✅ Convertir pago de invitado en usuario registrado
router.post('/convert-guest-to-user', 
  authenticateToken, 
  requireStaff, 
  async (req, res) => {
    try {
      const { paymentId, userEmail } = req.body;
      const { Payment, User } = require('../models');

      if (!paymentId || !userEmail) {
        return res.status(400).json({
          success: false,
          message: 'Payment ID y email son requeridos'
        });
      }

      const payment = await Payment.findByPk(paymentId);
      
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado'
        });
      }

      if (payment.userId) {
        return res.status(400).json({
          success: false,
          message: 'Este pago ya está asociado a un usuario'
        });
      }

      const user = await User.findOne({ where: { email: userEmail } });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado con ese email'
        });
      }

      payment.userId = user.id;
      payment.notes = payment.notes 
        ? `${payment.notes}\n\nConvertido de pago de invitado a usuario ${user.email} por ${req.user.getFullName()}`
        : `Convertido de pago de invitado a usuario ${user.email} por ${req.user.getFullName()}`;
      
      await payment.save();

      res.json({
        success: true,
        message: 'Pago convertido exitosamente',
        data: {
          payment: {
            id: payment.id,
            previousStatus: 'guest',
            newStatus: 'registered',
            userId: user.id,
            userEmail: user.email
          }
        }
      });
    } catch (error) {
      console.error('Error al convertir pago de invitado:', error);
      res.status(500).json({
        success: false,
        message: 'Error al convertir pago',
        error: error.message
      });
    }
  }
);

// ✅ ========== REPORTES (Solo STAFF) ==========

// ✅ Reportes mejorados
router.get('/reports/enhanced', 
  authenticateToken, 
  requireStaff,
  paymentController.getEnhancedPaymentReports
);

// ✅ Reportes básicos
router.get('/reports', 
  authenticateToken,
  requireStaff,
  paymentController.getPaymentReports
);

// ✅ ========== RUTAS PRINCIPALES ==========

// ✅ Lista de pagos (con paginación y filtros)
router.get('/', 
  authenticateToken,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser un número entero positivo'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe estar entre 1 y 100'),
    query('startDate').optional().isISO8601().withMessage('Fecha de inicio debe ser válida'),
    query('endDate').optional().isISO8601().withMessage('Fecha de fin debe ser válida'),
    query('paymentType').optional().isIn(['membership', 'daily', 'bulk_daily', 'product', 'service', 'other']).withMessage('Tipo de pago inválido'),
    query('paymentMethod').optional().isIn(['cash', 'card', 'transfer', 'mobile']).withMessage('Método de pago inválido'),
    query('status').optional().isIn(['pending', 'completed', 'failed', 'cancelled']).withMessage('Estado inválido')
  ],
  handleValidationErrors,
  paymentController.getPayments
);

// ✅ Crear pago
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

// ✅ Activar membresía pagada en efectivo
router.post('/activate-cash-membership',
  authenticateToken,
  requireStaff,
  paymentController.activateCashMembership
);

// ✅ ========== RUTAS CON PARÁMETROS (DEBEN IR AL FINAL) ==========

// ✅ Obtener pago por ID - DEBE IR AL FINAL después de todas las rutas específicas
router.get('/:id', 
  authenticateToken,
  paymentController.getPaymentById
);

// ✅ Subir comprobante de transferencia
router.post('/:id/transfer-proof', 
  authenticateToken,
  uploadLimiter,
  uploadTransferProof.single('proof'),
  paymentController.uploadTransferProof
);

// ✅ Validar transferencia (solo admin)
router.post('/:id/validate-transfer', 
  authenticateToken,
  requireAdmin,
  validateTransferValidator,
  handleValidationErrors,
  paymentController.validateTransfer
);

// ✅ Rechazar transferencia (solo admin)
router.post('/:id/reject-transfer',
  authenticateToken,
  requireAdmin,
  paymentController.rejectTransfer
);

module.exports = router;

// ✅ RUTAS INCLUIDAS COMPLETAS:
// 
// 📊 ESTADÍSTICAS Y DASHBOARD:
// - GET /statistics (NUEVO - CRÍTICO)
// - GET /pending-dashboard  
// - GET /transfers/pending-detailed
// - GET /transfers/pending
// - GET /my-daily-report
// - GET /my-daily-stats
// 
// 👥 INVITADOS:
// - GET /guest-stats
// - GET /guest-payments
// - POST /convert-guest-to-user
// - POST /daily-anonymous
// 
// 📈 REPORTES:
// - GET /reports/enhanced
// - GET /reports
// 
// 💰 PAGOS PRINCIPALES:
// - GET / (lista con filtros)
// - POST / (crear)
// - POST /daily-income
// - POST /from-order
// - POST /activate-cash-membership
// 
// 🔍 PAGOS ESPECÍFICOS:
// - GET /:id
// - POST /:id/transfer-proof
// - POST /:id/validate-transfer
// - POST /:id/reject-transfer
// 
// ✅ ORDEN CORRECTO:
// 1. Rutas específicas PRIMERO
// 2. Rutas con parámetros AL FINAL
// 3. /statistics ANTES de /:id (CRÍTICO)
// 
// ✅ FUNCIONALIDADES MANTENIDAS:
// - Todas las validaciones existentes
// - Todos los middlewares de autenticación
// - Todas las funcionalidades de colaboradores
// - Todas las estadísticas de invitados
// - Todos los reportes existentes
// - Toda la funcionalidad de transferencias
// - Cloudinary upload configurado
// - Rate limiting mantenido