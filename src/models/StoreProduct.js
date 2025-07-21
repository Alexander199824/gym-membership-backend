// src/models/StoreProduct.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StoreProduct = sequelize.define('StoreProduct', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // ✅ Información del producto
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // ✅ Precios
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  originalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'original_price',
    validate: {
      min: 0
    }
  },
  // ✅ Relaciones
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'category_id',
    references: {
      model: 'store_categories',
      key: 'id'
    }
  },
  brandId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'brand_id',
    references: {
      model: 'store_brands',
      key: 'id'
    }
  },
  // ✅ Inventario
  sku: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  stockQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'stock_quantity'
  },
  minStock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    field: 'min_stock'
  },
  // ✅ Estados
  isFeatured: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_featured'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  // ✅ Rating y reseñas
  rating: {
    type: DataTypes.DECIMAL(2, 1),
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 5
    }
  },
  reviewsCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'reviews_count'
  },
  // ✅ Información física
  weight: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
    comment: 'Peso en gramos'
  },
  dimensions: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Dimensiones del producto {length, width, height} en cm'
  },
  // ✅ Opciones de entrega
  allowOnlinePayment: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'allow_online_payment'
  },
  allowCardPayment: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'allow_card_payment'
  },
  allowCashOnDelivery: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'allow_cash_on_delivery'
  },
  deliveryTime: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: '1-2 días hábiles',
    field: 'delivery_time'
  }
}, {
  tableName: 'store_products',
  timestamps: true,
  indexes: [
    { fields: ['category_id'] },
    { fields: ['brand_id'] },
    { fields: ['sku'], unique: true },
    { fields: ['is_featured'] },
    { fields: ['is_active'] },
    { fields: ['stock_quantity'] }
  ]
});

// ✅ Métodos de instancia
StoreProduct.prototype.getDiscountPercentage = function() {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }
  return 0;
};

StoreProduct.prototype.isInStock = function() {
  return this.stockQuantity > 0;
};

StoreProduct.prototype.isLowStock = function() {
  return this.stockQuantity <= this.minStock;
};

// ✅ Métodos estáticos
StoreProduct.getFeaturedProducts = async function(limit = 8) {
  return await this.findAll({
    where: { 
      isFeatured: true, 
      isActive: true,
      stockQuantity: { [sequelize.Sequelize.Op.gt]: 0 }
    },
    include: ['category', 'brand', 'images'],
    limit,
    order: [['rating', 'DESC'], ['reviewsCount', 'DESC']]
  });
};

StoreProduct.getProductsByCategory = async function(categoryId, limit = 20, offset = 0) {
  return await this.findAndCountAll({
    where: { 
      categoryId, 
      isActive: true 
    },
    include: ['category', 'brand', 'images'],
    limit,
    offset,
    order: [['name', 'ASC']]
  });
};

StoreProduct.searchProducts = async function(query, filters = {}) {
  const where = {
    isActive: true,
    [sequelize.Sequelize.Op.or]: [
      { name: { [sequelize.Sequelize.Op.iLike]: `%${query}%` } },
      { description: { [sequelize.Sequelize.Op.iLike]: `%${query}%` } }
    ]
  };

  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.brandId) where.brandId = filters.brandId;
  if (filters.minPrice) where.price = { [sequelize.Sequelize.Op.gte]: filters.minPrice };
  if (filters.maxPrice) {
    where.price = where.price || {};
    where.price[sequelize.Sequelize.Op.lte] = filters.maxPrice;
  }

  return await this.findAll({
    where,
    include: ['category', 'brand', 'images'],
    order: [['rating', 'DESC'], ['name', 'ASC']]
  });
};

// ✅ Crear productos de ejemplo
StoreProduct.seedSampleProducts = async function() {
  const { StoreCategory, StoreBrand } = require('./index');
  
  const sampleProducts = [
    {
      name: 'Whey Protein Gold Standard',
      description: 'Proteína de suero de alta calidad con aminoácidos esenciales',
      price: 299.99,
      originalPrice: 349.99,
      sku: 'WPG-001',
      stockQuantity: 50,
      categoryName: 'Suplementos',
      brandName: 'Optimum Nutrition',
      isFeatured: true,
      rating: 4.8,
      reviewsCount: 150,
      weight: 2270,
      allowOnlinePayment: true,
      allowCardPayment: true,
      allowCashOnDelivery: true
    },
    {
      name: 'Playera Deportiva Dri-FIT',
      description: 'Playera transpirable para entrenamientos intensos',
      price: 89.99,
      originalPrice: 120.00,
      sku: 'PDM-002',
      stockQuantity: 30,
      categoryName: 'Ropa Deportiva',
      brandName: 'Nike',
      isFeatured: true,
      rating: 4.5,
      reviewsCount: 89
    },
    {
      name: 'Guantes de Entrenamiento',
      description: 'Guantes acolchados para levantamiento de pesas',
      price: 45.00,
      sku: 'GLE-003',
      stockQuantity: 25,
      categoryName: 'Accesorios',
      brandName: 'Under Armour',
      rating: 4.3,
      reviewsCount: 67
    }
  ];

  for (const product of sampleProducts) {
    // ✅ Buscar categoría y marca
    const category = await StoreCategory.findOne({ where: { name: product.categoryName } });
    const brand = await StoreBrand.findOne({ where: { name: product.brandName } });
    
    if (category) {
      await this.findOrCreate({
        where: { sku: product.sku },
        defaults: {
          ...product,
          categoryId: category.id,
          brandId: brand?.id || null
        }
      });
    }
  }
};

module.exports = StoreProduct;