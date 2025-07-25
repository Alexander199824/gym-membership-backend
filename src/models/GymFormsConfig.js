// src/models/GymFormsConfig.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GymFormsConfig = sequelize.define('GymFormsConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // ✅ Nombre del formulario
  formName: {
    type: DataTypes.ENUM('contact_form', 'newsletter', 'registration', 'consultation'),
    allowNull: false,
    unique: true,
    field: 'form_name'
  },
  // ✅ Configuración del formulario (JSON)
  config: {
    type: DataTypes.JSON,
    allowNull: false
    // Estructura: { title, description, fields, submitText, etc. }
  },
  // ✅ Si está activo
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'gym_forms_config',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['form_name'], unique: true },
    { fields: ['is_active'] }
  ]
});

// ✅ Método estático para obtener configuración de formulario por nombre
GymFormsConfig.getFormConfig = async function(formName) {
  const form = await this.findOne({
    where: { 
      formName,
      isActive: true 
    }
  });
  
  return form ? form.config : null;
};

// ✅ Método estático para obtener todas las configuraciones
GymFormsConfig.getAllFormsConfig = async function() {
  const forms = await this.findAll({
    where: { isActive: true }
  });
  
  const result = {};
  forms.forEach(form => {
    result[form.formName] = form.config;
  });
  
  return result;
};

// ✅ Método estático para crear configuraciones por defecto
GymFormsConfig.seedDefaultFormsConfig = async function() {
  const defaultForms = [
    {
      formName: 'contact_form',
      config: {
        title: 'Contáctanos',
        description: 'Estamos aquí para ayudarte. Envíanos un mensaje y te responderemos pronto.',
        fields: [
          { 
            name: 'name', 
            label: 'Nombre completo', 
            type: 'text', 
            required: true,
            placeholder: 'Tu nombre completo'
          },
          { 
            name: 'email', 
            label: 'Correo electrónico', 
            type: 'email', 
            required: true,
            placeholder: 'tu@email.com'
          },
          { 
            name: 'phone', 
            label: 'Teléfono', 
            type: 'tel', 
            required: false,
            placeholder: '+502 1234-5678'
          },
          { 
            name: 'message', 
            label: 'Mensaje', 
            type: 'textarea', 
            required: true,
            placeholder: 'Cuéntanos en qué podemos ayudarte...',
            rows: 4
          }
        ],
        submitText: 'Enviar mensaje',
        successMessage: '¡Mensaje enviado! Te contactaremos pronto.',
        termsRequired: false
      }
    },
    {
      formName: 'newsletter',
      config: {
        title: 'Mantente informado',
        description: 'Recibe tips de entrenamiento, ofertas exclusivas y las últimas novedades directamente en tu email.',
        placeholder: 'tu@email.com',
        submitText: 'Suscribirse',
        successMessage: '¡Bienvenido! Te has suscrito correctamente.',
        buttonIcon: 'mail'
      }
    },
    {
      formName: 'registration',
      config: {
        title: 'Registrarse GRATIS',
        description: 'Obtén tu primera semana gratis y comienza tu transformación hoy mismo.',
        fields: [
          { name: 'firstName', label: 'Nombre', type: 'text', required: true },
          { name: 'lastName', label: 'Apellido', type: 'text', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'phone', label: 'Teléfono', type: 'tel', required: true },
          { name: 'goals', label: 'Objetivos', type: 'select', required: true, options: [
            'Perder peso',
            'Ganar músculo',
            'Mejorar resistencia',
            'Rehabilitación',
            'Bienestar general'
          ]}
        ],
        submitText: 'Comenzar GRATIS',
        termsText: 'Acepto los términos y condiciones',
        termsRequired: true
      }
    }
  ];

  for (const form of defaultForms) {
    await this.findOrCreate({
      where: { formName: form.formName },
      defaults: form
    });
  }
};

module.exports = GymFormsConfig;