// src/routes/authRoutes.js
const express = require('express');
const passport = require('passport');
const authController = require('../controllers/authController');
const { 
  registerValidator, 
  loginValidator, 
  updateProfileValidator 
} = require('../validators/authValidators');
const { handleValidationErrors } = require('../middleware/validation');
const { authenticateToken, requireStaff } = require('../middleware/auth');
const { authLimiter, uploadLimiter } = require('../middleware/rateLimiter');
const { uploadProfileImage } = require('../config/cloudinary');

const router = express.Router();

// Registro de usuario
router.post('/register', 
  authLimiter,
  registerValidator,
  handleValidationErrors,
  authController.register
);

// Login con credenciales
router.post('/login', 
  authLimiter,
  loginValidator,
  handleValidationErrors,
  authController.login
);

// Google OAuth
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/error' }),
  authController.googleCallback
);

// Obtener perfil del usuario actual
router.get('/profile', 
  authenticateToken, 
  authController.getProfile
);

// Actualizar perfil
router.patch('/profile', 
  authenticateToken,
  updateProfileValidator,
  handleValidationErrors,
  authController.updateProfile
);

// Subir imagen de perfil
router.post('/profile/image', 
  authenticateToken,
  uploadLimiter,
  uploadProfileImage.single('image'),
  authController.uploadProfileImage
);

// Cambiar contraseña
router.patch('/change-password', 
  authenticateToken,
  authController.changePassword
);

// Refresh token
router.post('/refresh-token', 
  authController.refreshToken
);

// Logout
router.post('/logout', 
  authenticateToken,
  authController.logout
);

module.exports = router;

// src/routes/userRoutes.js
const express = require('express');
const userController = require('../controllers/userController');
const { 
  updateUserValidator, 
  getUsersValidator, 
  userIdValidator 
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
  updateUserValidator.slice(1), // Usar las mismas validaciones excepto el param
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

// src/routes/membershipRoutes.js
const express = require('express');
const membershipController = require('../controllers/membershipController');
const { 
  createMembershipValidator, 
  updateMembershipValidator 
} = require('../validators/membershipValidators');
const { handleValidationErrors } = require('../middleware/validation');
const { authenticateToken, requireStaff, requireSameUserOrAdmin } = require('../middleware/auth');

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

// src/routes/paymentRoutes.js
const express = require('express');
const paymentController = require('../controllers/paymentController');
const { 
  createPaymentValidator, 
  validateTransferValidator,
  dailyIncomeValidator 
} = require('../validators/paymentValidators');
const { handleValidationErrors } = require('../middleware/validation');
const { authenticateToken, requireStaff, requireAdmin } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { uploadTransferProof } = require('../config/cloudinary');

const router = express.Router();

// Obtener todos los pagos
router.get('/', 
  authenticateToken,
  requireStaff,
  paymentController.getPayments
);

// Obtener transferencias pendientes
router.get('/transfers/pending', 
  authenticateToken,
  requireStaff,
  paymentController.getPendingTransfers
);

// Obtener reportes de pagos
router.get('/reports', 
  authenticateToken,
  requireAdmin,
  paymentController.getPaymentReports
);

// Crear nuevo pago
router.post('/', 
  authenticateToken,
  requireStaff,
  createPaymentValidator,
  handleValidationErrors,
  paymentController.createPayment
);

// Registrar ingresos diarios totales
router.post('/daily-income', 
  authenticateToken,
  requireStaff,
  dailyIncomeValidator,
  handleValidationErrors,
  paymentController.registerDailyIncome
);

// Obtener pago por ID
router.get('/:id', 
  authenticateToken,
  requireStaff,
  paymentController.getPaymentById
);

// Subir comprobante de transferencia
router.post('/:id/transfer-proof', 
  authenticateToken,
  uploadLimiter,
  uploadTransferProof.single('proof'),
  paymentController.uploadTransferProof
);

// Validar transferencia
router.post('/:id/validate-transfer', 
  authenticateToken,
  requireAdmin,
  validateTransferValidator,
  handleValidationErrors,
  paymentController.validateTransfer
);

module.exports = router;

// src/routes/index.js - Archivo principal de rutas
const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const membershipRoutes = require('./membershipRoutes');
const paymentRoutes = require('./paymentRoutes');

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Rutas de la API
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/memberships', membershipRoutes);
router.use('/payments', paymentRoutes);

// Ruta para manejo de 404
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

module.exports = router;