// src/validators/authValidators.js
const { body } = require('express-validator');
const { User } = require('../models');

const registerValidator = [
  body('firstName')
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .trim(),
    
  body('lastName')
    .notEmpty()
    .withMessage('El apellido es requerido')
    .isLength({ min: 2, max: 50 })
    .withMessage('El apellido debe tener entre 2 y 50 caracteres')
    .trim(),
    
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail()
    .custom(async (email) => {
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        throw new Error('Este email ya está registrado');
      }
    }),
    
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
    
  body('phone')
    .optional()
    .matches(/^[\+]?[\d\s\-\(\)]+$/)
    .withMessage('Formato de teléfono inválido'),
    
  body('whatsapp')
    .optional()
    .matches(/^[\+]?[\d\s\-\(\)]+$/)
    .withMessage('Formato de WhatsApp inválido'),
    
  body('role')
    .optional()
    .isIn(['admin', 'colaborador', 'cliente'])
    .withMessage('Rol inválido')
];

const loginValidator = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
    
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
];

const updateProfileValidator = [
  body('firstName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .trim(),
    
  body('lastName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('El apellido debe tener entre 2 y 50 caracteres')
    .trim(),
    
  body('phone')
    .optional()
    .matches(/^[\+]?[\d\s\-\(\)]+$/)
    .withMessage('Formato de teléfono inválido'),
    
  body('whatsapp')
    .optional()
    .matches(/^[\+]?[\d\s\-\(\)]+$/)
    .withMessage('Formato de WhatsApp inválido'),
    
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha inválido'),
    
  body('notificationPreferences')
    .optional()
    .isObject()
    .withMessage('Preferencias de notificación deben ser un objeto'),
    
  body('emergencyContact')
    .optional()
    .isObject()
    .withMessage('Contacto de emergencia debe ser un objeto')
];

module.exports = {
  registerValidator,
  loginValidator,
  updateProfileValidator
};

// src/validators/membershipValidators.js
const { body, param } = require('express-validator');

const createMembershipValidator = [
  body('userId')
    .notEmpty()
    .withMessage('ID de usuario es requerido')
    .isUUID()
    .withMessage('ID de usuario inválido'),
    
  body('type')
    .isIn(['monthly', 'daily'])
    .withMessage('Tipo de membresía inválido'),
    
  body('price')
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número positivo'),
    
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha de inicio inválido'),
    
  body('endDate')
    .isISO8601()
    .withMessage('Formato de fecha de fin inválido')
    .custom((endDate, { req }) => {
      const startDate = new Date(req.body.startDate || new Date());
      if (new Date(endDate) <= startDate) {
        throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
      }
      return true;
    }),
    
  body('preferredSchedule')
    .optional()
    .isObject()
    .withMessage('Horarios preferidos deben ser un objeto'),
    
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Las notas no pueden exceder 500 caracteres')
];

const updateMembershipValidator = [
  param('id')
    .isUUID()
    .withMessage('ID de membresía inválido'),
    
  body('type')
    .optional()
    .isIn(['monthly', 'daily'])
    .withMessage('Tipo de membresía inválido'),
    
  body('status')
    .optional()
    .isIn(['active', 'expired', 'suspended', 'cancelled'])
    .withMessage('Estado de membresía inválido'),
    
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número positivo'),
    
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha de fin inválido'),
    
  body('preferredSchedule')
    .optional()
    .isObject()
    .withMessage('Horarios preferidos deben ser un objeto')
];

module.exports = {
  createMembershipValidator,
  updateMembershipValidator
};

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

// src/validators/userValidators.js
const { body, param, query } = require('express-validator');

const userIdValidator = [
  param('id')
    .isUUID()
    .withMessage('ID de usuario inválido')
];

const updateUserValidator = [
  param('id')
    .isUUID()
    .withMessage('ID de usuario inválido'),
    
  body('firstName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .trim(),
    
  body('lastName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('El apellido debe tener entre 2 y 50 caracteres')
    .trim(),
    
  body('role')
    .optional()
    .isIn(['admin', 'colaborador', 'cliente'])
    .withMessage('Rol inválido'),
    
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('El estado activo debe ser verdadero o falso')
];

const getUsersValidator = [
  query('role')
    .optional()
    .isIn(['admin', 'colaborador', 'cliente'])
    .withMessage('Rol inválido'),
    
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('El estado activo debe ser verdadero o falso'),
    
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero positivo'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entre 1 y 100')
];

module.exports = {
  userIdValidator,
  updateUserValidator,
  getUsersValidator
};