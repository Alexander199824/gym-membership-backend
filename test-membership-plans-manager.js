// test-membership-plans-manager.js - GESTOR INTERACTIVO DE PLANES DE MEMBRESÍA COMPLETO
const axios = require('axios');
const readline = require('readline');
require('dotenv').config();

class MembershipPlansManager {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.adminToken = null;
    this.existingPlans = [];
    this.stats = {};
    
    // Configurar readline para entrada manual
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.log('💪 Elite Fitness Club - Gestor de Planes de Membresía v1.0');
    console.log('='.repeat(70));
    console.log('🎯 OBJETIVO: Gestión completa de planes de membresía (CRUD)');
    console.log('🔧 FUNCIONES: Ver, crear, editar, eliminar y gestionar planes\n');
    
    try {
      await this.loginAdmin();
      await this.loadExistingPlans();
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

  // AUTENTICACIÓN
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
        console.log(`   🔑 Token obtenido: ${this.adminToken.substring(0, 20)}...`);
      } else {
        throw new Error('Respuesta de login inválida');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error(`Credenciales incorrectas. Verifica email y contraseña.`);
      } else if (error.response?.status === 404) {
        throw new Error(`Endpoint de login no encontrado. Verifica que /api/auth/login esté disponible.`);
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error(`No se puede conectar al servidor en ${this.baseURL}. ¿Está ejecutándose?`);
      }
      throw new Error(`Autenticación falló: ${error.message}`);
    }
  }

  // CARGAR PLANES EXISTENTES
  async loadExistingPlans() {
    console.log('\n2. 📊 Cargando planes existentes...');
    
    try {
      // Cargar todos los planes (admin)
      console.log('   💪 Cargando planes de membresía...');
      const plansResponse = await axios.get(`${this.baseURL}/api/membership-plans`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { limit: 100, status: 'all' }
      });
      
      this.existingPlans = plansResponse.data.success ? 
        plansResponse.data.data.plans : (plansResponse.data.data || []);
      console.log(`   ✅ ${this.existingPlans.length} planes cargados`);
      
      // Cargar estadísticas si están disponibles
      try {
        const statsResponse = await axios.get(`${this.baseURL}/api/membership-plans/stats`, {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        });
        this.stats = statsResponse.data.success ? statsResponse.data.data : {};
        console.log(`   📊 Estadísticas cargadas`);
      } catch (error) {
        console.log(`   ⚠️ Estadísticas no disponibles`);
        this.stats = {};
      }
      
    } catch (error) {
      console.log(`   ⚠️ Error cargando planes: ${error.message}`);
      if (error.response?.status === 401) {
        throw new Error('Token de autenticación inválido o expirado');
      }
      if (error.response?.status === 404) {
        console.log('   ℹ️ Endpoint no encontrado, continuando con datos vacíos');
        this.existingPlans = [];
      }
    }
  }

  // MENÚ PRINCIPAL INTERACTIVO
  async showMainMenu() {
    console.log('\n🎯 MENÚ PRINCIPAL - PLANES DE MEMBRESÍA');
    console.log('=' .repeat(50));
    console.log('1. 📋 Ver todos los planes');
    console.log('2. 🌟 Ver solo planes activos (vista pública)');
    console.log('3. ➕ Crear nuevo plan');
    console.log('4. ✏️ Editar plan existente');
    console.log('5. 🗑️ Eliminar plan');
    console.log('6. 🔄 Activar/Desactivar plan');
    console.log('7. 📊 Ver estadísticas');
    console.log('8. 🔄 Recargar datos');
    console.log('0. 🚪 Salir');
    
    const choice = await this.askQuestion('\n🎯 Selecciona una opción (0-8): ');
    
    switch (choice.trim()) {
      case '1':
        await this.showAllPlans();
        break;
      case '2':
        await this.showActivePlans();
        break;
      case '3':
        await this.createNewPlan();
        break;
      case '4':
        await this.editPlan();
        break;
      case '5':
        await this.deletePlan();
        break;
      case '6':
        await this.togglePlanStatus();
        break;
      case '7':
        await this.showStats();
        break;
      case '8':
        await this.reloadData();
        break;
      case '0':
        console.log('\n👋 ¡Hasta luego!');
        return;
      default:
        console.log('\n❌ Opción inválida. Intenta de nuevo.');
    }
    
    // Mostrar menú nuevamente
    await this.showMainMenu();
  }

  // MOSTRAR TODOS LOS PLANES
  async showAllPlans() {
    console.log('\n📋 TODOS LOS PLANES DE MEMBRESÍA');
    console.log('=' .repeat(60));
    
    if (this.existingPlans.length === 0) {
      console.log('❌ No hay planes registrados');
      return;
    }
    
    // Separar activos e inactivos
    const activePlans = this.existingPlans.filter(p => p.isActive);
    const inactivePlans = this.existingPlans.filter(p => !p.isActive);
    
    // Mostrar planes activos
    if (activePlans.length > 0) {
      console.log('\n✅ PLANES ACTIVOS:');
      activePlans.forEach((plan, index) => {
        this.displayPlanDetails(plan, index + 1);
      });
    }
    
    // Mostrar planes inactivos si los hay
    if (inactivePlans.length > 0) {
      console.log('\n❌ PLANES INACTIVOS:');
      inactivePlans.forEach((plan, index) => {
        this.displayPlanDetails(plan, index + 1, true);
      });
    }
    
    console.log(`\n📊 RESUMEN: ${activePlans.length} activos, ${inactivePlans.length} inactivos, ${this.existingPlans.length} total`);
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // MOSTRAR SOLO PLANES ACTIVOS (VISTA PÚBLICA)
  async showActivePlans() {
    console.log('\n🌟 PLANES ACTIVOS (Vista Pública)');
    console.log('=' .repeat(50));
    
    try {
      // Usar endpoint público
      const response = await axios.get(`${this.baseURL}/api/membership-plans/active`);
      const activePlans = response.data.success ? response.data.data : [];
      
      if (activePlans.length === 0) {
        console.log('❌ No hay planes activos disponibles');
        return;
      }
      
      activePlans.forEach((plan, index) => {
        console.log(`\n   ${index + 1}. 💪 "${plan.name || plan.planName}"`);
        console.log(`      💰 Precio: Q${plan.price}`);
        if (plan.originalPrice && plan.originalPrice > plan.price) {
          const discount = Math.round(((plan.originalPrice - plan.price) / plan.originalPrice) * 100);
          console.log(`      🔥 Precio original: Q${plan.originalPrice} (${discount}% descuento)`);
        }
        console.log(`      ⏰ Duración: ${plan.duration || this.getDurationLabel(plan.durationType)}`);
        console.log(`      🎯 Tipo: ${plan.durationType || 'N/A'}`);
        if (plan.popular || plan.isPopular) {
          console.log(`      ⭐ PLAN POPULAR ⭐`);
        }
        if (plan.features && plan.features.length > 0) {
          console.log(`      📋 Características:`);
          plan.features.slice(0, 3).forEach(feature => {
            console.log(`         ✓ ${feature}`);
          });
          if (plan.features.length > 3) {
            console.log(`         ... y ${plan.features.length - 3} más`);
          }
        }
      });
      
      console.log(`\n📊 Total de planes activos: ${activePlans.length}`);
      
    } catch (error) {
      console.error(`❌ Error obteniendo planes activos: ${error.message}`);
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // CREAR NUEVO PLAN
  async createNewPlan() {
    console.log('\n➕ CREAR NUEVO PLAN DE MEMBRESÍA');
    console.log('=' .repeat(45));
    
    try {
      console.log('📝 Ingresa los datos del nuevo plan:\n');
      
      const planName = await this.askQuestion('💪 Nombre del plan (requerido): ');
      if (!planName.trim()) {
        console.log('❌ El nombre es requerido');
        return;
      }
      
      // Verificar si ya existe
      const existingPlan = this.existingPlans.find(p => 
        p.planName.toLowerCase().trim() === planName.toLowerCase().trim()
      );
      
      if (existingPlan) {
        console.log(`❌ Ya existe un plan con el nombre "${planName}"`);
        console.log(`   🆔 ID: ${existingPlan.id}, Estado: ${existingPlan.isActive ? 'Activo' : 'Inactivo'}`);
        return;
      }
      
      const price = await this.askQuestion('💰 Precio (Q) (requerido): ');
      if (!price || isNaN(price) || parseFloat(price) <= 0) {
        console.log('❌ Precio inválido');
        return;
      }
      
      const originalPrice = await this.askQuestion('🔥 Precio original (Q) (opcional): ');
      
      console.log('\nTipos de duración disponibles:');
      console.log('  1. daily - Diario');
      console.log('  2. weekly - Semanal'); 
      console.log('  3. monthly - Mensual');
      console.log('  4. quarterly - Trimestral');
      console.log('  5. annual - Anual');
      
      const durationTypeInput = await this.askQuestion('⏰ Tipo de duración (1-5): ');
      const durationTypes = ['daily', 'weekly', 'monthly', 'quarterly', 'annual'];
      const durationType = durationTypes[parseInt(durationTypeInput) - 1] || 'monthly';
      
      const description = await this.askQuestion('📝 Descripción (opcional): ');
      const iconName = await this.askQuestion('🎨 Nombre del icono (opcional, default: calendar): ');
      const isPopular = await this.askQuestion('⭐ ¿Es plan popular? (s/n): ');
      
      // Características
      console.log('\n📋 Características del plan (presiona Enter en blanco para terminar):');
      const features = [];
      let featureIndex = 1;
      while (true) {
        const feature = await this.askQuestion(`   ${featureIndex}. Característica: `);
        if (!feature.trim()) break;
        features.push(feature.trim());
        featureIndex++;
      }
      
      // Confirmar creación
      console.log('\n📋 DATOS DEL NUEVO PLAN:');
      console.log(`   💪 Nombre: "${planName}"`);
      console.log(`   💰 Precio: Q${price}`);
      if (originalPrice && parseFloat(originalPrice) > parseFloat(price)) {
        const discount = Math.round(((originalPrice - price) / originalPrice) * 100);
        console.log(`   🔥 Precio original: Q${originalPrice} (${discount}% descuento)`);
      }
      console.log(`   ⏰ Tipo: ${durationType}`);
      console.log(`   📝 Descripción: "${description || 'Sin descripción'}"`);
      console.log(`   🎨 Icono: "${iconName || 'calendar'}"`);
      console.log(`   ⭐ Popular: ${isPopular.toLowerCase() === 's' ? 'Sí' : 'No'}`);
      if (features.length > 0) {
        console.log(`   📋 Características:`);
        features.forEach(f => console.log(`      ✓ ${f}`));
      }
      
      const confirm = await this.askQuestion('\n✅ ¿Confirmas la creación? (s/n): ');
      if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'si') {
        console.log('❌ Creación cancelada');
        return;
      }
      
      // Crear el plan
      console.log('\n🔨 Creando plan...');
      
      const planData = {
        planName: planName.trim(),
        price: parseFloat(price),
        originalPrice: originalPrice && parseFloat(originalPrice) > parseFloat(price) ? parseFloat(originalPrice) : null,
        durationType: durationType,
        features: features,
        isPopular: isPopular.toLowerCase() === 's',
        iconName: iconName.trim() || 'calendar'
      };
      
      if (description.trim()) {
        planData.description = description.trim();
      }
      
      const response = await axios.post(
        `${this.baseURL}/api/membership-plans`, 
        planData,
        {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }
      );
      
      if (response.data.success) {
        const newPlan = response.data.data.plan;
        console.log('\n✅ ¡PLAN CREADO EXITOSAMENTE!');
        console.log(`   🆔 ID: ${newPlan.id}`);
        console.log(`   💪 Nombre: "${newPlan.planName}"`);
        console.log(`   💰 Precio: Q${newPlan.price}`);
        console.log(`   ⏰ Tipo: ${newPlan.durationType}`);
        
        // Actualizar lista local
        this.existingPlans.push(newPlan);
        
      } else {
        console.log('❌ Error: Respuesta sin éxito del servidor');
      }
      
    } catch (error) {
      console.error('\n❌ Error creando plan:');
      
      // Mostrar mensaje principal del error
      if (error.response?.data?.message) {
        console.error(`   💥 ${error.response.data.message}`);
      } else if (error.message) {
        console.error(`   💥 ${error.message}`);
      } else {
        console.error(`   💥 Error desconocido`);
      }
      
      // CORRECCIÓN APLICADA: Manejo mejorado de errores de validación
      if (error.response?.data?.errors) {
        console.error('   📋 Detalles de validación:');
        error.response.data.errors.forEach((err, index) => {
          if (typeof err === 'object') {
            const message = err.msg || err.message || err.param || 'Error de validación';
            const field = err.param || err.path || '';
            console.error(`      ${index + 1}. ${field ? '[' + field + '] ' : ''}${message}`);
          } else {
            console.error(`      ${index + 1}. ${err}`);
          }
        });
      }
      
      // Mostrar información adicional del error HTTP
      if (error.response?.status) {
        console.error(`   🌐 Status HTTP: ${error.response.status}`);
      }
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // EDITAR PLAN EXISTENTE
  async editPlan() {
    console.log('\n✏️ EDITAR PLAN DE MEMBRESÍA');
    console.log('=' .repeat(40));
    
    if (this.existingPlans.length === 0) {
      console.log('❌ No hay planes disponibles para editar');
      return;
    }
    
    try {
      // Mostrar planes disponibles
      console.log('📋 Planes disponibles:');
      this.existingPlans.forEach((plan, index) => {
        console.log(`   ${index + 1}. ${plan.planName} (${plan.isActive ? 'Activo' : 'Inactivo'}) - Q${plan.price} - ${plan.durationType}`);
      });
      
      const planIndex = await this.askQuestion('\n🎯 Selecciona el plan a editar (número): ');
      const selectedPlan = this.existingPlans[parseInt(planIndex) - 1];
      
      if (!selectedPlan) {
        console.log('❌ Plan no encontrado');
        return;
      }
      
      console.log(`\n📝 Editando plan: "${selectedPlan.planName}"`);
      console.log('(Presiona Enter para mantener el valor actual)\n');
      
      // Campos editables
      const planName = await this.askQuestion(`💪 Nombre [${selectedPlan.planName}]: `);
      const price = await this.askQuestion(`💰 Precio [Q${selectedPlan.price}]: `);
      const originalPrice = await this.askQuestion(`🔥 Precio original [Q${selectedPlan.originalPrice || 'N/A'}]: `);
      
      console.log('Tipos de duración: 1.daily 2.weekly 3.monthly 4.quarterly 5.annual');
      const durationTypeInput = await this.askQuestion(`⏰ Tipo de duración [${selectedPlan.durationType}]: `);
      
      const description = await this.askQuestion(`📝 Descripción [${selectedPlan.description || 'N/A'}]: `);
      const iconName = await this.askQuestion(`🎨 Icono [${selectedPlan.iconName || 'calendar'}]: `);
      const isPopular = await this.askQuestion(`⭐ ¿Popular? [${selectedPlan.isPopular ? 'Sí' : 'No'}] (s/n): `);
      const isActive = await this.askQuestion(`✅ ¿Activo? [${selectedPlan.isActive ? 'Sí' : 'No'}] (s/n): `);
      
      // Preparar datos de actualización
      const updateData = {};
      
      if (planName.trim()) updateData.planName = planName.trim();
      if (price.trim() && !isNaN(price) && parseFloat(price) > 0) updateData.price = parseFloat(price);
      if (originalPrice.trim() && !isNaN(originalPrice)) updateData.originalPrice = parseFloat(originalPrice);
      if (durationTypeInput.trim()) {
        const durationTypes = ['daily', 'weekly', 'monthly', 'quarterly', 'annual'];
        const durationType = durationTypes[parseInt(durationTypeInput) - 1];
        if (durationType) updateData.durationType = durationType;
      }
      if (description.trim()) updateData.description = description.trim();
      if (iconName.trim()) updateData.iconName = iconName.trim();
      if (isPopular.toLowerCase() === 's') updateData.isPopular = true;
      if (isPopular.toLowerCase() === 'n') updateData.isPopular = false;
      if (isActive.toLowerCase() === 's') updateData.isActive = true;
      if (isActive.toLowerCase() === 'n') updateData.isActive = false;
      
      if (Object.keys(updateData).length === 0) {
        console.log('❌ No se realizaron cambios');
        return;
      }
      
      // Confirmar actualización
      console.log('\n📋 CAMBIOS A REALIZAR:');
      Object.keys(updateData).forEach(key => {
        console.log(`   ${key}: ${selectedPlan[key]} → ${updateData[key]}`);
      });
      
      const confirm = await this.askQuestion('\n✅ ¿Confirmas los cambios? (s/n): ');
      if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'si') {
        console.log('❌ Edición cancelada');
        return;
      }
      
      // Actualizar plan
      console.log('\n🔨 Actualizando plan...');
      
      const response = await axios.put(
        `${this.baseURL}/api/membership-plans/${selectedPlan.id}`, 
        updateData,
        {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }
      );
      
      if (response.data.success) {
        const updatedPlan = response.data.data.plan;
        console.log('\n✅ ¡PLAN ACTUALIZADO EXITOSAMENTE!');
        console.log(`   🆔 ID: ${updatedPlan.id}`);
        console.log(`   💪 Nombre: "${updatedPlan.planName}"`);
        console.log(`   💰 Precio: Q${updatedPlan.price}`);
        console.log(`   ⏰ Tipo: ${updatedPlan.durationType}`);
        console.log(`   ✅ Estado: ${updatedPlan.isActive ? 'Activo' : 'Inactivo'}`);
        
        // Actualizar lista local
        const index = this.existingPlans.findIndex(p => p.id === selectedPlan.id);
        if (index !== -1) {
          this.existingPlans[index] = updatedPlan;
        }
        
      } else {
        console.log('❌ Error: Respuesta sin éxito del servidor');
      }
      
    } catch (error) {
      console.error('\n❌ Error actualizando plan:');
      if (error.response?.data?.message) {
        console.error(`   💥 ${error.response.data.message}`);
      } else {
        console.error(`   💥 ${error.message}`);
      }
      
      // CORRECCIÓN APLICADA: Manejo mejorado de errores
      if (error.response?.data?.errors) {
        console.error('   📋 Detalles de validación:');
        error.response.data.errors.forEach((err, index) => {
          if (typeof err === 'object') {
            const message = err.msg || err.message || err.param || 'Error de validación';
            const field = err.param || err.path || '';
            console.error(`      ${index + 1}. ${field ? '[' + field + '] ' : ''}${message}`);
          } else {
            console.error(`      ${index + 1}. ${err}`);
          }
        });
      }
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ELIMINAR PLAN
  async deletePlan() {
    console.log('\n🗑️ ELIMINAR PLAN DE MEMBRESÍA');
    console.log('=' .repeat(40));
    
    if (this.existingPlans.length === 0) {
      console.log('❌ No hay planes disponibles para eliminar');
      return;
    }
    
    try {
      // Mostrar planes disponibles
      console.log('📋 Planes disponibles:');
      this.existingPlans.forEach((plan, index) => {
        console.log(`   ${index + 1}. ${plan.planName} (${plan.isActive ? 'Activo' : 'Inactivo'}) - Q${plan.price}`);
      });
      
      const planIndex = await this.askQuestion('\n🎯 Selecciona el plan a eliminar (número): ');
      const selectedPlan = this.existingPlans[parseInt(planIndex) - 1];
      
      if (!selectedPlan) {
        console.log('❌ Plan no encontrado');
        return;
      }
      
      console.log(`\n⚠️ VAS A ELIMINAR EL PLAN: "${selectedPlan.planName}"`);
      console.log(`   💰 Precio: Q${selectedPlan.price}`);
      console.log(`   ⏰ Tipo: ${selectedPlan.durationType}`);
      console.log(`   ✅ Estado: ${selectedPlan.isActive ? 'Activo' : 'Inactivo'}`);
      
      const confirmFirst = await this.askQuestion('\n⚠️ ¿Estás seguro? Esta acción NO se puede deshacer (s/n): ');
      if (confirmFirst.toLowerCase() !== 's' && confirmFirst.toLowerCase() !== 'si') {
        console.log('❌ Eliminación cancelada');
        return;
      }
      
      const forceDelete = await this.askQuestion('🔥 ¿Forzar eliminación aunque tenga membresías? (s/n): ');
      
      const confirmSecond = await this.askQuestion('\n🚨 CONFIRMACIÓN FINAL: Escribe "ELIMINAR" para confirmar: ');
      if (confirmSecond.toUpperCase() !== 'ELIMINAR') {
        console.log('❌ Eliminación cancelada');
        return;
      }
      
      // Eliminar plan
      console.log('\n🔨 Eliminando plan...');
      
      const deleteData = {};
      if (forceDelete.toLowerCase() === 's') {
        deleteData.force = true;
      }
      
      const response = await axios.delete(
        `${this.baseURL}/api/membership-plans/${selectedPlan.id}`,
        {
          headers: { 'Authorization': `Bearer ${this.adminToken}` },
          data: deleteData
        }
      );
      
      if (response.data.success) {
        console.log('\n✅ ¡PLAN ELIMINADO EXITOSAMENTE!');
        console.log(`   💪 Plan eliminado: "${selectedPlan.planName}"`);
        
        // Remover de lista local
        this.existingPlans = this.existingPlans.filter(p => p.id !== selectedPlan.id);
        
      } else {
        console.log('❌ Error: Respuesta sin éxito del servidor');
      }
      
    } catch (error) {
      console.error('\n❌ Error eliminando plan:');
      if (error.response?.data?.message) {
        console.error(`   💥 ${error.response.data.message}`);
        if (error.response?.data?.details) {
          console.error(`   📋 Detalles:`, error.response.data.details);
        }
      } else {
        console.error(`   💥 ${error.message}`);
      }
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ACTIVAR/DESACTIVAR PLAN
  async togglePlanStatus() {
    console.log('\n🔄 ACTIVAR/DESACTIVAR PLAN');
    console.log('=' .repeat(35));
    
    if (this.existingPlans.length === 0) {
      console.log('❌ No hay planes disponibles');
      return;
    }
    
    try {
      // Mostrar planes disponibles
      console.log('📋 Planes disponibles:');
      this.existingPlans.forEach((plan, index) => {
        const status = plan.isActive ? '✅ Activo' : '❌ Inactivo';
        console.log(`   ${index + 1}. ${plan.planName} (${status}) - Q${plan.price}`);
      });
      
      const planIndex = await this.askQuestion('\n🎯 Selecciona el plan (número): ');
      const selectedPlan = this.existingPlans[parseInt(planIndex) - 1];
      
      if (!selectedPlan) {
        console.log('❌ Plan no encontrado');
        return;
      }
      
      const currentStatus = selectedPlan.isActive ? 'Activo' : 'Inactivo';
      const newStatus = selectedPlan.isActive ? 'Inactivo' : 'Activo';
      
      console.log(`\n🔄 Cambiar estado del plan: "${selectedPlan.planName}"`);
      console.log(`   Estado actual: ${currentStatus}`);
      console.log(`   Nuevo estado: ${newStatus}`);
      
      const confirm = await this.askQuestion('\n✅ ¿Confirmas el cambio? (s/n): ');
      if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'si') {
        console.log('❌ Cambio cancelado');
        return;
      }
      
      // Cambiar estado
      console.log('\n🔨 Cambiando estado...');
      
      const response = await axios.patch(
        `${this.baseURL}/api/membership-plans/${selectedPlan.id}/toggle-status`,
        {},
        {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }
      );
      
      if (response.data.success) {
        console.log('\n✅ ¡ESTADO CAMBIADO EXITOSAMENTE!');
        console.log(`   💪 Plan: "${selectedPlan.planName}"`);
        console.log(`   🔄 Nuevo estado: ${newStatus}`);
        
        // Actualizar lista local
        const index = this.existingPlans.findIndex(p => p.id === selectedPlan.id);
        if (index !== -1) {
          this.existingPlans[index].isActive = !selectedPlan.isActive;
        }
        
      } else {
        console.log('❌ Error: Respuesta sin éxito del servidor');
      }
      
    } catch (error) {
      console.error('\n❌ Error cambiando estado:');
      if (error.response?.data?.message) {
        console.error(`   💥 ${error.response.data.message}`);
      } else {
        console.error(`   💥 ${error.message}`);
      }
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // MOSTRAR ESTADÍSTICAS
  async showStats() {
    console.log('\n📊 ESTADÍSTICAS DE PLANES');
    console.log('=' .repeat(40));
    
    try {
      const statsResponse = await axios.get(`${this.baseURL}/api/membership-plans/stats`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });
      
      const stats = statsResponse.data.data;
      
      console.log('📊 RESUMEN GENERAL:');
      console.log(`   📋 Total de planes: ${stats.summary?.totalPlans || 0}`);
      console.log(`   ✅ Planes activos: ${stats.summary?.activePlans || 0}`);
      console.log(`   ❌ Planes inactivos: ${stats.summary?.inactivePlans || 0}`);
      console.log(`   ⭐ Planes populares: ${stats.summary?.popularPlans || 0}`);
      
      if (stats.plansByDurationType && Object.keys(stats.plansByDurationType).length > 0) {
        console.log('\n⏰ PLANES POR TIPO DE DURACIÓN:');
        Object.entries(stats.plansByDurationType).forEach(([type, count]) => {
          console.log(`   ${this.getDurationLabel(type)}: ${count} planes`);
        });
      }
      
      if (stats.mostUsedPlans && stats.mostUsedPlans.length > 0) {
        console.log('\n🌟 PLANES MÁS UTILIZADOS:');
        stats.mostUsedPlans.forEach((plan, index) => {
          console.log(`   ${index + 1}. ${plan.planName} - Q${plan.price}`);
          console.log(`      👥 Membresías activas: ${plan.activeMemberships}`);
        });
      }
      
      if (stats.revenueByPlan && stats.revenueByPlan.length > 0) {
        console.log('\n💰 INGRESOS POR PLAN (último mes):');
        stats.revenueByPlan.forEach((plan, index) => {
          console.log(`   ${index + 1}. ${plan.planName}`);
          console.log(`      💰 Ingresos: Q${plan.totalRevenue}`);
          console.log(`      🛒 Ventas: ${plan.salesCount}`);
        });
      }
      
    } catch (error) {
      console.error(`❌ Error obteniendo estadísticas: ${error.message}`);
      
      // Estadísticas locales básicas
      console.log('📊 ESTADÍSTICAS LOCALES:');
      const activePlans = this.existingPlans.filter(p => p.isActive).length;
      const popularPlans = this.existingPlans.filter(p => p.isPopular).length;
      
      console.log(`   📋 Total de planes: ${this.existingPlans.length}`);
      console.log(`   ✅ Planes activos: ${activePlans}`);
      console.log(`   ❌ Planes inactivos: ${this.existingPlans.length - activePlans}`);
      console.log(`   ⭐ Planes populares: ${popularPlans}`);
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // RECARGAR DATOS
  async reloadData() {
    console.log('\n🔄 RECARGANDO DATOS...');
    try {
      await this.loadExistingPlans();
      console.log('✅ Datos recargados exitosamente');
    } catch (error) {
      console.log(`❌ Error recargando datos: ${error.message}`);
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // MÉTODOS AUXILIARES

  // Mostrar detalles de un plan
  displayPlanDetails(plan, index, inactive = false) {
    console.log(`\n   ${index}. 💪 "${plan.planName}"${inactive ? ' (INACTIVO)' : ''}`);
    console.log(`      🆔 ID: ${plan.id}`);
    console.log(`      💰 Precio: Q${plan.price}`);
    
    if (plan.originalPrice && plan.originalPrice > plan.price) {
      const discount = Math.round(((plan.originalPrice - plan.price) / plan.originalPrice) * 100);
      console.log(`      🔥 Precio original: Q${plan.originalPrice} (${discount}% descuento)`);
    }
    
    console.log(`      ⏰ Tipo: ${plan.durationType}`);
    console.log(`      📝 Descripción: ${plan.description || 'Sin descripción'}`);
    console.log(`      🎨 Icono: ${plan.iconName || 'calendar'}`);
    console.log(`      📊 Orden: ${plan.displayOrder || 0}`);
    console.log(`      ⭐ Popular: ${plan.isPopular ? 'Sí' : 'No'}`);
    console.log(`      ✅ Activo: ${plan.isActive ? 'Sí' : 'No'}`);
    
    if (plan.stats) {
      console.log(`      👥 Membresías activas: ${plan.stats.activeMemberships || 0}`);
      console.log(`      📊 Total membresías: ${plan.stats.totalMemberships || 0}`);
    }
    
    if (plan.features && plan.features.length > 0) {
      console.log(`      📋 Características:`);
      plan.features.slice(0, 3).forEach(feature => {
        console.log(`         ✓ ${feature}`);
      });
      if (plan.features.length > 3) {
        console.log(`         ... y ${plan.features.length - 3} más`);
      }
    }
    
    console.log(`      📅 Creado: ${new Date(plan.createdAt).toLocaleDateString()}`);
  }

  // Obtener etiqueta de duración
  getDurationLabel(durationType) {
    const labels = {
      'daily': '📅 Diario',
      'weekly': '📅 Semanal',
      'monthly': '📅 Mensual',
      'quarterly': '📅 Trimestral',
      'annual': '📅 Anual'
    };
    return labels[durationType] || durationType;
  }

  // Preguntar al usuario
  askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }
}

// FUNCIÓN DE AYUDA
function showHelp() {
  console.log('\n💪 Elite Fitness Club - Gestor de Planes de Membresía v1.0\n');
  
  console.log('🎯 CARACTERÍSTICAS:');
  console.log('  📋 Ver todos los planes (activos e inactivos)');
  console.log('  🌟 Ver vista pública de planes activos');
  console.log('  ➕ Crear nuevos planes con validación completa');
  console.log('  ✏️ Editar planes existentes');
  console.log('  🗑️ Eliminar planes con confirmación múltiple');
  console.log('  🔄 Activar/desactivar planes');
  console.log('  📊 Estadísticas detalladas');
  console.log('  🔄 Recarga datos en tiempo real\n');
  
  console.log('🎮 FUNCIONALIDADES CRUD:');
  console.log('  🔍 READ: Ver planes individuales y listados');
  console.log('  ➕ CREATE: Crear con características, precios, descuentos');
  console.log('  ✏️ UPDATE: Editar todos los campos de planes existentes');
  console.log('  🗑️ DELETE: Eliminar con opciones de fuerza\n');
  
  console.log('🚀 USO:');
  console.log('  node test-membership-plans-manager.js         # Modo interactivo');
  console.log('  node test-membership-plans-manager.js --help  # Esta ayuda\n');
  
  console.log('📋 REQUISITOS:');
  console.log('  • Servidor corriendo en puerto 5000');
  console.log('  • Usuario admin: admin@gym.com / Admin123!');
  console.log('  • Endpoints /api/membership-plans/* disponibles\n');
  
  console.log('💡 Este gestor permite probar todas las funcionalidades');
  console.log('   CRUD de planes de membresía de forma interactiva');
}

// FUNCIÓN PRINCIPAL
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const manager = new MembershipPlansManager();
  await manager.start();
}

// EJECUTAR
if (require.main === module) {
  main().catch(error => {
    console.error('\n🚨 ERROR CRÍTICO:', error.message);
    process.exit(1);
  });
}

module.exports = { MembershipPlansManager };