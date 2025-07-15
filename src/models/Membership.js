// src/models/Membership.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Membership = sequelize.define('Membership', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('monthly', 'daily'),
    allowNull: false,
    defaultValue: 'monthly'
  },
  status: {
    type: DataTypes.ENUM('active', 'expired', 'suspended', 'cancelled'),
    allowNull: false,
    defaultValue: 'active'
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  // Horarios preferidos del cliente
  preferredSchedule: {
    type: DataTypes.JSONB,
    defaultValue: {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    }
    // Ejemplo: { monday: ['06:00-08:00', '18:00-20:00'], tuesday: ['07:00-09:00'] }
  },
  // Información adicional
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Quien registró la membresía
  registeredBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  // Auto-renovación
  autoRenew: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // Fecha de última notificación enviada
  lastNotificationSent: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'memberships',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['status'] },
    { fields: ['type'] },
    { fields: ['endDate'] },
    { fields: ['startDate'] },
    { fields: ['registeredBy'] }
  ]
});

// Métodos de instancia
Membership.prototype.isExpired = function() {
  return new Date() > new Date(this.endDate);
};

Membership.prototype.daysUntilExpiration = function() {
  const today = new Date();
  const endDate = new Date(this.endDate);
  const diffTime = endDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

Membership.prototype.isExpiringSoon = function(days = 7) {
  const daysLeft = this.daysUntilExpiration();
  return daysLeft <= days && daysLeft > 0;
};

// Métodos estáticos
Membership.findActiveMemberships = function() {
  return this.findAll({
    where: { status: 'active' },
    include: ['User']
  });
};

Membership.findExpiredMemberships = function() {
  return this.findAll({
    where: {
      status: 'active',
      endDate: {
        [sequelize.Sequelize.Op.lt]: new Date()
      }
    },
    include: ['User']
  });
};

Membership.findExpiringSoon = function(days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.findAll({
    where: {
      status: 'active',
      endDate: {
        [sequelize.Sequelize.Op.between]: [new Date(), futureDate]
      }
    },
    include: ['User']
  });
};

Membership.findByUser = function(userId) {
  return this.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']]
  });
};

module.exports = Membership;