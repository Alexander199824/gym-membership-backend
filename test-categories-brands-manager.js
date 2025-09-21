// test-categories-brands-manager.js - GESTOR INTERACTIVO DE CATEGORÍAS Y MARCAS
const axios = require('axios');
const readline = require('readline');
require('dotenv').config();

class CategoriesBrandsManager {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.adminToken = null;
    this.existingCategories = [];
    this.existingBrands = [];
    
    // Configurar readline para entrada manual
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.log('🏪 Elite Fitness Club - Gestor de Categorías y Marcas v1.0');
    console.log('='.repeat(70));
    console.log('🎯 OBJETIVO: Mostrar datos existentes y crear nuevos manualmente');
    console.log('📊 FUNCIONES: Ver categorías, ver marcas, crear nuevas\n');
    
    try {
      await this.loginAdmin();
      await this.loadExistingData();
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

  // ✅ CARGAR DATOS EXISTENTES
  async loadExistingData() {
    console.log('\n2. 📊 Cargando datos existentes...');
    
    try {
      // Cargar categorías usando la ruta de gestión
      console.log('   📂 Cargando categorías...');
      const categoriesResponse = await axios.get(`${this.baseURL}/api/store/management/categories`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { limit: 100, status: 'all' } // Incluir activas e inactivas
      });
      
      this.existingCategories = categoriesResponse.data.success ? 
        categoriesResponse.data.data.categories : [];
      console.log(`   ✅ ${this.existingCategories.length} categorías cargadas`);
      
      // Cargar marcas usando la ruta de gestión
      console.log('   🏷️ Cargando marcas...');
      const brandsResponse = await axios.get(`${this.baseURL}/api/store/management/brands`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { limit: 100, status: 'all' } // Incluir activas e inactivas
      });
      
      this.existingBrands = brandsResponse.data.success ? 
        brandsResponse.data.data.brands : [];
      console.log(`   ✅ ${this.existingBrands.length} marcas cargadas`);
      
    } catch (error) {
      console.log(`   ⚠️ Error cargando datos: ${error.message}`);
      if (error.response?.status === 401) {
        throw new Error('Token de autenticación inválido o expirado');
      }
      throw error;
    }
  }

  // ✅ MENÚ PRINCIPAL INTERACTIVO
  async showMainMenu() {
    console.log('\n🎯 MENÚ PRINCIPAL');
    console.log('=' .repeat(40));
    console.log('1. 📂 Ver todas las categorías');
    console.log('2. 🏷️ Ver todas las marcas');
    console.log('3. ➕ Crear nueva categoría');
    console.log('4. ➕ Crear nueva marca');
    console.log('5. 🔄 Recargar datos');
    console.log('6. 📊 Ver estadísticas');
    console.log('0. 🚪 Salir');
    
    const choice = await this.askQuestion('\n🎯 Selecciona una opción (0-6): ');
    
    switch (choice.trim()) {
      case '1':
        await this.showAllCategories();
        break;
      case '2':
        await this.showAllBrands();
        break;
      case '3':
        await this.createNewCategory();
        break;
      case '4':
        await this.createNewBrand();
        break;
      case '5':
        await this.reloadData();
        break;
      case '6':
        await this.showStats();
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

  // ✅ MOSTRAR TODAS LAS CATEGORÍAS
  async showAllCategories() {
    console.log('\n📂 CATEGORÍAS EXISTENTES');
    console.log('=' .repeat(50));
    
    if (this.existingCategories.length === 0) {
      console.log('❌ No hay categorías registradas');
      return;
    }
    
    // Separar activas e inactivas
    const activeCategories = this.existingCategories.filter(c => c.isActive);
    const inactiveCategories = this.existingCategories.filter(c => !c.isActive);
    
    // Mostrar categorías activas
    if (activeCategories.length > 0) {
      console.log('\n✅ CATEGORÍAS ACTIVAS:');
      activeCategories.forEach((category, index) => {
        console.log(`\n   ${index + 1}. "${category.name}"`);
        console.log(`      🆔 ID: ${category.id}`);
        console.log(`      🔗 Slug: ${category.slug}`);
        console.log(`      📝 Descripción: ${category.description || 'Sin descripción'}`);
        console.log(`      🎨 Icono: ${category.iconName || 'No definido'}`);
        console.log(`      📊 Orden: ${category.displayOrder || 0}`);
        console.log(`      📦 Productos: ${category.productCount || 0}`);
        console.log(`      📅 Creada: ${new Date(category.createdAt).toLocaleDateString()}`);
      });
    }
    
    // Mostrar categorías inactivas si las hay
    if (inactiveCategories.length > 0) {
      console.log('\n❌ CATEGORÍAS INACTIVAS:');
      inactiveCategories.forEach((category, index) => {
        console.log(`\n   ${index + 1}. "${category.name}" (INACTIVA)`);
        console.log(`      🆔 ID: ${category.id}`);
        console.log(`      🔗 Slug: ${category.slug}`);
        console.log(`      📝 Descripción: ${category.description || 'Sin descripción'}`);
      });
    }
    
    console.log(`\n📊 RESUMEN: ${activeCategories.length} activas, ${inactiveCategories.length} inactivas, ${this.existingCategories.length} total`);
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ MOSTRAR TODAS LAS MARCAS
  async showAllBrands() {
    console.log('\n🏷️ MARCAS EXISTENTES');
    console.log('=' .repeat(50));
    
    if (this.existingBrands.length === 0) {
      console.log('❌ No hay marcas registradas');
      return;
    }
    
    // Separar activas e inactivas
    const activeBrands = this.existingBrands.filter(b => b.isActive);
    const inactiveBrands = this.existingBrands.filter(b => !b.isActive);
    
    // Mostrar marcas activas
    if (activeBrands.length > 0) {
      console.log('\n✅ MARCAS ACTIVAS:');
      activeBrands.forEach((brand, index) => {
        console.log(`\n   ${index + 1}. "${brand.name}"`);
        console.log(`      🆔 ID: ${brand.id}`);
        console.log(`      📝 Descripción: ${brand.description || 'Sin descripción'}`);
        console.log(`      🖼️ Logo: ${brand.logoUrl || 'Sin logo'}`);
        console.log(`      📦 Productos: ${brand.productCount || 0}`);
        console.log(`      📅 Creada: ${new Date(brand.createdAt).toLocaleDateString()}`);
      });
    }
    
    // Mostrar marcas inactivas si las hay
    if (inactiveBrands.length > 0) {
      console.log('\n❌ MARCAS INACTIVAS:');
      inactiveBrands.forEach((brand, index) => {
        console.log(`\n   ${index + 1}. "${brand.name}" (INACTIVA)`);
        console.log(`      🆔 ID: ${brand.id}`);
        console.log(`      📝 Descripción: ${brand.description || 'Sin descripción'}`);
      });
    }
    
    console.log(`\n📊 RESUMEN: ${activeBrands.length} activas, ${inactiveBrands.length} inactivas, ${this.existingBrands.length} total`);
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ CREAR NUEVA CATEGORÍA
  async createNewCategory() {
    console.log('\n➕ CREAR NUEVA CATEGORÍA');
    console.log('=' .repeat(40));
    
    try {
      // Solicitar datos de la categoría
      console.log('📝 Ingresa los datos de la nueva categoría:\n');
      
      const name = await this.askQuestion('📂 Nombre de la categoría (requerido): ');
      if (!name.trim()) {
        console.log('❌ El nombre es requerido');
        return;
      }
      
      // Verificar si ya existe
      const existingCategory = this.existingCategories.find(c => 
        c.name.toLowerCase().trim() === name.toLowerCase().trim()
      );
      
      if (existingCategory) {
        console.log(`❌ Ya existe una categoría con el nombre "${name}"`);
        console.log(`   🆔 ID: ${existingCategory.id}, Estado: ${existingCategory.isActive ? 'Activa' : 'Inactiva'}`);
        return;
      }
      
      const description = await this.askQuestion('📝 Descripción (opcional): ');
      
      let slug = await this.askQuestion('🔗 Slug (opcional, se genera automáticamente): ');
      if (!slug.trim()) {
        slug = this.generateSlug(name);
        console.log(`   🔗 Slug generado automáticamente: "${slug}"`);
      }
      
      const iconName = await this.askQuestion('🎨 Nombre del icono (opcional, default: package): ');
      
      const displayOrderInput = await this.askQuestion('📊 Orden de visualización (opcional, número): ');
      let displayOrder = null;
      if (displayOrderInput.trim() && !isNaN(displayOrderInput)) {
        displayOrder = parseInt(displayOrderInput);
      }
      
      // Confirmar creación
      console.log('\n📋 DATOS DE LA NUEVA CATEGORÍA:');
      console.log(`   📂 Nombre: "${name}"`);
      console.log(`   📝 Descripción: "${description || 'Sin descripción'}"`);
      console.log(`   🔗 Slug: "${slug}"`);
      console.log(`   🎨 Icono: "${iconName || 'package'}"`);
      console.log(`   📊 Orden: ${displayOrder || 'Automático'}`);
      
      const confirm = await this.askQuestion('\n✅ ¿Confirmas la creación? (s/n): ');
      if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'si') {
        console.log('❌ Creación cancelada');
        return;
      }
      
      // Crear la categoría
      console.log('\n🔨 Creando categoría...');
      
      const categoryData = {
        name: name.trim(),
        description: description.trim() || null,
        slug: slug.trim(),
        iconName: iconName.trim() || 'package'
      };
      
      if (displayOrder !== null) {
        categoryData.displayOrder = displayOrder;
      }
      
      const response = await axios.post(
        `${this.baseURL}/api/store/management/categories`, 
        categoryData,
        {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }
      );
      
      if (response.data.success) {
        const newCategory = response.data.data.category;
        console.log('\n✅ ¡CATEGORÍA CREADA EXITOSAMENTE!');
        console.log(`   🆔 ID: ${newCategory.id}`);
        console.log(`   📂 Nombre: "${newCategory.name}"`);
        console.log(`   🔗 Slug: "${newCategory.slug}"`);
        console.log(`   📊 Orden: ${newCategory.displayOrder}`);
        
        // Actualizar lista local
        this.existingCategories.push(newCategory);
        
      } else {
        console.log('❌ Error: Respuesta sin éxito del servidor');
      }
      
    } catch (error) {
      console.error('\n❌ Error creando categoría:');
      if (error.response?.data?.message) {
        console.error(`   💥 ${error.response.data.message}`);
      } else {
        console.error(`   💥 ${error.message}`);
      }
      
      if (error.response?.data?.errors) {
        console.error('   📋 Detalles:');
        error.response.data.errors.forEach(err => {
          console.error(`      • ${err.message || err}`);
        });
      }
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ CREAR NUEVA MARCA
  async createNewBrand() {
    console.log('\n➕ CREAR NUEVA MARCA');
    console.log('=' .repeat(40));
    
    try {
      // Solicitar datos de la marca
      console.log('📝 Ingresa los datos de la nueva marca:\n');
      
      const name = await this.askQuestion('🏷️ Nombre de la marca (requerido): ');
      if (!name.trim()) {
        console.log('❌ El nombre es requerido');
        return;
      }
      
      // Verificar si ya existe
      const existingBrand = this.existingBrands.find(b => 
        b.name.toLowerCase().trim() === name.toLowerCase().trim()
      );
      
      if (existingBrand) {
        console.log(`❌ Ya existe una marca con el nombre "${name}"`);
        console.log(`   🆔 ID: ${existingBrand.id}, Estado: ${existingBrand.isActive ? 'Activa' : 'Inactiva'}`);
        return;
      }
      
      const description = await this.askQuestion('📝 Descripción (opcional): ');
      const logoUrl = await this.askQuestion('🖼️ URL del logo (opcional): ');
      
      // Validar URL si se proporciona
      if (logoUrl.trim() && !this.isValidURL(logoUrl.trim())) {
        console.log('⚠️ La URL del logo no parece ser válida, pero se guardará como está');
      }
      
      // Confirmar creación
      console.log('\n📋 DATOS DE LA NUEVA MARCA:');
      console.log(`   🏷️ Nombre: "${name}"`);
      console.log(`   📝 Descripción: "${description || 'Sin descripción'}"`);
      console.log(`   🖼️ Logo: "${logoUrl || 'Sin logo'}"`);
      
      const confirm = await this.askQuestion('\n✅ ¿Confirmas la creación? (s/n): ');
      if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'si') {
        console.log('❌ Creación cancelada');
        return;
      }
      
      // Crear la marca
      console.log('\n🔨 Creando marca...');
      
      const brandData = {
        name: name.trim(),
        description: description.trim() || null,
        logoUrl: logoUrl.trim() || null
      };
      
      const response = await axios.post(
        `${this.baseURL}/api/store/management/brands`, 
        brandData,
        {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }
      );
      
      if (response.data.success) {
        const newBrand = response.data.data.brand;
        console.log('\n✅ ¡MARCA CREADA EXITOSAMENTE!');
        console.log(`   🆔 ID: ${newBrand.id}`);
        console.log(`   🏷️ Nombre: "${newBrand.name}"`);
        console.log(`   📝 Descripción: "${newBrand.description || 'Sin descripción'}"`);
        console.log(`   🖼️ Logo: "${newBrand.logoUrl || 'Sin logo'}"`);
        
        // Actualizar lista local
        this.existingBrands.push(newBrand);
        
      } else {
        console.log('❌ Error: Respuesta sin éxito del servidor');
      }
      
    } catch (error) {
      console.error('\n❌ Error creando marca:');
      if (error.response?.data?.message) {
        console.error(`   💥 ${error.response.data.message}`);
      } else {
        console.error(`   💥 ${error.message}`);
      }
      
      if (error.response?.data?.errors) {
        console.error('   📋 Detalles:');
        error.response.data.errors.forEach(err => {
          console.error(`      • ${err.message || err}`);
        });
      }
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ RECARGAR DATOS
  async reloadData() {
    console.log('\n🔄 RECARGANDO DATOS...');
    try {
      await this.loadExistingData();
      console.log('✅ Datos recargados exitosamente');
    } catch (error) {
      console.log(`❌ Error recargando datos: ${error.message}`);
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ MOSTRAR ESTADÍSTICAS
  async showStats() {
    console.log('\n📊 ESTADÍSTICAS');
    console.log('=' .repeat(40));
    
    try {
      // Obtener estadísticas de categorías
      const categoryStatsResponse = await axios.get(`${this.baseURL}/api/store/management/categories/stats`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });
      
      // Obtener estadísticas de marcas
      const brandStatsResponse = await axios.get(`${this.baseURL}/api/store/management/brands/stats`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });
      
      const categoryStats = categoryStatsResponse.data.data;
      const brandStats = brandStatsResponse.data.data;
      
      console.log('📂 CATEGORÍAS:');
      console.log(`   📊 Total: ${categoryStats.totalCategories}`);
      console.log(`   ✅ Activas: ${categoryStats.activeCategories}`);
      console.log(`   ❌ Inactivas: ${categoryStats.inactiveCategories}`);
      
      console.log('\n🏷️ MARCAS:');
      console.log(`   📊 Total: ${brandStats.totalBrands}`);
      console.log(`   ✅ Activas: ${brandStats.activeBrands}`);
      console.log(`   ❌ Inactivas: ${brandStats.inactiveBrands}`);
      
      // Estadísticas locales
      const activeCategoriesLocal = this.existingCategories.filter(c => c.isActive).length;
      const activeBrandsLocal = this.existingBrands.filter(b => b.isActive).length;
      const categoriesWithProducts = this.existingCategories.filter(c => c.productCount > 0).length;
      const brandsWithProducts = this.existingBrands.filter(b => b.productCount > 0).length;
      
      console.log('\n📈 ANÁLISIS ADICIONAL:');
      console.log(`   📦 Categorías con productos: ${categoriesWithProducts}/${activeCategoriesLocal}`);
      console.log(`   📦 Marcas con productos: ${brandsWithProducts}/${activeBrandsLocal}`);
      
      if (this.existingCategories.length > 0) {
        const totalProducts = this.existingCategories.reduce((sum, c) => sum + (c.productCount || 0), 0);
        console.log(`   📦 Total productos en categorías: ${totalProducts}`);
      }
      
    } catch (error) {
      console.error(`❌ Error obteniendo estadísticas: ${error.message}`);
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ MÉTODOS AUXILIARES

  // Generar slug automático
  generateSlug(name) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/[ñ]/g, 'n')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Validar URL
  isValidURL(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
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

// ✅ FUNCIÓN DE AYUDA
function showHelp() {
  console.log('\n🏪 Elite Fitness Club - Gestor de Categorías y Marcas v1.0\n');
  
  console.log('🎯 CARACTERÍSTICAS:');
  console.log('  📊 Muestra todas las categorías y marcas existentes');
  console.log('  ➕ Permite crear nuevas categorías manualmente');
  console.log('  ➕ Permite crear nuevas marcas manualmente');
  console.log('  🔄 Recarga datos en tiempo real');
  console.log('  📈 Muestra estadísticas detalladas\n');
  
  console.log('🎮 MODO INTERACTIVO:');
  console.log('  📝 Entrada manual de datos');
  console.log('  ✅ Validación automática');
  console.log('  🔍 Verificación de duplicados');
  console.log('  📊 Visualización organizada\n');
  
  console.log('🚀 USO:');
  console.log('  node test-categories-brands-manager.js        # Modo interactivo');
  console.log('  node test-categories-brands-manager.js --help # Esta ayuda\n');
  
  console.log('📋 REQUISITOS:');
  console.log('  • Servidor corriendo en puerto 5000');
  console.log('  • Usuario admin: admin@gym.com / Admin123!');
  console.log('  • Acceso a rutas de gestión de tienda\n');
  
  console.log('💡 El gestor permite crear categorías y marcas que luego');
  console.log('   puedes usar en productos o el registrador de productos');
}

// ✅ FUNCIÓN PRINCIPAL
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const manager = new CategoriesBrandsManager();
  await manager.start();
}

// ✅ EJECUTAR
if (require.main === module) {
  main().catch(error => {
    console.error('\n🚨 ERROR CRÍTICO:', error.message);
    process.exit(1);
  });
}

module.exports = { CategoriesBrandsManager };