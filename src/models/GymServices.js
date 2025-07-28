// src/models/GymServices.js - COMPLETO con campo imageUrl
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GymServices = sequelize.define('GymServices', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // ✅ Información del servicio
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // ✅ Icono del servicio (usando Lucide React icons)
  iconName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'dumbbell',
    field: 'icon_name'
  },
  // ✅ NUEVO: URL de imagen del servicio (Cloudinary)
  imageUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'image_url'
  },
  // ✅ Características del servicio (array JSON)
  features: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
    // Ejemplo: ["Entrenadores certificados", "Equipos de última generación", "Horarios flexibles"]
  },
  // ✅ Orden de visualización
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'display_order'
  },
  // ✅ Si está activo
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'gym_services',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['display_order'] },
    { fields: ['is_active'] }
  ]
});

// ✅ Método estático para obtener servicios activos
GymServices.getActiveServices = async function() {
  return await this.findAll({
    where: { isActive: true },
    order: [['displayOrder', 'ASC']]
  });
};

// ✅ Método estático para crear servicios por defecto CON IMÁGENES
GymServices.seedDefaultServices = async function() {
  const defaultServices = [
    {
      title: 'Entrenamiento Personal',
      description: 'Sesiones individualizadas con entrenadores certificados para maximizar tus resultados.',
      iconName: 'user-check',
      imageUrl: '', // Vacío por defecto, se actualizará cuando el admin suba imagen
      features: ['Entrenadores certificados', 'Plan personalizado', 'Seguimiento constante', 'Resultados garantizados'],
      displayOrder: 1
    },
    {
      title: 'Clases Grupales',
      description: 'Entrenamientos dinámicos en grupo para motivarte y socializar mientras te ejercitas.',
      iconName: 'users',
      imageUrl: '', // Vacío por defecto
      features: ['Yoga y Pilates', 'CrossFit', 'Zumba', 'Spinning'],
      displayOrder: 2
    },
    {
      title: 'Zona de Cardio',
      description: 'Equipos cardiovasculares de última generación para mejorar tu resistencia.',
      iconName: 'heart',
      imageUrl: '', // Vacío por defecto
      features: ['Caminadoras modernas', 'Bicicletas estáticas', 'Elípticas', 'Monitores cardíacos'],
      displayOrder: 3
    },
    {
      title: 'Área de Pesas',
      description: 'Zona completa de musculación con pesas libres y máquinas profesionales.',
      iconName: 'dumbbell',
      imageUrl: '', // Vacío por defecto
      features: ['Pesas libres', 'Máquinas profesionales', 'Área funcional', 'Asesoría técnica'],
      displayOrder: 4
    }
  ];

  for (const service of defaultServices) {
    await this.findOrCreate({
      where: { title: service.title },
      defaults: service
    });
  }
};

module.exports = GymServices;