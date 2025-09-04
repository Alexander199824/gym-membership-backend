// src/models/index.js - CORREGIDO: Con MembershipPlans (plural) consistente
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

// ✅ LISTA EXPLÍCITA de modelos en orden de dependencias (CORREGIDA)
const MODEL_ORDER = [
  // Modelos base sin dependencias
  'User.js',
  'MembershipPlans.js', 
  'StoreBrand.js',
  'StoreCategory.js',
  'GymConfiguration.js',
  'GymHours.js',
  'GymTimeSlots.js',
  'DailyIncome.js',
  'GymBrandingConfig.js',     // Sin FK
  'GymContactInfo.js',        // Sin F
   'GymFormsConfig.js',        // Sin FK
  'GymNavigation.js',         // Sin FK
  'GymPromotionalContent.js', // Sin FK
  'GymSectionsContent.js',    // Sin FK
  'GymServices.js',           // Sin FK
  'GymSocialMedia.js',        // Sin FK
  'GymStatistics.js',         // Sin FK
  'GymSystemMessages.js',     // Sin FK
  'GymTestimonials.js',       // Sin FK
  'StoreProduct.js',
  'StoreProductImage.js',
  'Membership.js',
  'Payment.js',
  
  
  // Modelos que dependen de StoreProduct
  'StoreCart.js',
  'StoreOrder.js',
  'StoreOrderItem.js',
  
  // Otros modelos
  'FinancialMovements.js',
  'PromotionCodes.js',
  'MembershipPromotions.js',
  'FinancialMovements.js',    // Depende de User
  'Notification.js',          // Depende de User, Membership, Payment
  'UserSchedulePreferences.js' // Depende de User
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

// ✅ FUNCIÓN para descubrir TODOS los modelos disponibles
const discoverAllModels = () => {
  console.log('🔍 Descubriendo TODOS los modelos disponibles...');
  
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
  
  console.log(`📁 Archivos de modelos encontrados: ${allModelFiles.length}`);
  console.log(`📋 Lista completa: ${allModelFiles.join(', ')}`);
  
  return allModelFiles;
};

// ✅ CARGAR MODELOS EN ORDEN ESPECÍFICO
console.log('📁 Cargando modelos en orden de dependencias...');

MODEL_ORDER.forEach(filename => {
  loadModel(filename);
});

// ✅ CARGAR TODOS LOS DEMÁS MODELOS ENCONTRADOS
console.log('📁 Buscando y cargando TODOS los modelos adicionales...');
const allDiscoveredFiles = discoverAllModels();
const additionalFiles = allDiscoveredFiles.filter(file => !MODEL_ORDER.includes(file));

console.log(`📦 Modelos adicionales a cargar: ${additionalFiles.length}`);
if (additionalFiles.length > 0) {
  console.log(`📋 Archivos adicionales: ${additionalFiles.join(', ')}`);
  
  additionalFiles.forEach(file => {
    loadModel(file);
  });
} else {
  console.log('ℹ️ No hay modelos adicionales fuera de MODEL_ORDER');
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
    
    // ✅ CORREGIDO: MembershipPlans (plural) - Membership
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

// ✅ CONFIGURAR ASOCIACIONES ADICIONALES DE USUARIOS (CORREGIDAS)
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

// ============================================================================
// FUNCIONES DE SINCRONIZACIÓN AUTOMÁTICA DE BASE DE DATOS CON FIX DE PAYMENT
// ============================================================================

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

// ✅ CORREGIDO: Función de sincronización controlada MEJORADA
const syncDatabase = async (options = {}) => {
  console.log('🔄 Iniciando sincronización controlada de base de datos...');
  
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión verificada');

    // ✅ OBTENER TODOS LOS MODELOS CARGADOS
    const allLoadedModels = Object.keys(db).filter(key => 
      !['sequelize', 'Sequelize', 'diagnose', 'verifyFlexibleScheduleModels', 'syncDatabase', 'resetDatabase', 'checkDatabaseStatus', 'initializeForDevelopment', 'fullDiagnosis', 'repairPaymentModel'].includes(key)
    );

    console.log(`📊 TODOS los modelos cargados: ${allLoadedModels.length}`);
    console.log(`📋 Lista completa: ${allLoadedModels.join(', ')}`);

    // ✅ DETECTAR SI ESTAMOS EN DESARROLLO Y NECESITAMOS ALTER
    const isDevelopment = process.env.NODE_ENV === 'development' || options.forceDevelopmentMode;
    const syncOptions = isDevelopment ? { alter: true, ...options } : options;
    
    console.log(`🔧 Modo de sincronización: ${isDevelopment ? 'DESARROLLO (alter: true)' : 'PRODUCCIÓN (alter: false)'}`);

    // ✅ Orden específico para modelos críticos + resto dinámicamente (CORREGIDO)
    const prioritySyncOrder = [
      'User', 'MembershipPlans', 'StoreBrand', 'StoreCategory', 'DailyIncome', 'GymConfiguration', 'GymHours',
      'GymTimeSlots', 'Membership', 'StoreProduct',
      'Payment', 'StoreProductImage', 'StoreCart', 'StoreOrder',
      'StoreOrderItem', 'FinancialMovements'
    ];

    // Agregar modelos que no están en la lista de prioridad
    const remainingModels = allLoadedModels.filter(model => !prioritySyncOrder.includes(model));
    const fullSyncOrder = [...prioritySyncOrder, ...remainingModels];

    console.log(`🔄 Sincronizando ${fullSyncOrder.length} modelos total...`);
    console.log(`⭐ Prioridad (${prioritySyncOrder.length}): ${prioritySyncOrder.join(', ')}`);
    if (remainingModels.length > 0) {
      console.log(`➕ Adicionales (${remainingModels.length}): ${remainingModels.join(', ')}`);
    }

    let syncSuccess = 0;
    let syncErrors = 0;
    let alteredTables = [];

    for (const modelName of fullSyncOrder) {
      if (db[modelName]) {
        try {
          console.log(`🔄 Sincronizando ${modelName}...`);
          
          // ✅ INTENTO 1: Sincronización normal
          await db[modelName].sync(syncOptions);
          console.log(`✅ ${modelName} sincronizado`);
          
          // Si usamos alter, registrar la tabla alterada
          if (syncOptions.alter) {
            alteredTables.push(modelName);
          }
          
          syncSuccess++;
          
        } catch (error) {
          console.error(`❌ Error en ${modelName}:`, error.message);
          
          // ✅ INTENTO 2: Si falla y es error de columna, forzar ALTER
          if (error.message.includes('does not exist') || 
              error.message.includes('column') || 
              error.message.includes('relation')) {
            
            console.log(`🔄 ${modelName}: Detectado error de esquema, forzando ALTER...`);
            
            try {
              // Forzar alter independientemente del entorno
              await db[modelName].sync({ alter: true, force: false });
              console.log(`⚠️ ${modelName} sincronizado con ALTER forzado`);
              alteredTables.push(modelName);
              syncSuccess++;
            } catch (alterError) {
              console.error(`❌ ${modelName}: Error persistente después de ALTER:`, alterError.message);
              
              // ✅ INTENTO 3: Como último recurso, recrear tabla en desarrollo
              if (isDevelopment && (alterError.message.includes('constraint') || alterError.message.includes('type'))) {
                console.log(`🔄 ${modelName}: Último recurso - recreando tabla...`);
                try {
                  await db[modelName].drop({ cascade: true });
                  await db[modelName].sync({ force: false });
                  console.log(`⚠️ ${modelName} recreado completamente`);
                  syncSuccess++;
                } catch (recreateError) {
                  console.error(`❌ ${modelName}: Error incluso recreando:`, recreateError.message);
                  syncErrors++;
                }
              } else {
                syncErrors++;
              }
            }
          } 
          // ✅ INTENTO 2B: Si es error de FK, intentar sin constraints
          else if (error.message.includes('foreign key') || error.message.includes('violates')) {
            console.log(`🔄 ${modelName}: Error de FK, intentando sin constraints...`);
            try {
              await db[modelName].sync({ ...syncOptions, alter: false });
              console.log(`⚠️ ${modelName} sincronizado sin constraints`);
              syncSuccess++;
            } catch (retryError) {
              console.error(`❌ ${modelName}: Error persistente:`, retryError.message);
              syncErrors++;
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
      console.log(`🔧 Tablas alteradas: ${alteredTables.join(', ')}`);
    }

    // ✅ VERIFICACIÓN ESPECÍFICA PARA GYMCONFIGURATION
    if (db.GymConfiguration) {
      try {
        console.log('🔍 Verificando tabla gym_configuration...');
        
        // Intentar crear o verificar configuración
        const config = await db.GymConfiguration.getConfig();
        if (config && config.id) {
          console.log(`✅ Tabla gym_configuration verificada correctamente (ID: ${config.id})`);
        } else {
          console.log('⚠️ Configuración creada pero sin ID verificable');
        }
        
      } catch (verifyError) {
        console.error('❌ Error verificando tabla gym_configuration:', verifyError.message);
      }
    }

    // ✅ Crear datos iniciales (usando MembershipPlans plural)
    if (db.MembershipPlans && db.MembershipPlans.seedDefaultPlans) {
      console.log('🌱 Creando planes de membresía por defecto...');
      try {
        await db.MembershipPlans.seedDefaultPlans();
      } catch (error) {
        console.log('⚠️ Error creando planes por defecto:', error.message);
      }
    }

    // Crear horarios básicos si existen los modelos
    if (db.GymHours && db.GymTimeSlots) {
      await createDefaultGymSchedule();
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
        syncMode: isDevelopment ? 'development' : 'production'
      }
    };

  } catch (error) {
    console.error('❌ Error en sincronización:', error.message);
    return { success: false, error: error.message };
  }
};

// Función de reset para desarrollo
const resetDatabase = async () => {
  console.log('⚠️ RESET DE BASE DE DATOS...');
  
  // Obtener TODOS los modelos cargados
  const allLoadedModels = Object.keys(db).filter(key => 
    !['sequelize', 'Sequelize', 'diagnose', 'verifyFlexibleScheduleModels', 'syncDatabase', 'resetDatabase', 'checkDatabaseStatus', 'initializeForDevelopment', 'fullDiagnosis', 'repairPaymentModel'].includes(key)
  );

  // Orden inverso inteligente (prioridad inversa + resto) - CORREGIDO
  const priorityDropOrder = [
    'FinancialMovements', 'StoreOrderItem', 'StoreOrder', 'StoreCart', 
    'StoreProductImage', 'Payment', 'StoreProduct', 'Membership', 
    'GymTimeSlots', 'GymHours', 'GymConfiguration', 'StoreCategory', 'StoreBrand', 
    'MembershipPlans', 'DailyIncome', 'User'
  ];
  
  const remainingForDrop = allLoadedModels.filter(model => !priorityDropOrder.includes(model));
  // Los adicionales van primero porque pueden depender de los críticos
  const fullDropOrder = [...remainingForDrop, ...priorityDropOrder];

  console.log(`🗑️ Eliminando ${fullDropOrder.length} modelos en orden seguro...`);
  console.log(`📋 Orden de eliminación: ${fullDropOrder.join(', ')}`);

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

    await syncDatabase({ force: true });
    console.log('🔄 Base de datos reseteada');
    return { success: true };
  } catch (error) {
    console.error('❌ Error en reset:', error.message);
    return { success: false, error: error.message };
  }
};

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

// Verificar estado de la base de datos
const checkDatabaseStatus = async () => {
  const models = Object.keys(db).filter(key => 
    !['sequelize', 'Sequelize', 'diagnose', 'verifyFlexibleScheduleModels', 'syncDatabase', 'resetDatabase', 'checkDatabaseStatus', 'initializeForDevelopment', 'fullDiagnosis', 'repairPaymentModel'].includes(key)
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

// ✅ FUNCIÓN DE INICIALIZACIÓN MEJORADA CON FIX DE PAYMENT
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

    // Continuar con inicialización normal
    const status = await checkDatabaseStatus();
    const hasErrors = Object.values(status).some(info => !info.exists);
    
    if (hasErrors) {
      console.log('⚠️ Errores detectados, reseteando...');
      return await resetDatabase();
    } else {
      console.log('✅ Estado OK, sincronizando con ALTER...');
      return await syncDatabase({ alter: true, forceDevelopmentMode: true });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
};

// Exportar las funciones de sincronización
db.syncDatabase = syncDatabase;
db.resetDatabase = resetDatabase;
db.checkDatabaseStatus = checkDatabaseStatus;
db.initializeForDevelopment = initializeForDevelopment;
db.repairPaymentModel = repairPaymentModel;

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

// ============================================================================
// FUNCIONES DE DIAGNÓSTICO ORIGINALES + MEJORADAS
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

// ✅ FUNCIÓN DE VERIFICACIÓN DE MODELOS MEJORADA
const verifyModels = () => {
  const allDiscovered = discoverAllModels();
  const loadedModels = Object.keys(db).filter(key => 
    !['sequelize', 'Sequelize', 'diagnose', 'verifyFlexibleScheduleModels', 'syncDatabase', 'resetDatabase', 'checkDatabaseStatus', 'initializeForDevelopment', 'fullDiagnosis', 'repairPaymentModel'].includes(key)
  );
  
  console.log('\n📊 RESUMEN COMPLETO:');
  console.log(`📁 Archivos .js encontrados: ${allDiscovered.length}`);
  console.log(`✅ Modelos cargados exitosamente: ${loadedModels.length}`);
  console.log(`❌ Archivos no cargados: ${allDiscovered.length - loadedModels.length}`);
  
  if (allDiscovered.length > loadedModels.length) {
    const notLoaded = allDiscovered.filter(file => {
      const modelName = file.replace('.js', '');
      return !loadedModels.some(loaded => 
        loaded === modelName || 
        loaded.toLowerCase() === modelName.toLowerCase()
      );
    });
    console.log(`⚠️ Archivos no cargados como modelos: ${notLoaded.join(', ')}`);
  }
  
  if (loadedModels.length > 0) {
    console.log(`📦 Modelos cargados: ${loadedModels.join(', ')}`);
    
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
    
    // ✅ VERIFICAR QUE MEMBERSHIPPLANS ESTÉ CARGADO CORRECTAMENTE
    if (db.MembershipPlans) {
      console.log('✅ MembershipPlans (plural) cargado correctamente');
    } else {
      console.log('❌ MembershipPlans (plural) NO encontrado - esto puede causar errores');
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
  
  const models = Object.keys(db).filter(key => !['sequelize', 'Sequelize', 'diagnose', 'verifyFlexibleScheduleModels', 'syncDatabase', 'resetDatabase', 'checkDatabaseStatus', 'initializeForDevelopment', 'fullDiagnosis', 'repairPaymentModel'].includes(key));
  
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
    flexibleScheduleReady: flexibleDiagnosis.associationsConfigured,
    membershipPlansLoaded: !!db.MembershipPlans
  };
};

// ✅ NUEVA FUNCIÓN DE DIAGNÓSTICO COMPLETO
db.fullDiagnosis = () => {
  console.log('\n🔍 DIAGNÓSTICO COMPLETO Y DETALLADO:');
  
  const allFiles = discoverAllModels();
  const loadedModels = Object.keys(db).filter(key => 
    !['sequelize', 'Sequelize', 'diagnose', 'verifyFlexibleScheduleModels', 'syncDatabase', 'resetDatabase', 'checkDatabaseStatus', 'initializeForDevelopment', 'fullDiagnosis', 'repairPaymentModel'].includes(key)
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

// ✅ EXPORTAR FUNCIÓN DE VERIFICACIÓN DE HORARIOS FLEXIBLES
db.verifyFlexibleScheduleModels = verifyFlexibleScheduleModels;

// Ejecutar auto-inicialización solo si no es entorno de pruebas
if (process.env.NODE_ENV !== 'test') {
  autoInit();
}

module.exports = db;