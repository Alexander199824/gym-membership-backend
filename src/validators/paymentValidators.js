// src/validators/paymentValidators.js - VALIDACIONES COMPLETAS CORREGIDAS
const { body, param } = require('express-validator');

// ✅ VALIDADOR PRINCIPAL: Crear pago - COMPLETAMENTE CORREGIDO
const createPaymentValidator = [
  // ✅ userId opcional - puede ser null para invitados
  body('userId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('ID de usuario inválido'),
    
  // ✅ amount siempre requerido
  body('amount')
    .notEmpty()
    .withMessage('El monto es requerido')
    .isFloat({ min: 0.01 })
    .withMessage('El monto debe ser un número positivo mayor a 0'),
    
  // ✅ paymentMethod con validaciones mejoradas
  body('paymentMethod')
    .notEmpty()
    .withMessage('Método de pago es requerido')
    .isIn(['cash', 'card', 'transfer', 'online'])
    .withMessage('Método de pago inválido. Opciones válidas: cash, card, transfer, online'),
    
  // ✅ paymentType con opciones ampliadas para tienda
  body('paymentType')
    .notEmpty()
    .withMessage('Tipo de pago es requerido')
    .isIn([
      'membership', 'daily', 'bulk_daily', 
      'store_cash_delivery', 'store_card_delivery', 'store_online', 'store_transfer', 'store_other'
    ])
    .withMessage('Tipo de pago inválido'),
    
  // ✅ membershipId solo requerido para pagos de membresía
  body('membershipId')
    .if(body('paymentType').equals('membership'))
    .notEmpty()
    .withMessage('ID de membresía es requerido para pagos de membresía')
    .isUUID()
    .withMessage('ID de membresía inválido'),

  // ✅ VALIDACIÓN CLAVE: Usuario requerido para membresías
  body('userId')
    .if(body('paymentType').equals('membership'))
    .notEmpty()
    .withMessage('Los pagos de membresía requieren un usuario registrado')
    .isUUID()
    .withMessage('ID de usuario inválido para pagos de membresía'),

  // ✅ VALIDACIÓN: Información de cliente anónimo para pagos sin usuario
  body('anonymousClientInfo')
    .if(body('userId').not().exists())
    .optional()
    .isObject()
    .withMessage('La información del cliente anónimo debe ser un objeto'),
    
  body('anonymousClientInfo.name')
    .if(body('userId').not().exists())
    .if(body('anonymousClientInfo').exists())
    .notEmpty()
    .withMessage('El nombre es requerido para clientes anónimos')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),

  body('anonymousClientInfo.email')
    .if(body('userId').not().exists())
    .if(body('anonymousClientInfo').exists())
    .optional()
    .isEmail()
    .withMessage('Email inválido para cliente anónimo'),

  body('anonymousClientInfo.phone')
    .if(body('userId').not().exists())
    .if(body('anonymousClientInfo').exists())
    .optional()
    .matches(/^[\+]?[\d\s\-\(\)]+$/)
    .withMessage('Formato de teléfono inválido para cliente anónimo'),

  // ✅ VALIDACIÓN: Pagos bulk_daily requieren dailyPaymentCount > 1
  body('dailyPaymentCount')
    .if(body('paymentType').equals('bulk_daily'))
    .isInt({ min: 2, max: 100 })
    .withMessage('Los pagos en lote deben tener entre 2 y 100 entradas'),
    
  // ✅ dailyPaymentCount opcional para otros tipos
  body('dailyPaymentCount')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El conteo de pagos diarios debe ser entre 1 y 100'),
    
  // ✅ description opcional pero con límites
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres')
    .trim(),
    
  // ✅ notes opcional
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las notas no pueden exceder 1000 caracteres')
    .trim(),
    
  // ✅ paymentDate opcional - por defecto se usa fecha actual
  body('paymentDate')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha de pago inválido'),

  // ✅ VALIDACIONES ESPECÍFICAS PARA PAGOS DE TIENDA
  body('referenceId')
    .if(body('paymentType').matches(/^store_/))
    .optional()
    .isUUID()
    .withMessage('ID de referencia inválido para pagos de tienda'),

  body('referenceType')
    .if(body('paymentType').matches(/^store_/))
    .optional()
    .isIn(['store_order', 'store_product'])
    .withMessage('Tipo de referencia inválido para pagos de tienda'),

  // ✅ VALIDACIÓN: cardTransactionId para pagos con tarjeta
  body('cardTransactionId')
    .if(body('paymentMethod').equals('card'))
    .optional()
    .isLength({ min: 10 })
    .withMessage('ID de transacción de tarjeta inválido'),

  body('cardLast4')
    .if(body('paymentMethod').equals('card'))
    .optional()
    .isLength({ min: 4, max: 4 })
    .withMessage('Últimos 4 dígitos de tarjeta inválidos'),

  // ✅ VALIDACIÓN CUSTOM: Al menos usuario O información anónima
  body().custom((value, { req }) => {
    const { userId, anonymousClientInfo, paymentType } = value;
    
    // Para membresías siempre se requiere usuario
    if (paymentType === 'membership' && !userId) {
      throw new Error('Los pagos de membresía requieren un usuario registrado');
    }
    
    // Para otros tipos, debe haber usuario O información anónima
    if (!userId && !anonymousClientInfo) {
      throw new Error('Se requiere usuario registrado o información del cliente anónimo');
    }
    
    return true;
  })
];

// ✅ VALIDADOR: Validar transferencia
const validateTransferValidator = [
  param('id')
    .notEmpty()
    .withMessage('ID de pago es requerido')
    .isUUID()
    .withMessage('ID de pago inválido'),
    
  body('approved')
    .notEmpty()
    .withMessage('Estado de aprobación es requerido')
    .isBoolean()
    .withMessage('El estado de aprobación debe ser verdadero o falso'),
    
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Las notas no pueden exceder 500 caracteres')
    .trim()
];

// ✅ VALIDADOR: Ingresos diarios
const dailyIncomeValidator = [
  body('date')
    .notEmpty()
    .withMessage('La fecha es requerida')
    .isISO8601()
    .withMessage('Formato de fecha inválido')
    .custom((date) => {
      const selectedDate = new Date(date);
      const today = new Date();
      
      // No permitir fechas futuras
      if (selectedDate > today) {
        throw new Error('No se pueden registrar ingresos de fechas futuras');
      }
      
      return true;
    }),
    
  body('totalAmount')
    .notEmpty()
    .withMessage('El monto total es requerido')
    .isFloat({ min: 0 })
    .withMessage('El monto total debe ser un número positivo'),
    
  body('membershipPayments')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Los pagos de membresía deben ser un número positivo'),
    
  body('dailyPayments')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Los pagos diarios deben ser un número positivo'),
    
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las notas no pueden exceder 1000 caracteres')
    .trim(),

  // ✅ VALIDACIÓN CUSTOM: Sumar componentes debe ser igual al total
  body().custom((value) => {
    const { totalAmount, membershipPayments = 0, dailyPayments = 0 } = value;
    const calculatedTotal = parseFloat(membershipPayments) + parseFloat(dailyPayments);
    const providedTotal = parseFloat(totalAmount);
    
    // Permitir una pequeña diferencia por redondeo
    const difference = Math.abs(calculatedTotal - providedTotal);
    
    if (difference > 0.01) {
      throw new Error('La suma de pagos de membresía y diarios debe ser igual al total');
    }
    
    return true;
  })
];

// ✅ NUEVO: Validador para pagos de invitados específicamente
const createGuestPaymentValidator = [
  body('amount')
    .notEmpty()
    .withMessage('El monto es requerido')
    .isFloat({ min: 0.01 })
    .withMessage('El monto debe ser un número positivo mayor a 0'),
    
  body('paymentMethod')
    .notEmpty()
    .withMessage('Método de pago es requerido')
    .isIn(['card', 'cash', 'transfer'])
    .withMessage('Método de pago inválido para invitados'),
    
  body('paymentType')
    .notEmpty()
    .withMessage('Tipo de pago es requerido')
    .isIn(['store_online', 'store_cash_delivery', 'store_card_delivery', 'daily'])
    .withMessage('Tipo de pago inválido para invitados'),
    
  body('guestInfo')
    .notEmpty()
    .withMessage('Información del invitado es requerida')
    .isObject()
    .withMessage('La información del invitado debe ser un objeto'),
    
  body('guestInfo.name')
    .notEmpty()
    .withMessage('Nombre del invitado es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .matches(/^[A-Za-zÀ-ÿ\u00f1\u00d1\s\-'\.]+$/)
    .withMessage('El nombre solo puede contener letras, espacios y acentos'),
    
  body('guestInfo.email')
    .optional()
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
    
  body('guestInfo.phone')
    .optional()
    .matches(/^[\+]?[\d\s\-\(\)]+$/)
    .withMessage('Formato de teléfono inválido'),
    
  body('orderId')
    .if(body('paymentType').matches(/^store_/))
    .notEmpty()
    .withMessage('ID de orden es requerido para pagos de tienda')
    .isUUID()
    .withMessage('ID de orden inválido'),
    
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres')
    .trim()
];

// ✅ NUEVO: Validador para confirmación de pagos Stripe
const confirmStripePaymentValidator = [
  body('paymentIntentId')
    .notEmpty()
    .withMessage('ID de Payment Intent es requerido')
    .isLength({ min: 10 })
    .withMessage('ID de Payment Intent inválido')
    .matches(/^pi_/)
    .withMessage('El ID debe comenzar con "pi_"'),
    
  body('paymentMethodId')
    .optional()
    .isLength({ min: 10 })
    .withMessage('ID de método de pago inválido')
    .matches(/^pm_/)
    .withMessage('El ID del método de pago debe comenzar con "pm_"'),
    
  body('clientSecret')
    .optional()
    .isLength({ min: 10 })
    .withMessage('Client secret inválido')
];

// ✅ NUEVO: Validador para subir comprobantes
const uploadProofValidator = [
  param('id')
    .notEmpty()
    .withMessage('ID de pago es requerido')
    .isUUID()
    .withMessage('ID de pago inválido'),
    
  // El archivo se valida en el middleware de multer
  body('proofType')
    .optional()
    .isIn(['transfer_receipt', 'payment_confirmation', 'other'])
    .withMessage('Tipo de comprobante inválido'),
    
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Las notas no pueden exceder 500 caracteres')
    .trim()
];

// ✅ HELPER: Validador de ID de pago
const paymentIdValidator = [
  param('id')
    .notEmpty()
    .withMessage('ID de pago es requerido')
    .isUUID()
    .withMessage('ID de pago inválido')
];

// ✅ HELPER: Validador de parámetros de consulta para reportes
const paymentReportValidator = [
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha de inicio inválido'),
    
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha de fin inválido')
    .custom((endDate, { req }) => {
      if (req.body.startDate && endDate <= req.body.startDate) {
        throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
      }
      return true;
    }),
    
  body('paymentType')
    .optional()
    .isIn(['membership', 'daily', 'bulk_daily', 'store_cash_delivery', 'store_card_delivery', 'store_online', 'store_transfer'])
    .withMessage('Tipo de pago inválido para reporte'),
    
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'transfer', 'online'])
    .withMessage('Método de pago inválido para reporte'),
    
  body('status')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'cancelled', 'refunded'])
    .withMessage('Estado de pago inválido para reporte')
];

module.exports = {
  createPaymentValidator,
  validateTransferValidator,
  dailyIncomeValidator,
  createGuestPaymentValidator,
  confirmStripePaymentValidator,
  uploadProofValidator,
  paymentIdValidator,
  paymentReportValidator
};