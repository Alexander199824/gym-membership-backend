// test-payment-processor-v2.js - Test Interactivo COMPLETO para Procesar Pagos v2.0
const axios = require('axios');
const readline = require('readline');

class CompletePaymentProcessor {
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
    console.log('💰 ELITE FITNESS CLUB - PROCESADOR INTERACTIVO DE PAGOS v2.0');
    console.log('='.repeat(80));
    console.log('🎯 CONFIRMAR O ANULAR PAGOS PENDIENTES CON REGISTRO COMPLETO');
    console.log('🏦 Transferencias: Aprobar/Rechazar con comprobantes');
    console.log('💵 Efectivo: Confirmar/Anular con registro de razones');
    console.log('📋 Registro completo para contexto de atención al cliente');
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
      
      console.log('\n🎉 ¡PROCESAMIENTO COMPLETADO CON REGISTRO COMPLETO!');
      console.log('📋 Todas las acciones han sido registradas para contexto futuro');
      
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
      const transfersResponse = await axios.get(`${this.baseURL}/api/payments/transfers/pending`, {
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
      const cashResponse = await axios.get(`${this.baseURL}/api/memberships/pending-cash-payment`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      if (cashResponse.data.success) {
        this.pendingCashMemberships = cashResponse.data.data.memberships || [];
        console.log(`   ✅ Membresías pendientes de efectivo: ${this.pendingCashMemberships.length}`);
      } else {
        console.log('   ⚠️ No se pudieron cargar membresías pendientes de efectivo');
      }

    } catch (error) {
      throw new Error(`Error cargando pagos pendientes: ${error.response?.data?.message || error.message}`);
    }
  }

  async showPendingPaymentsSummary() {
    console.log('\n3. 📋 RESUMEN COMPLETO DE PAGOS PENDIENTES');
    console.log('=' .repeat(70));
    
    const totalTransfers = this.pendingTransferPayments.length;
    const totalCashMemberships = this.pendingCashMemberships.length;
    const totalPending = totalTransfers + totalCashMemberships;
    
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
      const withoutProof = this.pendingTransferPayments.filter(p => !p.transferProof);
      
      console.log(`\n   🏦 TRANSFERENCIAS PENDIENTES: ${totalTransfers}`);
      console.log(`       💰 Monto total: $${transferAmount.toFixed(2)}`);
      console.log(`       📄 Con comprobante (listas para validar): ${withProof.length}`);
      console.log(`       🚫 Sin comprobante (esperando cliente): ${withoutProof.length}`);
      
      if (withProof.length > 0) {
        const withProofAmount = withProof.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        console.log(`       🎯 Monto listo para validar: $${withProofAmount.toFixed(2)}`);
      }
    }
    
    // Resumen de efectivo
    if (totalCashMemberships > 0) {
      const cashAmount = this.pendingCashMemberships.reduce((sum, m) => sum + parseFloat(m.price), 0);
      console.log(`\n   💵 MEMBRESÍAS PENDIENTES DE PAGO EN EFECTIVO: ${totalCashMemberships}`);
      console.log(`       💰 Monto total: $${cashAmount.toFixed(2)}`);
      console.log(`       🏪 Clientes deben pagar en gimnasio`);
      
      // Mostrar antiguedad de las más viejas
      const oldestCash = this.pendingCashMemberships.reduce((oldest, current) => {
        return new Date(current.createdAt) < new Date(oldest.createdAt) ? current : oldest;
      });
      const hoursOldest = (new Date() - new Date(oldestCash.createdAt)) / (1000 * 60 * 60);
      console.log(`       ⏰ Más antigua: ${hoursOldest.toFixed(1)} horas esperando`);
    }

    console.log('\n⚠️  IMPORTANTE - REGISTRO COMPLETO:');
    console.log('   📝 Se registrará quién procesó cada pago');
    console.log('   📅 Se registrará fecha y hora exacta de cada acción');
    console.log('   💬 Se registrará razón completa para anulaciones/rechazos');
    console.log('   📧 Se enviarán notificaciones automáticas a clientes');
    console.log('   💾 Todo quedará guardado para contexto de atención al cliente');
    console.log('   🔄 Se actualizarán automáticamente: Pagos, Membresías, Finanzas, Horarios');
  }

  async processAllTransferPayments() {
    console.log('\n4. 🏦 PROCESANDO TODAS LAS TRANSFERENCIAS PENDIENTES');
    console.log('=' .repeat(70));
    
    if (this.pendingTransferPayments.length === 0) {
      console.log('✅ No hay transferencias pendientes');
      return;
    }

    console.log(`📋 TOTAL A PROCESAR: ${this.pendingTransferPayments.length} transferencias`);
    console.log('🔍 Se mostrará información detallada de cada transferencia\n');
    
    for (let i = 0; i < this.pendingTransferPayments.length; i++) {
      const transfer = this.pendingTransferPayments[i];
      console.log(`\n${'='.repeat(50)}`);
      await this.processIndividualTransfer(transfer, i + 1);
      console.log(`${'='.repeat(50)}`);
    }
  }

  async processIndividualTransfer(transfer, index) {
    console.log(`🏦 TRANSFERENCIA #${index} de ${this.pendingTransferPayments.length}`);
    console.log('-'.repeat(50));
    
    // ✅ Información básica del pago
    console.log('💰 INFORMACIÓN DEL PAGO:');
    console.log(`   🆔 Payment ID: ${transfer.id}`);
    console.log(`   💵 Monto: $${transfer.amount}`);
    console.log(`   📋 Tipo: ${this.formatPaymentType(transfer.paymentType)}`);
    console.log(`   📅 Fecha de pago: ${this.formatDate(transfer.paymentDate)}`);
    console.log(`   📅 Registrado: ${this.formatDate(transfer.createdAt)}`);
    
    const hoursWaiting = (new Date() - new Date(transfer.createdAt)) / (1000 * 60 * 60);
    const priority = this.getPriorityLevel(hoursWaiting);
    console.log(`   ⏰ Tiempo esperando: ${hoursWaiting.toFixed(1)} horas (${priority})`);
    
    // ✅ Información del cliente
    console.log('\n👤 INFORMACIÓN DEL CLIENTE:');
    if (transfer.user) {
      console.log(`   👥 Nombre: ${transfer.user.firstName} ${transfer.user.lastName}`);
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
      console.log(`   🌐 Ver comprobante: ${transfer.transferProof}`);
      console.log(`   🎯 LISTO PARA VALIDAR`);
    } else {
      console.log(`   ❌ COMPROBANTE NO SUBIDO`);
      console.log(`   ⚠️ Cliente debe subir comprobante antes de validar`);
    }
    
    // ✅ Membresía asociada
    if (transfer.membership) {
      console.log('\n🏋️ MEMBRESÍA ASOCIADA:');
      console.log(`   🎯 Tipo: ${transfer.membership.type}`);
      console.log(`   📅 Fecha inicio: ${this.formatDate(transfer.membership.startDate)}`);
      console.log(`   📅 Fecha vencimiento: ${this.formatDate(transfer.membership.endDate)}`);
      console.log(`   🆔 Membership ID: ${transfer.membership.id}`);
    }
    
    // ✅ Personal que registró
    if (transfer.registeredByUser) {
      console.log('\n👔 REGISTRADO POR:');
      console.log(`   👤 Staff: ${transfer.registeredByUser.firstName} ${transfer.registeredByUser.lastName}`);
      console.log(`   🎭 Rol: ${transfer.registeredByUser.role}`);
    }
    
    // ✅ Descripción y notas
    if (transfer.description) {
      console.log(`\n📝 Descripción: ${transfer.description}`);
    }
    if (transfer.notes) {
      console.log(`📝 Notas adicionales: ${transfer.notes}`);
    }

    // ✅ Preguntar qué hacer
    console.log('\n🤔 ¿QUÉ DESEAS HACER CON ESTA TRANSFERENCIA?');
    
    if (transfer.transferProof) {
      console.log('   1. ✅ APROBAR - Confirmar transferencia válida y activar membresía');
      console.log('   2. ❌ RECHAZAR - Transferencia inválida, anular y notificar cliente');
      console.log('   3. ⏩ SALTAR - Procesar después');
      console.log('   4. 🔍 VER COMPROBANTE - Abrir URL del comprobante');
    } else {
      console.log('   1. ❌ RECHAZAR - Transferencia sin comprobante, anular');
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
      console.log('📝 Es importante registrar la razón de aprobación para el contexto');
      const reason = await this.askQuestion('💬 Razón de aprobación (ejemplo: "Comprobante válido, datos correctos"): ');
      
      const response = await axios.post(
        `${this.baseURL}/api/payments/${transfer.id}/validate-transfer`,
        {
          approved: true,
          notes: reason.trim() || 'Transferencia aprobada por administrador - Comprobante válido'
        },
        {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }
      );

      if (response.data.success) {
        console.log('\n   🎉 ¡TRANSFERENCIA APROBADA EXITOSAMENTE!');
        console.log('   ✅ Pago marcado como completado');
        console.log('   ✅ Membresía activada automáticamente');
        console.log('   ✅ Movimiento financiero registrado automáticamente');
        console.log('   ✅ Horarios reservados automáticamente');
        console.log('   ✅ Email de confirmación enviado automáticamente');
        console.log(`   📝 Razón registrada: "${reason || 'Comprobante válido'}"`);
        
        this.processedActions.push({
          type: 'transfer',
          action: 'approved',
          payment: transfer,
          result: 'success',
          reason: reason.trim() || 'Comprobante válido',
          timestamp: new Date(),
          amount: parseFloat(transfer.amount)
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
      console.log('📝 La razón de rechazo es OBLIGATORIA para contexto de atención al cliente');
      console.log('💡 Ejemplos: "Comprobante ilegible", "Monto incorrecto", "Transferencia duplicada"');
      
      const reason = await this.askQuestion('💬 Razón DETALLADA de rechazo (OBLIGATORIA): ');
      
      if (!reason.trim()) {
        console.log('   ⚠️ La razón de rechazo es obligatoria. Saltando transferencia...');
        return;
      }
      
      const response = await axios.post(
        `${this.baseURL}/api/payments/${transfer.id}/reject-transfer`,
        {
          reason: reason.trim()
        },
        {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }
      );

      if (response.data.success) {
        console.log('\n   ❌ TRANSFERENCIA RECHAZADA EXITOSAMENTE');
        console.log('   ✅ Pago marcado como fallido');
        console.log('   ✅ Membresía cancelada automáticamente');
        console.log('   ✅ Cliente notificado automáticamente del rechazo');
        console.log('   ✅ Razón del rechazo registrada para contexto');
        console.log(`   📝 Razón registrada: "${reason.trim()}"`);
        
        this.processedActions.push({
          type: 'transfer',
          action: 'rejected',
          payment: transfer,
          result: 'success',
          reason: reason.trim(),
          timestamp: new Date(),
          amount: parseFloat(transfer.amount)
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
    console.log('\n5. 💵 PROCESANDO TODAS LAS MEMBRESÍAS PENDIENTES DE PAGO EN EFECTIVO');
    console.log('=' .repeat(70));
    
    if (this.pendingCashMemberships.length === 0) {
      console.log('✅ No hay membresías pendientes de pago en efectivo');
      return;
    }

    console.log(`📋 TOTAL A PROCESAR: ${this.pendingCashMemberships.length} membresías`);
    console.log('💵 Clientes que deben pagar en efectivo en el gimnasio\n');
    
    for (let i = 0; i < this.pendingCashMemberships.length; i++) {
      const membership = this.pendingCashMemberships[i];
      console.log(`\n${'='.repeat(50)}`);
      await this.processIndividualCashPayment(membership, i + 1);
      console.log(`${'='.repeat(50)}`);
    }
  }

  async processIndividualCashPayment(membership, index) {
    console.log(`💵 MEMBRESÍA PENDIENTE DE EFECTIVO #${index} de ${this.pendingCashMemberships.length}`);
    console.log('-'.repeat(50));
    
    // ✅ Información de la membresía
    console.log('🏋️ INFORMACIÓN DE LA MEMBRESÍA:');
    console.log(`   🆔 Membership ID: ${membership.id}`);
    console.log(`   💵 Precio a pagar: $${membership.price}`);
    console.log(`   📋 Tipo: ${membership.type || 'Membresía'}`);
    console.log(`   📅 Registrada: ${this.formatDate(membership.createdAt)}`);
    
    const hoursWaiting = (new Date() - new Date(membership.createdAt)) / (1000 * 60 * 60);
    const priority = this.getPriorityLevel(hoursWaiting);
    console.log(`   ⏰ Tiempo esperando: ${hoursWaiting.toFixed(1)} horas (${priority})`);
    
    // ✅ Información del cliente
    console.log('\n👤 INFORMACIÓN DEL CLIENTE:');
    if (membership.user) {
      console.log(`   👥 Nombre: ${membership.user.name}`);
      console.log(`   📧 Email: ${membership.user.email || 'No proporcionado'}`);
      console.log(`   📞 Teléfono: ${membership.user.phone || 'No proporcionado'}`);
    } else {
      console.log(`   ⚠️ Información de cliente no disponible`);
    }
    
    // ✅ Información del plan
    if (membership.plan) {
      console.log('\n💳 PLAN SELECCIONADO:');
      console.log(`   📋 Plan: ${membership.plan.name}`);
      console.log(`   💰 Precio del plan: $${membership.plan.price}`);
    }
    
    // ✅ Horarios reservados
    if (membership.schedule && Object.keys(membership.schedule).length > 0) {
      console.log('\n📅 HORARIOS RESERVADOS (pendientes de activación):');
      let hasSchedule = false;
      Object.entries(membership.schedule).forEach(([day, slots]) => {
        if (slots && slots.length > 0) {
          hasSchedule = true;
          const dayName = this.getDayName(day);
          const timeRanges = slots.map(slot => {
            if (typeof slot === 'object') {
              return slot.timeRange || `${slot.openTime || ''}-${slot.closeTime || ''}`;
            }
            return slot;
          }).join(', ');
          console.log(`      ${dayName}: ${timeRanges}`);
        }
      });
      
      if (!hasSchedule) {
        console.log('      📝 Sin horarios específicos reservados');
      }
    } else {
      console.log('\n📅 Sin horarios reservados');
    }
    
    // ✅ Personal que registró
    if (membership.registeredBy) {
      console.log('\n👔 REGISTRADO POR:');
      console.log(`   👤 Staff: ${membership.registeredBy.name}`);
    }

    // ✅ Preguntar qué hacer
    console.log('\n🤔 ¿QUÉ DESEAS HACER CON ESTA MEMBRESÍA?');
    console.log('   1. ✅ CONFIRMAR - Cliente pagó en efectivo, activar membresía completa');
    console.log('   2. ❌ ANULAR - Cliente no pagó, anular membresía y liberar horarios');
    console.log('   3. ⏩ SALTAR - Procesar después (cliente puede venir más tarde)');
    
    const action = await this.askQuestion('\n👆 Tu decisión: ');
    
    switch (action.trim()) {
      case '1':
        await this.confirmCashPayment(membership);
        break;
      case '2':
        await this.cancelCashPayment(membership);
        break;
      case '3':
        console.log('   ⏩ Saltando membresía - cliente puede pagar más tarde...');
        break;
      default:
        console.log('   ⚠️ Opción inválida, saltando...');
        break;
    }
  }

  async confirmCashPayment(membership) {
    console.log('\n✅ CONFIRMANDO PAGO EN EFECTIVO...');
    console.log('💵 Registrando que el cliente pagó en el gimnasio');
    
    try {
      const response = await axios.post(
        `${this.baseURL}/api/payments/activate-cash-membership`,
        {
          membershipId: membership.id
        },
        {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }
      );

      if (response.data.success) {
        console.log('\n   🎉 ¡PAGO EN EFECTIVO CONFIRMADO EXITOSAMENTE!');
        console.log('   ✅ Pago marcado como completado automáticamente');
        console.log('   ✅ Membresía activada automáticamente');
        console.log('   ✅ Movimiento financiero registrado automáticamente');
        console.log('   ✅ Horarios reservados automáticamente');
        console.log('   ✅ Email de confirmación enviado automáticamente');
        console.log('   💵 Cliente puede usar el gimnasio inmediatamente');
        
        this.processedActions.push({
          type: 'cash',
          action: 'confirmed',
          membership: membership,
          result: 'success',
          reason: 'Cliente pagó en efectivo en el gimnasio',
          timestamp: new Date(),
          amount: parseFloat(membership.price)
        });
      }
    } catch (error) {
      console.log('\n   ❌ ERROR AL CONFIRMAR PAGO EN EFECTIVO');
      console.log(`   💥 ${error.response?.data?.message || error.message}`);
      
      this.processedActions.push({
        type: 'cash',
        action: 'confirmed',
        membership: membership,
        result: 'error',
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  async cancelCashPayment(membership) {
    console.log('\n❌ ANULANDO MEMBRESÍA POR FALTA DE PAGO...');
    
    try {
      console.log('📝 La razón de anulación es CRÍTICA para contexto de atención al cliente');
      console.log('💡 Ejemplos: "Cliente no se presentó a pagar", "Cliente canceló", "Error en el registro"');
      
      // ✅ Buscar el pago asociado a esta membresía
      console.log('🔍 Buscando pago asociado a la membresía...');
      
      let paymentId = null;
      try {
        const paymentsResponse = await axios.get(`${this.baseURL}/api/payments`, {
          headers: { 'Authorization': `Bearer ${this.adminToken}` },
          params: {
            limit: 50,
            includeAll: 'true'
          }
        });
        
        if (paymentsResponse.data.success) {
          const payments = paymentsResponse.data.data.payments || [];
          const associatedPayment = payments.find(p => 
            p.membershipId === membership.id && 
            p.paymentMethod === 'cash' && 
            p.status === 'pending'
          );
          
          if (associatedPayment) {
            paymentId = associatedPayment.id;
            console.log(`   ✅ Pago encontrado: ID ${paymentId}`);
          } else {
            console.log('   ⚠️ No se encontró pago asociado, procediendo solo con membresía');
          }
        }
      } catch (searchError) {
        console.log('   ⚠️ Error buscando pago asociado, procediendo solo con membresía');
      }
      
      const reason = await this.askQuestion('💬 Razón DETALLADA de anulación (OBLIGATORIA): ');
      
      if (!reason.trim()) {
        console.log('   ⚠️ La razón de anulación es obligatoria. Saltando membresía...');
        return;
      }
      
      // ✅ Usar la nueva ruta para anular pago en efectivo si encontramos el pago
      if (paymentId) {
        const response = await axios.post(
          `${this.baseURL}/api/payments/${paymentId}/cancel-cash-payment`,
          {
            reason: reason.trim()
          },
          {
            headers: { 'Authorization': `Bearer ${this.adminToken}` }
          }
        );

        if (response.data.success) {
          console.log('\n   ❌ MEMBRESÍA ANULADA EXITOSAMENTE');
          console.log('   ✅ Pago marcado como cancelado automáticamente');
          console.log('   ✅ Membresía cancelada automáticamente');
          console.log('   ✅ Horarios liberados automáticamente');
          console.log('   ✅ Cliente notificado automáticamente de la anulación');
          console.log('   ✅ Razón de anulación registrada para contexto');
          console.log(`   📝 Razón registrada: "${reason.trim()}"`);
          
          this.processedActions.push({
            type: 'cash',
            action: 'cancelled',
            membership: membership,
            paymentId: paymentId,
            result: 'success',
            reason: reason.trim(),
            timestamp: new Date(),
            amount: parseFloat(membership.price)
          });
        }
      } else {
        // Fallback: cancelar solo la membresía
        const response = await axios.post(
          `${this.baseURL}/api/memberships/${membership.id}/cancel`,
          {
            reason: `Pago en efectivo no realizado: ${reason.trim()}`
          },
          {
            headers: { 'Authorization': `Bearer ${this.adminToken}` }
          }
        );

        if (response.data.success) {
          console.log('\n   ❌ MEMBRESÍA CANCELADA (fallback)');
          console.log('   ✅ Membresía cancelada');
          console.log('   ✅ Horarios liberados');
          console.log(`   📝 Razón: "${reason.trim()}"`);
          
          this.processedActions.push({
            type: 'cash',
            action: 'cancelled_fallback',
            membership: membership,
            result: 'success',
            reason: reason.trim(),
            timestamp: new Date(),
            amount: parseFloat(membership.price)
          });
        }
      }
      
    } catch (error) {
      console.log('\n   ❌ ERROR AL ANULAR MEMBRESÍA');
      console.log(`   💥 ${error.response?.data?.message || error.message}`);
      
      this.processedActions.push({
        type: 'cash',
        action: 'cancelled',
        membership: membership,
        result: 'error',
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  async showFinalProcessingSummary() {
    console.log('\n6. 📊 RESUMEN FINAL DEL PROCESAMIENTO');
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
    
    // ✅ Resumen por tipo de acción
    if (successful.length > 0) {
      console.log('\n✅ ACCIONES EXITOSAS EJECUTADAS:');
      
      const transfers = successful.filter(a => a.type === 'transfer');
      const cash = successful.filter(a => a.type === 'cash');
      
      if (transfers.length > 0) {
        console.log(`\n   🏦 TRANSFERENCIAS PROCESADAS: ${transfers.length}`);
        transfers.forEach((action, index) => {
          const actionText = action.action === 'approved' ? 'APROBADA' : 'RECHAZADA';
          const icon = action.action === 'approved' ? '✅' : '❌';
          console.log(`      ${index + 1}. ${icon} ID: ${action.payment.id} - $${action.amount} - ${actionText}`);
          console.log(`         📝 Razón: "${action.reason}"`);
          console.log(`         📅 Procesado: ${this.formatDate(action.timestamp)}`);
        });
      }
      
      if (cash.length > 0) {
        console.log(`\n   💵 MEMBRESÍAS DE EFECTIVO PROCESADAS: ${cash.length}`);
        cash.forEach((action, index) => {
          const actionText = action.action === 'confirmed' ? 'CONFIRMADA' : 
                            action.action === 'cancelled' ? 'ANULADA' : 
                            action.action.toUpperCase();
          const icon = action.action === 'confirmed' ? '✅' : '❌';
          console.log(`      ${index + 1}. ${icon} ID: ${action.membership.id} - $${action.amount} - ${actionText}`);
          console.log(`         📝 Razón: "${action.reason}"`);
          console.log(`         📅 Procesado: ${this.formatDate(action.timestamp)}`);
        });
      }
    }
    
    // ✅ Mostrar errores si los hay
    if (errors.length > 0) {
      console.log('\n❌ ACCIONES CON ERRORES:');
      errors.forEach((action, index) => {
        const itemId = action.payment?.id || action.membership?.id || 'N/A';
        console.log(`   ${index + 1}. ${action.type.toUpperCase()} ID: ${itemId} - ERROR`);
        console.log(`      💥 ${action.error}`);
      });
    }

    // ✅ Resumen financiero
    const totalAmount = successful.reduce((sum, action) => sum + (action.amount || 0), 0);
    console.log(`\n💰 IMPACTO FINANCIERO TOTAL: $${totalAmount.toFixed(2)}`);
    
    // ✅ Efectos del procesamiento
    console.log('\n🔄 EFECTOS AUTOMÁTICOS EJECUTADOS POR EL BACKEND:');
    console.log('   📊 Movimientos financieros creados automáticamente');
    console.log('   🏋️ Membresías activadas/canceladas automáticamente');
    console.log('   📅 Horarios reservados/liberados automáticamente');
    console.log('   📧 Emails de notificación enviados automáticamente');
    console.log('   💾 Estados actualizados en todas las tablas relacionadas');
    console.log('   📝 Razones y contexto guardados para atención al cliente');

    console.log('\n📋 REGISTRO COMPLETO PARA ATENCIÓN AL CLIENTE:');
    console.log('   ✅ Todas las razones de anulación/rechazo están registradas');
    console.log('   ✅ Fechas y horas exactas de cada acción');
    console.log('   ✅ Personal responsable de cada decisión');
    console.log('   ✅ Contexto completo disponible para futuras consultas');
  }

  // ✅ Métodos auxiliares
  async askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
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

  getPriorityLevel(hoursWaiting) {
    if (hoursWaiting > 72) return '🔴 CRÍTICA (>3 días)';
    if (hoursWaiting > 48) return '🟠 ALTA (>2 días)';
    if (hoursWaiting > 24) return '🟡 MEDIA (>1 día)';
    if (hoursWaiting > 12) return '🟢 NORMAL (>12h)';
    return '🔵 RECIENTE (<12h)';
  }

  getDayName(day) {
    const dayNames = {
      monday: 'Lunes',
      tuesday: 'Martes',
      wednesday: 'Miércoles',
      thursday: 'Jueves',
      friday: 'Viernes',
      saturday: 'Sábado',
      sunday: 'Domingo'
    };
    return dayNames[day] || day;
  }
}

// ✅ Función de ayuda
function showHelp() {
  console.log('\n💰 Elite Fitness Club - Procesador Interactivo COMPLETO v2.0\n');
  console.log('🎯 CONFIRMAR O ANULAR PAGOS PENDIENTES CON REGISTRO COMPLETO:');
  console.log('  🏦 Transferencias: Aprobar/Rechazar con comprobantes');
  console.log('  💵 Efectivo: Confirmar/Anular membresías pendientes');
  console.log('  📝 Registro completo de razones para contexto');
  console.log('  🤔 Modo interactivo - pregunta antes de cada acción');
  console.log('  ✅ Actualización automática de todas las tablas\n');
  
  console.log('✨ NUEVAS FUNCIONALIDADES v2.0:');
  console.log('  ✅ Integración completa con backend en producción');
  console.log('  ✅ Nueva ruta para anular pagos en efectivo');
  console.log('  ✅ Registro obligatorio de razones de anulación/rechazo');
  console.log('  ✅ Contexto completo para atención al cliente');
  console.log('  ✅ URLs directas a comprobantes de transferencia');
  console.log('  ✅ Información detallada de membresías y horarios');
  console.log('  ✅ Priorización automática por tiempo de espera');
  console.log('  ✅ Resumen financiero completo');
  console.log('  ✅ Notificaciones automáticas a clientes\n');
  
  console.log('🔄 EFECTOS AUTOMÁTICOS DEL BACKEND:');
  console.log('  📊 Movimientos en FinancialMovements');
  console.log('  🏋️ Activación/cancelación de membresías');
  console.log('  📅 Reserva/liberación de horarios');
  console.log('  📧 Emails automáticos a clientes');
  console.log('  💾 Estados actualizados en todas las tablas\n');
  
  console.log('🚀 USO:');
  console.log('  node test-payment-processor-v2.js        # Procesar pagos');
  console.log('  node test-payment-processor-v2.js --help # Mostrar ayuda\n');
  
  console.log('⚠️  IMPORTANTE:');
  console.log('  • Requiere backend en ejecución');
  console.log('  • Requiere privilegios de administrador');
  console.log('  • Los cambios son PERMANENTES');
  console.log('  • Se registra TODO para contexto futuro');
  console.log('  • Compatible con sistema en producción\n');
}

// ✅ Función principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  console.log('🚀 Iniciando Procesador Interactivo de Pagos v2.0...\n');
  
  const processor = new CompletePaymentProcessor();
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

module.exports = { CompletePaymentProcessor };