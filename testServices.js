// testServicesInteractive.js - Pruebas interactivas del CRUD de Servicios
// Ejecutar con: node testServicesInteractive.js

const readline = require('readline');
const { GymServices } = require('./src/models');
const { sequelize } = require('./src/config/database');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function clearScreen() {
  console.clear();
}

function showHeader(title) {
  console.log('\n' + colors.bright + colors.cyan + '='.repeat(60) + colors.reset);
  console.log(colors.bright + colors.cyan + `  ${title}` + colors.reset);
  console.log(colors.bright + colors.cyan + '='.repeat(60) + colors.reset + '\n');
}

async function showMenu() {
  clearScreen();
  showHeader('🎯 CRUD DE SERVICIOS - MENU INTERACTIVO');
  
  console.log(colors.blue + '📋 CONSULTAR:' + colors.reset);
  console.log('  1. Ver todos los servicios');
  console.log('  2. Ver solo servicios activos');
  console.log('  3. Buscar servicio por ID');
  console.log('  4. Ver estadísticas');
  
  console.log('\n' + colors.green + '➕ CREAR:' + colors.reset);
  console.log('  5. Crear nuevo servicio');
  console.log('  6. Crear servicios por defecto (seed)');
  
  console.log('\n' + colors.yellow + '✏️  EDITAR:' + colors.reset);
  console.log('  7. Actualizar servicio');
  console.log('  8. Cambiar estado (Activar/Desactivar)');
  console.log('  9. Reordenar servicios');
  
  console.log('\n' + colors.magenta + '📋 OTRAS OPERACIONES:' + colors.reset);
  console.log('  10. Duplicar servicio');
  
  console.log('\n' + colors.red + '🗑️  ELIMINAR:' + colors.reset);
  console.log('  11. Eliminar servicio');
  
  console.log('\n' + colors.cyan + '⚙️  SISTEMA:' + colors.reset);
  console.log('  12. Verificar conexión a BD');
  console.log('  0. Salir');
  
  console.log('\n' + '─'.repeat(60));
  const choice = await question(colors.bright + 'Selecciona una opción: ' + colors.reset);
  return choice;
}

// ============================================================
// 1. VER TODOS LOS SERVICIOS
// ============================================================
async function viewAllServices() {
  showHeader('📋 TODOS LOS SERVICIOS');
  
  try {
    const services = await GymServices.findAll({
      order: [['displayOrder', 'ASC']]
    });
    
    if (services.length === 0) {
      console.log(colors.yellow + '⚠️  No hay servicios en la base de datos' + colors.reset);
      console.log('💡 Usa la opción 6 para crear servicios por defecto\n');
    } else {
      console.log(`Total: ${colors.bright}${services.length}${colors.reset} servicios\n`);
      
      services.forEach((service, index) => {
        const statusColor = service.isActive ? colors.green : colors.red;
        const status = service.isActive ? '✅ ACTIVO' : '❌ INACTIVO';
        
        console.log(colors.bright + `${index + 1}. ${service.title}` + colors.reset);
        console.log(`   ID: ${service.id} | Orden: ${service.displayOrder} | ${statusColor}${status}${colors.reset}`);
        console.log(`   ${colors.cyan}${service.description}${colors.reset}`);
        console.log(`   Icono: ${service.iconName} | Features: ${service.features.length}`);
        console.log('');
      });
    }
  } catch (error) {
    console.log(colors.red + '❌ Error al obtener servicios: ' + error.message + colors.reset);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 2. VER SERVICIOS ACTIVOS
// ============================================================
async function viewActiveServices() {
  showHeader('✅ SERVICIOS ACTIVOS');
  
  try {
    const services = await GymServices.getActiveServices();
    
    if (services.length === 0) {
      console.log(colors.yellow + '⚠️  No hay servicios activos' + colors.reset + '\n');
    } else {
      console.log(`Total: ${colors.bright}${services.length}${colors.reset} servicios activos\n`);
      
      services.forEach((service, index) => {
        console.log(colors.bright + colors.green + `${index + 1}. ${service.title}` + colors.reset);
        console.log(`   ID: ${service.id} | Orden: ${service.displayOrder}`);
        console.log(`   ${colors.cyan}${service.description}${colors.reset}`);
        console.log(`   Features: ${service.features.join(', ')}`);
        console.log('');
      });
    }
  } catch (error) {
    console.log(colors.red + '❌ Error: ' + error.message + colors.reset);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 3. BUSCAR POR ID
// ============================================================
async function findServiceById() {
  showHeader('🔍 BUSCAR SERVICIO POR ID');
  
  const id = await question('Ingresa el ID del servicio: ');
  
  if (!id || isNaN(id)) {
    console.log(colors.red + '❌ ID inválido' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    const service = await GymServices.findByPk(id);
    
    if (!service) {
      console.log(colors.red + `❌ No se encontró servicio con ID: ${id}` + colors.reset);
    } else {
      const statusColor = service.isActive ? colors.green : colors.red;
      const status = service.isActive ? '✅ ACTIVO' : '❌ INACTIVO';
      
      console.log('\n' + colors.bright + service.title + colors.reset);
      console.log('─'.repeat(50));
      console.log(`ID: ${service.id}`);
      console.log(`Descripción: ${colors.cyan}${service.description}${colors.reset}`);
      console.log(`Icono: ${service.iconName}`);
      console.log(`Imagen URL: ${service.imageUrl || '(sin imagen)'}`);
      console.log(`Orden: ${service.displayOrder}`);
      console.log(`Estado: ${statusColor}${status}${colors.reset}`);
      console.log(`\nCaracterísticas (${service.features.length}):`);
      service.features.forEach((feat, i) => {
        console.log(`  ${i + 1}. ${feat}`);
      });
      console.log(`\nCreado: ${service.createdAt}`);
      console.log(`Actualizado: ${service.updatedAt}`);
    }
  } catch (error) {
    console.log(colors.red + '❌ Error: ' + error.message + colors.reset);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 4. VER ESTADÍSTICAS
// ============================================================
async function viewStats() {
  showHeader('📊 ESTADÍSTICAS DE SERVICIOS');
  
  try {
    const total = await GymServices.count();
    const active = await GymServices.count({ where: { isActive: true } });
    const inactive = await GymServices.count({ where: { isActive: false } });
    const percentage = total > 0 ? ((active / total) * 100).toFixed(1) : 0;
    
    console.log(`Total de servicios: ${colors.bright}${total}${colors.reset}`);
    console.log(`Activos: ${colors.green}${active}${colors.reset}`);
    console.log(`Inactivos: ${colors.red}${inactive}${colors.reset}`);
    console.log(`Porcentaje activo: ${colors.yellow}${percentage}%${colors.reset}`);
    
    // Servicios con más features
    const services = await GymServices.findAll();
    if (services.length > 0) {
      const avgFeatures = services.reduce((acc, s) => acc + (s.features?.length || 0), 0) / services.length;
      const withImages = services.filter(s => s.imageUrl).length;
      const withoutImages = services.filter(s => !s.imageUrl).length;
      
      console.log(`\nPromedio de características: ${colors.cyan}${avgFeatures.toFixed(1)}${colors.reset}`);
      console.log(`Con imágenes: ${colors.blue}${withImages}${colors.reset}`);
      console.log(`Sin imágenes: ${colors.yellow}${withoutImages}${colors.reset}`);
      
      // Top 3 servicios con más features
      const topServices = services
        .sort((a, b) => (b.features?.length || 0) - (a.features?.length || 0))
        .slice(0, 3);
      
      console.log(`\n${colors.bright}Top 3 servicios con más características:${colors.reset}`);
      topServices.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.title}: ${s.features.length} características`);
      });
    }
  } catch (error) {
    console.log(colors.red + '❌ Error: ' + error.message + colors.reset);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 5. CREAR NUEVO SERVICIO
// ============================================================
async function createService() {
  showHeader('➕ CREAR NUEVO SERVICIO');
  
  console.log('Ingresa los datos del nuevo servicio:\n');
  
  const title = await question('Título: ');
  if (!title) {
    console.log(colors.red + '❌ El título es obligatorio' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  const description = await question('Descripción: ');
  const iconName = await question('Nombre del icono (ej: dumbbell): ') || 'dumbbell';
  const imageUrl = await question('URL de imagen (opcional): ');
  
  // Features
  console.log('\n📝 Características (escribe "fin" para terminar):');
  const features = [];
  let featureIndex = 1;
  while (true) {
    const feature = await question(`  ${featureIndex}. `);
    if (!feature || feature.toLowerCase() === 'fin') break;
    features.push(feature);
    featureIndex++;
  }
  
  const isActiveInput = await question('\n¿Servicio activo? (s/n, default: s): ');
  const isActive = !isActiveInput || isActiveInput.toLowerCase() !== 'n';
  
  try {
    const maxOrder = await GymServices.max('displayOrder');
    const newService = await GymServices.create({
      title,
      description,
      iconName,
      imageUrl,
      features,
      displayOrder: (maxOrder || 0) + 1,
      isActive
    });
    
    console.log('\n' + colors.green + '✅ Servicio creado exitosamente!' + colors.reset);
    console.log(`ID: ${newService.id}`);
    console.log(`Título: ${newService.title}`);
    console.log(`Orden: ${newService.displayOrder}`);
    console.log(`Estado: ${newService.isActive ? 'Activo' : 'Inactivo'}`);
  } catch (error) {
    console.log(colors.red + '❌ Error al crear servicio: ' + error.message + colors.reset);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 6. SEED (Crear servicios por defecto)
// ============================================================
async function seedDefaultServices() {
  showHeader('🌱 CREAR SERVICIOS POR DEFECTO');
  
  const confirm = await question('¿Crear servicios por defecto? (s/n): ');
  if (confirm.toLowerCase() !== 's') {
    console.log('Operación cancelada');
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    await GymServices.seedDefaultServices();
    const count = await GymServices.count();
    
    console.log('\n' + colors.green + '✅ Servicios por defecto creados!' + colors.reset);
    console.log(`Total de servicios en BD: ${count}`);
  } catch (error) {
    console.log(colors.red + '❌ Error: ' + error.message + colors.reset);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 7. ACTUALIZAR SERVICIO
// ============================================================
async function updateService() {
  showHeader('✏️  ACTUALIZAR SERVICIO');
  
  // Mostrar servicios disponibles
  const services = await GymServices.findAll({ order: [['displayOrder', 'ASC']] });
  console.log('Servicios disponibles:\n');
  services.forEach(s => {
    console.log(`  ${colors.cyan}${s.id}${colors.reset}. ${s.title}`);
  });
  
  const id = await question('\nIngresa el ID del servicio a actualizar: ');
  
  if (!id || isNaN(id)) {
    console.log(colors.red + '❌ ID inválido' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    const service = await GymServices.findByPk(id);
    
    if (!service) {
      console.log(colors.red + `❌ No se encontró servicio con ID: ${id}` + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    console.log(`\n${colors.bright}Servicio actual: ${service.title}${colors.reset}`);
    console.log('(Deja en blanco para mantener el valor actual)\n');
    
    const title = await question(`Título [${service.title}]: `);
    const description = await question(`Descripción [${service.description}]: `);
    const iconName = await question(`Icono [${service.iconName}]: `);
    const imageUrl = await question(`URL imagen [${service.imageUrl || 'sin imagen'}]: `);
    
    // Actualizar features
    console.log('\n¿Actualizar características? (s/n): ');
    const updateFeatures = await question('');
    let features = service.features;
    
    if (updateFeatures.toLowerCase() === 's') {
      features = [];
      console.log('Características (escribe "fin" para terminar):');
      let featureIndex = 1;
      while (true) {
        const feature = await question(`  ${featureIndex}. `);
        if (!feature || feature.toLowerCase() === 'fin') break;
        features.push(feature);
        featureIndex++;
      }
    }
    
    // Aplicar cambios
    if (title) service.title = title;
    if (description) service.description = description;
    if (iconName) service.iconName = iconName;
    if (imageUrl !== undefined) service.imageUrl = imageUrl;
    service.features = features;
    
    await service.save();
    
    console.log('\n' + colors.green + '✅ Servicio actualizado exitosamente!' + colors.reset);
  } catch (error) {
    console.log(colors.red + '❌ Error: ' + error.message + colors.reset);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 8. CAMBIAR ESTADO (TOGGLE)
// ============================================================
async function toggleServiceStatus() {
  showHeader('🔄 CAMBIAR ESTADO DE SERVICIO');
  
  // Mostrar servicios
  const services = await GymServices.findAll({ order: [['displayOrder', 'ASC']] });
  console.log('Servicios disponibles:\n');
  services.forEach(s => {
    const statusIcon = s.isActive ? '✅' : '❌';
    const statusText = s.isActive ? colors.green + 'ACTIVO' : colors.red + 'INACTIVO';
    console.log(`  ${colors.cyan}${s.id}${colors.reset}. ${s.title} - ${statusIcon} ${statusText}${colors.reset}`);
  });
  
  const id = await question('\nIngresa el ID del servicio: ');
  
  if (!id || isNaN(id)) {
    console.log(colors.red + '❌ ID inválido' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    const service = await GymServices.findByPk(id);
    
    if (!service) {
      console.log(colors.red + `❌ No se encontró servicio con ID: ${id}` + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const oldStatus = service.isActive;
    service.isActive = !service.isActive;
    await service.save();
    
    const newStatusText = service.isActive ? colors.green + 'ACTIVADO' : colors.red + 'DESACTIVADO';
    console.log(`\n${colors.green}✅ Servicio "${service.title}" ${newStatusText}${colors.reset}`);
    console.log(`Estado anterior: ${oldStatus ? 'Activo' : 'Inactivo'}`);
    console.log(`Estado nuevo: ${service.isActive ? 'Activo' : 'Inactivo'}`);
  } catch (error) {
    console.log(colors.red + '❌ Error: ' + error.message + colors.reset);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 9. REORDENAR SERVICIOS
// ============================================================
async function reorderServices() {
  showHeader('🔢 REORDENAR SERVICIOS');
  
  const services = await GymServices.findAll({ order: [['displayOrder', 'ASC']] });
  
  console.log('Orden actual:\n');
  services.forEach((s, index) => {
    console.log(`  ${colors.cyan}${index + 1}${colors.reset}. ${s.title} (Orden: ${s.displayOrder})`);
  });
  
  const id = await question('\nIngresa el ID del servicio a reordenar: ');
  
  if (!id || isNaN(id)) {
    console.log(colors.red + '❌ ID inválido' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  const newOrder = await question('Nuevo número de orden: ');
  
  if (!newOrder || isNaN(newOrder)) {
    console.log(colors.red + '❌ Orden inválido' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    const service = await GymServices.findByPk(id);
    
    if (!service) {
      console.log(colors.red + `❌ No se encontró servicio con ID: ${id}` + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const oldOrder = service.displayOrder;
    service.displayOrder = parseInt(newOrder);
    await service.save();
    
    console.log(`\n${colors.green}✅ Servicio reordenado!${colors.reset}`);
    console.log(`"${service.title}": ${oldOrder} → ${service.displayOrder}`);
  } catch (error) {
    console.log(colors.red + '❌ Error: ' + error.message + colors.reset);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 10. DUPLICAR SERVICIO
// ============================================================
async function duplicateService() {
  showHeader('📋 DUPLICAR SERVICIO');
  
  const services = await GymServices.findAll({ order: [['displayOrder', 'ASC']] });
  console.log('Servicios disponibles:\n');
  services.forEach(s => {
    console.log(`  ${colors.cyan}${s.id}${colors.reset}. ${s.title}`);
  });
  
  const id = await question('\nIngresa el ID del servicio a duplicar: ');
  
  if (!id || isNaN(id)) {
    console.log(colors.red + '❌ ID inválido' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    const originalService = await GymServices.findByPk(id);
    
    if (!originalService) {
      console.log(colors.red + `❌ No se encontró servicio con ID: ${id}` + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    // Crear título único
    let newTitle = `${originalService.title} (Copia)`;
    let counter = 1;
    
    while (await GymServices.findOne({ where: { title: newTitle } })) {
      counter++;
      newTitle = `${originalService.title} (Copia ${counter})`;
    }
    
    const maxOrder = await GymServices.max('displayOrder');
    
    const duplicatedService = await GymServices.create({
      title: newTitle,
      description: originalService.description,
      iconName: originalService.iconName,
      imageUrl: originalService.imageUrl,
      features: originalService.features,
      displayOrder: (maxOrder || 0) + 1,
      isActive: false // Crear desactivado por seguridad
    });
    
    console.log(`\n${colors.green}✅ Servicio duplicado exitosamente!${colors.reset}`);
    console.log(`Nuevo ID: ${duplicatedService.id}`);
    console.log(`Título: ${duplicatedService.title}`);
    console.log(`${colors.yellow}⚠️  Estado: INACTIVO (actívalo manualmente)${colors.reset}`);
  } catch (error) {
    console.log(colors.red + '❌ Error: ' + error.message + colors.reset);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 11. ELIMINAR SERVICIO
// ============================================================
async function deleteService() {
  showHeader('🗑️  ELIMINAR SERVICIO');
  
  const services = await GymServices.findAll({ order: [['displayOrder', 'ASC']] });
  console.log('Servicios disponibles:\n');
  services.forEach(s => {
    console.log(`  ${colors.cyan}${s.id}${colors.reset}. ${s.title}`);
  });
  
  const id = await question('\nIngresa el ID del servicio a ELIMINAR: ');
  
  if (!id || isNaN(id)) {
    console.log(colors.red + '❌ ID inválido' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    const service = await GymServices.findByPk(id);
    
    if (!service) {
      console.log(colors.red + `❌ No se encontró servicio con ID: ${id}` + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    console.log(`\n${colors.red}⚠️  ADVERTENCIA: Vas a eliminar permanentemente:${colors.reset}`);
    console.log(`"${service.title}"`);
    
    const confirm = await question(`\n¿Confirmar eliminación? Escribe "${service.title}" para confirmar: `);
    
    if (confirm !== service.title) {
      console.log(colors.yellow + 'Eliminación cancelada' + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const serviceName = service.title;
    await service.destroy();
    
    console.log(`\n${colors.green}✅ Servicio "${serviceName}" eliminado exitosamente${colors.reset}`);
    
    // Verificar eliminación
    const deleted = await GymServices.findByPk(id);
    if (!deleted) {
      console.log(colors.green + '✅ Verificado: El servicio ya no existe en la BD' + colors.reset);
    }
  } catch (error) {
    console.log(colors.red + '❌ Error: ' + error.message + colors.reset);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 12. VERIFICAR CONEXIÓN
// ============================================================
async function checkConnection() {
  showHeader('🔌 VERIFICAR CONEXIÓN A BASE DE DATOS');
  
  try {
    await sequelize.authenticate();
    console.log(colors.green + '✅ Conexión a base de datos exitosa' + colors.reset);
    
    const dialect = sequelize.getDialect();
    const database = sequelize.config.database;
    const host = sequelize.config.host;
    
    console.log(`\nMotor: ${colors.cyan}${dialect}${colors.reset}`);
    console.log(`Base de datos: ${colors.cyan}${database}${colors.reset}`);
    console.log(`Host: ${colors.cyan}${host}${colors.reset}`);
    
    const serviceCount = await GymServices.count();
    console.log(`\nTotal de servicios: ${colors.bright}${serviceCount}${colors.reset}`);
  } catch (error) {
    console.log(colors.red + '❌ Error de conexión: ' + error.message + colors.reset);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// MAIN LOOP
// ============================================================
async function main() {
  try {
    // Conectar a BD
    await sequelize.authenticate();
    
    while (true) {
      const choice = await showMenu();
      
      switch (choice) {
        case '1':
          await viewAllServices();
          break;
        case '2':
          await viewActiveServices();
          break;
        case '3':
          await findServiceById();
          break;
        case '4':
          await viewStats();
          break;
        case '5':
          await createService();
          break;
        case '6':
          await seedDefaultServices();
          break;
        case '7':
          await updateService();
          break;
        case '8':
          await toggleServiceStatus();
          break;
        case '9':
          await reorderServices();
          break;
        case '10':
          await duplicateService();
          break;
        case '11':
          await deleteService();
          break;
        case '12':
          await checkConnection();
          break;
        case '0':
          console.log('\n' + colors.bright + '👋 ¡Hasta luego!' + colors.reset + '\n');
          rl.close();
          await sequelize.close();
          process.exit(0);
          break;
        default:
          console.log(colors.red + '❌ Opción inválida' + colors.reset);
          await question('\nPresiona Enter para continuar...');
      }
    }
  } catch (error) {
    console.error(colors.red + '❌ Error fatal: ' + error.message + colors.reset);
    rl.close();
    await sequelize.close();
    process.exit(1);
  }
}

// Ejecutar
if (require.main === module) {
  console.log(colors.bright + colors.cyan + '\n🎯 Iniciando sistema de pruebas interactivo...\n' + colors.reset);
  main();
}

module.exports = { main };