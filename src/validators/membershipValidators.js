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