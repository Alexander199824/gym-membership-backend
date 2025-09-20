// scripts/checkSystemStatus.js - VERIFICAR ESTADO ACTUAL
const path = require('path');
const fs = require('fs');

// Cambiar al directorio raíz del proyecto para imports correctos
process.chdir(path.dirname(__dirname));

const { sequelize } = require('./src/config/database');

async function checkSystemStatus() {
  console.log('🔍 VERIFICANDO ESTADO ACTUAL DEL SISTEMA');
  console.log('==========================================\n');

  try {
    // 1. Verificar conexión a BD
    console.log('📋 1. CONEXIÓN A BASE DE DATOS...');
    await sequelize.authenticate();
    console.log('   ✅ Conexión exitosa\n');

    // 2. Verificar tablas existentes
    console.log('📋 2. TABLAS EXISTENTES...');
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    const tableNames = tables.map(t => t.table_name);
    console.log(`   📊 Total de tablas: ${tableNames.length}`);

    // Verificar tablas del sistema de tienda
    const storeTables = [
      'store_categories',
      'store_brands', 
      'store_products',
      'store_product_images',
      'store_orders',
      'store_order_items',
      'store_cart',
      'local_sales',
      'local_sale_items',
      'transfer_confirmations'
    ];

    console.log('\n   🛒 SISTEMA DE TIENDA:');
    storeTables.forEach(table => {
      const exists = tableNames.includes(table);
      console.log(`   ${exists ? '✅' : '❌'} ${table}`);
    });

    // 3. Verificar modelos
    console.log('\n📋 3. MODELOS DISPONIBLES...');
    try {
      const models = require('./src/models');
      const modelNames = Object.keys(models).filter(key => 
        key !== 'sequelize' && key !== 'Sequelize'
      );
      
      console.log(`   📊 Total de modelos: ${modelNames.length}`);
      
      const storeModels = [
        'StoreCategory',
        'StoreBrand', 
        'StoreProduct',
        'StoreProductImage',
        'StoreOrder',
        'StoreOrderItem',
        'StoreCart',
        'LocalSale',
        'LocalSaleItem',
        'TransferConfirmation'
      ];

      console.log('\n   🛒 MODELOS DE TIENDA:');
      storeModels.forEach(model => {
        const exists = modelNames.includes(model);
        console.log(`   ${exists ? '✅' : '❌'} ${model}`);
      });
    } catch (error) {
      console.log('   ❌ Error cargando modelos:', error.message);
    }

    // 4. Verificar datos de ejemplo
    console.log('\n📋 4. DATOS DE EJEMPLO...');
    try {
      const models = require('./src/models');
      
      if (models.StoreCategory) {
        const categoriesCount = await models.StoreCategory.count();
        console.log(`   📂 Categorías: ${categoriesCount}`);
      }
      
      if (models.StoreBrand) {
        const brandsCount = await models.StoreBrand.count();
        console.log(`   🏷️ Marcas: ${brandsCount}`);
      }
      
      if (models.StoreProduct) {
        const productsCount = await models.StoreProduct.count();
        console.log(`   📦 Productos: ${productsCount}`);
      }
      
      if (models.LocalSale) {
        const salesCount = await models.LocalSale.count();
        console.log(`   💰 Ventas locales: ${salesCount}`);
      }
    } catch (error) {
      console.log('   ⚠️ Error verificando datos:', error.message);
    }

    // 5. Verificar archivos del sistema
    console.log('\n📋 5. ARCHIVOS DEL SISTEMA...');
    const files = [
      'src/controllers/LocalSalesController.js',
      'src/controllers/OrderManagementController.js', 
      'src/controllers/InventoryStatsController.js',
      'src/models/LocalSale.js',
      'src/models/LocalSaleItem.js',
      'src/models/TransferConfirmation.js',
      'src/middleware/inventoryAuthorization.js',
      'src/routes/inventoryStats.js'
    ];

    files.forEach(file => {
      const exists = fs.existsSync(file);
      console.log(`   ${exists ? '✅' : '❌'} ${file}`);
    });

    console.log('\n==========================================');
    console.log('📊 RESUMEN DEL ESTADO ACTUAL');
    console.log('==========================================');

    // Determinar estado general
    const hasStoreTables = storeTables.some(table => tableNames.includes(table));
    const hasStoreModels = fs.existsSync('src/models/LocalSale.js');
    
    if (hasStoreTables && hasStoreModels) {
      console.log('🎉 SISTEMA DE TIENDA PARCIALMENTE IMPLEMENTADO');
      console.log('   ✅ Tienes tablas y modelos existentes');
      console.log('   💡 Puedes proceder con inicialización para completar');
      console.log('\n🚀 SIGUIENTE PASO:');
      console.log('   node scripts/initializeSystem.js init');
    } else if (hasStoreModels) {
      console.log('⚠️ ARCHIVOS EXISTENTES PERO SIN TABLAS');
      console.log('   ✅ Tienes archivos de código');
      console.log('   ❌ Faltan tablas en base de datos');
      console.log('\n🚀 SIGUIENTE PASO:');
      console.log('   node scripts/initializeSystem.js init --force');
    } else {
      console.log('🆕 SISTEMA NUEVO');
      console.log('   ✅ Listo para implementación completa');
      console.log('\n🚀 SIGUIENTE PASO:');
      console.log('   node scripts/initializeSystem.js init');
    }

  } catch (error) {
    console.error('❌ Error en verificación:', error.message);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  checkSystemStatus();
}

module.exports = { checkSystemStatus };