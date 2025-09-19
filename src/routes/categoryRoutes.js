// src/routes/admin/categoryRoutes.js - RUTAS COMPLETAS DE CATEGORÍAS
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const storeCategoryController = require('../../controllers/StoreCategoryController');
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

// ✅ VALIDACIONES PARA CREAR CATEGORÍA
const validateCreateCategory = [
  body('name')
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .trim(),
  body('slug')
    .optional()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('El slug solo puede contener letras minúsculas, números y guiones')
    .isLength({ min: 2, max: 100 })
    .withMessage('El slug debe tener entre 2 y 100 caracteres')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres')
    .trim(),
  body('iconName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('El icono debe tener entre 1 y 50 caracteres')
    .trim(),
  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El orden debe ser un número entero positivo'),
  handleValidationErrors
];

// ✅ VALIDACIONES PARA ACTUALIZAR CATEGORÍA
const validateUpdateCategory = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .trim(),
  body('slug')
    .optional()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('El slug solo puede contener letras minúsculas, números y guiones')
    .isLength({ min: 2, max: 100 })
    .withMessage('El slug debe tener entre 2 y 100 caracteres')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres')
    .trim(),
  body('iconName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('El icono debe tener entre 1 y 50 caracteres')
    .trim(),
  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El orden debe ser un número entero positivo'),
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

// ✅ VALIDACIONES PARA REORDENAR
const validateReorder = [
  body('categoryOrders')
    .isArray({ min: 1 })
    .withMessage('Se requiere un array de órdenes de categorías'),
  body('categoryOrders.*.id')
    .isInt({ min: 1 })
    .withMessage('Cada elemento debe tener un ID válido'),
  body('categoryOrders.*.displayOrder')
    .isInt({ min: 0 })
    .withMessage('Cada elemento debe tener un displayOrder válido'),
  handleValidationErrors
];

// ✅ RUTAS DE CATEGORÍAS

// Obtener todas las categorías con filtros y paginación (ADMIN)
router.get('/', validatePagination, storeCategoryController.getAllCategories);

// Estadísticas de categorías
router.get('/stats', storeCategoryController.getCategoryStats);

// Buscar categorías (autocomplete)
router.get('/search', validateSearch, storeCategoryController.searchCategories);

// Reordenar categorías
router.put('/reorder', validateReorder, storeCategoryController.reorderCategories);

// Obtener categoría específica por ID
router.get('/:id', [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  handleValidationErrors
], storeCategoryController.getCategoryById);

// Crear nueva categoría
router.post('/', validateCreateCategory, storeCategoryController.createCategory);

// Actualizar categoría existente
router.put('/:id', [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  ...validateUpdateCategory
], storeCategoryController.updateCategory);

// Desactivar categoría (soft delete)
router.delete('/:id', [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  handleValidationErrors
], storeCategoryController.deleteCategory);

// Reactivar categoría
router.put('/:id/activate', [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  handleValidationErrors
], storeCategoryController.activateCategory);

// ✅ MIDDLEWARE DE MANEJO DE ERRORES ESPECÍFICO PARA CATEGORÍAS
router.use((error, req, res, next) => {
  console.error('Error en rutas de categorías:', error);
  
  if (error.name === 'SequelizeUniqueConstraintError') {
    const field = error.errors[0]?.path;
    if (field === 'slug') {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una categoría con ese slug'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'Ya existe una categoría con esos datos'
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
    message: 'Error interno del servidor en gestión de categorías',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
  });
});

module.exports = router;