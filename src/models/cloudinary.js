// src/config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configuración de almacenamiento para imágenes de perfil
const profileImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'gym-system/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto', format: 'auto' }
    ]
  }
});

// Configuración de almacenamiento para comprobantes de transferencia
const transferProofStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'gym-system/transfer-proofs',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    transformation: [
      { width: 800, height: 1200, crop: 'limit' },
      { quality: 'auto', format: 'auto' }
    ]
  }
});

// Middleware de multer para perfiles
const uploadProfileImage = multer({
  storage: profileImageStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos JPG, PNG y WebP'), false);
    }
  }
});

// Middleware de multer para comprobantes
const uploadTransferProof = multer({
  storage: transferProofStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos JPG, PNG y PDF'), false);
    }
  }
});

// Función para eliminar imagen de Cloudinary
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error al eliminar imagen de Cloudinary:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadProfileImage,
  uploadTransferProof,
  deleteImage
};

// src/config/passport.js
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const { User } = require('../models');

// Serialización de usuario
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Estrategia Local
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const user = await User.findByEmail(email);
    
    if (!user) {
      return done(null, false, { message: 'Email no registrado' });
    }

    if (!user.isActive) {
      return done(null, false, { message: 'Cuenta desactivada' });
    }

    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return done(null, false, { message: 'Contraseña incorrecta' });
    }

    // Actualizar último login
    user.lastLogin = new Date();
    await user.save();

    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Estrategia Google OAuth
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Buscar usuario existente por Google ID
    let user = await User.findByGoogleId(profile.id);
    
    if (user) {
      // Usuario existe, actualizar último login
      user.lastLogin = new Date();
      await user.save();
      return done(null, user);
    }

    // Buscar por email si no existe por Google ID
    user = await User.findByEmail(profile.emails[0].value);
    
    if (user) {
      // Usuario existe con email, vincular Google ID
      user.googleId = profile.id;
      user.emailVerified = true;
      user.lastLogin = new Date();
      await user.save();
      return done(null, user);
    }

    // Crear nuevo usuario
    user = await User.create({
      googleId: profile.id,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      email: profile.emails[0].value,
      profileImage: profile.photos[0]?.value,
      emailVerified: true,
      lastLogin: new Date(),
      role: 'cliente'
    });

    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Estrategia JWT
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
}, async (payload, done) => {
  try {
    const user = await User.findByPk(payload.id);
    
    if (user && user.isActive) {
      return done(null, user);
    }
    
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
}));

module.exports = passport;