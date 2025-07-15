// src/config/seeds.js
const { User } = require('../models');

const createInitialAdmin = async () => {
  try {
    console.log('🔍 Verificando usuario administrador...');
    
    const adminExists = await User.findOne({ where: { role: 'admin' } });
    
    if (!adminExists) {
      console.log('👤 Creando usuario administrador inicial...');
      
      const adminData = {
        firstName: process.env.ADMIN_FIRST_NAME || 'Admin',
        lastName: process.env.ADMIN_LAST_NAME || 'Sistema',
        email: process.env.ADMIN_EMAIL || 'admin@gym.com',
        password: process.env.ADMIN_PASSWORD || 'Admin123!',
        role: 'admin',
        emailVerified: true,
        isActive: true
      };
      
      const admin = await User.create(adminData);
      
      console.log('✅ Usuario administrador creado exitosamente:');
      console.log(`   Email: ${admin.email}`);
      console.log(`   Nombre: ${admin.getFullName()}`);
      console.log(`   ID: ${admin.id}`);
      
      return admin;
    } else {
      console.log('✅ Usuario administrador ya existe:', adminExists.email);
      return adminExists;
    }
  } catch (error) {
    console.error('❌ Error al crear usuario administrador:', error.message);
    throw error;
  }
};

const createSampleData = async () => {
  try {
    console.log('📊 Verificando datos de ejemplo...');
    
    // Crear colaborador de ejemplo si no existe
    const collaboratorExists = await User.findOne({ where: { role: 'colaborador' } });
    
    if (!collaboratorExists) {
      console.log('👥 Creando colaborador de ejemplo...');
      
      const collaborator = await User.create({
        firstName: 'María',
        lastName: 'García',
        email: 'colaborador@gym.com',
        password: 'Colaborador123!',
        phone: '+50212345678',
        whatsapp: '+50212345678',
        role: 'colaborador',
        emailVerified: true,
        isActive: true
      });
      
      console.log('✅ Colaborador creado:', collaborator.email);
    }
    
    // Crear cliente de ejemplo si no existe
    const clientExists = await User.findOne({ where: { role: 'cliente' } });
    
    if (!clientExists) {
      console.log('🏃‍♂️ Creando cliente de ejemplo...');
      
      const client = await User.create({
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'cliente@gym.com',
        password: 'Cliente123!',
        phone: '+50287654321',
        whatsapp: '+50287654321',
        role: 'cliente',
        emailVerified: true,
        isActive: true,
        dateOfBirth: '1990-01-15',
        emergencyContact: {
          name: 'Ana Pérez',
          phone: '+50298765432',
          relationship: 'Esposa'
        }
      });
      
      console.log('✅ Cliente creado:', client.email);
    }
    
  } catch (error) {
    console.error('❌ Error al crear datos de ejemplo:', error.message);
    // No lanzar error aquí para que no interrumpa el inicio del servidor
  }
};

const runSeeds = async () => {
  try {
    console.log('🌱 Iniciando proceso de seeding...');
    
    // Crear admin (crítico)
    await createInitialAdmin();
    
    // Crear datos de ejemplo (opcional)
    if (process.env.CREATE_SAMPLE_DATA === 'true') {
      await createSampleData();
    }
    
    console.log('✅ Proceso de seeding completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error en el proceso de seeding:', error.message);
    throw error;
  }
};

module.exports = { 
  runSeeds, 
  createInitialAdmin, 
  createSampleData 
};