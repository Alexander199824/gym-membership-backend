// src/controllers/membershipController.js - CORREGIDO: Colaboradores Y Clientes funcionando
const { Membership, User, Payment, MembershipPlans } = require('../models');
const { Op } = require('sequelize');
const { EmailService, WhatsAppService } = require('../services/notificationServices');

class MembershipController {
  constructor() {
    this.emailService = new EmailService();
    this.whatsappService = new WhatsAppService();
  }

  // ✅ CORREGIDO: Solo staff puede crear membresías
  async createMembership(req, res) {
    try {
      // ✅ CORREGIDO: Solo staff puede crear membresías
      if (!['admin', 'colaborador'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Solo el personal puede crear membresías'
        });
      }

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

      // Colaborador solo puede crear membresías para clientes
      if (req.user.role === 'colaborador' && user.role !== 'cliente') {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes crear membresías para usuarios con rol cliente'
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

      console.log(`✅ ${req.user.role} creó membresía: ${type} para ${user.firstName} ${user.lastName}`);

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

  // ✅ CORREGIDO: Funciona para colaborador (membresías de clientes) Y cliente (sus membresías)
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

      // Aplicar filtros básicos
      if (status) where.status = status;
      if (type) where.type = type;
      if (userId) where.userId = userId;

      // ✅ CORREGIDO: Lógica por rol específica
      if (req.user.role === 'colaborador') {
        // Colaborador puede ver membresías pero solo de usuarios clientes
        userWhere.role = 'cliente';
        console.log('🔍 Colaborador filtrando: solo membresías de usuarios clientes');
      } else if (req.user.role === 'cliente') {
        // ✅ CORREGIDO: Cliente solo puede ver SUS propias membresías
        where.userId = req.user.id;
        console.log(`🔍 Cliente ${req.user.id} filtrando: solo SUS propias membresías`);
      }
      // Admin puede ver todas sin restricción

      // Búsqueda por nombre de usuario (solo si no es cliente)
      if (search && req.user.role !== 'cliente') {
        userWhere[Op.or] = [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const includeUser = {
        association: 'user', 
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'role']
      };

      // Solo aplicar filtro de usuario si hay condiciones
      if (Object.keys(userWhere).length > 0) {
        includeUser.where = userWhere;
      }

      const { count, rows } = await Membership.findAndCountAll({
        where,
        include: [
          includeUser,
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

      console.log(`✅ ${req.user.role} obtuvo ${rows.length} membresías (total: ${count})`);

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

  // ✅ CORREGIDO: Solo staff puede ver membresías vencidas
  async getExpiredMemberships(req, res) {
    try {
      // ✅ CORREGIDO: Solo staff puede acceder
      if (!['admin', 'colaborador'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Solo el personal puede ver membresías vencidas'
        });
      }

      const { days = 0 } = req.query;

      let dateCondition;
      if (parseInt(days) === 0) {
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
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days));
        daysAgo.setHours(0, 0, 0, 0);
        
        dateCondition = { endDate: { [Op.lt]: daysAgo } };
      }

      const userInclude = {
        association: 'user', 
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'whatsapp', 'role']
      };

      // Colaborador solo ve membresías de clientes
      if (req.user.role === 'colaborador') {
        userInclude.where = { role: 'cliente' };
      }

      const expiredMemberships = await Membership.findAll({
        where: {
          status: 'active',
          ...dateCondition
        },
        include: [userInclude],
        order: [['endDate', 'ASC']]
      });

      console.log(`✅ ${req.user.role} obtuvo ${expiredMemberships.length} membresías vencidas`);

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

  // ✅ CORREGIDO: Solo staff puede ver membresías próximas a vencer
  async getExpiringSoon(req, res) {
    try {
      // ✅ CORREGIDO: Solo staff puede acceder
      if (!['admin', 'colaborador'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Solo el personal puede ver membresías próximas a vencer'
        });
      }

      const { days = 7 } = req.query;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + parseInt(days));

      const userInclude = {
        association: 'user', 
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'whatsapp', 'role']
      };

      // Colaborador solo ve membresías de clientes
      if (req.user.role === 'colaborador') {
        userInclude.where = { role: 'cliente' };
      }

      const expiringSoon = await Membership.findAll({
        where: {
          status: 'active',
          endDate: {
            [Op.between]: [today, futureDate]
          }
        },
        include: [userInclude],
        order: [['endDate', 'ASC']]
      });

      console.log(`✅ ${req.user.role} obtuvo ${expiringSoon.length} membresías próximas a vencer`);

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

  // ✅ CORREGIDO: Cliente puede ver su membresía, colaborador las de clientes
  async getMembershipById(req, res) {
    try {
      const { id } = req.params;

      const membership = await Membership.findByPk(id, {
        include: [
          { 
            association: 'user', 
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'whatsapp', 'role']
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

      // ✅ CORREGIDO: Validaciones por rol específico
      if (req.user.role === 'cliente') {
        // Cliente solo puede ver SUS propias membresías
        if (membership.userId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Solo puedes ver tus propias membresías'
          });
        }
      } else if (req.user.role === 'colaborador') {
        // Colaborador solo puede ver membresías de clientes
        if (membership.user.role !== 'cliente') {
          return res.status(403).json({
            success: false,
            message: 'Solo puedes ver membresías de usuarios clientes'
          });
        }
      }
      // Admin puede ver todo

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

  // ✅ CORREGIDO: Solo staff puede actualizar membresías
  async updateMembership(req, res) {
    try {
      // ✅ CORREGIDO: Solo staff puede actualizar
      if (!['admin', 'colaborador'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Solo el personal puede actualizar membresías'
        });
      }

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

      const membership = await Membership.findByPk(id, {
        include: [{ association: 'user', attributes: ['id', 'role'] }]
      });

      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Membresía no encontrada'
        });
      }

      // Colaborador solo puede actualizar membresías de clientes
      if (req.user.role === 'colaborador' && membership.user.role !== 'cliente') {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes modificar membresías de usuarios clientes'
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

      console.log(`✅ ${req.user.role} actualizó membresía ID: ${id}`);

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

  // ✅ CORREGIDO: Solo staff puede renovar membresías
  async renewMembership(req, res) {
    try {
      // ✅ CORREGIDO: Solo staff puede renovar
      if (!['admin', 'colaborador'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Solo el personal puede renovar membresías'
        });
      }

      const { id } = req.params;
      const { months = 1, price } = req.body;

      const membership = await Membership.findByPk(id, {
        include: [{ association: 'user', attributes: ['role'] }]
      });

      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Membresía no encontrada'
        });
      }

      // Colaborador solo puede renovar membresías de clientes
      if (req.user.role === 'colaborador' && membership.user.role !== 'cliente') {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes renovar membresías de usuarios clientes'
        });
      }

      // Calcular nueva fecha de vencimiento
      const currentEndDate = new Date(membership.endDate);
      const today = new Date();
      
      const startFrom = currentEndDate > today ? currentEndDate : today;
      
      const newEndDate = new Date(startFrom);
      newEndDate.setMonth(newEndDate.getMonth() + parseInt(months));

      membership.endDate = newEndDate;
      membership.status = 'active';
      if (price !== undefined) membership.price = price;
      
      await membership.save();

      console.log(`✅ ${req.user.role} renovó membresía ID: ${id} por ${months} mes(es)`);

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

  // ✅ CORREGIDO: Solo staff puede cancelar membresías
  async cancelMembership(req, res) {
    try {
      // ✅ CORREGIDO: Solo staff puede cancelar
      if (!['admin', 'colaborador'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Solo el personal puede cancelar membresías'
        });
      }

      const { id } = req.params;
      const { reason } = req.body;

      const membership = await Membership.findByPk(id, {
        include: [{ association: 'user', attributes: ['role'] }]
      });

      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Membresía no encontrada'
        });
      }

      // Colaborador solo puede cancelar membresías de clientes
      if (req.user.role === 'colaborador' && membership.user.role !== 'cliente') {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes cancelar membresías de usuarios clientes'
        });
      }

      membership.status = 'cancelled';
      if (reason) {
        membership.notes = membership.notes 
          ? `${membership.notes}\n\nCancelada: ${reason}`
          : `Cancelada: ${reason}`;
      }

      await membership.save();

      console.log(`✅ ${req.user.role} canceló membresía ID: ${id}`);

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

  // ✅ Planes de membresía (sin cambios - es público)
  async getMembershipPlans(req, res) {
    try {
      const plans = await MembershipPlans.getActivePlans();
      
      const formattedPlans = plans.map(plan => ({
        id: plan.id,
        name: plan.planName,
        price: parseFloat(plan.price),
        originalPrice: plan.originalPrice ? parseFloat(plan.originalPrice) : null,
        currency: 'GTQ',
        duration: plan.durationType === 'monthly' ? 'mes' : 
                  plan.durationType === 'daily' ? 'día' : 'año',
        popular: plan.isPopular,
        iconName: plan.iconName,
        color: '#3b82f6',
        features: plan.features || [],
        benefits: plan.features ? plan.features.map(feature => ({
          text: feature,
          included: true
        })) : [],
        active: plan.isActive,
        order: plan.displayOrder,
        discountPercentage: plan.getDiscountPercentage()
      }));
      
      res.json({
        success: true,
        data: formattedPlans
      });
    } catch (error) {
      console.error('Error al obtener planes de membresía:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener planes de membresía',
        error: error.message
      });
    }
  }

  // ✅ CORREGIDO: Solo staff puede ver estadísticas
  async getMembershipStats(req, res) {
    try {
      // ✅ CORREGIDO: Solo staff puede acceder
      if (!['admin', 'colaborador'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Solo el personal puede ver estadísticas de membresías'
        });
      }

      if (req.user.role === 'colaborador') {
        // Colaboradores ven estadísticas limitadas a clientes
        const activeMemberships = await Membership.count({
          include: [{
            association: 'user',
            where: { role: 'cliente' }
          }],
          where: { status: 'active' }
        });

        const membershipsByType = await Membership.findAll({
          attributes: [
            'type',
            [Membership.sequelize.fn('COUNT', Membership.sequelize.col('Membership.id')), 'count']
          ],
          include: [{
            association: 'user',
            attributes: [],
            where: { role: 'cliente' }
          }],
          where: { status: 'active' },
          group: ['type']
        });

        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        const expiringThisWeek = await Membership.count({
          include: [{
            association: 'user',
            where: { role: 'cliente' }
          }],
          where: {
            status: 'active',
            endDate: {
              [Op.between]: [new Date(), nextWeek]
            }
          }
        });

        const expiredMemberships = await Membership.count({
          include: [{
            association: 'user',
            where: { role: 'cliente' }
          }],
          where: {
            status: 'active',
            endDate: { [Op.lt]: new Date() }
          }
        });

        return res.json({
          success: true,
          data: {
            activeMemberships,
            membershipsByType: membershipsByType.reduce((acc, stat) => {
              acc[stat.type] = parseInt(stat.dataValues.count);
              return acc;
            }, {}),
            expiringThisWeek,
            expiredMemberships,
            role: 'colaborador'
          }
        });
      }

      // Solo admin puede ver estadísticas completas
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden ver estadísticas completas'
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
          monthlyIncome: monthlyIncome || 0,
          role: 'admin'
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

  // ✅ CORREGIDO: Cliente puede actualizar SUS horarios, colaborador los de clientes
  async updateSchedule(req, res) {
    try {
      const { id } = req.params;
      const { preferredSchedule } = req.body;

      const membership = await Membership.findByPk(id, {
        include: [{ association: 'user', attributes: ['id', 'role'] }]
      });

      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Membresía no encontrada'
        });
      }

      // ✅ CORREGIDO: Validaciones por rol específico
      if (req.user.role === 'cliente') {
        // Cliente solo puede actualizar SUS propios horarios
        if (membership.userId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Solo puedes actualizar tus propios horarios'
          });
        }
      } else if (req.user.role === 'colaborador') {
        // Colaborador solo puede actualizar horarios de clientes
        if (membership.user.role !== 'cliente') {
          return res.status(403).json({
            success: false,
            message: 'Solo puedes actualizar horarios de usuarios clientes'
          });
        }
      }
      // Admin puede actualizar cualquier horario

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