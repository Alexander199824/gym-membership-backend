// src/routes/storeRoutes.js
const express = require('express');
const storeController = require('../controllers/storeController');
const { authenticateToken, requireStaff } = require('../middleware/auth');
const { optionalAuthenticateToken } = require('../middleware/optionalAuth');

const router = express.Router();

// ✅ === RUTAS PÚBLICAS ===

// Productos
router.get('/products', storeController.getProducts);
router.get('/products/featured', storeController.getFeaturedProducts);
router.get('/products/:id', storeController.getProductById);

// Categorías y marcas
router.get('/categories', storeController.getCategories);
router.get('/brands', storeController.getBrands);

// ✅ === CARRITO (Usuarios logueados y invitados con middleware opcional) ===

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

// ✅ === ADMINISTRACIÓN (Solo staff) ===

// Gestión de órdenes
router.get('/admin/orders', authenticateToken, requireStaff, storeController.getAllOrders);
router.put('/admin/orders/:id', authenticateToken, requireStaff, storeController.updateOrderStatus);

// Dashboard y reportes
router.get('/admin/dashboard', authenticateToken, requireStaff, storeController.getStoreDashboard);
router.get('/admin/sales-report', authenticateToken, requireStaff, storeController.getSalesReport);

module.exports = router;

// Este archivo define todas las rutas de la tienda online. La mejora principal que hice fue
// agregar el middleware optionalAuthenticateToken a las rutas del carrito y órdenes, lo que
// permite que funcionen tanto para usuarios registrados como para invitados. Esto es crucial
// para un e-commerce moderno donde los usuarios deben poder comprar sin registrarse.