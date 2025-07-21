// src/validators/stripeValidators.js - Validadores para operaciones de Stripe
const { body, param } = require('express-validator');

const createPaymentIntentValidator = {
  // ✅ Validador para Payment Intent de membresía
  membership: [
    body('membershipId')
      .optional()
      .isUUID()
      .withMessage('ID de membresía inválido'),
      
    body('membershipType')
      .optional()
      .isIn(['monthly', 'daily', 'annual'])
      .withMessage('Tipo de membresía inválido'),
      
    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('El precio debe ser un número positivo')
      .custom((price) => {
        if (price && price > 10000) {
          throw new Error('El precio no puede exceder $10,000');
        }
        return true;
      })
  ],

  // ✅ Validador para Payment Intent de pago diario
  daily: [
    body('amount')
      .isFloat({ min: 0 })
      .withMessage('El monto debe ser un número positivo')
      .custom((amount) => {
        if (amount > 1000) {
          throw new Error('El monto no puede exceder $1,000');
        }
        return true;
      }),
      
    body('dailyCount')
      .optional()
      .isInt({ min: 1, max: 30 })
      .withMessage('El conteo diario debe ser entre 1 y 30'),
      
    body('clientInfo')
      .optional()
      .isObject()
      .withMessage('La información del cliente debe ser un objeto'),
      
    body('clientInfo.name')
      .if(body('clientInfo').exists())
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('El nombre del cliente debe tener entre 2 y 100 caracteres'),
      
    body('clientInfo.email')
      .if(body('clientInfo').exists())
      .optional()
      .isEmail()
      .withMessage('Email del cliente inválido'),
      
    body('clientInfo.phone')
      .if(body('clientInfo').exists())
      .optional()
      .matches(/^[\+]?[\d\s\-\(\)]+$/)
      .withMessage('Formato de teléfono inválido')
  ],

  // ✅ Validador para Payment Intent de tienda
  store: [
    body('orderId')
      .notEmpty()
      .withMessage('ID de orden es requerido')
      .isUUID()
      .withMessage('ID de orden inválido'),
      
    body('sessionId')
      .optional()
      .isLength({ min: 5, max: 255 })
      .withMessage('ID de sesión inválido')
  ]
};

const confirmPaymentValidator = [
  body('paymentIntentId')
    .notEmpty()
    .withMessage('ID de Payment Intent es requerido')
    .isLength({ min: 10 })
    .withMessage('ID de Payment Intent inválido')
    .matches(/^pi_/)
    .withMessage('El ID debe comenzar con "pi_"')
];

const refundValidator = [
  body('paymentId')
    .notEmpty()
    .withMessage('ID de pago es requerido')
    .isUUID()
    .withMessage('ID de pago inválido'),
    
  body('amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El monto de reembolso debe ser un número positivo'),
    
  body('reason')
    .optional()
    .isIn(['duplicate', 'fraudulent', 'requested_by_customer'])
    .withMessage('Razón de reembolso inválida')
];

const paymentIntentIdValidator = [
  param('paymentIntentId')
    .notEmpty()
    .withMessage('ID de Payment Intent es requerido')
    .matches(/^pi_/)
    .withMessage('El ID debe comenzar con "pi_"')
];

// ✅ Validador para webhook (sin validación express, se valida manualmente)
const webhookValidator = (req, res, next) => {
  // Verificar que el content-type sea correcto
  if (req.headers['content-type'] !== 'application/json') {
    return res.status(400).json({
      success: false,
      message: 'Content-Type debe ser application/json'
    });
  }

  // Verificar que existe la signature
  if (!req.headers['stripe-signature']) {
    return res.status(400).json({
      success: false,
      message: 'Stripe signature faltante'
    });
  }

  next();
};

// ✅ Validador personalizado para montos en USD
const validateUSDAmount = (amount, { req }) => {
  const parsedAmount = parseFloat(amount);
  
  // Monto mínimo de $0.50 (requisito de Stripe)
  if (parsedAmount < 0.50) {
    throw new Error('El monto mínimo es $0.50');
  }
  
  // Monto máximo de $999,999.99
  if (parsedAmount > 999999.99) {
    throw new Error('El monto máximo es $999,999.99');
  }
  
  return true;
};

// ✅ Validador para moneda
const validateCurrency = (currency) => {
  const supportedCurrencies = ['usd', 'gtq', 'eur', 'cad'];
  
  if (!supportedCurrencies.includes(currency.toLowerCase())) {
    throw new Error(`Moneda no soportada. Monedas válidas: ${supportedCurrencies.join(', ')}`);
  }
  
  return true;
};

module.exports = {
  createPaymentIntentValidator,
  confirmPaymentValidator,
  refundValidator,
  paymentIntentIdValidator,
  webhookValidator,
  validateUSDAmount,
  validateCurrency
};