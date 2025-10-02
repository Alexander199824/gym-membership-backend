// test-online-orders-flow-manager.js - GESTOR DE ÓRDENES 100% FUNCIONAL
const axios = require('axios');
const readline = require('readline');
require('dotenv').config();

class OnlineOrdersFlowManager {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.adminToken = null;
    this.orders = [];
    this.currentOrder = null;
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // ✅ FLUJOS CORREGIDOS según OrderManagementController
    this.flows = {
      pickup: [
        { status: 'pending', label: '⏳ Pendiente' },
        { status: 'confirmed', label: '✅ Confirmada' },
        { status: 'preparing', label: '👨‍🍳 Preparando' },
        { status: 'ready_pickup', label: '📦 Lista para Recoger' },
        { status: 'picked_up', label: '✅ Recogida' }
      ],
      delivery: [
        { status: 'pending', label: '⏳ Pendiente' },
        { status: 'confirmed', label: '✅ Confirmada' },
        { status: 'preparing', label: '👨‍🍳 Preparando' },
        { status: 'packed', label: '📦 Empacada' },
        { status: 'shipped', label: '🚚 Enviada' },
        { status: 'delivered', label: '✅ Entregada' }
      ],
      express: [
        { status: 'pending', label: '⏳ Pendiente' },
        { status: 'confirmed', label: '✅ Confirmada' },
        { status: 'preparing', label: '⚡ Preparando Express' },
        { status: 'packed', label: '📦 Empacada' },
        { status: 'shipped', label: '🚀 Enviada Express' },
        { status: 'delivered', label: '✅ Entregada' }
      ]
    };

    // ✅ TRANSICIONES VÁLIDAS (según OrderManagementController)
    this.validTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['preparing', 'cancelled'],
      'preparing': {
        'pickup': ['ready_pickup', 'cancelled'],
        'delivery': ['packed', 'cancelled'],
        'express': ['packed', 'cancelled']
      },
      'ready_pickup': ['picked_up', 'cancelled'],
      'packed': ['shipped', 'cancelled'],
      'shipped': ['delivered', 'cancelled'],
      'delivered': ['refunded'],
      'picked_up': ['refunded'],
      'cancelled': [],
      'refunded': []
    };
  }

  async start() {
    console.log('📦 Elite Fitness Club - Gestor de Órdenes Online v2.0');
    console.log('='.repeat(85));
    console.log('🎯 Sistema de gestión completo con validaciones del servidor');
    console.log('✅ Flujos validados según OrderManagementController\n');
    
    try {
      await this.loginAdmin();
      await this.loadOrders();
      await this.showMainMenu();
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      if (error.response) {
        console.error('📋 Status:', error.response.status);
        console.error('📋 Mensaje:', error.response.data?.message);
        if (error.response.data?.errors) {
          console.error('📋 Errores:', JSON.stringify(error.response.data.errors, null, 2));
        }
      }
    } finally {
      this.rl.close();
    }
  }

  async loginAdmin() {
    console.log('1. 🔐 Autenticando...');
    
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

  async loadOrders(filters = {}) {
    console.log('\n2. 📦 Cargando órdenes...');
    
    try {
      const params = { limit: 100, ...filters };
      
      const response = await axios.get(`${this.baseURL}/api/store/management/orders`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params
      });

      if (response.data.success && response.data.data?.orders) {
        this.orders = response.data.data.orders;
        const stats = this.getOrdersStats();
        console.log(`   ✅ ${this.orders.length} órdenes cargadas`);
        console.log(`   📊 Pendientes: ${stats.pending} | En proceso: ${stats.inProgress} | Completadas: ${stats.completed}`);
      } else {
        this.orders = [];
        console.log('   ⚠️ No se encontraron órdenes');
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.response?.data?.message || error.message}`);
      this.orders = [];
    }
  }

  async showMainMenu() {
    console.log('\n📦 MENÚ PRINCIPAL');
    console.log('='.repeat(70));
    console.log('1. 📋 Ver todas las órdenes');
    console.log('2. 🔍 Filtrar por estado/tipo');
    console.log('3. 🎯 Procesar orden específica');
    console.log('4. ⚡ Confirmar todas las pendientes');
    console.log('5. 📊 Ver estadísticas');
    console.log('6. 🔄 Recargar órdenes');
    console.log('0. 🚪 Salir');
    
    const choice = await this.askQuestion('\n📦 Opción (0-6): ');
    
    switch (choice.trim()) {
      case '1':
        await this.showAllOrders();
        break;
      case '2':
        await this.filterOrders();
        break;
      case '3':
        await this.selectAndProcessOrder();
        break;
      case '4':
        await this.quickConfirmAll();
        break;
      case '5':
        await this.showDetailedStats();
        break;
      case '6':
        await this.loadOrders();
        break;
      case '0':
        console.log('\n👋 ¡Hasta luego!');
        return;
      default:
        console.log('\n❌ Opción inválida');
    }
    
    await this.showMainMenu();
  }

  async showAllOrders() {
    console.log('\n📋 TODAS LAS ÓRDENES');
    console.log('='.repeat(80));
    
    if (this.orders.length === 0) {
      console.log('❌ No hay órdenes');
      await this.askQuestion('\n⏎ Enter para continuar...');
      return;
    }

    const grouped = {
      pickup: this.orders.filter(o => o.deliveryType === 'pickup'),
      delivery: this.orders.filter(o => o.deliveryType === 'delivery'),
      express: this.orders.filter(o => o.deliveryType === 'express')
    };

    for (const [type, typeOrders] of Object.entries(grouped)) {
      if (typeOrders.length > 0) {
        console.log(`\n🚚 ${type.toUpperCase()} (${typeOrders.length}):`);
        console.log('─'.repeat(80));
        
        typeOrders.forEach((order, index) => {
          const nextStep = this.getNextStep(order);
          console.log(`\n   ${index + 1}. #${order.orderNumber}`);
          console.log(`      📊 Estado: ${this.getStatusIcon(order.status)} ${order.status}`);
          console.log(`      💰 Total: Q${parseFloat(order.totalAmount || 0).toFixed(2)}`);
          console.log(`      👤 Cliente: ${this.getCustomerInfo(order)}`);
          console.log(`      📅 Fecha: ${new Date(order.createdAt).toLocaleString()}`);
          if (nextStep) {
            console.log(`      ➡️ Siguiente: ${nextStep.label}`);
          }
        });
      }
    }

    await this.askQuestion('\n⏎ Enter para continuar...');
  }

  async filterOrders() {
    console.log('\n🔍 FILTRAR ÓRDENES');
    console.log('='.repeat(50));
    console.log('1. Por estado');
    console.log('2. Por tipo de entrega');
    console.log('3. Que requieren acción');
    console.log('0. Volver');

    const choice = await this.askQuestion('\n🔍 Opción: ');
    
    switch (choice.trim()) {
      case '1':
        const status = await this.askQuestion('📊 Estado (pending/confirmed/preparing/etc): ');
        await this.loadOrders({ status: status.trim() });
        await this.showAllOrders();
        break;
      case '2':
        const type = await this.askQuestion('🚚 Tipo (pickup/delivery/express): ');
        await this.loadOrders({ deliveryType: type.trim() });
        await this.showAllOrders();
        break;
      case '3':
        await this.showActionableOrders();
        break;
    }
  }

  async showActionableOrders() {
    const actionable = this.orders.filter(o => 
      !['delivered', 'picked_up', 'cancelled', 'refunded'].includes(o.status)
    );

    if (actionable.length === 0) {
      console.log('\n✅ No hay órdenes que requieran acción');
      await this.askQuestion('\n⏎ Enter...');
      return;
    }

    console.log(`\n⚠️ ${actionable.length} ÓRDENES REQUIEREN ACCIÓN:`);
    actionable.forEach((order, i) => {
      const next = this.getNextStep(order);
      console.log(`\n   ${i + 1}. #${order.orderNumber}`);
      console.log(`      Estado: ${order.status} → ${next?.label || 'Final'}`);
      console.log(`      Tipo: ${order.deliveryType}`);
    });

    const process = await this.askQuestion('\n🚀 ¿Procesar en lote? (s/n): ');
    if (process.toLowerCase() === 's') {
      await this.processOrdersBatch(actionable);
    }
  }

  async selectAndProcessOrder() {
    console.log('\n🎯 SELECCIONAR ORDEN');
    console.log('='.repeat(60));

    if (this.orders.length === 0) {
      console.log('❌ No hay órdenes');
      await this.askQuestion('\n⏎ Enter...');
      return;
    }

    this.orders.slice(0, 20).forEach((order, i) => {
      console.log(`   ${i + 1}. #${order.orderNumber} - ${order.status} - ${order.deliveryType} - Q${parseFloat(order.totalAmount || 0).toFixed(2)}`);
    });

    const choice = await this.askQuestion('\n📦 Número (0=cancelar): ');
    const index = parseInt(choice) - 1;

    if (choice === '0' || index < 0 || index >= this.orders.length) {
      return;
    }

    this.currentOrder = this.orders[index];
    await this.processOrderFlow();
  }

  async processOrderFlow() {
    const order = this.currentOrder;
    const flow = this.flows[order.deliveryType];

    if (!flow) {
      console.log('❌ Tipo de entrega no válido');
      return;
    }

    console.log(`\n🔄 PROCESANDO #${order.orderNumber}`);
    console.log('='.repeat(70));
    this.showOrderDetails(order);
    this.showFlowDiagram(order.deliveryType, order.status);

    console.log('\n🎯 OPCIONES:');
    console.log('1. Avanzar al siguiente estado');
    console.log('2. Ejecutar flujo automático completo');
    console.log('3. Cancelar orden');
    console.log('0. Volver');

    const choice = await this.askQuestion('\n🔄 Opción: ');

    switch (choice.trim()) {
      case '1':
        await this.advanceToNextState(order);
        break;
      case '2':
        await this.executeFullFlowAuto(order);
        break;
      case '3':
        await this.cancelOrder(order);
        break;
    }

    await this.askQuestion('\n⏎ Enter...');
  }

  async advanceToNextState(order) {
    const nextStep = this.getNextStep(order);

    if (!nextStep) {
      console.log('✅ Orden en estado final');
      return;
    }

    // ✅ VALIDAR TRANSICIÓN ANTES DE ENVIAR
    if (!this.isValidTransition(order.status, nextStep.status, order.deliveryType)) {
      console.log(`❌ Transición inválida: ${order.status} → ${nextStep.status}`);
      return;
    }

    console.log(`\n🔄 Avanzando #${order.orderNumber}`);
    console.log(`   ${this.getStatusIcon(order.status)} ${order.status} → ${this.getStatusIcon(nextStep.status)} ${nextStep.status}`);

    const confirm = await this.askQuestion('\n✅ ¿Confirmar? (s/n): ');
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Cancelado');
      return;
    }

    await this.updateOrderStatus(order, nextStep.status);
    order.status = nextStep.status;
    
    console.log('✅ Actualizado');
    this.showOrderDetails(order);
  }

  async executeFullFlowAuto(order) {
    console.log(`\n🤖 FLUJO AUTOMÁTICO`);
    console.log('='.repeat(60));

    const flow = this.flows[order.deliveryType];
    const currentIndex = flow.findIndex(s => s.status === order.status);

    if (currentIndex === -1 || currentIndex === flow.length - 1) {
      console.log('⚠️ Orden en estado final o inválido');
      return;
    }

    console.log(`📊 Progreso: ${currentIndex + 1}/${flow.length}`);
    console.log(`🎯 Pasos restantes: ${flow.length - currentIndex - 1}`);

    const confirm = await this.askQuestion('\n⚠️ ¿Ejecutar automático? (s/n): ');
    if (confirm.toLowerCase() !== 's') {
      return;
    }

    for (let i = currentIndex; i < flow.length - 1; i++) {
      const nextStep = flow[i + 1];
      
      console.log(`\n🔄 ${flow[i].status} → ${nextStep.status}`);
      
      await this.updateOrderStatus(order, nextStep.status);
      order.status = nextStep.status;
      
      await this.sleep(1000);
    }

    console.log('\n🎉 ¡COMPLETADO!');
    this.showOrderDetails(order);
  }

  async cancelOrder(order) {
    console.log(`\n⚠️ CANCELAR #${order.orderNumber}`);
    
    const reason = await this.askQuestion('📝 Motivo: ');
    if (!reason.trim()) {
      console.log('❌ Se requiere motivo');
      return;
    }

    const confirm = await this.askQuestion('\n⚠️ ¿CONFIRMAR CANCELACIÓN? (SI): ');
    if (confirm !== 'SI') {
      return;
    }

    await this.updateOrderStatus(order, 'cancelled', `Cancelada: ${reason}`);
    order.status = 'cancelled';
    console.log('✅ Orden cancelada');
  }

  async processOrdersBatch(orders) {
    console.log(`\n🚀 Procesando ${orders.length} órdenes...`);
    
    let success = 0;
    let failed = 0;

    for (const order of orders) {
      try {
        const nextStep = this.getNextStep(order);
        if (nextStep && this.isValidTransition(order.status, nextStep.status, order.deliveryType)) {
          console.log(`   🔄 #${order.orderNumber}: ${order.status} → ${nextStep.status}`);
          await this.updateOrderStatus(order, nextStep.status);
          order.status = nextStep.status;
          success++;
          await this.sleep(500);
        }
      } catch (error) {
        console.error(`   ❌ #${order.orderNumber}: ${error.message}`);
        failed++;
      }
    }

    console.log(`\n📊 RESULTADO: ✅ ${success} exitosas | ❌ ${failed} fallidas`);
    await this.askQuestion('\n⏎ Enter...');
  }

  async quickConfirmAll() {
    const pending = this.orders.filter(o => o.status === 'pending');

    if (pending.length === 0) {
      console.log('\n✅ No hay órdenes pendientes');
      await this.askQuestion('\n⏎ Enter...');
      return;
    }

    console.log(`\n🚀 CONFIRMACIÓN RÁPIDA`);
    console.log(`⚠️ Se confirmarán ${pending.length} órdenes`);

    const confirm = await this.askQuestion('\n⚠️ ¿CONFIRMAR TODAS? (SI): ');
    if (confirm !== 'SI') {
      return;
    }

    await this.processOrdersBatch(pending);
    await this.loadOrders();
  }

  async showDetailedStats() {
    console.log('\n📊 ESTADÍSTICAS DETALLADAS');
    console.log('='.repeat(70));

    const stats = this.getDetailedStats();

    console.log('\n📈 POR ESTADO:');
    Object.entries(stats.byStatus).forEach(([status, count]) => {
      console.log(`   ${this.getStatusIcon(status)} ${status}: ${count}`);
    });

    console.log('\n🚚 POR TIPO:');
    Object.entries(stats.byDeliveryType).forEach(([type, data]) => {
      console.log(`   ${type}: ${data.count} órdenes - Q${data.total.toFixed(2)}`);
    });

    console.log('\n💰 FINANCIERO:');
    console.log(`   Total: Q${stats.totalAmount.toFixed(2)}`);
    console.log(`   Promedio: Q${stats.averageAmount.toFixed(2)}`);
    console.log(`   Pendiente: Q${stats.pendingAmount.toFixed(2)}`);

    console.log('\n⚡ RENDIMIENTO:');
    console.log(`   Completadas: ${stats.completed}/${this.orders.length} (${stats.completionRate.toFixed(1)}%)`);

    await this.askQuestion('\n⏎ Enter...');
  }

  // ✅ ACTUALIZAR CON VALIDACIÓN MEJORADA
  async updateOrderStatus(order, newStatus, notes = '') {
    try {
      // ✅ Construir payload simple
      const payload = {
        status: newStatus,
        notes: notes || `Actualizado a ${newStatus}`
      };

      console.log(`   📤 Enviando actualización...`);

      const response = await axios.patch(
        `${this.baseURL}/api/order-management/${order.id}/status`,
        payload,
        { 
          headers: { 'Authorization': `Bearer ${this.adminToken}` },
          validateStatus: () => true // Capturar todos los códigos
        }
      );

      if (response.status === 200 && response.data.success) {
        console.log(`   ✅ Actualizado`);
        return response.data;
      } else {
        // Mostrar error detallado
        console.error(`\n   ❌ ERROR (${response.status}):`);
        console.error(`   Mensaje: ${response.data.message}`);
        
        if (response.data.errors) {
          console.error(`   Errores de validación:`);
          response.data.errors.forEach((err, i) => {
            console.error(`      ${i + 1}. Campo: ${err.field || err.path || 'desconocido'}`);
            console.error(`         ${err.message || err.msg}`);
          });
        }
        
        throw new Error(response.data.message || 'Error actualizando orden');
      }
    } catch (error) {
      if (error.response) {
        console.error(`\n   ❌ ERROR HTTP ${error.response.status}`);
        console.error(`   URL: ${error.response.config.url}`);
        console.error(`   Mensaje: ${error.response.data?.message}`);
      } else {
        console.error(`\n   ❌ ERROR: ${error.message}`);
      }
      throw error;
    }
  }

  // ✅ VALIDAR TRANSICIÓN LOCALMENTE
  isValidTransition(currentStatus, newStatus, deliveryType) {
    const transitions = this.validTransitions[currentStatus];
    
    if (!transitions) return false;
    
    // Si preparing tiene subcategorías por tipo
    if (currentStatus === 'preparing' && typeof transitions === 'object') {
      return transitions[deliveryType]?.includes(newStatus) || false;
    }
    
    return Array.isArray(transitions) && transitions.includes(newStatus);
  }

  getNextStep(order) {
    const flow = this.flows[order.deliveryType];
    if (!flow) return null;
    
    const currentIndex = flow.findIndex(s => s.status === order.status);
    if (currentIndex === -1 || currentIndex === flow.length - 1) return null;
    
    return { ...flow[currentIndex + 1], icon: this.getStatusIcon(flow[currentIndex + 1].status) };
  }

  showFlowDiagram(deliveryType, currentStatus) {
    const flow = this.flows[deliveryType];
    
    console.log(`\n📊 FLUJO ${deliveryType.toUpperCase()}:`);
    console.log('─'.repeat(70));
    
    flow.forEach((step, i) => {
      const current = step.status === currentStatus ? ' ⬅️ ACTUAL' : '';
      const arrow = i < flow.length - 1 ? ' ➜' : '';
      console.log(`   ${step.label}${arrow}${current}`);
    });
    
    console.log('─'.repeat(70));
  }

  showOrderDetails(order) {
    console.log('\n📦 DETALLES:');
    console.log('┌' + '─'.repeat(68) + '┐');
    console.log(`│ #${order.orderNumber}`.padEnd(69) + '│');
    console.log(`│ Estado: ${this.getStatusIcon(order.status)} ${order.status}`.padEnd(69) + '│');
    console.log(`│ Tipo: ${order.deliveryType}`.padEnd(69) + '│');
    console.log(`│ Total: Q${parseFloat(order.totalAmount || 0).toFixed(2)}`.padEnd(69) + '│');
    console.log(`│ Cliente: ${this.getCustomerInfo(order)}`.padEnd(69) + '│');
    console.log('└' + '─'.repeat(68) + '┘');
  }

  getOrdersStats() {
    return {
      pending: this.orders.filter(o => o.status === 'pending').length,
      inProgress: this.orders.filter(o => !['pending', 'delivered', 'picked_up', 'cancelled'].includes(o.status)).length,
      completed: this.orders.filter(o => ['delivered', 'picked_up'].includes(o.status)).length
    };
  }

  getDetailedStats() {
    const stats = {
      byStatus: {},
      byDeliveryType: {},
      totalAmount: 0,
      averageAmount: 0,
      pendingAmount: 0,
      completed: 0,
      completionRate: 0
    };

    this.orders.forEach(order => {
      stats.byStatus[order.status] = (stats.byStatus[order.status] || 0) + 1;
      
      if (!stats.byDeliveryType[order.deliveryType]) {
        stats.byDeliveryType[order.deliveryType] = { count: 0, total: 0 };
      }
      stats.byDeliveryType[order.deliveryType].count++;
      stats.byDeliveryType[order.deliveryType].total += parseFloat(order.totalAmount || 0);
      
      const amount = parseFloat(order.totalAmount || 0);
      stats.totalAmount += amount;
      
      if (order.status === 'pending') stats.pendingAmount += amount;
      if (['delivered', 'picked_up'].includes(order.status)) stats.completed++;
    });

    stats.averageAmount = this.orders.length > 0 ? stats.totalAmount / this.orders.length : 0;
    stats.completionRate = this.orders.length > 0 ? (stats.completed / this.orders.length) * 100 : 0;

    return stats;
  }

  getStatusIcon(status) {
    const icons = {
      'pending': '⏳', 'confirmed': '✅', 'preparing': '👨‍🍳',
      'ready_pickup': '📦', 'picked_up': '✅', 'packed': '📦',
      'shipped': '🚚', 'delivered': '✅', 'cancelled': '❌'
    };
    return icons[status] || '❓';
  }

  getCustomerInfo(order) {
    if (order.user?.firstName) {
      return `${order.user.firstName} ${order.user.lastName || ''}`.trim();
    }
    if (order.customerInfo?.name) return order.customerInfo.name;
    return 'Cliente anónimo';
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  askQuestion(question) {
    return new Promise(resolve => {
      this.rl.question(question, answer => resolve(answer));
    });
  }
}

async function main() {
  const manager = new OnlineOrdersFlowManager();
  await manager.start();
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n🚨 ERROR CRÍTICO:', error.message);
    process.exit(1);
  });
}

module.exports = { OnlineOrdersFlowManager };