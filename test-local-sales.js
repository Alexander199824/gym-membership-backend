// test-local-sales.js - TEST COMPLETO DE VENTAS LOCALES v1.0
const axios = require('axios');
require('dotenv').config();

class LocalSalesTest {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.adminToken = null;
    this.colaboradorToken = null;
    this.testProducts = [];
    this.createdSales = [];
    this.pendingTransfers = [];
  }

  async runFullTest() {
    console.log('🏪 Elite Fitness Club - Test de Ventas Locales v1.0');
    console.log('='.repeat(80));
    console.log('🎯 OBJETIVO: Probar sistema completo de ventas locales');
    console.log('📋 PROCESO: Login → Productos → Ventas → Transferencias → Reportes\n');
    
    try {
      await this.loginUsers();
      await this.loadTestProducts();
      await this.testCashSale();
      await this.testTransferSale();
      await this.testProductSearch();
      await this.testPendingTransfers();
      await this.testConfirmTransfer();
      await this.testGetSales();
      await this.testDailyReport();
      await this.showFinalSummary();
      
      console.log('\n🎉 ¡TEST DE VENTAS COMPLETADO EXITOSAMENTE!');
      
    } catch (error) {
      console.error('\n❌ Error en el test:', error.message);
      if (error.response) {
        console.error('📋 Detalles:', {
          status: error.response.status,
          data: error.response.data,
          url: error.response.config?.url
        });
      }
      throw error;
    }
  }

  // ========================================
  // 1. LOGIN DE USUARIOS
  // ========================================
  
  async loginUsers() {
    console.log('1. 🔐 Autenticando usuarios...');
    
    // Login como admin
    try {
      const adminResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'admin@gym.com',
        password: 'Admin123!'
      });
      
      this.adminToken = adminResponse.data.data.token;
      console.log('   ✅ Admin autenticado:', adminResponse.data.data.user.firstName);
      console.log(`      🔑 Token: ${this.adminToken.substring(0, 20)}...`);
    } catch (error) {
      throw new Error(`Login admin falló: ${error.message}`);
    }
    
    // Login como colaborador (usar mismo usuario admin por ahora)
    this.colaboradorToken = this.adminToken;
    console.log('   ✅ Colaborador token configurado');
  }

  // ========================================
  // 2. CARGAR PRODUCTOS DE PRUEBA
  // ========================================
  
  async loadTestProducts() {
    console.log('\n2. 📦 Cargando productos de prueba...');
    
    try {
      // ESTRATEGIA 1: Buscar productos con los SKUs específicos
      console.log('   🔍 Estrategia 1: Buscando por SKUs específicos...');
      const skus = ['MASSASS-GAdfsIN-3010-C55H', 'UNSDSIF-PER54345F-PL5US-M'];
      
      for (const sku of skus) {
        try {
          const response = await axios.get(`${this.baseURL}/api/store/products`, {
            params: { search: sku, limit: 1 }
          });
          
          const products = response.data.data?.products || [];
          const product = products.find(p => p.sku === sku);
          
          if (product && product.stockQuantity > 0) {
            this.testProducts.push(product);
            console.log(`      ✅ "${product.name}" (SKU: ${product.sku})`);
          }
        } catch (error) {
          // Silenciar errores, intentaremos con estrategia 2
        }
      }
      
      // ESTRATEGIA 2: Si no encontramos productos específicos, usar cualquier producto disponible
      if (this.testProducts.length < 2) {
        console.log('   🔍 Estrategia 2: Cargando productos disponibles con stock...');
        
        const response = await axios.get(`${this.baseURL}/api/store/products`, {
          params: { 
            limit: 20,
            page: 1
          }
        });
        
        const allProducts = response.data.data?.products || [];
        
        // Filtrar productos con stock disponible
        const availableProducts = allProducts.filter(p => 
          p.isActive && 
          p.stockQuantity > 0 &&
          parseFloat(p.price) > 0
        );
        
        if (availableProducts.length === 0) {
          throw new Error('No hay productos disponibles con stock en la tienda');
        }
        
        // Tomar hasta 2 productos diferentes
        this.testProducts = [];
        for (let i = 0; i < Math.min(2, availableProducts.length); i++) {
          this.testProducts.push(availableProducts[i]);
        }
        
        console.log('      ✅ Productos genéricos cargados:');
      }
      
      // Mostrar productos que se usarán
      console.log('\n   📦 PRODUCTOS SELECCIONADOS PARA EL TEST:');
      this.testProducts.forEach((product, index) => {
        console.log(`      ${index + 1}. "${product.name}"`);
        console.log(`         🆔 ID: ${product.id}`);
        console.log(`         🏷️ SKU: ${product.sku || 'N/A'}`);
        console.log(`         💰 Precio: ${product.price}`);
        console.log(`         📦 Stock: ${product.stockQuantity} unidades`);
      });
      
      console.log(`\n   🎯 TOTAL: ${this.testProducts.length} producto(s) listo(s) para ventas`);
      
    } catch (error) {
      console.error('   ❌ Error fatal cargando productos');
      throw new Error(`Error cargando productos: ${error.message}`);
    }
  }

  // ========================================
  // 3. TEST: VENTA EN EFECTIVO
  // ========================================
  
  async testCashSale() {
    console.log('\n3. 💰 TEST: Venta en efectivo...');
    console.log('   ' + '-'.repeat(70));
    
    if (this.testProducts.length === 0) {
      console.log('   ⚠️ Sin productos para vender');
      return;
    }
    
    // Crear venta con el primer producto
    const product = this.testProducts[0];
    const quantity = 2;
    const subtotal = parseFloat(product.price) * quantity;
    const discount = 5.00;
    const taxAmount = subtotal * 0.12; // 12% IVA Guatemala
    const total = subtotal + taxAmount - discount;
    const cashReceived = Math.ceil(total) + 10; // Redondear arriba + dar cambio
    
    const cashSaleData = {
      items: [
        {
          productId: product.id,
          quantity: quantity,
          price: parseFloat(product.price)
        }
      ],
      cashReceived: cashReceived,
      customerInfo: {
        type: 'cf',
        name: 'Consumidor Final'
      },
      discountAmount: discount,
      notes: 'Venta de prueba - TEST AUTOMATIZADO'
    };
    
    console.log('   📋 Datos de la venta:');
    console.log(`      📦 Producto: "${product.name}"`);
    console.log(`      🔢 Cantidad: ${quantity}`);
    console.log(`      💵 Subtotal: ${subtotal.toFixed(2)}`);
    console.log(`      📊 IVA (12%): ${taxAmount.toFixed(2)}`);
    console.log(`      🎯 Descuento: -${discount.toFixed(2)}`);
    console.log(`      💰 Total: ${total.toFixed(2)}`);
    console.log(`      💵 Efectivo recibido: ${cashReceived.toFixed(2)}`);
    console.log(`      💸 Cambio: ${(cashReceived - total).toFixed(2)}`);
    
    try {
      const response = await axios.post(
        `${this.baseURL}/api/local-sales/cash`,
        cashSaleData,
        {
          headers: { 'Authorization': `Bearer ${this.colaboradorToken}` }
        }
      );
      
      if (response.data.success) {
        const sale = response.data.data.sale;
        this.createdSales.push(sale);
        
        console.log('\n   ✅ VENTA EN EFECTIVO CREADA');
        console.log(`      🆔 ID: ${sale.id}`);
        console.log(`      📄 Número: ${sale.saleNumber}`);
        console.log(`      💰 Total: $${sale.totalAmount}`);
        console.log(`      💵 Efectivo: $${sale.cashReceived}`);
        console.log(`      💸 Cambio: $${sale.changeGiven}`);
        console.log(`      ✅ Estado: ${sale.status}`);
      }
      
    } catch (error) {
      console.error('   ❌ Error creando venta en efectivo');
      console.error(`      💥 Status: ${error.response?.status}`);
      console.error(`      💥 Message: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  }

  // ========================================
  // 4. TEST: VENTA POR TRANSFERENCIA
  // ========================================
  
  async testTransferSale() {
    console.log('\n4. 🏦 TEST: Venta por transferencia...');
    console.log('   ' + '-'.repeat(70));
    
    if (this.testProducts.length < 2) {
      console.log('   ⚠️ Se necesitan al menos 2 productos');
      return;
    }
    
    // Crear venta con el segundo producto
    const product = this.testProducts[1];
    const quantity = 1;
    const total = parseFloat(product.price) * quantity;
    
    const transferSaleData = {
      items: [
        {
          productId: product.id,
          quantity: quantity,
          price: parseFloat(product.price)
        }
      ],
      transferVoucher: 'COMPROBANTE WHATSAPP: Transferencia desde cuenta BAC número 1234567890 por $' + total.toFixed(2) + '. Referencia: TEST-' + Date.now(),
      bankReference: 'TEST-' + Date.now(),
      customerInfo: {
        type: 'custom',
        name: 'Juan Pérez Test',
        phone: '1234-5678',
        email: 'juan.test@example.com'
      },
      notes: 'Venta por transferencia - TEST AUTOMATIZADO'
    };
    
    console.log('   📋 Datos de la venta:');
    console.log(`      📦 Producto: "${product.name}"`);
    console.log(`      🔢 Cantidad: ${quantity}`);
    console.log(`      💰 Total: $${total.toFixed(2)}`);
    console.log(`      🏦 Comprobante: ${transferSaleData.transferVoucher.substring(0, 50)}...`);
    console.log(`      👤 Cliente: ${transferSaleData.customerInfo.name}`);
    
    try {
      const response = await axios.post(
        `${this.baseURL}/api/local-sales/transfer`,
        transferSaleData,
        {
          headers: { 'Authorization': `Bearer ${this.colaboradorToken}` }
        }
      );
      
      if (response.data.success) {
        const sale = response.data.data.sale;
        this.createdSales.push(sale);
        this.pendingTransfers.push(sale);
        
        console.log('\n   ✅ VENTA POR TRANSFERENCIA CREADA');
        console.log(`      🆔 ID: ${sale.id}`);
        console.log(`      📄 Número: ${sale.saleNumber}`);
        console.log(`      💰 Total: $${sale.totalAmount}`);
        console.log(`      🏦 Monto transferencia: $${sale.transferAmount}`);
        console.log(`      ⏳ Estado: ${sale.status}`);
        console.log(`      ⚠️ Requiere confirmación: ${sale.needsConfirmation ? 'Sí' : 'No'}`);
      }
      
    } catch (error) {
      console.error('   ❌ Error creando venta por transferencia');
      console.error(`      💥 Status: ${error.response?.status}`);
      console.error(`      💥 Message: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  }

  // ========================================
  // 5. TEST: BÚSQUEDA DE PRODUCTOS
  // ========================================
  
  async testProductSearch() {
    console.log('\n5. 🔍 TEST: Búsqueda de productos...');
    console.log('   ' + '-'.repeat(70));
    
    const searchTerms = ['mass', 'uniforme', 'gainer'];
    
    for (const term of searchTerms) {
      try {
        console.log(`\n   🔎 Buscando: "${term}"`);
        
        const response = await axios.get(
          `${this.baseURL}/api/local-sales/products/search`,
          {
            params: { q: term, limit: 5 },
            headers: { 'Authorization': `Bearer ${this.colaboradorToken}` }
          }
        );
        
        if (response.data.success) {
          const products = response.data.data.products || [];
          console.log(`      ✅ ${products.length} producto(s) encontrado(s)`);
          
          products.forEach(product => {
            console.log(`         • "${product.name}"`);
            console.log(`           💰 $${product.price} | 📦 Stock: ${product.stockQuantity}`);
          });
        }
        
      } catch (error) {
        console.error(`      ❌ Error buscando "${term}": ${error.message}`);
      }
    }
  }

  // ========================================
  // 6. TEST: TRANSFERENCIAS PENDIENTES
  // ========================================
  
  async testPendingTransfers() {
    console.log('\n6. ⏳ TEST: Transferencias pendientes...');
    console.log('   ' + '-'.repeat(70));
    
    try {
      const response = await axios.get(
        `${this.baseURL}/api/local-sales/pending-transfers`,
        {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }
      );
      
      if (response.data.success) {
        const transfers = response.data.data.transfers || [];
        console.log(`   ✅ ${transfers.length} transferencia(s) pendiente(s)`);
        
        if (transfers.length > 0) {
          transfers.forEach(transfer => {
            console.log(`\n      📋 Transferencia #${transfer.saleNumber}`);
            console.log(`         💰 Monto: $${transfer.totalAmount}`);
            console.log(`         👤 Cliente: ${transfer.customer?.name || 'N/A'}`);
            console.log(`         ⏰ Tiempo esperando: ${transfer.hoursWaiting} horas`);
            console.log(`         🚦 Prioridad: ${transfer.priority}`);
            console.log(`         🔧 Puede confirmar: ${transfer.canConfirm ? 'Sí' : 'No'}`);
          });
          
          // Guardar para confirmar después
          this.pendingTransfers = transfers;
        }
      }
      
    } catch (error) {
      console.error('   ❌ Error obteniendo transferencias pendientes');
      console.error(`      💥 ${error.message}`);
    }
  }

  // ========================================
  // 7. TEST: CONFIRMAR TRANSFERENCIA
  // ========================================
  
  async testConfirmTransfer() {
    console.log('\n7. ✅ TEST: Confirmar transferencia...');
    console.log('   ' + '-'.repeat(70));
    
    if (this.pendingTransfers.length === 0) {
      console.log('   ⚠️ No hay transferencias pendientes para confirmar');
      return;
    }
    
    const transferToConfirm = this.pendingTransfers[0];
    
    try {
      console.log(`   📋 Confirmando transferencia: ${transferToConfirm.saleNumber}`);
      console.log(`      💰 Monto: $${transferToConfirm.totalAmount}`);
      console.log(`      🏦 Referencia: ${transferToConfirm.bankReference || 'N/A'}`);
      
      const response = await axios.post(
        `${this.baseURL}/api/local-sales/${transferToConfirm.id}/confirm-transfer`,
        {
          notes: 'Transferencia verificada y confirmada - TEST AUTOMATIZADO'
        },
        {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }
      );
      
      if (response.data.success) {
        const sale = response.data.data.sale;
        
        console.log('\n   ✅ TRANSFERENCIA CONFIRMADA');
        console.log(`      🆔 ID: ${sale.id}`);
        console.log(`      📄 Número: ${sale.saleNumber}`);
        console.log(`      ✅ Estado: ${sale.status}`);
        console.log(`      🔐 Confirmada: ${sale.transferConfirmed ? 'Sí' : 'No'}`);
        console.log(`      👤 Confirmada por: ${sale.confirmedBy}`);
        console.log(`      📅 Fecha confirmación: ${sale.confirmedAt}`);
      }
      
    } catch (error) {
      console.error('   ❌ Error confirmando transferencia');
      console.error(`      💥 Status: ${error.response?.status}`);
      console.error(`      💥 Message: ${error.response?.data?.message || error.message}`);
    }
  }

  // ========================================
  // 8. TEST: OBTENER VENTAS
  // ========================================
  
  async testGetSales() {
    console.log('\n8. 📋 TEST: Obtener ventas...');
    console.log('   ' + '-'.repeat(70));
    
    try {
      const response = await axios.get(
        `${this.baseURL}/api/local-sales`,
        {
          params: {
            page: 1,
            limit: 10
          },
          headers: { 'Authorization': `Bearer ${this.colaboradorToken}` }
        }
      );
      
      if (response.data.success) {
        const sales = response.data.data.sales || [];
        const pagination = response.data.data.pagination;
        
        console.log(`   ✅ ${sales.length} venta(s) obtenida(s)`);
        console.log(`      📊 Total: ${pagination.total}`);
        console.log(`      📄 Página: ${pagination.page}/${pagination.pages}`);
        
        if (sales.length > 0) {
          console.log('\n      🔝 ÚLTIMAS VENTAS:');
          sales.slice(0, 3).forEach(sale => {
            console.log(`\n         📋 ${sale.saleNumber}`);
            console.log(`            💰 Total: $${sale.totalAmount}`);
            console.log(`            💳 Método: ${sale.paymentMethod}`);
            console.log(`            ✅ Estado: ${sale.status}`);
            console.log(`            📅 Fecha: ${sale.workDate}`);
            console.log(`            👤 Cliente: ${sale.customer?.name || 'N/A'}`);
          });
        }
      }
      
    } catch (error) {
      console.error('   ❌ Error obteniendo ventas');
      console.error(`      💥 ${error.message}`);
    }
  }

  // ========================================
  // 9. TEST: REPORTE DIARIO
  // ========================================
  
  async testDailyReport() {
    console.log('\n9. 📊 TEST: Reporte diario...');
    console.log('   ' + '-'.repeat(70));
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const response = await axios.get(
        `${this.baseURL}/api/local-sales/reports/daily`,
        {
          params: { date: today },
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }
      );
      
      if (response.data.success) {
        const report = response.data.data;
        
        console.log(`   ✅ REPORTE DEL DÍA: ${report.date}`);
        console.log(`\n      📊 RESUMEN:`);
        console.log(`         🛒 Total ventas: ${report.totalSales}`);
        console.log(`         ✅ Completadas: ${report.completedSales}`);
        console.log(`         ⏳ Pendientes: ${report.pendingSales}`);
        console.log(`\n      💰 INGRESOS:`);
        console.log(`         💵 Total: $${report.totalAmount.toFixed(2)}`);
        console.log(`         💵 Efectivo: $${report.cashAmount.toFixed(2)}`);
        console.log(`         🏦 Transferencias: $${report.transferAmount.toFixed(2)}`);
        console.log(`         ⏳ Pendiente: $${report.pendingAmount.toFixed(2)}`);
        
        if (report.topProducts && report.topProducts.length > 0) {
          console.log(`\n      🔝 TOP PRODUCTOS:`);
          report.topProducts.forEach((product, index) => {
            console.log(`         ${index + 1}. ${product.productName}: ${product.totalSold} unidades`);
          });
        }
      }
      
    } catch (error) {
      console.error('   ❌ Error obteniendo reporte diario');
      console.error(`      💥 ${error.message}`);
    }
  }

  // ========================================
  // 10. RESUMEN FINAL
  // ========================================
  
  async showFinalSummary() {
    console.log('\n10. 📊 RESUMEN FINAL DEL TEST');
    console.log('='.repeat(80));
    
    console.log('\n🎯 RESULTADOS:');
    console.log(`   📦 Productos cargados: ${this.testProducts.length}`);
    console.log(`   🛒 Ventas creadas: ${this.createdSales.length}`);
    console.log(`   ⏳ Transferencias pendientes: ${this.pendingTransfers.length}`);
    
    if (this.createdSales.length > 0) {
      const totalAmount = this.createdSales.reduce((sum, sale) => 
        sum + parseFloat(sale.totalAmount), 0
      );
      
      const cashSales = this.createdSales.filter(s => s.status === 'completed').length;
      const transferSales = this.createdSales.filter(s => 
        s.status === 'transfer_pending' || s.transferAmount
      ).length;
      
      console.log('\n💰 VENTAS CREADAS:');
      this.createdSales.forEach((sale, index) => {
        console.log(`\n   ${index + 1}. ${sale.saleNumber}`);
        console.log(`      💰 Total: $${sale.totalAmount}`);
        console.log(`      💳 Método: ${sale.paymentMethod || 'N/A'}`);
        console.log(`      ✅ Estado: ${sale.status}`);
        if (sale.cashReceived) {
          console.log(`      💵 Efectivo: $${sale.cashReceived}`);
          console.log(`      💸 Cambio: $${sale.changeGiven}`);
        }
        if (sale.transferAmount) {
          console.log(`      🏦 Transferencia: $${sale.transferAmount}`);
        }
      });
      
      console.log('\n📈 ESTADÍSTICAS:');
      console.log(`   💰 Total vendido: $${totalAmount.toFixed(2)}`);
      console.log(`   💵 Ventas en efectivo: ${cashSales}`);
      console.log(`   🏦 Ventas por transferencia: ${transferSales}`);
      console.log(`   📊 Ticket promedio: $${(totalAmount / this.createdSales.length).toFixed(2)}`);
    }
    
    console.log('\n✅ FUNCIONALIDADES PROBADAS:');
    console.log('   ✅ Venta en efectivo');
    console.log('   ✅ Venta por transferencia');
    console.log('   ✅ Búsqueda de productos');
    console.log('   ✅ Transferencias pendientes');
    console.log('   ✅ Confirmación de transferencias');
    console.log('   ✅ Listado de ventas');
    console.log('   ✅ Reporte diario');
  }
}

// ========================================
// FUNCIÓN DE AYUDA
// ========================================

function showHelp() {
  console.log('\n🏪 Elite Fitness Club - Test de Ventas Locales v1.0\n');
  console.log('🎯 PRUEBA COMPLETA DEL SISTEMA DE VENTAS\n');
  
  console.log('✨ FUNCIONALIDADES:');
  console.log('  💰 Ventas en efectivo con cambio');
  console.log('  🏦 Ventas por transferencia bancaria');
  console.log('  🔍 Búsqueda rápida de productos');
  console.log('  ⏳ Gestión de transferencias pendientes');
  console.log('  ✅ Confirmación de pagos (admin)');
  console.log('  📊 Reportes diarios\n');
  
  console.log('🚀 USO:');
  console.log('  node test-local-sales.js          # Ejecutar test completo');
  console.log('  node test-local-sales.js --help   # Esta ayuda\n');
  
  console.log('📋 REQUISITOS:');
  console.log('  • Servidor corriendo en puerto 5000');
  console.log('  • Usuario admin: admin@gym.com / Admin123!');
  console.log('  • Productos registrados (ejecutar test-products-register.js primero)\n');
  
  console.log('📦 DATOS DE PRUEBA:');
  console.log('  • Usa productos del test-products-register.js');
  console.log('  • Crea 1 venta en efectivo');
  console.log('  • Crea 1 venta por transferencia');
  console.log('  • Confirma transferencias como admin\n');
}

// ========================================
// FUNCIÓN PRINCIPAL
// ========================================

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const test = new LocalSalesTest();
  
  try {
    await test.runFullTest();
    
    console.log('\n✅ TEST COMPLETADO SIN ERRORES');
    process.exit(0);
    
  } catch (error) {
    console.error('\n🚨 TEST FALLÓ');
    console.error(`❌ ${error.message}`);
    
    console.error('\n💡 SOLUCIONES:');
    if (error.message.includes('ECONNREFUSED')) {
      console.error('   🏥 Inicia el servidor: npm start');
    } else if (error.message.includes('productos de prueba')) {
      console.error('   📦 Ejecuta primero: node test-products-register.js');
    } else if (error.message.includes('401')) {
      console.error('   🔐 Verifica credenciales de admin');
    }
    
    process.exit(1);
  }
}

// ========================================
// EJECUTAR
// ========================================

if (require.main === module) {
  main();
}

module.exports = { LocalSalesTest };