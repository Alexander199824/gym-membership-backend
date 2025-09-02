// src/models/PromotionCodes.js - REEMPLAZAR COMPLETO
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PromotionCodes = sequelize.define('PromotionCodes', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // ✅ TIPOS EXPANDIDOS
  type: {
    type: DataTypes.ENUM(
      'percentage',           // Descuento %
      'fixed_amount',        // Descuento fijo
      'free_days',          // Días gratis
      'gift',               // 100% descuento
      'free_product',       // Producto gratis ⭐ NUEVO
      'store_discount',     // Descuento en tienda ⭐ NUEVO
      'service_access',     // Acceso a servicios ⭐ NUEVO
      'event_invitation',   // Invitación eventos ⭐ NUEVO
      'upgrade_plan',       // Upgrade de plan ⭐ NUEVO
      'combo_benefit'       // Beneficio combinado ⭐ NUEVO
    ),
    allowNull: false
  },
  
  value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  
  // Para free_days: número de días gratis
  freeDays: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'free_days'
  },
  
  // ✅ NUEVOS CAMPOS PARA PROMOCIONES AVANZADAS
  
  // Para free_product: ID del producto regalo
  giftProductId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'store_products',
      key: 'id'
    },
    field: 'gift_product_id'
  },
  
  // Para store_discount: porcentaje de descuento en tienda
  storeDiscountPercent: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    field: 'store_discount_percent'
  },
  
  // Días que dura el descuento en tienda
  storeDiscountDays: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 30,
    field: 'store_discount_days'
  },
  
  // Para service_access: servicios incluidos
  serviceAccess: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'service_access'
    // Formato: [
    //   { "service": "personal_training", "sessions": 3 },
    //   { "service": "nutrition_consultation", "sessions": 1 }
    // ]
  },
  
  // Para event_invitation: detalles del evento
  eventDetails: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'event_details'
    // Formato: {
    //   "eventName": "Clase Yoga Especial",
    //   "date": "2024-12-25",
    //   "time": "18:00",
    //   "duration": "90 minutos",
    //   "limit": 20,
    //   "location": "Sala VIP"
    // }
  },
  
  // Para upgrade_plan: plan de destino
  upgradePlanId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'membership_plans',
      key: 'id'
    },
    field: 'upgrade_plan_id'
  },
  
  // Para combo_benefit: múltiples beneficios
  comboBenefits: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'combo_benefits'
    // Formato: [
    //   { "type": "free_product", "productId": 1, "quantity": 1 },
    //   { "type": "free_days", "days": 7 },
    //   { "type": "store_discount", "percent": 15, "days": 30 },
    //   { "type": "service_access", "services": [{"service": "personal_training", "sessions": 2}] }
    // ]
  },
  
  // Planes aplicables
  applicablePlans: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'applicable_plans'
  },
  
  // Fechas de validez
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'start_date'
  },
  
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'end_date'
  },
  
  // Límites de uso
  maxUses: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'max_uses'
  },
  
  currentUses: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'current_uses'
  },
  
  onePerUser: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'one_per_user'
  },
  
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'created_by'
  }
}, {
  tableName: 'promotion_codes',
  timestamps: true,
  indexes: [
    { fields: ['code'] },
    { fields: ['type'] },
    { fields: ['is_active'] },
    { fields: ['start_date'] },
    { fields: ['end_date'] }
  ]
});

// ✅ MÉTODOS EXPANDIDOS
PromotionCodes.prototype.isValid = function() {
  const now = new Date();
  return this.isActive && 
         now >= this.startDate && 
         now <= this.endDate &&
         (this.maxUses === null || this.currentUses < this.maxUses);
};

PromotionCodes.prototype.canBeUsedBy = async function(userId) {
  if (!this.onePerUser) return true;
  
  const { MembershipPromotions, UserPromotions } = require('./index');
  
  // Verificar en MembershipPromotions (códigos usados directamente)
  const directUsage = await MembershipPromotions.findOne({
    where: { promotionCodeId: this.id, userId }
  });
  
  // Verificar en UserPromotions (códigos canjeados/usados)
  const redeemedUsage = await UserPromotions.findOne({
    where: { 
      promotionCodeId: this.id, 
      userId,
      status: { [require('sequelize').Op.in]: ['used', 'redeemed'] }
    }
  });
  
  return !directUsage && !redeemedUsage;
};

// ✅ NUEVO: Calcular beneficios completos
PromotionCodes.prototype.calculateBenefits = async function(planPrice, planId) {
  const benefits = {
    discount: 0,
    freeDaysToAdd: 0,
    finalPrice: planPrice,
    additionalBenefits: {}
  };
  
  switch (this.type) {
    case 'percentage':
      benefits.discount = (planPrice * this.value) / 100;
      benefits.finalPrice = Math.max(0, planPrice - benefits.discount);
      break;
      
    case 'fixed_amount':
      benefits.discount = Math.min(this.value, planPrice);
      benefits.finalPrice = Math.max(0, planPrice - benefits.discount);
      break;
      
    case 'free_days':
      benefits.freeDaysToAdd = this.freeDays || 0;
      break;
      
    case 'gift':
      benefits.discount = planPrice;
      benefits.finalPrice = 0;
      break;
      
    case 'free_product':
      if (this.giftProductId) {
        try {
          const { StoreProduct } = require('./index');
          const product = await StoreProduct.findByPk(this.giftProductId);
          benefits.additionalBenefits.giftProduct = {
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.mainImage
          };
        } catch (error) {
          console.warn('Error obteniendo producto regalo:', error.message);
        }
      }
      break;
      
    case 'store_discount':
      benefits.additionalBenefits.storeDiscount = {
        percent: this.storeDiscountPercent,
        validDays: this.storeDiscountDays || 30,
        expiresAt: new Date(Date.now() + (this.storeDiscountDays || 30) * 24 * 60 * 60 * 1000)
      };
      break;
      
    case 'service_access':
      benefits.additionalBenefits.services = this.serviceAccess || [];
      break;
      
    case 'event_invitation':
      benefits.additionalBenefits.event = this.eventDetails;
      break;
      
    case 'upgrade_plan':
      if (this.upgradePlanId && planId !== this.upgradePlanId) {
        try {
          const { MembershipPlans } = require('./index');
          const upgradePlan = await MembershipPlans.findByPk(this.upgradePlanId);
          benefits.additionalBenefits.planUpgrade = {
            fromPlanId: planId,
            toPlanId: upgradePlan.id,
            toPlanName: upgradePlan.planName,
            valueBonus: Math.max(0, upgradePlan.price - planPrice)
          };
        } catch (error) {
          console.warn('Error obteniendo plan upgrade:', error.message);
        }
      }
      break;
      
    case 'combo_benefit':
      // Aplicar descuento base si existe
      if (this.value > 0) {
        benefits.discount = this.value;
        benefits.finalPrice = Math.max(0, planPrice - this.value);
      }
      
      // Procesar beneficios del combo
      const comboBenefits = [];
      for (const benefit of (this.comboBenefits || [])) {
        switch (benefit.type) {
          case 'free_days':
            benefits.freeDaysToAdd += benefit.days || 0;
            comboBenefits.push({
              type: 'Días gratis',
              value: benefit.days,
              description: `${benefit.days} días adicionales`
            });
            break;
            
          case 'free_product':
            if (benefit.productId) {
              try {
                const { StoreProduct } = require('./index');
                const product = await StoreProduct.findByPk(benefit.productId);
                if (product) {
                  comboBenefits.push({
                    type: 'Producto gratis',
                    product: {
                      id: product.id,
                      name: product.name,
                      quantity: benefit.quantity || 1,
                      price: product.price
                    }
                  });
                }
              } catch (error) {
                console.warn('Error en producto combo:', error.message);
              }
            }
            break;
            
          case 'store_discount':
            comboBenefits.push({
              type: 'Descuento tienda',
              percent: benefit.percent,
              validDays: benefit.days || 30,
              description: `${benefit.percent}% OFF por ${benefit.days || 30} días`
            });
            break;
            
          case 'service_access':
            comboBenefits.push({
              type: 'Servicios incluidos',
              services: benefit.services || [],
              description: 'Acceso a servicios premium'
            });
            break;
        }
      }
      
      benefits.additionalBenefits.combo = comboBenefits;
      break;
  }
  
  return benefits;
};

// Asociaciones
PromotionCodes.associate = function(models) {
  PromotionCodes.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'createdByUser'
  });
  
  PromotionCodes.belongsTo(models.StoreProduct, {
    foreignKey: 'giftProductId',
    as: 'giftProduct'
  });
  
  PromotionCodes.belongsTo(models.MembershipPlans, {
    foreignKey: 'upgradePlanId', 
    as: 'upgradePlan'
  });
  
  PromotionCodes.hasMany(models.UserPromotions, {
    foreignKey: 'promotionCodeId',
    as: 'userPromotions'
  });
  
  PromotionCodes.hasMany(models.MembershipPromotions, {
    foreignKey: 'promotionCodeId',
    as: 'membershipPromotions'
  });
};

module.exports = PromotionCodes;