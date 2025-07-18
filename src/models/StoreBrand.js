// src/models/StoreBrand.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StoreBrand = sequelize.define('StoreBrand', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // ✅ Información de la marca
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  logoUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'logo_url'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // ✅ Si está activa
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'store_brands',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// ✅ Crear marcas por defecto
StoreBrand.seedDefaultBrands = async function() {
  const defaultBrands = [
    { name: 'MuscleTech', description: 'Suplementos deportivos de alta calidad' },
    { name: 'Nike', description: 'Ropa y accesorios deportivos' },
    { name: 'Under Armour', description: 'Equipamiento deportivo profesional' },
    { name: 'Optimum Nutrition', description: 'Nutrición deportiva premium' },
    { name: 'BSN', description: 'Suplementos para rendimiento atlético' }
  ];

  for (const brand of defaultBrands) {
    await this.findOrCreate({
      where: { name: brand.name },
      defaults: brand
    });
  }
};

module.exports = StoreBrand;