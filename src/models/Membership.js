// src/models/Membership.js - COMPLETO: Con todas las funciones avanzadas restauradas
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
  type: {
    type: DataTypes.ENUM('monthly', 'daily', 'weekly', 'quarterly', 'biannual', 'annual'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'expired', 'suspended', 'cancelled', 'pending'),
    allowNull: false,
    defaultValue: 'active'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
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
    { fields: ['status'] },
    { fields: ['type'] },
    { fields: ['endDate'] },
    { fields: ['remainingDays'] },
    { fields: ['last_day_deducted'] }  // Usar el nombre real de la columna en BD
  ]
});

// ✅ MÉTODOS DE INSTANCIA RESTAURADOS

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
};

// Reservar horario específico
Membership.prototype.reserveTimeSlot = async function(dayOfWeek, timeSlotId) {
  const { GymTimeSlots } = require('./index');
  
  // Verificar que la franja existe y tiene capacidad
  const timeSlot = await GymTimeSlots.findByPk(timeSlotId);
  if (!timeSlot) {
    throw new Error('Franja horaria no encontrada');
  }
  
  if (timeSlot.currentReservations >= timeSlot.capacity) {
    throw new Error('Franja horaria sin capacidad disponible');
  }
  
  // Inicializar reservedSchedule si no existe
  if (!this.reservedSchedule) {
    this.reservedSchedule = {};
  }
  
  // Inicializar día si no existe
  if (!this.reservedSchedule[dayOfWeek]) {
    this.reservedSchedule[dayOfWeek] = [];
  }
  
  // Verificar que no esté ya reservado
  if (this.reservedSchedule[dayOfWeek].includes(timeSlotId)) {
    throw new Error('Ya tienes este horario reservado');
  }
  
  // Agregar la reserva
  this.reservedSchedule[dayOfWeek].push(timeSlotId);
  this.changed('reservedSchedule', true);
  
  // Incrementar contador en la franja
  await timeSlot.increment('currentReservations');
  
  await this.save();
  return true;
};

// Cancelar reserva de horario
Membership.prototype.cancelTimeSlot = async function(dayOfWeek, timeSlotId) {
  if (!this.reservedSchedule || !this.reservedSchedule[dayOfWeek]) {
    return false;
  }
  
  const index = this.reservedSchedule[dayOfWeek].indexOf(timeSlotId);
  if (index === -1) {
    return false;
  }
  
  // Remover de la lista
  this.reservedSchedule[dayOfWeek].splice(index, 1);
  this.changed('reservedSchedule', true);
  
  // Decrementar contador en la franja
  const { GymTimeSlots } = require('./index');
  const timeSlot = await GymTimeSlots.findByPk(timeSlotId);
  if (timeSlot && timeSlot.currentReservations > 0) {
    await timeSlot.decrement('currentReservations');
  }
  
  await this.save();
  return true;
};

// Verificar si necesita notificación
Membership.prototype.needsExpirationNotification = function() {
  const settings = this.notificationSettings || { remindAt: [7, 3, 1] };
  const remindDays = settings.remindAt || [7, 3, 1];
  
  return remindDays.includes(this.remainingDays);
};

// Obtener resumen de membresía
Membership.prototype.getSummary = function() {
  const daysUsed = this.totalDays - this.remainingDays;
  const progressPercentage = ((daysUsed / this.totalDays) * 100).toFixed(1);
  
  return {
    id: this.id,
    type: this.type,
    status: this.status,
    daysTotal: this.totalDays,
    daysRemaining: this.remainingDays,
    daysUsed,
    progressPercentage: parseFloat(progressPercentage),
    startDate: this.startDate,
    endDate: this.endDate,
    price: this.price,
    isExpiring: this.remainingDays <= 7,
    isExpired: this.remainingDays === 0,
    hasSchedule: this.reservedSchedule && Object.keys(this.reservedSchedule).length > 0,
    lastDayDeducted: this.lastDayDeducted,
    autoDeductDays: this.autoDeductDays
  };
};

// ✅ MÉTODOS ESTÁTICOS RESTAURADOS

// Procesar deducción diaria automática para todas las membresías activas
Membership.processDailyDeduction = async function() {
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
    include: ['user'],
    order: [['remainingDays', 'ASC']]
  });
};

// Crear membresía con horarios
Membership.createWithSchedule = async function(membershipData, scheduleData, options = {}) {
  const transaction = options.transaction || await sequelize.transaction();
  const shouldCommit = !options.transaction;
  
  try {
    // Calcular días totales
    const totalDays = this.prototype.calculateTotalDays.call({ type: membershipData.type });
    
    // Crear membresía
    const membership = await this.create({
      ...membershipData,
      totalDays,
      remainingDays: totalDays,
      reservedSchedule: {}
    }, { transaction });
    
    // Reservar horarios si se proporcionan
    if (scheduleData && Object.keys(scheduleData).length > 0) {
      for (const [day, timeSlotIds] of Object.entries(scheduleData)) {
        if (Array.isArray(timeSlotIds)) {
          for (const timeSlotId of timeSlotIds) {
            await membership.reserveTimeSlot(day, timeSlotId);
          }
        }
      }
    }
    
    if (shouldCommit) {
      await transaction.commit();
    }
    return membership;
  } catch (error) {
    if (shouldCommit) {
      await transaction.rollback();
    }
    throw error;
  }
};

// ✅ HOOKS RESTAURADOS
Membership.addHook('beforeSave', (instance) => {
  // Si es una membresía nueva o se cambió el tipo, recalcular días
  if (instance.isNewRecord || instance.changed('type')) {
    const calculatedDays = instance.calculateTotalDays();
    
    if (instance.isNewRecord) {
      instance.totalDays = calculatedDays;
      instance.remainingDays = calculatedDays;
    }
  }
});

// ✅ ASOCIACIONES RESTAURADAS
Membership.associate = function(models) {
  // Usuario propietario
  Membership.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
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