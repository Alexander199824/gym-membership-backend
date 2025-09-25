// test-sales-orders-manager.js - GESTOR COMPLETO DE VENTAS Y ÓRDENES v1.0
const axios = require('axios');
const readline = require('readline');
require('dotenv').config();

class SalesOrdersManager {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.adminToken = null;
    this.currentFilters = {
      startDate: '',
      endDate: '',
      paymentMethod: 'all',
      status: 'all',
      deliveryType: 'all'
    };
    
    // Datos cargados
    this.localSales = [];
    this.onlineOrders = [];
    this.pendingTransfers = [];
    this.availableProducts = [];
    this.salesStats = null;
    
    // Configurar readline para entrada interactiva
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.log('💰 Elite Fitness Club - Gestor Completo de Ventas y Órdenes v1.0');
    console.log('='.repeat(80));
    console.log('🎯 FUNCIONES: Ventas locales, órdenes online, transferencias, métricas');
    console.log('📊 DATOS: Estadísticas completas, productos disponibles, reportes');
    console.log('🔧 GESTIÓN: Confirmar transferencias, actualizar estados, análisis\n');
    
    try {
      await this.loginAdmin();
      await this.loadAllData();
      await this.showMainMenu();
      
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      if (error.response) {
        console.error('📋 Detalles:', {
          status: error.response.status,
          data: error.response.data,
          url: error.response.config?.url
        });
      }
    } finally {
      this.rl.close();
    }
  }

  // ✅ AUTENTICACIÓN
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
        console.log(`   🎭 Rol: ${response.data.data.user.role}`);
      } else {
        throw new Error('Respuesta de login inválida');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error(`Credenciales incorrectas. Verifica email y contraseña.`);
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error(`No se puede conectar al servidor en ${this.baseURL}. ¿Está ejecutándose?`);
      }
      throw new Error(`Autenticación falló: ${error.message}`);
    }
  }

  // ✅ CARGAR TODOS LOS DATOS
  async loadAllData() {
    console.log('\n2. 📊 Cargando todos los datos del sistema de ventas...');
    
    try {
      await Promise.all([
        this.loadLocalSales(),
        this.loadOnlineOrders(),
        this.loadPendingTransfers(),
        this.loadAvailableProducts(),
        this.loadSalesStats()
      ]);
      
      console.log(`   ✅ Datos cargados exitosamente:`);
      console.log(`      💰 Ventas locales: ${this.localSales.length}`);
      console.log(`      📦 Órdenes online: ${this.onlineOrders.length}`);
      console.log(`      ⏳ Transferencias pendientes: ${this.pendingTransfers.length}`);
      console.log(`      📦 Productos disponibles: ${this.availableProducts.length}`);
      
    } catch (error) {
      console.log(`   ❌ Error cargando datos: ${error.message}`);
      throw error;
    }
  }

  // ✅ CARGAR VENTAS LOCALES
  async loadLocalSales() {
    try {
      console.log('   💰 Cargando ventas locales...');
      const params = { limit: 50 };
      
      if (this.currentFilters.startDate) params.startDate = this.currentFilters.startDate;
      if (this.currentFilters.endDate) params.endDate = this.currentFilters.endDate;
      if (this.currentFilters.paymentMethod !== 'all') params.paymentMethod = this.currentFilters.paymentMethod;
      if (this.currentFilters.status !== 'all') params.status = this.currentFilters.status;

      const response = await axios.get(`${this.baseURL}/api/local-sales/`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params
      });

      this.localSales = response.data.success ? response.data.data.sales || [] : [];
    } catch (error) {
      console.error('      ❌ Error cargando ventas locales:', error.message);
      this.localSales = [];
    }
  }

  // ✅ CARGAR ÓRDENES ONLINE
  async loadOnlineOrders() {
    try {
      console.log('   📦 Cargando órdenes online...');
      const params = { limit: 50 };
      
      if (this.currentFilters.deliveryType !== 'all') params.deliveryType = this.currentFilters.deliveryType;
      if (this.currentFilters.status !== 'all') params.status = this.currentFilters.status;

      const response = await axios.get(`${this.baseURL}/api/order-management/`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params
      });

      this.onlineOrders = response.data.success ? response.data.data.orders || [] : [];
    } catch (error) {
      console.error('      ❌ Error cargando órdenes online:', error.message);
      this.onlineOrders = [];
    }
  }

  // ✅ CARGAR TRANSFERENCIAS PENDIENTES
  async loadPendingTransfers() {
    try {
      console.log('   ⏳ Cargando transferencias pendientes...');
      
      // Cargar transferencias pendientes de ventas locales
      const localResponse = await axios.get(`${this.baseURL}/api/local-sales/pending-transfers`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      // Cargar transferencias pendientes de órdenes online
      const onlineResponse = await axios.get(`${this.baseURL}/api/order-management/pending-transfers`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      const localTransfers = localResponse.data.success ? localResponse.data.data.transfers || [] : [];
      const onlineTransfers = onlineResponse.data.success ? onlineResponse.data.data.transfers || [] : [];

      this.pendingTransfers = [
        ...localTransfers.map(t => ({ ...t, type: 'local' })),
        ...onlineTransfers.map(t => ({ ...t, type: 'online' }))
      ];
    } catch (error) {
      console.error('      ❌ Error cargando transferencias pendientes:', error.message);
      this.pendingTransfers = [];
    }
  }

  // ✅ CARGAR PRODUCTOS DISPONIBLES
  async loadAvailableProducts() {
    try {
      console.log('   📦 Cargando productos disponibles...');
      const response = await axios.get(`${this.baseURL}/api/store/management/products`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { status: 'active', limit: 100 }
      });

      this.availableProducts = response.data.success ? 
        response.data.data.products.filter(p => p.stockQuantity > 0) : [];
    } catch (error) {
      console.error('      ❌ Error cargando productos:', error.message);
      this.availableProducts = [];
    }
  }

  // ✅ CARGAR ESTADÍSTICAS
  async loadSalesStats() {
    try {
      console.log('   📊 Cargando estadísticas...');
      
      // Estadísticas de productos
      const productStatsResponse = await axios.get(`${this.baseURL}/api/store/management/products/stats`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      // Dashboard de órdenes
      const orderDashboardResponse = await axios.get(`${this.baseURL}/api/order-management/dashboard`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      // Reporte diario de ventas locales
      const dailyReportResponse = await axios.get(`${this.baseURL}/api/local-sales/reports/daily`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      this.salesStats = {
        products: productStatsResponse.data.success ? productStatsResponse.data.data : null,
        orders: orderDashboardResponse.data.success ? orderDashboardResponse.data.data : null,
        daily: dailyReportResponse.data.success ? dailyReportResponse.data.data : null
      };
    } catch (error) {
      console.error('      ❌ Error cargando estadísticas:', error.message);
      this.salesStats = { products: null, orders: null, daily: null };
    }
  }

  // ✅ MENÚ PRINCIPAL
  async showMainMenu() {
    console.log('\n💰 GESTOR DE VENTAS Y ÓRDENES - MENÚ PRINCIPAL');
    console.log('=' .repeat(70));
    console.log('1. 💰 Ver ventas locales (efectivo/transferencia)');
    console.log('2. 📦 Ver órdenes online (página web)');
    console.log('3. ⏳ Ver transferencias pendientes');
    console.log('4. 📊 Ver estadísticas completas');
    console.log('5. 📦 Ver productos disponibles para venta');
    console.log('6. 🔍 Buscar venta/orden específica');
    console.log('7. ✅ Confirmar transferencias pendientes');
    console.log('8. 📈 Generar reportes por fecha');
    console.log('9. 🔧 Actualizar estados de órdenes');
    console.log('10. ⚙️ Configurar filtros');
    console.log('11. 🔄 Recargar datos');
    console.log('0. 🚪 Salir');
    
    const choice = await this.askQuestion('\n💰 Selecciona una opción (0-11): ');
    
    switch (choice.trim()) {
      case '1':
        await this.showLocalSales();
        break;
      case '2':
        await this.showOnlineOrders();
        break;
      case '3':
        await this.showPendingTransfers();
        break;
      case '4':
        await this.showCompleteStats();
        break;
      case '5':
        await this.showAvailableProducts();
        break;
      case '6':
        await this.searchSpecific();
        break;
      case '7':
        await this.confirmTransfers();
        break;
      case '8':
        await this.generateReports();
        break;
      case '9':
        await this.updateOrderStatus();
        break;
      case '10':
        await this.configureFilters();
        break;
      case '11':
        await this.reloadData();
        break;
      case '0':
        console.log('\n👋 ¡Hasta luego!');
        return;
      default:
        console.log('\n❌ Opción inválida. Intenta de nuevo.');
    }
    
    await this.showMainMenu();
  }

  // ✅ MOSTRAR VENTAS LOCALES
  async showLocalSales() {
    console.log('\n💰 VENTAS LOCALES (EFECTIVO Y TRANSFERENCIAS)');
    console.log('=' .repeat(70));
    
    if (this.localSales.length === 0) {
      console.log('❌ No hay ventas locales para mostrar');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    await this.showCurrentFilters();

    let totalAmount = 0;
    let cashTotal = 0;
    let transferTotal = 0;
    let pendingTransfers = 0;

    console.log('\n📋 VENTAS LOCALES:');
    this.localSales.forEach((sale, index) => {
      console.log(`\n   ${index + 1}. Venta #${sale.id}`);
      console.log(`      📅 Fecha: ${new Date(sale.createdAt).toLocaleString()}`);
      console.log(`      💰 Total: $${sale.total}`);
      console.log(`      💳 Método: ${sale.paymentMethod === 'cash' ? '💵 Efectivo' : '🏦 Transferencia'}`);
      console.log(`      📊 Estado: ${this.getStatusIcon(sale.status)} ${sale.status.toUpperCase()}`);
      console.log(`      👤 Vendedor: ${sale.employee?.firstName || 'N/A'} ${sale.employee?.lastName || ''}`);
      console.log(`      📦 Productos: ${sale.items?.length || 0} items`);
      
      if (sale.customerInfo?.name) {
        console.log(`      👤 Cliente: ${sale.customerInfo.name}`);
      }
      
      if (sale.status === 'transfer_pending') {
        console.log(`      ⚠️ TRANSFERENCIA PENDIENTE - Requiere confirmación`);
        pendingTransfers++;
      }

      totalAmount += parseFloat(sale.total);
      if (sale.paymentMethod === 'cash') {
        cashTotal += parseFloat(sale.total);
      } else {
        transferTotal += parseFloat(sale.total);
      }
    });

    console.log('\n📊 RESUMEN DE VENTAS LOCALES:');
    console.log(`   💰 Total vendido: $${totalAmount.toFixed(2)}`);
    console.log(`   💵 En efectivo: $${cashTotal.toFixed(2)}`);
    console.log(`   🏦 En transferencias: $${transferTotal.toFixed(2)}`);
    console.log(`   ⚠️ Transferencias pendientes: ${pendingTransfers}`);

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ MOSTRAR ÓRDENES ONLINE
  async showOnlineOrders() {
    console.log('\n📦 ÓRDENES ONLINE (PÁGINA WEB)');
    console.log('=' .repeat(70));
    
    if (this.onlineOrders.length === 0) {
      console.log('❌ No hay órdenes online para mostrar');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    await this.showCurrentFilters();

    let totalAmount = 0;
    let pendingCount = 0;
    let confirmedCount = 0;
    let deliveredCount = 0;

    console.log('\n📋 ÓRDENES ONLINE:');
    this.onlineOrders.forEach((order, index) => {
      console.log(`\n   ${index + 1}. Orden #${order.id}`);
      console.log(`      📅 Fecha: ${new Date(order.createdAt).toLocaleString()}`);
      console.log(`      💰 Total: $${order.total}`);
      console.log(`      📊 Estado: ${this.getStatusIcon(order.status)} ${order.status.toUpperCase()}`);
      console.log(`      🚚 Entrega: ${order.deliveryType}`);
      console.log(`      👤 Cliente: ${order.customerName || 'N/A'}`);
      console.log(`      📦 Productos: ${order.items?.length || 0} items`);
      
      if (order.deliveryAddress) {
        console.log(`      📍 Dirección: ${order.deliveryAddress}`);
      }
      
      if (order.estimatedDelivery) {
        console.log(`      ⏰ Entrega estimada: ${new Date(order.estimatedDelivery).toLocaleDateString()}`);
      }

      totalAmount += parseFloat(order.total || 0);
      
      switch (order.status) {
        case 'pending':
          pendingCount++;
          break;
        case 'confirmed':
        case 'preparing':
        case 'ready_pickup':
        case 'packed':
        case 'shipped':
          confirmedCount++;
          break;
        case 'delivered':
        case 'picked_up':
          deliveredCount++;
          break;
      }
    });

    console.log('\n📊 RESUMEN DE ÓRDENES ONLINE:');
    console.log(`   💰 Total en órdenes: $${totalAmount.toFixed(2)}`);
    console.log(`   ⏳ Pendientes: ${pendingCount}`);
    console.log(`   ✅ En proceso: ${confirmedCount}`);
    console.log(`   📦 Completadas: ${deliveredCount}`);

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ MOSTRAR TRANSFERENCIAS PENDIENTES
  async showPendingTransfers() {
    console.log('\n⏳ TRANSFERENCIAS PENDIENTES DE CONFIRMACIÓN');
    console.log('=' .repeat(70));
    
    if (this.pendingTransfers.length === 0) {
      console.log('✅ No hay transferencias pendientes');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    let totalPending = 0;

    console.log('\n📋 TRANSFERENCIAS PENDIENTES:');
    this.pendingTransfers.forEach((transfer, index) => {
      console.log(`\n   ${index + 1}. ${transfer.type.toUpperCase()} - ${transfer.type === 'local' ? 'Venta' : 'Orden'} #${transfer.id}`);
      console.log(`      📅 Fecha: ${new Date(transfer.createdAt).toLocaleString()}`);
      console.log(`      💰 Monto: $${transfer.total}`);
      console.log(`      🏦 Referencia: ${transfer.bankReference || 'N/A'}`);
      console.log(`      📝 Voucher: ${transfer.transferVoucher || 'N/A'}`);
      console.log(`      👤 ${transfer.type === 'local' ? 'Vendedor' : 'Cliente'}: ${transfer.employeeName || transfer.customerName || 'N/A'}`);
      console.log(`      ⏱️ Tiempo pendiente: ${this.getTimeSince(transfer.createdAt)}`);

      totalPending += parseFloat(transfer.total || 0);
    });

    console.log('\n📊 RESUMEN DE TRANSFERENCIAS PENDIENTES:');
    console.log(`   💰 Monto total pendiente: $${totalPending.toFixed(2)}`);
    console.log(`   📊 Cantidad de transferencias: ${this.pendingTransfers.length}`);

    const actionChoice = await this.askQuestion('\n🔧 ¿Deseas confirmar alguna transferencia? (s/n): ');
    if (actionChoice.toLowerCase() === 's') {
      await this.confirmSpecificTransfer();
    }
  }

  // ✅ MOSTRAR ESTADÍSTICAS COMPLETAS
  async showCompleteStats() {
    console.log('\n📊 ESTADÍSTICAS COMPLETAS DEL SISTEMA');
    console.log('=' .repeat(70));

    if (!this.salesStats || (!this.salesStats.products && !this.salesStats.orders && !this.salesStats.daily)) {
      console.log('❌ No se pudieron cargar las estadísticas');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    // Estadísticas de productos
    if (this.salesStats.products) {
      console.log('\n📦 ESTADÍSTICAS DE INVENTARIO:');
      console.log(`   📦 Total productos: ${this.salesStats.products.totalProducts}`);
      console.log(`   ✅ Productos activos: ${this.salesStats.products.activeProducts}`);
      console.log(`   ⭐ Productos destacados: ${this.salesStats.products.featuredProducts}`);
      console.log(`   🔴 Sin stock: ${this.salesStats.products.outOfStock}`);
      console.log(`   🟡 Stock bajo: ${this.salesStats.products.lowStock}`);
      console.log(`   📊 Stock total: ${this.salesStats.products.totalStock} unidades`);
      console.log(`   💰 Precio promedio: $${this.salesStats.products.averagePrice.toFixed(2)}`);
      
      const inventoryValue = this.salesStats.products.totalStock * this.salesStats.products.averagePrice;
      console.log(`   💎 Valor total inventario: $${inventoryValue.toFixed(2)}`);
    }

    // Estadísticas de órdenes
    if (this.salesStats.orders) {
      console.log('\n📦 ESTADÍSTICAS DE ÓRDENES ONLINE:');
      const orders = this.salesStats.orders;
      Object.keys(orders).forEach(key => {
        if (typeof orders[key] === 'number') {
          console.log(`   📊 ${key}: ${orders[key]}`);
        } else if (typeof orders[key] === 'object' && orders[key] !== null) {
          console.log(`   📊 ${key}:`);
          Object.keys(orders[key]).forEach(subKey => {
            console.log(`      ${subKey}: ${orders[key][subKey]}`);
          });
        }
      });
    }

    // Reporte diario
    if (this.salesStats.daily) {
      console.log('\n📈 REPORTE DIARIO:');
      const daily = this.salesStats.daily;
      if (daily.totalSales !== undefined) console.log(`   💰 Ventas del día: $${daily.totalSales}`);
      if (daily.totalOrders !== undefined) console.log(`   📦 Órdenes del día: ${daily.totalOrders}`);
      if (daily.averageOrderValue !== undefined) console.log(`   📊 Valor promedio: $${daily.averageOrderValue}`);
    }

    // Estadísticas combinadas
    console.log('\n🔥 MÉTRICAS COMBINADAS:');
    const totalLocalSales = this.localSales.reduce((sum, sale) => sum + parseFloat(sale.total || 0), 0);
    const totalOnlineOrders = this.onlineOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
    const totalRevenue = totalLocalSales + totalOnlineOrders;

    console.log(`   💰 Total ventas locales: $${totalLocalSales.toFixed(2)}`);
    console.log(`   💰 Total órdenes online: $${totalOnlineOrders.toFixed(2)}`);
    console.log(`   💰 INGRESOS TOTALES: $${totalRevenue.toFixed(2)}`);
    console.log(`   📊 Ventas totales: ${this.localSales.length + this.onlineOrders.length}`);
    console.log(`   ⚠️ Transferencias pendientes: ${this.pendingTransfers.length}`);

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ MOSTRAR PRODUCTOS DISPONIBLES
  async showAvailableProducts() {
    console.log('\n📦 PRODUCTOS DISPONIBLES PARA VENTA');
    console.log('=' .repeat(70));
    
    if (this.availableProducts.length === 0) {
      console.log('❌ No hay productos disponibles para venta');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    let totalValue = 0;
    let lowStockCount = 0;

    console.log('\n📋 PRODUCTOS CON STOCK:');
    this.availableProducts.slice(0, 20).forEach((product, index) => {
      const stockStatus = this.getStockStatus(product);
      const value = product.stockQuantity * product.price;
      totalValue += value;

      if (product.stockQuantity <= (product.minStock || 5)) {
        lowStockCount++;
      }

      console.log(`\n   ${index + 1}. ${product.name}`);
      console.log(`      🆔 SKU: ${product.sku}`);
      console.log(`      💰 Precio: $${product.price}`);
      console.log(`      📦 Stock: ${product.stockQuantity} ${stockStatus.icon} ${stockStatus.text}`);
      console.log(`      💎 Valor en stock: $${value.toFixed(2)}`);
      console.log(`      📂 Categoría: ${product.category?.name || 'N/A'}`);
    });

    if (this.availableProducts.length > 20) {
      console.log(`\n   ... y ${this.availableProducts.length - 20} productos más`);
    }

    console.log('\n📊 RESUMEN DE PRODUCTOS DISPONIBLES:');
    console.log(`   📦 Total productos con stock: ${this.availableProducts.length}`);
    console.log(`   🟡 Productos con stock bajo: ${lowStockCount}`);
    console.log(`   💎 Valor total disponible: $${totalValue.toFixed(2)}`);

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ CONFIRMAR TRANSFERENCIAS
  async confirmTransfers() {
    console.log('\n✅ CONFIRMAR TRANSFERENCIAS PENDIENTES');
    console.log('=' .repeat(60));
    
    if (this.pendingTransfers.length === 0) {
      console.log('✅ No hay transferencias pendientes para confirmar');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    await this.showPendingTransfers();
    await this.confirmSpecificTransfer();
  }

  async confirmSpecificTransfer() {
    const transferChoice = await this.askQuestion('\n📋 Número de transferencia a confirmar (0 para cancelar): ');
    const transferIndex = parseInt(transferChoice) - 1;

    if (transferChoice === '0') return;

    if (transferIndex < 0 || transferIndex >= this.pendingTransfers.length) {
      console.log('❌ Número de transferencia inválido');
      return;
    }

    const transfer = this.pendingTransfers[transferIndex];
    
    console.log(`\n✅ Confirmando ${transfer.type} #${transfer.id}`);
    console.log(`   💰 Monto: $${transfer.total}`);
    console.log(`   🏦 Referencia: ${transfer.bankReference || 'N/A'}`);

    const notes = await this.askQuestion('📝 Notas adicionales (opcional): ');
    const confirm = await this.askQuestion('✅ ¿Confirmar esta transferencia? (s/n): ');

    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Confirmación cancelada');
      return;
    }

    try {
      const endpoint = transfer.type === 'local' 
        ? `/api/local-sales/${transfer.id}/confirm-transfer`
        : `/api/order-management/${transfer.id}/confirm-transfer`;

      const response = await axios.post(`${this.baseURL}${endpoint}`, {
        voucherDetails: transfer.transferVoucher || 'Transferencia confirmada',
        bankReference: transfer.bankReference,
        notes: notes || 'Confirmada desde gestor'
      }, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      if (response.data.success) {
        console.log('✅ Transferencia confirmada exitosamente');
        
        // Remover de la lista local
        this.pendingTransfers.splice(transferIndex, 1);
        
        // Recargar datos
        await this.loadAllData();
      } else {
        console.log('❌ Error confirmando transferencia:', response.data.message);
      }
    } catch (error) {
      console.error('❌ Error confirmando transferencia:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ FUNCIONES AUXILIARES
  getStatusIcon(status) {
    const icons = {
      'completed': '✅',
      'pending': '⏳',
      'transfer_pending': '🏦',
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

  getStockStatus(product) {
    if (product.stockQuantity === 0) {
      return { icon: '🔴', text: '(Sin stock)' };
    } else if (product.stockQuantity <= (product.minStock || 5)) {
      return { icon: '🟡', text: '(Stock bajo)' };
    } else {
      return { icon: '🟢', text: '(Stock OK)' };
    }
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

  async showCurrentFilters() {
    const activeFilters = [];
    
    if (this.currentFilters.startDate) activeFilters.push(`Desde: ${this.currentFilters.startDate}`);
    if (this.currentFilters.endDate) activeFilters.push(`Hasta: ${this.currentFilters.endDate}`);
    if (this.currentFilters.paymentMethod !== 'all') activeFilters.push(`Método: ${this.currentFilters.paymentMethod}`);
    if (this.currentFilters.status !== 'all') activeFilters.push(`Estado: ${this.currentFilters.status}`);
    if (this.currentFilters.deliveryType !== 'all') activeFilters.push(`Entrega: ${this.currentFilters.deliveryType}`);
    
    if (activeFilters.length > 0) {
      console.log(`\n🔍 FILTROS ACTIVOS: ${activeFilters.join(' | ')}`);
    }
  }

  // Métodos adicionales simplificados
  async searchSpecific() {
    console.log('\n🔍 Función de búsqueda específica pendiente de implementación');
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async generateReports() {
    console.log('\n📈 Función de generación de reportes pendiente de implementación');
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async updateOrderStatus() {
    console.log('\n🔧 Función de actualización de estados pendiente de implementación');
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async configureFilters() {
    console.log('\n⚙️ CONFIGURACIÓN DE FILTROS');
    console.log('=' .repeat(50));
    console.log('1. Establecer rango de fechas');
    console.log('2. Filtrar por método de pago');
    console.log('3. Filtrar por estado');
    console.log('4. Filtrar por tipo de entrega');
    console.log('5. Limpiar todos los filtros');
    console.log('0. Volver');

    const choice = await this.askQuestion('\n⚙️ Selecciona opción: ');
    
    switch (choice.trim()) {
      case '1':
        this.currentFilters.startDate = await this.askQuestion('📅 Fecha inicio (YYYY-MM-DD): ') || '';
        this.currentFilters.endDate = await this.askQuestion('📅 Fecha fin (YYYY-MM-DD): ') || '';
        console.log('✅ Rango de fechas configurado');
        break;
      case '2':
        console.log('💳 Métodos: all, cash, card, transfer');
        this.currentFilters.paymentMethod = await this.askQuestion('💳 Método de pago: ') || 'all';
        break;
      case '3':
        console.log('📊 Estados: all, pending, completed, cancelled');
        this.currentFilters.status = await this.askQuestion('📊 Estado: ') || 'all';
        break;
      case '4':
        console.log('🚚 Tipos: all, pickup, delivery, express');
        this.currentFilters.deliveryType = await this.askQuestion('🚚 Tipo de entrega: ') || 'all';
        break;
      case '5':
        this.currentFilters = {
          startDate: '',
          endDate: '',
          paymentMethod: 'all',
          status: 'all',
          deliveryType: 'all'
        };
        console.log('✅ Filtros limpiados');
        break;
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async reloadData() {
    console.log('\n🔄 RECARGANDO TODOS LOS DATOS...');
    try {
      await this.loadAllData();
      console.log('✅ Todos los datos recargados exitosamente');
    } catch (error) {
      console.log(`❌ Error recargando datos: ${error.message}`);
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }
}

// ✅ FUNCIÓN DE AYUDA
function showHelp() {
  console.log('\n💰 Elite Fitness Club - Gestor Completo de Ventas y Órdenes v1.0\n');
  
  console.log('🎯 CARACTERÍSTICAS:');
  console.log('  💰 Gestión completa de ventas locales');
  console.log('  📦 Administración de órdenes online');
  console.log('  ⏳ Control de transferencias pendientes');
  console.log('  📊 Estadísticas y métricas completas');
  console.log('  🔧 Herramientas de gestión y confirmación\n');
  
  console.log('📋 FUNCIONALIDADES:');
  console.log('  ✅ Ver ventas con filtros por fecha/método/estado');
  console.log('  ✅ Gestionar órdenes de página web');
  console.log('  ✅ Confirmar transferencias pendientes');
  console.log('  ✅ Estadísticas completas del sistema');
  console.log('  ✅ Control de productos disponibles');
  console.log('  ✅ Métricas de rendimiento\n');
  
  console.log('💰 TIPOS DE VENTAS SOPORTADAS:');
  console.log('  💵 Ventas locales en efectivo');
  console.log('  🏦 Ventas locales por transferencia');
  console.log('  📦 Órdenes online para entrega');
  console.log('  🏪 Órdenes online para recogida');
  console.log('  ⚡ Órdenes express\n');
  
  console.log('🚀 USO:');
  console.log('  node test-sales-orders-manager.js        # Gestor interactivo');
  console.log('  node test-sales-orders-manager.js --help # Esta ayuda\n');
  
  console.log('📋 REQUISITOS:');
  console.log('  • Servidor corriendo en puerto 5000');
  console.log('  • Usuario admin: admin@gym.com / Admin123!');
  console.log('  • Rutas de ventas y órdenes configuradas\n');
  
  console.log('💡 El gestor integra ventas locales y órdenes online en');
  console.log('   una interfaz unificada para control total del negocio');
}

// ✅ FUNCIÓN PRINCIPAL
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const manager = new SalesOrdersManager();
  await manager.start();
}

// ✅ EJECUTAR
if (require.main === module) {
  main().catch(error => {
    console.error('\n🚨 ERROR CRÍTICO:', error.message);
    process.exit(1);
  });
}

module.exports = { SalesOrdersManager };