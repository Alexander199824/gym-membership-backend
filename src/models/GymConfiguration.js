// src/models/GymConfiguration.js - CORREGIDO: Campo ID agregado
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GymConfiguration = sequelize.define('GymConfiguration', {
  // ✅ CORREGIDO: Campo ID explícito que faltaba
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // ✅ Información básica del gimnasio
  gymName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: 'Elite Fitness Club',
    field: 'gym_name'
  },
  gymTagline: {
    type: DataTypes.STRING(500),
    allowNull: true,
    defaultValue: 'Tu mejor versión te está esperando',
    field: 'gym_tagline'
  },
  gymDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: 'Centro de entrenamiento integral con equipos de última generación y entrenadores certificados.',
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

// ✅ CORREGIDO: Método estático para obtener configuración (singleton pattern)
GymConfiguration.getConfig = async function() {
  try {
    let config = await this.findOne();
    
    // ✅ Si no existe configuración, crear una por defecto
    if (!config) {
      console.log('🔧 Creando configuración por defecto...');
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
      
      console.log('✅ Configuración por defecto creada');
    }
    
    return config;
  } catch (error) {
    console.error('❌ Error obteniendo configuración:', error.message);
    throw error;
  }
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

// ✅ NUEVO: Método para verificar y reparar configuración
GymConfiguration.verifyAndRepair = async function() {
  try {
    console.log('🔧 Verificando configuración del gym...');
    
    const config = await this.getConfig();
    
    // Verificar campos críticos
    const requiredFields = ['id', 'gymName', 'gymDescription'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length > 0) {
      console.log(`⚠️ Campos faltantes detectados: ${missingFields.join(', ')}`);
      
      // Reparar campos faltantes
      if (!config.gymName) config.gymName = 'Elite Fitness Club';
      if (!config.gymDescription) config.gymDescription = 'Centro de entrenamiento integral';
      
      await config.save();
      console.log('✅ Configuración reparada automáticamente');
    } else {
      console.log('✅ Configuración verificada correctamente');
    }
    
    return {
      id: config.id,
      name: config.gymName,
      description: config.gymDescription,
      hasLogo: !!config.logoUrl,
      hasVideo: !!config.heroVideoUrl,
      hasImage: !!config.heroImageUrl
    };
    
  } catch (error) {
    console.error('❌ Error verificando configuración:', error.message);
    throw error;
  }
};

// ✅ Hook de validación antes de guardar
GymConfiguration.addHook('beforeSave', (instance) => {
  // Asegurar valores por defecto
  if (!instance.gymName) instance.gymName = 'Elite Fitness Club';
  if (!instance.gymTagline) instance.gymTagline = 'Tu mejor versión te está esperando';
  if (!instance.gymDescription) instance.gymDescription = 'Centro de entrenamiento integral';
});

// ✅ Hook después de guardar para logging
GymConfiguration.addHook('afterSave', (instance) => {
  console.log(`✅ Configuración del gym actualizada: ${instance.gymName} (ID: ${instance.id})`);
});

module.exports = GymConfiguration;