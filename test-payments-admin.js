// test-payments-admin-enhanced.js - VERSIÓN COMPLETA CORREGIDA v3.1 con análisis exhaustivo
const axios = require('axios');

class CompleteTransactionAnalyzer {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.adminToken = null;
    
    // Contenedores de datos
    this.allPayments = [];
    this.allTransfers = [];
    this.pendingTransfers = [];
    this.pendingCashPayments = [];
    this.cardPayments = [];
    this.stripePayments = [];
    this.financialMovements = [];
    this.paymentStatistics = null;
    this.pendingDashboard = null;
    this.financialDashboard = null;
    
    // ✅ NUEVOS: Contenedores para membresías
    this.pendingCashMemberships = [];
    this.pendingMembershipsWithPayments = [];
    
    // Mapeos para mejor presentación
    this.paymentMethodIcons = {
      cash: '💵', card: '💳', transfer: '🏦', mobile: '📱', online: '🌐'
    };
    
    this.statusIcons = {
      completed: '✅', pending: '⏳', failed: '❌', cancelled: '🚫', refunded: '💰'
    };
    
    this.typeIcons = {
      membership: '🏋️', daily: '📅', bulk_daily: '📅', 
      store_cash_delivery: '🛍️', store_card_delivery: '🛍️', 
      store_online: '🛍️', store_transfer: '🛍️'
    };
  }

  async runCompleteAnalysis() {
    console.log('💰 ANALIZADOR COMPLETO DE TRANSACCIONES - ELITE FITNESS v3.1 CORREGIDO');
    console.log('='.repeat(100));
    console.log('🎯 Análisis exhaustivo: Todos los métodos de pago + Movimientos financieros + Membresías');
    console.log('🔍 DATOS COMPLETOS de cada transacción desde la base de datos');
    console.log('✅ CORREGIDO: Estados de pago y URLs de transferencia');
    console.log('');
    
    try {
      // Fase 1: Autenticación
      await this.authenticateAdmin();
      
      // Fase 2: Obtener datos principales en paralelo
      await this.gatherAllData();
      
      // Fase 3: Análisis detallado
      await this.showSystemOverview();
      await this.analyzeAllTransactionsDetailed();
      await this.analyzeTransferTransactionsDetailed();
      await this.analyzeCashTransactionsDetailed();
      await this.analyzeCardTransactionsDetailed();
      // ✅ NUEVO: Análisis de membresías pendientes
      await this.analyzePendingMembershipsDetailed();
      await this.analyzeFinancialMovements();
      await this.showUserTransactionProfiles();
      await this.showStaffActivityAnalysis();
      await this.showTimeAnalysis();
      await this.showCriticalActionItems();
      
      console.log('\n🎉 ¡ANÁLISIS COMPLETO FINALIZADO EXITOSAMENTE!');
      console.log('📊 Se analizaron todos los datos disponibles del sistema');
      console.log('✅ Incluyendo estados de pago y URLs de transferencia corregidos');
      
    } catch (error) {
      console.error('\n❌ Error en el análisis:', error.message);
      if (error.response) {
        console.error('📋 Detalles del error:', error.response.data);
      }
    }
  }

  async authenticateAdmin() {
    console.log('🔐 AUTENTICANDO COMO ADMINISTRADOR...');
    
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
      }
    } catch (error) {
      throw new Error(`Autenticación falló: ${error.message}`);
    }
  }

  // ✅ MÉTODO CORREGIDO: Recopilar todos los datos incluyendo membresías
  async gatherAllData() {
    console.log('\n📊 RECOPILANDO TODOS LOS DATOS DEL SISTEMA...');
    
    const dataPromises = [
      this.getPaymentStatistics(),
      this.getPendingDashboard(),
      this.getFinancialDashboard(),
      this.getAllPaymentsDetailed(),
      this.getAllTransfersDetailed(),
      this.getPendingTransfersDetailed(),
      this.getPendingCashDetailed(),
      this.getCardPaymentsDetailed(),
      this.getStripePayments(),
      this.getFinancialMovements(),
      // ✅ AGREGADO: Obtener membresías pendientes
      this.getPendingCashMemberships(),
      this.getMembershipsWithTransferPayments()
    ];

    try {
      await Promise.all(dataPromises);
      console.log('   ✅ Todos los datos recopilados exitosamente');
    } catch (error) {
      console.warn('   ⚠️ Algunos datos no pudieron obtenerse:', error.message);
    }
  }

  async getPaymentStatistics() {
    try {
      const response = await axios.get(`${this.baseURL}/api/payments/statistics`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });
      this.paymentStatistics = response.data.success ? response.data.data : null;
    } catch (error) {
      console.warn('   ⚠️ Error obteniendo estadísticas de pagos');
      this.paymentStatistics = null;
    }
  }

  async getPendingDashboard() {
    try {
      const response = await axios.get(`${this.baseURL}/api/payments/pending-dashboard`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });
      this.pendingDashboard = response.data.success ? response.data.data : null;
    } catch (error) {
      console.warn('   ⚠️ Error obteniendo dashboard de pendientes');
      this.pendingDashboard = null;
    }
  }

  async getFinancialDashboard() {
    try {
      const response = await axios.get(`${this.baseURL}/api/financial/dashboard`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });
      this.financialDashboard = response.data.success ? response.data.data : null;
    } catch (error) {
      console.warn('   ⚠️ Error obteniendo dashboard financiero');
      this.financialDashboard = null;
    }
  }

  async getAllPaymentsDetailed() {
    try {
      let allPayments = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await axios.get(`${this.baseURL}/api/payments`, {
          headers: { 'Authorization': `Bearer ${this.adminToken}` },
          params: {
            page,
            limit: 100,
            includeAll: 'true' // Para obtener todos los estados
          }
        });

        if (response.data.success && response.data.data.payments) {
          allPayments.push(...response.data.data.payments);
          
          const { pagination } = response.data.data;
          hasMore = page < pagination.pages;
          page++;
        } else {
          hasMore = false;
        }
      }
      
      this.allPayments = allPayments;
      console.log(`   💰 Pagos obtenidos: ${this.allPayments.length}`);
    } catch (error) {
      console.warn('   ⚠️ Error obteniendo todos los pagos');
      this.allPayments = [];
    }
  }

  async getAllTransfersDetailed() {
    try {
      const response = await axios.get(`${this.baseURL}/api/payments/transfers/pending-detailed`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });
      
      // También obtener todas las transferencias (no solo pendientes)
      const allTransfersResponse = await axios.get(`${this.baseURL}/api/payments`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: {
          paymentMethod: 'transfer',
          limit: 100,
          includeAll: 'true'
        }
      });
      
      this.allTransfers = allTransfersResponse.data.success ? 
        allTransfersResponse.data.data.payments : [];
      
      console.log(`   🏦 Transferencias obtenidas: ${this.allTransfers.length}`);
    } catch (error) {
      console.warn('   ⚠️ Error obteniendo transferencias');
      this.allTransfers = [];
    }
  }

  async getPendingTransfersDetailed() {
    try {
      const response = await axios.get(`${this.baseURL}/api/payments/transfers/pending-detailed`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });
      this.pendingTransfers = response.data.success ? response.data.data.transfers : [];
      console.log(`   🏦 Transferencias pendientes: ${this.pendingTransfers.length}`);
    } catch (error) {
      console.warn('   ⚠️ Error obteniendo transferencias pendientes');
      this.pendingTransfers = [];
    }
  }

  async getPendingCashDetailed() {
    try {
      const response = await axios.get(`${this.baseURL}/api/payments/cash/pending`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });
      this.pendingCashPayments = response.data.success ? response.data.data.payments : [];
      console.log(`   💵 Efectivo pendiente: ${this.pendingCashPayments.length}`);
    } catch (error) {
      console.warn('   ⚠️ Error obteniendo efectivo pendiente');
      this.pendingCashPayments = [];
    }
  }

  async getCardPaymentsDetailed() {
    try {
      const response = await axios.get(`${this.baseURL}/api/payments`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: {
          paymentMethod: 'card',
          limit: 100,
          includeAll: 'true'
        }
      });
      this.cardPayments = response.data.success ? response.data.data.payments : [];
      console.log(`   💳 Pagos con tarjeta: ${this.cardPayments.length}`);
    } catch (error) {
      console.warn('   ⚠️ Error obteniendo pagos con tarjeta');
      this.cardPayments = [];
    }
  }

  async getStripePayments() {
    try {
      const response = await axios.get(`${this.baseURL}/api/stripe/payments`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { limit: 50 }
      });
      this.stripePayments = response.data.success ? response.data.data.payments : [];
      console.log(`   🌟 Pagos Stripe: ${this.stripePayments.length}`);
    } catch (error) {
      console.warn('   ⚠️ Error obteniendo pagos Stripe');
      this.stripePayments = [];
    }
  }

  async getFinancialMovements() {
    try {
      const response = await axios.get(`${this.baseURL}/api/financial/movements`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { limit: 100 }
      });
      this.financialMovements = response.data.success ? response.data.data.movements : [];
      console.log(`   📊 Movimientos financieros: ${this.financialMovements.length}`);
    } catch (error) {
      console.warn('   ⚠️ Error obteniendo movimientos financieros');
      this.financialMovements = [];
    }
  }

  // ✅ NUEVO: Obtener membresías pendientes de pago en efectivo
  async getPendingCashMemberships() {
    try {
      const response = await axios.get(`${this.baseURL}/api/memberships/pending-cash-payment`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });
      
      if (response.data.success) {
        this.pendingCashMemberships = response.data.data.memberships;
        console.log(`   💵 Membresías pendientes de pago en efectivo: ${this.pendingCashMemberships.length}`);
      } else {
        this.pendingCashMemberships = [];
      }
    } catch (error) {
      console.warn('   ⚠️ Error obteniendo membresías pendientes de pago en efectivo');
      this.pendingCashMemberships = [];
    }
  }

  // ✅ NUEVO: Obtener membresías con pagos de transferencia
  async getMembershipsWithTransferPayments() {
    try {
      // Obtener membresías con estado pending
      const response = await axios.get(`${this.baseURL}/api/memberships`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: {
          status: 'pending',
          limit: 100
        }
      });
      
      if (response.data.success) {
        this.pendingMembershipsWithPayments = response.data.data.memberships;
        console.log(`   🏦 Membresías con pagos pendientes: ${this.pendingMembershipsWithPayments.length}`);
      } else {
        this.pendingMembershipsWithPayments = [];
      }
    } catch (error) {
      console.warn('   ⚠️ Error obteniendo membresías con pagos pendientes');
      this.pendingMembershipsWithPayments = [];
    }
  }

  async showSystemOverview() {
    console.log('\n📊 RESUMEN GENERAL DEL SISTEMA FINANCIERO');
    console.log('='.repeat(80));
    
    // Estadísticas generales
    if (this.paymentStatistics) {
      console.log('💰 ESTADÍSTICAS PRINCIPALES:');
      console.log(`   💵 Total de ingresos: $${this.paymentStatistics.totalIncome || 0}`);
      console.log(`   📊 Total de pagos: ${this.paymentStatistics.totalPayments || 0}`);
      console.log(`   📈 Promedio por pago: $${(this.paymentStatistics.averagePayment || 0).toFixed(2)}`);
      
      if (this.paymentStatistics.incomeByMethod) {
        console.log('\n   💳 INGRESOS POR MÉTODO:');
        this.paymentStatistics.incomeByMethod.forEach(method => {
          const icon = this.paymentMethodIcons[method.method] || '💰';
          console.log(`      ${icon} ${method.method}: ${method.count} pagos ($${method.total})`);
        });
      }
    }
    
    // Dashboard de pendientes
    if (this.pendingDashboard) {
      console.log('\n🎯 ACCIONES PENDIENTES:');
      const { summary } = this.pendingDashboard;
      
      if (summary.pendingTransfers) {
        console.log(`   🏦 Transferencias por validar: ${summary.pendingTransfers.count} ($${summary.pendingTransfers.totalAmount})`);
      }
      if (summary.pendingCashPayments) {
        console.log(`   💵 Pagos en efectivo por confirmar: ${summary.pendingCashPayments.count} ($${summary.pendingCashPayments.totalAmount})`);
      }
      if (summary.totalPendingActions) {
        console.log(`   ⚡ Total acciones urgentes: ${summary.totalPendingActions}`);
      }
      
      if (summary.pendingTransfers && summary.pendingTransfers.oldestHours > 0) {
        console.log(`   ⏰ Transferencia más antigua: ${summary.pendingTransfers.oldestHours} horas esperando`);
      }
    }
    
    // Dashboard financiero
    if (this.financialDashboard) {
      console.log('\n📈 RESUMEN FINANCIERO HOY:');
      const { today, thisWeek, thisMonth } = this.financialDashboard;
      
      if (today) {
        console.log(`   📅 HOY: Ingresos $${today.income} - Gastos $${today.expenses} = Neto $${today.net}`);
      }
      if (thisWeek) {
        console.log(`   📅 SEMANA: Ingresos $${thisWeek.income} - Gastos $${thisWeek.expenses} = Neto $${thisWeek.net}`);
      }
      if (thisMonth) {
        console.log(`   📅 MES: Ingresos $${thisMonth.income} - Gastos $${thisMonth.expenses} = Neto $${thisMonth.net}`);
      }
    }

    // ✅ NUEVO: Resumen de membresías pendientes
    if (this.pendingCashMemberships.length > 0 || this.pendingMembershipsWithPayments.length > 0) {
      console.log('\n🎫 MEMBRESÍAS PENDIENTES:');
      console.log(`   💵 Pendientes de pago en efectivo: ${this.pendingCashMemberships.length}`);
      console.log(`   🏦 Pendientes de validación de transferencia: ${this.pendingMembershipsWithPayments.length}`);
      
      const totalPendingMemberships = this.pendingCashMemberships.length + this.pendingMembershipsWithPayments.length;
      console.log(`   🚨 Total membresías esperando activación: ${totalPendingMemberships}`);
    }
  }

  async analyzeAllTransactionsDetailed() {
    console.log('\n💰 ANÁLISIS DETALLADO DE TODAS LAS TRANSACCIONES');
    console.log('='.repeat(80));
    
    if (this.allPayments.length === 0) {
      console.log('   ⚠️ No hay transacciones registradas en el sistema');
      return;
    }
    
    // Estadísticas generales
    const totalAmount = this.allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const completedPayments = this.allPayments.filter(p => p.status === 'completed');
    const pendingPayments = this.allPayments.filter(p => p.status === 'pending');
    const failedPayments = this.allPayments.filter(p => p.status === 'failed');
    
    console.log('📊 ESTADÍSTICAS GENERALES:');
    console.log(`   💰 Monto total de transacciones: $${totalAmount.toFixed(2)}`);
    console.log(`   📈 Total de transacciones: ${this.allPayments.length}`);
    console.log(`   ✅ Completadas: ${completedPayments.length} ($${completedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)})`);
    console.log(`   ⏳ Pendientes: ${pendingPayments.length} ($${pendingPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)})`);
    console.log(`   ❌ Fallidas: ${failedPayments.length} ($${failedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)})`);
    
    // Análisis por método de pago
    console.log('\n💳 ANÁLISIS POR MÉTODO DE PAGO:');
    const paymentsByMethod = this.groupBy(this.allPayments, 'paymentMethod');
    
    Object.entries(paymentsByMethod).forEach(([method, payments]) => {
      const methodAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const methodCompleted = payments.filter(p => p.status === 'completed');
      const successRate = payments.length > 0 ? (methodCompleted.length / payments.length * 100).toFixed(1) : '0';
      const icon = this.paymentMethodIcons[method] || '💰';
      
      console.log(`\n   ${icon} ${method.toUpperCase()}:`);
      console.log(`      📊 Total: ${payments.length} transacciones ($${methodAmount.toFixed(2)})`);
      console.log(`      ✅ Completadas: ${methodCompleted.length} (${successRate}% éxito)`);
      console.log(`      📈 Promedio: $${payments.length > 0 ? (methodAmount / payments.length).toFixed(2) : '0'}`);
      
      // Top 3 transacciones por método
      const topPayments = payments
        .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
        .slice(0, 3);
      
      console.log(`      🏆 Top 3 transacciones:`);
      topPayments.forEach((payment, index) => {
        const clientName = this.getClientName(payment);
        const statusIcon = this.statusIcons[payment.status] || '❓';
        console.log(`         ${index + 1}. ${statusIcon} $${payment.amount} - ${clientName} (${this.formatDate(payment.paymentDate)})`);
      });
    });
    
    // Análisis por tipo de pago
    console.log('\n📋 ANÁLISIS POR TIPO DE PAGO:');
    const paymentsByType = this.groupBy(this.allPayments, 'paymentType');
    
    Object.entries(paymentsByType).forEach(([type, payments]) => {
      const typeAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const icon = this.typeIcons[type] || '📋';
      
      console.log(`   ${icon} ${type}: ${payments.length} pagos ($${typeAmount.toFixed(2)})`);
    });
  }

  async analyzeTransferTransactionsDetailed() {
    console.log('\n🏦 ANÁLISIS EXHAUSTIVO DE TRANSFERENCIAS');
    console.log('='.repeat(80));
    
    if (this.allTransfers.length === 0) {
      console.log('   ⚠️ No hay transferencias registradas');
      return;
    }
    
    const totalTransferAmount = this.allTransfers.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const completedTransfers = this.allTransfers.filter(t => t.status === 'completed');
    const pendingTransfers = this.allTransfers.filter(t => t.status === 'pending');
    const failedTransfers = this.allTransfers.filter(t => t.status === 'failed');
    
    console.log('💰 RESUMEN DE TRANSFERENCIAS:');
    console.log(`   🎯 Total histórico: $${totalTransferAmount.toFixed(2)} en ${this.allTransfers.length} transferencias`);
    console.log(`   ✅ Completadas: ${completedTransfers.length} ($${completedTransfers.reduce((sum, t) => sum + parseFloat(t.amount), 0).toFixed(2)})`);
    console.log(`   ⏳ Pendientes: ${pendingTransfers.length} ($${pendingTransfers.reduce((sum, t) => sum + parseFloat(t.amount), 0).toFixed(2)})`);
    console.log(`   ❌ Fallidas: ${failedTransfers.length} ($${failedTransfers.reduce((sum, t) => sum + parseFloat(t.amount), 0).toFixed(2)})`);
    
    // Análisis de comprobantes
    const transfersWithProof = this.allTransfers.filter(t => t.transferProof);
    const transfersWithoutProof = this.allTransfers.filter(t => !t.transferProof);
    
    console.log('\n📄 ANÁLISIS DE COMPROBANTES:');
    console.log(`   📎 Con comprobante: ${transfersWithProof.length} (${transfersWithProof.length > 0 ? (transfersWithProof.length/this.allTransfers.length*100).toFixed(1) : 0}%)`);
    console.log(`   🚫 Sin comprobante: ${transfersWithoutProof.length} (${transfersWithoutProof.length > 0 ? (transfersWithoutProof.length/this.allTransfers.length*100).toFixed(1) : 0}%)`);
    
    // Transferencias pendientes detalladas
    if (this.pendingTransfers.length > 0) {
      console.log('\n🎯 TRANSFERENCIAS PENDIENTES DE VALIDACIÓN:');
      
      this.pendingTransfers.forEach((transfer, index) => {
        console.log(`\n   📄 TRANSFERENCIA #${index + 1}:`);
        console.log(`      🆔 ID: ${transfer.id}`);
        console.log(`      💰 Monto: $${transfer.amount}`);
        console.log(`      👤 Cliente: ${transfer.user ? transfer.user.name : 'Anónimo'}`);
        console.log(`      📧 Email: ${transfer.user ? transfer.user.email : 'No disponible'}`);
        console.log(`      📞 Teléfono: ${transfer.user ? transfer.user.phone : 'No disponible'}`);
        console.log(`      📄 Comprobante: ${transfer.hasProof ? '✅ Disponible' : '❌ Faltante'}`);
        console.log(`      ⏰ Tiempo esperando: ${transfer.hoursWaiting} horas`);
        console.log(`      🚨 Prioridad: ${this.getPriorityIcon(transfer.priority)} ${transfer.priority.toUpperCase()}`);
        console.log(`      📅 Fecha de pago: ${this.formatDate(transfer.paymentDate)}`);
        console.log(`      👥 Registrado por: ${transfer.registeredBy ? transfer.registeredBy.name : 'Sistema'}`);
        
        if (transfer.membership) {
          console.log(`      🏋️ Membresía: Tipo ${transfer.membership.type} (ID: ${transfer.membership.id})`);
        }
        
        if (transfer.hasProof) {
          console.log(`      🔗 Ver comprobante: ${transfer.transferProof || 'URL no disponible'}`);
        }
        
        console.log(`      🎯 ACCIÓN REQUERIDA: ${transfer.canValidate ? 'LISTO PARA VALIDAR' : 'Esperando comprobante'}`);
      });
    }
    
    // Análisis de validadores
    const validatedTransfers = this.allTransfers.filter(t => t.transferValidated !== null && t.transferValidated !== undefined);
    
    if (validatedTransfers.length > 0) {
      console.log('\n✅ ANÁLISIS DE VALIDACIONES REALIZADAS:');
      const approvedTransfers = validatedTransfers.filter(t => t.transferValidated === true);
      const rejectedTransfers = validatedTransfers.filter(t => t.transferValidated === false);
      
      console.log(`   ✅ Aprobadas: ${approvedTransfers.length}`);
      console.log(`   ❌ Rechazadas: ${rejectedTransfers.length}`);
      console.log(`   📈 Tasa de aprobación: ${validatedTransfers.length > 0 ? (approvedTransfers.length/validatedTransfers.length*100).toFixed(1) : 0}%`);
      
      // Validadores más activos
      const validatorActivity = this.groupBy(
        validatedTransfers.filter(t => t.transferValidator), 
        t => `${t.transferValidator.firstName} ${t.transferValidator.lastName}`
      );
      
      if (Object.keys(validatorActivity).length > 0) {
        console.log('\n   👤 ACTIVIDAD DE VALIDADORES:');
        Object.entries(validatorActivity).forEach(([validatorName, transfers]) => {
          const approved = transfers.filter(t => t.transferValidated === true).length;
          const rejected = transfers.filter(t => t.transferValidated === false).length;
          const totalAmount = transfers.reduce((sum, t) => sum + parseFloat(t.amount), 0);
          
          console.log(`      👨‍💼 ${validatorName}:`);
          console.log(`         📊 ${transfers.length} validaciones ($${totalAmount.toFixed(2)})`);
          console.log(`         ✅ ${approved} aprobadas | ❌ ${rejected} rechazadas`);
          console.log(`         📈 Tasa de aprobación: ${transfers.length > 0 ? (approved/transfers.length*100).toFixed(1) : 0}%`);
        });
      }
    }
  }

  async analyzeCashTransactionsDetailed() {
    console.log('\n💵 ANÁLISIS EXHAUSTIVO DE PAGOS EN EFECTIVO');
    console.log('='.repeat(80));
    
    const cashPayments = this.allPayments.filter(p => p.paymentMethod === 'cash');
    
    if (cashPayments.length === 0) {
      console.log('   ⚠️ No hay pagos en efectivo registrados');
      return;
    }
    
    const totalCashAmount = cashPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const completedCash = cashPayments.filter(p => p.status === 'completed');
    const pendingCash = cashPayments.filter(p => p.status === 'pending');
    
    console.log('💰 RESUMEN DE EFECTIVO:');
    console.log(`   🎯 Total en efectivo: $${totalCashAmount.toFixed(2)} en ${cashPayments.length} transacciones`);
    console.log(`   ✅ Confirmadas: ${completedCash.length} ($${completedCash.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)})`);
    console.log(`   ⏳ Pendientes: ${pendingCash.length} ($${pendingCash.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)})`);
    
    // Análisis de pagos pendientes de efectivo
    if (this.pendingCashPayments.length > 0) {
      console.log('\n🎯 PAGOS EN EFECTIVO PENDIENTES DE CONFIRMACIÓN:');
      
      this.pendingCashPayments.forEach((payment, index) => {
        console.log(`\n   💵 PAGO EN EFECTIVO #${index + 1}:`);
        console.log(`      🆔 ID: ${payment.id}`);
        console.log(`      💰 Monto: $${payment.amount}`);
        console.log(`      👤 Cliente: ${payment.client ? payment.client.name : 'Cliente anónimo'}`);
        console.log(`      📧 Email: ${payment.client ? payment.client.email : 'No disponible'}`);
        console.log(`      📞 Teléfono: ${payment.client ? payment.client.phone : 'No disponible'}`);
        console.log(`      📋 Tipo: ${payment.paymentType}`);
        console.log(`      ⏰ Tiempo esperando: ${payment.hoursWaiting} horas`);
        console.log(`      🚨 Prioridad: ${this.getPriorityIcon(payment.priority)} ${payment.priority.toUpperCase()}`);
        console.log(`      📅 Fecha de registro: ${this.formatDate(payment.createdAt)}`);
        console.log(`      👥 Registrado por: ${payment.registeredBy ? payment.registeredBy.name : 'Sistema'}`);
        
        if (payment.membership) {
          console.log(`      🏋️ Membresía asociada:`);
          console.log(`         🆔 ID: ${payment.membership.id}`);
          console.log(`         📋 Tipo: ${payment.membership.type}`);
          console.log(`         💰 Plan: ${payment.membership.plan ? payment.membership.plan.name : 'No especificado'}`);
          
          if (payment.membership.hasSchedule) {
            console.log(`         ⏰ Horarios reservados: SÍ`);
            Object.entries(payment.membership.schedule).forEach(([day, slots]) => {
              if (slots.length > 0) {
                const timesText = slots.map(slot => `${slot.openTime}-${slot.closeTime}`).join(', ');
                console.log(`            📅 ${day}: ${timesText}`);
              }
            });
          } else {
            console.log(`         ⏰ Horarios reservados: NO`);
          }
        }
        
        console.log(`      🎯 ACCIÓN REQUERIDA: ${payment.canActivate ? 'LISTO PARA CONFIRMAR EN GIMNASIO' : 'Revisar estado'}`);
      });
      
      // Estadísticas de prioridad
      const groupedByPriority = this.groupBy(this.pendingCashPayments, 'priority');
      
      console.log('\n📊 DISTRIBUCIÓN POR PRIORIDAD:');
      Object.entries(groupedByPriority).forEach(([priority, payments]) => {
        const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const icon = this.getPriorityIcon(priority);
        
        console.log(`   ${icon} ${priority.toUpperCase()}: ${payments.length} pagos ($${totalAmount.toFixed(2)})`);
      });
    }
    
    // Análisis por tipo de pago en efectivo
    const cashByType = this.groupBy(cashPayments, 'paymentType');
    
    console.log('\n📋 EFECTIVO POR TIPO DE PAGO:');
    Object.entries(cashByType).forEach(([type, payments]) => {
      const typeAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const icon = this.typeIcons[type] || '📋';
      
      console.log(`   ${icon} ${type}: ${payments.length} pagos ($${typeAmount.toFixed(2)})`);
    });
  }

  async analyzeCardTransactionsDetailed() {
    console.log('\n💳 ANÁLISIS EXHAUSTIVO DE PAGOS CON TARJETA');
    console.log('='.repeat(80));
    
    if (this.cardPayments.length === 0) {
      console.log('   ⚠️ No hay pagos con tarjeta registrados');
      return;
    }
    
    const totalCardAmount = this.cardPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const completedCards = this.cardPayments.filter(p => p.status === 'completed');
    const pendingCards = this.cardPayments.filter(p => p.status === 'pending');
    const failedCards = this.cardPayments.filter(p => p.status === 'failed');
    
    console.log('💳 RESUMEN DE TARJETAS:');
    console.log(`   🎯 Total con tarjeta: $${totalCardAmount.toFixed(2)} en ${this.cardPayments.length} transacciones`);
    console.log(`   ✅ Autorizadas: ${completedCards.length} ($${completedCards.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)})`);
    console.log(`   ⏳ Procesando: ${pendingCards.length} ($${pendingCards.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)})`);
    console.log(`   ❌ Rechazadas: ${failedCards.length} ($${failedCards.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)})`);
    
    // Análisis de Stripe
    const stripeCards = this.cardPayments.filter(p => p.cardTransactionId);
    
    if (stripeCards.length > 0) {
      console.log('\n🌟 ANÁLISIS DE STRIPE:');
      const stripeAmount = stripeCards.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const stripePercentage = this.cardPayments.length > 0 ? (stripeCards.length / this.cardPayments.length * 100).toFixed(1) : '0';
      
      console.log(`   📊 Procesados por Stripe: ${stripeCards.length} de ${this.cardPayments.length} (${stripePercentage}%)`);
      console.log(`   💰 Monto Stripe: $${stripeAmount.toFixed(2)}`);
      
      // Detalles de transacciones Stripe
      console.log('\n   📋 TRANSACCIONES STRIPE RECIENTES:');
      stripeCards.slice(0, 10).forEach((payment, index) => {
        const clientName = this.getClientName(payment);
        const statusIcon = this.statusIcons[payment.status] || '❓';
        
        console.log(`      ${index + 1}. ${statusIcon} $${payment.amount} - ${clientName}`);
        console.log(`         💳 Tarjeta: **** **** **** ${payment.cardLast4 || 'XXXX'}`);
        console.log(`         🆔 Stripe ID: ${payment.cardTransactionId.substring(0, 20)}...`);
        console.log(`         📅 Fecha: ${this.formatDate(payment.paymentDate)}`);
        console.log(`         📋 Tipo: ${payment.paymentType}`);
        
        if (payment.membership) {
          console.log(`         🏋️ Membresía: ${payment.membership.type}`);
        }
      });
    }
    
    // Análisis de tarjetas por últimos 4 dígitos
    const cardsByLast4 = this.groupBy(
      this.cardPayments.filter(p => p.cardLast4), 
      'cardLast4'
    );
    
    if (Object.keys(cardsByLast4).length > 0) {
      console.log('\n💳 ANÁLISIS POR TARJETAS:');
      Object.entries(cardsByLast4).forEach(([last4, payments]) => {
        const cardAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const successfulPayments = payments.filter(p => p.status === 'completed');
        const successRate = payments.length > 0 ? (successfulPayments.length / payments.length * 100).toFixed(1) : '0';
        
        console.log(`   💳 **** ${last4}: ${payments.length} transacciones ($${cardAmount.toFixed(2)}) - ${successRate}% éxito`);
      });
    }
  }

  // ✅ NUEVO: Análisis detallado de membresías pendientes
  async analyzePendingMembershipsDetailed() {
    console.log('\n🎫 ANÁLISIS EXHAUSTIVO DE MEMBRESÍAS PENDIENTES');
    console.log('='.repeat(80));
    
    if (this.pendingCashMemberships.length === 0 && this.pendingMembershipsWithPayments.length === 0) {
      console.log('   ✅ No hay membresías pendientes');
      return;
    }
    
    // Analizar membresías pendientes de pago en efectivo
    if (this.pendingCashMemberships.length > 0) {
      console.log('\n💵 MEMBRESÍAS PENDIENTES DE PAGO EN EFECTIVO:');
      
      this.pendingCashMemberships.forEach((membership, index) => {
        console.log(`\n   💵 MEMBRESÍA EFECTIVO #${index + 1}:`);
        console.log(`      🆔 Membresía ID: ${membership.id}`);
        console.log(`      📊 Estado Membresía: ${membership.status || 'pending'}`);
        console.log(`      💰 Precio: $${membership.price}`);
        console.log(`      👤 Cliente: ${membership.user ? membership.user.name : 'Anónimo'}`);
        console.log(`      📧 Email: ${membership.user ? membership.user.email : 'No disponible'}`);
        console.log(`      📞 Teléfono: ${membership.user ? membership.user.phone : 'No disponible'}`);
        console.log(`      📋 Plan: ${membership.plan ? membership.plan.name : 'No especificado'}`);
        console.log(`      📅 Creada: ${this.formatDate(membership.createdAt)}`);
        console.log(`      ⏰ Tiempo esperando: ${membership.hoursWaiting} horas`);
        console.log(`      🚨 Prioridad: ${this.getPriorityIcon(membership.priority)} ${membership.priority.toUpperCase()}`);
        
        // Mostrar horarios si los hay
        if (membership.schedule && Object.keys(membership.schedule).length > 0) {
          console.log(`      📅 HORARIOS RESERVADOS:`);
          Object.entries(membership.schedule).forEach(([day, slots]) => {
            if (slots.length > 0) {
              const timesText = slots.map(slot => `${slot.timeRange || slot.openTime + '-' + slot.closeTime}`).join(', ');
              console.log(`         📅 ${day}: ${timesText}`);
            }
          });
        } else {
          console.log(`      📅 Sin horarios reservados`);
        }
        
        console.log(`      👥 Registrado por: ${membership.registeredBy ? membership.registeredBy.name : 'Sistema'}`);
        console.log(`      🎯 ACCIÓN REQUERIDA: ⚡ CONFIRMAR PAGO EN GIMNASIO ⚡`);
      });
    }
    
    // Analizar membresías con pagos de transferencia pendientes
    if (this.pendingMembershipsWithPayments.length > 0) {
      console.log('\n🏦 MEMBRESÍAS CON PAGOS DE TRANSFERENCIA PENDIENTES:');
      
      this.pendingMembershipsWithPayments.forEach((membership, index) => {
        console.log(`\n   🏦 MEMBRESÍA TRANSFERENCIA #${index + 1}:`);
        console.log(`      🆔 Membresía ID: ${membership.id}`);
        console.log(`      📊 Estado Membresía: ${membership.status}`);
        console.log(`      💰 Precio: $${membership.price}`);
        console.log(`      👤 Cliente: ${membership.user ? `${membership.user.firstName} ${membership.user.lastName}` : 'Anónimo'}`);
        console.log(`      📧 Email: ${membership.user ? membership.user.email : 'No disponible'}`);
        
        // ✅ INFORMACIÓN DEL PAGO ASOCIADO - CORREGIDO
        if (membership.payments && membership.payments.length > 0) {
          const payment = membership.payments[0]; // Tomar el primer pago (más reciente)
          console.log(`\n      💳 INFORMACIÓN DEL PAGO:`);
          console.log(`         🆔 Pago ID: ${payment.id}`);
          console.log(`         📊 Estado del Pago: ${this.statusIcons[payment.status]} ${payment.status.toUpperCase()}`);
          console.log(`         💰 Monto: $${payment.amount}`);
          console.log(`         💳 Método: ${payment.paymentMethod}`);
          console.log(`         📅 Fecha de pago: ${this.formatDate(payment.paymentDate)}`);
          
          // ✅ MOSTRAR URL DE TRANSFERENCIA SI EXISTE - CORREGIDO
          if (payment.transferProof) {
            console.log(`         📄 Comprobante: ✅ DISPONIBLE`);
            console.log(`         🔗 URL Comprobante: ${payment.transferProof}`);
            console.log(`         ✅ Estado Validación: ${payment.transferValidated ? 'VALIDADO' : 'PENDIENTE DE VALIDACIÓN'}`);
            
            if (payment.transferValidated === false) {
              console.log(`         ❌ Transferencia RECHAZADA`);
            } else if (payment.transferValidated === true) {
              console.log(`         ✅ Transferencia APROBADA`);
              console.log(`         👤 Validado por: ${payment.transferValidator ? `${payment.transferValidator.firstName} ${payment.transferValidator.lastName}` : 'Sistema'}`);
              console.log(`         📅 Fecha validación: ${this.formatDate(payment.transferValidatedAt)}`);
            }
          } else {
            console.log(`         📄 Comprobante: ❌ FALTANTE`);
            console.log(`         🎯 ACCIÓN: Cliente debe subir comprobante`);
          }
          
          // Calcular tiempo de espera desde creación del pago
          const hoursWaiting = (new Date() - new Date(payment.createdAt)) / (1000 * 60 * 60);
          console.log(`         ⏰ Tiempo esperando: ${hoursWaiting.toFixed(1)} horas`);
          
          const priority = hoursWaiting > 48 ? 'critical' : hoursWaiting > 24 ? 'high' : 'normal';
          console.log(`         🚨 Prioridad: ${this.getPriorityIcon(priority)} ${priority.toUpperCase()}`);
          
        } else {
          console.log(`\n      ⚠️ SIN PAGOS ASOCIADOS - Posible error en la BD`);
        }
        
        console.log(`      📅 Membresía creada: ${this.formatDate(membership.createdAt)}`);
        console.log(`      👥 Registrado por: ${membership.registeredByUser ? `${membership.registeredByUser.firstName} ${membership.registeredByUser.lastName}` : 'Sistema'}`);
      });
    }

    // Estadísticas generales de membresías pendientes
    console.log('\n📊 ESTADÍSTICAS DE MEMBRESÍAS PENDIENTES:');
    
    const totalPendingMemberships = this.pendingCashMemberships.length + this.pendingMembershipsWithPayments.length;
    const totalPendingAmount = 
      this.pendingCashMemberships.reduce((sum, m) => sum + parseFloat(m.price), 0) +
      this.pendingMembershipsWithPayments.reduce((sum, m) => sum + parseFloat(m.price), 0);
    
    console.log(`   🎫 Total membresías pendientes: ${totalPendingMemberships}`);
    console.log(`   💰 Valor total pendiente: $${totalPendingAmount.toFixed(2)}`);
    console.log(`   💵 Efectivo pendiente: ${this.pendingCashMemberships.length} ($${this.pendingCashMemberships.reduce((sum, m) => sum + parseFloat(m.price), 0).toFixed(2)})`);
    console.log(`   🏦 Transferencias pendientes: ${this.pendingMembershipsWithPayments.length} ($${this.pendingMembershipsWithPayments.reduce((sum, m) => sum + parseFloat(m.price), 0).toFixed(2)})`);
  }

  async analyzeFinancialMovements() {
    console.log('\n📊 ANÁLISIS DE MOVIMIENTOS FINANCIEROS');
    console.log('='.repeat(80));
    
    if (this.financialMovements.length === 0) {
      console.log('   ⚠️ No hay movimientos financieros registrados');
      return;
    }
    
    const incomeMovements = this.financialMovements.filter(m => m.type === 'income');
    const expenseMovements = this.financialMovements.filter(m => m.type === 'expense');
    
    const totalIncome = incomeMovements.reduce((sum, m) => sum + parseFloat(m.amount), 0);
    const totalExpenses = expenseMovements.reduce((sum, m) => sum + parseFloat(m.amount), 0);
    const netIncome = totalIncome - totalExpenses;
    
    console.log('💰 RESUMEN FINANCIERO:');
    console.log(`   📈 Total ingresos: $${totalIncome.toFixed(2)} (${incomeMovements.length} movimientos)`);
    console.log(`   📉 Total gastos: $${totalExpenses.toFixed(2)} (${expenseMovements.length} movimientos)`);
    console.log(`   🎯 Ingreso neto: $${netIncome.toFixed(2)}`);
    console.log(`   📊 Total movimientos: ${this.financialMovements.length}`);
    
    // Análisis por categoría
    const movementsByCategory = this.groupBy(this.financialMovements, 'category');
    
    console.log('\n📋 MOVIMIENTOS POR CATEGORÍA:');
    Object.entries(movementsByCategory).forEach(([category, movements]) => {
      const categoryAmount = movements.reduce((sum, m) => sum + parseFloat(m.amount), 0);
      const categoryType = movements[0].type;
      const icon = categoryType === 'income' ? '📈' : '📉';
      
      console.log(`   ${icon} ${category}: ${movements.length} movimientos ($${categoryAmount.toFixed(2)})`);
    });
    
    // Movimientos recientes detallados
    console.log('\n📋 MOVIMIENTOS RECIENTES (últimos 10):');
    this.financialMovements
      .sort((a, b) => new Date(b.movementDate) - new Date(a.movementDate))
      .slice(0, 10)
      .forEach((movement, index) => {
        const typeIcon = movement.type === 'income' ? '📈' : '📉';
        const registeredBy = movement.registeredByUser ? 
          `${movement.registeredByUser.firstName} ${movement.registeredByUser.lastName}` : 
          'Sistema automático';
        
        console.log(`\n   ${index + 1}. ${typeIcon} $${movement.amount} - ${movement.category}`);
        console.log(`      📝 ${movement.description}`);
        console.log(`      📅 ${this.formatDate(movement.movementDate)}`);
        console.log(`      👤 Registrado por: ${registeredBy}`);
        console.log(`      💳 Método: ${movement.paymentMethod || 'No especificado'}`);
        
        if (movement.referenceType && movement.referenceId) {
          console.log(`      🔗 Referencia: ${movement.referenceType} ID ${movement.referenceId}`);
        }
        
        if (movement.notes) {
          console.log(`      📝 Notas: ${movement.notes}`);
        }
      });
  }

  async showUserTransactionProfiles() {
    console.log('\n👥 PERFILES DE TRANSACCIONES POR USUARIO');
    console.log('='.repeat(80));
    
    const userPayments = {};
    const anonymousPayments = [];
    
    this.allPayments.forEach(payment => {
      if (payment.user) {
        const userId = payment.user.id;
        if (!userPayments[userId]) {
          userPayments[userId] = {
            user: payment.user,
            payments: []
          };
        }
        userPayments[userId].payments.push(payment);
      } else {
        anonymousPayments.push(payment);
      }
    });
    
    // Top usuarios por volumen de transacciones
    const topUsers = Object.entries(userPayments)
      .map(([userId, data]) => ({
        ...data,
        totalAmount: data.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
        totalCount: data.payments.length
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);
    
    console.log('🏆 TOP 10 USUARIOS POR VOLUMEN:');
    topUsers.forEach((userData, index) => {
      const { user, payments, totalAmount, totalCount } = userData;
      const avgPayment = totalCount > 0 ? (totalAmount / totalCount).toFixed(2) : '0';
      const completedPayments = payments.filter(p => p.status === 'completed');
      const successRate = totalCount > 0 ? (completedPayments.length / totalCount * 100).toFixed(1) : '0';
      
      console.log(`\n   ${index + 1}. 👤 ${user.firstName} ${user.lastName}`);
      console.log(`      📧 ${user.email}`);
      console.log(`      💰 Total pagado: $${totalAmount.toFixed(2)} en ${totalCount} transacciones`);
      console.log(`      📈 Promedio por transacción: $${avgPayment}`);
      console.log(`      ✅ Tasa de éxito: ${successRate}%`);
      
      // Métodos de pago preferidos
      const userByMethod = this.groupBy(payments, 'paymentMethod');
      const preferredMethods = Object.entries(userByMethod)
        .map(([method, methodPayments]) => ({
          method,
          count: methodPayments.length,
          amount: methodPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0)
        }))
        .sort((a, b) => b.count - a.count);
      
      console.log(`      💳 Métodos preferidos:`);
      preferredMethods.forEach(methodData => {
        const icon = this.paymentMethodIcons[methodData.method] || '💰';
        console.log(`         ${icon} ${methodData.method}: ${methodData.count} veces ($${methodData.amount.toFixed(2)})`);
      });
      
      // Última actividad
      const lastPayment = payments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))[0];
      console.log(`      📅 Última transacción: ${this.formatDate(lastPayment.paymentDate)} - $${lastPayment.amount}`);
    });
    
    // Estadísticas de usuarios anónimos
    if (anonymousPayments.length > 0) {
      console.log('\n👻 TRANSACCIONES ANÓNIMAS:');
      const totalAnonymousAmount = anonymousPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const avgAnonymousPayment = anonymousPayments.length > 0 ? (totalAnonymousAmount / anonymousPayments.length).toFixed(2) : '0';
      
      console.log(`   📊 Total: ${anonymousPayments.length} transacciones ($${totalAnonymousAmount.toFixed(2)})`);
      console.log(`   📈 Promedio: $${avgAnonymousPayment}`);
      
      const anonymousByMethod = this.groupBy(anonymousPayments, 'paymentMethod');
      console.log(`   💳 Métodos utilizados:`);
      Object.entries(anonymousByMethod).forEach(([method, payments]) => {
        const icon = this.paymentMethodIcons[method] || '💰';
        const methodAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        console.log(`      ${icon} ${method}: ${payments.length} pagos ($${methodAmount.toFixed(2)})`);
      });
    }
  }

  async showStaffActivityAnalysis() {
    console.log('\n👔 ANÁLISIS DE ACTIVIDAD DEL PERSONAL');
    console.log('='.repeat(80));
    
    const staffPayments = this.groupBy(
      this.allPayments.filter(p => p.registeredByUser), 
      p => `${p.registeredByUser.firstName} ${p.registeredByUser.lastName}`
    );
    
    if (Object.keys(staffPayments).length === 0) {
      console.log('   ⚠️ No hay datos de personal registrados');
      return;
    }
    
    console.log('👥 ACTIVIDAD POR PERSONAL:');
    Object.entries(staffPayments).forEach(([staffName, payments]) => {
      const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const role = payments[0].registeredByUser.role;
      const completedPayments = payments.filter(p => p.status === 'completed');
      const pendingPayments = payments.filter(p => p.status === 'pending');
      const successRate = payments.length > 0 ? (completedPayments.length / payments.length * 100).toFixed(1) : '0';
      
      console.log(`\n   👤 ${staffName} (${role}):`);
      console.log(`      📊 Total registrado: $${totalAmount.toFixed(2)} en ${payments.length} transacciones`);
      console.log(`      ✅ Completadas: ${completedPayments.length} (${successRate}%)`);
      console.log(`      ⏳ Pendientes: ${pendingPayments.length}`);
      console.log(`      📈 Promedio por transacción: $${payments.length > 0 ? (totalAmount / payments.length).toFixed(2) : '0'}`);
      
      // Métodos más utilizados por el personal
      const staffByMethod = this.groupBy(payments, 'paymentMethod');
      console.log(`      💳 Métodos registrados:`);
      Object.entries(staffByMethod).forEach(([method, methodPayments]) => {
        const icon = this.paymentMethodIcons[method] || '💰';
        const methodAmount = methodPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        console.log(`         ${icon} ${method}: ${methodPayments.length} pagos ($${methodAmount.toFixed(2)})`);
      });
      
      // Actividad por tipo de pago
      const staffByType = this.groupBy(payments, 'paymentType');
      console.log(`      📋 Tipos de pago:`);
      Object.entries(staffByType).forEach(([type, typePayments]) => {
        const icon = this.typeIcons[type] || '📋';
        const typeAmount = typePayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        console.log(`         ${icon} ${type}: ${typePayments.length} pagos ($${typeAmount.toFixed(2)})`);
      });
      
      // Actividad por día de la semana
      const paymentsByDay = this.groupBy(payments, p => {
        const date = new Date(p.paymentDate);
        return date.toLocaleDateString('es-ES', { weekday: 'long' });
      });
      
      const mostActiveDay = Object.entries(paymentsByDay)
        .sort(([,a], [,b]) => b.length - a.length)[0];
      
      if (mostActiveDay) {
        console.log(`      📅 Día más activo: ${mostActiveDay[0]} (${mostActiveDay[1].length} transacciones)`);
      }
    });
  }

  async showTimeAnalysis() {
    console.log('\n⏰ ANÁLISIS TEMPORAL DE TRANSACCIONES');
    console.log('='.repeat(80));
    
    // Análisis por día de la semana
    const paymentsByWeekday = this.groupBy(this.allPayments, payment => {
      const date = new Date(payment.paymentDate);
      return date.toLocaleDateString('es-ES', { weekday: 'long' });
    });
    
    console.log('📅 ACTIVIDAD POR DÍA DE LA SEMANA:');
    Object.entries(paymentsByWeekday)
      .sort(([,a], [,b]) => b.length - a.length)
      .forEach(([day, payments]) => {
        const dayAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const avgPayment = payments.length > 0 ? (dayAmount / payments.length).toFixed(2) : '0';
        
        console.log(`   📅 ${day}: ${payments.length} transacciones ($${dayAmount.toFixed(2)}) - Promedio: $${avgPayment}`);
      });
    
    // Análisis por hora del día
    const paymentsByHour = this.groupBy(this.allPayments, payment => {
      const date = new Date(payment.paymentDate);
      return date.getHours();
    });
    
    console.log('\n🕐 ACTIVIDAD POR HORA DEL DÍA:');
    Object.entries(paymentsByHour)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([hour, payments]) => {
        const hourAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const hourFormatted = `${hour.toString().padStart(2, '0')}:00`;
        
        console.log(`   🕐 ${hourFormatted}: ${payments.length} transacciones ($${hourAmount.toFixed(2)})`);
      });
    
    // Análisis de tendencias recientes
    const last30Days = this.allPayments.filter(payment => {
      const paymentDate = new Date(payment.paymentDate);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return paymentDate >= thirtyDaysAgo;
    });
    
    if (last30Days.length > 0) {
      console.log('\n📈 TENDENCIAS ÚLTIMOS 30 DÍAS:');
      const recent30Amount = last30Days.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const dailyAvg = (recent30Amount / 30).toFixed(2);
      
      console.log(`   📊 Total últimos 30 días: $${recent30Amount.toFixed(2)} en ${last30Days.length} transacciones`);
      console.log(`   📈 Promedio diario: $${dailyAvg}`);
      console.log(`   📊 Transacciones promedio por día: ${(last30Days.length / 30).toFixed(1)}`);
    }
  }

  // ✅ MÉTODO CORREGIDO: Elementos críticos actualizados
  async showCriticalActionItems() {
    console.log('\n🚨 ELEMENTOS CRÍTICOS QUE REQUIEREN ATENCIÓN');
    console.log('='.repeat(80));
    
    let criticalCount = 0;
    
    // ✅ NUEVO: Membresías de efectivo críticas
    const criticalCashMemberships = this.pendingCashMemberships.filter(m => {
      return m.hoursWaiting > 48;
    });
    
    if (criticalCashMemberships.length > 0) {
      console.log('🔴 MEMBRESÍAS DE EFECTIVO CRÍTICAS (>48 horas):');
      criticalCashMemberships.forEach((membership, index) => {
        console.log(`   ${index + 1}. 💵 $${membership.price} - ${membership.user ? membership.user.name : 'Anónimo'}`);
        console.log(`      ⏰ Esperando: ${membership.hoursWaiting.toFixed(1)} horas`);
        console.log(`      📋 Plan: ${membership.plan ? membership.plan.name : 'No especificado'}`);
        console.log(`      🎯 ACCIÓN: ⚡ CONFIRMAR PAGO EN GIMNASIO AHORA ⚡`);
      });
      criticalCount += criticalCashMemberships.length;
    }
    
    // ✅ NUEVO: Membresías con transferencias críticas
    const criticalTransferMemberships = this.pendingMembershipsWithPayments.filter(m => {
      if (!m.payments || m.payments.length === 0) return false;
      const payment = m.payments[0];
      const hoursWaiting = (new Date() - new Date(payment.createdAt)) / (1000 * 60 * 60);
      return hoursWaiting > 48 && payment.transferProof;
    });
    
    if (criticalTransferMemberships.length > 0) {
      console.log('\n🔴 MEMBRESÍAS CON TRANSFERENCIAS CRÍTICAS (>48 horas):');
      criticalTransferMemberships.forEach((membership, index) => {
        const payment = membership.payments[0];
        const hoursWaiting = (new Date() - new Date(payment.createdAt)) / (1000 * 60 * 60);
        
        console.log(`   ${index + 1}. 🏦 $${payment.amount} - ${membership.user ? `${membership.user.firstName} ${membership.user.lastName}` : 'Anónimo'}`);
        console.log(`      ⏰ Esperando validación: ${hoursWaiting.toFixed(1)} horas`);
        console.log(`      📄 Comprobante: ${payment.transferProof}`);
        console.log(`      📊 Estado pago: ${payment.status}`);
        console.log(`      🎯 ACCIÓN: ⚡ VALIDAR TRANSFERENCIA INMEDIATAMENTE ⚡`);
      });
      criticalCount += criticalTransferMemberships.length;
    }
    
    // Transferencias críticas (>48 horas) - MANTENIDO del código original
    const criticalTransfers = this.pendingTransfers.filter(t => {
      const hoursWaiting = (new Date() - new Date(t.createdAt)) / (1000 * 60 * 60);
      return hoursWaiting > 48;
    });
    
    if (criticalTransfers.length > 0) {
      console.log('\n🔴 TRANSFERENCIAS NORMALES CRÍTICAS (>48 horas sin validar):');
      criticalTransfers.forEach((transfer, index) => {
        const hoursWaiting = (new Date() - new Date(transfer.createdAt)) / (1000 * 60 * 60);
        const hasProof = !!(transfer.transferProof && transfer.transferProof.trim());
        const clientName = transfer.user ? `${transfer.user.firstName} ${transfer.user.lastName}` : 'Anónimo';
        
        console.log(`   ${index + 1}. 🏦 ${transfer.amount} - ${clientName}`);
        console.log(`      ⏰ Esperando: ${hoursWaiting.toFixed(1)} horas`);
        console.log(`      📄 Comprobante: ${hasProof ? 'Disponible' : 'Faltante'}`);
        if (hasProof) {
          console.log(`      🔗 URL: ${transfer.transferProof}`);
          console.log(`      🎯 ACCIÓN: ⚡ VALIDAR INMEDIATAMENTE ⚡`);
        } else {
          console.log(`      🎯 ACCIÓN: 📞 CONTACTAR URGENTE PARA COMPROBANTE`);
        }
      });
      criticalCount += criticalTransfers.length;
    }
    
    // Pagos en efectivo críticos - MANTENIDO del código original
    const criticalCash = this.pendingCashPayments.filter(p => {
      const hoursWaiting = (new Date() - new Date(p.createdAt)) / (1000 * 60 * 60);
      return hoursWaiting > 48;
    });
    
    if (criticalCash.length > 0) {
      console.log('\n🔴 PAGOS EN EFECTIVO NORMALES CRÍTICOS (>48 horas):');
      criticalCash.forEach((payment, index) => {
        const hoursWaiting = (new Date() - new Date(payment.createdAt)) / (1000 * 60 * 60);
        
        console.log(`   ${index + 1}. 💵 ${payment.amount} - ${payment.client ? payment.client.name : 'Anónimo'}`);
        console.log(`      ⏰ Esperando: ${hoursWaiting.toFixed(1)} horas`);
        console.log(`      📋 Tipo: ${payment.paymentType}`);
        console.log(`      🎯 ACCIÓN: ⚡ CONFIRMAR PAGO EN GIMNASIO AHORA ⚡`);
      });
      criticalCount += criticalCash.length;
    }
    
    // Transferencias listas para validar (con comprobante pero sin validar)
    const readyToValidate = this.pendingTransfers.filter(t => {
      const hasProof = !!(t.transferProof && t.transferProof.trim());
      return hasProof && t.transferValidated === null;
    });
    
    if (readyToValidate.length > 0) {
      console.log('\n🟡 TRANSFERENCIAS LISTAS PARA VALIDAR:');
      readyToValidate.forEach((transfer, index) => {
        const hoursWaiting = (new Date() - new Date(transfer.createdAt)) / (1000 * 60 * 60);
        const clientName = transfer.user ? `${transfer.user.firstName} ${transfer.user.lastName}` : 'Anónimo';
        
        console.log(`   ${index + 1}. 🏦 ${transfer.amount} - ${clientName}`);
        console.log(`      ⏰ Esperando validación: ${hoursWaiting.toFixed(1)} horas`);
        console.log(`      🔗 Comprobante: ${transfer.transferProof}`);
        console.log(`      🎯 ACCIÓN: ✅ REVISAR Y VALIDAR`);
      });
    }
    
    // Tarjetas fallidas recientes - CORREGIDO
    const recentFailedCards = this.cardPayments.filter(p => {
      const paymentDate = new Date(p.paymentDate);
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      return p.status === 'failed' && paymentDate >= oneDayAgo;
    });
    
    if (recentFailedCards.length > 0) {
      console.log('\n🔴 TARJETAS FALLIDAS RECIENTES (último día):');
      recentFailedCards.forEach((payment, index) => {
        const clientName = this.getClientName(payment);
        console.log(`   ${index + 1}. 💳 ${payment.amount} - ${clientName}`);
        console.log(`      📅 ${this.formatDate(payment.paymentDate)}`);
        console.log(`      🎯 ACCIÓN: 📞 CONTACTAR CLIENTE PARA RETRY`);
      });
      criticalCount += recentFailedCards.length;
    }
    
    // Transferencias sin comprobante antiguas (>24 horas)
    const oldTransfersNoProof = this.allTransfers.filter(t => {
      const created = new Date(t.createdAt);
      const hoursOld = (new Date() - created) / (1000 * 60 * 60);
      const hasProof = !!(t.transferProof && t.transferProof.trim());
      return t.status === 'pending' && !hasProof && hoursOld > 24;
    });
    
    if (oldTransfersNoProof.length > 0) {
      console.log('\n🟡 TRANSFERENCIAS SIN COMPROBANTE (>24 horas):');
      oldTransfersNoProof.slice(0, 5).forEach((transfer, index) => {
        const clientName = this.getClientName(transfer);
        const hoursOld = (new Date() - new Date(transfer.createdAt)) / (1000 * 60 * 60);
        
        console.log(`   ${index + 1}. 🏦 ${transfer.amount} - ${clientName}`);
        console.log(`      ⏰ Sin comprobante: ${hoursOld.toFixed(1)} horas`);
        console.log(`      🎯 ACCIÓN: 📞 RECORDAR SUBIR COMPROBANTE`);
      });
    }
    
    // ✅ RESUMEN FINAL ACTUALIZADO
    console.log('\n📊 RESUMEN DE ACCIONES CRÍTICAS:');
    
    if (criticalCount === 0 && readyToValidate.length === 0 && oldTransfersNoProof.length === 0 && 
        criticalCashMemberships.length === 0 && criticalTransferMemberships.length === 0) {
      console.log('✅ ¡EXCELENTE! No hay elementos críticos que requieran atención inmediata');
    } else {
      console.log(`🚨 TOTAL DE ELEMENTOS CRÍTICOS: ${criticalCount}`);
      console.log(`💵 Membresías efectivo críticas: ${criticalCashMemberships.length}`);
      console.log(`🏦 Membresías transferencia críticas: ${criticalTransferMemberships.length}`);
      console.log(`⚡ Listas para validar: ${readyToValidate.length}`);
      console.log(`📞 Sin comprobante (>24h): ${oldTransfersNoProof.length}`);
      console.log('⚡ Estos elementos requieren atención INMEDIATA para mantener el flujo de caja');
      
      console.log('\n🎯 PRÓXIMOS PASOS RECOMENDADOS:');
      if (criticalCashMemberships.length > 0) {
        console.log(`   1. 🔴 URGENTE: Confirmar ${criticalCashMemberships.length} pagos en efectivo de membresías`);
      }
      if (criticalTransferMemberships.length > 0) {
        console.log(`   2. 🔴 URGENTE: Validar ${criticalTransferMemberships.length} transferencias de membresías`);
      }
      if (criticalTransfers.length > 0) {
        console.log(`   3. 🔴 URGENTE: Validar ${criticalTransfers.length} transferencias normales críticas`);
      }
      if (criticalCash.length > 0) {
        console.log(`   4. 🔴 URGENTE: Confirmar ${criticalCash.length} pagos en efectivo normales críticos`);
      }
      if (readyToValidate.length > 0) {
        console.log(`   5. 🟡 IMPORTANTE: Validar ${readyToValidate.length} transferencias con comprobante`);
      }
      if (oldTransfersNoProof.length > 0) {
        console.log(`   6. 🟡 SEGUIMIENTO: Contactar ${oldTransfersNoProof.length} clientes sin comprobante`);
      }
    }
  }

  // Métodos auxiliares (sin cambios)
  getClientName(payment) {
    if (payment.user) {
      return `${payment.user.firstName} ${payment.user.lastName}`;
    }
    if (payment.anonymousClientInfo && payment.anonymousClientInfo.name) {
      return payment.anonymousClientInfo.name;
    }
    return 'Cliente anónimo';
  }

  getPriorityIcon(priority) {
    const icons = {
      critical: '🔴',
      high: '🟡',
      medium: '🟠',
      normal: '🟢'
    };
    return icons[priority] || '❓';
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

  groupBy(array, keyOrFunction) {
    return array.reduce((groups, item) => {
      const key = typeof keyOrFunction === 'function' ? keyOrFunction(item) : item[keyOrFunction];
      groups[key] = groups[key] || [];
      groups[key].push(item);
      return groups;
    }, {});
  }
}

// Función de ayuda
function showHelp() {
  console.log('\n💰 Elite Fitness Club - Analizador COMPLETO de Transacciones v3.1 CORREGIDO\n');
  console.log('🎯 ANÁLISIS EXHAUSTIVO DE TODAS LAS TRANSACCIONES:');
  console.log('  📊 Estadísticas completas del sistema financiero');
  console.log('  🎯 Dashboard en tiempo real de acciones pendientes');
  console.log('  💰 Análisis detallado de cada transacción individual');
  console.log('  🏦 Transferencias con URLs de comprobantes y validaciones');
  console.log('  💵 Pagos en efectivo pendientes con datos de membresías');
  console.log('  💳 Transacciones de tarjeta y análisis de Stripe');
  console.log('  📊 Movimientos financieros y análisis de cash flow');
  console.log('  👥 Perfiles detallados de usuarios y personal');
  console.log('  ⏰ Análisis temporal y patrones de comportamiento');
  console.log('  🚨 Elementos críticos que requieren atención inmediata');
  console.log('  ✅ NUEVO: Análisis completo de membresías pendientes\n');
  
  console.log('✨ CARACTERÍSTICAS CORREGIDAS v3.1:');
  console.log('  ✅ Estados de pago de membresías CORREGIDOS');
  console.log('  ✅ URLs de transferencia CORREGIDAS');
  console.log('  ✅ Análisis completo de CADA transacción individual');
  console.log('  ✅ URLs directas a comprobantes con datos de validación');
  console.log('  ✅ Información completa de clientes y membresías');
  console.log('  ✅ Análisis de prioridades por tiempo de espera');
  console.log('  ✅ Datos en tiempo real desde múltiples endpoints');
  console.log('  ✅ Análisis de personal y patrones de trabajo');
  console.log('  ✅ Identificación automática de elementos críticos');
  console.log('  ✅ Tendencias temporales y análisis predictivo');
  console.log('  ✅ Membresías pendientes con estado de pago real\n');
  
  console.log('🚀 USO:');
  console.log('  node test-payments-admin-enhanced.js        # Ejecutar análisis completo');
  console.log('  node test-payments-admin-enhanced.js --help # Mostrar esta ayuda\n');
  
  console.log('ℹ️  IMPORTANTE:');
  console.log('  • Este script SOLO consulta información de la BD');
  console.log('  • Muestra datos COMPLETOS y actualizados de cada transacción');
  console.log('  • No modifica ni valida nada - es 100% seguro');
  console.log('  • Conecta con múltiples endpoints para datos exhaustivos');
  console.log('  • Identifica automáticamente acciones críticas pendientes');
  console.log('  • CORREGIDO: Ahora muestra estados reales de pagos y URLs\n');
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const analyzer = new CompleteTransactionAnalyzer();
  
  try {
    await analyzer.runCompleteAnalysis();
    
  } catch (error) {
    console.error('\n🚨 ERROR EN EL ANÁLISIS COMPLETO:');
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
    console.error('   • Que todos los endpoints estén funcionando');
    
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { CompleteTransactionAnalyzer };