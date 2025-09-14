// test-payments-admin.js - ACTUALIZADO con todas las nuevas rutas y funcionalidades CORREGIDO
const axios = require('axios');

class DetailedPaymentsAnalyzer {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.adminToken = null;
    this.allPayments = [];
    this.pendingDashboard = null;
    this.pendingCashPayments = [];
    this.pendingTransfers = [];
    this.paymentStatistics = null;
  }

  async analyzeAllPayments() {
    console.log('💳 ANALIZADOR DETALLADO DE PAGOS - INFORMACIÓN COMPLETA');
    console.log('='.repeat(70));
    console.log('🎯 Obteniendo TODOS los detalles de cada pago registrado\n');
    
    try {
      await this.loginAdmin();
      await this.getPaymentStatistics(); // ✅ NUEVO
      await this.getPendingDashboard(); // ✅ NUEVO
      await this.getPendingCashPayments(); // ✅ NUEVO
      await this.getPendingTransfers(); // ✅ NUEVO
      await this.getAllPayments();
      await this.showPendingPaymentsAnalysis(); // ✅ NUEVO
      await this.showDetailedPayments();
      await this.showPaymentsSummary();
      await this.showUserAnalysis();
      
      console.log('\n🎉 ¡ANÁLISIS COMPLETO FINALIZADO!');
      
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      if (error.response) {
        console.error('📋 Detalles:', error.response.data);
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

  // ✅ NUEVO: Obtener estadísticas de pagos
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
          console.log('   💳 Métodos de pago:');
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

  // ✅ NUEVO: Obtener dashboard de pagos pendientes
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

        // Items urgentes
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

  // ✅ NUEVO: Obtener pagos en efectivo pendientes
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
          
          // Mostrar algunos detalles
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

  // ✅ NUEVO: Obtener transferencias pendientes
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
          
          // Mostrar algunos detalles
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

  async getAllPayments() {
    console.log('\n6. 💰 Obteniendo TODOS los pagos con información completa...');
    
    try {
      // Obtener todos los pagos (incluyendo todos los estados)
      const response = await axios.get(`${this.baseURL}/api/payments`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: {
          limit: 100,
          page: 1,
          includeAll: 'true' // ✅ NUEVO: Para incluir todos los estados
        }
      });

      if (response.data.success) {
        this.allPayments = response.data.data.payments;
        const { pagination } = response.data.data;
        
        console.log(`   ✅ Pagos obtenidos: ${this.allPayments.length} de ${pagination.total} total`);
        console.log(`   📊 Páginas disponibles: ${pagination.pages}`);
        
        // Si hay más páginas, obtener todas
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

  // ✅ NUEVO: Análisis específico de pagos pendientes
  async showPendingPaymentsAnalysis() {
    console.log('\n7. 🎯 ANÁLISIS DETALLADO DE PAGOS PENDIENTES');
    console.log('=' .repeat(70));
    
    // Dashboard general
    if (this.pendingDashboard) {
      console.log('📊 DASHBOARD DE PAGOS PENDIENTES:');
      console.log(`   🎯 Total de acciones pendientes: ${this.pendingDashboard.summary.totalPendingActions}`);
      
      // Actividad de hoy
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
      
      // Actividad reciente
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
    
    console.log('\n💵 ANÁLISIS DE PAGOS EN EFECTIVO PENDIENTES:');
    if (this.pendingCashPayments.length === 0) {
      console.log('   ✅ No hay pagos en efectivo pendientes');
    } else {
      // Agrupar por prioridad
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
          
          if (payment.membership) {
            console.log(`         🏋️ Membresía: ${payment.membership.type}`);
          }
        });
        
        if (payments.length > 3) {
          console.log(`      ... y ${payments.length - 3} más`);
        }
      });
    }
    
    console.log('\n🏦 ANÁLISIS DE TRANSFERENCIAS PENDIENTES:');
    
    // ✅ FIX: Definir variables siempre, independientemente del número de transferencias
    const withProof = this.pendingTransfers.filter(t => t.transferProof);
    const withoutProof = this.pendingTransfers.filter(t => !t.transferProof);
    
    if (this.pendingTransfers.length === 0) {
      console.log('   ✅ No hay transferencias pendientes');
    } else {
      console.log(`   📄 Con comprobante: ${withProof.length} transferencias`);
      console.log(`   ❌ Sin comprobante: ${withoutProof.length} transferencias`);
      
      // Mostrar transferencias con comprobante (listas para validar)
      if (withProof.length > 0) {
        console.log('\n   🎯 LISTAS PARA VALIDAR (con comprobante):');
        withProof.slice(0, 5).forEach((transfer, index) => {
          const clientName = transfer.user ? 
            `${transfer.user.firstName} ${transfer.user.lastName}` : 
            'Cliente anónimo';
          
          console.log(`      ${index + 1}. ${clientName} - $${transfer.amount}`);
          console.log(`         📅 ${this.formatDate(transfer.paymentDate)}`);
          console.log(`         👤 Registrado por: ${transfer.registeredByUser?.firstName || 'Sistema'} ${transfer.registeredByUser?.lastName || ''}`);
          
          if (transfer.membership) {
            console.log(`         🏋️ Membresía: ${transfer.membership.type}`);
          }
        });
      }
      
      // Mostrar transferencias sin comprobante
      if (withoutProof.length > 0) {
        console.log('\n   ⏳ ESPERANDO COMPROBANTE:');
        withoutProof.slice(0, 3).forEach((transfer, index) => {
          const clientName = transfer.user ? 
            `${transfer.user.firstName} ${transfer.user.lastName}` : 
            'Cliente anónimo';
          
          console.log(`      ${index + 1}. ${clientName} - $${transfer.amount}`);
          console.log(`         📅 ${this.formatDate(transfer.paymentDate)}`);
        });
      }
    }
    
    // Resumen de acciones necesarias
    console.log('\n🎯 ACCIONES REQUERIDAS:');
    const totalActions = this.pendingCashPayments.length + withProof.length;
    
    if (totalActions === 0) {
      console.log('   ✅ No hay acciones pendientes en este momento');
    } else {
      console.log(`   💵 Confirmar ${this.pendingCashPayments.length} pagos en efectivo en el gimnasio`);
      console.log(`   🏦 Validar ${withProof.length} transferencias con comprobante`);
      console.log(`   ⏳ Esperar comprobantes de ${withoutProof.length} transferencias`);
      console.log(`   🎯 Total de acciones: ${totalActions}`);
    }
  }

  async showDetailedPayments() {
    console.log('\n8. 📋 INFORMACIÓN DETALLADA DE CADA PAGO');
    console.log('=' .repeat(70));
    
    if (this.allPayments.length === 0) {
      console.log('   ⚠️ No hay pagos registrados en el sistema');
      return;
    }
    
    // Ordenar pagos por fecha (más recientes primero)
    const sortedPayments = this.allPayments.sort((a, b) => 
      new Date(b.paymentDate) - new Date(a.paymentDate)
    );
    
    sortedPayments.forEach((payment, index) => {
      console.log(`\n📄 PAGO #${index + 1}`);
      console.log('-'.repeat(50));
      
      // Información básica del pago
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
      
      // Información del cliente
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
      
      // Información de membresía (si aplica)
      if (payment.membership) {
        console.log('\n🏋️ INFORMACIÓN DE MEMBRESÍA:');
        console.log(`   🎯 Tipo: ${payment.membership.type}`);
        console.log(`   📅 Fecha de inicio: ${this.formatDate(payment.membership.startDate)}`);
        console.log(`   📅 Fecha de vencimiento: ${this.formatDate(payment.membership.endDate)}`);
        console.log(`   🆔 ID de membresía: ${payment.membership.id}`);
      }
      
      // Información de quien registró
      console.log('\n👔 REGISTRADO POR:');
      if (payment.registeredByUser) {
        console.log(`   👤 Personal: ${payment.registeredByUser.firstName} ${payment.registeredByUser.lastName}`);
        console.log(`   🎭 Rol: ${payment.registeredByUser.role}`);
        console.log(`   🆔 ID: ${payment.registeredByUser.id}`);
      } else {
        console.log(`   ⚠️ Sin información de quien registró`);
      }
      
      // Información de transferencia (si aplica)
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
      }
      
      // Información adicional
      console.log('\n📊 INFORMACIÓN ADICIONAL:');
      console.log(`   📅 Creado: ${this.formatDate(payment.createdAt)}`);
      console.log(`   📅 Actualizado: ${this.formatDate(payment.updatedAt)}`);
      
      if (payment.dailyPaymentCount && payment.dailyPaymentCount > 1) {
        console.log(`   🔢 Pagos diarios incluidos: ${payment.dailyPaymentCount}`);
      }
      
      if (payment.referenceId) {
        console.log(`   🔗 Referencia: ${payment.referenceType} - ${payment.referenceId}`);
      }
      
      // Separador
      console.log('\n' + '='.repeat(50));
    });
  }

  async showPaymentsSummary() {
    console.log('\n9. 📊 RESUMEN GENERAL DE PAGOS');
    console.log('=' .repeat(50));
    
    if (this.allPayments.length === 0) {
      console.log('   ⚠️ No hay datos para resumir');
      return;
    }
    
    // Estadísticas generales
    const totalAmount = this.allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalPayments = this.allPayments.length;
    const averagePayment = totalAmount / totalPayments;
    
    console.log('💰 ESTADÍSTICAS GENERALES:');
    console.log(`   💵 Total recaudado: $${totalAmount.toFixed(2)}`);
    console.log(`   📊 Total de pagos: ${totalPayments}`);
    console.log(`   📈 Promedio por pago: $${averagePayment.toFixed(2)}`);
    
    // Por estado
    console.log('\n✅ POR ESTADO:');
    const byStatus = this.groupBy(this.allPayments, 'status');
    Object.entries(byStatus).forEach(([status, payments]) => {
      const amount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      console.log(`   ${this.getStatusIcon(status)} ${status}: ${payments.length} pagos ($${amount.toFixed(2)})`);
    });
    
    // Por método de pago
    console.log('\n💳 POR MÉTODO DE PAGO:');
    const byMethod = this.groupBy(this.allPayments, 'paymentMethod');
    Object.entries(byMethod).forEach(([method, payments]) => {
      const amount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      console.log(`   ${this.getMethodIcon(method)} ${method}: ${payments.length} pagos ($${amount.toFixed(2)})`);
    });
    
    // Por tipo de pago
    console.log('\n📋 POR TIPO DE PAGO:');
    const byType = this.groupBy(this.allPayments, 'paymentType');
    Object.entries(byType).forEach(([type, payments]) => {
      const amount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      console.log(`   ${this.getTypeIcon(type)} ${type}: ${payments.length} pagos ($${amount.toFixed(2)})`);
    });
    
    // Pagos más recientes
    console.log('\n📅 CRONOLOGÍA (ÚLTIMOS 5):');
    const recent = this.allPayments
      .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
      .slice(0, 5);
      
    recent.forEach((payment, index) => {
      const clientName = payment.user 
        ? `${payment.user.firstName} ${payment.user.lastName}`
        : 'Cliente anónimo';
      console.log(`   ${index + 1}. ${this.formatDate(payment.paymentDate)} - $${payment.amount} (${clientName}) - ${payment.status}`);
    });
  }

  async showUserAnalysis() {
    console.log('\n10. 👥 ANÁLISIS POR USUARIOS');
    console.log('=' .repeat(50));
    
    // Agrupar por usuario
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
      
      console.log(`\n   👤 ${data.user.firstName} ${data.user.lastName}`);
      console.log(`      📧 Email: ${data.user.email}`);
      console.log(`      💰 Total pagado: $${totalAmount.toFixed(2)} en ${paymentCount} pagos`);
      console.log(`      ✅ Completados: ${completedPayments.length} | ⏳ Pendientes: ${pendingPayments.length}`);
      console.log(`      📅 Último pago: ${this.formatDate(data.payments[0].paymentDate)}`);
      
      // Mostrar cada pago del usuario
      console.log(`      📋 Historial de pagos:`);
      data.payments
        .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
        .forEach((payment, index) => {
          const statusIcon = this.getStatusIcon(payment.status);
          console.log(`         ${index + 1}. ${statusIcon} $${payment.amount} - ${payment.paymentType} (${this.formatDate(payment.paymentDate)})`);
        });
    });
    
    // Pagos anónimos
    if (anonymousPayments.length > 0) {
      console.log('\n👻 PAGOS ANÓNIMOS:');
      console.log(`   📊 Total: ${anonymousPayments.length} pagos`);
      const anonymousTotal = anonymousPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      console.log(`   💰 Monto total: $${anonymousTotal.toFixed(2)}`);
      
      anonymousPayments.forEach((payment, index) => {
        const statusIcon = this.getStatusIcon(payment.status);
        console.log(`      ${index + 1}. ${statusIcon} $${payment.amount} - ${payment.paymentType} (${this.formatDate(payment.paymentDate)})`);
      });
    }
    
    // Personal que registró los pagos
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
      
      console.log(`   👤 ${staffName} (${role}):`);
      console.log(`      📊 ${payments.length} pagos ($${totalAmount.toFixed(2)})`);
      console.log(`      ✅ ${completed} completados | ⏳ ${pending} pendientes`);
    });
  }

  // Métodos auxiliares para formatear datos
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
      cancelled: '🚫 Cancelado'
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
      cancelled: '🚫'
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

// Función para mostrar ayuda
function showHelp() {
  console.log('\n💳 Elite Fitness Club - Analizador Detallado de Pagos ACTUALIZADO\n');
  console.log('Este script muestra información COMPLETA del sistema de pagos:');
  console.log('  📊 Estadísticas generales del sistema');
  console.log('  🎯 Dashboard de pagos pendientes en tiempo real');
  console.log('  💵 Pagos en efectivo pendientes de confirmación');
  console.log('  🏦 Transferencias pendientes de validación');
  console.log('  💰 Información completa de cada pago');
  console.log('  👤 Análisis por usuarios y personal');
  console.log('  📈 Reportes y cronología\n');
  
  console.log('Nuevas funcionalidades incluidas:');
  console.log('  ✅ Dashboard unificado de pagos pendientes');
  console.log('  ✅ Separación clara de efectivo vs transferencias');
  console.log('  ✅ Priorización por tiempo de espera');
  console.log('  ✅ Actividad reciente del personal');
  console.log('  ✅ Estadísticas en tiempo real\n');
  
  console.log('Uso:');
  console.log('  node test-payments-admin.js        # Ejecutar análisis completo');
  console.log('  node test-payments-admin.js --help # Mostrar ayuda\n');
}

// Ejecutar script
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
    console.error('\n💡 POSIBLES SOLUCIONES:');
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('Network Error')) {
      console.error('   1. Verifica que tu servidor esté ejecutándose: npm start');
      console.error('   2. Verifica que el puerto sea el correcto (5000)');
    } else if (error.message.includes('Autenticación falló')) {
      console.error('   1. Verifica que el usuario admin existe: admin@gym.com');
      console.error('   2. Verifica la contraseña: Admin123!');
    } else {
      console.error(`   1. Error: ${error.message}`);
    }
    
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { DetailedPaymentsAnalyzer };