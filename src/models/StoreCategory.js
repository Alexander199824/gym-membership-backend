// src/models/StoreCategory.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StoreCategory = sequelize.define('StoreCategory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // ✅ Información de la categoría
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // ✅ Icono para mostrar en el frontend
  iconName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'package',
    field: 'icon_name'
  },
  // ✅ Orden de visualización
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'display_order'
  },
  // ✅ Si está activa
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'store_categories',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['slug'], unique: true },
    { fields: ['is_active'] },
    { fields: ['display_order'] }
  ]
});

// ✅ Método estático para obtener categorías activas
StoreCategory.getActiveCategories = async function() {
  return await this.findAll({
    where: { isActive: true },
    order: [['displayOrder', 'ASC']]
  });
};

// ✅ Crear categorías por defecto
StoreCategory.seedDefaultCategories = async function() {
  const defaultCategories = [
    { name: 'Suplementos', slug: 'suplementos', description: 'Proteínas, vitaminas y suplementos deportivos', iconName: 'pill', displayOrder: 1 },
    { name: 'Ropa Deportiva', slug: 'ropa-deportiva', description: 'Playeras, shorts y ropa para entrenar', iconName: 'shirt', displayOrder: 2 },
    { name: 'Accesorios', slug: 'accesorios', description: 'Guantes, correas, shakers y más', iconName: 'dumbbell', displayOrder: 3 },
    { name: 'Equipos', slug: 'equipos', description: 'Equipos pequeños para casa', iconName: 'weight', displayOrder: 4 }
  ];

  for (const category of defaultCategories) {
    await this.findOrCreate({
      where: { slug: category.slug },
      defaults: category
    });
  }
};

module.exports = StoreCategory;