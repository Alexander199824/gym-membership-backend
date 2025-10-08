// src/models/index.js - ACTUALIZADO: Con modelo Expense integrado
'use strict';

const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');
const { Sequelize, DataTypes } = require('sequelize');

const basename = path.basename(__filename);
const db = {};

console.log('📦 ELITE FITNESS CLUB - CARGANDO TODOS LOS MODELOS...');

// ✅ Verificar que sequelize esté disponible
if (!sequelize) {
  throw new Error('❌ No se pudo obtener la instancia de Sequelize');
}

console.log('✅ Conexión a base de datos disponible');

// ============================================================================
// CARGA EXPLÍCITA DE MODELOS EN ORDEN CORRECTO
// ============================================================================

console.log('📦 Cargando modelos en orden específico...');

const loadModel = (modelName) => {
  try {
    const modelPath = path.join(__dirname, `${modelName}.js`);
    
    if (fs.existsSync(modelPath)) {
      delete require.cache[require.resolve(modelPath)];
      const model = require(modelPath);
      
      if (model && (model.name || model.modelName)) {
        const name = model.name || model.modelName || modelName;
        db[name] = model;
        console.log(`   ✅ ${name}`);
        return model;
      } else {
        console.log(`   ⚠️ ${modelName} no es un modelo válido`);
        return null;
      }
    } else {
      console.log(`   ⚠️ ${modelName}.js no encontrado`);
      return null;
    }
  } catch (error) {
    console.error(`   ❌ Error cargando ${modelName}:`, error.message);
    return null;
  }
};

// ✅ ORDEN ESPECÍFICO PARA EVITAR PROBLEMAS DE DEPENDENCIAS
const modelLoadOrder = [
  // Base - Sin dependencias
  'User',
  'MembershipPlans', 
  'StoreCategory',
  'StoreBrand',
  
  // Configuración del gimnasio
  'GymConfiguration',
  'GymContactInfo', 
  'GymBrandingConfig',
  'GymHours',
  'GymTimeSlots',
  'GymServices',
  'GymStatistics',
  'GymTestimonials',
  'GymSystemMessages',
  'GymSectionsContent',
  'GymPromotionalContent',
  'GymNavigation',
  'GymFormsConfig',
  'GymSocialMedia',
  
  // Productos y tienda
  'StoreProduct',
  'StoreProductImage',
  'StoreCart',
  'StoreOrder',
  'StoreOrderItem',
  
  // Membresías y pagos
  'Membership',
  'Payment',
  'FinancialMovements',
  'DailyIncome',
  'Expense', // ✅ NUEVO: Modelo de gastos
  
  // Ventas locales
  'LocalSale',
  'LocalSaleItem',
  'TransferConfirmation',
  
  // Promociones y notificaciones
  'PromotionCodes',
  'UserPromotions',
  'MembershipPromotions',
  'Notification',
  'UserSchedulePreferences'
];

// Cargar modelos en orden
modelLoadOrder.forEach(modelName => {
  loadModel(modelName);
});

// ✅ DESCUBRIR Y CARGAR MODELOS ADICIONALES NO LISTADOS
console.log('\n🔍 Buscando modelos adicionales...');

const allModelFiles = fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  });

const additionalModels = allModelFiles
  .map(file => file.replace('.js', ''))
  .filter(modelName => !modelLoadOrder.includes(modelName));

if (additionalModels.length > 0) {
  console.log(`📋 Modelos adicionales: ${additionalModels.join(', ')}`);
  additionalModels.forEach(modelName => {
    loadModel(modelName);
  });
} else {
  console.log('ℹ️ No hay modelos adicionales');
}

// ============================================================================
// CONFIGURACIÓN DE ASOCIACIONES
// ============================================================================

console.log('\n🔗 CONFIGURANDO ASOCIACIONES...');

const configureAssociations = () => {
  const loadedModels = Object.keys(db).filter(key => 
    !['sequelize', 'Sequelize'].includes(key) && 
    typeof db[key] === 'object' && 
    db[key].name
  );
  
  console.log(`📊 Modelos disponibles: ${loadedModels.length}`);
  console.log(`📋 Lista: ${loadedModels.join(', ')}`);
  
  // ✅ 1. CONFIGURAR ASOCIACIONES AUTOMÁTICAS PRIMERO
  loadedModels.forEach(modelName => {
    const model = db[modelName];
    
    if (model && typeof model.associate === 'function') {
      try {
        console.log(`🔗 Configurando asociaciones automáticas: ${modelName}`);
        model.associate(db);
        
        const associations = model.associations;
        if (associations && Object.keys(associations).length > 0) {
          console.log(`   ✅ ${Object.keys(associations).length} asociaciones`);
        }
      } catch (error) {
        console.error(`   ❌ Error en asociaciones automáticas ${modelName}:`, error.message);
      }
    }
  });
  
  // ✅ 2. CREAR ASOCIACIONES MANUALES CRÍTICAS
  console.log('\n🔧 Creando asociaciones manuales críticas...');
  
  try {
    // === USUARIOS Y MEMBRESÍAS ===
    if (db.User && db.Membership) {
      if (!db.User.associations?.memberships) {
        db.User.hasMany(db.Membership, { foreignKey: 'userId', as: 'memberships' });
      }
      if (!db.Membership.associations?.user) {
        db.Membership.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
      }
      console.log('   ✅ User <-> Membership');
    }
    
    // === PLANES DE MEMBRESÍA ===
    if (db.MembershipPlans && db.Membership) {
      if (!db.MembershipPlans.associations?.memberships) {
        db.MembershipPlans.hasMany(db.Membership, { foreignKey: 'planId', as: 'memberships' });
      }
      if (!db.Membership.associations?.plan) {
        db.Membership.belongsTo(db.MembershipPlans, { foreignKey: 'planId', as: 'plan' });
      }
      console.log('   ✅ MembershipPlans <-> Membership');
    }
    
    // === PAGOS ===
    if (db.User && db.Payment) {
      if (!db.User.associations?.payments) {
        db.User.hasMany(db.Payment, { foreignKey: 'userId', as: 'payments' });
      }
      if (!db.Payment.associations?.user) {
        db.Payment.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
      }
      console.log('   ✅ User <-> Payment');
    }
    
    if (db.Payment && db.Membership) {
      if (!db.Payment.associations?.membership) {
        db.Payment.belongsTo(db.Membership, { foreignKey: 'membershipId', as: 'membership' });
      }
      console.log('   ✅ Payment -> Membership');
    }
    
    // === TIENDA - PRODUCTOS Y CATEGORÍAS ===
    if (db.StoreProduct && db.StoreCategory) {
      if (!db.StoreProduct.associations?.category) {
        db.StoreProduct.belongsTo(db.StoreCategory, { foreignKey: 'categoryId', as: 'category' });
      }
      if (!db.StoreCategory.associations?.products) {
        db.StoreCategory.hasMany(db.StoreProduct, { foreignKey: 'categoryId', as: 'products' });
      }
      console.log('   ✅ StoreProduct <-> StoreCategory');
    }
    
    // === TIENDA - PRODUCTOS Y MARCAS ===
    if (db.StoreProduct && db.StoreBrand) {
      if (!db.StoreProduct.associations?.brand) {
        db.StoreProduct.belongsTo(db.StoreBrand, { foreignKey: 'brandId', as: 'brand' });
      }
      if (!db.StoreBrand.associations?.products) {
        db.StoreBrand.hasMany(db.StoreProduct, { foreignKey: 'brandId', as: 'products' });
      }
      console.log('   ✅ StoreProduct <-> StoreBrand');
    }
    
    // === TIENDA - PRODUCTOS E IMÁGENES ===
    if (db.StoreProduct && db.StoreProductImage) {
      if (!db.StoreProduct.associations?.images) {
        db.StoreProduct.hasMany(db.StoreProductImage, { foreignKey: 'productId', as: 'images' });
      }
      if (!db.StoreProductImage.associations?.product) {
        db.StoreProductImage.belongsTo(db.StoreProduct, { foreignKey: 'productId', as: 'product' });
      }
      console.log('   ✅ StoreProduct <-> StoreProductImage');
    }
    
    // === TIENDA - CARRITO ===
    if (db.StoreCart && db.StoreProduct) {
      if (!db.StoreCart.associations?.product) {
        db.StoreCart.belongsTo(db.StoreProduct, { foreignKey: 'productId', as: 'product' });
      }
    }
    
    if (db.StoreCart && db.User) {
      if (!db.StoreCart.associations?.user) {
        db.StoreCart.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
      }
      console.log('   ✅ StoreCart -> User, Product');
    }
    
    // === TIENDA - ÓRDENES ===
    if (db.StoreOrder && db.User) {
      if (!db.StoreOrder.associations?.user) {
        db.StoreOrder.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
      }
    }
    
    if (db.StoreOrder && db.StoreOrderItem) {
      if (!db.StoreOrder.associations?.items) {
        db.StoreOrder.hasMany(db.StoreOrderItem, { foreignKey: 'orderId', as: 'items' });
      }
      if (!db.StoreOrderItem.associations?.order) {
        db.StoreOrderItem.belongsTo(db.StoreOrder, { foreignKey: 'orderId', as: 'order' });
      }
      console.log('   ✅ StoreOrder <-> StoreOrderItem');
    }
    
    if (db.StoreOrderItem && db.StoreProduct) {
      if (!db.StoreOrderItem.associations?.product) {
        db.StoreOrderItem.belongsTo(db.StoreProduct, { foreignKey: 'productId', as: 'product' });
      }
      console.log('   ✅ StoreOrderItem -> StoreProduct');
    }
    
    // === VENTAS LOCALES ===
    if (db.LocalSale && db.User) {
      if (!db.LocalSale.associations?.employee) {
        db.LocalSale.belongsTo(db.User, { foreignKey: 'employeeId', as: 'employee' });
      }
      
      if (!db.LocalSale.associations?.transferConfirmer) {
        db.LocalSale.belongsTo(db.User, { 
          foreignKey: 'transferConfirmedBy', 
          as: 'transferConfirmer'
        });
      }
      console.log('   ✅ LocalSale -> User (employee, transferConfirmer)');
    }
    
    if (db.LocalSale && db.LocalSaleItem) {
      if (!db.LocalSale.associations?.items) {
        db.LocalSale.hasMany(db.LocalSaleItem, { foreignKey: 'saleId', as: 'items' });
      }
      if (!db.LocalSaleItem.associations?.sale) {
        db.LocalSaleItem.belongsTo(db.LocalSale, { foreignKey: 'saleId', as: 'sale' });
      }
      console.log('   ✅ LocalSale <-> LocalSaleItem');
    }
    
    if (db.LocalSaleItem && db.StoreProduct) {
      if (!db.LocalSaleItem.associations?.product) {
        db.LocalSaleItem.belongsTo(db.StoreProduct, { foreignKey: 'productId', as: 'product' });
      }
      console.log('   ✅ LocalSaleItem -> StoreProduct');
    }
    
    // === TRANSFERENCIAS ===
    if (db.TransferConfirmation && db.LocalSale) {
      if (!db.TransferConfirmation.associations?.localSale) {
        db.TransferConfirmation.belongsTo(db.LocalSale, { foreignKey: 'localSaleId', as: 'localSale' });
      }
      if (!db.LocalSale.associations?.transferConfirmation) {
        db.LocalSale.hasOne(db.TransferConfirmation, { foreignKey: 'localSaleId', as: 'transferConfirmation' });
      }
    }
    
    if (db.TransferConfirmation && db.User) {
      if (!db.TransferConfirmation.associations?.confirmer) {
        db.TransferConfirmation.belongsTo(db.User, { foreignKey: 'confirmedBy', as: 'confirmer' });
      }
      console.log('   ✅ TransferConfirmation -> User, LocalSale');
    }
    
    // === HORARIOS FLEXIBLES ===
    if (db.GymHours && db.GymTimeSlots) {
      if (!db.GymHours.associations?.timeSlots) {
        db.GymHours.hasMany(db.GymTimeSlots, {
          foreignKey: 'gymHoursId',
          as: 'timeSlots',
          onDelete: 'CASCADE'
        });
      }

      if (!db.GymTimeSlots.associations?.gymHours) {
        db.GymTimeSlots.belongsTo(db.GymHours, {
          foreignKey: 'gymHoursId',
          as: 'gymHours',
          onDelete: 'CASCADE'
        });
      }
      console.log('   ✅ GymHours <-> GymTimeSlots');
    }
    
    // === PROMOCIONES ===
    if (db.UserPromotions && db.User) {
      if (!db.UserPromotions.associations?.user) {
        db.UserPromotions.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
      }
    }
    
    if (db.UserPromotions && db.PromotionCodes) {
      if (!db.UserPromotions.associations?.promotion) {
        db.UserPromotions.belongsTo(db.PromotionCodes, { foreignKey: 'promotionId', as: 'promotion' });
      }
      console.log('   ✅ UserPromotions -> User, PromotionCodes');
    }
    
    if (db.MembershipPromotions && db.Membership) {
      if (!db.MembershipPromotions.associations?.membership) {
        db.MembershipPromotions.belongsTo(db.Membership, { foreignKey: 'membershipId', as: 'membership' });
      }
    }
    
    if (db.MembershipPromotions && db.PromotionCodes) {
      if (!db.MembershipPromotions.associations?.promotion) {
        db.MembershipPromotions.belongsTo(db.PromotionCodes, { foreignKey: 'promotionId', as: 'promotion' });
      }
      console.log('   ✅ MembershipPromotions -> Membership, PromotionCodes');
    }
    
    // === NOTIFICACIONES ===
    if (db.Notification && db.User) {
      if (!db.Notification.associations?.user) {
        db.Notification.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
      }
    }
    
    if (db.Notification && db.Membership) {
      if (!db.Notification.associations?.membership) {
        db.Notification.belongsTo(db.Membership, { foreignKey: 'membershipId', as: 'membership', constraints: false });
      }
    }
    
    if (db.Notification && db.Payment) {
      if (!db.Notification.associations?.payment) {
        db.Notification.belongsTo(db.Payment, { foreignKey: 'paymentId', as: 'payment', constraints: false });
      }
      console.log('   ✅ Notification -> User, Membership, Payment');
    }
    
    // === PREFERENCIAS DE HORARIOS ===
    if (db.UserSchedulePreferences && db.User) {
      if (!db.UserSchedulePreferences.associations?.user) {
        db.UserSchedulePreferences.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
      }
      console.log('   ✅ UserSchedulePreferences -> User');
    }
    
    // === ASOCIACIONES ADICIONALES DE PAYMENT Y MEMBERSHIP ===
    if (db.Membership && db.User) {
      if (!db.Membership.associations?.registeredByUser) {
        db.Membership.belongsTo(db.User, { 
          foreignKey: 'registeredBy', 
          as: 'registeredByUser', 
          constraints: false 
        });
      }
      console.log('   ✅ Membership -> registeredByUser');
    }

    if (db.Payment && db.User) {
      if (!db.Payment.associations?.registeredByUser) {
        db.Payment.belongsTo(db.User, { 
          foreignKey: 'registeredBy', 
          as: 'registeredByUser', 
          constraints: false 
        });
      }
      
      if (!db.Payment.associations?.transferValidator) {
        db.Payment.belongsTo(db.User, { 
          foreignKey: 'transferValidatedBy', 
          as: 'transferValidator', 
          constraints: false 
        });
      }
      console.log('   ✅ Payment -> registeredByUser, transferValidator');
    }
    
    // === ✅ GASTOS (EXPENSES) - NUEVAS ASOCIACIONES ===
    if (db.Expense && db.User) {
      if (!db.Expense.associations?.registeredByUser) {
        db.Expense.belongsTo(db.User, {
          foreignKey: 'registeredBy',
          as: 'registeredByUser'
        });
      }
      if (!db.Expense.associations?.approvedByUser) {
        db.Expense.belongsTo(db.User, {
          foreignKey: 'approvedBy',
          as: 'approvedByUser'
        });
      }
      
      // Usuario puede tener múltiples gastos registrados
      if (!db.User.associations?.registeredExpenses) {
        db.User.hasMany(db.Expense, {
          foreignKey: 'registeredBy',
          as: 'registeredExpenses'
        });
      }
      
      // Usuario puede tener múltiples gastos aprobados
      if (!db.User.associations?.approvedExpenses) {
        db.User.hasMany(db.Expense, {
          foreignKey: 'approvedBy',
          as: 'approvedExpenses'
        });
      }
      
      console.log('   ✅ Expense <-> User (registeredByUser, approvedByUser)');
    }
    
    if (db.Expense && db.FinancialMovements) {
      if (!db.Expense.associations?.financialMovement) {
        db.Expense.belongsTo(db.FinancialMovements, {
          foreignKey: 'financialMovementId',
          as: 'financialMovement'
        });
      }
      if (!db.FinancialMovements.associations?.expense) {
        db.FinancialMovements.hasOne(db.Expense, {
          foreignKey: 'financialMovementId',
          as: 'expense'
        });
      }
      console.log('   ✅ Expense <-> FinancialMovements');
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
// FUNCIONES DE UTILIDAD Y DIAGNÓSTICO
// ============================================================================

// ✅ FUNCIÓN DE DIAGNÓSTICO COMPLETO
const diagnose = () => {
  console.log('\n🔍 DIAGNÓSTICO DE MODELOS:');
  
  const models = Object.keys(db).filter(key => 
    !['sequelize', 'Sequelize'].includes(key)
  );
  
  models.forEach(modelName => {
    const model = db[modelName];
    if (typeof model === 'object' && model.name) {
      console.log(`\n📦 ${modelName}:`);
      console.log(`   - Tabla: ${model.tableName || 'No definida'}`);
      console.log(`   - Asociaciones: ${model.associations ? Object.keys(model.associations).length : 0}`);
      
      if (model.associations && Object.keys(model.associations).length > 0) {
        Object.keys(model.associations).forEach(assocName => {
          const assoc = model.associations[assocName];
          console.log(`     * ${assocName}: ${assoc.associationType} -> ${assoc.target.name}`);
        });
      }
    }
  });
  
  return {
    totalModels: models.length,
    modelsWithAssociations: models.filter(m => 
      db[m].associations && Object.keys(db[m].associations).length > 0
    ).length
  };
};

// ✅ FUNCIÓN DE SINCRONIZACIÓN COMPLETA
const syncDatabase = async (options = {}) => {
  try {
    console.log('\n🔄 SINCRONIZANDO BASE DE DATOS...');
    
    await sequelize.authenticate();
    console.log('✅ Conexión verificada');

    const models = Object.keys(db).filter(key => 
      !['sequelize', 'Sequelize'].includes(key) &&
      typeof db[key] === 'object' &&
      db[key].tableName
    );

    console.log(`📊 Modelos a sincronizar: ${models.length}`);

    // Orden específico para la sincronización
    const syncOrder = [
      'User', 'MembershipPlans', 'StoreCategory', 'StoreBrand', 
      'GymConfiguration', 'GymContactInfo', 'GymHours', 'GymTimeSlots',
      'StoreProduct', 'StoreProductImage', 'Membership', 'Payment', 
      'FinancialMovements', 'DailyIncome', 'Expense', // ✅ NUEVO
      'StoreCart', 'StoreOrder', 'StoreOrderItem',
      'LocalSale', 'LocalSaleItem', 'TransferConfirmation'
    ];

    const remainingModels = models.filter(model => !syncOrder.includes(model));
    const fullSyncOrder = [...syncOrder, ...remainingModels];

    let syncSuccess = 0;
    let syncErrors = 0;

    for (const modelName of fullSyncOrder) {
      if (db[modelName] && db[modelName].sync) {
        try {
          console.log(`🔄 Sincronizando ${modelName}...`);
          await db[modelName].sync(options);
          console.log(`   ✅ ${modelName} sincronizado`);
          syncSuccess++;
        } catch (error) {
          console.error(`   ❌ Error en ${modelName}: ${error.message}`);
          syncErrors++;
        }
      }
    }

    console.log(`\n📊 Sincronización completa: ${syncSuccess} exitosos, ${syncErrors} errores`);
    
    return { 
      success: true, 
      syncSuccess, 
      syncErrors, 
      totalModels: fullSyncOrder.length 
    };

  } catch (error) {
    console.error('❌ Error en sincronización:', error.message);
    return { success: false, error: error.message };
  }
};

// ✅ FUNCIÓN DE RESET COMPLETO
const resetDatabase = async () => {
  try {
    console.log('⚠️ RESET COMPLETO DE BASE DE DATOS...');
    
    await sequelize.sync({ force: true });
    console.log('✅ Base de datos reseteada completamente');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error en reset:', error.message);
    return { success: false, error: error.message };
  }
};

// ✅ Exportar funciones al objeto db
db.diagnose = diagnose;
db.syncDatabase = syncDatabase;
db.resetDatabase = resetDatabase;

// ============================================================================
// RESUMEN FINAL
// ============================================================================

const finalModels = Object.keys(db).filter(key => 
  !['sequelize', 'Sequelize', 'diagnose', 'syncDatabase', 'resetDatabase'].includes(key)
);

console.log('\n📊 RESUMEN FINAL DE CARGA:');
console.log(`✅ Total de modelos cargados: ${finalModels.length}`);
console.log(`🔗 Funciones disponibles: diagnose, syncDatabase, resetDatabase`);

// ✅ MOSTRAR MODELOS CRÍTICOS CARGADOS
const criticalModels = ['User', 'Expense', 'FinancialMovements', 'LocalSale', 'StoreProduct', 'Membership'];
const criticalLoaded = criticalModels.filter(model => db[model]);
const criticalMissing = criticalModels.filter(model => !db[model]);

if (criticalMissing.length === 0) {
  console.log('✅ Todos los modelos críticos cargados correctamente');
} else {
  console.log(`❌ Modelos críticos faltantes: ${criticalMissing.join(', ')}`);
}

console.log('🎉 Carga de modelos completada\n');

module.exports = db;