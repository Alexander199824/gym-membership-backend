// src/routes/membershipPlansRoutes.js - Rutas COMPLETAS para CRUD de Planes de Membresía
const express = require('express');
const membershipPlansController = require('../controllers/membershipPlansController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { body, param, query } = require('express-validator');

const router = express.Router();

// ✅ Middleware de validación de errores
const handleValidationErrors = (req, res, next) => {
  try {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: errors.array()
      });
    }
    next();
  } catch (error) {
    next();
  }
};

// ✅ VALIDADORES
const createPlanValidator = [
  body('planName')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre del plan debe tener entre 3 y 100 caracteres'),
  
  body('price')
    .isNumeric()
    .custom(value => {
      if (parseFloat(value) <= 0) {
        throw new Error('El precio debe ser mayor a 0');
      }
      if (parseFloat(value) > 10000) {
        throw new Error('El precio no puede ser mayor a Q10,000');
      }
      return true;
    }),
  
  body('originalPrice')
    .optional()
    .isNumeric()
    .custom((value, { req }) => {
      if (value && parseFloat(value) <= parseFloat(req.body.price)) {
        throw new Error('El precio original debe ser mayor al precio actual');
      }
      return true;
    }),
  
  body('durationType')
    .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'annual'])
    .withMessage('Tipo de duración inválido'),
  
  body('features')
    .optional()
    .isArray()
    .withMessage('Las características deben ser un array'),
  
  body('features.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Cada característica debe ser un texto de máximo 200 caracteres'),
  
  body('isPopular')
    .optional()
    .isBoolean()
    .withMessage('isPopular debe ser true o false'),
  
  body('iconName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('El nombre del icono debe tener máximo 50 caracteres'),
  
  body('displayOrder')
    .optional()
    .isInt({ min: 0, max: 1000 })
    .withMessage('El orden de visualización debe estar entre 0 y 1000')
];

const updatePlanValidator = [
  body('planName')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre del plan debe tener entre 3 y 100 caracteres'),
  
  body('price')
    .optional()
    .isNumeric()
    .custom(value => {
      if (parseFloat(value) <= 0) {
        throw new Error('El precio debe ser mayor a 0');
      }
      if (parseFloat(value) > 10000) {
        throw new Error('El precio no puede ser mayor a Q10,000');
      }
      return true;
    }),
  
  body('originalPrice')
    .optional()
    .isNumeric()
    .custom((value, { req }) => {
      if (value && req.body.price && parseFloat(value) <= parseFloat(req.body.price)) {
        throw new Error('El precio original debe ser mayor al precio actual');
      }
      return true;
    }),
  
  body('durationType')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'annual'])
    .withMessage('Tipo de duración inválido'),
  
  body('features')
    .optional()
    .isArray()
    .withMessage('Las características deben ser un array'),
  
  body('features.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Cada característica debe ser un texto de máximo 200 caracteres'),
  
  body('isPopular')
    .optional()
    .isBoolean()
    .withMessage('isPopular debe ser true o false'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive debe ser true o false'),
  
  body('iconName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('El nombre del icono debe tener máximo 50 caracteres'),
  
  body('displayOrder')
    .optional()
    .isInt({ min: 0, max: 1000 })
    .withMessage('El orden de visualización debe estar entre 0 y 1000')
];

const planIdValidator = [
  param('id')
    .isInt()
    .withMessage('ID de plan inválido')
];

const queryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número mayor a 0'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe estar entre 1 and 100'),
  
  query('durationType')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'annual'])
    .withMessage('Tipo de duración inválido'),
  
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'all'])
    .withMessage('Estado inválido'),
  
  query('sortBy')
    .optional()
    .isIn(['planName', 'price', 'durationType', 'displayOrder', 'createdAt'])
    .withMessage('Campo de ordenamiento inválido'),
  
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Orden inválido')
];

// =============== RUTAS PÚBLICAS ===============

// ✅ Obtener planes activos (público)
router.get('/active', membershipPlansController.getActivePlans);

// =============== RUTAS ADMINISTRATIVAS ===============

// ✅ Obtener todos los planes con filtros (solo admin)
router.get('/',
  authenticateToken,
  requireAdmin,
  queryValidator,
  handleValidationErrors,
  membershipPlansController.getAllPlans
);

// ✅ Obtener estadísticas de planes (solo admin)
router.get('/stats',
  authenticateToken,
  requireAdmin,
  membershipPlansController.getPlansStats
);

// ✅ Crear nuevo plan (solo admin)
router.post('/',
  authenticateToken,
  requireAdmin,
  createPlanValidator,
  handleValidationErrors,
  membershipPlansController.createPlan
);

// ✅ Reordenar planes (solo admin)
router.patch('/reorder',
  authenticateToken,
  requireAdmin,
  [
    body('planOrders')
      .isArray({ min: 1 })
      .withMessage('Debe proporcionar un array de planOrders'),
    body('planOrders.*.id')
      .isInt()
      .withMessage('Cada elemento debe tener un id válido'),
    body('planOrders.*.displayOrder')
      .isInt({ min: 0 })
      .withMessage('Cada elemento debe tener un displayOrder válido')
  ],
  handleValidationErrors,
  membershipPlansController.reorderPlans
);

// =============== RUTAS POR ID (van al final para evitar conflictos) ===============

// ✅ Obtener plan por ID (solo admin)
router.get('/:id',
  authenticateToken,
  requireAdmin,
  planIdValidator,
  handleValidationErrors,
  membershipPlansController.getPlanById
);

// ✅ Actualizar plan (solo admin)
router.put('/:id',
  authenticateToken,
  requireAdmin,
  planIdValidator,
  updatePlanValidator,
  handleValidationErrors,
  membershipPlansController.updatePlan
);

// ✅ Activar/Desactivar plan (solo admin)
router.patch('/:id/toggle-status',
  authenticateToken,
  requireAdmin,
  planIdValidator,
  handleValidationErrors,
  membershipPlansController.togglePlanStatus
);

// ✅ Duplicar plan (solo admin)
router.post('/:id/duplicate',
  authenticateToken,
  requireAdmin,
  planIdValidator,
  [
    body('newName')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('El nuevo nombre debe tener entre 3 y 100 caracteres'),
    
    body('modifications')
      .optional()
      .isObject()
      .withMessage('Las modificaciones deben ser un objeto'),
    
    body('modifications.price')
      .optional()
      .isNumeric()
      .custom(value => {
        if (parseFloat(value) <= 0) {
          throw new Error('El precio debe ser mayor a 0');
        }
        return true;
      })
  ],
  handleValidationErrors,
  membershipPlansController.duplicatePlan
);

// ✅ Eliminar plan (solo admin) - va al final
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  planIdValidator,
  [
    body('force')
      .optional()
      .isBoolean()
      .withMessage('force debe ser true o false')
  ],
  handleValidationErrors,
  membershipPlansController.deletePlan
);

// =============== ENDPOINTS DE UTILIDAD ===============

// ✅ Verificar disponibilidad de nombre
router.post('/check-name-availability',
  authenticateToken,
  requireAdmin,
  [
    body('planName')
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('El nombre del plan debe tener entre 3 y 100 caracteres'),
    
    body('excludeId')
      .optional()
      .isInt()
      .withMessage('ID de exclusión inválido')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { planName, excludeId } = req.body;
      const { MembershipPlans } = require('../models');
      const { Op } = require('sequelize');

      const where = {
        planName: { [Op.iLike]: planName }
      };

      if (excludeId) {
        where.id = { [Op.ne]: excludeId };
      }

      const existingPlan = await MembershipPlans.findOne({ where });

      res.json({
        success: true,
        data: {
          planName,
          available: !existingPlan,
          conflictId: existingPlan ? existingPlan.id : null
        }
      });

    } catch (error) {
      console.error('Error verificando disponibilidad de nombre:', error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar disponibilidad del nombre',
        error: error.message
      });
    }
  }
);

// ✅ Obtener tipos de duración disponibles
router.get('/metadata/duration-types',
  (req, res) => {
    res.json({
      success: true,
      data: {
        durationTypes: [
          { value: 'daily', label: 'Diario', description: 'Acceso por un día' },
          { value: 'weekly', label: 'Semanal', description: 'Acceso por una semana' },
          { value: 'monthly', label: 'Mensual', description: 'Acceso por un mes' },
          { value: 'quarterly', label: 'Trimestral', description: 'Acceso por tres meses' },
          { value: 'annual', label: 'Anual', description: 'Acceso por un año' }
        ],
        defaultIcons: [
          'calendar', 'calendar-days', 'calendar-range', 'star', 'award', 
          'trophy', 'crown', 'gem', 'flame', 'zap'
        ]
      }
    });
  }
);

// =============== MIDDLEWARE DE MANEJO DE ERRORES ===============

// Manejo de rutas no encontradas específico para planes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint de planes de membresía no encontrado',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /api/membership-plans/active (público)',
      'GET /api/membership-plans (admin)',
      'POST /api/membership-plans (admin)',
      'GET /api/membership-plans/:id (admin)',
      'PUT /api/membership-plans/:id (admin)',
      'DELETE /api/membership-plans/:id (admin)',
      'PATCH /api/membership-plans/:id/toggle-status (admin)',
      'POST /api/membership-plans/:id/duplicate (admin)',
      'PATCH /api/membership-plans/reorder (admin)',
      'GET /api/membership-plans/stats (admin)'
    ]
  });
});

module.exports = router;