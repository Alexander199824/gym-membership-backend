// src/validators/userValidators.js
const { body, param, query } = require('express-validator');

const userIdValidator = [
  param('id')
    .isUUID()
    .withMessage('ID de usuario inválido')
];

const createUserValidator = [
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
    .normalizeEmail(),
    
  body('phone')
    .optional()
    .matches(/^[\+]?[\d\s\-\(\)]+$/)
    .withMessage('Formato de teléfono inválido'),
    
  body('role')
    .optional()
    .isIn(['admin', 'colaborador', 'cliente'])
    .withMessage('Rol inválido')
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
  createUserValidator,
  updateUserValidator,
  getUsersValidator
};