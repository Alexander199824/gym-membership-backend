// src/validators/scheduleValidators.js
const { body, param } = require('express-validator');

const updateScheduleValidator = [
  body('schedules')
    .isArray({ min: 1 })
    .withMessage('Los horarios deben ser un array con al menos un elemento'),
    
  body('schedules.*.dayOfWeek')
    .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .withMessage('Día de la semana inválido'),
    
  body('schedules.*.preferredStartTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Formato de hora de inicio inválido (HH:MM)'),
    
  body('schedules.*.preferredEndTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Formato de hora de fin inválido (HH:MM)')
    .custom((endTime, { req, path }) => {
      const scheduleIndex = path.split('.')[1];
      const startTime = req.body.schedules[scheduleIndex]?.preferredStartTime;
      
      if (startTime && endTime <= startTime) {
        throw new Error('La hora de fin debe ser posterior a la hora de inicio');
      }
      return true;
    }),
    
  body('schedules.*.workoutType')
    .optional()
    .isIn(['cardio', 'weights', 'functional', 'classes', 'mixed'])
    .withMessage('Tipo de entrenamiento inválido'),
    
  body('schedules.*.priority')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('La prioridad debe ser un número entre 1 y 5'),
    
  body('schedules.*.notes')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Las notas no pueden exceder 255 caracteres')
];

const addScheduleValidator = [
  body('dayOfWeek')
    .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .withMessage('Día de la semana inválido'),
    
  body('preferredStartTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Formato de hora de inicio inválido (HH:MM)'),
    
  body('preferredEndTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Formato de hora de fin inválido (HH:MM)')
    .custom((endTime, { req }) => {
      if (endTime <= req.body.preferredStartTime) {
        throw new Error('La hora de fin debe ser posterior a la hora de inicio');
      }
      return true;
    }),
    
  body('workoutType')
    .optional()
    .isIn(['cardio', 'weights', 'functional', 'classes', 'mixed'])
    .withMessage('Tipo de entrenamiento inválido'),
    
  body('priority')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('La prioridad debe ser un número entre 1 y 5'),
    
  body('notes')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Las notas no pueden exceder 255 caracteres')
];

const scheduleIdValidator = [
  param('id')
    .isUUID()
    .withMessage('ID de horario inválido')
];

const createDefaultScheduleValidator = [
  body('userId')
    .optional()
    .isUUID()
    .withMessage('ID de usuario inválido')
];

module.exports = {
  updateScheduleValidator,
  addScheduleValidator,
  scheduleIdValidator,
  createDefaultScheduleValidator
};