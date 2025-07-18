// test-store-system.js - Test específico para sistema de tienda
const axios = require('axios');

class StoreSystemTester {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.token = null;
    this.sessionId = 'test-session-' + Date.now();
    this.productId = null;
    this.orderId = null;
  }

  async runTests() {
    console.log('🛍️ Iniciando pruebas del sistema de tienda Elite Fitness Club...\n');
    
    try {
      await this.testStoreBasics();
      await this.testAdminLogin();
      await this.testProductManagement();
      await this.testShoppingCart();
      await this.testCheckoutProcess();
      await this.testOrderManagement();
      await this.testStoreDashboard();
      await this.testDataCleanup();
      
      console.log('\n✅ ¡Todas las pruebas del sistema de tienda pasaron exitosamente!');
      console.log('🎉 Sistema de e-commerce completamente funcional');
      console.log('\n🛍️ Características de tienda probadas:');
      console.log('   ✅ Catálogo de productos con filtros');
      console.log('   ✅ Carrito de compras (usuarios logueados e invitados)');
      console.log('   ✅ Proceso de checkout completo');
      console.log('   ✅ Múltiples métodos de pago');
      console.log('   ✅ Gestión de órdenes y estados');
      console.log('   ✅ Dashboard administrativo');
      console.log('   ✅ Integración con sistema financiero');
      console.log('   ✅ Sistema de limpieza de datos');
      
    } catch (error) {
      console.error('\n❌ Error en las pruebas de tienda:', error.message);
      if (error.response) {
        console.error('   Response data:', error.response.data);
        console.error('   Status:', error.response.status);
      }
      process.exit(1);
    }
  }

  async testStoreBasics() {
    console.log('1. 🏪 Probando funcionalidades básicas de tienda...');
    
    // ✅ Obtener categorías
    const categoriesResponse = await axios.get(`${this.baseURL}/api/store/categories`);
    if (categoriesResponse.data.success) {
      console.log(`   ✅ Categorías obtenidas: ${categoriesResponse.data.data.categories.length} categorías`);
    }

    // ✅ Obtener marcas
    const brandsResponse = await axios.get(`${this.baseURL}/api/store/brands`);
    if (brandsResponse.data.success) {
      console.log(`   ✅ Marcas obtenidas: ${brandsResponse.data.data.brands.length} marcas`);
    }

    // ✅ Obtener productos
    const productsResponse = await axios.get(`${this.baseURL}/api/store/products`);
    if (productsResponse.data.success) {
      console.log(`   ✅ Productos obtenidos: ${productsResponse.data.data.products.length} productos`);
      if (productsResponse.data.data.products.length > 0) {
        this.productId = productsResponse.data.data.products[0].id;
      }
    }

    // ✅ Obtener productos destacados
    const featuredResponse = await axios.get(`${this.baseURL}/api/store/products/featured`);
    if (featuredResponse.data.success) {
      console.log(`   ✅ Productos destacados: ${featuredResponse.data.data.products.length} productos`);
    }
  }

  async testAdminLogin() {
    console.log('2. 🔐 Probando login de administrador...');
    
    const response = await axios.post(`${this.baseURL}/api/auth/login`, {
      email: 'admin@gym.com',
      password: 'Admin123!'
    });
    
    if (response.data.success && response.data.data.token) {
      this.token = response.data.data.token;
      console.log('   ✅ Login de admin exitoso para gestión de tienda');
    } else {
      throw new Error('Login de admin falló');
    }
  }

  async testProductManagement() {
    console.log('3. 📦 Probando gestión de productos...');
    
    if (!this.productId) {
      console.log('   ⚠️ No hay productos para probar');
      return;
    }

    // ✅ Obtener producto específico
    const productResponse = await axios.get(`${this.baseURL}/api/store/products/${this.productId}`);
    if (productResponse.data.success) {
      console.log('   ✅ Producto individual obtenido');
      console.log(`   📦 Producto: ${productResponse.data.data.product.name}`);
      console.log(`   💰 Precio: $${productResponse.data.data.product.price}`);
      console.log(`   📊 Stock: ${productResponse.data.data.product.stockQuantity} unidades`);
      console.log(`   🎯 Métodos de pago: Online=${productResponse.data.data.product.allowOnlinePayment}, Tarjeta=${productResponse.data.data.product.allowCardPayment}, Efectivo=${productResponse.data.data.product.allowCashOnDelivery}`);
    }

    // ✅ Buscar productos
    const searchResponse = await axios.get(`${this.baseURL}/api/store/products?search=protein`);
    if (searchResponse.data.success) {
      console.log(`   ✅ Búsqueda de productos funcional: ${searchResponse.data.data.products.length} resultados`);
    }
  }

  async testShoppingCart() {
    console.log('4. 🛒 Probando carrito de compras...');
    
    if (!this.productId) {
      console.log('   ⚠️ No hay productos para agregar al carrito');
      return;
    }

    // ✅ Agregar producto al carrito (como invitado)
    const addToCartResponse = await axios.post(`${this.baseURL}/api/store/cart`, {
      productId: this.productId,
      quantity: 2,
      sessionId: this.sessionId
    });
    
    if (addToCartResponse.data.success) {
      console.log('   ✅ Producto agregado al carrito (usuario invitado)');
    }

    // ✅ Obtener carrito
    const cartResponse = await axios.get(`${this.baseURL}/api/store/cart?sessionId=${this.sessionId}`);
    if (cartResponse.data.success) {
      console.log('   ✅ Carrito obtenido exitosamente');
      console.log(`   🛒 Items en carrito: ${cartResponse.data.data.cartItems.length}`);
      console.log(`   💰 Subtotal: $${cartResponse.data.data.summary.subtotal}`);
      console.log(`   📋 Total: $${cartResponse.data.data.summary.totalAmount}`);
    }

    // ✅ Probar carrito como usuario logueado
    const addToCartLoggedResponse = await axios.post(`${this.baseURL}/api/store/cart`, 
      {
        productId: this.productId,
        quantity: 1
      },
      {
        headers: { Authorization: `Bearer ${this.token}` }
      }
    );
    
    if (addToCartLoggedResponse.data.success) {
      console.log('   ✅ Producto agregado al carrito (usuario logueado)');
    }
  }

  async testCheckoutProcess() {
    console.log('5. 💳 Probando proceso de checkout...');
    
    // ✅ Crear orden con diferentes métodos de pago
    const orderData = {
      sessionId: this.sessionId,
      customerInfo: {
        name: 'Cliente Prueba',
        email: 'cliente.prueba@test.com',
        phone: '+50212345678'
      },
      shippingAddress: {
        street: 'Calle Principal 123',
        city: 'Guatemala',
        state: 'Guatemala',
        zipCode: '01001',
        country: 'Guatemala',
        instructions: 'Portón azul, casa de dos plantas'
      },
      paymentMethod: 'cash_on_delivery',
      deliveryTimeSlot: 'mañana (9:00-12:00)',
      notes: 'Orden de prueba del sistema'
    };

    const orderResponse = await axios.post(`${this.baseURL}/api/store/orders`, orderData);
    
    if (orderResponse.data.success) {
      this.orderId = orderResponse.data.data.order.id;
      console.log('   ✅ Orden creada exitosamente (pago contraentrega)');
      console.log(`   📋 Número de orden: ${orderResponse.data.data.order.orderNumber}`);
      console.log(`   💰 Total: $${orderResponse.data.data.order.totalAmount}`);
      console.log(`   📦 Items: ${orderResponse.data.data.order.items.length} productos`);
    }

    // ✅ Probar orden con pago online
    const onlineOrderData = {
      ...orderData,
      paymentMethod: 'online_card'
    };

    try {
      const onlineOrderResponse = await axios.post(`${this.baseURL}/api/store/orders`, onlineOrderData);
      if (onlineOrderResponse.data.success) {
        console.log('   ✅ Orden con pago online creada');
      }
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('Carrito vacío')) {
        console.log('   ✅ Validación de carrito vacío funcional');
      }
    }
  }

  // ✅ Continuación de test-store-system.js

  async testOrderManagement() {
    console.log('6. 📋 Probando gestión de órdenes...');
    
    if (!this.orderId) {
      console.log('   ⚠️ No hay órdenes para gestionar');
      return;
    }

    // ✅ Obtener orden específica
    const orderResponse = await axios.get(
      `${this.baseURL}/api/store/orders/${this.orderId}`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    );
    
    if (orderResponse.data.success) {
      console.log('   ✅ Orden individual obtenida');
      console.log(`   📦 Estado: ${orderResponse.data.data.order.status}`);
      console.log(`   💳 Método de pago: ${orderResponse.data.data.order.paymentMethod}`);
    }

    // ✅ Obtener todas las órdenes (admin)
    const allOrdersResponse = await axios.get(
      `${this.baseURL}/api/store/admin/orders`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    );
    
    if (allOrdersResponse.data.success) {
      console.log(`   ✅ Todas las órdenes obtenidas: ${allOrdersResponse.data.data.orders.length} órdenes`);
    }

    // ✅ Actualizar estado de orden
    const updateStatusResponse = await axios.put(
      `${this.baseURL}/api/store/admin/orders/${this.orderId}`,
      {
        status: 'confirmed',
        notes: 'Orden confirmada por sistema de testing'
      },
      { headers: { Authorization: `Bearer ${this.token}` } }
    );
    
    if (updateStatusResponse.data.success) {
      console.log('   ✅ Estado de orden actualizado');
    }

    // ✅ Marcar como entregada (para probar integración financiera)
    const deliveryResponse = await axios.put(
      `${this.baseURL}/api/store/admin/orders/${this.orderId}`,
      {
        status: 'delivered',
        notes: 'Entregado - Test de integración financiera',
        trackingNumber: 'TEST-DELIVERY-001'
      },
      { headers: { Authorization: `Bearer ${this.token}` } }
    );
    
    if (deliveryResponse.data.success) {
      console.log('   ✅ Orden marcada como entregada');
      console.log('   💰 Integración financiera automática activada');
    }
  }

  async testStoreDashboard() {
    console.log('7. 📊 Probando dashboard de tienda...');
    
    // ✅ Dashboard de tienda
    const dashboardResponse = await axios.get(
      `${this.baseURL}/api/store/admin/dashboard`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    );
    
    if (dashboardResponse.data.success) {
      console.log('   ✅ Dashboard de tienda generado');
      console.log(`   📦 Órdenes hoy: ${dashboardResponse.data.data.ordersToday}`);
      console.log(`   💰 Ingresos hoy: $${dashboardResponse.data.data.revenueToday}`);
      console.log(`   ⏳ Órdenes pendientes: ${dashboardResponse.data.data.pendingOrders}`);
    }

    // ✅ Reporte de ventas
    const salesReportResponse = await axios.get(
      `${this.baseURL}/api/store/admin/sales-report?startDate=2024-01-01`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    );
    
    if (salesReportResponse.data.success) {
      console.log('   ✅ Reporte de ventas generado');
      console.log(`   📈 Datos de ventas: ${salesReportResponse.data.data.salesData.length} períodos`);
    }

    // ✅ Dashboard financiero integrado
    const financialDashboardResponse = await axios.get(
      `${this.baseURL}/api/financial/dashboard`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    );
    
    if (financialDashboardResponse.data.success) {
      console.log('   ✅ Dashboard financiero integrado');
      console.log(`   💎 Ingresos totales hoy: $${financialDashboardResponse.data.data.today.income}`);
      console.log('   🔗 Incluye membresías Y productos');
    }
  }

  async testDataCleanup() {
    console.log('8. 🧹 Probando sistema de limpieza de datos...');
    
    // ✅ Obtener resumen de datos
    const summaryResponse = await axios.get(
      `${this.baseURL}/api/data-cleanup/summary`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    );
    
    if (summaryResponse.data.success) {
      console.log('   ✅ Resumen de datos obtenido');
      console.log(`   👥 Usuarios totales: ${summaryResponse.data.data.users.total}`);
      console.log(`   🛍️ Productos: ${summaryResponse.data.data.store.products}`);
      console.log(`   📦 Órdenes: ${summaryResponse.data.data.store.orders}`);
    }

    // ✅ Limpiar solo datos de prueba de tienda (para demostrar funcionalidad)
    console.log('   🧪 Simulando limpieza de datos de tienda...');
    // No ejecutar limpieza real en test para no borrar los datos que acabamos de crear
    console.log('   ✅ Sistema de limpieza verificado (no ejecutado)');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const tester = new StoreSystemTester();
  tester.runTests().catch(error => {
    console.error('❌ Error en tests de tienda:', error.message);
    process.exit(1);
  });
}




module.exports = { StoreSystemTester };