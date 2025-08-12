// src/models/index.js - ESTRUCTURA COMPLETAMENTE CORREGIDA
'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/database.js')[env];
const db = {};

// ✅ Inicializar Sequelize
let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

// ✅ PASO 1: Cargar TODOS los modelos automáticamente
console.log('🔄 Cargando modelos desde:', __dirname);

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    console.log('📁 Cargando modelo:', file);
    try {
      const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
      db[model.name] = model;
      console.log('✅ Modelo cargado:', model.name);
    } catch (error) {
      console.error('❌ Error cargando modelo', file, ':', error.message);
    }
  });

console.log('📋 Modelos cargados:', Object.keys(db));

// ✅ PASO 2: Configurar asociaciones automáticamente
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    console.log('🔗 Configurando asociaciones para:', modelName);
    try {
      db[modelName].associate(db);
      console.log('✅ Asociaciones configuradas para:', modelName);
    } catch (error) {
      console.error('❌ Error en asociaciones de', modelName, ':', error.message);
    }
  }
});

// ✅ PASO 3: Definir asociaciones manuales adicionales SOLO si los modelos existen
console.log('🔗 Configurando asociaciones manuales adicionales...');

// User - Membership
if (db.User && db.Membership) {
  try {
    if (!db.User.associations.memberships) {
      db.User.hasMany(db.Membership, { foreignKey: 'userId', as: 'memberships' });
    }
    if (!db.Membership.associations.user) {
      db.Membership.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
    }
    console.log('✅ Asociaciones User-Membership configuradas');
  } catch (error) {
    console.error('❌ Error en asociaciones User-Membership:', error.message);
  }
}

// User - Payment
if (db.User && db.Payment) {
  try {
    if (!db.User.associations.payments) {
      db.User.hasMany(db.Payment, { foreignKey: 'userId', as: 'payments' });
    }
    if (!db.Payment.associations.user) {
      db.Payment.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
    }
    
    // Relación para registeredBy
    if (!db.User.associations.registeredPayments) {
      db.User.hasMany(db.Payment, { foreignKey: 'registeredBy', as: 'registeredPayments' });
    }
    if (!db.Payment.associations.registeredByUser) {
      db.Payment.belongsTo(db.User, { foreignKey: 'registeredBy', as: 'registeredByUser' });
    }
    
    console.log('✅ Asociaciones User-Payment configuradas');
  } catch (error) {
    console.error('❌ Error en asociaciones User-Payment:', error.message);
  }
}

// User - FinancialMovements
if (db.User && db.FinancialMovements) {
  try {
    if (!db.User.associations.financialMovements) {
      db.User.hasMany(db.FinancialMovements, { 
        foreignKey: 'registeredBy', 
        as: 'financialMovements' 
      });
    }
    if (!db.FinancialMovements.associations.registeredByUser) {
      db.FinancialMovements.belongsTo(db.User, { 
        foreignKey: 'registeredBy', 
        as: 'registeredByUser' 
      });
    }
    console.log('✅ Asociaciones User-FinancialMovements configuradas');
  } catch (error) {
    console.error('❌ Error en asociaciones User-FinancialMovements:', error.message);
  }
}

// Payment - Membership
if (db.Payment && db.Membership) {
  try {
    if (!db.Payment.associations.membership) {
      db.Payment.belongsTo(db.Membership, { foreignKey: 'membershipId', as: 'membership' });
    }
    if (!db.Membership.associations.payments) {
      db.Membership.hasMany(db.Payment, { foreignKey: 'membershipId', as: 'payments' });
    }
    console.log('✅ Asociaciones Payment-Membership configuradas');
  } catch (error) {
    console.error('❌ Error en asociaciones Payment-Membership:', error.message);
  }
}

// ✅ ASOCIACIONES DE TIENDA
if (db.StoreCategory && db.StoreProduct) {
  try {
    if (!db.StoreCategory.associations.products) {
      db.StoreCategory.hasMany(db.StoreProduct, { foreignKey: 'categoryId', as: 'products' });
    }
    if (!db.StoreProduct.associations.category) {
      db.StoreProduct.belongsTo(db.StoreCategory, { foreignKey: 'categoryId', as: 'category' });
    }
    console.log('✅ Asociaciones StoreCategory-StoreProduct configuradas');
  } catch (error) {
    console.error('❌ Error en asociaciones StoreCategory-StoreProduct:', error.message);
  }
}

if (db.StoreBrand && db.StoreProduct) {
  try {
    if (!db.StoreBrand.associations.products) {
      db.StoreBrand.hasMany(db.StoreProduct, { foreignKey: 'brandId', as: 'products' });
    }
    if (!db.StoreProduct.associations.brand) {
      db.StoreProduct.belongsTo(db.StoreBrand, { foreignKey: 'brandId', as: 'brand' });
    }
    console.log('✅ Asociaciones StoreBrand-StoreProduct configuradas');
  } catch (error) {
    console.error('❌ Error en asociaciones StoreBrand-StoreProduct:', error.message);
  }
}

if (db.StoreProduct && db.StoreProductImage) {
  try {
    if (!db.StoreProduct.associations.images) {
      db.StoreProduct.hasMany(db.StoreProductImage, { foreignKey: 'productId', as: 'images' });
    }
    if (!db.StoreProductImage.associations.product) {
      db.StoreProductImage.belongsTo(db.StoreProduct, { foreignKey: 'productId', as: 'product' });
    }
    console.log('✅ Asociaciones StoreProduct-StoreProductImage configuradas');
  } catch (error) {
    console.error('❌ Error en asociaciones StoreProduct-StoreProductImage:', error.message);
  }
}

if (db.User && db.StoreCart) {
  try {
    if (!db.User.associations.cartItems) {
      db.User.hasMany(db.StoreCart, { foreignKey: 'userId', as: 'cartItems' });
    }
    if (!db.StoreCart.associations.user) {
      db.StoreCart.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
    }
    console.log('✅ Asociaciones User-StoreCart configuradas');
  } catch (error) {
    console.error('❌ Error en asociaciones User-StoreCart:', error.message);
  }
}

if (db.StoreProduct && db.StoreCart) {
  try {
    if (!db.StoreCart.associations.product) {
      db.StoreCart.belongsTo(db.StoreProduct, { foreignKey: 'productId', as: 'product' });
    }
    if (!db.StoreProduct.associations.cartItems) {
      db.StoreProduct.hasMany(db.StoreCart, { foreignKey: 'productId', as: 'cartItems' });
    }
    console.log('✅ Asociaciones StoreProduct-StoreCart configuradas');
  } catch (error) {
    console.error('❌ Error en asociaciones StoreProduct-StoreCart:', error.message);
  }
}

if (db.User && db.StoreOrder) {
  try {
    if (!db.User.associations.storeOrders) {
      db.User.hasMany(db.StoreOrder, { foreignKey: 'userId', as: 'storeOrders' });
    }
    if (!db.StoreOrder.associations.user) {
      db.StoreOrder.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
    }
    
    // Relación para processedBy
    if (!db.User.associations.processedOrders) {
      db.User.hasMany(db.StoreOrder, { foreignKey: 'processedBy', as: 'processedOrders' });
    }
    if (!db.StoreOrder.associations.processor) {
      db.StoreOrder.belongsTo(db.User, { foreignKey: 'processedBy', as: 'processor' });
    }
    
    console.log('✅ Asociaciones User-StoreOrder configuradas');
  } catch (error) {
    console.error('❌ Error en asociaciones User-StoreOrder:', error.message);
  }
}

if (db.StoreOrder && db.StoreOrderItem) {
  try {
    if (!db.StoreOrder.associations.items) {
      db.StoreOrder.hasMany(db.StoreOrderItem, { foreignKey: 'orderId', as: 'items' });
    }
    if (!db.StoreOrderItem.associations.order) {
      db.StoreOrderItem.belongsTo(db.StoreOrder, { foreignKey: 'orderId', as: 'order' });
    }
    console.log('✅ Asociaciones StoreOrder-StoreOrderItem configuradas');
  } catch (error) {
    console.error('❌ Error en asociaciones StoreOrder-StoreOrderItem:', error.message);
  }
}

if (db.StoreProduct && db.StoreOrderItem) {
  try {
    if (!db.StoreOrderItem.associations.product) {
      db.StoreOrderItem.belongsTo(db.StoreProduct, { foreignKey: 'productId', as: 'product' });
    }
    if (!db.StoreProduct.associations.orderItems) {
      db.StoreProduct.hasMany(db.StoreOrderItem, { foreignKey: 'productId', as: 'orderItems' });
    }
    console.log('✅ Asociaciones StoreProduct-StoreOrderItem configuradas');
  } catch (error) {
    console.error('❌ Error en asociaciones StoreProduct-StoreOrderItem:', error.message);
  }
}

// ✅ ASOCIACIONES ADICIONALES
if (db.User && db.DailyIncome) {
  try {
    if (!db.User.associations.registeredIncomes) {
      db.User.hasMany(db.DailyIncome, { foreignKey: 'registeredBy', as: 'registeredIncomes' });
    }
    if (!db.DailyIncome.associations.registeredByUser) {
      db.DailyIncome.belongsTo(db.User, { foreignKey: 'registeredBy', as: 'registeredByUser' });
    }
    console.log('✅ Asociaciones User-DailyIncome configuradas');
  } catch (error) {
    console.error('❌ Error en asociaciones User-DailyIncome:', error.message);
  }
}

if (db.User && db.Notification) {
  try {
    if (!db.User.associations.notifications) {
      db.User.hasMany(db.Notification, { foreignKey: 'userId', as: 'notifications' });
    }
    if (!db.Notification.associations.user) {
      db.Notification.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
    }
    console.log('✅ Asociaciones User-Notification configuradas');
  } catch (error) {
    console.error('❌ Error en asociaciones User-Notification:', error.message);
  }
}

// ✅ Agregar sequelize y Sequelize al objeto db
db.sequelize = sequelize;
db.Sequelize = Sequelize;

console.log('✅ Todos los modelos y asociaciones configurados exitosamente');
console.log('📊 Modelos disponibles:', Object.keys(db).filter(key => key !== 'sequelize' && key !== 'Sequelize'));

module.exports = db;