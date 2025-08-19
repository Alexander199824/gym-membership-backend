// src/validators/testimonialValidators.js - NUEVO ARCHIVO
const { body } = require('express-validator');

const createTestimonialValidator = [
  body('text')
    .isLength({ min: 10, max: 500 })
    .withMessage('El testimonio debe tener entre 10 y 500 caracteres')
    .trim(),
  
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('La calificación debe ser entre 1 y 5'),
  
  body('role')
    .optional()
    .isLength({ max: 100 })
    .withMessage('El rol no puede exceder 100 caracteres')
    .trim()
];

const updateTestimonialValidator = [
  body('text')
    .optional()
    .isLength({ min: 10, max: 500 })
    .withMessage('El testimonio debe tener entre 10 y 500 caracteres')
    .trim(),
  
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('La calificación debe ser entre 1 y 5'),
  
  body('role')
    .optional()
    .isLength({ max: 100 })
    .withMessage('El rol no puede exceder 100 caracteres')
    .trim()
];

module.exports = {
  createTestimonialValidator,
  updateTestimonialValidator
};