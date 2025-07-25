// src/models/GymNavigation.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GymNavigation = sequelize.define('GymNavigation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // ✅ Ubicación del menú
  location: {
    type: DataTypes.ENUM('header', 'footer', 'footer_store'),
    allowNull: false
  },
  // ✅ Texto del enlace
  text: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  // ✅ URL/href del enlace
  href: {
    type: DataTypes.STRING(255),
    allowNull: false
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
  // ✅ Si abre en nueva ventana
  target: {
    type: DataTypes.ENUM('_self', '_blank'),
    allowNull: false,
    defaultValue: '_self'
  }
}, {
  tableName: 'gym_navigation',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['location'] },
    { fields: ['is_active'] },
    { fields: ['display_order'] }
  ]
});

// ✅ Método estático para obtener navegación por ubicación
GymNavigation.getNavigationByLocation = async function(location) {
  return await this.findAll({
    where: { 
      location,
      isActive: true 
    },
    order: [['displayOrder', 'ASC']]
  });
};

// ✅ Método estático para obtener toda la navegación organizada
GymNavigation.getAllNavigation = async function() {
  const navItems = await this.findAll({
    where: { isActive: true },
    order: [['location', 'ASC'], ['displayOrder', 'ASC']]
  });
  
  const result = {
    header: [],
    footer: {
      links: [],
      store_links: []
    }
  };
  
  navItems.forEach(item => {
    if (item.location === 'header') {
      result.header.push({
        text: item.text,
        href: item.href,
        target: item.target,
        active: item.isActive
      });
    } else if (item.location === 'footer') {
      result.footer.links.push({
        text: item.text,
        href: item.href,
        target: item.target
      });
    } else if (item.location === 'footer_store') {
      result.footer.store_links.push({
        text: item.text,
        href: item.href,
        target: item.target
      });
    }
  });
  
  return result;
};

// ✅ Método estático para crear navegación por defecto
GymNavigation.seedDefaultNavigation = async function() {
  const defaultNavigation = [
    // HEADER NAVIGATION
    { location: 'header', text: 'Inicio', href: '#inicio', displayOrder: 1 },
    { location: 'header', text: 'Servicios', href: '#servicios', displayOrder: 2 },
    { location: 'header', text: 'Planes', href: '#planes', displayOrder: 3 },
    { location: 'header', text: 'Tienda', href: '#tienda', displayOrder: 4 },
    { location: 'header', text: 'Contacto', href: '#contacto', displayOrder: 5 },

    // FOOTER MAIN LINKS
    { location: 'footer', text: 'Inicio', href: '#inicio', displayOrder: 1 },
    { location: 'footer', text: 'Servicios', href: '#servicios', displayOrder: 2 },
    { location: 'footer', text: 'Planes', href: '#planes', displayOrder: 3 },
    { location: 'footer', text: 'Tienda', href: '#tienda', displayOrder: 4 },

    // FOOTER STORE LINKS
    { location: 'footer_store', text: 'Suplementos', href: '/store?category=suplementos', displayOrder: 1 },
    { location: 'footer_store', text: 'Ropa Deportiva', href: '/store?category=ropa', displayOrder: 2 },
    { location: 'footer_store', text: 'Accesorios', href: '/store?category=accesorios', displayOrder: 3 },
    { location: 'footer_store', text: 'Equipamiento', href: '/store?category=equipamiento', displayOrder: 4 }
  ];

  for (const nav of defaultNavigation) {
    await this.findOrCreate({
      where: { 
        location: nav.location, 
        text: nav.text 
      },
      defaults: nav
    });
  }
};

module.exports = GymNavigation;