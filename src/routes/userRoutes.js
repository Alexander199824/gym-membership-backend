// src/routes/userRoutes.js
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

// Obtener todos los usuarios (con filtros)
router.get('/', 
  authenticateToken,
  requireStaff,
  getUsersValidator,
  handleValidationErrors,
  userController.getUsers
);

// Buscar usuarios (autocompletado)
router.get('/search', 
  authenticateToken,
  requireStaff,
  userController.searchUsers
);

// Obtener estadísticas de usuarios
router.get('/stats', 
  authenticateToken,
  requireAdmin,
  userController.getUserStats
);

// Obtener clientes que pagan por día frecuentemente
router.get('/frequent-daily-clients', 
  authenticateToken,
  requireStaff,
  userController.getFrequentDailyClients
);

// Crear usuario
router.post('/', 
  authenticateToken,
  requireStaff,
  createUserValidator,
  handleValidationErrors,
  userController.createUser
);

// Obtener usuario por ID
router.get('/:id', 
  authenticateToken,
  requireStaff,
  userIdValidator,
  handleValidationErrors,
  userController.getUserById
);

// Actualizar usuario
router.patch('/:id', 
  authenticateToken,
  requireStaff,
  updateUserValidator,
  handleValidationErrors,
  userController.updateUser
);

// Eliminar usuario (desactivar)
router.delete('/:id', 
  authenticateToken,
  requireAdmin,
  userIdValidator,
  handleValidationErrors,
  userController.deleteUser
);

module.exports = router;