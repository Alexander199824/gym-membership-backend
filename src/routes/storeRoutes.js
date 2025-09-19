// src/routes/storeRoutes.js - ACTUALIZADO CON FUNCIONALIDAD COMPLETA
const express = require('express');
const storeController = require('../controllers/storeController');
const { authenticateToken, requireStaff } = require('../middleware/auth');
const { optionalAuthenticateToken } = require('../middleware/optionalAuth');

// ✅ IMPORTAR NUEVAS RUTAS DE ADMINISTRACIÓN
const adminRoutes = require('./admin');

const router = express.Router();

// ✅ MIDDLEWARE DE LOGGING GENERAL
router.use((req, res, next) => {
  console.log(`🛒 Store Route: ${req.method} ${req.originalUrl} - User: ${req.user?.email || 'Guest'} - IP: ${req.ip}`);
  next();
});

// ✅ === RUTAS PÚBLICAS EXISTENTES (SIN CAMBIOS) ===

// Productos públicos
router.get('/products', storeController.getProducts);
router.get('/products/featured', storeController.getFeaturedProducts);
router.get('/products/:id', storeController.getProductById);

// ✅ NUEVO: Endpoint específico adicional para productos destacados
router.get('/featured-products', storeController.getFeaturedProducts);

// Categorías y marcas públicas
router.get('/categories', storeController.getCategories);
router.get('/brands', storeController.getBrands);

// ✅ === CARRITO (Usuarios logueados y invitados) ===

router.get('/cart', optionalAuthenticateToken, storeController.getCart);
router.post('/cart', optionalAuthenticateToken, storeController.addToCart);
router.put('/cart/:id', optionalAuthenticateToken, storeController.updateCartItem);
router.delete('/cart/:id', optionalAuthenticateToken, storeController.removeFromCart);

// ✅ === ÓRDENES ===

// Crear orden (checkout) - Con autenticación opcional
router.post('/orders', optionalAuthenticateToken, storeController.createOrder);

// Órdenes del usuario (requiere login obligatorio)
router.get('/my-orders', authenticateToken, storeController.getMyOrders);
router.get('/orders/:id', optionalAuthenticateToken, storeController.getOrderById);

// ✅ === NUEVAS RUTAS DE ADMINISTRACIÓN COMPLETAS ===
router.use('/admin', adminRoutes);

// ✅ === RUTAS DE ADMINISTRACIÓN EXISTENTES (MANTENIDAS PARA COMPATIBILIDAD) ===
// Estas rutas se mantienen para no romper funcionalidad existente
// pero ahora están duplicadas también en /admin/

// Gestión de órdenes (existente)
router.get('/admin/orders', authenticateToken, requireStaff, storeController.getAllOrders);
router.put('/admin/orders/:id', authenticateToken, requireStaff, storeController.updateOrderStatus);

// Dashboard y reportes (existente)
router.get('/admin/dashboard', authenticateToken, requireStaff, storeController.getStoreDashboard);
router.get('/admin/sales-report', authenticateToken, requireStaff, storeController.getSalesReport);

// ✅ === RUTAS PÚBLICAS ADICIONALES MEJORADAS ===

// Búsqueda avanzada pública
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

    const { 
      StoreProduct, 
      StoreCategory, 
      StoreBrand, 
      StoreProductImage 
    } = require('../models');
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
      discountPercentage: product.getDiscountPercentage(),
      inStock: product.isInStock()
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
    console.error('Error en búsqueda pública:', error);
    res.status(500).json({
      success: false,
      message: 'Error en búsqueda',
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
      discountPercentage: product.getDiscountPercentage(),
      inStock: product.isInStock()
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
      discountPercentage: product.getDiscountPercentage(),
      inStock: product.isInStock()
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

// ✅ === RUTAS DE UTILIDAD ===

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

// ✅ === MIDDLEWARE DE MANEJO DE ERRORES GLOBAL ===
router.use((error, req, res, next) => {
  console.error('Error en rutas de tienda:', error);
  
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

// ✅ === MIDDLEWARE PARA RUTAS NO ENCONTRADAS ===
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
      'GET /admin/* (requiere autenticación)'
    ],
    requestedRoute: req.originalUrl
  });
});

module.exports = router;

// ===================================================================
// 📋 RESUMEN DE FUNCIONALIDADES DISPONIBLES:
// ===================================================================
//
// ✅ RUTAS PÚBLICAS:
// - GET /products (con filtros avanzados)
// - GET /products/featured 
// - GET /products/:id
// - GET /categories
// - GET /brands
// - GET /search (búsqueda avanzada)
// - GET /category/:slug/products
// - GET /products/:id/related
// - GET /stats
// - POST /check-stock
//
// ✅ CARRITO Y ÓRDENES:
// - GET /cart (usuarios y invitados)
// - POST /cart (agregar al carrito)
// - PUT /cart/:id (actualizar cantidad)
// - DELETE /cart/:id (eliminar item)
// - POST /orders (crear orden/checkout)
// - GET /my-orders (órdenes del usuario)
// - GET /orders/:id (ver orden específica)
//
// ✅ ADMINISTRACIÓN COMPLETA:
// - /admin/brands/* (CRUD completo de marcas)
// - /admin/categories/* (CRUD completo de categorías)
// - /admin/products/* (CRUD completo de productos)
// - /admin/images/* (gestión completa de imágenes)
// - /admin/dashboard (dashboard unificado)
// - /admin/health (verificación del sistema)
// - /admin/config (configuración)
//
// ✅ COMPATIBILIDAD:
// - Todas las rutas existentes siguen funcionando
// - Nuevas funcionalidades sin romper nada existente
// - Autenticación opcional para invitados
// - Sistema de permisos robusto
// ===================================================================

// Este archivo define todas las rutas de la tienda online. La mejora principal que hice fue
// agregar el middleware optionalAuthenticateToken a las rutas del carrito y órdenes, lo que
// permite que funcionen tanto para usuarios registrados como para invitados. Esto es crucial
// para un e-commerce moderno donde los usuarios deben poder comprar sin registrarse.