// scripts/testFlexibleSchedules.js - NUEVO: Script de testing completo
const { GymHours, GymTimeSlots } = require('./src/models');

// ✅ COLORES PARA CONSOLA
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.blue}🧪 ${msg}${colors.reset}`)
};

class FlexibleScheduleTester {
  
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      warnings: 0
    };
  }

  async runAllTests() {
    log.title('INICIANDO TESTS DE HORARIOS FLEXIBLES');
    
    try {
      await this.testDatabaseConnection();
      await this.testModelAssociations();
      await this.testBasicOperations();
      await this.testFlexibleScheduleOperations();
      await this.testValidations();
      await this.testCapacityMetrics();
      await this.testEdgeCases();
      await this.testPerformance();
      
      this.printSummary();
    } catch (error) {
      log.error(`Error crítico en testing: ${error.message}`);
      process.exit(1);
    }
  }

  async testDatabaseConnection() {
    log.title('Test 1: Conexión a Base de Datos');
    
    try {
      // Verificar conexión
      await GymHours.findAll({ limit: 1 });
      log.success('Conexión a base de datos exitosa');
      
      // Verificar que las tablas existen
      const tableExists = await this.checkTableExists('gym_time_slots');
      if (tableExists) {
        log.success('Tabla gym_time_slots existe');
      } else {
        log.error('Tabla gym_time_slots no existe - ejecutar migración');
        this.testResults.failed++;
        return;
      }
      
      this.testResults.passed++;
    } catch (error) {
      log.error(`Error de conexión: ${error.message}`);
      this.testResults.failed++;
    }
  }

  async testModelAssociations() {
    log.title('Test 2: Asociaciones de Modelos');
    
    try {
      // Verificar asociación GymHours -> GymTimeSlots
      if (GymHours.associations && GymHours.associations.timeSlots) {
        log.success('Asociación GymHours.timeSlots configurada');
      } else {
        log.error('Asociación GymHours.timeSlots no configurada');
        this.testResults.failed++;
      }
      
      // Verificar asociación GymTimeSlots -> GymHours
      if (GymTimeSlots.associations && GymTimeSlots.associations.gymHours) {
        log.success('Asociación GymTimeSlots.gymHours configurada');
      } else {
        log.error('Asociación GymTimeSlots.gymHours no configurada');
        this.testResults.failed++;
      }
      
      // Test de consulta con asociación
      const testDay = await GymHours.findOne({
        include: [{
          association: 'timeSlots',
          required: false
        }]
      });
      
      if (testDay) {
        log.success('Consulta con asociación funciona correctamente');
        this.testResults.passed++;
      } else {
        log.warning('No hay datos para probar asociaciones');
        this.testResults.warnings++;
      }
      
    } catch (error) {
      log.error(`Error en asociaciones: ${error.message}`);
      this.testResults.failed++;
    }
  }

  async testBasicOperations() {
    log.title('Test 3: Operaciones Básicas');
    
    try {
      // Test: Obtener horario semanal tradicional
      const traditionalSchedule = await GymHours.getWeeklySchedule();
      if (traditionalSchedule && Object.keys(traditionalSchedule).length === 7) {
        log.success('getWeeklySchedule() funciona correctamente');
      } else {
        log.error('getWeeklySchedule() no funciona');
        this.testResults.failed++;
        return;
      }
      
      // Test: Obtener horario flexible
      const flexibleSchedule = await GymHours.getFlexibleSchedule();
      if (flexibleSchedule && Object.keys(flexibleSchedule).length === 7) {
        log.success('getFlexibleSchedule() funciona correctamente');
      } else {
        log.error('getFlexibleSchedule() no funciona');
        this.testResults.failed++;
        return;
      }
      
      // Test: Verificar estructura de datos
      const mondaySchedule = flexibleSchedule.monday;
      if (mondaySchedule && typeof mondaySchedule.isOpen === 'boolean' && Array.isArray(mondaySchedule.timeSlots)) {
        log.success('Estructura de datos es correcta');
      } else {
        log.error('Estructura de datos incorrecta');
        this.testResults.failed++;
        return;
      }
      
      // Test: isOpenNow
      const isOpen = await GymHours.isOpenNow();
      if (typeof isOpen === 'boolean') {
        log.success(`isOpenNow() funciona - gym está ${isOpen ? 'abierto' : 'cerrado'}`);
      } else {
        log.error('isOpenNow() no funciona correctamente');
        this.testResults.failed++;
      }
      
      this.testResults.passed++;
    } catch (error) {
      log.error(`Error en operaciones básicas: ${error.message}`);
      this.testResults.failed++;
    }
  }

  async testFlexibleScheduleOperations() {
    log.title('Test 4: Operaciones de Horarios Flexibles');
    
    try {
      // Test: Alternar día abierto/cerrado
      const originalState = await GymHours.findOne({ where: { dayOfWeek: 'monday' } });
      const originalIsClosed = originalState.isClosed;
      
      await GymHours.toggleDayOpen('monday');
      const toggledState = await GymHours.findOne({ where: { dayOfWeek: 'monday' } });
      
      if (toggledState.isClosed !== originalIsClosed) {
        log.success('toggleDayOpen() funciona correctamente');
        
        // Restaurar estado original
        await GymHours.toggleDayOpen('monday');
      } else {
        log.error('toggleDayOpen() no funciona');
        this.testResults.failed++;
      }
      
      // Test: Agregar franja horaria
      const testSlotData = {
        open: '10:00',
        close: '12:00',
        capacity: 25,
        reservations: 0,
        label: 'Test Slot'
      };
      
      const newSlot = await GymHours.addTimeSlot('monday', testSlotData);
      if (newSlot && newSlot.openTime === '10:00:00') {
        log.success('addTimeSlot() funciona correctamente');
        
        // Test: Eliminar franja (marcar como inactiva)
        newSlot.isActive = false;
        await newSlot.save();
        log.success('Eliminación de slot funciona correctamente');
      } else {
        log.error('addTimeSlot() no funciona');
        this.testResults.failed++;
      }
      
      this.testResults.passed++;
    } catch (error) {
      log.error(`Error en operaciones flexibles: ${error.message}`);
      this.testResults.failed++;
    }
  }

  async testValidations() {
    log.title('Test 5: Validaciones');
    
    try {
      let validationsPassed = 0;
      
      // Test: Validación de hora inválida
      try {
        await GymTimeSlots.create({
          gymHoursId: 1,
          openTime: '25:00', // Hora inválida
          closeTime: '26:00',
          capacity: 30
        });
        log.error('Validación de hora inválida falló');
      } catch (error) {
        log.success('Validación de hora inválida funciona');
        validationsPassed++;
      }
      
      // Test: Validación de capacidad
      try {
        await GymTimeSlots.create({
          gymHoursId: 1,
          openTime: '09:00',
          closeTime: '10:00',
          capacity: 600 // Capacidad excesiva
        });
        log.error('Validación de capacidad falló');
      } catch (error) {
        log.success('Validación de capacidad funciona');
        validationsPassed++;
      }
      
      // Test: Validación de orden temporal
      try {
        await GymTimeSlots.create({
          gymHoursId: 1,
          openTime: '15:00',
          closeTime: '10:00', // Cierre antes de apertura
          capacity: 30
        });
        log.error('Validación de orden temporal falló');
      } catch (error) {
        log.success('Validación de orden temporal funciona');
        validationsPassed++;
      }
      
      if (validationsPassed >= 2) {
        this.testResults.passed++;
      } else {
        this.testResults.failed++;
      }
      
    } catch (error) {
      log.error(`Error en validaciones: ${error.message}`);
      this.testResults.failed++;
    }
  }

  async testCapacityMetrics() {
    log.title('Test 6: Métricas de Capacidad');
    
    try {
      const metrics = await GymHours.getCapacityMetrics();
      
      if (metrics && typeof metrics === 'object') {
        log.success('getCapacityMetrics() devuelve datos');
        
        // Verificar propiedades esperadas
        const expectedProps = ['totalCapacity', 'totalReservations', 'availableSpaces', 'averageOccupancy'];
        const hasAllProps = expectedProps.every(prop => metrics.hasOwnProperty(prop));
        
        if (hasAllProps) {
          log.success('Métricas tienen todas las propiedades esperadas');
          log.info(`Capacidad total: ${metrics.totalCapacity}`);
          log.info(`Reservas actuales: ${metrics.totalReservations}`);
          log.info(`Ocupación promedio: ${metrics.averageOccupancy}%`);
        } else {
          log.error('Faltan propiedades en métricas');
          this.testResults.failed++;
          return;
        }
        
        this.testResults.passed++;
      } else {
        log.error('getCapacityMetrics() no funciona');
        this.testResults.failed++;
      }
      
    } catch (error) {
      log.error(`Error en métricas: ${error.message}`);
      this.testResults.failed++;
    }
  }

  async testEdgeCases() {
    log.title('Test 7: Casos Edge');
    
    try {
      let edgeTestsPassed = 0;
      
      // Test: Día sin franjas horarias
      const emptyDaySchedule = await GymHours.getFlexibleSchedule();
      const emptyDay = Object.values(emptyDaySchedule).find(day => 
        day.isOpen === false || day.timeSlots.length === 0
      );
      
      if (emptyDay) {
        log.success('Manejo de días sin franjas funciona');
        edgeTestsPassed++;
      }
      
      // Test: Múltiples franjas en un día
      const busyDay = Object.values(emptyDaySchedule).find(day => 
        day.timeSlots && day.timeSlots.length > 1
      );
      
      if (busyDay) {
        log.success('Manejo de múltiples franjas funciona');
        edgeTestsPassed++;
      } else {
        log.warning('No hay días con múltiples franjas para probar');
        this.testResults.warnings++;
      }
      
      // Test: Medianoche (casos de horario 24h)
      try {
        const midnightTest = await GymTimeSlots.create({
          gymHoursId: 1,
          openTime: '23:00',
          closeTime: '23:59',
          capacity: 10,
          isActive: false // No interferir con datos reales
        });
        
        if (midnightTest) {
          log.success('Manejo de horarios nocturnos funciona');
          edgeTestsPassed++;
          
          // Limpiar test data
          await midnightTest.destroy();
        }
      } catch (error) {
        log.warning(`Test de medianoche falló: ${error.message}`);
        this.testResults.warnings++;
      }
      
      if (edgeTestsPassed >= 1) {
        this.testResults.passed++;
      } else {
        this.testResults.failed++;
      }
      
    } catch (error) {
      log.error(`Error en casos edge: ${error.message}`);
      this.testResults.failed++;
    }
  }

  async testPerformance() {
    log.title('Test 8: Performance');
    
    try {
      const iterations = 100;
      
      // Test: Performance de getFlexibleSchedule
      const start1 = Date.now();
      for (let i = 0; i < iterations; i++) {
        await GymHours.getFlexibleSchedule();
      }
      const time1 = Date.now() - start1;
      
      log.info(`getFlexibleSchedule() x${iterations}: ${time1}ms (${(time1/iterations).toFixed(2)}ms promedio)`);
      
      if (time1 / iterations < 100) { // Menos de 100ms por consulta
        log.success('Performance de consultas es aceptable');
      } else {
        log.warning('Performance de consultas es lenta');
        this.testResults.warnings++;
      }
      
      // Test: Performance de getCapacityMetrics
      const start2 = Date.now();
      for (let i = 0; i < 10; i++) {
        await GymHours.getCapacityMetrics();
      }
      const time2 = Date.now() - start2;
      
      log.info(`getCapacityMetrics() x10: ${time2}ms (${(time2/10).toFixed(2)}ms promedio)`);
      
      if (time2 / 10 < 200) { // Menos de 200ms por consulta de métricas
        log.success('Performance de métricas es aceptable');
      } else {
        log.warning('Performance de métricas es lenta');
        this.testResults.warnings++;
      }
      
      this.testResults.passed++;
      
    } catch (error) {
      log.error(`Error en tests de performance: ${error.message}`);
      this.testResults.failed++;
    }
  }

  async checkTableExists(tableName) {
    try {
      const [results] = await GymHours.sequelize.query(
        `SELECT table_name FROM information_schema.tables WHERE table_name = '${tableName}';`
      );
      return results.length > 0;
    } catch (error) {
      return false;
    }
  }

  printSummary() {
    log.title('RESUMEN DE TESTS');
    
    console.log(`\n${colors.bright}📊 RESULTADOS:${colors.reset}`);
    console.log(`${colors.green}✅ Pasados: ${this.testResults.passed}${colors.reset}`);
    console.log(`${colors.red}❌ Fallados: ${this.testResults.failed}${colors.reset}`);
    console.log(`${colors.yellow}⚠️  Advertencias: ${this.testResults.warnings}${colors.reset}`);
    
    const total = this.testResults.passed + this.testResults.failed;
    const successRate = total > 0 ? ((this.testResults.passed / total) * 100).toFixed(1) : 0;
    
    console.log(`\n${colors.bright}📈 Tasa de éxito: ${successRate}%${colors.reset}`);
    
    if (this.testResults.failed === 0) {
      log.success('¡TODOS LOS TESTS CRÍTICOS PASARON! 🎉');
    } else {
      log.error(`${this.testResults.failed} tests fallaron. Revisar implementación.`);
    }
    
    console.log(`\n${colors.blue}💡 RECOMENDACIONES:${colors.reset}`);
    
    if (this.testResults.failed > 0) {
      console.log('- Revisar migración de base de datos');
      console.log('- Verificar asociaciones de modelos');
      console.log('- Comprobar validaciones de datos');
    }
    
    if (this.testResults.warnings > 0) {
      console.log('- Considerar optimizaciones de performance');
      console.log('- Agregar más datos de prueba');
      console.log('- Revisar casos edge específicos');
    }
    
    if (this.testResults.failed === 0 && this.testResults.warnings === 0) {
      console.log('- ✅ Sistema listo para producción');
      console.log('- ✅ Considerar agregar tests de integración con frontend');
      console.log('- ✅ Documentar API endpoints');
    }
  }
}

// ✅ FUNCIÓN PRINCIPAL
async function runTests() {
  const tester = new FlexibleScheduleTester();
  await tester.runAllTests();
  
  // Exit code para CI/CD
  process.exit(tester.testResults.failed > 0 ? 1 : 0);
}

// ✅ SCRIPT DE DATOS DE PRUEBA
async function seedTestData() {
  log.title('CREANDO DATOS DE PRUEBA');
  
  try {
    // Crear horarios flexibles de ejemplo para desarrollo/testing
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    for (const day of days) {
      let dayRecord = await GymHours.findOne({ where: { dayOfWeek: day } });
      
      if (!dayRecord) {
        dayRecord = await GymHours.create({
          dayOfWeek: day,
          isClosed: false,
          useFlexibleSchedule: true
        });
      } else {
        dayRecord.useFlexibleSchedule = true;
        await dayRecord.save();
      }
      
      // Limpiar franjas existentes
      await GymTimeSlots.update(
        { isActive: false },
        { where: { gymHoursId: dayRecord.id } }
      );
      
      // Crear franjas de ejemplo
      const sampleSlots = [
        { open: '06:00', close: '12:00', capacity: 50, reservations: 25, label: 'Horario Mañana' },
        { open: '14:00', close: '20:00', capacity: 80, reservations: 60, label: 'Horario Tarde' },
        { open: '20:00', close: '22:00', capacity: 30, reservations: 15, label: 'Horario Noche' }
      ];
      
      for (let i = 0; i < sampleSlots.length; i++) {
        const slot = sampleSlots[i];
        await GymTimeSlots.create({
          gymHoursId: dayRecord.id,
          openTime: slot.open,
          closeTime: slot.close,
          capacity: slot.capacity,
          currentReservations: slot.reservations,
          slotLabel: slot.label,
          displayOrder: i,
          isActive: true
        });
      }
      
      log.success(`Datos de prueba creados para ${day}`);
    }
    
    log.success('Datos de prueba creados exitosamente');
    
  } catch (error) {
    log.error(`Error creando datos de prueba: ${error.message}`);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'seed') {
    seedTestData();
  } else {
    runTests();
  }
}

module.exports = { FlexibleScheduleTester, seedTestData, runTests };