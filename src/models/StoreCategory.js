// src/models/StoreCategory.js - CORREGIDO con métodos estáticos
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

// ✅ MÉTODO ESTÁTICO AGREGADO: Obtener categorías activas
StoreCategory.getActiveCategories = async function() {
  try {
    console.log('🗂️ Obteniendo categorías activas...');
    
    const categories = await this.findAll({
      where: { isActive: true },
      order: [['displayOrder', 'ASC'], ['name', 'ASC']],
      attributes: ['id', 'name', 'slug', 'description', 'iconName', 'displayOrder']
    });
    
    console.log(`✅ ${categories.length} categorías activas obtenidas`);
    return categories;
  } catch (error) {
    console.error('❌ Error obteniendo categorías activas:', error);
    return [];
  }
};

// ✅ MÉTODO ESTÁTICO: Crear categorías por defecto
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

// ✅ MÉTODO ESTÁTICO: Obtener categoría por slug
StoreCategory.getBySlug = async function(slug) {
  try {
    return await this.findOne({
      where: { 
        slug,
        isActive: true 
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo categoría por slug:', error);
    return null;
  }
};

// ✅ MÉTODO ESTÁTICO: Obtener categorías con conteo de productos
StoreCategory.getCategoriesWithProductCount = async function() {
  try {
    const { StoreProduct } = require('../models');
    
    const categories = await this.findAll({
      where: { isActive: true },
      include: [{
        model: StoreProduct,
        as: 'products',
        where: { isActive: true },
        required: false,
        attributes: []
      }],
      attributes: [
        'id', 'name', 'slug', 'description', 'iconName', 'displayOrder',
        [this.sequelize.fn('COUNT', this.sequelize.col('products.id')), 'productCount']
      ],
      group: ['StoreCategory.id'],
      order: [['displayOrder', 'ASC'], ['name', 'ASC']]
    });

    return categories.map(category => ({
      ...category.toJSON(),
      productCount: parseInt(category.dataValues.productCount || 0)
    }));
  } catch (error) {
    console.error('❌ Error obteniendo categorías con conteo:', error);
    return [];
  }
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