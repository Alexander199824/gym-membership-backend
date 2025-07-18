// src/models/GymStatistics.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GymStatistics = sequelize.define('GymStatistics', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // ✅ Clave única para identificar el tipo de estadística
  statKey: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'stat_key',
    validate: {
      isIn: [['members_count', 'trainers_count', 'experience_years', 'satisfaction_rate', 'equipment_count', 'success_stories']]
    }
  },
  // ✅ Valor de la estadística (puede incluir símbolos como "+", "%")
  statValue: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'stat_value'
  },
  // ✅ Orden de visualización en el frontend
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'display_order'
  },
  // ✅ Si se muestra en la landing page
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'gym_statistics',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['stat_key'] },
    { fields: ['display_order'] },
    { fields: ['is_active'] }
  ]
});

// ✅ Método estático para obtener estadísticas activas
GymStatistics.getActiveStats = async function() {
  return await this.findAll({
    where: { isActive: true },
    order: [['displayOrder', 'ASC']]
  });
};

// ✅ Método estático para crear estadísticas por defecto
GymStatistics.seedDefaultStats = async function() {
  const defaultStats = [
    { statKey: 'members_count', statValue: '2000+', displayOrder: 1 },
    { statKey: 'trainers_count', statValue: '50+', displayOrder: 2 },
    { statKey: 'experience_years', statValue: '15+', displayOrder: 3 },
    { statKey: 'satisfaction_rate', statValue: '98%', displayOrder: 4 },
    { statKey: 'equipment_count', statValue: '200+', displayOrder: 5 },
    { statKey: 'success_stories', statValue: '1500+', displayOrder: 6 }
  ];

  for (const stat of defaultStats) {
    await this.findOrCreate({
      where: { statKey: stat.statKey },
      defaults: stat
    });
  }
};

module.exports = GymStatistics;