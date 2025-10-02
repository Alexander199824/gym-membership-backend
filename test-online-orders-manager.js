// test-online-orders-manager.js - GESTOR COMPLETO DE PEDIDOS ONLINE
const axios = require('axios');
const readline = require('readline');
require('dotenv').config();

class OnlineOrdersManager {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.adminToken = null;
    
    // Datos cargados
    this.pendingOrders = [];
    this.pickupOrders = [];
    this.deliveryOrders = [];
    this.expressOrders = [];
    this.allOrders = [];
    this.products = [];
    this.dashboard = null;
    
    // Configurar readline
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.log('🛒 Elite Fitness - GESTOR COMPLETO DE PEDIDOS ONLINE');
    console.log('='.repeat(80));
    console.log('📦 FUNCIONES: Confirmar, actualizar estados, modificar datos, gestión completa');
    console.log('🔧 CARACTERÍSTICAS: Control total del flujo de pedidos online\n');
    
    try {
      await this.loginAdmin();
      await this.loadAllData();
      await this.showMainMenu();
      
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      if (error.response) {
        console.error('📋 Detalles:', error.response.data);
      }
    } finally {
      this.rl.close();
    }
  }

  // ============================================================================
  // AUTENTICACIÓN Y CARGA DE DATOS
  // ============================================================================

  async loginAdmin() {
    console.log('1. 🔐 Autenticando como administrador...');
    
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'admin@gym.com',
        password: 'Admin123!'
      });

      if (response.data.success && response.data.data.token) {
        this.adminToken = response.data.data.token;
        console.log('   ✅ Autenticación exitosa');
        console.log(`   👤 Usuario: ${response.data.data.user.firstName} ${response.data.data.user.lastName}`);
      }
    } catch (error) {
      throw new Error(`Autenticación falló: ${error.message}`);
    }
  }

  async loadAllData() {
    console.log('\n2. 📊 Cargando datos de pedidos online...');
    
    try {
      await Promise.all([
        this.loadDashboard(),
        this.loadAllOrders(),
        this.loadPendingOrders(),
        this.loadPickupOrders(),
        this.loadDeliveryOrders(),
        this.loadProducts()
      ]);
      
      console.log(`   ✅ Datos cargados:`);
      console.log(`      📦 Total órdenes: ${this.allOrders.length}`);
      console.log(`      ⏳ Pendientes confirmación: ${this.pendingOrders.length}`);
      console.log(`      🏪 Para recogida: ${this.pickupOrders.length}`);
      console.log(`      🚚 Para entrega: ${this.deliveryOrders.length}`);
      console.log(`      📦 Productos: ${this.products.length}`);
      
    } catch (error) {
      console.log(`   ❌ Error cargando datos: ${error.message}`);
    }
  }

  async loadDashboard() {
    try {
      const response = await axios.get(`${this.baseURL}/api/order-management/dashboard`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });
      
      if (response.data.success) {
        this.dashboard = response.data.data;
      }
    } catch (error) {
      console.warn('⚠️ No se pudo cargar dashboard');
    }
  }

  async loadAllOrders() {
    try {
      const response = await axios.get(`${this.baseURL}/api/store/management/orders`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { limit: 100 }
      });
      
      if (response.data.success && response.data.data?.orders) {
        this.allOrders = response.data.data.orders;
      }
    } catch (error) {
      console.warn('⚠️ No se pudieron cargar todas las órdenes');
    }
  }

  async loadPendingOrders() {
    try {
      const response = await axios.get(`${this.baseURL}/api/store/management/orders`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { status: 'pending', limit: 50 }
      });
      
      if (response.data.success && response.data.data?.orders) {
        this.pendingOrders = response.data.data.orders;
      }
    } catch (error) {
      this.pendingOrders = [];
    }
  }

  async loadPickupOrders() {
    try {
      const response = await axios.get(`${this.baseURL}/api/order-management/orders/delivery-type`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { deliveryType: 'pickup', limit: 50 }
      });
      
      if (response.data.success && response.data.data?.orders) {
        this.pickupOrders = response.data.data.orders;
      }
    } catch (error) {
      this.pickupOrders = [];
    }
  }

  async loadDeliveryOrders() {
    try {
      const response = await axios.get(`${this.baseURL}/api/order-management/orders/delivery-type`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { deliveryType: 'delivery', limit: 50 }
      });
      
      if (response.data.success && response.data.data?.orders) {
        this.deliveryOrders = response.data.data.orders;
      }
    } catch (error) {
      this.deliveryOrders = [];
    }
  }

  async loadProducts() {
    try {
      const response = await axios.get(`${this.baseURL}/api/store/management/products`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { limit: 100 }
      });
      
      if (response.data.success && response.data.data?.products) {
        this.products = response.data.data.products;
      }
    } catch (error) {
      this.products = [];
    }
  }

  // ============================================================================
  // MENÚ PRINCIPAL
  // ============================================================================

  async showMainMenu() {
    console.log('\n🛒 GESTOR DE PEDIDOS ONLINE - MENÚ PRINCIPAL');
    console.log('='.repeat(80));
    
    if (this.dashboard) {
      console.log('\n📊 RESUMEN RÁPIDO:');
      console.log(`   ⏳ Pendientes confirmación: ${this.dashboard.summary?.pendingConfirmation || 0}`);
      console.log(`   🏪 Listos para recogida: ${this.dashboard.summary?.readyForPickup || 0}`);
      console.log(`   📦 Empaquetados para envío: ${this.dashboard.summary?.packedForShipping || 0}`);
      console.log(`   🏦 Transferencias pendientes: ${this.dashboard.summary?.pendingTransfers || 0}`);
      console.log(`   📉 Stock bajo: ${this.dashboard.summary?.lowStockCount || 0}`);
    }
    
    console.log('\n📋 OPCIONES:');
    console.log('1. ⏳ Ver y confirmar pedidos pendientes');
    console.log('2. 🏪 Gestionar pedidos para RECOGIDA');
    console.log('3. 🚚 Gestionar pedidos para ENTREGA');
    console.log('4. ⚡ Gestionar pedidos EXPRESS');
    console.log('5. 🔍 Buscar pedido específico');
    console.log('6. ✏️ Modificar datos de envío');
    console.log('7. 📦 Ver productos y stock afectado');
    console.log('8. 🏦 Gestionar transferencias pendientes');
    console.log('9. 📊 Dashboard completo');
    console.log('10. 🔄 Recargar datos');
    console.log('0. 🚪 Salir');
    
    const choice = await this.askQuestion('\n🛒 Selecciona una opción (0-10): ');
    
    switch (choice.trim()) {
      case '1':
        await this.managePendingOrders();
        break;
      case '2':
        await this.managePickupOrders();
        break;
      case '3':
        await this.manageDeliveryOrders();
        break;
      case '4':
        await this.manageExpressOrders();
        break;
      case '5':
        await this.searchSpecificOrder();
        break;
      case '6':
        await this.modifyShippingData();
        break;
      case '7':
        await this.viewProductsAndStock();
        break;
      case '8':
        await this.managePendingTransfers();
        break;
      case '9':
        await this.showFullDashboard();
        break;
      case '10':
        await this.loadAllData();
        await this.askQuestion('\n⏎ Datos recargados. Presiona Enter...');
        break;
      case '0':
        console.log('\n👋 ¡Hasta luego!');
        return;
      default:
        console.log('\n❌ Opción inválida');
    }
    
    await this.showMainMenu();
  }

  // ============================================================================
  // GESTIÓN DE PEDIDOS PENDIENTES
  // ============================================================================

  async managePendingOrders() {
    console.log('\n⏳ PEDIDOS PENDIENTES DE CONFIRMACIÓN');
    console.log('='.repeat(80));
    
    if (this.pendingOrders.length === 0) {
      console.log('✅ No hay pedidos pendientes de confirmación');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    this.displayOrders(this.pendingOrders, 'PENDIENTES');

    console.log('\n📋 ACCIONES:');
    console.log('1. Confirmar un pedido');
    console.log('2. Confirmar múltiples pedidos');
    console.log('3. Ver detalles de un pedido');
    console.log('4. Cancelar un pedido');
    console.log('0. Volver');

    const action = await this.askQuestion('\n⏳ Selecciona acción: ');

    switch (action.trim()) {
      case '1':
        await this.confirmSingleOrder();
        break;
      case '2':
        await this.confirmMultipleOrders();
        break;
      case '3':
        await this.viewOrderDetails(this.pendingOrders);
        break;
      case '4':
        await this.cancelOrder(this.pendingOrders);
        break;
    }
  }

  async confirmSingleOrder() {
    const orderNum = await this.askQuestion('\n📦 Número de pedido a confirmar (0 para cancelar): ');
    const orderIndex = parseInt(orderNum) - 1;

    if (orderNum === '0') return;

    if (orderIndex < 0 || orderIndex >= this.pendingOrders.length) {
      console.log('❌ Número de pedido inválido');
      return;
    }

    const order = this.pendingOrders[orderIndex];
    
    console.log(`\n✅ CONFIRMANDO PEDIDO #${order.orderNumber}`);
    this.displayOrderSummary(order);

    // Solicitar fechas estimadas según el tipo
    let estimatedDate = null;
    if (order.deliveryType === 'pickup') {
      const dateStr = await this.askQuestion('\n📅 Fecha estimada de recogida (YYYY-MM-DD): ');
      estimatedDate = dateStr.trim() || null;
    } else {
      const dateStr = await this.askQuestion('\n📅 Fecha estimada de entrega (YYYY-MM-DD): ');
      estimatedDate = dateStr.trim() || null;
    }

    const notes = await this.askQuestion('📝 Notas adicionales (opcional): ');
    const confirm = await this.askQuestion('\n✅ ¿Confirmar este pedido? (s/n): ');

    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Confirmación cancelada');
      return;
    }

    try {
      const requestData = {
        notes: notes || `Pedido confirmado - ${order.deliveryType}`
      };

      if (order.deliveryType === 'pickup' && estimatedDate) {
        requestData.estimatedPickup = estimatedDate;
      } else if (estimatedDate) {
        requestData.estimatedDelivery = estimatedDate;
      }

      const response = await axios.post(
        `${this.baseURL}/api/order-management/${order.id}/confirm`,
        requestData,
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log('\n✅ Pedido confirmado exitosamente');
        console.log(`   📦 Estado: ${response.data.data.order.status}`);
        if (response.data.data.order.estimatedDelivery) {
          console.log(`   📅 Entrega estimada: ${response.data.data.order.estimatedDelivery}`);
        }
        if (response.data.data.order.pickupDate) {
          console.log(`   📅 Recogida estimada: ${response.data.data.order.pickupDate}`);
        }
        
        await this.loadAllData();
      } else {
        console.log('❌ Error:', response.data.message);
      }
    } catch (error) {
      console.error('❌ Error confirmando pedido:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async confirmMultipleOrders() {
    console.log('\n✅ CONFIRMAR MÚLTIPLES PEDIDOS');
    console.log('Ingresa los números separados por comas (ej: 1,3,5)');
    
    const orderNums = await this.askQuestion('\n📦 Números de pedidos: ');
    const indexes = orderNums.split(',').map(n => parseInt(n.trim()) - 1);

    const validOrders = indexes.filter(i => i >= 0 && i < this.pendingOrders.length);
    
    if (validOrders.length === 0) {
      console.log('❌ No hay pedidos válidos para confirmar');
      return;
    }

    console.log(`\n📋 Se confirmarán ${validOrders.length} pedidos:`);
    validOrders.forEach(i => {
      const order = this.pendingOrders[i];
      console.log(`   ${i + 1}. Pedido #${order.orderNumber} - ${order.deliveryType} - Q${order.totalAmount}`);
    });

    const confirm = await this.askQuestion('\n✅ ¿Confirmar todos estos pedidos? (s/n): ');
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Confirmación cancelada');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const i of validOrders) {
      const order = this.pendingOrders[i];
      
      try {
        const response = await axios.post(
          `${this.baseURL}/api/order-management/${order.id}/confirm`,
          { notes: 'Confirmación masiva' },
          { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
        );

        if (response.data.success) {
          console.log(`   ✅ Pedido #${order.orderNumber} confirmado`);
          successCount++;
        } else {
          console.log(`   ❌ Error en #${order.orderNumber}: ${response.data.message}`);
          errorCount++;
        }
      } catch (error) {
        console.log(`   ❌ Error en #${order.orderNumber}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n📊 RESUMEN: ${successCount} exitosos, ${errorCount} errores`);
    await this.loadAllData();
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ============================================================================
  // GESTIÓN DE PEDIDOS PARA RECOGIDA
  // ============================================================================

  async managePickupOrders() {
    console.log('\n🏪 PEDIDOS PARA RECOGIDA EN TIENDA');
    console.log('='.repeat(80));

    if (this.pickupOrders.length === 0) {
      console.log('❌ No hay pedidos para recogida');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    // Agrupar por estado
    const byStatus = {
      confirmed: this.pickupOrders.filter(o => o.status === 'confirmed'),
      preparing: this.pickupOrders.filter(o => o.status === 'preparing'),
      ready_pickup: this.pickupOrders.filter(o => o.status === 'ready_pickup'),
      picked_up: this.pickupOrders.filter(o => o.status === 'picked_up')
    };

    console.log('\n📊 ESTADOS DE PEDIDOS PARA RECOGIDA:');
    console.log(`   ✅ Confirmados: ${byStatus.confirmed.length}`);
    console.log(`   👨‍🍳 En preparación: ${byStatus.preparing.length}`);
    console.log(`   📦 Listos para recoger: ${byStatus.ready_pickup.length}`);
    console.log(`   ✅ Ya recogidos: ${byStatus.picked_up.length}`);

    this.displayOrders(this.pickupOrders, 'RECOGIDA');

    console.log('\n📋 ACCIONES:');
    console.log('1. Marcar como "en preparación"');
    console.log('2. Marcar como "listo para recoger"');
    console.log('3. Confirmar que fue recogido');
    console.log('4. Ver detalles de un pedido');
    console.log('5. Modificar fecha de recogida');
    console.log('0. Volver');

    const action = await this.askQuestion('\n🏪 Selecciona acción: ');

    switch (action.trim()) {
      case '1':
        await this.updateOrderStatusFlow(this.pickupOrders, 'preparing', 'EN PREPARACIÓN');
        break;
      case '2':
        await this.updateOrderStatusFlow(this.pickupOrders, 'ready_pickup', 'LISTO PARA RECOGER');
        break;
      case '3':
        await this.confirmPickup();
        break;
      case '4':
        await this.viewOrderDetails(this.pickupOrders);
        break;
      case '5':
        await this.modifyPickupDate();
        break;
    }
  }

  async confirmPickup() {
    const readyOrders = this.pickupOrders.filter(o => o.status === 'ready_pickup');
    
    if (readyOrders.length === 0) {
      console.log('\n❌ No hay pedidos listos para confirmar recogida');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    console.log('\n📦 PEDIDOS LISTOS PARA RECOGER:');
    readyOrders.forEach((order, i) => {
      console.log(`   ${i + 1}. #${order.orderNumber} - ${this.getCustomerName(order)} - Q${order.totalAmount}`);
    });

    const orderNum = await this.askQuestion('\n📦 Número de pedido recogido: ');
    const orderIndex = parseInt(orderNum) - 1;

    if (orderIndex < 0 || orderIndex >= readyOrders.length) {
      console.log('❌ Número inválido');
      return;
    }

    const order = readyOrders[orderIndex];
    
    console.log(`\n✅ CONFIRMAR RECOGIDA: #${order.orderNumber}`);
    this.displayOrderSummary(order);

    const verify = await this.askQuestion('\n👤 ¿Verificaste la identidad del cliente? (s/n): ');
    if (verify.toLowerCase() !== 's') {
      console.log('❌ Por seguridad, verifica la identidad antes de entregar');
      return;
    }

    const notes = await this.askQuestion('📝 Notas (opcional): ');
    const confirm = await this.askQuestion('\n✅ ¿Confirmar que fue recogido? (s/n): ');

    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Confirmación cancelada');
      return;
    }

    try {
      const response = await axios.patch(
        `${this.baseURL}/api/order-management/${order.id}/status`,
        {
          status: 'picked_up',
          notes: notes || `Recogido en tienda - Verificado`
        },
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log('\n✅ Recogida confirmada exitosamente');
        console.log('   📦 El stock se ha actualizado automáticamente');
        console.log('   💰 El pago se ha registrado como completado');
        
        await this.loadAllData();
      }
    } catch (error) {
      console.error('❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async modifyPickupDate() {
    const orderNum = await this.askQuestion('\n📦 Número de pedido: ');
    const orderIndex = parseInt(orderNum) - 1;

    if (orderIndex < 0 || orderIndex >= this.pickupOrders.length) {
      console.log('❌ Número inválido');
      return;
    }

    const order = this.pickupOrders[orderIndex];
    
    console.log(`\n📅 MODIFICAR FECHA DE RECOGIDA: #${order.orderNumber}`);
    if (order.pickupDate) {
      console.log(`   Fecha actual: ${new Date(order.pickupDate).toLocaleDateString()}`);
    }

    const newDate = await this.askQuestion('📅 Nueva fecha (YYYY-MM-DD): ');
    const notes = await this.askQuestion('📝 Motivo del cambio: ');

    try {
      // Nota: Esta funcionalidad requeriría un endpoint específico
      // Por ahora usamos el endpoint de actualización de estado con notas
      const response = await axios.patch(
        `${this.baseURL}/api/order-management/${order.id}/status`,
        {
          status: order.status,
          notes: `Fecha de recogida modificada a ${newDate}. Motivo: ${notes}`
        },
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log('\n✅ Fecha modificada exitosamente');
        await this.loadAllData();
      }
    } catch (error) {
      console.error('❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ============================================================================
  // GESTIÓN DE PEDIDOS PARA ENTREGA
  // ============================================================================

  async manageDeliveryOrders() {
    console.log('\n🚚 PEDIDOS PARA ENTREGA A DOMICILIO');
    console.log('='.repeat(80));

    if (this.deliveryOrders.length === 0) {
      console.log('❌ No hay pedidos para entrega');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    // Agrupar por estado
    const byStatus = {
      confirmed: this.deliveryOrders.filter(o => o.status === 'confirmed'),
      preparing: this.deliveryOrders.filter(o => o.status === 'preparing'),
      packed: this.deliveryOrders.filter(o => o.status === 'packed'),
      shipped: this.deliveryOrders.filter(o => o.status === 'shipped'),
      delivered: this.deliveryOrders.filter(o => o.status === 'delivered')
    };

    console.log('\n📊 ESTADOS DE PEDIDOS PARA ENTREGA:');
    console.log(`   ✅ Confirmados: ${byStatus.confirmed.length}`);
    console.log(`   👨‍🍳 En preparación: ${byStatus.preparing.length}`);
    console.log(`   📦 Empaquetados: ${byStatus.packed.length}`);
    console.log(`   🚚 Enviados: ${byStatus.shipped.length}`);
    console.log(`   ✅ Entregados: ${byStatus.delivered.length}`);

    this.displayOrders(this.deliveryOrders, 'ENTREGA');

    console.log('\n📋 ACCIONES:');
    console.log('1. Marcar como "en preparación"');
    console.log('2. Marcar como "empaquetado"');
    console.log('3. Marcar como "enviado" y asignar tracking');
    console.log('4. Confirmar entrega');
    console.log('5. Ver detalles de un pedido');
    console.log('6. Modificar dirección de envío');
    console.log('0. Volver');

    const action = await this.askQuestion('\n🚚 Selecciona acción: ');

    switch (action.trim()) {
      case '1':
        await this.updateOrderStatusFlow(this.deliveryOrders, 'preparing', 'EN PREPARACIÓN');
        break;
      case '2':
        await this.updateOrderStatusFlow(this.deliveryOrders, 'packed', 'EMPAQUETADO');
        break;
      case '3':
        await this.markAsShipped();
        break;
      case '4':
        await this.confirmDelivery();
        break;
      case '5':
        await this.viewOrderDetails(this.deliveryOrders);
        break;
      case '6':
        await this.modifyShippingAddress();
        break;
    }
  }

  async markAsShipped() {
    const packedOrders = this.deliveryOrders.filter(o => o.status === 'packed');
    
    if (packedOrders.length === 0) {
      console.log('\n❌ No hay pedidos empaquetados listos para enviar');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    console.log('\n📦 PEDIDOS EMPAQUETADOS:');
    packedOrders.forEach((order, i) => {
      console.log(`   ${i + 1}. #${order.orderNumber} - ${this.getCustomerName(order)} - Q${order.totalAmount}`);
      if (order.shippingAddress) {
        const addr = typeof order.shippingAddress === 'string' 
          ? order.shippingAddress 
          : `${order.shippingAddress.street}, ${order.shippingAddress.city}`;
        console.log(`      📍 ${addr}`);
      }
    });

    const orderNum = await this.askQuestion('\n📦 Número de pedido a enviar: ');
    const orderIndex = parseInt(orderNum) - 1;

    if (orderIndex < 0 || orderIndex >= packedOrders.length) {
      console.log('❌ Número inválido');
      return;
    }

    const order = packedOrders[orderIndex];
    
    console.log(`\n🚚 MARCAR COMO ENVIADO: #${order.orderNumber}`);
    this.displayOrderSummary(order);

    const trackingNumber = await this.askQuestion('\n📦 Número de guía/tracking: ');
    const courier = await this.askQuestion('🚚 Empresa de envío: ');
    const notes = await this.askQuestion('📝 Notas adicionales: ');

    if (!trackingNumber.trim()) {
      console.log('❌ El número de tracking es requerido');
      return;
    }

    const confirm = await this.askQuestion('\n✅ ¿Marcar como enviado? (s/n): ');
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Cancelado');
      return;
    }

    try {
      const response = await axios.patch(
        `${this.baseURL}/api/order-management/${order.id}/status`,
        {
          status: 'shipped',
          trackingNumber: trackingNumber.trim(),
          notes: `Enviado con ${courier}. ${notes || ''}`
        },
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log('\n✅ Pedido marcado como enviado');
        console.log(`   📦 Tracking: ${trackingNumber}`);
        console.log('   📦 El stock se ha actualizado automáticamente');
        
        await this.loadAllData();
      }
    } catch (error) {
      console.error('❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async confirmDelivery() {
    const shippedOrders = this.deliveryOrders.filter(o => o.status === 'shipped');
    
    if (shippedOrders.length === 0) {
      console.log('\n❌ No hay pedidos enviados pendientes de confirmar entrega');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    console.log('\n🚚 PEDIDOS ENVIADOS:');
    shippedOrders.forEach((order, i) => {
      console.log(`   ${i + 1}. #${order.orderNumber} - ${this.getCustomerName(order)}`);
      if (order.trackingNumber) {
        console.log(`      📦 Tracking: ${order.trackingNumber}`);
      }
    });

    const orderNum = await this.askQuestion('\n📦 Número de pedido entregado: ');
    const orderIndex = parseInt(orderNum) - 1;

    if (orderIndex < 0 || orderIndex >= shippedOrders.length) {
      console.log('❌ Número inválido');
      return;
    }

    const order = shippedOrders[orderIndex];
    
    console.log(`\n✅ CONFIRMAR ENTREGA: #${order.orderNumber}`);

    const notes = await this.askQuestion('📝 Notas de entrega (opcional): ');
    const confirm = await this.askQuestion('\n✅ ¿Confirmar que fue entregado? (s/n): ');

    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Confirmación cancelada');
      return;
    }

    try {
      const response = await axios.patch(
        `${this.baseURL}/api/order-management/${order.id}/status`,
        {
          status: 'delivered',
          notes: notes || 'Entregado exitosamente'
        },
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log('\n✅ Entrega confirmada exitosamente');
        console.log('   💰 El pago se ha registrado como completado');
        console.log('   📦 Pedido finalizado');
        
        await this.loadAllData();
      }
    } catch (error) {
      console.error('❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async modifyShippingAddress() {
    const orderNum = await this.askQuestion('\n📦 Número de pedido: ');
    const orderIndex = parseInt(orderNum) - 1;

    if (orderIndex < 0 || orderIndex >= this.deliveryOrders.length) {
      console.log('❌ Número inválido');
      return;
    }

    const order = this.deliveryOrders[orderIndex];
    
    console.log(`\n📍 MODIFICAR DIRECCIÓN: #${order.orderNumber}`);
    
    if (order.shippingAddress) {
      console.log('\n📍 Dirección actual:');
      const addr = typeof order.shippingAddress === 'string' 
        ? order.shippingAddress 
        : JSON.stringify(order.shippingAddress, null, 2);
      console.log(addr);
    }

    console.log('\n📝 Ingresa la nueva dirección:');
    const street = await this.askQuestion('   Calle y número: ');
    const city = await this.askQuestion('   Ciudad: ');
    const zone = await this.askQuestion('   Zona: ');
    const reference = await this.askQuestion('   Referencia: ');
    const phone = await this.askQuestion('   Teléfono de contacto: ');
    const reason = await this.askQuestion('📝 Motivo del cambio: ');

    const newAddress = {
      street: street.trim(),
      city: city.trim(),
      zone: zone.trim(),
      reference: reference.trim(),
      phone: phone.trim()
    };

    console.log('\n📍 Nueva dirección:');
    console.log(JSON.stringify(newAddress, null, 2));

    const confirm = await this.askQuestion('\n✅ ¿Guardar cambios? (s/n): ');
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Cambios cancelados');
      return;
    }

    try {
      // Nota: Esto requeriría un endpoint específico para actualizar dirección
      // Por ahora lo agregamos como nota en el pedido
      const response = await axios.patch(
        `${this.baseURL}/api/order-management/${order.id}/status`,
        {
          status: order.status,
          notes: `DIRECCIÓN MODIFICADA. Motivo: ${reason}\nNueva dirección: ${JSON.stringify(newAddress)}`
        },
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log('\n✅ Dirección actualizada en las notas del pedido');
        console.log('⚠️ IMPORTANTE: Verifica que el mensajero tenga la nueva dirección');
        await this.loadAllData();
      }
    } catch (error) {
      console.error('❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ============================================================================
  // GESTIÓN DE PEDIDOS EXPRESS
  // ============================================================================

  async manageExpressOrders() {
    console.log('\n⚡ PEDIDOS EXPRESS (ENTREGA RÁPIDA)');
    console.log('='.repeat(80));

    try {
      const response = await axios.get(`${this.baseURL}/api/order-management/orders/delivery-type`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { deliveryType: 'express', limit: 50 }
      });

      if (response.data.success && response.data.data?.orders) {
        this.expressOrders = response.data.data.orders;
      } else {
        this.expressOrders = [];
      }

      if (this.expressOrders.length === 0) {
        console.log('❌ No hay pedidos express');
        await this.askQuestion('\n⏎ Presiona Enter para continuar...');
        return;
      }

      console.log('⚡ PEDIDOS EXPRESS (Prioridad alta):');
      this.displayOrders(this.expressOrders, 'EXPRESS');

      console.log('\n⚠️ Los pedidos express requieren procesamiento inmediato (2-4 horas)');
      
      console.log('\n📋 ACCIONES:');
      console.log('1. Procesar pedido express');
      console.log('2. Marcar como enviado');
      console.log('3. Confirmar entrega');
      console.log('0. Volver');

      const action = await this.askQuestion('\n⚡ Selecciona acción: ');

      switch (action.trim()) {
        case '1':
          await this.updateOrderStatusFlow(this.expressOrders, 'preparing', 'EN PREPARACIÓN EXPRESS');
          break;
        case '2':
          await this.markAsShipped();
          break;
        case '3':
          await this.confirmDelivery();
          break;
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
    }
  }

  // ============================================================================
  // FUNCIONES AUXILIARES
  // ============================================================================

  async updateOrderStatusFlow(orders, newStatus, statusName) {
    if (orders.length === 0) {
      console.log(`\n❌ No hay pedidos para actualizar a ${statusName}`);
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const orderNum = await this.askQuestion(`\n📦 Número de pedido para ${statusName}: `);
    const orderIndex = parseInt(orderNum) - 1;

    if (orderIndex < 0 || orderIndex >= orders.length) {
      console.log('❌ Número inválido');
      return;
    }

    const order = orders[orderIndex];
    
    console.log(`\n🔄 ACTUALIZAR A ${statusName}: #${order.orderNumber}`);
    this.displayOrderSummary(order);

    const notes = await this.askQuestion('📝 Notas (opcional): ');
    const confirm = await this.askQuestion(`\n✅ ¿Cambiar a ${statusName}? (s/n): `);

    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Cancelado');
      return;
    }

    try {
      const response = await axios.patch(
        `${this.baseURL}/api/order-management/${order.id}/status`,
        {
          status: newStatus,
          notes: notes || `Estado actualizado a ${statusName}`
        },
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log(`\n✅ Estado actualizado a ${statusName}`);
        await this.loadAllData();
      }
    } catch (error) {
      console.error('❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async searchSpecificOrder() {
    console.log('\n🔍 BUSCAR PEDIDO ESPECÍFICO');
    console.log('='.repeat(60));
    
    const searchTerm = await this.askQuestion('🔍 Número de pedido o nombre de cliente: ');
    
    if (!searchTerm.trim()) return;

    const results = this.allOrders.filter(order => {
      const orderNum = (order.orderNumber || '').toLowerCase();
      const customerName = this.getCustomerName(order).toLowerCase();
      const search = searchTerm.toLowerCase();
      
      return orderNum.includes(search) || customerName.includes(search);
    });

    if (results.length === 0) {
      console.log('❌ No se encontraron pedidos');
    } else {
      console.log(`\n📋 RESULTADOS (${results.length}):`);
      this.displayOrders(results, 'BÚSQUEDA');
      
      const viewDetails = await this.askQuestion('\n👁️ ¿Ver detalles de alguno? (s/n): ');
      if (viewDetails.toLowerCase() === 's') {
        await this.viewOrderDetails(results);
      }
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async viewOrderDetails(ordersList) {
    const orderNum = await this.askQuestion('\n📦 Número de pedido: ');
    const orderIndex = parseInt(orderNum) - 1;

    if (orderIndex < 0 || orderIndex >= ordersList.length) {
      console.log('❌ Número inválido');
      return;
    }

    const order = ordersList[orderIndex];
    
    console.log(`\n📦 DETALLES COMPLETOS - PEDIDO #${order.orderNumber}`);
    console.log('='.repeat(80));
    
    console.log('\n📊 INFORMACIÓN GENERAL:');
    console.log(`   Estado: ${this.getStatusIcon(order.status)} ${order.status.toUpperCase()}`);
    console.log(`   Tipo: ${this.getDeliveryTypeIcon(order.deliveryType)} ${order.deliveryType?.toUpperCase() || 'N/A'}`);
    console.log(`   Fecha: ${new Date(order.createdAt).toLocaleString()}`);
    
    console.log('\n👤 CLIENTE:');
    console.log(`   Nombre: ${this.getCustomerName(order)}`);
    if (order.user?.email) console.log(`   Email: ${order.user.email}`);
    if (order.user?.phone) console.log(`   Teléfono: ${order.user.phone}`);
    
    if (order.shippingAddress) {
      console.log('\n📍 DIRECCIÓN DE ENVÍO:');
      const addr = typeof order.shippingAddress === 'string' 
        ? order.shippingAddress 
        : JSON.stringify(order.shippingAddress, null, 2);
      console.log(addr);
    }

    console.log('\n💰 RESUMEN FINANCIERO:');
    console.log(`   Subtotal: Q${order.subtotal || 0}`);
    console.log(`   Impuestos: Q${order.taxAmount || 0}`);
    console.log(`   Envío: Q${order.shippingAmount || 0}`);
    if (order.discountAmount > 0) console.log(`   Descuento: -Q${order.discountAmount}`);
    console.log(`   TOTAL: Q${order.totalAmount}`);
    console.log(`   Método de pago: ${order.paymentMethod}`);
    console.log(`   Estado de pago: ${order.paymentStatus}`);

    if (order.items && order.items.length > 0) {
      console.log('\n📦 PRODUCTOS:');
      order.items.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.productName}`);
        console.log(`      SKU: ${item.productSku}`);
        console.log(`      Cantidad: ${item.quantity}`);
        console.log(`      Precio unitario: Q${item.unitPrice}`);
        console.log(`      Total: Q${item.totalPrice}`);
      });
    }

    if (order.trackingNumber) {
      console.log(`\n📦 Número de tracking: ${order.trackingNumber}`);
    }

    if (order.estimatedDelivery) {
      console.log(`\n📅 Entrega estimada: ${new Date(order.estimatedDelivery).toLocaleDateString()}`);
    }

    if (order.pickupDate) {
      console.log(`\n📅 Fecha de recogida: ${new Date(order.pickupDate).toLocaleDateString()}`);
    }

    if (order.notes) {
      console.log(`\n📝 NOTAS:\n${order.notes}`);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async viewProductsAndStock() {
    console.log('\n📦 PRODUCTOS Y STOCK AFECTADO');
    console.log('='.repeat(80));

    if (this.products.length === 0) {
      console.log('❌ No hay productos cargados');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    console.log('\n📊 RESUMEN DE INVENTARIO:');
    
    const lowStock = this.products.filter(p => p.stockQuantity <= (p.minStock || 5));
    const outOfStock = this.products.filter(p => p.stockQuantity === 0);
    const totalValue = this.products.reduce((sum, p) => sum + (p.stockQuantity * p.price), 0);

    console.log(`   📦 Total productos: ${this.products.length}`);
    console.log(`   🟢 En stock: ${this.products.filter(p => p.stockQuantity > (p.minStock || 5)).length}`);
    console.log(`   🟡 Stock bajo: ${lowStock.length}`);
    console.log(`   🔴 Sin stock: ${outOfStock.length}`);
    console.log(`   💎 Valor total inventario: Q${totalValue.toFixed(2)}`);

    if (lowStock.length > 0) {
      console.log('\n🟡 PRODUCTOS CON STOCK BAJO:');
      lowStock.slice(0, 10).forEach((product, i) => {
        console.log(`   ${i + 1}. ${product.name}`);
        console.log(`      Stock: ${product.stockQuantity} (mínimo: ${product.minStock || 5})`);
        console.log(`      Precio: Q${product.price}`);
      });
    }

    if (outOfStock.length > 0) {
      console.log('\n🔴 PRODUCTOS SIN STOCK:');
      outOfStock.slice(0, 10).forEach((product, i) => {
        console.log(`   ${i + 1}. ${product.name} - Q${product.price}`);
      });
    }

    const viewMore = await this.askQuestion('\n📦 ¿Ver lista completa de productos? (s/n): ');
    if (viewMore.toLowerCase() === 's') {
      console.log('\n📦 TODOS LOS PRODUCTOS:');
      this.products.forEach((product, i) => {
        const stockStatus = product.stockQuantity === 0 ? '🔴' : 
                          product.stockQuantity <= (product.minStock || 5) ? '🟡' : '🟢';
        console.log(`   ${i + 1}. ${product.name}`);
        console.log(`      ${stockStatus} Stock: ${product.stockQuantity} - Precio: Q${product.price}`);
      });
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async managePendingTransfers() {
    console.log('\n🏦 TRANSFERENCIAS PENDIENTES');
    console.log('='.repeat(80));

    try {
      const response = await axios.get(`${this.baseURL}/api/order-management/pending-transfers`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      if (!response.data.success || !response.data.data?.orders || response.data.data.orders.length === 0) {
        console.log('✅ No hay transferencias pendientes');
        await this.askQuestion('\n⏎ Presiona Enter para continuar...');
        return;
      }

      const transfers = response.data.data.orders;

      console.log(`\n📋 TRANSFERENCIAS PENDIENTES (${transfers.length}):`);
      transfers.forEach((order, i) => {
        console.log(`\n   ${i + 1}. Pedido #${order.orderNumber}`);
        console.log(`      💰 Monto: Q${order.totalAmount}`);
        console.log(`      👤 Cliente: ${this.getCustomerName(order)}`);
        console.log(`      📅 Fecha: ${new Date(order.createdAt).toLocaleString()}`);
        console.log(`      ⏱️ Tiempo esperando: ${this.getTimeSince(order.createdAt)}`);
      });

      const confirm = await this.askQuestion('\n✅ ¿Confirmar alguna transferencia? (s/n): ');
      if (confirm.toLowerCase() === 's') {
        const orderNum = await this.askQuestion('📦 Número de transferencia: ');
        const orderIndex = parseInt(orderNum) - 1;

        if (orderIndex >= 0 && orderIndex < transfers.length) {
          await this.confirmTransfer(transfers[orderIndex]);
        }
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async confirmTransfer(order) {
    console.log(`\n🏦 CONFIRMAR TRANSFERENCIA - Pedido #${order.orderNumber}`);
    this.displayOrderSummary(order);

    const voucherDetails = await this.askQuestion('\n📝 Detalles del voucher: ');
    const bankReference = await this.askQuestion('🏦 Referencia bancaria: ');
    const notes = await this.askQuestion('📝 Notas adicionales: ');

    const confirm = await this.askQuestion('\n✅ ¿Confirmar transferencia? (s/n): ');
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Cancelado');
      return;
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/api/order-management/${order.id}/confirm-transfer`,
        {
          voucherDetails: voucherDetails.trim(),
          bankReference: bankReference.trim(),
          notes: notes.trim()
        },
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log('\n✅ Transferencia confirmada exitosamente');
        await this.loadAllData();
      }
    } catch (error) {
      console.error('❌ Error:', error.response?.data?.message || error.message);
    }
  }

  async showFullDashboard() {
    console.log('\n📊 DASHBOARD COMPLETO DE PEDIDOS ONLINE');
    console.log('='.repeat(80));

    if (!this.dashboard) {
      console.log('❌ No se pudo cargar el dashboard');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const summary = this.dashboard.summary || {};

    console.log('\n📈 RESUMEN GENERAL:');
    console.log(`   ⏳ Pendientes confirmación: ${summary.pendingConfirmation || 0}`);
    console.log(`   🏪 Listos para recogida: ${summary.readyForPickup || 0}`);
    console.log(`   📦 Empaquetados para envío: ${summary.packedForShipping || 0}`);
    console.log(`   🏦 Transferencias pendientes: ${summary.pendingTransfers || 0}`);
    console.log(`   📅 Pedidos hoy: ${summary.ordersToday || 0}`);
    console.log(`   💰 Ingresos hoy: Q${(summary.revenueToday || 0).toFixed(2)}`);
    console.log(`   📉 Productos con stock bajo: ${summary.lowStockCount || 0}`);

    if (this.dashboard.recentOrders && this.dashboard.recentOrders.length > 0) {
      console.log('\n📋 PEDIDOS RECIENTES:');
      this.dashboard.recentOrders.slice(0, 5).forEach((order, i) => {
        console.log(`   ${i + 1}. #${order.orderNumber} - ${order.status} - Q${order.totalAmount}`);
      });
    }

    // Estadísticas adicionales
    console.log('\n📊 ESTADÍSTICAS POR TIPO:');
    const byDeliveryType = {
      pickup: this.allOrders.filter(o => o.deliveryType === 'pickup').length,
      delivery: this.allOrders.filter(o => o.deliveryType === 'delivery').length,
      express: this.allOrders.filter(o => o.deliveryType === 'express').length
    };
    
    console.log(`   🏪 Recogida: ${byDeliveryType.pickup}`);
    console.log(`   🚚 Entrega: ${byDeliveryType.delivery}`);
    console.log(`   ⚡ Express: ${byDeliveryType.express}`);

    console.log('\n📊 ESTADÍSTICAS POR ESTADO:');
    const byStatus = {};
    this.allOrders.forEach(order => {
      byStatus[order.status] = (byStatus[order.status] || 0) + 1;
    });
    
    Object.keys(byStatus).forEach(status => {
      console.log(`   ${this.getStatusIcon(status)} ${status}: ${byStatus[status]}`);
    });

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ============================================================================
  // FUNCIONES DE VISUALIZACIÓN
  // ============================================================================

  displayOrders(orders, title) {
    console.log(`\n📋 ${title} (${orders.length}):`);
    
    if (orders.length === 0) {
      console.log('   (Ninguno)');
      return;
    }

    orders.forEach((order, i) => {
      console.log(`\n   ${i + 1}. Pedido #${order.orderNumber}`);
      console.log(`      📊 Estado: ${this.getStatusIcon(order.status)} ${order.status}`);
      console.log(`      🚚 Tipo: ${this.getDeliveryTypeIcon(order.deliveryType)} ${order.deliveryType || 'N/A'}`);
      console.log(`      💰 Total: Q${order.totalAmount}`);
      console.log(`      👤 Cliente: ${this.getCustomerName(order)}`);
      console.log(`      📅 Fecha: ${new Date(order.createdAt).toLocaleDateString()}`);
      
      if (order.trackingNumber) {
        console.log(`      📦 Tracking: ${order.trackingNumber}`);
      }
    });
  }

  displayOrderSummary(order) {
    console.log(`\n   📦 Pedido #${order.orderNumber}`);
    console.log(`   💰 Total: Q${order.totalAmount}`);
    console.log(`   👤 Cliente: ${this.getCustomerName(order)}`);
    console.log(`   🚚 Tipo: ${order.deliveryType}`);
    console.log(`   📦 Productos: ${order.itemsCount || order.items?.length || 0} items`);
  }

  getStatusIcon(status) {
    const icons = {
      'pending': '⏳',
      'confirmed': '✅',
      'preparing': '👨‍🍳',
      'ready_pickup': '📦',
      'packed': '📦',
      'shipped': '🚚',
      'delivered': '✅',
      'picked_up': '✅',
      'cancelled': '❌',
      'refunded': '💸'
    };
    return icons[status] || '❓';
  }

  getDeliveryTypeIcon(type) {
    const icons = {
      'pickup': '🏪',
      'delivery': '🚚',
      'express': '⚡'
    };
    return icons[type] || '📦';
  }

  getCustomerName(order) {
    if (order.user?.firstName || order.user?.lastName) {
      return `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim();
    }
    if (order.customerInfo?.name) {
      return order.customerInfo.name;
    }
    if (order.customer?.name) {
      return order.customer.name;
    }
    return 'Cliente anónimo';
  }

  getTimeSince(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} día${diffDays > 1 ? 's' : ''}`;
    } else {
      return `${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    }
  }

  askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  async modifyShippingData() {
    console.log('\n✏️ MODIFICAR DATOS DE ENVÍO');
    console.log('='.repeat(60));
    console.log('1. Modificar dirección de entrega');
    console.log('2. Modificar fecha de recogida');
    console.log('3. Modificar fecha de entrega');
    console.log('4. Modificar información de contacto');
    console.log('0. Volver');

    const choice = await this.askQuestion('\n✏️ Selecciona qué modificar: ');

    switch (choice.trim()) {
      case '1':
        await this.modifyShippingAddress();
        break;
      case '2':
        await this.modifyPickupDate();
        break;
      case '3':
        await this.modifyDeliveryDate();
        break;
      case '4':
        await this.modifyContactInfo();
        break;
    }
  }

  async modifyDeliveryDate() {
    const orderNum = await this.askQuestion('\n📦 Número de pedido: ');
    const orderIndex = parseInt(orderNum) - 1;

    if (orderIndex < 0 || orderIndex >= this.deliveryOrders.length) {
      console.log('❌ Número inválido');
      return;
    }

    const order = this.deliveryOrders[orderIndex];
    
    console.log(`\n📅 MODIFICAR FECHA DE ENTREGA: #${order.orderNumber}`);
    if (order.estimatedDelivery) {
      console.log(`   Fecha actual: ${new Date(order.estimatedDelivery).toLocaleDateString()}`);
    }

    const newDate = await this.askQuestion('📅 Nueva fecha (YYYY-MM-DD): ');
    const reason = await this.askQuestion('📝 Motivo del cambio: ');

    try {
      const response = await axios.patch(
        `${this.baseURL}/api/order-management/${order.id}/status`,
        {
          status: order.status,
          notes: `Fecha de entrega modificada a ${newDate}. Motivo: ${reason}`
        },
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log('\n✅ Fecha modificada exitosamente');
        await this.loadAllData();
      }
    } catch (error) {
      console.error('❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async modifyContactInfo() {
    const orderNum = await this.askQuestion('\n📦 Número de pedido: ');
    const orderIndex = parseInt(orderNum) - 1;

    if (orderIndex < 0 || orderIndex >= this.allOrders.length) {
      console.log('❌ Número inválido');
      return;
    }

    const order = this.allOrders[orderIndex];
    
    console.log(`\n📱 MODIFICAR INFORMACIÓN DE CONTACTO: #${order.orderNumber}`);

    const phone = await this.askQuestion('📱 Nuevo teléfono: ');
    const email = await this.askQuestion('📧 Nuevo email: ');
    const reason = await this.askQuestion('📝 Motivo: ');

    try {
      const response = await axios.patch(
        `${this.baseURL}/api/order-management/${order.id}/status`,
        {
          status: order.status,
          notes: `Contacto modificado - Tel: ${phone}, Email: ${email}. Motivo: ${reason}`
        },
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log('\n✅ Información de contacto actualizada');
        await this.loadAllData();
      }
    } catch (error) {
      console.error('❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async cancelOrder(ordersList) {
    const orderNum = await this.askQuestion('\n📦 Número de pedido a cancelar: ');
    const orderIndex = parseInt(orderNum) - 1;

    if (orderIndex < 0 || orderIndex >= ordersList.length) {
      console.log('❌ Número inválido');
      return;
    }

    const order = ordersList[orderIndex];
    
    console.log(`\n❌ CANCELAR PEDIDO: #${order.orderNumber}`);
    this.displayOrderSummary(order);

    const reason = await this.askQuestion('\n📝 Motivo de cancelación: ');
    const confirm = await this.askQuestion('❌ ¿CONFIRMAR CANCELACIÓN? (s/n): ');

    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Cancelación abortada');
      return;
    }

    try {
      const response = await axios.patch(
        `${this.baseURL}/api/order-management/${order.id}/status`,
        {
          status: 'cancelled',
          notes: `PEDIDO CANCELADO. Motivo: ${reason}`
        },
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log('\n✅ Pedido cancelado');
        console.log('   📦 El stock ha sido restaurado automáticamente');
        await this.loadAllData();
      }
    } catch (error) {
      console.error('❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

async function main() {
  const manager = new OnlineOrdersManager();
  await manager.start();
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n🚨 ERROR CRÍTICO:', error.message);
    process.exit(1);
  });
}

module.exports = { OnlineOrdersManager };