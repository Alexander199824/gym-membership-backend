// src/server.js - LIMPIO: Solo crea tablas, asociaciones y usuario admin
const app = require('./app');
const { 
  testConnection, 
  initializeDatabase, 
  getDatabaseStatus,
  closeConnection 
} = require('./config/database');
const notificationScheduler = require('./services/notificationScheduler');
// ❌ ELIMINADO: const { runSeeds } = require('./config/seeds');
const dailyMembershipService = require('./services/dailyMembershipService');

class Server {
  constructor() {
    this.port = process.env.PORT || 5000;
    this.host = '0.0.0.0';
    this.server = null;
  }

  async start() {
    try {
      console.log('🚀 Iniciando Elite Fitness Club Management System...');
      console.log('🌍 Entorno:', process.env.NODE_ENV || 'development');
      console.log(`🔗 Puerto configurado: ${this.port}`);
      console.log(`🔗 Host configurado: ${this.host}`);

      console.log('⚡ INICIANDO SERVIDOR HTTP PRIMERO (Render Fix)...');
      await this.startHttpServerFirst();

      console.log('🔄 Iniciando procesos de inicialización en segundo plano...');
      this.initializeInBackground();

    } catch (error) {
      console.error('❌ Error crítico al iniciar el servidor:', error.message);
      console.log('\n💡 Soluciones sugeridas:');
      console.log('   1. Verifica las variables de entorno en Render');
      console.log('   2. Verifica la conexión a la base de datos');
      console.log('   3. Revisa los logs completos en Render');
      process.exit(1);
    }
  }

  async startHttpServerFirst() {
    return new Promise((resolve, reject) => {
      this.server = app.listen(this.port, this.host, (error) => {
        if (error) {
          console.error('❌ Error al iniciar servidor HTTP:', error);
          reject(error);
        } else {
          console.log('\n🎯 ¡SERVIDOR HTTP INICIADO EXITOSAMENTE!');
          console.log(`✅ URL: http://${this.host}:${this.port}`);
          console.log(`📚 Health Check: http://${this.host}:${this.port}/api/health`);
          console.log('\n🎉 Servidor respondiendo en Render!');
          console.log('⏳ Inicializando base de datos en segundo plano...');
          resolve();
        }
      });
    });
  }

  async initializeInBackground() {
    try {
      this.checkEnvironmentVariables();

      console.log('🔄 Conectando a base de datos...');
      await testConnection();
      console.log('✅ Base de datos conectada');

      await this.showDatabaseStatus();

      console.log('🔄 Inicializando base de datos...');
      await initializeDatabase();
      console.log('✅ Base de datos inicializada');

      console.log('🔄 Cargando modelos...');
      require('./models');
      console.log('✅ Modelos cargados');

      console.log('🔄 Garantizando usuario administrador...');
      await this.ensureAdminExists();
      console.log('✅ Usuario administrador garantizado');

      // ✅ MODIFICADO: Solo verificar datos, NO crear
      await this.initializeGymData();

      // ❌ ELIMINADO: await this.runSeedsWithErrorHandling();

      await this.initializeMembershipServices();

      await this.showFinalDatabaseStatus();

      await this.checkNotificationServices();

      if (process.env.NODE_ENV !== 'test') {
        this.startNotificationScheduler();
      }

      this.setupGracefulShutdown();

      console.log('\n🔍 VERIFICACIÓN FINAL DEL SISTEMA...');
      const models = require('./models');
      const finalAdmin = await models.User.findOne({ where: { role: 'admin' } });
      
      if (finalAdmin) {
        console.log('✅ Usuario administrador verificado');
        console.log(`   📧 ${finalAdmin.email}`);
        console.log(`   🆔 ${finalAdmin.id}`);
      } else {
        console.error('❌ ADVERTENCIA: Usuario administrador no existe');
      }

      console.log('\n🎉 ¡INICIALIZACIÓN COMPLETA! Sistema listo para usar');
      console.log('\n💡 Configura el gimnasio desde el panel de administración');

    } catch (error) {
      console.error('❌ Error en inicialización:', error.message);
      console.log('⚠️ El servidor HTTP sigue funcionando con funcionalidad limitada');
      
      try {
        console.log('🔄 Último intento de crear admin...');
        await this.createAdminDirectly();
        console.log('✅ Admin creado en último intento');
      } catch (lastError) {
        console.error('❌ Último intento falló:', lastError.message);
      }
    }
  }

  async ensureAdminExists() {
    try {
      console.log('\n🔐 VERIFICACIÓN CRÍTICA: Usuario Administrador...');
      
      const models = require('./models');
      
      if (!models.User) {
        throw new Error('Modelo User no disponible');
      }
      
      let admin = await models.User.findOne({ 
        where: { role: 'admin' }
      });
      
      if (admin) {
        console.log('✅ Usuario administrador encontrado:');
        console.log(`   📧 Email: ${admin.email}`);
        console.log(`   👤 Nombre: ${admin.firstName} ${admin.lastName}`);
        
        if (admin.email !== 'admin@gym.com') {
          console.log('🔄 Corrigiendo email del administrador...');
          await admin.update({ email: 'admin@gym.com' });
          console.log('✅ Email corregido a admin@gym.com');
        }
        
        this.showAdminCredentials();
        return admin;
      }
      
      console.log('⚠️ Usuario administrador NO existe - creando...');
      
      const adminData = {
        firstName: 'Administrador',
        lastName: 'Sistema',
        email: 'admin@gym.com',
        password: 'Admin123!',
        phone: '+502 0000-0000',
        role: 'admin',
        isActive: true,
        emailVerified: true
      };
      
      admin = await models.User.create(adminData);
      
      console.log('🎉 ¡Usuario administrador creado exitosamente!');
      console.log(`   📧 Email: ${admin.email}`);
      console.log(`   🆔 ID: ${admin.id}`);
      
      this.showAdminCredentials();
      return admin;
      
    } catch (error) {
      console.error('❌ ERROR: No se pudo asegurar admin');
      console.error('📝 Error:', error.message);
      throw error;
    }
  }

  showAdminCredentials() {
    console.log('\n🎯 CREDENCIALES DE ADMINISTRADOR:');
    console.log('='.repeat(50));
    console.log('   📧 Email: admin@gym.com');
    console.log('   🔑 Password: Admin123!');
    console.log('='.repeat(50));
    console.log('   🌐 Login: POST /api/auth/login');
    console.log('   📊 Panel: GET /api/admin/stats');
    console.log('='.repeat(50));
  }

  async createAdminDirectly() {
    try {
      console.log('🔧 Creando usuario administrador directamente...');
      
      const models = require('./models');
      
      if (!models.User) {
        throw new Error('Modelo User no disponible');
      }
      
      const existingAdmin = await models.User.findOne({
        where: { email: 'admin@gym.com' }
      });
      
      if (existingAdmin) {
        console.log('✅ Usuario admin ya existe');
        return existingAdmin;
      }
      
      const adminData = {
        firstName: process.env.ADMIN_FIRST_NAME || 'Administrador',
        lastName: process.env.ADMIN_LAST_NAME || 'Sistema',
        email: process.env.ADMIN_EMAIL || 'admin@gym.com',
        password: process.env.ADMIN_PASSWORD || 'Admin123!',
        phone: '+502 0000-0000',
        role: 'admin',
        isActive: true,
        emailVerified: true
      };
      
      const admin = await models.User.create(adminData);
      
      console.log('✅ Usuario administrador creado:');
      console.log(`   📧 Email: ${admin.email}`);
      console.log(`   🆔 ID: ${admin.id}`);
      
      return admin;
      
    } catch (error) {
      throw new Error(`Error creando admin: ${error.message}`);
    }
  }

  async initializeMembershipServices() {
    console.log('\n🎫 INICIALIZANDO SERVICIOS DE MEMBRESÍAS...');
    
    try {
      const autoDeductionEnabled = process.env.MEMBERSHIP_AUTO_DEDUCTION !== 'false';
      
      if (autoDeductionEnabled) {
        console.log('🕒 Iniciando servicio de deducción diaria...');
        dailyMembershipService.start();
        
        const status = dailyMembershipService.getStatus();
        console.log(`   ✅ Estado: ${status.isRunning ? 'ACTIVO' : 'INACTIVO'}`);
        console.log(`   📅 Programación: ${status.cronExpression}`);
        
        const runInitialProcess = process.env.MEMBERSHIP_RUN_INITIAL_PROCESS === 'true';
        if (runInitialProcess) {
          console.log('🔄 Ejecutando proceso inicial...');
          try {
            const result = await dailyMembershipService.runManually();
            console.log('   📊 Resultado:', result);
          } catch (initialError) {
            console.warn('   ⚠️ Error en proceso inicial:', initialError.message);
          }
        }
      } else {
        console.log('⏸️ Servicio de deducción DESHABILITADO');
      }
      
      console.log('✅ Servicios de membresías inicializados\n');
      
    } catch (error) {
      console.error('❌ Error en servicios de membresías:', error);
      console.warn('⚠️ Continuando sin servicio de deducción automática');
    }
  }

  async showDatabaseStatus() {
    try {
      console.log('\n📊 Estado de la base de datos:');
      const status = await getDatabaseStatus();
      
      if (status.totalTables === -1) {
        console.log('   ⚠️ No se pudo verificar estado');
        return;
      }

      console.log(`   📋 Total de tablas: ${status.totalTables}`);
      console.log(`   🏋️ Tablas del gimnasio: ${status.gymTables}/5`);
      
      if (status.isEmpty) {
        console.log('   ✅ Base de datos vacía - Lista para inicializar');
      } else if (status.hasGymTables) {
        console.log('   ✅ Sistema ya instalado');
      }
    } catch (error) {
      console.log('   ⚠️ Error verificando estado:', error.message);
    }
  }

  async showFinalDatabaseStatus() {
    try {
      console.log('\n📊 Estado final de la base de datos:');
      const status = await getDatabaseStatus();
      
      console.log(`   📋 Total de tablas: ${status.totalTables}`);
      console.log(`   🏋️ Tablas del gimnasio: ${status.gymTables}/5`);
      
      if (status.gymTables === 5) {
        console.log('   ✅ Sistema completamente instalado');
      }
    } catch (error) {
      console.log('   ⚠️ Error verificando estado final:', error.message);
    }
  }

  // ✅ MODIFICADO: Solo verificar, NO crear datos
  async initializeGymData() {
    try {
      console.log('🏢 Verificando configuración del gimnasio...');
      
      const models = require('./models');
      
      const requiredModels = [
        'GymConfiguration', 'GymContactInfo', 'GymHours', 'GymStatistics',
        'GymServices', 'MembershipPlans', 'StoreCategory', 'StoreBrand'
      ];
      
      const availableModels = requiredModels.filter(model => models[model]);
      const missingModels = requiredModels.filter(model => !models[model]);
      
      console.log(`📦 Modelos disponibles: ${availableModels.length}/${requiredModels.length}`);
      
      if (missingModels.length > 0) {
        console.warn(`⚠️ Modelos faltantes: ${missingModels.join(', ')}`);
      }

      console.log('🔧 Verificando configuración básica...');
      
      if (models.GymConfiguration) {
        try {
          const config = await models.GymConfiguration.findOne();
          if (config) {
            console.log('   ✅ GymConfiguration ya existe');
          } else {
            console.log('   ℹ️ GymConfiguration vacía - Configura desde el panel admin');
          }
        } catch (error) {
          console.warn('   ⚠️ Error en GymConfiguration:', error.message);
        }
      }

      console.log('📊 Estado actual del sistema:');
      
      try {
        if (models.StoreCategory) {
          const catCount = await models.StoreCategory.count();
          console.log(`   🗂️ Categorías: ${catCount}`);
        }
        
        if (models.StoreBrand) {
          const brandCount = await models.StoreBrand.count();
          console.log(`   🏷️ Marcas: ${brandCount}`);
        }
        
        if (models.StoreProduct) {
          const productCount = await models.StoreProduct.count();
          console.log(`   📦 Productos: ${productCount}`);
        }

        if (models.MembershipPlans) {
          const planCount = await models.MembershipPlans.count();
          console.log(`   🎫 Planes: ${planCount}`);
        }
        
      } catch (error) {
        console.warn('   ⚠️ Error obteniendo estadísticas:', error.message);
      }
      
      console.log('✅ Verificación completada');
      console.log('💡 Configura los datos desde el panel de administración');
      
    } catch (error) {
      console.warn('⚠️ Error verificando configuración:', error.message);
    }
  }

  async checkNotificationServices() {
    try {
      console.log('\n📧 Verificando servicios de notificación...');
      
      const { EmailService, WhatsAppService } = require('./services/notificationServices');
      
      const emailService = new EmailService();
      if (emailService.isConfigured) {
        console.log('   ✅ Gmail configurado correctamente');
      } else {
        console.log('   ⚠️ Gmail no configurado');
      }
      
      const whatsappService = new WhatsAppService();
      if (whatsappService.client) {
        console.log('   ✅ WhatsApp configurado correctamente');
      } else {
        console.log('   ⚠️ WhatsApp no configurado');
      }
      
    } catch (error) {
      console.warn('⚠️ Error verificando servicios:', error.message);
    }
  }

  startNotificationScheduler() {
    try {
      notificationScheduler.start();
      console.log('✅ Programador de notificaciones iniciado');
    } catch (error) {
      console.warn('⚠️ Error en programador:', error.message);
    }
  }

  checkEnvironmentVariables() {
    const required = [
      'DB_HOST',
      'DB_PORT', 
      'DB_NAME',
      'DB_USER',
      'DB_PASSWORD',
      'JWT_SECRET'
    ];

    const missing = required.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      console.error('❌ Variables faltantes:', missing.join(', '));
      return false;
    }

    if (process.env.RESET_DATABASE === 'true') {
      console.log('🚨 MODO RESET ACTIVADO');
    } else {
      console.log('✅ Modo normal');
    }

    return true;
  }

  setupGracefulShutdown() {
    ['SIGTERM', 'SIGINT'].forEach(signal => {
      process.on(signal, async () => {
        console.log(`\n📴 Cerrando servidor...`);
        
        try {
          dailyMembershipService.stop();
          
          if (notificationScheduler) {
            notificationScheduler.stop();
          }
          
          if (this.server) {
            this.server.close(() => {
              console.log('   ✅ Servidor HTTP cerrado');
            });
          }
          
          await closeConnection();
          console.log('👋 Elite Fitness Club cerrado');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error durante cierre:', error.message);
          process.exit(1);
        }
      });
    });
  }
}

if (require.main === module) {
  new Server().start();
}

module.exports = Server;