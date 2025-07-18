// src/models/UserSchedulePreferences.js - NUEVO: Para que usuarios escojan horarios
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserSchedulePreferences = sequelize.define('UserSchedulePreferences', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // ✅ Usuario
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'user_id'
  },
  // ✅ Día de la semana
  dayOfWeek: {
    type: DataTypes.ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
    allowNull: false,
    field: 'day_of_week'
  },
  // ✅ Horario preferido (formato 24h)
  preferredStartTime: {
    type: DataTypes.TIME,
    allowNull: false,
    field: 'preferred_start_time'
  },
  preferredEndTime: {
    type: DataTypes.TIME,
    allowNull: false,
    field: 'preferred_end_time'
  },
  // ✅ Tipo de entrenamiento preferido
  workoutType: {
    type: DataTypes.ENUM('cardio', 'weights', 'functional', 'classes', 'mixed'),
    allowNull: false,
    defaultValue: 'mixed',
    field: 'workout_type'
  },
  // ✅ Prioridad (1 = más importante, 5 = menos importante)
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
    validate: {
      min: 1,
      max: 5
    }
  },
  // ✅ Si está activo este horario
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  // ✅ Notas adicionales
  notes: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'user_schedule_preferences',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['day_of_week'] },
    { fields: ['preferred_start_time'] },
    { fields: ['is_active'] },
    { fields: ['user_id', 'day_of_week'] } // Índice compuesto
  ],
  // ✅ Validaciones
  validate: {
    timeRangeValid() {
      if (this.preferredStartTime >= this.preferredEndTime) {
        throw new Error('La hora de inicio debe ser anterior a la hora de fin');
      }
    }
  }
});

// ✅ Métodos de instancia
UserSchedulePreferences.prototype.getDurationInMinutes = function() {
  const start = new Date(`2000-01-01 ${this.preferredStartTime}`);
  const end = new Date(`2000-01-01 ${this.preferredEndTime}`);
  return (end - start) / (1000 * 60);
};

UserSchedulePreferences.prototype.getFormattedTimeRange = function() {
  return `${this.preferredStartTime.slice(0, 5)} - ${this.preferredEndTime.slice(0, 5)}`;
};

// ✅ Métodos estáticos
UserSchedulePreferences.getByUser = async function(userId) {
  return await this.findAll({
    where: { 
      userId, 
      isActive: true 
    },
    order: [['dayOfWeek', 'ASC'], ['preferredStartTime', 'ASC']]
  });
};

// ✅ Obtener horarios populares para análisis
UserSchedulePreferences.getPopularTimes = async function() {
  const popularTimes = await this.findAll({
    attributes: [
      'dayOfWeek',
      'preferredStartTime',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    where: { isActive: true },
    group: ['dayOfWeek', 'preferredStartTime'],
    order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
    limit: 10
  });
  
  return popularTimes.map(item => ({
    day: item.dayOfWeek,
    time: item.preferredStartTime,
    count: parseInt(item.dataValues.count)
  }));
};

// ✅ Crear horarios por defecto para nuevo usuario
UserSchedulePreferences.createDefaultSchedule = async function(userId) {
  const defaultSchedules = [
    { dayOfWeek: 'monday', preferredStartTime: '06:00', preferredEndTime: '08:00', workoutType: 'mixed', priority: 2 },
    { dayOfWeek: 'wednesday', preferredStartTime: '18:00', preferredEndTime: '20:00', workoutType: 'weights', priority: 1 },
    { dayOfWeek: 'friday', preferredStartTime: '06:00', preferredEndTime: '08:00', workoutType: 'cardio', priority: 2 }
  ];
  
  const createdSchedules = [];
  for (const schedule of defaultSchedules) {
    const created = await this.create({
      userId,
      ...schedule
    });
    createdSchedules.push(created);
  }
  
  return createdSchedules;
};

module.exports = UserSchedulePreferences;