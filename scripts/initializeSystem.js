// scripts/initializeSystem.js - INICIALIZACIÓN COMPLETA DEL SISTEMA
const { 
  sequelize,
  syncDatabase,
  initializeData,
  validateModels,
  getModelsInfo,
  StoreCategory,
  StoreBrand,
  StoreProduct,
  User
} = require('../src/models');

// ✅ Inicialización completa del sistema
async function initializeSystem(options = {}) {
  const {
    force = false,
    seedData = true,
    validateSystem = true,
    createAdmin = true
  } = options;

  console.log('🚀 Iniciando configuración del sistema...');
  console.log(`   🔧 Modo force: ${force ? 'SÍ' : 'NO'}`);
  console.log(`   🌱 Crear datos semilla: ${seedData ? 'SÍ' : 'NO'}`);
  console.log(`   ✅ Validar sistema: ${validateSystem ? 'SÍ' : 'NO'}`);
  console.log(`   👤 Crear admin: ${createAdmin ? 'SÍ' : 'NO'}`);

  try {
    // 1. Validar modelos
    if (validateSystem) {
      console.log('\n📋 FASE 1: Validando modelos...');
      await validateModels();
      
      const modelsInfo = getModelsInfo();
      console.log(`✅ ${modelsInfo.totalModels} modelos validados correctamente`);
    }

    // 2. Sincronizar base de datos
    console.log('\n🔄 FASE 2: Sincronizando base de datos...');
    await syncDatabase(force);

    // 3. Crear datos semilla
    if (seedData) {
      console.log('\n🌱 FASE 3: Creando datos semilla...');
      await createSeedData();
    }

    // 4. Crear usuario administrador
    if (createAdmin) {
      console.log('\n👤 FASE 4: Creando usuario administrador...');
      await createAdminUser();
    }

    // 5. Validación final del sistema
    if (validateSystem) {
      console.log('\n🔍 FASE 5: Validación final del sistema...');
      await validateSystemIntegrity();
    }

    console.log('\n🎉 ¡Sistema inicializado exitosamente!');
    return { success: true, message: 'Sistema inicializado correctamente' };

  } catch (error) {
    console.error('\n❌ Error inicializando sistema:', error);
    return { success: false, error: error.message };
  }
}

// ✅ Crear datos semilla
async function createSeedData() {
  try {
    console.log('🗂️ Creando categorías de tienda...');
    if (StoreCategory.seedDefaultCategories) {
      await StoreCategory.seedDefaultCategories();
    }
    
    console.log('🏷️ Creando marcas de tienda...');
    if (StoreBrand.seedDefaultBrands) {
      await StoreBrand.seedDefaultBrands();
    }
    
    console.log('📦 Creando productos de ejemplo...');
    if (StoreProduct.seedSampleProducts) {
      await StoreProduct.seedSampleProducts(StoreCategory, StoreBrand);
    }
    
    console.log('✅ Datos semilla creados exitosamente');

  } catch (error) {
    console.error('❌ Error creando datos semilla:', error);
    throw error;
  }
}

// ✅ Crear usuario administrador por defecto
async function createAdminUser() {
  try {
    const adminData = {
      firstName: 'Admin',
      lastName: 'Sistema',
      email: 'admin@elitefit.gt',
      password: 'EliteFit2025!', // Cambiar en producción
      phone: '+502 1234-5678',
      role: 'admin',
      isActive: true,
      emailVerified: true
    };

    const [admin, created] = await User.findOrCreate({
      where: { email: adminData.email },
      defaults: adminData
    });

    if (created) {
      console.log('✅ Usuario administrador creado:');
      console.log(`   📧 Email: ${admin.email}`);
      console.log(`   🔑 Password: ${adminData.password}`);
      console.log('   ⚠️ IMPORTANTE: Cambiar la contraseña en producción');
    } else {
      console.log('ℹ️ Usuario administrador ya existe');
    }

  } catch (error) {
    console.error('❌ Error creando usuario administrador:', error);
    throw error;
  }
}

// ✅ Validar integridad del sistema
async function validateSystemIntegrity() {
  try {
    const validations = [];

    // Validar categorías
    const categoriesCount = await StoreCategory.count({ where: { isActive: true } });
    validations.push({
      name: 'Categorías activas',
      result: categoriesCount > 0,
      value: categoriesCount,
      expected: '> 0'
    });

    // Validar marcas
    const brandsCount = await StoreBrand.count({ where: { isActive: true } });
    validations.push({
      name: 'Marcas activas',
      result: brandsCount > 0,
      value: brandsCount,
      expected: '> 0'
    });

    // Validar productos
    const productsCount = await StoreProduct.count({ where: { isActive: true } });
    validations.push({
      name: 'Productos activos',
      result: productsCount > 0,
      value: productsCount,
      expected: '> 0'
    });

    // Validar usuario admin
    const adminCount = await User.count({ where: { role: 'admin', isActive: true } });
    validations.push({
      name: 'Administradores activos',
      result: adminCount > 0,
      value: adminCount,
      expected: '> 0'
    });

    // Validar conexión a base de datos
    await sequelize.authenticate();
    validations.push({
      name: 'Conexión a base de datos',
      result: true,
      value: 'Conectado',
      expected: 'Conectado'
    });

    // Mostrar resultados
    console.log('\n📊 Resultados de validación:');
    const failedValidations = [];

    validations.forEach(validation => {
      const status = validation.result ? '✅' : '❌';
      console.log(`   ${status} ${validation.name}: ${validation.value} (esperado: ${validation.expected})`);
      
      if (!validation.result) {
        failedValidations.push(validation.name);
      }
    });

    if (failedValidations.length > 0) {
      throw new Error(`Validaciones fallidas: ${failedValidations.join(', ')}`);
    }

    console.log('✅ Todas las validaciones pasaron correctamente');

  } catch (error) {
    console.error('❌ Error en validación del sistema:', error);
    throw error;
  }
}

// ✅ Funciones de utilidad

// Mostrar estadísticas del sistema
async function showSystemStats() {
  try {
    console.log('\n📊 ESTADÍSTICAS DEL SISTEMA:');
    
    const stats = await Promise.all([
      StoreCategory.count({ where: { isActive: true } }),
      StoreBrand.count({ where: { isActive: true } }),
      StoreProduct.count({ where: { isActive: true } }),
      StoreProduct.count({ where: { isActive: true, stockQuantity: { [sequelize.Sequelize.Op.gt]: 0 } } }),
      User.count({ where: { isActive: true } }),
      User.count({ where: { role: 'admin', isActive: true } }),
      User.count({ where: { role: 'colaborador', isActive: true } })
    ]);

    console.log(`   🗂️ Categorías activas: ${stats[0]}`);
    console.log(`   🏷️ Marcas activas: ${stats[1]}`);
    console.log(`   📦 Productos activos: ${stats[2]}`);
    console.log(`   📋 Productos en stock: ${stats[3]}`);
    console.log(`   👥 Usuarios activos: ${stats[4]}`);
    console.log(`   👑 Administradores: ${stats[5]}`);
    console.log(`   👤 Colaboradores: ${stats[6]}`);

    const modelsInfo = getModelsInfo();
    console.log(`   🔧 Modelos cargados: ${modelsInfo.totalModels}`);

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
  }
}

// Limpiar sistema (desarrollo)
async function cleanSystem() {
  console.log('⚠️ LIMPIANDO SISTEMA - Solo para desarrollo');
  
  try {
    await syncDatabase(true); // Force sync
    console.log('✅ Sistema limpiado exitosamente');
  } catch (error) {
    console.error('❌ Error limpiando sistema:', error);
    throw error;
  }
}

// ✅ SCRIPT PRINCIPAL
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'init';

  switch (command) {
    case 'init':
    case 'initialize':
      await initializeSystem({
        force: args.includes('--force'),
        seedData: !args.includes('--no-seed'),
        validateSystem: !args.includes('--no-validate'),
        createAdmin: !args.includes('--no-admin')
      });
      break;

    case 'clean':
      await cleanSystem();
      break;

    case 'stats':
      await showSystemStats();
      break;

    case 'validate':
      await validateSystemIntegrity();
      break;

    default:
      console.log('📋 Comandos disponibles:');
      console.log('   node scripts/initializeSystem.js init [--force] [--no-seed] [--no-validate] [--no-admin]');
      console.log('   node scripts/initializeSystem.js clean');
      console.log('   node scripts/initializeSystem.js stats');
      console.log('   node scripts/initializeSystem.js validate');
      process.exit(1);
  }

  await sequelize.close();
  console.log('👋 Conexión cerrada');
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
}

module.exports = {
  initializeSystem,
  createSeedData,
  createAdminUser,
  validateSystemIntegrity,
  showSystemStats,
  cleanSystem
};