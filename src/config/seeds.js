// src/config/seeds.js 
const { 
  User, 
  GymConfiguration,
  GymContactInfo,
  GymHours,
  GymStatistics,
  GymServices,
  MembershipPlans,
  UserSchedulePreferences
} = require('../models');

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

const createGymConfiguration = async () => {
  try {
    console.log('🏢 Inicializando configuración del gimnasio...');
    
    // ✅ Crear configuración básica
    await GymConfiguration.getConfig();
    console.log('   ✅ Configuración básica creada');
    
    // ✅ Crear información de contacto
    await GymContactInfo.getContactInfo();
    console.log('   ✅ Información de contacto creada');
    
    // ✅ Crear horarios
    await GymHours.getWeeklySchedule();
    console.log('   ✅ Horarios semanales creados');
    
    // ✅ Crear estadísticas por defecto
    await GymStatistics.seedDefaultStats();
    console.log('   ✅ Estadísticas por defecto creadas');
    
    // ✅ Crear servicios por defecto
    await GymServices.seedDefaultServices();
    console.log('   ✅ Servicios por defecto creados');
    
    // ✅ Crear planes de membresía por defecto
    await MembershipPlans.seedDefaultPlans();
    console.log('   ✅ Planes de membresía por defecto creados');
    
    // ✅ NUEVOS: Crear contenido dinámico por defecto
    const { 
      GymTestimonials, 
      GymSocialMedia, 
      GymSectionsContent, 
      GymNavigation, 
      GymPromotionalContent, 
      GymFormsConfig, 
      GymSystemMessages, 
      GymBrandingConfig 
    } = require('../models');
    
    await GymTestimonials.seedDefaultTestimonials();
    console.log('   ✅ Testimonios por defecto creados');
    
    await GymSocialMedia.seedDefaultSocialMedia();
    console.log('   ✅ Redes sociales por defecto creadas');
    
    await GymSectionsContent.seedDefaultContent();
    console.log('   ✅ Contenido de secciones por defecto creado');
    
    await GymNavigation.seedDefaultNavigation();
    console.log('   ✅ Navegación por defecto creada');
    
    await GymPromotionalContent.seedDefaultPromotionalContent();
    console.log('   ✅ Contenido promocional por defecto creado');
    
    await GymFormsConfig.seedDefaultFormsConfig();
    console.log('   ✅ Configuración de formularios por defecto creada');
    
    await GymSystemMessages.seedDefaultSystemMessages();
    console.log('   ✅ Mensajes del sistema por defecto creados');
    
    await GymBrandingConfig.seedDefaultBrandingConfig();
    console.log('   ✅ Configuración de branding por defecto creada');
    
    console.log('✅ Configuración del gimnasio completada');
    
  } catch (error) {
    console.error('❌ Error al crear configuración del gimnasio:', error.message);
    throw error;
  }
};

const createSampleData = async () => {
  try {
    console.log('📊 Verificando datos de ejemplo...');
    
    // ✅ Crear colaborador de ejemplo si no existe
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
    
    // ✅ Crear cliente de ejemplo si no existe
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
      
      // ✅ Crear horarios por defecto para el cliente de ejemplo
      try {
        await UserSchedulePreferences.createDefaultSchedule(client.id);
        console.log('   ✅ Horarios por defecto creados para el cliente');
      } catch (scheduleError) {
        console.warn('   ⚠️ Error al crear horarios por defecto (no crítico):', scheduleError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error al crear datos de ejemplo:', error.message);
    // No lanzar error aquí para que no interrumpa el inicio del servidor
  }
};



const createStoreData = async () => {
  try {
    console.log('🛍️ Inicializando datos de tienda...');
    
    const { StoreCategory, StoreBrand, StoreProduct } = require('../models');
    
    // ✅ Crear categorías por defecto
    await StoreCategory.seedDefaultCategories();
    console.log('   ✅ Categorías de tienda creadas');
    
    // ✅ Crear marcas por defecto
    await StoreBrand.seedDefaultBrands();
    console.log('   ✅ Marcas de productos creadas');
    
    // ✅ Crear productos de ejemplo
    await StoreProduct.seedSampleProducts();
    console.log('   ✅ Productos de ejemplo creados');
    
    console.log('✅ Datos de tienda inicializados');
    
  } catch (error) {
    console.error('❌ Error al inicializar datos de tienda:', error.message);
    // No lanzar error para que no interrumpa el servidor
  }
};

// ✅ MODIFICAR la función runSeeds existente:
const runSeeds = async () => {
  try {
    console.log('🌱 Iniciando proceso de seeding completo...');
    
    // ✅ 1. Crear configuración del gimnasio (crítico)
    await createGymConfiguration();
    
    // ✅ 2. Crear admin (crítico)
    await createInitialAdmin();
    
    // ✅ 3. Crear datos de tienda (nuevo)
    await createStoreData();
    
    // ✅ 4. Crear datos de ejemplo (opcional)
    if (process.env.CREATE_SAMPLE_DATA !== 'false') {
      await createSampleData();
    }
    
    console.log('✅ Proceso de seeding completado exitosamente');
    console.log('\n🎯 Sistema Elite Fitness Club listo para usar:');
    console.log('   🏢 Configuración del gimnasio: ✅');
    console.log('   👤 Usuario administrador: ✅');
    console.log('   🛍️ Sistema de tienda: ✅');
    console.log('   📊 Datos de ejemplo: ✅');
    console.log('   🎨 Tema personalizable: ✅');
    console.log('   📅 Sistema de horarios: ✅');
    console.log('   💰 Sistema financiero: ✅');
    
  } catch (error) {
    console.error('❌ Error en el proceso de seeding:', error.message);
    throw error;
  }
};



// ✅ ACTUALIZAR exports
module.exports = { 
  runSeeds, 
  createInitialAdmin, 
  createGymConfiguration,
  createSampleData,
  createStoreData  // ← NUEVO
};

