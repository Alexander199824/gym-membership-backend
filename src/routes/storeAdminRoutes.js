// src/routes/storeAdminRoutes.js - ADMINISTRACIÓN DE TIENDA, INVENTARIO Y VENTAS
const express = require('express');
const { authenticateToken, requireStaff } = require('../middleware/auth');

// Importar controladores de tienda
const storeBrandController = require('../controllers/StoreBrandController');
const storeCategoryController = require('../controllers/StoreCategoryController');
const storeProductController = require('../controllers/StoreProductController');
const storeImageController = require('../controllers/StoreImageController');
const storeController = require('../controllers/storeController');

// Importar validaciones
const { body, param, query, validationResult } = require('express-validator');

// ✅ IMPORTAR CONFIGURACIÓN DE CLOUDINARY (NO REDEFINIR)
const { uploadProductImage } = require('../config/cloudinary');
const multer = require('multer');

const router = express.Router();

// ✅ MIDDLEWARE GLOBAL: Autenticación y permisos para gestión de tienda
router.use(authenticateToken, requireStaff);

// ✅ Logging específico para administración de tienda
router.use((req, res, next) => {
  console.log(`🛒 Store Admin: ${req.method} ${req.originalUrl} - Manager: ${req.user?.email}`);
  next();
});

// ✅ MIDDLEWARE DE VALIDACIÓN CORREGIDO
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('❌ Errores de validación:', errors.array());
    
    // ✅ Formatear errores correctamente
    const formattedErrors = errors.array().map(error => {
      return {
        field: error.path || error.param || 'unknown',
        message: error.msg || 'Error de validación',
        value: error.value
      };
    });

    return res.status(400).json({
      success: false,
      message: 'Errores de validación en gestión de tienda',
      errors: formattedErrors
    });
  }
  next();
};

// ===================================================================
// 🏷️ VALIDACIONES PARA MARCAS - CORREGIDAS
// ===================================================================

const validateCreateBrand = [
  body('name')
    .notEmpty()
    .withMessage('El nombre de la marca es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .trim(),
  body('description')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres')
    .trim(),
  body('logoUrl')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      // ✅ Solo validar si realmente hay contenido
      if (value && typeof value === 'string' && value.trim().length > 0) {
        try {
          new URL(value.trim());
          return true;
        } catch {
          throw new Error('La URL del logo debe ser válida');
        }
      }
      return true; // Permitir vacío/null/undefined
    }),
  handleValidationErrors
];

const validateUpdateBrand = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .trim(),
  body('description')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres')
    .trim(),
  body('logoUrl')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (value && typeof value === 'string' && value.trim().length > 0) {
        try {
          new URL(value.trim());
          return true;
        } catch {
          throw new Error('La URL del logo debe ser válida');
        }
      }
      return true;
    }),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive debe ser true o false'),
  handleValidationErrors
];

const validateSearchBrand = [
  query('q')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: 2, max: 100 })
    .withMessage('El término de búsqueda debe tener entre 2 y 100 caracteres')
    .trim(),
  handleValidationErrors
];

const validatePaginationBrand = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entre 1 y 100'),
  query('search')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 })
    .withMessage('El término de búsqueda no puede exceder 100 caracteres')
    .trim(),
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'all'])
    .withMessage('El estado debe ser: active, inactive o all'),
  handleValidationErrors
];

// ===================================================================
// 📂 VALIDACIONES PARA CATEGORÍAS - CORREGIDAS
// ===================================================================

const validateCreateCategory = [
  body('name')
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .trim(),
  body('slug')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (value && typeof value === 'string' && value.trim().length > 0) {
        if (!/^[a-z0-9-]+$/.test(value.trim())) {
          throw new Error('El slug solo puede contener letras minúsculas, números y guiones');
        }
        if (value.trim().length < 2 || value.trim().length > 100) {
          throw new Error('El slug debe tener entre 2 y 100 caracteres');
        }
      }
      return true;
    }),
  body('description')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres')
    .trim(),
  body('iconName')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: 1, max: 50 })
    .withMessage('El icono debe tener entre 1 y 50 caracteres')
    .trim(),
  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El orden debe ser un número entero positivo'),
  handleValidationErrors
];

const validateUpdateCategory = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .trim(),
  body('slug')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (value && typeof value === 'string' && value.trim().length > 0) {
        if (!/^[a-z0-9-]+$/.test(value.trim())) {
          throw new Error('El slug solo puede contener letras minúsculas, números y guiones');
        }
        if (value.trim().length < 2 || value.trim().length > 100) {
          throw new Error('El slug debe tener entre 2 y 100 caracteres');
        }
      }
      return true;
    }),
  body('description')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres')
    .trim(),
  body('iconName')
    .optional({ nullable: true, checkFalsy: true })
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

const validateSearchCategory = [
  query('q')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: 2, max: 100 })
    .withMessage('El término de búsqueda debe tener entre 2 y 100 caracteres')
    .trim(),
  handleValidationErrors
];

const validatePaginationCategory = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entre 1 y 100'),
  query('search')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 })
    .withMessage('El término de búsqueda no puede exceder 100 caracteres')
    .trim(),
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'all'])
    .withMessage('El estado debe ser: active, inactive o all'),
  handleValidationErrors
];

const validateReorderCategories = [
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

// ===================================================================
// 🏷️ GESTIÓN DE MARCAS (/api/store/management/brands/*)
// ===================================================================

// Rutas de marcas
router.get('/brands', validatePaginationBrand, storeBrandController.getAllBrands);
router.get('/brands/stats', storeBrandController.getBrandStats);
router.get('/brands/search', validateSearchBrand, storeBrandController.searchBrands);
router.get('/brands/:id', [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  handleValidationErrors
], storeBrandController.getBrandById);
router.post('/brands', validateCreateBrand, storeBrandController.createBrand);
router.put('/brands/:id', [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  ...validateUpdateBrand
], storeBrandController.updateBrand);
router.delete('/brands/:id', [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  handleValidationErrors
], storeBrandController.deleteBrand);
router.put('/brands/:id/activate', [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  handleValidationErrors
], storeBrandController.activateBrand);

// ===================================================================
// 📂 GESTIÓN DE CATEGORÍAS (/api/store/management/categories/*)
// ===================================================================

// Rutas de categorías
router.get('/categories', validatePaginationCategory, storeCategoryController.getAllCategories);
router.get('/categories/stats', storeCategoryController.getCategoryStats);
router.get('/categories/search', validateSearchCategory, storeCategoryController.searchCategories);
router.put('/categories/reorder', validateReorderCategories, storeCategoryController.reorderCategories);
router.get('/categories/:id', [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  handleValidationErrors
], storeCategoryController.getCategoryById);
router.post('/categories', validateCreateCategory, storeCategoryController.createCategory);
router.put('/categories/:id', [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  ...validateUpdateCategory
], storeCategoryController.updateCategory);
router.delete('/categories/:id', [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  handleValidationErrors
], storeCategoryController.deleteCategory);
router.put('/categories/:id/activate', [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  handleValidationErrors
], storeCategoryController.activateCategory);

// ===================================================================
// 📦 GESTIÓN DE INVENTARIO (/api/store/management/products/*)
// ===================================================================

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

const validateStockUpdate = [
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

const validateBulkStockUpdate = [
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

const validateDuplicateProduct = [
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

// Rutas de inventario
router.get('/products', validateProductFilters, storeProductController.getAllProducts);
router.get('/products/stats', storeProductController.getProductStats);
router.get('/products/low-stock', storeProductController.getLowStockProducts);
router.put('/products/bulk-stock', validateBulkStockUpdate, storeProductController.bulkUpdateStock);
router.get('/products/:id', [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  handleValidationErrors
], storeProductController.getProductById);
router.post('/products', validateCreateProduct, storeProductController.createProduct);
router.put('/products/:id', [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  ...validateUpdateProduct
], storeProductController.updateProduct);
router.delete('/products/:id', [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  handleValidationErrors
], storeProductController.deleteProduct);
router.put('/products/:id/stock', [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  ...validateStockUpdate
], storeProductController.updateStock);
router.post('/products/:id/duplicate', [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  ...validateDuplicateProduct
], storeProductController.duplicateProduct);

// ===================================================================
// 🖼️ GESTIÓN DE IMÁGENES DE PRODUCTOS (/api/store/management/images/*)
// ===================================================================

// ✅ MANEJO DE ERRORES DE MULTER ESPECÍFICO PARA CLOUDINARY
const handleCloudinaryMulterError = (error, req, res, next) => {
  console.error('🔥 Error de Multer Cloudinary:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'El archivo es demasiado grande. Máximo 5MB para Cloudinary'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Demasiados archivos. Máximo 10'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Campo de archivo inesperado'
      });
    }
  }
  
  if (error.message && error.message.includes('Cloudinary')) {
    return res.status(500).json({
      success: false,
      message: 'Error de Cloudinary: ' + error.message
    });
  }
  
  if (error.message && error.message.includes('Solo se permiten imágenes')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  return res.status(500).json({
    success: false,
    message: 'Error al subir imagen',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
  });
};

const validateImageParams = [
  query('isPrimary')
    .optional()
    .isBoolean()
    .withMessage('isPrimary debe ser true o false'),
  query('altText')
    .optional()
    .isLength({ max: 255 })
    .withMessage('El texto alternativo no puede exceder 255 caracteres')
    .trim(),
  query('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El orden debe ser un número entero positivo'),
  handleValidationErrors
];

const validateUpdateImage = [
  body('altText')
    .optional()
    .isLength({ max: 255 })
    .withMessage('El texto alternativo no puede exceder 255 caracteres')
    .trim(),
  body('isPrimary')
    .optional()
    .isBoolean()
    .withMessage('isPrimary debe ser true o false'),
  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El orden debe ser un número entero positivo'),
  handleValidationErrors
];

const validateReorderImages = [
  body('imageOrders')
    .isArray({ min: 1 })
    .withMessage('Se requiere un array de órdenes de imágenes'),
  body('imageOrders.*.id')
    .isInt({ min: 1 })
    .withMessage('Cada elemento debe tener un ID válido'),
  body('imageOrders.*.displayOrder')
    .isInt({ min: 0 })
    .withMessage('Cada elemento debe tener un displayOrder válido'),
  handleValidationErrors
];

const validateProductId = [
  param('id').isInt({ min: 1 }).withMessage('El ID del producto debe ser un número entero positivo'),
  handleValidationErrors
];

const validateBothIds = [
  param('productId').isInt({ min: 1 }).withMessage('El ID del producto debe ser un número entero positivo'),
  param('imageId').isInt({ min: 1 }).withMessage('El ID de la imagen debe ser un número entero positivo'),
  handleValidationErrors
];

const checkProductExists = async (req, res, next) => {
  try {
    const productId = req.params.id || req.params.productId;
    const { StoreProduct } = require('../models');
    
    const product = await StoreProduct.findByPk(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    req.product = product;
    next();
  } catch (error) {
    console.error('Error verificando producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando producto',
      error: error.message
    });
  }
};

// ✅ RUTAS DE IMÁGENES USANDO CLOUDINARY CONFIGURADO
router.get('/products/:id/images', validateProductId, checkProductExists, storeImageController.getProductImages);

// ✅ SUBIDA INDIVIDUAL - USAR CONFIGURACIÓN DE CLOUDINARY EXISTENTE
router.post('/products/:id/images', 
  validateProductId,
  checkProductExists,
  validateImageParams,
  (req, res, next) => {
    console.log('🖼️ Iniciando subida de imagen a Cloudinary...');
    uploadProductImage.single('image')(req, res, (error) => {
      if (error) {
        console.error('❌ Error en middleware de Cloudinary:', error);
        return handleCloudinaryMulterError(error, req, res, next);
      }
      console.log('✅ Middleware de Cloudinary completado exitosamente');
      if (req.file) {
        console.log('📸 Archivo recibido:', {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          public_id: req.file.public_id,
          secure_url: req.file.secure_url
        });
      }
      next();
    });
  },
  storeImageController.uploadProductImage
);

// ✅ SUBIDA MÚLTIPLE - USAR CONFIGURACIÓN DE CLOUDINARY EXISTENTE
router.post('/products/:id/images/multiple',
  validateProductId,
  checkProductExists,
  (req, res, next) => {
    console.log('🖼️ Iniciando subida múltiple a Cloudinary...');
    uploadProductImage.array('images', 10)(req, res, (error) => {
      if (error) {
        console.error('❌ Error en middleware múltiple de Cloudinary:', error);
        return handleCloudinaryMulterError(error, req, res, next);
      }
      console.log('✅ Middleware múltiple de Cloudinary completado');
      if (req.files && req.files.length > 0) {
        console.log(`📸 ${req.files.length} archivos recibidos`);
        req.files.forEach((file, index) => {
          console.log(`   Archivo ${index + 1}:`, {
            originalname: file.originalname,
            size: file.size,
            public_id: file.public_id,
            secure_url: file.secure_url
          });
        });
      }
      next();
    });
  },
  storeImageController.uploadMultipleImages
);

router.put('/products/:productId/images/:imageId',
  validateBothIds,
  validateUpdateImage,
  storeImageController.updateProductImage
);
router.delete('/products/:productId/images/:imageId',
  validateBothIds,
  storeImageController.deleteProductImage
);
router.put('/products/:id/images/reorder',
  validateProductId,
  checkProductExists,
  validateReorderImages,
  storeImageController.reorderImages
);
router.put('/products/:productId/images/:imageId/primary',
  validateBothIds,
  storeImageController.setPrimaryImage
);
router.get('/images/stats', storeImageController.getImageStats);
router.delete('/images/cleanup', storeImageController.cleanupOrphanImages);

// ===================================================================
// 💰 GESTIÓN DE VENTAS Y ÓRDENES (/api/store/management/orders/*)
// ===================================================================

const validateOrderUpdate = [
  body('status')
    .optional()
    .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Estado de orden inválido'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Las notas no pueden exceder 500 caracteres')
    .trim(),
  handleValidationErrors
];

const validateOrderFilters = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entre 1 y 100'),
  query('status')
    .optional()
    .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'all'])
    .withMessage('Estado inválido'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de inicio inválida'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de fin inválida'),
  handleValidationErrors
];

// Rutas de ventas y órdenes
router.get('/orders', validateOrderFilters, storeController.getAllOrders);
router.get('/orders/stats', storeController.getOrderStats || ((req, res) => res.json({ success: true, message: 'Stats not implemented' })));
router.get('/orders/:id', [
  param('id').isInt({ min: 1 }).withMessage('El ID de la orden debe ser un número entero positivo'),
  handleValidationErrors
], storeController.getOrderById);
router.put('/orders/:id', [
  param('id').isInt({ min: 1 }).withMessage('El ID de la orden debe ser un número entero positivo'),
  ...validateOrderUpdate
], storeController.updateOrderStatus);
router.put('/orders/:id/cancel', [
  param('id').isInt({ min: 1 }).withMessage('El ID de la orden debe ser un número entero positivo'),
  handleValidationErrors
], storeController.cancelOrder || ((req, res) => res.json({ success: true, message: 'Cancel not implemented' })));

// ===================================================================
// 📊 DASHBOARD Y REPORTES (/api/store/management/dashboard)
// ===================================================================

const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de inicio inválida'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de fin inválida'),
  query('period')
    .optional()
    .isIn(['today', 'week', 'month', 'quarter', 'year'])
    .withMessage('Período inválido'),
  handleValidationErrors
];

router.get('/dashboard', validateDateRange, storeController.getStoreDashboard);
router.get('/reports/sales', validateDateRange, storeController.getSalesReport);
router.get('/reports/inventory', validateDateRange, storeController.getInventoryReport || ((req, res) => res.json({ success: true, message: 'Inventory report not implemented' })));
router.get('/reports/products-performance', validateDateRange, storeController.getProductsPerformance || ((req, res) => res.json({ success: true, message: 'Products performance not implemented' })));

// ===================================================================
// ⚙️ CONFIGURACIÓN Y UTILIDADES
// ===================================================================

router.get('/config', (req, res) => {
  res.json({
    success: true,
    message: 'Configuración de gestión de tienda',
    data: {
      maxFileSize: '5MB (Cloudinary)',
      allowedImageTypes: ['JPEG', 'PNG', 'WebP'],
      maxImagesPerProduct: 10,
      stockAlertThreshold: 10,
      cloudinary: {
        enabled: true,
        maxFileSize: '5MB',
        transformations: 'On-the-fly',
        storage: 'Cloud CDN'
      },
      features: {
        bulkOperations: true,
        imageManagement: true,
        inventoryTracking: true,
        salesReports: true,
        cloudinaryIntegration: true
      }
    }
  });
});

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Gestión de tienda funcionando correctamente',
    manager: req.user?.email,
    timestamp: new Date().toISOString(),
    modules: {
      brands: 'Active',
      categories: 'Active', 
      products: 'Active',
      images: 'Active (Cloudinary)',
      orders: 'Active',
      reports: 'Active'
    }
  });
});

// ===================================================================
// 🚨 MANEJO DE ERRORES ESPECÍFICO PARA GESTIÓN DE TIENDA
// ===================================================================

router.use((error, req, res, next) => {
  console.error('Error en gestión de tienda:', error);
  
  // Con Cloudinary no necesitamos limpiar archivos locales
  // ya que los archivos van directamente a la nube
  
  if (error.name === 'SequelizeUniqueConstraintError') {
    const field = error.errors[0]?.path;
    if (field === 'sku') {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un producto con ese SKU'
      });
    }
    if (field === 'slug') {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una categoría con ese slug'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'Ya existe un registro con esos datos'
    });
  }
  
  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Error de validación en base de datos',
      errors: error.errors.map(err => ({
        field: err.path,
        message: err.message
      }))
    });
  }
  
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Referencia inválida: el registro relacionado no existe'
    });
  }
  
  // Errores específicos de Cloudinary
  if (error.message && error.message.includes('Cloudinary')) {
    return res.status(500).json({
      success: false,
      message: 'Error de Cloudinary: ' + error.message
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Error interno en gestión de tienda',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
  });
});

module.exports = router;