// src/middleware/inventoryAuthorization.js - AUTORIZACIÓN ESPECÍFICA PARA INVENTARIO Y VENTAS LOCALES
// ✅ ARCHIVO SEPARADO - NO AFECTA AUTHORIZATION.JS EXISTENTE

const { User } = require('../models');

// ✅ Verificar roles específicos para ventas locales (NUEVO)
const authorizeLocalSales = (requiredRoles = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Los roles permitidos para ventas locales
      const allowedRoles = ['admin', 'colaborador'];
      
      // Si se especificaron roles requeridos, usarlos
      const rolesToCheck = requiredRoles.length > 0 ? requiredRoles : allowedRoles;
      
      if (!rolesToCheck.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Acceso denegado. Se requiere rol: ${rolesToCheck.join(' o ')}`
        });
      }

      // Verificar que el usuario esté activo
      if (!req.user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Usuario inactivo'
        });
      }

      console.log(`✅ Autorización ventas locales: ${req.user.getFullName()} (${req.user.role}) - ${req.method} ${req.originalUrl}`);
      next();
      
    } catch (error) {
      console.error('Error en autorización de ventas locales:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno de autorización'
      });
    }
  };
};

// ✅ Verificar que solo admin pueda confirmar transferencias (NUEVO)
const authorizeTransferConfirmation = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo los administradores pueden confirmar transferencias'
      });
    }

    if (!req.user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Usuario inactivo'
      });
    }

    console.log(`🔐 Admin autorizado para confirmación: ${req.user.getFullName()}`);
    next();
    
  } catch (error) {
    console.error('Error en autorización de transferencias:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno de autorización'
    });
  }
};

// ✅ Verificar acceso a estadísticas de inventario (NUEVO)
const authorizeInventoryStats = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const allowedRoles = ['admin', 'colaborador'];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requiere ser administrador o colaborador'
      });
    }

    if (!req.user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Usuario inactivo'
      });
    }

    console.log(`📊 Acceso a estadísticas autorizado: ${req.user.getFullName()} (${req.user.role})`);
    next();
    
  } catch (error) {
    console.error('Error en autorización de estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno de autorización'
    });
  }
};

// ✅ Verificar que colaborador solo vea sus propias ventas locales (NUEVO)
const authorizeOwnLocalSales = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    // Admin puede ver todas las ventas
    if (req.user.role === 'admin') {
      next();
      return;
    }

    // Colaborador solo puede ver sus propias ventas
    if (req.user.role === 'colaborador') {
      // Si se está consultando una venta específica por ID
      if (req.params.id || req.params.saleId) {
        // La validación de propiedad se hace en el controlador
        // Aquí solo verificamos que tenga el rol correcto
        next();
        return;
      }

      // Para consultas generales, el filtro se aplica en el controlador
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: 'Acceso denegado'
    });
    
  } catch (error) {
    console.error('Error en autorización de ventas propias:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno de autorización'
    });
  }
};

// ✅ Verificar acceso a gestión de órdenes online (NUEVO)
const authorizeOrderManagement = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const allowedRoles = ['admin', 'colaborador'];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo el personal puede gestionar órdenes'
      });
    }

    if (!req.user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Usuario inactivo'
      });
    }

    console.log(`📦 Gestión de órdenes autorizada: ${req.user.getFullName()} (${req.user.role})`);
    next();
    
  } catch (error) {
    console.error('Error en autorización de gestión de órdenes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno de autorización'
    });
  }
};

// ✅ Verificar acceso solo para admin a reportes sensibles (NUEVO)
const authorizeAdminOnlyReports = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acceso restringido solo para administradores'
      });
    }

    if (!req.user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Usuario inactivo'
      });
    }

    console.log(`👑 Acceso de admin a reportes autorizado: ${req.user.getFullName()}`);
    next();
    
  } catch (error) {
    console.error('Error en autorización de admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno de autorización'
    });
  }
};

// ✅ Middleware para validar parámetros de consulta de inventario (NUEVO)
const validateInventoryQueryParams = (req, res, next) => {
  try {
    // Validar fechas si están presentes
    if (req.query.startDate) {
      const startDate = new Date(req.query.startDate);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Fecha de inicio inválida'
        });
      }
    }

    if (req.query.endDate) {
      const endDate = new Date(req.query.endDate);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Fecha final inválida'
        });
      }
    }

    // Validar paginación
    if (req.query.page && (isNaN(req.query.page) || req.query.page < 1)) {
      return res.status(400).json({
        success: false,
        message: 'Número de página inválido'
      });
    }

    if (req.query.limit && (isNaN(req.query.limit) || req.query.limit < 1 || req.query.limit > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Límite debe estar entre 1 y 100'
      });
    }

    // Validar período para estadísticas
    if (req.query.period && !['today', 'week', 'month', 'quarter'].includes(req.query.period)) {
      return res.status(400).json({
        success: false,
        message: 'Período debe ser: today, week, month o quarter'
      });
    }

    next();
    
  } catch (error) {
    console.error('Error validando parámetros de inventario:', error);
    res.status(400).json({
      success: false,
      message: 'Parámetros de consulta inválidos'
    });
  }
};

// ✅ Rate limiting para endpoints sensibles de inventario (NUEVO)
const rateLimitInventory = (maxRequests = 10, windowMs = 60000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    try {
      const key = `${req.ip}-${req.user?.id || 'anonymous'}`;
      const now = Date.now();
      const userRequests = requests.get(key) || [];
      
      // Limpiar requests antiguos
      const validRequests = userRequests.filter(time => now - time < windowMs);
      
      if (validRequests.length >= maxRequests) {
        return res.status(429).json({
          success: false,
          message: 'Demasiadas solicitudes. Intenta más tarde.'
        });
      }
      
      validRequests.push(now);
      requests.set(key, validRequests);
      
      next();
      
    } catch (error) {
      console.error('Error en rate limiting:', error);
      next(); // Continuar en caso de error
    }
  };
};

// ✅ Verificar que el usuario pueda acceder a datos de productos (NUEVO)
const authorizeProductAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    // Solo staff puede acceder a gestión de productos
    const allowedRoles = ['admin', 'colaborador'];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo el personal puede gestionar productos'
      });
    }

    if (!req.user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Usuario inactivo'
      });
    }

    console.log(`📦 Acceso a productos autorizado: ${req.user.getFullName()} (${req.user.role})`);
    next();
    
  } catch (error) {
    console.error('Error en autorización de productos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno de autorización'
    });
  }
};

module.exports = {
  // ✅ FUNCIONES ESPECÍFICAS PARA INVENTARIO Y VENTAS LOCALES
  authorizeLocalSales,
  authorizeTransferConfirmation,
  authorizeInventoryStats,
  authorizeOwnLocalSales,
  authorizeOrderManagement,
  authorizeAdminOnlyReports,
  validateInventoryQueryParams,
  rateLimitInventory,
  authorizeProductAccess
};