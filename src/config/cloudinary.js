// src/config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Verificar si Cloudinary está configurado
const hasValidCloudinaryConfig = 
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name';

// Configurar Cloudinary solo si las credenciales están disponibles
if (hasValidCloudinaryConfig) {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    console.log('✅ Cloudinary configurado correctamente');
  } catch (error) {
    console.warn('⚠️ Error al configurar Cloudinary:', error.message);
  }
} else {
  console.warn('⚠️ Cloudinary no configurado - Se usará almacenamiento local');
}

// Crear directorios locales si no existen
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Directorio creado: ${dirPath}`);
  }
};

// Crear directorios necesarios
ensureDirectoryExists('uploads');
ensureDirectoryExists('uploads/profile-images');
ensureDirectoryExists('uploads/transfer-proofs');

// Storage para imágenes de perfil
const profileImageStorage = hasValidCloudinaryConfig ? 
  // Cloudinary storage (requiere multer-storage-cloudinary)
  (() => {
    try {
      const { CloudinaryStorage } = require('multer-storage-cloudinary');
      return new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
          folder: 'gym/profile-images',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto:good' }
          ]
        }
      });
    } catch (error) {
      console.warn('⚠️ multer-storage-cloudinary no disponible, usando almacenamiento local');
      return null;
    }
  })() : null;

// Fallback a almacenamiento local
const localProfileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profile-images/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// Storage para comprobantes de transferencia
const transferProofStorage = hasValidCloudinaryConfig && profileImageStorage ?
  (() => {
    try {
      const { CloudinaryStorage } = require('multer-storage-cloudinary');
      return new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
          folder: 'gym/transfer-proofs',
          allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
          transformation: [
            { width: 1200, quality: 'auto:good' }
          ]
        }
      });
    } catch (error) {
      return null;
    }
  })() : null;

// Fallback local para comprobantes
const localTransferStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/transfer-proofs/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// Función para validar archivos de imagen
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || 
    ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido. Solo se permiten: ${allowedTypes.join(', ')}`), false);
  }
};

// Función para validar archivos de comprobante
const proofFileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes (JPG, PNG, WebP) y archivos PDF'), false);
  }
};

// Configuración de multer para imágenes de perfil
const uploadProfileImage = multer({
  storage: profileImageStorage || localProfileStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB por defecto
  },
  fileFilter: imageFileFilter
});

// Configuración de multer para comprobantes de transferencia
const uploadTransferProof = multer({
  storage: transferProofStorage || localTransferStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB por defecto
  },
  fileFilter: proofFileFilter
});

// Función para eliminar archivos (solo funciona con Cloudinary configurado)
const deleteFile = async (publicId) => {
  if (!hasValidCloudinaryConfig) {
    console.warn('No se puede eliminar archivo: Cloudinary no configurado');
    return { success: false, message: 'Cloudinary no configurado' };
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return { success: true, result };
  } catch (error) {
    console.error('Error al eliminar archivo de Cloudinary:', error);
    return { success: false, error: error.message };
  }
};

// Función helper para obtener URL del archivo
const getFileUrl = (filePath) => {
  if (hasValidCloudinaryConfig && filePath.includes('cloudinary')) {
    return filePath; // Ya es una URL de Cloudinary
  }
  
  // Para archivos locales, construir URL relativa
  return `/uploads/${path.basename(filePath)}`;
};

module.exports = {
  cloudinary: hasValidCloudinaryConfig ? cloudinary : null,
  uploadProfileImage,
  uploadTransferProof,
  deleteFile,
  getFileUrl,
  hasValidCloudinaryConfig
};