// clean-fk-test.js - Test MEJORADO - Solo verificación, sin modificar nada
const { sequelize } = require('./src/config/database');

class CleanFKVerificationTest {
  constructor() {
    this.expectedFKs = [
      // Users (auto-referencial)
      { table: 'users', column: 'createdBy', references: 'users', referencedColumn: 'id', description: 'Usuario creador' },
      
      // Memberships
      { table: 'memberships', column: 'userId', references: 'users', referencedColumn: 'id', description: 'Usuario propietario' },
      { table: 'memberships', column: 'plan_id', references: 'membership_plans', referencedColumn: 'id', description: 'Plan de membresía' },
      { table: 'memberships', column: 'registeredBy', references: 'users', referencedColumn: 'id', description: 'Usuario registrador' },
      
      // Payments
      { table: 'payments', column: 'userId', references: 'users', referencedColumn: 'id', description: 'Usuario pagador' },
      { table: 'payments', column: 'membershipId', references: 'memberships', referencedColumn: 'id', description: 'Membresía asociada' },
      { table: 'payments', column: 'registeredBy', references: 'users', referencedColumn: 'id', description: 'Usuario que registró' },
      { table: 'payments', column: 'transferValidatedBy', references: 'users', referencedColumn: 'id', description: 'Validador transferencia' },
      
      // Store Products
      { table: 'store_products', column: 'category_id', references: 'store_categories', referencedColumn: 'id', description: 'Categoría producto' },
      { table: 'store_products', column: 'brand_id', references: 'store_brands', referencedColumn: 'id', description: 'Marca producto' },
      
      // Store Product Images
      { table: 'store_product_images', column: 'product_id', references: 'store_products', referencedColumn: 'id', description: 'Producto imagen' },
      
      // Store Cart
      { table: 'store_cart_items', column: 'user_id', references: 'users', referencedColumn: 'id', description: 'Usuario carrito' },
      { table: 'store_cart_items', column: 'product_id', references: 'store_products', referencedColumn: 'id', description: 'Producto carrito' },
      
      // Store Orders
      { table: 'store_orders', column: 'user_id', references: 'users', referencedColumn: 'id', description: 'Usuario orden' },
      { table: 'store_orders', column: 'processed_by', references: 'users', referencedColumn: 'id', description: 'Procesador orden' },
      
      // Store Order Items
      { table: 'store_order_items', column: 'order_id', references: 'store_orders', referencedColumn: 'id', description: 'Orden item' },
      { table: 'store_order_items', column: 'product_id', references: 'store_products', referencedColumn: 'id', description: 'Producto item' },
      
      // Gym Time Slots
      { table: 'gym_time_slots', column: 'gym_hours_id', references: 'gym_hours', referencedColumn: 'id', description: 'Horario gym' },
      
      // User Schedule Preferences
      { table: 'user_schedule_preferences', column: 'user_id', references: 'users', referencedColumn: 'id', description: 'Usuario preferencia' },
      
      // Financial Movements
      { table: 'financial_movements', column: 'registeredBy', references: 'users', referencedColumn: 'id', description: 'Registrador movimiento' },
      
      // Daily Income
      { table: 'daily_incomes', column: 'registeredBy', references: 'users', referencedColumn: 'id', description: 'Registrador ingreso' },
      
      // Promotion Codes
      { table: 'promotion_codes', column: 'created_by', references: 'users', referencedColumn: 'id', description: 'Creador promoción' },
      { table: 'promotion_codes', column: 'gift_product_id', references: 'store_products', referencedColumn: 'id', description: 'Producto regalo' },
      { table: 'promotion_codes', column: 'upgrade_plan_id', references: 'membership_plans', referencedColumn: 'id', description: 'Plan upgrade' },
      
      // User Promotions
      { table: 'user_promotions', column: 'user_id', references: 'users', referencedColumn: 'id', description: 'Usuario promoción' },
      { table: 'user_promotions', column: 'promotion_code_id', references: 'promotion_codes', referencedColumn: 'id', description: 'Código promoción' },
      
      // Membership Promotions
      { table: 'membership_promotions', column: 'user_id', references: 'users', referencedColumn: 'id', description: 'Usuario membresía promo' },
      { table: 'membership_promotions', column: 'membership_id', references: 'memberships', referencedColumn: 'id', description: 'Membresía promo' },
      { table: 'membership_promotions', column: 'promotion_code_id', references: 'promotion_codes', referencedColumn: 'id', description: 'Código promo membresía' },
      
      // Notifications
      { table: 'notifications', column: 'userId', references: 'users', referencedColumn: 'id', description: 'Usuario notificación' },
      { table: 'notifications', column: 'membershipId', references: 'memberships', referencedColumn: 'id', description: 'Membresía notificación' },
      { table: 'notifications', column: 'paymentId', references: 'payments', referencedColumn: 'id', description: 'Pago notificación' }
    ];

    this.expectedAssociations = [
      // User associations
      { model: 'User', association: 'memberships', type: 'HasMany', target: 'Membership' },
      { model: 'User', association: 'payments', type: 'HasMany', target: 'Payment' },
      
      // MembershipPlans associations  
      { model: 'MembershipPlans', association: 'memberships', type: 'HasMany', target: 'Membership' },
      { model: 'MembershipPlans', association: 'promotionUpgrades', type: 'HasMany', target: 'PromotionCodes' },
      
      // Membership associations
      { model: 'Membership', association: 'user', type: 'BelongsTo', target: 'User' },
      { model: 'Membership', association: 'plan', type: 'BelongsTo', target: 'MembershipPlans' },
      { model: 'Membership', association: 'registeredByUser', type: 'BelongsTo', target: 'User' },
      { model: 'Membership', association: 'payments', type: 'HasMany', target: 'Payment' },
      
      // Payment associations
      { model: 'Payment', association: 'user', type: 'BelongsTo', target: 'User' },
      { model: 'Payment', association: 'membership', type: 'BelongsTo', target: 'Membership' },
      { model: 'Payment', association: 'registeredByUser', type: 'BelongsTo', target: 'User' },
      { model: 'Payment', association: 'transferValidator', type: 'BelongsTo', target: 'User' },
      
      // Store associations
      { model: 'StoreProduct', association: 'category', type: 'BelongsTo', target: 'StoreCategory' },
      { model: 'StoreProduct', association: 'brand', type: 'BelongsTo', target: 'StoreBrand' },
      { model: 'StoreProduct', association: 'images', type: 'HasMany', target: 'StoreProductImage' },
      { model: 'StoreProduct', association: 'cartItems', type: 'HasMany', target: 'StoreCart' },
      { model: 'StoreProduct', association: 'orderItems', type: 'HasMany', target: 'StoreOrderItem' },
      
      { model: 'StoreCategory', association: 'products', type: 'HasMany', target: 'StoreProduct' },
      { model: 'StoreBrand', association: 'products', type: 'HasMany', target: 'StoreProduct' },
      { model: 'StoreProductImage', association: 'product', type: 'BelongsTo', target: 'StoreProduct' },
      
      // Cart and Orders
      { model: 'StoreCart', association: 'user', type: 'BelongsTo', target: 'User' },
      { model: 'StoreCart', association: 'product', type: 'BelongsTo', target: 'StoreProduct' },
      { model: 'StoreOrder', association: 'user', type: 'BelongsTo', target: 'User' },
      { model: 'StoreOrder', association: 'processor', type: 'BelongsTo', target: 'User' },
      { model: 'StoreOrder', association: 'items', type: 'HasMany', target: 'StoreOrderItem' },
      { model: 'StoreOrderItem', association: 'order', type: 'BelongsTo', target: 'StoreOrder' },
      { model: 'StoreOrderItem', association: 'product', type: 'BelongsTo', target: 'StoreProduct' },
      
      // Gym schedules
      { model: 'GymHours', association: 'timeSlots', type: 'HasMany', target: 'GymTimeSlots' },
      { model: 'GymTimeSlots', association: 'gymHours', type: 'BelongsTo', target: 'GymHours' },
      
      // Financial and Promotions
      { model: 'FinancialMovements', association: 'registeredByUser', type: 'BelongsTo', target: 'User' },
      { model: 'PromotionCodes', association: 'createdByUser', type: 'BelongsTo', target: 'User' },
      { model: 'PromotionCodes', association: 'giftProduct', type: 'BelongsTo', target: 'StoreProduct' },
      { model: 'PromotionCodes', association: 'upgradePlan', type: 'BelongsTo', target: 'MembershipPlans' },
      { model: 'PromotionCodes', association: 'userPromotions', type: 'HasMany', target: 'UserPromotions' },
      { model: 'PromotionCodes', association: 'membershipPromotions', type: 'HasMany', target: 'MembershipPromotions' },
      
      { model: 'UserPromotions', association: 'user', type: 'BelongsTo', target: 'User' },
      { model: 'UserPromotions', association: 'promotionCode', type: 'BelongsTo', target: 'PromotionCodes' }
    ];
  }

  async runVerification() {
    console.log('\n🔍 ELITE FITNESS CLUB - VERIFICACIÓN COMPLETA DE INTEGRIDAD');
    console.log('═'.repeat(80));
    console.log('✅ MODO SOLO LECTURA - No modifica la base de datos');
    console.log('📋 Verifica Foreign Keys y Asociaciones de Sequelize\n');
    
    try {
      await this.verifyConnection();
      const models = await this.loadModels();
      const fkResults = await this.verifyForeignKeys();
      const assocResults = await this.verifyAssociations(models);
      
      this.generateFinalReport(fkResults, assocResults);
      
    } catch (error) {
      console.error('\n❌ ERROR EN VERIFICACIÓN:', error.message);
      process.exit(1);
    }
  }

  async verifyConnection() {
    console.log('🔌 VERIFICANDO CONEXIÓN A BASE DE DATOS');
    console.log('-'.repeat(50));
    
    try {
      await sequelize.authenticate();
      console.log('✅ Conexión exitosa a la base de datos');
      
      // Obtener info de la BD
      const [dbInfo] = await sequelize.query('SELECT version() as version, current_database() as database');
      if (dbInfo && dbInfo[0]) {
        console.log(`📊 Base de datos: ${dbInfo[0].database}`);
        const version = dbInfo[0].version.split(' ')[0] + ' ' + dbInfo[0].version.split(' ')[1];
        console.log(`🐘 Motor: ${version}`);
      }
      
    } catch (error) {
      throw new Error(`No se puede conectar a la BD: ${error.message}`);
    }
  }

  async loadModels() {
    console.log('\n📦 CARGANDO MODELOS DE SEQUELIZE');
    console.log('-'.repeat(50));
    
    try {
      // Cargar models desde el index
      const db = require('./src/models');
      
      // Filtrar solo modelos (no funciones de utilidad)
      const modelNames = Object.keys(db).filter(key => 
        !['sequelize', 'Sequelize', 'syncDatabase', 'resetDatabase', 'checkDatabaseStatus', 'initializeForDevelopment', 'diagnose', 'verifyFlexibleScheduleModels', 'fullDiagnosis', 'repairPaymentModel'].includes(key)
      );
      
      console.log(`✅ ${modelNames.length} modelos cargados correctamente`);
      console.log(`📋 Modelos: ${modelNames.join(', ')}`);
      
      return db;
      
    } catch (error) {
      throw new Error(`Error cargando modelos: ${error.message}`);
    }
  }

  async verifyForeignKeys() {
    console.log('\n🔗 VERIFICANDO FOREIGN KEYS EN LA BASE DE DATOS');
    console.log('-'.repeat(50));
    
    try {
      // Consultar FK existentes
      const query = `
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
      `;

      const [existingFKs] = await sequelize.query(query);
      
      console.log(`📊 Total Foreign Keys encontradas en BD: ${existingFKs.length}`);
      
      // Comparar con las esperadas
      const foundFKs = [];
      const missingFKs = [];
      
      for (const expectedFK of this.expectedFKs) {
        const found = existingFKs.find(fk => 
          fk.table_name === expectedFK.table &&
          fk.column_name === expectedFK.column &&
          fk.foreign_table_name === expectedFK.references &&
          fk.foreign_column_name === expectedFK.referencedColumn
        );

        if (found) {
          foundFKs.push({ ...expectedFK, constraintName: found.constraint_name });
        } else {
          missingFKs.push(expectedFK);
        }
      }

      // Identificar FK extras
      const extraFKs = existingFKs.filter(existingFK => {
        return !this.expectedFKs.find(expectedFK =>
          expectedFK.table === existingFK.table_name &&
          expectedFK.column === existingFK.column_name &&
          expectedFK.references === existingFK.foreign_table_name &&
          expectedFK.referencedColumn === existingFK.foreign_column_name
        );
      }).map(fk => ({
        table: fk.table_name,
        column: fk.column_name,
        references: fk.foreign_table_name,
        referencedColumn: fk.foreign_column_name,
        constraintName: fk.constraint_name,
        description: 'FK no esperada'
      }));

      console.log(`✅ Foreign Keys encontradas: ${foundFKs.length}/${this.expectedFKs.length}`);
      console.log(`❌ Foreign Keys faltantes: ${missingFKs.length}`);
      console.log(`➕ Foreign Keys extras: ${extraFKs.length}`);

      const percentage = ((foundFKs.length / this.expectedFKs.length) * 100).toFixed(1);
      console.log(`📈 Porcentaje completado: ${percentage}%`);

      return {
        found: foundFKs,
        missing: missingFKs,
        extra: extraFKs,
        percentage: parseFloat(percentage),
        total: this.expectedFKs.length
      };
      
    } catch (error) {
      throw new Error(`Error verificando Foreign Keys: ${error.message}`);
    }
  }

  async verifyAssociations(models) {
    console.log('\n🔄 VERIFICANDO ASOCIACIONES DE SEQUELIZE');
    console.log('-'.repeat(50));
    
    try {
      const foundAssociations = [];
      const missingAssociations = [];
      
      for (const expectedAssoc of this.expectedAssociations) {
        const model = models[expectedAssoc.model];
        
        if (!model) {
          missingAssociations.push({ ...expectedAssoc, reason: 'Modelo no encontrado' });
          continue;
        }
        
        const association = model.associations && model.associations[expectedAssoc.association];
        
        if (association) {
          const actualType = association.associationType;
          const actualTarget = association.target.name;
          
          // Verificar que coincida el tipo y target
          if (actualType === expectedAssoc.type && actualTarget === expectedAssoc.target) {
            foundAssociations.push({
              ...expectedAssoc,
              actualType,
              actualTarget,
              status: 'perfect_match'
            });
          } else {
            foundAssociations.push({
              ...expectedAssoc,
              actualType,
              actualTarget,
              status: 'partial_match',
              issues: [
                actualType !== expectedAssoc.type ? `Tipo: esperado ${expectedAssoc.type}, encontrado ${actualType}` : null,
                actualTarget !== expectedAssoc.target ? `Target: esperado ${expectedAssoc.target}, encontrado ${actualTarget}` : null
              ].filter(Boolean)
            });
          }
        } else {
          missingAssociations.push({ ...expectedAssoc, reason: 'Asociación no encontrada' });
        }
      }
      
      const perfectMatches = foundAssociations.filter(a => a.status === 'perfect_match').length;
      const partialMatches = foundAssociations.filter(a => a.status === 'partial_match').length;
      
      console.log(`✅ Asociaciones perfectas: ${perfectMatches}/${this.expectedAssociations.length}`);
      console.log(`⚠️ Asociaciones parciales: ${partialMatches}`);
      console.log(`❌ Asociaciones faltantes: ${missingAssociations.length}`);
      
      const assocPercentage = (((perfectMatches + partialMatches) / this.expectedAssociations.length) * 100).toFixed(1);
      console.log(`📈 Porcentaje asociaciones: ${assocPercentage}%`);
      
      return {
        found: foundAssociations,
        missing: missingAssociations,
        perfectMatches,
        partialMatches,
        percentage: parseFloat(assocPercentage),
        total: this.expectedAssociations.length
      };
      
    } catch (error) {
      throw new Error(`Error verificando asociaciones: ${error.message}`);
    }
  }

  generateFinalReport(fkResults, assocResults) {
    console.log('\n📋 REPORTE FINAL DE INTEGRIDAD');
    console.log('═'.repeat(80));
    
    // Resumen ejecutivo
    console.log('\n📊 RESUMEN EJECUTIVO:');
    console.log(`🔗 Foreign Keys: ${fkResults.found.length}/${fkResults.total} (${fkResults.percentage}%)`);
    console.log(`🔄 Asociaciones: ${assocResults.perfectMatches + assocResults.partialMatches}/${assocResults.total} (${assocResults.percentage}%)`);
    
    // Calcular score general
    const generalScore = ((fkResults.percentage + assocResults.percentage) / 2).toFixed(1);
    console.log(`🎯 Score General: ${generalScore}%`);
    
    // Diagnóstico
    if (generalScore >= 95) {
      console.log('\n🎉 EXCELENTE - Tu base de datos tiene integridad perfecta');
      console.log('   ✅ Todas las relaciones están correctamente configuradas');
      console.log('   ✅ El sistema puede funcionar sin problemas');
    } else if (generalScore >= 80) {
      console.log('\n✅ BUENO - Tu base de datos es funcional');
      console.log('   ⚠️ Algunas relaciones menores pueden faltar');
      console.log('   💡 Se recomienda completar las FK/asociaciones faltantes');
    } else if (generalScore >= 60) {
      console.log('\n⚠️ REGULAR - Problemas de integridad moderados');
      console.log('   🔧 Varias relaciones importantes faltan');
      console.log('   🚨 El sistema puede tener errores en algunas funciones');
    } else {
      console.log('\n🚨 CRÍTICO - Problemas graves de integridad');
      console.log('   ❌ Muchas relaciones críticas faltan');
      console.log('   🛑 El sistema probablemente tendrá errores frecuentes');
    }
    
    // Detalles de problemas críticos
    if (fkResults.missing.length > 0) {
      console.log('\n❌ FOREIGN KEYS FALTANTES CRÍTICAS:');
      fkResults.missing.slice(0, 10).forEach(fk => {
        console.log(`   🔴 ${fk.table}.${fk.column} → ${fk.references}.${fk.referencedColumn}`);
        console.log(`      💬 ${fk.description}`);
      });
      
      if (fkResults.missing.length > 10) {
        console.log(`   ... y ${fkResults.missing.length - 10} más`);
      }
    }
    
    if (assocResults.missing.length > 0) {
      console.log('\n❌ ASOCIACIONES FALTANTES CRÍTICAS:');
      assocResults.missing.slice(0, 10).forEach(assoc => {
        console.log(`   🔴 ${assoc.model}.${assoc.association} (${assoc.type} → ${assoc.target})`);
        console.log(`      💬 ${assoc.reason}`);
      });
      
      if (assocResults.missing.length > 10) {
        console.log(`   ... y ${assocResults.missing.length - 10} más`);
      }
    }
    
    // FK extras (informativo)
    if (fkResults.extra.length > 0) {
      console.log('\n➕ FOREIGN KEYS ADICIONALES (no críticas):');
      fkResults.extra.slice(0, 5).forEach(fk => {
        console.log(`   🟡 ${fk.table}.${fk.column} → ${fk.references}.${fk.referencedColumn}`);
      });
      
      if (fkResults.extra.length > 5) {
        console.log(`   ... y ${fkResults.extra.length - 5} más`);
      }
    }
    
    // Resumen por categorías
    console.log('\n📋 ANÁLISIS POR CATEGORÍAS:');
    this.analyzeByCategoryFK(fkResults.found, fkResults.missing);
    
    console.log('\n✅ VERIFICACIÓN COMPLETADA - Base de datos NO modificada');
    console.log('📄 Reporte generado exitosamente');
    
    return {
      fkScore: fkResults.percentage,
      assocScore: assocResults.percentage,
      generalScore: parseFloat(generalScore),
      fkFound: fkResults.found.length,
      fkMissing: fkResults.missing.length,
      assocFound: assocResults.perfectMatches + assocResults.partialMatches,
      assocMissing: assocResults.missing.length
    };
  }

  analyzeByCategoryFK(foundFKs, missingFKs) {
    const categories = {
      'Usuarios': ['users'],
      'Membresías': ['memberships', 'membership_plans'],
      'Pagos': ['payments'],
      'Tienda': ['store_products', 'store_categories', 'store_brands', 'store_cart_items', 'store_orders', 'store_order_items', 'store_product_images'],
      'Gym': ['gym_hours', 'gym_time_slots', 'user_schedule_preferences'],
      'Promociones': ['promotion_codes', 'user_promotions', 'membership_promotions'],
      'Sistema': ['financial_movements', 'daily_incomes', 'notifications']
    };
    
    Object.entries(categories).forEach(([categoryName, tables]) => {
      const categoryFound = foundFKs.filter(fk => tables.includes(fk.table)).length;
      const categoryMissing = missingFKs.filter(fk => tables.includes(fk.table)).length;
      const categoryTotal = categoryFound + categoryMissing;
      
      if (categoryTotal > 0) {
        const categoryPercentage = ((categoryFound / categoryTotal) * 100).toFixed(0);
        const status = categoryPercentage == 100 ? '✅' : categoryPercentage >= 80 ? '⚠️' : '❌';
        console.log(`   ${status} ${categoryName}: ${categoryFound}/${categoryTotal} (${categoryPercentage}%)`);
      }
    });
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const test = new CleanFKVerificationTest();
  test.runVerification()
    .then(() => {
      console.log('\n🎯 Test completado exitosamente');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💀 Error en test:', error.message);
      process.exit(1);
    });
}

module.exports = CleanFKVerificationTest;