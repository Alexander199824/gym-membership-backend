// src/routes/membershipRoutes.js - CAMBIOS MÍNIMOS SEGUROS

const express = require('express');
const membershipController = require('../controllers/membershipController');
const { 
  createMembershipValidator, 
  updateMembershipValidator 
} = require('../validators/membershipValidators');
const { handleValidationErrors } = require('../middleware/validation');
const { authenticateToken, requireStaff } = require('../middleware/auth');

// ✅ NUEVO: Importar middleware de autorización
const { 
  authorizeClientOwnData, 
  authorizeResourceOwner, 
  requireAdmin 
} = require('../middleware/authorization');

const router = express.Router();

// ✅ RUTAS PÚBLICAS (sin cambios)
router.get('/plans', membershipController.getMembershipPlans);

// ✅ RUTAS QUE REQUIEREN AUTENTICACIÓN

// ✅ CAMBIO 1: Permitir a clientes ver sus propias membresías
router.get('/', 
  authenticateToken,
  authorizeClientOwnData, // ✅ NUEVO MIDDLEWARE - Esta es la corrección principal
  membershipController.getMemberships
);

// Obtener membresías vencidas (solo staff - sin cambios)
router.get('/expired', 
  authenticateToken,
  requireStaff,
  membershipController.getExpiredMemberships
);

// Obtener membresías próximas a vencer (solo staff - sin cambios)
router.get('/expiring-soon', 
  authenticateToken,
  requireStaff,
  membershipController.getExpiringSoon
);

// Obtener estadísticas de membresías (sin cambios)
router.get('/stats', 
  authenticateToken,
  membershipController.getMembershipStats
);

// Crear nueva membresía (solo staff - sin cambios)
router.post('/', 
  authenticateToken,
  requireStaff,
  createMembershipValidator,
  handleValidationErrors,
  membershipController.createMembership
);

// ✅ CAMBIO 2: Permitir a clientes ver sus propias membresías por ID
router.get('/:id', 
  authenticateToken,
  authorizeResourceOwner('Membership', 'id', 'userId'), // ✅ NUEVO MIDDLEWARE
  membershipController.getMembershipById
);

// Actualizar membresía (solo staff - sin cambios)
router.patch('/:id', 
  authenticateToken,
  requireStaff,
  updateMembershipValidator,
  handleValidationErrors,
  membershipController.updateMembership
);

// Renovar membresía (solo staff - sin cambios)
router.post('/:id/renew', 
  authenticateToken,
  requireStaff,
  membershipController.renewMembership
);

// Cancelar membresía (solo staff - sin cambios)
router.post('/:id/cancel', 
  authenticateToken,
  requireStaff,
  membershipController.cancelMembership
);

// ✅ CAMBIO 3: Permitir a clientes actualizar sus propios horarios
router.patch('/:id/schedule', 
  authenticateToken,
  authorizeResourceOwner('Membership', 'id', 'userId'), // ✅ NUEVO MIDDLEWARE
  membershipController.updateSchedule
);

module.exports = router;