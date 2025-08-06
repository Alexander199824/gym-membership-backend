// src/routes/userRoutes.js - CORREGIDO: Clientes protegidos, colaboradores habilitados
const express = require('express');
const userController = require('../controllers/userController');
const { 
  updateUserValidator, 
  getUsersValidator, 
  userIdValidator,
  createUserValidator
} = require('../validators/userValidators');
const { handleValidationErrors } = require('../middleware/validation');
const { authenticateToken, requireAdmin, requireStaff } = require('../middleware/auth');

const router = express.Router();

// ✅ CORREGIDO: Solo STAFF puede ver lista de usuarios (colaborador ve solo clientes)
// Los CLIENTES NO pueden acceder a esta ruta (como estaba antes)
router.get('/', 
  authenticateToken,
  requireStaff, // ✅ Solo admin y colaborador - CLIENTES EXCLUIDOS
  getUsersValidator,
  handleValidationErrors,
  userController.getUsers
);

// ✅ CORREGIDO: Solo STAFF puede buscar usuarios - CLIENTES NO PUEDEN
router.get('/search', 
  authenticateToken,
  requireStaff, // ✅ Solo admin y colaborador - CLIENTES EXCLUIDOS
  userController.searchUsers
);

// ✅ CORREGIDO: Solo STAFF puede ver estadísticas - CLIENTES NO PUEDEN
router.get('/stats', 
  authenticateToken,
  requireStaff, // ✅ Solo admin y colaborador - CLIENTES EXCLUIDOS  
  userController.getUserStats
);

// ✅ Solo STAFF puede ver clientes frecuentes (sin cambios)
router.get('/frequent-daily-clients', 
  authenticateToken,
  requireStaff, // ✅ Solo admin y colaborador - CLIENTES EXCLUIDOS
  userController.getFrequentDailyClients
);

// ✅ Solo STAFF puede crear usuarios (sin cambios)
router.post('/', 
  authenticateToken,
  requireStaff, // ✅ Solo admin y colaborador - CLIENTES NO PUEDEN CREAR USUARIOS
  createUserValidator,
  handleValidationErrors,
  userController.createUser
);

// ✅ CORREGIDO: Cliente puede ver SU PROPIO perfil por ID, staff puede ver según permisos
router.get('/:id', 
  authenticateToken,
  // ✅ CORREGIDO: Permitir a clientes acceso - validación específica en controlador
  userIdValidator,
  handleValidationErrors,
  userController.getUserById
);

// ✅ Solo ADMIN puede actualizar usuarios (colaboradores y clientes NO pueden)
router.patch('/:id', 
  authenticateToken,
  requireAdmin, // ✅ SOLO ADMIN - colaboradores y clientes NO pueden modificar usuarios
  updateUserValidator,
  handleValidationErrors,
  userController.updateUser
);

// ✅ Solo ADMIN puede eliminar usuarios (sin cambios)
router.delete('/:id', 
  authenticateToken,
  requireAdmin, // ✅ SOLO ADMIN
  userIdValidator,
  handleValidationErrors,
  userController.deleteUser
);

module.exports = router;