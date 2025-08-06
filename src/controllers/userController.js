// src/controllers/userController.js - CORREGIDO: Colaboradores Y Clientes funcionando
const { User, Membership, Payment } = require('../models');
const { Op } = require('sequelize');

class UserController {
  
  // ✅ CORREGIDO: Funciona para colaborador (filtrado) Y cliente (sus datos)
  async getUsers(req, res) {
    try {
      const {
        role,
        isActive,
        search,
        page = 1,
        limit = 20
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // ✅ CORREGIDO: Lógica por rol sin afectar clientes
      if (req.user.role === 'colaborador') {
        // Colaboradores solo pueden ver clientes
        where.role = 'cliente';
        console.log('🔍 Colaborador filtrando: solo usuarios clientes');
      } else if (req.user.role === 'cliente') {
        // ✅ CORREGIDO: Clientes solo pueden ver sus propios datos
        where.id = req.user.id;
        console.log('🔍 Cliente filtrando: solo sus propios datos');
      } else {
        // Admin puede ver todos los roles
        if (role) where.role = role;
      }

      // Aplicar otros filtros
      if (isActive !== undefined) where.isActive = isActive === 'true';
      
      // Búsqueda por nombre o email
      if (search) {
        where[Op.or] = [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const { count, rows } = await User.findAndCountAll({
        where,
        include: [
          {
            association: 'memberships',
            limit: 1,
            order: [['createdAt', 'DESC']],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      console.log(`✅ ${req.user.role} obtuvo ${rows.length} usuarios (total: ${count})`);

      res.json({
        success: true,
        data: {
          users: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener usuarios',
        error: error.message
      });
    }
  }

  // ✅ CORREGIDO: Cliente puede ver su propio perfil, colaborador solo clientes
  async getUserById(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id, {
        include: [
          {
            association: 'memberships',
            order: [['createdAt', 'DESC']]
          },
          {
            association: 'payments',
            limit: 10,
            order: [['paymentDate', 'DESC']]
          },
          {
            association: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'role']
          }
        ]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // ✅ CORREGIDO: Validaciones por rol
      if (req.user.role === 'cliente') {
        // Cliente solo puede ver su propio perfil
        if (user.id !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Solo puedes ver tu propio perfil'
          });
        }
      } else if (req.user.role === 'colaborador') {
        // Colaborador solo puede ver clientes
        if (user.role !== 'cliente') {
          return res.status(403).json({
            success: false,
            message: 'Solo puedes ver información de usuarios clientes'
          });
        }
      }
      // Admin puede ver todo (no necesita validación)

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener usuario',
        error: error.message
      });
    }
  }

  // ✅ CORREGIDO: Solo staff puede crear usuarios (clientes no pueden)
  async createUser(req, res) {
    try {
      // ✅ CORREGIDO: Solo staff puede crear usuarios
      if (!['admin', 'colaborador'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Solo el personal puede crear usuarios'
        });
      }

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

      // Validaciones por rol del usuario creador
      if (req.user.role === 'colaborador') {
        // Colaborador solo puede crear clientes
        if (role !== 'cliente') {
          return res.status(403).json({
            success: false,
            message: 'Solo puedes crear usuarios con rol cliente'
          });
        }
      } else {
        // Solo admin puede crear otros admins
        if (role === 'admin' && req.user.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: 'Solo los administradores pueden crear otros administradores'
          });
        }
      }

      const userData = {
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone,
        whatsapp,
        role: req.user.role === 'colaborador' ? 'cliente' : role, // Forzar cliente para colaborador
        dateOfBirth,
        emergencyContact,
        createdBy: req.user.id,
        emailVerified: true // Staff verifica directamente
      };

      // Solo agregar password si se proporciona
      if (password) {
        userData.password = password;
      }

      const user = await User.create(userData);

      console.log(`✅ ${req.user.role} creó usuario: ${user.email} (rol: ${user.role})`);

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        data: { user: user.toJSON() }
      });
    } catch (error) {
      console.error('Error al crear usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear usuario',
        error: error.message
      });
    }
  }

  // ✅ CORREGIDO: Clientes no pueden modificar usuarios, colaboradores tampoco
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const {
        firstName,
        lastName,
        phone,
        whatsapp,
        role,
        isActive,
        dateOfBirth,
        emergencyContact,
        notificationPreferences
      } = req.body;

      // ✅ CORREGIDO: Solo admin puede modificar usuarios
      if (req.user.role === 'colaborador') {
        return res.status(403).json({
          success: false,
          message: 'Los colaboradores no pueden modificar usuarios existentes'
        });
      }

      if (req.user.role === 'cliente') {
        return res.status(403).json({
          success: false,
          message: 'Los clientes no pueden modificar usuarios'
        });
      }

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Solo admin puede cambiar roles o activar/desactivar usuarios
      if ((role !== undefined || isActive !== undefined) && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden cambiar roles o estado de usuarios'
        });
      }

      // Solo admin puede crear/modificar otros admins
      if (role === 'admin' && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden asignar rol de administrador'
        });
      }

      // Actualizar campos
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (phone) user.phone = phone;
      if (whatsapp) user.whatsapp = whatsapp;
      if (role !== undefined) user.role = role;
      if (isActive !== undefined) user.isActive = isActive;
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
        message: 'Usuario actualizado exitosamente',
        data: { user: user.toJSON() }
      });
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar usuario',
        error: error.message
      });
    }
  }

  // ✅ Solo admin puede eliminar usuarios (sin cambios)
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden eliminar usuarios'
        });
      }

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // No permitir que el admin se elimine a sí mismo
      if (user.id === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'No puedes eliminarte a ti mismo'
        });
      }

      // Desactivar usuario en lugar de eliminar
      user.isActive = false;
      await user.save();

      res.json({
        success: true,
        message: 'Usuario desactivado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar usuario',
        error: error.message
      });
    }
  }

  // ✅ CORREGIDO: Estadísticas según rol SIN afectar permisos de cliente
  async getUserStats(req, res) {
    try {
      // ✅ CORREGIDO: Clientes no deben acceder a estadísticas generales
      if (req.user.role === 'cliente') {
        return res.status(403).json({
          success: false,
          message: 'Los clientes no tienen acceso a estadísticas generales'
        });
      }

      if (req.user.role === 'colaborador') {
        // Colaborador solo ve estadísticas de sus clientes
        const clientsCreatedByMe = await User.count({
          where: { 
            isActive: true,
            role: 'cliente',
            createdBy: req.user.id
          }
        });

        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);

        const newClientsThisMonth = await User.count({
          where: {
            createdAt: { [Op.gte]: thisMonth },
            isActive: true,
            role: 'cliente',
            createdBy: req.user.id
          }
        });

        return res.json({
          success: true,
          data: {
            myClients: clientsCreatedByMe,
            newClientsThisMonth,
            totalActiveClients: clientsCreatedByMe,
            role: 'colaborador'
          }
        });
      }

      // Admin ve estadísticas completas
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden ver estadísticas completas'
        });
      }

      // Conteo por roles
      const roleStats = await User.findAll({
        attributes: [
          'role',
          [User.sequelize.fn('COUNT', User.sequelize.col('id')), 'count']
        ],
        where: { isActive: true },
        group: ['role']
      });

      // Nuevos usuarios este mes
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const newUsersThisMonth = await User.count({
        where: {
          createdAt: { [Op.gte]: thisMonth },
          isActive: true
        }
      });

      // Usuarios con membresías activas
      const usersWithActiveMemberships = await User.count({
        include: [{
          model: Membership,
          as: 'memberships',
          where: { status: 'active' },
          required: true
        }],
        where: { isActive: true }
      });

      // Total de usuarios activos
      const totalActiveUsers = await User.count({
        where: { isActive: true }
      });

      res.json({
        success: true,
        data: {
          roleStats: roleStats.reduce((acc, stat) => {
            acc[stat.role] = parseInt(stat.dataValues.count);
            return acc;
          }, {}),
          newUsersThisMonth,
          usersWithActiveMemberships,
          totalActiveUsers,
          role: 'admin'
        }
      });
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }

  // ✅ CORREGIDO: Solo staff puede buscar usuarios
  async searchUsers(req, res) {
    try {
      const { q: query, role } = req.query;

      if (!query || query.length < 2) {
        return res.json({
          success: true,
          data: { users: [] }
        });
      }

      // ✅ CORREGIDO: Solo staff puede buscar usuarios
      if (req.user.role === 'cliente') {
        return res.status(403).json({
          success: false,
          message: 'Los clientes no pueden buscar otros usuarios'
        });
      }

      const where = {
        isActive: true,
        [Op.or]: [
          { firstName: { [Op.iLike]: `%${query}%` } },
          { lastName: { [Op.iLike]: `%${query}%` } },
          { email: { [Op.iLike]: `%${query}%` } }
        ]
      };

      // Colaborador solo busca clientes
      if (req.user.role === 'colaborador') {
        where.role = 'cliente';
      } else if (role) {
        where.role = role;
      }

      const users = await User.findAll({
        where,
        attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
        limit: 10,
        order: [['firstName', 'ASC']]
      });

      res.json({
        success: true,
        data: { users }
      });
    } catch (error) {
      console.error('Error en búsqueda de usuarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error al buscar usuarios',
        error: error.message
      });
    }
  }

  // Obtener clientes que pagan por día frecuentemente (sin cambios)
  async getFrequentDailyClients(req, res) {
    try {
      const { days = 30, minVisits = 10 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      // Buscar clientes con pagos diarios frecuentes
      const frequentClients = await User.findAll({
        include: [{
          model: Payment,
          as: 'payments',
          where: {
            paymentType: 'daily',
            paymentDate: { [Op.gte]: startDate },
            status: 'completed'
          },
          attributes: []
        }],
        attributes: [
          'id', 'firstName', 'lastName', 'email', 'whatsapp',
          [User.sequelize.fn('COUNT', User.sequelize.col('payments.id')), 'dailyPayments']
        ],
        group: ['User.id'],
        having: User.sequelize.where(
          User.sequelize.fn('COUNT', User.sequelize.col('payments.id')),
          '>=',
          parseInt(minVisits)
        ),
        order: [[User.sequelize.fn('COUNT', User.sequelize.col('payments.id')), 'DESC']]
      });

      res.json({
        success: true,
        data: { 
          clients: frequentClients,
          criteria: {
            days: parseInt(days),
            minVisits: parseInt(minVisits)
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener clientes frecuentes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener clientes frecuentes',
        error: error.message
      });
    }
  }
}

module.exports = new UserController();