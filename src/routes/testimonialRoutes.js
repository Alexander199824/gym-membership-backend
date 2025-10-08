// src/routes/testimonialRoutes.js - COMPLETO CON TODAS LAS RUTAS
const express = require('express');
const testimonialController = require('../controllers/testimonialController');
const { 
  createTestimonialValidator, 
  updateTestimonialValidator,
  adminTestimonialActionValidator
} = require('../validators/testimonialValidators');
const { handleValidationErrors } = require('../middleware/validation');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ========== RUTAS PÚBLICAS ==========

// Obtener testimonios activos (para frontend público)
router.get('/active', testimonialController.getActiveTestimonials);

// Obtener testimonios destacados
router.get('/featured', testimonialController.getFeaturedTestimonials);

// ========== RUTAS PARA CLIENTES AUTENTICADOS ==========

// Crear testimonio (clientes)
router.post('/', 
  authenticateToken,
  createTestimonialValidator,
  handleValidationErrors,
  testimonialController.createTestimony
);

// Ver mis testimonios
router.get('/my-testimonials', 
  authenticateToken,
  testimonialController.getMyTestimonials
);

// ========== RUTAS ADMINISTRATIVAS - GESTIÓN EXISTENTE ==========

// Ver testimonios pendientes de aprobación (debe ir antes de :id)
router.get('/pending', 
  authenticateToken,
  requireAdmin,
  testimonialController.getPendingTestimonials
);

// Estadísticas de testimonios (debe ir antes de :id)
router.get('/stats', 
  authenticateToken,
  requireAdmin,
  testimonialController.getTestimonialStats
);

// Ver testimonios para análisis (debe ir antes de :id)
router.get('/analysis', 
  authenticateToken,
  requireAdmin,
  testimonialController.getTestimonialsForAnalysis
);

// Listar TODOS los testimonios con filtros y paginación (debe ir antes de :id)
router.get('/all', 
  authenticateToken,
  requireAdmin,
  testimonialController.getAllTestimonials
);

// Aprobar testimonio
router.post('/:id/approve', 
  authenticateToken,
  requireAdmin,
  adminTestimonialActionValidator,
  handleValidationErrors,
  testimonialController.approveTestimony
);

// Marcar como no público (cliente no se entera)
router.post('/:id/mark-not-public', 
  authenticateToken,
  requireAdmin,
  testimonialController.markAsNotPublic
);

// ========== RUTAS ADMINISTRATIVAS - CRUD COMPLETO ==========

// Obtener testimonio por ID (Admin)
router.get('/:id/details', 
  authenticateToken,
  requireAdmin,
  testimonialController.getTestimonialById
);

// Crear testimonio (Admin) - Directamente aprobado
router.post('/admin/create', 
  authenticateToken,
  requireAdmin,
  updateTestimonialValidator,
  handleValidationErrors,
  testimonialController.createTestimonialAdmin
);

// Actualizar testimonio (Admin)
router.put('/:id', 
  authenticateToken,
  requireAdmin,
  updateTestimonialValidator,
  handleValidationErrors,
  testimonialController.updateTestimonial
);

// Eliminar testimonio (Admin)
router.delete('/:id', 
  authenticateToken,
  requireAdmin,
  testimonialController.deleteTestimonial
);

// Toggle activo/inactivo (Admin)
router.patch('/:id/toggle-active', 
  authenticateToken,
  requireAdmin,
  testimonialController.toggleActive
);

// Toggle destacado (Admin)
router.patch('/:id/toggle-featured', 
  authenticateToken,
  requireAdmin,
  testimonialController.toggleFeatured
);

// Reordenar testimonios (Admin)
router.put('/reorder/batch', 
  authenticateToken,
  requireAdmin,
  testimonialController.reorderTestimonials
);

module.exports = router;