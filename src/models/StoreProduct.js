// src/models/StoreProduct.js - CORREGIDO sin dependencias circulares
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

// ✅ CORREGIDO: Método sin dependencias circulares
StoreProduct.seedSampleProducts = async function(StoreCategory, StoreBrand) {
  try {
    console.log('🌱 Iniciando seed de productos de ejemplo...');
    
    // ✅ PRODUCTOS CON DATOS CORREGIDOS
    const sampleProducts = [
      {
        name: 'Whey Protein Gold Standard',
        description: 'Proteína de suero de alta calidad con aminoácidos esenciales para el crecimiento muscular',
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
        description: 'Playera transpirable para entrenamientos intensos, tecnología Dri-FIT',
        price: 89.99,
        originalPrice: 120.00,
        sku: 'PDM-002',
        stockQuantity: 30,
        categoryName: 'Ropa Deportiva',
        brandName: 'Nike',
        isFeatured: true,
        rating: 4.5,
        reviewsCount: 89,
        weight: 200
      },
      {
        name: 'Guantes de Entrenamiento',
        description: 'Guantes acolchados para levantamiento de pesas con agarre antideslizante',
        price: 45.00,
        sku: 'GLE-003',
        stockQuantity: 25,
        categoryName: 'Accesorios',
        brandName: 'Under Armour',
        rating: 4.3,
        reviewsCount: 67,
        weight: 150
      },
      {
        name: 'Creatina Monohidrato',
        description: 'Creatina pura para aumento de fuerza y resistencia muscular',
        price: 149.99,
        originalPrice: 179.99,
        sku: 'CRM-004',
        stockQuantity: 40,
        categoryName: 'Suplementos',
        brandName: 'MuscleTech',
        isFeatured: true,
        rating: 4.7,
        reviewsCount: 200,
        weight: 500
      },
      {
        name: 'Shaker Elite Fitness',
        description: 'Shaker con mezclador de acero inoxidable, capacidad 600ml',
        price: 35.00,
        sku: 'SEF-005',
        stockQuantity: 60,
        categoryName: 'Accesorios',
        brandName: 'Elite Fitness',
        rating: 4.2,
        reviewsCount: 45,
        weight: 120
      },
      {
        name: 'Short Deportivo HeatGear',
        description: 'Short ligero y transpirable para entrenamientos de alta intensidad',
        price: 65.00,
        originalPrice: 85.00,
        sku: 'SDH-006',
        stockQuantity: 35,
        categoryName: 'Ropa Deportiva',
        brandName: 'Under Armour',
        rating: 4.4,
        reviewsCount: 78,
        weight: 180
      }
    ];

    console.log(`📦 Procesando ${sampleProducts.length} productos de ejemplo...`);

    for (const productData of sampleProducts) {
      try {
        // ✅ Buscar categoría de forma segura
        let categoryId = null;
        if (StoreCategory) {
          const category = await StoreCategory.findOne({ 
            where: { name: productData.categoryName } 
          });
          if (category) {
            categoryId = category.id;
            console.log(`   🗂️ Categoría encontrada: ${productData.categoryName} (ID: ${categoryId})`);
          } else {
            console.warn(`   ⚠️ Categoría no encontrada: ${productData.categoryName}`);
            continue; // Skip this product if category not found
          }
        } else {
          console.warn('   ⚠️ Modelo StoreCategory no disponible');
          continue;
        }
        
        // ✅ Buscar marca de forma segura
        let brandId = null;
        if (StoreBrand && productData.brandName) {
          const brand = await StoreBrand.findOne({ 
            where: { name: productData.brandName } 
          });
          if (brand) {
            brandId = brand.id;
            console.log(`   🏷️ Marca encontrada: ${productData.brandName} (ID: ${brandId})`);
          } else {
            console.warn(`   ⚠️ Marca no encontrada: ${productData.brandName}`);
          }
        }
        
        if (!categoryId) {
          console.warn(`   ❌ Saltando producto ${productData.sku} - sin categoría válida`);
          continue;
        }
        
        // ✅ Preparar datos del producto
        const productDefaults = {
          name: productData.name,
          description: productData.description,
          price: productData.price,
          originalPrice: productData.originalPrice || null,
          categoryId: categoryId,
          brandId: brandId,
          stockQuantity: productData.stockQuantity || 0,
          minStock: 5,
          isFeatured: productData.isFeatured || false,
          isActive: true,
          rating: productData.rating || 0,
          reviewsCount: productData.reviewsCount || 0,
          weight: productData.weight || null,
          allowOnlinePayment: productData.allowOnlinePayment !== false,
          allowCardPayment: productData.allowCardPayment !== false,
          allowCashOnDelivery: productData.allowCashOnDelivery !== false,
          deliveryTime: productData.deliveryTime || '1-2 días hábiles'
        };
        
        // ✅ Crear producto
        const [product, wasCreated] = await this.findOrCreate({
          where: { sku: productData.sku },
          defaults: productDefaults
        });
        
        if (wasCreated) {
          console.log(`   ✅ Producto creado: ${productData.name} (${productData.sku})`);
        } else {
          console.log(`   ℹ️ Producto ya existe: ${productData.name} (${productData.sku})`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error procesando producto ${productData.sku}:`, error.message);
      }
    }
    
    console.log('🌱 Seed de productos completado exitosamente');
    
    // ✅ Mostrar estadísticas finales
    const totalProducts = await this.count();
    const featuredProducts = await this.count({ where: { isFeatured: true } });
    
    console.log(`📊 Estadísticas de productos:`);
    console.log(`   📦 Total de productos: ${totalProducts}`);
    console.log(`   ⭐ Productos destacados: ${featuredProducts}`);
    
  } catch (error) {
    console.error('❌ Error en seedSampleProducts:', error.message);
    throw error; // Re-throw para que el seed falle si hay error crítico
  }
};

// ✅ Otros métodos existentes (sin cambios)
StoreProduct.getFeaturedProducts = async function(limit = 8) {
  try {
    console.log('🔍 Buscando productos destacados...');
    
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
    return [];
  }
};

StoreProduct.getProductsByCategory = async function(categoryId, limit = 20, offset = 0) {
  try {
    const result = await this.findAndCountAll({
      where: { 
        categoryId, 
        isActive: true 
      },
      limit,
      offset,
      order: [['name', 'ASC']]
    });
    
    return result;
  } catch (error) {
    console.error('❌ Error en getProductsByCategory:', error.message);
    return { rows: [], count: 0 };
  }
};

module.exports = StoreProduct;