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

// ✅ FUNCIÓN MEJORADA: createInitialAdmin con mejor debugging
const createInitialAdmin = async () => {
  try {
    console.log('🔍 Verificando usuario administrador...');
    
    // ✅ Verificar que el modelo User esté disponible
    if (!User) {
      throw new Error('Modelo User no está disponible en seeds');
    }
    
    console.log('✅ Modelo User disponible');
    
    // ✅ Buscar admin existente
    console.log('🔍 Buscando administrador existente...');
    const adminExists = await User.findOne({ 
      where: { role: 'admin' }
    });
    
    if (adminExists) {
      console.log('✅ Usuario administrador ya existe:');
      console.log(`   📧 Email: ${adminExists.email}`);
      console.log(`   👤 Nombre: ${adminExists.firstName} ${adminExists.lastName}`);
      console.log(`   🆔 ID: ${adminExists.id}`);
      console.log(`   📊 Estado: ${adminExists.isActive ? 'Activo' : 'Inactivo'}`);
      
      // ✅ Asegurar que el admin existente tenga datos correctos
      if (adminExists.email !== 'admin@gym.com' || !adminExists.isActive) {
        console.log('🔄 Actualizando datos del administrador...');
        await adminExists.update({
          email: 'admin@gym.com',
          isActive: true,
          emailVerified: true
        });
        console.log('✅ Datos del administrador actualizados');
      }
      
      return adminExists;
    }
    
    // ✅ Crear nuevo administrador
    console.log('👤 Creando usuario administrador inicial...');
    
    const adminData = {
      firstName: process.env.ADMIN_FIRST_NAME || 'Administrador',
      lastName: process.env.ADMIN_LAST_NAME || 'Sistema',
      email: process.env.ADMIN_EMAIL || 'admin@gym.com',
      password: process.env.ADMIN_PASSWORD || 'Admin123!',
      phone: '+502 0000-0000',
      role: 'admin',
      emailVerified: true,
      isActive: true
    };
    
    console.log('📝 Datos del administrador a crear:');
    console.log(`   👤 Nombre: ${adminData.firstName} ${adminData.lastName}`);
    console.log(`   📧 Email: ${adminData.email}`);
    console.log(`   🏷️ Rol: ${adminData.role}`);
    console.log(`   📞 Teléfono: ${adminData.phone}`);
    
    // ✅ Verificar si el email ya está en uso
    const emailExists = await User.findOne({ 
      where: { email: adminData.email }
    });
    
    if (emailExists) {
      console.log('⚠️ Email ya existe pero no es admin, actualizando rol...');
      await emailExists.update({ 
        role: 'admin',
        isActive: true,
        emailVerified: true 
      });
      console.log('✅ Usuario existente convertido a administrador');
      return emailExists;
    }
    
    // ✅ Crear el usuario administrador
    console.log('🔄 Ejecutando User.create()...');
    const admin = await User.create(adminData);
    
    console.log('🎉 ¡Usuario administrador creado exitosamente!');
    console.log(`   📧 Email: ${admin.email}`);
    console.log(`   👤 Nombre: ${admin.getFullName()}`);
    console.log(`   🆔 ID: ${admin.id}`);
    console.log(`   🏷️ Rol: ${admin.role}`);
    console.log(`   📊 Estado: ${admin.isActive ? 'Activo' : 'Inactivo'}`);
    
    // ✅ Verificar que se puede hacer login
    console.log('🧪 Verificando password...');
    const passwordWorks = await admin.comparePassword(adminData.password);
    if (passwordWorks) {
      console.log('✅ Password verificado correctamente');
    } else {
      console.warn('⚠️ Problema con el password - revisar configuración');
    }
    
    // ✅ Mostrar credenciales para el usuario
    console.log('\n🔐 CREDENCIALES DE ADMINISTRADOR:');
    console.log('================================');
    console.log(`📧 Email: ${admin.email}`);
    console.log(`🔑 Password: ${adminData.password}`);
    console.log('================================');
    
    return admin;
    
  } catch (error) {
    console.error('❌ ERROR DETALLADO al crear usuario administrador:');
    console.error('📝 Mensaje:', error.message);
    console.error('📝 Código:', error.code || 'N/A');
    console.error('📝 Stack:', error.stack);
    
    // ✅ Información adicional para debugging
    if (error.name === 'SequelizeValidationError') {
      console.error('📝 Errores de validación:');
      error.errors?.forEach(err => {
        console.error(`   - ${err.path}: ${err.message}`);
      });
    }
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.error('📝 Error de constraint único:');
      console.error(`   - Campo: ${error.errors?.[0]?.path}`);
      console.error(`   - Valor: ${error.errors?.[0]?.value}`);
    }
    
    if (error.name === 'SequelizeDatabaseError') {
      console.error('📝 Error de base de datos:');
      console.error(`   - SQL: ${error.sql || 'N/A'}`);
    }
    
    throw error;
  }
};

// ✅ FUNCIÓN MEJORADA: runSeeds con mejor orden y manejo de errores
const runSeeds = async () => {
  try {
    console.log('🌱 Iniciando proceso de seeding completo...');
    console.log('🕐 Timestamp:', new Date().toISOString());
    
    // ✅ PASO 1: Verificar que todos los modelos necesarios estén disponibles
    console.log('\n📦 Verificando modelos disponibles...');
    const requiredModels = {
      User: !!User,
      GymConfiguration: !!GymConfiguration,
      GymContactInfo: !!GymContactInfo,
      GymHours: !!GymHours,
      GymStatistics: !!GymStatistics,
      GymServices: !!GymServices,
      MembershipPlans: !!MembershipPlans
    };
    
    const availableModels = Object.entries(requiredModels)
      .filter(([name, available]) => available)
      .map(([name]) => name);
    
    const missingModels = Object.entries(requiredModels)
      .filter(([name, available]) => !available)
      .map(([name]) => name);
    
    console.log(`✅ Modelos disponibles (${availableModels.length}): ${availableModels.join(', ')}`);
    
    if (missingModels.length > 0) {
      console.warn(`⚠️ Modelos faltantes (${missingModels.length}): ${missingModels.join(', ')}`);
    }
    
    if (!User) {
      throw new Error('Modelo User es crítico y no está disponible - no se pueden ejecutar seeds');
    }
    
    // ✅ PASO 2: Crear administrador PRIMERO (crítico)
    console.log('\n👤 PASO 1: Creando usuario administrador...');
    await createInitialAdmin();
    console.log('✅ Usuario administrador listo');
    
    // ✅ PASO 3: Configuración del gimnasio
    console.log('\n🏢 PASO 2: Configuración del gimnasio...');
    await createGymConfiguration();
    console.log('✅ Configuración del gimnasio lista');
    
    // ✅ PASO 4: Datos de tienda
    console.log('\n🛍️ PASO 3: Datos de tienda...');
    await createStoreData();
    console.log('✅ Datos de tienda listos');
    
    // ✅ PASO 5: Datos de ejemplo (opcional)
    if (process.env.CREATE_SAMPLE_DATA !== 'false') {
      console.log('\n📊 PASO 4: Datos de ejemplo...');
      await createSampleData();
      console.log('✅ Datos de ejemplo listos');
    } else {
      console.log('\n⏭️ PASO 4: Datos de ejemplo omitidos (CREATE_SAMPLE_DATA=false)');
    }
    
    // ✅ VERIFICACIÓN FINAL
    console.log('\n🔍 VERIFICACIÓN FINAL...');
    const finalAdmin = await User.findOne({ where: { role: 'admin' } });
    
    if (finalAdmin) {
      console.log('✅ Usuario administrador verificado al final de seeds');
      console.log(`   📧 ${finalAdmin.email}`);
      console.log(`   🆔 ${finalAdmin.id}`);
    } else {
      throw new Error('Usuario administrador no existe después de seeds - esto es un error crítico');
    }
    
    console.log('\n🎉 ¡PROCESO DE SEEDING COMPLETADO EXITOSAMENTE!');
    console.log('🕐 Completado en:', new Date().toISOString());
    
    console.log('\n🎯 SISTEMA ELITE FITNESS CLUB LISTO:');
    console.log('   🔐 Usuario administrador: ✅');
    console.log('   🏢 Configuración del gimnasio: ✅');
    console.log('   🛍️ Sistema de tienda: ✅');
    console.log('   📊 Datos de ejemplo: ✅');
    console.log('   🎨 Personalización: ✅');
    
    console.log('\n🔐 ACCESO DE ADMINISTRADOR:');
    console.log('   📧 Email: admin@gym.com');
    console.log('   🔑 Password: Admin123!');
    console.log('   🌐 Endpoint: POST /api/auth/login');
    
  } catch (error) {
    console.error('\n❌ ERROR CRÍTICO EN PROCESO DE SEEDING:');
    console.error('🕐 Timestamp:', new Date().toISOString());
    console.error('📝 Mensaje:', error.message);
    console.error('📝 Stack completo:', error.stack);
    
    // ✅ Información de contexto adicional
    try {
      const userCount = await User.count();
      const adminCount = await User.count({ where: { role: 'admin' } });
      console.error('📊 Estado actual de usuarios:');
      console.error(`   👥 Total usuarios: ${userCount}`);
      console.error(`   👤 Administradores: ${adminCount}`);
    } catch (contextError) {
      console.error('❌ No se pudo obtener información de contexto:', contextError.message);
    }
    
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



// ✅ REEMPLAZAR SOLO la función createStoreData en tu seeds.js

const createStoreData = async () => {
  try {
    console.log('🛍️ Inicializando datos de tienda...');
    
    const { StoreCategory, StoreBrand, StoreProduct } = require('../models');
    
    // ✅ Verificar que los modelos estén disponibles
    if (!StoreCategory || !StoreBrand || !StoreProduct) {
      console.error('❌ Modelos de tienda no disponibles:', {
        StoreCategory: !!StoreCategory,
        StoreBrand: !!StoreBrand, 
        StoreProduct: !!StoreProduct
      });
      throw new Error('Modelos de tienda faltantes');
    }
    
    console.log('📦 Modelos de tienda verificados correctamente');
    
    // ✅ 1. Crear categorías PRIMERO
    console.log('🗂️ Creando categorías...');
    
    if (StoreCategory.seedDefaultCategories) {
      await StoreCategory.seedDefaultCategories();
      console.log('   ✅ Categorías de tienda creadas');
    } else {
      console.warn('   ⚠️ Método seedDefaultCategories no disponible');
    }
    
    // ✅ 2. Crear marcas SEGUNDO  
    console.log('🏷️ Creando marcas...');
    
    if (StoreBrand.seedDefaultBrands) {
      await StoreBrand.seedDefaultBrands();
      console.log('   ✅ Marcas de productos creadas');
    } else {
      console.warn('   ⚠️ Método seedDefaultBrands no disponible');
    }
    
    // ✅ 3. Verificar que categorías y marcas existan antes de crear productos
    const categoryCount = await StoreCategory.count();
    const brandCount = await StoreBrand.count();
    
    console.log(`📊 Estado previo a productos: ${categoryCount} categorías, ${brandCount} marcas`);
    
    if (categoryCount === 0) {
      throw new Error('No se crearon categorías - no se pueden crear productos');
    }
    
    // ✅ 4. Crear productos TERCERO (CON PARÁMETROS CORRECTOS)
    console.log('📦 Creando productos...');
    
    if (StoreProduct.seedSampleProducts) {
      // ✅ CORRECCIÓN CRÍTICA: Pasar los modelos como parámetros
      await StoreProduct.seedSampleProducts(StoreCategory, StoreBrand);
      console.log('   ✅ Productos de ejemplo creados');
    } else {
      console.warn('   ⚠️ Método seedSampleProducts no disponible');
    }
    
    // ✅ 5. Verificar resultados finales
    const finalStats = {
      categories: await StoreCategory.count(),
      brands: await StoreBrand.count(), 
      products: await StoreProduct.count(),
      featuredProducts: await StoreProduct.count({ where: { isFeatured: true } })
    };
    
    console.log('📊 Estadísticas finales de tienda:');
    console.log(`   🗂️ Categorías: ${finalStats.categories}`);
    console.log(`   🏷️ Marcas: ${finalStats.brands}`);
    console.log(`   📦 Productos: ${finalStats.products}`);
    console.log(`   ⭐ Productos destacados: ${finalStats.featuredProducts}`);
    
    if (finalStats.products === 0) {
      console.warn('⚠️ No se crearon productos - revisar logs anteriores');
    } else {
      console.log('✅ Datos de tienda inicializados correctamente');
    }
    
  } catch (error) {
    console.error('❌ Error al inicializar datos de tienda:', error.message);
    console.error('📝 Stack trace:', error.stack);
    
    // ✅ Información adicional para debugging
    try {
      const { StoreCategory, StoreBrand, StoreProduct } = require('../models');
      const debugInfo = {
        modelsAvailable: {
          StoreCategory: !!StoreCategory,
          StoreBrand: !!StoreBrand,
          StoreProduct: !!StoreProduct
        }
      };
      
      if (StoreCategory) {
        debugInfo.categoryCount = await StoreCategory.count();
      }
      if (StoreBrand) {
        debugInfo.brandCount = await StoreBrand.count();
      }
      if (StoreProduct) {
        debugInfo.productCount = await StoreProduct.count();
      }
      
      console.log('🔍 Info de debugging:', debugInfo);
      
    } catch (debugError) {
      console.error('❌ Error en debugging:', debugError.message);
    }
    
    // No lanzar error para que no interrumpa el servidor
    console.log('💡 El servidor continuará sin datos de tienda');
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

