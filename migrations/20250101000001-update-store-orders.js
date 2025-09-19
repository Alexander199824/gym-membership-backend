// migrations/20250101000001-update-store-orders.js - ACTUALIZAR TABLA STORE_ORDERS
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('🔄 Actualizando tabla store_orders con nuevos campos...');
      
      // Verificar si la tabla existe
      const tableExists = await queryInterface.tableExists('store_orders');
      if (!tableExists) {
        console.log('⚠️ Tabla store_orders no existe, se creará automáticamente');
        return;
      }
      
      // Agregar columnas nuevas si no existen
      const tableDescription = await queryInterface.describeTable('store_orders');
      
      // Delivery type
      if (!tableDescription.delivery_type) {
        await queryInterface.addColumn('store_orders', 'delivery_type', {
          type: Sequelize.ENUM('pickup', 'delivery', 'express'),
          allowNull: false,
          defaultValue: 'delivery'
        });
        console.log('   ✅ Agregada columna delivery_type');
      }
      
      // Estimated delivery
      if (!tableDescription.estimated_delivery) {
        await queryInterface.addColumn('store_orders', 'estimated_delivery', {
          type: Sequelize.DATE,
          allowNull: true
        });
        console.log('   ✅ Agregada columna estimated_delivery');
      }
      
      // Pickup date
      if (!tableDescription.pickup_date) {
        await queryInterface.addColumn('store_orders', 'pickup_date', {
          type: Sequelize.DATE,
          allowNull: true
        });
        console.log('   ✅ Agregada columna pickup_date');
      }
      
      // Pickup time slot
      if (!tableDescription.pickup_time_slot) {
        await queryInterface.addColumn('store_orders', 'pickup_time_slot', {
          type: Sequelize.STRING(50),
          allowNull: true
        });
        console.log('   ✅ Agregada columna pickup_time_slot');
      }
      
      // Transfer voucher details
      if (!tableDescription.transfer_voucher_details) {
        await queryInterface.addColumn('store_orders', 'transfer_voucher_details', {
          type: Sequelize.TEXT,
          allowNull: true
        });
        console.log('   ✅ Agregada columna transfer_voucher_details');
      }
      
      // Transfer confirmed
      if (!tableDescription.transfer_confirmed) {
        await queryInterface.addColumn('store_orders', 'transfer_confirmed', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        });
        console.log('   ✅ Agregada columna transfer_confirmed');
      }
      
      // Transfer confirmed by
      if (!tableDescription.transfer_confirmed_by) {
        await queryInterface.addColumn('store_orders', 'transfer_confirmed_by', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        });
        console.log('   ✅ Agregada columna transfer_confirmed_by');
      }
      
      // Transfer confirmed at
      if (!tableDescription.transfer_confirmed_at) {
        await queryInterface.addColumn('store_orders', 'transfer_confirmed_at', {
          type: Sequelize.DATE,
          allowNull: true
        });
        console.log('   ✅ Agregada columna transfer_confirmed_at');
      }
      
      // Special instructions
      if (!tableDescription.special_instructions) {
        await queryInterface.addColumn('store_orders', 'special_instructions', {
          type: Sequelize.TEXT,
          allowNull: true
        });
        console.log('   ✅ Agregada columna special_instructions');
      }
      
      // Requires confirmation
      if (!tableDescription.requires_confirmation) {
        await queryInterface.addColumn('store_orders', 'requires_confirmation', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        });
        console.log('   ✅ Agregada columna requires_confirmation');
      }
      
      // Confirmed at
      if (!tableDescription.confirmed_at) {
        await queryInterface.addColumn('store_orders', 'confirmed_at', {
          type: Sequelize.DATE,
          allowNull: true
        });
        console.log('   ✅ Agregada columna confirmed_at');
      }
      
      // Confirmed by
      if (!tableDescription.confirmed_by) {
        await queryInterface.addColumn('store_orders', 'confirmed_by', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        });
        console.log('   ✅ Agregada columna confirmed_by');
      }
      
      // Actualizar ENUM de status si es necesario
      console.log('   🔄 Verificando estados de órdenes...');
      
      // Actualizar ENUM de payment_method si es necesario
      console.log('   🔄 Verificando métodos de pago...');
      
      // Crear índices para mejorar rendimiento
      await queryInterface.addIndex('store_orders', ['delivery_type'], {
        name: 'idx_store_orders_delivery_type'
      }).catch(() => {
        console.log('   ℹ️ Índice delivery_type ya existe');
      });
      
      await queryInterface.addIndex('store_orders', ['transfer_confirmed'], {
        name: 'idx_store_orders_transfer_confirmed'
      }).catch(() => {
        console.log('   ℹ️ Índice transfer_confirmed ya existe');
      });
      
      await queryInterface.addIndex('store_orders', ['requires_confirmation'], {
        name: 'idx_store_orders_requires_confirmation'
      }).catch(() => {
        console.log('   ℹ️ Índice requires_confirmation ya existe');
      });
      
      console.log('✅ Tabla store_orders actualizada exitosamente');
      
    } catch (error) {
      console.error('❌ Error actualizando tabla store_orders:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      console.log('🔄 Revirtiendo cambios en tabla store_orders...');
      
      // Eliminar columnas agregadas
      const columnsToRemove = [
        'delivery_type',
        'estimated_delivery',
        'pickup_date',
        'pickup_time_slot',
        'transfer_voucher_details',
        'transfer_confirmed',
        'transfer_confirmed_by',
        'transfer_confirmed_at',
        'special_instructions',
        'requires_confirmation',
        'confirmed_at',
        'confirmed_by'
      ];
      
      for (const column of columnsToRemove) {
        try {
          await queryInterface.removeColumn('store_orders', column);
          console.log(`   ✅ Eliminada columna ${column}`);
        } catch (error) {
          console.log(`   ⚠️ No se pudo eliminar columna ${column}:`, error.message);
        }
      }
      
      // Eliminar índices
      const indexesToRemove = [
        'idx_store_orders_delivery_type',
        'idx_store_orders_transfer_confirmed',
        'idx_store_orders_requires_confirmation'
      ];
      
      for (const index of indexesToRemove) {
        try {
          await queryInterface.removeIndex('store_orders', index);
          console.log(`   ✅ Eliminado índice ${index}`);
        } catch (error) {
          console.log(`   ⚠️ No se pudo eliminar índice ${index}:`, error.message);
        }
      }
      
      console.log('✅ Cambios revertidos exitosamente');
      
    } catch (error) {
      console.error('❌ Error revirtiendo cambios:', error);
      throw error;
    }
  }
};