// src/validators/paymentValidators.js
const { body, param } = require('express-validator');

const createPaymentValidator = [
  body('userId')
    .notEmpty()
    .withMessage('ID de usuario es requerido')
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