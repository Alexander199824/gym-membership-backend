// src/models/GymHours.js - EXTENDIDO: Soporte para horarios flexibles
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GymHours = sequelize.define('GymHours', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // ✅ Día de la semana
  dayOfWeek: {
    type: DataTypes.ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
    allowNull: false,
    field: 'day_of_week'
  },
  // ✅ Horarios de apertura y cierre (MANTENER COMPATIBILIDAD)
  openingTime: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'opening_time'
  },
  closingTime: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'closing_time'
  },
  // ✅ Si el gimnasio está cerrado ese día
  isClosed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_closed'
  },
  // ✅ NUEVO: Si usa horarios flexibles (múltiples franjas)
  useFlexibleSchedule: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'use_flexible_schedule'
  },
  // ✅ Notas especiales (ej: "Horario reducido por feriado")
  specialNote: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'special_note'
  }
}, {
  tableName: 'gym_hours',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['day_of_week'], unique: true },
    { fields: ['use_flexible_schedule'] }
  ]
});

// ✅ ASOCIACIONES (agregar después de la definición)
GymHours.associate = (models) => {
  // Relación con franjas horarias
  GymHours.hasMany(models.GymTimeSlots, {
    foreignKey: 'gymHoursId',
    as: 'timeSlots',
    onDelete: 'CASCADE'
  });
};

// ✅ MÉTODO ORIGINAL: Mantener compatibilidad hacia atrás
GymHours.getWeeklySchedule = async function() {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const schedule = {};
  
  for (const day of days) {
    let daySchedule = await this.findOne({ where: { dayOfWeek: day } });
    
    if (!daySchedule) {
      // ✅ Crear horarios por defecto si no existen
      const defaultSchedule = {
        monday: { openingTime: '05:00', closingTime: '22:00', isClosed: false },
        tuesday: { openingTime: '05:00', closingTime: '22:00', isClosed: false },
        wednesday: { openingTime: '05:00', closingTime: '22:00', isClosed: false },
        thursday: { openingTime: '05:00', closingTime: '22:00', isClosed: false },
        friday: { openingTime: '05:00', closingTime: '22:00', isClosed: false },
        saturday: { openingTime: '06:00', closingTime: '20:00', isClosed: false },
        sunday: { openingTime: '07:00', closingTime: '18:00', isClosed: false }
      };
      
      daySchedule = await this.create({
        dayOfWeek: day,
        ...defaultSchedule[day]
      });
    }
    
    schedule[day] = daySchedule;
  }
  
  return schedule;
};

// ✅ NUEVO: Obtener horario flexible completo
GymHours.getFlexibleSchedule = async function() {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const schedule = {};
  
  for (const day of days) {
    let daySchedule = await this.findOne({ 
      where: { dayOfWeek: day },
      include: [{
        association: 'timeSlots',
        where: { isActive: true },
        required: false,
        order: [['displayOrder', 'ASC'], ['openTime', 'ASC']]
      }]
    });
    
    if (!daySchedule) {
      // Crear día con configuración por defecto
      daySchedule = await this.create({
        dayOfWeek: day,
        isClosed: false,
        useFlexibleSchedule: false
      });
      daySchedule.timeSlots = [];
    }
    
    // ✅ Formatear para el frontend (estructura esperada por ContentEditor.js)
    schedule[day] = {
      isOpen: !daySchedule.isClosed,
      timeSlots: daySchedule.timeSlots ? daySchedule.timeSlots.map(slot => slot.toFrontendFormat()) : []
    };
  }
  
  return schedule;
};

// ✅ NUEVO: Obtener métricas de capacidad
GymHours.getCapacityMetrics = async function() {
  const flexibleSchedule = await this.getFlexibleSchedule();
  
  let totalCapacity = 0;
  let totalReservations = 0;
  let totalSlots = 0;
  let dayMetrics = {};
  
  Object.entries(flexibleSchedule).forEach(([day, dayData]) => {
    if (dayData.isOpen && dayData.timeSlots.length > 0) {
      let dayCapacity = 0;
      let dayReservations = 0;
      
      dayData.timeSlots.forEach(slot => {
        dayCapacity += slot.capacity;
        dayReservations += slot.reservations;
        totalSlots++;
      });
      
      totalCapacity += dayCapacity;
      totalReservations += dayReservations;
      
      dayMetrics[day] = {
        capacity: dayCapacity,
        reservations: dayReservations,
        available: dayCapacity - dayReservations,
        occupancyPercentage: dayCapacity > 0 ? Math.round((dayReservations / dayCapacity) * 100) : 0
      };
    }
  });
  
  // Encontrar día más ocupado
  const busiestDay = Object.entries(dayMetrics).reduce((busiest, [day, metrics]) => {
    return metrics.occupancyPercentage > (busiest.occupancyPercentage || 0) 
      ? { day, ...metrics } 
      : busiest;
  }, {});
  
  return {
    totalCapacity,
    totalReservations,
    availableSpaces: totalCapacity - totalReservations,
    averageOccupancy: totalCapacity > 0 ? Math.round((totalReservations / totalCapacity) * 100) : 0,
    totalSlots,
    busiestDay: busiestDay.day ? `${busiestDay.day} (${busiestDay.occupancyPercentage}%)` : 'Ninguno',
    byDay: dayMetrics
  };
};

// ✅ NUEVO: Alternar día abierto/cerrado
GymHours.toggleDayOpen = async function(day) {
  const daySchedule = await this.findOne({ where: { dayOfWeek: day } });
  if (daySchedule) {
    daySchedule.isClosed = !daySchedule.isClosed;
    await daySchedule.save();
    return daySchedule;
  }
  throw new Error(`Día ${day} no encontrado`);
};

// ✅ NUEVO: Agregar franja horaria
GymHours.addTimeSlot = async function(day, slotData) {
  const { GymTimeSlots } = require('./index');
  
  const daySchedule = await this.findOne({ where: { dayOfWeek: day } });
  if (!daySchedule) {
    throw new Error(`Día ${day} no encontrado`);
  }
  
  // Habilitar horario flexible si no está habilitado
  if (!daySchedule.useFlexibleSchedule) {
    daySchedule.useFlexibleSchedule = true;
    await daySchedule.save();
  }
  
  const newSlot = await GymTimeSlots.create({
    gymHoursId: daySchedule.id,
    openTime: slotData.open,
    closeTime: slotData.close,
    capacity: slotData.capacity || 30,
    currentReservations: slotData.reservations || 0,
    slotLabel: slotData.label || '',
    displayOrder: slotData.displayOrder || 0
  });
  
  return newSlot;
};

// ✅ NUEVO: Eliminar franja horaria
GymHours.removeTimeSlot = async function(day, slotIndex) {
  const { GymTimeSlots } = require('./index');
  
  const daySchedule = await this.findOne({ 
    where: { dayOfWeek: day },
    include: [{
      association: 'timeSlots',
      where: { isActive: true },
      required: false,
      order: [['displayOrder', 'ASC'], ['openTime', 'ASC']]
    }]
  });
  
  if (!daySchedule || !daySchedule.timeSlots || !daySchedule.timeSlots[slotIndex]) {
    throw new Error(`Franja horaria ${slotIndex} del día ${day} no encontrada`);
  }
  
  const slot = daySchedule.timeSlots[slotIndex];
  slot.isActive = false;
  await slot.save();
  
  return slot;
};

// ✅ NUEVO: Actualizar franja horaria
GymHours.updateTimeSlot = async function(day, slotIndex, field, value) {
  const { GymTimeSlots } = require('./index');
  
  const daySchedule = await this.findOne({ 
    where: { dayOfWeek: day },
    include: [{
      association: 'timeSlots',
      where: { isActive: true },
      required: false,
      order: [['displayOrder', 'ASC'], ['openTime', 'ASC']]
    }]
  });
  
  if (!daySchedule || !daySchedule.timeSlots || !daySchedule.timeSlots[slotIndex]) {
    throw new Error(`Franja horaria ${slotIndex} del día ${day} no encontrada`);
  }
  
  const slot = daySchedule.timeSlots[slotIndex];
  
  // Mapear campos del frontend al modelo
  const fieldMapping = {
    'open': 'openTime',
    'close': 'closeTime',
    'capacity': 'capacity',
    'reservations': 'currentReservations',
    'label': 'slotLabel'
  };
  
  const dbField = fieldMapping[field] || field;
  slot[dbField] = value;
  await slot.save();
  
  return slot;
};

// ✅ NUEVO: Duplicar franja horaria
GymHours.duplicateTimeSlot = async function(day, slotIndex) {
  const { GymTimeSlots } = require('./index');
  
  const daySchedule = await this.findOne({ 
    where: { dayOfWeek: day },
    include: [{
      association: 'timeSlots',
      where: { isActive: true },
      required: false,
      order: [['displayOrder', 'ASC'], ['openTime', 'ASC']]
    }]
  });
  
  if (!daySchedule || !daySchedule.timeSlots || !daySchedule.timeSlots[slotIndex]) {
    throw new Error(`Franja horaria ${slotIndex} del día ${day} no encontrada`);
  }
  
  const originalSlot = daySchedule.timeSlots[slotIndex];
  
  const duplicatedSlot = await GymTimeSlots.create({
    gymHoursId: daySchedule.id,
    openTime: originalSlot.openTime,
    closeTime: originalSlot.closeTime,
    capacity: originalSlot.capacity,
    currentReservations: 0, // Reset reservations for duplicated slot
    slotLabel: originalSlot.slotLabel ? `${originalSlot.slotLabel} (Copia)` : 'Copia',
    displayOrder: originalSlot.displayOrder + 1
  });
  
  return duplicatedSlot;
};

// ✅ NUEVO: Aplicar capacidad a todas las franjas
GymHours.applyCapacityToAllSlots = async function(capacity) {
  const { GymTimeSlots } = require('./index');
  
  const updatedCount = await GymTimeSlots.update(
    { capacity: capacity },
    { 
      where: { isActive: true },
      returning: true
    }
  );
  
  return updatedCount;
};

// ✅ MANTENER COMPATIBILIDAD: Método para verificar si está abierto ahora
GymHours.isOpenNow = async function() {
  const now = new Date();
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  
  const todaySchedule = await this.findOne({ 
    where: { dayOfWeek: currentDay },
    include: [{
      association: 'timeSlots',
      where: { isActive: true },
      required: false
    }]
  });
  
  if (!todaySchedule || todaySchedule.isClosed) {
    return false;
  }
  
  // Si usa horarios flexibles, verificar franjas
  if (todaySchedule.useFlexibleSchedule && todaySchedule.timeSlots && todaySchedule.timeSlots.length > 0) {
    return todaySchedule.timeSlots.some(slot => 
      currentTime >= slot.openTime.slice(0, 5) && currentTime <= slot.closeTime.slice(0, 5)
    );
  }
  
  // Si no usa horarios flexibles, usar horario tradicional
  return currentTime >= todaySchedule.openingTime && currentTime <= todaySchedule.closingTime;
};

module.exports = GymHours;