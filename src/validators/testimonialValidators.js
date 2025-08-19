// src/validators/testimonialValidators.js - NUEVO ARCHIVO
const { body, param } = require('express-validator');

// ✅ VALIDADOR PARA CREAR TESTIMONIO
const createTestimonialValidator = [
  body('text')
    .trim()
    .notEmpty()
    .withMessage('El testimonio es obligatorio')
    .isLength({ min: 10, max: 500 })
    .withMessage('El testimonio debe tener entre 10 y 500 caracteres')
    .custom((value) => {
      // Verificar que no sea solo espacios en blanco
      if (!value.replace(/\s/g, '')) {
        throw new Error('El testimonio no puede estar vacío');
      }
      return true;
    }),
    
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('La calificación debe ser un número entre 1 y 5'),
    
  body('role')
    .trim()
    .notEmpty()
    .withMessage('La profesión es obligatoria')
    .isLength({ min: 2, max: 100 })
    .withMessage('La profesión debe tener entre 2 y 100 caracteres')
    .matches(/^[A-Za-zÀ-ÿ\u00f1\u00d1\s\-']+$/)
    .withMessage('La profesión solo puede contener letras, espacios, guiones y apostrofes')
];

// ✅ VALIDADOR PARA ACTUALIZAR TESTIMONIO (para futuras funcionalidades)
const updateTestimonialValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de testimonio inválido'),
    
  body('text')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('El testimonio debe tener entre 10 y 500 caracteres'),
    
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('La calificación debe ser un número entre 1 y 5'),
    
  body('role')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('La profesión debe tener entre 2 y 100 caracteres')
    .matches(/^[A-Za-zÀ-ÿ\u00f1\u00d1\s\-']+$/)
    .withMessage('La profesión solo puede contener letras, espacios, guiones y apostrofes')
];

// ✅ VALIDADOR PARA ACCIONES DE ADMIN (aprobar, rechazar, etc.)
const adminTestimonialActionValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de testimonio inválido'),
    
  body('featured')
    .optional()
    .isBoolean()
    .withMessage('El campo destacado debe ser verdadero o falso'),
    
  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El orden de visualización debe ser un número mayor o igual a 0'),
    
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La razón no puede superar los 500 caracteres')
];

// ✅ VALIDADOR PARA PARÁMETROS DE CONSULTA
const queryTestimonialsValidator = [
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entre 1 y 100'),
    
  body('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El offset debe ser un número mayor o igual a 0'),
    
  body('status')
    .optional()
    .isIn(['active', 'pending', 'all'])
    .withMessage('El estado debe ser: active, pending o all'),
    
  body('featured')
    .optional()
    .isBoolean()
    .withMessage('El filtro destacado debe ser verdadero o falso')
];

module.exports = {
  createTestimonialValidator,
  updateTestimonialValidator,
  adminTestimonialActionValidator,
  queryTestimonialsValidator
};