// test-online-orders-manager.js - GESTOR COMPLETO DE PEDIDOS ONLINE
// Elite Fitness - Sistema de gestión de pedidos con flujos específicos por tipo
const axios = require('axios');
const readline = require('readline');
require('dotenv').config();

/**
 * GESTOR DE PEDIDOS ONLINE
 * 
 * Funcionalidades:
 * - Flujos específicos por tipo de entrega (delivery, express, pickup)
 * - Validación OBLIGATORIA de transferencias antes de preparar
 * - Pagos con tarjeta online: automáticos (sin confirmación)
 * - Pagos en efectivo: confirmación al entregar
 * - Tracking obligatorio para envíos
 * - Gestión paso a paso de estados
 */
class OnlineOrdersManager {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.adminToken = null;
    
    // Datos cargados
    this.pendingOrders = [];
    this.allOrders = [];
    this.products = [];
    this.dashboard = null;
    
    // Configurar readline
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // ============================================================================
    // DEFINICIÓN DE FLUJOS DE TRABAJO
    // ============================================================================
    this.workflows = {
      delivery: {
        name: 'Envío a Domicilio',
        icon: '🚚',
        steps: [
          { 
            status: 'pending', 
            name: 'Pendiente', 
            next: 'confirmed',
            description: 'Pedido recibido, esperando confirmación'
          },
          { 
            status: 'confirmed', 
            name: 'Confirmado', 
            next: 'preparing', 
            requiresTransferValidation: true,
            description: 'Pedido confirmado. Si es transferencia, debe validarse antes de preparar'
          },
          { 
            status: 'preparing', 
            name: 'En Preparación', 
            next: 'packed',
            description: 'Preparando productos para envío'
          },
          { 
            status: 'packed', 
            name: 'Empacado', 
            next: 'shipped', 
            requiresTracking: true,
            description: 'Pedido empacado, listo para enviar. Requiere número de guía'
          },
          { 
            status: 'shipped', 
            name: 'Enviado', 
            next: 'delivered',
            description: 'Pedido en ruta hacia el cliente'
          },
          { 
            status: 'delivered', 
            name: 'Entregado', 
            requiresCashPayment: true,
            description: 'Pedido entregado al cliente. Confirmar pago si es contra entrega'
          }
        ]
      },
      express: {
        name: 'Envío Express',
        icon: '⚡',
        steps: [
          { 
            status: 'pending', 
            name: 'Pendiente', 
            next: 'confirmed',
            description: 'Pedido express recibido - PRIORIDAD ALTA'
          },
          { 
            status: 'confirmed', 
            name: 'Confirmado', 
            next: 'preparing', 
            requiresTransferValidation: true,
            description: 'Pedido confirmado. Si es transferencia, debe validarse antes de preparar'
          },
          { 
            status: 'preparing', 
            name: 'En Preparación', 
            next: 'packed',
            description: 'Preparando productos (2-4 horas)'
          },
          { 
            status: 'packed', 
            name: 'Empacado', 
            next: 'shipped', 
            requiresTracking: true,
            description: 'Empacado y listo para envío express'
          },
          { 
            status: 'shipped', 
            name: 'Enviado', 
            next: 'delivered',
            description: 'En ruta express hacia el cliente'
          },
          { 
            status: 'delivered', 
            name: 'Entregado', 
            requiresCashPayment: true,
            description: 'Entregado. Confirmar pago si es contra entrega'
          }
        ]
      },
      pickup: {
        name: 'Recoger en Tienda',
        icon: '🏪',
        steps: [
          { 
            status: 'pending', 
            name: 'Pendiente', 
            next: 'confirmed',
            description: 'Pedido para recoger recibido'
          },
          { 
            status: 'confirmed', 
            name: 'Confirmado', 
            next: 'preparing', 
            requiresTransferValidation: true,
            description: 'Pedido confirmado. Si es transferencia, debe validarse antes de preparar'
          },
          { 
            status: 'preparing', 
            name: 'En Preparación', 
            next: 'packed',
            description: 'Preparando productos para recoger'
          },
          { 
            status: 'packed', 
            name: 'Empacado', 
            next: 'ready_pickup',
            description: 'Empacado y listo para que el cliente recoja'
          },
          { 
            status: 'ready_pickup', 
            name: 'Listo para Recoger', 
            next: 'picked_up', 
            requiresCashPayment: true,
            description: 'Cliente puede recoger. Verificar identidad y confirmar pago si es en tienda'
          },
          { 
            status: 'picked_up', 
            name: 'Recogido',
            description: 'Cliente recogió el pedido exitosamente'
          }
        ]
      }
    };
  }

  // ============================================================================
  // INICIO Y AUTENTICACIÓN
  // ============================================================================

  async start() {
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║           🛒 ELITE FITNESS - GESTOR DE PEDIDOS ONLINE V2.0                ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');
    console.log('\n📦 CARACTERÍSTICAS DEL SISTEMA:');
    console.log('   ✅ Flujos específicos por tipo de entrega');
    console.log('   ✅ Gestión paso a paso de estados');
    console.log('   🏦 Validación OBLIGATORIA de transferencias antes de preparar');
    console.log('   💳 Pagos con tarjeta online: automáticos (sin confirmación)');
    console.log('   💰 Pagos en efectivo: confirmación al entregar');
    console.log('   📦 Tracking obligatorio para envíos');
    console.log('   🔄 Actualización en tiempo real\n');
    
    try {
      await this.loginAdmin();
      await this.loadAllData();
      await this.showMainMenu();
      
    } catch (error) {
      console.error('\n❌ ERROR CRÍTICO:', error.message);
      if (error.response) {
        console.error('📋 Detalles del servidor:', error.response.data);
      }
    } finally {
      this.rl.close();
    }
  }

  async loginAdmin() {
    console.log('🔐 Autenticando como administrador...');
    
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'admin@gym.com',
        password: 'Admin123!'
      });

      if (response.data.success && response.data.data.token) {
        this.adminToken = response.data.data.token;
        console.log(`   ✅ Sesión iniciada: ${response.data.data.user.firstName} ${response.data.data.user.lastName}`);
        console.log(`   👤 Rol: ${response.data.data.user.role.toUpperCase()}`);
      }
    } catch (error) {
      throw new Error(`Error de autenticación: ${error.message}`);
    }
  }

  async loadAllData() {
    console.log('\n📊 Cargando datos del sistema...');
    
    try {
      await Promise.all([
        this.loadDashboard(),
        this.loadAllOrders(),
        this.loadProducts()
      ]);
      
      // Filtrar pedidos en proceso
      this.pendingOrders = this.allOrders.filter(o => 
        ['pending', 'confirmed', 'preparing', 'packed', 'shipped', 'ready_pickup'].includes(o.status)
      );
      
      console.log('   ✅ Datos cargados exitosamente');
      console.log(`   📦 Total órdenes: ${this.allOrders.length}`);
      console.log(`   ⏳ En proceso: ${this.pendingOrders.length}`);
      console.log(`   📦 Productos: ${this.products.length}`);
      
    } catch (error) {
      console.log(`   ⚠️ Error cargando datos: ${error.message}`);
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
      console.warn('⚠️ Dashboard no disponible');
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
      this.allOrders = [];
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
    console.clear();
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                        🛒 MENÚ PRINCIPAL                                   ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');
    
    // Mostrar resumen del dashboard
    if (this.dashboard?.summary) {
      const s = this.dashboard.summary;
      console.log('\n📊 RESUMEN DEL SISTEMA:');
      console.log(`   ⏳ Pendientes confirmación: ${s.pendingConfirmation || 0}`);
      console.log(`   🏪 Listos para recogida: ${s.readyForPickup || 0}`);
      console.log(`   📦 Empaquetados para envío: ${s.packedForShipping || 0}`);
      
      const pendingTransfers = s.pendingTransfers || 0;
      if (pendingTransfers > 0) {
        console.log(`   🏦 TRANSFERENCIAS PENDIENTES: ${pendingTransfers} ⚠️ ¡REQUIEREN VALIDACIÓN!`);
      } else {
        console.log(`   ✅ Transferencias pendientes: 0`);
      }
      
      console.log(`   📅 Pedidos hoy: ${s.ordersToday || 0}`);
      console.log(`   💰 Ingresos hoy: Q${(s.revenueToday || 0).toFixed(2)}`);
    }
    
    // Mostrar pedidos en proceso por tipo
    const byType = {
      delivery: this.pendingOrders.filter(o => o.deliveryType === 'delivery'),
      express: this.pendingOrders.filter(o => o.deliveryType === 'express'),
      pickup: this.pendingOrders.filter(o => o.deliveryType === 'pickup')
    };

    console.log('\n📦 PEDIDOS EN PROCESO POR TIPO:');
    console.log(`   🚚 Envíos a domicilio: ${byType.delivery.length}`);
    console.log(`   ⚡ Envíos express: ${byType.express.length}`);
    console.log(`   🏪 Para recoger en tienda: ${byType.pickup.length}`);
    
    console.log('\n' + '─'.repeat(80));
    console.log('📋 OPCIONES DISPONIBLES:');
    console.log('─'.repeat(80));
    console.log('1. 🚚 Gestionar ENVÍOS A DOMICILIO (delivery)');
    console.log('2. ⚡ Gestionar ENVÍOS EXPRESS (prioridad alta)');
    console.log('3. 🏪 Gestionar RECOGIDA EN TIENDA (pickup)');
    console.log('4. 🏦 Validar TRANSFERENCIAS pendientes ⚠️ ¡PRIORITARIO!');
    console.log('5. 🔍 Buscar pedido específico');
    console.log('6. 📊 Ver dashboard completo');
    console.log('7. 🔄 Recargar datos del sistema');
    console.log('0. 🚪 Salir del sistema');
    
    console.log('\n💡 RECORDATORIOS IMPORTANTES:');
    console.log('   💳 Tarjeta online: Pago procesado automáticamente');
    console.log('   🏦 Transferencias: DEBEN validarse antes de preparar');
    console.log('   💰 Efectivo: Se confirma al momento de entrega/recogida');
    
    const choice = await this.askQuestion('\n🛒 Selecciona una opción (0-7): ');
    
    switch (choice.trim()) {
      case '1':
        await this.manageOrdersByType('delivery');
        break;
      case '2':
        await this.manageOrdersByType('express');
        break;
      case '3':
        await this.manageOrdersByType('pickup');
        break;
      case '4':
        await this.managePendingTransfers();
        break;
      case '5':
        await this.searchSpecificOrder();
        break;
      case '6':
        await this.showFullDashboard();
        break;
      case '7':
        await this.loadAllData();
        console.log('\n✅ Datos actualizados');
        await this.askQuestion('\n⏎ Presiona Enter para continuar...');
        break;
      case '0':
        console.log('\n👋 ¡Hasta luego! Cerrando sistema...');
        return;
      default:
        console.log('\n❌ Opción inválida. Intenta de nuevo.');
        await this.askQuestion('\n⏎ Presiona Enter para continuar...');
    }
    
    await this.showMainMenu();
  }

  // ============================================================================
  // GESTIÓN POR TIPO DE ENTREGA
  // ============================================================================

  async manageOrdersByType(deliveryType) {
    const workflow = this.workflows[deliveryType];
    const orders = this.pendingOrders.filter(o => o.deliveryType === deliveryType);

    console.clear();
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log(`║  ${workflow.icon} GESTIÓN DE: ${workflow.name.toUpperCase().padEnd(61)}║`);
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');

    if (orders.length === 0) {
      console.log(`\n✅ No hay pedidos de tipo "${workflow.name}" en proceso`);
      await this.askQuestion('\n⏎ Presiona Enter para volver...');
      return;
    }

    // Mostrar flujo de trabajo
    console.log('\n📋 FLUJO DE TRABAJO:');
    console.log('─'.repeat(80));
    workflow.steps.forEach((step, i) => {
      const arrow = i < workflow.steps.length - 1 ? ' → ' : '';
      let extras = '';
      if (step.requiresTransferValidation) extras = ' [🏦 Validar transferencia]';
      if (step.requiresTracking) extras = ' [📦 Número de guía]';
      if (step.requiresCashPayment) extras = ' [💰 Confirmar pago efectivo]';
      console.log(`   ${i + 1}. ${step.name}${extras}${arrow}`);
    });

    // Agrupar por estado
    console.log('\n📊 DISTRIBUCIÓN POR ESTADO:');
    console.log('─'.repeat(80));
    const byStatus = {};
    orders.forEach(order => {
      byStatus[order.status] = (byStatus[order.status] || []);
      byStatus[order.status].push(order);
    });

    workflow.steps.forEach(step => {
      const count = byStatus[step.status]?.length || 0;
      if (count > 0) {
        console.log(`   ${this.getStatusIcon(step.status)} ${step.name}: ${count} pedido(s)`);
      }
    });

    // Listar pedidos detallados
    console.log(`\n📦 LISTA DE PEDIDOS (${orders.length}):`);
    console.log('─'.repeat(80));
    orders.forEach((order, i) => {
      const currentStep = workflow.steps.find(s => s.status === order.status);
      console.log(`\n   ${i + 1}. 📦 Pedido #${order.orderNumber}`);
      console.log(`      📊 Estado: ${this.getStatusIcon(order.status)} ${currentStep?.name || order.status}`);
      console.log(`      💰 Total: Q${order.totalAmount}`);
      console.log(`      👤 Cliente: ${this.getCustomerName(order)}`);
      console.log(`      💳 Pago: ${this.getPaymentMethodName(order.paymentMethod)}`);
      console.log(`      📅 Creado: ${new Date(order.createdAt).toLocaleString('es-GT')}`);
      
      // Alertas importantes
      if (order.paymentMethod.includes('transfer') && !order.transferConfirmed) {
        console.log(`      ⚠️  TRANSFERENCIA PENDIENTE - Bloquea preparación`);
      } else if (order.paymentMethod.includes('transfer') && order.transferConfirmed) {
        console.log(`      ✅ Transferencia validada - Puede procesarse`);
      } else if (order.paymentMethod === 'online_card') {
        console.log(`      ✅ Pago con tarjeta procesado automáticamente`);
      }
      
      if (order.trackingNumber) {
        console.log(`      📦 Tracking: ${order.trackingNumber}`);
      }
    });

    console.log('\n' + '─'.repeat(80));
    console.log('📋 ACCIONES DISPONIBLES:');
    console.log('─'.repeat(80));
    console.log('1. ▶️  Avanzar pedido al siguiente paso');
    console.log('2. 👁️  Ver detalles completos de un pedido');
    console.log('3. 📋 Ver flujo de trabajo de un pedido');
    console.log('4. ❌ Cancelar un pedido');
    console.log('0. ⬅️  Volver al menú principal');

    const action = await this.askQuestion(`\n${workflow.icon} Selecciona acción (0-4): `);

    switch (action.trim()) {
      case '1':
        await this.advanceOrderToNextStep(orders, workflow);
        break;
      case '2':
        await this.viewOrderDetails(orders);
        break;
      case '3':
        await this.showOrderWorkflow(orders, workflow);
        break;
      case '4':
        await this.cancelOrder(orders);
        break;
      case '0':
        return;
      default:
        console.log('\n❌ Opción inválida');
        await this.askQuestion('\n⏎ Presiona Enter...');
    }

    // Volver a mostrar la gestión del mismo tipo
    await this.manageOrdersByType(deliveryType);
  }

  // ============================================================================
  // AVANZAR PEDIDO AL SIGUIENTE PASO
  // ============================================================================

  async advanceOrderToNextStep(orders, workflow) {
    console.clear();
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    ▶️  AVANZAR PEDIDO AL SIGUIENTE PASO                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');

    // Mostrar lista numerada
    console.log('\n📦 PEDIDOS DISPONIBLES:');
    orders.forEach((order, i) => {
      const currentStep = workflow.steps.find(s => s.status === order.status);
      console.log(`   ${i + 1}. #${order.orderNumber} - ${currentStep?.name} - Q${order.totalAmount}`);
    });

    const orderNum = await this.askQuestion('\n📦 Número de pedido (0 para cancelar): ');
    if (orderNum === '0') return;

    const orderIndex = parseInt(orderNum) - 1;
    if (orderIndex < 0 || orderIndex >= orders.length) {
      console.log('❌ Número inválido');
      await this.askQuestion('\n⏎ Presiona Enter...');
      return;
    }

    const order = orders[orderIndex];
    const currentStep = workflow.steps.find(s => s.status === order.status);
    
    if (!currentStep) {
      console.log('❌ Estado del pedido no reconocido en el flujo de trabajo');
      await this.askQuestion('\n⏎ Presiona Enter...');
      return;
    }

    if (!currentStep.next) {
      console.log('✅ Este pedido ya está en el estado final del flujo');
      await this.askQuestion('\n⏎ Presiona Enter...');
      return;
    }

    const nextStep = workflow.steps.find(s => s.status === currentStep.next);

    console.log('\n' + '─'.repeat(80));
    console.log('🔄 INFORMACIÓN DEL CAMBIO:');
    console.log('─'.repeat(80));
    console.log(`📦 Pedido: #${order.orderNumber}`);
    console.log(`👤 Cliente: ${this.getCustomerName(order)}`);
    console.log(`💰 Total: Q${order.totalAmount}`);
    console.log(`📊 Estado actual: ${this.getStatusIcon(currentStep.status)} ${currentStep.name}`);
    console.log(`➡️  Siguiente paso: ${this.getStatusIcon(nextStep.status)} ${nextStep.name}`);

    // 🔥 VALIDACIÓN OBLIGATORIA DE TRANSFERENCIAS
    if (nextStep.requiresTransferValidation) {
      if (order.paymentMethod.includes('transfer') && !order.transferConfirmed) {
        console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
        console.log('║                    ❌ ERROR: TRANSFERENCIA NO VALIDADA                     ║');
        console.log('╚════════════════════════════════════════════════════════════════════════════╝');
        console.log('\n⚠️  No se puede iniciar la preparación de este pedido');
        console.log('🏦 Este pedido tiene una TRANSFERENCIA BANCARIA SIN VALIDAR');
        console.log('\n📋 ACCIÓN REQUERIDA:');
        console.log('   1. Vuelve al menú principal');
        console.log('   2. Selecciona la opción 4: "Validar TRANSFERENCIAS pendientes"');
        console.log('   3. Valida la transferencia de este pedido');
        console.log('   4. Luego podrás continuar con la preparación');
        await this.askQuestion('\n⏎ Presiona Enter para volver...');
        return;
      }
    }

    // Manejar requerimientos especiales del paso
    let additionalData = {};

    // 📦 TRACKING PARA ENVÍOS
    if (nextStep.requiresTracking) {
      console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
      console.log('║                     📦 GENERAR GUÍA DE ENVÍO                               ║');
      console.log('╚════════════════════════════════════════════════════════════════════════════╝');
      
      const trackingNumber = await this.askQuestion('\n📦 Número de guía/tracking: ');
      const courier = await this.askQuestion('🚚 Empresa de envío (ej: DHL, FedEx, UPS): ');
      
      if (!trackingNumber.trim()) {
        console.log('\n❌ El número de tracking es OBLIGATORIO para envíos');
        await this.askQuestion('\n⏎ Presiona Enter...');
        return;
      }
      
      additionalData.trackingNumber = trackingNumber.trim();
      additionalData.notes = `Enviado con ${courier}`;
      
      console.log(`\n✅ Tracking registrado: ${trackingNumber}`);
    }

    // 💰 CONFIRMACIÓN DE PAGO (solo para efectivo/tarjeta contra entrega)
    if (nextStep.requiresCashPayment) {
      if (order.paymentMethod === 'cash_on_delivery') {
        console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
        console.log('║              💰 CONFIRMAR PAGO EN EFECTIVO CONTRA ENTREGA                  ║');
        console.log('╚════════════════════════════════════════════════════════════════════════════╝');
        console.log(`\n   Método: Efectivo contra entrega`);
        console.log(`   Monto a cobrar: Q${order.totalAmount}`);
        
        const paymentConfirmed = await this.askQuestion('\n¿El cliente pagó en efectivo? (s/n): ');
        if (paymentConfirmed.toLowerCase() !== 's') {
          console.log('\n❌ No se puede completar la entrega sin confirmar el pago');
          await this.askQuestion('\n⏎ Presiona Enter...');
          return;
        }
        
        const receiptNumber = await this.askQuestion('Número de recibo (opcional): ');
        additionalData.notes = (additionalData.notes || '') + 
          `\n💰 Pago confirmado: Efectivo Q${order.totalAmount}` +
          (receiptNumber ? ` - Recibo: ${receiptNumber}` : '');
        
        console.log('\n✅ Pago en efectivo confirmado');
      } 
      else if (order.paymentMethod === 'cash_on_pickup') {
        console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
        console.log('║               💰 CONFIRMAR PAGO EN EFECTIVO EN TIENDA                      ║');
        console.log('╚════════════════════════════════════════════════════════════════════════════╝');
        console.log(`\n   Método: Efectivo en tienda`);
        console.log(`   Monto a cobrar: Q${order.totalAmount}`);
        
        const verifyIdentity = await this.askQuestion('\n¿Verificaste la identidad del cliente? (s/n): ');
        if (verifyIdentity.toLowerCase() !== 's') {
          console.log('\n❌ Por seguridad, verifica la identidad antes de entregar');
          await this.askQuestion('\n⏎ Presiona Enter...');
          return;
        }
        
        const paymentConfirmed = await this.askQuestion('¿El cliente pagó en efectivo? (s/n): ');
        if (paymentConfirmed.toLowerCase() !== 's') {
          console.log('\n❌ No se puede completar sin confirmar el pago');
          await this.askQuestion('\n⏎ Presiona Enter...');
          return;
        }
        
        additionalData.notes = (additionalData.notes || '') + 
          `\n💰 Pago confirmado: Efectivo en tienda Q${order.totalAmount}\n👤 Identidad verificada`;
        
        console.log('\n✅ Pago confirmado e identidad verificada');
      }
      else if (order.paymentMethod === 'card_on_delivery') {
        console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
        console.log('║              💳 CONFIRMAR PAGO CON TARJETA CONTRA ENTREGA                  ║');
        console.log('╚════════════════════════════════════════════════════════════════════════════╝');
        console.log(`\n   Método: Tarjeta contra entrega`);
        console.log(`   Monto a cobrar: Q${order.totalAmount}`);
        
        const paymentConfirmed = await this.askQuestion('\n¿Se procesó el pago con tarjeta exitosamente? (s/n): ');
        if (paymentConfirmed.toLowerCase() !== 's') {
          console.log('\n❌ No se puede completar sin confirmar el pago');
          await this.askQuestion('\n⏎ Presiona Enter...');
          return;
        }
        
        const authCode = await this.askQuestion('Código de autorización (opcional): ');
        additionalData.notes = (additionalData.notes || '') + 
          `\n💳 Pago con tarjeta confirmado: Q${order.totalAmount}` +
          (authCode ? ` - Auth: ${authCode}` : '');
        
        console.log('\n✅ Pago con tarjeta procesado');
      }
      else if (order.paymentMethod === 'online_card' || order.paymentMethod === 'transfer') {
        console.log('\n✅ PAGO YA PROCESADO PREVIAMENTE');
        if (order.paymentMethod === 'online_card') {
          console.log('   💳 Pago con tarjeta online - Procesado automáticamente');
        } else {
          console.log('   🏦 Transferencia bancaria - Validada previamente');
        }
        additionalData.notes = (additionalData.notes || '') + 
          `\n✅ Pago verificado: ${this.getPaymentMethodName(order.paymentMethod)}`;
      }
    }

    // Solicitar notas adicionales
    const notes = await this.askQuestion('\n📝 Notas adicionales (opcional, Enter para omitir): ');
    if (notes.trim()) {
      additionalData.notes = (additionalData.notes || '') + '\n' + notes.trim();
    }

    // Confirmación final
    console.log('\n' + '─'.repeat(80));
    const confirm = await this.askQuestion(`✅ ¿Confirmar avance a "${nextStep.name}"? (s/n): `);
    if (confirm.toLowerCase() !== 's') {
      console.log('\n❌ Operación cancelada');
      await this.askQuestion('\n⏎ Presiona Enter...');
      return;
    }

    // Ejecutar actualización
    try {
      const response = await axios.patch(
        `${this.baseURL}/api/order-management/${order.id}/status`,
        {
          status: nextStep.status,
          ...additionalData
        },
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
        console.log('║                         ✅ OPERACIÓN EXITOSA                               ║');
        console.log('╚════════════════════════════════════════════════════════════════════════════╝');
        console.log(`\n📦 Pedido #${order.orderNumber} avanzado a: ${nextStep.name}`);
        
        if (nextStep.status === 'delivered' || nextStep.status === 'picked_up') {
          console.log('\n📊 ACCIONES AUTOMÁTICAS REALIZADAS:');
          console.log('   ✅ Movimiento financiero registrado');
          console.log('   ✅ Stock actualizado automáticamente');
          console.log('   ✅ Pedido completado');
        }
        
        await this.loadAllData();
      }
    } catch (error) {
      console.log('\n❌ ERROR al actualizar el pedido:');
      console.error('   ', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ============================================================================
  // MOSTRAR WORKFLOW DE UN PEDIDO
  // ============================================================================

  async showOrderWorkflow(orders, workflow) {
    console.clear();
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    📋 FLUJO DE TRABAJO DEL PEDIDO                          ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');

    // Mostrar lista
    console.log('\n📦 PEDIDOS DISPONIBLES:');
    orders.forEach((order, i) => {
      console.log(`   ${i + 1}. #${order.orderNumber} - ${this.getCustomerName(order)}`);
    });

    const orderNum = await this.askQuestion('\n📦 Número de pedido (0 para cancelar): ');
    if (orderNum === '0') return;

    const orderIndex = parseInt(orderNum) - 1;
    if (orderIndex < 0 || orderIndex >= orders.length) {
      console.log('❌ Número inválido');
      await this.askQuestion('\n⏎ Presiona Enter...');
      return;
    }

    const order = orders[orderIndex];
    const currentStepIndex = workflow.steps.findIndex(s => s.status === order.status);

    console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
    console.log(`║  📦 PEDIDO #${order.orderNumber.padEnd(66)}║`);
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');

    console.log('\n📋 PROGRESO DEL FLUJO:');
    console.log('─'.repeat(80));

    workflow.steps.forEach((step, i) => {
      const icon = i < currentStepIndex ? '✅' : 
                   i === currentStepIndex ? '🔄' : '⏳';
      const status = i < currentStepIndex ? 'COMPLETADO' : 
                     i === currentStepIndex ? '🔸 ACTUAL 🔸' : 'PENDIENTE';
      
      console.log(`\n   ${icon} ${step.name} - ${status}`);
      console.log(`      ${step.description}`);
      
      if (step.requiresTransferValidation && i === currentStepIndex) {
        console.log(`      🏦 Requiere: Validación de transferencia (si aplica)`);
      }
      if (step.requiresTracking && i === currentStepIndex) {
        console.log(`      📦 Requiere: Número de guía/tracking obligatorio`);
      }
      if (step.requiresCashPayment && i === currentStepIndex) {
        if (order.paymentMethod === 'cash_on_delivery' || order.paymentMethod === 'cash_on_pickup') {
          console.log(`      💰 Requiere: Confirmación de pago en efectivo`);
        } else if (order.paymentMethod === 'card_on_delivery') {
          console.log(`      💳 Requiere: Procesar pago con tarjeta`);
        } else {
          console.log(`      ✅ Pago ya procesado`);
        }
      }
      
      if (i === currentStepIndex && step.next) {
        const nextStep = workflow.steps.find(s => s.status === step.next);
        console.log(`      ➡️  Siguiente paso: ${nextStep.name}`);
      }
    });

    console.log('\n' + '─'.repeat(80));
    console.log('📊 INFORMACIÓN DEL PEDIDO:');
    console.log('─'.repeat(80));
    console.log(`   💰 Total: Q${order.totalAmount}`);
    console.log(`   👤 Cliente: ${this.getCustomerName(order)}`);
    console.log(`   💳 Método de pago: ${this.getPaymentMethodName(order.paymentMethod)}`);
    console.log(`   📅 Fecha de creación: ${new Date(order.createdAt).toLocaleString('es-GT')}`);

    if (order.trackingNumber) {
      console.log(`   📦 Número de tracking: ${order.trackingNumber}`);
    }

    // Estado detallado del pago
    console.log('\n💳 ESTADO DEL PAGO:');
    if (order.paymentMethod.includes('transfer')) {
      if (order.transferConfirmed) {
        console.log(`   ✅ Transferencia VALIDADA - El pedido puede procesarse`);
      } else {
        console.log(`   ⚠️  Transferencia PENDIENTE - Bloquea la preparación del pedido`);
      }
    } else if (order.paymentMethod === 'online_card') {
      console.log(`   ✅ Pago procesado automáticamente con tarjeta online`);
    } else if (order.paymentMethod === 'cash_on_delivery' || order.paymentMethod === 'cash_on_pickup') {
      if (order.status === 'delivered' || order.status === 'picked_up') {
        console.log(`   ✅ Pago confirmado al momento de la entrega`);
      } else {
        console.log(`   ⏳ Se confirmará al momento de la entrega/recogida`);
      }
    } else if (order.paymentMethod === 'card_on_delivery') {
      if (order.status === 'delivered') {
        console.log(`   ✅ Pago procesado al momento de la entrega`);
      } else {
        console.log(`   ⏳ Se procesará al momento de la entrega`);
      }
    }

    await this.askQuestion('\n⏎ Presiona Enter para volver...');
  }

  // ============================================================================
  // GESTIÓN DE TRANSFERENCIAS PENDIENTES
  // ============================================================================

  async managePendingTransfers() {
    console.clear();
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║              🏦 VALIDACIÓN DE TRANSFERENCIAS BANCARIAS                     ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');

    try {
      const response = await axios.get(`${this.baseURL}/api/order-management/pending-transfers`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      if (!response.data.success || !response.data.data?.orders || response.data.data.orders.length === 0) {
        console.log('\n✅ ¡Excelente! No hay transferencias pendientes de validar');
        console.log('\nTodas las transferencias han sido procesadas correctamente.');
        await this.askQuestion('\n⏎ Presiona Enter para volver...');
        return;
      }

      const transfers = response.data.data.orders;

      console.log(`\n⚠️  HAY ${transfers.length} TRANSFERENCIA(S) PENDIENTE(S) DE VALIDACIÓN`);
      console.log('─'.repeat(80));
      console.log('\nEstas transferencias BLOQUEAN la preparación de los pedidos.');
      console.log('Es PRIORITARIO validarlas para que los pedidos puedan procesarse.\n');

      transfers.forEach((order, i) => {
        const hoursWaiting = (new Date() - new Date(order.createdAt)) / 3600000;
        const priority = hoursWaiting > 24 ? '🔴 URGENTE' : hoursWaiting > 12 ? '🟡 ALTA' : '🟢 NORMAL';
        
        console.log(`\n   ${i + 1}. Pedido #${order.orderNumber}`);
        console.log(`      💰 Monto: Q${order.totalAmount}`);
        console.log(`      👤 Cliente: ${this.getCustomerName(order)}`);
        console.log(`      📅 Fecha del pedido: ${new Date(order.createdAt).toLocaleString('es-GT')}`);
        console.log(`      ⏱️  Tiempo esperando: ${Math.floor(hoursWaiting)} horas`);
        console.log(`      📊 Estado del pedido: ${order.status}`);
        console.log(`      🚦 Prioridad: ${priority}`);
      });

      console.log('\n' + '─'.repeat(80));
      console.log('📋 ACCIONES DISPONIBLES:');
      console.log('─'.repeat(80));
      console.log('1. ✅ Validar una transferencia (aprobar)');
      console.log('2. ❌ Rechazar una transferencia');
      console.log('3. 👁️  Ver detalles de un pedido');
      console.log('0. ⬅️  Volver al menú principal');

      const action = await this.askQuestion('\n🏦 Selecciona acción (0-3): ');

      switch (action.trim()) {
        case '1':
          await this.validateTransfer(transfers);
          break;
        case '2':
          await this.rejectTransfer(transfers);
          break;
        case '3':
          await this.viewTransferDetails(transfers);
          break;
        case '0':
          return;
        default:
          console.log('\n❌ Opción inválida');
          await this.askQuestion('\n⏎ Presiona Enter...');
      }

      // Recargar y volver a mostrar
      await this.loadAllData();
      await this.managePendingTransfers();

    } catch (error) {
      console.error('\n❌ Error al cargar transferencias:', error.message);
      await this.askQuestion('\n⏎ Presiona Enter...');
    }
  }

  async validateTransfer(transfers) {
    console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ VALIDAR TRANSFERENCIA BANCARIA                        ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');

    const orderNum = await this.askQuestion('\n📦 Número de transferencia a validar (0 para cancelar): ');
    if (orderNum === '0') return;

    const orderIndex = parseInt(orderNum) - 1;
    if (orderIndex < 0 || orderIndex >= transfers.length) {
      console.log('\n❌ Número inválido');
      await this.askQuestion('\n⏎ Presiona Enter...');
      return;
    }

    const order = transfers[orderIndex];
    
    console.log('\n📊 INFORMACIÓN DEL PEDIDO:');
    console.log('─'.repeat(80));
    console.log(`   Pedido: #${order.orderNumber}`);
    console.log(`   Cliente: ${this.getCustomerName(order)}`);
    console.log(`   Monto: Q${order.totalAmount}`);
    console.log(`   Tipo: ${order.deliveryType}`);

    console.log('\n📝 INFORMACIÓN DE LA TRANSFERENCIA:');
    console.log('─'.repeat(80));
    const voucherDetails = await this.askQuestion('Descripción del voucher/boleta: ');
    const bankReference = await this.askQuestion('Número de referencia bancaria: ');
    const notes = await this.askQuestion('Notas adicionales (opcional): ');

    if (!voucherDetails.trim() || !bankReference.trim()) {
      console.log('\n❌ La descripción del voucher y la referencia bancaria son obligatorias');
      await this.askQuestion('\n⏎ Presiona Enter...');
      return;
    }

    console.log('\n' + '─'.repeat(80));
    const confirm = await this.askQuestion('✅ ¿CONFIRMAR que la transferencia es VÁLIDA? (s/n): ');
    if (confirm.toLowerCase() !== 's') {
      console.log('\n❌ Validación cancelada');
      await this.askQuestion('\n⏎ Presiona Enter...');
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
        console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
        console.log('║                    ✅ TRANSFERENCIA VALIDADA EXITOSAMENTE                  ║');
        console.log('╚════════════════════════════════════════════════════════════════════════════╝');
        console.log('\n📊 ACCIONES REALIZADAS:');
        console.log('   ✅ Transferencia marcada como válida');
        console.log('   ✅ Movimiento financiero registrado');
        console.log('   ✅ Pedido desbloqueado para preparación');
        console.log('\n💡 El pedido ahora puede continuar su procesamiento normal.');
      }
    } catch (error) {
      console.log('\n❌ ERROR al validar transferencia:');
      console.error('   ', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async rejectTransfer(transfers) {
    console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    ❌ RECHAZAR TRANSFERENCIA BANCARIA                       ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');

    const orderNum = await this.askQuestion('\n📦 Número de transferencia a rechazar (0 para cancelar): ');
    if (orderNum === '0') return;

    const orderIndex = parseInt(orderNum) - 1;
    if (orderIndex < 0 || orderIndex >= transfers.length) {
      console.log('\n❌ Número inválido');
      await this.askQuestion('\n⏎ Presiona Enter...');
      return;
    }

    const order = transfers[orderIndex];
    
    console.log('\n📊 INFORMACIÓN DEL PEDIDO:');
    console.log(`   Pedido: #${order.orderNumber}`);
    console.log(`   Cliente: ${this.getCustomerName(order)}`);
    console.log(`   Monto: Q${order.totalAmount}`);

    const reason = await this.askQuestion('\n📝 Motivo del rechazo (obligatorio): ');
    
    if (!reason.trim()) {
      console.log('\n❌ Debes especificar un motivo para el rechazo');
      await this.askQuestion('\n⏎ Presiona Enter...');
      return;
    }

    console.log('\n⚠️  ADVERTENCIA: Al rechazar la transferencia, el pedido será CANCELADO');
    console.log('   - El stock será restaurado');
    console.log('   - Se notificará al cliente');
    
    const confirm = await this.askQuestion('\n❌ ¿CONFIRMAR RECHAZO de la transferencia? (s/n): ');
    if (confirm.toLowerCase() !== 's') {
      console.log('\n❌ Operación cancelada');
      await this.askQuestion('\n⏎ Presiona Enter...');
      return;
    }

    try {
      const response = await axios.patch(
        `${this.baseURL}/api/order-management/${order.id}/status`,
        {
          status: 'cancelled',
          notes: `❌ PEDIDO CANCELADO - Transferencia rechazada\nMotivo: ${reason}`
        },
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
        console.log('║                   ❌ TRANSFERENCIA RECHAZADA Y PEDIDO CANCELADO            ║');
        console.log('╚════════════════════════════════════════════════════════════════════════════╝');
        console.log('\n📊 ACCIONES REALIZADAS:');
        console.log('   ❌ Transferencia rechazada');
        console.log('   ❌ Pedido cancelado');
        console.log('   ✅ Stock restaurado automáticamente');
        console.log('   📧 Se notificará al cliente del rechazo');
      }
    } catch (error) {
      console.log('\n❌ ERROR al rechazar transferencia:');
      console.error('   ', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async viewTransferDetails(transfers) {
    const orderNum = await this.askQuestion('\n📦 Número de pedido: ');
    const idx = parseInt(orderNum) - 1;
    if (idx >= 0 && idx < transfers.length) {
      await this.showDetailedOrder(transfers[idx]);
      await this.askQuestion('\n⏎ Presiona Enter...');
    }
  }

  // ============================================================================
  // FUNCIONES AUXILIARES
  // ============================================================================

  async searchSpecificOrder() {
    console.clear();
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                          🔍 BUSCAR PEDIDO                                  ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');
    
    const searchTerm = await this.askQuestion('\n🔍 Número de pedido o nombre de cliente: ');
    if (!searchTerm.trim()) return;

    const results = this.allOrders.filter(order => {
      const orderNum = (order.orderNumber || '').toLowerCase();
      const customerName = this.getCustomerName(order).toLowerCase();
      const search = searchTerm.toLowerCase();
      return orderNum.includes(search) || customerName.includes(search);
    });

    if (results.length === 0) {
      console.log('\n❌ No se encontraron pedidos con ese criterio');
    } else {
      console.log(`\n✅ Se encontraron ${results.length} resultado(s):`);
      console.log('─'.repeat(80));
      results.forEach((order, i) => {
        console.log(`   ${i + 1}. #${order.orderNumber} - ${order.status} - Q${order.totalAmount} - ${this.getCustomerName(order)}`);
      });
      
      const viewNum = await this.askQuestion('\n👁️  Ver detalles de (número, 0 para salir): ');
      if (viewNum !== '0') {
        const idx = parseInt(viewNum) - 1;
        if (idx >= 0 && idx < results.length) {
          await this.showDetailedOrder(results[idx]);
        }
      }
    }

    await this.askQuestion('\n⏎ Presiona Enter...');
  }

  async showDetailedOrder(order) {
    const workflow = this.workflows[order.deliveryType];
    
    console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
    console.log(`║  📦 DETALLES COMPLETOS - PEDIDO #${order.orderNumber.padEnd(48)}║`);
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');
    
    console.log('\n📊 INFORMACIÓN GENERAL:');
    console.log(`   Estado: ${this.getStatusIcon(order.status)} ${order.status.toUpperCase()}`);
    console.log(`   Tipo: ${workflow?.icon || '📦'} ${workflow?.name || order.deliveryType}`);
    console.log(`   Fecha: ${new Date(order.createdAt).toLocaleString('es-GT')}`);
    
    console.log('\n👤 CLIENTE:');
    console.log(`   Nombre: ${this.getCustomerName(order)}`);
    if (order.user?.email) console.log(`   Email: ${order.user.email}`);
    if (order.user?.phone) console.log(`   Teléfono: ${order.user.phone}`);

    console.log('\n💰 RESUMEN FINANCIERO:');
    console.log(`   Subtotal: Q${order.subtotal || 0}`);
    console.log(`   Impuestos: Q${order.taxAmount || 0}`);
    console.log(`   Envío: Q${order.shippingAmount || 0}`);
    if (order.discountAmount > 0) console.log(`   Descuento: -Q${order.discountAmount}`);
    console.log(`   TOTAL: Q${order.totalAmount}`);

    console.log('\n💳 INFORMACIÓN DE PAGO:');
    console.log(`   Método: ${this.getPaymentMethodName(order.paymentMethod)}`);
    
    if (order.paymentMethod.includes('transfer')) {
      if (order.transferConfirmed) {
        console.log(`   Estado: ✅ Transferencia VALIDADA`);
      } else {
        console.log(`   Estado: ⚠️  Transferencia PENDIENTE (bloquea preparación)`);
      }
    } else if (order.paymentMethod === 'online_card') {
      console.log(`   Estado: ✅ Procesado automáticamente`);
    } else {
      console.log(`   Estado: ⏳ Se confirmará al entregar`);
    }

    if (order.trackingNumber) {
      console.log(`\n📦 Tracking: ${order.trackingNumber}`);
    }

    if (order.items?.length > 0) {
      console.log(`\n📦 PRODUCTOS (${order.items.length}):`);
      order.items.forEach(item => {
        console.log(`   • ${item.productName} x${item.quantity} = Q${item.totalPrice}`);
      });
    }
  }

  async showFullDashboard() {
    console.clear();
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                       📊 DASHBOARD COMPLETO                                ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');

    if (this.dashboard?.summary) {
      const s = this.dashboard.summary;
      console.log('\n📈 ESTADÍSTICAS GENERALES:');
      console.log('─'.repeat(80));
      console.log(`   ⏳ Pendientes confirmación: ${s.pendingConfirmation || 0}`);
      console.log(`   🏪 Listos para recogida: ${s.readyForPickup || 0}`);
      console.log(`   📦 Empaquetados: ${s.packedForShipping || 0}`);
      console.log(`   🏦 Transferencias pendientes: ${s.pendingTransfers || 0}`);
      console.log(`   📅 Pedidos hoy: ${s.ordersToday || 0}`);
      console.log(`   💰 Ingresos hoy: Q${(s.revenueToday || 0).toFixed(2)}`);
      console.log(`   📉 Stock bajo: ${s.lowStockCount || 0}`);
    }

    console.log('\n📊 DISTRIBUCIÓN POR TIPO:');
    console.log('─'.repeat(80));
    const byType = {
      pickup: this.allOrders.filter(o => o.deliveryType === 'pickup').length,
      delivery: this.allOrders.filter(o => o.deliveryType === 'delivery').length,
      express: this.allOrders.filter(o => o.deliveryType === 'express').length
    };
    console.log(`   🏪 Recogida: ${byType.pickup}`);
    console.log(`   🚚 Domicilio: ${byType.delivery}`);
    console.log(`   ⚡ Express: ${byType.express}`);

    console.log('\n📊 DISTRIBUCIÓN POR ESTADO:');
    console.log('─'.repeat(80));
    const byStatus = {};
    this.allOrders.forEach(order => {
      byStatus[order.status] = (byStatus[order.status] || 0) + 1;
    });
    Object.keys(byStatus).sort().forEach(status => {
      console.log(`   ${this.getStatusIcon(status)} ${status}: ${byStatus[status]}`);
    });

    await this.askQuestion('\n⏎ Presiona Enter para volver...');
  }

  async cancelOrder(orders) {
    console.log('\n❌ CANCELAR PEDIDO');
    const orderNum = await this.askQuestion('📦 Número a cancelar (0 para volver): ');
    if (orderNum === '0') return;

    const idx = parseInt(orderNum) - 1;
    if (idx < 0 || idx >= orders.length) {
      console.log('❌ Número inválido');
      await this.askQuestion('\n⏎ Presiona Enter...');
      return;
    }

    const order = orders[idx];
    console.log(`\n📦 Pedido: #${order.orderNumber}`);
    console.log(`💰 Total: Q${order.totalAmount}`);
    
    const reason = await this.askQuestion('📝 Motivo de cancelación: ');
    if (!reason.trim()) {
      console.log('❌ Debes especificar un motivo');
      await this.askQuestion('\n⏎ Presiona Enter...');
      return;
    }

    const confirm = await this.askQuestion('❌ ¿CONFIRMAR CANCELACIÓN? (s/n): ');
    if (confirm.toLowerCase() === 's') {
      try {
        await axios.patch(
          `${this.baseURL}/api/order-management/${order.id}/status`,
          { status: 'cancelled', notes: `CANCELADO: ${reason}` },
          { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
        );
        console.log('\n✅ Pedido cancelado. Stock restaurado.');
        await this.loadAllData();
      } catch (error) {
        console.error('❌ Error:', error.message);
      }
    }

    await this.askQuestion('\n⏎ Presiona Enter...');
  }

  async viewOrderDetails(orders) {
    const orderNum = await this.askQuestion('\n📦 Número de pedido: ');
    const idx = parseInt(orderNum) - 1;
    if (idx >= 0 && idx < orders.length) {
      await this.showDetailedOrder(orders[idx]);
      await this.askQuestion('\n⏎ Presiona Enter...');
    }
  }

  // Utilidades
  getStatusIcon(status) {
    const icons = {
      pending: '⏳', confirmed: '✅', preparing: '👨‍🍳',
      ready_pickup: '📦', packed: '📦', shipped: '🚚',
      delivered: '✅', picked_up: '✅', cancelled: '❌', refunded: '💸'
    };
    return icons[status] || '❓';
  }

  getPaymentMethodName(method) {
    const names = {
      'cash_on_delivery': 'Efectivo contra entrega',
      'cash_on_pickup': 'Efectivo en tienda',
      'card_on_delivery': 'Tarjeta contra entrega',
      'online_card': 'Tarjeta online (procesado)',
      'transfer': 'Transferencia bancaria',
      'transfer_on_delivery': 'Transferencia'
    };
    return names[method] || method;
  }

  getCustomerName(order) {
    if (order.user?.firstName || order.user?.lastName) {
      return `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim();
    }
    if (order.customerInfo?.name) return order.customerInfo.name;
    if (order.customer?.name) return order.customer.name;
    return 'Cliente';
  }

  askQuestion(q) {
    return new Promise(resolve => this.rl.question(q, resolve));
  }
}

// ============================================================================
// EJECUCIÓN
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