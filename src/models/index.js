// src/models/index.js - COMPLETO: Con asociaciones de horarios flexibles integradas
'use strict';

const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');
const { Sequelize, DataTypes } = require('sequelize');

const basename = path.basename(__filename);
const db = {};

console.log('📦 Iniciando carga SIMPLIFICADA de modelos...');

// ✅ Verificar que sequelize esté disponible
if (!sequelize) {
  throw new Error('❌ No se pudo obtener la instancia de Sequelize');
}

console.log('✅ Conexión a base de datos disponible');

// ✅ LISTA EXPLÍCITA de modelos en orden de dependencias (CON HORARIOS FLEXIBLES)
const MODEL_ORDER = [
  // Modelos base sin dependencias
  'User.js',
  'MembershipPlan.js',
  'StoreBrand.js',
  'StoreCategory.js',
  'DailyIncome.js',
  
  // ✅ CRÍTICO: GymHours ANTES que GymTimeSlots para asociaciones
  'GymHours.js',
  'GymTimeSlots.js',
  
  // Modelos que dependen de los anteriores
  'Membership.js',
  'Payment.js',
  'StoreProduct.js',
  'StoreProductImage.js',
  
  // Modelos que dependen de StoreProduct
  'StoreCart.js',
  'StoreOrder.js',
  'StoreOrderItem.js',
  
  // Otros modelos
  'FinancialMovements.js'
];

// ✅ FUNCIÓN para cargar un modelo específico
const loadModel = (filename) => {
  try {
    const modelPath = path.join(__dirname, filename);
    
    if (!fs.existsSync(modelPath)) {
      console.log(`   ⚠️ Archivo ${filename} no encontrado - omitiendo`);
      return null;
    }
    
    console.log(`🔄 Cargando: ${filename}`);
    
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
        console.log(`   ✅ ${modelName} cargado exitosamente`);
        
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
    console.error(`❌ Error cargando ${filename}:`, error.message);
    return null;
  }
};

// ✅ CARGAR MODELOS EN ORDEN ESPECÍFICO
console.log('📁 Cargando modelos en orden de dependencias...');

MODEL_ORDER.forEach(filename => {
  loadModel(filename);
});

// ✅ CARGAR OTROS ARCHIVOS .js que no estén en la lista
console.log('📁 Buscando modelos adicionales...');

const allFiles = fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1 &&
      !MODEL_ORDER.includes(file)
    );
  });

if (allFiles.length > 0) {
  console.log(`📦 Encontrados ${allFiles.length} archivos adicionales:`, allFiles);
  
  allFiles.forEach(file => {
    loadModel(file);
  });
}

// ✅ CONFIGURAR ASOCIACIONES DE FORMA SEGURA
console.log('🔗 Configurando asociaciones...');

const configureAssociations = () => {
  const loadedModels = Object.keys(db).filter(key => !['sequelize', 'Sequelize'].includes(key));
  
  console.log(`📊 Modelos disponibles para asociaciones: ${loadedModels.join(', ')}`);
  
  // ✅ Configurar asociaciones automáticas
  loadedModels.forEach(modelName => {
    const model = db[modelName];
    
    if (model && typeof model.associate === 'function') {
      try {
        console.log(`🔗 Configurando asociaciones para: ${modelName}`);
        model.associate(db);
        
        const associations = model.associations;
        if (associations && Object.keys(associations).length > 0) {
          console.log(`   ✅ ${Object.keys(associations).length} asociaciones creadas`);
          Object.keys(associations).forEach(assocName => {
            console.log(`      - ${assocName}: ${associations[assocName].associationType}`);
          });
        } else {
          console.log(`   ℹ️ No se crearon asociaciones automáticas`);
        }
      } catch (error) {
        console.error(`   ❌ Error en asociaciones de ${modelName}:`, error.message);
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
    
    // StoreCart - StoreProduct
    if (db.StoreCart && db.StoreProduct) {
      if (!db.StoreCart.associations?.product) {
        db.StoreCart.belongsTo(db.StoreProduct, { foreignKey: 'productId', as: 'product' });
        console.log('   ✅ Manual: StoreCart -> StoreProduct');
      }
    }
    
    // ✅ NUEVAS ASOCIACIONES CRÍTICAS PARA HORARIOS FLEXIBLES
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
      } else {
        console.log('   ℹ️ GymHours.timeSlots ya configurada');
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
      } else {
        console.log('   ℹ️ GymTimeSlots.gymHours ya configurada');
      }
    } else {
      if (!db.GymHours) console.log('   ⚠️ GymHours no disponible para asociaciones');
      if (!db.GymTimeSlots) console.log('   ⚠️ GymTimeSlots no disponible para asociaciones');
    }
    
  } catch (error) {
    console.error('❌ Error en asociaciones manuales:', error.message);
  }
};

// ✅ Ejecutar configuración de asociaciones
configureAssociations();

// ✅ CONFIGURAR ASOCIACIONES ADICIONALES DE USUARIOS
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
}

// OPCIONAL: Asociación adicional para transferValidator
if (db.Payment && db.User) {
  if (!db.Payment.associations?.transferValidator) {
    db.Payment.belongsTo(db.User, { 
      foreignKey: 'transferValidatedBy', 
      as: 'transferValidator', 
      constraints: false 
    });
    console.log('   ✅ Manual: Payment -> transferValidator');
  }
}

// ✅ Agregar sequelize al objeto db
db.sequelize = sequelize;
db.Sequelize = Sequelize;

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

// ✅ FUNCIÓN DE VERIFICACIÓN DE MODELOS GENERAL
const verifyModels = () => {
  const loadedModels = Object.keys(db).filter(key => !['sequelize', 'Sequelize', 'diagnose', 'verifyFlexibleScheduleModels'].includes(key));
  
  console.log('\n📊 RESUMEN FINAL:');
  console.log(`✅ Modelos cargados: ${loadedModels.length}`);
  
  if (loadedModels.length > 0) {
    console.log(`📦 Lista: ${loadedModels.join(', ')}`);
    
    // Mostrar asociaciones por modelo
    loadedModels.forEach(modelName => {
      const model = db[modelName];
      if (model && model.associations) {
        const assocCount = Object.keys(model.associations).length;
        if (assocCount > 0) {
          console.log(`🔗 ${modelName}: ${assocCount} asociaciones - ${Object.keys(model.associations).join(', ')}`);
        } else {
          console.log(`📦 ${modelName}: Sin asociaciones`);
        }
      }
    });
    
    // ✅ VERIFICAR MODELOS CRÍTICOS DE TIENDA
    const criticalStoreModels = ['StoreProduct', 'StoreCategory', 'StoreBrand'];
    const missingCritical = criticalStoreModels.filter(model => !db[model]);
    
    if (missingCritical.length > 0) {
      console.log(`⚠️ Modelos críticos faltantes: ${missingCritical.join(', ')}`);
    } else {
      console.log('✅ Todos los modelos críticos de tienda están cargados');
    }
    
    // ✅ VERIFICAR MODELOS CRÍTICOS DE HORARIOS FLEXIBLES
    const criticalScheduleModels = ['GymHours', 'GymTimeSlots'];
    const missingSchedule = criticalScheduleModels.filter(model => !db[model]);
    
    if (missingSchedule.length > 0) {
      console.log(`⚠️ Modelos de horarios faltantes: ${missingSchedule.join(', ')}`);
    } else {
      console.log('✅ Todos los modelos de horarios flexibles están cargados');
      // Verificar asociaciones específicas
      verifyFlexibleScheduleModels();
    }
    
  } else {
    console.log('❌ No se cargaron modelos - revisar estructura de archivos');
  }
};

// ✅ Verificar modelos
verifyModels();

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

console.log('🎉 Carga simplificada completada\n');

// ✅ EXPORTAR FUNCIÓN DE DIAGNÓSTICO EXTENDIDA
db.diagnose = () => {
  console.log('\n🔍 DIAGNÓSTICO COMPLETO DE MODELOS:');
  
  const models = Object.keys(db).filter(key => !['sequelize', 'Sequelize', 'diagnose', 'verifyFlexibleScheduleModels'].includes(key));
  
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
  
  // ✅ Diagnóstico específico de horarios flexibles
  console.log('\n🕐 DIAGNÓSTICO DE HORARIOS FLEXIBLES:');
  const flexibleDiagnosis = verifyFlexibleScheduleModels();
  console.log(`   - Modelos disponibles: ${flexibleDiagnosis.gymHoursAvailable && flexibleDiagnosis.gymTimeSlotsAvailable ? 'SÍ' : 'NO'}`);
  console.log(`   - Asociaciones configuradas: ${flexibleDiagnosis.associationsConfigured ? 'SÍ' : 'NO'}`);
  
  return {
    totalModels: models.length,
    modelsWithAssociations: models.filter(m => db[m].associations && Object.keys(db[m].associations).length > 0).length,
    storeModelsLoaded: ['StoreProduct', 'StoreCategory', 'StoreBrand', 'StoreProductImage'].filter(m => db[m]).length,
    flexibleScheduleModelsLoaded: ['GymHours', 'GymTimeSlots'].filter(m => db[m]).length,
    flexibleScheduleReady: flexibleDiagnosis.associationsConfigured
  };
};

// ✅ EXPORTAR FUNCIÓN DE VERIFICACIÓN DE HORARIOS FLEXIBLES
db.verifyFlexibleScheduleModels = verifyFlexibleScheduleModels;

module.exports = db;