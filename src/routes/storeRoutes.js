// src/routes/storeRoutes.js - SOLO RUTAS PÚBLICAS DE TIENDA
const express = require('express');
const storeController = require('../controllers/storeController');
const { authenticateToken } = require('../middleware/auth');
const { optionalAuthenticateToken } = require('../middleware/optionalAuth');

// ✅ IMPORTAR RUTAS DE GESTIÓN (administración)
const storeAdminRoutes = require('./storeAdminRoutes');

const router = express.Router();

// ✅ LOGGING PARA DEBUGGING
router.use((req, res, next) => {
  console.log(`🛒 Store Public: ${req.method} ${req.originalUrl} - User: ${req.user?.email || 'Guest'} - IP: ${req.ip}`);
  next();
});

// ===================================================================
// 🌐 RUTAS PÚBLICAS (sin autenticación)
// ===================================================================

// Catálogo de productos
router.get('/products', storeController.getProducts);
router.get('/products/featured', storeController.getFeaturedProducts);
router.get('/featured-products', storeController.getFeaturedProducts); // Alias para frontend
router.get('/products/:id', storeController.getProductById);

// Categorías y marcas
router.get('/categories', storeController.getCategories);
router.get('/brands', storeController.getBrands);

// Búsqueda avanzada
router.get('/search', async (req, res) => {
  try {
    const {
      q: search,
      category,
      brand,
      minPrice,
      maxPrice,
      featured,
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'ASC'
    } = req.query;

    const { StoreProduct, StoreCategory, StoreBrand, StoreProductImage } = require('../models');
    const { Op } = require('sequelize');

    const offset = (page - 1) * limit;
    const where = { isActive: true, stockQuantity: { [Op.gt]: 0 } };

    // Aplicar filtros
    if (category) where.categoryId = category;
    if (brand) where.brandId = brand;
    if (featured === 'true') where.isFeatured = true;

    if (search && search.trim().length >= 2) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search.trim()}%` } },
        { description: { [Op.iLike]: `%${search.trim()}%` } }
      ];
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
    }

    const { count, rows } = await StoreProduct.findAndCountAll({
      where,
      include: [
        { model: StoreCategory, as: 'category', attributes: ['id', 'name', 'slug'] },
        { model: StoreBrand, as: 'brand', attributes: ['id', 'name'] },
        { 
          model: StoreProductImage,
          as: 'images',
          where: { isPrimary: true },
          required: false,
          limit: 1
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset,
      distinct: true
    });

    const productsWithInfo = rows.map(product => ({
      ...product.toJSON(),
      discountPercentage: product.getDiscountPercentage ? product.getDiscountPercentage() : 0,
      inStock: product.isInStock ? product.isInStock() : product.stockQuantity > 0
    }));

    res.json({
      success: true,
      data: {
        products: productsWithInfo,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        },
        appliedFilters: {
          search: search || null,
          category: category || null,
          brand: brand || null,
          minPrice: minPrice || null,
          maxPrice: maxPrice || null,
          featured: featured || null
        }
      }
    });
  } catch (error) {
    console.error('Error en búsqueda:', error);
    res.status(500).json({
      success: false,
      message: 'Error en búsqueda de productos',
      error: error.message
    });
  }
});

// Productos por categoría (slug)
router.get('/category/:slug/products', async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 20, sortBy = 'name', sortOrder = 'ASC' } = req.query;

    const { StoreCategory, StoreProduct, StoreBrand, StoreProductImage } = require('../models');
    const { Op } = require('sequelize');

    // Buscar categoría por slug
    const category = await StoreCategory.findOne({
      where: { slug, isActive: true }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await StoreProduct.findAndCountAll({
      where: {
        categoryId: category.id,
        isActive: true,
        stockQuantity: { [Op.gt]: 0 }
      },
      include: [
        { model: StoreCategory, as: 'category', attributes: ['id', 'name', 'slug'] },
        { model: StoreBrand, as: 'brand', attributes: ['id', 'name'] },
        { 
          model: StoreProductImage,
          as: 'images',
          where: { isPrimary: true },
          required: false,
          limit: 1
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset,
      distinct: true
    });

    const productsWithInfo = rows.map(product => ({
      ...product.toJSON(),
      discountPercentage: product.getDiscountPercentage ? product.getDiscountPercentage() : 0,
      inStock: product.isInStock ? product.isInStock() : product.stockQuantity > 0
    }));

    res.json({
      success: true,
      data: {
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description
        },
        products: productsWithInfo,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error obteniendo productos por categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos de la categoría',
      error: error.message
    });
  }
});

// Productos relacionados
router.get('/products/:id/related', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 4 } = req.query;

    const { StoreProduct, StoreCategory, StoreBrand, StoreProductImage } = require('../models');
    const { Op } = require('sequelize');

    // Obtener producto principal
    const mainProduct = await StoreProduct.findByPk(id);
    if (!mainProduct || !mainProduct.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Buscar productos relacionados
    const relatedProducts = await StoreProduct.findAll({
      where: {
        categoryId: mainProduct.categoryId,
        id: { [Op.ne]: id },
        isActive: true,
        stockQuantity: { [Op.gt]: 0 }
      },
      include: [
        { model: StoreCategory, as: 'category', attributes: ['id', 'name', 'slug'] },
        { model: StoreBrand, as: 'brand', attributes: ['id', 'name'] },
        { 
          model: StoreProductImage,
          as: 'images',
          where: { isPrimary: true },
          required: false,
          limit: 1
        }
      ],
      order: [['rating', 'DESC'], ['reviewsCount', 'DESC']],
      limit: parseInt(limit)
    });

    const productsWithInfo = relatedProducts.map(product => ({
      ...product.toJSON(),
      discountPercentage: product.getDiscountPercentage ? product.getDiscountPercentage() : 0,
      inStock: product.isInStock ? product.isInStock() : product.stockQuantity > 0
    }));

    res.json({
      success: true,
      data: { products: productsWithInfo }
    });
  } catch (error) {
    console.error('Error obteniendo productos relacionados:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos relacionados',
      error: error.message
    });
  }
});

// Estadísticas públicas básicas
router.get('/stats', async (req, res) => {
  try {
    const { StoreProduct, StoreCategory, StoreBrand } = require('../models');

    const [
      totalProducts,
      totalCategories,
      totalBrands,
      featuredProducts
    ] = await Promise.all([
      StoreProduct.count({ where: { isActive: true } }),
      StoreCategory.count({ where: { isActive: true } }),
      StoreBrand.count({ where: { isActive: true } }),
      StoreProduct.count({ where: { isActive: true, isFeatured: true } })
    ]);

    res.json({
      success: true,
      data: {
        totalProducts,
        totalCategories,
        totalBrands,
        featuredProducts
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas públicas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
});

// ===================================================================
// 🛒 CARRITO Y CHECKOUT (autenticación opcional)
// ===================================================================

router.get('/cart', optionalAuthenticateToken, storeController.getCart);
router.post('/cart', optionalAuthenticateToken, storeController.addToCart);
router.put('/cart/:id', optionalAuthenticateToken, storeController.updateCartItem);
router.delete('/cart/:id', optionalAuthenticateToken, storeController.removeFromCart);

// ===================================================================
// 📦 ÓRDENES (autenticación opcional para crear, requerida para ver)
// ===================================================================

router.post('/orders', optionalAuthenticateToken, storeController.createOrder);
router.get('/my-orders', authenticateToken, storeController.getMyOrders);
router.get('/orders/:id', optionalAuthenticateToken, storeController.getOrderById);

// ===================================================================
// 🔧 UTILIDADES PÚBLICAS
// ===================================================================

// Verificar disponibilidad de stock
router.post('/check-stock', async (req, res) => {
  try {
    const { items } = req.body; // [{ productId, quantity }]

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de items'
      });
    }

    const { StoreProduct } = require('../models');
    const stockResults = [];

    for (const item of items) {
      const product = await StoreProduct.findByPk(item.productId);
      
      if (!product) {
        stockResults.push({
          productId: item.productId,
          available: false,
          reason: 'Producto no encontrado'
        });
        continue;
      }

      if (!product.isActive) {
        stockResults.push({
          productId: item.productId,
          available: false,
          reason: 'Producto no disponible'
        });
        continue;
      }

      stockResults.push({
        productId: item.productId,
        available: product.stockQuantity >= item.quantity,
        currentStock: product.stockQuantity,
        requestedQuantity: item.quantity,
        reason: product.stockQuantity >= item.quantity ? null : 'Stock insuficiente'
      });
    }

    res.json({
      success: true,
      data: { stockResults }
    });
  } catch (error) {
    console.error('Error verificando stock:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar stock',
      error: error.message
    });
  }
});

// ===================================================================
// 🔐 RUTAS DE GESTIÓN (requieren autenticación de staff)
// ===================================================================

router.use('/management', storeAdminRoutes);

// ===================================================================
// 🚨 MANEJO DE ERRORES
// ===================================================================

router.use((error, req, res, next) => {
  console.error('Error en tienda pública:', error);
  
  // Error de validación
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: error.details || error.message
    });
  }
  
  // Error de base de datos
  if (error.name === 'SequelizeError') {
    return res.status(500).json({
      success: false,
      message: 'Error de base de datos',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
  
  // Error general
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor',
    timestamp: new Date().toISOString()
  });
});

// ===================================================================
// 🚫 MIDDLEWARE PARA RUTAS NO ENCONTRADAS
// ===================================================================

router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada en la tienda',
    availableRoutes: [
      'GET /products',
      'GET /products/featured', 
      'GET /products/:id',
      'GET /categories',
      'GET /brands',
      'GET /cart',
      'POST /cart',
      'POST /orders',
      'GET /search',
      'GET /management/* (requiere autenticación)'
    ],
    requestedRoute: req.originalUrl
  });
});

module.exports = router;

// Este archivo define todas las rutas de la tienda online. La mejora principal que hice fue
// agregar el middleware optionalAuthenticateToken a las rutas del carrito y órdenes, lo que
// permite que funcionen tanto para usuarios registrados como para invitados. Esto es crucial
// para un e-commerce moderno donde los usuarios deben poder comprar sin registrarse.