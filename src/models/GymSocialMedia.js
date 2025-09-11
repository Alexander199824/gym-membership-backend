// src/models/GymSocialMedia.js - CORREGIDO: Sin unique en campo ENUM
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GymSocialMedia = sequelize.define('GymSocialMedia', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // ✅ CORREGIDO: Removido unique: true de la definición del campo
  platform: {
    type: DataTypes.ENUM('instagram', 'facebook', 'youtube', 'whatsapp', 'tiktok', 'twitter'),
    allowNull: false
    // unique: true ← REMOVIDO - se maneja en índices
  },
  // ✅ URL de la red social
  url: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {
      isUrl: true
    }
  },
  // ✅ Handle/username de la red social
  handle: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  // ✅ Si está activa
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
  tableName: 'gym_social_media',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    // ✅ CORREGIDO: Unique constraint movida a índices
    { 
      fields: ['platform'], 
      unique: true,
      name: 'gym_social_media_platform_unique'
    },
    { fields: ['is_active'] },
    { fields: ['display_order'] }
  ]
});

// ✅ Método estático para obtener redes sociales activas
GymSocialMedia.getActiveSocialMedia = async function() {
  return await this.findAll({
    where: { isActive: true },
    order: [['displayOrder', 'ASC']]
  });
};

// ✅ Método estático para obtener redes sociales como objeto
GymSocialMedia.getSocialMediaObject = async function() {
  const socialMedia = await this.getActiveSocialMedia();
  const result = {};
  
  socialMedia.forEach(sm => {
    result[sm.platform] = {
      url: sm.url,
      handle: sm.handle,
      active: sm.isActive
    };
  });
  
  return result;
};

// ✅ Método estático para crear redes sociales por defecto
GymSocialMedia.seedDefaultSocialMedia = async function() {
  const defaultSocialMedia = [
    {
      platform: 'instagram',
      url: 'https://instagram.com/elitefitness',
      handle: '@elitefitness',
      displayOrder: 1
    },
    {
      platform: 'facebook',
      url: 'https://facebook.com/elitefitness',
      handle: 'Elite Fitness Club',
      displayOrder: 2
    },
    {
      platform: 'youtube',
      url: 'https://youtube.com/elitefitness',
      handle: 'Elite Fitness',
      displayOrder: 3
    },
    {
      platform: 'whatsapp',
      url: 'https://wa.me/50255555555',
      handle: 'WhatsApp',
      displayOrder: 4
    }
  ];

  console.log('📱 Creando redes sociales por defecto...');
  
  for (const social of defaultSocialMedia) {
    try {
      const [created, wasCreated] = await this.findOrCreate({
        where: { platform: social.platform },
        defaults: social
      });
      
      if (wasCreated) {
        console.log(`   ✅ Red social creada: ${social.platform}`);
      } else {
        console.log(`   ℹ️ Red social ya existe: ${social.platform}`);
      }
    } catch (error) {
      console.error(`   ❌ Error creando red social ${social.platform}:`, error.message);
    }
  }
  
  console.log('✅ Redes sociales procesadas');
};

module.exports = GymSocialMedia;