// src/middleware/optionalAuth.js - MIDDLEWARE DE AUTENTICACIÓN OPCIONAL
const jwt = require('jsonwebtoken');
const { User } = require('../models');

// ✅ MIDDLEWARE: Autenticación opcional - No falla si no hay token
const optionalAuthenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // ✅ Si no hay token, continuar sin usuario (para invitados)
    if (!token) {
      req.user = null;
      req.isAuthenticated = false;
      console.log('🎫 Request sin token - usuario invitado');
      return next();
    }

    // ✅ Si hay token, intentar verificarlo
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Buscar usuario en la base de datos
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
        console.warn('⚠️ Token válido pero usuario no encontrado');
        req.user = null;
        req.isAuthenticated = false;
        return next();
      }

      if (!user.isActive) {
        console.warn('⚠️ Usuario desactivado');
        req.user = null;
        req.isAuthenticated = false;
        return next();
      }

      // ✅ Usuario autenticado correctamente
      req.user = user;
      req.isAuthenticated = true;
      console.log(`✅ Usuario autenticado: ${user.email} (${user.role})`);
      
    } catch (jwtError) {
      // ✅ Token inválido o expirado - continuar como invitado
      console.warn('⚠️ Token inválido o expirado - continuando como invitado');
      req.user = null;
      req.isAuthenticated = false;
    }

    next();

  } catch (error) {
    console.error('❌ Error en optionalAuthenticateToken:', error);
    // ✅ En caso de error, continuar como invitado
    req.user = null;
    req.isAuthenticated = false;
    next();
  }
};

module.exports = {
  optionalAuthenticateToken
};