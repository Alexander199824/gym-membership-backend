// src/config/cloudinary.js - CONFIGURACIÓN COMPLETA CON VIDEOS - LÍMITE 500MB
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// ✅ Verificar configuración de Cloudinary
const isCloudinaryConfigured = () => {
  return process.env.CLOUDINARY_CLOUD_NAME &&
         process.env.CLOUDINARY_API_KEY &&
         process.env.CLOUDINARY_API_SECRET &&
         process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name';
};

if (isCloudinaryConfigured()) {
  // ✅ Configurar Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  
  console.log('✅ Cloudinary configurado correctamente');
} else {
  console.warn('⚠️ Cloudinary no está configurado correctamente');
}

// ✅ STORAGE PARA IMÁGENES DE PERFIL
const profileImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'gym/profile-images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { 
        width: 400, 
        height: 400, 
        crop: 'fill',
        gravity: 'face',
        quality: 'auto:good'
      }
    ]
  }
});

const uploadProfileImage = multer({
  storage: profileImageStorage,
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

// ✅ STORAGE PARA COMPROBANTES DE TRANSFERENCIA
const transferProofStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'gym/transfer-proofs',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    transformation: [
      { width: 800, quality: 'auto:good' }
    ]
  }
});

const uploadTransferProof = multer({
  storage: transferProofStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes o PDFs'), false);
    }
  }
});

// ✅ STORAGE PARA ARCHIVOS GENERALES DEL GYM
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

const uploadGeneral = multer({
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

// ✅ STORAGE PARA PRODUCTOS DE TIENDA
const productImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'gym/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { 
        width: 800, 
        height: 800, 
        crop: 'fill',
        quality: 'auto:good'
      }
    ]
  }
});

const uploadProductImage = multer({
  storage: productImageStorage,
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

// ✅ STORAGE PARA VIDEOS DE HERO SECTION - ⚡ LÍMITE AUMENTADO A 500MB
const heroVideoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'gym/hero-videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'webm', 'mov', 'avi'],
    transformation: [
      { 
        width: 1920, 
        height: 1080, 
        crop: 'limit',
        quality: 'auto:good',
        fetch_format: 'auto'
      }
    ]
  }
});

const uploadHeroVideo = multer({
  storage: heroVideoStorage,
  limits: {
    fileSize: 500 * 1024 * 1024 // ⚡ 500MB PARA VIDEOS (AUMENTADO DESDE 50MB)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten videos (MP4, WebM, MOV, AVI)'), false);
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
      { 
        width: 200, 
        height: 200, 
        crop: 'fill',
        gravity: 'face',
        quality: 'auto:good'
      }
    ]
  }
});

const uploadTestimonialImage = multer({
  storage: testimonialImageStorage,
  limits: {
    fileSize: 3 * 1024 * 1024 // 3MB
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


// ✅ STORAGE PARA LOGOS DE MARCAS
const brandLogoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'gym/brand-logos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
    transformation: [
      { 
        width: 300, 
        height: 300, 
        crop: 'fit',
        quality: 'auto:good',
        background: 'transparent'
      }
    ]
  }
});

const uploadBrandLogo = multer({
  storage: brandLogoStorage,
  limits: {
    fileSize: 3 * 1024 * 1024 // 3MB para logos
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPG, PNG, WebP, SVG)'), false);
    }
  }
});

// ✅ FUNCIÓN PARA ELIMINAR ARCHIVOS
const deleteFile = async (publicId) => {
  try {
    if (!isCloudinaryConfigured()) {
      return { success: false, error: 'Cloudinary no configurado' };
    }

    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      return { success: true, result };
    } else {
      return { success: false, error: result };
    }
  } catch (error) {
    console.error('Error al eliminar archivo de Cloudinary:', error);
    return { success: false, error: error.message };
  }
};

// ✅ FUNCIÓN PARA ELIMINAR VIDEOS
const deleteVideo = async (publicId) => {
  try {
    if (!isCloudinaryConfigured()) {
      return { success: false, error: 'Cloudinary no configurado' };
    }

    const result = await cloudinary.uploader.destroy(publicId, { 
      resource_type: 'video' 
    });
    
    if (result.result === 'ok') {
      return { success: true, result };
    } else {
      return { success: false, error: result };
    }
  } catch (error) {
    console.error('Error al eliminar video de Cloudinary:', error);
    return { success: false, error: error.message };
  }
};

// ✅ FUNCIÓN PARA OBTENER POSTER DEL VIDEO
const getVideoPoster = (videoUrl) => {
  if (!videoUrl) return null;
  // Cloudinary genera poster automáticamente
  return videoUrl.replace('/video/upload/', '/video/upload/so_0/');
};

// ✅ FUNCIÓN PARA GENERAR MÚLTIPLES TAMAÑOS DE IMAGEN
const generateImageSizes = (originalUrl) => {
  if (!originalUrl) return null;
  
  const baseUrl = originalUrl.split('/upload/')[0] + '/upload/';
  const imagePath = originalUrl.split('/upload/')[1];
  
  return {
    thumbnail: `${baseUrl}c_thumb,w_150,h_150/${imagePath}`,
    small: `${baseUrl}c_fill,w_300,h_300/${imagePath}`,
    medium: `${baseUrl}c_fill,w_600,h_600/${imagePath}`,
    large: `${baseUrl}c_fill,w_1200,h_1200/${imagePath}`,
    original: originalUrl
  };
};

// ✅ FUNCIÓN PARA VERIFICAR SI UN ARCHIVO EXISTE
const fileExists = async (publicId) => {
  try {
    if (!isCloudinaryConfigured()) {
      return false;
    }

    const result = await cloudinary.api.resource(publicId);
    return !!result;
  } catch (error) {
    return false;
  }
};

// ✅ FUNCIÓN PARA OBTENER INFORMACIÓN DE UN ARCHIVO
const getFileInfo = async (publicId) => {
  try {
    if (!isCloudinaryConfigured()) {
      return null;
    }

    const result = await cloudinary.api.resource(publicId);
    return {
      publicId: result.public_id,
      url: result.secure_url,
      format: result.format,
      size: result.bytes,
      width: result.width,
      height: result.height,
      createdAt: result.created_at
    };
  } catch (error) {
    console.error('Error al obtener información del archivo:', error);
    return null;
  }
};

// ✅ FUNCIÓN PARA SUBIR DESDE URL
const uploadFromUrl = async (imageUrl, folder = 'gym/general') => {
  try {
    if (!isCloudinaryConfigured()) {
      return { success: false, error: 'Cloudinary no configurado' };
    }

    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: folder,
      quality: 'auto:good'
    });

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      size: result.bytes
    };
  } catch (error) {
    console.error('Error al subir desde URL:', error);
    return { success: false, error: error.message };
  }

  
};

// ✅ EXPORTACIONES
module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  
  // Uploads para diferentes tipos de archivos
  uploadProfileImage,
  uploadTransferProof,
  uploadGeneral,
  uploadProductImage,
  uploadHeroVideo,        // ⚡ CON LÍMITE DE 500MB
  uploadTestimonialImage,
  uploadBrandLogo,
  
  // Funciones utilitarias
  deleteFile,
  deleteVideo,
  getVideoPoster,
  generateImageSizes,
  fileExists,
  getFileInfo,
  uploadFromUrl
};