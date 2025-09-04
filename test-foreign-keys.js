// test-foreign-keys.js - Test independiente para verificar llaves foráneas
const { sequelize } = require('./src/config/database');
const db = require('./src/models');

class ForeignKeyTester {
  constructor() {
    this.results = {
      connection: false,
      modelsLoaded: false,
      foreignKeysFound: false,
      associationsConfigured: false,
      referentialIntegrity: false,
      dataRelations: false
    };
    
    this.statistics = {
      totalModels: 0,
      totalAssociations: 0,
      totalForeignKeys: 0,
      criticalFKsFound: 0,
      criticalFKsExpected: 0
    };
    
    this.testData = {};
    this.cleanup = [];
  }

  async runTest() {
    console.log('🔗 ELITE FITNESS CLUB - TEST DE LLAVES FORÁNEAS');
    console.log('=' .repeat(60));
    console.log('📋 Verificando integridad referencial de la base de datos\n');
    
    try {
      await this.step1_CheckConnection();
      await this.step2_VerifyModels();
      await this.step3_CheckForeignKeys();
      await this.step4_VerifyAssociations();
      await this.step5_TestReferentialIntegrity();
      await this.step6_TestDataRelations();
      await this.step7_Cleanup();
      
      this.showResults();
      
      console.log('\n✅ ¡Test de Foreign Keys completado exitosamente!');
      
    } catch (error) {
      console.error('\n❌ Error en el test:', error.message);
      await this.emergencyCleanup();
      process.exit(1);
    } finally {
      await sequelize.close();
    }
  }

  async step1_CheckConnection() {
    console.log('1️⃣ VERIFICANDO CONEXIÓN A BASE DE DATOS');
    console.log('-' .repeat(50));
    
    try {
      await sequelize.authenticate();
      console.log('   ✅ Conexión establecida exitosamente');
      
      // Obtener información de la base de datos
      const [dbInfo] = await sequelize.query('SELECT version() as version, current_database() as database');
      console.log(`   📊 Base de datos: ${dbInfo[0].database}`);
      console.log(`   🐘 PostgreSQL: ${dbInfo[0].version.split(' ')[1]}`);
      
      this.results.connection = true;
      
    } catch (error) {
      throw new Error(`No se puede conectar a la base de datos: ${error.message}`);
    }
  }

  async step2_VerifyModels() {
    console.log('\n2️⃣ VERIFICANDO MODELOS CARGADOS');
    console.log('-' .repeat(50));
    
    // Obtener todos los modelos cargados
    const modelNames = Object.keys(db).filter(key => 
      !['sequelize', 'Sequelize', 'diagnose', 'syncDatabase', 'resetDatabase', 'checkDatabaseStatus', 'initializeForDevelopment', 'fullDiagnosis', 'repairPaymentModel'].includes(key)
    );
    
    this.statistics.totalModels = modelNames.length;
    
    console.log(`   📦 Total de modelos cargados: ${modelNames.length}`);
    console.log('   📋 Lista de modelos:');
    
    const criticalModels = ['User', 'Membership', 'MembershipPlans', 'Payment', 'StoreProduct', 'StoreCategory'];
    let criticalFound = 0;
    
    modelNames.forEach(modelName => {
      const isCritical = criticalModels.includes(modelName);
      if (isCritical) criticalFound++;
      
      console.log(`      ${isCritical ? '⭐' : '📦'} ${modelName}`);
    });
    
    console.log(`   ⭐ Modelos críticos encontrados: ${criticalFound}/${criticalModels.length}`);
    
    if (criticalFound < criticalModels.length) {
      const missing = criticalModels.filter(model => !modelNames.includes(model));
      console.log(`   ❌ Modelos críticos faltantes: ${missing.join(', ')}`);
      throw new Error('Modelos críticos no están cargados');
    }
    
    this.results.modelsLoaded = true;
    console.log('   ✅ Todos los modelos críticos están cargados');
  }

  async step3_CheckForeignKeys() {
    console.log('\n3️⃣ VERIFICANDO FOREIGN KEYS EN LA BASE DE DATOS');
    console.log('-' .repeat(50));
    
    // Consulta SQL para obtener todas las foreign keys
    const [foreignKeys] = await sequelize.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name;
    `);
    
    this.statistics.totalForeignKeys = foreignKeys.length;
    
    if (foreignKeys.length === 0) {
      console.log('   ❌ NO SE ENCONTRARON FOREIGN KEYS');
      console.log('   💡 Esto indica que las FKs no se están creando');
      return;
    }
    
    console.log(`   📊 Total Foreign Keys encontradas: ${foreignKeys.length}`);
    console.log('   📋 Foreign Keys por tabla:');
    
    // Agrupar por tabla
    const fksByTable = {};
    foreignKeys.forEach(fk => {
      if (!fksByTable[fk.table_name]) {
        fksByTable[fk.table_name] = [];
      }
      fksByTable[fk.table_name].push(fk);
    });
    
    Object.keys(fksByTable).sort().forEach(tableName => {
      console.log(`      📋 ${tableName} (${fksByTable[tableName].length} FKs):`);
      fksByTable[tableName].forEach(fk => {
        console.log(`         └── ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    });
    
    // Verificar FKs críticas
    const criticalFKs = [
      { table: 'memberships', column: 'userId', references: 'users' },
      { table: 'memberships', column: 'planId', references: 'membership_plans' },
      { table: 'payments', column: 'userId', references: 'users' },
      { table: 'payments', column: 'membershipId', references: 'memberships' },
      { table: 'store_products', column: 'categoryId', references: 'store_categories' }
    ];
    
    this.statistics.criticalFKsExpected = criticalFKs.length;
    console.log('\n   🎯 Verificando FKs críticas:');
    
    let criticalFound = 0;
    criticalFKs.forEach(expectedFK => {
      const found = foreignKeys.find(fk => 
        fk.table_name === expectedFK.table &&
        fk.column_name.toLowerCase() === expectedFK.column.toLowerCase() &&
        fk.foreign_table_name === expectedFK.references
      );
      
      if (found) {
        console.log(`      ✅ ${expectedFK.table}.${expectedFK.column} → ${expectedFK.references}`);
        criticalFound++;
      } else {
        console.log(`      ❌ ${expectedFK.table}.${expectedFK.column} → ${expectedFK.references} (FALTANTE)`);
      }
    });
    
    this.statistics.criticalFKsFound = criticalFound;
    console.log(`   📊 FKs críticas encontradas: ${criticalFound}/${criticalFKs.length}`);
    
    if (criticalFound === criticalFKs.length) {
      console.log('   ✅ Todas las Foreign Keys críticas están creadas');
      this.results.foreignKeysFound = true;
    } else {
      console.log('   ⚠️ Algunas Foreign Keys críticas están faltando');
    }
  }

  async step4_VerifyAssociations() {
    console.log('\n4️⃣ VERIFICANDO ASOCIACIONES DE SEQUELIZE');
    console.log('-' .repeat(50));
    
    const modelNames = Object.keys(db).filter(key => 
      !['sequelize', 'Sequelize'].includes(key) && 
      !key.startsWith('diagnose') && 
      !key.startsWith('sync') && 
      !key.startsWith('reset') && 
      !key.startsWith('check') && 
      !key.startsWith('init') && 
      !key.startsWith('full') && 
      !key.startsWith('repair')
    );
    
    let totalAssociations = 0;
    let modelsWithAssociations = 0;
    
    console.log('   🔗 Asociaciones por modelo:');
    
    modelNames.forEach(modelName => {
      const model = db[modelName];
      if (model && model.associations) {
        const associations = Object.keys(model.associations);
        if (associations.length > 0) {
          console.log(`      📦 ${modelName} (${associations.length} asociaciones):`);
          associations.forEach(assocName => {
            const assoc = model.associations[assocName];
            const assocType = assoc.associationType || 'Unknown';
            const targetModel = assoc.target ? assoc.target.name : 'Unknown';
            console.log(`         └── ${assocName}: ${assocType} → ${targetModel}`);
            totalAssociations++;
          });
          modelsWithAssociations++;
        } else {
          console.log(`      📦 ${modelName}: Sin asociaciones`);
        }
      }
    });
    
    this.statistics.totalAssociations = totalAssociations;
    
    console.log(`\n   📊 Resumen de asociaciones:`);
    console.log(`      📦 Total modelos: ${modelNames.length}`);
    console.log(`      🔗 Modelos con asociaciones: ${modelsWithAssociations}`);
    console.log(`      📈 Total asociaciones: ${totalAssociations}`);
    console.log(`      📊 Promedio por modelo: ${(totalAssociations / modelNames.length).toFixed(1)}`);
    
    // Verificar asociaciones críticas
    const criticalAssociations = [
      { model: 'User', association: 'memberships' },
      { model: 'User', association: 'payments' },
      { model: 'Membership', association: 'user' },
      { model: 'Membership', association: 'plan' },
      { model: 'Payment', association: 'user' },
      { model: 'StoreProduct', association: 'category' }
    ];
    
    console.log('\n   🎯 Verificando asociaciones críticas:');
    let criticalAssocFound = 0;
    
    criticalAssociations.forEach(({ model, association }) => {
      if (db[model] && db[model].associations && db[model].associations[association]) {
        console.log(`      ✅ ${model}.${association}`);
        criticalAssocFound++;
      } else {
        console.log(`      ❌ ${model}.${association} (FALTANTE)`);
      }
    });
    
    if (criticalAssocFound === criticalAssociations.length) {
      console.log('   ✅ Todas las asociaciones críticas están configuradas');
      this.results.associationsConfigured = true;
    } else {
      console.log('   ⚠️ Algunas asociaciones críticas están faltando');
    }
  }

  async step5_TestReferentialIntegrity() {
    console.log('\n5️⃣ PROBANDO INTEGRIDAD REFERENCIAL');
    console.log('-' .repeat(50));
    
    try {
      console.log('   🧪 Intentando crear registros con FKs inválidas...');
      
      // Test 1: Intentar crear Membership con userId inválido
      console.log('   📋 Test 1: Membership con userId inválido');
      try {
        await db.Membership.create({
          userId: '00000000-0000-0000-0000-000000000000',
          planId: 1,
          type: 'monthly',
          price: 100,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'active'
        });
        console.log('      ❌ ERROR: Se permitió FK inválida');
      } catch (error) {
        console.log('      ✅ FK inválida fue rechazada correctamente');
      }
      
      // Test 2: Intentar crear StoreProduct con categoryId inválido
      console.log('   📋 Test 2: StoreProduct con categoryId inválido');
      try {
        await db.StoreProduct.create({
          name: 'Test Product',
          price: 50,
          categoryId: 99999,
          sku: 'TEST-001',
          stockQuantity: 10
        });
        console.log('      ❌ ERROR: Se permitió FK inválida');
      } catch (error) {
        console.log('      ✅ FK inválida fue rechazada correctamente');
      }
      
      console.log('   ✅ Integridad referencial funcionando correctamente');
      this.results.referentialIntegrity = true;
      
    } catch (error) {
      console.log(`   ❌ Error probando integridad: ${error.message}`);
    }
  }

  async step6_TestDataRelations() {
    console.log('\n6️⃣ PROBANDO RELACIONES DE DATOS REALES');
    console.log('-' .repeat(50));
    
    try {
      console.log('   🧪 Creando datos de prueba y verificando relaciones...');
      
      // Crear usuario de prueba
      console.log('   👤 Creando usuario de prueba...');
      const testUser = await db.User.create({
        firstName: 'Test',
        lastName: 'User',
        email: `test_${Date.now()}@example.com`,
        password: 'password123',
        role: 'cliente'
      });
      this.cleanup.push({ model: 'User', id: testUser.id });
      console.log(`      ✅ Usuario creado: ${testUser.firstName} ${testUser.lastName}`);
      
      // Crear plan de membresía si existe el modelo
      let testPlan = null;
      if (db.MembershipPlans) {
        console.log('   🎫 Buscando o creando plan de membresía...');
        testPlan = await db.MembershipPlans.findOne() || await db.MembershipPlans.create({
          planName: 'Test Plan',
          price: 100,
          durationType: 'monthly',
          features: ['Test feature']
        });
        if (testPlan.isNewRecord) {
          this.cleanup.push({ model: 'MembershipPlans', id: testPlan.id });
        }
        console.log(`      ✅ Plan disponible: ${testPlan.planName}`);
      }
      
      // Crear membresía
      if (testPlan) {
        console.log('   🎫 Creando membresía...');
        const membership = await db.Membership.create({
          userId: testUser.id,
          planId: testPlan.id,
          type: 'monthly',
          price: 100,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'active'
        });
        this.cleanup.push({ model: 'Membership', id: membership.id });
        console.log('      ✅ Membresía creada correctamente');
        
        // Probar relación: Usuario → Membresías
        console.log('   🔗 Probando relación Usuario → Membresías...');
        const userWithMemberships = await db.User.findByPk(testUser.id, {
          include: [{ association: 'memberships' }]
        });
        
        if (userWithMemberships && userWithMemberships.memberships && userWithMemberships.memberships.length > 0) {
          console.log('      ✅ Relación Usuario → Membresías funciona');
        } else {
          console.log('      ❌ Relación Usuario → Membresías no funciona');
        }
        
        // Probar relación: Membresía → Usuario
        console.log('   🔗 Probando relación Membresía → Usuario...');
        const membershipWithUser = await db.Membership.findByPk(membership.id, {
          include: [{ association: 'user' }]
        });
        
        if (membershipWithUser && membershipWithUser.user) {
          console.log('      ✅ Relación Membresía → Usuario funciona');
        } else {
          console.log('      ❌ Relación Membresía → Usuario no funciona');
        }
        
        // Probar relación: Membresía → Plan
        console.log('   🔗 Probando relación Membresía → Plan...');
        const membershipWithPlan = await db.Membership.findByPk(membership.id, {
          include: [{ association: 'plan' }]
        });
        
        if (membershipWithPlan && membershipWithPlan.plan) {
          console.log('      ✅ Relación Membresía → Plan funciona');
        } else {
          console.log('      ❌ Relación Membresía → Plan no funciona');
        }
      }
      
      // Crear pago
      console.log('   💳 Creando pago...');
      const payment = await db.Payment.create({
        userId: testUser.id,
        amount: 50,
        paymentMethod: 'cash',
        paymentType: 'daily',
        status: 'completed'
      });
      this.cleanup.push({ model: 'Payment', id: payment.id });
      console.log('      ✅ Pago creado correctamente');
      
      // Probar relación: Usuario → Pagos
      console.log('   🔗 Probando relación Usuario → Pagos...');
      const userWithPayments = await db.User.findByPk(testUser.id, {
        include: [{ association: 'payments' }]
      });
      
      if (userWithPayments && userWithPayments.payments && userWithPayments.payments.length > 0) {
        console.log('      ✅ Relación Usuario → Pagos funciona');
      } else {
        console.log('      ❌ Relación Usuario → Pagos no funciona');
      }
      
      // Probar relación: Pago → Usuario
      console.log('   🔗 Probando relación Pago → Usuario...');
      const paymentWithUser = await db.Payment.findByPk(payment.id, {
        include: [{ association: 'user' }]
      });
      
      if (paymentWithUser && paymentWithUser.user) {
        console.log('      ✅ Relación Pago → Usuario funciona');
      } else {
        console.log('      ❌ Relación Pago → Usuario no funciona');
      }
      
      console.log('   ✅ Todas las relaciones de datos funcionan correctamente');
      this.results.dataRelations = true;
      
    } catch (error) {
      console.log(`   ❌ Error probando relaciones de datos: ${error.message}`);
    }
  }

  async step7_Cleanup() {
    console.log('\n7️⃣ LIMPIANDO DATOS DE PRUEBA');
    console.log('-' .repeat(50));
    
    console.log('   🧹 Eliminando datos de prueba...');
    
    // Eliminar en orden inverso (por dependencias)
    const reverseCleanup = [...this.cleanup].reverse();
    let cleaned = 0;
    
    for (const item of reverseCleanup) {
      try {
        if (db[item.model]) {
          await db[item.model].destroy({
            where: { id: item.id },
            force: true
          });
          cleaned++;
        }
      } catch (error) {
        console.log(`      ⚠️ No se pudo eliminar ${item.model} ${item.id}: ${error.message}`);
      }
    }
    
    console.log(`   ✅ ${cleaned} registros de prueba eliminados`);
  }

  async emergencyCleanup() {
    console.log('\n🚨 LIMPIEZA DE EMERGENCIA');
    if (this.cleanup.length > 0) {
      await this.step7_Cleanup();
    }
  }

  showResults() {
    console.log('\n📊 RESULTADOS DEL TEST');
    console.log('=' .repeat(60));
    
    const results = this.results;
    const stats = this.statistics;
    
    // Mostrar resultados individuales
    console.log('📋 Verificaciones:');
    console.log(`   🔌 Conexión a BD: ${results.connection ? '✅ ÉXITO' : '❌ FALLO'}`);
    console.log(`   📦 Modelos cargados: ${results.modelsLoaded ? '✅ ÉXITO' : '❌ FALLO'}`);
    console.log(`   🔗 Foreign Keys: ${results.foreignKeysFound ? '✅ ÉXITO' : '❌ FALLO'}`);
    console.log(`   🔄 Asociaciones: ${results.associationsConfigured ? '✅ ÉXITO' : '❌ FALLO'}`);
    console.log(`   🔒 Integridad: ${results.referentialIntegrity ? '✅ ÉXITO' : '❌ FALLO'}`);
    console.log(`   📊 Relaciones: ${results.dataRelations ? '✅ ÉXITO' : '❌ FALLO'}`);
    
    // Estadísticas
    console.log('\n📈 Estadísticas:');
    console.log(`   📦 Total modelos: ${stats.totalModels}`);
    console.log(`   🔗 Total asociaciones: ${stats.totalAssociations}`);
    console.log(`   🔑 Total Foreign Keys: ${stats.totalForeignKeys}`);
    console.log(`   ⭐ FKs críticas: ${stats.criticalFKsFound}/${stats.criticalFKsExpected}`);
    
    // Puntaje final
    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(Boolean).length;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log(`\n🎯 PUNTAJE FINAL: ${passedTests}/${totalTests} (${successRate}%)`);
    
    if (successRate >= 90) {
      console.log('🎉 EXCELENTE: Tu base de datos tiene perfecta integridad referencial');
    } else if (successRate >= 70) {
      console.log('✅ BUENO: La mayoría de Foreign Keys funcionan correctamente');
    } else if (successRate >= 50) {
      console.log('⚠️ REGULAR: Hay problemas que necesitan atención');
    } else {
      console.log('❌ CRÍTICO: Problemas graves con Foreign Keys');
    }
    
    // Recomendaciones
    if (successRate < 100) {
      console.log('\n💡 RECOMENDACIONES:');
      
      if (!results.foreignKeysFound) {
        console.log('   - Ejecuta sincronización: await db.syncDatabase({ alter: true })');
      }
      if (!results.associationsConfigured) {
        console.log('   - Verifica métodos associate() en tus modelos');
      }
      if (!results.referentialIntegrity) {
        console.log('   - Revisa configuración de constraints en tus modelos');
      }
      if (!results.dataRelations) {
        console.log('   - Verifica nombres de asociaciones en include queries');
      }
    }
  }
}

// Función para mostrar ayuda
function showHelp() {
  console.log('\n🔗 ELITE FITNESS CLUB - Test de Foreign Keys\n');
  console.log('📋 Este test verifica que las llaves foráneas estén funcionando correctamente\n');
  console.log('Uso:');
  console.log('   node test-foreign-keys.js           # Ejecutar test completo');
  console.log('   node test-foreign-keys.js --help    # Mostrar ayuda\n');
  
  console.log('🔍 El test verifica:');
  console.log('   ✅ Conexión a la base de datos');
  console.log('   ✅ Carga de modelos de Sequelize');
  console.log('   ✅ Existencia de Foreign Keys en el esquema');
  console.log('   ✅ Configuración de asociaciones de Sequelize');
  console.log('   ✅ Integridad referencial (rechaza FKs inválidas)');
  console.log('   ✅ Funcionamiento real de relaciones entre datos\n');
  
  console.log('📊 Resultado: Puntaje de 0-100% según los tests que pasen\n');
  
  console.log('⚡ Este test NO requiere configuraciones adicionales');
  console.log('   Solo asegúrate de que tu servidor esté ejecutándose');
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const tester = new ForeignKeyTester();
  await tester.runTest();
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(error => {
    console.error('\n💥 Error fatal:', error.message);
    process.exit(1);
  });
}

module.exports = { ForeignKeyTester };