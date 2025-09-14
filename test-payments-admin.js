// detailed-payments-analyzer.js - Ver TODA la información de cada pago
const axios = require('axios');

class DetailedPaymentsAnalyzer {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.adminToken = null;
    this.allPayments = [];
  }

  async analyzeAllPayments() {
    console.log('💳 ANALIZADOR DETALLADO DE PAGOS - INFORMACIÓN COMPLETA');
    console.log('='.repeat(70));
    console.log('🎯 Obteniendo TODOS los detalles de cada pago registrado\n');
    
    try {
      await this.loginAdmin();
      await this.getAllPayments();
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

  async getAllPayments() {
    console.log('\n2. 💰 Obteniendo TODOS los pagos con información completa...');
    
    try {
      // Obtener todos los pagos sin límite
      const response = await axios.get(`${this.baseURL}/api/payments`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: {
          limit: 100, // Aumentar límite para obtener todos
          page: 1
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
              params: { limit: 100, page }
            });
            
            if (pageResponse.data.success) {
              this.allPayments.push(...pageResponse.data.data.payments);
              console.log(`      Página ${page}: +${pageResponse.data.data.payments.length} pagos`);
            }
          }
        }
        
        console.log(`   🎯 TOTAL DE PAGOS OBTENIDOS: ${this.allPayments.length}`);
        
      } else {
        throw new Error('Respuesta sin éxito al obtener pagos');
      }
    } catch (error) {
      throw new Error(`Error obteniendo pagos: ${error.response?.data?.message || error.message}`);
    }
  }

  async showDetailedPayments() {
    console.log('\n3. 📋 INFORMACIÓN DETALLADA DE CADA PAGO');
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
        
        if (payment.transferValidated !== null) {
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
    console.log('\n4. 📊 RESUMEN GENERAL DE PAGOS');
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
      console.log(`   ${index + 1}. ${this.formatDate(payment.paymentDate)} - $${payment.amount} (${clientName})`);
    });
  }

  async showUserAnalysis() {
    console.log('\n5. 👥 ANÁLISIS POR USUARIOS');
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
      
      console.log(`\n   👤 ${data.user.firstName} ${data.user.lastName}`);
      console.log(`      📧 Email: ${data.user.email}`);
      console.log(`      💰 Total pagado: $${totalAmount.toFixed(2)} en ${paymentCount} pagos`);
      console.log(`      📅 Último pago: ${this.formatDate(data.payments[0].paymentDate)}`);
      
      // Mostrar cada pago del usuario
      console.log(`      📋 Historial de pagos:`);
      data.payments
        .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
        .forEach((payment, index) => {
          console.log(`         ${index + 1}. $${payment.amount} - ${payment.paymentType} (${this.formatDate(payment.paymentDate)})`);
        });
    });
    
    // Pagos anónimos
    if (anonymousPayments.length > 0) {
      console.log('\n👻 PAGOS ANÓNIMOS:');
      console.log(`   📊 Total: ${anonymousPayments.length} pagos`);
      const anonymousTotal = anonymousPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      console.log(`   💰 Monto total: $${anonymousTotal.toFixed(2)}`);
      
      anonymousPayments.forEach((payment, index) => {
        console.log(`      ${index + 1}. $${payment.amount} - ${payment.paymentType} (${this.formatDate(payment.paymentDate)})`);
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
      console.log(`   👤 ${staffName} (${role}): ${payments.length} pagos ($${totalAmount.toFixed(2)})`);
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
  console.log('\n💳 Elite Fitness Club - Analizador Detallado de Pagos\n');
  console.log('Este script muestra información COMPLETA de cada pago:');
  console.log('  💰 Monto, método, tipo y estado de cada pago');
  console.log('  👤 Información completa del cliente');
  console.log('  🏋️ Detalles de membresía asociada');
  console.log('  👔 Quién registró el pago y cuándo');
  console.log('  🔄 Estado de transferencias y validaciones');
  console.log('  📊 Resumen y análisis por usuario\n');
  
  console.log('Uso:');
  console.log('  node detailed-payments-analyzer.js        # Ejecutar análisis completo');
  console.log('  node detailed-payments-analyzer.js --help # Mostrar ayuda\n');
  
  console.log('📋 El script mostrará:');
  console.log('  1. Información detallada de cada pago individual');
  console.log('  2. Resumen general con estadísticas');
  console.log('  3. Análisis por usuarios y personal');
  console.log('  4. Cronología de pagos');
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
    
    if (error.message.includes('Servidor no responde')) {
      console.error('   1. Verifica que tu servidor esté ejecutándose: npm start');
    } else if (error.message.includes('Autenticación falló')) {
      console.error('   1. Verifica que el usuario admin existe: admin@gym.com');
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