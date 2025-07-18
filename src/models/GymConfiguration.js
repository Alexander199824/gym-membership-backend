// src/models/GymConfiguration.js
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
  // ✅ URLs de archivos multimedia (Cloudinary)
  logoUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'logo_url'
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

module.exports = GymConfiguration;