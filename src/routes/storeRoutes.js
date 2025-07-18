// src/routes/storeRoutes.js
const express = require('express');
const storeController = require('../controllers/storeController');
const { authenticateToken, requireStaff } = require('../middleware/auth');

const router = express.Router();

// ✅ === RUTAS PÚBLICAS ===

// Productos
router.get('/products', storeController.getProducts);
router.get('/products/featured', storeController.getFeaturedProducts);
router.get('/products/:id', storeController.getProductById);

// Categorías y marcas
router.get('/categories', storeController.getCategories);
router.get('/brands', storeController.getBrands);

// ✅ === CARRITO (Usuarios logueados y invitados) ===

router.get('/cart', storeController.getCart);
router.post('/cart', storeController.addToCart);
router.put('/cart/:id', storeController.updateCartItem);
router.delete('/cart/:id', storeController.removeFromCart);

// ✅ === ÓRDENES ===

// Crear orden (checkout)
router.post('/orders', storeController.createOrder);

// Órdenes del usuario (requiere login)
router.get('/my-orders', authenticateToken, storeController.getMyOrders);
router.get('/orders/:id', authenticateToken, storeController.getOrderById);

// ✅ === ADMINISTRACIÓN (Solo staff) ===

// Gestión de órdenes
router.get('/admin/orders', authenticateToken, requireStaff, storeController.getAllOrders);
router.put('/admin/orders/:id', authenticateToken, requireStaff, storeController.updateOrderStatus);

// Dashboard y reportes
router.get('/admin/dashboard', authenticateToken, requireStaff, storeController.getStoreDashboard);
router.get('/admin/sales-report', authenticateToken, requireStaff, storeController.getSalesReport);

module.exports = router;