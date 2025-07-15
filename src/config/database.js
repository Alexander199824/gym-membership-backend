// src/config/database.js
const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
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
    } : false,
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  timezone: '-06:00', // Guatemala: UTC-6
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: true
  }
});

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error al conectar con la base de datos:', error.message);
    throw error;
  }
};

// Función para actualizar el archivo .env
const updateEnvFile = (key, value) => {
  try {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Crear regex para encontrar la línea específica
    const regex = new RegExp(`^${key}=.*$`, 'm');
    
    if (regex.test(envContent)) {
      // Si la línea existe, reemplazarla
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      // Si no existe, agregarla al final
      envContent += `\n${key}=${value}`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Archivo .env actualizado: ${key}=${value}`);
    return true;
  } catch (error) {
    console.error('❌ Error al actualizar archivo .env:', error.message);
    return false;
  }
};

// Función para eliminar TODAS las tablas de la base de datos
// Función para eliminar TODAS las tablas de la base de datos
const dropAllTables = async () => {
  try {
    console.log('🗑️ ELIMINANDO TODAS LAS TABLAS DE LA BASE DE DATOS...');
    
    // Obtener todas las tablas existentes
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    if (tables.length === 0) {
      console.log('✅ No hay tablas para eliminar');
      return true;
    }

    console.log(`📋 Encontradas ${tables.length} tablas para eliminar:`);
    tables.forEach(table => {
      console.log(`   📄 ${table.table_name}`);
    });

    // Verificar si tenemos permisos de superusuario
    let hasSuperuserPrivileges = false;
    try {
      await sequelize.query('SET session_replication_role = replica;');
      hasSuperuserPrivileges = true;
      await sequelize.query('SET session_replication_role = DEFAULT;');
      console.log('✅ Permisos de superusuario detectados');
    } catch (error) {
      console.log('⚠️ Sin permisos de superusuario, usando método alternativo');
    }

    // Método con permisos de superusuario
    if (hasSuperuserPrivileges) {
      console.log('🔧 Deshabilitando foreign key constraints...');
      await sequelize.query('SET session_replication_role = replica;');

      // Eliminar todas las tablas una por una
      for (const table of tables) {
        try {
          await sequelize.query(`DROP TABLE IF EXISTS "${table.table_name}" CASCADE;`);
          console.log(`   ✅ ${table.table_name} eliminada`);
        } catch (error) {
          console.log(`   ⚠️ Error al eliminar ${table.table_name}: ${error.message.split('\n')[0]}`);
        }
      }

      // Rehabilitar foreign key checks
      await sequelize.query('SET session_replication_role = DEFAULT;');
    } else {
      // Método alternativo sin permisos de superusuario
      console.log('🔄 Eliminando tablas en múltiples pasadas...');
      
      let remainingTables = [...tables];
      let attempt = 0;
      const maxAttempts = 10;

      while (remainingTables.length > 0 && attempt < maxAttempts) {
        attempt++;
        console.log(`🔄 Pasada ${attempt}/${maxAttempts}...`);
        
        const initialCount = remainingTables.length;
        
        // Intentar eliminar cada tabla
        for (let i = remainingTables.length - 1; i >= 0; i--) {
          const table = remainingTables[i];
          try {
            await sequelize.query(`DROP TABLE IF EXISTS "${table.table_name}" CASCADE;`);
            console.log(`   ✅ ${table.table_name} eliminada`);
            remainingTables.splice(i, 1);
          } catch (error) {
            if (error.message.includes('violates foreign key constraint') || 
                error.message.includes('depends on')) {
              console.log(`   ⏳ ${table.table_name} pendiente (dependencias)`);
            } else {
              console.log(`   ⚠️ ${table.table_name}: ${error.message.split('\n')[0]}`);
              // Remover de la lista para evitar bucle infinito
              remainingTables.splice(i, 1);
            }
          }
        }
        
        // Si no se eliminó ninguna tabla en esta pasada, intentar forzar
        if (remainingTables.length === initialCount && remainingTables.length > 0) {
          console.log(`🔧 Forzando eliminación de ${remainingTables.length} tablas restantes...`);
          
          for (let i = remainingTables.length - 1; i >= 0; i--) {
            const table = remainingTables[i];
            try {
              // Primero intentar eliminar foreign keys específicos
              const [constraints] = await sequelize.query(`
                SELECT constraint_name 
                FROM information_schema.table_constraints 
                WHERE table_name = '${table.table_name}' 
                AND constraint_type = 'FOREIGN KEY';
              `);

              for (const constraint of constraints) {
                try {
                  await sequelize.query(`
                    ALTER TABLE "${table.table_name}" 
                    DROP CONSTRAINT IF EXISTS "${constraint.constraint_name}" CASCADE;
                  `);
                } catch (e) {
                  // Ignorar errores al eliminar constraints
                }
              }

              // Ahora intentar eliminar la tabla
              await sequelize.query(`DROP TABLE IF EXISTS "${table.table_name}" CASCADE;`);
              console.log(`   ✅ ${table.table_name} eliminada (forzado)`);
              remainingTables.splice(i, 1);
            } catch (error) {
              console.log(`   ❌ ${table.table_name}: No se pudo eliminar`);
              remainingTables.splice(i, 1); // Remover para evitar bucle infinito
            }
          }
          break; // Salir del bucle while
        }
      }

      if (remainingTables.length > 0) {
        console.log(`⚠️ ${remainingTables.length} tablas no se pudieron eliminar:`);
        remainingTables.forEach(table => {
          console.log(`   📄 ${table.table_name}`);
        });
      }
    }

    // Eliminar todos los tipos ENUM personalizados
    console.log('🔧 Eliminando tipos ENUM personalizados...');
    const [enumTypes] = await sequelize.query(`
      SELECT t.typname 
      FROM pg_type t 
      JOIN pg_namespace n ON n.oid = t.typnamespace 
      WHERE n.nspname = 'public' 
      AND t.typtype = 'e';
    `);

    for (const enumType of enumTypes) {
      try {
        await sequelize.query(`DROP TYPE IF EXISTS "${enumType.typname}" CASCADE;`);
        console.log(`   ✅ Tipo ENUM ${enumType.typname} eliminado`);
      } catch (error) {
        // Ignorar errores de tipos que no se pueden eliminar
      }
    }

    // Eliminar todas las secuencias huérfanas
    console.log('🧹 Eliminando secuencias huérfanas...');
    const [sequences] = await sequelize.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public';
    `);

    for (const sequence of sequences) {
      try {
        await sequelize.query(`DROP SEQUENCE IF EXISTS "${sequence.sequence_name}" CASCADE;`);
        console.log(`   ✅ Secuencia ${sequence.sequence_name} eliminada`);
      } catch (error) {
        // Ignorar errores
      }
    }

    // Verificar estado final
    const [finalCheck] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);

    const finalCount = parseInt(finalCheck[0].count);
    
    if (finalCount === 0) {
      console.log('✅ TODAS LAS TABLAS Y OBJETOS ELIMINADOS EXITOSAMENTE');
      return true;
    } else {
      console.log(`⚠️ ${finalCount} tablas no se pudieron eliminar completamente`);
      
      // Mostrar las tablas que quedaron
      const [remainingTablesCheck] = await sequelize.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
      `);
      
      console.log('📋 Tablas restantes:');
      remainingTablesCheck.forEach(table => {
        console.log(`   📄 ${table.table_name}`);
      });
      
      return true; // Continuar de todas formas
    }

  } catch (error) {
    console.error('❌ Error al eliminar todas las tablas:', error.message);
    throw error;
  }
};

// Initialize database with option to reset
const initializeDatabase = async (reset = false) => {
  try {
    // Determinar si hacer reset basado en variable de entorno
    const shouldReset = reset || process.env.RESET_DATABASE === 'true';
    
    if (shouldReset) {
      console.log('🚨 RESET_DATABASE=true detectado');
      console.log('🔄 Iniciando limpieza completa de la base de datos...');
      
      // Eliminar TODAS las tablas existentes
      await dropAllTables();
      
      // Automáticamente cambiar RESET_DATABASE a false
      console.log('🔄 Cambiando RESET_DATABASE a false automáticamente...');
      const envUpdated = updateEnvFile('RESET_DATABASE', 'false');
      
      if (envUpdated) {
        console.log('✅ Variable RESET_DATABASE cambiada a false');
        console.log('💡 En el próximo reinicio no se eliminará la base de datos');
      } else {
        console.log('⚠️ No se pudo actualizar el archivo .env automáticamente');
        console.log('💡 Cambia manualmente RESET_DATABASE=false en tu .env');
      }
    }

    // Sincronizar modelos (crear tablas nuevas)
    console.log('🔄 Creando tablas del sistema de gimnasio...');
    await sequelize.sync({ force: shouldReset });
    console.log('✅ Base de datos inicializada correctamente');
    
    return true;
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error.message);
    
    // Si hay error en el reset, intentar sincronización simple
    if (error.message.includes('DROP') || error.message.includes('CASCADE')) {
      console.log('⚠️ Intentando sincronización simple...');
      try {
        await sequelize.sync({ alter: true });
        console.log('✅ Sincronización simple exitosa');
        return true;
      } catch (syncError) {
        console.error('❌ Error en sincronización simple:', syncError.message);
        throw syncError;
      }
    }
    
    throw error;
  }
};

// Función para verificar el estado de la base de datos
const getDatabaseStatus = async () => {
  try {
    const [tables] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE';
    `);

    const tableCount = parseInt(tables[0].count);
    
    const [gymTables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'memberships', 'payments', 'daily_incomes', 'notifications');
    `);

    return {
      totalTables: tableCount,
      gymTables: gymTables.length,
      hasGymTables: gymTables.length > 0,
      isEmpty: tableCount === 0
    };
  } catch (error) {
    console.error('Error al verificar estado de BD:', error.message);
    return { totalTables: -1, gymTables: -1, hasGymTables: false, isEmpty: false };
  }
};

// Función de limpieza para cerrar conexiones
const closeConnection = async () => {
  try {
    await sequelize.close();
    console.log('✅ Conexión a base de datos cerrada');
  } catch (error) {
    console.error('❌ Error al cerrar conexión:', error.message);
  }
};

module.exports = {
  sequelize,
  testConnection,
  initializeDatabase,
  dropAllTables,
  getDatabaseStatus,
  closeConnection
};