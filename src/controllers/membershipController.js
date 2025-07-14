// src/controllers/membershipController.js
const { Membership, User, Payment } = require('../models');
const { Op } = require('sequelize');
const { EmailService, WhatsAppService } = require('../services/notificationServices');

class MembershipController {
  constructor() {
    this.emailService = new EmailService();
    this.whatsappService = new WhatsAppService();
  }

  // Crear nueva membresía
  async createMembership(req, res) {
    try {
      const {
        userId,
        type,
        price,
        startDate,
        endDate,
        preferredSchedule,
        notes,
        autoRenew = false
      } = req.body;

      // Verificar que el usuario existe
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Verificar que no tenga una membresía activa del mismo tipo
      const existingMembership = await Membership.findOne({
        where: {
          userId,
          type,
          status: 'active'
        }
      });

      if (existingMembership) {
        return res.status(400).json({
          success: false,
          message: `El usuario ya tiene una membresía ${type} activa`
        });
      }

      const membershipData = {
        userId,
        type,
        price,
        startDate: startDate || new Date(),
        endDate,
        preferredSchedule: preferredSchedule || {},
        notes,
        autoRenew,
        registeredBy: req.user.id,
        status: 'active'
      };

      const membership = await Membership.create(membershipData);

      // Incluir datos del usuario en la respuesta
      const membershipWithUser = await Membership.findByPk(membership.id, {
        include: [
          { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { association: 'registeredByUser', attributes: ['id', 'firstName', 'lastName'] }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Membresía creada exitosamente',
        data: { membership: membershipWithUser }
      });
    } catch (error) {
      console.error('Error al crear membresía:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear membresía',
        error: error.message
      });
    }
  }

  // Obtener todas las membresías con filtros
  async getMemberships(req, res) {
    try {
      const {
        status,
        type,
        userId,
        page = 1,
        limit = 20,
        search
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};
      const userWhere = {};

      // Aplicar filtros
      if (status) where.status = status;
      if (type) where.type = type;
      if (userId) where.userId = userId;

      // Búsqueda por nombre de usuario
      if (search) {
        userWhere[Op.or] = [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const { count, rows } = await Membership.findAndCountAll({
        where,
        include: [
          { 
            association: 'user', 
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
            where: Object.keys(userWhere).length > 0 ? userWhere : undefined
          },
          { 
            association: 'registeredByUser', 
            attributes: ['id', 'firstName', 'lastName', 'role']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset,
        distinct: true
      });

      res.json({
        success: true,
        data: {
          memberships: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener membresías:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener membresías',
        error: error.message
      });
    }
  }

  // Obtener membresías vencidas
  async getExpiredMemberships(req, res) {
    try {
      const { days = 0 } = req.query; // days = 0 para vencidas hoy, > 0 para varios días

      let dateCondition;
      if (parseInt(days) === 0) {
        // Vencidas hoy
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        dateCondition = {
          [Op.and]: [
            { endDate: { [Op.gte]: today } },
            { endDate: { [Op.lt]: tomorrow } }
          ]
        };
      } else {
        // Vencidas hace varios días
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days));
        daysAgo.setHours(0, 0, 0, 0);
        
        dateCondition = { endDate: { [Op.lt]: daysAgo } };
      }

      const expiredMemberships = await Membership.findAll({
        where: {
          status: 'active',
          ...dateCondition
        },
        include: [
          { 
            association: 'user', 
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'whatsapp']
          }
        ],
        order: [['endDate', 'ASC']]
      });

      res.json({
        success: true,
        data: { 
          memberships: expiredMemberships,
          total: expiredMemberships.length
        }
      });
    } catch (error) {
      console.error('Error al obtener membresías vencidas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener membresías vencidas',
        error: error.message
      });
    }
  }

  // Obtener membresías próximas a vencer
  async getExpiringSoon(req, res) {
    try {
      const { days = 7 } = req.query;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + parseInt(days));

      const expiringSoon = await Membership.findAll({
        where: {
          status: 'active',
          endDate: {
            [Op.between]: [today, futureDate]
          }
        },
        include: [
          { 
            association: 'user', 
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'whatsapp']
          }
        ],
        order: [['endDate', 'ASC']]
      });

      res.json({
        success: true,
        data: { 
          memberships: expiringSoon,
          total: expiringSoon.length
        }
      });
    } catch (error) {
      console.error('Error al obtener membresías próximas a vencer:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener membresías próximas a vencer',
        error: error.message
      });
    }
  }

  // Obtener membresía por ID
  async getMembershipById(req, res) {
    try {
      const { id } = req.params;

      const membership = await Membership.findByPk(id, {
        include: [
          { 
            association: 'user', 
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'whatsapp']
          },
          { 
            association: 'registeredByUser', 
            attributes: ['id', 'firstName', 'lastName', 'role']
          },
          {
            association: 'payments',
            order: [['paymentDate', 'DESC']]
          }
        ]
      });

      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Membresía no encontrada'
        });
      }

      res.json({
        success: true,
        data: { membership }
      });
    } catch (error) {
      console.error('Error al obtener membresía:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener membresía',
        error: error.message
      });
    }
  }

  // Actualizar membresía
  async updateMembership(req, res) {
    try {
      const { id } = req.params;
      const {
        type,
        status,
        price,
        endDate,
        preferredSchedule,
        notes,
        autoRenew
      } = req.body;

      const membership = await Membership.findByPk(id);
      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Membresía no encontrada'
        });
      }

      // Actualizar campos
      if (type !== undefined) membership.type = type;
      if (status !== undefined) membership.status = status;
      if (price !== undefined) membership.price = price;
      if (endDate !== undefined) membership.endDate = endDate;
      if (preferredSchedule !== undefined) membership.preferredSchedule = preferredSchedule;
      if (notes !== undefined) membership.notes = notes;
      if (autoRenew !== undefined) membership.autoRenew = autoRenew;

      await membership.save();

      const updatedMembership = await Membership.findByPk(id, {
        include: [
          { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { association: 'registeredByUser', attributes: ['id', 'firstName', 'lastName'] }
        ]
      });

      res.json({
        success: true,
        message: 'Membresía actualizada exitosamente',
        data: { membership: updatedMembership }
      });
    } catch (error) {
      console.error('Error al actualizar membresía:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar membresía',
        error: error.message
      });
    }
  }

  // Renovar membresía
  async renewMembership(req, res) {
    try {
      const { id } = req.params;
      const { months = 1, price } = req.body;

      const membership = await Membership.findByPk(id, {
        include: ['user']
      });

      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Membresía no encontrada'
        });
      }

      // Calcular nueva fecha de vencimiento
      const currentEndDate = new Date(membership.endDate);
      const today = new Date();
      
      // Si la membresía ya venció, empezar desde hoy
      const startFrom = currentEndDate > today ? currentEndDate : today;
      
      const newEndDate = new Date(startFrom);
      newEndDate.setMonth(newEndDate.getMonth() + parseInt(months));

      // Actualizar membresía
      membership.endDate = newEndDate;
      membership.status = 'active';
      if (price !== undefined) membership.price = price;
      
      await membership.save();

      res.json({
        success: true,
        message: 'Membresía renovada exitosamente',
        data: { 
          membership,
          newEndDate,
          monthsAdded: parseInt(months)
        }
      });
    } catch (error) {
      console.error('Error al renovar membresía:', error);
      res.status(500).json({
        success: false,
        message: 'Error al renovar membresía',
        error: error.message
      });
    }
  }

  // Cancelar membresía
  async cancelMembership(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const membership = await Membership.findByPk(id);
      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Membresía no encontrada'
        });
      }

      membership.status = 'cancelled';
      if (reason) {
        membership.notes = membership.notes 
          ? `${membership.notes}\n\nCancelada: ${reason}`
          : `Cancelada: ${reason}`;
      }

      await membership.save();

      res.json({
        success: true,
        message: 'Membresía cancelada exitosamente'
      });
    } catch (error) {
      console.error('Error al cancelar membresía:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cancelar membresía',
        error: error.message
      });
    }
  }

  // Obtener estadísticas de membresías
  async getMembershipStats(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden ver estadísticas'
        });
      }

      // Total de membresías activas
      const activeMemberships = await Membership.count({
        where: { status: 'active' }
      });

      // Membresías por tipo
      const membershipsByType = await Membership.findAll({
        attributes: [
          'type',
          [Membership.sequelize.fn('COUNT', Membership.sequelize.col('id')), 'count']
        ],
        where: { status: 'active' },
        group: ['type']
      });

      // Membresías que vencen esta semana
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const expiringThisWeek = await Membership.count({
        where: {
          status: 'active',
          endDate: {
            [Op.between]: [new Date(), nextWeek]
          }
        }
      });

      // Membresías vencidas sin renovar
      const expiredMemberships = await Membership.count({
        where: {
          status: 'active',
          endDate: { [Op.lt]: new Date() }
        }
      });

      // Ingresos del mes por membresías
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const monthlyIncome = await Payment.sum('amount', {
        where: {
          paymentType: 'membership',
          status: 'completed',
          paymentDate: { [Op.gte]: thisMonth }
        }
      });

      res.json({
        success: true,
        data: {
          activeMemberships,
          membershipsByType: membershipsByType.reduce((acc, stat) => {
            acc[stat.type] = parseInt(stat.dataValues.count);
            return acc;
          }, {}),
          expiringThisWeek,
          expiredMemberships,
          monthlyIncome: monthlyIncome || 0
        }
      });
    } catch (error) {
      console.error('Error al obtener estadísticas de membresías:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }

  // Actualizar horarios de una membresía
  async updateSchedule(req, res) {
    try {
      const { id } = req.params;
      const { preferredSchedule } = req.body;

      const membership = await Membership.findByPk(id);
      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Membresía no encontrada'
        });
      }

      // Verificar que el usuario pueda actualizar esta membresía
      if (req.user.role === 'cliente' && membership.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes actualizar tus propios horarios'
        });
      }

      membership.preferredSchedule = preferredSchedule;
      await membership.save();

      res.json({
        success: true,
        message: 'Horarios actualizados exitosamente',
        data: { preferredSchedule: membership.preferredSchedule }
      });
    } catch (error) {
      console.error('Error al actualizar horarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar horarios',
        error: error.message
      });
    }
  }
}

module.exports = new MembershipController();