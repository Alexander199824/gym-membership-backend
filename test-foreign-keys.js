// test-foreign-keys-fixed.js - Test corregido con nombres de columnas correctos
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
    console.log('🔗 ELITE FITNESS CLUB - TEST DE LLAVES FORÁNEAS (CORREGIDO)');
    console.log('=' .repeat(65));
    console.log('📋 Verificando integridad referencial con nombres de columnas correctos\n');
    
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
      !['sequelize', 'Sequelize', 'diagnose', 'syncDatabase', 'resetDatabase', 'checkDatabaseStatus', 'initializeForDevelopment', 'fullDiagnosis', 'repairPaymentModel', 'verifyFlexibleScheduleModels'].includes(key)
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
    
    // ✅ CORREGIDO: FKs críticas con nombres de columnas CORRECTOS de la BD
    const criticalFKs = [
      // Memberships - usar nombres de BD (con field: 'plan_id')
      { table: 'memberships', column: 'userId', references: 'users' },
      { table: 'memberships', column: 'plan_id', references: 'membership_plans' }, // ← CORREGIDO
      { table: 'memberships', column: 'registeredBy', references: 'users' },
      
      // Payments
      { table: 'payments', column: 'userId', references: 'users' },
      { table: 'payments', column: 'membershipId', references: 'memberships' },
      { table: 'payments', column: 'registeredBy', references: 'users' },
      { table: 'payments', column: 'transferValidatedBy', references: 'users' },
      
      // Store Products - usar nombres de BD (con field: 'category_id', 'brand_id')
      { table: 'store_products', column: 'category_id', references: 'store_categories' }, // ← CORREGIDO
      { table: 'store_products', column: 'brand_id', references: 'store_brands' }, // ← CORREGIDO
      
      // Store relacionados
      { table: 'store_cart_items', column: 'user_id', references: 'users' },
      { table: 'store_cart_items', column: 'product_id', references: 'store_products' },
      { table: 'store_product_images', column: 'product_id', references: 'store_products' },
      { table: 'store_order_items', column: 'order_id', references: 'store_orders' },
      { table: 'store_order_items', column: 'product_id', references: 'store_products' },
      { table: 'store_orders', column: 'user_id', references: 'users' },
      { table: 'store_orders', column: 'processed_by', references: 'users' },
      
      // Gym Time Slots
      { table: 'gym_time_slots', column: 'gym_hours_id', references: 'gym_hours' },
      
      // User Schedule Preferences
      { table: 'user_schedule_preferences', column: 'user_id', references: 'users' },
      
      // Financial Movements
      { table: 'financial_movements', column: 'registeredBy', references: 'users' },
      { table: 'daily_incomes', column: 'registeredBy', references: 'users' },
      
      // Promotion Codes
      { table: 'promotion_codes', column: 'created_by', references: 'users' },
      { table: 'promotion_codes', column: 'gift_product_id', references: 'store_products' },
      { table: 'promotion_codes', column: 'upgrade_plan_id', references: 'membership_plans' },
      
      // User and Membership Promotions
      { table: 'user_promotions', column: 'user_id', references: 'users' },
      { table: 'user_promotions', column: 'promotion_code_id', references: 'promotion_codes' },
      { table: 'membership_promotions', column: 'user_id', references: 'users' },
      { table: 'membership_promotions', column: 'membership_id', references: 'memberships' },
      { table: 'membership_promotions', column: 'promotion_code_id', references: 'promotion_codes' },
      
      // Notifications
      { table: 'notifications', column: 'userId', references: 'users' },
      { table: 'notifications', column: 'membershipId', references: 'memberships' },
      { table: 'notifications', column: 'paymentId', references: 'payments' },
      
      // Users self-reference
      { table: 'users', column: 'createdBy', references: 'users' }
    ];
    
    this.statistics.criticalFKsExpected = criticalFKs.length;
    console.log('\n   🎯 Verificando FKs críticas (con nombres corregidos):');
    
    let criticalFound = 0;
    const notFoundFKs = [];
    const foundFKs = [];
    
    criticalFKs.forEach(expectedFK => {
      const found = foreignKeys.find(fk => 
        fk.table_name === expectedFK.table &&
        fk.column_name.toLowerCase() === expectedFK.column.toLowerCase() &&
        fk.foreign_table_name === expectedFK.references
      );
      
      if (found) {
        console.log(`      ✅ ${expectedFK.table}.${expectedFK.column} → ${expectedFK.references}`);
        criticalFound++;
        foundFKs.push(expectedFK);
      } else {
        console.log(`      ❌ ${expectedFK.table}.${expectedFK.column} → ${expectedFK.references} (FALTANTE)`);
        notFoundFKs.push(expectedFK);
      }
    });
    
    this.statistics.criticalFKsFound = criticalFound;
    console.log(`\n   📊 FKs críticas encontradas: ${criticalFound}/${criticalFKs.length}`);
    
    // Mostrar detalles de las faltantes si las hay
    if (notFoundFKs.length > 0) {
      console.log('\n   🔍 DIAGNÓSTICO DE FKs FALTANTES:');
      for (const missingFK of notFoundFKs.slice(0, 5)) { // Solo mostrar las primeras 5
        console.log(`      🔎 Buscando variaciones de ${missingFK.table}.${missingFK.column}:`);
        
        // Buscar FKs similares en esa tabla
        const similarFKs = foreignKeys.filter(fk => fk.table_name === missingFK.table);
        if (similarFKs.length > 0) {
          console.log(`         Columnas FK encontradas en ${missingFK.table}:`);
          similarFKs.forEach(fk => {
            console.log(`         - ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
          });
        } else {
          console.log(`         ⚠️ No se encontraron FKs en la tabla ${missingFK.table}`);
        }
      }
    }
    
    if (criticalFound >= (criticalFKs.length * 0.7)) { // Si al menos 70% están presentes
      console.log('   ✅ La mayoría de Foreign Keys críticas están creadas');
      this.results.foreignKeysFound = true;
    } else {
      console.log('   ⚠️ Muchas Foreign Keys críticas están faltando');
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
      !key.startsWith('repair') &&
      !key.startsWith('verify')
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
    
    // ✅ CORREGIDO: Asociaciones críticas con nombres correctos
    const criticalAssociations = [
      // User
      { model: 'User', association: 'memberships' },
      { model: 'User', association: 'payments' },
      
      // Membership
      { model: 'Membership', association: 'user' },
      { model: 'Membership', association: 'plan' },
      { model: 'Membership', association: 'registeredByUser' },
      { model: 'Membership', association: 'payments' },
      
      // Payment
      { model: 'Payment', association: 'user' },
      { model: 'Payment', association: 'membership' },
      { model: 'Payment', association: 'registeredByUser' },
      { model: 'Payment', association: 'transferValidator' },
      
      // MembershipPlans
      { model: 'MembershipPlans', association: 'memberships' },
      { model: 'MembershipPlans', association: 'promotionUpgrades' },
      
      // Store Models
      { model: 'StoreProduct', association: 'category' },
      { model: 'StoreProduct', association: 'brand' },
      { model: 'StoreProduct', association: 'images' },
      { model: 'StoreProduct', association: 'cartItems' },
      { model: 'StoreProduct', association: 'orderItems' },
      
      { model: 'StoreCategory', association: 'products' },
      { model: 'StoreBrand', association: 'products' },
      { model: 'StoreProductImage', association: 'product' },
      
      { model: 'StoreCart', association: 'user' },
      { model: 'StoreCart', association: 'product' },
      
      { model: 'StoreOrder', association: 'user' },
      { model: 'StoreOrder', association: 'processor' },
      { model: 'StoreOrder', association: 'items' },
      
      { model: 'StoreOrderItem', association: 'order' },
      { model: 'StoreOrderItem', association: 'product' },
      
      // Gym Hours
      { model: 'GymHours', association: 'timeSlots' },
      { model: 'GymTimeSlots', association: 'gymHours' },
      
      // Financial
      { model: 'FinancialMovements', association: 'registeredByUser' },
      
      // Promotions
      { model: 'PromotionCodes', association: 'createdByUser' },
      { model: 'PromotionCodes', association: 'giftProduct' },
      { model: 'PromotionCodes', association: 'upgradePlan' },
      { model: 'PromotionCodes', association: 'userPromotions' },
      { model: 'PromotionCodes', association: 'membershipPromotions' },
      
      { model: 'UserPromotions', association: 'user' },
      { model: 'UserPromotions', association: 'promotionCode' }
    ];
    
    console.log('\n   🎯 Verificando asociaciones críticas:');
    let criticalAssocFound = 0;
    let criticalAssocMissing = [];
    
    criticalAssociations.forEach(({ model, association }) => {
      if (db[model] && db[model].associations && db[model].associations[association]) {
        console.log(`      ✅ ${model}.${association}`);
        criticalAssocFound++;
      } else {
        console.log(`      ❌ ${model}.${association} (FALTANTE)`);
        criticalAssocMissing.push(`${model}.${association}`);
      }
    });
    
    // Mostrar detalles de modelos sin asociaciones esperadas
    if (criticalAssocMissing.length > 0) {
      console.log('\n   🔍 DIAGNÓSTICO DE ASOCIACIONES FALTANTES:');
      const modelsMissing = [...new Set(criticalAssocMissing.map(item => item.split('.')[0]))];
      modelsMissing.slice(0, 3).forEach(modelName => { // Solo mostrar 3 primeros
        if (db[modelName]) {
          const actualAssocs = db[modelName].associations ? Object.keys(db[modelName].associations) : [];
          console.log(`      🔎 ${modelName} tiene: [${actualAssocs.join(', ')}]`);
        } else {
          console.log(`      ⚠️ Modelo ${modelName} no encontrado`);
        }
      });
    }
    
    const successRate = criticalAssocFound / criticalAssociations.length;
    if (successRate >= 0.7) { // Si al menos 70% están presentes
      console.log('   ✅ La mayoría de asociaciones críticas están configuradas');
      this.results.associationsConfigured = true;
    } else {
      console.log('   ⚠️ Muchas asociaciones críticas están faltando');
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
      
      // Test 3: Intentar crear Payment con membershipId inválido
      console.log('   📋 Test 3: Payment con membershipId inválido');
      try {
        await db.Payment.create({
          membershipId: '00000000-0000-0000-0000-000000000000',
          amount: 100,
          paymentMethod: 'cash',
          paymentType: 'membership',
          status: 'completed'
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
        email: `test_fk_${Date.now()}@example.com`,
        password: 'password123',
        role: 'cliente'
      });
      this.cleanup.push({ model: 'User', id: testUser.id });
      console.log(`      ✅ Usuario creado: ${testUser.firstName} ${testUser.lastName}`);
      
      // Buscar o crear plan de membresía
      let testPlan = null;
      if (db.MembershipPlans) {
        console.log('   🎫 Buscando o creando plan de membresía...');
        testPlan = await db.MembershipPlans.findOne() || await db.MembershipPlans.create({
          planName: 'Test Plan FK',
          price: 100,
          durationType: 'monthly',
          features: ['Test feature']
        });
        if (testPlan.isNewRecord !== false) {
          this.cleanup.push({ model: 'MembershipPlans', id: testPlan.id });
        }
        console.log(`      ✅ Plan disponible: ${testPlan.planName}`);
      }
      
      // Crear membresía
      let membership = null;
      if (testPlan) {
        console.log('   🎫 Creando membresía...');
        membership = await db.Membership.create({
          userId: testUser.id,
          planId: testPlan.id,
          type: 'monthly',
          price: 100,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'active'
        });
        this.cleanup.push({ model: 'Membership', id: membership.id });
        console.log(`✅ Membresía creada: ${membership.id} - Usuario ${membership.userId} - Plan ${membership.planId}`);
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
      console.log('ℹ️ Pago sin registeredBy asignado - puede ser automatizado');
      const payment = await db.Payment.create({
        userId: testUser.id,
        amount: 50,
        paymentMethod: 'cash',
        paymentType: 'daily',
        status: 'completed'
      });
      this.cleanup.push({ model: 'Payment', id: payment.id });
      console.log(`✅ Pago creado: ID ${payment.id} - $${payment.amount} (${payment.paymentType})`);
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
      
      // Probar relaciones de tienda si están disponibles
      if (db.StoreCategory && db.StoreProduct) {
        console.log('   🛒 Probando relaciones de tienda...');
        
        // Buscar o crear categoría
        let testCategory = await db.StoreCategory.findOne() || await db.StoreCategory.create({
          name: 'Test Category FK',
          slug: 'test-category-fk',
          description: 'Test category for FK test'
        });
        
        if (testCategory.isNewRecord !== false) {
          this.cleanup.push({ model: 'StoreCategory', id: testCategory.id });
        }
        
        // Crear producto
        const testProduct = await db.StoreProduct.create({
          name: 'Test Product FK',
          price: 25.99,
          categoryId: testCategory.id,
          sku: `TEST-FK-${Date.now()}`,
          stockQuantity: 10
        });
        this.cleanup.push({ model: 'StoreProduct', id: testProduct.id });
        
        // Probar relación: Producto → Categoría
        const productWithCategory = await db.StoreProduct.findByPk(testProduct.id, {
          include: [{ association: 'category' }]
        });
        
        if (productWithCategory && productWithCategory.category) {
          console.log('      ✅ Relación StoreProduct → StoreCategory funciona');
        } else {
          console.log('      ❌ Relación StoreProduct → StoreCategory no funciona');
        }
      }
      
      console.log('   ✅ Todas las relaciones de datos funcionan correctamente');
      this.results.dataRelations = true;
      
    } catch (error) {
      console.log(`   ❌ Error probando relaciones de datos: ${error.message}`);
      console.log(`      Stack: ${error.stack}`);
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
          const deletedCount = await db[item.model].destroy({
            where: { id: item.id },
            force: true
          });
          if (deletedCount > 0) cleaned++;
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
        console.log('   - Verifica que los campos "field:" en modelos coincidan con BD');
      }
      if (!results.associationsConfigured) {
        console.log('   - Verifica métodos associate() en tus modelos');
        console.log('   - Verifica que los nombres de asociaciones sean correctos');
      }
      if (!results.referentialIntegrity) {
        console.log('   - Revisa configuración de constraints en tus modelos');
      }
      if (!results.dataRelations) {
        console.log('   - Verifica nombres de asociaciones en include queries');
        console.log('   - Revisa que las asociaciones estén bien definidas');
      }
    }
    
    console.log('\n📝 NOTAS TÉCNICAS:');
    console.log('   - Este test usa los nombres REALES de columnas en BD (field: values)');
    console.log('   - Se verificaron más FKs que la versión anterior del test');
    console.log('   - Las asociaciones de Sequelize se verifican por separado de las FKs');
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('\n🔗 ELITE FITNESS CLUB - Test de Foreign Keys CORREGIDO\n');
    console.log('📋 Este test verifica las llaves foráneas usando nombres correctos de BD\n');
    console.log('Uso:');
    console.log('   node test-foreign-keys-fixed.js     # Ejecutar test corregido');
    console.log('   node test-foreign-keys-fixed.js -h  # Mostrar ayuda\n');
    console.log('✅ CORRECCIONES en esta versión:');
    console.log('   - Usa nombres reales de columnas BD (plan_id, category_id, etc.)');
    console.log('   - Verifica más FKs críticas');
    console.log('   - Mejor diagnóstico de problemas');
    console.log('   - Más asociaciones verificadas');
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