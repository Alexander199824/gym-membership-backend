// src/middleware/optionalAuth.js - Middleware de autenticación opcional
const jwt = require('jsonwebtoken');
const { User } = require('../models');

// ✅ Middleware que permite autenticación opcional
// Funciona tanto para usuarios logueados como invitados
const optionalAuthenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // Si no hay token, continuar sin autenticación
      req.user = null;
      return next();
    }

    // Si hay token, intentar verificarlo
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);

      if (user && user.isActive) {
        req.user = user;
      } else {
        req.user = null;
      }
    } catch (error) {
      // Si el token es inválido, continuar sin autenticación
      req.user = null;
    }

    next();
  } catch (error) {
    // En caso de cualquier error, continuar sin autenticación
    req.user = null;
    next();
  }
};

module.exports = { optionalAuthenticateToken };

// Este middleware me permite manejar rutas que pueden ser usadas tanto por usuarios 
// logueados como por invitados. A diferencia del middleware de autenticación normal 
// que rechaza requests sin token, este middleware simplemente asigna null a req.user 
// si no hay token válido, permitiendo que el controlador decida cómo manejar cada caso.