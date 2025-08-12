// ===== StoreCart.js - CORREGIDO =====
// src/models/StoreCart.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StoreCart = sequelize.define('StoreCart', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  sessionId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'session_id'
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'product_id',
    references: {
      model: 'store_products',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  selectedVariants: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'selected_variants'
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'unit_price'
  }
}, {
  tableName: 'store_cart_items',
  timestamps: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['session_id'] },
    { fields: ['product_id'] },
    { fields: ['user_id', 'product_id'] }
  ]
});

// ✅ AGREGAR ASOCIACIONES
StoreCart.associate = function(models) {
  console.log('🔗 Configurando asociaciones para StoreCart...');
  
  if (models.User) {
    StoreCart.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    console.log('   ✅ StoreCart -> User (user)');
  }
  
  if (models.StoreProduct) {
    StoreCart.belongsTo(models.StoreProduct, {
      foreignKey: 'productId',
      as: 'product'
    });
    console.log('   ✅ StoreCart -> StoreProduct (product)');
  }
};

module.exports = StoreCart;