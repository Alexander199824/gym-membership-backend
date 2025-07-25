// src/models/GymPromotionalContent.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GymPromotionalContent = sequelize.define('GymPromotionalContent', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // ✅ Tipo de contenido promocional
  type: {
    type: DataTypes.ENUM('main_offer', 'cta_card', 'feature', 'motivational', 'announcement'),
    allowNull: false
  },
  // ✅ Título
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  // ✅ Subtítulo
  subtitle: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // ✅ Descripción
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // ✅ Contenido adicional (JSON para estructuras complejas)
  content: {
    type: DataTypes.JSON,
    allowNull: true
    // Para beneficios, botones, etc.
  },
  // ✅ Si está activo
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  // ✅ Fechas de vigencia
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'start_date'
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'end_date'
  },
  // ✅ Orden de visualización
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'display_order'
  }
}, {
  tableName: 'gym_promotional_content',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['type'] },
    { fields: ['is_active'] },
    { fields: ['start_date'] },
    { fields: ['end_date'] },
    { fields: ['display_order'] }
  ]
});

// ✅ Método para verificar si está vigente
GymPromotionalContent.prototype.isCurrentlyActive = function() {
  if (!this.isActive) return false;
  
  const now = new Date();
  const startValid = !this.startDate || this.startDate <= now;
  const endValid = !this.endDate || this.endDate >= now;
  
  return startValid && endValid;
};

// ✅ Método estático para obtener contenido promocional por tipo
GymPromotionalContent.getByType = async function(type) {
  const items = await this.findAll({
    where: { type },
    order: [['displayOrder', 'ASC']]
  });
  
  return items.filter(item => item.isCurrentlyActive());
};

// ✅ Método estático para obtener todo el contenido promocional activo
GymPromotionalContent.getAllActivePromotionalContent = async function() {
  const contents = await this.findAll({
    order: [['type', 'ASC'], ['displayOrder', 'ASC']]
  });
  
  const activeContents = contents.filter(content => content.isCurrentlyActive());
  
  const result = {};
  activeContents.forEach(content => {
    if (!result[content.type]) {
      result[content.type] = [];
    }
    result[content.type].push({
      id: content.id,
      title: content.title,
      subtitle: content.subtitle,
      description: content.description,
      content: content.content
    });
  });
  
  // ✅ Convertir arrays de un elemento en objetos únicos
  Object.keys(result).forEach(key => {
    if (result[key].length === 1 && ['main_offer', 'cta_card', 'motivational'].includes(key)) {
      result[key] = result[key][0];
    }
  });
  
  return result;
};

// ✅ Método estático para crear contenido promocional por defecto
GymPromotionalContent.seedDefaultPromotionalContent = async function() {
  const defaultContent = [
    // OFERTA PRINCIPAL
    {
      type: 'main_offer',
      title: 'Primera Semana GRATIS',
      subtitle: 'Para nuevos miembros',
      description: 'Conoce nuestras instalaciones sin compromiso',
      displayOrder: 1
    },

    // TARJETA CTA
    {
      type: 'cta_card',
      title: '🎉 Primera Semana GRATIS',
      content: {
        benefits: [
          'Evaluación física completa',
          'Plan de entrenamiento personalizado',
          'Acceso a todas las instalaciones',
          'Sin compromisos'
        ],
        buttons: [
          {
            text: '🚀 Registrarse GRATIS',
            type: 'primary',
            action: 'register'
          },
          {
            text: 'Ya soy miembro',
            type: 'secondary',
            action: 'login'
          }
        ]
      },
      displayOrder: 1
    },

    // CARACTERÍSTICAS
    {
      type: 'feature',
      title: 'Entrenamiento personalizado',
      description: 'Planes únicos para cada persona',
      displayOrder: 1
    },
    {
      type: 'feature',
      title: 'Equipos de última generación',
      description: 'Tecnología fitness avanzada',
      displayOrder: 2
    },
    {
      type: 'feature',
      title: 'Resultados garantizados',
      description: 'Ve cambios reales en tu cuerpo',
      displayOrder: 3
    },
    {
      type: 'feature',
      title: 'Comunidad fitness elite',
      description: 'Conecta con personas motivadas',
      displayOrder: 4
    },

    // MENSAJE MOTIVACIONAL
    {
      type: 'motivational',
      title: '¡Consejo del día!',
      description: 'La constancia es la clave del éxito. Cada día que entrenas te acercas más a tu objetivo. ¡Sigue así y verás resultados increíbles!',
      displayOrder: 1
    }
  ];

  for (const promo of defaultContent) {
    await this.findOrCreate({
      where: { 
        type: promo.type, 
        title: promo.title 
      },
      defaults: promo
    });
  }
};

module.exports = GymPromotionalContent;