// src/middleware/optionalAuth.js - NUEVO: Middleware para autenticación opcional
const jwt = require('jsonwebtoken');
const { User } = require('../models');

// ✅ Middleware de autenticación opcional para rutas que funcionan con o sin usuario logueado
const optionalAuthenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      // No hay token, continuar sin usuario
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Buscar el usuario
      const user = await User.findByPk(decoded.id);
      
      if (!user || !user.isActive) {
        // Usuario no válido o inactivo, continuar sin usuario
        req.user = null;
        return next();
      }

      // Usuario válido encontrado
      req.user = user;
      next();
      
    } catch (tokenError) {
      // Token inválido o expirado, continuar sin usuario
      req.user = null;
      next();
    }

  } catch (error) {
    console.error('Error en optionalAuthenticateToken:', error);
    // En caso de error, continuar sin usuario
    req.user = null;
    next();
  }
};

module.exports = {
  optionalAuthenticateToken
};