// src/models/StoreBrand.js - CORREGIDO con las marcas que necesitan los productos
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StoreBrand = sequelize.define('StoreBrand', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
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
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'store_brands',
  timestamps: true
});

// ✅ CORREGIDO: Crear las marcas que necesitan los productos
StoreBrand.seedDefaultBrands = async function() {
  const defaultBrands = [
    {
      name: 'Optimum Nutrition',
      description: 'Líder mundial en suplementos deportivos y proteínas',
      logoUrl: null
    },
    {
      name: 'Nike',
      description: 'Marca líder en ropa y calzado deportivo',
      logoUrl: null
    },
    {
      name: 'Under Armour',
      description: 'Innovación en ropa deportiva y accesorios',
      logoUrl: null
    },
    {
      name: 'Adidas',
      description: 'Marca alemana de artículos deportivos',
      logoUrl: null
    },
    {
      name: 'Dymatize',
      description: 'Suplementos de alta calidad para atletas',
      logoUrl: null
    },
    {
      name: 'BSN',
      description: 'Suplementos premium para fitness',
      logoUrl: null
    },
    {
      name: 'MuscleTech',
      description: 'Investigación y desarrollo en suplementación',
      logoUrl: null
    },
    {
      name: 'Elite Fitness',
      description: 'Marca propia del gimnasio',
      logoUrl: null
    }
  ];

  console.log('🏷️ Creando marcas de tienda...');
  
  for (const brand of defaultBrands) {
    try {
      const [created, wasCreated] = await this.findOrCreate({
        where: { name: brand.name },
        defaults: brand
      });
      
      if (wasCreated) {
        console.log(`   ✅ Marca creada: ${brand.name}`);
      } else {
        console.log(`   ℹ️ Marca ya existe: ${brand.name}`);
      }
    } catch (error) {
      console.error(`   ❌ Error creando marca ${brand.name}:`, error.message);
    }
  }
  
  console.log('✅ Marcas de tienda procesadas');
};

// ✅ AGREGAR ASOCIACIONES
StoreBrand.associate = function(models) {
  console.log('🔗 Configurando asociaciones para StoreBrand...');
  
  if (models.StoreProduct) {
    StoreBrand.hasMany(models.StoreProduct, {
      foreignKey: 'brandId',
      as: 'products'
    });
    console.log('   ✅ StoreBrand -> StoreProduct (products)');
  }
};

module.exports = StoreBrand;




