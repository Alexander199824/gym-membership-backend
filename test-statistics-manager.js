// test-statistics-manager.js - GESTOR COMPLETO DE ESTADÍSTICAS v1.0 ✅ CORREGIDO
const axios = require('axios');
const readline = require('readline');
require('dotenv').config();

class StatisticsManager {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.adminToken = null;
    this.statistics = [];
    this.activeStats = [];
    
    // Configurar readline para entrada interactiva
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.log('📊 Elite Fitness Club - Gestor de Estadísticas v1.0 ✅');
    console.log('='.repeat(70));
    console.log('🎯 FUNCIONES: Ver, crear, editar, eliminar y reordenar estadísticas');
    console.log('📈 GESTIÓN: Control completo de las métricas del gimnasio\n');
    
    try {
      await this.loginAdmin();
      await this.loadAllStatistics();
      await this.showMainMenu();
      
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      if (error.response) {
        console.error('📋 Detalles:', {
          status: error.response.status,
          data: error.response.data,
          url: error.response.config?.url
        });
      }
    } finally {
      this.rl.close();
    }
  }

  // ✅ AUTENTICACIÓN
  async loginAdmin() {
    console.log('1. 🔐 Autenticando como administrador...');
    
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'admin@gym.com',
        password: 'Admin123!'
      });

      if (response.data.success && response.data.data.token) {
        this.adminToken = response.data.data.token;
        console.log('   ✅ Autenticación exitosa');
        console.log(`   👤 Usuario: ${response.data.data.user.firstName} ${response.data.data.user.lastName}`);
        console.log(`   🎭 Rol: ${response.data.data.user.role}`);
      } else {
        throw new Error('Respuesta de login inválida');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Credenciales incorrectas. Verifica email y contraseña.');
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error(`No se puede conectar al servidor en ${this.baseURL}. ¿Está ejecutándose?`);
      }
      throw new Error(`Autenticación falló: ${error.message}`);
    }
  }

  // ✅ CARGAR TODAS LAS ESTADÍSTICAS - RUTAS CORREGIDAS
  async loadAllStatistics() {
    console.log('\n2. 📊 Cargando estadísticas del sistema...');
    
    try {
      // ✅ CORREGIDO: Cargar todas las estadísticas (admin)
      const allStatsResponse = await axios.get(`${this.baseURL}/api/statistics`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      if (allStatsResponse.data.success) {
        this.statistics = allStatsResponse.data.data;
        console.log(`   ✅ ${this.statistics.length} estadísticas cargadas`);
      }

      // ✅ CORREGIDO: Cargar estadísticas activas (públicas)
      const activeStatsResponse = await axios.get(`${this.baseURL}/api/statistics/active`);
      
      if (activeStatsResponse.data.success) {
        this.activeStats = activeStatsResponse.data.data;
        console.log(`   ✅ ${this.activeStats.length} estadísticas activas`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error cargando estadísticas: ${error.message}`);
      throw error;
    }
  }

  // ✅ MENÚ PRINCIPAL
  async showMainMenu() {
    console.log('\n📊 GESTOR DE ESTADÍSTICAS - MENÚ PRINCIPAL');
    console.log('='.repeat(70));
    console.log('1. 📋 Ver todas las estadísticas');
    console.log('2. ✅ Ver estadísticas activas (público)');
    console.log('3. ➕ Crear nueva estadística');
    console.log('4. ✏️  Editar estadística existente');
    console.log('5. 🗑️  Eliminar estadística');
    console.log('6. 🔄 Activar/Desactivar estadística');
    console.log('7. 🔢 Reordenar estadísticas');
    console.log('8. 🌱 Crear estadísticas por defecto (seed)');
    console.log('9. 🔍 Buscar estadística específica');
    console.log('10. 🔄 Recargar datos');
    console.log('11. 📊 Ver resumen completo');
    console.log('0. 🚪 Salir');
    
    const choice = await this.askQuestion('\n📊 Selecciona una opción (0-11): ');
    
    switch (choice.trim()) {
      case '1':
        await this.showAllStatistics();
        break;
      case '2':
        await this.showActiveStatistics();
        break;
      case '3':
        await this.createStatistic();
        break;
      case '4':
        await this.editStatistic();
        break;
      case '5':
        await this.deleteStatistic();
        break;
      case '6':
        await this.toggleStatistic();
        break;
      case '7':
        await this.reorderStatistics();
        break;
      case '8':
        await this.seedDefaultStatistics();
        break;
      case '9':
        await this.searchStatistic();
        break;
      case '10':
        await this.reloadData();
        break;
      case '11':
        await this.showCompleteSummary();
        break;
      case '0':
        console.log('\n👋 ¡Hasta luego!');
        return;
      default:
        console.log('\n❌ Opción inválida. Intenta de nuevo.');
    }
    
    await this.showMainMenu();
  }

  // ✅ VER TODAS LAS ESTADÍSTICAS
  async showAllStatistics() {
    console.log('\n📋 TODAS LAS ESTADÍSTICAS');
    console.log('='.repeat(70));
    
    if (this.statistics.length === 0) {
      console.log('❌ No hay estadísticas registradas');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    this.statistics.forEach((stat, index) => {
      const statusIcon = stat.isActive ? '✅' : '❌';
      const formattedValue = stat.valueSuffix 
        ? `${stat.statValue}${stat.valueSuffix}` 
        : stat.statValue;

      console.log(`\n   ${index + 1}. ${statusIcon} ${stat.label}`);
      console.log(`      🔑 Key: ${stat.statKey}`);
      console.log(`      📊 Valor: ${formattedValue}`);
      console.log(`      🎨 Icono: ${stat.iconName}`);
      console.log(`      🎨 Color: ${stat.colorScheme}`);
      console.log(`      📐 Orden: ${stat.displayOrder}`);
      console.log(`      📝 Descripción: ${stat.description || 'N/A'}`);
      console.log(`      🆔 ID: ${stat.id}`);
    });

    console.log(`\n📊 Total: ${this.statistics.length} estadísticas`);
    console.log(`   ✅ Activas: ${this.statistics.filter(s => s.isActive).length}`);
    console.log(`   ❌ Inactivas: ${this.statistics.filter(s => !s.isActive).length}`);

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ VER ESTADÍSTICAS ACTIVAS (PÚBLICO)
  async showActiveStatistics() {
    console.log('\n✅ ESTADÍSTICAS ACTIVAS (Vista Pública)');
    console.log('='.repeat(70));
    
    if (this.activeStats.length === 0) {
      console.log('❌ No hay estadísticas activas para mostrar');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    console.log('\n📊 Así se ven en el frontend:');
    this.activeStats.forEach((stat, index) => {
      console.log(`\n   ${index + 1}. ${this.getColorIcon(stat.color)} ${stat.label}`);
      console.log(`      📈 ${stat.number}`);
      console.log(`      ${this.getIconDisplay(stat.icon)}`);
      if (stat.description) {
        console.log(`      💬 ${stat.description}`);
      }
    });

    console.log(`\n📊 Total activas: ${this.activeStats.length}`);

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ CREAR NUEVA ESTADÍSTICA
  async createStatistic() {
    console.log('\n➕ CREAR NUEVA ESTADÍSTICA');
    console.log('='.repeat(70));

    try {
      const statKey = await this.askQuestion('🔑 Key (ej: total_members): ');
      if (!statKey.trim()) {
        console.log('❌ Key es requerida');
        await this.askQuestion('\n⏎ Presiona Enter para continuar...');
        return;
      }

      const statValue = await this.askQuestion('📊 Valor numérico (ej: 500): ');
      if (!statValue.trim() || isNaN(statValue)) {
        console.log('❌ Valor debe ser un número');
        await this.askQuestion('\n⏎ Presiona Enter para continuar...');
        return;
      }

      const label = await this.askQuestion('🏷️  Etiqueta (ej: Miembros Activos): ');
      if (!label.trim()) {
        console.log('❌ Etiqueta es requerida');
        await this.askQuestion('\n⏎ Presiona Enter para continuar...');
        return;
      }

      const iconName = await this.askQuestion('🎨 Icono (ej: Users, Award, Trophy): ') || 'TrendingUp';
      const valueSuffix = await this.askQuestion('📝 Sufijo (ej: +, %, K) [opcional]: ') || '+';
      
      console.log('\n🎨 Colores disponibles: primary, secondary, success, warning, danger, info');
      const colorScheme = await this.askQuestion('🎨 Esquema de color: ') || 'primary';
      
      const displayOrder = await this.askQuestion('📐 Orden de visualización [opcional]: ') || '999';
      const description = await this.askQuestion('📝 Descripción [opcional]: ') || null;

      const confirm = await this.askQuestion(`\n✅ ¿Crear estadística "${label}"? (s/n): `);
      if (confirm.toLowerCase() !== 's') {
        console.log('❌ Creación cancelada');
        await this.askQuestion('\n⏎ Presiona Enter para continuar...');
        return;
      }

      // ✅ RUTA CORREGIDA
      const response = await axios.post(`${this.baseURL}/api/statistics`, {
        statKey: statKey.trim(),
        statValue: parseInt(statValue),
        label: label.trim(),
        iconName: iconName.trim(),
        valueSuffix: valueSuffix.trim(),
        colorScheme: colorScheme.trim(),
        displayOrder: parseInt(displayOrder),
        description: description ? description.trim() : null,
        isActive: true
      }, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      if (response.data.success) {
        console.log('\n✅ Estadística creada exitosamente');
        console.log(`   🆔 ID: ${response.data.data.id}`);
        await this.loadAllStatistics();
      } else {
        console.log('\n❌ Error creando estadística:', response.data.message);
      }

    } catch (error) {
      console.error('\n❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ EDITAR ESTADÍSTICA
  async editStatistic() {
    console.log('\n✏️  EDITAR ESTADÍSTICA');
    console.log('='.repeat(70));

    if (this.statistics.length === 0) {
      console.log('❌ No hay estadísticas para editar');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    // Mostrar lista
    this.statistics.forEach((stat, index) => {
      console.log(`   ${index + 1}. ${stat.label} (${stat.statKey})`);
    });

    const choice = await this.askQuestion('\n📊 Número de estadística a editar (0 para cancelar): ');
    const statIndex = parseInt(choice) - 1;

    if (choice === '0') return;

    if (statIndex < 0 || statIndex >= this.statistics.length) {
      console.log('❌ Número inválido');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const stat = this.statistics[statIndex];
    console.log(`\n📊 Editando: ${stat.label}`);
    console.log('(Presiona Enter para mantener el valor actual)\n');

    const updates = {};

    const newStatKey = await this.askQuestion(`🔑 Key [${stat.statKey}]: `);
    if (newStatKey.trim()) updates.statKey = newStatKey.trim();

    const newStatValue = await this.askQuestion(`📊 Valor [${stat.statValue}]: `);
    if (newStatValue.trim()) updates.statValue = parseInt(newStatValue);

    const newLabel = await this.askQuestion(`🏷️  Etiqueta [${stat.label}]: `);
    if (newLabel.trim()) updates.label = newLabel.trim();

    const newIconName = await this.askQuestion(`🎨 Icono [${stat.iconName}]: `);
    if (newIconName.trim()) updates.iconName = newIconName.trim();

    const newValueSuffix = await this.askQuestion(`📝 Sufijo [${stat.valueSuffix}]: `);
    if (newValueSuffix.trim()) updates.valueSuffix = newValueSuffix.trim();

    const newColorScheme = await this.askQuestion(`🎨 Color [${stat.colorScheme}]: `);
    if (newColorScheme.trim()) updates.colorScheme = newColorScheme.trim();

    const newDisplayOrder = await this.askQuestion(`📐 Orden [${stat.displayOrder}]: `);
    if (newDisplayOrder.trim()) updates.displayOrder = parseInt(newDisplayOrder);

    const newDescription = await this.askQuestion(`📝 Descripción [${stat.description || 'N/A'}]: `);
    if (newDescription.trim()) updates.description = newDescription.trim();

    if (Object.keys(updates).length === 0) {
      console.log('❌ No se realizaron cambios');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const confirm = await this.askQuestion(`\n✅ ¿Guardar cambios en "${stat.label}"? (s/n): `);
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Edición cancelada');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    try {
      // ✅ RUTA CORREGIDA
      const response = await axios.put(
        `${this.baseURL}/api/statistics/${stat.id}`,
        updates,
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log('\n✅ Estadística actualizada exitosamente');
        await this.loadAllStatistics();
      } else {
        console.log('\n❌ Error actualizando:', response.data.message);
      }

    } catch (error) {
      console.error('\n❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ ELIMINAR ESTADÍSTICA
  async deleteStatistic() {
    console.log('\n🗑️  ELIMINAR ESTADÍSTICA');
    console.log('='.repeat(70));

    if (this.statistics.length === 0) {
      console.log('❌ No hay estadísticas para eliminar');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    // Mostrar lista
    this.statistics.forEach((stat, index) => {
      console.log(`   ${index + 1}. ${stat.label} (${stat.statKey})`);
    });

    const choice = await this.askQuestion('\n🗑️  Número de estadística a eliminar (0 para cancelar): ');
    const statIndex = parseInt(choice) - 1;

    if (choice === '0') return;

    if (statIndex < 0 || statIndex >= this.statistics.length) {
      console.log('❌ Número inválido');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const stat = this.statistics[statIndex];
    console.log(`\n⚠️  ¿Estás seguro de eliminar "${stat.label}"?`);
    console.log('   Esta acción NO se puede deshacer');

    const confirm = await this.askQuestion('\n🗑️  Confirmar eliminación (escribe "ELIMINAR" para confirmar): ');
    if (confirm !== 'ELIMINAR') {
      console.log('❌ Eliminación cancelada');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    try {
      // ✅ RUTA CORREGIDA
      const response = await axios.delete(
        `${this.baseURL}/api/statistics/${stat.id}`,
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log('\n✅ Estadística eliminada exitosamente');
        await this.loadAllStatistics();
      } else {
        console.log('\n❌ Error eliminando:', response.data.message);
      }

    } catch (error) {
      console.error('\n❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ ACTIVAR/DESACTIVAR ESTADÍSTICA
  async toggleStatistic() {
    console.log('\n🔄 ACTIVAR/DESACTIVAR ESTADÍSTICA');
    console.log('='.repeat(70));

    if (this.statistics.length === 0) {
      console.log('❌ No hay estadísticas');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    // Mostrar lista con estado
    this.statistics.forEach((stat, index) => {
      const status = stat.isActive ? '✅ ACTIVA' : '❌ INACTIVA';
      console.log(`   ${index + 1}. ${stat.label} - ${status}`);
    });

    const choice = await this.askQuestion('\n🔄 Número de estadística (0 para cancelar): ');
    const statIndex = parseInt(choice) - 1;

    if (choice === '0') return;

    if (statIndex < 0 || statIndex >= this.statistics.length) {
      console.log('❌ Número inválido');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const stat = this.statistics[statIndex];
    const newStatus = stat.isActive ? 'desactivar' : 'activar';

    const confirm = await this.askQuestion(`\n✅ ¿${newStatus.toUpperCase()} "${stat.label}"? (s/n): `);
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Operación cancelada');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    try {
      // ✅ RUTA CORREGIDA
      const response = await axios.patch(
        `${this.baseURL}/api/statistics/${stat.id}/toggle`,
        {},
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log(`\n✅ Estadística ${newStatus}da exitosamente`);
        await this.loadAllStatistics();
      } else {
        console.log('\n❌ Error:', response.data.message);
      }

    } catch (error) {
      console.error('\n❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ REORDENAR ESTADÍSTICAS
  async reorderStatistics() {
    console.log('\n🔢 REORDENAR ESTADÍSTICAS');
    console.log('='.repeat(70));

    if (this.statistics.length === 0) {
      console.log('❌ No hay estadísticas para reordenar');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    console.log('\n📊 ORDEN ACTUAL:');
    const sortedStats = [...this.statistics].sort((a, b) => a.displayOrder - b.displayOrder);
    sortedStats.forEach((stat, index) => {
      console.log(`   ${index + 1}. [${stat.displayOrder}] ${stat.label}`);
    });

    console.log('\n📝 INSTRUCCIONES:');
    console.log('   Ingresa el nuevo orden separado por comas');
    console.log('   Ejemplo: 3,1,2,4 (reordena la 3ra primero, luego 1ra, etc.)');

    const orderInput = await this.askQuestion('\n🔢 Nuevo orden: ');
    if (!orderInput.trim()) {
      console.log('❌ Orden inválido');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const newOrder = orderInput.split(',').map(n => parseInt(n.trim()) - 1);

    if (newOrder.length !== this.statistics.length) {
      console.log('❌ Debes incluir todas las estadísticas');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const orderData = newOrder.map((index, displayOrder) => ({
      id: sortedStats[index].id,
      displayOrder: displayOrder + 1
    }));

    console.log('\n📊 NUEVO ORDEN:');
    orderData.forEach((item, index) => {
      const stat = this.statistics.find(s => s.id === item.id);
      console.log(`   ${index + 1}. [${item.displayOrder}] ${stat.label}`);
    });

    const confirm = await this.askQuestion('\n✅ ¿Aplicar este orden? (s/n): ');
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Reordenamiento cancelado');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    try {
      // ✅ RUTA CORREGIDA
      const response = await axios.put(
        `${this.baseURL}/api/statistics/reorder/batch`,
        { order: orderData },
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log('\n✅ Estadísticas reordenadas exitosamente');
        await this.loadAllStatistics();
      } else {
        console.log('\n❌ Error reordenando:', response.data.message);
      }

    } catch (error) {
      console.error('\n❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ CREAR ESTADÍSTICAS POR DEFECTO
  async seedDefaultStatistics() {
    console.log('\n🌱 CREAR ESTADÍSTICAS POR DEFECTO');
    console.log('='.repeat(70));
    console.log('⚠️  Esto creará las estadísticas predeterminadas del sistema');
    console.log('   Si ya existen, puede causar duplicados');

    const confirm = await this.askQuestion('\n✅ ¿Continuar? (s/n): ');
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Operación cancelada');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    try {
      // ✅ RUTA CORREGIDA
      const response = await axios.post(
        `${this.baseURL}/api/statistics/seed/defaults`,
        {},
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log('\n✅ Estadísticas por defecto creadas exitosamente');
        console.log(`   📊 Total creadas: ${response.data.data.length}`);
        await this.loadAllStatistics();
      } else {
        console.log('\n❌ Error:', response.data.message);
      }

    } catch (error) {
      console.error('\n❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ BUSCAR ESTADÍSTICA
  async searchStatistic() {
    console.log('\n🔍 BUSCAR ESTADÍSTICA');
    console.log('='.repeat(70));

    const searchTerm = await this.askQuestion('🔍 Término de búsqueda (key o label): ');
    if (!searchTerm.trim()) {
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const lowerSearch = searchTerm.toLowerCase();
    const results = this.statistics.filter(stat => 
      stat.statKey.toLowerCase().includes(lowerSearch) ||
      stat.label.toLowerCase().includes(lowerSearch)
    );

    console.log(`\n🔍 RESULTADOS: "${searchTerm}"`);
    console.log('='.repeat(70));

    if (results.length === 0) {
      console.log('❌ No se encontraron resultados');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    results.forEach((stat, index) => {
      const statusIcon = stat.isActive ? '✅' : '❌';
      const formattedValue = stat.valueSuffix 
        ? `${stat.statValue}${stat.valueSuffix}` 
        : stat.statValue;

      console.log(`\n   ${index + 1}. ${statusIcon} ${stat.label}`);
      console.log(`      🔑 Key: ${stat.statKey}`);
      console.log(`      📊 Valor: ${formattedValue}`);
      console.log(`      🆔 ID: ${stat.id}`);
    });

    console.log(`\n📊 ${results.length} resultado(s) encontrado(s)`);

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ RECARGAR DATOS
  async reloadData() {
    console.log('\n🔄 RECARGANDO ESTADÍSTICAS...');
    try {
      await this.loadAllStatistics();
      console.log('✅ Estadísticas recargadas exitosamente');
    } catch (error) {
      console.log(`❌ Error recargando: ${error.message}`);
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ RESUMEN COMPLETO
  async showCompleteSummary() {
    console.log('\n📊 RESUMEN COMPLETO DE ESTADÍSTICAS');
    console.log('='.repeat(70));

    const activeCount = this.statistics.filter(s => s.isActive).length;
    const inactiveCount = this.statistics.filter(s => !s.isActive).length;

    console.log('\n📈 TOTALES:');
    console.log(`   📊 Total estadísticas: ${this.statistics.length}`);
    console.log(`   ✅ Activas (visibles): ${activeCount}`);
    console.log(`   ❌ Inactivas (ocultas): ${inactiveCount}`);

    console.log('\n🎨 POR COLOR:');
    const colorGroups = {};
    this.statistics.forEach(stat => {
      if (!colorGroups[stat.colorScheme]) colorGroups[stat.colorScheme] = 0;
      colorGroups[stat.colorScheme]++;
    });
    Object.entries(colorGroups).forEach(([color, count]) => {
      console.log(`   ${this.getColorIcon(color)} ${color}: ${count}`);
    });

    console.log('\n📊 ESTADÍSTICAS ACTIVAS (Vista Frontend):');
    this.activeStats.forEach(stat => {
      console.log(`   ${this.getColorIcon(stat.color)} ${stat.number} ${stat.label}`);
    });

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ FUNCIONES AUXILIARES
  getColorIcon(color) {
    const icons = {
      'primary': '🔵',
      'secondary': '🟣',
      'success': '🟢',
      'warning': '🟡',
      'danger': '🔴',
      'info': '🔷'
    };
    return icons[color] || '⚪';
  }

  getIconDisplay(icon) {
    const iconNames = {
      'Users': '👥',
      'Award': '🏆',
      'Trophy': '🥇',
      'Star': '⭐',
      'TrendingUp': '📈',
      'Heart': '❤️',
      'Dumbbell': '🏋️',
      'Activity': '📊'
    };
    return iconNames[icon] || '📊';
  }

  askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }
}

// ✅ FUNCIÓN DE AYUDA
function showHelp() {
  console.log('\n📊 Elite Fitness Club - Gestor de Estadísticas v1.0 ✅\n');
  
  console.log('🎯 FUNCIONALIDADES:');
  console.log('  ✅ Ver todas las estadísticas del sistema');
  console.log('  ✅ Ver estadísticas activas (vista pública)');
  console.log('  ➕ Crear nuevas estadísticas');
  console.log('  ✏️  Editar estadísticas existentes');
  console.log('  🗑️  Eliminar estadísticas');
  console.log('  🔄 Activar/Desactivar estadísticas');
  console.log('  🔢 Reordenar estadísticas');
  console.log('  🌱 Crear estadísticas por defecto');
  console.log('  🔍 Buscar estadísticas\n');
  
  console.log('📊 CAMPOS DE ESTADÍSTICA:');
  console.log('  🔑 statKey: Identificador único (ej: total_members)');
  console.log('  📊 statValue: Valor numérico (ej: 500)');
  console.log('  🏷️  label: Etiqueta visible (ej: Miembros Activos)');
  console.log('  🎨 iconName: Icono (Users, Award, Trophy, Star, etc.)');
  console.log('  📝 valueSuffix: Sufijo (+, %, K, etc.)');
  console.log('  🎨 colorScheme: Color (primary, secondary, success, etc.)');
  console.log('  📐 displayOrder: Orden de visualización');
  console.log('  📝 description: Descripción opcional\n');
  
  console.log('📡 RUTAS UTILIZADAS:');
  console.log('  GET    /api/statistics          - Todas las estadísticas (admin)');
  console.log('  GET    /api/statistics/active   - Estadísticas activas (público)');
  console.log('  GET    /api/statistics/:id      - Una estadística');
  console.log('  POST   /api/statistics          - Crear estadística');
  console.log('  PUT    /api/statistics/:id      - Actualizar estadística');
  console.log('  DELETE /api/statistics/:id      - Eliminar estadística');
  console.log('  PATCH  /api/statistics/:id/toggle - Activar/Desactivar');
  console.log('  PUT    /api/statistics/reorder/batch - Reordenar');
  console.log('  POST   /api/statistics/seed/defaults - Crear por defecto\n');
  
  console.log('🚀 USO:');
  console.log('  node test-statistics-manager.js        # Gestor interactivo');
  console.log('  node test-statistics-manager.js --help # Esta ayuda\n');
  
  console.log('📋 REQUISITOS:');
  console.log('  • Servidor en puerto 5000');
  console.log('  • Usuario admin: admin@gym.com / Admin123!');
  console.log('  • Rutas de estadísticas configuradas\n');
}

// ✅ FUNCIÓN PRINCIPAL
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const manager = new StatisticsManager();
  await manager.start();
}

// ✅ EJECUTAR
if (require.main === module) {
  main().catch(error => {
    console.error('\n🚨 ERROR CRÍTICO:', error.message);
    process.exit(1);
  });
}

module.exports = { StatisticsManager };