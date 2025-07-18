// src/models/MembershipPlans.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MembershipPlans = sequelize.define('MembershipPlans', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // ✅ Información del plan
  planName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'plan_name'
  },
  // ✅ Precios
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  originalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'original_price',
    validate: {
      min: 0
    }
  },
  // ✅ Tipo de duración
  durationType: {
    type: DataTypes.ENUM('monthly', 'daily', 'annual'),
    allowNull: false,
    field: 'duration_type'
  },
  // ✅ Características del plan (array JSON)
  features: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  // ✅ Si es plan popular (destacado)
  isPopular: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_popular'
  },
  // ✅ Si está activo
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  // ✅ Orden de visualización
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'display_order'
  },
  // ✅ Icono del plan
  iconName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'calendar',
    field: 'icon_name'
  }
}, {
  tableName: 'membership_plans',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['duration_type'] },
    { fields: ['is_popular'] },
    { fields: ['is_active'] },
    { fields: ['display_order'] }
  ]
});

// ✅ Método para calcular descuento
MembershipPlans.prototype.getDiscountPercentage = function() {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }
  return 0;
};

// ✅ Método estático para obtener planes activos
MembershipPlans.getActivePlans = async function() {
  return await this.findAll({
    where: { isActive: true },
    order: [['displayOrder', 'ASC']]
  });
};

// ✅ Método estático para crear planes por defecto
MembershipPlans.seedDefaultPlans = async function() {
  const defaultPlans = [
    {
      planName: 'Entrada Diaria',
      price: 25.00,
      durationType: 'daily',
      features: ['Acceso completo al gym', 'Uso de vestidores', 'Wi-Fi gratuito'],
      iconName: 'calendar-days',
      displayOrder: 1
    },
    {
      planName: 'Plan Mensual',
      price: 250.00,
      originalPrice: 300.00,
      durationType: 'monthly',
      features: ['Acceso ilimitado', 'Clases grupales incluidas', 'Entrenador asignado', 'Plan nutricional básico'],
      isPopular: true,
      iconName: 'calendar',
      displayOrder: 2
    },
    {
      planName: 'Plan Anual',
      price: 2400.00,
      originalPrice: 3000.00,
      durationType: 'annual',
      features: ['Todo lo anterior', 'Evaluaciones médicas', 'Nutricionista personal', 'Descuentos en productos'],
      iconName: 'calendar-range',
      displayOrder: 3
    }
  ];

  for (const plan of defaultPlans) {
    await this.findOrCreate({
      where: { planName: plan.planName },
      defaults: plan
    });
  }
};

module.exports = MembershipPlans;