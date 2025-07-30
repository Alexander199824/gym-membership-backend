// src/models/GymConfiguration.js
// FUNCIÓN: Modelo de configuración del gimnasio CON SOPORTE COMPLETO DE VIDEO Y MULTIMEDIA
// MEJORAS: Campos de video, imagen hero, configuración multimedia completa, métodos corregidos

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
  
  // 🎬 Campos de video y contenido hero
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
  
  // 🎬 Configuración de video
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
      // 🎬 Valores por defecto para contenido hero
      heroTitle: null, // Se usará gymName si es null
      heroDescription: null, // Se usará gymDescription si es null
      heroVideoUrl: null, // Sin video por defecto
      heroImageUrl: null, // Sin imagen por defecto
      logoUrl: null, // Sin logo por defecto
      // 🎬 Configuración de video por defecto
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

// 🎬 CORREGIDO: Método para obtener configuración de video
GymConfiguration.prototype.getVideoConfig = function() {
  return {
    videoUrl: this.heroVideoUrl || '',
    posterUrl: this.heroImageUrl || '',
    title: this.heroTitle || this.gymName,
    description: this.heroDescription || this.gymDescription,
    settings: {
      autoplay: this.videoAutoplay || false,
      muted: this.videoMuted !== false, // Default true
      loop: this.videoLoop !== false,   // Default true
      controls: this.videoControls !== false // Default true
    },
    available: !!this.heroVideoUrl,
    hasImage: !!this.heroImageUrl,
    hasAnyMedia: !!(this.heroVideoUrl || this.heroImageUrl),
    // ✅ Información adicional
    isImagePoster: this.heroImageUrl && this.heroImageUrl.includes('so_0'),
    isCustomImage: this.heroImageUrl && !this.heroImageUrl.includes('so_0')
  };
};

// 🎬 CORREGIDO: Método para obtener datos completos del hero
GymConfiguration.prototype.getHeroData = function() {
  return {
    title: this.heroTitle || this.gymName || 'Elite Fitness Club',
    description: this.heroDescription || this.gymDescription || 'Tu mejor versión te está esperando',
    videoUrl: this.heroVideoUrl || '',
    imageUrl: this.heroImageUrl || '',
    ctaText: 'Comienza Hoy',
    ctaButtons: [
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
    // ✅ Estados para el frontend
    hasVideo: !!this.heroVideoUrl,
    hasImage: !!this.heroImageUrl,
    hasAnyMedia: !!(this.heroVideoUrl || this.heroImageUrl),
    videoConfig: !!this.heroVideoUrl ? {
      autoplay: this.videoAutoplay || false,
      muted: this.videoMuted !== false,
      loop: this.videoLoop !== false,
      controls: this.videoControls !== false
    } : null
  };
};

// 🔧 CORREGIDO: Método para actualizar configuración multimedia
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
  
  // ✅ Retornar datos actualizados para el frontend
  return {
    config: this,
    videoConfig: this.getVideoConfig(),
    heroData: this.getHeroData(),
    multimedia: this.hasMultimedia()
  };
};

// 🔍 CORREGIDO: Método para verificar si tiene contenido multimedia
GymConfiguration.prototype.hasMultimedia = function() {
  return {
    hasLogo: !!this.logoUrl,
    hasVideo: !!this.heroVideoUrl,
    hasHeroImage: !!this.heroImageUrl,
    hasAnyMedia: !!(this.logoUrl || this.heroVideoUrl || this.heroImageUrl),
    // ✅ Información detallada
    logoUrl: this.logoUrl || '',
    videoUrl: this.heroVideoUrl || '',
    imageUrl: this.heroImageUrl || '',
    imageIsPoster: this.heroImageUrl && this.heroImageUrl.includes('so_0'),
    imageIsCustom: this.heroImageUrl && !this.heroImageUrl.includes('so_0')
  };
};

// ✅ NUEVO: Método para obtener toda la información multimedia para el frontend
GymConfiguration.prototype.getFullMediaData = function() {
  const videoConfig = this.getVideoConfig();
  const heroData = this.getHeroData();
  const multimedia = this.hasMultimedia();
  
  return {
    // Información básica
    gymName: this.gymName,
    gymDescription: this.gymDescription,
    gymTagline: this.gymTagline,
    
    // URLs de archivos
    logoUrl: this.logoUrl || '',
    heroVideoUrl: this.heroVideoUrl || '',
    heroImageUrl: this.heroImageUrl || '',
    
    // Configuración de video
    videoSettings: {
      autoplay: this.videoAutoplay || false,
      muted: this.videoMuted !== false,
      loop: this.videoLoop !== false,
      controls: this.videoControls !== false
    },
    
    // Datos del hero
    hero: heroData,
    
    // Estados multimedia
    multimedia: multimedia,
    
    // ✅ Formato específico para el frontend
    frontendData: {
      name: this.gymName,
      description: this.gymDescription,
      tagline: this.gymTagline,
      logo: {
        url: this.logoUrl || '',
        alt: `${this.gymName} Logo`
      },
      hero: {
        title: heroData.title,
        description: heroData.description,
        videoUrl: this.heroVideoUrl || '',
        imageUrl: this.heroImageUrl || '',
        ctaButtons: heroData.ctaButtons
      },
      videoUrl: this.heroVideoUrl || '',
      imageUrl: this.heroImageUrl || '',
      hasVideo: !!this.heroVideoUrl,
      hasImage: !!this.heroImageUrl,
      videoConfig: videoConfig.available ? videoConfig.settings : null
    }
  };
};

// ✅ NUEVO: Método para actualizar solo el logo
GymConfiguration.prototype.updateLogo = async function(logoUrl) {
  this.logoUrl = logoUrl;
  await this.save();
  return this;
};

// ✅ NUEVO: Método para actualizar solo el video hero
GymConfiguration.prototype.updateHeroVideo = async function(videoUrl, imageUrl = null) {
  this.heroVideoUrl = videoUrl;
  
  // Solo actualizar imagen si se proporciona o si no existe una imagen custom
  if (imageUrl || !this.heroImageUrl || this.heroImageUrl.includes('so_0')) {
    this.heroImageUrl = imageUrl;
  }
  
  await this.save();
  return this;
};

// ✅ NUEVO: Método para actualizar solo la imagen hero
GymConfiguration.prototype.updateHeroImage = async function(imageUrl) {
  this.heroImageUrl = imageUrl;
  await this.save();
  return this;
};

// ✅ NUEVO: Método para actualizar configuración de video
GymConfiguration.prototype.updateVideoSettings = async function(settings) {
  const { autoplay, muted, loop, controls } = settings;
  
  if (autoplay !== undefined) this.videoAutoplay = autoplay;
  if (muted !== undefined) this.videoMuted = muted;
  if (loop !== undefined) this.videoLoop = loop;
  if (controls !== undefined) this.videoControls = controls;
  
  await this.save();
  return this.getVideoConfig();
};

// ✅ NUEVO: Método para limpiar URLs multimedia
GymConfiguration.prototype.clearMultimedia = async function(type = 'all') {
  switch (type) {
    case 'logo':
      this.logoUrl = null;
      break;
    case 'video':
      this.heroVideoUrl = null;
      break;
    case 'image':
      this.heroImageUrl = null;
      break;
    case 'hero':
      this.heroVideoUrl = null;
      this.heroImageUrl = null;
      break;
    case 'all':
    default:
      this.logoUrl = null;
      this.heroVideoUrl = null;
      this.heroImageUrl = null;
      break;
  }
  
  await this.save();
  return this.hasMultimedia();
};

// ✅ NUEVO: Método para obtener información de Cloudinary
GymConfiguration.prototype.getCloudinaryInfo = function() {
  const extractPublicId = (url) => {
    if (!url) return null;
    try {
      const matches = url.match(/\/([^\/]+)\.[a-z]+$/);
      return matches ? matches[1] : null;
    } catch {
      return null;
    }
  };

  return {
    logo: {
      url: this.logoUrl || '',
      publicId: extractPublicId(this.logoUrl),
      exists: !!this.logoUrl,
      isCloudinary: this.logoUrl && this.logoUrl.includes('cloudinary.com')
    },
    heroVideo: {
      url: this.heroVideoUrl || '',
      publicId: extractPublicId(this.heroVideoUrl),
      exists: !!this.heroVideoUrl,
      isCloudinary: this.heroVideoUrl && this.heroVideoUrl.includes('cloudinary.com')
    },
    heroImage: {
      url: this.heroImageUrl || '',
      publicId: extractPublicId(this.heroImageUrl),
      exists: !!this.heroImageUrl,
      isCloudinary: this.heroImageUrl && this.heroImageUrl.includes('cloudinary.com'),
      isPoster: this.heroImageUrl && this.heroImageUrl.includes('so_0'),
      isCustom: this.heroImageUrl && !this.heroImageUrl.includes('so_0')
    }
  };
};

// ✅ NUEVO: Método para validar configuración
GymConfiguration.prototype.validate = function() {
  const errors = [];
  
  // Validar información básica
  if (!this.gymName || this.gymName.trim().length === 0) {
    errors.push('gymName es requerido');
  }
  
  if (!this.gymDescription || this.gymDescription.trim().length === 0) {
    errors.push('gymDescription es requerido');
  }
  
  // Validar colores
  const colorFields = ['primaryColor', 'secondaryColor', 'successColor', 'warningColor', 'dangerColor'];
  const colorRegex = /^#[0-9A-F]{6}$/i;
  
  colorFields.forEach(field => {
    if (!colorRegex.test(this[field])) {
      errors.push(`${field} debe ser un color hexadecimal válido`);
    }
  });
  
  // Validar URLs (si existen)
  const urlFields = ['logoUrl', 'heroVideoUrl', 'heroImageUrl'];
  const urlRegex = /^https?:\/\/.+/;
  
  urlFields.forEach(field => {
    if (this[field] && !urlRegex.test(this[field])) {
      errors.push(`${field} debe ser una URL válida`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
};

// ✅ NUEVO: Método estático para generar CSS variables globales
GymConfiguration.generateGlobalCSS = async function() {
  const config = await this.getConfig();
  const variables = config.generateCSSVariables();
  
  let css = ':root {\n';
  Object.entries(variables).forEach(([key, value]) => {
    css += `  ${key}: ${value};\n`;
  });
  css += '}\n';
  
  // Agregar clases utilitarias
  css += `
.btn-primary {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
}

.btn-secondary {
  background-color: var(--secondary-color);
  border-color: var(--secondary-color);
}

.text-primary {
  color: var(--primary-color) !important;
}

.text-secondary {
  color: var(--secondary-color) !important;
}

.bg-primary {
  background-color: var(--primary-color) !important;
}

.bg-secondary {
  background-color: var(--secondary-color) !important;
}
`;
  
  return css;
};

// ✅ Hook de validación antes de guardar
GymConfiguration.addHook('beforeSave', (instance) => {
  const validation = instance.validate();
  if (!validation.isValid) {
    throw new Error(`Validación falló: ${validation.errors.join(', ')}`);
  }
});

// ✅ Hook después de guardar para logging
GymConfiguration.addHook('afterSave', (instance) => {
  console.log(`✅ Configuración del gym actualizada: ${instance.gymName}`);
  
  const multimedia = instance.hasMultimedia();
  if (multimedia.hasAnyMedia) {
    console.log(`📁 Archivos multimedia:`);
    if (multimedia.hasLogo) console.log(`   🏢 Logo: ${multimedia.logoUrl.substring(0, 50)}...`);
    if (multimedia.hasVideo) console.log(`   🎬 Video: ${multimedia.videoUrl.substring(0, 50)}...`);
    if (multimedia.hasHeroImage) console.log(`   🖼️ Imagen: ${multimedia.imageUrl.substring(0, 50)}...`);
  }
});

module.exports = GymConfiguration;