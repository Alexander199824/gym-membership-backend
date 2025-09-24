// src/models/LocalSaleItem.js - CORREGIDO: Consistencia de foreign keys
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LocalSaleItem = sequelize.define('LocalSaleItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  localSaleId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'local_sale_id',
    references: {
      model: 'local_sales',
      key: 'id'
    }
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
  
  // ✅ Snapshot del producto (para mantener historial)
  productName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'product_name'
  },
  productSku: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'product_sku'
  },
  productPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'product_price',
    comment: 'Precio original del producto al momento de la venta'
  },
  
  // ✅ Detalles de venta
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'unit_price',
    comment: 'Precio unitario aplicado (puede incluir descuentos)'
  },
  discountPercent: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'discount_percent',
    validate: {
      min: 0,
      max: 100
    }
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'total_price',
    comment: 'Precio total del item (unitPrice * quantity)'
  }
}, {
  tableName: 'local_sale_items',
  timestamps: true,
  indexes: [
    { fields: ['local_sale_id'] },
    { fields: ['product_id'] }
  ]
});

// ✅ MÉTODOS DE INSTANCIA
LocalSaleItem.prototype.calculateDiscount = function() {
  if (this.discountPercent > 0) {
    return parseFloat((this.productPrice * this.quantity * (this.discountPercent / 100)).toFixed(2));
  }
  return 0;
};

LocalSaleItem.prototype.getDiscountAmount = function() {
  return this.calculateDiscount();
};

LocalSaleItem.prototype.calculateSubtotal = function() {
  return parseFloat((this.productPrice * this.quantity).toFixed(2));
};

LocalSaleItem.prototype.verifyTotalPrice = function() {
  const expectedTotal = parseFloat((this.unitPrice * this.quantity).toFixed(2));
  return Math.abs(expectedTotal - parseFloat(this.totalPrice)) < 0.01; // Tolerancia de 1 centavo
};

// ✅ HOOKS PARA VALIDACIÓN
LocalSaleItem.addHook('beforeSave', (item) => {
  // Auto-calcular totalPrice si no está establecido
  if (!item.totalPrice || item.totalPrice === 0) {
    item.totalPrice = parseFloat((item.unitPrice * item.quantity).toFixed(2));
  }
  
  // Validar que el totalPrice sea correcto
  const expectedTotal = parseFloat((item.unitPrice * item.quantity).toFixed(2));
  if (Math.abs(expectedTotal - parseFloat(item.totalPrice)) > 0.01) {
    throw new Error(`TotalPrice incorrecto. Esperado: ${expectedTotal}, Recibido: ${item.totalPrice}`);
  }
});

// ✅ MÉTODOS ESTÁTICOS
LocalSaleItem.getTopSellingProducts = async function(startDate, endDate, limit = 10) {
  try {
    const topProducts = await this.findAll({
      attributes: [
        'productId',
        'productName',
        'productSku',
        [this.sequelize.fn('SUM', this.sequelize.col('quantity')), 'totalSold'],
        [this.sequelize.fn('SUM', this.sequelize.col('totalPrice')), 'totalRevenue'],
        [this.sequelize.fn('COUNT', this.sequelize.col('LocalSaleItem.id')), 'timesSold'],
        [this.sequelize.fn('AVG', this.sequelize.col('unitPrice')), 'averagePrice']
      ],
      include: [{
        association: 'localSale',
        attributes: [],
        where: {
          workDate: {
            [this.sequelize.Sequelize.Op.between]: [startDate, endDate]
          },
          status: 'completed'
        }
      }],
      group: ['productId', 'productName', 'productSku'],
      order: [[this.sequelize.fn('SUM', this.sequelize.col('quantity')), 'DESC']],
      limit
    });

    return topProducts.map(item => ({
      productId: item.productId,
      productName: item.productName,
      productSku: item.productSku,
      totalSold: parseInt(item.dataValues.totalSold),
      totalRevenue: parseFloat(item.dataValues.totalRevenue),
      timesSold: parseInt(item.dataValues.timesSold),
      averagePrice: parseFloat(item.dataValues.averagePrice)
    }));
  } catch (error) {
    console.error('❌ Error obteniendo productos más vendidos:', error);
    return [];
  }
};

LocalSaleItem.getProductSalesStats = async function(productId, startDate, endDate) {
  try {
    const stats = await this.findOne({
      attributes: [
        [this.sequelize.fn('SUM', this.sequelize.col('quantity')), 'totalSold'],
        [this.sequelize.fn('SUM', this.sequelize.col('totalPrice')), 'totalRevenue'],
        [this.sequelize.fn('COUNT', this.sequelize.col('LocalSaleItem.id')), 'timesSold'],
        [this.sequelize.fn('AVG', this.sequelize.col('unitPrice')), 'averagePrice'],
        [this.sequelize.fn('MIN', this.sequelize.col('unitPrice')), 'minPrice'],
        [this.sequelize.fn('MAX', this.sequelize.col('unitPrice')), 'maxPrice']
      ],
      include: [{
        association: 'localSale',
        attributes: [],
        where: {
          workDate: {
            [this.sequelize.Sequelize.Op.between]: [startDate, endDate]
          },
          status: 'completed'
        }
      }],
      where: { productId }
    });

    return {
      totalSold: parseInt(stats?.dataValues?.totalSold || 0),
      totalRevenue: parseFloat(stats?.dataValues?.totalRevenue || 0),
      timesSold: parseInt(stats?.dataValues?.timesSold || 0),
      averagePrice: parseFloat(stats?.dataValues?.averagePrice || 0),
      minPrice: parseFloat(stats?.dataValues?.minPrice || 0),
      maxPrice: parseFloat(stats?.dataValues?.maxPrice || 0)
    };
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de producto:', error);
    return {
      totalSold: 0,
      totalRevenue: 0,
      timesSold: 0,
      averagePrice: 0,
      minPrice: 0,
      maxPrice: 0
    };
  }
};

LocalSaleItem.getSalesByCategory = async function(startDate, endDate) {
  try {
    const categoryStats = await this.findAll({
      attributes: [
        [this.sequelize.col('product.category.name'), 'categoryName'],
        [this.sequelize.fn('SUM', this.sequelize.col('quantity')), 'totalSold'],
        [this.sequelize.fn('SUM', this.sequelize.col('totalPrice')), 'totalRevenue'],
        [this.sequelize.fn('COUNT', this.sequelize.col('LocalSaleItem.id')), 'itemCount']
      ],
      include: [
        {
          association: 'localSale',
          attributes: [],
          where: {
            workDate: {
              [this.sequelize.Sequelize.Op.between]: [startDate, endDate]
            },
            status: 'completed'
          }
        },
        {
          association: 'product',
          attributes: [],
          include: [{
            association: 'category',
            attributes: []
          }]
        }
      ],
      group: [this.sequelize.col('product.category.name')],
      order: [[this.sequelize.fn('SUM', this.sequelize.col('totalPrice')), 'DESC']]
    });

    return categoryStats.map(stat => ({
      categoryName: stat.dataValues.categoryName,
      totalSold: parseInt(stat.dataValues.totalSold),
      totalRevenue: parseFloat(stat.dataValues.totalRevenue),
      itemCount: parseInt(stat.dataValues.itemCount)
    }));
  } catch (error) {
    console.error('❌ Error obteniendo ventas por categoría:', error);
    return [];
  }
};

LocalSaleItem.getDailySalesItems = async function(date, employeeId = null) {
  try {
    const where = { workDate: date, status: 'completed' };
    if (employeeId) where.employeeId = employeeId;

    return await this.findAll({
      include: [{
        association: 'localSale',
        where,
        include: [{
          association: 'employee',
          attributes: ['id', 'firstName', 'lastName']
        }]
      }, {
        association: 'product',
        attributes: ['id', 'name', 'sku', 'stockQuantity']
      }],
      order: [['createdAt', 'DESC']]
    });
  } catch (error) {
    console.error('❌ Error obteniendo items de ventas del día:', error);
    return [];
  }
};

// ✅ ASOCIACIONES CORREGIDAS
LocalSaleItem.associate = function(models) {
  console.log('🔗 Configurando asociaciones para LocalSaleItem...');
  
  if (models.LocalSale) {
    LocalSaleItem.belongsTo(models.LocalSale, {
      foreignKey: 'localSaleId',
      as: 'localSale'
    });
    console.log('   ✅ LocalSaleItem -> LocalSale (localSale)');
  }
  
  if (models.StoreProduct) {
    LocalSaleItem.belongsTo(models.StoreProduct, {
      foreignKey: 'productId',
      as: 'product'
    });
    console.log('   ✅ LocalSaleItem -> StoreProduct (product)');
  }
};

module.exports = LocalSaleItem;