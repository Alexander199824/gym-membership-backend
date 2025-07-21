// src/routes/stripeRoutes.js - Rutas específicas para pagos con Stripe
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

const router = express.Router();

// ✅ === RUTAS PÚBLICAS ===

// Obtener configuración pública de Stripe
router.get('/config', stripeController.getPublicConfig);

// ✅ === PAYMENT INTENTS (Crear intenciones de pago) ===

// Crear Payment Intent para membresía (requiere login)
router.post('/create-membership-intent', 
  authenticateToken,
  createPaymentIntentValidator.membership,
  handleValidationErrors,
  stripeController.createMembershipPaymentIntent
);

// Crear Payment Intent para pago diario (opcional login)
router.post('/create-daily-intent',
  optionalAuthenticateToken,
  createPaymentIntentValidator.daily,
  handleValidationErrors,
  stripeController.createDailyPaymentIntent
);

// Crear Payment Intent para productos de tienda (opcional login)
router.post('/create-store-intent',
  optionalAuthenticateToken,
  createPaymentIntentValidator.store,
  handleValidationErrors,
  stripeController.createStorePaymentIntent
);

// ✅ === CONFIRMACIÓN DE PAGOS ===

// Confirmar pago exitoso (webhook interno)
router.post('/confirm-payment',
  optionalAuthenticateToken,
  confirmPaymentValidator,
  handleValidationErrors,
  stripeController.confirmPayment
);

// ✅ === WEBHOOKS DE STRIPE ===

// Webhook de Stripe (sin autenticación, validación por signature)
router.post('/webhook',
  express.raw({ type: 'application/json' }), // Importante: raw body para webhooks
  stripeController.handleWebhook
);

// ✅ === ADMINISTRACIÓN (Solo staff) ===

// Crear reembolso
router.post('/refund',
  authenticateToken,
  requireStaff,
  refundValidator,
  handleValidationErrors,
  stripeController.createRefund
);

// Obtener detalles de un pago de Stripe
router.get('/payment-details/:paymentIntentId',
  authenticateToken,
  requireStaff,
  stripeController.getPaymentDetails
);

// Obtener lista de pagos de Stripe
router.get('/payments',
  authenticateToken,
  requireStaff,
  stripeController.getStripePayments
);

// ✅ === UTILIDADES ===

// Verificar estado del servicio
router.get('/status', stripeController.getServiceStatus);

module.exports = router;