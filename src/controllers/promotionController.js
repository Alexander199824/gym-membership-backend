// src/controllers/promotionController.js - REEMPLAZAR COMPLETO
const { PromotionCodes, MembershipPromotions, MembershipPlans, User, UserPromotions } = require('../models');
const { Op } = require('sequelize');

class PromotionController {
  
  // ✅ CREAR CÓDIGO PROMOCIONAL EXPANDIDO
  async createPromotionCode(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo administradores pueden crear códigos promocionales'
        });
      }
      
      const {
        code,
        name,
        description,
        type,
        value,
        freeDays,
        giftProductId,           // ✅ NUEVO
        storeDiscountPercent,    // ✅ NUEVO
        storeDiscountDays,       // ✅ NUEVO
        serviceAccess,           // ✅ NUEVO
        eventDetails,            // ✅ NUEVO
        upgradePlanId,           // ✅ NUEVO
        comboBenefits,           // ✅ NUEVO
        applicablePlans,
        startDate,
        endDate,
        maxUses,
        onePerUser = true
      } = req.body;
      
      // Validaciones específicas por tipo
      if (type === 'free_product' && !giftProductId) {
        return res.status(400).json({
          success: false,
          message: 'Producto regalo requerido para tipo free_product'
        });
      }
      
      if (type === 'store_discount' && !storeDiscountPercent) {
        return res.status(400).json({
          success: false,
          message: 'Porcentaje de descuento requerido para tipo store_discount'
        });
      }
      
      if (type === 'upgrade_plan' && !upgradePlanId) {
        return res.status(400).json({
          success: false,
          message: 'Plan de destino requerido para tipo upgrade_plan'
        });
      }
      
      // Verificar que el código no exista
      const existingCode = await PromotionCodes.findOne({ 
        where: { code: code.toUpperCase() } 
      });
      
      if (existingCode) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un código promocional con ese código'
        });
      }
      
      const promotionCode = await PromotionCodes.create({
        code: code.toUpperCase(),
        name,
        description,
        type,
        value,
        freeDays: type === 'free_days' ? freeDays : null,
        giftProductId: type === 'free_product' ? giftProductId : null,
        storeDiscountPercent: type === 'store_discount' ? storeDiscountPercent : null,
        storeDiscountDays: type === 'store_discount' ? (storeDiscountDays || 30) : null,
        serviceAccess: type === 'service_access' ? serviceAccess : null,
        eventDetails: type === 'event_invitation' ? eventDetails : null,
        upgradePlanId: type === 'upgrade_plan' ? upgradePlanId : null,
        comboBenefits: type === 'combo_benefit' ? comboBenefits : null,
        applicablePlans,
        startDate,
        endDate,
        maxUses,
        onePerUser,
        createdBy: req.user.id
      });
      
      res.status(201).json({
        success: true,
        message: 'Código promocional creado exitosamente',
        data: { promotionCode }
      });
      
    } catch (error) {
      console.error('Error al crear código promocional:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear código promocional',
        error: error.message
      });
    }
  }
  
  // ✅ VALIDAR CÓDIGO - CON BENEFICIOS EXPANDIDOS
  async validatePromotionCode(req, res) {
    try {
      const { code, planId } = req.body;
      const userId = req.user.id;
      
      const promotionCode = await PromotionCodes.findOne({
        where: { code: code.toUpperCase(), isActive: true },
        include: [
          { association: 'giftProduct', attributes: ['id', 'name', 'price', 'mainImage'] },
          { association: 'upgradePlan', attributes: ['id', 'planName', 'price'] }
        ]
      });
      
      if (!promotionCode) {
        return res.status(404).json({
          success: false,
          message: 'Código promocional no encontrado o inactivo'
        });
      }
      
      if (!promotionCode.isValid()) {
        return res.status(400).json({
          success: false,
          message: 'Código promocional expirado o sin usos disponibles'
        });
      }
      
      // Verificar si aplica al plan
      if (promotionCode.applicablePlans && !promotionCode.applicablePlans.includes(planId)) {
        return res.status(400).json({
          success: false,
          message: 'Este código no aplica al plan seleccionado'
        });
      }
      
      // Verificar si el usuario ya lo usó
      const canUse = await promotionCode.canBeUsedBy(userId);
      if (!canUse) {
        return res.status(400).json({
          success: false,
          message: 'Ya has usado este código promocional'
        });
      }
      
      // ✅ CALCULAR BENEFICIOS COMPLETOS
      const plan = await MembershipPlans.findByPk(planId);
      const benefits = await promotionCode.calculateBenefits(plan.price, planId);
      
      res.json({
        success: true,
        data: {
          promotionCode: {
            id: promotionCode.id,
            code: promotionCode.code,
            name: promotionCode.name,
            type: promotionCode.type,
            ...benefits
          }
        }
      });
      
    } catch (error) {
      console.error('Error al validar código promocional:', error);
      res.status(500).json({
        success: false,
        message: 'Error al validar código promocional',
        error: error.message
      });
    }
  }
  
  // ✅ CANJEAR CÓDIGO - CON BENEFICIOS CALCULADOS
  async redeemPromotionCode(req, res) {
    try {
      const { code } = req.body;
      const userId = req.user.id;
      
      const promotionCode = await PromotionCodes.findOne({
        where: { code: code.toUpperCase(), isActive: true }
      });
      
      if (!promotionCode) {
        return res.status(404).json({
          success: false,
          message: 'Código promocional no encontrado o inactivo'
        });
      }
      
      if (!promotionCode.isValid()) {
        return res.status(400).json({
          success: false,
          message: 'Código promocional expirado o sin usos disponibles'
        });
      }
      
      // Verificar si el usuario ya canjeó este código
      const existingRedemption = await UserPromotions.findOne({
        where: { 
          userId, 
          promotionCodeId: promotionCode.id,
          status: { [Op.in]: ['redeemed', 'used'] }
        }
      });
      
      if (existingRedemption) {
        return res.status(400).json({
          success: false,
          message: 'Ya has canjeado este código promocional'
        });
      }
      
      const canUse = await promotionCode.canBeUsedBy(userId);
      if (!canUse) {
        return res.status(400).json({
          success: false,
          message: 'Ya has usado este código promocional anteriormente'
        });
      }
      
      const transaction = await PromotionCodes.sequelize.transaction();
      
      try {
        // ✅ CALCULAR BENEFICIOS AL MOMENTO DEL CANJE
        const sampleBenefits = await promotionCode.calculateBenefits(100, null);
        
        // Crear registro de canje
        const userPromotion = await UserPromotions.create({
          userId,
          promotionCodeId: promotionCode.id,
          status: 'redeemed',
          calculatedBenefits: sampleBenefits, // Guardar estructura de beneficios
          expiresAt: this.calculateExpirationDate(promotionCode.type)
        }, { transaction });
        
        // Incrementar uso del código
        await promotionCode.increment('currentUses', { transaction });
        
        await transaction.commit();
        
        res.json({
          success: true,
          message: 'Código promocional canjeado exitosamente',
          data: {
            promotion: {
              id: userPromotion.id,
              code: promotionCode.code,
              name: promotionCode.name,
              description: promotionCode.description,
              type: promotionCode.type,
              benefits: this.formatBenefitsForDisplay(promotionCode),
              redeemedAt: userPromotion.redeemedAt,
              expiresAt: userPromotion.expiresAt,
              status: 'canjeado'
            }
          }
        });
        
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
      
    } catch (error) {
      console.error('Error al canjear código promocional:', error);
      res.status(500).json({
        success: false,
        message: 'Error al canjear código promocional',
        error: error.message
      });
    }
  }
  
  // ✅ MIS PROMOCIONES CANJEADAS - CON DETALLES EXPANDIDOS
  async getMyRedeemedPromotions(req, res) {
    try {
      const userId = req.user.id;
      const { status } = req.query;
      
      const where = { userId };
      if (status) where.status = status;
      
      const userPromotions = await UserPromotions.findAll({
        where,
        include: [{
          model: PromotionCodes,
          as: 'promotionCode',
          include: [
            { association: 'giftProduct', attributes: ['id', 'name', 'price', 'mainImage'] },
            { association: 'upgradePlan', attributes: ['id', 'planName', 'price'] }
          ]
        }],
        order: [['redeemedAt', 'DESC']]
      });
      
      const formattedPromotions = userPromotions.map(up => {
        const pc = up.promotionCode;
        return {
          id: up.id,
          code: pc.code,
          name: pc.name,
          description: pc.description,
          type: pc.type,
          status: up.status,
          redeemedAt: up.redeemedAt,
          usedAt: up.usedAt,
          expiresAt: up.expiresAt,
          isActive: up.isActive(),
          benefits: this.formatBenefitsForDisplay(pc),
          statusText: {
            'redeemed': 'Disponible para usar',
            'used': 'Usado en membresía',
            'expired': 'Expirado'
          }[up.status]
        };
      });
      
      res.json({
        success: true,
        data: {
          promotions: formattedPromotions,
          summary: {
            total: userPromotions.length,
            available: formattedPromotions.filter(p => p.isActive).length,
            used: formattedPromotions.filter(p => p.status === 'used').length,
            expired: formattedPromotions.filter(p => p.status === 'expired').length
          }
        }
      });
      
    } catch (error) {
      console.error('Error al obtener promociones canjeadas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener promociones canjeadas',
        error: error.message
      });
    }
  }
  
  // ✅ APLICAR PROMOCIÓN CANJEADA - CON VALIDACIÓN EXPANDIDA
  async applyRedeemedPromotion(req, res) {
    try {
      const { userPromotionId, planId } = req.body;
      const userId = req.user.id;
      
      const userPromotion = await UserPromotions.findOne({
        where: { id: userPromotionId, userId, status: 'redeemed' },
        include: [{
          model: PromotionCodes,
          as: 'promotionCode',
          include: [
            { association: 'giftProduct' },
            { association: 'upgradePlan' }
          ]
        }]
      });
      
      if (!userPromotion) {
        return res.status(404).json({
          success: false,
          message: 'Promoción no encontrada o no disponible'
        });
      }
      
      if (!userPromotion.isActive()) {
        return res.status(400).json({
          success: false,
          message: 'Esta promoción ya no está vigente'
        });
      }
      
      const promotionCode = userPromotion.promotionCode;
      
      // Verificar si aplica al plan
      if (promotionCode.applicablePlans && !promotionCode.applicablePlans.includes(planId)) {
        return res.status(400).json({
          success: false,
          message: 'Esta promoción no aplica al plan seleccionado'
        });
      }
      
      const plan = await MembershipPlans.findByPk(planId);
      const benefits = await promotionCode.calculateBenefits(plan.price, planId);
      
      res.json({
        success: true,
        data: {
          userPromotionId: userPromotion.id,
          promotion: {
            code: promotionCode.code,
            name: promotionCode.name,
            type: promotionCode.type,
            ...benefits
          }
        }
      });
      
    } catch (error) {
      console.error('Error al aplicar promoción canjeada:', error);
      res.status(500).json({
        success: false,
        message: 'Error al aplicar promoción canjeada',
        error: error.message
      });
    }
  }
  
  // ✅ OBTENER CÓDIGOS (ADMIN) - CON DETALLES EXPANDIDOS
  async getPromotionCodes(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo administradores pueden ver códigos promocionales'
        });
      }
      
      const { active, type, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      
      const where = {};
      if (active !== undefined) where.isActive = active === 'true';
      if (type) where.type = type;
      
      const { count, rows } = await PromotionCodes.findAndCountAll({
        where,
        include: [
          { association: 'createdByUser', attributes: ['id', 'firstName', 'lastName'] },
          { association: 'giftProduct', attributes: ['id', 'name', 'price'] },
          { association: 'upgradePlan', attributes: ['id', 'planName', 'price'] }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset
      });
      
      const formattedCodes = rows.map(pc => ({
        ...pc.toJSON(),
        benefits: this.formatBenefitsForDisplay(pc),
        usageStats: {
          used: pc.currentUses,
          remaining: pc.maxUses ? pc.maxUses - pc.currentUses : 'Ilimitado',
          percentage: pc.maxUses ? ((pc.currentUses / pc.maxUses) * 100).toFixed(1) : null
        }
      }));
      
      res.json({
        success: true,
        data: {
          promotionCodes: formattedCodes,
          pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit),
            limit: parseInt(limit)
          }
        }
      });
      
    } catch (error) {
      console.error('Error al obtener códigos promocionales:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener códigos promocionales',
        error: error.message
      });
    }
  }
  
  // ✅ MÉTODOS AUXILIARES
  calculateExpirationDate(promotionType) {
    const now = new Date();
    switch (promotionType) {
      case 'event_invitation':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días
      case 'free_days':
      case 'combo_benefit':
        return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 días
      default:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 días
    }
  }
  
  formatBenefitsForDisplay(promotionCode) {
    const benefits = [];
    
    switch (promotionCode.type) {
      case 'percentage':
        benefits.push({
          type: 'Descuento',
          description: `${promotionCode.value}% de descuento`,
          icon: 'percentage'
        });
        break;
        
      case 'fixed_amount':
        benefits.push({
          type: 'Descuento fijo',
          description: `Q${promotionCode.value} de descuento`,
          icon: 'currency-dollar'
        });
        break;
        
      case 'free_days':
        benefits.push({
          type: 'Días gratis',
          description: `${promotionCode.freeDays} días adicionales`,
          icon: 'calendar-plus'
        });
        break;
        
      case 'gift':
        benefits.push({
          type: 'Membresía gratis',
          description: 'Membresía completamente gratuita',
          icon: 'gift'
        });
        break;
        
      case 'free_product':
        benefits.push({
          type: 'Producto gratis',
          description: promotionCode.giftProduct ? 
            `${promotionCode.giftProduct.name} gratis` : 
            'Producto de regalo incluido',
          icon: 'shopping-bag',
          product: promotionCode.giftProduct
        });
        break;
        
      case 'store_discount':
        benefits.push({
          type: 'Descuento en tienda',
          description: `${promotionCode.storeDiscountPercent}% OFF por ${promotionCode.storeDiscountDays} días`,
          icon: 'shopping-cart'
        });
        break;
        
      case 'service_access':
        benefits.push({
          type: 'Servicios incluidos',
          description: `Acceso a ${promotionCode.serviceAccess?.length || 0} servicios premium`,
          icon: 'star',
          services: promotionCode.serviceAccess
        });
        break;
        
      case 'event_invitation':
        benefits.push({
          type: 'Evento especial',
          description: promotionCode.eventDetails?.eventName || 'Invitación a evento',
          icon: 'calendar-event',
          event: promotionCode.eventDetails
        });
        break;
        
      case 'upgrade_plan':
        benefits.push({
          type: 'Upgrade de plan',
          description: promotionCode.upgradePlan ? 
            `Upgrade a ${promotionCode.upgradePlan.planName}` : 
            'Upgrade a plan superior',
          icon: 'arrow-up',
          upgradePlan: promotionCode.upgradePlan
        });
        break;
        
      case 'combo_benefit':
        benefits.push({
          type: 'Combo especial',
          description: `${promotionCode.comboBenefits?.length || 0} beneficios combinados`,
          icon: 'package',
          combo: promotionCode.comboBenefits
        });
        if (promotionCode.value > 0) {
          benefits.push({
            type: 'Descuento base',
            description: `Q${promotionCode.value} de descuento`,
            icon: 'currency-dollar'
          });
        }
        break;
    }
    
    return benefits;
  }
}

module.exports = new PromotionController();