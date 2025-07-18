// src/models/StoreCart.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StoreCart = sequelize.define('StoreCart', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // ✅ Usuario (puede ser null para carritos de invitados)
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // ✅ ID de sesión para carritos de invitados
  sessionId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'session_id'
  },
  // ✅ Producto
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'product_id',
    references: {
      model: 'store_products',
      key: 'id'
    }
  },
  // ✅ Cantidad
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  // ✅ Variantes seleccionadas
  selectedVariants: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'selected_variants'
  },
  // ✅ Precio unitario al momento de agregar
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'unit_price'
  }
}, {
  tableName: 'store_cart_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['session_id'] },
    { fields: ['product_id'] },
    { fields: ['user_id', 'product_id'] }
  ]
});

// ✅ Métodos estáticos
StoreCart.getCartByUser = async function(userId) {
  return await this.findAll({
    where: { userId },
    include: ['product'],
    order: [['createdAt', 'ASC']]
  });
};

StoreCart.getCartBySession = async function(sessionId) {
  return await this.findAll({
    where: { sessionId },
    include: ['product'],
    order: [['createdAt', 'ASC']]
  });
};

StoreCart.clearCart = async function(userId = null, sessionId = null) {
  const where = {};
  if (userId) where.userId = userId;
  if (sessionId) where.sessionId = sessionId;
  
  return await this.destroy({ where });
};

module.exports = StoreCart;