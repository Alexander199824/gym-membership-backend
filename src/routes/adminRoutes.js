// src/routes/adminRoutes.js - NUEVO: Rutas específicas de administración
const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// ✅ Verificar configuración de Cloudinary
const hasCloudinary = 
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name';

let uploadToCloudinary;
if (hasCloudinary) {
  try {
    const multer = require('multer');
    const { CloudinaryStorage } = require('multer-storage-cloudinary');
    const { cloudinary } = require('../config/cloudinary');

    // ✅ Storage para archivos generales del gym
    const generalStorage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'gym/general',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [
          { width: 1200, quality: 'auto:good' }
        ]
      }
    });

    uploadToCloudinary = multer({
      storage: generalStorage,
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Solo se permiten imágenes (JPG, PNG, WebP)'), false);
        }
      }
    });
  } catch (error) {
    console.warn('⚠️ Error al configurar upload para admin:', error.message);
    uploadToCloudinary = null;
  }
}

// ✅ Middleware de fallback si Cloudinary no está configurado
if (!uploadToCloudinary) {
  uploadToCloudinary = {
    single: () => (req, res, next) => {
      return res.status(503).json({
        success: false,
        message: 'Servicio de archivos no configurado. Configura Cloudinary para subir imágenes.'
      });
    }
  };
}

// ✅ Subir archivo general (logo, imágenes, etc.)
router.post('/upload', 
  authenticateToken,
  requireAdmin,
  uploadLimiter,
  uploadToCloudinary.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se recibió ningún archivo'
        });
      }

      res.json({
        success: true,
        message: 'Archivo subido exitosamente',
        data: {
          url: req.file.path,
          publicId: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size
        }
      });
    } catch (error) {
      console.error('Error al subir archivo:', error);
      res.status(500).json({
        success: false,
        message: 'Error al subir archivo',
        error: error.message
      });
    }
  }
);

// ✅ Eliminar archivo de Cloudinary
router.delete('/upload/:publicId', 
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      if (!hasCloudinary) {
        return res.status(503).json({
          success: false,
          message: 'Servicio de archivos no configurado'
        });
      }

      const { publicId } = req.params;
      const { deleteFile } = require('../config/cloudinary');
      
      const result = await deleteFile(publicId);
      
      if (result.success) {
        res.json({
          success: true,
          message: 'Archivo eliminado exitosamente'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Error al eliminar archivo',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error al eliminar archivo:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar archivo',
        error: error.message
      });
    }
  }
);

// ✅ Información del sistema
router.get('/system-info', 
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const systemInfo = {
        services: {
          cloudinary: hasCloudinary,
          email: process.env.EMAIL_USER && !process.env.EMAIL_USER.startsWith('your_'),
          whatsapp: process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID.startsWith('AC'),
          googleOAuth: process.env.GOOGLE_CLIENT_ID && !process.env.GOOGLE_CLIENT_ID.startsWith('your_')
        },
        database: {
          connected: true, // Si llegamos aquí, la DB está conectada
          timezone: 'UTC-6'
        },
        server: {
          nodeVersion: process.version,
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || 'development'
        }
      };

      res.json({
        success: true,
        data: systemInfo
      });
    } catch (error) {
      console.error('Error al obtener información del sistema:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener información del sistema',
        error: error.message
      });
    }
  }
);

module.exports = router;