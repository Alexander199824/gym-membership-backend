// src/validators/paymentValidators.js
const { body, param } = require('express-validator');

const createPaymentValidator = [
  // ✅ CORREGIDO: userId ahora es opcional
  body('userId')
    .optional()
    .isUUID()
    .withMessage('ID de usuario inválido'),
    
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('El monto debe ser un número positivo'),
    
  body('paymentMethod')
    .isIn(['cash', 'card', 'transfer', 'online'])
    .withMessage('Método de pago inválido'),
    
  body('paymentType')
    .isIn(['membership', 'daily', 'bulk_daily'])
    .withMessage('Tipo de pago inválido'),
    
  body('membershipId')
    .optional()
    .isUUID()
    .withMessage('ID de membresía inválido'),

  // ✅ NUEVO: Validación para información de cliente anónimo
  body('anonymousClientInfo')
    .optional()
    .isObject()
    .withMessage('La información del cliente anónimo debe ser un objeto'),
    
  body('anonymousClientInfo.name')
    .if(body('userId').not().exists())
    .if(body('anonymousClientInfo').exists())
    .notEmpty()
    .withMessage('El nombre es requerido para clientes anónimos'),
    
  // ✅ VALIDACIÓN: Pagos de membresía requieren usuario
  body('userId')
    .if(body('paymentType').equals('membership'))
    .notEmpty()
    .withMessage('Los pagos de membresía requieren un usuario registrado'),

  // ✅ VALIDACIÓN: Pagos bulk_daily requieren dailyPaymentCount > 1
  body('dailyPaymentCount')
    .if(body('paymentType').equals('bulk_daily'))
    .isInt({ min: 2 })
    .withMessage('Los pagos en lote deben tener al menos 2 entradas'),
    
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres'),
    
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Las notas no pueden exceder 500 caracteres'),
    
  body('dailyPaymentCount')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El conteo de pagos diarios debe ser un número entero positivo'),
    
  body('paymentDate')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha de pago inválido')
];

const validateTransferValidator = [
  param('id')
    .isUUID()
    .withMessage('ID de pago inválido'),
    
  body('approved')
    .isBoolean()
    .withMessage('El estado de aprobación debe ser verdadero o falso'),
    
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Las notas no pueden exceder 500 caracteres')
];

const dailyIncomeValidator = [
  body('date')
    .isISO8601()
    .withMessage('Formato de fecha inválido'),
    
  body('totalAmount')
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
    .isLength({ max: 500 })
    .withMessage('Las notas no pueden exceder 500 caracteres')
];

module.exports = {
  createPaymentValidator,
  validateTransferValidator,
  dailyIncomeValidator
};