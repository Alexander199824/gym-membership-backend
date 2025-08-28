// src/models/GymTimeSlots.js - NUEVO: Modelo para franjas horarias flexibles
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GymTimeSlots = sequelize.define('GymTimeSlots', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // ✅ Relación con GymHours
  gymHoursId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'gym_hours',
      key: 'id'
    },
    field: 'gym_hours_id'
  },
  // ✅ Horarios de la franja
  openTime: {
    type: DataTypes.TIME,
    allowNull: false,
    field: 'open_time'
  },
  closeTime: {
    type: DataTypes.TIME,
    allowNull: false,
    field: 'close_time'
  },
  // ✅ Capacidad y reservas
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
    validate: {
      min: 1,
      max: 500
    }
  },
  currentReservations: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'current_reservations',
    validate: {
      min: 0
    }
  },
  // ✅ Etiqueta opcional
  slotLabel: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'slot_label'
  },
  // ✅ Si está activa esta franja
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
  }
}, {
  tableName: 'gym_time_slots',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['gym_hours_id'] },
    { fields: ['open_time'] },
    { fields: ['close_time'] },
    { fields: ['is_active'] },
    { fields: ['display_order'] }
  ],
  // ✅ Validaciones
  validate: {
    timeRangeValid() {
      if (this.openTime >= this.closeTime) {
        throw new Error('La hora de apertura debe ser anterior a la hora de cierre');
      }
    },
    capacityValid() {
      if (this.currentReservations > this.capacity) {
        throw new Error('Las reservas no pueden exceder la capacidad');
      }
    }
  }
});

// ✅ Método de instancia: Obtener disponibilidad
GymTimeSlots.prototype.getAvailability = function() {
  return {
    capacity: this.capacity,
    reserved: this.currentReservations,
    available: this.capacity - this.currentReservations,
    occupancyPercentage: Math.round((this.currentReservations / this.capacity) * 100)
  };
};

// ✅ Método de instancia: Formatear para frontend
GymTimeSlots.prototype.toFrontendFormat = function() {
  return {
    open: this.openTime.slice(0, 5), // HH:MM format
    close: this.closeTime.slice(0, 5),
    capacity: this.capacity,
    reservations: this.currentReservations,
    label: this.slotLabel || '',
    availability: this.getAvailability()
  };
};

// ✅ Método estático: Obtener franjas por día
GymTimeSlots.getByDay = async function(gymHoursId) {
  return await this.findAll({
    where: { 
      gymHoursId,
      isActive: true 
    },
    order: [['displayOrder', 'ASC'], ['openTime', 'ASC']]
  });
};

// ✅ Método estático: Crear franja por defecto
GymTimeSlots.createDefaultSlot = async function(gymHoursId, openTime, closeTime, label = '') {
  return await this.create({
    gymHoursId,
    openTime,
    closeTime,
    capacity: 30,
    currentReservations: 0,
    slotLabel: label,
    displayOrder: 0
  });
};

module.exports = GymTimeSlots;