// src/models/Membership.js - CORREGIDO: Referencias correctas a MembershipPlans
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Membership = sequelize.define('Membership', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // ✅ CORREGIDO: Referencia correcta a membership_plans
  planId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'membership_plans',
      key: 'id'
    },
    field: 'plan_id'
  },
  type: {
    type: DataTypes.ENUM('monthly', 'daily', 'weekly', 'quarterly', 'biannual', 'annual'),
    allowNull: false,
    defaultValue: 'monthly'
  },
  status: {
    type: DataTypes.ENUM('active', 'expired', 'suspended', 'cancelled', 'pending'),
    allowNull: false,
    defaultValue: 'pending'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  // ✅ CAMPOS AVANZADOS RESTAURADOS
  totalDays: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
    validate: {
      min: 1
    }
  },
  remainingDays: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
    validate: {
      min: 0
    }
  },
  lastDayDeducted: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'last_day_deducted'
  },
  autoDeductDays: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'auto_deduct_days'
  },
  reservedSchedule: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    field: 'reserved_schedule'
  },
  preferredSchedule: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  notificationSettings: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      remindAt: [7, 3, 1],
      notifyDailyDeduction: false,
      notifyCapacityChanges: true
    },
    field: 'notification_settings'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  autoRenew: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  registeredBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'memberships',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['plan_id'] }, // ✅ CORREGIDO: Usar field name real
    { fields: ['status'] },
    { fields: ['type'] },
    { fields: ['endDate'] },
    { fields: ['remainingDays'] },
    { fields: ['last_day_deducted'] }
  ],
  // ✅ VALIDACIONES SIMPLIFICADAS
  validate: {
    validDates() {
      if (this.endDate <= this.startDate) {
        throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
      }
    },
    
    validPrice() {
      if (!this.price || this.price <= 0) {
        throw new Error('El precio debe ser mayor a 0');
      }
    }
  }
});

// ✅ MÉTODOS DE INSTANCIA RESTAURADOS Y MEJORADOS

// Calcular días totales basado en el tipo
Membership.prototype.calculateTotalDays = function() {
  switch(this.type) {
    case 'daily':
      return 1;
    case 'weekly':
      return 7;
    case 'monthly':
      return 30;
    case 'quarterly':
      return 90;
    case 'biannual':
      return 180;
    case 'annual':
      return 365;
    default:
      return 30;
  }
};

// ✅ CORREGIDO: Calcular fecha de fin basada en el tipo
Membership.prototype.calculateEndDate = function(startDate = null) {
  const start = startDate ? new Date(startDate) : new Date(this.startDate || new Date());
  const days = this.calculateTotalDays();
  
  const endDate = new Date(start);
  endDate.setDate(endDate.getDate() + days);
  
  return endDate;
};

// Deducir un día automáticamente
Membership.prototype.deductDay = async function() {
  if (this.remainingDays <= 0) {
    return false; // Ya no hay días
  }
  
  const today = new Date().toISOString().split('T')[0];
  
  // Evitar deducir el mismo día dos veces
  if (this.lastDayDeducted === today) {
    return false;
  }
  
  this.remainingDays -= 1;
  this.lastDayDeducted = today;
  
  // Si llega a 0, marcar como expirada
  if (this.remainingDays === 0) {
    this.status = 'expired';
    this.endDate = new Date();
  }
  
  await this.save();
  return true;
};

// Obtener horarios reservados con detalles
Membership.prototype.getDetailedSchedule = async function() {
  if (!this.reservedSchedule || Object.keys(this.reservedSchedule).length === 0) {
    return {};
  }
  
  try {
    const { GymTimeSlots } = require('./index');
    const detailedSchedule = {};
    
    for (const [day, timeSlotIds] of Object.entries(this.reservedSchedule)) {
      if (Array.isArray(timeSlotIds) && timeSlotIds.length > 0) {
        const slots = await GymTimeSlots.findAll({
          where: { 
            id: timeSlotIds,
            isActive: true 
          },
          order: [['openTime', 'ASC']]
        });
        
        detailedSchedule[day] = slots.map(slot => ({
          id: slot.id,
          openTime: slot.openTime,
          closeTime: slot.closeTime,
          capacity: slot.capacity,
          currentReservations: slot.currentReservations,
          label: slot.slotLabel,
          availability: slot.capacity - slot.currentReservations
        }));
      } else {
        detailedSchedule[day] = [];
      }
    }
    
    return detailedSchedule;
  } catch (error) {
    console.warn('⚠️ Error obteniendo horarios detallados:', error.message);
    return {};
  }
};

// Obtener resumen de membresía
Membership.prototype.getSummary = function() {
  const daysUsed = this.totalDays - this.remainingDays;
  const progressPercentage = this.totalDays > 0 ? ((daysUsed / this.totalDays) * 100).toFixed(1) : '0';
  
  return {
    id: this.id,
    planId: this.planId,
    type: this.type,
    status: this.status,
    daysTotal: this.totalDays,
    daysRemaining: this.remainingDays,
    daysUsed,
    progressPercentage: parseFloat(progressPercentage),
    startDate: this.startDate,
    endDate: this.endDate,
    price: parseFloat(this.price),
    isExpiring: this.remainingDays <= 7,
    isExpired: this.remainingDays === 0,
    hasSchedule: this.reservedSchedule && Object.keys(this.reservedSchedule).length > 0,
    lastDayDeducted: this.lastDayDeducted,
    autoDeductDays: this.autoDeductDays
  };
};

// ✅ MÉTODOS ESTÁTICOS MEJORADOS

// ✅ NUEVO: Crear membresía con validación de plan
Membership.createWithPlan = async function(membershipData, selectedSchedule = {}, options = {}) {
  const transaction = options.transaction || await sequelize.transaction();
  const shouldCommit = !options.transaction;
  
  try {
    // Verificar que el plan existe
    const { MembershipPlans } = require('./index');
    
    if (!MembershipPlans) {
      throw new Error('MembershipPlans model no disponible');
    }
    
    const plan = await MembershipPlans.findByPk(membershipData.planId);
    
    if (!plan) {
      throw new Error(`Plan de membresía ${membershipData.planId} no encontrado`);
    }
    
    console.log(`🎫 Plan encontrado: ${plan.planName} - ${plan.price} (${plan.durationType})`);
    
    // Calcular días totales basado en el plan
    const totalDays = this.prototype.calculateTotalDays.call({ type: membershipData.type || plan.durationType });
    
    // Calcular fecha de fin
    const startDate = membershipData.startDate ? new Date(membershipData.startDate) : new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + totalDays);
    
    // Datos completos de membresía
    const fullMembershipData = {
      ...membershipData,
      type: membershipData.type || plan.durationType,
      price: membershipData.price || plan.price,
      totalDays,
      remainingDays: totalDays,
      startDate,
      endDate,
      reservedSchedule: selectedSchedule || {},
      status: 'pending' // Inicia como pending hasta que se confirme el pago
    };
    
    console.log(`🎫 Creando membresía: Plan ${plan.planName} (${plan.price}) - ${totalDays} días`);
    
    // Crear membresía
    const membership = await this.create(fullMembershipData, { transaction });
    
    if (shouldCommit) {
      await transaction.commit();
    }
    
    console.log(`✅ Membresía creada: ${membership.id} (${membership.type})`);
    return membership;
    
  } catch (error) {
    if (shouldCommit) {
      await transaction.rollback();
    }
    console.error('❌ Error creando membresía:', error.message);
    throw error;
  }
};

// Procesar deducción diaria automática para todas las membresías activas
Membership.processDailyDeduction = async function() {
  try {
    console.log('🕐 Iniciando proceso de deducción diaria de membresías...');
    
    const activeMemberships = await this.findAll({
      where: {
        status: 'active',
        autoDeductDays: true,
        remainingDays: { [sequelize.Sequelize.Op.gt]: 0 }
      }
    });
    
    let processed = 0;
    let expired = 0;
    
    for (const membership of activeMemberships) {
      const deducted = await membership.deductDay();
      if (deducted) {
        processed++;
        if (membership.remainingDays === 0) {
          expired++;
        }
      }
    }
    
    console.log(`✅ Procesadas ${processed} membresías, ${expired} expiraron`);
    return { processed, expired };
    
  } catch (error) {
    console.error('❌ Error en deducción diaria:', error.message);
    throw error;
  }
};

// Obtener membresías que expiran pronto
Membership.getExpiringMemberships = async function(days = 7) {
  return await this.findAll({
    where: {
      status: 'active',
      remainingDays: {
        [sequelize.Sequelize.Op.between]: [1, days]
      }
    },
    include: [
      {
        association: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }
    ],
    order: [['remainingDays', 'ASC']]
  });
};

// ✅ NUEVO: Método para crear datos de prueba
Membership.createTestData = async function() {
  try {
    console.log('🧪 Creando datos de prueba para membresías...');
    
    // Buscar un plan activo
    const { MembershipPlans, User } = require('./index');
    const plans = await MembershipPlans.findAll({ 
      where: { isActive: true },
      limit: 1 
    });
    
    if (plans.length === 0) {
      console.log('⚠️ No hay planes activos para crear membresías de prueba');
      return 0;
    }
    
    // Buscar un usuario
    const users = await User.findAll({ 
      where: { role: 'cliente' },
      limit: 1 
    });
    
    if (users.length === 0) {
      console.log('⚠️ No hay usuarios clientes para crear membresías de prueba');
      return 0;
    }
    
    const plan = plans[0];
    const user = users[0];
    
    // Crear membresía de prueba
    const membership = await this.createWithPlan({
      userId: user.id,
      planId: plan.id,
      registeredBy: user.id
    });
    
    // Activar membresía para pruebas
    membership.status = 'active';
    await membership.save();
    
    console.log(`✅ Membresía de prueba creada: ${plan.planName} para ${user.firstName}`);
    return 1;
    
  } catch (error) {
    console.error('❌ Error creando datos de prueba de membresías:', error.message);
    return 0;
  }
};

// ✅ HOOKS MEJORADOS
Membership.addHook('beforeSave', (instance) => {
  // Si es una membresía nueva o se cambió el tipo, recalcular días
  if (instance.isNewRecord || instance.changed('type')) {
    const calculatedDays = instance.calculateTotalDays();
    
    if (instance.isNewRecord) {
      instance.totalDays = calculatedDays;
      instance.remainingDays = calculatedDays;
      
      // Calcular fecha de fin si no está establecida
      if (!instance.endDate) {
        instance.endDate = instance.calculateEndDate();
      }
    }
  }
  
  // Asegurar que el precio sea válido
  if (!instance.price || instance.price <= 0) {
    console.warn('⚠️ Precio inválido en membresía, usando precio por defecto');
    instance.price = 100.00; // Precio por defecto
  }
});

Membership.addHook('afterCreate', (instance) => {
  console.log(`✅ Membresía creada: ${instance.id} - Usuario ${instance.userId} - Plan ${instance.planId}`);
});

// ✅ ASOCIACIONES CORREGIDAS
Membership.associate = function(models) {
  // Usuario propietario
  Membership.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
  
  // ✅ CORREGIDO: Plan de membresía
  Membership.belongsTo(models.MembershipPlans, {
    foreignKey: 'planId',
    as: 'plan'
  });
  
  // Usuario que registró
  Membership.belongsTo(models.User, {
    foreignKey: 'registeredBy',
    as: 'registeredByUser'
  });
  
  // Pagos de la membresía
  Membership.hasMany(models.Payment, {
    foreignKey: 'membershipId',
    as: 'payments'
  });
};

module.exports = Membership;