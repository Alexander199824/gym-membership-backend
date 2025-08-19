// src/controllers/authController.js - ACTUALIZADO: Redirección por rol con Google OAuth + cambios individuales
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const { EmailService, WhatsAppService } = require('../services/notificationServices');

class AuthController {
  constructor() {
   // this.emailService = new EmailService();
   // this.whatsappService = new WhatsAppService();
  }

  // Registro de usuario
  async register(req, res) {
    try {
      const { 
        firstName, 
        lastName, 
        email, 
        password, 
        phone, 
        whatsapp, 
        role = 'cliente',
        dateOfBirth,
        emergencyContact
      } = req.body;

      // Verificar si el usuario está siendo creado por admin/colaborador
      const isStaffCreating = req.user && ['admin', 'colaborador'].includes(req.user.role);
      const userRole = isStaffCreating ? role : 'cliente';

      const userData = {
        firstName,
        lastName,
        email: email.toLowerCase(),
        password,
        phone,
        whatsapp,
        role: userRole,
        dateOfBirth,
        emergencyContact,
        emailVerified: false
      };

      // Si lo crea un staff member, agregamos referencia
      if (isStaffCreating) {
        userData.createdBy = req.user.id;
        userData.emailVerified = true; // Staff puede verificar directamente
      }

      const user = await User.create(userData);

      // Generar tokens
      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      // Enviar email de bienvenida (no bloquear la respuesta)
      console.log(`✅ Usuario registrado: ${user.email} (${user.role})`);
      //this.sendWelcomeNotifications(user).catch(console.error);

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          user: user.toJSON(),
          token,
          refreshToken
        }
      });
    } catch (error) {
      console.error('Error en registro:', error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar usuario',
        error: error.message
      });
    }
  }

  // Login con email y contraseña
  async login(req, res) {
    try {
      const { email, password } = req.body;

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Cuenta desactivada. Contacta al administrador.'
        });
      }

      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Actualizar último login
      user.lastLogin = new Date();
      await user.save();

      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      res.json({
        success: true,
        message: 'Inicio de sesión exitoso',
        data: {
          user: user.toJSON(),
          token,
          refreshToken
        }
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        message: 'Error al iniciar sesión',
        error: error.message
      });
    }
  }


// ✅ CORREGIDO: Google OAuth success callback SIN dependencias de this
async googleCallback(req, res) {
  try {
    const user = req.user;
    
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Si es un nuevo usuario, enviar notificaciones de bienvenida
    if (user.createdAt && (new Date() - user.createdAt) < 5000) {
      console.log('🆕 Usuario nuevo detectado - se enviarán notificaciones de bienvenida');
      // TODO: Implementar notificaciones de bienvenida sin dependencia de this
    }

    // ✅ FUNCIÓN HELPER: Determinar URL de redirección según el rol del usuario
    const determineRedirectUrl = (user) => {
      const role = user.role;
      
      // URLs específicas según el rol
      const roleUrls = {
        'admin': process.env.FRONTEND_ADMIN_URL || process.env.ADMIN_PANEL_URL,
        'colaborador': process.env.FRONTEND_ADMIN_URL || process.env.ADMIN_PANEL_URL,
        'cliente': process.env.FRONTEND_CLIENT_URL || process.env.FRONTEND_URL
      };
      
      // Obtener URL específica para el rol o usar la URL por defecto
      const specificUrl = roleUrls[role];
      const defaultUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      const finalUrl = specificUrl || defaultUrl;
      
      console.log(`🔗 URL de redirección para rol '${role}': ${finalUrl}`);
      
      return finalUrl;
    };

    // ✅ Determinar URL de redirección
    const redirectUrl = determineRedirectUrl(user);
    
    // ✅ Crear parámetros de redirección
    const redirectParams = new URLSearchParams({
      token,
      refresh: refreshToken,
      role: user.role,
      userId: user.id,
      name: user.getFullName(),
      email: user.email,
      loginType: 'google',
      timestamp: Date.now()
    });

    const finalRedirectUrl = `${redirectUrl}/auth/google-success?${redirectParams.toString()}`;
    
    console.log(`✅ Redirección Google OAuth exitosa:`);
    console.log(`   👤 Usuario: ${user.getFullName()} (${user.email})`);
    console.log(`   🏷️ Rol: ${user.role}`);
    console.log(`   🌐 Redirigiendo a: ${finalRedirectUrl}`);
    
    res.redirect(finalRedirectUrl);
  } catch (error) {
    console.error('❌ Error en Google callback:', error);
    
    // ✅ FUNCIÓN HELPER: Obtener URL de error
    const getErrorRedirectUrl = () => {
      return process.env.FRONTEND_CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    };
    
    const errorUrl = getErrorRedirectUrl();
    const errorParams = new URLSearchParams({
      error: 'oauth_error',
      message: 'Error en autenticación con Google',
      timestamp: Date.now(),
      details: error.message
    });
    
    const errorRedirectUrl = `${errorUrl}/auth/google-error?${errorParams.toString()}`;
    console.log(`❌ Redirigiendo a URL de error: ${errorRedirectUrl}`);
    
    res.redirect(errorRedirectUrl);
  }
}
  // ✅ NUEVO: Determinar URL de redirección según el rol del usuario
  determineRedirectUrl(user) {
    const role = user.role;
    
    // URLs específicas según el rol
    const roleUrls = {
      'admin': process.env.FRONTEND_ADMIN_URL || process.env.ADMIN_PANEL_URL,
      'colaborador': process.env.FRONTEND_ADMIN_URL || process.env.ADMIN_PANEL_URL,
      'cliente': process.env.FRONTEND_CLIENT_URL || process.env.FRONTEND_URL
    };
    
    // Obtener URL específica para el rol o usar la URL por defecto
    const specificUrl = roleUrls[role];
    const defaultUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    const finalUrl = specificUrl || defaultUrl;
    
    console.log(`🔗 URL de redirección para rol '${role}': ${finalUrl}`);
    
    return finalUrl;
  }

  // ✅ NUEVO: Obtener URL de error según preferencias
  getErrorRedirectUrl() {
    // Intentar usar la URL del cliente por defecto para errores
    return process.env.FRONTEND_CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
  }

  // ✅ NUEVO: Endpoint para obtener información de configuración OAuth
  async getOAuthConfig(req, res) {
    try {
      const config = {
        googleOAuth: {
          enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
          clientId: process.env.GOOGLE_CLIENT_ID,
          callbackUrl: process.env.GOOGLE_CALLBACK_URL,
          redirectUrls: {
            admin: process.env.FRONTEND_ADMIN_URL,
            colaborador: process.env.FRONTEND_ADMIN_URL,
            cliente: process.env.FRONTEND_CLIENT_URL
          }
        },
        endpoints: {
          googleLogin: '/api/auth/google',
          googleCallback: '/api/auth/google/callback'
        }
      };

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('Error al obtener configuración OAuth:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener configuración OAuth',
        error: error.message
      });
    }
  }

 // Obtener perfil del usuario actual
async getProfile(req, res) {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          association: 'memberships',
          limit: 1,
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    // ✅ Formatear usuario con imagen de perfil (vacía por defecto)
    const userResponse = {
      ...user.toJSON(),
      profileImage: user.profileImage || '' // Vacía por defecto
    };

    res.json({
      success: true,
      data: { user: userResponse }
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil',
      error: error.message
    });
  }
}

 // ✅ MEJORADO: Actualizar perfil - Permite cambios individuales
async updateProfile(req, res) {
  try {
    console.log('💾 ACTUALIZANDO PERFIL - Datos recibidos:', req.body);
    
    const {
      firstName,
      lastName,
      phone,
      whatsapp,
      dateOfBirth,
      emergencyContact,
      notificationPreferences,
      address,
      city,
      zipCode,
      bio
    } = req.body;

    const user = req.user;
    let hasChanges = false;
    const changedFields = [];

    // ✅ MEJORADO: Solo actualizar campos que se envían y son diferentes
    if (firstName !== undefined && firstName !== user.firstName) {
      console.log('📝 Actualizando firstName:', firstName);
      user.firstName = firstName.trim();
      hasChanges = true;
      changedFields.push('firstName');
    }

    if (lastName !== undefined && lastName !== user.lastName) {
      console.log('📝 Actualizando lastName:', lastName);
      user.lastName = lastName.trim();
      hasChanges = true;
      changedFields.push('lastName');
    }

    if (phone !== undefined && phone !== user.phone) {
      console.log('📝 Actualizando phone:', phone);
      user.phone = phone ? phone.trim() : null;
      hasChanges = true;
      changedFields.push('phone');
    }

    if (whatsapp !== undefined && whatsapp !== user.whatsapp) {
      console.log('📝 Actualizando whatsapp:', whatsapp);
      user.whatsapp = whatsapp ? whatsapp.trim() : null;
      hasChanges = true;
      changedFields.push('whatsapp');
    }

    if (dateOfBirth !== undefined && dateOfBirth !== user.dateOfBirth) {
      console.log('📝 Actualizando dateOfBirth:', dateOfBirth);
      user.dateOfBirth = dateOfBirth || null;
      hasChanges = true;
      changedFields.push('dateOfBirth');
    }

    // ✅ NUEVO: Soporte para campos adicionales
    if (address !== undefined && address !== user.address) {
      console.log('📝 Actualizando address:', address);
      user.address = address ? address.trim() : null;
      hasChanges = true;
      changedFields.push('address');
    }

    if (city !== undefined && city !== user.city) {
      console.log('📝 Actualizando city:', city);
      user.city = city ? city.trim() : null;
      hasChanges = true;
      changedFields.push('city');
    }

    if (zipCode !== undefined && zipCode !== user.zipCode) {
      console.log('📝 Actualizando zipCode:', zipCode);
      user.zipCode = zipCode ? zipCode.trim() : null;
      hasChanges = true;
      changedFields.push('zipCode');
    }

    if (bio !== undefined && bio !== user.bio) {
      console.log('📝 Actualizando bio:', bio);
      user.bio = bio ? bio.trim() : null;
      hasChanges = true;
      changedFields.push('bio');
    }

    // ✅ MEJORADO: Manejar contacto de emergencia de forma inteligente
    if (emergencyContact !== undefined) {
      const currentEmergencyContact = user.emergencyContact || {};
      let emergencyChanged = false;

      const newEmergencyContact = {
        name: emergencyContact.name ? emergencyContact.name.trim() : '',
        phone: emergencyContact.phone ? emergencyContact.phone.trim() : '',
        relationship: emergencyContact.relationship || ''
      };

      // Verificar si hay cambios en el contacto de emergencia
      if (currentEmergencyContact.name !== newEmergencyContact.name ||
          currentEmergencyContact.phone !== newEmergencyContact.phone ||
          currentEmergencyContact.relationship !== newEmergencyContact.relationship) {
        
        console.log('📝 Actualizando emergencyContact:', newEmergencyContact);
        user.emergencyContact = newEmergencyContact;
        emergencyChanged = true;
        hasChanges = true;
        changedFields.push('emergencyContact');
      }
    }

    // ✅ MEJORADO: Manejar preferencias de notificación
    if (notificationPreferences !== undefined) {
      const currentPreferences = user.notificationPreferences || {};
      const newPreferences = {
        ...currentPreferences,
        ...notificationPreferences
      };

      // Verificar si hay cambios en las preferencias
      if (JSON.stringify(currentPreferences) !== JSON.stringify(newPreferences)) {
        console.log('📝 Actualizando notificationPreferences:', newPreferences);
        user.notificationPreferences = newPreferences;
        hasChanges = true;
        changedFields.push('notificationPreferences');
      }
    }

    // ✅ NUEVO: Verificar si realmente hay cambios antes de guardar
    if (!hasChanges) {
      console.log('ℹ️ No hay cambios reales para guardar');
      return res.json({
        success: true,
        message: 'No hay cambios para actualizar',
        data: { 
          user: {
            ...user.toJSON(),
            profileImage: user.profileImage || ''
          }
        }
      });
    }

    // Guardar cambios
    await user.save();

    console.log(`✅ Perfil actualizado exitosamente. Campos modificados: ${changedFields.join(', ')}`);

    // ✅ FORMATEAR RESPUESTA con imagen de perfil (vacía por defecto)
    const userResponse = {
      ...user.toJSON(),
      profileImage: user.profileImage || '' // Vacía por defecto
    };

    res.json({
      success: true,
      message: `Perfil actualizado exitosamente. Campos modificados: ${changedFields.join(', ')}`,
      data: { 
        user: userResponse,
        changedFields: changedFields // ✅ NUEVO: Información sobre qué cambió
      }
    });
    
  } catch (error) {
    console.error('❌ Error al actualizar perfil:', error);
    
    // ✅ MEJORADO: Manejo de errores específicos
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));

      return res.status(422).json({
        success: false,
        message: 'Errores de validación',
        errors: validationErrors
      });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(422).json({
        success: false,
        message: 'Ya existe un usuario con esos datos',
        field: error.errors[0]?.path
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al actualizar perfil',
      error: error.message
    });
  }
}


 // ✅ Subir imagen de perfil
async uploadProfileImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se recibió ningún archivo'
      });
    }

    const user = req.user;
    const oldProfileImage = user.profileImage;
    
    // ✅ Actualizar URL de la imagen de perfil (Cloudinary)
    user.profileImage = req.file.path || req.file.location;
    await user.save();

    // ✅ Si tenía imagen anterior y Cloudinary está configurado, intentar eliminarla
    if (oldProfileImage && process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        const { deleteFile } = require('../config/cloudinary');
        
        // ✅ Extraer public_id de la URL de Cloudinary
        const publicIdMatch = oldProfileImage.match(/\/([^\/]+)\.[^\.]+$/);
        if (publicIdMatch) {
          const publicId = `gym/profile-images/${publicIdMatch[1]}`;
          await deleteFile(publicId);
        }
      } catch (deleteError) {
        console.warn('⚠️ No se pudo eliminar imagen anterior:', deleteError.message);
      }
    }

    res.json({
      success: true,
      message: 'Imagen de perfil actualizada exitosamente',
      data: {
        profileImage: user.profileImage,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profileImage: user.profileImage || '' // Asegurar que nunca sea null
        }
      }
    });
  } catch (error) {
    console.error('Error al subir imagen de perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir imagen de perfil',
      error: error.message
    });
  }
}

  // Cambiar contraseña
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = req.user;

      // Verificar contraseña actual
      if (!user.password) {
        return res.status(400).json({
          success: false,
          message: 'Este usuario usa autenticación de Google. No puede cambiar contraseña.'
        });
      }

      const isValidPassword = await user.comparePassword(currentPassword);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Contraseña actual incorrecta'
        });
      }

      // Actualizar contraseña
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cambiar contraseña',
        error: error.message
      });
    }
  }

  // Logout (invalidar token - implementación simple)
  async logout(req, res) {
    try {
      // En una implementación más compleja, mantendrías una blacklist de tokens
      // Por ahora, simplemente respondemos success
      res.json({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });
    } catch (error) {
      console.error('Error en logout:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cerrar sesión',
        error: error.message
      });
    }
  }

  // Refresh token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token requerido'
        });
      }

      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await User.findByPk(decoded.id);

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no válido'
        });
      }

      const newToken = generateToken(user);
      const newRefreshToken = generateRefreshToken(user);

      res.json({
        success: true,
        data: {
          token: newToken,
          refreshToken: newRefreshToken
        }
      });
    } catch (error) {
      console.error('Error al renovar token:', error);
      res.status(401).json({
        success: false,
        message: 'Refresh token inválido'
      });
    }
  }

  // Enviar notificaciones de bienvenida
  async sendWelcomeNotifications(user) {
    try {
      const preferences = user.notificationPreferences || {};

      // Enviar email de bienvenida
      if (preferences.email !== false && user.email) {
        const emailTemplate = this.emailService.generateWelcomeEmail(user);
        await this.emailService.sendEmail({
          to: user.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text
        });
      }

      // Enviar WhatsApp de bienvenida
      if (preferences.whatsapp !== false && user.whatsapp) {
        const message = this.whatsappService.generateWelcomeMessage(user);
        await this.whatsappService.sendWhatsApp({
          to: user.whatsapp,
          message
        });
      }
    } catch (error) {
      console.error('Error al enviar notificaciones de bienvenida:', error);
    }
  }
}

module.exports = new AuthController();