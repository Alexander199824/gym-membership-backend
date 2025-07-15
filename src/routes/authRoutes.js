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

const router = express.Router();

// Verificar si Cloudinary está configurado
const hasCloudinary = 
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name';

// Importar configuración de upload solo si está disponible
let uploadProfileImage;
if (hasCloudinary) {
  const { uploadProfileImage: cloudinaryUpload } = require('../config/cloudinary');
  uploadProfileImage = cloudinaryUpload;
} else {
  // Middleware que rechaza uploads si Cloudinary no está configurado
  uploadProfileImage = {
    single: () => (req, res, next) => {
      return res.status(503).json({
        success: false,
        message: 'Servicio de imágenes no configurado. Contacta al administrador.'
      });
    }
  };
}

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

// Google OAuth (solo si está configurado)
const hasGoogleOAuth = passport.availableStrategies?.google;

if (hasGoogleOAuth) {
  console.log('✅ Habilitando rutas de Google OAuth');
  
  router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth/error' }),
    authController.googleCallback
  );
} else {
  console.warn('⚠️ Rutas de Google OAuth deshabilitadas');
  
  // Rutas alternativas que informan que Google OAuth no está disponible
  router.get('/google', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Google OAuth no configurado en este servidor'
    });
  });

  router.get('/google/callback', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Google OAuth no configurado en este servidor'
    });
  });
}

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

// Información sobre servicios disponibles
router.get('/services', (req, res) => {
  res.json({
    success: true,
    data: {
      googleOAuth: hasGoogleOAuth,
      imageUpload: hasCloudinary,
      emailNotifications: process.env.NOTIFICATION_EMAIL_ENABLED === 'true',
      whatsappNotifications: process.env.NOTIFICATION_WHATSAPP_ENABLED === 'true'
    }
  });
});

module.exports = router;