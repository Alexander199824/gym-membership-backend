// migrations/20250101000002-create-local-sales.js - CREAR TABLAS DE VENTAS LOCALES
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('🔄 Creando tablas de ventas locales...');
      
      // ✅ 1. Crear tabla local_sales
      await queryInterface.createTable('local_sales', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        sale_number: {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true
        },
        employee_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        work_date: {
          type: Sequelize.DATEONLY,
          allowNull: false
        },
        
        // Totales
        subtotal: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0
          }
        },
        discount_amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        tax_amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        total_amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        
        // Método de pago
        payment_method: {
          type: Sequelize.ENUM('cash', 'transfer'),
          allowNull: false
        },
        
        // Para efectivo
        cash_received: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true
        },
        change_given: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true
        },
        
        // Para transferencias
        transfer_voucher: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Descripción del voucher WhatsApp'
        },
        transfer_confirmed: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        transfer_confirmed_by: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        transfer_confirmed_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        bank_reference: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        transfer_amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true
        },
        
        // Cliente
        customer_name: {
          type: Sequelize.STRING(200),
          allowNull: true
        },
        customer_phone: {
          type: Sequelize.STRING(20),
          allowNull: true
        },
        customer_email: {
          type: Sequelize.STRING(200),
          allowNull: true
        },
        
        // Estado
        status: {
          type: Sequelize.ENUM('completed', 'transfer_pending', 'cancelled'),
          allowNull: false,
          defaultValue: 'completed'
        },
        
        // Metadata
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        
        // Timestamps
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      });
      console.log('   ✅ Tabla local_sales creada');
      
      // ✅ 2. Crear tabla local_sale_items
      await queryInterface.createTable('local_sale_items', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        local_sale_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'local_sales',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        product_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'store_products',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        
        // Snapshot del producto
        product_name: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        product_sku: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        product_price: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          comment: 'Precio original del producto al momento de la venta'
        },
        
        // Detalles de venta
        quantity: {
          type: Sequelize.INTEGER,
          allowNull: false,
          validate: {
            min: 1
          }
        },
        unit_price: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          comment: 'Precio unitario aplicado (puede incluir descuentos)'
        },
        discount_percent: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: 0,
            max: 100
          }
        },
        total_price: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          comment: 'Precio total del item (unitPrice * quantity)'
        },
        
        // Timestamps
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      });
      console.log('   ✅ Tabla local_sale_items creada');
      
      // ✅ 3. Crear tabla transfer_confirmations
      await queryInterface.createTable('transfer_confirmations', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        local_sale_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'local_sales',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        order_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'store_orders',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        voucher_description: {
          type: Sequelize.TEXT,
          allowNull: false,
          comment: 'Descripción del voucher de transferencia (generalmente de WhatsApp)'
        },
        bank_reference: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'Número de referencia bancaria'
        },
        transfer_amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0
          }
        },
        confirmed_by: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        confirmed_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Notas adicionales del staff que confirma'
        },
        
        // Timestamps
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      });
      console.log('   ✅ Tabla transfer_confirmations creada');
      
      // ✅ 4. Crear índices para mejorar rendimiento
      const indexes = [
        // local_sales indexes
        { table: 'local_sales', fields: ['employee_id'], name: 'idx_local_sales_employee' },
        { table: 'local_sales', fields: ['work_date'], name: 'idx_local_sales_date' },
        { table: 'local_sales', fields: ['status'], name: 'idx_local_sales_status' },
        { table: 'local_sales', fields: ['payment_method'], name: 'idx_local_sales_payment_method' },
        { table: 'local_sales', fields: ['transfer_confirmed'], name: 'idx_local_sales_transfer_confirmed' },
        { table: 'local_sales', fields: ['sale_number'], name: 'idx_local_sales_sale_number', unique: true },
        
        // local_sale_items indexes
        { table: 'local_sale_items', fields: ['local_sale_id'], name: 'idx_local_sale_items_sale_id' },
        { table: 'local_sale_items', fields: ['product_id'], name: 'idx_local_sale_items_product_id' },
        
        // transfer_confirmations indexes
        { table: 'transfer_confirmations', fields: ['local_sale_id'], name: 'idx_transfer_confirmations_local_sale' },
        { table: 'transfer_confirmations', fields: ['order_id'], name: 'idx_transfer_confirmations_order' },
        { table: 'transfer_confirmations', fields: ['confirmed_by'], name: 'idx_transfer_confirmations_confirmed_by' },
        { table: 'transfer_confirmations', fields: ['confirmed_at'], name: 'idx_transfer_confirmations_confirmed_at' },
        { table: 'transfer_confirmations', fields: ['transfer_amount'], name: 'idx_transfer_confirmations_amount' }
      ];
      
      for (const index of indexes) {
        try {
          await queryInterface.addIndex(index.table, index.fields, {
            name: index.name,
            unique: index.unique || false
          });
          console.log(`   ✅ Índice ${index.name} creado`);
        } catch (error) {
          console.log(`   ⚠️ Error creando índice ${index.name}:`, error.message);
        }
      }
      
      console.log('✅ Tablas de ventas locales creadas exitosamente');
      
    } catch (error) {
      console.error('❌ Error creando tablas de ventas locales:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      console.log('🔄 Eliminando tablas de ventas locales...');
      
      // Eliminar en orden inverso debido a las dependencias
      await queryInterface.dropTable('transfer_confirmations');
      console.log('   ✅ Tabla transfer_confirmations eliminada');
      
      await queryInterface.dropTable('local_sale_items');
      console.log('   ✅ Tabla local_sale_items eliminada');
      
      await queryInterface.dropTable('local_sales');
      console.log('   ✅ Tabla local_sales eliminada');
      
      console.log('✅ Tablas de ventas locales eliminadas exitosamente');
      
    } catch (error) {
      console.error('❌ Error eliminando tablas de ventas locales:', error);
      throw error;
    }
  }
};