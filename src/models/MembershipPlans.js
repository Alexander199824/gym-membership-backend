// src/models/MembershipPlans.js - CORREGIDO: Nombre consistente y métodos mejorados
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MembershipPlans = sequelize.define('MembershipPlans', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // ✅ Información del plan
  planName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'plan_name'
  },
  // ✅ Precios
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  originalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'original_price',
    validate: {
      min: 0
    }
  },
  // ✅ Tipo de duración
  durationType: {
    type: DataTypes.ENUM('monthly', 'daily', 'annual', 'weekly', 'quarterly'),
    allowNull: false,
    defaultValue: 'monthly',
    field: 'duration_type'
  },
  // ✅ Características del plan (array JSON)
  features: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  // ✅ Si es plan popular (destacado)
  isPopular: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_popular'
  },
  // ✅ Si está activo
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  // ✅ Orden de visualización
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'display_order'
  },
  // ✅ Icono del plan
  iconName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'calendar',
    field: 'icon_name'
  }
}, {
  tableName: 'membership_plans',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['duration_type'] },
    { fields: ['is_popular'] },
    { fields: ['is_active'] },
    { fields: ['display_order'] }
  ]
});

// ✅ Método para calcular descuento
MembershipPlans.prototype.getDiscountPercentage = function() {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }
  return 0;
};

// ✅ Método estático para obtener planes activos
MembershipPlans.getActivePlans = async function() {
  try {
    const plans = await this.findAll({
      where: { isActive: true },
      order: [['displayOrder', 'ASC'], ['id', 'ASC']]
    });
    
    console.log(`✅ Encontrados ${plans.length} planes activos`);
    return plans;
  } catch (error) {
    console.error('❌ Error obteniendo planes activos:', error.message);
    throw error;
  }
};

// ✅ CORREGIDO: Método estático para crear planes por defecto
MembershipPlans.seedDefaultPlans = async function() {
  try {
    console.log('🌱 Creando planes de membresía por defecto...');
    
    const defaultPlans = [
      {
        planName: 'Entrada Diaria',
        price: 25.00,
        durationType: 'daily',
        features: ['Acceso completo al gym', 'Uso de vestidores', 'Wi-Fi gratuito'],
        iconName: 'calendar-days',
        displayOrder: 1,
        isActive: true
      },
      {
        planName: 'Plan Mensual',
        price: 250.00,
        originalPrice: 300.00,
        durationType: 'monthly',
        features: ['Acceso ilimitado', 'Clases grupales incluidas', 'Entrenador asignado', 'Plan nutricional básico'],
        isPopular: true,
        iconName: 'calendar',
        displayOrder: 2,
        isActive: true
      },
      {
        planName: 'Plan Anual',
        price: 2400.00,
        originalPrice: 3000.00,
        durationType: 'annual',
        features: ['Todo lo anterior', 'Evaluaciones médicas', 'Nutricionista personal', 'Descuentos en productos'],
        iconName: 'calendar-range',
        displayOrder: 3,
        isActive: true
      }
    ];

    let createdCount = 0;
    for (const plan of defaultPlans) {
      const [createdPlan, created] = await this.findOrCreate({
        where: { planName: plan.planName },
        defaults: plan
      });
      
      if (created) {
        createdCount++;
        console.log(`✅ Plan creado: ${plan.planName} - $${plan.price}`);
      } else {
        console.log(`ℹ️ Plan ya existe: ${plan.planName}`);
      }
    }
    
    console.log(`🌱 Seeders completados: ${createdCount} planes creados`);
    return createdCount;
    
  } catch (error) {
    console.error('❌ Error en seeders de planes:', error.message);
    throw error;
  }
};

// ✅ NUEVO: Método para verificar y reparar planes
MembershipPlans.verifyAndRepair = async function() {
  try {
    const count = await this.count();
    console.log(`📊 Planes existentes en BD: ${count}`);
    
    if (count === 0) {
      console.log('⚠️ No hay planes, ejecutando seeders...');
      await this.seedDefaultPlans();
    }
    
    const activePlans = await this.getActivePlans();
    console.log(`✅ Planes activos verificados: ${activePlans.length}`);
    
    return {
      total: count,
      active: activePlans.length,
      plans: activePlans
    };
  } catch (error) {
    console.error('❌ Error verificando planes:', error.message);
    throw error;
  }
};

// ✅ Asociaciones
MembershipPlans.associate = function(models) {
  // Relación con membresías
  MembershipPlans.hasMany(models.Membership, {
    foreignKey: 'planId',
    as: 'memberships'
  });
  
  // Relación con promociones (si existe)
  if (models.PromotionCodes) {
    MembershipPlans.hasMany(models.PromotionCodes, {
      foreignKey: 'upgradePlanId',
      as: 'promotionUpgrades'
    });
  }
};

module.exports = MembershipPlans;