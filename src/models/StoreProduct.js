// src/models/StoreProduct.js - CORREGIDO con asociaciones
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

// ✅ CORREGIDO: DEFINIR ASOCIACIONES CORRECTAMENTE
StoreProduct.associate = function(models) {
  console.log('🔗 Configurando asociaciones para StoreProduct...');
  
  // ✅ Relación con categoria
  if (models.StoreCategory) {
    StoreProduct.belongsTo(models.StoreCategory, {
      foreignKey: 'categoryId',
      as: 'category'
    });
    console.log('   ✅ StoreProduct -> StoreCategory (category)');
  }
  
  // ✅ Relación con marca
  if (models.StoreBrand) {
    StoreProduct.belongsTo(models.StoreBrand, {
      foreignKey: 'brandId',
      as: 'brand'
    });
    console.log('   ✅ StoreProduct -> StoreBrand (brand)');
  }
  
  // ✅ Relación con imágenes
  if (models.StoreProductImage) {
    StoreProduct.hasMany(models.StoreProductImage, {
      foreignKey: 'productId',
      as: 'images'
    });
    console.log('   ✅ StoreProduct -> StoreProductImage (images)');
  }
  
  // ✅ Relación con items del carrito
  if (models.StoreCart) {
    StoreProduct.hasMany(models.StoreCart, {
      foreignKey: 'productId',
      as: 'cartItems'
    });
    console.log('   ✅ StoreProduct -> StoreCart (cartItems)');
  }
  
  // ✅ Relación con items de órdenes
  if (models.StoreOrderItem) {
    StoreProduct.hasMany(models.StoreOrderItem, {
      foreignKey: 'productId',
      as: 'orderItems'
    });
    console.log('   ✅ StoreProduct -> StoreOrderItem (orderItems)');
  }
};

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

// ✅ CORREGIDO: Métodos estáticos SIN includes problemáticos
StoreProduct.getFeaturedProducts = async function(limit = 8) {
  try {
    console.log('🔍 Buscando productos destacados...');
    
    // ✅ VERSIÓN SIMPLE SIN INCLUDES (para evitar errores de asociación)
    const products = await this.findAll({
      where: { 
        isFeatured: true, 
        isActive: true,
        stockQuantity: { [sequelize.Sequelize.Op.gt]: 0 }
      },
      limit,
      order: [['rating', 'DESC'], ['reviewsCount', 'DESC']]
    });
    
    console.log(`✅ Encontrados ${products.length} productos destacados`);
    return products;
    
  } catch (error) {
    console.error('❌ Error en getFeaturedProducts:', error.message);
    
    // ✅ FALLBACK: Devolver productos básicos sin filtros complejos
    try {
      const basicProducts = await this.findAll({
        where: { isActive: true },
        limit,
        order: [['id', 'DESC']]
      });
      console.log(`⚠️ Fallback: devolviendo ${basicProducts.length} productos básicos`);
      return basicProducts;
    } catch (fallbackError) {
      console.error('❌ Error en fallback:', fallbackError.message);
      return [];
    }
  }
};

// ✅ CORREGIDO: Método mejorado para productos por categoría
StoreProduct.getProductsByCategory = async function(categoryId, limit = 20, offset = 0) {
  try {
    console.log(`🔍 Buscando productos de categoría ${categoryId}...`);
    
    const result = await this.findAndCountAll({
      where: { 
        categoryId, 
        isActive: true 
      },
      limit,
      offset,
      order: [['name', 'ASC']]
    });
    
    console.log(`✅ Encontrados ${result.count} productos en categoría ${categoryId}`);
    return result;
    
  } catch (error) {
    console.error('❌ Error en getProductsByCategory:', error.message);
    return { rows: [], count: 0 };
  }
};

// ✅ CORREGIDO: Búsqueda de productos simplificada
StoreProduct.searchProducts = async function(query, filters = {}) {
  try {
    console.log(`🔍 Buscando productos con query: "${query}"...`);
    
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

    const products = await this.findAll({
      where,
      order: [['rating', 'DESC'], ['name', 'ASC']]
    });
    
    console.log(`✅ Búsqueda completada: ${products.length} productos encontrados`);
    return products;
    
  } catch (error) {
    console.error('❌ Error en searchProducts:', error.message);
    return [];
  }
};

// ✅ NUEVO: Método para obtener producto por ID con verificación de asociaciones
StoreProduct.getProductWithDetails = async function(productId) {
  try {
    console.log(`🔍 Buscando producto ${productId} con detalles...`);
    
    // ✅ Primero obtener el producto básico
    const product = await this.findByPk(productId);
    
    if (!product) {
      console.log('❌ Producto no encontrado');
      return null;
    }
    
    // ✅ Intentar cargar relaciones si están disponibles
    const db = require('./index');
    
    // Cargar categoría si existe
    if (db.StoreCategory && product.categoryId) {
      try {
        const category = await db.StoreCategory.findByPk(product.categoryId);
        product.dataValues.category = category;
      } catch (error) {
        console.warn('⚠️ No se pudo cargar categoría:', error.message);
      }
    }
    
    // Cargar marca si existe
    if (db.StoreBrand && product.brandId) {
      try {
        const brand = await db.StoreBrand.findByPk(product.brandId);
        product.dataValues.brand = brand;
      } catch (error) {
        console.warn('⚠️ No se pudo cargar marca:', error.message);
      }
    }
    
    // Cargar imágenes si existe
    if (db.StoreProductImage) {
      try {
        const images = await db.StoreProductImage.findAll({
          where: { productId: product.id },
          order: [['displayOrder', 'ASC']]
        });
        product.dataValues.images = images;
      } catch (error) {
        console.warn('⚠️ No se pudieron cargar imágenes:', error.message);
      }
    }
    
    console.log('✅ Producto cargado con detalles');
    return product;
    
  } catch (error) {
    console.error('❌ Error en getProductWithDetails:', error.message);
    return null;
  }
};

// ✅ Crear productos de ejemplo - SIN dependencias problemáticas
StoreProduct.seedSampleProducts = async function() {
  try {
    console.log('🌱 Iniciando seed de productos de ejemplo...');
    
    // ✅ Buscar modelos relacionados con verificación
    const db = require('./index');
    
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

    for (const productData of sampleProducts) {
      // ✅ Buscar categoría y marca de forma segura
      let categoryId = 1; // Fallback
      let brandId = null;
      
      if (db.StoreCategory) {
        try {
          const category = await db.StoreCategory.findOne({ 
            where: { name: productData.categoryName } 
          });
          if (category) categoryId = category.id;
        } catch (error) {
          console.warn('⚠️ No se pudo buscar categoría:', error.message);
        }
      }
      
      if (db.StoreBrand) {
        try {
          const brand = await db.StoreBrand.findOne({ 
            where: { name: productData.brandName } 
          });
          if (brand) brandId = brand.id;
        } catch (error) {
          console.warn('⚠️ No se pudo buscar marca:', error.message);
        }
      }
      
      // ✅ Crear producto con datos seguros
      await this.findOrCreate({
        where: { sku: productData.sku },
        defaults: {
          ...productData,
          categoryId,
          brandId
        }
      });
      
      console.log(`✅ Producto ${productData.sku} procesado`);
    }
    
    console.log('🌱 Seed de productos completado');
    
  } catch (error) {
    console.error('❌ Error en seedSampleProducts:', error.message);
  }
};

module.exports = StoreProduct;