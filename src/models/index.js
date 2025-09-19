// src/models/index.js - VERSIÓN COMPLETA FUSIONADA CON TODAS LAS FUNCIONALIDADES
'use strict';

const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');
const { Sequelize, DataTypes } = require('sequelize');

const basename = path.basename(__filename);
const db = {};

console.log('📦 Iniciando carga COMPLETA de modelos con funcionalidades avanzadas...');

// ✅ Verificar que sequelize esté disponible
if (!sequelize) {
  throw new Error('❌ No se pudo obtener la instancia de Sequelize');
}

console.log('✅ Conexión a base de datos disponible');

// ============================================================================
// CARGA EXPLÍCITA DE MODELOS EXISTENTES (DEL ARCHIVO ORIGINAL)
// ============================================================================

console.log('📦 Cargando modelos explícitos existentes...');

// ✅ === MODELOS EXISTENTES ===
const loadExplicitModel = (modelName, filePath) => {
  try {
    const fullPath = path.join(__dirname, filePath || `${modelName}.js`);
    
    if (fs.existsSync(fullPath)) {
      delete require.cache[require.resolve(fullPath)];
      const model = require(fullPath);
      
      if (model && (model.name || model.modelName)) {
        const name = model.name || model.modelName || modelName;
        db[name] = model;
        console.log(`   ✅ ${name} cargado explícitamente`);
        return model;
      } else {
        console.log(`   ⚠️ ${modelName} no es un modelo válido`);
        return null;
      }
    } else {
      console.log(`   ⚠️ ${filePath || modelName + '.js'} no encontrado`);
      return null;
    }
  } catch (error) {
    console.error(`   ❌ Error cargando ${modelName}:`, error.message);
    return null;
  }
};

// Cargar modelos explícitos en el orden correcto
const explicitModels = [
  'User',
  'Membership', 
  'Payment',
  'FinancialMovements',
  'StoreCategory',
  'StoreBrand', 
  'StoreProduct',
  'StoreProductImage',
  'StoreCart',
  'StoreOrder',
  'StoreOrderItem',
  'LocalSale',
  'LocalSaleItem', 
  'TransferConfirmation',
  'MembershipPlans',
  'GymConfiguration',
  'GymHours',
  'GymTimeSlots',
  'DailyIncome',
  'GymBrandingConfig',
  'GymContactInfo',
  'GymFormsConfig',
  'GymNavigation',
  'GymPromotionalContent',
  'GymSectionsContent',
  'GymServices',
  'GymSocialMedia',
  'GymStatistics',
  'GymSystemMessages',
  'GymTestimonials',
  'PromotionCodes',
  'MembershipPromotions',
  'Notification',
  'UserPromotions',
  'UserSchedulePreferences'
];

explicitModels.forEach(modelName => {
  loadExplicitModel(modelName);
});

// ============================================================================
// CARGA DINÁMICA DE MODELOS ADICIONALES (DEL ARCHIVO MEJORADO)
// ============================================================================

// ✅ FUNCIÓN para descubrir TODOS los modelos disponibles
const discoverAllModels = () => {
  console.log('🔍 Descubriendo modelos adicionales...');
  
  const allModelFiles = fs.readdirSync(__dirname)
    .filter(file => {
      return (
        file.indexOf('.') !== 0 &&
        file !== basename &&
        file.slice(-3) === '.js' &&
        file.indexOf('.test.js') === -1 &&
        file !== 'index.js'
      );
    });
  
  console.log(`📁 Archivos adicionales encontrados: ${allModelFiles.length}`);
  
  return allModelFiles;
};

// ✅ FUNCIÓN para cargar un modelo específico dinámicamente
const loadModel = (filename) => {
  try {
    const modelPath = path.join(__dirname, filename);
    
    if (!fs.existsSync(modelPath)) {
      return null;
    }
    
    const baseName = filename.replace('.js', '');
    
    // Verificar si ya está cargado
    const existingModel = Object.keys(db).find(key => 
      key === baseName || key.toLowerCase() === baseName.toLowerCase()
    );
    
    if (existingModel) {
      console.log(`   ℹ️ ${baseName} ya está cargado como ${existingModel}`);
      return db[existingModel];
    }
    
    console.log(`🔄 Cargando dinámicamente: ${filename}`);
    
    // Limpiar cache para re-importar
    delete require.cache[require.resolve(modelPath)];
    
    const modelModule = require(modelPath);
    
    // ✅ Validar que es un modelo de Sequelize válido
    if (modelModule && (modelModule.name || modelModule.modelName)) {
      const modelName = modelModule.name || modelModule.modelName;
      
      // Verificar que tiene métodos de Sequelize
      if (typeof modelModule.findAll === 'function' || 
          typeof modelModule.create === 'function') {
        
        db[modelName] = modelModule;
        console.log(`   ✅ ${modelName} cargado dinámicamente`);
        
        if (modelModule.tableName) {
          console.log(`      📋 Tabla: ${modelModule.tableName}`);
        }
        
        return modelModule;
      } else {
        console.log(`   ⚠️ ${filename} - No tiene métodos de Sequelize`);
        return null;
      }
    } else {
      console.log(`   ⚠️ ${filename} - No es un modelo válido`);
      return null;
    }
    
  } catch (error) {
    console.error(`❌ Error cargando dinámicamente ${filename}:`, error.message);
    return null;
  }
};

// ✅ CARGAR TODOS LOS MODELOS ADICIONALES NO CARGADOS EXPLÍCITAMENTE
console.log('📁 Buscando y cargando modelos adicionales...');
const allDiscoveredFiles = discoverAllModels();
const explicitFiles = explicitModels.map(name => `${name}.js`);
const additionalFiles = allDiscoveredFiles.filter(file => !explicitFiles.includes(file));

console.log(`📦 Modelos adicionales a cargar: ${additionalFiles.length}`);
if (additionalFiles.length > 0) {
  console.log(`📋 Archivos adicionales: ${additionalFiles.join(', ')}`);
  
  additionalFiles.forEach(file => {
    loadModel(file);
  });
} else {
  console.log('ℹ️ No hay modelos adicionales fuera de la lista explícita');
}

// ============================================================================
// CONFIGURACIÓN DE ASOCIACIONES COMBINADA
// ============================================================================

console.log('🔗 Configurando asociaciones...');

const configureAssociations = () => {
  const loadedModels = Object.keys(db).filter(key => 
    !['sequelize', 'Sequelize'].includes(key) && 
    !key.startsWith('_') && 
    typeof db[key] === 'object' && 
    db[key].name
  );
  
  console.log(`📊 Modelos disponibles para asociaciones: ${loadedModels.join(', ')}`);
  
  // ✅ Configurar asociaciones automáticas
  loadedModels.forEach(modelName => {
    const model = db[modelName];
    
    if (model && typeof model.associate === 'function') {
      try {
        console.log(`🔗 Configurando asociaciones automáticas para: ${modelName}`);
        model.associate(db);
        
        const associations = model.associations;
        if (associations && Object.keys(associations).length > 0) {
          console.log(`   ✅ ${Object.keys(associations).length} asociaciones automáticas creadas`);
          Object.keys(associations).forEach(assocName => {
            console.log(`      - ${assocName}: ${associations[assocName].associationType}`);
          });
        } else {
          console.log(`   ℹ️ No se crearon asociaciones automáticas`);
        }
      } catch (error) {
        console.error(`   ❌ Error en asociaciones automáticas de ${modelName}:`, error.message);
      }
    } else {
      console.log(`   ℹ️ ${modelName} no tiene método associate`);
    }
  });
  
  // ✅ CREAR ASOCIACIONES MANUALES CRÍTICAS
  console.log('🔧 Creando asociaciones manuales críticas...');
  
  try {
    // User - Membership
    if (db.User && db.Membership) {
      if (!db.User.associations?.memberships) {
        db.User.hasMany(db.Membership, { foreignKey: 'userId', as: 'memberships' });
        console.log('   ✅ Manual: User -> Membership');
      }
      if (!db.Membership.associations?.user) {
        db.Membership.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
        console.log('   ✅ Manual: Membership -> User');
      }
    }
    
    // MembershipPlans - Membership
    if (db.MembershipPlans && db.Membership) {
      if (!db.MembershipPlans.associations?.memberships) {
        db.MembershipPlans.hasMany(db.Membership, { foreignKey: 'planId', as: 'memberships' });
        console.log('   ✅ Manual: MembershipPlans -> Membership');
      }
      if (!db.Membership.associations?.plan) {
        db.Membership.belongsTo(db.MembershipPlans, { foreignKey: 'planId', as: 'plan' });
        console.log('   ✅ Manual: Membership -> MembershipPlans');
      }
    }
    
    // User - Payment
    if (db.User && db.Payment) {
      if (!db.User.associations?.payments) {
        db.User.hasMany(db.Payment, { foreignKey: 'userId', as: 'payments' });
        console.log('   ✅ Manual: User -> Payment');
      }
      if (!db.Payment.associations?.user) {
        db.Payment.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
        console.log('   ✅ Manual: Payment -> User');
      }
    }
    
    // Payment - Membership
    if (db.Payment && db.Membership) {
      if (!db.Payment.associations?.membership) {
        db.Payment.belongsTo(db.Membership, { foreignKey: 'membershipId', as: 'membership' });
        console.log('   ✅ Manual: Payment -> Membership');
      }
    }
    
    // ✅ ASOCIACIONES DE TIENDA CRÍTICAS
    // StoreProduct - StoreCategory
    if (db.StoreProduct && db.StoreCategory) {
      if (!db.StoreProduct.associations?.category) {
        db.StoreProduct.belongsTo(db.StoreCategory, { foreignKey: 'categoryId', as: 'category' });
        console.log('   ✅ Manual: StoreProduct -> StoreCategory');
      }
      if (!db.StoreCategory.associations?.products) {
        db.StoreCategory.hasMany(db.StoreProduct, { foreignKey: 'categoryId', as: 'products' });
        console.log('   ✅ Manual: StoreCategory -> StoreProduct');
      }
    }
    
    // StoreProduct - StoreBrand
    if (db.StoreProduct && db.StoreBrand) {
      if (!db.StoreProduct.associations?.brand) {
        db.StoreProduct.belongsTo(db.StoreBrand, { foreignKey: 'brandId', as: 'brand' });
        console.log('   ✅ Manual: StoreProduct -> StoreBrand');
      }
      if (!db.StoreBrand.associations?.products) {
        db.StoreBrand.hasMany(db.StoreProduct, { foreignKey: 'brandId', as: 'products' });
        console.log('   ✅ Manual: StoreBrand -> StoreProduct');
      }
    }
    
    // StoreProduct - StoreProductImage
    if (db.StoreProduct && db.StoreProductImage) {
      if (!db.StoreProduct.associations?.images) {
        db.StoreProduct.hasMany(db.StoreProductImage, { foreignKey: 'productId', as: 'images' });
        console.log('   ✅ Manual: StoreProduct -> StoreProductImage');
      }
      if (!db.StoreProductImage.associations?.product) {
        db.StoreProductImage.belongsTo(db.StoreProduct, { foreignKey: 'productId', as: 'product' });
        console.log('   ✅ Manual: StoreProductImage -> StoreProduct');
      }
    }
    
    // StoreCart - StoreProduct y User
    if (db.StoreCart && db.StoreProduct) {
      if (!db.StoreCart.associations?.product) {
        db.StoreCart.belongsTo(db.StoreProduct, { foreignKey: 'productId', as: 'product' });
        console.log('   ✅ Manual: StoreCart -> StoreProduct');
      }
    }
    
    if (db.StoreCart && db.User) {
      if (!db.StoreCart.associations?.user) {
        db.StoreCart.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
        console.log('   ✅ Manual: StoreCart -> User');
      }
    }
    
    // StoreOrder - User y StoreOrderItem
    if (db.StoreOrder && db.User) {
      if (!db.StoreOrder.associations?.user) {
        db.StoreOrder.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
        console.log('   ✅ Manual: StoreOrder -> User');
      }
    }
    
    if (db.StoreOrder && db.StoreOrderItem) {
      if (!db.StoreOrder.associations?.items) {
        db.StoreOrder.hasMany(db.StoreOrderItem, { foreignKey: 'orderId', as: 'items' });
        console.log('   ✅ Manual: StoreOrder -> StoreOrderItem');
      }
      if (!db.StoreOrderItem.associations?.order) {
        db.StoreOrderItem.belongsTo(db.StoreOrder, { foreignKey: 'orderId', as: 'order' });
        console.log('   ✅ Manual: StoreOrderItem -> StoreOrder');
      }
    }
    
    // StoreOrderItem - StoreProduct
    if (db.StoreOrderItem && db.StoreProduct) {
      if (!db.StoreOrderItem.associations?.product) {
        db.StoreOrderItem.belongsTo(db.StoreProduct, { foreignKey: 'productId', as: 'product' });
        console.log('   ✅ Manual: StoreOrderItem -> StoreProduct');
      }
    }
    
    // ✅ ASOCIACIONES DE VENTAS LOCALES
    if (db.LocalSale && db.User) {
      if (!db.LocalSale.associations?.employee) {
        db.LocalSale.belongsTo(db.User, { foreignKey: 'employeeId', as: 'employee' });
        console.log('   ✅ Manual: LocalSale -> User (employee)');
      }
    }
    
    if (db.LocalSale && db.LocalSaleItem) {
      if (!db.LocalSale.associations?.items) {
        db.LocalSale.hasMany(db.LocalSaleItem, { foreignKey: 'saleId', as: 'items' });
        console.log('   ✅ Manual: LocalSale -> LocalSaleItem');
      }
      if (!db.LocalSaleItem.associations?.sale) {
        db.LocalSaleItem.belongsTo(db.LocalSale, { foreignKey: 'saleId', as: 'sale' });
        console.log('   ✅ Manual: LocalSaleItem -> LocalSale');
      }
    }
    
    if (db.LocalSaleItem && db.StoreProduct) {
      if (!db.LocalSaleItem.associations?.product) {
        db.LocalSaleItem.belongsTo(db.StoreProduct, { foreignKey: 'productId', as: 'product' });
        console.log('   ✅ Manual: LocalSaleItem -> StoreProduct');
      }
    }
    
    // ✅ ASOCIACIONES DE CONFIRMACIÓN DE TRANSFERENCIAS
    if (db.TransferConfirmation && db.User) {
      if (!db.TransferConfirmation.associations?.confirmer) {
        db.TransferConfirmation.belongsTo(db.User, { foreignKey: 'confirmerId', as: 'confirmer' });
        console.log('   ✅ Manual: TransferConfirmation -> User (confirmer)');
      }
    }
    
    // ✅ ASOCIACIONES DE HORARIOS FLEXIBLES
    console.log('🕐 Configurando asociaciones de horarios flexibles...');
    
    if (db.GymHours && db.GymTimeSlots) {
      // GymHours -> GymTimeSlots (uno a muchos)
      if (!db.GymHours.associations?.timeSlots) {
        db.GymHours.hasMany(db.GymTimeSlots, {
          foreignKey: 'gymHoursId',
          as: 'timeSlots',
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        });
        console.log('   ✅ Manual: GymHours -> GymTimeSlots');
      }

      // GymTimeSlots -> GymHours (muchos a uno)
      if (!db.GymTimeSlots.associations?.gymHours) {
        db.GymTimeSlots.belongsTo(db.GymHours, {
          foreignKey: 'gymHoursId',
          as: 'gymHours',
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        });
        console.log('   ✅ Manual: GymTimeSlots -> GymHours');
      }
    }
    
    // ✅ ASOCIACIONES ADICIONALES DE USUARIOS
    if (db.Membership && db.User) {
      if (!db.Membership.associations?.registeredByUser) {
        db.Membership.belongsTo(db.User, { 
          foreignKey: 'registeredBy', 
          as: 'registeredByUser', 
          constraints: false 
        });
        console.log('   ✅ Manual: Membership -> registeredByUser');
      }
    }

    if (db.Payment && db.User) {
      if (!db.Payment.associations?.registeredByUser) {
        db.Payment.belongsTo(db.User, { 
          foreignKey: 'registeredBy', 
          as: 'registeredByUser', 
          constraints: false 
        });
        console.log('   ✅ Manual: Payment -> registeredByUser');
      }
      
      if (!db.Payment.associations?.transferValidator) {
        db.Payment.belongsTo(db.User, { 
          foreignKey: 'transferValidatedBy', 
          as: 'transferValidator', 
          constraints: false 
        });
        console.log('   ✅ Manual: Payment -> transferValidator');
      }
    }
    
    // ✅ ASOCIACIONES DE PROMOCIONES
    if (db.UserPromotions && db.User) {
      if (!db.UserPromotions.associations?.user) {
        db.UserPromotions.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
        console.log('   ✅ Manual: UserPromotions -> User');
      }
    }
    
    if (db.UserPromotions && db.PromotionCodes) {
      if (!db.UserPromotions.associations?.promotion) {
        db.UserPromotions.belongsTo(db.PromotionCodes, { foreignKey: 'promotionId', as: 'promotion' });
        console.log('   ✅ Manual: UserPromotions -> PromotionCodes');
      }
    }
    
    if (db.MembershipPromotions && db.Membership) {
      if (!db.MembershipPromotions.associations?.membership) {
        db.MembershipPromotions.belongsTo(db.Membership, { foreignKey: 'membershipId', as: 'membership' });
        console.log('   ✅ Manual: MembershipPromotions -> Membership');
      }
    }
    
    if (db.MembershipPromotions && db.PromotionCodes) {
      if (!db.MembershipPromotions.associations?.promotion) {
        db.MembershipPromotions.belongsTo(db.PromotionCodes, { foreignKey: 'promotionId', as: 'promotion' });
        console.log('   ✅ Manual: MembershipPromotions -> PromotionCodes');
      }
    }
    
    // ✅ ASOCIACIONES DE NOTIFICACIONES
    if (db.Notification && db.User) {
      if (!db.Notification.associations?.user) {
        db.Notification.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
        console.log('   ✅ Manual: Notification -> User');
      }
    }
    
    if (db.Notification && db.Membership) {
      if (!db.Notification.associations?.membership) {
        db.Notification.belongsTo(db.Membership, { foreignKey: 'membershipId', as: 'membership', constraints: false });
        console.log('   ✅ Manual: Notification -> Membership');
      }
    }
    
    if (db.Notification && db.Payment) {
      if (!db.Notification.associations?.payment) {
        db.Notification.belongsTo(db.Payment, { foreignKey: 'paymentId', as: 'payment', constraints: false });
        console.log('   ✅ Manual: Notification -> Payment');
      }
    }
    
    // ✅ ASOCIACIONES DE PREFERENCIAS DE HORARIOS
    if (db.UserSchedulePreferences && db.User) {
      if (!db.UserSchedulePreferences.associations?.user) {
        db.UserSchedulePreferences.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
        console.log('   ✅ Manual: UserSchedulePreferences -> User');
      }
    }
    
  } catch (error) {
    console.error('❌ Error en asociaciones manuales:', error.message);
  }
};

// Ejecutar configuración de asociaciones
configureAssociations();

// ✅ Agregar sequelize al objeto db
db.sequelize = sequelize;
db.Sequelize = Sequelize;

// ============================================================================
// FUNCIONES DE REPARACIÓN PARA TABLAS PROBLEMÁTICAS
// ============================================================================

// ✅ FUNCIÓN DE REPARACIÓN ESPECÍFICA PARA LAS TABLAS PROBLEMÁTICAS
const repairProblematicTables = async () => {
  console.log('🔧 Reparando tablas con problemas de ENUM + UNIQUE...');
  
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión verificada para reparación');
    
    // Lista de tablas problemáticas y sus configuraciones
    const problematicTables = [
      {
        tableName: 'gym_forms_config',
        enumName: 'enum_gym_forms_config_form_name',
        enumValues: ['contact_form', 'newsletter', 'registration', 'consultation'],
        uniqueColumn: 'form_name',
        createTableSQL: `
          CREATE TABLE "gym_forms_config" (
            "id" SERIAL PRIMARY KEY,
            "form_name" VARCHAR(50) NOT NULL,
            "config" JSONB NOT NULL,
            "is_active" BOOLEAN NOT NULL DEFAULT true,
            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `,
        indexes: [
          'CREATE INDEX "gym_forms_config_is_active" ON "gym_forms_config" ("is_active");'
        ]
      },
      {
        tableName: 'gym_social_media',
        enumName: 'enum_gym_social_media_platform',
        enumValues: ['instagram', 'facebook', 'youtube', 'whatsapp', 'tiktok', 'twitter'],
        uniqueColumn: 'platform',
        createTableSQL: `
          CREATE TABLE "gym_social_media" (
            "id" SERIAL PRIMARY KEY,
            "platform" VARCHAR(50) NOT NULL,
            "url" VARCHAR(500) NOT NULL,
            "handle" VARCHAR(100),
            "is_active" BOOLEAN NOT NULL DEFAULT true,
            "display_order" INTEGER NOT NULL DEFAULT 0,
            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `,
        indexes: [
          'CREATE INDEX "gym_social_media_is_active" ON "gym_social_media" ("is_active");',
          'CREATE INDEX "gym_social_media_display_order" ON "gym_social_media" ("display_order");'
        ]
      }
    ];
    
    for (const table of problematicTables) {
      console.log(`\n🔧 Reparando ${table.tableName}...`);
      
      try {
        // 1. Eliminar tabla y tipo ENUM
        await sequelize.query(`DROP TABLE IF EXISTS "${table.tableName}" CASCADE;`);
        await sequelize.query(`DROP TYPE IF EXISTS "${table.enumName}" CASCADE;`);
        console.log(`   🗑️ ${table.tableName} y tipos eliminados`);
        
        // 2. Recrear tabla básica
        await sequelize.query(table.createTableSQL);
        console.log(`   ✅ ${table.tableName} recreada`);
        
        // 3. Crear tipo ENUM
        const enumValuesSQL = table.enumValues.map(v => `'${v}'`).join(', ');
        await sequelize.query(`CREATE TYPE "${table.enumName}" AS ENUM(${enumValuesSQL});`);
        console.log(`   ✅ Tipo ENUM ${table.enumName} creado`);
        
        // 4. Convertir columna a ENUM
        await sequelize.query(`
          ALTER TABLE "${table.tableName}" 
          ALTER COLUMN "${table.uniqueColumn}" 
          TYPE "${table.enumName}" 
          USING "${table.uniqueColumn}"::text::"${table.enumName}";
        `);
        console.log(`   ✅ Columna ${table.uniqueColumn} convertida a ENUM`);
        
        // 5. Agregar constraint único
        await sequelize.query(`
          ALTER TABLE "${table.tableName}" 
          ADD CONSTRAINT "${table.tableName}_${table.uniqueColumn}_unique" 
          UNIQUE ("${table.uniqueColumn}");
        `);
        console.log(`   ✅ Constraint único agregado`);
        
        // 6. Crear índices adicionales
        for (const indexSQL of table.indexes) {
          await sequelize.query(indexSQL);
        }
        console.log(`   ✅ Índices creados`);
        
        console.log(`   🎉 ${table.tableName} reparada exitosamente`);
        
      } catch (tableError) {
        console.error(`   ❌ Error reparando ${table.tableName}:`, tableError.message);
        
        // Como último recurso, intentar sincronización forzada del modelo
        const modelName = table.tableName.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)).join('');
        
        if (db[modelName]) {
          console.log(`   🔄 Último recurso: sincronización forzada de ${modelName}`);
          
          try {
            await db[modelName].sync({ force: true });
            console.log(`   ⚠️ ${modelName} recreado por sync forzado`);
          } catch (syncError) {
            console.error(`   ❌ Error en sync forzado:`, syncError.message);
          }
        }
      }
    }
    
    console.log('\n🎉 REPARACIÓN DE TABLAS COMPLETADA');
    return { success: true, repairedTables: problematicTables.length };
    
  } catch (error) {
    console.error('❌ Error general en reparación de tablas:', error.message);
    return { success: false, error: error.message };
  }
};

// ✅ FUNCIÓN PARA REPARAR MODELO PAYMENT ESPECÍFICAMENTE
const repairPaymentModel = async () => {
  console.log('🔧 Reparando modelo Payment...');
  
  try {
    if (!db.Payment) {
      console.log('❌ Modelo Payment no encontrado');
      return { success: false, error: 'Payment model not found' };
    }

    // Intentar DROP y CREATE de la tabla payments
    console.log('🗑️ Eliminando tabla payments...');
    await db.Payment.drop({ cascade: true });
    
    console.log('🔄 Recreando tabla payments...');
    await db.Payment.sync({ force: false });
    
    console.log('✅ Tabla payments reparada exitosamente');
    
    // Verificar que las columnas críticas existan
    const testQuery = await db.Payment.findOne({ 
      attributes: ['id', 'paymentType', 'anonymousClientInfo', 'dailyPaymentCount'],
      limit: 1 
    });
    
    console.log('✅ Verificación de columnas exitosa');
    
    return { 
      success: true, 
      message: 'Payment model repaired successfully' 
    };
    
  } catch (error) {
    console.error('❌ Error reparando Payment:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// FUNCIONES DE SINCRONIZACIÓN Y GESTIÓN DE BASE DE DATOS (ORIGINALES + MEJORADAS)
// ============================================================================

// ✅ FUNCIÓN PARA CREAR HORARIOS BÁSICOS
const createDefaultGymSchedule = async () => {
  try {
    console.log('🕐 Creando horarios de gimnasio por defecto...');
    
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const day of daysOfWeek) {
      const [gymHour, created] = await db.GymHours.findOrCreate({
        where: { dayOfWeek: day },
        defaults: {
          dayOfWeek: day,
          openingTime: '06:00:00',
          closingTime: '22:00:00',
          isClosed: day === 'sunday', // Cerrado los domingos por defecto
          useFlexibleSchedule: false
        }
      });

      if (created) {
        console.log(`✅ Horario creado para ${day}`);
      }
    }

    console.log('🕐 Horarios básicos configurados');
  } catch (error) {
    console.error('❌ Error creando horarios:', error.message);
  }
};

// ✅ Crear datos iniciales (FUNCIÓN ORIGINAL)
const initializeData = async () => {
  try {
    console.log('🌱 Inicializando datos por defecto...');
    
    // Crear categorías de tienda
    if (db.StoreCategory && db.StoreCategory.seedDefaultCategories) {
      await db.StoreCategory.seedDefaultCategories();
    }
    
    // Crear marcas de tienda
    if (db.StoreBrand && db.StoreBrand.seedDefaultBrands) {
      await db.StoreBrand.seedDefaultBrands();
    }
    
    // Crear productos de ejemplo
    if (db.StoreProduct && db.StoreProduct.seedSampleProducts) {
      await db.StoreProduct.seedSampleProducts(db.StoreCategory, db.StoreBrand);
    }
    
    // Crear planes de membresía
    if (db.MembershipPlans && db.MembershipPlans.seedDefaultPlans) {
      await db.MembershipPlans.seedDefaultPlans();
    }
    
    // Crear horarios básicos si existen los modelos
    if (db.GymHours && db.GymTimeSlots) {
      await createDefaultGymSchedule();
    }
    
    console.log('✅ Datos iniciales creados exitosamente');
    
  } catch (error) {
    console.error('❌ Error inicializando datos:', error.message);
  }
};

// ✅ FUNCIÓN DE SINCRONIZACIÓN MEJORADA Y COMPLETA
const syncDatabase = async (options = {}) => {
  console.log('🔄 Iniciando sincronización completa de base de datos...');
  
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión verificada');

    // Obtener todos los modelos cargados
    const allLoadedModels = Object.keys(db).filter(key => 
      !['sequelize', 'Sequelize', 'diagnose', 'verifyFlexibleScheduleModels', 'syncDatabase', 'resetDatabase', 'checkDatabaseStatus', 'initializeForDevelopment', 'fullDiagnosis', 'repairPaymentModel', 'repairProblematicTables', 'syncDatabaseWithRepair', 'initializeData', 'validateModels', 'getModelsInfo'].includes(key)
    );

    console.log(`📊 TODOS los modelos cargados: ${allLoadedModels.length}`);
    console.log(`📋 Lista completa: ${allLoadedModels.join(', ')}`);

    // Detectar si estamos en desarrollo
    const isDevelopment = process.env.NODE_ENV === 'development' || options.forceDevelopmentMode || options.force;
    const syncOptions = isDevelopment ? { alter: !options.force, force: options.force, ...options } : options;
    
    console.log(`🔧 Modo de sincronización: ${isDevelopment ? `DESARROLLO (${options.force ? 'force: true' : 'alter: true'})` : 'PRODUCCIÓN'}`);

    // Orden específico para modelos críticos
    const prioritySyncOrder = [
      'User', 'MembershipPlans', 'StoreBrand', 'StoreCategory', 'DailyIncome', 'GymConfiguration', 'GymHours',
      'GymTimeSlots', 'Membership', 'StoreProduct', 'Payment', 'StoreProductImage', 'StoreCart', 'StoreOrder',
      'StoreOrderItem', 'FinancialMovements', 'LocalSale', 'LocalSaleItem', 'TransferConfirmation'
    ];

    // Agregar modelos que no están en la lista de prioridad
    const remainingModels = allLoadedModels.filter(model => !prioritySyncOrder.includes(model));
    const fullSyncOrder = [...prioritySyncOrder, ...remainingModels];

    console.log(`🔄 Sincronizando ${fullSyncOrder.length} modelos total...`);

    let syncSuccess = 0;
    let syncErrors = 0;
    let alteredTables = [];
    let repairedTables = [];

    for (const modelName of fullSyncOrder) {
      if (db[modelName]) {
        try {
          console.log(`🔄 Sincronizando ${modelName}...`);
          
          await db[modelName].sync(syncOptions);
          console.log(`✅ ${modelName} sincronizado`);
          
          if (syncOptions.alter || syncOptions.force) {
            alteredTables.push(modelName);
          }
          
          syncSuccess++;
          
        } catch (error) {
          console.error(`❌ Error en ${modelName}:`, error.message);
          
          // Detectar problemas específicos y intentar reparaciones
          const isEnumUniqueError = error.message.includes('syntax error at or near "UNIQUE"') ||
                                   error.message.includes('ENUM') && error.message.includes('unique');
          
          if (isEnumUniqueError && (modelName === 'GymFormsConfig' || modelName === 'GymSocialMedia')) {
            console.log(`🔧 ${modelName}: Detectado problema ENUM+UNIQUE, reparando...`);
            
            try {
              const repairResult = await repairProblematicTables();
              if (repairResult.success) {
                console.log(`   ✅ ${modelName} reparado por función específica`);
                repairedTables.push(modelName);
                syncSuccess++;
                continue;
              }
            } catch (repairError) {
              console.error(`   ❌ Error en reparación específica:`, repairError.message);
            }
          }
          
          // Intentos de recuperación
          if (error.message.includes('does not exist') || 
              error.message.includes('column') || 
              error.message.includes('relation')) {
            
            console.log(`🔄 ${modelName}: Detectado error de esquema, forzando ALTER...`);
            
            try {
              await db[modelName].sync({ alter: true, force: false });
              console.log(`⚠️ ${modelName} sincronizado con ALTER forzado`);
              alteredTables.push(modelName);
              syncSuccess++;
            } catch (alterError) {
              console.error(`❌ ${modelName}: Error persistente después de ALTER:`, alterError.message);
              
              if (isDevelopment && (alterError.message.includes('constraint') || alterError.message.includes('type'))) {
                console.log(`🔄 ${modelName}: Último recurso - recreando tabla...`);
                try {
                  await db[modelName].drop({ cascade: true });
                  await db[modelName].sync({ force: false });
                  console.log(`⚠️ ${modelName} recreado completamente`);
                  repairedTables.push(modelName);
                  syncSuccess++;
                } catch (recreateError) {
                  console.error(`❌ ${modelName}: Error incluso recreando:`, recreateError.message);
                  syncErrors++;
                }
              } else {
                syncErrors++;
              }
            }
          } else {
            syncErrors++;
          }
        }
      } else {
        console.log(`⚠️ Modelo ${modelName} no encontrado en db - omitiendo`);
      }
    }

    console.log(`📊 Resumen de sincronización:`);
    console.log(`   ✅ Exitosos: ${syncSuccess}`);
    console.log(`   ❌ Con errores: ${syncErrors}`);
    console.log(`   📋 Total procesados: ${syncSuccess + syncErrors}`);
    
    if (alteredTables.length > 0) {
      console.log(`🔧 Tablas alteradas/recreadas: ${alteredTables.join(', ')}`);
    }
    
    if (repairedTables.length > 0) {
      console.log(`🛠️ Tablas reparadas: ${repairedTables.join(', ')}`);
    }

    // Crear datos iniciales si es force o no existen datos
    if (syncOptions.force || options.initializeData) {
      await initializeData();
    }

    console.log('🎉 Sincronización completada exitosamente');
    return { 
      success: true, 
      message: 'Base de datos sincronizada correctamente',
      stats: {
        totalModels: fullSyncOrder.length,
        syncSuccess,
        syncErrors,
        modelsFound: allLoadedModels.length,
        alteredTables: alteredTables.length,
        repairedTables: repairedTables.length,
        syncMode: isDevelopment ? 'development' : 'production'
      }
    };

  } catch (error) {
    console.error('❌ Error en sincronización:', error.message);
    return { success: false, error: error.message };
  }
};

// ✅ FUNCIÓN DE SINCRONIZACIÓN CON REPARACIÓN AUTOMÁTICA
const syncDatabaseWithRepair = async (options = {}) => {
  console.log('🔄 Sincronización con reparación automática...');
  
  try {
    // Intentar sincronización normal primero
    const normalSync = await syncDatabase(options);
    
    if (normalSync.success && normalSync.stats.syncErrors === 0) {
      console.log('✅ Sincronización normal exitosa - no se necesita reparación');
      return normalSync;
    }
    
    // Si hubo errores, intentar reparación
    console.log('⚠️ Errores detectados en sincronización, iniciando reparación...');
    
    const repairResult = await repairProblematicTables();
    
    if (repairResult.success) {
      console.log('✅ Reparación exitosa, reintentando sincronización...');
      
      // Reintentar sincronización después de reparación
      return await syncDatabase(options);
    } else {
      console.error('❌ Fallo en reparación');
      return repairResult;
    }
    
  } catch (error) {
    console.error('❌ Error en sincronización con reparación:', error.message);
    return { success: false, error: error.message };
  }
};

// ✅ Función de reset para desarrollo
const resetDatabase = async () => {
  console.log('⚠️ RESET DE BASE DE DATOS...');
  
  // Obtener TODOS los modelos cargados
  const allLoadedModels = Object.keys(db).filter(key => 
    !['sequelize', 'Sequelize', 'diagnose', 'verifyFlexibleScheduleModels', 'syncDatabase', 'resetDatabase', 'checkDatabaseStatus', 'initializeForDevelopment', 'fullDiagnosis', 'repairPaymentModel', 'repairProblematicTables', 'syncDatabaseWithRepair', 'initializeData', 'validateModels', 'getModelsInfo'].includes(key)
  );

  // Orden inverso inteligente
  const priorityDropOrder = [
    'FinancialMovements', 'LocalSaleItem', 'LocalSale', 'TransferConfirmation', 'StoreOrderItem', 'StoreOrder', 'StoreCart', 
    'StoreProductImage', 'Payment', 'StoreProduct', 'Membership', 
    'GymTimeSlots', 'GymHours', 'GymConfiguration', 'StoreCategory', 'StoreBrand', 
    'MembershipPlans', 'DailyIncome', 'User'
  ];
  
  const remainingForDrop = allLoadedModels.filter(model => !priorityDropOrder.includes(model));
  const fullDropOrder = [...remainingForDrop, ...priorityDropOrder];

  console.log(`🗑️ Eliminando ${fullDropOrder.length} modelos en orden seguro...`);

  try {
    for (const modelName of fullDropOrder) {
      if (db[modelName]) {
        try {
          await db[modelName].drop({ cascade: true });
          console.log(`🗑️ ${modelName} eliminado`);
        } catch (error) {
          console.log(`⚠️ ${modelName}: ${error.message}`);
        }
      }
    }

    await syncDatabase({ force: true, initializeData: true });
    console.log('🔄 Base de datos reseteada');
    return { success: true };
  } catch (error) {
    console.error('❌ Error en reset:', error.message);
    return { success: false, error: error.message };
  }
};

// ✅ Verificar estado de la base de datos
const checkDatabaseStatus = async () => {
  const models = Object.keys(db).filter(key => 
    !['sequelize', 'Sequelize', 'diagnose', 'verifyFlexibleScheduleModels', 'syncDatabase', 'resetDatabase', 'checkDatabaseStatus', 'initializeForDevelopment', 'fullDiagnosis', 'repairPaymentModel', 'repairProblematicTables', 'syncDatabaseWithRepair', 'initializeData', 'validateModels', 'getModelsInfo'].includes(key)
  );
  const status = {};
  
  for (const modelName of models) {
    try {
      await db[modelName].count();
      status[modelName] = { exists: true, status: 'OK' };
    } catch (error) {
      status[modelName] = { exists: false, error: error.message };
    }
  }
  
  return status;
};

// ✅ FUNCIÓN DE INICIALIZACIÓN PARA DESARROLLO
const initializeForDevelopment = async () => {
  console.log('🚀 Inicializando para desarrollo...');
  
  try {
    // Verificar si hay problemas específicos con Payment
    if (db.Payment) {
      try {
        await db.Payment.findOne({ 
          attributes: ['paymentType'], 
          limit: 1 
        });
      } catch (paymentError) {
        if (paymentError.message.includes('payment_type') || paymentError.message.includes('does not exist')) {
          console.log('⚠️ Detectado problema con tabla payments, reparando...');
          const repairResult = await repairPaymentModel();
          if (!repairResult.success) {
            console.log('❌ No se pudo reparar Payment, continuando con reset completo...');
            return await resetDatabase();
          }
        }
      }
    }

    // Verificar si hay problemas con tablas ENUM+UNIQUE
    const problematicModels = ['GymFormsConfig', 'GymSocialMedia'];
    let hasEnumProblems = false;

    for (const modelName of problematicModels) {
      if (db[modelName]) {
        try {
          await db[modelName].count();
        } catch (error) {
          if (error.message.includes('ENUM') || error.message.includes('does not exist')) {
            console.log(`⚠️ Detectado problema con ${modelName}, necesita reparación...`);
            hasEnumProblems = true;
          }
        }
      }
    }

    if (hasEnumProblems) {
      console.log('🔧 Aplicando reparaciones específicas...');
      await repairProblematicTables();
    }

    // Continuar con inicialización normal
    const status = await checkDatabaseStatus();
    const hasErrors = Object.values(status).some(info => !info.exists);
    
    if (hasErrors) {
      console.log('⚠️ Errores detectados, usando sincronización con reparación...');
      return await syncDatabaseWithRepair({ alter: true, forceDevelopmentMode: true });
    } else {
      console.log('✅ Estado OK, sincronizando con ALTER...');
      return await syncDatabase({ alter: true, forceDevelopmentMode: true });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
};

// ✅ Validar integridad de modelos (FUNCIÓN ORIGINAL)
const validateModels = async () => {
  try {
    console.log('🔍 Validando integridad de modelos...');
    
    // Obtener modelos actuales
    const loadedModels = Object.keys(db).filter(key => 
      !['sequelize', 'Sequelize', 'diagnose', 'verifyFlexibleScheduleModels', 'syncDatabase', 'resetDatabase', 'checkDatabaseStatus', 'initializeForDevelopment', 'fullDiagnosis', 'repairPaymentModel', 'repairProblematicTables', 'syncDatabaseWithRepair', 'initializeData', 'validateModels', 'getModelsInfo'].includes(key)
    );
    
    // Validar que todos los modelos críticos estén definidos
    const requiredModels = [
      'User', 'Membership', 'Payment', 'FinancialMovements',
      'StoreCategory', 'StoreBrand', 'StoreProduct', 'StoreProductImage',
      'StoreCart', 'StoreOrder', 'StoreOrderItem',
      'LocalSale', 'LocalSaleItem', 'TransferConfirmation',
      'MembershipPlans'
    ];
    
    const missingModels = requiredModels.filter(modelName => !db[modelName]);
    
    if (missingModels.length > 0) {
      throw new Error(`Modelos críticos faltantes: ${missingModels.join(', ')}`);
    }
    
    // Validar asociaciones críticas
    const criticalAssociations = [
      { model: 'LocalSale', association: 'employee' },
      { model: 'LocalSaleItem', association: 'product' },
      { model: 'StoreProduct', association: 'category' },
      { model: 'StoreOrder', association: 'items' },
      { model: 'TransferConfirmation', association: 'confirmer' },
      { model: 'GymHours', association: 'timeSlots' },
      { model: 'GymTimeSlots', association: 'gymHours' }
    ];
    
    for (const { model, association } of criticalAssociations) {
      if (db[model] && !db[model].associations?.[association]) {
        console.warn(`⚠️ Asociación faltante: ${model}.${association}`);
      }
    }
    
    console.log('✅ Validación de modelos completada');
    console.log(`📊 Total de modelos cargados: ${loadedModels.length}`);
    
    return {
      success: true,
      totalModels: loadedModels.length,
      missingCritical: missingModels,
      loadedModels
    };
    
  } catch (error) {
    console.error('❌ Error validando modelos:', error.message);
    return { success: false, error: error.message };
  }
};

// ✅ Obtener estadísticas de modelos (FUNCIÓN ORIGINAL)
const getModelsInfo = () => {
  const loadedModels = Object.keys(db).filter(key => 
    !['sequelize', 'Sequelize', 'diagnose', 'verifyFlexibleScheduleModels', 'syncDatabase', 'resetDatabase', 'checkDatabaseStatus', 'initializeForDevelopment', 'fullDiagnosis', 'repairPaymentModel', 'repairProblematicTables', 'syncDatabaseWithRepair', 'initializeData', 'validateModels', 'getModelsInfo'].includes(key)
  );
  
  const info = {
    totalModels: loadedModels.length,
    models: loadedModels.map(modelName => ({
      name: modelName,
      tableName: db[modelName].tableName,
      hasAssociations: !!db[modelName].associations,
      associationsCount: db[modelName].associations ? 
        Object.keys(db[modelName].associations).length : 0
    }))
  };
  
  return info;
};

// ============================================================================
// FUNCIONES DE DIAGNÓSTICO AVANZADAS
// ============================================================================

// ✅ FUNCIÓN DE VERIFICACIÓN DE HORARIOS FLEXIBLES
const verifyFlexibleScheduleModels = () => {
  console.log('\n🔍 DIAGNÓSTICO DE HORARIOS FLEXIBLES:');
  
  console.log(`📦 GymHours: ${db.GymHours ? 'Disponible' : 'No disponible'}`);
  console.log(`📦 GymTimeSlots: ${db.GymTimeSlots ? 'Disponible' : 'No disponible'}`);
  
  if (db.GymHours && db.GymHours.associations) {
    console.log(`🔗 GymHours.timeSlots: ${db.GymHours.associations.timeSlots ? 'Configurada' : 'No configurada'}`);
  }
  
  if (db.GymTimeSlots && db.GymTimeSlots.associations) {
    console.log(`🔗 GymTimeSlots.gymHours: ${db.GymTimeSlots.associations.gymHours ? 'Configurada' : 'No configurada'}`);
  }
  
  return {
    gymHoursAvailable: !!db.GymHours,
    gymTimeSlotsAvailable: !!db.GymTimeSlots,
    associationsConfigured: !!(db.GymHours?.associations?.timeSlots && db.GymTimeSlots?.associations?.gymHours)
  };
};

// ✅ FUNCIÓN DE DIAGNÓSTICO COMPLETO
const diagnose = () => {
  console.log('\n🔍 DIAGNÓSTICO COMPLETO DE MODELOS:');
  
  const models = Object.keys(db).filter(key => 
    !['sequelize', 'Sequelize', 'diagnose', 'verifyFlexibleScheduleModels', 'syncDatabase', 'resetDatabase', 'checkDatabaseStatus', 'initializeForDevelopment', 'fullDiagnosis', 'repairPaymentModel', 'repairProblematicTables', 'syncDatabaseWithRepair', 'initializeData', 'validateModels', 'getModelsInfo'].includes(key)
  );
  
  models.forEach(modelName => {
    const model = db[modelName];
    console.log(`\n📦 ${modelName}:`);
    console.log(`   - Tabla: ${model.tableName || 'No definida'}`);
    console.log(`   - Asociaciones: ${model.associations ? Object.keys(model.associations).length : 0}`);
    
    if (model.associations) {
      Object.keys(model.associations).forEach(assocName => {
        const assoc = model.associations[assocName];
        console.log(`     * ${assocName}: ${assoc.associationType} -> ${assoc.target.name}`);
      });
    }
  });
  
  // Diagnóstico específico de horarios flexibles
  console.log('\n🕐 DIAGNÓSTICO DE HORARIOS FLEXIBLES:');
  const flexibleDiagnosis = verifyFlexibleScheduleModels();
  console.log(`   - Modelos disponibles: ${flexibleDiagnosis.gymHoursAvailable && flexibleDiagnosis.gymTimeSlotsAvailable ? 'SÍ' : 'NO'}`);
  console.log(`   - Asociaciones configuradas: ${flexibleDiagnosis.associationsConfigured ? 'SÍ' : 'NO'}`);
  
  return {
    totalModels: models.length,
    modelsWithAssociations: models.filter(m => db[m].associations && Object.keys(db[m].associations).length > 0).length,
    storeModelsLoaded: ['StoreProduct', 'StoreCategory', 'StoreBrand', 'StoreProductImage'].filter(m => db[m]).length,
    flexibleScheduleModelsLoaded: ['GymHours', 'GymTimeSlots'].filter(m => db[m]).length,
    flexibleScheduleReady: flexibleDiagnosis.associationsConfigured,
    membershipPlansLoaded: !!db.MembershipPlans
  };
};

// ✅ FUNCIÓN DE DIAGNÓSTICO COMPLETO DETALLADO
const fullDiagnosis = () => {
  console.log('\n🔍 DIAGNÓSTICO COMPLETO Y DETALLADO:');
  
  const allFiles = discoverAllModels();
  const loadedModels = Object.keys(db).filter(key => 
    !['sequelize', 'Sequelize', 'diagnose', 'verifyFlexibleScheduleModels', 'syncDatabase', 'resetDatabase', 'checkDatabaseStatus', 'initializeForDevelopment', 'fullDiagnosis', 'repairPaymentModel', 'repairProblematicTables', 'syncDatabaseWithRepair', 'initializeData', 'validateModels', 'getModelsInfo'].includes(key)
  );
  
  console.log(`\n📈 ESTADÍSTICAS GENERALES:`);
  console.log(`   📁 Archivos .js encontrados: ${allFiles.length}`);
  console.log(`   ✅ Modelos cargados: ${loadedModels.length}`);
  console.log(`   📊 Tasa de éxito: ${((loadedModels.length / allFiles.length) * 100).toFixed(1)}%`);
  
  console.log(`\n📋 ARCHIVOS ENCONTRADOS:`);
  allFiles.forEach(file => console.log(`   - ${file}`));
  
  console.log(`\n📦 MODELOS CARGADOS:`);
  loadedModels.forEach(model => console.log(`   ✅ ${model}`));
  
  const notLoadedFiles = allFiles.filter(file => {
    const baseName = file.replace('.js', '');
    return !loadedModels.some(model => 
      model === baseName || model.toLowerCase() === baseName.toLowerCase()
    );
  });
  
  if (notLoadedFiles.length > 0) {
    console.log(`\n❌ ARCHIVOS NO CARGADOS COMO MODELOS:`);
    notLoadedFiles.forEach(file => console.log(`   ❌ ${file}`));
  }
  
  return {
    filesFound: allFiles.length,
    modelsLoaded: loadedModels.length,
    loadSuccessRate: ((loadedModels.length / allFiles.length) * 100).toFixed(1),
    notLoadedFiles,
    loadedModelsList: loadedModels,
    allFilesList: allFiles
  };
};

// ============================================================================
// AUTO-INICIALIZACIÓN
// ============================================================================

// Auto-inicializar si se establece la variable de entorno
const autoInit = async () => {
  const shouldAutoInit = process.env.AUTO_INIT_DB === 'true' || process.env.NODE_ENV === 'development';
  
  if (shouldAutoInit) {
    console.log('🔄 Auto-inicialización activada...');
    
    try {
      const result = await initializeForDevelopment();
      
      if (result.success) {
        console.log('✅ Base de datos lista para usar');
      } else {
        console.error('❌ Fallo en auto-inicialización:', result.error);
      }
    } catch (error) {
      console.error('❌ Error en auto-inicialización:', error.message);
    }
  }
};

// ✅ VERIFICAR CONEXIÓN
const verifyConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a base de datos verificada desde models/index.js');
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
  }
};

verifyConnection();

// ============================================================================
// EXPORTAR TODAS LAS FUNCIONES Y MODELOS
// ============================================================================

// Exportar funciones al objeto db
db.syncDatabase = syncDatabase;
db.resetDatabase = resetDatabase;
db.checkDatabaseStatus = checkDatabaseStatus;
db.initializeForDevelopment = initializeForDevelopment;
db.repairPaymentModel = repairPaymentModel;
db.repairProblematicTables = repairProblematicTables;
db.syncDatabaseWithRepair = syncDatabaseWithRepair;
db.initializeData = initializeData;
db.validateModels = validateModels;
db.getModelsInfo = getModelsInfo;
db.diagnose = diagnose;
db.fullDiagnosis = fullDiagnosis;
db.verifyFlexibleScheduleModels = verifyFlexibleScheduleModels;

console.log('🎉 Carga completa fusionada completada\n');

// Ejecutar auto-inicialización solo si no es entorno de pruebas
if (process.env.NODE_ENV !== 'test') {
  autoInit();
}

// ============================================================================
// MOSTRAR RESUMEN FINAL
// ============================================================================

console.log('\n📊 RESUMEN FINAL DE CARGA:');
const finalModels = Object.keys(db).filter(key => 
  !['sequelize', 'Sequelize', 'diagnose', 'verifyFlexibleScheduleModels', 'syncDatabase', 'resetDatabase', 'checkDatabaseStatus', 'initializeForDevelopment', 'fullDiagnosis', 'repairPaymentModel', 'repairProblematicTables', 'syncDatabaseWithRepair', 'initializeData', 'validateModels', 'getModelsInfo'].includes(key)
);

console.log(`✅ Total de modelos cargados: ${finalModels.length}`);
console.log(`📋 Modelos disponibles: ${finalModels.join(', ')}`);
console.log(`🔧 Funciones de utilidad disponibles: syncDatabase, resetDatabase, initializeForDevelopment, diagnose, fullDiagnosis, repairPaymentModel, repairProblematicTables, syncDatabaseWithRepair, initializeData, validateModels, getModelsInfo, verifyFlexibleScheduleModels`);

module.exports = db;