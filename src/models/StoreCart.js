// src/models/StoreCart.js - CORREGIDO con métodos estáticos
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

// ✅ MÉTODOS ESTÁTICOS AGREGADOS

// Obtener carrito por usuario
StoreCart.getCartByUser = async function(userId) {
  try {
    console.log('🛒 Obteniendo carrito para usuario:', userId);
    
    const cartItems = await this.findAll({
      where: { userId },
      include: [{
        association: 'product',
        attributes: ['id', 'name', 'price', 'stockQuantity']
      }],
      order: [['createdAt', 'ASC']]
    });
    
    console.log(`✅ Carrito obtenido: ${cartItems.length} items`);
    return cartItems;
  } catch (error) {
    console.error('❌ Error obteniendo carrito por usuario:', error);
    throw error;
  }
};

// Obtener carrito por sesión (usuarios invitados)
StoreCart.getCartBySession = async function(sessionId) {
  try {
    console.log('🎫 Obteniendo carrito para sesión:', sessionId);
    
    const cartItems = await this.findAll({
      where: { 
        sessionId,
        userId: null // Solo para invitados
      },
      include: [{
        association: 'product',
        attributes: ['id', 'name', 'price', 'stockQuantity']
      }],
      order: [['createdAt', 'ASC']]
    });
    
    console.log(`✅ Carrito de invitado obtenido: ${cartItems.length} items`);
    return cartItems;
  } catch (error) {
    console.error('❌ Error obteniendo carrito por sesión:', error);
    throw error;
  }
};

// Limpiar carrito (tanto usuario como sesión)
StoreCart.clearCart = async function(userId = null, sessionId = null) {
  try {
    let where = {};
    
    if (userId) {
      where.userId = userId;
      console.log('🧹 Limpiando carrito para usuario:', userId);
    } else if (sessionId) {
      where.sessionId = sessionId;
      where.userId = null;
      console.log('🧹 Limpiando carrito para sesión:', sessionId);
    } else {
      throw new Error('Se requiere userId o sessionId para limpiar el carrito');
    }
    
    const deletedCount = await this.destroy({ where });
    
    console.log(`✅ Carrito limpiado: ${deletedCount} items eliminados`);
    return deletedCount;
  } catch (error) {
    console.error('❌ Error limpiando carrito:', error);
    throw error;
  }
};

// Migrar carrito de sesión a usuario (cuando se registra)
StoreCart.migrateSessionToUser = async function(sessionId, userId) {
  try {
    console.log('🔄 Migrando carrito de sesión a usuario:', { sessionId, userId });
    
    // Verificar si ya tiene items en el carrito como usuario
    const existingUserItems = await this.findAll({
      where: { userId },
      attributes: ['productId']
    });
    
    const existingProductIds = existingUserItems.map(item => item.productId);
    
    // Obtener items de la sesión
    const sessionItems = await this.findAll({
      where: { 
        sessionId,
        userId: null
      }
    });
    
    let migratedCount = 0;
    let mergedCount = 0;
    
    for (const sessionItem of sessionItems) {
      if (existingProductIds.includes(sessionItem.productId)) {
        // Ya existe el producto, sumar cantidad
        const existingItem = await this.findOne({
          where: { 
            userId, 
            productId: sessionItem.productId 
          }
        });
        
        if (existingItem) {
          existingItem.quantity += sessionItem.quantity;
          await existingItem.save();
          mergedCount++;
        }
        
        // Eliminar item de la sesión
        await sessionItem.destroy();
      } else {
        // No existe, migrar directamente
        sessionItem.userId = userId;
        sessionItem.sessionId = null;
        await sessionItem.save();
        migratedCount++;
      }
    }
    
    console.log(`✅ Carrito migrado: ${migratedCount} nuevos, ${mergedCount} combinados`);
    return { migratedCount, mergedCount };
  } catch (error) {
    console.error('❌ Error migrando carrito:', error);
    throw error;
  }
};

// Obtener resumen del carrito
StoreCart.getCartSummary = async function(userId = null, sessionId = null) {
  try {
    let where = {};
    
    if (userId) {
      where.userId = userId;
    } else if (sessionId) {
      where.sessionId = sessionId;
      where.userId = null;
    } else {
      return {
        itemsCount: 0,
        subtotal: 0,
        totalQuantity: 0
      };
    }
    
    const cartItems = await this.findAll({
      where,
      include: [{
        association: 'product',
        attributes: ['price']
      }]
    });
    
    const summary = cartItems.reduce((acc, item) => {
      const itemPrice = parseFloat(item.unitPrice || item.product?.price || 0);
      const quantity = parseInt(item.quantity || 0);
      
      acc.itemsCount += 1;
      acc.totalQuantity += quantity;
      acc.subtotal += itemPrice * quantity;
      
      return acc;
    }, {
      itemsCount: 0,
      subtotal: 0,
      totalQuantity: 0
    });
    
    return summary;
  } catch (error) {
    console.error('❌ Error obteniendo resumen del carrito:', error);
    return {
      itemsCount: 0,
      subtotal: 0,
      totalQuantity: 0
    };
  }
};

// Verificar stock antes de checkout
StoreCart.validateStock = async function(userId = null, sessionId = null) {
  try {
    let where = {};
    
    if (userId) {
      where.userId = userId;
    } else if (sessionId) {
      where.sessionId = sessionId;
      where.userId = null;
    } else {
      return { valid: false, errors: ['No cart found'] };
    }
    
    const cartItems = await this.findAll({
      where,
      include: [{
        association: 'product',
        attributes: ['id', 'name', 'stockQuantity', 'isActive']
      }]
    });
    
    const errors = [];
    
    for (const item of cartItems) {
      const product = item.product;
      
      if (!product.isActive) {
        errors.push(`${product.name} ya no está disponible`);
        continue;
      }
      
      if (product.stockQuantity < item.quantity) {
        errors.push(`${product.name}: stock insuficiente (disponible: ${product.stockQuantity}, solicitado: ${item.quantity})`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      items: cartItems
    };
  } catch (error) {
    console.error('❌ Error validando stock:', error);
    return { 
      valid: false, 
      errors: ['Error validando stock'] 
    };
  }
};

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