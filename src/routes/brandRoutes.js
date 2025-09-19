// src/routes/admin/brandRoutes.js - RUTAS COMPLETAS DE MARCAS
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const storeBrandController = require('../../controllers/StoreBrandController');
const { authenticateToken, requireStaff } = require('../../middleware/auth');

const router = express.Router();

// ✅ MIDDLEWARE GLOBAL: Autenticación y permisos requeridos para todas las rutas
router.use(authenticateToken, requireStaff);

// ✅ MIDDLEWARE DE VALIDACIÓN
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array()
    });
  }
  next();
};

// ✅ VALIDACIONES PARA CREAR MARCA
const validateCreateBrand = [
  body('name')
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres')
    .trim(),
  body('logoUrl')
    .optional()
    .isURL()
    .withMessage('La URL del logo debe ser válida')
    .trim(),
  handleValidationErrors
];

// ✅ VALIDACIONES PARA ACTUALIZAR MARCA
const validateUpdateBrand = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres')
    .trim(),
  body('logoUrl')
    .optional()
    .isURL()
    .withMessage('La URL del logo debe ser válida')
    .trim(),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive debe ser true o false'),
  handleValidationErrors
];

// ✅ VALIDACIONES PARA BÚSQUEDA
const validateSearch = [
  query('q')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('El término de búsqueda debe tener entre 2 y 100 caracteres')
    .trim(),
  handleValidationErrors
];

// ✅ VALIDACIONES PARA PAGINACIÓN
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entre 1 y 100'),
  query('search')
    .optional()
    .isLength({ max: 100 })
    .withMessage('El término de búsqueda no puede exceder 100 caracteres')
    .trim(),
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'all'])
    .withMessage('El estado debe ser: active, inactive o all'),
  handleValidationErrors
];

// ✅ RUTAS DE MARCAS

// Obtener todas las marcas con filtros y paginación
router.get('/', validatePagination, storeBrandController.getAllBrands);

// Estadísticas de marcas
router.get('/stats', storeBrandController.getBrandStats);

// Buscar marcas (autocomplete)
router.get('/search', validateSearch, storeBrandController.searchBrands);

// Obtener marca específica por ID
router.get('/:id', [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  handleValidationErrors
], storeBrandController.getBrandById);

// Crear nueva marca
router.post('/', validateCreateBrand, storeBrandController.createBrand);

// Actualizar marca existente
router.put('/:id', [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  ...validateUpdateBrand
], storeBrandController.updateBrand);

// Desactivar marca (soft delete)
router.delete('/:id', [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  handleValidationErrors
], storeBrandController.deleteBrand);

// Reactivar marca
router.put('/:id/activate', [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  handleValidationErrors
], storeBrandController.activateBrand);

// ✅ MIDDLEWARE DE MANEJO DE ERRORES ESPECÍFICO PARA MARCAS
router.use((error, req, res, next) => {
  console.error('Error en rutas de marcas:', error);
  
  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Ya existe una marca con ese nombre'
    });
  }
  
  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: error.errors.map(err => ({
        field: err.path,
        message: err.message
      }))
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor en gestión de marcas',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
  });
});

module.exports = router;