// src/routes/admin/imageRoutes.js - RUTAS COMPLETAS DE IMÁGENES
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const storeImageController = require('../../controllers/StoreImageController');
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

// ✅ CONFIGURACIÓN COMPLETA DE MULTER
const createMulterConfig = () => {
  const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadPath = path.join(process.cwd(), 'uploads', 'products');
      
      try {
        await fs.mkdir(uploadPath, { recursive: true });
        cb(null, uploadPath);
      } catch (error) {
        console.error('Error creando directorio de uploads:', error);
        cb(error, null);
      }
    },
    filename: (req, file, cb) => {
      const productId = req.params.id || req.params.productId;
      const timestamp = Date.now();
      const randomNum = Math.floor(Math.random() * 1000);
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `product_${productId}_${timestamp}_${randomNum}${ext}`;
      cb(null, filename);
    }
  });

  const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo JPEG, PNG y WebP'), false);
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
      files: 10 // Máximo 10 archivos
    }
  });
};

// ✅ INSTANCIA DE MULTER
const upload = createMulterConfig();

// ✅ MIDDLEWARE PARA MANEJAR ERRORES DE MULTER
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'El archivo es demasiado grande. Máximo 5MB'
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
  
  if (error.message === 'Tipo de archivo no permitido. Solo JPEG, PNG y WebP') {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

// ✅ VALIDACIONES PARA PARÁMETROS DE IMAGEN
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

// ✅ VALIDACIONES PARA ACTUALIZAR IMAGEN
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

// ✅ VALIDACIONES PARA REORDENAR
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

// ✅ VALIDACIONES DE IDS
const validateProductId = [
  param('id').isInt({ min: 1 }).withMessage('El ID del producto debe ser un número entero positivo'),
  handleValidationErrors
];

const validateBothIds = [
  param('productId').isInt({ min: 1 }).withMessage('El ID del producto debe ser un número entero positivo'),
  param('imageId').isInt({ min: 1 }).withMessage('El ID de la imagen debe ser un número entero positivo'),
  handleValidationErrors
];

// ✅ MIDDLEWARE PARA VERIFICAR QUE EL PRODUCTO EXISTE
const checkProductExists = async (req, res, next) => {
  try {
    const productId = req.params.id || req.params.productId;
    const { StoreProduct } = require('../../models');
    
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

// ✅ RUTAS DE IMÁGENES DE PRODUCTOS

// Obtener todas las imágenes de un producto
router.get('/products/:id/images', validateProductId, checkProductExists, storeImageController.getProductImages);

// Subir imagen individual
router.post('/products/:id/images', 
  validateProductId,
  checkProductExists,
  validateImageParams,
  upload.single('image'),
  handleMulterError,
  storeImageController.uploadProductImage
);

// Subir múltiples imágenes
router.post('/products/:id/images/multiple',
  validateProductId,
  checkProductExists,
  upload.array('images', 10),
  handleMulterError,
  storeImageController.uploadMultipleImages
);

// Actualizar imagen específica
router.put('/products/:productId/images/:imageId',
  validateBothIds,
  validateUpdateImage,
  storeImageController.updateProductImage
);

// Eliminar imagen específica
router.delete('/products/:productId/images/:imageId',
  validateBothIds,
  storeImageController.deleteProductImage
);

// Reordenar imágenes de un producto
router.put('/products/:id/images/reorder',
  validateProductId,
  checkProductExists,
  validateReorderImages,
  storeImageController.reorderImages
);

// Establecer imagen como primaria
router.put('/products/:productId/images/:imageId/primary',
  validateBothIds,
  storeImageController.setPrimaryImage
);

// ✅ RUTAS DE MANTENIMIENTO Y ESTADÍSTICAS

// Estadísticas de imágenes
router.get('/stats', storeImageController.getImageStats);

// Limpiar imágenes huérfanas
router.delete('/cleanup', storeImageController.cleanupOrphanImages);

// ✅ MIDDLEWARE DE MANEJO DE ERRORES ESPECÍFICO PARA IMÁGENES
router.use((error, req, res, next) => {
  console.error('Error en rutas de imágenes:', error);
  
  // Limpiar archivos subidos si hubo error
  if (req.file) {
    fs.unlink(req.file.path).catch(unlinkError => {
      console.error('Error eliminando archivo tras error:', unlinkError);
    });
  }
  
  if (req.files && Array.isArray(req.files)) {
    req.files.forEach(file => {
      fs.unlink(file.path).catch(unlinkError => {
        console.error('Error eliminando archivo tras error:', unlinkError);
      });
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
  
  if (error.code === 'ENOENT') {
    return res.status(404).json({
      success: false,
      message: 'Archivo no encontrado'
    });
  }
  
  if (error.code === 'ENOSPC') {
    return res.status(507).json({
      success: false,
      message: 'Espacio en disco insuficiente'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor en gestión de imágenes',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
  });
});

module.exports = router;