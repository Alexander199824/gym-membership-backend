// src/models/GymTestimonials.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GymTestimonials = sequelize.define('GymTestimonials', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // ✅ Información del testimonio
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  role: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Miembro'
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  // ✅ Rating del cliente
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    validate: {
      min: 1,
      max: 5
    }
  },
  // ✅ Imagen del cliente
  imageUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'image_url'
  },
  // ✅ Si está destacado
  isFeatured: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_featured'
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
  }
}, {
  tableName: 'gym_testimonials',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['is_featured'] },
    { fields: ['is_active'] },
    { fields: ['display_order'] },
    { fields: ['rating'] }
  ]
});

// ✅ Método estático para obtener testimonios activos
GymTestimonials.getActiveTestimonials = async function() {
  return await this.findAll({
    where: { isActive: true },
    order: [['isFeatured', 'DESC'], ['displayOrder', 'ASC']]
  });
};

// ✅ Método estático para obtener testimonios destacados
GymTestimonials.getFeaturedTestimonials = async function(limit = 3) {
  return await this.findAll({
    where: { 
      isActive: true, 
      isFeatured: true 
    },
    order: [['displayOrder', 'ASC']],
    limit
  });
};

// ✅ Método estático para crear testimonios por defecto
GymTestimonials.seedDefaultTestimonials = async function() {
  const defaultTestimonials = [
    {
      name: 'María González',
      role: 'Empresaria',
      text: 'Elite Fitness cambió mi vida completamente. Los entrenadores son excepcionales y las instalaciones de primera clase. He logrado mis objetivos de fitness más rápido de lo que imaginé.',
      rating: 5,
      isFeatured: true,
      displayOrder: 1
    },
    {
      name: 'Carlos Mendoza',
      role: 'Ingeniero',
      text: 'Después de años buscando el gimnasio perfecto, finalmente lo encontré. La variedad de equipos y clases es impresionante. Totalmente recomendado.',
      rating: 5,
      isFeatured: true,
      displayOrder: 2
    },
    {
      name: 'Ana Patricia López',
      role: 'Doctora',
      text: 'Como médico, aprecio la limpieza y profesionalismo de Elite Fitness. Es un lugar donde realmente puedes enfocarte en tu salud y bienestar.',
      rating: 5,
      isFeatured: true,
      displayOrder: 3
    },
    {
      name: 'Roberto Silva',
      role: 'Contador',
      text: 'La atención personalizada y los planes de entrenamiento han sido clave para mi progreso. Excelente relación calidad-precio.',
      rating: 5,
      displayOrder: 4
    },
    {
      name: 'Sofía Herrera',
      role: 'Estudiante',
      text: 'Me encanta la energía del lugar y la motivación de los entrenadores. He ganado mucha confianza en mí misma.',
      rating: 5,
      displayOrder: 5
    }
  ];

  for (const testimonial of defaultTestimonials) {
    await this.findOrCreate({
      where: { name: testimonial.name },
      defaults: testimonial
    });
  }
};

module.exports = GymTestimonials;