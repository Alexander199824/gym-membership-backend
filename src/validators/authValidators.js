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