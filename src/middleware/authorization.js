// src/middleware/authorization.js - MEJORADO: Autorización completa para colaboradores

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

// ✅ NUEVO: Verificar acceso a pagos por colaborador
const authorizePaymentAccess = async (req, res, next) => {
  try {
    const { user } = req;
    const { id } = req.params;

    console.log('🔍 PAYMENT ACCESS CHECK:');
    console.log('  - User Role:', user.role);
    console.log('  - Payment ID:', id);
    
    // Admin tiene acceso total
    if (user.role === 'admin') {
      console.log('✅ Access granted: Admin');
      return next();
    }

    // Cliente solo puede ver sus propios pagos
    if (user.role === 'cliente') {
      const models = require('../models');
      const Payment = models.Payment;
      
      const payment = await Payment.findByPk(id);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado'
        });
      }

      if (payment.userId === user.id) {
        console.log('✅ Access granted: Client owns payment');
        return next();
      } else {
        console.log('❌ Access denied: Client does not own payment');
        return res.status(403).json({
          success: false,
          message: 'Solo puedes ver tus propios pagos'
        });
      }
    }

    // Colaborador solo puede ver pagos que registró
    if (user.role === 'colaborador') {
      const models = require('../models');
      const Payment = models.Payment;
      
      const payment = await Payment.findByPk(id);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado'
        });
      }

      if (payment.registeredBy === user.id) {
        console.log('✅ Access granted: Collaborator registered this payment');
        return next();
      } else {
        console.log('❌ Access denied: Collaborator did not register this payment');
        return res.status(403).json({
          success: false,
          message: 'Solo puedes ver los pagos que registraste'
        });
      }
    }

    console.log('❌ Access denied: Unknown role or unauthorized');
    return res.status(403).json({
      success: false,
      message: 'Sin permisos para acceder a este pago'
    });

  } catch (error) {
    console.error('❌ Error en autorización de pago:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar permisos del pago',
      error: error.message
    });
  }
};

// ✅ NUEVO: Filtrar consultas de pagos por colaborador
const filterPaymentsByRole = (req, res, next) => {
  const { user } = req;
  
  console.log('🔍 PAYMENT FILTER CHECK:');
  console.log('  - User Role:', user.role);
  console.log('  - Original Query:', req.query);
  
  if (user.role === 'colaborador') {
    // Forzar filtros para colaborador: solo SUS pagos del día actual
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    req.query.registeredBy = user.id;
    req.query.date = today.toISOString().split('T')[0];
    
    console.log('✅ Payment filters applied for collaborator');
    console.log('  - Filtered to registeredBy:', user.id);
    console.log('  - Filtered to date:', req.query.date);
  } else {
    console.log('✅ No payment filters applied - Admin or Client');
  }
  
  next();
};

// ✅ NUEVO: Verificar acceso a membresía por colaborador
const authorizeMembershipAccess = async (req, res, next) => {
  try {
    const { user } = req;
    const { id } = req.params;

    console.log('🔍 MEMBERSHIP ACCESS CHECK:');
    console.log('  - User Role:', user.role);
    console.log('  - Membership ID:', id);
    
    // Admin tiene acceso total
    if (user.role === 'admin') {
      console.log('✅ Access granted: Admin');
      return next();
    }

    // Cliente solo puede ver sus propias membresías
    if (user.role === 'cliente') {
      const models = require('../models');
      const Membership = models.Membership;
      
      const membership = await Membership.findByPk(id);
      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Membresía no encontrada'
        });
      }

      if (membership.userId === user.id) {
        console.log('✅ Access granted: Client owns membership');
        return next();
      } else {
        console.log('❌ Access denied: Client does not own membership');
        return res.status(403).json({
          success: false,
          message: 'Solo puedes ver tus propias membresías'
        });
      }
    }

    // Colaborador puede ver membresías pero solo de usuarios con rol 'cliente'
    if (user.role === 'colaborador') {
      const models = require('../models');
      const Membership = models.Membership;
      
      const membership = await Membership.findByPk(id, {
        include: [{ 
          association: 'user', 
          attributes: ['id', 'role'] 
        }]
      });
      
      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Membresía no encontrada'
        });
      }

      if (membership.user.role === 'cliente') {
        console.log('✅ Access granted: Membership belongs to client');
        return next();
      } else {
        console.log('❌ Access denied: Membership does not belong to client');
        return res.status(403).json({
          success: false,
          message: 'Solo puedes ver membresías de usuarios clientes'
        });
      }
    }

    console.log('❌ Access denied: Unknown role or unauthorized');
    return res.status(403).json({
      success: false,
      message: 'Sin permisos para acceder a esta membresía'
    });

  } catch (error) {
    console.error('❌ Error en autorización de membresía:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar permisos de membresía',
      error: error.message
    });
  }
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

// ✅ NUEVO: Verificar acceso específico para colaboradores a reportes
const authorizeReportAccess = (req, res, next) => {
  const { user } = req;
  
  console.log('🔍 REPORT ACCESS CHECK:');
  console.log('  - User Role:', user.role);
  console.log('  - Route:', req.originalUrl);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Usuario no autenticado'
    });
  }

  // Admin tiene acceso total a reportes
  if (user.role === 'admin') {
    console.log('✅ Report access granted: Admin');
    return next();
  }

  // Colaborador tiene acceso limitado a reportes (filtrados en controlador)
  if (user.role === 'colaborador') {
    console.log('✅ Report access granted: Collaborator (filtered data)');
    return next();
  }

  // Cliente no tiene acceso a reportes generales
  console.log('❌ Report access denied: Client role');
  return res.status(403).json({
    success: false,
    message: 'No tienes permisos para ver reportes'
  });
};

module.exports = {
  authorizeClientOwnData,
  authorizeResourceOwner,
  authorizePaymentAccess,
  filterPaymentsByRole,
  authorizeMembershipAccess,
  requireStaff,
  requireAdmin,
  authorizeReportAccess
};