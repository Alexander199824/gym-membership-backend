// test-testimonials-manager.js - GESTOR COMPLETO DE TESTIMONIOS v1.0
const axios = require('axios');
const readline = require('readline');
require('dotenv').config();

class TestimonialsManager {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.adminToken = null;
    this.clientToken = null;
    this.testimonials = [];
    this.currentPage = 1;
    this.currentLimit = 10;
    this.currentFilters = {
      isActive: undefined,
      isFeatured: undefined,
      minRating: undefined,
      search: '',
      sortBy: 'createdAt',
      sortOrder: 'DESC'
    };
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.log('💬 Elite Fitness Club - Gestor Completo de Testimonios v1.0');
    console.log('='.repeat(80));
    console.log('🎯 FUNCIONES: Ver, crear, aprobar, editar y eliminar testimonios');
    console.log('📊 DATOS: Lista completa con filtros, estadísticas y gestión avanzada');
    console.log('🔧 GESTIÓN: Control total sobre todos los testimonios del sistema\n');
    
    try {
      await this.loginAdmin();
      await this.loadTestimonials();
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

  // AUTENTICACION
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

  // CARGAR TESTIMONIOS
  async loadTestimonials() {
    console.log('\n2. 📊 Cargando testimonios...');
    
    try {
      const params = {
        page: this.currentPage,
        limit: this.currentLimit,
        sortBy: this.currentFilters.sortBy,
        sortOrder: this.currentFilters.sortOrder
      };

      if (this.currentFilters.isActive !== undefined) params.isActive = this.currentFilters.isActive;
      if (this.currentFilters.isFeatured !== undefined) params.isFeatured = this.currentFilters.isFeatured;
      if (this.currentFilters.minRating) params.minRating = this.currentFilters.minRating;
      if (this.currentFilters.search) params.search = this.currentFilters.search;

      const response = await axios.get(`${this.baseURL}/api/testimonials/all`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        params
      });

      if (response.data.success) {
        this.testimonials = response.data.data;
        this.pagination = response.data.pagination;
        console.log(`   ✅ Cargados: ${this.testimonials.length} testimonios`);
      } else {
        this.testimonials = [];
        this.pagination = { total: 0, page: 1, totalPages: 1, limit: this.currentLimit };
      }
    } catch (error) {
      console.error(`   ❌ Error cargando testimonios: ${error.message}`);
      this.testimonials = [];
      this.pagination = { total: 0, page: 1, totalPages: 1, limit: this.currentLimit };
    }
  }

  // MENU PRINCIPAL
  async showMainMenu() {
    console.log('\n🎯 GESTOR DE TESTIMONIOS - MENÚ PRINCIPAL');
    console.log('='.repeat(60));
    console.log('1. 📦 Ver todos los testimonios (con paginación)');
    console.log('2. 🔍 Buscar y filtrar testimonios');
    console.log('3. ⭐ Ver testimonios destacados');
    console.log('4. ✅ Ver testimonios publicados');
    console.log('5. ⏳ Ver testimonios pendientes de aprobación');
    console.log('6. 📊 Ver estadísticas completas');
    console.log('7. 🔧 Ver detalles de testimonio específico');
    console.log('8. ✅ Aprobar testimonios pendientes');
    console.log('9. ➕ Crear testimonio (admin)');
    console.log('10. ✏️ Editar testimonio');
    console.log('11. 🗑️ Eliminar testimonio');
    console.log('12. ⭐ Gestionar testimonios destacados');
    console.log('13. 🔢 Reordenar testimonios');
    console.log('14. ⚙️ Configurar filtros y paginación');
    console.log('15. 🧪 Simular testimonio de cliente');
    console.log('16. 🔄 Recargar datos');
    console.log('0. 🚪 Salir');
    
    const choice = await this.askQuestion('\n🎯 Selecciona una opción (0-16): ');
    
    switch (choice.trim()) {
      case '1': await this.showAllTestimonials(); break;
      case '2': await this.searchAndFilter(); break;
      case '3': await this.showFeaturedTestimonials(); break;
      case '4': await this.showPublishedTestimonials(); break;
      case '5': await this.showPendingTestimonials(); break;
      case '6': await this.showStatistics(); break;
      case '7': await this.showTestimonialDetails(); break;
      case '8': await this.approveTestimonials(); break;
      case '9': await this.createTestimonialAdmin(); break;
      case '10': await this.editTestimonial(); break;
      case '11': await this.deleteTestimonial(); break;
      case '12': await this.manageFeatured(); break;
      case '13': await this.reorderTestimonials(); break;
      case '14': await this.configureFilters(); break;
      case '15': await this.simulateClientTestimonial(); break;
      case '16': await this.reloadData(); break;
      case '0':
        console.log('\n👋 ¡Hasta luego!');
        return;
      default:
        console.log('\n❌ Opción inválida. Intenta de nuevo.');
    }
    
    await this.showMainMenu();
  }

  // VER TODOS LOS TESTIMONIOS
  async showAllTestimonials() {
    console.log('\n📦 LISTA COMPLETA DE TESTIMONIOS');
    console.log('='.repeat(80));
    
    if (this.testimonials.length === 0) {
      console.log('❌ No hay testimonios que mostrar con los filtros actuales');
      await this.showCurrentFilters();
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    console.log(`📄 Página ${this.pagination.page} de ${this.pagination.totalPages} (${this.pagination.total} testimonios total)`);
    console.log(`📦 Mostrando ${this.testimonials.length} testimonios de ${this.pagination.limit} por página`);
    
    await this.showCurrentFilters();

    console.log('\n📋 TESTIMONIOS:');
    for (let i = 0; i < this.testimonials.length; i++) {
      await this.displayTestimonialSummary(this.testimonials[i], i + 1);
    }

    await this.showPaginationOptions();
  }

  // MOSTRAR RESUMEN DE TESTIMONIO
  async displayTestimonialSummary(testimonial, index) {
    const statusIcon = testimonial.isActive ? '✅' : '⏳';
    const statusText = testimonial.isActive ? 'Publicado' : 'Pendiente';
    const featuredIcon = testimonial.isFeatured ? '⭐' : '  ';
    const ratingStars = '★'.repeat(testimonial.rating) + '☆'.repeat(5 - testimonial.rating);
    
    console.log(`\n   ${index}. ${featuredIcon} "${testimonial.name}" - ${testimonial.role}`);
    console.log(`      🆔 ID: ${testimonial.id}`);
    console.log(`      ${statusIcon} Estado: ${statusText} | ⭐ Rating: ${ratingStars} (${testimonial.rating}/5)`);
    console.log(`      ${testimonial.isFeatured ? '⭐ DESTACADO' : '   Normal'} | 🔢 Orden: ${testimonial.displayOrder}`);
    
    const shortText = testimonial.text.length > 100 ? 
      testimonial.text.substring(0, 100) + '...' : 
      testimonial.text;
    console.log(`      💬 "${shortText}"`);
    
    if (testimonial.imageUrl) {
      const isCloudinary = testimonial.imageUrl.includes('cloudinary.com');
      console.log(`      🖼️ Imagen: ${isCloudinary ? '☁️ Cloudinary' : '🔗 Externa'}`);
    }
    
    const createdDate = new Date(testimonial.createdAt).toLocaleDateString();
    console.log(`      📅 Creado: ${createdDate}`);
  }

  // MOSTRAR FILTROS ACTUALES
  async showCurrentFilters() {
    const activeFilters = [];
    
    if (this.currentFilters.search) activeFilters.push(`Buscar: "${this.currentFilters.search}"`);
    if (this.currentFilters.isActive === true) activeFilters.push('Estado: Publicados');
    if (this.currentFilters.isActive === false) activeFilters.push('Estado: Pendientes');
    if (this.currentFilters.isFeatured === true) activeFilters.push('Solo destacados');
    if (this.currentFilters.minRating) activeFilters.push(`Rating ≥ ${this.currentFilters.minRating}`);
    
    activeFilters.push(`Orden: ${this.currentFilters.sortBy} ${this.currentFilters.sortOrder}`);
    
    console.log(`\n🔍 FILTROS ACTIVOS: ${activeFilters.length > 1 ? activeFilters.join(' | ') : 'Sin filtros'}`);
  }

  // OPCIONES DE PAGINACION
  async showPaginationOptions() {
    console.log('\n📄 NAVEGACIÓN:');
    const options = [];
    
    if (this.pagination.page > 1) options.push('p = Página anterior');
    if (this.pagination.page < this.pagination.totalPages) options.push('n = Página siguiente');
    options.push('g = Ir a página específica');
    options.push('l = Cambiar límite por página');
    options.push('Enter = Volver al menú');
    
    console.log(`   ${options.join(' | ')}`);
    
    const choice = await this.askQuestion('\n📄 Navegación: ');
    
    switch (choice.toLowerCase().trim()) {
      case 'p':
        if (this.pagination.page > 1) {
          this.currentPage--;
          await this.loadTestimonials();
          await this.showAllTestimonials();
        }
        break;
      case 'n':
        if (this.pagination.page < this.pagination.totalPages) {
          this.currentPage++;
          await this.loadTestimonials();
          await this.showAllTestimonials();
        }
        break;
      case 'g':
        const pageInput = await this.askQuestion(`📄 Ir a página (1-${this.pagination.totalPages}): `);
        const pageNumber = parseInt(pageInput);
        if (pageNumber >= 1 && pageNumber <= this.pagination.totalPages) {
          this.currentPage = pageNumber;
          await this.loadTestimonials();
          await this.showAllTestimonials();
        }
        break;
      case 'l':
        const limitInput = await this.askQuestion('📦 Testimonios por página (5-50): ');
        const limitNumber = parseInt(limitInput);
        if (limitNumber >= 5 && limitNumber <= 50) {
          this.currentLimit = limitNumber;
          this.currentPage = 1;
          await this.loadTestimonials();
          await this.showAllTestimonials();
        }
        break;
    }
  }

  // BUSCAR Y FILTRAR
  async searchAndFilter() {
    console.log('\n🔍 BÚSQUEDA Y FILTROS');
    console.log('='.repeat(60));
    
    console.log('📋 Filtros disponibles:');
    console.log('1. Buscar por nombre/texto');
    console.log('2. Filtrar por estado (publicado/pendiente)');
    console.log('3. Solo testimonios destacados');
    console.log('4. Filtrar por rating mínimo');
    console.log('5. Cambiar ordenamiento');
    console.log('6. Limpiar todos los filtros');
    console.log('7. Aplicar filtros y ver resultados');
    console.log('0. Volver');
    
    const choice = await this.askQuestion('\n🔍 Selecciona opción (0-7): ');
    
    switch (choice.trim()) {
      case '1':
        const searchTerm = await this.askQuestion('🔍 Buscar: ');
        this.currentFilters.search = searchTerm.trim();
        console.log(`✅ Búsqueda establecida: "${this.currentFilters.search}"`);
        break;
      case '2':
        await this.selectStatus();
        break;
      case '3':
        const featuredChoice = await this.askQuestion('⭐ Solo destacados? (s/n): ');
        this.currentFilters.isFeatured = featuredChoice.toLowerCase() === 's' ? true : undefined;
        console.log(`✅ Filtro destacados: ${this.currentFilters.isFeatured ? 'Activado' : 'Desactivado'}`);
        break;
      case '4':
        const minRating = await this.askQuestion('⭐ Rating mínimo (1-5): ');
        const rating = parseInt(minRating);
        if (rating >= 1 && rating <= 5) {
          this.currentFilters.minRating = rating;
          console.log(`✅ Rating mínimo: ${rating} estrellas`);
        }
        break;
      case '5':
        await this.selectSorting();
        break;
      case '6':
        this.clearAllFilters();
        console.log('✅ Filtros limpiados');
        break;
      case '7':
        this.currentPage = 1;
        await this.loadTestimonials();
        await this.showAllTestimonials();
        return;
      case '0':
        return;
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
    await this.searchAndFilter();
  }

  // VER ESTADISTICAS
  async showStatistics() {
    console.log('\n📊 ESTADÍSTICAS DE TESTIMONIOS');
    console.log('='.repeat(60));
    
    try {
      const response = await axios.get(`${this.baseURL}/api/testimonials/stats`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });
      
      if (response.data.success) {
        const stats = response.data.data;
        
        console.log('📊 RESUMEN GENERAL:');
        console.log(`   💬 Total testimonios: ${stats.summary.total}`);
        console.log(`   ✅ Publicados: ${stats.summary.published}`);
        console.log(`   ⏳ Pendientes: ${stats.summary.pending}`);
        console.log(`   ⭐ Destacados: ${stats.summary.featured || 0}`);
        console.log(`   ⭐ Rating promedio: ${stats.summary.averageRating}/5.0`);
        
        console.log('\n📈 PORCENTAJES:');
        console.log(`   ✅ Tasa de publicación: ${stats.percentages.publishedRate}`);
        console.log(`   ⏳ Tasa pendiente: ${stats.percentages.pendingRate}`);
        if (stats.percentages.featuredRate) {
          console.log(`   ⭐ Tasa destacados: ${stats.percentages.featuredRate}`);
        }
        
        if (stats.ratingDistribution && stats.ratingDistribution.length > 0) {
          console.log('\n⭐ DISTRIBUCIÓN POR RATING:');
          stats.ratingDistribution.forEach(dist => {
            const stars = '★'.repeat(dist.rating) + '☆'.repeat(5 - dist.rating);
            const bar = '█'.repeat(Math.ceil(dist.count / 2));
            console.log(`   ${stars} (${dist.rating}): ${bar} ${dist.count} testimonios`);
          });
        }
        
        console.log('\n💡 INSIGHTS:');
        if (stats.insights.needsAttention) {
          console.log(`   ⚠️ HAY ${stats.summary.pending} TESTIMONIOS PENDIENTES - Requiere atención`);
        }
        if (stats.insights.goodRating) {
          console.log(`   ✅ Rating excelente (≥4.0) - Clientes satisfechos`);
        }
        
      } else {
        console.log('❌ No se pudieron obtener las estadísticas');
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // VER TESTIMONIOS PENDIENTES
  async showPendingTestimonials() {
    console.log('\n⏳ TESTIMONIOS PENDIENTES DE APROBACIÓN');
    console.log('='.repeat(60));
    
    try {
      const response = await axios.get(`${this.baseURL}/api/testimonials/pending`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });
      
      if (response.data.success && response.data.data.testimonials.length > 0) {
        const pending = response.data.data.testimonials;
        
        console.log(`⏳ ${pending.length} testimonios pendientes:\n`);
        
        pending.forEach((test, index) => {
          const ratingStars = '★'.repeat(test.rating) + '☆'.repeat(5 - test.rating);
          console.log(`   ${index + 1}. "${test.name}" - ${test.role}`);
          console.log(`      🆔 ID: ${test.id}`);
          console.log(`      ⭐ ${ratingStars} (${test.rating}/5)`);
          console.log(`      💬 "${test.text.substring(0, 100)}${test.text.length > 100 ? '...' : ''}"`);
          console.log(`      📅 ${new Date(test.submittedAt).toLocaleString()}`);
          console.log('');
        });
        
        const action = await this.askQuestion('📋 ¿Aprobar testimonios ahora? (s/n): ');
        if (action.toLowerCase() === 's') {
          await this.approveTestimonials();
        }
        
      } else {
        console.log('✅ No hay testimonios pendientes');
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // APROBAR TESTIMONIOS
  async approveTestimonials() {
    console.log('\n✅ APROBAR TESTIMONIOS');
    console.log('='.repeat(60));
    
    try {
      const response = await axios.get(`${this.baseURL}/api/testimonials/pending`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });
      
      if (!response.data.success || response.data.data.testimonials.length === 0) {
        console.log('✅ No hay testimonios pendientes');
        await this.askQuestion('\n⏎ Presiona Enter para continuar...');
        return;
      }
      
      const pending = response.data.data.testimonials;
      
      pending.forEach((test, index) => {
        console.log(`\n${index + 1}. ${test.name} - ${test.role}`);
        console.log(`   ⭐ Rating: ${test.rating}/5`);
        console.log(`   💬 "${test.text.substring(0, 80)}..."`);
      });
      
      const choice = await this.askQuestion('\n📋 Número de testimonio a aprobar (0 para cancelar): ');
      const choiceNum = parseInt(choice);
      
      if (choiceNum < 1 || choiceNum > pending.length) {
        console.log('❌ Cancelado');
        return;
      }
      
      const selected = pending[choiceNum - 1];
      
      console.log(`\n✅ Aprobar: "${selected.name}"`);
      const featured = await this.askQuestion('⭐ ¿Marcar como destacado? (s/n): ');
      const displayOrder = await this.askQuestion('🔢 Orden de visualización (0-999): ');
      
      const approveResponse = await axios.post(
        `${this.baseURL}/api/testimonials/${selected.id}/approve`,
        {
          featured: featured.toLowerCase() === 's',
          displayOrder: parseInt(displayOrder) || 0
        },
        {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }
      );
      
      if (approveResponse.data.success) {
        console.log('\n✅ Testimonio aprobado exitosamente');
        console.log(`   📊 Estado: Publicado`);
        console.log(`   ⭐ Destacado: ${featured.toLowerCase() === 's' ? 'Sí' : 'No'}`);
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error.response?.data?.message || error.message}`);
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // CREAR TESTIMONIO (ADMIN)
  async createTestimonialAdmin() {
    console.log('\n➕ CREAR TESTIMONIO (ADMIN)');
    console.log('='.repeat(60));
    
    const name = await this.askQuestion('📛 Nombre: ');
    const role = await this.askQuestion('💼 Profesión/Rol: ');
    const text = await this.askQuestion('💬 Texto del testimonio: ');
    const rating = await this.askQuestion('⭐ Rating (1-5): ');
    const featured = await this.askQuestion('⭐ ¿Destacado? (s/n): ');
    const active = await this.askQuestion('✅ ¿Publicar inmediatamente? (s/n): ');
    
    try {
      const response = await axios.post(
        `${this.baseURL}/api/testimonials/admin/create`,
        {
          name,
          role,
          text,
          rating: parseInt(rating),
          isFeatured: featured.toLowerCase() === 's',
          isActive: active.toLowerCase() === 's',
          imageUrl: '',
          displayOrder: 0
        },
        {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }
      );
      
      if (response.data.success) {
        console.log('\n✅ Testimonio creado exitosamente');
        console.log(`   🆔 ID: ${response.data.data.id}`);
        console.log(`   ✅ Estado: ${response.data.data.isActive ? 'Publicado' : 'Pendiente'}`);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.response?.data?.message || error.message}`);
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // VER DETALLES
  async showTestimonialDetails() {
    if (this.testimonials.length === 0) {
      console.log('❌ No hay testimonios cargados');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const input = await this.askQuestion('🆔 ID del testimonio o número de lista: ');
    const num = parseInt(input);
    
    let testimonial;
    if (num >= 1 && num <= this.testimonials.length) {
      testimonial = this.testimonials[num - 1];
    } else {
      try {
        const response = await axios.get(
          `${this.baseURL}/api/testimonials/${input}/details`,
          { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
        );
        testimonial = response.data.data;
      } catch (error) {
        console.log('❌ Testimonio no encontrado');
        await this.askQuestion('\n⏎ Presiona Enter para continuar...');
        return;
      }
    }
    
    await this.displayTestimonialDetails(testimonial);
  }

  // MOSTRAR DETALLES COMPLETOS
  async displayTestimonialDetails(test) {
    console.log('\n💬 DETALLES COMPLETOS DEL TESTIMONIO');
    console.log('='.repeat(80));
    
    const ratingStars = '★'.repeat(test.rating) + '☆'.repeat(5 - test.rating);
    
    console.log('📋 INFORMACIÓN BÁSICA:');
    console.log(`   🆔 ID: ${test.id}`);
    console.log(`   📛 Nombre: ${test.name}`);
    console.log(`   💼 Rol: ${test.role}`);
    console.log(`   ${test.isActive ? '✅' : '⏳'} Estado: ${test.isActive ? 'Publicado' : 'Pendiente'}`);
    console.log(`   ${test.isFeatured ? '⭐' : '  '} Destacado: ${test.isFeatured ? 'Sí' : 'No'}`);
    console.log(`   🔢 Orden: ${test.displayOrder}`);
    
    console.log('\n⭐ CALIFICACIÓN:');
    console.log(`   ${ratingStars} (${test.rating}/5)`);
    
    console.log('\n💬 TESTIMONIO:');
    console.log(`   "${test.text}"`);
    
    if (test.imageUrl) {
      console.log('\n🖼️ IMAGEN:');
      console.log(`   🔗 ${test.imageUrl}`);
    }
    
    console.log('\n📅 FECHAS:');
    console.log(`   📅 Creado: ${new Date(test.createdAt).toLocaleString()}`);
    console.log(`   🔄 Actualizado: ${new Date(test.updatedAt).toLocaleString()}`);
    
    console.log('\n🔧 ACCIONES:');
    console.log('1. ✏️ Editar');
    console.log('2. 🗑️ Eliminar');
    console.log('3. ⭐ Toggle destacado');
    console.log('4. ✅ Toggle activo');
    console.log('0. Volver');
    
    const action = await this.askQuestion('\n🔧 Acción (0-4): ');
    
    switch (action.trim()) {
      case '1': await this.editTestimonialById(test.id); break;
      case '2': await this.deleteTestimonialById(test.id); break;
      case '3': await this.toggleFeatured(test.id); break;
      case '4': await this.toggleActive(test.id); break;
    }
  }

  // EDITAR TESTIMONIO
  async editTestimonial() {
    const id = await this.askQuestion('🆔 ID del testimonio: ');
    await this.editTestimonialById(id);
  }

  async editTestimonialById(id) {
    console.log('\n✏️ EDITAR TESTIMONIO');
    console.log('Presiona Enter para mantener el valor actual\n');
    
    const name = await this.askQuestion('📛 Nombre: ');
    const role = await this.askQuestion('💼 Rol: ');
    const text = await this.askQuestion('💬 Texto: ');
    const rating = await this.askQuestion('⭐ Rating (1-5): ');
    
    const data = {};
    if (name) data.name = name;
    if (role) data.role = role;
    if (text) data.text = text;
    if (rating) data.rating = parseInt(rating);
    
    if (Object.keys(data).length === 0) {
      console.log('❌ No se realizaron cambios');
      return;
    }
    
    try {
      const response = await axios.put(
        `${this.baseURL}/api/testimonials/${id}`,
        data,
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );
      
      if (response.data.success) {
        console.log('\n✅ Testimonio actualizado exitosamente');
      }
    } catch (error) {
      console.error(`❌ Error: ${error.response?.data?.message || error.message}`);
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ELIMINAR
  async deleteTestimonial() {
    const id = await this.askQuestion('🆔 ID del testimonio: ');
    await this.deleteTestimonialById(id);
  }

  async deleteTestimonialById(id) {
    const confirm = await this.askQuestion('⚠️ ¿Confirmar eliminación? (escribir "ELIMINAR"): ');
    
    if (confirm !== 'ELIMINAR') {
      console.log('❌ Cancelado');
      return;
    }
    
    try {
      const response = await axios.delete(
        `${this.baseURL}/api/testimonials/${id}`,
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );
      
      if (response.data.success) {
        console.log('\n✅ Testimonio eliminado exitosamente');
      }
    } catch (error) {
      console.error(`❌ Error: ${error.response?.data?.message || error.message}`);
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // TOGGLE FEATURED
  async toggleFeatured(id) {
    try {
      const response = await axios.patch(
        `${this.baseURL}/api/testimonials/${id}/toggle-featured`,
        {},
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );
      
      if (response.data.success) {
        console.log(`\n✅ ${response.data.message}`);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // TOGGLE ACTIVE
  async toggleActive(id) {
    try {
      const response = await axios.patch(
        `${this.baseURL}/api/testimonials/${id}/toggle-active`,
        {},
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );
      
      if (response.data.success) {
        console.log(`\n✅ ${response.data.message}`);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // SIMULAR CLIENTE
  async simulateClientTestimonial() {
    console.log('\n🧪 SIMULAR TESTIMONIO DE CLIENTE');
    console.log('='.repeat(60));
    console.log('Esta función simula cómo un cliente envía un testimonio\n');
    
    // Login como cliente
    try {
      console.log('🔐 Autenticando como cliente...');
      const loginResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'cliente@test.com',
        password: 'Cliente123!'
      });
      
      if (loginResponse.data.success) {
        this.clientToken = loginResponse.data.data.token;
        console.log(`✅ Cliente autenticado: ${loginResponse.data.data.user.firstName}\n`);
        
        const text = await this.askQuestion('💬 Texto del testimonio: ');
        const rating = await this.askQuestion('⭐ Rating (1-5): ');
        const role = await this.askQuestion('💼 Profesión: ');
        
        const response = await axios.post(
          `${this.baseURL}/api/testimonials`,
          { text, rating: parseInt(rating), role },
          { headers: { 'Authorization': `Bearer ${this.clientToken}` } }
        );
        
        if (response.data.success) {
          console.log('\n✅ Testimonio enviado exitosamente');
          console.log('⏳ Estado: Pendiente de aprobación');
          console.log('💡 El cliente ve su testimonio como "En revisión"');
        }
      }
    } catch (error) {
      console.error(`❌ Error: ${error.response?.data?.message || error.message}`);
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // UTILIDADES
  async selectStatus() {
    console.log('\n🔄 FILTRAR POR ESTADO:');
    console.log('1. Todos');
    console.log('2. Solo publicados');
    console.log('3. Solo pendientes');
    
    const choice = await this.askQuestion('\n🔄 Selecciona: ');
    
    switch (choice.trim()) {
      case '1': this.currentFilters.isActive = undefined; break;
      case '2': this.currentFilters.isActive = true; break;
      case '3': this.currentFilters.isActive = false; break;
    }
  }

  async selectSorting() {
    console.log('\n📊 ORDENAMIENTO:');
    console.log('1. Fecha (más recientes)');
    console.log('2. Fecha (más antiguos)');
    console.log('3. Rating (mayor a menor)');
    console.log('4. Rating (menor a mayor)');
    console.log('5. Nombre (A-Z)');
    console.log('6. Nombre (Z-A)');
    
    const choice = await this.askQuestion('\n📊 Selecciona: ');
    
    switch (choice.trim()) {
      case '1': this.currentFilters.sortBy = 'createdAt'; this.currentFilters.sortOrder = 'DESC'; break;
      case '2': this.currentFilters.sortBy = 'createdAt'; this.currentFilters.sortOrder = 'ASC'; break;
      case '3': this.currentFilters.sortBy = 'rating'; this.currentFilters.sortOrder = 'DESC'; break;
      case '4': this.currentFilters.sortBy = 'rating'; this.currentFilters.sortOrder = 'ASC'; break;
      case '5': this.currentFilters.sortBy = 'name'; this.currentFilters.sortOrder = 'ASC'; break;
      case '6': this.currentFilters.sortBy = 'name'; this.currentFilters.sortOrder = 'DESC'; break;
    }
  }

  clearAllFilters() {
    this.currentFilters = {
      isActive: undefined,
      isFeatured: undefined,
      minRating: undefined,
      search: '',
      sortBy: 'createdAt',
      sortOrder: 'DESC'
    };
    this.currentPage = 1;
  }

  async showFeaturedTestimonials() {
    this.currentFilters.isFeatured = true;
    await this.loadTestimonials();
    await this.showAllTestimonials();
    this.currentFilters.isFeatured = undefined;
  }

  async showPublishedTestimonials() {
    this.currentFilters.isActive = true;
    await this.loadTestimonials();
    await this.showAllTestimonials();
    this.currentFilters.isActive = undefined;
  }

  async manageFeatured() {
    console.log('\n⭐ GESTIONAR DESTACADOS');
    console.log('Ver/Editar testimonios destacados desde el menú principal');
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async reorderTestimonials() {
    console.log('\n🔢 REORDENAR TESTIMONIOS');
    console.log('Función avanzada - Edita displayOrder desde editar testimonio');
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async configureFilters() {
    console.log('\n⚙️ CONFIGURACIÓN');
    console.log(`📄 Página: ${this.currentPage}`);
    console.log(`📦 Por página: ${this.currentLimit}`);
    await this.showCurrentFilters();
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  async reloadData() {
    console.log('\n🔄 Recargando...');
    await this.loadTestimonials();
    console.log('✅ Datos recargados');
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => resolve(answer));
    });
  }
}

// MAIN
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('\n💬 Elite Fitness Club - Gestor de Testimonios v1.0\n');
    console.log('📋 FUNCIONALIDADES:');
    console.log('  - Ver todos los testimonios con paginación');
    console.log('  - Buscar y filtrar (estado, rating, destacados)');
    console.log('  - Aprobar testimonios pendientes');
    console.log('  - Crear, editar y eliminar');
    console.log('  - Gestionar destacados');
    console.log('  - Estadísticas completas');
    console.log('  - Simular testimonios de cliente\n');
    console.log('🚀 USO: node test-testimonials-manager.js\n');
    return;
  }
  
  const manager = new TestimonialsManager();
  await manager.start();
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n🚨 ERROR:', error.message);
    process.exit(1);
  });
}

module.exports = { TestimonialsManager };