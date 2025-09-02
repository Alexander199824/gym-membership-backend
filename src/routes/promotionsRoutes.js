// src/routes/promotionRoutes.js - REEMPLAZAR COMPLETO
const express = require('express');
const promotionController = require('../controllers/promotionController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// ✅ VALIDADORES EXPANDIDOS
const createPromotionValidator = [
  body('code')
    .isLength({ min: 3, max: 20 })
    .isAlphanumeric()
    .withMessage('Código debe tener 3-20 caracteres alfanuméricos'),
  body('name')
    .isLength({ min: 3, max: 100 })
    .withMessage('Nombre requerido (3-100 caracteres)'),
  body('type')
    .isIn([
      'percentage', 'fixed_amount', 'free_days', 'gift',
      'free_product', 'store_discount', 'service_access', 
      'event_invitation', 'upgrade_plan', 'combo_benefit'
    ])
    .withMessage('Tipo de promoción inválido'),
  body('value')
    .isFloat({ min: 0 })
    .withMessage('Valor debe ser positivo'),
  body('startDate')
    .isISO8601()
    .withMessage('Fecha de inicio inválida'),
  body('endDate')
    .isISO8601()
    .custom((endDate, { req }) => {
      if (new Date(endDate) <= new Date(req.body.startDate)) {
        throw new Error('Fecha de fin debe ser posterior a fecha de inicio');
      }
      return true;
    }),
  // Validaciones condicionales por tipo
  body('giftProductId')
    .if(body('type').equals('free_product'))
    .isInt({ min: 1 })
    .withMessage('Producto regalo requerido para tipo free_product'),
  body('storeDiscountPercent')
    .if(body('type').equals('store_discount'))
    .isFloat({ min: 0.01, max: 100 })
    .withMessage('Porcentaje de descuento requerido (0.01-100)'),
  body('serviceAccess')
    .if(body('type').equals('service_access'))
    .isArray({ min: 1 })
    .withMessage('Servicios requeridos para tipo service_access'),
  body('eventDetails')
    .if(body('type').equals('event_invitation'))
    .isObject()
    .withMessage('Detalles del evento requeridos'),
  body('upgradePlanId')
    .if(body('type').equals('upgrade_plan'))
    .isInt({ min: 1 })
    .withMessage('Plan de destino requerido para upgrade_plan'),
  body('comboBenefits')
    .if(body('type').equals('combo_benefit'))
    .isArray({ min: 1 })
    .withMessage('Beneficios combo requeridos')
];

const validateCodeValidator = [
  body('code')
    .notEmpty()
    .withMessage('Código promocional requerido'),
  body('planId')
    .isInt({ min: 1 })
    .withMessage('ID de plan requerido')
];

const validateRedeemValidator = [
  body('code')
    .notEmpty()
    .withMessage('Código promocional requerido')
];

const applyRedeemedValidator = [
  body('userPromotionId')
    .isUUID()
    .withMessage('ID de promoción canjeada requerido'),
  body('planId')
    .isInt({ min: 1 })
    .withMessage('ID de plan requerido')
];

// =============== RUTAS PARA ADMIN ===============

// Crear código promocional (solo admin) - CON VALIDACIÓN EXPANDIDA
router.post('/',
  authenticateToken,
  requireAdmin,
  createPromotionValidator,
  handleValidationErrors,
  promotionController.createPromotionCode
);

// Obtener códigos promocionales (admin)
router.get('/',
  authenticateToken,
  requireAdmin,
  promotionController.getPromotionCodes
);

// =============== RUTAS PARA USUARIOS ===============

// Validar código promocional
router.post('/validate',
  authenticateToken,
  validateCodeValidator,
  handleValidationErrors,
  promotionController.validatePromotionCode
);

// ✅ CANJEAR código promocional
router.post('/redeem',
  authenticateToken,
  validateRedeemValidator,
  handleValidationErrors,
  promotionController.redeemPromotionCode
);

// ✅ OBTENER mis promociones canjeadas
router.get('/my-redeemed',
  authenticateToken,
  promotionController.getMyRedeemedPromotions
);

// ✅ APLICAR promoción canjeada
router.post('/apply-redeemed',
  authenticateToken,
  applyRedeemedValidator,
  handleValidationErrors,
  promotionController.applyRedeemedPromotion
);

// =============== RUTAS PÚBLICAS DE CONSULTA ===============

// Tipos de promoción disponibles (para frontend)
router.get('/types', (req, res) => {
  res.json({
    success: true,
    data: {
      types: [
        {
          value: 'percentage',
          label: 'Descuento porcentual',
          description: 'Descuento basado en porcentaje del precio',
          icon: 'percentage',
          fields: ['value']
        },
        {
          value: 'fixed_amount',
          label: 'Descuento fijo',
          description: 'Descuento de cantidad fija en quetzales',
          icon: 'currency-dollar',
          fields: ['value']
        },
        {
          value: 'free_days',
          label: 'Días gratis',
          description: 'Días adicionales gratis en la membresía',
          icon: 'calendar-plus',
          fields: ['freeDays']
        },
        {
          value: 'gift',
          label: 'Membresía gratis',
          description: 'Membresía completamente gratuita',
          icon: 'gift',
          fields: []
        },
        {
          value: 'free_product',
          label: 'Producto gratis',
          description: 'Producto de regalo incluido',
          icon: 'shopping-bag',
          fields: ['giftProductId']
        },
        {
          value: 'store_discount',
          label: 'Descuento en tienda',
          description: 'Descuento porcentual en productos de la tienda',
          icon: 'shopping-cart',
          fields: ['storeDiscountPercent', 'storeDiscountDays']
        },
        {
          value: 'service_access',
          label: 'Servicios incluidos',
          description: 'Acceso a servicios premium sin costo',
          icon: 'star',
          fields: ['serviceAccess']
        },
        {
          value: 'event_invitation',
          label: 'Evento especial',
          description: 'Invitación a eventos exclusivos',
          icon: 'calendar-event',
          fields: ['eventDetails']
        },
        {
          value: 'upgrade_plan',
          label: 'Upgrade de plan',
          description: 'Upgrade automático a plan superior',
          icon: 'arrow-up',
          fields: ['upgradePlanId']
        },
        {
          value: 'combo_benefit',
          label: 'Combo especial',
          description: 'Múltiples beneficios combinados',
          icon: 'package',
          fields: ['comboBenefits', 'value']
        }
      ]
    }
  });
});

module.exports = router;