// src/middleware/rateLimiter.js - CORREGIDO para express-rate-limit v7+

// ✅ Verificar si express-rate-limit está instalado
let rateLimit;
try {
  rateLimit = require('express-rate-limit');
} catch (error) {
  console.warn('⚠️ express-rate-limit no está instalado. Rate limiting deshabilitado.');
  // Middleware dummy que no hace nada
  const dummyLimiter = (req, res, next) => next();
  module.exports = {
    generalLimiter: dummyLimiter,
    authLimiter: dummyLimiter,
    uploadLimiter: dummyLimiter,
    gymApiLimiter: dummyLimiter,
    developmentLimiter: dummyLimiter
  };
  return;
}

// ✅ DESARROLLO: Rate limiting muy permisivo (SIN onLimitReached deprecated)
const createDevelopmentLimiter = (maxRequests, windowMinutes, message) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: isProduction ? maxRequests : maxRequests * 10, // 10x más permisivo en desarrollo
    message: {
      success: false,
      message: message,
      retryAfter: windowMinutes * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    // ✅ Skip rate limiting para desarrollo local
    skip: (req) => {
      // Skip completamente en desarrollo si viene de localhost
      if (!isProduction && 
          (req.ip === '127.0.0.1' || 
           req.ip === '::1' || 
           req.ip?.includes('localhost') ||
           req.hostname === 'localhost')) {
        return true;
      }
      return false;
    }
    // ✅ REMOVIDO: onLimitReached (deprecated en v7+)
  });
};

// ✅ ULTRA PERMISIVO para desarrollo
const generalLimiter = createDevelopmentLimiter(
  100,  // 100 requests en producción, 1000 en desarrollo
  1,    // cada 1 minuto
  'Demasiadas peticiones. Intenta de nuevo en un minuto.'
);

const authLimiter = createDevelopmentLimiter(
  20,   // 20 intentos de login en producción, 200 en desarrollo
  15,   // cada 15 minutos  
  'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.'
);

const uploadLimiter = createDevelopmentLimiter(
  10,   // 10 uploads en producción, 100 en desarrollo
  10,   // cada 10 minutos
  'Demasiadas subidas de archivos. Intenta de nuevo en 10 minutos.'
);

// ✅ NUEVO: Rate limiter específico para APIs del gym (MUY permisivo)
const gymApiLimiter = createDevelopmentLimiter(
  500,  // 500 requests en producción, 5000 en desarrollo
  1,    // cada 1 minuto
  'Demasiadas peticiones a la API del gym. Intenta en un minuto.'
);

// ✅ NUEVO: Rate limiter para desarrollo que prácticamente no limita nada
const developmentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10000, // 10,000 requests por minuto (básicamente ilimitado)
  skip: (req) => {
    // En desarrollo, skip todo lo que venga de localhost
    return process.env.NODE_ENV !== 'production' && 
           (req.ip === '127.0.0.1' || 
            req.ip === '::1' || 
            req.hostname === 'localhost' ||
            req.get('host')?.includes('localhost'));
  },
  message: {
    success: false,
    message: 'Demasiadas peticiones (esto no debería aparecer en desarrollo)',
  }
  // ✅ REMOVIDO: onLimitReached (deprecated en v7+)
});

module.exports = {
  generalLimiter,
  authLimiter, 
  uploadLimiter,
  gymApiLimiter,
  developmentLimiter
};