// src/models/GymSectionsContent.js 
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GymSectionsContent = sequelize.define('GymSectionsContent', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // ✅ Sección de la página
  section: {
    type: DataTypes.ENUM('hero', 'store', 'services', 'plans', 'testimonials', 'contact', 'about', 'features'),
    allowNull: false
  },
  // ✅ Clave del contenido
  contentKey: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'content_key'
  },
  // ✅ Valor del contenido (JSON para estructuras complejas)
  contentValue: {
    type: DataTypes.JSON,
    allowNull: false,
    field: 'content_value'
  },
  // ✅ Tipo de contenido
  contentType: {
    type: DataTypes.ENUM('text', 'array', 'object', 'boolean'),
    allowNull: false,
    defaultValue: 'text',
    field: 'content_type'
  },
  // ✅ Si está activo
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'gym_sections_content',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['section'] },
    { fields: ['content_key'] },
    { fields: ['section', 'content_key'], unique: true },
    { fields: ['is_active'] }
  ]
});

// ✅ Método estático para obtener contenido por sección
GymSectionsContent.getContentBySection = async function(section) {
  const contents = await this.findAll({
    where: { 
      section,
      isActive: true 
    }
  });
  
  const result = {};
  contents.forEach(content => {
    result[content.contentKey] = content.contentValue;
  });
  
  return result;
};

// ✅ Método estático para obtener todo el contenido organizado
GymSectionsContent.getAllSectionsContent = async function() {
  const contents = await this.findAll({
    where: { isActive: true }
  });
  
  const result = {};
  contents.forEach(content => {
    if (!result[content.section]) {
      result[content.section] = {};
    }
    result[content.section][content.contentKey] = content.contentValue;
  });
  
  return result;
};

// ✅ Método estático para crear contenido por defecto CON URLS DE MEDIOS
GymSectionsContent.seedDefaultContent = async function() {
  const defaultContent = [
    // HERO SECTION
    { section: 'hero', contentKey: 'title', contentValue: 'Bienvenido a Elite Fitness Club', contentType: 'text' },
    { section: 'hero', contentKey: 'subtitle', contentValue: 'Transforma tu cuerpo, eleva tu mente', contentType: 'text' },
    { section: 'hero', contentKey: 'description', contentValue: 'El mejor gimnasio de Guatemala con equipos de última generación y entrenadores certificados', contentType: 'text' },
    
    // ✅ URLs de imagen y video hero (vacías por defecto, se llenan cuando admin sube contenido)
    { section: 'hero', contentKey: 'imageUrl', contentValue: '', contentType: 'text' },
    { section: 'hero', contentKey: 'videoUrl', contentValue: '', contentType: 'text' },
    { section: 'hero', contentKey: 'ctaText', contentValue: 'Comienza Hoy', contentType: 'text' },
    
    { 
      section: 'hero', 
      contentKey: 'ctaButtons', 
      contentValue: [
        {
          text: 'Primera Semana GRATIS',
          type: 'primary',
          action: 'register',
          icon: 'gift'
        },
        {
          text: 'Ver Tienda',
          type: 'secondary',
          action: 'store',
          icon: 'shopping-cart'
        }
      ], 
      contentType: 'array' 
    },

    // STORE SECTION
    { section: 'store', contentKey: 'title', contentValue: 'Productos premium para tu entrenamiento', contentType: 'text' },
    { section: 'store', contentKey: 'subtitle', contentValue: 'Descubre nuestra selección de suplementos, ropa deportiva y accesorios de la más alta calidad', contentType: 'text' },
    { 
      section: 'store', 
      contentKey: 'benefits', 
      contentValue: [
        { text: 'Envío gratis +Q200', icon: 'truck', color: 'green' },
        { text: 'Garantía de calidad', icon: 'shield', color: 'blue' },
        { text: 'Productos originales', icon: 'award', color: 'purple' }
      ], 
      contentType: 'array' 
    },

    // SERVICES SECTION
    { section: 'services', contentKey: 'title', contentValue: 'Todo lo que necesitas para alcanzar tus metas', contentType: 'text' },
    { section: 'services', contentKey: 'subtitle', contentValue: 'Servicios profesionales diseñados para llevarte al siguiente nivel', contentType: 'text' },

    // PLANS SECTION
    { section: 'plans', contentKey: 'title', contentValue: 'Elige tu plan ideal', contentType: 'text' },
    { section: 'plans', contentKey: 'subtitle', contentValue: 'Planes diseñados para diferentes objetivos y estilos de vida', contentType: 'text' },
    { section: 'plans', contentKey: 'guarantee', contentValue: 'Garantía de satisfacción 30 días', contentType: 'text' },

    // TESTIMONIALS SECTION
    { section: 'testimonials', contentKey: 'title', contentValue: 'Lo que dicen nuestros miembros', contentType: 'text' },
    { section: 'testimonials', contentKey: 'subtitle', contentValue: 'Testimonios reales de nuestra comunidad fitness', contentType: 'text' },

    // CONTACT SECTION
    { section: 'contact', contentKey: 'title', contentValue: '¿Listo para comenzar?', contentType: 'text' },
    { section: 'contact', contentKey: 'subtitle', contentValue: 'Únete a Elite Fitness Club y comienza tu transformación hoy mismo', contentType: 'text' },

    // FEATURES SECTION
    { 
      section: 'features', 
      contentKey: 'list', 
      contentValue: [
        {
          title: 'Entrenamiento personalizado',
          description: 'Planes únicos para cada persona'
        },
        {
          title: 'Equipos de última generación',
          description: 'Tecnología fitness avanzada'
        },
        {
          title: 'Resultados garantizados',
          description: 'Ve cambios reales en tu cuerpo'
        },
        {
          title: 'Comunidad fitness elite',
          description: 'Conecta con personas motivadas'
        }
      ], 
      contentType: 'array' 
    }
  ];

  for (const content of defaultContent) {
    await this.findOrCreate({
      where: { 
        section: content.section, 
        contentKey: content.contentKey 
      },
      defaults: content
    });
  }
};

module.exports = GymSectionsContent;