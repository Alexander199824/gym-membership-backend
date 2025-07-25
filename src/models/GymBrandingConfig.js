// src/models/GymBrandingConfig.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GymBrandingConfig = sequelize.define('GymBrandingConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // ✅ Elemento de branding
  element: {
    type: DataTypes.ENUM('colors', 'fonts', 'logo_variants', 'favicons', 'theme'),
    allowNull: false
  },
  // ✅ Propiedad específica
  property: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  // ✅ Valor de la propiedad
  value: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  // ✅ Tipo de valor
  valueType: {
    type: DataTypes.ENUM('string', 'color', 'url', 'number', 'boolean'),
    allowNull: false,
    defaultValue: 'string',
    field: 'value_type'
  },
  // ✅ Si está activo
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'gym_branding_config',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['element'] },
    { fields: ['property'] },
    { fields: ['element', 'property'], unique: true },
    { fields: ['is_active'] }
  ]
});

// ✅ Método estático para obtener configuración por elemento
GymBrandingConfig.getBrandingByElement = async function(element) {
  const configs = await this.findAll({
    where: { 
      element,
      isActive: true 
    }
  });
  
  const result = {};
  configs.forEach(config => {
    result[config.property] = config.value;
  });
  
  return result;
};

// ✅ Método estático para obtener toda la configuración de branding
GymBrandingConfig.getAllBrandingConfig = async function() {
  const configs = await this.findAll({
    where: { isActive: true }
  });
  
  const result = {};
  configs.forEach(config => {
    if (!result[config.element]) {
      result[config.element] = {};
    }
    result[config.element][config.property] = config.value;
  });
  
  return result;
};

// ✅ Método estático para generar variables CSS
GymBrandingConfig.generateCSSVariables = async function() {
  const colors = await this.getBrandingByElement('colors');
  const fonts = await this.getBrandingByElement('fonts');
  
  const cssVars = {};
  
  // Colores
  Object.keys(colors).forEach(key => {
    cssVars[`--${key.replace('_', '-')}`] = colors[key];
  });
  
  // Fuentes
  Object.keys(fonts).forEach(key => {
    cssVars[`--font-${key.replace('_', '-')}`] = fonts[key];
  });
  
  return cssVars;
};

// ✅ Método estático para crear configuración por defecto
GymBrandingConfig.seedDefaultBrandingConfig = async function() {
  const defaultConfig = [
    // COLORES
    { element: 'colors', property: 'primary', value: '#14b8a6', valueType: 'color' },
    { element: 'colors', property: 'secondary', value: '#ec4899', valueType: 'color' },
    { element: 'colors', property: 'success', value: '#22c55e', valueType: 'color' },
    { element: 'colors', property: 'warning', value: '#f59e0b', valueType: 'color' },
    { element: 'colors', property: 'danger', value: '#ef4444', valueType: 'color' },
    { element: 'colors', property: 'info', value: '#3b82f6', valueType: 'color' },
    { element: 'colors', property: 'dark', value: '#1f2937', valueType: 'color' },
    { element: 'colors', property: 'light', value: '#f9fafb', valueType: 'color' },

    // FUENTES
    { element: 'fonts', property: 'primary', value: 'Inter, sans-serif', valueType: 'string' },
    { element: 'fonts', property: 'headings', value: 'Inter, sans-serif', valueType: 'string' },
    { element: 'fonts', property: 'mono', value: 'JetBrains Mono, monospace', valueType: 'string' },

    // VARIANTES DE LOGO
    { element: 'logo_variants', property: 'main', value: '/uploads/logos/logo-main.png', valueType: 'url' },
    { element: 'logo_variants', property: 'white', value: '/uploads/logos/logo-white.png', valueType: 'url' },
    { element: 'logo_variants', property: 'dark', value: '/uploads/logos/logo-dark.png', valueType: 'url' },
    { element: 'logo_variants', property: 'icon', value: '/uploads/logos/logo-icon.png', valueType: 'url' },

    // FAVICONS
    { element: 'favicons', property: 'ico', value: '/uploads/favicons/favicon.ico', valueType: 'url' },
    { element: 'favicons', property: 'png', value: '/uploads/favicons/favicon.png', valueType: 'url' },
    { element: 'favicons', property: 'apple', value: '/uploads/favicons/apple-touch-icon.png', valueType: 'url' },

    // TEMA
    { element: 'theme', property: 'mode', value: 'light', valueType: 'string' },
    { element: 'theme', property: 'rounded', value: '8', valueType: 'number' },
    { element: 'theme', property: 'shadow', value: 'medium', valueType: 'string' }
  ];

  for (const config of defaultConfig) {
    await this.findOrCreate({
      where: { 
        element: config.element, 
        property: config.property 
      },
      defaults: config
    });
  }
};

module.exports = GymBrandingConfig;