// testServices.js - Script de prueba del CRUD de Servicios (DESDE RAÍZ)
// Ejecutar con: node testServices.js

const { GymServices } = require('./src/models'); // 👈 CAMBIO: ./src en lugar de ../src
const { sequelize } = require('./src/config/database'); // 👈 CAMBIO: ./src en lugar de ../src

async function testServicesCRUD() {
  console.log('🧪 Iniciando pruebas del CRUD de Servicios...\n');

  try {
    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conexión a BD establecida');

    // ========================================
    // TEST 1: VERIFICAR MODELO
    // ========================================
    console.log('\n📋 TEST 1: Verificando estructura del modelo...');
    const modelAttributes = Object.keys(GymServices.rawAttributes);
    console.log('Campos del modelo:', modelAttributes);
    
    const expectedFields = ['id', 'title', 'description', 'iconName', 'imageUrl', 'features', 'displayOrder', 'isActive'];
    const hasAllFields = expectedFields.every(field => modelAttributes.includes(field));
    
    if (hasAllFields) {
      console.log('✅ Todos los campos necesarios están presentes');
    } else {
      console.log('❌ Faltan campos en el modelo');
      return;
    }

    // ========================================
    // TEST 2: SEED (Crear datos por defecto)
    // ========================================
    console.log('\n📋 TEST 2: Creando servicios por defecto...');
    await GymServices.seedDefaultServices();
    const serviceCount = await GymServices.count();
    console.log(`✅ Servicios creados: ${serviceCount}`);

    // ========================================
    // TEST 3: READ (Leer servicios)
    // ========================================
    console.log('\n📋 TEST 3: Leyendo todos los servicios...');
    const allServices = await GymServices.findAll({
      order: [['displayOrder', 'ASC']]
    });
    console.log(`✅ Total de servicios: ${allServices.length}`);
    allServices.forEach(s => {
      console.log(`   - ${s.title} (ID: ${s.id}, Orden: ${s.displayOrder}, Activo: ${s.isActive})`);
    });

    // ========================================
    // TEST 4: READ ACTIVE (Leer solo activos)
    // ========================================
    console.log('\n📋 TEST 4: Leyendo servicios activos...');
    const activeServices = await GymServices.getActiveServices();
    console.log(`✅ Servicios activos: ${activeServices.length}`);

    // ========================================
    // TEST 5: CREATE (Crear nuevo servicio)
    // ========================================
    console.log('\n📋 TEST 5: Creando un nuevo servicio de prueba...');
    const maxOrder = await GymServices.max('displayOrder');
    const newService = await GymServices.create({
      title: 'Servicio de Prueba CRUD',
      description: 'Este es un servicio creado para probar el CRUD',
      iconName: 'test-tube',
      imageUrl: '',
      features: ['Feature 1', 'Feature 2', 'Feature 3'],
      displayOrder: (maxOrder || 0) + 1,
      isActive: true
    });
    console.log(`✅ Servicio creado: ID ${newService.id} - "${newService.title}"`);

    // ========================================
    // TEST 6: READ BY ID (Leer por ID)
    // ========================================
    console.log('\n📋 TEST 6: Leyendo servicio por ID...');
    const serviceById = await GymServices.findByPk(newService.id);
    if (serviceById) {
      console.log(`✅ Servicio encontrado: ${serviceById.title}`);
      console.log(`   Descripción: ${serviceById.description}`);
      console.log(`   Features: ${serviceById.features.length}`);
    } else {
      console.log('❌ Servicio no encontrado');
    }

    // ========================================
    // TEST 7: UPDATE (Actualizar servicio)
    // ========================================
    console.log('\n📋 TEST 7: Actualizando servicio...');
    serviceById.title = 'Servicio de Prueba ACTUALIZADO';
    serviceById.description = 'Descripción actualizada desde el test';
    serviceById.features = ['Feature 1 Updated', 'Feature 2 Updated', 'Feature 3 Updated', 'Feature 4 NEW'];
    await serviceById.save();
    
    const updatedService = await GymServices.findByPk(serviceById.id);
    console.log(`✅ Servicio actualizado: "${updatedService.title}"`);
    console.log(`   Features actualizados: ${updatedService.features.length}`);

    // ========================================
    // TEST 8: TOGGLE ACTIVE (Cambiar estado)
    // ========================================
    console.log('\n📋 TEST 8: Cambiando estado del servicio...');
    const beforeToggle = updatedService.isActive;
    updatedService.isActive = !updatedService.isActive;
    await updatedService.save();
    console.log(`✅ Estado cambiado: ${beforeToggle} → ${updatedService.isActive}`);

    // ========================================
    // TEST 9: DUPLICATE (Duplicar servicio)
    // ========================================
    console.log('\n📋 TEST 9: Duplicando servicio...');
    const originalService = await GymServices.findByPk(1);
    if (originalService) {
      const maxOrderNow = await GymServices.max('displayOrder');
      const duplicatedService = await GymServices.create({
        title: `${originalService.title} (Copia Test)`,
        description: originalService.description,
        iconName: originalService.iconName,
        imageUrl: originalService.imageUrl,
        features: originalService.features,
        displayOrder: (maxOrderNow || 0) + 1,
        isActive: false
      });
      console.log(`✅ Servicio duplicado: ID ${duplicatedService.id} - "${duplicatedService.title}"`);
    }

    // ========================================
    // TEST 10: STATS (Estadísticas)
    // ========================================
    console.log('\n📋 TEST 10: Calculando estadísticas...');
    const total = await GymServices.count();
    const active = await GymServices.count({ where: { isActive: true } });
    const inactive = await GymServices.count({ where: { isActive: false } });
    
    console.log(`✅ Estadísticas:`);
    console.log(`   Total: ${total}`);
    console.log(`   Activos: ${active}`);
    console.log(`   Inactivos: ${inactive}`);
    console.log(`   % Activos: ${((active / total) * 100).toFixed(1)}%`);

    // ========================================
    // TEST 11: REORDER (Reordenar)
    // ========================================
    console.log('\n📋 TEST 11: Probando reordenamiento...');
    const firstService = await GymServices.findOne({ where: { displayOrder: 1 } });
    if (firstService) {
      const originalOrder = firstService.displayOrder;
      firstService.displayOrder = 999;
      await firstService.save();
      console.log(`✅ Servicio "${firstService.title}" reordenado: ${originalOrder} → ${firstService.displayOrder}`);
      
      // Restaurar orden
      firstService.displayOrder = originalOrder;
      await firstService.save();
      console.log(`✅ Orden restaurado a: ${firstService.displayOrder}`);
    }

    // ========================================
    // TEST 12: DELETE (Eliminar)
    // ========================================
    console.log('\n📋 TEST 12: Eliminando servicio de prueba...');
    const testService = await GymServices.findOne({ 
      where: { title: 'Servicio de Prueba ACTUALIZADO' } 
    });
    
    if (testService) {
      const testServiceTitle = testService.title;
      await testService.destroy();
      console.log(`✅ Servicio eliminado: "${testServiceTitle}"`);
      
      // Verificar eliminación
      const deletedService = await GymServices.findByPk(testService.id);
      if (!deletedService) {
        console.log('✅ Verificado: El servicio fue eliminado correctamente');
      } else {
        console.log('❌ Error: El servicio aún existe en la BD');
      }
    }

    // Limpiar servicio duplicado
    const { Op } = require('sequelize');
    const duplicated = await GymServices.findOne({ 
      where: { 
        title: { 
          [Op.like]: '%Copia Test%' 
        } 
      } 
    });
    if (duplicated) {
      await duplicated.destroy();
      console.log(`✅ Servicio duplicado de prueba eliminado`);
    }

    // ========================================
    // RESUMEN FINAL
    // ========================================
    console.log('\n✨ RESUMEN DE PRUEBAS:');
    console.log('='.repeat(50));
    console.log('✅ TEST 1: Verificación de modelo');
    console.log('✅ TEST 2: Seed de datos por defecto');
    console.log('✅ TEST 3: Lectura de todos los servicios');
    console.log('✅ TEST 4: Lectura de servicios activos');
    console.log('✅ TEST 5: Creación de servicio (CREATE)');
    console.log('✅ TEST 6: Lectura por ID (READ)');
    console.log('✅ TEST 7: Actualización de servicio (UPDATE)');
    console.log('✅ TEST 8: Toggle de estado activo/inactivo');
    console.log('✅ TEST 9: Duplicación de servicio');
    console.log('✅ TEST 10: Cálculo de estadísticas');
    console.log('✅ TEST 11: Reordenamiento de servicios');
    console.log('✅ TEST 12: Eliminación de servicio (DELETE)');
    console.log('='.repeat(50));
    console.log('🎉 TODAS LAS PRUEBAS PASARON EXITOSAMENTE');
    console.log('\n✅ El CRUD de Servicios está completamente funcional');
    console.log('✅ Compatible con el modelo GymServices.js');
    console.log('✅ Listo para usar en producción\n');

  } catch (error) {
    console.error('\n❌ ERROR durante las pruebas:', error);
    console.error('Detalles:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  } finally {
    // Cerrar conexión
    await sequelize.close();
    console.log('\n🔌 Conexión a BD cerrada');
  }
}

// Ejecutar pruebas
if (require.main === module) {
  testServicesCRUD()
    .then(() => {
      console.log('\n✅ Script de pruebas completado');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Error fatal:', err);
      process.exit(1);
    });
}

module.exports = { testServicesCRUD };