// test-payments-admin.js - VERSIÓN COMPLETA v2.0 con análisis de TARJETAS
const axios = require('axios');

class DetailedPaymentsAnalyzer {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.adminToken = null;
    this.allPayments = [];
    this.pendingDashboard = null;
    this.pendingCashPayments = [];
    this.pendingTransfers = [];
    this.cardPayments = []; // ✅ NUEVO: Para pagos con tarjeta
    this.stripePayments = []; // ✅ NUEVO: Para pagos específicos de Stripe
    this.paymentStatistics = null;
  }

  async analyzeAllPayments() {
    console.log('💳 ANALIZADOR DETALLADO DE PAGOS - VERSIÓN COMPLETA v2.0');
    console.log('='.repeat(80));
    console.log('🎯 Análisis completo: Efectivo + Transferencias + TARJETA + Stripe\n');
    
    try {
      await this.loginAdmin();
      await this.getPaymentStatistics();
      await this.getPendingDashboard();
      await this.getPendingCashPayments();
      await this.getPendingTransfers();
      await this.getCardPayments(); // ✅ NUEVO
      await this.getStripePayments(); // ✅ NUEVO
      await this.getAllPayments();
      await this.showCompletePaymentsAnalysis(); // ✅ ACTUALIZADO
      await this.showDetailedPayments();
      await this.showPaymentsSummary();
      await this.showUserAnalysis();
      
      console.log('\n🎉 ¡ANÁLISIS COMPLETO FINALIZADO EXITOSAMENTE!');
      
    } catch (error) {
      console.error('\n❌ Error en el análisis:', error.message);
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

  async getPaymentStatistics() {
    console.log('\n2. 📊 Obteniendo estadísticas generales del sistema...');
    
    try {
      const response = await axios.get(`${this.baseURL}/api/payments/statistics`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      if (response.data.success) {
        this.paymentStatistics = response.data.data;
        console.log('   ✅ Estadísticas obtenidas exitosamente');
        console.log(`   💰 Total de ingresos: $${this.paymentStatistics.totalIncome || 0}`);
        console.log(`   📊 Total de pagos: ${this.paymentStatistics.totalPayments || 0}`);
        console.log(`   📈 Promedio por pago: $${(this.paymentStatistics.averagePayment || 0).toFixed(2)}`);
        
        if (this.paymentStatistics.incomeByMethod && this.paymentStatistics.incomeByMethod.length > 0) {
          console.log('   💳 Métodos de pago detectados:');
          this.paymentStatistics.incomeByMethod.forEach(method => {
            console.log(`      ${this.getMethodIcon(method.method)} ${method.method}: ${method.count} pagos ($${method.total})`);
          });
        }
      }
    } catch (error) {
      console.warn('   ⚠️ Error obteniendo estadísticas:', error.response?.data?.message || error.message);
      this.paymentStatistics = null;
    }
  }

  async getPendingDashboard() {
    console.log('\n3. 🎯 Obteniendo dashboard de pagos pendientes...');
    
    try {
      const response = await axios.get(`${this.baseURL}/api/payments/pending-dashboard`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      if (response.data.success) {
        this.pendingDashboard = response.data.data;
        console.log('   ✅ Dashboard obtenido exitosamente');
        
        const { summary } = this.pendingDashboard;
        
        console.log('   📊 RESUMEN DEL DASHBOARD:');
        console.log(`      🏦 Transferencias pendientes: ${summary.pendingTransfers.count} ($${summary.pendingTransfers.totalAmount})`);
        console.log(`      💵 Pagos en efectivo pendientes: ${summary.pendingCashPayments.count} ($${summary.pendingCashPayments.totalAmount})`);
        console.log(`      ⚡ Total acciones pendientes: ${summary.totalPendingActions}`);
        
        if (summary.pendingTransfers.oldestHours > 0) {
          console.log(`      ⏰ Transferencia más antigua: ${summary.pendingTransfers.oldestHours} horas`);
        }
        
        if (summary.pendingCashPayments.oldestHours > 0) {
          console.log(`      ⏰ Pago en efectivo más antiguo: ${summary.pendingCashPayments.oldestHours} horas`);
        }

        if (this.pendingDashboard.urgentItems && this.pendingDashboard.urgentItems.length > 0) {
          console.log(`   🚨 ITEMS URGENTES: ${this.pendingDashboard.urgentItems.length}`);
          this.pendingDashboard.urgentItems.slice(0, 3).forEach((item, index) => {
            console.log(`      ${index + 1}. ${item.clientName} - $${item.amount} (${item.hoursWaiting}h)`);
          });
        }
      }
    } catch (error) {
      console.warn('   ⚠️ Error obteniendo dashboard:', error.response?.data?.message || error.message);
      this.pendingDashboard = null;
    }
  }

  async getPendingCashPayments() {
    console.log('\n4. 💵 Obteniendo pagos en EFECTIVO pendientes...');
    
    try {
      const response = await axios.get(`${this.baseURL}/api/payments/cash/pending`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      if (response.data.success) {
        this.pendingCashPayments = response.data.data.payments || [];
        console.log(`   ✅ Pagos en efectivo pendientes: ${this.pendingCashPayments.length}`);
        
        if (this.pendingCashPayments.length > 0) {
          const totalAmount = response.data.data.summary?.totalAmount || 0;
          console.log(`   💰 Total pendiente en efectivo: $${totalAmount}`);
          
          console.log('   📋 DETALLES DE PAGOS EN EFECTIVO:');
          this.pendingCashPayments.slice(0, 5).forEach((payment, index) => {
            const clientName = payment.client?.name || 'Cliente anónimo';
            const waitingHours = payment.hoursWaiting || 0;
            const priority = payment.priority || 'normal';
            const priorityIcon = priority === 'critical' ? '🔴' : priority === 'high' ? '🟡' : '🟢';
            
            console.log(`      ${index + 1}. ${priorityIcon} ${clientName} - $${payment.amount} (${waitingHours}h)`);
            if (payment.membership) {
              console.log(`         🏋️ Membresía: ${payment.membership.type} - Plan: ${payment.membership.plan?.name || 'N/A'}`);
            }
          });
          
          if (this.pendingCashPayments.length > 5) {
            console.log(`      ... y ${this.pendingCashPayments.length - 5} más`);
          }
        } else {
          console.log('   ✅ No hay pagos en efectivo pendientes');
        }
      }
    } catch (error) {
      console.warn('   ⚠️ Error obteniendo pagos en efectivo pendientes:', error.response?.data?.message || error.message);
      this.pendingCashPayments = [];
    }
  }

  async getPendingTransfers() {
    console.log('\n5. 🏦 Obteniendo TRANSFERENCIAS pendientes...');
    
    try {
      const response = await axios.get(`${this.baseURL}/api/payments/transfers/pending`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      if (response.data.success) {
        this.pendingTransfers = response.data.data.transfers || [];
        console.log(`   ✅ Transferencias pendientes: ${this.pendingTransfers.length}`);
        
        if (this.pendingTransfers.length > 0) {
          const totalAmount = this.pendingTransfers.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
          console.log(`   💰 Total pendiente en transferencias: $${totalAmount.toFixed(2)}`);
          
          console.log('   📋 DETALLES DE TRANSFERENCIAS:');
          this.pendingTransfers.slice(0, 5).forEach((transfer, index) => {
            const clientName = transfer.user ? 
              `${transfer.user.firstName} ${transfer.user.lastName}` : 
              'Cliente anónimo';
            const hasProof = transfer.transferProof ? '✅ Con comprobante' : '❌ Sin comprobante';
            const registeredBy = transfer.registeredByUser ? 
              `${transfer.registeredByUser.firstName} ${transfer.registeredByUser.lastName}` : 
              'Sistema';
            
            console.log(`      ${index + 1}. ${clientName} - $${transfer.amount}`);
            console.log(`         📄 ${hasProof} | 👤 Registrado por: ${registeredBy}`);
            console.log(`         📅 Fecha: ${this.formatDate(transfer.paymentDate)}`);
          });
          
          if (this.pendingTransfers.length > 5) {
            console.log(`      ... y ${this.pendingTransfers.length - 5} más`);
          }
        } else {
          console.log('   ✅ No hay transferencias pendientes');
        }
      }
    } catch (error) {
      console.warn('   ⚠️ Error obteniendo transferencias pendientes:', error.response?.data?.message || error.message);
      this.pendingTransfers = [];
    }
  }

  // ✅ NUEVO: Obtener pagos con tarjeta
  async getCardPayments() {
    console.log('\n6. 💳 Obteniendo pagos con TARJETA...');
    
    try {
      const response = await axios.get(`${this.baseURL}/api/payments`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: {
          paymentMethod: 'card',
          limit: 50,
          page: 1,
          includeAll: 'true'
        }
      });

      if (response.data.success) {
        this.cardPayments = response.data.data.payments || [];
        console.log(`   ✅ Pagos con tarjeta encontrados: ${this.cardPayments.length}`);
        
        if (this.cardPayments.length > 0) {
          // Separar completados vs otros estados
          const completedCards = this.cardPayments.filter(p => p.status === 'completed');
          const pendingCards = this.cardPayments.filter(p => p.status === 'pending');
          const failedCards = this.cardPayments.filter(p => p.status === 'failed');
          
          const totalAmount = completedCards.reduce((sum, p) => sum + parseFloat(p.amount), 0);
          const pendingAmount = pendingCards.reduce((sum, p) => sum + parseFloat(p.amount), 0);
          
          console.log(`   💰 Total procesado con tarjeta: $${totalAmount.toFixed(2)}`);
          console.log(`   ✅ Completados: ${completedCards.length} | ⏳ Pendientes: ${pendingCards.length} | ❌ Fallidos: ${failedCards.length}`);
          
          if (pendingAmount > 0) {
            console.log(`   ⏳ Monto pendiente: $${pendingAmount.toFixed(2)}`);
          }
          
          console.log('   📋 DETALLES DE PAGOS CON TARJETA:');
          this.cardPayments.slice(0, 5).forEach((payment, index) => {
            const clientName = payment.user ? 
              `${payment.user.firstName} ${payment.user.lastName}` : 
              'Cliente anónimo';
            const statusIcon = this.getStatusIcon(payment.status);
            const cardInfo = payment.cardLast4 ? `**** ${payment.cardLast4}` : 'Sin info de tarjeta';
            
            console.log(`      ${index + 1}. ${statusIcon} ${clientName} - $${payment.amount}`);
            console.log(`         💳 ${cardInfo} | 📋 ${payment.paymentType} | 📅 ${this.formatDate(payment.paymentDate)}`);
            
            if (payment.cardTransactionId) {
              console.log(`         🔗 Stripe ID: ${payment.cardTransactionId.substring(0, 20)}...`);
            }
            
            if (payment.membership) {
              console.log(`         🏋️ Membresía: ${payment.membership.type}`);
            }
          });
          
          if (this.cardPayments.length > 5) {
            console.log(`      ... y ${this.cardPayments.length - 5} más`);
          }
          
          // Mostrar tendencias por fecha
          const cardsByDate = this.groupBy(completedCards, payment => 
            this.formatDate(payment.paymentDate).split(' ')[0]
          );
          
          if (Object.keys(cardsByDate).length > 0) {
            console.log('\n   📈 TENDENCIA DE PAGOS CON TARJETA (últimas fechas):');
            Object.entries(cardsByDate)
              .sort(([a], [b]) => new Date(b) - new Date(a))
              .slice(0, 5)
              .forEach(([date, payments]) => {
                const dayTotal = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
                console.log(`      📅 ${date}: ${payments.length} pagos ($${dayTotal.toFixed(2)})`);
              });
          }
          
        } else {
          console.log('   ℹ️ No hay pagos con tarjeta registrados');
        }
      }
    } catch (error) {
      console.warn('   ⚠️ Error obteniendo pagos con tarjeta:', error.response?.data?.message || error.message);
      this.cardPayments = [];
    }
  }

  // ✅ NUEVO: Obtener pagos específicos de Stripe
  async getStripePayments() {
    console.log('\n7. 🌟 Obteniendo pagos específicos de STRIPE...');
    
    try {
      const response = await axios.get(`${this.baseURL}/api/stripe/payments`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { limit: 30 }
      });

      if (response.data.success) {
        this.stripePayments = response.data.data.payments || [];
        console.log(`   ✅ Pagos de Stripe encontrados: ${this.stripePayments.length}`);
        
        if (this.stripePayments.length > 0) {
          const totalStripeAmount = this.stripePayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
          console.log(`   💰 Total procesado por Stripe: $${totalStripeAmount.toFixed(2)}`);
          
          // Agrupar por tipo de pago
          const stripeByType = this.groupBy(this.stripePayments, 'paymentType');
          console.log('   📊 Por tipo de pago:');
          Object.entries(stripeByType).forEach(([type, payments]) => {
            const typeTotal = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
            console.log(`      ${this.getTypeIcon(type)} ${type}: ${payments.length} pagos ($${typeTotal.toFixed(2)})`);
          });
          
          console.log('\n   📋 DETALLES DE PAGOS STRIPE (últimos 5):');
          this.stripePayments.slice(0, 5).forEach((payment, index) => {
            const clientName = payment.user ? 
              `${payment.user.firstName} ${payment.user.lastName}` : 
              'Cliente anónimo';
            const cardInfo = payment.cardLast4 ? `**** ${payment.cardLast4}` : 'Sin info';
            
            console.log(`      ${index + 1}. ${clientName} - $${payment.amount} (${payment.paymentType})`);
            console.log(`         💳 ${cardInfo} | 📅 ${this.formatDate(payment.paymentDate)}`);
            
            if (payment.cardTransactionId) {
              console.log(`         🎯 Stripe Payment Intent: ${payment.cardTransactionId}`);
            }
          });
          
        } else {
          console.log('   ℹ️ No hay pagos específicos de Stripe');
        }
      }
    } catch (error) {
      console.warn('   ⚠️ Error obteniendo pagos de Stripe:', error.response?.data?.message || error.message);
      this.stripePayments = [];
    }
  }

  async getAllPayments() {
    console.log('\n8. 💰 Obteniendo TODOS los pagos del sistema...');
    
    try {
      const response = await axios.get(`${this.baseURL}/api/payments`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: {
          limit: 100,
          page: 1,
          includeAll: 'true'
        }
      });

      if (response.data.success) {
        this.allPayments = response.data.data.payments;
        const { pagination } = response.data.data;
        
        console.log(`   ✅ Pagos obtenidos: ${this.allPayments.length} de ${pagination.total} total`);
        console.log(`   📊 Páginas disponibles: ${pagination.pages}`);
        
        if (pagination.pages > 1) {
          console.log('   📄 Obteniendo páginas adicionales...');
          
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
        
        if (this.allPayments.length === 0) {
          console.log('   📝 No hay pagos registrados en el sistema');
        }
        
      } else {
        throw new Error('Respuesta sin éxito al obtener pagos');
      }
    } catch (error) {
      throw new Error(`Error obteniendo pagos: ${error.response?.data?.message || error.message}`);
    }
  }

  // ✅ ANÁLISIS COMPLETO CORREGIDO
  async showCompletePaymentsAnalysis() {
    console.log('\n9. 🎯 ANÁLISIS COMPLETO DE TODOS LOS MÉTODOS DE PAGO');
    console.log('=' .repeat(80));
    
    // Dashboard general
    if (this.pendingDashboard) {
      console.log('📊 DASHBOARD DE PAGOS PENDIENTES:');
      console.log(`   🎯 Total de acciones pendientes: ${this.pendingDashboard.summary.totalPendingActions}`);
      
      if (this.pendingDashboard.summary.todayActivity) {
        const today = this.pendingDashboard.summary.todayActivity;
        console.log(`   📅 Actividad de hoy:`);
        
        if (today.transferValidations) {
          console.log(`      🏦 Validaciones de transferencia: ${today.transferValidations.approved} aprobadas, ${today.transferValidations.rejected} rechazadas`);
        }
        
        if (today.completedPayments) {
          console.log(`      ✅ Pagos completados: ${today.completedPayments}`);
        }
      }
      
      if (this.pendingDashboard.recentActivity && this.pendingDashboard.recentActivity.length > 0) {
        console.log(`\n   📋 ACTIVIDAD RECIENTE (últimas ${Math.min(5, this.pendingDashboard.recentActivity.length)} acciones):`);
        this.pendingDashboard.recentActivity.slice(0, 5).forEach((activity, index) => {
          const actionIcon = activity.action.includes('approved') ? '✅' : 
                           activity.action.includes('rejected') ? '❌' : 
                           activity.action.includes('confirmed') ? '💵' : '📋';
          console.log(`      ${index + 1}. ${actionIcon} ${activity.clientName} - $${activity.amount}`);
          console.log(`         ${activity.action} por ${activity.performedBy}`);
          console.log(`         📅 ${this.formatDate(activity.timestamp)}`);
        });
      }
    }
    
    console.log('\n💵 ANÁLISIS DE PAGOS EN EFECTIVO:');
    if (this.pendingCashPayments.length === 0) {
      console.log('   ✅ No hay pagos en efectivo pendientes');
    } else {
      const byPriority = this.groupBy(this.pendingCashPayments, 'priority');
      
      Object.entries(byPriority).forEach(([priority, payments]) => {
        const priorityIcon = priority === 'critical' ? '🔴' : 
                           priority === 'high' ? '🟡' : 
                           priority === 'medium' ? '🟠' : '🟢';
        const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        
        console.log(`   ${priorityIcon} ${priority.toUpperCase()}: ${payments.length} pagos ($${totalAmount.toFixed(2)})`);
        
        payments.slice(0, 3).forEach((payment, index) => {
          console.log(`      ${index + 1}. ${payment.client?.name || 'Cliente anónimo'} - $${payment.amount}`);
          console.log(`         ⏰ Esperando: ${payment.hoursWaiting}h | Tipo: ${payment.paymentType}`);
        });
        
        if (payments.length > 3) {
          console.log(`      ... y ${payments.length - 3} más`);
        }
      });
    }
    
    console.log('\n🏦 ANÁLISIS DE TRANSFERENCIAS:');
    const withProof = this.pendingTransfers.filter(t => t.transferProof);
    const withoutProof = this.pendingTransfers.filter(t => !t.transferProof);
    
    if (this.pendingTransfers.length === 0) {
      console.log('   ✅ No hay transferencias pendientes');
    } else {
      console.log(`   📄 Con comprobante: ${withProof.length} transferencias`);
      console.log(`   ❌ Sin comprobante: ${withoutProof.length} transferencias`);
      
      if (withProof.length > 0) {
        console.log('\n   🎯 LISTAS PARA VALIDAR (con comprobante):');
        withProof.slice(0, 5).forEach((transfer, index) => {
          const clientName = transfer.user ? 
            `${transfer.user.firstName} ${transfer.user.lastName}` : 
            'Cliente anónimo';
          
          console.log(`      ${index + 1}. ${clientName} - $${transfer.amount}`);
          console.log(`         📅 ${this.formatDate(transfer.paymentDate)}`);
        });
      }
    }
    
    // ✅ ANÁLISIS DE PAGOS CON TARJETA
    console.log('\n💳 ANÁLISIS DE PAGOS CON TARJETA:');
    if (this.cardPayments.length === 0) {
      console.log('   ℹ️ No hay pagos con tarjeta registrados');
    } else {
      const completedCards = this.cardPayments.filter(p => p.status === 'completed');
      const pendingCards = this.cardPayments.filter(p => p.status === 'pending');
      const failedCards = this.cardPayments.filter(p => p.status === 'failed');
      
      const totalCardAmount = completedCards.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const pendingCardAmount = pendingCards.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      
      console.log(`   ✅ COMPLETADOS: ${completedCards.length} pagos ($${totalCardAmount.toFixed(2)})`);
      console.log(`   ⏳ PENDIENTES: ${pendingCards.length} pagos ($${pendingCardAmount.toFixed(2)})`);
      console.log(`   ❌ FALLIDOS: ${failedCards.length} pagos`);
      
      // Agrupar por tipo de pago
      const cardsByType = this.groupBy(completedCards, 'paymentType');
      console.log('\n   📊 PAGOS COMPLETADOS POR TIPO:');
      Object.entries(cardsByType).forEach(([type, payments]) => {
        const typeTotal = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        console.log(`      ${this.getTypeIcon(type)} ${type}: ${payments.length} pagos ($${typeTotal.toFixed(2)})`);
      });
      
      // Pagos con Stripe
      const stripeCards = completedCards.filter(p => p.cardTransactionId);
      console.log(`\n   🌟 PROCESADOS VIA STRIPE: ${stripeCards.length} pagos`);
      
      if (stripeCards.length > 0) {
        const stripeTotal = stripeCards.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        console.log(`      💰 Total Stripe: $${stripeTotal.toFixed(2)}`);
        
        console.log('      📋 ÚLTIMOS PAGOS STRIPE:');
        stripeCards.slice(0, 3).forEach((payment, index) => {
          const clientName = payment.user ? 
            `${payment.user.firstName} ${payment.user.lastName}` : 
            'Cliente anónimo';
          console.log(`         ${index + 1}. ${clientName} - $${payment.amount} (${payment.paymentType})`);
          console.log(`            💳 **** ${payment.cardLast4 || 'XXXX'} | 📅 ${this.formatDate(payment.paymentDate)}`);
        });
      }
      
      if (pendingCards.length > 0) {
        console.log('\n   ⏳ PAGOS CON TARJETA PENDIENTES:');
        pendingCards.slice(0, 3).forEach((payment, index) => {
          const clientName = payment.user ? 
            `${payment.user.firstName} ${payment.user.lastName}` : 
            'Cliente anónimo';
          console.log(`      ${index + 1}. ${clientName} - $${payment.amount}`);
          console.log(`         📋 ${payment.paymentType} | 📅 ${this.formatDate(payment.paymentDate)}`);
        });
      }
    }
    
    // ✅ RESUMEN COMPARATIVO
    console.log('\n📊 RESUMEN COMPARATIVO DE MÉTODOS DE PAGO:');
    
    const cashCompleted = this.allPayments.filter(p => p.paymentMethod === 'cash' && p.status === 'completed');
    const transferCompleted = this.allPayments.filter(p => p.paymentMethod === 'transfer' && p.status === 'completed');
    const cardCompleted = this.allPayments.filter(p => p.paymentMethod === 'card' && p.status === 'completed');
    
    const cashTotal = cashCompleted.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const transferTotal = transferCompleted.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const cardTotal = cardCompleted.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    const totalCompleted = cashTotal + transferTotal + cardTotal;
    
    console.log(`   💵 EFECTIVO: ${cashCompleted.length} pagos - $${cashTotal.toFixed(2)} (${totalCompleted > 0 ? ((cashTotal/totalCompleted)*100).toFixed(1) : 0}%)`);
    console.log(`   🏦 TRANSFERENCIA: ${transferCompleted.length} pagos - $${transferTotal.toFixed(2)} (${totalCompleted > 0 ? ((transferTotal/totalCompleted)*100).toFixed(1) : 0}%)`);
    console.log(`   💳 TARJETA: ${cardCompleted.length} pagos - $${cardTotal.toFixed(2)} (${totalCompleted > 0 ? ((cardTotal/totalCompleted)*100).toFixed(1) : 0}%)`);
    console.log(`   🎯 TOTAL: ${cashCompleted.length + transferCompleted.length + cardCompleted.length} pagos - $${totalCompleted.toFixed(2)}`);
    
    // ✅ CORREGIDO: Acciones necesarias
    console.log('\n🎯 ACCIONES REQUERIDAS:');
    
    // Calcular pendingCards desde this.cardPayments
    const pendingCards = this.cardPayments.filter(p => p.status === 'pending');
    const totalActions = this.pendingCashPayments.length + withProof.length + pendingCards.length;
    
    if (totalActions === 0) {
      console.log('   ✅ No hay acciones pendientes en este momento');
    } else {
      console.log(`   💵 Confirmar ${this.pendingCashPayments.length} pagos en efectivo`);
      console.log(`   🏦 Validar ${withProof.length} transferencias`);
      console.log(`   💳 Revisar ${pendingCards.length} pagos con tarjeta pendientes`);
      console.log(`   ⏳ Esperar comprobantes de ${withoutProof.length} transferencias`);
      console.log(`   🎯 Total de acciones: ${totalActions}`);
    }
  }

  async showDetailedPayments() {
    console.log('\n10. 📋 INFORMACIÓN DETALLADA DE CADA PAGO');
    console.log('=' .repeat(70));
    
    if (this.allPayments.length === 0) {
      console.log('   ⚠️ No hay pagos registrados en el sistema');
      return;
    }
    
    const sortedPayments = this.allPayments.sort((a, b) => 
      new Date(b.paymentDate) - new Date(a.paymentDate)
    );
    
    sortedPayments.forEach((payment, index) => {
      console.log(`\n📄 PAGO #${index + 1}`);
      console.log('-'.repeat(50));
      
      console.log('💰 INFORMACIÓN DEL PAGO:');
      console.log(`   🆔 ID: ${payment.id}`);
      console.log(`   💵 Monto: $${payment.amount}`);
      console.log(`   💳 Método de pago: ${this.formatPaymentMethod(payment.paymentMethod)}`);
      console.log(`   📋 Tipo de pago: ${this.formatPaymentType(payment.paymentType)}`);
      console.log(`   ✅ Estado: ${this.formatPaymentStatus(payment.status)}`);
      console.log(`   📅 Fecha de pago: ${this.formatDate(payment.paymentDate)}`);
      console.log(`   📝 Descripción: ${payment.description || 'Sin descripción'}`);
      
      if (payment.notes) {
        console.log(`   📝 Notas: ${payment.notes}`);
      }
      
      console.log('\n👤 INFORMACIÓN DEL CLIENTE:');
      if (payment.user) {
        console.log(`   👥 Cliente: ${payment.user.firstName} ${payment.user.lastName}`);
        console.log(`   📧 Email: ${payment.user.email}`);
        if (payment.user.phone) {
          console.log(`   📞 Teléfono: ${payment.user.phone}`);
        }
        console.log(`   🆔 ID del usuario: ${payment.user.id}`);
      } else if (payment.anonymousClientInfo) {
        console.log(`   👤 Cliente anónimo: ${JSON.stringify(payment.anonymousClientInfo)}`);
      } else {
        console.log(`   ⚠️ Sin información de cliente`);
      }
      
      if (payment.membership) {
        console.log('\n🏋️ INFORMACIÓN DE MEMBRESÍA:');
        console.log(`   🎯 Tipo: ${payment.membership.type}`);
        console.log(`   📅 Fecha de inicio: ${this.formatDate(payment.membership.startDate)}`);
        console.log(`   📅 Fecha de vencimiento: ${this.formatDate(payment.membership.endDate)}`);
        console.log(`   🆔 ID de membresía: ${payment.membership.id}`);
      }
      
      console.log('\n👔 REGISTRADO POR:');
      if (payment.registeredByUser) {
        console.log(`   👤 Personal: ${payment.registeredByUser.firstName} ${payment.registeredByUser.lastName}`);
        console.log(`   🎭 Rol: ${payment.registeredByUser.role}`);
        console.log(`   🆔 ID: ${payment.registeredByUser.id}`);
      } else {
        console.log(`   ⚠️ Sin información de quien registró`);
      }
      
      // ✅ INFORMACIÓN ESPECÍFICA POR MÉTODO
      if (payment.paymentMethod === 'transfer') {
        console.log('\n🔄 INFORMACIÓN DE TRANSFERENCIA:');
        console.log(`   📄 Comprobante: ${payment.transferProof ? '✅ Subido' : '❌ No subido'}`);
        
        if (payment.transferValidated !== null && payment.transferValidated !== undefined) {
          console.log(`   ✅ Validado: ${payment.transferValidated ? '✅ Aprobado' : '❌ Rechazado'}`);
          console.log(`   📅 Fecha de validación: ${this.formatDate(payment.transferValidatedAt)}`);
          
          if (payment.transferValidator) {
            console.log(`   👤 Validado por: ${payment.transferValidator.firstName} ${payment.transferValidator.lastName}`);
          }
        } else {
          console.log(`   ⏳ Estado: Pendiente de validación`);
        }
      } else if (payment.paymentMethod === 'card') {
        // ✅ INFORMACIÓN ESPECÍFICA DE TARJETA
        console.log('\n💳 INFORMACIÓN DE TARJETA:');
        
        if (payment.cardLast4) {
          console.log(`   💳 Tarjeta: **** **** **** ${payment.cardLast4}`);
        } else {
          console.log(`   💳 Sin información de tarjeta`);
        }
        
        if (payment.cardTransactionId) {
          console.log(`   🌟 Stripe Payment Intent: ${payment.cardTransactionId}`);
          console.log(`   🔗 Ver en Stripe Dashboard: https://dashboard.stripe.com/payments/${payment.cardTransactionId}`);
        } else {
          console.log(`   ⚠️ No procesado por Stripe`);
        }
        
        if (payment.status === 'pending') {
          console.log(`   ⏳ Estado: Procesamiento pendiente`);
        } else if (payment.status === 'failed') {
          console.log(`   ❌ Estado: Pago rechazado o fallido`);
        } else if (payment.status === 'completed') {
          console.log(`   ✅ Estado: Pago autorizado y completado`);
        }
      } else if (payment.paymentMethod === 'cash') {
        console.log('\n💵 INFORMACIÓN DE EFECTIVO:');
        if (payment.status === 'pending') {
          console.log(`   ⏳ Estado: Esperando confirmación en gimnasio`);
        } else {
          console.log(`   ✅ Estado: Efectivo recibido y confirmado`);
        }
      }
      
      console.log('\n📊 INFORMACIÓN ADICIONAL:');
      console.log(`   📅 Creado: ${this.formatDate(payment.createdAt)}`);
      console.log(`   📅 Actualizado: ${this.formatDate(payment.updatedAt)}`);
      
      if (payment.dailyPaymentCount && payment.dailyPaymentCount > 1) {
        console.log(`   🔢 Pagos diarios incluidos: ${payment.dailyPaymentCount}`);
      }
      
      if (payment.referenceId) {
        console.log(`   🔗 Referencia: ${payment.referenceType} - ${payment.referenceId}`);
      }
      
      console.log('\n' + '='.repeat(50));
    });
  }

  async showPaymentsSummary() {
    console.log('\n11. 📊 RESUMEN GENERAL COMPLETO');
    console.log('=' .repeat(50));
    
    if (this.allPayments.length === 0) {
      console.log('   ⚠️ No hay datos para resumir');
      return;
    }
    
    const totalAmount = this.allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalPayments = this.allPayments.length;
    const averagePayment = totalAmount / totalPayments;
    
    console.log('💰 ESTADÍSTICAS GENERALES:');
    console.log(`   💵 Total recaudado: $${totalAmount.toFixed(2)}`);
    console.log(`   📊 Total de pagos: ${totalPayments}`);
    console.log(`   📈 Promedio por pago: $${averagePayment.toFixed(2)}`);
    
    console.log('\n✅ POR ESTADO:');
    const byStatus = this.groupBy(this.allPayments, 'status');
    Object.entries(byStatus).forEach(([status, payments]) => {
      const amount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      console.log(`   ${this.getStatusIcon(status)} ${status}: ${payments.length} pagos ($${amount.toFixed(2)})`);
    });
    
    console.log('\n💳 POR MÉTODO DE PAGO:');
    const byMethod = this.groupBy(this.allPayments, 'paymentMethod');
    Object.entries(byMethod).forEach(([method, payments]) => {
      const amount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const percentage = totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) : '0';
      console.log(`   ${this.getMethodIcon(method)} ${method}: ${payments.length} pagos ($${amount.toFixed(2)}) - ${percentage}%`);
    });
    
    console.log('\n📋 POR TIPO DE PAGO:');
    const byType = this.groupBy(this.allPayments, 'paymentType');
    Object.entries(byType).forEach(([type, payments]) => {
      const amount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      console.log(`   ${this.getTypeIcon(type)} ${type}: ${payments.length} pagos ($${amount.toFixed(2)})`);
    });
    
    // ✅ ANÁLISIS ESPECÍFICO DE TARJETAS
    console.log('\n💳 ANÁLISIS ESPECÍFICO DE TARJETAS:');
    const cardPayments = this.allPayments.filter(p => p.paymentMethod === 'card');
    const stripePayments = cardPayments.filter(p => p.cardTransactionId);
    
    if (cardPayments.length > 0) {
      const cardTotal = cardPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const stripeTotal = stripePayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      
      console.log(`   💳 Total con tarjeta: ${cardPayments.length} pagos ($${cardTotal.toFixed(2)})`);
      console.log(`   🌟 Procesados por Stripe: ${stripePayments.length} pagos ($${stripeTotal.toFixed(2)})`);
      console.log(`   📊 % Stripe de tarjetas: ${cardPayments.length > 0 ? ((stripePayments.length/cardPayments.length)*100).toFixed(1) : 0}%`);
      
      const cardByStatus = this.groupBy(cardPayments, 'status');
      console.log('   📊 Estados de pagos con tarjeta:');
      Object.entries(cardByStatus).forEach(([status, payments]) => {
        const statusAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        console.log(`      ${this.getStatusIcon(status)} ${status}: ${payments.length} ($${statusAmount.toFixed(2)})`);
      });
    } else {
      console.log('   ℹ️ No hay pagos con tarjeta registrados');
    }
    
    console.log('\n📅 CRONOLOGÍA (ÚLTIMOS 10):');
    const recent = this.allPayments
      .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
      .slice(0, 10);
      
    recent.forEach((payment, index) => {
      const clientName = payment.user 
        ? `${payment.user.firstName} ${payment.user.lastName}`
        : 'Cliente anónimo';
      const methodIcon = this.getMethodIcon(payment.paymentMethod);
      const statusIcon = this.getStatusIcon(payment.status);
      console.log(`   ${index + 1}. ${this.formatDate(payment.paymentDate)} - ${methodIcon} ${statusIcon} $${payment.amount} (${clientName})`);
    });
  }

  async showUserAnalysis() {
    console.log('\n12. 👥 ANÁLISIS DETALLADO POR USUARIOS');
    console.log('=' .repeat(50));
    
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
    
    console.log('👤 USUARIOS CON PAGOS:');
    Object.entries(userPayments).forEach(([userId, data]) => {
      const totalAmount = data.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const paymentCount = data.payments.length;
      const completedPayments = data.payments.filter(p => p.status === 'completed');
      const pendingPayments = data.payments.filter(p => p.status === 'pending');
      
      const userByMethod = this.groupBy(completedPayments, 'paymentMethod');
      
      console.log(`\n   👤 ${data.user.firstName} ${data.user.lastName}`);
      console.log(`      📧 Email: ${data.user.email}`);
      console.log(`      💰 Total pagado: $${totalAmount.toFixed(2)} en ${paymentCount} pagos`);
      console.log(`      ✅ Completados: ${completedPayments.length} | ⏳ Pendientes: ${pendingPayments.length}`);
      
      if (Object.keys(userByMethod).length > 0) {
        console.log(`      💳 Métodos usados:`);
        Object.entries(userByMethod).forEach(([method, payments]) => {
          const methodAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
          console.log(`         ${this.getMethodIcon(method)} ${method}: ${payments.length} pagos ($${methodAmount.toFixed(2)})`);
        });
      }
      
      console.log(`      📅 Último pago: ${this.formatDate(data.payments[0]?.paymentDate)}`);
      
      console.log(`      📋 Historial de pagos:`);
      data.payments
        .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
        .slice(0, 5)
        .forEach((payment, index) => {
          const statusIcon = this.getStatusIcon(payment.status);
          const methodIcon = this.getMethodIcon(payment.paymentMethod);
          console.log(`         ${index + 1}. ${statusIcon} ${methodIcon} $${payment.amount} - ${payment.paymentType} (${this.formatDate(payment.paymentDate)})`);
        });
      
      if (data.payments.length > 5) {
        console.log(`         ... y ${data.payments.length - 5} pagos más`);
      }
    });
    
    if (anonymousPayments.length > 0) {
      console.log('\n👻 PAGOS ANÓNIMOS:');
      console.log(`   📊 Total: ${anonymousPayments.length} pagos`);
      const anonymousTotal = anonymousPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      console.log(`   💰 Monto total: $${anonymousTotal.toFixed(2)}`);
      
      anonymousPayments.slice(0, 5).forEach((payment, index) => {
        const statusIcon = this.getStatusIcon(payment.status);
        const methodIcon = this.getMethodIcon(payment.paymentMethod);
        console.log(`      ${index + 1}. ${statusIcon} ${methodIcon} $${payment.amount} - ${payment.paymentType} (${this.formatDate(payment.paymentDate)})`);
      });
    }
    
    console.log('\n👔 PERSONAL QUE REGISTRÓ PAGOS:');
    const staffPayments = this.groupBy(
      this.allPayments.filter(p => p.registeredByUser), 
      p => `${p.registeredByUser.firstName} ${p.registeredByUser.lastName}`
    );
    
    Object.entries(staffPayments).forEach(([staffName, payments]) => {
      const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const role = payments[0].registeredByUser.role;
      const completed = payments.filter(p => p.status === 'completed').length;
      const pending = payments.filter(p => p.status === 'pending').length;
      
      const staffByMethod = this.groupBy(payments, 'paymentMethod');
      
      console.log(`   👤 ${staffName} (${role}):`);
      console.log(`      📊 ${payments.length} pagos ($${totalAmount.toFixed(2)})`);
      console.log(`      ✅ ${completed} completados | ⏳ ${pending} pendientes`);
      
      console.log(`      💳 Métodos registrados:`);
      Object.entries(staffByMethod).forEach(([method, methodPayments]) => {
        const methodAmount = methodPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        console.log(`         ${this.getMethodIcon(method)} ${method}: ${methodPayments.length} ($${methodAmount.toFixed(2)})`);
      });
    });
  }

  // ✅ MÉTODOS AUXILIARES
  formatPaymentMethod(method) {
    const methods = {
      cash: '💵 Efectivo',
      card: '💳 Tarjeta',
      transfer: '🏦 Transferencia',
      mobile: '📱 Pago móvil'
    };
    return methods[method] || method;
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
    return types[type] || type;
  }

  formatPaymentStatus(status) {
    const statuses = {
      completed: '✅ Completado',
      pending: '⏳ Pendiente',
      failed: '❌ Fallido',
      cancelled: '🚫 Cancelado',
      refunded: '💰 Reembolsado'
    };
    return statuses[status] || status;
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

  getTypeIcon(type) {
    const icons = {
      membership: '🏋️',
      daily: '📅',
      bulk_daily: '📅',
      store_cash_delivery: '🛍️',
      store_card_delivery: '🛍️',
      store_online: '🛍️',
      store_transfer: '🛍️'
    };
    return icons[type] || '📋';
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

// ✅ FUNCIÓN DE AYUDA
function showHelp() {
  console.log('\n💳 Elite Fitness Club - Analizador COMPLETO de Pagos v2.0\n');
  console.log('🎯 ANÁLISIS COMPLETO DE TODOS LOS MÉTODOS DE PAGO:');
  console.log('  📊 Estadísticas generales del sistema');
  console.log('  🎯 Dashboard de pagos pendientes en tiempo real');
  console.log('  💵 Pagos en efectivo pendientes de confirmación');
  console.log('  🏦 Transferencias pendientes de validación');
  console.log('  💳 Pagos con tarjeta (completados/pendientes/fallidos)');
  console.log('  🌟 Pagos procesados específicamente por Stripe');
  console.log('  💰 Información detallada de cada pago individual');
  console.log('  👤 Análisis por usuarios, clientes y personal');
  console.log('  📈 Reportes, tendencias y cronología completa\n');
  
  console.log('✨ CARACTERÍSTICAS v2.0:');
  console.log('  ✅ Análisis completo de pagos con tarjeta');
  console.log('  ✅ Integración completa con Stripe');
  console.log('  ✅ Comparativas detalladas entre métodos');
  console.log('  ✅ Análisis de tendencias y patrones');
  console.log('  ✅ Estados específicos por cada método');
  console.log('  ✅ Links directos a Stripe Dashboard');
  console.log('  ✅ Porcentajes y métricas avanzadas');
  console.log('  ✅ Detección automática de urgencias\n');
  
  console.log('💡 INFORMACIÓN MOSTRADA:');
  console.log('  🔍 Estados: Completado, Pendiente, Fallido, Cancelado, Reembolsado');
  console.log('  💳 Métodos: Efectivo, Tarjeta, Transferencia, Móvil');
  console.log('  📋 Tipos: Membresías, Pagos diarios, Tienda online');
  console.log('  🎯 Acciones: Confirmaciones, Validaciones, Revisiones\n');
  
  console.log('🚀 USO:');
  console.log('  node test-payments-admin.js        # Ejecutar análisis completo');
  console.log('  node test-payments-admin.js --help # Mostrar esta ayuda\n');
}

// ✅ FUNCIÓN PRINCIPAL
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const analyzer = new DetailedPaymentsAnalyzer();
  
  try {
    await analyzer.analyzeAllPayments();
    
  } catch (error) {
    console.error('\n🚨 ERROR EN EL ANÁLISIS:');
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

module.exports = { DetailedPaymentsAnalyzer };