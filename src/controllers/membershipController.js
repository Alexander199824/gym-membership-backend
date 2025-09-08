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

// ✅ NUEVO: Comprar membresía (clientes) o crear membresía con horarios (staff)
async purchaseMembership(req, res) {
  try {
    const {
      planId,
      selectedSchedule = {},
      paymentMethod = 'pending', // 'cash', 'card', 'transfer', 'pending'
      notes,
      userId, // Solo para staff
      promotionCode // ✅ NUEVO: Código promocional
    } = req.body;
    
    const { MembershipPlans, Membership, Payment, FinancialMovements } = require('../models');
    
    // Determinar el usuario target
    let targetUserId = req.user.id;
    let isStaffPurchase = false;
    
    if (['admin', 'colaborador'].includes(req.user.role) && userId) {
      targetUserId = userId;
      isStaffPurchase = true;
    }
    
    // Verificar que el plan existe
    const plan = await MembershipPlans.findByPk(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Plan de membresía no encontrado o inactivo'
      });
    }
    
    // Verificar que no tenga una membresía activa del mismo tipo
    const existingMembership = await Membership.findOne({
      where: {
        userId: targetUserId,
        status: 'active'
      }
    });
    
    if (existingMembership) {
      return res.status(400).json({
        success: false,
        message: 'Ya tienes una membresía activa. Debe expirar antes de comprar otra.'
      });
    }
    
    // ✅ NUEVO: Validar y aplicar código promocional
    let appliedPromotion = null;
    let finalPrice = plan.price;
    let extraDays = 0;
    
    if (promotionCode) {
      const { PromotionCodes, MembershipPromotions } = require('../models');
      
      const promotion = await PromotionCodes.findOne({
        where: { code: promotionCode.toUpperCase(), isActive: true }
      });
      
      if (!promotion) {
        return res.status(400).json({
          success: false,
          message: 'Código promocional no válido o expirado'
        });
      }
      
      if (!promotion.isValid()) {
        return res.status(400).json({
          success: false,
          message: 'Código promocional expirado o agotado'
        });
      }
      
      const canUse = await promotion.canBeUsedBy(targetUserId);
      if (!canUse) {
        return res.status(400).json({
          success: false,
          message: 'Ya has usado este código promocional anteriormente'
        });
      }
      
      // Verificar si es aplicable al plan
      if (promotion.applicablePlans && promotion.applicablePlans.length > 0 && !promotion.applicablePlans.includes(planId)) {
        return res.status(400).json({
          success: false,
          message: 'Este código promocional no es válido para el plan seleccionado'
        });
      }
      
      // Aplicar promoción según tipo
      switch (promotion.type) {
        case 'percentage':
          const discount = (plan.price * promotion.value) / 100;
          finalPrice = Math.max(0, plan.price - discount);
          appliedPromotion = { promotion, discount };
          break;
        case 'fixed_amount':
          const fixedDiscount = Math.min(promotion.value, plan.price);
          finalPrice = Math.max(0, plan.price - fixedDiscount);
          appliedPromotion = { promotion, discount: fixedDiscount };
          break;
        case 'free_days':
          extraDays = promotion.freeDays || 0;
          appliedPromotion = { promotion, freeDaysAdded: extraDays };
          break;
        case 'gift':
          finalPrice = 0;
          appliedPromotion = { promotion, discount: plan.price };
          break;
      }
    }
    
    // ✅ MEJORADO: Validar horarios según restricciones del plan
    if (Object.keys(selectedSchedule).length > 0) {
      const { GymTimeSlots } = require('../models');
      
      // Verificar disponibilidad de capacidad en franjas
      for (const [day, timeSlotIds] of Object.entries(selectedSchedule)) {
        if (Array.isArray(timeSlotIds)) {
          // ✅ NUEVO: Verificar que el día esté permitido en el plan
          if (!plan.allowedDays.includes(day)) {
            return res.status(400).json({
              success: false,
              message: `El plan ${plan.planName} no permite reservas los ${day}`,
              invalidDay: day
            });
          }
          
          // ✅ NUEVO: Verificar límite de slots por día
          if (timeSlotIds.length > plan.maxSlotsPerDay) {
            return res.status(400).json({
              success: false,
              message: `El plan ${plan.planName} permite máximo ${plan.maxSlotsPerDay} horario(s) por día`,
              day,
              maxAllowed: plan.maxSlotsPerDay
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
            
            // ✅ NUEVO: Verificar restricciones de horario específicas del plan
            if (plan.timeRestrictions && plan.timeRestrictions[day]) {
              const allowedSlots = plan.timeRestrictions[day].map(id => parseInt(id));
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
      
      // ✅ NUEVO: Verificar límite de reservas por semana
      const totalReservations = Object.values(selectedSchedule).reduce((total, slots) => total + slots.length, 0);
      if (totalReservations > plan.maxReservationsPerWeek) {
        return res.status(400).json({
          success: false,
          message: `El plan ${plan.planName} permite máximo ${plan.maxReservationsPerWeek} reservas por semana`,
          currentReservations: totalReservations,
          maxAllowed: plan.maxReservationsPerWeek
        });
      }
    }
    
    const transaction = await Membership.sequelize.transaction();
    
    try {
      // Calcular duración en días según el tipo
      let durationInDays;
      switch (plan.durationType) {
        case 'daily':
          durationInDays = 1;
          break;
        case 'weekly':
          durationInDays = 7;
          break;
        case 'monthly':
          durationInDays = 30;
          break;
        case 'quarterly':
          durationInDays = 90;
          break;
        case 'biannual':
          durationInDays = 180;
          break;
        case 'annual':
          durationInDays = 365;
          break;
        default:
          durationInDays = 30;
      }
      
      const totalDays = durationInDays + extraDays;
      
      // ✅ MEJORADO: Crear membresía con planId
      const membershipData = {
        userId: targetUserId,
        planId: planId, // ✅ NUEVO: Asociar con el plan
        type: plan.durationType,
        price: finalPrice, // ✅ NUEVO: Precio con descuento aplicado
        startDate: new Date(),
        endDate: new Date(Date.now() + totalDays * 24 * 60 * 60 * 1000),
        notes: notes || `Membresía ${plan.planName}${appliedPromotion ? ` (Promoción aplicada: ${appliedPromotion.promotion.code})` : ''}`,
        registeredBy: req.user.id,
        status: paymentMethod === 'pending' ? 'pending' : 'active',
        totalDays: totalDays, // ✅ NUEVO: Días totales incluyendo promoción
        remainingDays: totalDays // ✅ NUEVO: Días restantes iniciales
      };
      
      const membership = await Membership.createWithSchedule(
        membershipData, 
        selectedSchedule, 
        { transaction }
      );
      
      // ✅ NUEVO: Registrar promoción aplicada
      if (appliedPromotion) {
        const { MembershipPromotions } = require('../models');
        await MembershipPromotions.create({
          membershipId: membership.id,
          promotionCodeId: appliedPromotion.promotion.id,
          userId: targetUserId,
          discountAmount: appliedPromotion.discount || 0,
          freeDaysAdded: appliedPromotion.freeDaysAdded || 0
        }, { transaction });
        
        // Incrementar uso del código
        await appliedPromotion.promotion.increment('currentUses', { transaction });
      }
      
      // Crear pago si no está pendiente
      let payment = null;
      if (paymentMethod !== 'pending') {
        const paymentData = {
          userId: targetUserId,
          membershipId: membership.id,
          amount: finalPrice, // ✅ MEJORADO: Usar precio final con descuento
          paymentMethod,
          paymentType: 'membership',
          description: `Compra de membresía ${plan.planName}${appliedPromotion ? ` (${appliedPromotion.promotion.code})` : ''}`,
          registeredBy: req.user.id,
          status: isStaffPurchase ? 'completed' : (paymentMethod === 'transfer' ? 'pending' : 'completed')
        };
        
        payment = await Payment.create(paymentData, { transaction });
        
        // Crear movimiento financiero si el pago está completo
        if (payment.status === 'completed') {
          await FinancialMovements.createFromAnyPayment(payment, { transaction });
        }
      }
      
      await transaction.commit();
      
      // Obtener membresía completa con horarios
      const completeMembership = await Membership.findByPk(membership.id, {
        include: [
          { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { association: 'registeredByUser', attributes: ['id', 'firstName', 'lastName'] },
          { association: 'plan', attributes: ['id', 'planName', 'price', 'durationType'] } // ✅ NUEVO: Incluir plan
        ]
      });
      
      const detailedSchedule = await completeMembership.getDetailedSchedule();
      
      // ✅ ENVIAR EMAIL DE CONFIRMACIÓN
      try {
        await this.sendMembershipConfirmationEmail(completeMembership, plan, detailedSchedule, appliedPromotion);
      } catch (emailError) {
        console.warn('⚠️ Error al enviar email de confirmación:', emailError.message);
      }
      
      console.log(`✅ ${isStaffPurchase ? 'Staff creó' : 'Cliente compró'} membresía: ${plan.planName} para usuario ${targetUserId}${appliedPromotion ? ` con promoción ${appliedPromotion.promotion.code}` : ''}`);
      
      res.status(201).json({
        success: true,
        message: isStaffPurchase 
          ? 'Membresía creada exitosamente'
          : 'Membresía comprada exitosamente',
        data: {
          membership: {
            ...completeMembership.toJSON(),
            summary: completeMembership.getSummary(),
            schedule: detailedSchedule,
            appliedPromotion: appliedPromotion ? {
              code: appliedPromotion.promotion.code,
              name: appliedPromotion.promotion.name,
              type: appliedPromotion.promotion.type,
              discount: appliedPromotion.discount || 0,
              freeDaysAdded: appliedPromotion.freeDaysAdded || 0
            } : null
          },
          payment: payment?.toJSON() || null,
          plan: {
            id: plan.id,
            name: plan.planName,
            originalPrice: plan.price,
            finalPrice: finalPrice,
            durationType: plan.durationType,
            totalDays: totalDays,
            extraDaysFromPromotion: extraDays
          }
        }
      });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('Error al comprar membresía:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar la compra de membresía',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
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
// Obtener opciones de horario disponibles según plan
async getAvailableScheduleOptions(req, res) {
  try {
    const { planId } = req.params;
    
    const plan = await MembershipPlans.findByPk(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan no encontrado'
      });
    }
    
    const { GymHours, GymTimeSlots } = require('../models');
    const availableOptions = {};
    
    // Días en español
    const dayNames = {
      monday: 'Lunes',
      tuesday: 'Martes', 
      wednesday: 'Miércoles',
      thursday: 'Jueves',
      friday: 'Viernes',
      saturday: 'Sábado',
      sunday: 'Domingo'
    };
    
    for (const dayOfWeek of plan.allowedDays) {
      const daySchedule = await GymHours.findOne({
        where: { dayOfWeek },
        include: [{
          model: GymTimeSlots,
          as: 'timeSlots',
          where: { isActive: true },
          required: false,
          order: [['displayOrder', 'ASC'], ['openTime', 'ASC']]
        }]
      });
      
      if (daySchedule && !daySchedule.isClosed) {
        let availableSlots = daySchedule.timeSlots || [];
        
        // Filtrar por restricciones del plan
        if (plan.timeRestrictions && plan.timeRestrictions[dayOfWeek]) {
          const allowedSlotIds = plan.timeRestrictions[dayOfWeek].map(id => parseInt(id));
          availableSlots = availableSlots.filter(slot => allowedSlotIds.includes(slot.id));
        }
        
        availableOptions[dayOfWeek] = {
          dayName: dayNames[dayOfWeek],
          dayCode: dayOfWeek,
          slots: availableSlots.map(slot => ({
            id: slot.id,
            openTime: slot.openTime.slice(0, 5),
            closeTime: slot.closeTime.slice(0, 5),
            label: slot.slotLabel || `${slot.openTime.slice(0, 5)} - ${slot.closeTime.slice(0, 5)}`,
            capacity: slot.capacity,
            currentReservations: slot.currentReservations,
            available: slot.capacity - slot.currentReservations,
            canReserve: slot.capacity > slot.currentReservations
          }))
        };
      }
    }
    
    res.json({
      success: true,
      data: {
        plan: {
          id: plan.id,
          name: plan.planName,
          allowedDays: plan.allowedDays,
          maxSlotsPerDay: plan.maxSlotsPerDay,
          maxReservationsPerWeek: plan.maxReservationsPerWeek,
          allowScheduleChanges: plan.allowScheduleChanges
        },
        availableOptions
      }
    });
    
  } catch (error) {
    console.error('Error al obtener opciones de horario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener opciones de horario',
      error: error.message
    });
  }
}

}

module.exports = new MembershipController();