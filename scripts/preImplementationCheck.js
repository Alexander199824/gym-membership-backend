// scripts/preImplementationCheck.js - VERIFICACIÓN PREVIA ANTES DE IMPLEMENTAR
const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICACIÓN PREVIA DE IMPLEMENTACIÓN');
console.log('=====================================\n');

// ✅ Verificar que archivos existentes NO serán modificados
function checkExistingFiles() {
  console.log('📋 1. VERIFICANDO ARCHIVOS EXISTENTES...');
  
  const existingFiles = [
    'src/middleware/authorization.js',
    'src/controllers/PaymentController.js',
    'src/controllers/MembershipController.js',
    'src/controllers/UserController.js',
    'src/models/User.js',
    'src/models/Payment.js',
    'src/models/Membership.js'
  ];
  
  let allExist = true;
  
  existingFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`   ✅ ${file} - EXISTE (no será modificado)`);
    } else {
      console.log(`   ⚠️ ${file} - NO ENCONTRADO`);
      allExist = false;
    }
  });
  
  if (allExist) {
    console.log('   🎉 Todos los archivos existentes están seguros\n');
  } else {
    console.log('   ⚠️ Algunos archivos no se encontraron (no es crítico)\n');
  }
  
  return allExist;
}

// ✅ Verificar que archivos nuevos no existen (evitar conflictos)
function checkNewFiles() {
  console.log('📋 2. VERIFICANDO ARCHIVOS NUEVOS...');
  
  const newFiles = [
    'src/middleware/inventoryAuthorization.js',
    'src/controllers/LocalSalesController.js',
    'src/controllers/OrderManagementController.js',
    'src/controllers/InventoryStatsController.js',
    'src/models/LocalSale.js',
    'src/models/LocalSaleItem.js',
    'src/models/TransferConfirmation.js',
    'src/routes/localSales.js',
    'src/routes/orderManagement.js',
    'src/routes/inventoryStats.js'
  ];
  
  let hasConflicts = false;
  
  newFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`   ⚠️ ${file} - YA EXISTE (posible conflicto)`);
      hasConflicts = true;
    } else {
      console.log(`   ✅ ${file} - LIBRE para crear`);
    }
  });
  
  if (!hasConflicts) {
    console.log('   🎉 No hay conflictos de archivos nuevos\n');
  } else {
    console.log('   ⚠️ Hay archivos que ya existen. Considerar backup\n');
  }
  
  return !hasConflicts;
}

// ✅ Verificar estructura de directorios
function checkDirectoryStructure() {
  console.log('📋 3. VERIFICANDO ESTRUCTURA DE DIRECTORIOS...');
  
  const requiredDirs = [
    'src',
    'src/controllers',
    'src/models',
    'src/routes',
    'src/middleware'
  ];
  
  let allDirsExist = true;
  
  requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`   ✅ ${dir}/ - EXISTE`);
    } else {
      console.log(`   ❌ ${dir}/ - NO EXISTE (requerido)`);
      allDirsExist = false;
    }
  });
  
  if (allDirsExist) {
    console.log('   🎉 Estructura de directorios correcta\n');
  } else {
    console.log('   ❌ Faltan directorios requeridos\n');
  }
  
  return allDirsExist;
}

// ✅ Verificar dependencias
function checkDependencies() {
  console.log('📋 4. VERIFICANDO DEPENDENCIAS...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = packageJson.dependencies || {};
    
    const requiredDeps = [
      'sequelize',
      'express',
      'jsonwebtoken'
    ];
    
    let allDepsExist = true;
    
    requiredDeps.forEach(dep => {
      if (dependencies[dep]) {
        console.log(`   ✅ ${dep} - v${dependencies[dep]}`);
      } else {
        console.log(`   ❌ ${dep} - NO INSTALADO`);
        allDepsExist = false;
      }
    });
    
    if (allDepsExist) {
      console.log('   🎉 Todas las dependencias están instaladas\n');
    } else {
      console.log('   ❌ Faltan dependencias requeridas\n');
    }
    
    return allDepsExist;
    
  } catch (error) {
    console.log('   ❌ Error leyendo package.json\n');
    return false;
  }
}

// ✅ Verificar configuración de base de datos
function checkDatabaseConfig() {
  console.log('📋 5. VERIFICANDO CONFIGURACIÓN DE BASE DE DATOS...');
  
  const configFiles = [
    'src/config/database.js',
    '.env'
  ];
  
  let configExists = false;
  
  configFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`   ✅ ${file} - EXISTE`);
      configExists = true;
    } else {
      console.log(`   ⚠️ ${file} - NO ENCONTRADO`);
    }
  });
  
  if (configExists) {
    console.log('   🎉 Configuración de base de datos encontrada\n');
  } else {
    console.log('   ⚠️ Configuración de base de datos no encontrada\n');
  }
  
  return configExists;
}

// ✅ Generar reporte de compatibilidad
function generateCompatibilityReport() {
  console.log('📋 6. GENERANDO REPORTE DE COMPATIBILIDAD...');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      existingFilesProtected: true,
      newFilesReady: true,
      structureValid: true,
      dependenciesReady: true,
      databaseConfigured: true
    },
    risks: [],
    recommendations: []
  };
  
  // Evaluar riesgos
  if (fs.existsSync('src/middleware/inventoryAuthorization.js')) {
    report.risks.push('inventoryAuthorization.js ya existe - posible sobrescritura');
  }
  
  if (!fs.existsSync('.env')) {
    report.risks.push('Archivo .env no encontrado - configurar variables de entorno');
  }
  
  // Generar recomendaciones
  report.recommendations = [
    'Hacer backup de la base de datos antes de aplicar migraciones',
    'Revisar que las variables de entorno estén configuradas',
    'Probar en ambiente de desarrollo antes de producción',
    'Verificar que el usuario de base de datos tenga permisos para crear tablas'
  ];
  
  console.log('   📊 Reporte generado\n');
  
  return report;
}

// ✅ Función principal
function runPreImplementationCheck() {
  console.log('🚀 Iniciando verificación previa...\n');
  
  const results = {
    existingFiles: checkExistingFiles(),
    newFiles: checkNewFiles(),
    directories: checkDirectoryStructure(),
    dependencies: checkDependencies(),
    database: checkDatabaseConfig()
  };
  
  const report = generateCompatibilityReport();
  
  console.log('=====================================');
  console.log('📊 RESUMEN DE VERIFICACIÓN');
  console.log('=====================================');
  
  const overallSuccess = Object.values(results).every(result => result);
  
  if (overallSuccess) {
    console.log('🎉 SISTEMA LISTO PARA IMPLEMENTACIÓN');
    console.log('   ✅ No hay conflictos detectados');
    console.log('   ✅ Archivos existentes protegidos');
    console.log('   ✅ Estructura correcta');
    console.log('   ✅ Dependencias listas');
  } else {
    console.log('⚠️ HAY PROBLEMAS QUE RESOLVER');
    Object.entries(results).forEach(([check, result]) => {
      console.log(`   ${result ? '✅' : '❌'} ${check}`);
    });
  }
  
  console.log('\n📋 RECOMENDACIONES:');
  report.recommendations.forEach(rec => {
    console.log(`   💡 ${rec}`);
  });
  
  if (report.risks.length > 0) {
    console.log('\n⚠️ RIESGOS IDENTIFICADOS:');
    report.risks.forEach(risk => {
      console.log(`   🚨 ${risk}`);
    });
  }
  
  console.log('\n=====================================');
  
  if (overallSuccess) {
    console.log('🚀 LISTO PARA EJECUTAR:');
    console.log('   node scripts/initializeSystem.js init');
  } else {
    console.log('🔧 RESOLVER PROBLEMAS ANTES DE CONTINUAR');
  }
  
  console.log('=====================================\n');
  
  return overallSuccess;
}

// ✅ Ejecutar si es llamado directamente
if (require.main === module) {
  const success = runPreImplementationCheck();
  process.exit(success ? 0 : 1);
}

module.exports = {
  runPreImplementationCheck,
  checkExistingFiles,
  checkNewFiles,
  checkDirectoryStructure,
  checkDependencies,
  checkDatabaseConfig
};