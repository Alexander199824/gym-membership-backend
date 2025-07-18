// src/models/GymHours.js
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
  // ✅ Horarios de apertura y cierre
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
    { fields: ['day_of_week'], unique: true }
  ]
});

// ✅ Método estático para obtener horarios de la semana
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

// ✅ Método para verificar si el gym está abierto ahora
GymHours.isOpenNow = async function() {
  const now = new Date();
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  
  const todaySchedule = await this.findOne({ where: { dayOfWeek: currentDay } });
  
  if (!todaySchedule || todaySchedule.isClosed) {
    return false;
  }
  
  return currentTime >= todaySchedule.openingTime && currentTime <= todaySchedule.closingTime;
};

module.exports = GymHours;