// src/models/GymContactInfo.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GymContactInfo = sequelize.define('GymContactInfo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // ✅ Información de contacto principal
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: /^[\+]?[\d\s\-\(\)]+$/
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  // ✅ Dirección del gimnasio
  address: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  addressShort: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'address_short'
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  country: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Guatemala'
  },
  // ✅ Integración con Google Maps
  mapsUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'maps_url'
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  }
}, {
  tableName: 'gym_contact_info',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// ✅ Método estático para obtener información de contacto
GymContactInfo.getContactInfo = async function() {
  let contactInfo = await this.findOne();
  
  if (!contactInfo) {
    contactInfo = await this.create({
      phone: '+502 1234-5678',
      email: 'info@elitefitness.com',
      address: 'Zona 10, Ciudad de Guatemala',
      addressShort: 'Zona 10, Guatemala',
      city: 'Ciudad de Guatemala',
      country: 'Guatemala'
    });
  }
  
  return contactInfo;
};

module.exports = GymContactInfo;