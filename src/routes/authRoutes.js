// src/routes/authRoutes.js - ACTUALIZADO: Rutas con configuración OAuth mejorada
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

// ✅ NUEVO: Obtener configuración OAuth (público)
router.get('/oauth-config', authController.getOAuthConfig);

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

// ✅ VERIFICAR: Google OAuth (solo si está configurado)
const hasGoogleOAuth = 
  process.env.GOOGLE_CLIENT_ID && 
  process.env.GOOGLE_CLIENT_SECRET && 
  process.env.GOOGLE_CALLBACK_URL &&
  !process.env.GOOGLE_CLIENT_ID.startsWith('your_') &&
  passport.availableStrategies?.google;

if (hasGoogleOAuth) {
  console.log('✅ Habilitando rutas de Google OAuth');
  console.log(`   🔗 Callback URL: ${process.env.GOOGLE_CALLBACK_URL}`);
  console.log(`   🎯 Client ID: ${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...`);
  
  // ✅ Ruta para iniciar autenticación con Google
  router.get('/google',
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      prompt: 'select_account' // Permitir seleccionar cuenta
    })
  );

  // ✅ Callback de Google OAuth (mejorado)
  router.get('/google/callback',
    (req, res, next) => {
      console.log('📥 Recibiendo callback de Google OAuth...');
      next();
    },
    passport.authenticate('google', { 
      failureRedirect: `/auth/google-error?error=authentication_failed&timestamp=${Date.now()}`,
      session: false // No usar sesiones, solo JWT
    }),
    authController.googleCallback
  );

  // ✅ NUEVO: Ruta de éxito para manejar redirecciones del frontend
  router.get('/google-success', (req, res) => {
    // Esta ruta puede ser usada por el frontend para mostrar loading
    res.json({
      success: true,
      message: 'Autenticación con Google exitosa',
      redirect: true
    });
  });

  // ✅ NUEVO: Ruta de error para manejar fallos
  router.get('/google-error', (req, res) => {
    const { error, message } = req.query;
    res.status(400).json({
      success: false,
      message: message || 'Error en autenticación con Google',
      error: error || 'oauth_error',
      timestamp: req.query.timestamp
    });
  });

} else {
  console.warn('⚠️ Rutas de Google OAuth deshabilitadas');
  
  // ✅ Diagnóstico detallado
  if (!process.env.GOOGLE_CLIENT_ID) {
    console.warn('   ❌ GOOGLE_CLIENT_ID no configurado');
  } else if (process.env.GOOGLE_CLIENT_ID.startsWith('your_')) {
    console.warn('   ❌ GOOGLE_CLIENT_ID tiene valor placeholder');
  }
  
  if (!process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('   ❌ GOOGLE_CLIENT_SECRET no configurado');
  }
  
  if (!process.env.GOOGLE_CALLBACK_URL) {
    console.warn('   ❌ GOOGLE_CALLBACK_URL no configurado');
  }
  
  if (!passport.availableStrategies?.google) {
    console.warn('   ❌ Estrategia de Google no disponible en Passport');
  }
  
  // Rutas alternativas que informan que Google OAuth no está disponible
  router.get('/google', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Google OAuth no está configurado en este servidor',
      details: 'Contacta al administrador para configurar las credenciales de Google OAuth'
    });
  });

  router.get('/google/callback', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Google OAuth no está configurado en este servidor'
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

// ✅ ACTUALIZADO: Información sobre servicios disponibles
router.get('/services', (req, res) => {
  res.json({
    success: true,
    data: {
      googleOAuth: {
        enabled: hasGoogleOAuth,
        clientId: hasGoogleOAuth ? process.env.GOOGLE_CLIENT_ID : null,
        callbackUrl: hasGoogleOAuth ? process.env.GOOGLE_CALLBACK_URL : null
      },
      imageUpload: hasCloudinary,
      emailNotifications: process.env.NOTIFICATION_EMAIL_ENABLED === 'true',
      whatsappNotifications: process.env.NOTIFICATION_WHATSAPP_ENABLED === 'true',
      redirectUrls: {
        admin: process.env.FRONTEND_ADMIN_URL,
        client: process.env.FRONTEND_CLIENT_URL,
        default: process.env.FRONTEND_URL
      }
    }
  });
});

// ✅ NUEVO: Verificar estado de autenticación
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Token válido',
    data: {
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        name: req.user.getFullName()
      },
      isAuthenticated: true
    }
  });
});

module.exports = router;