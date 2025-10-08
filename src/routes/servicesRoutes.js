// src/routes/servicesRoutes.js - CRUD COMPLETO de servicios

const express = require('express');
const servicesController = require('../controllers/servicesController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { body, param } = require('express-validator');

const router = express.Router();

// ✅ IMPORTAR Rate Limiter de forma segura
let developmentLimiter;
try {
  const rateLimiterModule = require('../middleware/rateLimiter');
  developmentLimiter = rateLimiterModule.developmentLimiter || rateLimiterModule.generalLimiter;
} catch (error) {
  console.warn('⚠️ Rate limiter no disponible, continuando sin límites');
  developmentLimiter = (req, res, next) => next();
}

// ✅ APLICAR Rate Limiter solo si está disponible
if (developmentLimiter && typeof developmentLimiter === 'function') {
  router.use(developmentLimiter);
}

// ============================================================
// VALIDACIONES
// ============================================================

// Validaciones para crear/actualizar servicio
const serviceValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('El título es obligatorio')
    .isLength({ min: 3, max: 255 })
    .withMessage('El título debe tener entre 3 y 255 caracteres'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('La descripción no puede exceder 2000 caracteres'),
  
  body('iconName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('El nombre del icono no puede exceder 50 caracteres')
    .matches(/^[a-z0-9-]+$/i)
    .withMessage('El nombre del icono solo puede contener letras, números y guiones'),
  
  body('imageUrl')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La URL de la imagen no puede exceder 500 caracteres'),
  
  body('features')
    .optional()
    .isArray()
    .withMessage('Las características deben ser un array'),
  
  body('features.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Cada característica debe tener entre 1 y 500 caracteres'),
  
  body('displayOrder')
    .optional()
    .isInt({ min: 0, max: 9999 })
    .withMessage('El orden debe ser un número entre 0 y 9999'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive debe ser true o false')
];

// Validación de ID
const idValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID inválido')
];

// Validación de reorden
const reorderValidation = [
  body('services')
    .isArray({ min: 1 })
    .withMessage('Se requiere un array de servicios'),
  
  body('services.*.id')
    .isInt({ min: 1 })
    .withMessage('Cada servicio debe tener un ID válido'),
  
  body('services.*.displayOrder')
    .isInt({ min: 0 })
    .withMessage('Cada servicio debe tener un displayOrder válido')
];

// ============================================================
// RUTAS PÚBLICAS (sin autenticación)
// ============================================================

// GET /api/services/active - Obtener servicios activos (para el frontend)
router.get('/active', servicesController.getActiveServices);

// ============================================================
// RUTAS ADMINISTRATIVAS (requieren autenticación + admin)
// ============================================================

// GET /api/services - Obtener todos los servicios (incluyendo inactivos)
router.get('/',
  authenticateToken,
  requireAdmin,
  servicesController.getAllServices
);

// GET /api/services/stats - Estadísticas de servicios
router.get('/stats',
  authenticateToken,
  requireAdmin,
  servicesController.getServicesStats
);

// GET /api/services/:id - Obtener servicio por ID
router.get('/:id',
  authenticateToken,
  requireAdmin,
  idValidation,
  servicesController.getServiceById
);

// POST /api/services - Crear nuevo servicio
router.post('/',
  authenticateToken,
  requireAdmin,
  serviceValidation,
  servicesController.createService
);

// PUT /api/services/:id - Actualizar servicio
router.put('/:id',
  authenticateToken,
  requireAdmin,
  idValidation,
  serviceValidation,
  servicesController.updateService
);

// DELETE /api/services/:id - Eliminar servicio
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  idValidation,
  servicesController.deleteService
);

// PATCH /api/services/:id/toggle - Activar/Desactivar servicio
router.patch('/:id/toggle',
  authenticateToken,
  requireAdmin,
  idValidation,
  servicesController.toggleServiceStatus
);

// POST /api/services/:id/duplicate - Duplicar servicio
router.post('/:id/duplicate',
  authenticateToken,
  requireAdmin,
  idValidation,
  servicesController.duplicateService
);

// PUT /api/services/reorder - Reordenar servicios
router.put('/reorder',
  authenticateToken,
  requireAdmin,
  reorderValidation,
  servicesController.reorderServices
);

// POST /api/services/seed/defaults - Crear servicios por defecto
router.post('/seed/defaults',
  authenticateToken,
  requireAdmin,
  servicesController.seedDefaultServices
);

// ============================================================
// DOCUMENTACIÓN DE LA API
// ============================================================

/**
 * @swagger
 * /api/services/active:
 *   get:
 *     summary: Obtener servicios activos
 *     description: Endpoint público que devuelve todos los servicios activos para mostrar en el frontend
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: Lista de servicios activos
 *       500:
 *         description: Error del servidor
 */

/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: Obtener todos los servicios (Admin)
 *     description: Devuelve todos los servicios incluyendo los inactivos
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista completa de servicios
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso denegado
 */

/**
 * @swagger
 * /api/services:
 *   post:
 *     summary: Crear nuevo servicio (Admin)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               iconName:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *               displayOrder:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Servicio creado exitosamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 */

module.exports = router;