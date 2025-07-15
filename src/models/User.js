// src/models/User.js
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 50]
    }
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 50]
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: /^[\+]?[\d\s\-\(\)]+$/
    }
  },
  whatsapp: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: /^[\+]?[\d\s\-\(\)]+$/
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: true // Puede ser null para usuarios de Google OAuth
  },
  googleId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true
  },
  profileImage: {
    type: DataTypes.TEXT,
    allowNull: true // URL de Cloudinary
  },
  role: {
    type: DataTypes.ENUM('admin', 'colaborador', 'cliente'),
    allowNull: false,
    defaultValue: 'cliente'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  phoneVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // Preferencias de notificación
  notificationPreferences: {
    type: DataTypes.JSONB,
    defaultValue: {
      email: true,
      whatsapp: true,
      membershipReminders: true,
      promotions: true,
      motivationalMessages: true
    }
  },
  // Datos adicionales del cliente
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  emergencyContact: {
    type: DataTypes.JSONB,
    allowNull: true,
    // { name: 'string', phone: 'string', relationship: 'string' }
  },
  // Metadata
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'users',
  timestamps: true,
  indexes: [
    { fields: ['email'] },
    { fields: ['googleId'] },
    { fields: ['role'] },
    { fields: ['isActive'] },
    { fields: ['phone'] },
    { fields: ['whatsapp'] }
  ],
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password') && user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    }
  }
});

// Métodos de instancia
User.prototype.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

User.prototype.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

// Métodos estáticos
User.findByEmail = function(email) {
  return this.findOne({ where: { email: email.toLowerCase() } });
};

User.findByGoogleId = function(googleId) {
  return this.findOne({ where: { googleId } });
};

User.findActiveUsers = function(role = null) {
  const where = { isActive: true };
  if (role) where.role = role;
  return this.findAll({ where });
};

module.exports = User;