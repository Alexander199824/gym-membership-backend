// test-products-manager.js - GESTOR COMPLETO DE PRODUCTOS v1.0
const axios = require('axios');
const readline = require('readline');
require('dotenv').config();

class ProductsManager {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.adminToken = null;
    this.existingProducts = [];
    this.existingCategories = [];
    this.existingBrands = [];
    this.currentPage = 1;
    this.currentLimit = 10;
    this.currentFilters = {
      search: '',
      category: '',
      brand: '',
      status: 'all',
      featured: '',
      lowStock: false,
      sortBy: 'name',
      sortOrder: 'ASC'
    };
    
    // Configurar readline para entrada interactiva
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.log('🛒 Elite Fitness Club - Gestor Completo de Productos v1.0');
    console.log('='.repeat(80));
    console.log('🎯 FUNCIONES: Ver productos, filtrar, buscar, editar, gestionar stock');
    console.log('📊 DATOS: Lista completa con imágenes, stock, categorías y marcas');
    console.log('🔧 GESTIÓN: Información detallada para edición y administración\n');
    
    try {
      await this.loginAdmin();
      await this.loadAllData();
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
        throw new Error(`Credenciales incorrectas. Verifica email y contraseña.`);
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error(`No se puede conectar al servidor en ${this.baseURL}. ¿Está ejecutándose?`);
      }
      throw new Error(`Autenticación falló: ${error.message}`);
    }
  }

  // ✅ CARGAR TODOS LOS DATOS
  async loadAllData() {
    console.log('\n2. 📊 Cargando todos los datos de la tienda...');
    
    try {
      // Cargar productos con filtros actuales
      console.log('   📦 Cargando productos...');
      await this.loadProducts();
      
      // Cargar categorías
      console.log('   📂 Cargando categorías...');
      const categoriesResponse = await axios.get(`${this.baseURL}/api/store/management/categories`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { limit: 100, status: 'all' }
      });
      this.existingCategories = categoriesResponse.data.success ? 
        categoriesResponse.data.data.categories : [];
      
      // Cargar marcas
      console.log('   🏷️ Cargando marcas...');
      const brandsResponse = await axios.get(`${this.baseURL}/api/store/management/brands`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params: { limit: 100, status: 'all' }
      });
      this.existingBrands = brandsResponse.data.success ? 
        brandsResponse.data.data.brands : [];
      
      console.log(`   ✅ Datos cargados: ${this.existingProducts.length} productos, ${this.existingCategories.length} categorías, ${this.existingBrands.length} marcas`);
      
    } catch (error) {
      console.log(`   ❌ Error cargando datos: ${error.message}`);
      throw error;
    }
  }

  // ✅ CARGAR PRODUCTOS CON FILTROS
  async loadProducts() {
    try {
      const params = {
        page: this.currentPage,
        limit: this.currentLimit,
        sortBy: this.currentFilters.sortBy,
        sortOrder: this.currentFilters.sortOrder
      };

      // Aplicar filtros solo si tienen valor
      if (this.currentFilters.search) params.search = this.currentFilters.search;
      if (this.currentFilters.category) params.category = this.currentFilters.category;
      if (this.currentFilters.brand) params.brand = this.currentFilters.brand;
      if (this.currentFilters.status !== 'all') params.status = this.currentFilters.status;
      if (this.currentFilters.featured) params.featured = this.currentFilters.featured;
      if (this.currentFilters.lowStock) params.lowStock = 'true';

      const response = await axios.get(`${this.baseURL}/api/store/management/products`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params
      });

      if (response.data.success) {
        this.existingProducts = response.data.data.products;
        this.pagination = response.data.data.pagination;
      } else {
        this.existingProducts = [];
        this.pagination = { total: 0, page: 1, pages: 1, limit: this.currentLimit };
      }
    } catch (error) {
      console.error('Error cargando productos:', error.message);
      this.existingProducts = [];
      this.pagination = { total: 0, page: 1, pages: 1, limit: this.currentLimit };
    }
  }

  // ✅ MENÚ PRINCIPAL INTERACTIVO
  async showMainMenu() {
    console.log('\n🎯 GESTOR DE PRODUCTOS - MENÚ PRINCIPAL');
    console.log('=' .repeat(60));
    console.log('1. 📦 Ver todos los productos (con paginación)');
    console.log('2. 🔍 Buscar y filtrar productos');
    console.log('3. 📂 Ver productos por categoría');
    console.log('4. 🏷️ Ver productos por marca');
    console.log('5. ⭐ Ver productos destacados');
    console.log('6. 📉 Ver productos con poco stock');
    console.log('7. 📊 Ver estadísticas de productos');
    console.log('8. 🔧 Ver detalles de producto específico');
    console.log('9. 📈 Gestionar stock de productos');
    console.log('10. 🖼️ Ver imágenes de productos');
    console.log('11. ⚙️ Configurar filtros y paginación');
    console.log('12. 🔄 Recargar datos');
    console.log('0. 🚪 Salir');
    
    const choice = await this.askQuestion('\n🎯 Selecciona una opción (0-12): ');
    
    switch (choice.trim()) {
      case '1':
        await this.showAllProducts();
        break;
      case '2':
        await this.searchAndFilterProducts();
        break;
      case '3':
        await this.showProductsByCategory();
        break;
      case '4':
        await this.showProductsByBrand();
        break;
      case '5':
        await this.showFeaturedProducts();
        break;
      case '6':
        await this.showLowStockProducts();
        break;
      case '7':
        await this.showProductStats();
        break;
      case '8':
        await this.showProductDetails();
        break;
      case '9':
        await this.manageStock();
        break;
      case '10':
        await this.showProductImages();
        break;
      case '11':
        await this.configureFilters();
        break;
      case '12':
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

  // ✅ MOSTRAR TODOS LOS PRODUCTOS CON PAGINACIÓN
  async showAllProducts() {
    console.log('\n📦 LISTA COMPLETA DE PRODUCTOS');
    console.log('=' .repeat(80));
    
    if (this.existingProducts.length === 0) {
      console.log('❌ No hay productos que mostrar con los filtros actuales');
      await this.showCurrentFilters();
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    // Mostrar información de paginación
    console.log(`📄 Página ${this.pagination.page} de ${this.pagination.pages} (${this.pagination.total} productos total)`);
    console.log(`📦 Mostrando ${this.existingProducts.length} productos de ${this.pagination.limit} por página`);
    
    // Mostrar filtros activos
    await this.showCurrentFilters();

    // Mostrar productos
    console.log('\n📋 PRODUCTOS:');
    for (let i = 0; i < this.existingProducts.length; i++) {
      const product = this.existingProducts[i];
      await this.displayProductSummary(product, i + 1);
    }

    // Mostrar opciones de navegación
    await this.showPaginationOptions();
  }

  // ✅ MOSTRAR RESUMEN DE PRODUCTO
  async displayProductSummary(product, index) {
    const discountPercent = product.discountPercentage || 0;
    const stockStatus = this.getStockStatus(product);
    const categoryName = product.category?.name || 'Sin categoría';
    const brandName = product.brand?.name || 'Sin marca';
    
    console.log(`\n   ${index}. "${product.name}"`);
    console.log(`      🆔 ID: ${product.id} | 🏷️ SKU: ${product.sku}`);
    console.log(`      💰 Precio: $${product.price}${product.originalPrice ? ` (Antes: $${product.originalPrice}, -${discountPercent}%)` : ''}`);
    console.log(`      📦 Stock: ${product.stockQuantity} unidades ${stockStatus.icon} ${stockStatus.text}`);
    console.log(`      📂 Categoría: ${categoryName} | 🏷️ Marca: ${brandName}`);
    console.log(`      ⭐ Destacado: ${product.isFeatured ? 'Sí' : 'No'} | 🔄 Estado: ${product.isActive ? 'Activo' : 'Inactivo'}`);
    
    // Mostrar información de imágenes si existe
    if (product.images && product.images.length > 0) {
      const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];
      const imageUrl = primaryImage.imageUrl;
      const isCloudinary = imageUrl.includes('cloudinary.com');
      console.log(`      🖼️ Imágenes: ${product.images.length} (${isCloudinary ? '☁️ Cloudinary' : '🔗 Externa'})`);
    } else {
      console.log(`      🖼️ Imágenes: Sin imágenes`);
    }
    
    if (product.description && product.description.length > 0) {
      const shortDesc = product.description.length > 100 ? 
        product.description.substring(0, 100) + '...' : 
        product.description;
      console.log(`      📝 Descripción: ${shortDesc}`);
    }
  }

  // ✅ ESTADO DE STOCK
  getStockStatus(product) {
    if (product.stockQuantity === 0) {
      return { icon: '🔴', text: '(Sin stock)' };
    } else if (product.lowStock || product.stockQuantity <= (product.minStock || 5)) {
      return { icon: '🟡', text: '(Stock bajo)' };
    } else {
      return { icon: '🟢', text: '(Stock OK)' };
    }
  }

  // ✅ MOSTRAR FILTROS ACTUALES
  async showCurrentFilters() {
    const activeFilters = [];
    
    if (this.currentFilters.search) activeFilters.push(`Buscar: "${this.currentFilters.search}"`);
    if (this.currentFilters.category) {
      const categoryName = this.existingCategories.find(c => c.id == this.currentFilters.category)?.name || this.currentFilters.category;
      activeFilters.push(`Categoría: ${categoryName}`);
    }
    if (this.currentFilters.brand) {
      const brandName = this.existingBrands.find(b => b.id == this.currentFilters.brand)?.name || this.currentFilters.brand;
      activeFilters.push(`Marca: ${brandName}`);
    }
    if (this.currentFilters.status !== 'all') activeFilters.push(`Estado: ${this.currentFilters.status === 'active' ? 'Activos' : 'Inactivos'}`);
    if (this.currentFilters.featured) activeFilters.push(`Destacados: ${this.currentFilters.featured}`);
    if (this.currentFilters.lowStock) activeFilters.push(`Stock bajo: Sí`);
    
    activeFilters.push(`Orden: ${this.currentFilters.sortBy} ${this.currentFilters.sortOrder}`);
    
    console.log(`\n🔍 FILTROS ACTIVOS: ${activeFilters.length > 1 ? activeFilters.join(' | ') : 'Sin filtros'}`);
  }

  // ✅ OPCIONES DE PAGINACIÓN
  async showPaginationOptions() {
    console.log('\n📄 NAVEGACIÓN:');
    const options = [];
    
    if (this.pagination.page > 1) options.push('p = Página anterior');
    if (this.pagination.page < this.pagination.pages) options.push('n = Página siguiente');
    options.push('g = Ir a página específica');
    options.push('l = Cambiar límite por página');
    options.push('Enter = Volver al menú');
    
    console.log(`   ${options.join(' | ')}`);
    
    const choice = await this.askQuestion('\n📄 Navegación: ');
    
    switch (choice.toLowerCase().trim()) {
      case 'p':
        if (this.pagination.page > 1) {
          this.currentPage = this.pagination.page - 1;
          await this.loadProducts();
          await this.showAllProducts();
        } else {
          console.log('❌ Ya estás en la primera página');
          await this.askQuestion('\n⏎ Presiona Enter para continuar...');
        }
        break;
      case 'n':
        if (this.pagination.page < this.pagination.pages) {
          this.currentPage = this.pagination.page + 1;
          await this.loadProducts();
          await this.showAllProducts();
        } else {
          console.log('❌ Ya estás en la última página');
          await this.askQuestion('\n⏎ Presiona Enter para continuar...');
        }
        break;
      case 'g':
        const pageInput = await this.askQuestion(`📄 Ir a página (1-${this.pagination.pages}): `);
        const pageNumber = parseInt(pageInput);
        if (pageNumber >= 1 && pageNumber <= this.pagination.pages) {
          this.currentPage = pageNumber;
          await this.loadProducts();
          await this.showAllProducts();
        } else {
          console.log(`❌ Página inválida. Debe estar entre 1 y ${this.pagination.pages}`);
          await this.askQuestion('\n⏎ Presiona Enter para continuar...');
        }
        break;
      case 'l':
        const limitInput = await this.askQuestion('📦 Productos por página (5-50): ');
        const limitNumber = parseInt(limitInput);
        if (limitNumber >= 5 && limitNumber <= 50) {
          this.currentLimit = limitNumber;
          this.currentPage = 1; // Resetear a primera página
          await this.loadProducts();
          await this.showAllProducts();
        } else {
          console.log('❌ Límite inválido. Debe estar entre 5 y 50');
          await this.askQuestion('\n⏎ Presiona Enter para continuar...');
        }
        break;
      case '':
        // Volver al menú principal
        break;
      default:
        await this.askQuestion('\n⏎ Presiona Enter para continuar...');
    }
  }

  // ✅ BUSCAR Y FILTRAR PRODUCTOS
  async searchAndFilterProducts() {
    console.log('\n🔍 BÚSQUEDA Y FILTROS DE PRODUCTOS');
    console.log('=' .repeat(60));
    
    console.log('📋 Filtros disponibles:');
    console.log('1. Buscar por nombre/descripción/SKU');
    console.log('2. Filtrar por categoría');
    console.log('3. Filtrar por marca');
    console.log('4. Filtrar por estado (activo/inactivo)');
    console.log('5. Solo productos destacados');
    console.log('6. Solo productos con stock bajo');
    console.log('7. Cambiar ordenamiento');
    console.log('8. Limpiar todos los filtros');
    console.log('9. Aplicar filtros y ver resultados');
    console.log('0. Volver al menú principal');
    
    const choice = await this.askQuestion('\n🔍 Selecciona una opción (0-9): ');
    
    switch (choice.trim()) {
      case '1':
        const searchTerm = await this.askQuestion('🔍 Buscar (nombre/descripción/SKU): ');
        this.currentFilters.search = searchTerm.trim();
        console.log(`✅ Búsqueda establecida: "${this.currentFilters.search}"`);
        break;
        
      case '2':
        await this.selectCategory();
        break;
        
      case '3':
        await this.selectBrand();
        break;
        
      case '4':
        await this.selectStatus();
        break;
        
      case '5':
        const featuredChoice = await this.askQuestion('⭐ Solo destacados? (s/n): ');
        this.currentFilters.featured = featuredChoice.toLowerCase() === 's' ? 'true' : '';
        console.log(`✅ Filtro destacados: ${this.currentFilters.featured ? 'Activado' : 'Desactivado'}`);
        break;
        
      case '6':
        const lowStockChoice = await this.askQuestion('📉 Solo stock bajo? (s/n): ');
        this.currentFilters.lowStock = lowStockChoice.toLowerCase() === 's';
        console.log(`✅ Filtro stock bajo: ${this.currentFilters.lowStock ? 'Activado' : 'Desactivado'}`);
        break;
        
      case '7':
        await this.selectSorting();
        break;
        
      case '8':
        this.clearAllFilters();
        console.log('✅ Todos los filtros han sido limpiados');
        break;
        
      case '9':
        this.currentPage = 1; // Resetear paginación
        await this.loadProducts();
        await this.showAllProducts();
        return;
        
      case '0':
        return;
        
      default:
        console.log('❌ Opción inválida');
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
    await this.searchAndFilterProducts();
  }

  // ✅ SELECCIONAR CATEGORÍA
  async selectCategory() {
    console.log('\n📂 SELECCIONAR CATEGORÍA:');
    console.log('0. Todas las categorías');
    
    const activeCategories = this.existingCategories.filter(c => c.isActive);
    activeCategories.forEach((category, index) => {
      console.log(`${index + 1}. ${category.name} (${category.productCount || 0} productos)`);
    });
    
    const choice = await this.askQuestion('\n📂 Selecciona categoría: ');
    const choiceNum = parseInt(choice);
    
    if (choiceNum === 0) {
      this.currentFilters.category = '';
      console.log('✅ Filtro de categoría removido');
    } else if (choiceNum >= 1 && choiceNum <= activeCategories.length) {
      const selectedCategory = activeCategories[choiceNum - 1];
      this.currentFilters.category = selectedCategory.id;
      console.log(`✅ Categoría seleccionada: ${selectedCategory.name}`);
    } else {
      console.log('❌ Selección inválida');
    }
  }

  // ✅ SELECCIONAR MARCA
  async selectBrand() {
    console.log('\n🏷️ SELECCIONAR MARCA:');
    console.log('0. Todas las marcas');
    
    const activeBrands = this.existingBrands.filter(b => b.isActive);
    activeBrands.forEach((brand, index) => {
      console.log(`${index + 1}. ${brand.name} (${brand.productCount || 0} productos)`);
    });
    
    const choice = await this.askQuestion('\n🏷️ Selecciona marca: ');
    const choiceNum = parseInt(choice);
    
    if (choiceNum === 0) {
      this.currentFilters.brand = '';
      console.log('✅ Filtro de marca removido');
    } else if (choiceNum >= 1 && choiceNum <= activeBrands.length) {
      const selectedBrand = activeBrands[choiceNum - 1];
      this.currentFilters.brand = selectedBrand.id;
      console.log(`✅ Marca seleccionada: ${selectedBrand.name}`);
    } else {
      console.log('❌ Selección inválida');
    }
  }

  // ✅ SELECCIONAR ESTADO
  async selectStatus() {
    console.log('\n🔄 SELECCIONAR ESTADO:');
    console.log('1. Todos los productos');
    console.log('2. Solo activos');
    console.log('3. Solo inactivos');
    
    const choice = await this.askQuestion('\n🔄 Selecciona estado: ');
    
    switch (choice.trim()) {
      case '1':
        this.currentFilters.status = 'all';
        console.log('✅ Estado: Todos los productos');
        break;
      case '2':
        this.currentFilters.status = 'active';
        console.log('✅ Estado: Solo activos');
        break;
      case '3':
        this.currentFilters.status = 'inactive';
        console.log('✅ Estado: Solo inactivos');
        break;
      default:
        console.log('❌ Selección inválida');
    }
  }

  // ✅ SELECCIONAR ORDENAMIENTO
  async selectSorting() {
    console.log('\n📊 ORDENAMIENTO:');
    console.log('1. Nombre (A-Z)');
    console.log('2. Nombre (Z-A)');
    console.log('3. Precio (menor a mayor)');
    console.log('4. Precio (mayor a menor)');
    console.log('5. Stock (menor a mayor)');
    console.log('6. Stock (mayor a menor)');
    console.log('7. Fecha creación (más recientes)');
    console.log('8. Fecha creación (más antiguos)');
    console.log('9. Rating (mayor a menor)');
    
    const choice = await this.askQuestion('\n📊 Selecciona ordenamiento: ');
    
    switch (choice.trim()) {
      case '1':
        this.currentFilters.sortBy = 'name';
        this.currentFilters.sortOrder = 'ASC';
        break;
      case '2':
        this.currentFilters.sortBy = 'name';
        this.currentFilters.sortOrder = 'DESC';
        break;
      case '3':
        this.currentFilters.sortBy = 'price';
        this.currentFilters.sortOrder = 'ASC';
        break;
      case '4':
        this.currentFilters.sortBy = 'price';
        this.currentFilters.sortOrder = 'DESC';
        break;
      case '5':
        this.currentFilters.sortBy = 'stockQuantity';
        this.currentFilters.sortOrder = 'ASC';
        break;
      case '6':
        this.currentFilters.sortBy = 'stockQuantity';
        this.currentFilters.sortOrder = 'DESC';
        break;
      case '7':
        this.currentFilters.sortBy = 'createdAt';
        this.currentFilters.sortOrder = 'DESC';
        break;
      case '8':
        this.currentFilters.sortBy = 'createdAt';
        this.currentFilters.sortOrder = 'ASC';
        break;
      case '9':
        this.currentFilters.sortBy = 'rating';
        this.currentFilters.sortOrder = 'DESC';
        break;
      default:
        console.log('❌ Selección inválida');
        return;
    }
    
    console.log(`✅ Ordenamiento: ${this.currentFilters.sortBy} ${this.currentFilters.sortOrder}`);
  }

  // ✅ LIMPIAR FILTROS
  clearAllFilters() {
    this.currentFilters = {
      search: '',
      category: '',
      brand: '',
      status: 'all',
      featured: '',
      lowStock: false,
      sortBy: 'name',
      sortOrder: 'ASC'
    };
    this.currentPage = 1;
  }

  // ✅ VER DETALLES DE PRODUCTO ESPECÍFICO
  async showProductDetails() {
    if (this.existingProducts.length === 0) {
      console.log('❌ No hay productos cargados. Carga productos primero.');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const productInput = await this.askQuestion('🆔 ID del producto o número de lista (o "buscar" para buscar): ');
    
    if (productInput.toLowerCase() === 'buscar') {
      const searchTerm = await this.askQuestion('🔍 Buscar producto: ');
      const foundProducts = this.existingProducts.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      if (foundProducts.length === 0) {
        console.log('❌ No se encontraron productos');
        await this.askQuestion('\n⏎ Presiona Enter para continuar...');
        return;
      }
      
      console.log('\n🔍 PRODUCTOS ENCONTRADOS:');
      foundProducts.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name} (ID: ${product.id}, SKU: ${product.sku})`);
      });
      
      const selection = await this.askQuestion('\nSelecciona número: ');
      const selectionNum = parseInt(selection);
      
      if (selectionNum >= 1 && selectionNum <= foundProducts.length) {
        await this.displayProductDetails(foundProducts[selectionNum - 1]);
      } else {
        console.log('❌ Selección inválida');
      }
    } else {
      const productNum = parseInt(productInput);
      let product;
      
      if (productNum >= 1 && productNum <= this.existingProducts.length) {
        // Es un número de lista
        product = this.existingProducts[productNum - 1];
      } else {
        // Buscar por ID
        try {
          const response = await axios.get(`${this.baseURL}/api/store/management/products/${productInput}`, {
            headers: { 'Authorization': `Bearer ${this.adminToken}` }
          });
          if (response.data.success) {
            product = response.data.data.product;
          }
        } catch (error) {
          console.log(`❌ No se encontró producto con ID: ${productInput}`);
          await this.askQuestion('\n⏎ Presiona Enter para continuar...');
          return;
        }
      }
      
      if (product) {
        await this.displayProductDetails(product);
      }
    }
  }

  // ✅ MOSTRAR DETALLES COMPLETOS DE PRODUCTO
  async displayProductDetails(product) {
    console.log('\n📦 DETALLES COMPLETOS DEL PRODUCTO');
    console.log('=' .repeat(80));
    
    const discountPercent = product.discountPercentage || 0;
    const stockStatus = this.getStockStatus(product);
    
    // Información básica
    console.log(`📦 INFORMACIÓN BÁSICA:`);
    console.log(`   🆔 ID: ${product.id}`);
    console.log(`   📛 Nombre: ${product.name}`);
    console.log(`   🏷️ SKU: ${product.sku}`);
    console.log(`   🔄 Estado: ${product.isActive ? '✅ Activo' : '❌ Inactivo'}`);
    console.log(`   ⭐ Destacado: ${product.isFeatured ? 'Sí' : 'No'}`);
    
    // Precios y descuentos
    console.log(`\n💰 PRECIOS:`);
    console.log(`   💵 Precio actual: $${product.price}`);
    if (product.originalPrice) {
      console.log(`   💸 Precio original: $${product.originalPrice}`);
      console.log(`   🎯 Descuento: ${discountPercent}%`);
      console.log(`   💰 Ahorro: $${(product.originalPrice - product.price).toFixed(2)}`);
    }
    
    // Stock e inventario
    console.log(`\n📦 INVENTARIO:`);
    console.log(`   📊 Stock actual: ${product.stockQuantity} unidades ${stockStatus.icon}`);
    console.log(`   ⚠️ Stock mínimo: ${product.minStock || 5} unidades`);
    console.log(`   📈 Estado: ${stockStatus.text}`);
    if (product.weight) {
      console.log(`   ⚖️ Peso: ${product.weight} kg`);
    }
    if (product.dimensions) {
      const dim = product.dimensions;
      console.log(`   📏 Dimensiones: ${dim.length || 'N/A'} x ${dim.width || 'N/A'} x ${dim.height || 'N/A'} ${dim.unit || 'cm'}`);
    }
    
    // Categoría y marca
    console.log(`\n🏷️ CLASIFICACIÓN:`);
    console.log(`   📂 Categoría: ${product.category?.name || 'Sin categoría'}`);
    console.log(`   🏷️ Marca: ${product.brand?.name || 'Sin marca'}`);
    
    // Rating y reseñas
    console.log(`\n⭐ CALIFICACIONES:`);
    console.log(`   ⭐ Rating: ${product.rating || 0}/5.0`);
    console.log(`   📝 Reseñas: ${product.reviewsCount || 0} reseñas`);
    
    // Opciones de entrega
    console.log(`\n🚚 OPCIONES DE ENTREGA:`);
    console.log(`   💳 Pago online: ${product.allowOnlinePayment ? '✅ Sí' : '❌ No'}`);
    console.log(`   💳 Pago con tarjeta: ${product.allowCardPayment ? '✅ Sí' : '❌ No'}`);
    console.log(`   💵 Pago contraentrega: ${product.allowCashOnDelivery ? '✅ Sí' : '❌ No'}`);
    console.log(`   ⏰ Tiempo de entrega: ${product.deliveryTime || '1-2 días hábiles'}`);
    
    // Descripción
    if (product.description) {
      console.log(`\n📝 DESCRIPCIÓN:`);
      console.log(`   ${product.description}`);
    }
    
    // Fechas
    console.log(`\n📅 FECHAS:`);
    console.log(`   📅 Creado: ${new Date(product.createdAt).toLocaleString()}`);
    console.log(`   🔄 Actualizado: ${new Date(product.updatedAt).toLocaleString()}`);
    
    // Cargar y mostrar imágenes
    await this.loadAndDisplayProductImages(product.id);
    
    // Opciones de acción
    console.log(`\n🔧 ACCIONES DISPONIBLES:`);
    console.log(`   1. 📊 Ver estadísticas de stock`);
    console.log(`   2. 🖼️ Ver todas las imágenes`);
    console.log(`   3. 🔄 Actualizar stock`);
    console.log(`   4. ⭐ Cambiar estado destacado`);
    console.log(`   5. 🔄 Cambiar estado activo/inactivo`);
    console.log(`   6. 📝 Ver datos completos para edición`);
    console.log(`   0. Volver`);
    
    const action = await this.askQuestion('\n🔧 Selecciona acción (0-6): ');
    
    switch (action.trim()) {
      case '1':
        await this.showStockStats(product);
        break;
      case '2':
        await this.showProductImageDetails(product.id);
        break;
      case '3':
        await this.updateProductStock(product);
        break;
      case '4':
        await this.toggleFeaturedStatus(product);
        break;
      case '5':
        await this.toggleActiveStatus(product);
        break;
      case '6':
        await this.showEditableData(product);
        break;
      case '0':
        return;
      default:
        console.log('❌ Acción inválida');
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ CARGAR Y MOSTRAR IMÁGENES DE PRODUCTO
  async loadAndDisplayProductImages(productId) {
    try {
      const response = await axios.get(`${this.baseURL}/api/store/management/products/${productId}/images`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });
      
      if (response.data.success && response.data.data.images.length > 0) {
        const images = response.data.data.images;
        console.log(`\n🖼️ IMÁGENES (${images.length}):`);
        
        images.forEach((image, index) => {
          const isCloudinary = image.imageUrl.includes('cloudinary.com');
          console.log(`   ${index + 1}. ${image.isPrimary ? '⭐ PRINCIPAL' : '📸 Secundaria'}`);
          console.log(`      🆔 ID: ${image.id}`);
          console.log(`      🔗 URL: ${image.imageUrl.substring(0, 60)}${image.imageUrl.length > 60 ? '...' : ''}`);
          console.log(`      📍 Fuente: ${isCloudinary ? '☁️ Cloudinary CDN' : '🔗 Externa'}`);
          console.log(`      📝 Alt text: ${image.altText || 'Sin descripción'}`);
          console.log(`      📊 Orden: ${image.displayOrder || 0}`);
        });
      } else {
        console.log(`\n🖼️ IMÁGENES: Sin imágenes`);
      }
    } catch (error) {
      console.log(`\n🖼️ IMÁGENES: Error cargando imágenes (${error.message})`);
    }
  }

  // ✅ MOSTRAR DATOS EDITABLES
  async showEditableData(product) {
    console.log('\n📝 DATOS COMPLETOS PARA EDICIÓN');
    console.log('=' .repeat(60));
    console.log('// Copia estos datos para editar el producto\n');
    
    const editableData = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: parseFloat(product.price),
      originalPrice: product.originalPrice ? parseFloat(product.originalPrice) : null,
      sku: product.sku,
      stockQuantity: product.stockQuantity,
      minStock: product.minStock,
      categoryId: product.category?.id,
      brandId: product.brand?.id,
      isFeatured: product.isFeatured,
      isActive: product.isActive,
      weight: product.weight,
      dimensions: product.dimensions,
      allowOnlinePayment: product.allowOnlinePayment,
      allowCardPayment: product.allowCardPayment,
      allowCashOnDelivery: product.allowCashOnDelivery,
      deliveryTime: product.deliveryTime,
      rating: product.rating,
      reviewsCount: product.reviewsCount
    };
    
    console.log('const productData = ' + JSON.stringify(editableData, null, 2) + ';');
    
    console.log('\n📋 INFORMACIÓN ADICIONAL:');
    console.log(`Categoría actual: ${product.category?.name || 'Sin categoría'} (ID: ${product.category?.id || 'N/A'})`);
    console.log(`Marca actual: ${product.brand?.name || 'Sin marca'} (ID: ${product.brand?.id || 'N/A'})`);
    console.log(`Creado: ${new Date(product.createdAt).toLocaleString()}`);
    console.log(`Actualizado: ${new Date(product.updatedAt).toLocaleString()}`);
    
    console.log('\n🔧 ENDPOINT PARA ACTUALIZAR:');
    console.log(`PUT ${this.baseURL}/api/store/management/products/${product.id}`);
    console.log('Headers: Authorization: Bearer [TOKEN]');
    console.log('Content-Type: application/json');
  }

  // ✅ ESTADÍSTICAS DE PRODUCTOS
  async showProductStats() {
    console.log('\n📊 ESTADÍSTICAS DE PRODUCTOS');
    console.log('=' .repeat(60));
    
    try {
      const response = await axios.get(`${this.baseURL}/api/store/management/products/stats`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });
      
      if (response.data.success) {
        const stats = response.data.data;
        
        console.log('📊 RESUMEN GENERAL:');
        console.log(`   📦 Total productos: ${stats.totalProducts}`);
        console.log(`   ✅ Productos activos: ${stats.activeProducts}`);
        console.log(`   ⭐ Productos destacados: ${stats.featuredProducts}`);
        console.log(`   🔴 Sin stock: ${stats.outOfStock}`);
        console.log(`   🟡 Stock bajo: ${stats.lowStock}`);
        console.log(`   📊 Stock total: ${stats.totalStock} unidades`);
        console.log(`   💰 Precio promedio: $${stats.averagePrice.toFixed(2)}`);
        
        // Calcular porcentajes
        const activePercent = stats.totalProducts > 0 ? ((stats.activeProducts / stats.totalProducts) * 100).toFixed(1) : 0;
        const featuredPercent = stats.totalProducts > 0 ? ((stats.featuredProducts / stats.totalProducts) * 100).toFixed(1) : 0;
        const outOfStockPercent = stats.totalProducts > 0 ? ((stats.outOfStock / stats.totalProducts) * 100).toFixed(1) : 0;
        
        console.log('\n📈 PORCENTAJES:');
        console.log(`   ✅ Productos activos: ${activePercent}%`);
        console.log(`   ⭐ Productos destacados: ${featuredPercent}%`);
        console.log(`   🔴 Sin stock: ${outOfStockPercent}%`);
        
        // Valor total del inventario
        const inventoryValue = stats.totalStock * stats.averagePrice;
        console.log(`\n💰 VALOR TOTAL DEL INVENTARIO: $${inventoryValue.toFixed(2)}`);
        
      } else {
        console.log('❌ No se pudieron obtener las estadísticas');
      }
    } catch (error) {
      console.error(`❌ Error obteniendo estadísticas: ${error.message}`);
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ PRODUCTOS CON POCO STOCK
  async showLowStockProducts() {
    console.log('\n📉 PRODUCTOS CON POCO STOCK');
    console.log('=' .repeat(60));
    
    try {
      const response = await axios.get(`${this.baseURL}/api/store/management/products/low-stock`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });
      
      if (response.data.success && response.data.data.products.length > 0) {
        const lowStockProducts = response.data.data.products;
        
        console.log(`⚠️ ${lowStockProducts.length} productos con stock bajo:\n`);
        
        lowStockProducts.forEach((product, index) => {
          const urgency = product.stockQuantity === 0 ? '🔴 SIN STOCK' : 
                         product.stockQuantity <= 2 ? '🟠 CRÍTICO' : 
                         '🟡 BAJO';
          
          console.log(`   ${index + 1}. ${product.name}`);
          console.log(`      📦 Stock: ${product.stockQuantity}/${product.minStock} ${urgency}`);
          console.log(`      🏷️ SKU: ${product.sku}`);
          console.log(`      💰 Precio: $${product.price}`);
          console.log(`      📂 ${product.category?.name || 'Sin categoría'} | 🏷️ ${product.brand?.name || 'Sin marca'}`);
          
          if (product.stockQuantity === 0) {
            console.log(`      🚫 PRODUCTO FUERA DE STOCK - REQUIERE REPOSICIÓN INMEDIATA`);
          }
          console.log('');
        });
        
        // Resumen de urgencia
        const outOfStock = lowStockProducts.filter(p => p.stockQuantity === 0).length;
        const critical = lowStockProducts.filter(p => p.stockQuantity > 0 && p.stockQuantity <= 2).length;
        
        console.log('📊 RESUMEN DE URGENCIA:');
        console.log(`   🔴 Sin stock: ${outOfStock} productos`);
        console.log(`   🟠 Crítico (≤2): ${critical} productos`);
        console.log(`   🟡 Bajo stock: ${lowStockProducts.length - outOfStock - critical} productos`);
        
        // Opción de gestión de stock
        const manageChoice = await this.askQuestion('\n📦 ¿Gestionar stock de algún producto? (s/n): ');
        if (manageChoice.toLowerCase() === 's') {
          const productChoice = await this.askQuestion('📦 Número de producto a gestionar: ');
          const productIndex = parseInt(productChoice) - 1;
          
          if (productIndex >= 0 && productIndex < lowStockProducts.length) {
            await this.updateProductStock(lowStockProducts[productIndex]);
          } else {
            console.log('❌ Número de producto inválido');
          }
        }
        
      } else {
        console.log('✅ No hay productos con stock bajo');
      }
    } catch (error) {
      console.error(`❌ Error obteniendo productos con stock bajo: ${error.message}`);
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ GESTIONAR STOCK
  async manageStock() {
    console.log('\n📦 GESTIÓN DE STOCK');
    console.log('=' .repeat(50));
    console.log('1. Ver productos con stock bajo');
    console.log('2. Actualizar stock de producto específico');
    console.log('3. Actualización masiva de stock');
    console.log('4. Historial de movimientos de stock');
    console.log('0. Volver');
    
    const choice = await this.askQuestion('\n📦 Selecciona opción: ');
    
    switch (choice.trim()) {
      case '1':
        await this.showLowStockProducts();
        break;
      case '2':
        await this.updateSingleProductStock();
        break;
      case '3':
        console.log('⚠️ Función de actualización masiva no implementada en esta versión');
        await this.askQuestion('\n⏎ Presiona Enter para continuar...');
        break;
      case '4':
        console.log('⚠️ Historial de movimientos no implementado en esta versión');
        await this.askQuestion('\n⏎ Presiona Enter para continuar...');
        break;
      case '0':
        return;
      default:
        console.log('❌ Opción inválida');
        await this.askQuestion('\n⏎ Presiona Enter para continuar...');
    }
  }

  // ✅ ACTUALIZAR STOCK DE PRODUCTO INDIVIDUAL
  async updateSingleProductStock() {
    const productInput = await this.askQuestion('🆔 ID del producto o SKU: ');
    
    // Buscar producto
    let product = this.existingProducts.find(p => 
      p.id.toString() === productInput || 
      p.sku.toLowerCase() === productInput.toLowerCase()
    );
    
    if (!product) {
      console.log('❌ Producto no encontrado');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }
    
    await this.updateProductStock(product);
  }

  // ✅ ACTUALIZAR STOCK DE PRODUCTO
  async updateProductStock(product) {
    console.log(`\n📦 GESTIÓN DE STOCK: ${product.name}`);
    console.log('=' .repeat(60));
    console.log(`📊 Stock actual: ${product.stockQuantity} unidades`);
    console.log(`⚠️ Stock mínimo: ${product.minStock || 5} unidades`);
    console.log(`🏷️ SKU: ${product.sku}`);
    
    console.log('\n📋 Operaciones disponibles:');
    console.log('1. Establecer cantidad exacta');
    console.log('2. Agregar stock (recepción)');
    console.log('3. Reducir stock (venta/pérdida)');
    console.log('0. Cancelar');
    
    const operation = await this.askQuestion('\n📋 Selecciona operación: ');
    
    let newQuantity, operationType, reason;
    
    switch (operation.trim()) {
      case '1':
        newQuantity = await this.askQuestion('📦 Nueva cantidad total: ');
        operationType = 'set';
        reason = 'Ajuste manual de inventario';
        break;
      case '2':
        const addAmount = await this.askQuestion('➕ Cantidad a agregar: ');
        newQuantity = addAmount;
        operationType = 'add';
        reason = await this.askQuestion('📝 Razón (opcional): ') || 'Recepción de inventario';
        break;
      case '3':
        const subtractAmount = await this.askQuestion('➖ Cantidad a reducir: ');
        newQuantity = subtractAmount;
        operationType = 'subtract';
        reason = await this.askQuestion('📝 Razón (opcional): ') || 'Venta o ajuste';
        break;
      case '0':
        return;
      default:
        console.log('❌ Operación inválida');
        return;
    }
    
    const quantity = parseInt(newQuantity);
    if (isNaN(quantity) || quantity < 0) {
      console.log('❌ Cantidad inválida');
      return;
    }
    
    // Confirmar cambio
    let newTotal;
    switch (operationType) {
      case 'set':
        newTotal = quantity;
        break;
      case 'add':
        newTotal = product.stockQuantity + quantity;
        break;
      case 'subtract':
        newTotal = product.stockQuantity - quantity;
        break;
    }
    
    console.log(`\n📊 CONFIRMACIÓN:`);
    console.log(`   Stock actual: ${product.stockQuantity}`);
    console.log(`   Operación: ${operationType} ${quantity}`);
    console.log(`   Stock resultante: ${newTotal}`);
    console.log(`   Razón: ${reason}`);
    
    const confirm = await this.askQuestion('\n✅ ¿Confirmar cambio? (s/n): ');
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Operación cancelada');
      return;
    }
    
    try {
      const response = await axios.put(
        `${this.baseURL}/api/store/management/products/${product.id}/stock`,
        {
          stockQuantity: quantity,
          operation: operationType,
          reason: reason
        },
        {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }
      );
      
      if (response.data.success) {
        console.log('\n✅ Stock actualizado exitosamente');
        console.log(`📊 Stock anterior: ${response.data.data.product.oldStock}`);
        console.log(`📊 Stock nuevo: ${response.data.data.product.newStock}`);
        
        // Actualizar en la lista local
        const localProduct = this.existingProducts.find(p => p.id === product.id);
        if (localProduct) {
          localProduct.stockQuantity = response.data.data.product.newStock;
        }
      } else {
        console.log('❌ Error actualizando stock');
      }
    } catch (error) {
      console.error(`❌ Error actualizando stock: ${error.response?.data?.message || error.message}`);
    }
  }

  // ✅ RECARGAR DATOS
  async reloadData() {
    console.log('\n🔄 RECARGANDO TODOS LOS DATOS...');
    try {
      await this.loadAllData();
      console.log('✅ Todos los datos recargados exitosamente');
    } catch (error) {
      console.log(`❌ Error recargando datos: ${error.message}`);
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ MÉTODOS AUXILIARES

  askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  // Métodos adicionales para completar funcionalidades...
  async showFeaturedProducts() {
    console.log('\n⭐ PRODUCTOS DESTACADOS');
    console.log('=' .repeat(50));
    
    const oldFilters = { ...this.currentFilters };
    this.currentFilters.featured = 'true';
    this.currentPage = 1;
    
    await this.loadProducts();
    await this.showAllProducts();
    
    // Restaurar filtros
    this.currentFilters = oldFilters;
  }

  async showProductsByCategory() {
    console.log('\n📂 PRODUCTOS POR CATEGORÍA');
    console.log('=' .repeat(50));
    
    await this.selectCategory();
    if (this.currentFilters.category) {
      this.currentPage = 1;
      await this.loadProducts();
      await this.showAllProducts();
    }
  }

  async showProductsByBrand() {
    console.log('\n🏷️ PRODUCTOS POR MARCA');
    console.log('=' .repeat(50));
    
    await this.selectBrand();
    if (this.currentFilters.brand) {
      this.currentPage = 1;
      await this.loadProducts();
      await this.showAllProducts();
    }
  }

  async showProductImages() {
    if (this.existingProducts.length === 0) {
      console.log('❌ No hay productos cargados');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    console.log('\n🖼️ IMÁGENES DE PRODUCTOS');
    console.log('=' .repeat(50));
    
    for (let i = 0; i < this.existingProducts.length && i < 10; i++) {
      const product = this.existingProducts[i];
      console.log(`\n${i + 1}. ${product.name}`);
      
      if (product.images && product.images.length > 0) {
        product.images.forEach((image, imgIndex) => {
          const isCloudinary = image.imageUrl.includes('cloudinary.com');
          console.log(`   📸 ${imgIndex + 1}. ${image.isPrimary ? '⭐' : '📷'} ${isCloudinary ? '☁️' : '🔗'} ${image.imageUrl.substring(0, 60)}...`);
        });
      } else {
        console.log('   🖼️ Sin imágenes');
      }
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async configureFilters() {
    console.log('\n⚙️ CONFIGURACIÓN DE FILTROS Y PAGINACIÓN');
    console.log('=' .repeat(60));
    console.log(`📄 Página actual: ${this.currentPage}`);
    console.log(`📦 Productos por página: ${this.currentLimit}`);
    console.log(`📊 Orden: ${this.currentFilters.sortBy} ${this.currentFilters.sortOrder}`);
    
    await this.showCurrentFilters();
    
    console.log('\n⚙️ Opciones:');
    console.log('1. Cambiar productos por página');
    console.log('2. Cambiar ordenamiento');
    console.log('3. Limpiar todos los filtros');
    console.log('4. Resetear paginación');
    console.log('0. Volver');
    
    const choice = await this.askQuestion('\n⚙️ Selecciona opción: ');
    
    switch (choice.trim()) {
      case '1':
        const newLimit = await this.askQuestion('📦 Productos por página (5-50): ');
        const limitNum = parseInt(newLimit);
        if (limitNum >= 5 && limitNum <= 50) {
          this.currentLimit = limitNum;
          this.currentPage = 1;
          console.log(`✅ Límite cambiado a ${limitNum} productos por página`);
        } else {
          console.log('❌ Límite inválido');
        }
        break;
      case '2':
        await this.selectSorting();
        break;
      case '3':
        this.clearAllFilters();
        console.log('✅ Todos los filtros limpiados');
        break;
      case '4':
        this.currentPage = 1;
        console.log('✅ Paginación reseteada');
        break;
      case '0':
        return;
      default:
        console.log('❌ Opción inválida');
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }
}

// ✅ FUNCIÓN DE AYUDA
function showHelp() {
  console.log('\n🛒 Elite Fitness Club - Gestor Completo de Productos v1.0\n');
  
  console.log('🎯 CARACTERÍSTICAS:');
  console.log('  📦 Lista completa de productos con paginación');
  console.log('  🔍 Búsqueda y filtros avanzados');
  console.log('  📊 Información detallada de stock y precios');
  console.log('  🖼️ Gestión de imágenes (Cloudinary)');
  console.log('  📈 Estadísticas y reportes');
  console.log('  🔧 Herramientas de edición y gestión\n');
  
  console.log('📋 FUNCIONALIDADES:');
  console.log('  ✅ Ver productos con filtros (categoría, marca, estado)');
  console.log('  ✅ Paginación inteligente');
  console.log('  ✅ Detalles completos para edición');
  console.log('  ✅ Gestión de stock individual');
  console.log('  ✅ Productos con stock bajo');
  console.log('  ✅ Estadísticas completas');
  console.log('  ✅ Información de imágenes\n');
  
  console.log('🔍 FILTROS DISPONIBLES:');
  console.log('  📂 Por categoría');
  console.log('  🏷️ Por marca');
  console.log('  ⭐ Solo destacados');
  console.log('  📉 Stock bajo');
  console.log('  🔄 Estado (activo/inactivo)');
  console.log('  📊 Múltiples ordenamientos\n');
  
  console.log('🚀 USO:');
  console.log('  node test-products-manager.js        # Gestor interactivo');
  console.log('  node test-products-manager.js --help # Esta ayuda\n');
  
  console.log('📋 REQUISITOS:');
  console.log('  • Servidor corriendo en puerto 5000');
  console.log('  • Usuario admin: admin@gym.com / Admin123!');
  console.log('  • Productos existentes en la base de datos\n');
  
  console.log('💡 El gestor te permite ver, filtrar y gestionar todos los');
  console.log('   productos de la tienda de forma interactiva y detallada');
}

// ✅ FUNCIÓN PRINCIPAL
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const manager = new ProductsManager();
  await manager.start();
}

// ✅ EJECUTAR
if (require.main === module) {
  main().catch(error => {
    console.error('\n🚨 ERROR CRÍTICO:', error.message);
    process.exit(1);
  });
}

module.exports = { ProductsManager };