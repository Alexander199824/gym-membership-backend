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
const { authenticateToken } = require('../middleware/auth');
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