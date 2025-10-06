// src/models/GymStatistics.js - MEJORADO: Estadísticas completamente configurables
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GymStatistics = sequelize.define('GymStatistics', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  // ✅ Clave única para identificar la estadística (sin restricciones, permite custom)
  statKey: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'stat_key',
    comment: 'Identificador único de la estadística (ej: members_count, custom_metric)'
  },
  
  // ✅ Valor numérico de la estadística
  statValue: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'stat_value',
    comment: 'Valor numérico de la estadística'
  },
  
  // ✅ NUEVO: Etiqueta visible para el usuario
  label: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Estadística',
    comment: 'Texto descriptivo mostrado al usuario (ej: Miembros, Entrenadores)'
  },
  
  // ✅ NUEVO: Nombre del icono de Lucide React
  iconName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'TrendingUp',
    field: 'icon_name',
    comment: 'Nombre del icono de Lucide React (ej: Users, Award, Trophy, Star)'
  },
  
  // ✅ NUEVO: Sufijo para el valor (%, +, etc)
  valueSuffix: {
    type: DataTypes.STRING(10),
    allowNull: true,
    defaultValue: '+',
    field: 'value_suffix',
    comment: 'Sufijo mostrado después del valor (ej: +, %, años)'
  },
  
  // ✅ NUEVO: Color del icono/badge
  colorScheme: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'primary',
    field: 'color_scheme',
    comment: 'Esquema de color (primary, secondary, success, warning, info, danger)'
  },
  
  // ✅ Orden de visualización
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'display_order',
    comment: 'Orden de aparición en el frontend (menor primero)'
  },
  
  // ✅ Si está activa
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active',
    comment: 'Si la estadística se muestra en el frontend'
  },
  
  // ✅ NUEVO: Descripción opcional
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Descripción adicional o tooltip (opcional)'
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

// ✅ Método para obtener estadísticas activas en formato frontend
GymStatistics.getActiveStats = async function() {
  return await this.findAll({
    where: { isActive: true },
    order: [['displayOrder', 'ASC']],
    attributes: [
      'id',
      'statKey',
      'statValue',
      'label',
      'iconName',
      'valueSuffix',
      'colorScheme',
      'displayOrder',
      'description'
    ]
  });
};

// ✅ Método para obtener todas las estadísticas (admin)
GymStatistics.getAllStats = async function() {
  return await this.findAll({
    order: [['displayOrder', 'ASC']],
    attributes: [
      'id',
      'statKey',
      'statValue',
      'label',
      'iconName',
      'valueSuffix',
      'colorScheme',
      'displayOrder',
      'isActive',
      'description',
      'createdAt',
      'updatedAt'
    ]
  });
};

// ✅ Método para formatear al estilo frontend
GymStatistics.prototype.toFrontendFormat = function() {
  return {
    id: this.id,
    number: this.valueSuffix ? `${this.statValue}${this.valueSuffix}` : this.statValue,
    label: this.label,
    icon: this.iconName,
    color: this.colorScheme,
    description: this.description || null
  };
};

// ✅ Seed mejorado con todas las nuevas funcionalidades
GymStatistics.seedDefaultStats = async function() {
  const defaultStats = [
    {
      statKey: 'members_count',
      statValue: 2000,
      label: 'Miembros',
      iconName: 'Users',
      valueSuffix: '+',
      colorScheme: 'primary',
      displayOrder: 1,
      description: 'Miembros activos en el gimnasio'
    },
    {
      statKey: 'trainers_count',
      statValue: 50,
      label: 'Entrenadores',
      iconName: 'Award',
      valueSuffix: '+',
      colorScheme: 'secondary',
      displayOrder: 2,
      description: 'Entrenadores certificados'
    },
    {
      statKey: 'experience_years',
      statValue: 15,
      label: 'Años',
      iconName: 'Trophy',
      valueSuffix: '+',
      colorScheme: 'warning',
      displayOrder: 3,
      description: 'Años de experiencia'
    },
    {
      statKey: 'satisfaction_rate',
      statValue: 98,
      label: 'Satisfacción',
      iconName: 'Star',
      valueSuffix: '%',
      colorScheme: 'success',
      displayOrder: 4,
      description: 'Índice de satisfacción de clientes'
    },
    {
      statKey: 'equipment_count',
      statValue: 200,
      label: 'Equipos',
      iconName: 'Dumbbell',
      valueSuffix: '+',
      colorScheme: 'info',
      displayOrder: 5,
      description: 'Equipos de última generación'
    },
    {
      statKey: 'success_stories',
      statValue: 1500,
      label: 'Historias de Éxito',
      iconName: 'Heart',
      valueSuffix: '+',
      colorScheme: 'danger',
      displayOrder: 6,
      description: 'Transformaciones completadas'
    }
  ];

  for (const stat of defaultStats) {
    await this.findOrCreate({
      where: { statKey: stat.statKey },
      defaults: stat
    });
  }

  console.log('✅ Estadísticas por defecto creadas/actualizadas');
};

module.exports = GymStatistics;