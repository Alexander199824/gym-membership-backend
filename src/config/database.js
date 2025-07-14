// src/config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  dialectOptions: {
    ssl: process.env.DB_SSL === 'true' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  timezone: '-06:00' // Ajustar según tu zona horaria (Guatemala: UTC-6)
});

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida correctamente');
  } catch (error) {
    console.error('❌ Error al conectar con la base de datos:', error.message);
    throw error;
  }
};

// Initialize database with option to reset
const initializeDatabase = async (reset = false) => {
  try {
    if (reset || process.env.RESET_DATABASE === 'true') {
      console.log('🔄 Eliminando y recreando todas las tablas...');
      await sequelize.drop();
      console.log('✅ Tablas eliminadas correctamente');
    }

    await sequelize.sync({ force: reset || process.env.RESET_DATABASE === 'true' });
    console.log('✅ Base de datos sincronizada correctamente');
    
    return true;
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error.message);
    throw error;
  }
};

module.exports = {
  sequelize,
  testConnection,
  initializeDatabase
};