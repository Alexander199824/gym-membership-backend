// src/controllers/membershipPlansController.js - Controlador COMPLETO para CRUD de Planes de Membresía
const { MembershipPlans, Membership } = require('../models');
const { Op } = require('sequelize');

class MembershipPlansController {
  constructor() {
    // Bindear métodos
    this.getAllPlans = this.getAllPlans.bind(this);
    this.getActivePlans = this.getActivePlans.bind(this);
    this.getPlanById = this.getPlanById.bind(this);
    this.createPlan = this.createPlan.bind(this);
    this.updatePlan = this.updatePlan.bind(this);
    this.deletePlan = this.deletePlan.bind(this);
    this.togglePlanStatus = this.togglePlanStatus.bind(this);
    this.duplicatePlan = this.duplicatePlan.bind(this);
    this.reorderPlans = this.reorderPlans.bind(this);
    this.getPlansStats = this.getPlansStats.bind(this);
  }

  // ✅ OBTENER TODOS LOS PLANES (con filtros)
  async getAllPlans(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        durationType,
        status,
        sortBy = 'displayOrder',
        sortOrder = 'ASC'
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // Aplicar filtros
      if (search) {
        where.planName = { [Op.iLike]: `%${search}%` };
      }

      if (durationType) {
        where.durationType = durationType;
      }

      if (status === 'active') {
        where.isActive = true;
      } else if (status === 'inactive') {
        where.isActive = false;
      }

      // Validar campo de ordenamiento
      const validSortFields = ['planName', 'price', 'durationType', 'displayOrder', 'createdAt'];
      const orderField = validSortFields.includes(sortBy) ? sortBy : 'displayOrder';
      const orderDirection = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      const { count, rows } = await MembershipPlans.findAndCountAll({
        where,
        order: [[orderField, orderDirection]],
        limit: parseInt(limit),
        offset,
        include: [
          {
            model: Membership,
            as: 'memberships',
            attributes: ['id', 'status'],
            required: false
          }
        ]
      });

      // Calcular estadísticas por plan
      const plansWithStats = rows.map(plan => {
        const activeMemberships = plan.memberships ? plan.memberships.filter(m => m.status === 'active').length : 0;
        const totalMemberships = plan.memberships ? plan.memberships.length : 0;

        return {
          ...plan.toJSON(),
          stats: {
            activeMemberships,
            totalMemberships,
            discountPercentage: plan.getDiscountPercentage()
          }
        };
      });

      res.json({
        success: true,
        data: {
          plans: plansWithStats,
          pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit),
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Error obteniendo planes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener planes de membresía',
        error: error.message
      });
    }
  }

  // ✅ OBTENER SOLO PLANES ACTIVOS (público)
  async getActivePlans(req, res) {
    try {
      const plans = await MembershipPlans.getActivePlans();
      
      const formattedPlans = plans.map(plan => ({
        id: plan.id,
        name: plan.planName,
        price: parseFloat(plan.price),
        originalPrice: plan.originalPrice ? parseFloat(plan.originalPrice) : null,
        currency: 'GTQ',
        duration: plan.durationType,
        popular: plan.isPopular,
        iconName: plan.iconName,
        features: plan.features || [],
        discountPercentage: plan.getDiscountPercentage(),
        displayOrder: plan.displayOrder
      }));
      
      res.json({
        success: true,
        data: formattedPlans
      });

    } catch (error) {
      console.error('Error obteniendo planes activos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener planes activos',
        error: error.message
      });
    }
  }

  // ✅ OBTENER PLAN POR ID
  async getPlanById(req, res) {
    try {
      const { id } = req.params;

      const plan = await MembershipPlans.findByPk(id, {
        include: [
          {
            model: Membership,
            as: 'memberships',
            attributes: ['id', 'status', 'createdAt'],
            required: false
          }
        ]
      });

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Plan de membresía no encontrado'
        });
      }

      // Calcular estadísticas
      const activeMemberships = plan.memberships ? plan.memberships.filter(m => m.status === 'active').length : 0;
      const totalMemberships = plan.memberships ? plan.memberships.length : 0;

      const planWithStats = {
        ...plan.toJSON(),
        stats: {
          activeMemberships,
          totalMemberships,
          discountPercentage: plan.getDiscountPercentage()
        }
      };

      res.json({
        success: true,
        data: { plan: planWithStats }
      });

    } catch (error) {
      console.error('Error obteniendo plan:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener plan de membresía',
        error: error.message
      });
    }
  }

  // ✅ CREAR NUEVO PLAN (solo admin)
  async createPlan(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden crear planes'
        });
      }

      const {
        planName,
        price,
        originalPrice,
        durationType,
        features,
        isPopular = false,
        iconName = 'calendar',
        displayOrder
      } = req.body;

      // Validaciones
      if (!planName || !price || !durationType) {
        return res.status(400).json({
          success: false,
          message: 'Campos requeridos: planName, price, durationType'
        });
      }

      // Verificar que no exista un plan con el mismo nombre
      const existingPlan = await MembershipPlans.findOne({
        where: { planName: { [Op.iLike]: planName } }
      });

      if (existingPlan) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un plan con ese nombre'
        });
      }

      // Calcular displayOrder si no se proporciona
      let finalDisplayOrder = displayOrder;
      if (!finalDisplayOrder) {
        const maxOrder = await MembershipPlans.max('displayOrder');
        finalDisplayOrder = (maxOrder || 0) + 1;
      }

      const planData = {
        planName,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        durationType,
        features: Array.isArray(features) ? features : [],
        isPopular: Boolean(isPopular),
        iconName,
        displayOrder: finalDisplayOrder,
        isActive: true
      };

      const newPlan = await MembershipPlans.create(planData);

      console.log(`✅ Plan creado por admin: ${planName} - Q${price}`);

      res.status(201).json({
        success: true,
        message: 'Plan de membresía creado exitosamente',
        data: { 
          plan: {
            ...newPlan.toJSON(),
            stats: {
              activeMemberships: 0,
              totalMemberships: 0,
              discountPercentage: newPlan.getDiscountPercentage()
            }
          }
        }
      });

    } catch (error) {
      console.error('Error creando plan:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear plan de membresía',
        error: error.message
      });
    }
  }

  // ✅ ACTUALIZAR PLAN (solo admin)
  async updatePlan(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden actualizar planes'
        });
      }

      const { id } = req.params;
      const updates = req.body;

      const plan = await MembershipPlans.findByPk(id);

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Plan de membresía no encontrado'
        });
      }

      // Verificar si está intentando cambiar el nombre a uno que ya existe
      if (updates.planName && updates.planName !== plan.planName) {
        const existingPlan = await MembershipPlans.findOne({
          where: { 
            planName: { [Op.iLike]: updates.planName },
            id: { [Op.ne]: id }
          }
        });

        if (existingPlan) {
          return res.status(400).json({
            success: false,
            message: 'Ya existe un plan con ese nombre'
          });
        }
      }

      // Campos actualizables
      const allowedUpdates = [
        'planName', 'price', 'originalPrice', 'durationType', 
        'features', 'isPopular', 'iconName', 'displayOrder', 'isActive'
      ];

      const updateData = {};
      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          if (field === 'price' || field === 'originalPrice') {
            updateData[field] = updates[field] ? parseFloat(updates[field]) : null;
          } else if (field === 'features') {
            updateData[field] = Array.isArray(updates[field]) ? updates[field] : [];
          } else {
            updateData[field] = updates[field];
          }
        }
      });

      await plan.update(updateData);

      // Recargar con estadísticas
      const updatedPlan = await MembershipPlans.findByPk(id, {
        include: [
          {
            model: Membership,
            as: 'memberships',
            attributes: ['id', 'status'],
            required: false
          }
        ]
      });

      const activeMemberships = updatedPlan.memberships ? updatedPlan.memberships.filter(m => m.status === 'active').length : 0;
      const totalMemberships = updatedPlan.memberships ? updatedPlan.memberships.length : 0;

      console.log(`✅ Plan actualizado por admin: ${updatedPlan.planName}`);

      res.json({
        success: true,
        message: 'Plan de membresía actualizado exitosamente',
        data: { 
          plan: {
            ...updatedPlan.toJSON(),
            stats: {
              activeMemberships,
              totalMemberships,
              discountPercentage: updatedPlan.getDiscountPercentage()
            }
          }
        }
      });

    } catch (error) {
      console.error('Error actualizando plan:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar plan de membresía',
        error: error.message
      });
    }
  }

  // ✅ ELIMINAR PLAN (solo admin, con validaciones)
  async deletePlan(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden eliminar planes'
        });
      }

      const { id } = req.params;
      const { force = false } = req.body;

      const plan = await MembershipPlans.findByPk(id, {
        include: [
          {
            model: Membership,
            as: 'memberships',
            required: false
          }
        ]
      });

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Plan de membresía no encontrado'
        });
      }

      // Verificar si tiene membresías activas
      const activeMemberships = plan.memberships ? plan.memberships.filter(m => m.status === 'active').length : 0;
      const totalMemberships = plan.memberships ? plan.memberships.length : 0;

      if (activeMemberships > 0 && !force) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar un plan con membresías activas',
          details: {
            activeMemberships,
            totalMemberships,
            suggestion: 'Desactiva el plan o usa force=true para eliminación forzada'
          }
        });
      }

      if (totalMemberships > 0 && !force) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar un plan con historial de membresías',
          details: {
            totalMemberships,
            suggestion: 'Desactiva el plan o usa force=true para eliminación forzada'
          }
        });
      }

      const planName = plan.planName;

      if (force) {
        // Eliminación forzada: actualizar membresías para que no apunten a este plan
        if (totalMemberships > 0) {
          await Membership.update(
            { planId: null },
            { where: { planId: id } }
          );
        }
      }

      await plan.destroy();

      console.log(`🗑️ Plan eliminado por admin: ${planName}${force ? ' (eliminación forzada)' : ''}`);

      res.json({
        success: true,
        message: `Plan "${planName}" eliminado exitosamente${force ? ' (eliminación forzada)' : ''}`,
        data: {
          deletedPlan: {
            id,
            planName,
            hadMemberships: totalMemberships > 0,
            force
          }
        }
      });

    } catch (error) {
      console.error('Error eliminando plan:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar plan de membresía',
        error: error.message
      });
    }
  }

  // ✅ ACTIVAR/DESACTIVAR PLAN (solo admin)
  async togglePlanStatus(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden cambiar el estado de los planes'
        });
      }

      const { id } = req.params;

      const plan = await MembershipPlans.findByPk(id);

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Plan de membresía no encontrado'
        });
      }

      const newStatus = !plan.isActive;
      await plan.update({ isActive: newStatus });

      console.log(`🔄 Plan ${newStatus ? 'activado' : 'desactivado'}: ${plan.planName}`);

      res.json({
        success: true,
        message: `Plan "${plan.planName}" ${newStatus ? 'activado' : 'desactivado'} exitosamente`,
        data: {
          plan: {
            id: plan.id,
            planName: plan.planName,
            isActive: newStatus
          }
        }
      });

    } catch (error) {
      console.error('Error cambiando estado del plan:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cambiar estado del plan',
        error: error.message
      });
    }
  }

  // ✅ DUPLICAR PLAN (solo admin)
  async duplicatePlan(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden duplicar planes'
        });
      }

      const { id } = req.params;
      const { newName, modifications = {} } = req.body;

      const originalPlan = await MembershipPlans.findByPk(id);

      if (!originalPlan) {
        return res.status(404).json({
          success: false,
          message: 'Plan de membresía no encontrado'
        });
      }

      // Generar nombre único
      const finalName = newName || `${originalPlan.planName} (Copia)`;

      // Verificar que no exista un plan con el nuevo nombre
      const existingPlan = await MembershipPlans.findOne({
        where: { planName: { [Op.iLike]: finalName } }
      });

      if (existingPlan) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un plan con ese nombre'
        });
      }

      // Calcular nuevo displayOrder
      const maxOrder = await MembershipPlans.max('displayOrder');
      const newDisplayOrder = (maxOrder || 0) + 1;

      // Crear plan duplicado con modificaciones
      const duplicatedPlanData = {
        planName: finalName,
        price: modifications.price || originalPlan.price,
        originalPrice: modifications.originalPrice !== undefined ? modifications.originalPrice : originalPlan.originalPrice,
        durationType: modifications.durationType || originalPlan.durationType,
        features: modifications.features || [...(originalPlan.features || [])],
        isPopular: modifications.isPopular !== undefined ? modifications.isPopular : false, // Los duplicados no son populares por defecto
        iconName: modifications.iconName || originalPlan.iconName,
        displayOrder: newDisplayOrder,
        isActive: modifications.isActive !== undefined ? modifications.isActive : true
      };

      const duplicatedPlan = await MembershipPlans.create(duplicatedPlanData);

      console.log(`📋 Plan duplicado por admin: ${finalName} (basado en ${originalPlan.planName})`);

      res.status(201).json({
        success: true,
        message: 'Plan duplicado exitosamente',
        data: {
          originalPlan: {
            id: originalPlan.id,
            planName: originalPlan.planName
          },
          duplicatedPlan: {
            ...duplicatedPlan.toJSON(),
            stats: {
              activeMemberships: 0,
              totalMemberships: 0,
              discountPercentage: duplicatedPlan.getDiscountPercentage()
            }
          }
        }
      });

    } catch (error) {
      console.error('Error duplicando plan:', error);
      res.status(500).json({
        success: false,
        message: 'Error al duplicar plan de membresía',
        error: error.message
      });
    }
  }

  // ✅ REORDENAR PLANES (solo admin)
  async reorderPlans(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden reordenar planes'
        });
      }

      const { planOrders } = req.body;

      if (!Array.isArray(planOrders) || planOrders.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Debe proporcionar un array de planOrders con { id, displayOrder }'
        });
      }

      const transaction = await MembershipPlans.sequelize.transaction();

      try {
        for (const { id, displayOrder } of planOrders) {
          await MembershipPlans.update(
            { displayOrder: parseInt(displayOrder) },
            { 
              where: { id },
              transaction 
            }
          );
        }

        await transaction.commit();

        console.log(`🔄 Planes reordenados por admin: ${planOrders.length} planes actualizados`);

        res.json({
          success: true,
          message: 'Planes reordenados exitosamente',
          data: {
            updatedPlans: planOrders.length
          }
        });

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } catch (error) {
      console.error('Error reordenando planes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al reordenar planes',
        error: error.message
      });
    }
  }

  // ✅ ESTADÍSTICAS DE PLANES (solo admin)
 async getPlansStats(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo los administradores pueden ver estadísticas de planes'
      });
    }

    // Consultas básicas y seguras
    const totalPlans = await MembershipPlans.count();
    const activePlans = await MembershipPlans.count({ where: { isActive: true } });
    const popularPlans = await MembershipPlans.count({ where: { isPopular: true } });
    
    // Consulta simple por tipo de duración
    let plansByDurationType = {};
    try {
      const duracionStats = await MembershipPlans.findAll({
        attributes: [
          'durationType',
          [MembershipPlans.sequelize.fn('COUNT', MembershipPlans.sequelize.col('id')), 'count']
        ],
        group: ['durationType']
      });

      plansByDurationType = duracionStats.reduce((acc, item) => {
        acc[item.durationType] = parseInt(item.dataValues.count);
        return acc;
      }, {});
    } catch (error) {
      console.warn('Error obteniendo estadísticas por duración:', error.message);
      plansByDurationType = {};
    }

    // Para estadísticas avanzadas, consultas separadas y simples
    let mostUsedPlans = [];
    let revenueByPlan = [];

    if (Membership) {
      try {
        // Consulta simple: solo planes básicos
        const allPlans = await MembershipPlans.findAll({
          attributes: ['id', 'planName', 'price'],
          where: { isActive: true },
          limit: 5
        });

        // Para cada plan, contar membresías activas por separado
        mostUsedPlans = await Promise.all(
          allPlans.map(async (plan) => {
            const membershipCount = await Membership.count({
              where: { 
                planId: plan.id, 
                status: 'active' 
              }
            });
            
            return {
              id: plan.id,
              planName: plan.planName,
              price: parseFloat(plan.price),
              activeMemberships: membershipCount
            };
          })
        );

        // Ordenar por uso
        mostUsedPlans.sort((a, b) => b.activeMemberships - a.activeMemberships);

        // Para ingresos, consulta simple del último mes
        const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        revenueByPlan = await Promise.all(
          allPlans.map(async (plan) => {
            const memberships = await Membership.findAll({
              where: { 
                planId: plan.id,
                createdAt: { [Op.gte]: oneMonthAgo }
              },
              attributes: ['price']
            });
            
            const totalRevenue = memberships.reduce((sum, m) => sum + parseFloat(m.price || 0), 0);
            
            return {
              id: plan.id,
              planName: plan.planName,
              price: parseFloat(plan.price),
              totalRevenue,
              salesCount: memberships.length
            };
          })
        );

        // Ordenar por ingresos
        revenueByPlan.sort((a, b) => b.totalRevenue - a.totalRevenue);

      } catch (error) {
        console.warn('Error obteniendo estadísticas avanzadas:', error.message);
        // En caso de error, devolver arrays vacíos
        mostUsedPlans = [];
        revenueByPlan = [];
      }
    }

    // Respuesta exactamente igual que antes
    res.json({
      success: true,
      data: {
        summary: {
          totalPlans,
          activePlans,
          inactivePlans: totalPlans - activePlans,
          popularPlans
        },
        plansByDurationType,
        mostUsedPlans,
        revenueByPlan
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de planes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de planes',
      error: error.message
    });
  }
}
}

module.exports = new MembershipPlansController();