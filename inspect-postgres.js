// inspect-postgres.js - Inspeccionar base de datos PostgreSQL completa
const { Client } = require('pg');
require('dotenv').config();

class PostgresInspector {
  constructor() {
    this.client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'gym_membership',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    });
  }

  async connect() {
    try {
      await this.client.connect();
      console.log('✅ Conectado a PostgreSQL');
      
      // Información de la conexión
      const dbInfo = await this.client.query('SELECT version()');
      console.log(`📊 PostgreSQL Version: ${dbInfo.rows[0].version}`);
      
      const currentDB = await this.client.query('SELECT current_database()');
      console.log(`🗄️ Base de datos actual: ${currentDB.rows[0].current_database}`);
      
      return true;
    } catch (error) {
      console.error('❌ Error conectando a PostgreSQL:', error.message);
      return false;
    }
  }

  async getAllTables() {
    try {
      const query = `
        SELECT 
          schemaname,
          tablename,
          hasindexes,
          hasrules,
          hastriggers
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename;
      `;
      
      const result = await this.client.query(query);
      return result.rows;
    } catch (error) {
      console.error('❌ Error obteniendo tablas:', error.message);
      return [];
    }
  }

  async getTableStructure(tableName) {
    try {
      const query = `
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default,
          ordinal_position
        FROM information_schema.columns 
        WHERE table_name = $1 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `;
      
      const result = await this.client.query(query, [tableName]);
      return result.rows;
    } catch (error) {
      console.error(`❌ Error obteniendo estructura de ${tableName}:`, error.message);
      return [];
    }
  }

  async getTableConstraints(tableName) {
    try {
      const query = `
        SELECT 
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.table_name = $1
        AND tc.table_schema = 'public'
        ORDER BY tc.constraint_type, tc.constraint_name;
      `;
      
      const result = await this.client.query(query, [tableName]);
      return result.rows;
    } catch (error) {
      console.error(`❌ Error obteniendo constraints de ${tableName}:`, error.message);
      return [];
    }
  }

  async getTableData(tableName, limit = 3) {
    try {
      const countQuery = `SELECT COUNT(*) FROM "${tableName}"`;
      const countResult = await this.client.query(countQuery);
      const totalRows = parseInt(countResult.rows[0].count);

      const dataQuery = `SELECT * FROM "${tableName}" LIMIT $1`;
      const dataResult = await this.client.query(dataQuery, [limit]);

      return {
        totalRows,
        sampleData: dataResult.rows
      };
    } catch (error) {
      console.error(`❌ Error obteniendo datos de ${tableName}:`, error.message);
      return { totalRows: 0, sampleData: [] };
    }
  }

  async inspectCriticalTables() {
    const criticalTables = [
      'gym_configuration',
      'membership_plans', 
      'users',
      'memberships',
      'payments',
      'gym_hours',
      'gym_time_slots',
      'store_categories',
      'store_brands',
      'store_products'
    ];

    console.log('\n🔍 INSPECCIÓN DETALLADA DE TABLAS CRÍTICAS:');
    console.log('═'.repeat(80));

    for (const tableName of criticalTables) {
      console.log(`\n📋 TABLA: ${tableName.toUpperCase()}`);
      console.log('─'.repeat(50));

      // 1. Verificar si existe
      const tables = await this.getAllTables();
      const tableExists = tables.some(t => t.tablename === tableName);

      if (!tableExists) {
        console.log('❌ TABLA NO EXISTE');
        continue;
      }

      console.log('✅ Tabla existe');

      // 2. Estructura
      console.log('\n🏗️ ESTRUCTURA:');
      const columns = await this.getTableStructure(tableName);
      
      if (columns.length === 0) {
        console.log('❌ No se pudo obtener estructura');
        continue;
      }

      columns.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        
        console.log(`   ${col.ordinal_position.toString().padStart(2)}. ${col.column_name.padEnd(25)} ${col.data_type}${length} ${nullable}${defaultVal}`);
      });

      // 3. Constraints
      console.log('\n🔒 CONSTRAINTS:');
      const constraints = await this.getTableConstraints(tableName);
      
      if (constraints.length === 0) {
        console.log('   Sin constraints definidos');
      } else {
        constraints.forEach(constraint => {
          let description = `${constraint.constraint_type}: ${constraint.column_name}`;
          if (constraint.foreign_table_name) {
            description += ` -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`;
          }
          console.log(`   ${constraint.constraint_name}: ${description}`);
        });
      }

      // 4. Datos
      console.log('\n📊 DATOS:');
      const tableData = await this.getTableData(tableName);
      console.log(`   Total registros: ${tableData.totalRows}`);

      if (tableData.totalRows === 0) {
        console.log('   ⚠️ Tabla vacía - no hay datos');
      } else {
        console.log(`   📋 Muestra (primeros ${Math.min(3, tableData.sampleData.length)} registros):`);
        
        tableData.sampleData.forEach((row, index) => {
          console.log(`\n   Registro ${index + 1}:`);
          Object.keys(row).forEach(key => {
            let value = row[key];
            if (value === null) {
              value = 'NULL';
            } else if (typeof value === 'string' && value.length > 50) {
              value = value.substring(0, 47) + '...';
            } else if (typeof value === 'object') {
              value = JSON.stringify(value);
            }
            console.log(`     ${key}: ${value}`);
          });
        });
      }

      // 5. Verificación específica para tablas problemáticas
      if (tableName === 'gym_configuration') {
        console.log('\n🔍 VERIFICACIÓN ESPECÍFICA GYM_CONFIGURATION:');
        try {
          const specificQuery = `SELECT id, name, description FROM gym_configuration LIMIT 1`;
          await this.client.query(specificQuery);
          console.log('   ✅ Columnas id, name, description existen');
        } catch (error) {
          console.log('   ❌ Error accediendo columnas específicas:', error.message);
          
          // Intentar con los nombres de campo reales del modelo
          try {
            const altQuery = `SELECT id, gym_name, gym_description FROM gym_configuration LIMIT 1`;
            await this.client.query(altQuery);
            console.log('   ✅ Columnas con nombres alternativos encontradas: gym_name, gym_description');
          } catch (altError) {
            console.log('   ❌ Tampoco funcionan nombres alternativos:', altError.message);
          }
        }
      }

      if (tableName === 'membership_plans') {
        console.log('\n🔍 VERIFICACIÓN ESPECÍFICA MEMBERSHIP_PLANS:');
        try {
          const specificQuery = `SELECT id, plan_name, price, duration_type FROM membership_plans LIMIT 1`;
          await this.client.query(specificQuery);
          console.log('   ✅ Columnas principales existen');
        } catch (error) {
          console.log('   ❌ Error accediendo columnas:', error.message);
        }
      }
    }
  }

  async runCompleteInspection() {
    console.log('🔍 INSPECTOR DE BASE DE DATOS POSTGRESQL');
    console.log('═'.repeat(80));

    const connected = await this.connect();
    if (!connected) {
      console.log('❌ No se pudo conectar. Verifica:');
      console.log('   - PostgreSQL esté corriendo');
      console.log('   - Credenciales en .env correctas');
      console.log('   - Base de datos existe');
      return;
    }

    try {
      // 1. Listar todas las tablas
      console.log('\n📋 TODAS LAS TABLAS EN LA BASE DE DATOS:');
      console.log('─'.repeat(50));
      
      const allTables = await this.getAllTables();
      
      if (allTables.length === 0) {
        console.log('❌ NO SE ENCONTRARON TABLAS');
        console.log('🔥 PROBLEMA: La base de datos está completamente vacía');
        console.log('🔧 SOLUCIÓN: El servidor no está creando las tablas correctamente');
        return;
      }

      console.log(`✅ Encontradas ${allTables.length} tablas:`);
      allTables.forEach((table, index) => {
        const indicators = [];
        if (table.hasindexes) indicators.push('📊 indexes');
        if (table.hasrules) indicators.push('📋 rules');
        if (table.hastriggers) indicators.push('⚡ triggers');
        
        console.log(`   ${(index + 1).toString().padStart(2)}. ${table.tablename.padEnd(30)} ${indicators.join(', ')}`);
      });

      // 2. Inspección detallada de tablas críticas
      await this.inspectCriticalTables();

      // 3. Resumen final
      console.log('\n📊 RESUMEN DEL DIAGNÓSTICO:');
      console.log('═'.repeat(50));

      const tableNames = allTables.map(t => t.tablename);
      const expectedTables = [
        'gym_configuration', 'membership_plans', 'users', 'memberships', 
        'payments', 'gym_hours', 'gym_time_slots'
      ];

      const missingTables = expectedTables.filter(table => !tableNames.includes(table));
      const extraTables = tableNames.filter(table => !expectedTables.includes(table) && !table.includes('sequelize'));

      console.log(`📋 Tablas esperadas presentes: ${expectedTables.length - missingTables.length}/${expectedTables.length}`);
      
      if (missingTables.length > 0) {
        console.log(`❌ Tablas faltantes: ${missingTables.join(', ')}`);
      }
      
      if (extraTables.length > 0) {
        console.log(`➕ Tablas adicionales: ${extraTables.join(', ')}`);
      }

      // 4. Verificar datos críticos
      console.log('\n🌱 VERIFICACIÓN DE DATOS INICIALES:');
      const dataChecks = [];

      if (tableNames.includes('gym_configuration')) {
        const gymData = await this.getTableData('gym_configuration', 1);
        dataChecks.push(`gym_configuration: ${gymData.totalRows} registros`);
      }

      if (tableNames.includes('membership_plans')) {
        const plansData = await this.getTableData('membership_plans', 1);
        dataChecks.push(`membership_plans: ${plansData.totalRows} registros`);
      }

      if (tableNames.includes('users')) {
        const usersData = await this.getTableData('users', 1);
        dataChecks.push(`users: ${usersData.totalRows} registros`);
      }

      dataChecks.forEach(check => console.log(`   ${check}`));

      console.log('\n🎯 DIAGNÓSTICO COMPLETADO');
      console.log('Ahora puedes ver exactamente qué tiene tu base de datos');

    } catch (error) {
      console.error('❌ Error durante inspección:', error.message);
    } finally {
      await this.client.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Función de ayuda
function showHelp() {
  console.log('\n🔍 Inspector de PostgreSQL - Elite Fitness Club\n');
  console.log('Uso:');
  console.log('   node inspect-postgres.js        # Inspección completa');
  console.log('   node inspect-postgres.js --help # Mostrar ayuda\n');
  
  console.log('🔍 Este script mostrará:');
  console.log('   📋 Todas las tablas en la base de datos');
  console.log('   🏗️ Estructura completa de cada tabla crítica');
  console.log('   🔒 Constraints y relaciones');
  console.log('   📊 Datos de muestra');
  console.log('   🎯 Verificación específica de campos problemáticos\n');
  
  console.log('⚙️ Configuración:');
  console.log('   Usa variables de entorno del archivo .env');
  console.log('   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD');
}

// Ejecutar
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  const inspector = new PostgresInspector();
  await inspector.runCompleteInspection();
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Error fatal:', error.message);
    process.exit(1);
  });
}

module.exports = { PostgresInspector };