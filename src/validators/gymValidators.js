// src/validators/gymValidators.js
const { body } = require('express-validator');

const updateConfigurationValidator = [
  body('gymName')
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage('El nombre del gimnasio debe tener entre 2 y 255 caracteres')
    .trim(),
    
  body('gymTagline')
    .optional()
    .isLength({ max: 500 })
    .withMessage('El eslogan no puede exceder 500 caracteres')
    .trim(),
    
  body('gymDescription')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('La descripción no puede exceder 2000 caracteres')
    .trim(),
    
  body('logoUrl')
    .optional()
    .isURL()
    .withMessage('La URL del logo debe ser válida'),
    
  body('primaryColor')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('El color primario debe estar en formato hexadecimal (#RRGGBB)'),
    
  body('secondaryColor')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('El color secundario debe estar en formato hexadecimal (#RRGGBB)'),
    
  body('successColor')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('El color de éxito debe estar en formato hexadecimal (#RRGGBB)'),
    
  body('warningColor')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('El color de advertencia debe estar en formato hexadecimal (#RRGGBB)'),
    
  body('dangerColor')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('El color de peligro debe estar en formato hexadecimal (#RRGGBB)')
];

const updateContactInfoValidator = [
  body('phone')
    .optional()
    .matches(/^[\+]?[\d\s\-\(\)]+$/)
    .withMessage('Formato de teléfono inválido'),
    
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
    
  body('address')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La dirección no puede exceder 500 caracteres')
    .trim(),
    
  body('city')
    .optional()
    .isLength({ max: 100 })
    .withMessage('La ciudad no puede exceder 100 caracteres')
    .trim(),
    
  body('country')
    .optional()
    .isLength({ max: 100 })
    .withMessage('El país no puede exceder 100 caracteres')
    .trim(),
    
  body('mapsUrl')
    .optional()
    .isURL()
    .withMessage('La URL de Google Maps debe ser válida'),
    
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('La latitud debe estar entre -90 y 90'),
    
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('La longitud debe estar entre -180 y 180')
];

const updateHoursValidator = [
  body('hours')
    .isObject()
    .withMessage('Los horarios deben ser un objeto'),
    
  body('hours.*.openingTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Formato de hora de apertura inválido (HH:MM)'),
    
  body('hours.*.closingTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Formato de hora de cierre inválido (HH:MM)'),
    
  body('hours.*.isClosed')
    .optional()
    .isBoolean()
    .withMessage('El estado cerrado debe ser verdadero o falso'),
    
  body('hours.*.specialNote')
    .optional()
    .isLength({ max: 255 })
    .withMessage('La nota especial no puede exceder 255 caracteres')
];

const updateStatisticsValidator = [
  body('statistics')
    .isArray({ min: 1 })
    .withMessage('Las estadísticas deben ser un array con al menos un elemento'),
    
  body('statistics.*.statKey')
    .isIn(['members_count', 'trainers_count', 'experience_years', 'satisfaction_rate', 'equipment_count', 'success_stories'])
    .withMessage('Clave de estadística inválida'),
    
  body('statistics.*.statValue')
    .isLength({ min: 1, max: 20 })
    .withMessage('El valor de la estadística debe tener entre 1 y 20 caracteres')
    .trim(),
    
  body('statistics.*.displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El orden de visualización debe ser un número entero positivo'),
    
  body('statistics.*.isActive')
    .optional()
    .isBoolean()
    .withMessage('El estado activo debe ser verdadero o falso')
];

module.exports = {
  updateConfigurationValidator,
  updateContactInfoValidator,
  updateHoursValidator,
  updateStatisticsValidator
};