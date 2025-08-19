// src/routes/testimonialRoutes.js - NUEVO ARCHIVO
const express = require('express');
const testimonialController = require('../controllers/testimonialController');
const { 
  createTestimonialValidator, 
  updateTestimonialValidator 
} = require('../validators/testimonialValidators');
const { handleValidationErrors } = require('../middleware/validation');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ✅ ========== RUTAS PARA CLIENTES ==========

// 📝 Crear testimonio (solo clientes autenticados)
router.post('/', 
  authenticateToken,
  createTestimonialValidator,
  handleValidationErrors,
  testimonialController.createTestimony
);

// 👀 Ver mis testimonios (solo los publicados)
router.get('/my-testimonials', 
  authenticateToken,
  testimonialController.getMyTestimonials
);

// ✅ ========== RUTAS PARA ADMINISTRADORES ==========

// 📋 Ver testimonios pendientes de aprobación
router.get('/pending', 
  authenticateToken,
  requireAdmin,
  testimonialController.getPendingTestimonials
);

// ✅ Aprobar testimonio
router.post('/:id/approve', 
  authenticateToken,
  requireAdmin,
  testimonialController.approveTestimony
);

// 📝 Marcar como no público (cliente no se entera)
router.post('/:id/mark-not-public', 
  authenticateToken,
  requireAdmin,
  testimonialController.markAsNotPublic
);

// 📊 Ver testimonios no publicados (para análisis del negocio)
router.get('/analysis', 
  authenticateToken,
  requireAdmin,
  testimonialController.getTestimonialsForAnalysis
);

// 📈 Estadísticas de testimonios
router.get('/stats', 
  authenticateToken,
  requireAdmin,
  testimonialController.getTestimonialStats
);

module.exports = router;