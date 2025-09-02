// src/routes/paymentRoutes.js - CORREGIDO: Clientes protegidos, colaboradores habilitados + RUTAS PARA INVITADOS
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

// ✅ ========== NUEVAS RUTAS PARA ESTADÍSTICAS DE INVITADOS ==========

// ✅ NUEVO: Estadísticas de pagos de invitados
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

      // Productos más comprados por invitados (si hay modelos de tienda disponibles)
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

      // Calcular métricas adicionales
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

// ✅ NUEVO: Pagos de invitados detallados
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

// ✅ NUEVO: Convertir pago de invitado en usuario registrado
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

      // Buscar el pago de invitado
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

      // Buscar usuario por email
      const user = await User.findOne({ where: { email: userEmail } });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado con ese email'
        });
      }

      // Actualizar el pago
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

// Activar membresía pagada en efectivo
router.post('/activate-cash-membership',
  authenticateToken,
  requireStaff,
  paymentController.activateCashMembership
);

// Rechazar transferencia
router.post('/:id/reject-transfer',
  authenticateToken,
  requireAdmin,
  paymentController.rejectTransfer
);


module.exports = router;