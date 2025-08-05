// src/routes/authRoutes.js - ACTUALIZADO: Con endpoints específicos para clientes
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

// ✅ ========== NUEVOS ENDPOINTS ESPECÍFICOS PARA CLIENTES ==========

// 🎫 Mis Membresías - Cliente puede ver sus propias membresías
router.get('/my-memberships', authenticateToken, async (req, res) => {
  try {
    const { Membership } = require('../models');
    const { user } = req;
    
    // Buscar membresías del usuario autenticado
    const memberships = await Membership.findAll({
      where: { userId: user.id },
      include: [
        { 
          association: 'registeredByUser', 
          attributes: ['id', 'firstName', 'lastName'] 
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: {
        memberships,
        pagination: { total: memberships.length }
      }
    });
  } catch (error) {
    console.error('Error al obtener membresías del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener membresías',
      error: error.message
    });
  }
});

// 💰 Mis Pagos - Cliente puede ver su historial de pagos
router.get('/my-payments', authenticateToken, async (req, res) => {
  try {
    const { Payment } = require('../models');
    const { user } = req;
    const { limit = 10, page = 1 } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Buscar pagos del usuario autenticado
    const { count, rows } = await Payment.findAndCountAll({
      where: { userId: user.id },
      include: [
        { 
          association: 'membership', 
          attributes: ['id', 'type', 'endDate'] 
        },
        { 
          association: 'registeredByUser', 
          attributes: ['id', 'firstName', 'lastName'] 
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['paymentDate', 'DESC']]
    });
    
    res.json({
      success: true,
      data: {
        payments: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener pagos del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pagos',
      error: error.message
    });
  }
});

// 🛍️ Mi Carrito - Cliente puede ver su carrito
router.get('/my-cart', authenticateToken, async (req, res) => {
  try {
    const { CartItem } = require('../models');
    const { user } = req;
    
    // Buscar items del carrito del usuario
    const cartItems = await CartItem.findAll({
      where: { userId: user.id },
      include: [
        {
          association: 'product',
          include: [
            { association: 'category' },
            { association: 'brand' },
            { association: 'images' }
          ]
        }
      ]
    });
    
    // Calcular resumen del carrito
    const summary = {
      itemsCount: cartItems.length,
      subtotal: cartItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
      taxAmount: 0, // Calcular si es necesario (12% IVA en Guatemala)
      shippingAmount: 0,
      totalAmount: 0
    };
    
    // Calcular impuestos si es necesario
    summary.taxAmount = summary.subtotal * 0.12; // 12% IVA Guatemala
    summary.totalAmount = summary.subtotal + summary.taxAmount + summary.shippingAmount;
    
    res.json({
      success: true,
      data: {
        cartItems,
        summary
      }
    });
  } catch (error) {
    console.error('Error al obtener carrito del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener carrito',
      error: error.message
    });
  }
});

// 📦 Mis Órdenes de Tienda - Cliente puede ver sus órdenes
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    const { StoreOrder } = require('../models');
    const { user } = req;
    const { limit = 10, page = 1 } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Buscar órdenes del usuario autenticado
    const { count, rows } = await StoreOrder.findAndCountAll({
      where: { userId: user.id },
      include: [
        {
          association: 'items',
          include: [{ association: 'product' }]
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: {
        orders: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener órdenes del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener órdenes',
      error: error.message
    });
  }
});

// 📅 Mi Horario - Cliente puede ver/actualizar su horario
router.get('/my-schedule', authenticateToken, async (req, res) => {
  try {
    const { UserWorkoutSchedule } = require('../models');
    const { user } = req;
    
    // Buscar horarios del usuario autenticado
    const schedules = await UserWorkoutSchedule.findAll({
      where: { userId: user.id },
      order: [
        ['dayOfWeek', 'ASC'],
        ['preferredStartTime', 'ASC']
      ]
    });
    
    res.json({
      success: true,
      data: { schedules }
    });
  } catch (error) {
    console.error('Error al obtener horario del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener horario',
      error: error.message
    });
  }
});

// ✅ ========== FIN NUEVOS ENDPOINTS ==========

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
      },
      clientEndpoints: {
        myMemberships: '/api/auth/my-memberships',
        myPayments: '/api/auth/my-payments',
        myCart: '/api/auth/my-cart',
        myOrders: '/api/auth/my-orders',
        mySchedule: '/api/auth/my-schedule'
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