// src/routes/admin/productRoutes.js - RUTAS COMPLETAS DE PRODUCTOS
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const storeProductController = require('../../controllers/StoreProductController');
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

// ✅ VALIDACIONES PARA CREAR PRODUCTO
const validateCreateProduct = [
  body('name')
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 255 })
    .withMessage('El nombre debe tener entre 2 y 255 caracteres')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('La descripción no puede exceder 2000 caracteres')
    .trim(),
  body('price')
    .isFloat({ min: 0.01 })
    .withMessage('El precio debe ser mayor a 0'),
  body('originalPrice')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('El precio original debe ser mayor a 0'),
  body('categoryId')
    .isInt({ min: 1 })
    .withMessage('La categoría es requerida y debe ser válida'),
  body('brandId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La marca debe ser válida'),
  body('sku')
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage('El SKU debe tener entre 3 y 100 caracteres')
    .trim(),
  body('stockQuantity')
    .isInt({ min: 0 })
    .withMessage('El stock debe ser un número entero no negativo'),
  body('minStock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El stock mínimo debe ser un número entero no negativo'),
  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured debe ser true o false'),
  body('weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El peso debe ser un número positivo'),
  body('dimensions')
    .optional()
    .isObject()
    .withMessage('Las dimensiones deben ser un objeto'),
  body('allowOnlinePayment')
    .optional()
    .isBoolean()
    .withMessage('allowOnlinePayment debe ser true o false'),
  body('allowCardPayment')
    .optional()
    .isBoolean()
    .withMessage('allowCardPayment debe ser true o false'),
  body('allowCashOnDelivery')
    .optional()
    .isBoolean()
    .withMessage('allowCashOnDelivery debe ser true o false'),
  body('deliveryTime')
    .optional()
    .isLength({ max: 50 })
    .withMessage('El tiempo de entrega no puede exceder 50 caracteres')
    .trim(),
  handleValidationErrors
];

// ✅ VALIDACIONES PARA ACTUALIZAR PRODUCTO
const validateUpdateProduct = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage('El nombre debe tener entre 2 y 255 caracteres')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('La descripción no puede exceder 2000 caracteres')
    .trim(),
  body('price')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('El precio debe ser mayor a 0'),
  body('originalPrice')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('El precio original debe ser mayor a 0'),
  body('categoryId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La categoría debe ser válida'),
  body('brandId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La marca debe ser válida'),
  body('sku')
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage('El SKU debe tener entre 3 y 100 caracteres')
    .trim(),
  body('stockQuantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El stock debe ser un número entero no negativo'),
  body('minStock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El stock mínimo debe ser un número entero no negativo'),
  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured debe ser true o false'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive debe ser true o false'),
  body('weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El peso debe ser un número positivo'),
  body('dimensions')
    .optional()
    .isObject()
    .withMessage('Las dimensiones deben ser un objeto'),
  handleValidationErrors
];

// ✅ VALIDACIONES PARA GESTIÓN DE STOCK
const validateStock = [
  body('stockQuantity')
    .isInt({ min: 0 })
    .withMessage('La cantidad debe ser un número entero no negativo'),
  body('operation')
    .optional()
    .isIn(['set', 'add', 'subtract'])
    .withMessage('La operación debe ser: set, add o subtract'),
  body('reason')
    .optional()
    .isLength({ max: 255 })
    .withMessage('La razón no puede exceder 255 caracteres')
    .trim(),
  handleValidationErrors
];

// ✅ VALIDACIONES PARA STOCK MASIVO
const validateBulkStock = [
  body('updates')
    .isArray({ min: 1 })
    .withMessage('Se requiere un array de actualizaciones'),
  body('updates.*.id')
    .isInt({ min: 1 })
    .withMessage('Cada elemento debe tener un ID válido'),
  body('updates.*.stockQuantity')
    .isInt({ min: 0 })
    .withMessage('Cada elemento debe tener una cantidad válida'),
  body('updates.*.operation')
    .optional()
    .isIn(['set', 'add', 'subtract'])
    .withMessage('La operación debe ser: set, add o subtract'),
  handleValidationErrors
];

// ✅ VALIDACIONES PARA DUPLICAR PRODUCTO
const validateDuplicate = [
  body('newName')
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage('El nuevo nombre debe tener entre 2 y 255 caracteres')
    .trim(),
  body('newSku')
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage('El nuevo SKU debe tener entre 3 y 100 caracteres')
    .trim(),
  handleValidationErrors
];

// ✅ VALIDACIONES PARA BÚSQUEDA Y FILTROS
const validateProductFilters = [
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
  query('category')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La categoría debe ser un número entero positivo'),
  query('brand')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La marca debe ser un número entero positivo'),
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'all'])
    .withMessage('El estado debe ser: active, inactive o all'),
  query('featured')
    .optional()
    .isBoolean()
    .withMessage('featured debe ser true o false'),
  query('lowStock')
    .optional()
    .isBoolean()
    .withMessage('lowStock debe ser true o false'),
  query('sortBy')
    .optional()
    .isIn(['name', 'price', 'stockQuantity', 'createdAt', 'rating'])
    .withMessage('sortBy debe ser: name, price, stockQuantity, createdAt o rating'),
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('sortOrder debe ser: ASC o DESC'),
  handleValidationErrors
];

// ✅ RUTAS DE PRODUCTOS

// Obtener todos los productos con filtros avanzados
router.get('/', validateProductFilters, storeProductController.getAllProducts);

// Estadísticas de productos
router.get('/stats', storeProductController.getProductStats);

// Productos con poco stock
router.get('/low-stock', storeProductController.getLowStockProducts);

// Actualización masiva de stock
router.put('/bulk/stock', validateBulkStock, storeProductController.bulkUpdateStock);

// Obtener producto específico por ID
router.get('/:id', [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  handleValidationErrors
], storeProductController.getProductById);

// Crear nuevo producto
router.post('/', validateCreateProduct, storeProductController.createProduct);

// Actualizar producto existente
router.put('/:id', [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  ...validateUpdateProduct
], storeProductController.updateProduct);

// Desactivar producto (soft delete)
router.delete('/:id', [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  handleValidationErrors
], storeProductController.deleteProduct);

// Actualizar stock de producto individual
router.put('/:id/stock', [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  ...validateStock
], storeProductController.updateStock);

// Duplicar producto
router.post('/:id/duplicate', [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  ...validateDuplicate
], storeProductController.duplicateProduct);

// ✅ MIDDLEWARE DE MANEJO DE ERRORES ESPECÍFICO PARA PRODUCTOS
router.use((error, req, res, next) => {
  console.error('Error en rutas de productos:', error);
  
  if (error.name === 'SequelizeUniqueConstraintError') {
    const field = error.errors[0]?.path;
    if (field === 'sku') {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un producto con ese SKU'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'Ya existe un producto con esos datos'
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
  
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'La categoría o marca especificada no existe'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor en gestión de productos',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
  });
});

module.exports = router;