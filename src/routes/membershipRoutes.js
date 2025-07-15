// src/routes/membershipRoutes.js
const express = require('express');
const membershipController = require('../controllers/membershipController');
const { 
  createMembershipValidator, 
  updateMembershipValidator 
} = require('../validators/membershipValidators');
const { handleValidationErrors } = require('../middleware/validation');
const { authenticateToken, requireStaff } = require('../middleware/auth');

const router = express.Router();

// Obtener todas las membresías
router.get('/', 
  authenticateToken,
  requireStaff,
  membershipController.getMemberships
);

// Obtener membresías vencidas
router.get('/expired', 
  authenticateToken,
  requireStaff,
  membershipController.getExpiredMemberships
);

// Obtener membresías próximas a vencer
router.get('/expiring-soon', 
  authenticateToken,
  requireStaff,
  membershipController.getExpiringSoon
);

// Obtener estadísticas de membresías
router.get('/stats', 
  authenticateToken,
  membershipController.getMembershipStats
);

// Crear nueva membresía
router.post('/', 
  authenticateToken,
  requireStaff,
  createMembershipValidator,
  handleValidationErrors,
  membershipController.createMembership
);

// Obtener membresía por ID
router.get('/:id', 
  authenticateToken,
  requireStaff,
  membershipController.getMembershipById
);

// Actualizar membresía
router.patch('/:id', 
  authenticateToken,
  requireStaff,
  updateMembershipValidator,
  handleValidationErrors,
  membershipController.updateMembership
);

// Renovar membresía
router.post('/:id/renew', 
  authenticateToken,
  requireStaff,
  membershipController.renewMembership
);

// Cancelar membresía
router.post('/:id/cancel', 
  authenticateToken,
  requireStaff,
  membershipController.cancelMembership
);

// Actualizar horarios de una membresía
router.patch('/:id/schedule', 
  authenticateToken,
  membershipController.updateSchedule
);

module.exports = router;