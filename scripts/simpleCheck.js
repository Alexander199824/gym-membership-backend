// scripts/simpleCheck.js - VERIFICACIÓN SIMPLE
const fs = require('fs');
const path = require('path');

async function simpleSystemCheck() {
  console.log('🔍 VERIFICACIÓN SIMPLE DEL SISTEMA');
  console.log('=====================================\n');

  // 1. Verificar estructura básica
  console.log('📋 1. ESTRUCTURA DEL PROYECTO:');
  const dirs = ['src', 'src/config', 'src/models', 'src/controllers', 'src/routes', 'scripts'];
  dirs.forEach(dir => {
    const exists = fs.existsSync(dir);
    console.log(`   ${exists ? '✅' : '❌'} ${dir}/`);
  });

  // 2. Verificar archivos clave
  console.log('\n📋 2. ARCHIVOS CLAVE:');
  const keyFiles = [
    'package.json',
    'src/config/database.js',
    'src/config/seeds.js',
    'src/models/index.js',
    '.env'
  ];
  
  keyFiles.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  });

  // 3. Verificar archivos del sistema de tienda
  console.log('\n📋 3. SISTEMA DE TIENDA - MODELOS:');
  const storeModels = [
    'src/models/StoreCategory.js',
    'src/models/StoreBrand.js', 
    'src/models/StoreProduct.js',
    'src/models/StoreProductImage.js',
    'src/models/StoreOrder.js',
    'src/models/StoreOrderItem.js',
    'src/models/StoreCart.js',
    'src/models/LocalSale.js',
    'src/models/LocalSaleItem.js',
    'src/models/TransferConfirmation.js'
  ];
  
  storeModels.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  });

  // 4. Verificar controladores
  console.log('\n📋 4. SISTEMA DE TIENDA - CONTROLADORES:');
  const storeControllers = [
    'src/controllers/storeController.js',
    'src/controllers/StoreCategoryController.js',
    'src/controllers/StoreBrandController.js',
    'src/controllers/StoreProductController.js',
    'src/controllers/StoreImageController.js',
    'src/controllers/LocalSalesController.js',
    'src/controllers/OrderManagementController.js',
    'src/controllers/InventoryStatsController.js'
  ];
  
  storeControllers.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  });

  // 5. Verificar rutas
  console.log('\n📋 5. SISTEMA DE TIENDA - RUTAS:');
  const storeRoutes = [
    'src/routes/storeRoutes.js',
    'src/routes/storeAdminRoutes.js',
    'src/routes/localSales.js',
    'src/routes/orderManagement.js',
    'src/routes/inventoryStats.js'
  ];
  
  storeRoutes.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  });

  // 6. Verificar middleware
  console.log('\n📋 6. MIDDLEWARE:');
  const middleware = [
    'src/middleware/auth.js',
    'src/middleware/authorization.js',
    'src/middleware/inventoryAuthorization.js',
    'src/middleware/optionalAuth.js'
  ];
  
  middleware.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  });

  // 7. Verificar scripts
  console.log('\n📋 7. SCRIPTS DE INICIALIZACIÓN:');
  const scripts = [
    'migrations/20250101000001-update-store-orders.js',
    'migrations/20250101000002-create-local-sales.js',
    'scripts/initializeSystem.js',
    'scripts/preImplementationCheck.js'
  ];
  
  scripts.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  });

  // 8. Intentar verificar base de datos (solo si es posible)
  console.log('\n📋 8. CONEXIÓN A BASE DE DATOS:');
  try {
    const { sequelize } = require('../src/config/database');
    await sequelize.authenticate();
    console.log('   ✅ Conexión exitosa');
    
    // Verificar algunas tablas
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log(`   📊 Tablas existentes: ${tables.length}`);
    
    // Verificar tablas específicas de tienda
    const storeTableNames = [
      'store_categories', 'store_brands', 'store_products',
      'local_sales', 'local_sale_items'
    ];
    
    const existingTables = tables.map(t => t.table_name);
    const hasStoreTables = storeTableNames.some(table => existingTables.includes(table));
    
    console.log(`   🛒 Sistema de tienda en BD: ${hasStoreTables ? '✅ SÍ' : '❌ NO'}`);
    
    await sequelize.close();
  } catch (error) {
    console.log(`   ❌ Error de conexión: ${error.message.split('\n')[0]}`);
  }

  // 9. Resumen y recomendaciones
  console.log('\n=====================================');
  console.log('📊 RESUMEN Y RECOMENDACIONES');
  console.log('=====================================');

  // Contar archivos existentes
  const allFiles = [...keyFiles, ...storeModels, ...storeControllers, ...storeRoutes, ...middleware, ...scripts];
  const existingFiles = allFiles.filter(file => fs.existsSync(file));
  const percentage = Math.round((existingFiles.length / allFiles.length) * 100);

  console.log(`📈 Completitud del sistema: ${percentage}% (${existingFiles.length}/${allFiles.length} archivos)`);

  if (percentage >= 80) {
    console.log('🎉 SISTEMA CASI COMPLETO');
    console.log('   ✅ La mayoría de archivos están presentes');
    console.log('   💡 Puedes proceder con inicialización');
    console.log('\n🚀 SIGUIENTE PASO:');
    console.log('   node scripts/initializeSystem.js init');
  } else if (percentage >= 50) {
    console.log('⚠️ SISTEMA PARCIALMENTE IMPLEMENTADO');
    console.log('   ✅ Algunos archivos están presentes');
    console.log('   ❌ Faltan archivos importantes');
    console.log('\n🚀 SIGUIENTE PASO:');
    console.log('   Implementar archivos faltantes antes de inicializar');
  } else {
    console.log('🆕 SISTEMA MAYORMENTE NUEVO');
    console.log('   ❌ Pocos archivos del sistema de tienda');
    console.log('   ✅ Listo para implementación completa');
    console.log('\n🚀 SIGUIENTE PASO:');
    console.log('   Implementar todos los archivos del sistema');
  }

  // Mostrar archivos críticos faltantes
  const criticalFiles = [
    'src/models/index.js',
    'src/models/StoreProduct.js',
    'src/models/LocalSale.js',
    'src/controllers/LocalSalesController.js'
  ];
  
  const missingCritical = criticalFiles.filter(file => !fs.existsSync(file));
  if (missingCritical.length > 0) {
    console.log('\n🚨 ARCHIVOS CRÍTICOS FALTANTES:');
    missingCritical.forEach(file => console.log(`   ❌ ${file}`));
  }

  console.log('\n=====================================\n');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  simpleSystemCheck().catch(error => {
    console.error('❌ Error en verificación:', error.message);
    process.exit(1);
  });
}

module.exports = { simpleSystemCheck };