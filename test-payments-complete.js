// test-payments-complete.js - VISUALIZADOR COMPLETO DE PAGOS v3.0 (DESDE CERO)
const axios = require('axios');

class CompletePaymentsViewer {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.adminToken = null;
    
    // Todos los pagos por método
    this.allPayments = [];
    this.cashPayments = [];
    this.transferPayments = [];
    this.cardPayments = [];
    
    // Pagos pendientes por método
    this.pendingCashPayments = [];
    this.pendingTransferPayments = [];
    this.pendingCardPayments = [];
    
    // Pagos completados por método
    this.completedCashPayments = [];
    this.completedTransferPayments = [];
    this.completedCardPayments = [];
    
    // Estadísticas
    this.paymentStatistics = null;
  }

  async viewAllPayments() {
    console.log('💰 VISUALIZADOR COMPLETO DE PAGOS - DESDE CERO v3.0');
    console.log('='.repeat(80));
    console.log('🔍 ANÁLISIS COMPLETO: Ver TODOS los pagos por método (Efectivo + Transferencia + Tarjeta)');
    console.log('📋 MODO SOLO CONSULTA: Datos reales de la base de datos\n');
    
    try {
      await this.loginAdmin();
      await this.getAllPayments();
      await this.categorizePaymentsByMethod();
      await this.showPaymentMethodsSummary();
      await this.showPendingCashPayments();
      await this.showPendingTransferPayments();
      await this.showPendingCardPayments();
      await this.showCompletedPaymentsSummary();
      await this.showDetailedPaymentsList();
      await this.showFinalSummary();
      
      console.log('\n🎉 ¡VISUALIZACIÓN COMPLETA FINALIZADA!');
      console.log('ℹ️  Todos los datos mostrados son reales de la base de datos');
      
    } catch (error) {
      console.error('\n❌ Error en la consulta:', error.message);
      if (error.response) {
        console.error('📋 Detalles del error:', error.response.data);
      }
    }
  }

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

  async getAllPayments() {
    console.log('\n2. 📊 Obteniendo TODOS los pagos del sistema...');
    
    try {
      // Primera página
      const response = await axios.get(`${this.baseURL}/api/payments`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: {
          limit: 100,
          page: 1,
          includeAll: 'true' // Para obtener todos los estados
        }
      });

      if (response.data.success) {
        this.allPayments = response.data.data.payments || [];
        const { pagination } = response.data.data;
        
        console.log(`   ✅ Primera página: ${this.allPayments.length} pagos`);
        console.log(`   📊 Total en sistema: ${pagination.total} pagos`);
        console.log(`   📄 Páginas disponibles: ${pagination.pages}`);
        
        // Obtener todas las páginas restantes
        if (pagination.pages > 1) {
          console.log(`   📄 Obteniendo ${pagination.pages - 1} páginas adicionales...`);
          
          for (let page = 2; page <= pagination.pages; page++) {
            const pageResponse = await axios.get(`${this.baseURL}/api/payments`, {
              headers: { 'Authorization': `Bearer ${this.adminToken}` },
              params: { 
                limit: 100, 
                page,
                includeAll: 'true'
              }
            });
            
            if (pageResponse.data.success) {
              this.allPayments.push(...pageResponse.data.data.payments);
              console.log(`      Página ${page}: +${pageResponse.data.data.payments.length} pagos`);
            }
          }
        }
        
        console.log(`   🎯 TOTAL DE PAGOS OBTENIDOS: ${this.allPayments.length}`);
        
        if (this.allPayments.length > 0) {
          const totalAmount = this.allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
          console.log(`   💰 Monto total de todos los pagos: $${totalAmount.toFixed(2)}`);
          
          // Resumen rápido por estado
          const byStatus = this.groupBy(this.allPayments, 'status');
          console.log('   📊 Estados en el sistema:');
          Object.entries(byStatus).forEach(([status, payments]) => {
            const statusAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
            console.log(`      ${this.getStatusIcon(status)} ${status}: ${payments.length} pagos ($${statusAmount.toFixed(2)})`);
          });
        } else {
          console.log('   📝 No hay pagos registrados en el sistema');
        }
        
      } else {
        throw new Error('Respuesta sin éxito al obtener pagos');
      }
    } catch (error) {
      throw new Error(`Error obteniendo pagos: ${error.response?.data?.message || error.message}`);
    }
  }

  async categorizePaymentsByMethod() {
    console.log('\n3. 📋 Categorizando pagos por método de pago...');
    
    if (this.allPayments.length === 0) {
      console.log('   ⚠️ No hay pagos para categorizar');
      return;
    }

    // Categorizar por método de pago
    this.cashPayments = this.allPayments.filter(p => p.paymentMethod === 'cash');
    this.transferPayments = this.allPayments.filter(p => p.paymentMethod === 'transfer');
    this.cardPayments = this.allPayments.filter(p => p.paymentMethod === 'card');
    
    // Categorizar por estado dentro de cada método
    this.pendingCashPayments = this.cashPayments.filter(p => p.status === 'pending');
    this.completedCashPayments = this.cashPayments.filter(p => p.status === 'completed');
    
    this.pendingTransferPayments = this.transferPayments.filter(p => p.status === 'pending');
    this.completedTransferPayments = this.transferPayments.filter(p => p.status === 'completed');
    
    this.pendingCardPayments = this.cardPayments.filter(p => p.status === 'pending');
    this.completedCardPayments = this.cardPayments.filter(p => p.status === 'completed');

    console.log('   ✅ Categorización completada:');
    console.log(`   💵 EFECTIVO: ${this.cashPayments.length} total (✅${this.completedCashPayments.length} completados | ⏳${this.pendingCashPayments.length} pendientes)`);
    console.log(`   🏦 TRANSFERENCIA: ${this.transferPayments.length} total (✅${this.completedTransferPayments.length} completados | ⏳${this.pendingTransferPayments.length} pendientes)`);
    console.log(`   💳 TARJETA: ${this.cardPayments.length} total (✅${this.completedCardPayments.length} completados | ⏳${this.pendingCardPayments.length} pendientes)`);
  }

  async showPaymentMethodsSummary() {
    console.log('\n4. 📊 RESUMEN POR MÉTODOS DE PAGO');
    console.log('=' .repeat(60));
    
    if (this.allPayments.length === 0) {
      console.log('   ℹ️ No hay pagos para analizar');
      return;
    }

    const totalAmount = this.allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    console.log('💰 RESUMEN FINANCIERO POR MÉTODO:');
    
    // Efectivo
    const cashTotal = this.cashPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const cashCompleted = this.completedCashPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const cashPending = this.pendingCashPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    console.log(`\n   💵 EFECTIVO:`);
    console.log(`      📊 Total: ${this.cashPayments.length} pagos ($${cashTotal.toFixed(2)}) - ${totalAmount > 0 ? ((cashTotal/totalAmount)*100).toFixed(1) : 0}% del total`);
    console.log(`      ✅ Completados: ${this.completedCashPayments.length} pagos ($${cashCompleted.toFixed(2)})`);
    console.log(`      ⏳ Pendientes: ${this.pendingCashPayments.length} pagos ($${cashPending.toFixed(2)})`);
    
    // Transferencias
    const transferTotal = this.transferPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const transferCompleted = this.completedTransferPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const transferPending = this.pendingTransferPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    console.log(`\n   🏦 TRANSFERENCIAS:`);
    console.log(`      📊 Total: ${this.transferPayments.length} pagos ($${transferTotal.toFixed(2)}) - ${totalAmount > 0 ? ((transferTotal/totalAmount)*100).toFixed(1) : 0}% del total`);
    console.log(`      ✅ Completados: ${this.completedTransferPayments.length} pagos ($${transferCompleted.toFixed(2)})`);
    console.log(`      ⏳ Pendientes: ${this.pendingTransferPayments.length} pagos ($${transferPending.toFixed(2)})`);
    
    // Tarjetas
    const cardTotal = this.cardPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const cardCompleted = this.completedCardPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const cardPending = this.pendingCardPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    console.log(`\n   💳 TARJETAS:`);
    console.log(`      📊 Total: ${this.cardPayments.length} pagos ($${cardTotal.toFixed(2)}) - ${totalAmount > 0 ? ((cardTotal/totalAmount)*100).toFixed(1) : 0}% del total`);
    console.log(`      ✅ Completados: ${this.completedCardPayments.length} pagos ($${cardCompleted.toFixed(2)})`);
    console.log(`      ⏳ Pendientes: ${this.pendingCardPayments.length} pagos ($${cardPending.toFixed(2)})`);

    // Totales de pendientes
    const totalPendingAmount = cashPending + transferPending + cardPending;
    const totalPendingCount = this.pendingCashPayments.length + this.pendingTransferPayments.length + this.pendingCardPayments.length;
    
    console.log(`\n🎯 TOTAL PENDIENTES EN EL SISTEMA:`);
    console.log(`   ⏳ ${totalPendingCount} pagos pendientes`);
    console.log(`   💰 $${totalPendingAmount.toFixed(2)} esperando confirmación`);
    console.log(`   📊 ${totalAmount > 0 ? ((totalPendingAmount/totalAmount)*100).toFixed(1) : 0}% del total histórico`);
  }

  async showPendingCashPayments() {
    console.log('\n5. 💵 PAGOS EN EFECTIVO PENDIENTES DETALLADOS');
    console.log('=' .repeat(60));
    
    if (this.pendingCashPayments.length === 0) {
      console.log('   ✅ No hay pagos en efectivo pendientes');
      return;
    }

    const totalPendingCash = this.pendingCashPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    console.log(`📊 RESUMEN: ${this.pendingCashPayments.length} pagos pendientes ($${totalPendingCash.toFixed(2)})`);
    
    console.log('\n📋 DETALLES DE CADA PAGO EN EFECTIVO PENDIENTE:');
    this.pendingCashPayments.forEach((payment, index) => {
      console.log(`\n   💵 PAGO EN EFECTIVO #${index + 1}`);
      console.log(`   ` + '-'.repeat(50));
      
      // Información básica
      console.log(`   🆔 ID: ${payment.id}`);
      console.log(`   💰 Monto: $${payment.amount}`);
      console.log(`   📋 Tipo: ${this.formatPaymentType(payment.paymentType)}`);
      console.log(`   ✅ Estado: ${this.formatPaymentStatus(payment.status)}`);
      console.log(`   📅 Fecha de pago: ${this.formatDate(payment.paymentDate)}`);
      console.log(`   📅 Creado: ${this.formatDate(payment.createdAt)}`);
      
      // Tiempo de espera
      const hoursWaiting = (new Date() - new Date(payment.createdAt)) / (1000 * 60 * 60);
      const priority = hoursWaiting > 48 ? '🔴 CRÍTICA' : 
                      hoursWaiting > 24 ? '🟡 ALTA' : 
                      hoursWaiting > 12 ? '🟠 MEDIA' : '🟢 NORMAL';
      console.log(`   ⏰ Esperando confirmación: ${hoursWaiting.toFixed(1)} horas (${priority})`);
      
      // Información del cliente
      if (payment.user) {
        console.log(`   👤 Cliente: ${payment.user.firstName} ${payment.user.lastName}`);
        console.log(`   📧 Email: ${payment.user.email}`);
        if (payment.user.phone) {
          console.log(`   📞 Teléfono: ${payment.user.phone}`);
        }
      } else if (payment.anonymousClientInfo) {
        console.log(`   👤 Cliente anónimo: ${JSON.stringify(payment.anonymousClientInfo)}`);
      } else {
        console.log(`   ⚠️ Sin información de cliente`);
      }
      
      // Información de membresía
      if (payment.membership) {
        console.log(`   🏋️ Membresía: ${payment.membership.type} - ID: ${payment.membership.id}`);
        console.log(`   📅 Membresía vence: ${this.formatDate(payment.membership.endDate)}`);
      }
      
      // Quién registró
      if (payment.registeredByUser) {
        console.log(`   👔 Registrado por: ${payment.registeredByUser.firstName} ${payment.registeredByUser.lastName} (${payment.registeredByUser.role})`);
      }
      
      // Descripción y notas
      if (payment.description) {
        console.log(`   📝 Descripción: ${payment.description}`);
      }
      if (payment.notes) {
        console.log(`   📝 Notas: ${payment.notes}`);
      }
      
      console.log(`   💵 Estado: Cliente debe pagar en efectivo en el gimnasio`);
    });
  }

  async showPendingTransferPayments() {
    console.log('\n6. 🏦 TRANSFERENCIAS PENDIENTES DETALLADAS');
    console.log('=' .repeat(60));
    
    if (this.pendingTransferPayments.length === 0) {
      console.log('   ✅ No hay transferencias pendientes');
      return;
    }

    const totalPendingTransfer = this.pendingTransferPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    console.log(`📊 RESUMEN: ${this.pendingTransferPayments.length} transferencias pendientes ($${totalPendingTransfer.toFixed(2)})`);
    
    // Categorizar por comprobante
    const withProof = this.pendingTransferPayments.filter(p => p.transferProof);
    const withoutProof = this.pendingTransferPayments.filter(p => !p.transferProof);
    
    console.log(`   📄 Con comprobante (listas para validar): ${withProof.length}`);
    console.log(`   🚫 Sin comprobante (esperando cliente): ${withoutProof.length}`);
    
    console.log('\n📋 DETALLES DE CADA TRANSFERENCIA PENDIENTE:');
    this.pendingTransferPayments.forEach((payment, index) => {
      console.log(`\n   🏦 TRANSFERENCIA #${index + 1}`);
      console.log(`   ` + '-'.repeat(50));
      
      // Información básica
      console.log(`   🆔 ID: ${payment.id}`);
      console.log(`   💰 Monto: $${payment.amount}`);
      console.log(`   📋 Tipo: ${this.formatPaymentType(payment.paymentType)}`);
      console.log(`   ✅ Estado: ${this.formatPaymentStatus(payment.status)}`);
      console.log(`   📅 Fecha de pago: ${this.formatDate(payment.paymentDate)}`);
      console.log(`   📅 Creado: ${this.formatDate(payment.createdAt)}`);
      
      // Tiempo de espera
      const hoursWaiting = (new Date() - new Date(payment.createdAt)) / (1000 * 60 * 60);
      const priority = hoursWaiting > 48 ? '🔴 CRÍTICA' : 
                      hoursWaiting > 24 ? '🟡 ALTA' : 
                      hoursWaiting > 12 ? '🟠 MEDIA' : '🟢 NORMAL';
      console.log(`   ⏰ Tiempo de espera: ${hoursWaiting.toFixed(1)} horas (${priority})`);
      
      // ✅ INFORMACIÓN ESPECÍFICA DE TRANSFERENCIA - CORREGIDA
      console.log(`\n   🔄 DETALLES DE TRANSFERENCIA:`);
      
      // Comprobante
      if (payment.transferProof) {
        console.log(`   📄 Comprobante: ✅ SUBIDO`);
        console.log(`   🔗 URL del comprobante: ${payment.transferProof}`);
        console.log(`   🌐 Ver comprobante: ${payment.transferProof}`);
      } else {
        console.log(`   📄 Comprobante: ❌ NO SUBIDO`);
        console.log(`   ⚠️ Cliente debe subir comprobante de transferencia`);
      }

      // ✅ ESTADO SIMPLE Y CLARO
      const statusIcon = this.getStatusIcon(payment.status);
      const statusText = this.formatPaymentStatus(payment.status);
      console.log(`   ${statusIcon} Estado del pago: ${statusText}`);

      // ✅ ACCIÓN NECESARIA SEGÚN ESTADO
      if (payment.status === 'pending') {
        if (payment.transferProof) {
          console.log(`   🎯 ACCIÓN REQUERIDA: Staff debe validar comprobante`);
        } else {
          console.log(`   📄 ACCIÓN REQUERIDA: Cliente debe subir comprobante`);
        }
      } else if (payment.status === 'completed') {
        console.log(`   ✅ TRANSFERENCIA CONFIRMADA`);
      } else if (payment.status === 'failed') {
        console.log(`   ❌ TRANSFERENCIA RECHAZADA`);
      }
      
      // Información del cliente
      if (payment.user) {
        console.log(`\n   👤 INFORMACIÓN DEL CLIENTE:`);
        console.log(`   👥 Cliente: ${payment.user.firstName} ${payment.user.lastName}`);
        console.log(`   📧 Email: ${payment.user.email}`);
        if (payment.user.phone) {
          console.log(`   📞 Teléfono: ${payment.user.phone}`);
        }
      } else {
        console.log(`   ⚠️ Sin información de cliente`);
      }
      
      // Información de membresía
      if (payment.membership) {
        console.log(`\n   🏋️ INFORMACIÓN DE MEMBRESÍA:`);
        console.log(`   🎯 Tipo: ${payment.membership.type}`);
        console.log(`   📅 Inicio: ${this.formatDate(payment.membership.startDate)}`);
        console.log(`   📅 Vencimiento: ${this.formatDate(payment.membership.endDate)}`);
        console.log(`   🆔 ID: ${payment.membership.id}`);
      }
      
      // Quién registró
      if (payment.registeredByUser) {
        console.log(`\n   👔 REGISTRADO POR:`);
        console.log(`   👤 Personal: ${payment.registeredByUser.firstName} ${payment.registeredByUser.lastName}`);
        console.log(`   🎭 Rol: ${payment.registeredByUser.role}`);
      }
      
      // Descripción y notas
      if (payment.description) {
        console.log(`\n   📝 Descripción: ${payment.description}`);
      }
      if (payment.notes) {
        console.log(`   📝 Notas: ${payment.notes}`);
      }
    });
    
    // Resumen de acciones necesarias
    if (withProof.length > 0) {
      console.log(`\n🎯 TRANSFERENCIAS LISTAS PARA VALIDAR: ${withProof.length}`);
      const withProofAmount = withProof.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      console.log(`   💰 Monto esperando validación: $${withProofAmount.toFixed(2)}`);
      console.log(`   📄 Staff debe revisar comprobantes y aprobar/rechazar`);
    }
    
    if (withoutProof.length > 0) {
      console.log(`\n📄 TRANSFERENCIAS SIN COMPROBANTE: ${withoutProof.length}`);
      const withoutProofAmount = withoutProof.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      console.log(`   💰 Monto esperando comprobante: $${withoutProofAmount.toFixed(2)}`);
      console.log(`   📧 Clientes deben subir comprobantes de transferencia`);
    }
  }

  async showPendingCardPayments() {
    console.log('\n7. 💳 PAGOS CON TARJETA PENDIENTES DETALLADOS');
    console.log('=' .repeat(60));
    
    if (this.pendingCardPayments.length === 0) {
      console.log('   ✅ No hay pagos con tarjeta pendientes');
      return;
    }

    const totalPendingCard = this.pendingCardPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    console.log(`📊 RESUMEN: ${this.pendingCardPayments.length} pagos con tarjeta pendientes ($${totalPendingCard.toFixed(2)})`);
    
    console.log('\n📋 DETALLES DE CADA PAGO CON TARJETA PENDIENTE:');
    this.pendingCardPayments.forEach((payment, index) => {
      console.log(`\n   💳 PAGO CON TARJETA #${index + 1}`);
      console.log(`   ` + '-'.repeat(50));
      
      // Información básica
      console.log(`   🆔 ID: ${payment.id}`);
      console.log(`   💰 Monto: $${payment.amount}`);
      console.log(`   📋 Tipo: ${this.formatPaymentType(payment.paymentType)}`);
      console.log(`   ✅ Estado: ${this.formatPaymentStatus(payment.status)}`);
      console.log(`   📅 Fecha de pago: ${this.formatDate(payment.paymentDate)}`);
      console.log(`   📅 Creado: ${this.formatDate(payment.createdAt)}`);
      
      // Tiempo de espera
      const hoursWaiting = (new Date() - new Date(payment.createdAt)) / (1000 * 60 * 60);
      console.log(`   ⏰ Tiempo en procesamiento: ${hoursWaiting.toFixed(1)} horas`);
      
      // ✅ INFORMACIÓN ESPECÍFICA DE TARJETA
      console.log(`\n   💳 DETALLES DE TARJETA:`);
      
      if (payment.cardLast4) {
        console.log(`   💳 Tarjeta: **** **** **** ${payment.cardLast4}`);
      } else {
        console.log(`   💳 Sin información de tarjeta`);
      }
      
      if (payment.cardTransactionId) {
        console.log(`   🌟 Stripe Payment Intent: ${payment.cardTransactionId}`);
        console.log(`   🔗 Ver en Stripe: https://dashboard.stripe.com/payments/${payment.cardTransactionId}`);
      } else {
        console.log(`   ⚠️ No procesado por Stripe`);
      }
      
      console.log(`   ⏳ Estado: Pago pendiente de autorización`);
      
      // Información del cliente
      if (payment.user) {
        console.log(`\n   👤 INFORMACIÓN DEL CLIENTE:`);
        console.log(`   👥 Cliente: ${payment.user.firstName} ${payment.user.lastName}`);
        console.log(`   📧 Email: ${payment.user.email}`);
        if (payment.user.phone) {
          console.log(`   📞 Teléfono: ${payment.user.phone}`);
        }
      } else {
        console.log(`   ⚠️ Sin información de cliente`);
      }
      
      // Información de membresía
      if (payment.membership) {
        console.log(`\n   🏋️ INFORMACIÓN DE MEMBRESÍA:`);
        console.log(`   🎯 Tipo: ${payment.membership.type}`);
        console.log(`   📅 Inicio: ${this.formatDate(payment.membership.startDate)}`);
        console.log(`   📅 Vencimiento: ${this.formatDate(payment.membership.endDate)}`);
        console.log(`   🆔 ID: ${payment.membership.id}`);
      }
      
      // Quién registró
      if (payment.registeredByUser) {
        console.log(`\n   👔 REGISTRADO POR:`);
        console.log(`   👤 Personal: ${payment.registeredByUser.firstName} ${payment.registeredByUser.lastName}`);
        console.log(`   🎭 Rol: ${payment.registeredByUser.role}`);
      }
      
      // Descripción y notas
      if (payment.description) {
        console.log(`\n   📝 Descripción: ${payment.description}`);
      }
      if (payment.notes) {
        console.log(`   📝 Notas: ${payment.notes}`);
      }
    });
  }

  async showCompletedPaymentsSummary() {
    console.log('\n8. ✅ RESUMEN DE PAGOS COMPLETADOS');
    console.log('=' .repeat(60));
    
    const totalCompletedCash = this.completedCashPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalCompletedTransfer = this.completedTransferPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalCompletedCard = this.completedCardPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalCompleted = totalCompletedCash + totalCompletedTransfer + totalCompletedCard;
    
    console.log('💰 PAGOS COMPLETADOS POR MÉTODO:');
    console.log(`   💵 Efectivo: ${this.completedCashPayments.length} pagos ($${totalCompletedCash.toFixed(2)})`);
    console.log(`   🏦 Transferencia: ${this.completedTransferPayments.length} pagos ($${totalCompletedTransfer.toFixed(2)})`);
    console.log(`   💳 Tarjeta: ${this.completedCardPayments.length} pagos ($${totalCompletedCard.toFixed(2)})`);
    console.log(`   🎯 TOTAL COMPLETADO: ${this.completedCashPayments.length + this.completedTransferPayments.length + this.completedCardPayments.length} pagos ($${totalCompleted.toFixed(2)})`);
    
    if (totalCompleted > 0) {
      console.log('\n📊 DISTRIBUCIÓN PORCENTUAL:');
      console.log(`   💵 Efectivo: ${((totalCompletedCash / totalCompleted) * 100).toFixed(1)}%`);
      console.log(`   🏦 Transferencia: ${((totalCompletedTransfer / totalCompleted) * 100).toFixed(1)}%`);
      console.log(`   💳 Tarjeta: ${((totalCompletedCard / totalCompleted) * 100).toFixed(1)}%`);
    }
    
    // Últimos pagos completados
    const recentCompleted = [
      ...this.completedCashPayments,
      ...this.completedTransferPayments,
      ...this.completedCardPayments
    ].sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)).slice(0, 10);
    
    if (recentCompleted.length > 0) {
      console.log('\n📅 ÚLTIMOS 10 PAGOS COMPLETADOS:');
      recentCompleted.forEach((payment, index) => {
        const clientName = payment.user ? 
          `${payment.user.firstName} ${payment.user.lastName}` : 
          'Cliente anónimo';
        const methodIcon = this.getMethodIcon(payment.paymentMethod);
        
        console.log(`   ${index + 1}. ${methodIcon} $${payment.amount} - ${clientName} (${this.formatDate(payment.paymentDate)})`);
      });
    }
  }

  async showDetailedPaymentsList() {
    console.log('\n9. 📋 LISTA DETALLADA DE TODOS LOS PAGOS');
    console.log('=' .repeat(60));
    
    if (this.allPayments.length === 0) {
      console.log('   ⚠️ No hay pagos para mostrar');
      return;
    }

    console.log(`📊 MOSTRANDO ${this.allPayments.length} PAGOS ORDENADOS POR FECHA (MÁS RECIENTES PRIMERO):`);
    
    const sortedPayments = this.allPayments.sort((a, b) => 
      new Date(b.paymentDate) - new Date(a.paymentDate)
    );
    
    // Mostrar los primeros 20 pagos detallados
    const paymentsToShow = sortedPayments.slice(0, 20);
    
    paymentsToShow.forEach((payment, index) => {
      console.log(`\n📄 PAGO #${index + 1} (de ${this.allPayments.length})`);
      console.log('-'.repeat(60));
      
      // Información básica
      console.log('💰 INFORMACIÓN BÁSICA:');
      console.log(`   🆔 ID: ${payment.id}`);
      console.log(`   💵 Monto: $${payment.amount}`);
      console.log(`   💳 Método: ${this.formatPaymentMethod(payment.paymentMethod)}`);
      console.log(`   📋 Tipo: ${this.formatPaymentType(payment.paymentType)}`);
      console.log(`   ✅ Estado: ${this.formatPaymentStatus(payment.status)}`);
      console.log(`   📅 Fecha de pago: ${this.formatDate(payment.paymentDate)}`);
      console.log(`   📅 Creado: ${this.formatDate(payment.createdAt)}`);
      
      // Información del cliente
      console.log('\n👤 CLIENTE:');
      if (payment.user) {
        console.log(`   👥 Nombre: ${payment.user.firstName} ${payment.user.lastName}`);
        console.log(`   📧 Email: ${payment.user.email}`);
        if (payment.user.phone) {
          console.log(`   📞 Teléfono: ${payment.user.phone}`);
        }
      } else if (payment.anonymousClientInfo) {
        console.log(`   👤 Cliente anónimo: ${JSON.stringify(payment.anonymousClientInfo)}`);
      } else {
        console.log(`   ⚠️ Sin información de cliente`);
      }
      
      // Información específica por método
      if (payment.paymentMethod === 'transfer') {
        console.log('\n🏦 DETALLES DE TRANSFERENCIA:');
        if (payment.transferProof) {
          console.log(`   📄 Comprobante: ✅ SUBIDO`);
          console.log(`   🔗 URL: ${payment.transferProof}`);
        } else {
          console.log(`   📄 Comprobante: ❌ NO SUBIDO`);
        }
      } else if (payment.paymentMethod === 'card') {
        console.log('\n💳 DETALLES DE TARJETA:');
        if (payment.cardLast4) {
          console.log(`   💳 Tarjeta: **** ${payment.cardLast4}`);
        }
        if (payment.cardTransactionId) {
          console.log(`   🌟 Stripe ID: ${payment.cardTransactionId}`);
        }
      } else if (payment.paymentMethod === 'cash') {
        console.log('\n💵 DETALLES DE EFECTIVO:');
        console.log(`   💵 Estado: ${payment.status === 'pending' ? 'Esperando confirmación' : 'Confirmado'}`);
      }
      
      // Membresía asociada
      if (payment.membership) {
        console.log('\n🏋️ MEMBRESÍA:');
        console.log(`   🎯 Tipo: ${payment.membership.type}`);
        console.log(`   📅 Vence: ${this.formatDate(payment.membership.endDate)}`);
        console.log(`   🆔 ID: ${payment.membership.id}`);
      }
      
      // Quién registró
      if (payment.registeredByUser) {
        console.log('\n👔 REGISTRADO POR:');
        console.log(`   👤 ${payment.registeredByUser.firstName} ${payment.registeredByUser.lastName} (${payment.registeredByUser.role})`);
      }
      
      // Descripción
      if (payment.description) {
        console.log(`\n📝 Descripción: ${payment.description}`);
      }
      if (payment.notes) {
        console.log(`📝 Notas: ${payment.notes}`);
      }
    });
    
    if (this.allPayments.length > 20) {
      console.log(`\n... y ${this.allPayments.length - 20} pagos más en el sistema`);
      console.log('💡 Solo se muestran los 20 más recientes para evitar saturar la consola');
    }
  }

  async showFinalSummary() {
    console.log('\n10. 🎯 RESUMEN FINAL COMPLETO');
    console.log('=' .repeat(60));
    
    const totalAmount = this.allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalPendingAmount = this.pendingCashPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0) +
                              this.pendingTransferPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0) +
                              this.pendingCardPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    console.log('📊 ESTADÍSTICAS FINALES:');
    console.log(`   💰 Total histórico: $${totalAmount.toFixed(2)} en ${this.allPayments.length} pagos`);
    console.log(`   ⏳ Total pendiente: $${totalPendingAmount.toFixed(2)} en ${this.pendingCashPayments.length + this.pendingTransferPayments.length + this.pendingCardPayments.length} pagos`);
    console.log(`   📊 Porcentaje pendiente: ${totalAmount > 0 ? ((totalPendingAmount/totalAmount)*100).toFixed(1) : 0}%`);
    
    console.log('\n🎯 ACCIONES NECESARIAS:');
    if (this.pendingCashPayments.length > 0) {
      console.log(`   💵 ${this.pendingCashPayments.length} pagos en efectivo esperando confirmación en gimnasio`);
    }
    
    if (this.pendingTransferPayments.length > 0) {
      const withProof = this.pendingTransferPayments.filter(p => p.transferProof);
      const withoutProof = this.pendingTransferPayments.filter(p => !p.transferProof);
      
      if (withProof.length > 0) {
        console.log(`   🏦 ${withProof.length} transferencias con comprobante listas para validar`);
      }
      if (withoutProof.length > 0) {
        console.log(`   📄 ${withoutProof.length} transferencias esperando comprobante del cliente`);
      }
    }
    
    if (this.pendingCardPayments.length > 0) {
      console.log(`   💳 ${this.pendingCardPayments.length} pagos con tarjeta en procesamiento`);
    }
    
    if (this.pendingCashPayments.length === 0 && this.pendingTransferPayments.length === 0 && this.pendingCardPayments.length === 0) {
      console.log('   ✅ No hay pagos pendientes en el sistema');
    }
    
    console.log('\n💡 INFORMACIÓN IMPORTANTE:');
    console.log('   🔍 Esta consulta muestra datos reales de la base de datos');
    console.log('   📊 Los datos se actualizan en tiempo real');
    console.log('   🔄 Ejecutar nuevamente para datos actualizados');
    console.log('   📋 Modo solo lectura - no se modifica nada');
  }

  // ✅ MÉTODOS AUXILIARES
  formatPaymentMethod(method) {
    const methods = {
      cash: '💵 Efectivo',
      card: '💳 Tarjeta',
      transfer: '🏦 Transferencia',
      mobile: '📱 Pago móvil'
    };
    return methods[method] || `❓ ${method}`;
  }

  formatPaymentType(type) {
    const types = {
      membership: '🏋️ Membresía',
      daily: '📅 Pago diario',
      bulk_daily: '📅 Pagos diarios múltiples',
      store_cash_delivery: '🛍️ Tienda (efectivo)',
      store_card_delivery: '🛍️ Tienda (tarjeta)',
      store_online: '🛍️ Tienda (online)',
      store_transfer: '🛍️ Tienda (transferencia)'
    };
    return types[type] || `❓ ${type}`;
  }

  formatPaymentStatus(status) {
    const statuses = {
      completed: '✅ Completado',
      pending: '⏳ Pendiente',
      failed: '❌ Fallido',
      cancelled: '🚫 Cancelado',
      refunded: '💰 Reembolsado'
    };
    return statuses[status] || `❓ ${status}`;
  }

  formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const formattedDate = date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    if (diffDays === 0) {
      return `${formattedDate} (hoy)`;
    } else if (diffDays === 1) {
      return `${formattedDate} (ayer)`;
    } else if (diffDays < 7) {
      return `${formattedDate} (hace ${diffDays} días)`;
    } else {
      return formattedDate;
    }
  }

  getStatusIcon(status) {
    const icons = {
      completed: '✅',
      pending: '⏳',
      failed: '❌',
      cancelled: '🚫',
      refunded: '💰'
    };
    return icons[status] || '❓';
  }

  getMethodIcon(method) {
    const icons = {
      cash: '💵',
      card: '💳',
      transfer: '🏦',
      mobile: '📱'
    };
    return icons[method] || '💰';
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const groupKey = item[key];
      groups[groupKey] = groups[groupKey] || [];
      groups[groupKey].push(item);
      return groups;
    }, {});
  }
}

// ✅ FUNCIÓN DE AYUDA
function showHelp() {
  console.log('\n💰 Elite Fitness Club - Visualizador COMPLETO de Pagos v3.0\n');
  console.log('🎯 VISUALIZACIÓN COMPLETA DE TODOS LOS PAGOS:');
  console.log('  📊 Todos los pagos del sistema por método');
  console.log('  💵 Pagos en efectivo (completados y pendientes)');
  console.log('  🏦 Transferencias (completadas y pendientes)');
  console.log('  💳 Pagos con tarjeta (completados y pendientes)');
  console.log('  🔗 URLs reales de comprobantes de transferencia');
  console.log('  👤 Información completa de clientes');
  console.log('  📈 Estadísticas y análisis detallados\n');
  
  console.log('✨ CARACTERÍSTICAS v3.0:');
  console.log('  ✅ Datos reales directos de la base de datos');
  console.log('  ✅ Categorización automática por método y estado');
  console.log('  ✅ URLs completas de comprobantes para revisión');
  console.log('  ✅ Información detallada de cada pago pendiente');
  console.log('  ✅ Tiempo de espera y priorización automática');
  console.log('  ✅ Estados de pagos simplificados y claros');
  console.log('  ✅ Información completa de clientes y staff');
  console.log('  ✅ MODO SOLO LECTURA - No modifica nada\n');
  
  console.log('💡 LO QUE VERÁS:');
  console.log('  🔍 TODOS los pagos pendientes separados por método');
  console.log('  📄 URLs directas a comprobantes de transferencia');
  console.log('  ⏰ Tiempo exacto de espera para cada pago');
  console.log('  👤 Datos completos de clientes (nombre, email, teléfono)');
  console.log('  🏋️ Información de membresías asociadas');
  console.log('  📊 Estadísticas completas por método de pago\n');
  
  console.log('🚀 USO:');
  console.log('  node test-payments-complete.js        # Ver todos los pagos');
  console.log('  node test-payments-complete.js --help # Mostrar esta ayuda\n');
  
  console.log('ℹ️  IMPORTANTE:');
  console.log('  • Script creado DESDE CERO para mostrar TODO');
  console.log('  • Datos 100% reales de la base de datos');
  console.log('  • Modo solo consulta - completamente seguro');
  console.log('  • Estados simplificados y claros\n');
}

// ✅ FUNCIÓN PRINCIPAL
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const viewer = new CompletePaymentsViewer();
  
  try {
    await viewer.viewAllPayments();
    
  } catch (error) {
    console.error('\n🚨 ERROR EN LA CONSULTA:');
    console.error(`❌ ${error.message}\n`);
    
    console.error('💡 POSIBLES SOLUCIONES:');
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('Network Error')) {
      console.error('   1. ✅ Verifica que tu servidor esté ejecutándose: npm start');
      console.error('   2. ✅ Verifica que el puerto sea el correcto (5000)');
      console.error('   3. ✅ Verifica la URL del servidor en el script');
    } else if (error.message.includes('Autenticación falló')) {
      console.error('   1. ✅ Verifica que el usuario admin existe: admin@gym.com');
      console.error('   2. ✅ Verifica la contraseña: Admin123!');
      console.error('   3. ✅ Verifica que la base de datos esté inicializada');
    } else if (error.message.includes('404') || error.message.includes('endpoint')) {
      console.error('   1. ✅ Verifica que todas las rutas estén configuradas');
      console.error('   2. ✅ Verifica la versión del backend');
      console.error('   3. ✅ Consulta los logs del servidor');
    } else {
      console.error(`   1. ❌ Error específico: ${error.message}`);
      console.error('   2. ✅ Consulta los logs del servidor para más detalles');
      console.error('   3. ✅ Verifica la conectividad con la base de datos');
    }
    
    console.error('\n📞 Si el problema persiste, revisa:');
    console.error('   • Los logs del servidor backend');
    console.error('   • La configuración de la base de datos');
    console.error('   • Las variables de entorno');
    
    process.exit(1);
  }
}

// ✅ EJECUTAR SI SE LLAMA DIRECTAMENTE
if (require.main === module) {
  main();
}

module.exports = { CompletePaymentsViewer };