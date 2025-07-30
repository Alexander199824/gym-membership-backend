// src/routes/gymMediaRoutes.js - RUTAS UNIFICADAS DE MULTIMEDIA
const express = require('express');
const gymMediaController = require('../controllers/gymMediaController');
const { authenticateToken, requireAdmin, requireStaff } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// ✅ Verificar configuración de Cloudinary
const hasCloudinary = 
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name';

// ✅ Configurar diferentes storages según el tipo de archivo
let uploads = {};

if (hasCloudinary) {
  try {
    const multer = require('multer');
    const { CloudinaryStorage } = require('multer-storage-cloudinary');
    const { cloudinary } = require('../config/cloudinary');

    // ✅ STORAGE PARA LOGO DEL GYM
    const logoStorage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'gym/logos',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
        transformation: [
          { width: 400, height: 200, crop: 'fit', quality: 'auto:good' }
        ]
      }
    });

    uploads.logo = multer({
      storage: logoStorage,
      limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Solo se permiten imágenes para logo (JPG, PNG, WebP, SVG)'), false);
        }
      }
    });

    // ✅ STORAGE PARA VIDEOS HERO
    const heroVideoStorage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'gym/hero-videos',
        resource_type: 'video',
        allowed_formats: ['mp4', 'webm', 'mov', 'avi'],
        transformation: [
          { width: 1920, height: 1080, crop: 'limit', quality: 'auto:good' }
        ]
      }
    });

    uploads.heroVideo = multer({
      storage: heroVideoStorage,
      limits: { fileSize: 100 * 1024 * 1024 }, // 100MB para videos
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi'];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Solo se permiten videos (MP4, WebM, MOV, AVI)'), false);
        }
      }
    });

    // ✅ STORAGE PARA IMÁGENES HERO
    const heroImageStorage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'gym/hero-images',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [
          { width: 1920, height: 1080, crop: 'fill', quality: 'auto:good' }
        ]
      }
    });

    uploads.heroImage = multer({
      storage: heroImageStorage,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Solo se permiten imágenes (JPG, PNG, WebP)'), false);
        }
      }
    });

    // ✅ STORAGE PARA IMÁGENES DE SERVICIOS
    const serviceImageStorage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'gym/services',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [
          { width: 800, height: 600, crop: 'fill', quality: 'auto:good' }
        ]
      }
    });

    uploads.serviceImage = multer({
      storage: serviceImageStorage,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Solo se permiten imágenes (JPG, PNG, WebP)'), false);
        }
      }
    });

    // ✅ STORAGE PARA IMÁGENES DE TESTIMONIOS
    const testimonialImageStorage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'gym/testimonials',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [
          { width: 300, height: 300, crop: 'fill', gravity: 'face', quality: 'auto:good' }
        ]
      }
    });

    uploads.testimonialImage = multer({
      storage: testimonialImageStorage,
      limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Solo se permiten imágenes (JPG, PNG, WebP)'), false);
        }
      }
    });

    // ✅ STORAGE PARA IMÁGENES DE PRODUCTOS
    const productImageStorage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'gym/products',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [
          { width: 800, height: 800, crop: 'fill', quality: 'auto:good' }
        ]
      }
    });

    uploads.productImage = multer({
      storage: productImageStorage,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Solo se permiten imágenes (JPG, PNG, WebP)'), false);
        }
      }
    });

    // ✅ STORAGE PARA IMÁGENES DE PERFIL
    const profileImageStorage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'gym/profile-images',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto:good' }
        ]
      }
    });

    uploads.profileImage = multer({
      storage: profileImageStorage,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Solo se permiten imágenes (JPG, PNG, WebP)'), false);
        }
      }
    });

    console.log('✅ Todos los storages de multimedia configurados correctamente');

  } catch (error) {
    console.warn('⚠️ Error al configurar storages multimedia:', error.message);
    uploads = {};
  }
}

// ✅ Middleware de fallback si Cloudinary no está configurado
const createFallbackUpload = (type) => {
  return {
    single: () => (req, res, next) => {
      return res.status(503).json({
        success: false,
        message: `Servicio de archivos no configurado. No se pueden subir ${type} en este momento.`,
        details: 'Configura Cloudinary para habilitar la subida de archivos multimedia.'
      });
    }
  };
};

// Aplicar fallbacks si no hay uploads configurados
Object.keys(['logo', 'heroVideo', 'heroImage', 'serviceImage', 'testimonialImage', 'productImage', 'profileImage']).forEach(type => {
  if (!uploads[type]) {
    uploads[type] = createFallbackUpload(type);
  }
});

// ✅ ============ RUTAS DE SUBIDA DE ARCHIVOS ============

// 🏢 1. LOGO DEL GYM
router.post('/upload-logo',
  authenticateToken,
  requireAdmin,
  uploadLimiter,
  uploads.logo.single('logo'),
  gymMediaController.uploadLogo
);

// 🎬 2. VIDEO HERO
router.post('/upload-hero-video',
  authenticateToken,
  requireAdmin,
  uploadLimiter,
  uploads.heroVideo.single('video'),
  gymMediaController.uploadHeroVideo
);

// 🖼️ 3. IMAGEN HERO
router.post('/upload-hero-image',
  authenticateToken,
  requireAdmin,
  uploadLimiter,
  uploads.heroImage.single('image'),
  gymMediaController.uploadHeroImage
);

// 🏋️ 4. IMAGEN DE SERVICIO
router.post('/upload-service-image/:serviceId',
  authenticateToken,
  requireAdmin,
  uploadLimiter,
  uploads.serviceImage.single('image'),
  gymMediaController.uploadServiceImage
);

// 💬 5. IMAGEN DE TESTIMONIO
router.post('/upload-testimonial-image/:testimonialId',
  authenticateToken,
  requireAdmin,
  uploadLimiter,
  uploads.testimonialImage.single('image'),
  gymMediaController.uploadTestimonialImage
);

// 🛍️ 6. IMAGEN DE PRODUCTO
router.post('/upload-product-image/:productId',
  authenticateToken,
  requireStaff,
  uploadLimiter,
  uploads.productImage.single('image'),
  gymMediaController.uploadProductImage
);

// 👤 7. IMAGEN DE PERFIL DE USUARIO
router.post('/upload-user-profile/:userId',
  authenticateToken,
  requireStaff, // Staff puede actualizar perfiles de usuarios
  uploadLimiter,
  uploads.profileImage.single('image'),
  gymMediaController.updateUserProfileImage
);

// ✅ ============ RUTAS DE ELIMINACIÓN ============

// 🗑️ ELIMINAR CUALQUIER TIPO DE ARCHIVO
router.delete('/delete/:type/:id?/:imageId?',
  authenticateToken,
  requireAdmin, // Solo admin puede eliminar archivos multimedia
  gymMediaController.deleteMedia
);

// ✅ ============ RUTAS DE INFORMACIÓN ============

// 📊 OBTENER INFORMACIÓN DE TODOS LOS ARCHIVOS MULTIMEDIA
router.get('/media-info',
  authenticateToken,
  requireStaff,
  gymMediaController.getMediaInfo
);

// ✅ ============ RUTAS DE CONFIGURACIÓN DE VIDEO ============

// ⚙️ ACTUALIZAR CONFIGURACIÓN DE VIDEO HERO
router.patch('/hero-video-settings',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { autoplay, muted, loop, controls } = req.body;
      const { GymConfiguration } = require('../models');
      
      const config = await GymConfiguration.getConfig();
      
      if (autoplay !== undefined) config.videoAutoplay = autoplay;
      if (muted !== undefined) config.videoMuted = muted;
      if (loop !== undefined) config.videoLoop = loop;
      if (controls !== undefined) config.videoControls = controls;
      
      await config.save();
      
      res.json({
        success: true,
        message: 'Configuración de video actualizada',
        data: {
          videoSettings: {
            autoplay: config.videoAutoplay,
            muted: config.videoMuted,
            loop: config.videoLoop,
            controls: config.videoControls
          }
        }
      });
    } catch (error) {
      console.error('Error al actualizar configuración de video:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar configuración de video',
        error: error.message
      });
    }
  }
);

// ✅ ============ RUTAS DE ESTADO ============

// 🔍 VERIFICAR ESTADO DEL SERVICIO MULTIMEDIA
router.get('/status',
  (req, res) => {
    res.json({
      success: true,
      data: {
        cloudinaryConfigured: hasCloudinary,
        availableUploads: Object.keys(uploads).filter(key => uploads[key] && typeof uploads[key].single === 'function'),
        maxFileSizes: {
          logo: '3MB',
          heroVideo: '100MB',
          heroImage: '10MB',
          serviceImage: '5MB',
          testimonialImage: '3MB',
          productImage: '5MB',
          profileImage: '5MB'
        },
        supportedFormats: {
          images: ['JPG', 'JPEG', 'PNG', 'WebP'],
          videos: ['MP4', 'WebM', 'MOV', 'AVI'],
          logos: ['JPG', 'JPEG', 'PNG', 'WebP', 'SVG']
        }
      }
    });
  }
);

// ✅ ============ DOCUMENTACIÓN DE ENDPOINTS ============

// 📚 OBTENER LISTA DE TODOS LOS ENDPOINTS DISPONIBLES
router.get('/endpoints',
  (req, res) => {
    res.json({
      success: true,
      message: 'Gym Media API - Endpoints de Multimedia',
      endpoints: {
        upload: {
          logo: 'POST /api/gym-media/upload-logo',
          heroVideo: 'POST /api/gym-media/upload-hero-video',
          heroImage: 'POST /api/gym-media/upload-hero-image',
          serviceImage: 'POST /api/gym-media/upload-service-image/:serviceId',
          testimonialImage: 'POST /api/gym-media/upload-testimonial-image/:testimonialId',
          productImage: 'POST /api/gym-media/upload-product-image/:productId',
          userProfile: 'POST /api/gym-media/upload-user-profile/:userId'
        },
        delete: {
          any: 'DELETE /api/gym-media/delete/:type/:id?/:imageId?'
        },
        info: {
          mediaInfo: 'GET /api/gym-media/media-info',
          status: 'GET /api/gym-media/status',
          endpoints: 'GET /api/gym-media/endpoints'
        },
        config: {
          videoSettings: 'PATCH /api/gym-media/hero-video-settings'
        }
      },
      usage: {
        authentication: 'Todas las rutas de subida requieren autenticación',
        permissions: 'Logo, hero, servicios, testimonios requieren ADMIN. Productos y perfiles requieren STAFF.',
        fileTypes: 'Imágenes: JPG, PNG, WebP. Videos: MP4, WebM, MOV, AVI',
        autoSave: 'Las URLs se guardan automáticamente en la base de datos correspondiente'
      }
    });
  }
);

module.exports = router;