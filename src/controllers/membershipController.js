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
        planId, 
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



// ✅ NUEVO: Obtener planes disponibles con disponibilidad de horarios
async getPurchaseableePlans(req, res) {
  try {
    const { MembershipPlans, GymHours, GymTimeSlots } = require('../models');
    
    // Obtener planes activos
    const plans = await MembershipPlans.getActivePlans();
    
    // Obtener disponibilidad de horarios
    const flexibleSchedule = await GymHours.getFlexibleSchedule();
    
    // Formatear planes con información de disponibilidad
    const plansWithAvailability = plans.map(plan => {
      const totalCapacity = Object.values(flexibleSchedule).reduce((total, day) => {
        if (day.isOpen && day.timeSlots) {
          return total + day.timeSlots.reduce((dayTotal, slot) => dayTotal + slot.capacity, 0);
        }
        return total;
      }, 0);
      
      const totalReserved = Object.values(flexibleSchedule).reduce((total, day) => {
        if (day.isOpen && day.timeSlots) {
          return total + day.timeSlots.reduce((dayTotal, slot) => dayTotal + slot.reservations, 0);
        }
        return total;
      }, 0);
      
      return {
        id: plan.id,
        name: plan.planName,
        price: parseFloat(plan.price),
        originalPrice: plan.originalPrice ? parseFloat(plan.originalPrice) : null,
        durationType: plan.durationType,
        features: plan.features || [],
        isPopular: plan.isPopular,
        iconName: plan.iconName,
        discountPercentage: plan.getDiscountPercentage(),
        // ✅ NUEVO: Información de disponibilidad
        availability: {
          totalCapacity,
          totalReserved,
          availableSpaces: totalCapacity - totalReserved,
          occupancyPercentage: totalCapacity > 0 ? Math.round((totalReserved / totalCapacity) * 100) : 0
        }
      };
    });
    
    res.json({
      success: true,
      data: {
        plans: plansWithAvailability,
        scheduleAvailability: flexibleSchedule
      }
    });
  } catch (error) {
    console.error('Error al obtener planes comprables:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener planes disponibles',
      error: error.message
    });
  }
}

// ✅ NUEVO: Verificar disponibilidad de horarios para una compra
async checkScheduleAvailability(req, res) {
  try {
    const { planId, selectedSchedule } = req.body;
    
    if (!selectedSchedule || Object.keys(selectedSchedule).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe seleccionar al menos un horario'
      });
    }
    
    const { GymTimeSlots } = require('../models');
    const availability = {};
    const conflicts = [];
    
    // Verificar cada día y franja seleccionada
    for (const [day, timeSlotIds] of Object.entries(selectedSchedule)) {
      availability[day] = [];
      
      if (Array.isArray(timeSlotIds)) {
        for (const timeSlotId of timeSlotIds) {
          const slot = await GymTimeSlots.findByPk(timeSlotId);
          
          if (!slot) {
            conflicts.push({
              day,
              timeSlotId,
              error: 'Franja horaria no encontrada'
            });
            continue;
          }
          
          const hasCapacity = slot.currentReservations < slot.capacity;
          const slotInfo = {
            id: slot.id,
            openTime: slot.openTime,
            closeTime: slot.closeTime,
            capacity: slot.capacity,
            currentReservations: slot.currentReservations,
            available: hasCapacity,
            label: slot.slotLabel
          };
          
          availability[day].push(slotInfo);
          
          if (!hasCapacity) {
            conflicts.push({
              day,
              timeSlotId,
              slot: slotInfo,
              error: 'Sin capacidad disponible'
            });
          }
        }
      }
    }
    
    const canPurchase = conflicts.length === 0;
    
    res.json({
      success: true,
      data: {
        canPurchase,
        availability,
        conflicts,
        message: canPurchase 
          ? 'Todos los horarios están disponibles'
          : `${conflicts.length} conflictos encontrados`
      }
    });
  } catch (error) {
    console.error('Error al verificar disponibilidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar disponibilidad de horarios',
      error: error.message
    });
  }
}



// ✅ MÉTODO CORREGIDO: purchaseMembership - CON SOPORTE PARA PAGO EN EFECTIVO
// src/controllers/membershipController.js - MÉTODO purchaseMembership() COMPLETO Y FUNCIONANDO

// ✅ MÉTODO CORREGIDO: purchaseMembership - CON SOPORTE PARA PAGO EN EFECTIVO
async purchaseMembership(req, res) {
  let transaction = null;
  
  try {
    const {
      planId,
      selectedSchedule = {},
      paymentMethod = 'card',
      userId, // Solo para staff
      notes
    } = req.body;
    
    console.log(`🛒 INICIANDO COMPRA DE MEMBRESÍA:`);
    console.log(`   👤 Usuario: ${req.user.email} (${req.user.role})`);
    console.log(`   📋 Plan ID: ${planId}`);
    console.log(`   💳 Método: ${paymentMethod}`);
    
    // ✅ 1. VERIFICAR PLAN EXISTE
    const { MembershipPlans } = require('../models');
    const plan = await MembershipPlans.findByPk(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Plan de membresía no encontrado o inactivo'
      });
    }
    
    console.log(`✅ Plan encontrado: ${plan.planName} - Q${plan.price}`);
    
    // ✅ 2. DETERMINAR USUARIO OBJETIVO
    let targetUserId = req.user.id;
    let targetUser = req.user;
    
    if (userId && req.user.role !== 'cliente') {
      const { User } = require('../models');
      targetUser = await User.findByPk(userId);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'Usuario objetivo no encontrado'
        });
      }
      targetUserId = userId;
    }
    
    // ✅ 3. VERIFICAR NO TIENE MEMBRESÍA ACTIVA
    const { Membership } = require('../models');
    const existingMembership = await Membership.findOne({
      where: { userId: targetUserId, status: 'active' }
    });
    
    if (existingMembership) {
      return res.status(400).json({
        success: false,
        message: 'El usuario ya tiene una membresía activa'
      });
    }
    
    // ✅ 4. CALCULAR DURACIÓN
    const durationDays = {
      daily: 1, weekly: 7, monthly: 30, quarterly: 90, annual: 365
    }[plan.durationType] || 30;
    
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
    
    console.log(`📅 Duración: ${durationDays} días`);
    
    // ✅ 5. VALIDAR Y PREPARAR HORARIOS (ANTES DE LA TRANSACCIÓN)
    let processedSchedule = {};
    let slotsToReserve = [];
    
    if (Object.keys(selectedSchedule).length > 0) {
      console.log(`🕐 Validando horarios...`);
      
      const { GymTimeSlots } = require('../models');
      
      for (const [day, timeSlotIds] of Object.entries(selectedSchedule)) {
        if (Array.isArray(timeSlotIds) && timeSlotIds.length > 0) {
          processedSchedule[day] = [];
          
          for (const timeSlotId of timeSlotIds) {
            const slot = await GymTimeSlots.findByPk(timeSlotId);
            
            if (!slot) {
              return res.status(400).json({
                success: false,
                message: `Franja horaria no encontrada: ${timeSlotId}`
              });
            }
            
            if (slot.currentReservations >= slot.capacity) {
              return res.status(400).json({
                success: false,
                message: `Sin capacidad: ${day} ${slot.openTime}`
              });
            }
            
            processedSchedule[day].push({
              slotId: parseInt(timeSlotId),
              openTime: slot.openTime,
              closeTime: slot.closeTime,
              label: slot.slotLabel
            });
            
            // Preparar para reservar
            slotsToReserve.push({
              slotId: parseInt(timeSlotId),
              day: day
            });
          }
        }
      }
      console.log(`✅ Horarios validados`);
    }
    
    // ✅ 6. INICIAR TRANSACCIÓN
    transaction = await Membership.sequelize.transaction();
    console.log(`🔄 Transacción iniciada...`);
    
    // ✅ 6.1. CREAR MEMBRESÍA - CAMBIO PRINCIPAL: ESTADO CONDICIONAL
    const membershipData = {
      userId: targetUserId,
      planId: planId,
      type: plan.durationType,
      price: parseFloat(plan.price),
      startDate: startDate,
      endDate: endDate,
      notes: notes || `Membresía ${plan.planName}`,
      status: ['cash', 'transfer'].includes(paymentMethod) ? 'pending' : 'active',
      totalDays: durationDays,
      remainingDays: durationDays,
      preferredSchedule: selectedSchedule,
      reservedSchedule: processedSchedule
    };
    
    const membership = await Membership.create(membershipData, { transaction });
    console.log(`✅ Membresía creada: ${membership.id} (estado: ${membership.status})`);
    
    // ✅ 6.2. RESERVAR HORARIOS (INCREMENTAR SLOTS) - Solo si no es cash
   if (slotsToReserve.length > 0 && !['cash', 'transfer'].includes(paymentMethod)) {
    console.log(`📅 Reservando ${slotsToReserve.length} slots...`);
    
    const { GymTimeSlots } = require('../models');
    
    for (const { slotId, day } of slotsToReserve) {
      await GymTimeSlots.increment('currentReservations', {
        by: 1,
        where: { id: slotId },
        transaction
      });
      console.log(`   ✅ ${day}: slot ${slotId} reservado`);
    }
    console.log(`✅ Todos los slots reservados`);
  } else if (['cash', 'transfer'].includes(paymentMethod)) {
    console.log(`💵 Horarios NO reservados - esperando ${paymentMethod === 'cash' ? 'pago en efectivo' : 'validación de transferencia'}`);
  }
      
    // ✅ 6.3. REGISTRAR PAGO - CAMBIO PRINCIPAL: SIEMPRE CREAR PAGO
    const { Payment } = require('../models');
    let payment = null;
    
    if (paymentMethod === 'cash') {
      // ✅ CORREGIDO: Para pago en efectivo, SÍ crear pago pendiente
      const paymentData = {
        userId: targetUserId,
        membershipId: membership.id,
        amount: parseFloat(plan.price),
        paymentMethod: paymentMethod,
        paymentType: 'membership',
        description: `Membresía ${plan.planName}`,
        registeredBy: req.user.id,
        status: 'pending', // ✅ PENDIENTE hasta que se pague en gimnasio
        paymentDate: new Date(),
        notes: 'Pago en efectivo pendiente - Cliente debe ir al gimnasio'
      };
      
      payment = await Payment.create(paymentData, { transaction });
      console.log(`💵 Pago en efectivo PENDIENTE creado: ${payment.id} - Q${payment.amount}`);
      console.log(`🏪 Cliente debe ir al gimnasio para completar el pago`);
      
    } else if (paymentMethod === 'transfer') {
      // ✅ Para transferencia, crear pago PENDIENTE (cliente subirá comprobante)
      const paymentData = {
        userId: targetUserId,
        membershipId: membership.id,
        amount: parseFloat(plan.price),
        paymentMethod: paymentMethod,
        paymentType: 'membership',
        description: `Membresía ${plan.planName}`,
        registeredBy: req.user.id,
        status: 'pending', // ✅ PENDIENTE hasta que se valide transferencia
        paymentDate: new Date(),
        notes: 'Transferencia pendiente - Cliente debe subir comprobante'
      };
      
      payment = await Payment.create(paymentData, { transaction });
      console.log(`🏦 Pago por transferencia creado PENDIENTE: ${payment.id} - Q${payment.amount}`);
      console.log(`📄 Cliente debe subir comprobante para validación`);
      
    } else {
      // ✅ Para otros métodos (tarjeta, etc.), crear pago completado
      const paymentData = {
        userId: targetUserId,
        membershipId: membership.id,
        amount: parseFloat(plan.price),
        paymentMethod: paymentMethod,
        paymentType: 'membership',
        description: `Membresía ${plan.planName}`,
        registeredBy: req.user.id,
        status: 'completed',
        paymentDate: new Date()
      };
      
      payment = await Payment.create(paymentData, { transaction });
      console.log(`💳 Pago registrado: ${payment.id} - Q${payment.amount}`);
    }
    
    // ✅ 6.4. CREAR MOVIMIENTO FINANCIERO - CAMBIO: SOLO SI HAY PAGO COMPLETADO
    if (payment && payment.status === 'completed') {
      try {
        const { FinancialMovements } = require('../models');
        
        if (FinancialMovements && typeof FinancialMovements.createFromAnyPayment === 'function') {
          const financialMovement = await FinancialMovements.createFromAnyPayment(payment, { transaction });
          console.log(`📊 Movimiento financiero: ${financialMovement?.id || 'creado'}`);
        } else {
          console.log('ℹ️ FinancialMovements.createFromAnyPayment no disponible');
        }
      } catch (financialError) {
        console.warn('⚠️ Error movimiento financiero (no crítico):', financialError.message);
        // No es crítico, la membresía y pago ya están creados
      }
    } else {
      console.log(`💵 Sin movimiento financiero - Pago pendiente de confirmación`);
    }
    
    // ✅ 6.5. CONFIRMAR TRANSACCIÓN (TODO EXITOSO HASTA AQUÍ)
    await transaction.commit();
    transaction = null; // ✅ CRÍTICO: Marcar como null para evitar rollback posterior
    console.log(`🎉 TRANSACCIÓN COMPLETADA EXITOSAMENTE`);
    
    // ✅ 7. OPERACIONES POST-COMMIT (NO CRÍTICAS)
    // Estas operaciones pueden fallar sin afectar la membresía ya creada
    
    let membershipForResponse = null;
    try {
      // Obtener membresía completa para respuesta
      membershipForResponse = await Membership.findByPk(membership.id, {
        include: [
          { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { association: 'registeredByUser', attributes: ['id', 'firstName', 'lastName'] }
        ]
      });
    } catch (fetchError) {
      console.warn('⚠️ Error obteniendo membresía para respuesta:', fetchError.message);
      membershipForResponse = membership; // Usar la original
    }
    
    // Enviar email de confirmación (no crítico) - Solo si no es cash
      try {
        if (['cash', 'transfer'].includes(paymentMethod)) {
          // Para pagos pendientes, enviar email de "solicitud en proceso"
          await this.sendPendingMembershipEmail(
            membershipForResponse || membership, 
            plan, 
            processedSchedule,
            paymentMethod
          );
          console.log(`✅ Email de solicitud pendiente enviado (${paymentMethod})`);
        } else {
          // Para pagos completados, enviar email de confirmación
          await this.sendMembershipConfirmationEmail(
            membershipForResponse || membership, 
            plan, 
            processedSchedule
          );
          console.log('✅ Email de confirmación de membresía activa enviado');
        }
      } catch (emailError) {
        console.warn('⚠️ Error enviando email (no crítico):', emailError.message);
      }
    
    // ✅ 8. PREPARAR RESPUESTA FINAL - CAMBIO: CONDICIONAL PARA CASH
    const summary = {
    daysTotal: durationDays,
    // ✅ CORREGIDO: Si es cash o transfer, no hay días activos aún
    daysRemaining: ['cash', 'transfer'].includes(paymentMethod) ? 0 : durationDays,
    daysUsed: 0,
    progress: 0,
    // ✅ CORREGIDO: Estado correcto según método de pago
    status: ['cash', 'transfer'].includes(paymentMethod) ? 'pending' : 'active'
  };
    
    let detailedSchedule = {};
    for (const [day, slots] of Object.entries(processedSchedule)) {
      detailedSchedule[day] = slots.map(slot => ({
        id: slot.slotId,
        openTime: slot.openTime,
        closeTime: slot.closeTime,
        label: slot.label
      }));
    }
    
    const planData = {
      id: plan.id,
      name: plan.planName,
      durationType: plan.durationType,
      originalPrice: parseFloat(plan.price),
      finalPrice: parseFloat(plan.price),
      totalDays: durationDays
    };
    
    console.log(`🎊 COMPRA COMPLETADA: ${plan.planName} para ${targetUser.firstName}`);
    
    // ✅ RESPUESTA FINAL - CAMBIO PRINCIPAL: CONDICIONAL PARA CASH
    res.status(201).json({
  success: true,
  message: paymentMethod === 'cash' 
    ? 'Membresía registrada - Debe pagar en efectivo en el gimnasio'
    : paymentMethod === 'transfer'
    ? 'Membresía registrada - Debe subir comprobante de transferencia'
    : 'Membresía comprada exitosamente',
  data: {
    membership: {
      ...(membershipForResponse || membership).toJSON(),
      summary: summary,
      schedule: detailedSchedule
    },
    payment: payment ? {
      id: payment.id,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      paymentDate: payment.paymentDate
    } : null,
    plan: planData,
    user: {
      id: targetUser.id,
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      email: targetUser.email
    },
    // ✅ CORREGIDO: Indicadores para ambos métodos
    requiresCashPayment: paymentMethod === 'cash',
    requiresTransferProof: paymentMethod === 'transfer',
    membershipStatus: paymentMethod === 'cash' ? 'pending_cash_payment' : 
                     paymentMethod === 'transfer' ? 'pending_transfer_validation' : 'active'
  }
});
    
  } catch (error) {
    console.error('❌ Error en compra:', error);
    
    // ✅ SOLO HACER ROLLBACK SI LA TRANSACCIÓN AÚN ESTÁ ACTIVA
    if (transaction) {
      try {
        await transaction.rollback();
        console.log('🔄 Rollback exitoso');
      } catch (rollbackError) {
        console.error('❌ Error en rollback:', rollbackError.message);
      }
    }
    
    let errorMessage = 'Error procesando compra de membresía';
    let statusCode = 500;
    
    if (error.name === 'SequelizeValidationError') {
      errorMessage = 'Error de validación: ' + error.errors?.map(e => e.message).join(', ');
      statusCode = 400;
    } else if (error.message.includes('ya tiene una membresía activa')) {
      errorMessage = 'El usuario ya tiene una membresía activa';
      statusCode = 400;
    } else if (error.message.includes('Plan de membresía no encontrado')) {
      errorMessage = 'Plan de membresía no válido';
      statusCode = 404;
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// ✅ NUEVO: Actualizar horarios de membresía existente
async updateMembershipSchedule(req, res) {
  try {
    const { id } = req.params;
    const { selectedSchedule, replaceAll = false } = req.body;
    
    const membership = await Membership.findByPk(id, {
      include: [{ association: 'user', attributes: ['id', 'role'] }]
    });
    
    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Membresía no encontrada'
      });
    }
    
    // Validar permisos
    if (req.user.role === 'cliente') {
      if (membership.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes modificar tus propios horarios'
        });
      }
    } else if (req.user.role === 'colaborador') {
      if (membership.user.role !== 'cliente') {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes modificar horarios de usuarios clientes'
        });
      }
    }
    
    const transaction = await Membership.sequelize.transaction();
    
    try {
      // Si replaceAll es true, liberar todas las reservas actuales
      if (replaceAll && membership.reservedSchedule) {
        for (const [day, timeSlotIds] of Object.entries(membership.reservedSchedule)) {
          if (Array.isArray(timeSlotIds)) {
            for (const timeSlotId of timeSlotIds) {
              await membership.cancelTimeSlot(day, timeSlotId);
            }
          }
        }
      }
      
      // Agregar nuevas reservas
      if (selectedSchedule && Object.keys(selectedSchedule).length > 0) {
        for (const [day, timeSlotIds] of Object.entries(selectedSchedule)) {
          if (Array.isArray(timeSlotIds)) {
            for (const timeSlotId of timeSlotIds) {
              try {
                await membership.reserveTimeSlot(day, timeSlotId);
              } catch (reserveError) {
                await transaction.rollback();
                return res.status(400).json({
                  success: false,
                  message: `Error al reservar ${day}: ${reserveError.message}`,
                  conflictSlot: { day, timeSlotId }
                });
              }
            }
          }
        }
      }
      
      await transaction.commit();
      
      // Obtener horarios actualizados
      const updatedSchedule = await membership.getDetailedSchedule();
      
      res.json({
        success: true,
        message: 'Horarios actualizados exitosamente',
        data: {
          membershipId: membership.id,
          schedule: updatedSchedule,
          summary: membership.getSummary()
        }
      });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('Error al actualizar horarios de membresía:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar horarios',
      error: error.message
    });
  }
}

// ✅ NUEVO: Obtener mi membresía actual con horarios detallados (clientes)
async getMyCurrentMembership(req, res) {
  try {
    const membership = await Membership.findOne({
      where: {
        userId: req.user.id,
        status: 'active'
      },
      include: [
        { association: 'registeredByUser', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });
    
    if (!membership) {
      return res.json({
        success: true,
        data: {
          membership: null,
          message: 'No tienes una membresía activa'
        }
      });
    }
    
    const detailedSchedule = await membership.getDetailedSchedule();
    const summary = membership.getSummary();
    
    res.json({
      success: true,
      data: {
        membership: {
          ...membership.toJSON(),
          schedule: detailedSchedule,
          summary
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener membresía actual:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tu membresía actual',
      error: error.message
    });
  }
}

// ✅ NUEVO: Procesar deducción diaria (cron job endpoint)
async processDailyDeduction(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden ejecutar este proceso'
      });
    }
    
    const { Membership } = require('../models');
    const result = await Membership.processDailyDeduction();
    
    // Enviar notificaciones a membresías próximas a expirar
    const expiringMemberships = await Membership.getExpiringMemberships(7);
    let notificationsSent = 0;
    
    for (const membership of expiringMemberships) {
      if (membership.needsExpirationNotification()) {
        try {
          await this.sendExpirationNotification(membership);
          notificationsSent++;
        } catch (notifError) {
          console.warn(`⚠️ Error enviando notificación a ${membership.user.email}:`, notifError.message);
        }
      }
    }
    
    res.json({
      success: true,
      message: 'Proceso de deducción diaria completado',
      data: {
        ...result,
        notificationsSent,
        expiringMemberships: expiringMemberships.length
      }
    });
  } catch (error) {
    console.error('Error en proceso diario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar deducción diaria',
      error: error.message
    });
  }
}

// ✅ NUEVO: Método para enviar email de confirmación de membresía
async sendMembershipConfirmationEmail(membership, plan, schedule) {
  try {
    const { EmailService } = require('../services/notificationServices');
    
    if (!EmailService) {
      console.log('ℹ️ Servicio de email no disponible');
      return;
    }
    
    const emailService = new EmailService();
    
    if (!emailService.isConfigured) {
      console.log('ℹ️ Servicio de email no configurado');
      return;
    }
    
    const user = membership.user;
    const summary = membership.getSummary();
    
    // Formatear horarios para el email
    const scheduleText = Object.entries(schedule).map(([day, slots]) => {
      if (slots.length === 0) return null;
      
      const dayName = {
        monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
        thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo'
      }[day];
      
      const slotsText = slots.map(slot => `${slot.openTime} - ${slot.closeTime}`).join(', ');
      return `${dayName}: ${slotsText}`;
    }).filter(Boolean).join('\n');
    
    const emailTemplate = {
      subject: `✅ Confirmación de Membresía - ${plan.planName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1>🎉 ¡Membresía Confirmada!</h1>
            <p style="font-size: 18px; margin: 0;">Bienvenido a Elite Fitness Club</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2>Hola ${user.firstName},</h2>
            <p>Tu membresía ha sido <strong>confirmada exitosamente</strong>. ¡Estamos emocionados de tenerte como parte de nuestra comunidad fitness!</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #667eea; margin-top: 0;">📋 Detalles de tu Membresía</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Plan:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${plan.planName}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Precio:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">Q${plan.price}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Días Totales:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${summary.daysTotal} días</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Días Restantes:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${summary.daysRemaining} días</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Fecha Inicio:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${membership.startDate}</td></tr>
                <tr><td style="padding: 8px;"><strong>Estado:</strong></td><td style="padding: 8px;"><span style="background: #22c55e; color: white; padding: 4px 8px; border-radius: 4px;">Activa</span></td></tr>
              </table>
            </div>
            
            ${scheduleText ? `
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #667eea; margin-top: 0;">⏰ Tus Horarios Reservados</h3>
              <pre style="background: #f1f5f9; padding: 15px; border-radius: 4px; font-family: monospace;">${scheduleText}</pre>
              <p style="font-size: 14px; color: #64748b; margin: 10px 0 0 0;">
                💡 Puedes cambiar tus horarios en cualquier momento desde tu cuenta.
              </p>
            </div>
            ` : ''}
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #667eea; margin-top: 0;">🚀 Próximos Pasos</h3>
              <ul style="color: #4b5563; line-height: 1.6;">
                <li><strong>Descarga nuestra app</strong> para gestionar tu membresía</li>
                <li><strong>Visita el gimnasio</strong> y preséntate con el staff</li>
                <li><strong>Consulta tus horarios</strong> reservados antes de asistir</li>
                <li><strong>Aprovecha</strong> todos nuestros servicios incluidos</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #64748b;">¿Tienes alguna pregunta? Contáctanos:</p>
              <p style="margin: 5px 0;"><strong>📞 WhatsApp:</strong> +502 1234-5678</p>
              <p style="margin: 5px 0;"><strong>📧 Email:</strong> info@elitefitness.com</p>
            </div>
          </div>
          
          <div style="background: #1f2937; color: #9ca3af; text-align: center; padding: 20px;">
            <p style="margin: 0;">Elite Fitness Club - Tu mejor versión te está esperando</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">© 2024 Elite Fitness Club. Todos los derechos reservados.</p>
          </div>
        </div>
      `,
      text: `
¡Membresía Confirmada!

Hola ${user.firstName},

Tu membresía "${plan.planName}" ha sido confirmada exitosamente.

Detalles:
- Plan: ${plan.planName} 
- Precio: Q${plan.price}
- Días Totales: ${summary.daysTotal}
- Días Restantes: ${summary.daysRemaining}
- Estado: Activa

${scheduleText ? `Horarios Reservados:\n${scheduleText}` : ''}

¡Bienvenido a Elite Fitness Club!

Elite Fitness Club
📞 +502 1234-5678
📧 info@elitefitness.com
      `
    };
    
    const result = await emailService.sendEmail({
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    });
    
    console.log(`✅ Email de confirmación enviado a ${user.email}`);
    return result;
    
  } catch (error) {
    console.error('Error enviando email de confirmación:', error);
    throw error;
  }
}

// ✅ NUEVO: Enviar notificación de próximo vencimiento
async sendExpirationNotification(membership) {
  try {
    const { EmailService } = require('../services/notificationServices');
    
    if (!EmailService) return;
    
    const emailService = new EmailService();
    if (!emailService.isConfigured) return;
    
    const user = membership.user;
    const daysLeft = membership.remainingDays;
    
    const emailTemplate = {
      subject: `⏰ Tu membresía expira en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; color: white;">
            <h1>⏰ Recordatorio de Renovación</h1>
            <p style="font-size: 18px; margin: 0;">Tu membresía expira pronto</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2>Hola ${user.firstName},</h2>
            <p>Tu membresía de Elite Fitness Club <strong>expira en ${daysLeft} día${daysLeft === 1 ? '' : 's'}</strong>.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h3 style="margin-top: 0; color: #d97706;">📊 Estado de tu Membresía</h3>
              <p><strong>Días Restantes:</strong> ${daysLeft}</p>
              <p><strong>Estado:</strong> ${daysLeft > 0 ? 'Activa' : 'Expirada'}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="font-size: 18px; color: #374151;">¡No pierdas tu rutina fitness!</p>
              <a href="#" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px;">
                🔄 Renovar Membresía
              </a>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px;">
              <h3 style="color: #10b981; margin-top: 0;">💚 Beneficios de renovar ahora:</h3>
              <ul style="color: #4b5563; line-height: 1.6;">
                <li>Mantén tus horarios reservados</li>
                <li>No pierdas tu progreso</li>
                <li>Continúa con tu rutina establecida</li>
                <li>Aprovecha descuentos especiales</li>
              </ul>
            </div>
          </div>
        </div>
      `,
      text: `
Recordatorio de Renovación

Hola ${user.firstName},

Tu membresía de Elite Fitness Club expira en ${daysLeft} día${daysLeft === 1 ? '' : 's'}.

¡No pierdas tu rutina fitness! Renueva tu membresía para continuar disfrutando de todos nuestros servicios.

Elite Fitness Club
📞 +502 1234-5678
      `
    };
    
    const result = await emailService.sendEmail({
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    });
    
    console.log(`✅ Notificación de vencimiento enviada a ${user.email} (${daysLeft} días)`);
    return result;
    
  } catch (error) {
    console.error('Error enviando notificación de vencimiento:', error);
    throw error;
  }
}

// ============================================================================
// NUEVOS MÉTODOS PARA GESTIÓN DE HORARIOS DE CLIENTES
// Agregar estos métodos al membershipController.js existente
// ============================================================================

// 📅 VER MIS HORARIOS ACTUALES (solo clientes)
async getMySchedule(req, res) {
  try {
    if (req.user.role !== 'cliente') {
      return res.status(403).json({
        success: false,
        message: 'Esta función es solo para clientes'
      });
    }

    const { Membership } = require('../models');
    
    const membership = await Membership.findOne({
      where: {
        userId: req.user.id,
        status: 'active'
      },
      include: [
        { association: 'plan', attributes: ['id', 'planName', 'durationType'] }
      ]
    });

    if (!membership) {
      return res.json({
        success: true,
        data: {
          hasMembership: false,
          message: 'No tienes una membresía activa'
        }
      });
    }

    // ✅ Procesar horarios en formato: objetos completos con slotId
    const currentSchedule = membership.reservedSchedule || {};
    const formattedSchedule = {};
    const dayNames = {
      monday: 'Lunes',
      tuesday: 'Martes', 
      wednesday: 'Miércoles',
      thursday: 'Jueves',
      friday: 'Viernes',
      saturday: 'Sábado',
      sunday: 'Domingo'
    };

    // Procesar cada día
    Object.entries(currentSchedule).forEach(([day, slots]) => {
      if (Array.isArray(slots) && slots.length > 0) {
        formattedSchedule[day] = {
          dayName: dayNames[day] || day,
          hasSlots: true,
          slots: slots.map(slotObj => ({
            id: slotObj.slotId,
            timeRange: `${slotObj.openTime.slice(0, 5)} - ${slotObj.closeTime.slice(0, 5)}`,
            openTime: slotObj.openTime.slice(0, 5),
            closeTime: slotObj.closeTime.slice(0, 5),
            label: slotObj.label || '',
            capacity: 0,
            currentReservations: 0,
            availability: 0,
            canCancel: true
          }))
        };
      }
    });

    // Completar días faltantes
    Object.keys(dayNames).forEach(day => {
      if (!formattedSchedule[day]) {
        formattedSchedule[day] = {
          dayName: dayNames[day],
          hasSlots: false,
          slots: []
        };
      }
    });

    const summary = membership.getSummary();
    const totalSlotsReserved = Object.values(formattedSchedule).reduce((total, day) => 
      total + (day.hasSlots ? day.slots.length : 0), 0
    );

    res.json({
      success: true,
      data: {
        hasMembership: true,
        membership: {
          id: membership.id,
          plan: membership.plan,
          summary
        },
        currentSchedule: formattedSchedule,
        totalSlotsReserved,
        canEditSchedule: summary.daysRemaining > 0
      }
    });

  } catch (error) {
    console.error('Error al obtener mis horarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tus horarios',
      error: error.message
    });
  }
}

// 🔍 VER OPCIONES DISPONIBLES PARA CAMBIAR (solo clientes)
// 🔍 VER OPCIONES DISPONIBLES PARA CAMBIAR (solo clientes) - SOLUCIÓN PRODUCCIÓN
async getMyAvailableOptions(req, res) {
  try {
    if (req.user.role !== 'cliente') {
      return res.status(403).json({
        success: false,
        message: 'Esta función es solo para clientes'
      });
    }

    const { day } = req.query;
    const { Membership, GymHours, GymTimeSlots } = require('../models');
    
    const membership = await Membership.findOne({
      where: {
        userId: req.user.id,
        status: 'active'
      },
      include: [{ association: 'plan' }]
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'No tienes una membresía activa'
      });
    }

    let allowedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    if (day && allowedDays.includes(day)) {
      allowedDays = [day];
    }

    const availableOptions = {};
    const dayNames = {
      monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
      thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo'
    };

    const currentSchedule = membership.reservedSchedule || {};

    for (const dayKey of allowedDays) {
      try {
        // Buscar configuración del día
        const gymHour = await GymHours.findOne({
          where: { dayOfWeek: dayKey }
        });
        
        if (!gymHour || gymHour.isClosed) {
          availableOptions[dayKey] = {
            dayName: dayNames[dayKey],
            isOpen: false,
            slots: [],
            message: gymHour ? 'Gimnasio cerrado este día' : 'Día no configurado'
          };
          continue;
        }
        
        // Obtener slots activos
        const timeSlots = await GymTimeSlots.findAll({
          where: { 
            gymHoursId: gymHour.id,
            isActive: true 
          },
          order: [['openTime', 'ASC']]
        });
        
        if (!timeSlots || timeSlots.length === 0) {
          availableOptions[dayKey] = {
            dayName: dayNames[dayKey],
            isOpen: false,
            slots: [],
            message: 'Sin horarios configurados'
          };
          continue;
        }
        
        // Extraer slots actuales del cliente
        const currentDayData = currentSchedule[dayKey] || [];
        const myCurrentSlotIds = [];
        
        if (Array.isArray(currentDayData)) {
          currentDayData.forEach(slotData => {
            if (typeof slotData === 'number') {
              myCurrentSlotIds.push(slotData);
            } else if (typeof slotData === 'object' && slotData) {
              const id = slotData.slotId || slotData.id;
              if (id) myCurrentSlotIds.push(parseInt(id));
            }
          });
        }
        
        // Procesar cada slot
        const processedSlots = timeSlots.map(slot => {
          const isMySlot = myCurrentSlotIds.includes(slot.id);
          const baseAvailable = slot.capacity - slot.currentReservations;
          const availableForMe = isMySlot ? baseAvailable + 1 : baseAvailable;
          
          return {
            id: slot.id,
            timeRange: `${slot.openTime.slice(0, 5)} - ${slot.closeTime.slice(0, 5)}`,
            openTime: slot.openTime.slice(0, 5),
            closeTime: slot.closeTime.slice(0, 5),
            label: slot.slotLabel || '',
            capacity: slot.capacity,
            currentReservations: slot.currentReservations,
            available: availableForMe,
            canSelect: availableForMe > 0,
            isCurrentlyMine: isMySlot,
            status: isMySlot ? 'current' : (availableForMe > 0 ? 'available' : 'full')
          };
        });
        
        availableOptions[dayKey] = {
          dayName: dayNames[dayKey],
          isOpen: true,
          slots: processedSlots,
          currentlyHas: myCurrentSlotIds.length,
          totalAvailable: processedSlots.filter(s => s.canSelect).length
        };
        
      } catch (dayError) {
        console.error(`Error procesando ${dayKey}:`, dayError.message);
        availableOptions[dayKey] = {
          dayName: dayNames[dayKey],
          isOpen: false,
          slots: [],
          error: dayError.message
        };
      }
    }

    res.json({
      success: true,
      data: {
        membershipId: membership.id,
        planInfo: {
          name: membership.plan?.planName || 'Plan Activo',
          type: membership.plan?.durationType || membership.type
        },
        availableOptions,
        currentSchedule: Object.keys(currentSchedule).reduce((acc, day) => {
          const daySlots = currentSchedule[day] || [];
          acc[day] = daySlots.map(slotObj => {
            return typeof slotObj === 'object' ? slotObj.slotId : slotObj;
          });
          return acc;
        }, {}),
        summary: membership.getSummary()
      }
    });

  } catch (error) {
    console.error('Error al obtener opciones disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener opciones disponibles',
      error: error.message
    });
  }
}

// ✏️ CAMBIAR MIS HORARIOS (solo clientes)
async changeMySchedule(req, res) {
  let transaction = null;
  
  try {
    if (req.user.role !== 'cliente') {
      return res.status(403).json({
        success: false,
        message: 'Esta función es solo para clientes'
      });
    }

    const { 
      changeType,
      changes,
      replaceAll = false 
    } = req.body;

    console.log(`🔄 Cliente ${req.user.email} cambiando horarios:`, {
      changeType,
      changes,
      replaceAll
    });

    // Validaciones
    if (!changes || typeof changes !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Debes especificar los cambios de horario'
      });
    }

    if (Object.keys(changes).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debes especificar al menos un cambio'
      });
    }

    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const [day, slotIds] of Object.entries(changes)) {
      if (!validDays.includes(day)) {
        return res.status(400).json({
          success: false,
          message: `Día inválido: ${day}`
        });
      }
      
      if (!Array.isArray(slotIds)) {
        return res.status(400).json({
          success: false,
          message: `Los slots para ${day} deben ser un array`
        });
      }
      
      for (const slotId of slotIds) {
        if (!Number.isInteger(slotId) || slotId <= 0) {
          return res.status(400).json({
            success: false,
            message: `ID de slot inválido en ${day}: ${slotId}`
          });
        }
      }
    }

    const { Membership, GymTimeSlots } = require('../models');
    
    const membership = await Membership.findOne({
      where: {
        userId: req.user.id,
        status: 'active'
      }
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'No tienes una membresía activa'
      });
    }

    const summary = membership.getSummary();
    if (summary.daysRemaining <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Tu membresía ha expirado, no puedes cambiar horarios'
      });
    }

    transaction = await Membership.sequelize.transaction();
    console.log('🔄 Transacción iniciada para cambio de horarios');

    // Procesar horarios actuales (formato: objetos completos)
    const currentReservedSchedule = membership.reservedSchedule || {};
    console.log('📅 Horarios actuales en BD:', currentReservedSchedule);

    // Helper para extraer slotId de objetos
    const extractSlotIdFromObject = (slotObj) => {
      if (typeof slotObj === 'number') return slotObj;
      if (typeof slotObj === 'object' && slotObj) {
        return slotObj.slotId || slotObj.id;
      }
      return null;
    };

    // Determinar cambios
    const slotsToReserve = [];
    const slotsToRelease = [];

    for (const [day, newSlotIds] of Object.entries(changes)) {
      if (!Array.isArray(newSlotIds)) continue;

      // Extraer IDs actuales del formato de objetos
      const currentDaySlots = currentReservedSchedule[day] || [];
      const currentSlotIds = [];
      
      if (Array.isArray(currentDaySlots)) {
        currentDaySlots.forEach(slotObj => {
          const id = extractSlotIdFromObject(slotObj);
          if (id) currentSlotIds.push(id);
        });
      }

      console.log(`📅 ${day}: Actual [${currentSlotIds.join(',')}] -> Nuevo [${newSlotIds.join(',')}]`);

      // Determinar qué slots liberar
      for (const currentSlotId of currentSlotIds) {
        if (!newSlotIds.includes(currentSlotId)) {
          slotsToRelease.push({ day, slotId: currentSlotId });
        }
      }

      // Determinar qué slots reservar
      for (const newSlotId of newSlotIds) {
        if (!currentSlotIds.includes(newSlotId)) {
          slotsToReserve.push({ day, slotId: newSlotId });
        }
      }
    }

    console.log(`🔄 A liberar: ${slotsToRelease.length}, A reservar: ${slotsToReserve.length}`);

    // Verificar disponibilidad
    const unavailableSlots = [];
    for (const { day, slotId } of slotsToReserve) {
      const slot = await GymTimeSlots.findByPk(slotId, { transaction });
      
      if (!slot) {
        unavailableSlots.push({ day, slotId, reason: 'Slot no encontrado' });
        continue;
      }

      if (slot.currentReservations >= slot.capacity) {
        unavailableSlots.push({ 
          day, 
          slotId, 
          reason: `Sin capacidad (${slot.currentReservations}/${slot.capacity})`,
          timeRange: `${slot.openTime.slice(0, 5)}-${slot.closeTime.slice(0, 5)}`
        });
      }
    }

    if (unavailableSlots.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Algunos horarios ya no están disponibles',
        unavailableSlots
      });
    }

    // Liberar slots actuales
    console.log('✅ Todos los slots están disponibles, ejecutando cambios...');
    for (const { day, slotId } of slotsToRelease) {
      try {
        const slot = await GymTimeSlots.findByPk(slotId, { transaction });
        if (slot && slot.currentReservations > 0) {
          await slot.decrement('currentReservations', { transaction });
          console.log(`🔓 Liberado: ${day} slot ${slotId}`);
        }
      } catch (releaseError) {
        console.error(`❌ Error liberando ${day} slot ${slotId}:`, releaseError.message);
      }
    }

    // Reservar nuevos slots
    for (const { day, slotId } of slotsToReserve) {
      try {
        const slot = await GymTimeSlots.findByPk(slotId, { transaction });
        if (slot) {
          await slot.increment('currentReservations', { transaction });
          console.log(`🔒 Reservado: ${day} slot ${slotId}`);
        }
      } catch (reserveError) {
        console.error(`❌ Error reservando ${day} slot ${slotId}:`, reserveError.message);
        await transaction.rollback();
        return res.status(500).json({
          success: false,
          message: `Error reservando horario ${day}: ${reserveError.message}`
        });
      }
    }

    // Actualizar reservedSchedule manteniendo formato original
    const updatedReservedSchedule = { ...currentReservedSchedule };
    
    for (const [day, newSlotIds] of Object.entries(changes)) {
      if (Array.isArray(newSlotIds) && newSlotIds.length > 0) {
        const completeSlots = [];
        
        for (const slotId of newSlotIds) {
          try {
            const slot = await GymTimeSlots.findByPk(slotId, { transaction });
            if (slot) {
              completeSlots.push({
                slotId: slot.id,
                label: slot.slotLabel || '',
                openTime: slot.openTime,
                closeTime: slot.closeTime
              });
            }
          } catch (error) {
            console.error(`Error obteniendo detalles del slot ${slotId}:`, error.message);
          }
        }
        
        // Mantener el formato original: objetos completos
        updatedReservedSchedule[day] = completeSlots;
      } else {
        delete updatedReservedSchedule[day];
      }
    }

    // Guardar cambios
    membership.reservedSchedule = updatedReservedSchedule;
    await membership.save({ transaction });

    await transaction.commit();
    transaction = null;
    console.log('✅ Cambios de horario completados exitosamente');

    // Preparar respuesta
    const formattedSchedule = {};
    const dayNames = {
      monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
      thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo'
    };

    Object.entries(updatedReservedSchedule).forEach(([day, slots]) => {
      formattedSchedule[day] = {
        dayName: dayNames[day],
        slots: slots.map(slot => ({
          id: slot.slotId,
          timeRange: `${slot.openTime.slice(0, 5)} - ${slot.closeTime.slice(0, 5)}`,
          label: slot.label || ''
        }))
      };
    });

    Object.keys(dayNames).forEach(day => {
      if (!formattedSchedule[day]) {
        formattedSchedule[day] = {
          dayName: dayNames[day],
          slots: []
        };
      }
    });

    res.json({
      success: true,
      message: 'Horarios actualizados exitosamente',
      data: {
        membershipId: membership.id,
        updatedSchedule: formattedSchedule,
        summary: membership.getSummary(),
        changes: {
          slotsReleased: slotsToRelease.length,
          slotsReserved: slotsToReserve.length,
          changeType
        }
      }
    });

  } catch (error) {
    console.error('❌ Error cambiando horarios:', error);
    
    if (transaction) {
      try {
        await transaction.rollback();
        console.log('🔄 Rollback exitoso');
      } catch (rollbackError) {
        console.error('❌ Error en rollback:', rollbackError.message);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error al cambiar horarios',
      error: error.message
    });
  }
}

// 🗑️ CANCELAR UN HORARIO ESPECÍFICO (solo clientes)
async cancelMyTimeSlot(req, res) {
  try {
    if (req.user.role !== 'cliente') {
      return res.status(403).json({
        success: false,
        message: 'Esta función es solo para clientes'
      });
    }

    const { day, slotId } = req.params;
    const { Membership, GymTimeSlots } = require('../models');

    const membership = await Membership.findOne({
      where: {
        userId: req.user.id,
        status: 'active'
      }
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'No tienes una membresía activa'
      });
    }

    // Verificar que el usuario tiene ese slot reservado
    const currentSchedule = membership.reservedSchedule || {};
    const daySlots = currentSchedule[day] || [];
    const targetSlotId = parseInt(slotId);
    
    const hasSlot = daySlots.some(slotObj => {
      const id = typeof slotObj === 'object' ? slotObj.slotId : slotObj;
      return id === targetSlotId;
    });

    if (!hasSlot) {
      return res.status(400).json({
        success: false,
        message: 'No tienes reservado ese horario'
      });
    }

    // Liberar el slot en la tabla GymTimeSlots
    const slot = await GymTimeSlots.findByPk(targetSlotId);
    if (slot && slot.currentReservations > 0) {
      await slot.decrement('currentReservations');
    }

    // Actualizar reservedSchedule
    const updatedSchedule = { ...currentSchedule };
    updatedSchedule[day] = daySlots.filter(slotObj => {
      const id = typeof slotObj === 'object' ? slotObj.slotId : slotObj;
      return id !== targetSlotId;
    });

    if (updatedSchedule[day].length === 0) {
      delete updatedSchedule[day];
    }

    membership.reservedSchedule = updatedSchedule;
    await membership.save();

    res.json({
      success: true,
      message: `Horario de ${day} cancelado exitosamente`,
      data: {
        cancelledSlot: { day, slotId: targetSlotId },
        updatedSchedule: updatedSchedule[day] || []
      }
    });

  } catch (error) {
    console.error('Error cancelando horario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar horario',
      error: error.message
    });
  }
}

// 📊 ESTADÍSTICAS DE MIS HORARIOS (solo clientes)
async getMyScheduleStats(req, res) {
  try {
    if (req.user.role !== 'cliente') {
      return res.status(403).json({
        success: false,
        message: 'Esta función es solo para clientes'
      });
    }

    const { Membership } = require('../models');
    
    const membership = await Membership.findOne({
      where: {
        userId: req.user.id,
        status: 'active'
      }
    });

    if (!membership) {
      return res.json({
        success: true,
        data: {
          hasMembership: false,
          message: 'No tienes una membresía activa'
        }
      });
    }

    const currentSchedule = await membership.getDetailedSchedule();
    const summary = membership.getSummary();

    // Calcular estadísticas
    const totalSlotsReserved = Object.values(currentSchedule).reduce((total, slots) => total + slots.length, 0);
    const daysWithSlots = Object.keys(currentSchedule).length;
    
    const dayNames = {
      monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
      thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo'
    };

    const scheduleByDay = Object.entries(currentSchedule).map(([day, slots]) => ({
      day,
      dayName: dayNames[day],
      slotsCount: slots.length,
      timeRanges: slots.map(slot => `${slot.openTime.slice(0, 5)}-${slot.closeTime.slice(0, 5)}`).join(', ')
    }));

    res.json({
      success: true,
      data: {
        hasMembership: true,
        membership: {
          id: membership.id,
          summary
        },
        stats: {
          totalSlotsReserved,
          daysWithSlots,
          averageSlotsPerDay: daysWithSlots > 0 ? (totalSlotsReserved / daysWithSlots).toFixed(1) : 0,
          canEditSchedule: summary.daysRemaining > 0,
          scheduleByDay
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de horarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
}


// Cambiar horarios de membresía (con validaciones del plan)
  async changeSchedule(req, res) {
    try {
      const { id } = req.params;
      const { selectedSchedule, removeSlots = [] } = req.body;
      
      const membership = await Membership.findByPk(id, {
        include: [
          { association: 'user', attributes: ['id', 'role'] },
          { association: 'plan', attributes: ['allowedDays', 'timeRestrictions', 'maxSlotsPerDay', 'maxReservationsPerWeek', 'allowScheduleChanges', 'changeHoursAdvance'] }
        ]
      });
      
      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Membresía no encontrada'
        });
      }
      
      // Validar permisos
      if (req.user.role === 'cliente' && membership.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes modificar tus propios horarios'
        });
      }
      
      if (req.user.role === 'colaborador' && membership.user.role !== 'cliente') {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes modificar horarios de usuarios clientes'
        });
      }
      
      // Validar si el plan permite cambios
      if (!membership.plan.allowScheduleChanges) {
        return res.status(400).json({
          success: false,
          message: 'Este plan no permite cambios de horario'
        });
      }
      
      // Validar horarios según plan (igual que en purchaseMembership)
      if (selectedSchedule && Object.keys(selectedSchedule).length > 0) {
    const { GymTimeSlots } = require('../models');
    
    // Verificar disponibilidad de capacidad en franjas
    for (const [day, timeSlotIds] of Object.entries(selectedSchedule)) {
      if (Array.isArray(timeSlotIds)) {
        // ✅ Verificar que el día esté permitido en el plan
        if (!membership.plan.allowedDays.includes(day)) {
          return res.status(400).json({
            success: false,
            message: `El plan ${membership.plan.planName} no permite reservas los ${day}`,
            invalidDay: day
          });
        }
        
        // ✅ Verificar límite de slots por día
        if (timeSlotIds.length > membership.plan.maxSlotsPerDay) {
          return res.status(400).json({
            success: false,
            message: `El plan ${membership.plan.planName} permite máximo ${membership.plan.maxSlotsPerDay} horario(s) por día`,
            day,
            maxAllowed: membership.plan.maxSlotsPerDay
          });
        }
        
        for (const timeSlotId of timeSlotIds) {
          const slot = await GymTimeSlots.findByPk(timeSlotId);
          
          if (!slot) {
            return res.status(400).json({
              success: false,
              message: `Franja horaria no encontrada: ${timeSlotId}`,
              unavailableSlot: { day, timeSlotId }
            });
          }
          
          if (slot.currentReservations >= slot.capacity) {
            return res.status(400).json({
              success: false,
              message: `Franja horaria sin capacidad: ${day} ${slot.openTime}`,
              unavailableSlot: { day, timeSlotId }
            });
          }
          
          // ✅ Verificar restricciones de horario específicas del plan
          if (membership.plan.timeRestrictions && membership.plan.timeRestrictions[day]) {
            const allowedSlots = membership.plan.timeRestrictions[day].map(id => parseInt(id));
            if (!allowedSlots.includes(parseInt(timeSlotId))) {
              return res.status(400).json({
                success: false,
                message: `Horario no permitido para este plan en ${day}: ${slot.openTime}`,
                invalidSlot: { day, timeSlotId, time: slot.openTime }
              });
            }
          }
        }
      }
    }
  
  // ✅ Verificar límite de reservas por semana
  // Obtener reservas actuales de la membresía
  const currentSchedule = await membership.getDetailedSchedule();
  const currentReservations = Object.values(currentSchedule).reduce((total, daySlots) => {
    return total + (daySlots ? daySlots.length : 0);
  }, 0);
  
  // Calcular nuevas reservas (considerando las que se van a remover)
  const newReservations = Object.values(selectedSchedule).reduce((total, slots) => total + slots.length, 0);
  const removedReservations = removeSlots.length;
  const totalReservationsAfterChange = currentReservations - removedReservations + newReservations;
  
  if (totalReservationsAfterChange > membership.plan.maxReservationsPerWeek) {
    return res.status(400).json({
      success: false,
      message: `El plan ${membership.plan.planName} permite máximo ${membership.plan.maxReservationsPerWeek} reservas por semana`,
      currentReservations,
      newReservations,
      removedReservations,
      totalAfterChange: totalReservationsAfterChange,
      maxAllowed: membership.plan.maxReservationsPerWeek
    });
  }
}

// ✅ VALIDACIÓN ADICIONAL: Verificar tiempo de anticipación para cambios
if (membership.plan.changeHoursAdvance && membership.plan.changeHoursAdvance > 0) {
  const now = new Date();
  const minChangeTime = new Date(now.getTime() + membership.plan.changeHoursAdvance * 60 * 60 * 1000);
  
  // Verificar si hay alguna reserva que se esté intentando cambiar muy cerca del horario
  for (const { day, timeSlotId } of removeSlots) {
    const slot = await GymTimeSlots.findByPk(timeSlotId);
    if (slot) {
      // Calcular la fecha/hora de la reserva (esto depende de cómo manejes las fechas)
      // Aquí asumo que necesitas validar contra el próximo día de la semana
      const nextSlotDate = getNextDateForDay(day); // Esta función necesitarías implementarla
      const slotDateTime = new Date(`${nextSlotDate}T${slot.openTime}`);
      
      if (slotDateTime < minChangeTime) {
        return res.status(400).json({
          success: false,
          message: `No puedes cancelar reservas con menos de ${membership.plan.changeHoursAdvance} horas de anticipación`,
          slot: { day, time: slot.openTime },
          requiredAdvance: membership.plan.changeHoursAdvance
        });
      }
    }
  }
}
    
    const transaction = await Membership.sequelize.transaction();
    
    try {
      // Remover slots especificados
      for (const { day, timeSlotId } of removeSlots) {
        await membership.cancelTimeSlot(day, timeSlotId);
      }
      
      // Agregar nuevos slots
      if (selectedSchedule) {
        for (const [day, timeSlotIds] of Object.entries(selectedSchedule)) {
          if (Array.isArray(timeSlotIds)) {
            for (const timeSlotId of timeSlotIds) {
              await membership.reserveTimeSlot(day, timeSlotId);
            }
          }
        }
      }
      
      await transaction.commit();
      
      const updatedSchedule = await membership.getDetailedSchedule();
      
      res.json({
        success: true,
        message: 'Horarios actualizados exitosamente',
        data: {
          membershipId: membership.id,
          schedule: updatedSchedule,
          summary: membership.getSummary()
        }
      });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('Error al cambiar horarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar horarios',
      error: error.message
    });
  }
}


async getAvailableScheduleOptions(req, res) {
  try {
    const { planId } = req.params;
    const { MembershipPlans, GymHours, GymTimeSlots } = require('../models');

    console.log(`🔍 Obteniendo horarios disponibles REALES para plan ID: ${planId}`);

    // Verificar que el plan existe
    const plan = await MembershipPlans.findByPk(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan de membresía no encontrado'
      });
    }

    // Determinar días permitidos según tipo de plan
    let allowedDays = [];
    let maxSlotsPerDay = 1;
    let maxReservationsPerWeek = 5;

    switch (plan.durationType) {
      case 'daily':
        allowedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        maxSlotsPerDay = 1;
        maxReservationsPerWeek = 1;
        break;
      case 'monthly':
      case 'annual':
        allowedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        maxSlotsPerDay = 2;
        maxReservationsPerWeek = 5;
        break;
      default:
        allowedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        maxSlotsPerDay = 1;
        maxReservationsPerWeek = 5;
    }

    // ✅ OBTENER HORARIOS REALES DE LA BASE DE DATOS
    const availableOptions = {};
    const dayNames = {
      monday: 'Lunes',
      tuesday: 'Martes', 
      wednesday: 'Miércoles',
      thursday: 'Jueves',
      friday: 'Viernes',
      saturday: 'Sábado',
      sunday: 'Domingo'
    };

    // Consultar horarios reales para cada día permitido
    for (const day of allowedDays) {
      try {
        // Buscar horarios del gimnasio para este día
        const gymHour = await GymHours.findOne({
          where: { dayOfWeek: day },
          include: [{
            model: GymTimeSlots,
            as: 'timeSlots',
            where: { isActive: true },
            required: false,
            order: [['displayOrder', 'ASC'], ['openTime', 'ASC']]
          }]
        });

        if (gymHour && !gymHour.isClosed && gymHour.timeSlots && gymHour.timeSlots.length > 0) {
          // Mapear slots disponibles REALES
          const slots = gymHour.timeSlots.map(slot => {
            const currentReservations = slot.currentReservations || 0;
            const available = Math.max(0, slot.capacity - currentReservations);
            
            return {
              id: slot.id,
              label: slot.slotLabel || `${slot.openTime.slice(0, 5)} - ${slot.closeTime.slice(0, 5)}`,
              openTime: slot.openTime.slice(0, 5),
              closeTime: slot.closeTime.slice(0, 5),
              capacity: slot.capacity,
              currentReservations: currentReservations,
              available: available,
              canReserve: available > 0
            };
          });

          availableOptions[day] = {
            dayName: dayNames[day],
            isOpen: true,
            slots: slots
          };

          console.log(`✅ ${dayNames[day]}: ${slots.length} slots reales obtenidos`);
        } else {
          console.log(`⚠️ ${dayNames[day]}: Cerrado o sin horarios configurados`);
          availableOptions[day] = {
            dayName: dayNames[day],
            isOpen: false,
            slots: []
          };
        }
      } catch (dayError) {
        console.error(`❌ Error obteniendo horarios para ${day}:`, dayError.message);
        availableOptions[day] = {
          dayName: dayNames[day],
          isOpen: false,
          slots: [],
          error: dayError.message
        };
      }
    }

    console.log(`✅ Horarios REALES obtenidos para ${plan.planName} - ${Object.keys(availableOptions).length} días procesados`);

    res.json({
      success: true,
      data: {
        plan: {
          id: plan.id,
          name: plan.planName,
          durationType: plan.durationType,
          price: plan.price,
          allowedDays,
          maxSlotsPerDay,
          maxReservationsPerWeek
        },
        availableOptions
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener opciones de horario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener opciones de horario',
      error: error.message
    });
  }
}

// ✅ NUEVO MÉTODO: Email para membresías pendientes
async sendPendingMembershipEmail(membership, plan, schedule, paymentMethod) {
  try {
    const { EmailService } = require('../services/notificationServices');
    
    if (!EmailService) {
      console.log('ℹ️ Servicio de email no disponible');
      return;
    }
    
    const emailService = new EmailService();
    
    if (!emailService.isConfigured) {
      console.log('ℹ️ Servicio de email no configurado');
      return;
    }
    
    const user = membership.user;
    
    // Determinar texto específico según método de pago
    const paymentInfo = paymentMethod === 'cash' ? {
      title: 'Pago en Efectivo Requerido',
      instruction: 'Visita nuestro gimnasio para completar el pago en efectivo',
      action: 'Ir al Gimnasio',
      icon: '💵',
      statusColor: '#f59e0b',
      nextSteps: [
        'Visita Elite Fitness Club en nuestro horario de atención',
        'Presenta tu nombre y menciona tu reserva de membresía',
        'Realiza el pago en efectivo con nuestro personal',
        'Tu membresía se activará inmediatamente después del pago'
      ]
    } : {
      title: 'Comprobante de Transferencia Requerido',
      instruction: 'Sube tu comprobante de transferencia para validar el pago',
      action: 'Subir Comprobante',
      icon: '🏦',
      statusColor: '#3b82f6',
      nextSteps: [
        'Realiza la transferencia a nuestra cuenta bancaria',
        'Sube una foto clara del comprobante en tu cuenta',
        'Nuestro equipo validará el pago en máximo 24 horas',
        'Recibirás confirmación una vez aprobada la transferencia'
      ]
    };

    // Formatear horarios para el email
    const scheduleText = Object.entries(schedule).map(([day, slots]) => {
      if (slots.length === 0) return null;
      
      const dayName = {
        monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
        thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo'
      }[day];
      
      const slotsText = slots.map(slot => `${slot.openTime} - ${slot.closeTime}`).join(', ');
      return `${dayName}: ${slotsText}`;
    }).filter(Boolean).join('\n');
    
    const emailTemplate = {
      subject: `⏳ Solicitud de Membresía Recibida - ${plan.planName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, ${paymentInfo.statusColor} 0%, #64748b 100%); padding: 30px; text-align: center; color: white;">
            <h1>${paymentInfo.icon} Solicitud Recibida</h1>
            <p style="font-size: 18px; margin: 0;">Elite Fitness Club</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2>Hola ${user.firstName},</h2>
            <p>¡Gracias por elegir Elite Fitness Club! Hemos recibido tu solicitud de membresía y está <strong>esperando confirmación de pago</strong>.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${paymentInfo.statusColor};">
              <h3 style="color: ${paymentInfo.statusColor}; margin-top: 0;">📋 Detalles de tu Solicitud</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Plan:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${plan.planName}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Precio:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">Q${plan.price}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Método de pago:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${paymentMethod === 'cash' ? 'Efectivo en gimnasio' : 'Transferencia bancaria'}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Fecha de solicitud:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(membership.createdAt).toLocaleDateString('es-ES')}</td></tr>
                <tr><td style="padding: 8px;"><strong>Estado:</strong></td><td style="padding: 8px;"><span style="background: ${paymentInfo.statusColor}; color: white; padding: 4px 8px; border-radius: 4px;">Pendiente de Pago</span></td></tr>
              </table>
            </div>
            
            ${scheduleText ? `
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #667eea; margin-top: 0;">⏰ Horarios Reservados (Pendientes)</h3>
              <pre style="background: #f1f5f9; padding: 15px; border-radius: 4px; font-family: monospace;">${scheduleText}</pre>
              <p style="font-size: 14px; color: #64748b; margin: 10px 0 0 0;">
                💡 Estos horarios se activarán automáticamente una vez confirmado el pago.
              </p>
            </div>
            ` : ''}
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid ${paymentInfo.statusColor};">
              <h3 style="color: ${paymentInfo.statusColor}; margin-top: 0;">${paymentInfo.icon} ${paymentInfo.title}</h3>
              <p style="font-size: 16px; color: #374151; margin-bottom: 15px;">
                <strong>${paymentInfo.instruction}</strong>
              </p>
              <ul style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                ${paymentInfo.nextSteps.map(step => `<li>${step}</li>`).join('')}
              </ul>
            </div>
            
            ${paymentMethod === 'transfer' ? `
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <h3 style="color: #1e40af; margin-top: 0;">🏦 Datos Bancarios</h3>
              <table style="width: 100%; color: #1e40af;">
                <tr><td style="padding: 4px 0;"><strong>Banco:</strong></td><td>Banco Industrial</td></tr>
                <tr><td style="padding: 4px 0;"><strong>Cuenta:</strong></td><td>123-456789-0</td></tr>
                <tr><td style="padding: 4px 0;"><strong>Nombre:</strong></td><td>Elite Fitness Club S.A.</td></tr>
                <tr><td style="padding: 4px 0;"><strong>Monto exacto:</strong></td><td style="font-weight: bold; font-size: 18px;">Q${plan.price}</td></tr>
              </table>
            </div>
            ` : ''}
            
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #92400e; margin-top: 0;">⚠️ Importante</h3>
              <ul style="color: #92400e; line-height: 1.6;">
                <li><strong>Tiempo límite:</strong> Tienes 48 horas para completar el pago</li>
                <li><strong>Horarios reservados:</strong> Se mantendrán hasta la confirmación</li>
                <li><strong>Sin pago confirmado:</strong> La solicitud será cancelada automáticamente</li>
                <li><strong>Soporte:</strong> Contáctanos si tienes dudas sobre el proceso</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #64748b;">¿Tienes alguna pregunta? Contáctanos:</p>
              <p style="margin: 5px 0;"><strong>📞 WhatsApp:</strong> +502 1234-5678</p>
              <p style="margin: 5px 0;"><strong>📧 Email:</strong> info@elitefitness.com</p>
            </div>
          </div>
          
          <div style="background: #1f2937; color: #9ca3af; text-align: center; padding: 20px;">
            <p style="margin: 0;">Elite Fitness Club - Tu mejor versión te está esperando</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">© 2024 Elite Fitness Club. Todos los derechos reservados.</p>
          </div>
        </div>
      `,
      text: `
Solicitud de Membresía Recibida - Elite Fitness Club

Hola ${user.firstName},

Hemos recibido tu solicitud de membresía y está esperando confirmación de pago.

Detalles de tu Solicitud:
- Plan: ${plan.planName} 
- Precio: Q${plan.price}
- Método: ${paymentMethod === 'cash' ? 'Efectivo en gimnasio' : 'Transferencia bancaria'}
- Estado: Pendiente de Pago

${paymentInfo.instruction}

Próximos pasos:
${paymentInfo.nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

${scheduleText ? `Horarios Reservados (Pendientes):\n${scheduleText}` : ''}

${paymentMethod === 'transfer' ? `
Datos Bancarios:
- Banco: Banco Industrial
- Cuenta: 123-456789-0
- Nombre: Elite Fitness Club S.A.
- Monto exacto: Q${plan.price}
` : ''}

¡Gracias por elegir Elite Fitness Club!

Elite Fitness Club
📞 +502 1234-5678
📧 info@elitefitness.com
      `
    };
    
    const result = await emailService.sendEmail({
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    });
    
    console.log(`✅ Email de solicitud pendiente enviado a ${user.email} (${paymentMethod})`);
    return result;
    
  } catch (error) {
    console.error('Error enviando email de solicitud pendiente:', error);
    throw error;
  }
}

// ✅ NUEVO: Obtener membresías pendientes de pago en efectivo
async getPendingCashMemberships(req, res) {
  try {
    if (!['admin', 'colaborador'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo el personal puede ver membresías pendientes'
      });
    }

    const { Op } = require('sequelize');
    const { Membership, MembershipPlans } = require('../models');
    
    let whereClause = {
      status: 'pending'
    };

    const userInclude = {
      association: 'user',
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'role']
    };

    // Colaborador solo ve membresías de clientes
    if (req.user.role === 'colaborador') {
      userInclude.where = { role: 'cliente' };
    }

    const pendingMemberships = await Membership.findAll({
      where: whereClause,
      include: [
        userInclude,
        {
          association: 'plan',
          attributes: ['id', 'planName', 'price'],
          required: false
        },
        {
          association: 'registeredByUser',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          association: 'payments',
          required: false,
          attributes: ['id', 'status', 'paymentMethod']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    // Filtrar membresías que NO tienen pago completado
    const filteredMemberships = pendingMemberships.filter(membership => {
      return !membership.payments || !membership.payments.some(p => p.status === 'completed');
    });

    // Formatear con horarios y tiempo de espera
    const formattedMemberships = await Promise.all(
      filteredMemberships.map(async (membership) => {
        const schedule = await membership.getDetailedSchedule();
        const hoursWaiting = (new Date() - membership.createdAt) / (1000 * 60 * 60);

        return {
          id: membership.id,
          price: parseFloat(membership.price),
          type: membership.type,
          status: membership.status,
          createdAt: membership.createdAt,
          user: {
            id: membership.user.id,
            name: `${membership.user.firstName} ${membership.user.lastName}`,
            email: membership.user.email,
            phone: membership.user.phone
          },
          plan: {
            id: membership.plan?.id,
            name: membership.plan?.planName,
            price: parseFloat(membership.plan?.price || membership.price)
          },
          schedule,
          registeredBy: {
            name: membership.registeredByUser ? 
              `${membership.registeredByUser.firstName} ${membership.registeredByUser.lastName}` : 
              'Sistema Online'
          },
          hoursWaiting: Math.round(hoursWaiting * 10) / 10,
          canActivate: true
        };
      })
    );

    console.log(`✅ ${req.user.role} obtuvo ${formattedMemberships.length} membresías pendientes de pago en efectivo`);

    res.json({
      success: true,
      data: {
        memberships: formattedMemberships,
        total: formattedMemberships.length
      }
    });

  } catch (error) {
    console.error('Error al obtener membresías pendientes de pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener membresías pendientes',
      error: error.message
    });
  }
}



}

module.exports = new MembershipController();