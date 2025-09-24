// src/models/LocalSale.js - CORREGIDO: Asociaciones consistentes
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LocalSale = sequelize.define('LocalSale', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  saleNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'sale_number'
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'employee_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  workDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'work_date'
  },
  
  // ✅ Totales
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'discount_amount'
  },
  taxAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'tax_amount'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'total_amount'
  },
  
  // ✅ Método de pago (SOLO efectivo y transferencia)
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'transfer'),
    allowNull: false,
    field: 'payment_method'
  },
  
  // ✅ Para efectivo
  cashReceived: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'cash_received'
  },
  changeGiven: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'change_given'
  },
  
  // ✅ Para transferencias
  transferVoucher: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'transfer_voucher',
    comment: 'Descripción del voucher WhatsApp'
  },
  transferConfirmed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'transfer_confirmed'
  },
  transferConfirmedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'transfer_confirmed_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  transferConfirmedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'transfer_confirmed_at'
  },
  bankReference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'bank_reference'
  },
  transferAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'transfer_amount'
  },
  
  // ✅ Cliente (opcional)
  customerName: {
    type: DataTypes.STRING(200),
    allowNull: true,
    field: 'customer_name'
  },
  customerPhone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'customer_phone'
  },
  customerEmail: {
    type: DataTypes.STRING(200),
    allowNull: true,
    field: 'customer_email'
  },
  
  // ✅ Estado
  status: {
    type: DataTypes.ENUM('completed', 'transfer_pending', 'cancelled'),
    allowNull: false,
    defaultValue: 'completed'
  },
  
  // ✅ Metadata
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'local_sales',
  timestamps: true,
  indexes: [
    { fields: ['employee_id'] },
    { fields: ['work_date'] },
    { fields: ['status'] },
    { fields: ['payment_method'] },
    { fields: ['transfer_confirmed'] },
    { fields: ['sale_number'], unique: true }
  ]
});

// ✅ MÉTODOS DE INSTANCIA
LocalSale.prototype.needsTransferConfirmation = function() {
  return this.paymentMethod === 'transfer' && !this.transferConfirmed;
};

LocalSale.prototype.canBeConfirmed = function() {
  return this.status === 'transfer_pending';
};

LocalSale.prototype.getClientInfo = function() {
  return {
    name: this.customerName || 'Cliente local',
    email: this.customerEmail || null,
    phone: this.customerPhone || null,
    type: 'local'
  };
};

LocalSale.prototype.calculateTax = function() {
  return parseFloat((this.subtotal * 0.12).toFixed(2)); // 12% IVA Guatemala
};

LocalSale.prototype.calculateTotal = function() {
  const tax = this.calculateTax();
  return parseFloat((this.subtotal + tax - this.discountAmount).toFixed(2));
};

// ✅ MÉTODOS ESTÁTICOS
LocalSale.generateSaleNumber = function() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const timestamp = now.getTime().toString().slice(-6);
  
  return `LOC-${year}${month}${day}-${timestamp}`;
};

LocalSale.getSalesByEmployee = async function(employeeId, date = null) {
  try {
    const where = { employeeId };
    if (date) where.workDate = date;

    return await this.findAll({
      where,
      include: [
        { association: 'employee', attributes: ['id', 'firstName', 'lastName'] },
        { association: 'items' }
      ],
      order: [['createdAt', 'DESC']]
    });
  } catch (error) {
    console.error('❌ Error obteniendo ventas por empleado:', error);
    return [];
  }
};

LocalSale.getDailySales = async function(date) {
  try {
    return await this.findAll({
      where: { 
        workDate: date,
        status: { [this.sequelize.Sequelize.Op.in]: ['completed', 'transfer_pending'] }
      },
      include: [
        { association: 'employee', attributes: ['id', 'firstName', 'lastName'] },
        { association: 'items' }
      ],
      order: [['createdAt', 'DESC']]
    });
  } catch (error) {
    console.error('❌ Error obteniendo ventas del día:', error);
    return [];
  }
};

LocalSale.getPendingTransfers = async function(employeeId = null) {
  try {
    const where = {
      paymentMethod: 'transfer',
      transferConfirmed: false,
      status: 'transfer_pending'
    };
    
    if (employeeId) where.employeeId = employeeId;

    return await this.findAll({
      where,
      include: [
        { association: 'employee', attributes: ['id', 'firstName', 'lastName'] },
        { association: 'items' }
      ],
      order: [['createdAt', 'ASC']]
    });
  } catch (error) {
    console.error('❌ Error obteniendo transferencias pendientes:', error);
    return [];
  }
};

LocalSale.getDailyReport = async function(date, employeeId = null) {
  try {
    const where = { 
      workDate: date,
      status: { [this.sequelize.Sequelize.Op.in]: ['completed', 'transfer_pending'] }
    };
    
    if (employeeId) where.employeeId = employeeId;

    const sales = await this.findAll({
      where,
      include: [
        { association: 'employee', attributes: ['firstName', 'lastName'] },
        { association: 'items' }
      ]
    });

    const totalSales = sales.length;
    const completedSales = sales.filter(s => s.status === 'completed');
    const pendingSales = sales.filter(s => s.status === 'transfer_pending');

    const totalAmount = completedSales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
    const cashAmount = completedSales
      .filter(sale => sale.paymentMethod === 'cash')
      .reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
    const transferAmount = completedSales
      .filter(sale => sale.paymentMethod === 'transfer')
      .reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
    const pendingAmount = pendingSales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);

    return {
      date,
      totalSales,
      completedSales: completedSales.length,
      pendingSales: pendingSales.length,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      cashAmount: parseFloat(cashAmount.toFixed(2)),
      transferAmount: parseFloat(transferAmount.toFixed(2)),
      pendingAmount: parseFloat(pendingAmount.toFixed(2)),
      sales
    };
  } catch (error) {
    console.error('❌ Error generando reporte diario:', error);
    return {
      date,
      totalSales: 0,
      completedSales: 0,
      pendingSales: 0,
      totalAmount: 0,
      cashAmount: 0,
      transferAmount: 0,
      pendingAmount: 0,
      sales: []
    };
  }
};

LocalSale.getStats = async function(startDate, endDate, employeeId = null) {
  try {
    const where = {
      workDate: {
        [this.sequelize.Sequelize.Op.between]: [startDate, endDate]
      },
      status: 'completed'
    };
    
    if (employeeId) where.employeeId = employeeId;

    const stats = await this.findOne({
      attributes: [
        [this.sequelize.fn('COUNT', this.sequelize.col('id')), 'totalSales'],
        [this.sequelize.fn('SUM', this.sequelize.col('totalAmount')), 'totalRevenue'],
        [this.sequelize.fn('AVG', this.sequelize.col('totalAmount')), 'averageSale'],
        [this.sequelize.fn('COUNT', this.sequelize.literal('CASE WHEN payment_method = \'cash\' THEN 1 END')), 'cashSales'],
        [this.sequelize.fn('COUNT', this.sequelize.literal('CASE WHEN payment_method = \'transfer\' THEN 1 END')), 'transferSales'],
        [this.sequelize.fn('SUM', this.sequelize.literal('CASE WHEN payment_method = \'cash\' THEN total_amount ELSE 0 END')), 'cashRevenue'],
        [this.sequelize.fn('SUM', this.sequelize.literal('CASE WHEN payment_method = \'transfer\' THEN total_amount ELSE 0 END')), 'transferRevenue']
      ],
      where
    });

    return {
      totalSales: parseInt(stats?.dataValues?.totalSales || 0),
      totalRevenue: parseFloat(stats?.dataValues?.totalRevenue || 0),
      averageSale: parseFloat(stats?.dataValues?.averageSale || 0),
      cashSales: parseInt(stats?.dataValues?.cashSales || 0),
      transferSales: parseInt(stats?.dataValues?.transferSales || 0),
      cashRevenue: parseFloat(stats?.dataValues?.cashRevenue || 0),
      transferRevenue: parseFloat(stats?.dataValues?.transferRevenue || 0)
    };
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de ventas locales:', error);
    return {
      totalSales: 0,
      totalRevenue: 0,
      averageSale: 0,
      cashSales: 0,
      transferSales: 0,
      cashRevenue: 0,
      transferRevenue: 0
    };
  }
};

// ✅ ASOCIACIONES CORREGIDAS
LocalSale.associate = function(models) {
  console.log('🔗 Configurando asociaciones para LocalSale...');
  
  if (models.User) {
    // ✅ ASOCIACIÓN PRINCIPAL: employeeId -> User
    LocalSale.belongsTo(models.User, {
      foreignKey: 'employeeId',
      as: 'employee'
    });
    
    // ✅ ASOCIACIÓN OPCIONAL: transferConfirmedBy -> User
    LocalSale.belongsTo(models.User, {
      foreignKey: 'transferConfirmedBy',
      as: 'transferConfirmer'
    });
    console.log('   ✅ LocalSale -> User (employee, transferConfirmer)');
  }
  
  if (models.LocalSaleItem) {
    // ✅ CORREGIR: usar 'localSaleId' como foreign key
    LocalSale.hasMany(models.LocalSaleItem, {
      foreignKey: 'localSaleId',
      as: 'items'
    });
    console.log('   ✅ LocalSale -> LocalSaleItem (items)');
  }
  
  if (models.TransferConfirmation) {
    LocalSale.hasOne(models.TransferConfirmation, {
      foreignKey: 'localSaleId',
      as: 'transferConfirmation'
    });
    console.log('   ✅ LocalSale -> TransferConfirmation (transferConfirmation)');
  }
};

module.exports = LocalSale;