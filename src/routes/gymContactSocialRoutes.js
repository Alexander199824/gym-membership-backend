// src/routes/gymContactSocialRoutes.js - RUTAS DE CONTACTO Y REDES SOCIALES
const express = require('express');
const gymContactSocialController = require('../controllers/gymContactSocialController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ✅ IMPORTAR Rate Limiter de forma segura
let generalLimiter;
try {
  const rateLimiterModule = require('../middleware/rateLimiter');
  generalLimiter = rateLimiterModule.generalLimiter || rateLimiterModule.developmentLimiter;
} catch (error) {
  console.warn('⚠️ Rate limiter no disponible, continuando sin límites');
  generalLimiter = (req, res, next) => next();
}

// Aplicar rate limiter si está disponible
if (generalLimiter && typeof generalLimiter === 'function') {
  router.use(generalLimiter);
}

// ✅ ==================== RUTAS DE CONTACTO ====================

/**
 * PUT /api/gym/contact
 * Actualizar información de contacto
 * Requiere: Admin
 */
router.put('/contact',
  authenticateToken,
  requireAdmin,
  gymContactSocialController.updateContactInfo
);

// ✅ ==================== RUTAS DE REDES SOCIALES ====================

/**
 * GET /api/gym/social-media/all
 * Obtener todas las redes sociales (incluyendo inactivas)
 * Requiere: Admin
 */
router.get('/social-media/all',
  authenticateToken,
  requireAdmin,
  gymContactSocialController.getAllSocialMedia
);

/**
 * GET /api/gym/social-media/:platform
 * Obtener una red social específica
 * Público
 */
router.get('/social-media/:platform',
  gymContactSocialController.getSocialMediaByPlatform
);

/**
 * POST /api/gym/social-media
 * Crear o actualizar una red social
 * Requiere: Admin
 */
router.post('/social-media',
  authenticateToken,
  requireAdmin,
  gymContactSocialController.createSocialMedia
);

/**
 * PUT /api/gym/social-media/:platform
 * Actualizar una red social existente
 * Requiere: Admin
 */
router.put('/social-media/:platform',
  authenticateToken,
  requireAdmin,
  gymContactSocialController.updateSocialMedia
);

/**
 * PATCH /api/gym/social-media/:platform/toggle
 * Activar/Desactivar una red social
 * Requiere: Admin
 */
router.patch('/social-media/:platform/toggle',
  authenticateToken,
  requireAdmin,
  gymContactSocialController.toggleSocialMedia
);

/**
 * DELETE /api/gym/social-media/:platform
 * Eliminar una red social
 * Requiere: Admin
 */
router.delete('/social-media/:platform',
  authenticateToken,
  requireAdmin,
  gymContactSocialController.deleteSocialMedia
);

/**
 * PUT /api/gym/social-media/reorder
 * Reordenar múltiples redes sociales
 * Requiere: Admin
 */
router.put('/social-media/reorder',
  authenticateToken,
  requireAdmin,
  gymContactSocialController.reorderSocialMedia
);

// ✅ ==================== DOCUMENTACIÓN ====================

/**
 * GET /api/gym/contact-social/endpoints
 * Obtener lista de endpoints disponibles
 */
router.get('/contact-social/endpoints', (req, res) => {
  res.json({
    success: true,
    message: 'Gym Contact & Social Media API - Endpoints disponibles',
    endpoints: {
      contact: {
        update: 'PUT /api/gym/contact'
      },
      socialMedia: {
        getAll: 'GET /api/gym/social-media/all (admin)',
        getOne: 'GET /api/gym/social-media/:platform',
        create: 'POST /api/gym/social-media',
        update: 'PUT /api/gym/social-media/:platform',
        toggle: 'PATCH /api/gym/social-media/:platform/toggle',
        delete: 'DELETE /api/gym/social-media/:platform',
        reorder: 'PUT /api/gym/social-media/reorder'
      }
    },
    validPlatforms: ['instagram', 'facebook', 'youtube', 'whatsapp', 'tiktok', 'twitter'],
    usage: {
      authentication: 'Todas las rutas de modificación requieren autenticación de admin',
      contactFields: [
        'phone', 'email', 'address', 'addressShort', 
        'city', 'country', 'mapsUrl', 'latitude', 'longitude'
      ],
      socialMediaFields: [
        'platform', 'url', 'handle', 'isActive', 'displayOrder'
      ]
    },
    examples: {
      updateContact: {
        method: 'PUT',
        endpoint: '/api/gym/contact',
        body: {
          phone: '+502 1234-5678',
          email: 'info@elitegym.com',
          address: 'Zona 10, Ciudad de Guatemala'
        }
      },
      createSocialMedia: {
        method: 'POST',
        endpoint: '/api/gym/social-media',
        body: {
          platform: 'instagram',
          url: 'https://instagram.com/elitegym',
          handle: '@elitegym',
          isActive: true
        }
      },
      toggleSocialMedia: {
        method: 'PATCH',
        endpoint: '/api/gym/social-media/instagram/toggle',
        body: {}
      }
    }
  });
});

module.exports = router;