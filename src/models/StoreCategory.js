// src/models/StoreCategory.js - CORREGIDO con las categorías que necesitan los productos
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StoreCategory = sequelize.define('StoreCategory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
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
  iconName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'package',
    field: 'icon_name'
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'display_order'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'store_categories',
  timestamps: true,
  indexes: [
    { fields: ['slug'], unique: true },
    { fields: ['is_active'] },
    { fields: ['display_order'] }
  ]
});

// ✅ CORREGIDO: Crear las categorías que necesitan los productos
StoreCategory.seedDefaultCategories = async function() {
  const defaultCategories = [
    {
      name: 'Suplementos',
      slug: 'suplementos',
      description: 'Proteínas, aminoácidos, vitaminas y suplementos deportivos',
      iconName: 'pill',
      displayOrder: 1
    },
    {
      name: 'Ropa Deportiva',
      slug: 'ropa-deportiva',
      description: 'Playeras, shorts, leggins y ropa para entrenar',
      iconName: 'shirt',
      displayOrder: 2
    },
    {
      name: 'Accesorios',
      slug: 'accesorios',
      description: 'Guantes, correas, shakers y accesorios de entrenamiento',
      iconName: 'dumbbell',
      displayOrder: 3
    },
    {
      name: 'Equipamiento',
      slug: 'equipamiento',
      description: 'Pesas, bandas elásticas y equipo para el hogar',
      iconName: 'weight',
      displayOrder: 4
    },
    {
      name: 'Nutrición',
      slug: 'nutricion',
      description: 'Barras energéticas, snacks saludables y bebidas',
      iconName: 'apple',
      displayOrder: 5
    }
  ];

  console.log('🗂️ Creando categorías de tienda...');
  
  for (const category of defaultCategories) {
    try {
      const [created, wasCreated] = await this.findOrCreate({
        where: { slug: category.slug },
        defaults: category
      });
      
      if (wasCreated) {
        console.log(`   ✅ Categoría creada: ${category.name}`);
      } else {
        console.log(`   ℹ️ Categoría ya existe: ${category.name}`);
      }
    } catch (error) {
      console.error(`   ❌ Error creando categoría ${category.name}:`, error.message);
    }
  }
  
  console.log('✅ Categorías de tienda procesadas');
};

// ✅ AGREGAR ASOCIACIONES
StoreCategory.associate = function(models) {
  console.log('🔗 Configurando asociaciones para StoreCategory...');
  
  if (models.StoreProduct) {
    StoreCategory.hasMany(models.StoreProduct, {
      foreignKey: 'categoryId',
      as: 'products'
    });
    console.log('   ✅ StoreCategory -> StoreProduct (products)');
  }
};

module.exports = StoreCategory;