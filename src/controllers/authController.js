// src/controllers/authController.js
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const { EmailService, WhatsAppService } = require('../services/notificationServices');

class AuthController {
  constructor() {
    this.emailService = new EmailService();
    this.whatsappService = new WhatsAppService();
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
      this.sendWelcomeNotifications(user).catch(console.error);

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

  // Google OAuth success callback
  async googleCallback(req, res) {
    try {
      const user = req.user;
      
      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      // Si es un nuevo usuario, enviar notificaciones de bienvenida
      if (user.createdAt && (new Date() - user.createdAt) < 5000) {
        this.sendWelcomeNotifications(user).catch(console.error);
      }

      // Redirigir al frontend con token
      const frontendUrl = process.env.FRONTEND_URL;
      res.redirect(`${frontendUrl}/auth/success?token=${token}&refresh=${refreshToken}`);
    } catch (error) {
      console.error('Error en Google callback:', error);
      const frontendUrl = process.env.FRONTEND_URL;
      res.redirect(`${frontendUrl}/auth/error?message=Error en autenticación`);
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

      res.json({
        success: true,
        data: { user: user.toJSON() }
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

  // Actualizar perfil
  async updateProfile(req, res) {
    try {
      const {
        firstName,
        lastName,
        phone,
        whatsapp,
        dateOfBirth,
        emergencyContact,
        notificationPreferences
      } = req.body;

      const user = req.user;

      // Actualizar campos permitidos
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (phone) user.phone = phone;
      if (whatsapp) user.whatsapp = whatsapp;
      if (dateOfBirth) user.dateOfBirth = dateOfBirth;
      if (emergencyContact) user.emergencyContact = emergencyContact;
      if (notificationPreferences) {
        user.notificationPreferences = {
          ...user.notificationPreferences,
          ...notificationPreferences
        };
      }

      await user.save();

      res.json({
        success: true,
        message: 'Perfil actualizado exitosamente',
        data: { user: user.toJSON() }
      });
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar perfil',
        error: error.message
      });
    }
  }

 // ✅ REEMPLAZAR el método uploadProfileImage existente en authController.js

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
    
    // ✅ Actualizar URL de la imagen de perfil
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
          profileImage: user.profileImage
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