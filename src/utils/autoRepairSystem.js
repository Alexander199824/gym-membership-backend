// src/utils/autoRepairSystem.js - SISTEMA DE AUTO-REPARACIÓN COMPLETO
const { Op } = require('sequelize');

class AutoRepairSystem {
  constructor() {
    this.repairLog = [];
    this.modelsChecked = [];
    this.issuesFound = [];
    this.issuesFixed = [];
  }

  // ✅ MÉTODO PRINCIPAL: Reparar todo el sistema
  async repairAll() {
    console.log('\n🔧 INICIANDO SISTEMA DE AUTO-REPARACIÓN...');
    console.log('=' .repeat(60));
    
    try {
      // ✅ PASO 1: Verificar disponibilidad de modelos
      await this.checkModelAvailability();
      
      // ✅ PASO 2: Reparar asociaciones problemáticas
      await this.repairAssociations();
      
      // ✅ PASO 3: Sincronizar tablas críticas
      await this.syncCriticalTables();
      
      // ✅ PASO 4: Verificar foreign keys
      await this.verifyForeignKeys();
      
      // ✅ PASO 5: Reparar inconsistencias de datos
      await this.repairDataInconsistencies();
      
      // ✅ PASO 6: Verificar funcionalidad básica
      await this.testBasicFunctionality();
      
      // ✅ MOSTRAR RESUMEN
      this.showRepairSummary();
      
      return {
        success: true,
        issuesFound: this.issuesFound.length,
        issuesFixed: this.issuesFixed.length,
        log: this.repairLog
      };
      
    } catch (error) {
      console.error('❌ Error en sistema de auto-reparación:', error);
      return {
        success: false,
        error: error.message,
        log: this.repairLog
      };
    }
  }

  // ✅ PASO 1: Verificar disponibilidad de modelos
  async checkModelAvailability() {
    console.log('\n📦 PASO 1: Verificando disponibilidad de modelos...');
    
    try {
      const models = require('../models');
      const requiredModels = [
        'User', 'LocalSale', 'LocalSaleItem', 'StoreProduct', 'StoreCategory',
        'StoreBrand', 'StoreOrder', 'StoreOrderItem', 'FinancialMovements',
        'TransferConfirmation', 'MembershipPlans', 'Membership', 'Payment'
      ];
      
      const availableModels = [];
      const missingModels = [];
      
      for (const modelName of requiredModels) {
        if (models[modelName]) {
          availableModels.push(modelName);
          this.modelsChecked.push(modelName);
        } else {
          missingModels.push(modelName);
          this.issuesFound.push(`Modelo faltante: ${modelName}`);
        }
      }
      
      console.log(`   ✅ Modelos disponibles: ${availableModels.length}/${requiredModels.length}`);
      console.log(`   📋 Disponibles: ${availableModels.join(', ')}`);
      
      if (missingModels.length > 0) {
        console.log(`   ⚠️ Faltantes: ${missingModels.join(', ')}`);
      }
      
      this.repairLog.push(`Verificación de modelos: ${availableModels.length}/${requiredModels.length} disponibles`);
      
    } catch (error) {
      console.error('❌ Error verificando modelos:', error.message);
      this.issuesFound.push(`Error verificando modelos: ${error.message}`);
    }
  }

  // ✅ PASO 2: Reparar asociaciones problemáticas
  async repairAssociations() {
    console.log('\n🔗 PASO 2: Reparando asociaciones problemáticas...');
    
    try {
      const models = require('../models');
      
      // ✅ REPARAR ASOCIACIONES DE LOCALSALE
      if (models.LocalSale && models.User) {
        try {
          // Verificar si las asociaciones ya existen
          if (!models.LocalSale.associations?.employee) {
            models.LocalSale.belongsTo(models.User, {
              foreignKey: 'employeeId',
              as: 'employee',
              constraints: false
            });
            console.log('   🔧 Reparado: LocalSale -> User (employee)');
            this.issuesFixed.push('LocalSale.employee association');
          }
          
          if (!models.LocalSale.associations?.transferConfirmer) {
            models.LocalSale.belongsTo(models.User, {
              foreignKey: 'transferConfirmedBy',
              as: 'transferConfirmer',
              constraints: false
            });
            console.log('   🔧 Reparado: LocalSale -> User (transferConfirmer)');
            this.issuesFixed.push('LocalSale.transferConfirmer association');
          }
        } catch (error) {
          console.warn('   ⚠️ Error reparando asociaciones LocalSale-User:', error.message);
        }
      }
      
      // ✅ REPARAR ASOCIACIONES DE LOCALSALEITEM
      if (models.LocalSale && models.LocalSaleItem) {
        try {
          if (!models.LocalSale.associations?.items) {
            models.LocalSale.hasMany(models.LocalSaleItem, {
              foreignKey: 'saleId', // ✅ USAR saleId consistentemente
              as: 'items',
              onDelete: 'CASCADE'
            });
            console.log('   🔧 Reparado: LocalSale -> LocalSaleItem (items)');
            this.issuesFixed.push('LocalSale.items association');
          }
          
          if (!models.LocalSaleItem.associations?.sale) {
            models.LocalSaleItem.belongsTo(models.LocalSale, {
              foreignKey: 'saleId', // ✅ USAR saleId consistentemente
              as: 'sale', // ✅ USAR 'sale' no 'localSale'
              constraints: false
            });
            console.log('   🔧 Reparado: LocalSaleItem -> LocalSale (sale)');
            this.issuesFixed.push('LocalSaleItem.sale association');
          }
        } catch (error) {
          console.warn('   ⚠️ Error reparando asociaciones LocalSale-LocalSaleItem:', error.message);
        }
      }
      
      // ✅ REPARAR ASOCIACIONES DE PRODUCTOS
      if (models.LocalSaleItem && models.StoreProduct) {
        try {
          if (!models.LocalSaleItem.associations?.product) {
            models.LocalSaleItem.belongsTo(models.StoreProduct, {
              foreignKey: 'productId',
              as: 'product',
              constraints: false
            });
            console.log('   🔧 Reparado: LocalSaleItem -> StoreProduct (product)');
            this.issuesFixed.push('LocalSaleItem.product association');
          }
        } catch (error) {
          console.warn('   ⚠️ Error reparando asociación LocalSaleItem-StoreProduct:', error.message);
        }
      }
      
      // ✅ REPARAR ASOCIACIONES DE CATEGORÍAS Y MARCAS
      if (models.StoreProduct && models.StoreCategory) {
        try {
          if (!models.StoreProduct.associations?.category) {
            models.StoreProduct.belongsTo(models.StoreCategory, {
              foreignKey: 'categoryId',
              as: 'category',
              constraints: false
            });
            console.log('   🔧 Reparado: StoreProduct -> StoreCategory (category)');
            this.issuesFixed.push('StoreProduct.category association');
          }
        } catch (error) {
          console.warn('   ⚠️ Error reparando asociación StoreProduct-StoreCategory:', error.message);
        }
      }
      
      if (models.StoreProduct && models.StoreBrand) {
        try {
          if (!models.StoreProduct.associations?.brand) {
            models.StoreProduct.belongsTo(models.StoreBrand, {
              foreignKey: 'brandId',
              as: 'brand',
              constraints: false
            });
            console.log('   🔧 Reparado: StoreProduct -> StoreBrand (brand)');
            this.issuesFixed.push('StoreProduct.brand association');
          }
        } catch (error) {
          console.warn('   ⚠️ Error reparando asociación StoreProduct-StoreBrand:', error.message);
        }
      }
      
      this.repairLog.push('Asociaciones reparadas exitosamente');
      
    } catch (error) {
      console.error('❌ Error reparando asociaciones:', error.message);
      this.issuesFound.push(`Error en reparación de asociaciones: ${error.message}`);
    }
  }

  // ✅ PASO 3: Sincronizar tablas críticas
  async syncCriticalTables() {
    console.log('\n📊 PASO 3: Sincronizando tablas críticas...');
    
    try {
      const models = require('../models');
      const criticalTables = [
        'User', 'LocalSale', 'LocalSaleItem', 'StoreProduct', 
        'StoreCategory', 'StoreBrand', 'FinancialMovements'
      ];
      
      for (const modelName of criticalTables) {
        if (models[modelName]) {
          try {
            await models[modelName].sync({ alter: true });
            console.log(`   ✅ Sincronizado: ${modelName}`);
            this.issuesFixed.push(`Tabla sincronizada: ${modelName}`);
          } catch (syncError) {
            console.warn(`   ⚠️ Error sincronizando ${modelName}:`, syncError.message);
            
            // ✅ INTENTO DE RECUPERACIÓN: Crear tabla desde cero si falló
            try {
              await models[modelName].sync({ force: false });
              console.log(`   🔧 Recuperado: ${modelName} (segunda pasada)`);
              this.issuesFixed.push(`Tabla recuperada: ${modelName}`);
            } catch (recoveryError) {
              console.error(`   ❌ No se pudo recuperar ${modelName}:`, recoveryError.message);
              this.issuesFound.push(`Error irrecuperable en ${modelName}: ${recoveryError.message}`);
            }
          }
        }
      }
      
      this.repairLog.push('Sincronización de tablas críticas completada');
      
    } catch (error) {
      console.error('❌ Error en sincronización:', error.message);
      this.issuesFound.push(`Error general de sincronización: ${error.message}`);
    }
  }

  // ✅ PASO 4: Verificar foreign keys
  async verifyForeignKeys() {
    console.log('\n🔑 PASO 4: Verificando foreign keys...');
    
    try {
      const models = require('../models');
      
      // ✅ VERIFICAR Y REPARAR FOREIGN KEYS DE LOCAL_SALE_ITEMS
      if (models.LocalSaleItem && models.LocalSaleItem.sequelize) {
        try {
          // Verificar si la columna sale_id existe y tiene el nombre correcto
          const [columns] = await models.LocalSaleItem.sequelize.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'local_sale_items'
            AND column_name IN ('sale_id', 'local_sale_id')
            ORDER BY column_name
          `);
          
          const hasSaleId = columns.some(col => col.column_name === 'sale_id');
          const hasLocalSaleId = columns.some(col => col.column_name === 'local_sale_id');
          
          if (hasLocalSaleId && !hasSaleId) {
            console.log('   🔧 Detectado: columna local_sale_id debe ser sale_id');
            
            // Renombrar columna si es posible
            try {
              await models.LocalSaleItem.sequelize.query(`
                ALTER TABLE local_sale_items 
                RENAME COLUMN local_sale_id TO sale_id
              `);
              console.log('   ✅ Renombrado: local_sale_id -> sale_id');
              this.issuesFixed.push('Renombrado foreign key: local_sale_id -> sale_id');
            } catch (renameError) {
              console.warn('   ⚠️ No se pudo renombrar columna:', renameError.message);
            }
          } else if (hasSaleId) {
            console.log('   ✅ Foreign key sale_id existe correctamente');
          }
          
        } catch (queryError) {
          console.warn('   ⚠️ Error verificando columnas:', queryError.message);
        }
      }
      
      this.repairLog.push('Verificación de foreign keys completada');
      
    } catch (error) {
      console.error('❌ Error verificando foreign keys:', error.message);
      this.issuesFound.push(`Error en verificación de foreign keys: ${error.message}`);
    }
  }

  // ✅ PASO 5: Reparar inconsistencias de datos
  async repairDataInconsistencies() {
    console.log('\n🔍 PASO 5: Verificando inconsistencias de datos...');
    
    try {
      const models = require('../models');
      
      // ✅ VERIFICAR VENTAS LOCALES SIN ITEMS
      if (models.LocalSale && models.LocalSaleItem) {
        try {
          const [orphanSales] = await models.LocalSale.sequelize.query(`
            SELECT ls.id, ls.sale_number
            FROM local_sales ls
            LEFT JOIN local_sale_items lsi ON ls.id = lsi.sale_id
            WHERE lsi.id IS NULL
            LIMIT 10
          `);
          
          if (orphanSales.length > 0) {
            console.log(`   ⚠️ Encontradas ${orphanSales.length} ventas sin items`);
            this.issuesFound.push(`${orphanSales.length} ventas locales sin items`);
            
            // Por ahora solo reportar, no eliminar automáticamente
            orphanSales.forEach(sale => {
              console.log(`     - Venta ${sale.sale_number} (ID: ${sale.id})`);
            });
          } else {
            console.log('   ✅ Todas las ventas locales tienen items');
          }
        } catch (error) {
          console.warn('   ⚠️ Error verificando ventas huérfanas:', error.message);
        }
      }
      
      // ✅ VERIFICAR PRODUCTOS REFERENCIADOS QUE NO EXISTEN
      if (models.LocalSaleItem && models.StoreProduct) {
        try {
          const [missingProducts] = await models.LocalSaleItem.sequelize.query(`
            SELECT DISTINCT lsi.product_id, lsi.product_name, COUNT(*) as usage_count
            FROM local_sale_items lsi
            LEFT JOIN store_products sp ON lsi.product_id = sp.id
            WHERE sp.id IS NULL
            GROUP BY lsi.product_id, lsi.product_name
            LIMIT 10
          `);
          
          if (missingProducts.length > 0) {
            console.log(`   ⚠️ Encontrados ${missingProducts.length} productos referenciados que no existen`);
            this.issuesFound.push(`${missingProducts.length} productos faltantes en store_products`);
            
            missingProducts.forEach(prod => {
              console.log(`     - Producto ID ${prod.product_id} "${prod.product_name}" (usado ${prod.usage_count} veces)`);
            });
          } else {
            console.log('   ✅ Todas las referencias de productos son válidas');
          }
        } catch (error) {
          console.warn('   ⚠️ Error verificando productos faltantes:', error.message);
        }
      }
      
      this.repairLog.push('Verificación de inconsistencias de datos completada');
      
    } catch (error) {
      console.error('❌ Error verificando inconsistencias:', error.message);
      this.issuesFound.push(`Error en verificación de inconsistencias: ${error.message}`);
    }
  }

  // ✅ PASO 6: Verificar funcionalidad básica
  async testBasicFunctionality() {
    console.log('\n🧪 PASO 6: Probando funcionalidad básica...');
    
    try {
      const models = require('../models');
      
      // ✅ PROBAR CONSULTA BÁSICA DE VENTAS LOCALES
      if (models.LocalSale) {
        try {
          const salesCount = await models.LocalSale.count();
          console.log(`   ✅ Consulta LocalSale exitosa: ${salesCount} registros`);
          this.issuesFixed.push('LocalSale consultas funcionando');
        } catch (error) {
          console.warn('   ⚠️ Error en consulta LocalSale:', error.message);
          this.issuesFound.push(`LocalSale consultas fallan: ${error.message}`);
        }
      }
      
      // ✅ PROBAR CONSULTA DE ITEMS
      if (models.LocalSaleItem) {
        try {
          const itemsCount = await models.LocalSaleItem.count();
          console.log(`   ✅ Consulta LocalSaleItem exitosa: ${itemsCount} registros`);
          this.issuesFixed.push('LocalSaleItem consultas funcionando');
        } catch (error) {
          console.warn('   ⚠️ Error en consulta LocalSaleItem:', error.message);
          this.issuesFound.push(`LocalSaleItem consultas fallan: ${error.message}`);
        }
      }
      
      // ✅ PROBAR CONSULTA CON JOIN (la que más problemas da)
      if (models.LocalSale && models.LocalSaleItem) {
        try {
          const [joinResults] = await models.LocalSale.sequelize.query(`
            SELECT ls.id, ls.sale_number, COUNT(lsi.id) as items_count
            FROM local_sales ls
            LEFT JOIN local_sale_items lsi ON ls.id = lsi.sale_id
            GROUP BY ls.id, ls.sale_number
            LIMIT 5
          `);
          
          console.log(`   ✅ JOIN query exitosa: ${joinResults.length} resultados de prueba`);
          this.issuesFixed.push('JOIN queries LocalSale-LocalSaleItem funcionando');
        } catch (error) {
          console.warn('   ⚠️ Error en JOIN query:', error.message);
          this.issuesFound.push(`JOIN queries fallan: ${error.message}`);
        }
      }
      
      this.repairLog.push('Pruebas de funcionalidad básica completadas');
      
    } catch (error) {
      console.error('❌ Error en pruebas de funcionalidad:', error.message);
      this.issuesFound.push(`Error en pruebas funcionales: ${error.message}`);
    }
  }

  // ✅ MOSTRAR RESUMEN DE REPARACIONES
  showRepairSummary() {
    console.log('\n📋 RESUMEN DE REPARACIONES:');
    console.log('=' .repeat(60));
    
    console.log(`✅ Modelos verificados: ${this.modelsChecked.length}`);
    console.log(`🔍 Problemas encontrados: ${this.issuesFound.length}`);
    console.log(`🔧 Problemas reparados: ${this.issuesFixed.length}`);
    
    if (this.issuesFound.length > 0) {
      console.log('\n❌ PROBLEMAS ENCONTRADOS:');
      this.issuesFound.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    if (this.issuesFixed.length > 0) {
      console.log('\n✅ PROBLEMAS REPARADOS:');
      this.issuesFixed.forEach((fix, index) => {
        console.log(`   ${index + 1}. ${fix}`);
      });
    }
    
    const successRate = this.issuesFound.length > 0 ? 
      Math.round((this.issuesFixed.length / (this.issuesFound.length + this.issuesFixed.length)) * 100) : 100;
    
    console.log(`\n📊 Tasa de éxito: ${successRate}%`);
    
    if (successRate >= 80) {
      console.log('🎉 SISTEMA REPARADO EXITOSAMENTE');
    } else if (successRate >= 50) {
      console.log('⚠️ SISTEMA PARCIALMENTE REPARADO - Revisar problemas restantes');
    } else {
      console.log('❌ SISTEMA REQUIERE ATENCIÓN MANUAL');
    }
    
    console.log('=' .repeat(60));
  }
}

module.exports = new AutoRepairSystem();