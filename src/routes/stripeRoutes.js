// src/routes/stripeRoutes.js - COMPLETO: Todas las rutas existentes + nuevas funciones específicas de membresías

const express = require('express');
const stripeController = require('../controllers/stripeController');
const { authenticateToken, requireStaff } = require('../middleware/auth');
const { optionalAuthenticateToken } = require('../middleware/optionalAuth');
const { 
  createPaymentIntentValidator,
  confirmPaymentValidator,
  refundValidator 
} = require('../validators/stripeValidators');
const { handleValidationErrors } = require('../middleware/validation');
const { body, param, query } = require('express-validator');

const router = express.Router();

// =============== RUTAS PÚBLICAS (sin autenticación) ===============

// ✅ Obtener configuración pública de Stripe
router.get('/config', stripeController.getPublicConfig);

// ✅ Verificar estado del servicio
router.get('/status', stripeController.getServiceStatus);

// =============== PAYMENT INTENTS EXISTENTES ===============

// ✅ Crear Payment Intent para membresía (requiere login) - EXISTENTE
router.post('/create-membership-intent', 
  authenticateToken,
  createPaymentIntentValidator.membership,
  handleValidationErrors,
  stripeController.createMembershipPaymentIntent
);

// ✅ Crear Payment Intent para pago diario (opcional login) - EXISTENTE
router.post('/create-daily-intent',
  optionalAuthenticateToken,
  createPaymentIntentValidator.daily,
  handleValidationErrors,
  stripeController.createDailyPaymentIntent
);

// ✅ Crear Payment Intent para productos de tienda (opcional login) - EXISTENTE
router.post('/create-store-intent',
  optionalAuthenticateToken,
  createPaymentIntentValidator.store,
  handleValidationErrors,
  stripeController.createStorePaymentIntent
);

// =============== PAYMENT INTENTS NUEVOS PARA MEMBRESÍAS ===============

// 🎫 NUEVA - Crear Payment Intent para compra de membresía con horarios
router.post('/create-membership-purchase-intent',
  authenticateToken, // Membresías requieren login
  [
    body('planId').isInt({ min: 1 }).withMessage('ID de plan requerido y válido'),
    body('selectedSchedule').optional().isObject().withMessage('Horarios debe ser un objeto'),
    body('userId').optional().isUUID().withMessage('User ID debe ser UUID válido')
  ],
  handleValidationErrors,
  stripeController.createMembershipPurchaseIntent
);

// =============== CONFIRMACIÓN DE PAGOS ===============

// ✅ Confirmar pago exitoso (webhook interno) - EXISTENTE
router.post('/confirm-payment',
  optionalAuthenticateToken,
  confirmPaymentValidator,
  handleValidationErrors,
  stripeController.confirmPayment
);

// 💳 NUEVA - Confirmar pago específico de membresía
router.post('/confirm-membership-payment',
  authenticateToken, // Membresías requieren login
  [
    body('paymentIntentId').notEmpty().withMessage('Payment Intent ID requerido')
  ],
  handleValidationErrors,
  stripeController.confirmMembershipPayment
);

// =============== HISTORIAL DE PAGOS ===============

// 📊 NUEVA - Obtener historial de pagos de membresías del usuario actual
router.get('/my-membership-payments',
  authenticateToken,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite entre 1 y 100'),
    query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser positiva')
  ],
  handleValidationErrors,
  stripeController.getMembershipPaymentHistory
);

// =============== ADMINISTRACIÓN EXISTENTE (Solo staff) ===============

// ✅ Crear reembolso - EXISTENTE
router.post('/refund',
  authenticateToken,
  requireStaff,
  refundValidator,
  handleValidationErrors,
  stripeController.createRefund
);

// ✅ Obtener detalles de un pago de Stripe - EXISTENTE
router.get('/payment-details/:paymentIntentId',
  authenticateToken,
  requireStaff,
  stripeController.getPaymentDetails
);

// ✅ Obtener lista de pagos de Stripe - EXISTENTE
router.get('/payments',
  authenticateToken,
  requireStaff,
  stripeController.getStripePayments
);

// =============== ADMINISTRACIÓN NUEVA PARA MEMBRESÍAS ===============

// 💰 NUEVA - Procesar reembolso de membresía (solo admin)
router.post('/refund-membership',
  authenticateToken,
  requireStaff,
  [
    body('paymentId').isUUID().withMessage('Payment ID requerido y válido'),
    body('reason').optional().isLength({ min: 5, max: 500 }).withMessage('Razón entre 5 y 500 caracteres'),
    body('partialAmount').optional().isFloat({ min: 0.01 }).withMessage('Monto parcial debe ser positivo')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    // Solo administradores pueden hacer reembolsos
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden procesar reembolsos de membresías'
      });
    }
    next();
  },
  stripeController.refundMembershipPayment
);

// 🔍 NUEVA - Obtener detalles de un pago de membresía específico (solo staff)
router.get('/membership-payment/:paymentId',
  authenticateToken,
  requireStaff,
  [
    param('paymentId').isUUID().withMessage('Payment ID debe ser UUID válido')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { paymentId } = req.params;
      const { Payment } = require('../models');
      
      const payment = await Payment.findByPk(paymentId, {
        include: [
          {
            association: 'membership',
            include: [
              { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] }
            ]
          },
          {
            association: 'registeredByUser',
            attributes: ['id', 'firstName', 'lastName', 'role']
          }
        ]
      });
      
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado'
        });
      }
      
      if (payment.paymentType !== 'membership') {
        return res.status(400).json({
          success: false,
          message: 'Este pago no es de una membresía'
        });
      }
      
      // Colaborador solo puede ver pagos que registró
      if (req.user.role === 'colaborador' && payment.registeredBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver este pago'
        });
      }
      
      // Obtener detalles de Stripe si disponible
      let stripeDetails = null;
      if (payment.cardTransactionId) {
        try {
          const stripeResult = await stripeController.stripeService.confirmPayment(payment.cardTransactionId);
          if (stripeResult.success) {
            stripeDetails = {
              id: stripeResult.paymentIntent.id,
              status: stripeResult.paymentIntent.status,
              amount: stripeResult.paymentIntent.amount,
              currency: stripeResult.paymentIntent.currency,
              created: new Date(stripeResult.paymentIntent.created * 1000),
              paymentMethod: stripeResult.paymentIntent.payment_method
            };
          }
        } catch (stripeError) {
          console.warn('⚠️ Error obteniendo detalles de Stripe:', stripeError.message);
        }
      }
      
      res.json({
        success: true,
        data: {
          payment: {
            ...payment.toJSON(),
            stripeDetails
          }
        }
      });
      
    } catch (error) {
      console.error('Error al obtener detalles del pago de membresía:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener detalles del pago',
        error: error.message
      });
    }
  }
);

// =============== RUTAS DE ANÁLISIS PARA STAFF ===============

// 📈 NUEVA - Estadísticas de pagos de membresías con Stripe (solo staff)
router.get('/membership-payment-stats',
  authenticateToken,
  requireStaff,
  [
    query('period').optional().isIn(['week', 'month', 'quarter', 'year']).withMessage('Período inválido'),
    query('startDate').optional().isISO8601().withMessage('Fecha inicio inválida'),
    query('endDate').optional().isISO8601().withMessage('Fecha fin inválida')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { period = 'month', startDate, endDate } = req.query;
      const { Payment, Membership } = require('../models');
      const { Op } = require('sequelize');
      
      // Calcular rango de fechas
      let dateRange = {};
      const now = new Date();
      
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
        case 'quarter':
          const quarterAgo = new Date();
          quarterAgo.setMonth(quarterAgo.getMonth() - 3);
          dateRange = { [Op.gte]: quarterAgo };
          break;
        case 'year':
          const yearAgo = new Date();
          yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          dateRange = { [Op.gte]: yearAgo };
          break;
        case 'custom':
          if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateRange = { [Op.between]: [start, end] };
          }
          break;
      }
      
      const baseWhere = {
        paymentType: 'membership',
        paymentMethod: 'card',
        status: 'completed',
        paymentDate: dateRange,
        cardTransactionId: { [Op.not]: null }
      };
      
      // Colaborador solo ve pagos que registró
      if (req.user.role === 'colaborador') {
        baseWhere.registeredBy = req.user.id;
      }
      
      const [
        totalPayments,
        totalAmount,
        averageAmount,
        paymentsByPlan,
        monthlyTrend,
        refundedPayments
      ] = await Promise.all([
        Payment.count({ where: baseWhere }),
        
        Payment.sum('amount', { where: baseWhere }),
        
        Payment.findOne({
          attributes: [[Payment.sequelize.fn('AVG', Payment.sequelize.col('amount')), 'avg']],
          where: baseWhere,
          raw: true
        }),
        
        Payment.findAll({
          attributes: [
            [Payment.sequelize.literal('membership.type'), 'planType'],
            [Payment.sequelize.fn('COUNT', Payment.sequelize.col('Payment.id')), 'count'],
            [Payment.sequelize.fn('SUM', Payment.sequelize.col('Payment.amount')), 'total']
          ],
          where: baseWhere,
          include: [{
            association: 'membership',
            attributes: []
          }],
          group: [Payment.sequelize.literal('membership.type')],
          raw: true
        }),
        
        Payment.findAll({
          attributes: [
            [Payment.sequelize.fn('DATE_TRUNC', 'month', Payment.sequelize.col('paymentDate')), 'month'],
            [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'count'],
            [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'total']
          ],
          where: baseWhere,
          group: [Payment.sequelize.fn('DATE_TRUNC', 'month', Payment.sequelize.col('paymentDate'))],
          order: [[Payment.sequelize.fn('DATE_TRUNC', 'month', Payment.sequelize.col('paymentDate')), 'ASC']],
          raw: true
        }),
        
        Payment.count({
          where: {
            ...baseWhere,
            status: 'refunded'
          }
        })
      ]);
      
      res.json({
        success: true,
        data: {
          period,
          userRole: req.user.role,
          summary: {
            totalPayments,
            totalAmount: parseFloat(totalAmount) || 0,
            averageAmount: parseFloat(averageAmount?.avg || 0),
            refundedPayments,
            refundRate: totalPayments > 0 ? ((refundedPayments / totalPayments) * 100).toFixed(2) : '0'
          },
          paymentsByPlan: paymentsByPlan.map(item => ({
            planType: item.planType,
            count: parseInt(item.count),
            total: parseFloat(item.total),
            average: parseFloat(item.total) / parseInt(item.count)
          })),
          monthlyTrend: monthlyTrend.map(item => ({
            month: item.month,
            count: parseInt(item.count),
            total: parseFloat(item.total)
          }))
        }
      });
      
    } catch (error) {
      console.error('Error al obtener estadísticas de pagos de membresías:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }
);

// =============== WEBHOOKS DE STRIPE ===============

// ✅ Webhook de Stripe general (sin autenticación, validación por signature) - EXISTENTE
router.post('/webhook',
  express.raw({ type: 'application/json' }), // Importante: raw body para webhooks
  stripeController.handleWebhook
);

// 🔔 NUEVA - Webhook específico para eventos de membresías
router.post('/membership-webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const signature = req.headers['stripe-signature'];
      
      if (!signature) {
        return res.status(400).json({
          success: false,
          message: 'Signature de webhook faltante'
        });
      }
      
      const stripeService = require('../services/stripeService');
      const result = await stripeService.validateWebhook(req.body, signature);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Webhook inválido',
          error: result.error
        });
      }
      
      const event = result.event;
      
      // Solo procesar eventos relacionados con membresías
      if (event.data.object.metadata?.type !== 'membership_purchase') {
        return res.json({ received: true, processed: false, reason: 'Not a membership event' });
      }
      
      console.log(`🎫 Procesando webhook de membresía: ${event.type}`);
      
      switch (event.type) {
        case 'payment_intent.succeeded':
          await handleMembershipPaymentSucceeded(event.data.object);
          break;
          
        case 'payment_intent.payment_failed':
          await handleMembershipPaymentFailed(event.data.object);
          break;
          
        case 'payment_intent.canceled':
          await handleMembershipPaymentCanceled(event.data.object);
          break;
          
        default:
          console.log(`Evento de webhook de membresía no manejado: ${event.type}`);
      }
      
      res.json({ received: true, processed: true });
      
    } catch (error) {
      console.error('Error procesando webhook de membresía:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar webhook de membresía',
        error: error.message
      });
    }
  }
);

// =============== FUNCIONES HELPER PARA WEBHOOKS DE MEMBRESÍAS ===============

async function handleMembershipPaymentSucceeded(paymentIntent) {
  try {
    console.log('✅ Pago de membresía exitoso desde webhook:', paymentIntent.id);
    
    const { Payment } = require('../models');
    
    // Verificar si ya procesamos este pago
    const existingPayment = await Payment.findOne({
      where: { cardTransactionId: paymentIntent.id }
    });
    
    if (existingPayment) {
      console.log('ℹ️ Pago de membresía ya procesado:', paymentIntent.id);
      return;
    }
    
    // El pago se procesará cuando el usuario confirme en el frontend
    console.log('ℹ️ Pago de membresía exitoso, esperando confirmación del frontend');
    
  } catch (error) {
    console.error('Error manejando pago de membresía exitoso:', error);
  }
}

async function handleMembershipPaymentFailed(paymentIntent) {
  try {
    console.log('❌ Pago de membresía fallido:', paymentIntent.id);
    
    const { Payment } = require('../models');
    
    const payment = await Payment.findOne({
      where: { cardTransactionId: paymentIntent.id }
    });
    
    if (payment) {
      payment.status = 'failed';
      payment.notes = payment.notes 
        ? `${payment.notes}\n\nPago fallido en Stripe: ${paymentIntent.last_payment_error?.message || 'Error desconocido'}`
        : `Pago fallido en Stripe: ${paymentIntent.last_payment_error?.message || 'Error desconocido'}`;
      await payment.save();
      
      console.log('✅ Estado de pago de membresía actualizado a fallido');
    }
    
  } catch (error) {
    console.error('Error manejando pago de membresía fallido:', error);
  }
}

async function handleMembershipPaymentCanceled(paymentIntent) {
  try {
    console.log('🚫 Pago de membresía cancelado:', paymentIntent.id);
    
    const { Payment } = require('../models');
    
    const payment = await Payment.findOne({
      where: { cardTransactionId: paymentIntent.id }
    });
    
    if (payment) {
      payment.status = 'cancelled';
      payment.notes = payment.notes 
        ? `${payment.notes}\n\nPago cancelado en Stripe`
        : 'Pago cancelado en Stripe';
      await payment.save();
      
      console.log('✅ Estado de pago de membresía actualizado a cancelado');
    }
    
  } catch (error) {
    console.error('Error manejando pago de membresía cancelado:', error);
  }
}

module.exports = router;