// test-payment-processor-v3.js - Test COMPLETO v3.0 con emails y status unificado
const axios = require('axios');
const readline = require('readline');

class UnifiedPaymentProcessor {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.adminToken = null;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Datos de pagos pendientes
    this.pendingTransferPayments = [];
    this.pendingCashMemberships = [];
    this.processedActions = [];
  }

  async processAllPendingPayments() {
    console.log('💰 ELITE FITNESS CLUB - PROCESADOR UNIFICADO v3.0');
    console.log('='.repeat(80));
    console.log('🎯 CONFIRMAR O ANULAR TODOS LOS PAGOS PENDIENTES');
    console.log('🏦 Transferencias: Aprobar/Rechazar → Status: completed/cancelled');
    console.log('💵 Efectivo: Confirmar/Anular → Status: completed/cancelled');
    console.log('📧 Emails automáticos con motivos para TODOS los casos');
    console.log('📝 Notas automáticas mejoradas con staff y timestamp');
    console.log('⚠️  MODO INTERACTIVO: Se pregunta antes de cada acción\n');
    
    try {
      await this.authenticateAsAdmin();
      await this.loadAllPendingPayments();
      await this.showPendingPaymentsSummary();
      
      // Procesar transferencias si las hay
      if (this.pendingTransferPayments.length > 0) {
        console.log('\n🏦 INICIANDO PROCESAMIENTO DE TRANSFERENCIAS...');
        await this.processAllTransferPayments();
      }
      
      // Procesar pagos en efectivo si los hay  
      if (this.pendingCashMemberships.length > 0) {
        console.log('\n💵 INICIANDO PROCESAMIENTO DE PAGOS EN EFECTIVO...');
        await this.processAllCashPayments();
      }
      
      // Mostrar resumen final
      await this.showFinalProcessingSummary();
      
      console.log('\n🎉 ¡PROCESAMIENTO UNIFICADO COMPLETADO!');
      console.log('📧 Todos los emails fueron enviados automáticamente');
      console.log('📋 Status unificado: completed/cancelled para ambos tipos');
      
    } catch (error) {
      console.error('\n❌ Error en el procesamiento:', error.message);
      if (error.response?.data) {
        console.error('📋 Detalles del error:', JSON.stringify(error.response.data, null, 2));
      }
    } finally {
      this.rl.close();
    }
  }

  async authenticateAsAdmin() {
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
      throw new Error(`Autenticación falló: ${error.response?.data?.message || error.message}`);
    }
  }

  async loadAllPendingPayments() {
    console.log('\n2. 📊 Cargando todos los pagos pendientes...');
    
    try {
      // ✅ Cargar transferencias pendientes
      console.log('   🏦 Cargando transferencias pendientes...');
      const transfersResponse = await axios.get(`${this.baseURL}/api/payments/transfers/pending-detailed`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      if (transfersResponse.data.success) {
        this.pendingTransferPayments = transfersResponse.data.data.transfers || [];
        console.log(`   ✅ Transferencias pendientes: ${this.pendingTransferPayments.length}`);
      } else {
        console.log('   ⚠️ No se pudieron cargar transferencias pendientes');
      }

      // ✅ Cargar membresías pendientes de pago en efectivo
      console.log('   💵 Cargando membresías pendientes de pago en efectivo...');
      const cashResponse = await axios.get(`${this.baseURL}/api/payments/cash/pending`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      if (cashResponse.data.success) {
        this.pendingCashMemberships = cashResponse.data.data.payments || [];
        console.log(`   ✅ Pagos en efectivo pendientes: ${this.pendingCashMemberships.length}`);
      } else {
        console.log('   ⚠️ No se pudieron cargar pagos en efectivo pendientes');
      }

    } catch (error) {
      throw new Error(`Error cargando pagos pendientes: ${error.response?.data?.message || error.message}`);
    }
  }

  async showPendingPaymentsSummary() {
    console.log('\n3. 📋 RESUMEN COMPLETO DE PAGOS PENDIENTES');
    console.log('=' .repeat(70));
    
    const totalTransfers = this.pendingTransferPayments.length;
    const totalCashPayments = this.pendingCashMemberships.length;
    const totalPending = totalTransfers + totalCashPayments;
    
    if (totalPending === 0) {
      console.log('✅ ¡EXCELENTE! No hay pagos pendientes para procesar');
      console.log('🎉 Todos los pagos están al día');
      return;
    }

    console.log(`📊 TOTAL DE ITEMS PENDIENTES: ${totalPending}`);
    
    // Resumen de transferencias
    if (totalTransfers > 0) {
      const transferAmount = this.pendingTransferPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const withProof = this.pendingTransferPayments.filter(p => p.transferProof);
      const critical = this.pendingTransferPayments.filter(p => p.priority === 'critical');
      
      console.log(`\n   🏦 TRANSFERENCIAS PENDIENTES: ${totalTransfers}`);
      console.log(`       💰 Monto total: Q${transferAmount.toFixed(2)}`);
      console.log(`       📄 Con comprobante (listas para validar): ${withProof.length}`);
      console.log(`       🔴 Críticas (>3 días): ${critical.length}`);
      console.log(`       📧 Email automático según resultado: ✅ Aprobada / ❌ Rechazada`);
    }
    
    // Resumen de efectivo
    if (totalCashPayments > 0) {
      const cashAmount = this.pendingCashMemberships.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const critical = this.pendingCashMemberships.filter(p => p.priority === 'critical');
      
      console.log(`\n   💵 PAGOS EN EFECTIVO PENDIENTES: ${totalCashPayments}`);
      console.log(`       💰 Monto total: Q${cashAmount.toFixed(2)}`);
      console.log(`       🔴 Críticos (>3 días): ${critical.length}`);
      console.log(`       🏪 Clientes deben pagar en gimnasio`);
      console.log(`       📧 Email automático según resultado: ✅ Confirmado / ❌ Anulado`);
    }

    console.log('\n⚡ NOVEDADES v3.0:');
    console.log('   📧 Emails automáticos para TODOS los resultados');
    console.log('   🔄 Status unificado: completed/cancelled (no más "failed")');
    console.log('   📝 Notas automáticas con staff y timestamp');
    console.log('   💬 Motivos obligatorios en anulaciones/rechazos');
    console.log('   🎯 Confirmación automática sin motivo necesario');
  }

  async processAllTransferPayments() {
    console.log('\n4. 🏦 PROCESANDO TODAS LAS TRANSFERENCIAS PENDIENTES');
    console.log('=' .repeat(70));
    
    if (this.pendingTransferPayments.length === 0) {
      console.log('✅ No hay transferencias pendientes');
      return;
    }

    // Ordenar por prioridad (críticas primero)
    const sortedTransfers = this.pendingTransferPayments.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, normal: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    console.log(`📋 TOTAL A PROCESAR: ${sortedTransfers.length} transferencias`);
    console.log('🔍 Ordenadas por prioridad (críticas primero)\n');
    
    for (let i = 0; i < sortedTransfers.length; i++) {
      const transfer = sortedTransfers[i];
      console.log(`\n${'='.repeat(50)}`);
      await this.processIndividualTransfer(transfer, i + 1);
      console.log(`${'='.repeat(50)}`);
    }
  }

  async processIndividualTransfer(transfer, index) {
    console.log(`🏦 TRANSFERENCIA #${index} de ${this.pendingTransferPayments.length} ${this.getPriorityIcon(transfer.priority)}`);
    console.log('-'.repeat(50));
    
    // ✅ Información básica del pago
    console.log('💰 INFORMACIÓN DEL PAGO:');
    console.log(`   🆔 Payment ID: ${transfer.id}`);
    console.log(`   💵 Monto: Q${transfer.amount}`);
    console.log(`   📋 Tipo: ${this.formatPaymentType(transfer.paymentType)}`);
    console.log(`   📅 Fecha de pago: ${this.formatDate(transfer.paymentDate)}`);
    console.log(`   📅 Registrado: ${this.formatDate(transfer.createdAt)}`);
    console.log(`   ⏰ Tiempo esperando: ${transfer.hoursWaiting} horas (${transfer.priority.toUpperCase()})`);
    
    // ✅ Información del cliente
    console.log('\n👤 INFORMACIÓN DEL CLIENTE:');
    if (transfer.user) {
      console.log(`   👥 Nombre: ${transfer.user.name}`);
      console.log(`   📧 Email: ${transfer.user.email}`);
      if (transfer.user.phone) {
        console.log(`   📞 Teléfono: ${transfer.user.phone}`);
      }
    } else {
      console.log(`   ⚠️ Cliente anónimo o no registrado`);
    }
    
    // ✅ Estado del comprobante
    console.log('\n📄 ESTADO DEL COMPROBANTE:');
    if (transfer.transferProof) {
      console.log(`   ✅ COMPROBANTE SUBIDO`);
      console.log(`   🔗 URL: ${transfer.transferProof}`);
      console.log(`   🎯 LISTO PARA VALIDAR`);
    } else {
      console.log(`   ❌ COMPROBANTE NO SUBIDO`);
      console.log(`   ⚠️ Cliente debe subir comprobante antes de validar`);
    }
    
    // ✅ Membresía asociada
    if (transfer.membership) {
      console.log('\n🏋️ MEMBRESÍA ASOCIADA:');
      console.log(`   🎯 Tipo: ${transfer.membership.type}`);
      console.log(`   📅 Fecha vencimiento: ${this.formatDate(transfer.membership.endDate)}`);
      console.log(`   🆔 Membership ID: ${transfer.membership.id}`);
    }
    
    // ✅ Personal que registró
    if (transfer.registeredBy) {
      console.log('\n👔 REGISTRADO POR:');
      console.log(`   👤 Staff: ${transfer.registeredBy.name}`);
    }

    // ✅ Preguntar qué hacer
    console.log('\n🤔 ¿QUÉ DESEAS HACER CON ESTA TRANSFERENCIA?');
    
    if (transfer.transferProof) {
      console.log('   1. ✅ APROBAR - Transferencia válida → Status: completed + Email confirmación');
      console.log('   2. ❌ RECHAZAR - Transferencia inválida → Status: cancelled + Email rechazo');
      console.log('   3. ⏩ SALTAR - Procesar después');
      console.log('   4. 🔍 VER COMPROBANTE - Abrir URL del comprobante');
    } else {
      console.log('   1. ❌ RECHAZAR - Sin comprobante → Status: cancelled + Email rechazo');
      console.log('   2. ⏩ SALTAR - Esperar a que cliente suba comprobante');
      console.log('   \n   ⚠️ No se puede aprobar sin comprobante');
    }
    
    const action = await this.askQuestion('\n👆 Tu decisión: ');
    
    if (transfer.transferProof) {
      switch (action.trim()) {
        case '1':
          await this.approveTransfer(transfer);
          break;
        case '2':
          await this.rejectTransfer(transfer);
          break;
        case '3':
          console.log('   ⏩ Saltando transferencia para procesar después...');
          break;
        case '4':
          console.log(`   🔍 Abrir en navegador: ${transfer.transferProof}`);
          console.log('   💡 Copia y pega la URL para ver el comprobante');
          // Volver a preguntar después de ver
          await this.processIndividualTransfer(transfer, index);
          return;
        default:
          console.log('   ⚠️ Opción inválida, saltando...');
          break;
      }
    } else {
      switch (action.trim()) {
        case '1':
          await this.rejectTransfer(transfer);
          break;
        case '2':
          console.log('   ⏩ Saltando - esperando comprobante del cliente...');
          break;
        default:
          console.log('   ⚠️ Opción inválida, saltando...');
          break;
      }
    }
  }

  async approveTransfer(transfer) {
    console.log('\n✅ APROBANDO TRANSFERENCIA...');
    
    try {
      console.log('📝 Razón de aprobación (opcional - se generará automática si no se proporciona):');
      const reason = await this.askQuestion('💬 Comentario opcional: ');
      
      const response = await axios.post(
        `${this.baseURL}/api/payments/${transfer.id}/validate-transfer`,
        {
          approved: true,
          notes: reason.trim() || undefined // undefined para que use nota automática
        },
        {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }
      );

      if (response.data.success) {
        console.log('\n   🎉 ¡TRANSFERENCIA APROBADA EXITOSAMENTE!');
        console.log('   ✅ Status: completed');
        console.log('   ✅ Membresía activada automáticamente');
        console.log('   ✅ Movimiento financiero registrado automáticamente');
        console.log('   ✅ Horarios reservados automáticamente');
        console.log('   ✅ Email de APROBACIÓN enviado automáticamente al cliente');
        console.log(`   📝 Nota automática: "Transferencia APROBADA por administrador"`);
        
        this.processedActions.push({
          type: 'transfer',
          action: 'approved',
          payment: transfer,
          result: 'success',
          reason: reason.trim() || 'Transferencia aprobada automáticamente',
          timestamp: new Date(),
          amount: parseFloat(transfer.amount),
          finalStatus: 'completed'
        });
      }
    } catch (error) {
      console.log('\n   ❌ ERROR AL APROBAR TRANSFERENCIA');
      console.log(`   💥 ${error.response?.data?.message || error.message}`);
      
      this.processedActions.push({
        type: 'transfer',
        action: 'approved',
        payment: transfer,
        result: 'error',
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  async rejectTransfer(transfer) {
    console.log('\n❌ RECHAZANDO TRANSFERENCIA...');
    
    try {
      console.log('📝 La razón de rechazo es OBLIGATORIA para el email al cliente');
      console.log('💡 Ejemplos: "Comprobante ilegible", "Monto incorrecto", "Transferencia duplicada"');
      
      const reason = await this.askQuestion('💬 Razón DETALLADA de rechazo (OBLIGATORIA): ');
      
      if (!reason.trim()) {
        console.log('   ⚠️ La razón de rechazo es obligatoria. Saltando transferencia...');
        return;
      }
      
      const response = await axios.post(
        `${this.baseURL}/api/payments/${transfer.id}/validate-transfer`,
        {
          approved: false,
          notes: reason.trim()
        },
        {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }
      );

      if (response.data.success) {
        console.log('\n   ❌ TRANSFERENCIA RECHAZADA EXITOSAMENTE');
        console.log('   ✅ Status: cancelled (nuevo estándar)');
        console.log('   ✅ Membresía cancelada automáticamente');
        console.log('   ✅ Email de RECHAZO enviado automáticamente al cliente');
        console.log('   ✅ Motivo incluido en el email para contexto');
        console.log(`   📝 Razón registrada: "${reason.trim()}"`);
        
        this.processedActions.push({
          type: 'transfer',
          action: 'rejected',
          payment: transfer,
          result: 'success',
          reason: reason.trim(),
          timestamp: new Date(),
          amount: parseFloat(transfer.amount),
          finalStatus: 'cancelled'
        });
      }
    } catch (error) {
      console.log('\n   ❌ ERROR AL RECHAZAR TRANSFERENCIA');
      console.log(`   💥 ${error.response?.data?.message || error.message}`);
      
      this.processedActions.push({
        type: 'transfer',
        action: 'rejected',
        payment: transfer,
        result: 'error',
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  async processAllCashPayments() {
    console.log('\n5. 💵 PROCESANDO TODOS LOS PAGOS EN EFECTIVO PENDIENTES');
    console.log('=' .repeat(70));
    
    if (this.pendingCashMemberships.length === 0) {
      console.log('✅ No hay pagos en efectivo pendientes');
      return;
    }

    // Ordenar por prioridad (críticos primero)
    const sortedCash = this.pendingCashMemberships.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, normal: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    console.log(`📋 TOTAL A PROCESAR: ${sortedCash.length} pagos en efectivo`);
    console.log('💵 Clientes que deben pagar en efectivo en el gimnasio\n');
    
    for (let i = 0; i < sortedCash.length; i++) {
      const cashPayment = sortedCash[i];
      console.log(`\n${'='.repeat(50)}`);
      await this.processIndividualCashPayment(cashPayment, i + 1);
      console.log(`${'='.repeat(50)}`);
    }
  }

  async processIndividualCashPayment(cashPayment, index) {
    console.log(`💵 PAGO EN EFECTIVO #${index} de ${this.pendingCashMemberships.length} ${this.getPriorityIcon(cashPayment.priority)}`);
    console.log('-'.repeat(50));
    
    // ✅ Información del pago
    console.log('💰 INFORMACIÓN DEL PAGO:');
    console.log(`   🆔 Payment ID: ${cashPayment.id}`);
    console.log(`   💵 Monto a pagar: Q${cashPayment.amount}`);
    console.log(`   📋 Tipo: ${this.formatPaymentType(cashPayment.paymentType)}`);
    console.log(`   📅 Registrado: ${this.formatDate(cashPayment.createdAt)}`);
    console.log(`   ⏰ Tiempo esperando: ${cashPayment.hoursWaiting} horas (${cashPayment.priority.toUpperCase()})`);
    
    // ✅ Información del cliente
    console.log('\n👤 INFORMACIÓN DEL CLIENTE:');
    if (cashPayment.client) {
      console.log(`   👥 Nombre: ${cashPayment.client.name}`);
      console.log(`   📧 Email: ${cashPayment.client.email || 'No proporcionado'}`);
      console.log(`   📞 Teléfono: ${cashPayment.client.phone || 'No proporcionado'}`);
      console.log(`   🎯 Tipo: ${cashPayment.client.type}`);
    } else {
      console.log(`   ⚠️ Información de cliente no disponible`);
    }
    
    // ✅ Información de la membresía
    if (cashPayment.membership) {
      console.log('\n🏋️ MEMBRESÍA ASOCIADA:');
      console.log(`   🆔 Membership ID: ${cashPayment.membership.id}`);
      console.log(`   📋 Tipo: ${cashPayment.membership.type}`);
      if (cashPayment.membership.plan) {
        console.log(`   💳 Plan: ${cashPayment.membership.plan.name}`);
      }
      if (cashPayment.membership.hasSchedule) {
        console.log(`   📅 Horarios reservados: SÍ (pendientes de activación)`);
      } else {
        console.log(`   📅 Horarios reservados: NO`);
      }
    }
    
    // ✅ Personal que registró
    if (cashPayment.registeredBy) {
      console.log('\n👔 REGISTRADO POR:');
      console.log(`   👤 Staff: ${cashPayment.registeredBy.name}`);
    }

    // ✅ Preguntar qué hacer
    console.log('\n🤔 ¿QUÉ DESEAS HACER CON ESTE PAGO EN EFECTIVO?');
    console.log('   1. ✅ CONFIRMAR - Cliente pagó en gimnasio → Status: completed + Email confirmación');
    console.log('   2. ❌ ANULAR - Cliente no pagó → Status: cancelled + Email anulación');
    console.log('   3. ⏩ SALTAR - Procesar después (cliente puede venir más tarde)');
    
    const action = await this.askQuestion('\n👆 Tu decisión: ');
    
    switch (action.trim()) {
      case '1':
        await this.confirmCashPayment(cashPayment);
        break;
      case '2':
        await this.cancelCashPayment(cashPayment);
        break;
      case '3':
        console.log('   ⏩ Saltando pago - cliente puede pagar más tarde...');
        break;
      default:
        console.log('   ⚠️ Opción inválida, saltando...');
        break;
    }
  }

  async confirmCashPayment(cashPayment) {
    console.log('\n✅ CONFIRMANDO PAGO EN EFECTIVO...');
    console.log('💵 Registrando que el cliente pagó en el gimnasio');
    
    try {
      const response = await axios.post(
        `${this.baseURL}/api/payments/activate-cash-membership`,
        {
          paymentId: cashPayment.id
        },
        {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }
      );

      if (response.data.success) {
        console.log('\n   🎉 ¡PAGO EN EFECTIVO CONFIRMADO EXITOSAMENTE!');
        console.log('   ✅ Status: completed');
        console.log('   ✅ Pago marcado como completado automáticamente');
        console.log('   ✅ Membresía activada automáticamente');
        console.log('   ✅ Movimiento financiero registrado automáticamente');
        console.log('   ✅ Horarios reservados automáticamente');
        console.log('   ✅ Email de CONFIRMACIÓN enviado automáticamente al cliente');
        console.log('   📝 Nota automática: "Pago en efectivo CONFIRMADO por [staff] en gimnasio"');
        console.log('   💵 Cliente puede usar el gimnasio inmediatamente');
        
        this.processedActions.push({
          type: 'cash',
          action: 'confirmed',
          payment: cashPayment,
          result: 'success',
          reason: 'Cliente pagó en efectivo en el gimnasio',
          timestamp: new Date(),
          amount: parseFloat(cashPayment.amount),
          finalStatus: 'completed'
        });
      }
    } catch (error) {
      console.log('\n   ❌ ERROR AL CONFIRMAR PAGO EN EFECTIVO');
      console.log(`   💥 ${error.response?.data?.message || error.message}`);
      
      this.processedActions.push({
        type: 'cash',
        action: 'confirmed',
        payment: cashPayment,
        result: 'error',
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  async cancelCashPayment(cashPayment) {
    console.log('\n❌ ANULANDO PAGO EN EFECTIVO...');
    
    try {
      console.log('📝 La razón de anulación es OBLIGATORIA para el email al cliente');
      console.log('💡 Ejemplos: "Cliente no se presentó a pagar", "Cliente canceló", "Error en el registro"');
      
      const reason = await this.askQuestion('💬 Razón DETALLADA de anulación (OBLIGATORIA): ');
      
      if (!reason.trim()) {
        console.log('   ⚠️ La razón de anulación es obligatoria. Saltando pago...');
        return;
      }
      
      const response = await axios.post(
        `${this.baseURL}/api/payments/${cashPayment.id}/cancel-cash-payment`,
        {
          reason: reason.trim()
        },
        {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }
      );

      if (response.data.success) {
        console.log('\n   ❌ PAGO EN EFECTIVO ANULADO EXITOSAMENTE');
        console.log('   ✅ Status: cancelled');
        console.log('   ✅ Pago marcado como cancelado automáticamente');
        console.log('   ✅ Membresía cancelada automáticamente');
        console.log('   ✅ Horarios liberados automáticamente');
        console.log('   ✅ Email de ANULACIÓN enviado automáticamente al cliente');
        console.log('   ✅ Motivo incluido en el email para contexto');
        console.log(`   📝 Razón registrada: "${reason.trim()}"`);
        
        this.processedActions.push({
          type: 'cash',
          action: 'cancelled',
          payment: cashPayment,
          result: 'success',
          reason: reason.trim(),
          timestamp: new Date(),
          amount: parseFloat(cashPayment.amount),
          finalStatus: 'cancelled'
        });
      }
      
    } catch (error) {
      console.log('\n   ❌ ERROR AL ANULAR PAGO EN EFECTIVO');
      console.log(`   💥 ${error.response?.data?.message || error.message}`);
      
      this.processedActions.push({
        type: 'cash',
        action: 'cancelled',
        payment: cashPayment,
        result: 'error',
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  async showFinalProcessingSummary() {
    console.log('\n6. 📊 RESUMEN FINAL DEL PROCESAMIENTO UNIFICADO');
    console.log('=' .repeat(70));
    
    if (this.processedActions.length === 0) {
      console.log('ℹ️ No se procesaron elementos en esta sesión');
      console.log('💡 Todas las acciones fueron saltadas o no había elementos pendientes');
      return;
    }

    const successful = this.processedActions.filter(a => a.result === 'success');
    const errors = this.processedActions.filter(a => a.result === 'error');
    
    console.log(`📋 TOTAL DE ACCIONES EJECUTADAS: ${this.processedActions.length}`);
    console.log(`   ✅ Exitosas: ${successful.length}`);
    console.log(`   ❌ Con errores: ${errors.length}`);
    
    // ✅ Resumen por resultado
    if (successful.length > 0) {
      console.log('\n✅ ACCIONES EXITOSAS EJECUTADAS:');
      
      const approved = successful.filter(a => a.action === 'approved' || a.action === 'confirmed');
      const rejected = successful.filter(a => a.action === 'rejected' || a.action === 'cancelled');
      
      console.log(`\n   ✅ CONFIRMACIONES/APROBACIONES: ${approved.length}`);
      approved.forEach((action, index) => {
        const type = action.type === 'transfer' ? '🏦 Transferencia' : '💵 Efectivo';
        const finalStatus = action.finalStatus || 'completed';
        console.log(`      ${index + 1}. ${type} ID: ${action.payment.id} - Q${action.amount} → ${finalStatus}`);
        console.log(`         📧 Email de confirmación enviado automáticamente`);
        console.log(`         📅 Procesado: ${this.formatDate(action.timestamp)}`);
      });
      
      if (rejected.length > 0) {
        console.log(`\n   ❌ RECHAZOS/ANULACIONES: ${rejected.length}`);
        rejected.forEach((action, index) => {
          const type = action.type === 'transfer' ? '🏦 Transferencia' : '💵 Efectivo';
          const finalStatus = action.finalStatus || 'cancelled';
          console.log(`      ${index + 1}. ${type} ID: ${action.payment.id} - Q${action.amount} → ${finalStatus}`);
          console.log(`         📝 Motivo: "${action.reason}"`);
          console.log(`         📧 Email de notificación enviado automáticamente`);
          console.log(`         📅 Procesado: ${this.formatDate(action.timestamp)}`);
        });
      }
    }
    
    // ✅ Mostrar errores si los hay
    if (errors.length > 0) {
      console.log('\n❌ ACCIONES CON ERRORES:');
      errors.forEach((action, index) => {
        const itemId = action.payment?.id || 'N/A';
        const type = action.type === 'transfer' ? '🏦 Transferencia' : '💵 Efectivo';
        console.log(`   ${index + 1}. ${type} ID: ${itemId} - ERROR`);
        console.log(`      💥 ${action.error}`);
      });
    }

    // ✅ Resumen financiero
    const totalAmount = successful.reduce((sum, action) => sum + (action.amount || 0), 0);
    console.log(`\n💰 IMPACTO FINANCIERO TOTAL: Q${totalAmount.toFixed(2)}`);
    
    // ✅ Resumen de status
    const completedActions = successful.filter(a => a.finalStatus === 'completed');
    const cancelledActions = successful.filter(a => a.finalStatus === 'cancelled');
    
    console.log('\n📊 DISTRIBUCIÓN DE STATUS FINAL:');
    console.log(`   ✅ completed: ${completedActions.length} (Q${completedActions.reduce((s, a) => s + a.amount, 0).toFixed(2)})`);
    console.log(`   ❌ cancelled: ${cancelledActions.length} (Q${cancelledActions.reduce((s, a) => s + a.amount, 0).toFixed(2)})`);

    // ✅ Efectos del procesamiento
    console.log('\n🔄 EFECTOS AUTOMÁTICOS EJECUTADOS POR EL BACKEND:');
    console.log('   📧 Emails enviados automáticamente a TODOS los clientes afectados');
    console.log('   📊 Movimientos financieros creados automáticamente');
    console.log('   🏋️ Membresías activadas/canceladas automáticamente');
    console.log('   📅 Horarios reservados/liberados automáticamente');
    console.log('   📝 Notas con staff y timestamp agregadas automáticamente');
    console.log('   💾 Estados actualizados en todas las tablas relacionadas');

    console.log('\n⚡ MEJORAS v3.0 APLICADAS:');
    console.log('   📧 Emails automáticos para TODOS los casos (confirmación y anulación)');
    console.log('   🔄 Status unificado: completed/cancelled (adiós "failed")');
    console.log('   📝 Notas automáticas con nombre del staff y timestamp');
    console.log('   💬 Motivos obligatorios incluidos en emails de anulación/rechazo');
    console.log('   🎯 Confirmaciones automáticas sin necesidad de motivo');
  }

  // ✅ Métodos auxiliares
  async askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  getPriorityIcon(priority) {
    const icons = {
      critical: '🔴',
      high: '🟠', 
      medium: '🟡',
      normal: '🟢'
    };
    return icons[priority] || '⚪';
  }

  formatPaymentType(type) {
    const types = {
      membership: '🏋️ Membresía',
      daily: '📅 Pago diario',
      bulk_daily: '📅 Pagos diarios múltiples',
      store_cash_delivery: '🛍️ Tienda (efectivo)',
      store_card_delivery: '🛍️ Tienda (tarjeta)',
      store_online: '🛍️ Tienda (online)',
      store_transfer: '🛍️ Tienda (transferencia)',
      store_other: '🛍️ Tienda (otro)'
    };
    return types[type] || `❓ ${type}`;
  }

  formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffHours = diffTime / (1000 * 60 * 60);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const formattedDate = date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    if (diffHours < 1) {
      return `${formattedDate} (hace ${Math.floor(diffTime / (1000 * 60))} min)`;
    } else if (diffDays === 0) {
      return `${formattedDate} (hace ${Math.floor(diffHours)}h)`;
    } else if (diffDays === 1) {
      return `${formattedDate} (ayer)`;
    } else if (diffDays < 7) {
      return `${formattedDate} (hace ${diffDays} días)`;
    } else {
      return formattedDate;
    }
  }
}

// ✅ Función de ayuda
function showHelp() {
  console.log('\n💰 Elite Fitness Club - Procesador Unificado v3.0\n');
  console.log('🎯 CONFIRMAR O ANULAR TODOS LOS PAGOS PENDIENTES:');
  console.log('  🏦 Transferencias: Aprobar/Rechazar → completed/cancelled');
  console.log('  💵 Efectivo: Confirmar/Anular → completed/cancelled');
  console.log('  📧 Emails automáticos para TODOS los casos');
  console.log('  📝 Notas automáticas con staff y timestamp');
  console.log('  🤔 Modo interactivo - pregunta antes de cada acción\n');
  
  console.log('⚡ NOVEDADES v3.0:');
  console.log('  📧 Emails automáticos: confirmación Y anulación');
  console.log('  🔄 Status unificado: completed/cancelled (no más "failed")');
  console.log('  📝 Notas automáticas mejoradas con staff y timestamp');
  console.log('  💬 Motivos obligatorios en anulaciones/rechazos');
  console.log('  🎯 Confirmaciones automáticas sin motivo necesario');
  console.log('  🏆 Priorización automática (críticos primero)\n');
  
  console.log('📧 EMAILS AUTOMÁTICOS ENVIADOS:');
  console.log('  ✅ Transferencia aprobada → Email de confirmación');
  console.log('  ❌ Transferencia rechazada → Email de rechazo con motivo');
  console.log('  ✅ Efectivo confirmado → Email de confirmación');
  console.log('  ❌ Efectivo anulado → Email de anulación con motivo\n');
  
  console.log('🔄 EFECTOS AUTOMÁTICOS:');
  console.log('  📊 Movimientos financieros');
  console.log('  🏋️ Activación/cancelación de membresías');
  console.log('  📅 Reserva/liberación de horarios');
  console.log('  📝 Notas con contexto completo\n');
  
  console.log('🚀 USO:');
  console.log('  node test-payment-processor-v3.js        # Procesar pagos');
  console.log('  node test-payment-processor-v3.js --help # Mostrar ayuda\n');
  
  console.log('⚠️  IMPORTANTE:');
  console.log('  • Status unificado: completed/cancelled para ambos tipos');
  console.log('  • Emails automáticos para TODOS los resultados');
  console.log('  • Motivos obligatorios en anulaciones/rechazos');
  console.log('  • Notas automáticas con staff y timestamp');
  console.log('  • Los cambios son PERMANENTES\n');
}

// ✅ Función principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  console.log('🚀 Iniciando Procesador Unificado v3.0...\n');
  
  const processor = new UnifiedPaymentProcessor();
  await processor.processAllPendingPayments();
}

// ✅ Ejecutar si se llama directamente
if (require.main === module) {
  main().catch((error) => {
    console.error('\n🚨 ERROR CRÍTICO EN LA APLICACIÓN:');
    console.error(`❌ ${error.message}\n`);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('💡 SOLUCIÓN: Asegúrate de que tu servidor backend esté ejecutándose');
      console.error('   👉 npm start (en el directorio del backend)');
    } else if (error.message.includes('Autenticación falló')) {
      console.error('💡 SOLUCIÓN: Verifica las credenciales de administrador');
      console.error('   👉 Email: admin@gym.com');
      console.error('   👉 Password: Admin123!');
    }
    
    process.exit(1);
  });
}

module.exports = { UnifiedPaymentProcessor };