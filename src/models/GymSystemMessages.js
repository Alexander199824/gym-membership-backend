// src/models/GymSystemMessages.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GymSystemMessages = sequelize.define('GymSystemMessages', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // ✅ Categoría del mensaje
  category: {
    type: DataTypes.ENUM('loading', 'empty_states', 'errors', 'success', 'validation', 'confirmation'),
    allowNull: false
  },
  // ✅ Clave del mensaje
  messageKey: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'message_key'
  },
  // ✅ Mensaje
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  // ✅ Idioma
  locale: {
    type: DataTypes.STRING(5),
    allowNull: false,
    defaultValue: 'es'
  },
  // ✅ Si está activo
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'gym_system_messages',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['category'] },
    { fields: ['message_key'] },
    { fields: ['locale'] },
    { fields: ['category', 'message_key', 'locale'], unique: true },
    { fields: ['is_active'] }
  ]
});

// ✅ Método estático para obtener mensajes por categoría
GymSystemMessages.getMessagesByCategory = async function(category, locale = 'es') {
  const messages = await this.findAll({
    where: { 
      category,
      locale,
      isActive: true 
    }
  });
  
  const result = {};
  messages.forEach(msg => {
    result[msg.messageKey] = msg.message;
  });
  
  return result;
};

// ✅ Método estático para obtener todos los mensajes organizados
GymSystemMessages.getAllSystemMessages = async function(locale = 'es') {
  const messages = await this.findAll({
    where: { 
      locale,
      isActive: true 
    }
  });
  
  const result = {};
  messages.forEach(msg => {
    if (!result[msg.category]) {
      result[msg.category] = {};
    }
    result[msg.category][msg.messageKey] = msg.message;
  });
  
  return result;
};

// ✅ Método estático para obtener un mensaje específico
GymSystemMessages.getMessage = async function(category, messageKey, locale = 'es') {
  const message = await this.findOne({
    where: { 
      category,
      messageKey,
      locale,
      isActive: true 
    }
  });
  
  return message ? message.message : null;
};

// ✅ Método estático para crear mensajes por defecto
GymSystemMessages.seedDefaultSystemMessages = async function() {
  const defaultMessages = [
    // LOADING MESSAGES
    { category: 'loading', messageKey: 'default', message: 'Cargando...', locale: 'es' },
    { category: 'loading', messageKey: 'products', message: 'Cargando productos...', locale: 'es' },
    { category: 'loading', messageKey: 'services', message: 'Cargando servicios...', locale: 'es' },
    { category: 'loading', messageKey: 'testimonials', message: 'Cargando testimonios...', locale: 'es' },
    { category: 'loading', messageKey: 'plans', message: 'Cargando planes...', locale: 'es' },

    // EMPTY STATES
    { category: 'empty_states', messageKey: 'no_products', message: 'No se encontraron productos', locale: 'es' },
    { category: 'empty_states', messageKey: 'no_testimonials', message: 'No hay testimonios disponibles', locale: 'es' },
    { category: 'empty_states', messageKey: 'no_services', message: 'No hay servicios disponibles', locale: 'es' },
    { category: 'empty_states', messageKey: 'no_plans', message: 'No hay planes disponibles', locale: 'es' },
    { category: 'empty_states', messageKey: 'no_results', message: 'No se encontraron resultados', locale: 'es' },

    // ERROR MESSAGES
    { category: 'errors', messageKey: 'connection', message: 'Error de conexión. Por favor, intenta nuevamente.', locale: 'es' },
    { category: 'errors', messageKey: 'general', message: 'Algo salió mal. Por favor, contacta al soporte.', locale: 'es' },
    { category: 'errors', messageKey: 'timeout', message: 'La solicitud tomó demasiado tiempo. Intenta de nuevo.', locale: 'es' },
    { category: 'errors', messageKey: 'not_found', message: 'No se encontró la información solicitada.', locale: 'es' },
    { category: 'errors', messageKey: 'server_error', message: 'Error del servidor. Intenta más tarde.', locale: 'es' },

    // SUCCESS MESSAGES
    { category: 'success', messageKey: 'contact_sent', message: '¡Mensaje enviado exitosamente! Te contactaremos pronto.', locale: 'es' },
    { category: 'success', messageKey: 'subscribed', message: '¡Te has suscrito correctamente! Gracias por unirte.', locale: 'es' },
    { category: 'success', messageKey: 'registered', message: '¡Registro exitoso! Te hemos enviado un email de confirmación.', locale: 'es' },
    { category: 'success', messageKey: 'updated', message: 'Información actualizada correctamente.', locale: 'es' },

    // VALIDATION MESSAGES
    { category: 'validation', messageKey: 'required_field', message: 'Este campo es obligatorio', locale: 'es' },
    { category: 'validation', messageKey: 'invalid_email', message: 'Por favor, ingresa un email válido', locale: 'es' },
    { category: 'validation', messageKey: 'invalid_phone', message: 'Por favor, ingresa un teléfono válido', locale: 'es' },
    { category: 'validation', messageKey: 'min_length', message: 'Debe tener al menos {min} caracteres', locale: 'es' },
    { category: 'validation', messageKey: 'max_length', message: 'No puede tener más de {max} caracteres', locale: 'es' },

    // CONFIRMATION MESSAGES
    { category: 'confirmation', messageKey: 'delete_item', message: '¿Estás seguro de que deseas eliminar este elemento?', locale: 'es' },
    { category: 'confirmation', messageKey: 'cancel_order', message: '¿Deseas cancelar esta orden?', locale: 'es' },
    { category: 'confirmation', messageKey: 'logout', message: '¿Seguro que deseas cerrar sesión?', locale: 'es' }
  ];

  for (const msg of defaultMessages) {
    await this.findOrCreate({
      where: { 
        category: msg.category, 
        messageKey: msg.messageKey,
        locale: msg.locale 
      },
      defaults: msg
    });
  }
};

module.exports = GymSystemMessages;