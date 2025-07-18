// src/controllers/dataCleanupController.js - NUEVO: Para limpiar datos de prueba
const { 
  User, 
  Membership, 
  Payment, 
  DailyIncome, 
  Notification,
  FinancialMovements,
  UserSchedulePreferences,
  StoreCategory,
  StoreBrand,
  StoreProduct,
  StoreProductImage,
  StoreOrder,
  StoreOrderItem,
  StoreCart,
  GymStatistics,
  GymServices,
  MembershipPlans
} = require('../models');

class DataCleanupController {

  // ✅ Limpiar TODOS los datos de prueba (PELIGROSO)
  async cleanAllTestData(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden limpiar datos'
        });
      }

      console.log('🧹 Iniciando limpieza completa de datos de prueba...');

      // ✅ Mantener siempre el usuario admin principal
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@gym.com';
      const mainAdmin = await User.findOne({ where: { email: adminEmail } });

      if (!mainAdmin) {
        return res.status(400).json({
          success: false,
          message: 'No se puede proceder: Usuario administrador principal no encontrado'
        });
      }

      // ✅ Eliminar en orden correcto (respetando foreign keys)
      
      // 1. Datos de tienda
      await StoreOrderItem.destroy({ where: {} });
      await StoreOrder.destroy({ where: {} });
      await StoreCart.destroy({ where: {} });
      await StoreProductImage.destroy({ where: {} });
      await StoreProduct.destroy({ where: {} });
      console.log('   ✅ Datos de tienda eliminados');

      // 2. Datos financieros
      await FinancialMovements.destroy({ where: {} });
      console.log('   ✅ Movimientos financieros eliminados');

      // 3. Notificaciones
      await Notification.destroy({ where: {} });
      console.log('   ✅ Notificaciones eliminadas');

      // 4. Pagos y membresías
      await Payment.destroy({ where: {} });
      await Membership.destroy({ where: {} });
      console.log('   ✅ Pagos y membresías eliminados');

      // 5. Horarios de usuarios
      await UserSchedulePreferences.destroy({ where: {} });
      console.log('   ✅ Horarios de usuarios eliminados');

      // 6. Ingresos diarios
      await DailyIncome.destroy({ where: {} });
      console.log('   ✅ Ingresos diarios eliminados');

      // 7. Usuarios (excepto admin principal)
      const deletedUsers = await User.destroy({ 
        where: { 
          id: { 
            [sequelize.Sequelize.Op.ne]: mainAdmin.id 
          } 
        } 
      });
      console.log(`   ✅ ${deletedUsers} usuarios eliminados (admin principal conservado)`);

      console.log('✅ Limpieza completa terminada');

      res.json({
        success: true,
        message: 'Todos los datos de prueba han sido eliminados exitosamente',
        data: {
          adminPreserved: {
            id: mainAdmin.id,
            email: mainAdmin.email,
            name: mainAdmin.getFullName()
          },
          deletedCounts: {
            users: deletedUsers,
            note: 'Todos los demás datos fueron eliminados'
          }
        }
      });
    } catch (error) {
      console.error('Error al limpiar datos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al limpiar datos',
        error: error.message
      });
    }
  }

  // ✅ Limpiar solo datos de usuarios de prueba
  async cleanTestUsers(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden limpiar datos'
        });
      }

      console.log('👥 Limpiando usuarios de prueba...');

      // ✅ Identificar usuarios de prueba por email o nombre
      const testUserPatterns = [
        { email: { [sequelize.Sequelize.Op.like]: '%test%' } },
        { email: { [sequelize.Sequelize.Op.like]: '%ejemplo%' } },
        { email: { [sequelize.Sequelize.Op.like]: '%demo%' } },
        { firstName: { [sequelize.Sequelize.Op.like]: '%Test%' } },
        { firstName: { [sequelize.Sequelize.Op.like]: '%Demo%' } },
        { email: 'cliente@gym.com' },
        { email: 'colaborador@gym.com' }
      ];

      const adminEmail = process.env.ADMIN_EMAIL || 'admin@gym.com';

      const testUsers = await User.findAll({
        where: {
          [sequelize.Sequelize.Op.and]: [
            { email: { [sequelize.Sequelize.Op.ne]: adminEmail } },
            { 
              [sequelize.Sequelize.Op.or]: testUserPatterns 
            }
          ]
        }
      });

      console.log(`   📋 Encontrados ${testUsers.length} usuarios de prueba`);

      // ✅ Eliminar datos relacionados de cada usuario de prueba
      for (const user of testUsers) {
        await UserSchedulePreferences.destroy({ where: { userId: user.id } });
        await Notification.destroy({ where: { userId: user.id } });
        
        const userMemberships = await Membership.findAll({ where: { userId: user.id } });
        for (const membership of userMemberships) {
          await Payment.destroy({ where: { membershipId: membership.id } });
        }
        await Membership.destroy({ where: { userId: user.id } });
        
        await Payment.destroy({ where: { userId: user.id } });
        await StoreOrder.destroy({ where: { userId: user.id } });
        await StoreCart.destroy({ where: { userId: user.id } });
      }

      // ✅ Eliminar los usuarios de prueba
      const deletedCount = await User.destroy({
        where: {
          id: testUsers.map(u => u.id)
        }
      });

      console.log(`   ✅ ${deletedCount} usuarios de prueba eliminados`);

      res.json({
        success: true,
        message: `${deletedCount} usuarios de prueba eliminados exitosamente`,
        data: {
          deletedUsers: testUsers.map(u => ({
            id: u.id,
            name: u.getFullName(),
            email: u.email
          }))
        }
      });
    } catch (error) {
      console.error('Error al limpiar usuarios de prueba:', error);
      res.status(500).json({
        success: false,
        message: 'Error al limpiar usuarios de prueba',
        error: error.message
      });
    }
  }

  // ✅ Limpiar solo datos de tienda
  async cleanStoreData(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden limpiar datos'
        });
      }

      console.log('🛍️ Limpiando datos de tienda...');

      const counts = {
        orderItems: await StoreOrderItem.count(),
        orders: await StoreOrder.count(),
        cartItems: await StoreCart.count(),
        productImages: await StoreProductImage.count(),
        products: await StoreProduct.count()
      };

      await StoreOrderItem.destroy({ where: {} });
      await StoreOrder.destroy({ where: {} });
      await StoreCart.destroy({ where: {} });
      await StoreProductImage.destroy({ where: {} });
      await StoreProduct.destroy({ where: {} });

      console.log('   ✅ Datos de tienda eliminados');

      res.json({
        success: true,
        message: 'Datos de tienda eliminados exitosamente',
        data: { deletedCounts: counts }
      });
    } catch (error) {
      console.error('Error al limpiar datos de tienda:', error);
      res.status(500).json({
        success: false,
        message: 'Error al limpiar datos de tienda',
        error: error.message
      });
    }
  }

  // ✅ Reinicializar datos de configuración del gym
  async resetGymConfiguration(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden reinicializar configuración'
        });
      }

      console.log('🏢 Reinicializando configuración del gym...');

      // ✅ Limpiar datos configurables
      await GymStatistics.destroy({ where: {} });
      await GymServices.destroy({ where: {} });
      await MembershipPlans.destroy({ where: {} });

      // ✅ Recrear datos por defecto
      await GymStatistics.seedDefaultStats();
      await GymServices.seedDefaultServices();
      await MembershipPlans.seedDefaultPlans();

      console.log('   ✅ Configuración reinicializada');

      res.json({
        success: true,
        message: 'Configuración del gym reinicializada exitosamente'
      });
    } catch (error) {
      console.error('Error al reinicializar configuración:', error);
      res.status(500).json({
        success: false,
        message: 'Error al reinicializar configuración',
        error: error.message
      });
    }
  }

  // ✅ Obtener resumen de datos actuales
  async getDataSummary(req, res) {
    try {
      const summary = {
        users: {
          total: await User.count(),
          byRole: {
            admin: await User.count({ where: { role: 'admin' } }),
            colaborador: await User.count({ where: { role: 'colaborador' } }),
            cliente: await User.count({ where: { role: 'cliente' } })
          }
        },
        memberships: {
          total: await Membership.count(),
          active: await Membership.count({ where: { status: 'active' } })
        },
        payments: {
          total: await Payment.count(),
          completed: await Payment.count({ where: { status: 'completed' } })
        },
        store: {
          products: await StoreProduct.count(),
          orders: await StoreOrder.count(),
          cartItems: await StoreCart.count()
        },
        financial: {
          movements: await FinancialMovements.count()
        },
        configuration: {
          statistics: await GymStatistics.count(),
          services: await GymServices.count(),
          membershipPlans: await MembershipPlans.count()
        }
      };

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error al obtener resumen de datos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener resumen de datos',
        error: error.message
      });
    }
  }

  // ✅ Crear datos de ejemplo para tienda
  async seedStoreData(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden crear datos de ejemplo'
        });
      }

      console.log('🛍️ Creando datos de ejemplo para tienda...');

      // ✅ Crear categorías, marcas y productos
      await StoreCategory.seedDefaultCategories();
      await StoreBrand.seedDefaultBrands();
      await StoreProduct.seedSampleProducts();

      console.log('   ✅ Datos de tienda creados');

      res.json({
        success: true,
        message: 'Datos de ejemplo de tienda creados exitosamente'
      });
    } catch (error) {
      console.error('Error al crear datos de tienda:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear datos de tienda',
        error: error.message
      });
    }
  }
}

module.exports = new DataCleanupController();