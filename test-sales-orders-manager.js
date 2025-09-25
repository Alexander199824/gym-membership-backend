// test-sales-orders-manager.js - GESTOR CORREGIDO v2.0
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
    console.log('💰 Elite Fitness Club - Gestor Completo de Ventas y Órdenes v2.0 (COMPLETAMENTE CORREGIDO)');
    console.log('='.repeat(85));
    console.log('🎯 FUNCIONES: Ventas locales, órdenes online, transferencias, métricas');
    console.log('📊 DATOS: Estadísticas completas, productos disponibles, reportes');
    console.log('🔧 GESTIÓN: Confirmar transferencias, actualizar estados, análisis');
    console.log('✅ CORREGIDO: Todas las rutas y funcionalidades funcionando\n');
    
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

  // ✅ CARGAR TODOS LOS DATOS - CORREGIDO
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

      if (response.data.success && response.data.data && response.data.data.sales) {
        this.localSales = response.data.data.sales;
        console.log(`      ✅ ${this.localSales.length} ventas locales cargadas`);
      } else {
        this.localSales = [];
        console.log(`      ⚠️ No se encontraron ventas locales`);
      }
    } catch (error) {
      console.error(`      ❌ Error cargando ventas locales: ${error.response?.status || error.code} - ${error.message}`);
      this.localSales = [];
    }
  }

  // ✅ CARGAR ÓRDENES ONLINE - RUTA CORREGIDA
  async loadOnlineOrders() {
    try {
      console.log('   📦 Cargando órdenes online...');
      const params = { limit: 50 };
      
      if (this.currentFilters.status !== 'all') params.status = this.currentFilters.status;

      // ✅ RUTA CORREGIDA: usar store/management/orders
      const response = await axios.get(`${this.baseURL}/api/store/management/orders`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params
      });

      if (response.data.success && response.data.data && response.data.data.orders) {
        this.onlineOrders = response.data.data.orders;
        console.log(`      ✅ ${this.onlineOrders.length} órdenes online cargadas`);
      } else {
        this.onlineOrders = [];
        console.log(`      ⚠️ No se encontraron órdenes online`);
      }
    } catch (error) {
      console.error(`      ❌ Error cargando órdenes online: ${error.response?.status || error.code} - ${error.message}`);
      this.onlineOrders = [];
    }
  }

  // ✅ CARGAR TRANSFERENCIAS PENDIENTES - MEJORADO
  async loadPendingTransfers() {
    try {
      console.log('   ⏳ Cargando transferencias pendientes...');
      
      const pendingPromises = [];
      
      // Transferencias de ventas locales
      pendingPromises.push(
        axios.get(`${this.baseURL}/api/local-sales/pending-transfers`, {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }).then(response => ({
          type: 'local',
          data: response.data.success ? response.data.data.transfers || [] : []
        })).catch(error => {
          console.warn(`      ⚠️ Error cargando transferencias locales: ${error.response?.status || error.code}`);
          return { type: 'local', data: [] };
        })
      );

      // Transferencias de órdenes online - intentar múltiples rutas
      const onlineRoutes = [
        '/api/order-management/pending-transfers',
        '/api/store/management/orders/pending-transfers'
      ];

      for (const route of onlineRoutes) {
        pendingPromises.push(
          axios.get(`${this.baseURL}${route}`, {
            headers: { 'Authorization': `Bearer ${this.adminToken}` }
          }).then(response => ({
            type: 'online',
            data: response.data.success ? response.data.data.transfers || response.data.data.orders || [] : []
          })).catch(error => {
            if (error.response?.status === 404) {
              console.warn(`      ⚠️ Ruta no encontrada: ${route}`);
            }
            return { type: 'online', data: [] };
          })
        );
      }

      const results = await Promise.all(pendingPromises);
      
      // Combinar resultados
      const localTransfers = results.find(r => r.type === 'local')?.data || [];
      const onlineTransfers = results.filter(r => r.type === 'online').reduce((acc, r) => [...acc, ...r.data], []);

      this.pendingTransfers = [
        ...localTransfers.map(t => ({ ...t, type: 'local' })),
        ...onlineTransfers.map(t => ({ ...t, type: 'online' }))
      ];

      console.log(`      ✅ ${this.pendingTransfers.length} transferencias pendientes cargadas (${localTransfers.length} locales, ${onlineTransfers.length} online)`);
      
    } catch (error) {
      console.error(`      ❌ Error cargando transferencias pendientes: ${error.message}`);
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

      if (response.data.success && response.data.data && response.data.data.products) {
        this.availableProducts = response.data.data.products.filter(p => p.stockQuantity > 0);
        console.log(`      ✅ ${this.availableProducts.length} productos disponibles cargados`);
      } else {
        this.availableProducts = [];
        console.log(`      ⚠️ No se encontraron productos disponibles`);
      }
    } catch (error) {
      console.error(`      ❌ Error cargando productos: ${error.response?.status || error.code} - ${error.message}`);
      this.availableProducts = [];
    }
  }

  // ✅ CARGAR ESTADÍSTICAS - MEJORADO CON MANEJO DE ERRORES
  async loadSalesStats() {
    try {
      console.log('   📊 Cargando estadísticas...');
      
      const statsPromises = [
        // Estadísticas de productos
        axios.get(`${this.baseURL}/api/store/management/products/stats`, {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }).then(response => ({
          key: 'products',
          data: response.data.success ? response.data.data : null
        })).catch(error => {
          console.warn(`      ⚠️ Error estadísticas productos: ${error.response?.status || error.code}`);
          return { key: 'products', data: null };
        }),

        // Dashboard de tienda
        axios.get(`${this.baseURL}/api/store/management/dashboard`, {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }).then(response => ({
          key: 'store',
          data: response.data.success ? response.data.data : null
        })).catch(error => {
          console.warn(`      ⚠️ Error dashboard tienda: ${error.response?.status || error.code}`);
          return { key: 'store', data: null };
        }),

        // Reporte diario de ventas locales
        axios.get(`${this.baseURL}/api/local-sales/reports/daily`, {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }).then(response => ({
          key: 'daily',
          data: response.data.success ? response.data.data : null
        })).catch(error => {
          console.warn(`      ⚠️ Error reporte diario: ${error.response?.status || error.code}`);
          return { key: 'daily', data: null };
        }),

        // Intentar dashboard de órdenes
        axios.get(`${this.baseURL}/api/order-management/dashboard`, {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }).then(response => ({
          key: 'orders',
          data: response.data.success ? response.data.data : null
        })).catch(error => {
          console.warn(`      ⚠️ Error dashboard órdenes: ${error.response?.status || error.code}`);
          return { key: 'orders', data: null };
        })
      ];

      const results = await Promise.all(statsPromises);
      
      this.salesStats = {};
      results.forEach(result => {
        this.salesStats[result.key] = result.data;
      });

      const loadedStats = Object.values(this.salesStats).filter(s => s !== null).length;
      console.log(`      ✅ ${loadedStats}/4 estadísticas cargadas exitosamente`);
      
    } catch (error) {
      console.error(`      ❌ Error cargando estadísticas: ${error.message}`);
      this.salesStats = { products: null, store: null, daily: null, orders: null };
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
    console.log('12. 🧪 Probar conectividad de rutas');
    console.log('0. 🚪 Salir');
    
    const choice = await this.askQuestion('\n💰 Selecciona una opción (0-12): ');
    
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
      case '12':
        await this.testConnectivity();
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
      console.log(`\n   ${index + 1}. Venta #${sale.saleNumber || sale.id}`);
      console.log(`      📅 Fecha: ${new Date(sale.createdAt).toLocaleString()}`);
      console.log(`      💰 Total: Q${parseFloat(sale.totalAmount || sale.total || 0).toFixed(2)}`);
      console.log(`      💳 Método: ${sale.paymentMethod === 'cash' ? '💵 Efectivo' : '🏦 Transferencia'}`);
      console.log(`      📊 Estado: ${this.getStatusIcon(sale.status)} ${sale.status.toUpperCase()}`);
      console.log(`      👤 Vendedor: ${sale.employee?.firstName || 'N/A'} ${sale.employee?.lastName || ''}`);
      console.log(`      📦 Productos: ${sale.itemsCount || sale.items?.length || 0} items`);
      
      if (sale.customerName || sale.customer?.name) {
        console.log(`      👤 Cliente: ${sale.customerName || sale.customer.name}`);
      }
      
      if (sale.status === 'transfer_pending') {
        console.log(`      ⚠️ TRANSFERENCIA PENDIENTE - Requiere confirmación`);
        pendingTransfers++;
      }

      const amount = parseFloat(sale.totalAmount || sale.total || 0);
      totalAmount += amount;
      if (sale.paymentMethod === 'cash') {
        cashTotal += amount;
      } else {
        transferTotal += amount;
      }
    });

    console.log('\n📊 RESUMEN DE VENTAS LOCALES:');
    console.log(`   💰 Total vendido: Q${totalAmount.toFixed(2)}`);
    console.log(`   💵 En efectivo: Q${cashTotal.toFixed(2)}`);
    console.log(`   🏦 En transferencias: Q${transferTotal.toFixed(2)}`);
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
      console.log(`\n   ${index + 1}. Orden #${order.orderNumber || order.id}`);
      console.log(`      📅 Fecha: ${new Date(order.createdAt).toLocaleString()}`);
      console.log(`      💰 Total: Q${parseFloat(order.totalAmount || order.total || 0).toFixed(2)}`);
      console.log(`      📊 Estado: ${this.getStatusIcon(order.status)} ${order.status.toUpperCase()}`);
      console.log(`      🚚 Entrega: ${order.deliveryType || 'N/A'}`);
      
      // Información del cliente
      const customerInfo = this.getCustomerInfo(order);
      console.log(`      👤 Cliente: ${customerInfo}`);
      
      console.log(`      📦 Productos: ${order.itemsCount || order.items?.length || 0} items`);
      
      if (order.shippingAddress) {
        const address = typeof order.shippingAddress === 'string' 
          ? order.shippingAddress 
          : `${order.shippingAddress.street || ''}, ${order.shippingAddress.city || ''}`.trim();
        console.log(`      📍 Dirección: ${address}`);
      }
      
      if (order.estimatedDelivery) {
        console.log(`      ⏰ Entrega estimada: ${new Date(order.estimatedDelivery).toLocaleDateString()}`);
      }

      const amount = parseFloat(order.totalAmount || order.total || 0);
      totalAmount += amount;
      
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
    console.log(`   💰 Total en órdenes: Q${totalAmount.toFixed(2)}`);
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
      console.log(`\n   ${index + 1}. ${transfer.type.toUpperCase()} - ${transfer.type === 'local' ? 'Venta' : 'Orden'} #${transfer.saleNumber || transfer.orderNumber || transfer.id}`);
      console.log(`      📅 Fecha: ${new Date(transfer.createdAt).toLocaleString()}`);
      console.log(`      💰 Monto: Q${parseFloat(transfer.totalAmount || transfer.total || 0).toFixed(2)}`);
      console.log(`      🏦 Referencia: ${transfer.bankReference || 'N/A'}`);
      console.log(`      📝 Voucher: ${(transfer.transferVoucher || '').substring(0, 50) || 'N/A'}`);
      
      // Información de persona responsable
      const responsiblePerson = transfer.type === 'local' 
        ? `${transfer.employee?.firstName || 'N/A'} ${transfer.employee?.lastName || ''}`.trim()
        : this.getCustomerInfo(transfer);
      console.log(`      👤 ${transfer.type === 'local' ? 'Vendedor' : 'Cliente'}: ${responsiblePerson}`);
      
      console.log(`      ⏱️ Tiempo pendiente: ${this.getTimeSince(transfer.createdAt)}`);

      totalPending += parseFloat(transfer.totalAmount || transfer.total || 0);
    });

    console.log('\n📊 RESUMEN DE TRANSFERENCIAS PENDIENTES:');
    console.log(`   💰 Monto total pendiente: Q${totalPending.toFixed(2)}`);
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

    if (!this.salesStats) {
      console.log('❌ No se pudieron cargar las estadísticas');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    // Estadísticas de productos
    if (this.salesStats.products) {
      console.log('\n📦 ESTADÍSTICAS DE INVENTARIO:');
      const p = this.salesStats.products;
      console.log(`   📦 Total productos: ${p.totalProducts || 0}`);
      console.log(`   ✅ Productos activos: ${p.activeProducts || 0}`);
      console.log(`   ⭐ Productos destacados: ${p.featuredProducts || 0}`);
      console.log(`   🔴 Sin stock: ${p.outOfStock || 0}`);
      console.log(`   🟡 Stock bajo: ${p.lowStock || 0}`);
      console.log(`   📊 Stock total: ${p.totalStock || 0} unidades`);
      console.log(`   💰 Precio promedio: Q${(p.averagePrice || 0).toFixed(2)}`);
      
      if (p.totalStock && p.averagePrice) {
        const inventoryValue = p.totalStock * p.averagePrice;
        console.log(`   💎 Valor total inventario: Q${inventoryValue.toFixed(2)}`);
      }
    }

    // Estadísticas de tienda
    if (this.salesStats.store) {
      console.log('\n🛒 ESTADÍSTICAS DE TIENDA:');
      const s = this.salesStats.store;
      Object.keys(s).forEach(key => {
        if (typeof s[key] === 'number') {
          console.log(`   📊 ${key}: ${s[key]}`);
        }
      });
    }

    // Estadísticas de órdenes
    if (this.salesStats.orders) {
      console.log('\n📦 ESTADÍSTICAS DE ÓRDENES ONLINE:');
      const o = this.salesStats.orders.summary || this.salesStats.orders;
      Object.keys(o).forEach(key => {
        if (typeof o[key] === 'number') {
          console.log(`   📊 ${key}: ${o[key]}`);
        }
      });
    }

    // Reporte diario
    if (this.salesStats.daily) {
      console.log('\n📈 REPORTE DIARIO:');
      const d = this.salesStats.daily;
      if (d.totalSales !== undefined) console.log(`   💰 Total ventas: Q${(d.totalSales || 0).toFixed(2)}`);
      if (d.completedSales !== undefined) console.log(`   ✅ Ventas completadas: ${d.completedSales || 0}`);
      if (d.pendingSales !== undefined) console.log(`   ⏳ Ventas pendientes: ${d.pendingSales || 0}`);
      if (d.cashAmount !== undefined) console.log(`   💵 Total efectivo: Q${(d.cashAmount || 0).toFixed(2)}`);
      if (d.transferAmount !== undefined) console.log(`   🏦 Total transferencias: Q${(d.transferAmount || 0).toFixed(2)}`);
    }

    // Estadísticas combinadas
    console.log('\n🔥 MÉTRICAS COMBINADAS:');
    const totalLocalSales = this.localSales.reduce((sum, sale) => 
      sum + parseFloat(sale.totalAmount || sale.total || 0), 0);
    const totalOnlineOrders = this.onlineOrders.reduce((sum, order) => 
      sum + parseFloat(order.totalAmount || order.total || 0), 0);
    const totalRevenue = totalLocalSales + totalOnlineOrders;

    console.log(`   💰 Total ventas locales: Q${totalLocalSales.toFixed(2)}`);
    console.log(`   💰 Total órdenes online: Q${totalOnlineOrders.toFixed(2)}`);
    console.log(`   💰 INGRESOS TOTALES: Q${totalRevenue.toFixed(2)}`);
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
      console.log(`      💰 Precio: Q${parseFloat(product.price).toFixed(2)}`);
      console.log(`      📦 Stock: ${product.stockQuantity} ${stockStatus.icon} ${stockStatus.text}`);
      console.log(`      💎 Valor en stock: Q${value.toFixed(2)}`);
      console.log(`      📂 Categoría: ${product.category?.name || 'N/A'}`);
      if (product.brand?.name) {
        console.log(`      🏷️ Marca: ${product.brand.name}`);
      }
    });

    if (this.availableProducts.length > 20) {
      console.log(`\n   ... y ${this.availableProducts.length - 20} productos más`);
    }

    console.log('\n📊 RESUMEN DE PRODUCTOS DISPONIBLES:');
    console.log(`   📦 Total productos con stock: ${this.availableProducts.length}`);
    console.log(`   🟡 Productos con stock bajo: ${lowStockCount}`);
    console.log(`   💎 Valor total disponible: Q${totalValue.toFixed(2)}`);

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ BUSCAR ESPECÍFICO - IMPLEMENTADO
  async searchSpecific() {
    console.log('\n🔍 BÚSQUEDA ESPECÍFICA');
    console.log('=' .repeat(50));
    console.log('1. Buscar por número de venta/orden');
    console.log('2. Buscar por cliente');
    console.log('3. Buscar por producto');
    console.log('4. Buscar por fecha');
    console.log('0. Volver');

    const choice = await this.askQuestion('\n🔍 Selecciona tipo de búsqueda: ');
    
    switch (choice.trim()) {
      case '1':
        await this.searchByNumber();
        break;
      case '2':
        await this.searchByCustomer();
        break;
      case '3':
        await this.searchByProduct();
        break;
      case '4':
        await this.searchByDate();
        break;
      case '0':
        return;
      default:
        console.log('❌ Opción inválida');
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async searchByNumber() {
    const searchTerm = await this.askQuestion('🔢 Ingresa número de venta/orden: ');
    if (!searchTerm.trim()) return;

    const results = [];

    // Buscar en ventas locales
    this.localSales.forEach(sale => {
      if ((sale.saleNumber || sale.id.toString()).includes(searchTerm)) {
        results.push({
          type: 'Local Sale',
          id: sale.saleNumber || sale.id,
          amount: parseFloat(sale.totalAmount || sale.total || 0),
          date: sale.createdAt,
          status: sale.status,
          customer: sale.customerName || 'N/A'
        });
      }
    });

    // Buscar en órdenes online
    this.onlineOrders.forEach(order => {
      if ((order.orderNumber || order.id.toString()).includes(searchTerm)) {
        results.push({
          type: 'Online Order',
          id: order.orderNumber || order.id,
          amount: parseFloat(order.totalAmount || order.total || 0),
          date: order.createdAt,
          status: order.status,
          customer: this.getCustomerInfo(order)
        });
      }
    });

    this.showSearchResults(results, `Número: ${searchTerm}`);
  }

  async searchByCustomer() {
    const searchTerm = await this.askQuestion('👤 Ingresa nombre del cliente: ');
    if (!searchTerm.trim()) return;

    const results = [];
    const lowerSearchTerm = searchTerm.toLowerCase();

    // Buscar en ventas locales
    this.localSales.forEach(sale => {
      const customerName = (sale.customerName || '').toLowerCase();
      if (customerName.includes(lowerSearchTerm)) {
        results.push({
          type: 'Local Sale',
          id: sale.saleNumber || sale.id,
          amount: parseFloat(sale.totalAmount || sale.total || 0),
          date: sale.createdAt,
          status: sale.status,
          customer: sale.customerName || 'N/A'
        });
      }
    });

    // Buscar en órdenes online
    this.onlineOrders.forEach(order => {
      const customerName = this.getCustomerInfo(order).toLowerCase();
      if (customerName.includes(lowerSearchTerm)) {
        results.push({
          type: 'Online Order',
          id: order.orderNumber || order.id,
          amount: parseFloat(order.totalAmount || order.total || 0),
          date: order.createdAt,
          status: order.status,
          customer: this.getCustomerInfo(order)
        });
      }
    });

    this.showSearchResults(results, `Cliente: ${searchTerm}`);
  }

  async searchByProduct() {
    const searchTerm = await this.askQuestion('📦 Ingresa nombre del producto: ');
    if (!searchTerm.trim()) return;

    const results = [];
    const lowerSearchTerm = searchTerm.toLowerCase();

    // Buscar en productos disponibles
    this.availableProducts.forEach(product => {
      if (product.name.toLowerCase().includes(lowerSearchTerm) || 
          product.sku.toLowerCase().includes(lowerSearchTerm)) {
        results.push({
          type: 'Product',
          id: product.sku,
          name: product.name,
          price: parseFloat(product.price),
          stock: product.stockQuantity,
          status: this.getStockStatus(product).text,
          category: product.category?.name || 'N/A'
        });
      }
    });

    console.log(`\n🔍 RESULTADOS DE BÚSQUEDA: ${searchTerm}`);
    console.log('=' .repeat(50));
    
    if (results.length === 0) {
      console.log('❌ No se encontraron productos');
      return;
    }

    results.forEach((result, index) => {
      console.log(`\n   ${index + 1}. ${result.name}`);
      console.log(`      🆔 SKU: ${result.id}`);
      console.log(`      💰 Precio: Q${result.price.toFixed(2)}`);
      console.log(`      📦 Stock: ${result.stock} - ${result.status}`);
      console.log(`      📂 Categoría: ${result.category}`);
    });
  }

  async searchByDate() {
    const dateStr = await this.askQuestion('📅 Ingresa fecha (YYYY-MM-DD): ');
    if (!dateStr.trim()) return;

    try {
      const searchDate = new Date(dateStr);
      const results = [];

      // Buscar ventas locales
      this.localSales.forEach(sale => {
        const saleDate = new Date(sale.createdAt);
        if (saleDate.toDateString() === searchDate.toDateString()) {
          results.push({
            type: 'Local Sale',
            id: sale.saleNumber || sale.id,
            amount: parseFloat(sale.totalAmount || sale.total || 0),
            date: sale.createdAt,
            status: sale.status,
            customer: sale.customerName || 'N/A'
          });
        }
      });

      // Buscar órdenes online
      this.onlineOrders.forEach(order => {
        const orderDate = new Date(order.createdAt);
        if (orderDate.toDateString() === searchDate.toDateString()) {
          results.push({
            type: 'Online Order',
            id: order.orderNumber || order.id,
            amount: parseFloat(order.totalAmount || order.total || 0),
            date: order.createdAt,
            status: order.status,
            customer: this.getCustomerInfo(order)
          });
        }
      });

      this.showSearchResults(results, `Fecha: ${dateStr}`);
    } catch (error) {
      console.log('❌ Formato de fecha inválido');
    }
  }

  showSearchResults(results, searchTerm) {
    console.log(`\n🔍 RESULTADOS DE BÚSQUEDA: ${searchTerm}`);
    console.log('=' .repeat(50));
    
    if (results.length === 0) {
      console.log('❌ No se encontraron resultados');
      return;
    }

    let totalAmount = 0;
    results.forEach((result, index) => {
      console.log(`\n   ${index + 1}. ${result.type} #${result.id}`);
      console.log(`      💰 Monto: Q${result.amount.toFixed(2)}`);
      console.log(`      📅 Fecha: ${new Date(result.date).toLocaleString()}`);
      console.log(`      📊 Estado: ${this.getStatusIcon(result.status)} ${result.status}`);
      console.log(`      👤 Cliente: ${result.customer}`);
      totalAmount += result.amount;
    });

    console.log(`\n📊 RESUMEN: ${results.length} resultados, Total: Q${totalAmount.toFixed(2)}`);
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
    
    console.log(`\n✅ Confirmando ${transfer.type} #${transfer.saleNumber || transfer.orderNumber || transfer.id}`);
    console.log(`   💰 Monto: Q${parseFloat(transfer.totalAmount || transfer.total || 0).toFixed(2)}`);
    console.log(`   🏦 Referencia: ${transfer.bankReference || 'N/A'}`);

    const notes = await this.askQuestion('📝 Notas adicionales (opcional): ');
    const confirm = await this.askQuestion('✅ ¿Confirmar esta transferencia? (s/n): ');

    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Confirmación cancelada');
      return;
    }

    try {
      let endpoint;
      let requestData;

      if (transfer.type === 'local') {
        endpoint = `/api/local-sales/${transfer.id}/confirm-transfer`;
        requestData = {
          notes: notes || 'Confirmada desde gestor'
        };
      } else {
        endpoint = `/api/order-management/${transfer.id}/confirm-transfer`;
        requestData = {
          voucherDetails: transfer.transferVoucher || 'Transferencia confirmada',
          bankReference: transfer.bankReference,
          notes: notes || 'Confirmada desde gestor'
        };
      }

      const response = await axios.post(`${this.baseURL}${endpoint}`, requestData, {
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

  // ✅ GENERAR REPORTES - IMPLEMENTADO
  async generateReports() {
    console.log('\n📈 GENERAR REPORTES POR FECHA');
    console.log('=' .repeat(60));
    console.log('1. Reporte diario específico');
    console.log('2. Reporte semanal');
    console.log('3. Reporte mensual');
    console.log('4. Reporte personalizado (rango de fechas)');
    console.log('0. Volver');

    const choice = await this.askQuestion('\n📈 Selecciona tipo de reporte: ');
    
    switch (choice.trim()) {
      case '1':
        await this.generateDailyReport();
        break;
      case '2':
        await this.generateWeeklyReport();
        break;
      case '3':
        await this.generateMonthlyReport();
        break;
      case '4':
        await this.generateCustomReport();
        break;
      case '0':
        return;
      default:
        console.log('❌ Opción inválida');
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async generateDailyReport() {
    const dateStr = await this.askQuestion('📅 Fecha del reporte (YYYY-MM-DD, Enter para hoy): ');
    const reportDate = dateStr.trim() || new Date().toISOString().split('T')[0];

    try {
      const response = await axios.get(`${this.baseURL}/api/local-sales/reports/daily`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { date: reportDate }
      });

      if (response.data.success) {
        const report = response.data.data;
        console.log(`\n📊 REPORTE DIARIO - ${reportDate}`);
        console.log('=' .repeat(50));
        console.log(`   📊 Total ventas: ${report.totalSales || 0}`);
        console.log(`   ✅ Completadas: ${report.completedSales || 0}`);
        console.log(`   ⏳ Pendientes: ${report.pendingSales || 0}`);
        console.log(`   💰 Total monto: Q${(report.totalAmount || 0).toFixed(2)}`);
        console.log(`   💵 Efectivo: Q${(report.cashAmount || 0).toFixed(2)}`);
        console.log(`   🏦 Transferencias: Q${(report.transferAmount || 0).toFixed(2)}`);
        console.log(`   ⏳ Pendiente confirmación: Q${(report.pendingAmount || 0).toFixed(2)}`);
      } else {
        console.log('❌ No se pudo generar el reporte diario');
      }
    } catch (error) {
      console.error('❌ Error generando reporte:', error.response?.data?.message || error.message);
    }
  }

  async generateWeeklyReport() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    await this.generateDateRangeReport(startDate, endDate, 'SEMANAL');
  }

  async generateMonthlyReport() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - 1);

    await this.generateDateRangeReport(startDate, endDate, 'MENSUAL');
  }

  async generateCustomReport() {
    const startDateStr = await this.askQuestion('📅 Fecha inicio (YYYY-MM-DD): ');
    const endDateStr = await this.askQuestion('📅 Fecha fin (YYYY-MM-DD): ');

    if (!startDateStr.trim() || !endDateStr.trim()) {
      console.log('❌ Fechas requeridas');
      return;
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    await this.generateDateRangeReport(startDate, endDate, 'PERSONALIZADO');
  }

  async generateDateRangeReport(startDate, endDate, type) {
    console.log(`\n📊 REPORTE ${type}`);
    console.log('=' .repeat(50));
    console.log(`   📅 Desde: ${startDate.toLocaleDateString()}`);
    console.log(`   📅 Hasta: ${endDate.toLocaleDateString()}`);

    // Filtrar ventas locales
    const localSalesInRange = this.localSales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= startDate && saleDate <= endDate;
    });

    // Filtrar órdenes online
    const onlineOrdersInRange = this.onlineOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });

    // Calcular totales
    const localTotal = localSalesInRange.reduce((sum, sale) => 
      sum + parseFloat(sale.totalAmount || sale.total || 0), 0);
    const onlineTotal = onlineOrdersInRange.reduce((sum, order) => 
      sum + parseFloat(order.totalAmount || order.total || 0), 0);

    console.log('\n💰 VENTAS LOCALES:');
    console.log(`   📊 Cantidad: ${localSalesInRange.length}`);
    console.log(`   💰 Total: Q${localTotal.toFixed(2)}`);

    console.log('\n📦 ÓRDENES ONLINE:');
    console.log(`   📊 Cantidad: ${onlineOrdersInRange.length}`);
    console.log(`   💰 Total: Q${onlineTotal.toFixed(2)}`);

    console.log('\n🔥 TOTALES COMBINADOS:');
    console.log(`   📊 Total transacciones: ${localSalesInRange.length + onlineOrdersInRange.length}`);
    console.log(`   💰 Total ingresos: Q${(localTotal + onlineTotal).toFixed(2)}`);
  }

  // ✅ ACTUALIZAR ESTADO DE ÓRDENES - IMPLEMENTADO
  async updateOrderStatus() {
    console.log('\n🔧 ACTUALIZAR ESTADOS DE ÓRDENES');
    console.log('=' .repeat(60));

    if (this.onlineOrders.length === 0) {
      console.log('❌ No hay órdenes para actualizar');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    console.log('\n📦 ÓRDENES DISPONIBLES PARA ACTUALIZAR:');
    this.onlineOrders.slice(0, 10).forEach((order, index) => {
      console.log(`   ${index + 1}. Orden #${order.orderNumber || order.id} - ${order.status} - Q${parseFloat(order.totalAmount || 0).toFixed(2)}`);
    });

    const orderChoice = await this.askQuestion('\n📦 Número de orden a actualizar (0 para cancelar): ');
    const orderIndex = parseInt(orderChoice) - 1;

    if (orderChoice === '0') return;

    if (orderIndex < 0 || orderIndex >= this.onlineOrders.length) {
      console.log('❌ Número de orden inválido');
      return;
    }

    const order = this.onlineOrders[orderIndex];
    
    console.log('\n📊 ESTADOS DISPONIBLES:');
    const validStatuses = [
      'pending', 'confirmed', 'preparing', 'ready_pickup', 
      'packed', 'shipped', 'delivered', 'picked_up', 'cancelled'
    ];
    
    validStatuses.forEach((status, index) => {
      console.log(`   ${index + 1}. ${status}`);
    });

    const statusChoice = await this.askQuestion('\n📊 Selecciona nuevo estado (número): ');
    const statusIndex = parseInt(statusChoice) - 1;

    if (statusIndex < 0 || statusIndex >= validStatuses.length) {
      console.log('❌ Estado inválido');
      return;
    }

    const newStatus = validStatuses[statusIndex];
    const notes = await this.askQuestion('📝 Notas (opcional): ');
    const confirm = await this.askQuestion(`✅ ¿Cambiar estado a "${newStatus}"? (s/n): `);

    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Actualización cancelada');
      return;
    }

    try {
      const response = await axios.patch(`${this.baseURL}/api/order-management/${order.id}/status`, {
        status: newStatus,
        notes: notes || `Estado actualizado desde gestor a ${newStatus}`
      }, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      if (response.data.success) {
        console.log('✅ Estado actualizado exitosamente');
        
        // Actualizar en la lista local
        order.status = newStatus;
        
      } else {
        console.log('❌ Error actualizando estado:', response.data.message);
      }
    } catch (error) {
      console.error('❌ Error actualizando estado:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ PROBAR CONECTIVIDAD - NUEVO
  async testConnectivity() {
    console.log('\n🧪 PROBANDO CONECTIVIDAD DE RUTAS');
    console.log('=' .repeat(60));

    const routes = [
      { name: 'Ventas Locales', url: '/api/local-sales/', method: 'GET' },
      { name: 'Órdenes Online', url: '/api/store/management/orders', method: 'GET' },
      { name: 'Productos', url: '/api/store/management/products', method: 'GET' },
      { name: 'Transferencias Locales', url: '/api/local-sales/pending-transfers', method: 'GET' },
      { name: 'Dashboard Tienda', url: '/api/store/management/dashboard', method: 'GET' },
      { name: 'Dashboard Órdenes', url: '/api/order-management/dashboard', method: 'GET' },
      { name: 'Estadísticas Productos', url: '/api/store/management/products/stats', method: 'GET' },
      { name: 'Reporte Diario', url: '/api/local-sales/reports/daily', method: 'GET' }
    ];

    for (const route of routes) {
      try {
        console.log(`\n🔍 Probando: ${route.name}`);
        const response = await axios({
          method: route.method,
          url: `${this.baseURL}${route.url}`,
          headers: { 'Authorization': `Bearer ${this.adminToken}` },
          params: { limit: 1 },
          timeout: 5000
        });

        if (response.status === 200) {
          console.log(`   ✅ ${route.name}: OK (${response.status})`);
          if (response.data.data) {
            const dataKeys = Object.keys(response.data.data);
            console.log(`   📊 Datos disponibles: ${dataKeys.join(', ')}`);
          }
        } else {
          console.log(`   ⚠️ ${route.name}: Status ${response.status}`);
        }
      } catch (error) {
        if (error.response) {
          console.log(`   ❌ ${route.name}: ${error.response.status} - ${error.response.statusText}`);
        } else if (error.code === 'ECONNREFUSED') {
          console.log(`   ❌ ${route.name}: Conexión rechazada`);
        } else {
          console.log(`   ❌ ${route.name}: ${error.message}`);
        }
      }
    }

    console.log('\n🧪 Prueba de conectividad completada');
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

  getCustomerInfo(order) {
    if (order.user && (order.user.firstName || order.user.lastName)) {
      return `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim();
    } else if (order.customerInfo && order.customerInfo.name) {
      return order.customerInfo.name;
    } else if (order.customerName) {
      return order.customerName;
    } else if (order.customer && order.customer.name) {
      return order.customer.name;
    } else {
      return 'Cliente anónimo';
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
        console.log('💳 Métodos: all, cash, transfer');
        this.currentFilters.paymentMethod = await this.askQuestion('💳 Método de pago: ') || 'all';
        break;
      case '3':
        console.log('📊 Estados: all, pending, completed, cancelled, transfer_pending');
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
  console.log('\n💰 Elite Fitness Club - Gestor Completo de Ventas y Órdenes v2.0 (CORREGIDO)\n');
  
  console.log('🎯 CARACTERÍSTICAS:');
  console.log('  💰 Gestión completa de ventas locales');
  console.log('  📦 Administración de órdenes online');
  console.log('  ⏳ Control de transferencias pendientes');
  console.log('  📊 Estadísticas y métricas completas');
  console.log('  🔧 Herramientas de gestión y confirmación');
  console.log('  🔍 Búsquedas avanzadas y reportes');
  console.log('  🧪 Diagnóstico de conectividad\n');
  
  console.log('📋 FUNCIONALIDADES IMPLEMENTADAS:');
  console.log('  ✅ Ver ventas con filtros por fecha/método/estado');
  console.log('  ✅ Gestionar órdenes de página web');
  console.log('  ✅ Confirmar transferencias pendientes');
  console.log('  ✅ Estadísticas completas del sistema');
  console.log('  ✅ Control de productos disponibles');
  console.log('  ✅ Búsquedas por número, cliente, producto, fecha');
  console.log('  ✅ Reportes diarios, semanales, mensuales');
  console.log('  ✅ Actualización de estados de órdenes');
  console.log('  ✅ Prueba de conectividad de todas las rutas\n');
  
  console.log('💰 TIPOS DE VENTAS SOPORTADAS:');
  console.log('  💵 Ventas locales en efectivo');
  console.log('  🏦 Ventas locales por transferencia');
  console.log('  📦 Órdenes online para entrega');
  console.log('  🏪 Órdenes online para recogida');
  console.log('  ⚡ Órdenes express\n');
  
  console.log('🔧 RUTAS CORREGIDAS:');
  console.log('  /api/local-sales/ - Ventas locales');
  console.log('  /api/store/management/orders - Órdenes online');
  console.log('  /api/store/management/products - Productos');
  console.log('  /api/local-sales/pending-transfers - Transferencias locales');
  console.log('  /api/order-management/* - Gestión de órdenes\n');
  
  console.log('🚀 USO:');
  console.log('  node test-sales-orders-manager-FIXED-COMPLETE.js        # Gestor interactivo');
  console.log('  node test-sales-orders-manager-FIXED-COMPLETE.js --help # Esta ayuda\n');
  
  console.log('📋 REQUISITOS:');
  console.log('  • Servidor corriendo en puerto 5000');
  console.log('  • Usuario admin: admin@gym.com / Admin123!');
  console.log('  • Rutas de ventas y órdenes configuradas');
  console.log('  • Base de datos con datos de prueba\n');
  
  console.log('💡 El gestor v2.0 incluye todas las funcionalidades');
  console.log('   corregidas y rutas actualizadas para un control');
  console.log('   total del sistema de ventas y órdenes.');
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