// src/middleware/authorization.js - VERSIÓN SEGURA SIN DEPENDENCIAS CIRCULARES

// ✅ CORREGIDO: Permitir acceso de clientes a sus propios datos
const authorizeClientOwnData = (req, res, next) => {
  const { user } = req; // Usuario del token JWT
  const { userId } = req.query; // Usuario solicitado en query
  const { id } = req.params; // Usuario solicitado en params
  const targetUserId = userId || id;
  
  console.log('🔍 AUTHORIZATION CHECK:');
  console.log('  - User ID:', user.id);
  console.log('  - User Role:', user.role);
  console.log('  - Requested userId (query):', userId);
  console.log('  - Requested id (params):', id);
  console.log('  - Target User ID:', targetUserId);
  console.log('  - Route:', req.originalUrl);
  
  // Si es admin o colaborador, permitir acceso total
  if (user.role === 'admin' || user.role === 'colaborador') {
    console.log('✅ Access granted: Staff member');
    return next();
  }
  
  // Si es cliente, solo permitir acceso a sus propios datos
  if (user.role === 'cliente') {
    if (targetUserId && targetUserId === user.id) {
      console.log('✅ Access granted: Client accessing own data');
      return next();
    } else if (!targetUserId) {
      // Si no especifica userId, usar el suyo automáticamente
      req.query.userId = user.id;
      console.log('✅ Access granted: Auto-assigned own user ID');
      return next();
    } else {
      console.log('❌ Access denied: Client trying to access other user data');
      return res.status(403).json({ 
        success: false, 
        message: 'Solo puedes acceder a tus propios datos' 
      });
    }
  }
  
  console.log('❌ Access denied: Unknown role or invalid request');
  return res.status(403).json({ 
    success: false, 
    message: 'Sin permisos para esta acción' 
  });
};

// ✅ CORREGIDO: Verificar propiedad de recurso SIN dependencias circulares
const authorizeResourceOwner = (modelName, resourceIdParam = 'id', userIdField = 'userId') => {
  return async (req, res, next) => {
    try {
      const { user } = req;
      const resourceId = req.params[resourceIdParam];
      
      console.log('🔍 RESOURCE OWNERSHIP CHECK:');
      console.log('  - User ID:', user.id);
      console.log('  - User Role:', user.role);
      console.log('  - Model:', modelName);
      console.log('  - Resource ID:', resourceId);
      
      // Si es admin/colaborador, permitir acceso
      if (user.role === 'admin' || user.role === 'colaborador') {
        console.log('✅ Access granted: Staff member');
        return next();
      }
      
      // Si es cliente, verificar que el recurso le pertenece
      if (user.role === 'cliente') {
        try {
          // ✅ IMPORTAR MODELOS DE FORMA SEGURA
          const models = require('../models');
          const Model = models[modelName];
          
          if (!Model) {
            console.log('❌ Model not found:', modelName);
            return res.status(500).json({
              success: false,
              message: 'Error interno: modelo no encontrado'
            });
          }
          
          const resource = await Model.findByPk(resourceId);
          
          if (!resource) {
            console.log('❌ Resource not found:', resourceId);
            return res.status(404).json({
              success: false,
              message: 'Recurso no encontrado'
            });
          }
          
          if (resource[userIdField] === user.id) {
            console.log('✅ Access granted: Client owns resource');
            return next();
          } else {
            console.log('❌ Access denied: Client does not own resource');
            return res.status(403).json({
              success: false,
              message: 'No tienes permisos para acceder a este recurso'
            });
          }
        } catch (modelError) {
          console.error('❌ Error accessing model:', modelError.message);
          return res.status(500).json({
            success: false,
            message: 'Error al verificar permisos',
            error: modelError.message
          });
        }
      }
      
      console.log('❌ Access denied: Unknown role');
      return res.status(403).json({
        success: false,
        message: 'Sin permisos para esta acción'
      });
      
    } catch (error) {
      console.error('❌ Error en autorización de recurso:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar permisos',
        error: error.message
      });
    }
  };
};

// ✅ Permitir acceso solo a staff (admin y colaborador)
const requireStaff = (req, res, next) => {
  console.log('🔍 STAFF CHECK:', req.user?.role);
  
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuario no autenticado'
    });
  }

  if (!['admin', 'colaborador'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Esta acción requiere permisos de staff'
    });
  }

  console.log('✅ Staff access granted');
  next();
};

// ✅ Permitir acceso solo a admin
const requireAdmin = (req, res, next) => {
  console.log('🔍 ADMIN CHECK:', req.user?.role);
  
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuario no autenticado'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Esta acción requiere permisos de administrador'
    });
  }

  console.log('✅ Admin access granted');
  next();
};

module.exports = {
  authorizeClientOwnData,
  authorizeResourceOwner,
  requireStaff,
  requireAdmin
};