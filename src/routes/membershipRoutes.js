// src/routes/membershipRoutes.js - CORREGIDO: Clientes protegidos, colaboradores habilitados

const express = require('express');
const membershipController = require('../controllers/membershipController');
const { 
  createMembershipValidator, 
  updateMembershipValidator 
} = require('../validators/membershipValidators');
const { handleValidationErrors } = require('../middleware/validation');
const { authenticateToken, requireStaff } = require('../middleware/auth');

const router = express.Router();

// ✅ RUTAS PÚBLICAS (sin cambios)
router.get('/plans', membershipController.getMembershipPlans);

// ✅ RUTAS QUE REQUIEREN AUTENTICACIÓN

// ✅ CORREGIDO: Cliente puede ver SUS membresías, staff ve según permisos
// Nota: El filtrado específico se hace en el controlador
router.get('/', 
  authenticateToken,
  // ✅ Permitir a clientes acceso - el controlador filtra por userId para clientes
  membershipController.getMemberships
);

// ✅ CORREGIDO: Solo STAFF puede ver membresías vencidas - CLIENTES NO PUEDEN
router.get('/expired', 
  authenticateToken,
  requireStaff, // ✅ Solo admin y colaborador - CLIENTES EXCLUIDOS
  membershipController.getExpiredMemberships
);

// ✅ CORREGIDO: Solo STAFF puede ver membresías próximas a vencer - CLIENTES NO PUEDEN
router.get('/expiring-soon', 
  authenticateToken,
  requireStaff, // ✅ Solo admin y colaborador - CLIENTES EXCLUIDOS
  membershipController.getExpiringSoon
);

// ✅ CORREGIDO: Solo STAFF puede ver estadísticas - CLIENTES NO PUEDEN
router.get('/stats', 
  authenticateToken,
  requireStaff, // ✅ Solo admin y colaborador - CLIENTES EXCLUIDOS
  membershipController.getMembershipStats
);

// ✅ Solo STAFF puede crear membresías (sin cambios)
router.post('/', 
  authenticateToken,
  requireStaff, // ✅ Solo admin y colaborador - CLIENTES NO PUEDEN CREAR
  createMembershipValidator,
  handleValidationErrors,
  membershipController.createMembership
);

// ✅ CORREGIDO: Cliente puede ver SUS membresías por ID, staff ve según permisos
router.get('/:id', 
  authenticateToken,
  // ✅ Permitir a clientes acceso - validación específica en controlador
  membershipController.getMembershipById
);

// ✅ CORREGIDO: Solo STAFF puede actualizar membresías - CLIENTES NO PUEDEN
router.patch('/:id', 
  authenticateToken,
  requireStaff, // ✅ Solo admin y colaborador - CLIENTES NO PUEDEN MODIFICAR
  updateMembershipValidator,
  handleValidationErrors,
  membershipController.updateMembership
);

// ✅ CORREGIDO: Solo STAFF puede renovar membresías - CLIENTES NO PUEDEN
router.post('/:id/renew', 
  authenticateToken,
  requireStaff, // ✅ Solo admin y colaborador - CLIENTES NO PUEDEN RENOVAR
  membershipController.renewMembership
);

// ✅ CORREGIDO: Solo STAFF puede cancelar membresías - CLIENTES NO PUEDEN
router.post('/:id/cancel', 
  authenticateToken,
  requireStaff, // ✅ Solo admin y colaborador - CLIENTES NO PUEDEN CANCELAR
  membershipController.cancelMembership
);

// ✅ CORREGIDO: Cliente puede actualizar horarios de SUS membresías, staff según permisos
router.patch('/:id/schedule', 
  authenticateToken,
  // ✅ Permitir a clientes acceso - validación específica en controlador
  membershipController.updateSchedule
);

module.exports = router;