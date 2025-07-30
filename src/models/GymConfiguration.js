// src/models/GymConfiguration.js
// FUNCIÓN: Modelo de configuración del gimnasio CON SOPORTE COMPLETO DE VIDEO
// MEJORAS: Campos de video, imagen hero, configuración multimedia completa

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GymConfiguration = sequelize.define('GymConfiguration', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // ✅ Información básica del gimnasio
  gymName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'gym_name'
  },
  gymTagline: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'gym_tagline'
  },
  gymDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'gym_description'
  },
  
  // ✅ URLs de archivos multimedia (Cloudinary o CDN)
  logoUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'logo_url',
    comment: 'URL del logo principal del gimnasio'
  },
  
  // 🎬 NUEVO: Campos de video y contenido hero
  heroVideoUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'hero_video_url',
    comment: 'URL del video principal/hero del gimnasio'
  },
  heroImageUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'hero_image_url',
    comment: 'URL de la imagen hero/poster del video'
  },
  heroTitle: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'hero_title',
    comment: 'Título personalizado para la sección hero'
  },
  heroDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'hero_description',
    comment: 'Descripción personalizada para la sección hero'
  },
  
  // 🎬 NUEVO: Configuración de video
  videoAutoplay: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'video_autoplay',
    comment: 'Si el video debe reproducirse automáticamente'
  },
  videoMuted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'video_muted',
    comment: 'Si el video debe estar silenciado por defecto'
  },
  videoLoop: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'video_loop',
    comment: 'Si el video debe repetirse en bucle'
  },
  videoControls: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'video_controls',
    comment: 'Si mostrar controles de video'
  },

  // ✅ Paleta de colores personalizable para el frontend
  primaryColor: {
    type: DataTypes.STRING(7),
    allowNull: false,
    defaultValue: '#3498db',
    field: 'primary_color',
    validate: {
      is: /^#[0-9A-F]{6}$/i // Validar formato hexadecimal
    }
  },
  secondaryColor: {
    type: DataTypes.STRING(7),
    allowNull: false,
    defaultValue: '#2c3e50',
    field: 'secondary_color',
    validate: {
      is: /^#[0-9A-F]{6}$/i
    }
  },
  successColor: {
    type: DataTypes.STRING(7),
    allowNull: false,
    defaultValue: '#27ae60',
    field: 'success_color',
    validate: {
      is: /^#[0-9A-F]{6}$/i
    }
  },
  warningColor: {
    type: DataTypes.STRING(7),
    allowNull: false,
    defaultValue: '#f39c12',
    field: 'warning_color',
    validate: {
      is: /^#[0-9A-F]{6}$/i
    }
  },
  dangerColor: {
    type: DataTypes.STRING(7),
    allowNull: false,
    defaultValue: '#e74c3c',
    field: 'danger_color',
    validate: {
      is: /^#[0-9A-F]{6}$/i
    }
  }
}, {
  tableName: 'gym_configuration',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// ✅ Método estático para obtener configuración (singleton pattern)
GymConfiguration.getConfig = async function() {
  let config = await this.findOne();
  
  // ✅ Si no existe configuración, crear una por defecto
  if (!config) {
    config = await this.create({
      gymName: 'Elite Fitness Club',
      gymTagline: 'Tu mejor versión te está esperando',
      gymDescription: 'Centro de entrenamiento integral con equipos de última generación y entrenadores certificados.',
      // 🎬 NUEVO: Valores por defecto para contenido hero
      heroTitle: null, // Se usará gymName si es null
      heroDescription: null, // Se usará gymDescription si es null
      heroVideoUrl: null, // Sin video por defecto
      heroImageUrl: null, // Sin imagen por defecto
      // 🎬 NUEVO: Configuración de video por defecto
      videoAutoplay: false,
      videoMuted: true,
      videoLoop: true,
      videoControls: true,
      // Colores
      primaryColor: '#3498db',
      secondaryColor: '#2c3e50',
      successColor: '#27ae60',
      warningColor: '#f39c12',
      dangerColor: '#e74c3c'
    });
  }
  
  return config;
};

// ✅ Método para generar CSS variables dinámicas
GymConfiguration.prototype.generateCSSVariables = function() {
  return {
    '--primary-color': this.primaryColor,
    '--secondary-color': this.secondaryColor,
    '--success-color': this.successColor,
    '--warning-color': this.warningColor,
    '--danger-color': this.dangerColor
  };
};

// 🎬 NUEVO: Método para obtener configuración de video
GymConfiguration.prototype.getVideoConfig = function() {
  return {
    videoUrl: this.heroVideoUrl,
    posterUrl: this.heroImageUrl,
    title: this.heroTitle || this.gymName,
    description: this.heroDescription || this.gymDescription,
    settings: {
      autoplay: this.videoAutoplay,
      muted: this.videoMuted,
      loop: this.videoLoop,
      controls: this.videoControls
    },
    available: !!this.heroVideoUrl,
    hasImage: !!this.heroImageUrl,
    hasAnyMedia: !!(this.heroVideoUrl || this.heroImageUrl)
  };
};

// 🎬 NUEVO: Método para obtener datos completos del hero
GymConfiguration.prototype.getHeroData = function() {
  return {
    title: this.heroTitle || this.gymName,
    description: this.heroDescription || this.gymDescription,
    videoUrl: this.heroVideoUrl || '',
    imageUrl: this.heroImageUrl || '',
    ctaText: 'Comienza Hoy',
    ctaButtons: [
      {
        text: 'Únete Ahora',
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
    ]
  };
};

// 🔧 NUEVO: Método para actualizar configuración multimedia
GymConfiguration.prototype.updateMediaConfig = async function(mediaData) {
  const {
    logoUrl,
    heroVideoUrl,
    heroImageUrl,
    heroTitle,
    heroDescription,
    videoAutoplay,
    videoMuted,
    videoLoop,
    videoControls
  } = mediaData;

  // Actualizar solo los campos proporcionados
  if (logoUrl !== undefined) this.logoUrl = logoUrl;
  if (heroVideoUrl !== undefined) this.heroVideoUrl = heroVideoUrl;
  if (heroImageUrl !== undefined) this.heroImageUrl = heroImageUrl;
  if (heroTitle !== undefined) this.heroTitle = heroTitle;
  if (heroDescription !== undefined) this.heroDescription = heroDescription;
  if (videoAutoplay !== undefined) this.videoAutoplay = videoAutoplay;
  if (videoMuted !== undefined) this.videoMuted = videoMuted;
  if (videoLoop !== undefined) this.videoLoop = videoLoop;
  if (videoControls !== undefined) this.videoControls = videoControls;

  await this.save();
  return this;
};

// 🔍 NUEVO: Método para verificar si tiene contenido multimedia
GymConfiguration.prototype.hasMultimedia = function() {
  return {
    hasLogo: !!this.logoUrl,
    hasVideo: !!this.heroVideoUrl,
    hasHeroImage: !!this.heroImageUrl,
    hasAnyMedia: !!(this.logoUrl || this.heroVideoUrl || this.heroImageUrl)
  };
};

module.exports = GymConfiguration;