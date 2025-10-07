// test-gym-info-manager.js - GESTOR COMPLETO DE INFORMACIÓN DEL GYM v1.0 ✅
// SIN gestión de horarios (se maneja en otro test)
const axios = require('axios');
const readline = require('readline');
require('dotenv').config();

class GymInfoManager {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.adminToken = null;
    this.gymConfig = null;
    this.contactInfo = null;
    this.socialMedia = {};
    this.stats = [];
    this.services = [];
    this.plans = [];
    
    // Configurar readline para entrada interactiva
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.log('🏢 Elite Fitness Club - Gestor de Información del Gym v1.0 ✅');
    console.log('='.repeat(80));
    console.log('🎯 FUNCIONES: Configuración, contacto, redes sociales, contenido y más');
    console.log('📊 GESTIÓN: Control completo de la información pública del gimnasio\n');
    
    try {
      await this.loginAdmin();
      await this.loadAllGymData();
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

  // ✅ CARGAR TODA LA INFORMACIÓN DEL GYM (SIN HORARIOS)
  async loadAllGymData() {
    console.log('\n2. 🏢 Cargando información completa del gym...');
    
    try {
      // Configuración básica
      const configResponse = await axios.get(`${this.baseURL}/api/gym/config`);
      if (configResponse.data.success) {
        this.gymConfig = configResponse.data.data;
        console.log('   ✅ Configuración básica cargada');
      }

      // Información de contacto
      const contactResponse = await axios.get(`${this.baseURL}/api/gym/contact`);
      if (contactResponse.data.success) {
        this.contactInfo = contactResponse.data.data;
        console.log('   ✅ Información de contacto cargada');
      }

      // Redes sociales
      const socialResponse = await axios.get(`${this.baseURL}/api/gym/social-media`);
      if (socialResponse.data.success) {
        this.socialMedia = socialResponse.data.data;
        console.log('   ✅ Redes sociales cargadas');
      }

      // Estadísticas
      const statsResponse = await axios.get(`${this.baseURL}/api/gym/stats`);
      if (statsResponse.data.success) {
        this.stats = statsResponse.data.data;
        console.log('   ✅ Estadísticas cargadas');
      }

      // Servicios
      const servicesResponse = await axios.get(`${this.baseURL}/api/gym/services`);
      if (servicesResponse.data.success) {
        this.services = servicesResponse.data.data;
        console.log('   ✅ Servicios cargados');
      }

      // Planes de membresía
      const plansResponse = await axios.get(`${this.baseURL}/api/gym/membership-plans`);
      if (plansResponse.data.success) {
        this.plans = plansResponse.data.data;
        console.log('   ✅ Planes de membresía cargados');
      }

      console.log('\n✅ Toda la información del gym cargada correctamente');
      
    } catch (error) {
      console.log(`   ❌ Error cargando datos: ${error.message}`);
      throw error;
    }
  }

  // ✅ MENÚ PRINCIPAL (SIN HORARIOS)
  async showMainMenu() {
    console.log('\n🏢 GESTOR DE INFORMACIÓN DEL GYM - MENÚ PRINCIPAL');
    console.log('='.repeat(80));
    console.log('📋 INFORMACIÓN GENERAL:');
    console.log('  1. 🏢 Ver configuración completa del gym');
    console.log('  2. 📝 Ver resumen ejecutivo');
    console.log('  3. 🔄 Recargar todos los datos');
    console.log('\n⚙️  CONFIGURACIÓN BÁSICA:');
    console.log('  4. ✏️  Editar nombre y descripción');
    console.log('  5. 🎨 Editar colores del tema');
    console.log('  6. 🖼️  Ver información multimedia');
    console.log('\n📞 CONTACTO:');
    console.log('  7. 📞 Ver información de contacto');
    console.log('  8. ✏️  Editar información de contacto');
    console.log('\n📱 REDES SOCIALES:');
    console.log('  9. 📱 Ver todas las redes sociales');
    console.log('  10. ➕ Agregar/Editar red social');
    console.log('  11. 🔄 Activar/Desactivar red social');
    console.log('\n📊 CONTENIDO:');
    console.log('  12. 📊 Ver estadísticas');
    console.log('  13. 🏋️  Ver servicios');
    console.log('  14. 💳 Ver planes de membresía');
    console.log('\n🔧 ADMINISTRACIÓN:');
    console.log('  15. 🌱 Reinicializar datos por defecto');
    console.log('  16. 📤 Exportar configuración completa');
    console.log('  0. 🚪 Salir');
    
    const choice = await this.askQuestion('\n🏢 Selecciona una opción (0-16): ');
    
    switch (choice.trim()) {
      case '1':
        await this.showCompleteConfig();
        break;
      case '2':
        await this.showExecutiveSummary();
        break;
      case '3':
        await this.reloadAllData();
        break;
      case '4':
        await this.editBasicInfo();
        break;
      case '5':
        await this.editThemeColors();
        break;
      case '6':
        await this.showMultimediaInfo();
        break;
      case '7':
        await this.showContactInfo();
        break;
      case '8':
        await this.editContactInfo();
        break;
      case '9':
        await this.showAllSocialMedia();
        break;
      case '10':
        await this.manageSocialMedia();
        break;
      case '11':
        await this.toggleSocialMedia();
        break;
      case '12':
        await this.showStatistics();
        break;
      case '13':
        await this.showServices();
        break;
      case '14':
        await this.showMembershipPlans();
        break;
      case '15':
        await this.reinitializeDefaults();
        break;
      case '16':
        await this.exportConfiguration();
        break;
      case '0':
        console.log('\n👋 ¡Hasta luego!');
        return;
      default:
        console.log('\n❌ Opción inválida. Intenta de nuevo.');
    }
    
    await this.showMainMenu();
  }

  // ✅ 1. VER CONFIGURACIÓN COMPLETA
  async showCompleteConfig() {
    console.log('\n🏢 CONFIGURACIÓN COMPLETA DEL GYM');
    console.log('='.repeat(80));

    if (!this.gymConfig) {
      console.log('❌ No se pudo cargar la configuración');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    console.log('\n📝 INFORMACIÓN BÁSICA:');
    console.log(`   🏢 Nombre: ${this.gymConfig.name}`);
    console.log(`   💬 Tagline: ${this.gymConfig.tagline || 'N/A'}`);
    console.log(`   📝 Descripción: ${this.gymConfig.description}`);

    console.log('\n🖼️  MULTIMEDIA:');
    console.log(`   📷 Logo: ${this.gymConfig.logo?.url ? '✅ Configurado' : '❌ No configurado'}`);
    console.log(`   🎬 Video Hero: ${this.gymConfig.hero?.videoUrl ? '✅ Configurado' : '❌ No configurado'}`);
    console.log(`   🖼️  Imagen Hero: ${this.gymConfig.hero?.imageUrl ? '✅ Configurado' : '❌ No configurado'}`);

    console.log('\n📞 CONTACTO:');
    console.log(`   📱 Teléfono: ${this.gymConfig.contact?.phone || 'N/A'}`);
    console.log(`   📧 Email: ${this.gymConfig.contact?.email || 'N/A'}`);
    console.log(`   📍 Dirección: ${this.gymConfig.contact?.address || 'N/A'}`);

    console.log('\n📱 REDES SOCIALES:');
    if (this.gymConfig.social) {
      Object.entries(this.gymConfig.social).forEach(([platform, data]) => {
        if (data && typeof data === 'object') {
          const status = data.active ? '✅' : '❌';
          console.log(`   ${status} ${this.getPlatformIcon(platform)} ${platform}: ${data.url}`);
        }
      });
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ 2. RESUMEN EJECUTIVO
  async showExecutiveSummary() {
    console.log('\n📊 RESUMEN EJECUTIVO DEL GYM');
    console.log('='.repeat(80));

    console.log('\n🏢 CONFIGURACIÓN GENERAL:');
    console.log(`   Nombre: ${this.gymConfig?.name || 'N/A'}`);
    console.log(`   Multimedia: ${this.gymConfig?.multimedia?.hasAnyMedia ? '✅ Configurado' : '❌ Pendiente'}`);

    console.log('\n📊 ESTADÍSTICAS ACTIVAS:');
    console.log(`   Total: ${this.stats.length} métricas`);
    this.stats.slice(0, 4).forEach(stat => {
      console.log(`   ${this.getColorIcon(stat.color)} ${stat.number} ${stat.label}`);
    });

    console.log('\n🏋️  SERVICIOS:');
    console.log(`   Total: ${this.services.length} servicios`);
    const activeServices = this.services.filter(s => s.active);
    console.log(`   Activos: ${activeServices.length}`);

    console.log('\n💳 PLANES DE MEMBRESÍA:');
    console.log(`   Total: ${this.plans.length} planes`);
    const popularPlan = this.plans.find(p => p.popular);
    if (popularPlan) {
      console.log(`   ⭐ Popular: ${popularPlan.name} - ${popularPlan.currency} ${popularPlan.price}/${popularPlan.duration}`);
    }

    console.log('\n📱 REDES SOCIALES:');
    const socialCount = Object.keys(this.socialMedia).length;
    const activeSocial = Object.values(this.socialMedia).filter(s => s?.active).length;
    console.log(`   Total: ${socialCount} redes`);
    console.log(`   Activas: ${activeSocial}`);

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ 3. RECARGAR DATOS
  async reloadAllData() {
    console.log('\n🔄 RECARGANDO TODOS LOS DATOS...');
    try {
      await this.loadAllGymData();
      console.log('✅ Todos los datos recargados exitosamente');
    } catch (error) {
      console.log(`❌ Error recargando: ${error.message}`);
    }
    
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ 4. EDITAR INFORMACIÓN BÁSICA
  async editBasicInfo() {
    console.log('\n✏️  EDITAR INFORMACIÓN BÁSICA');
    console.log('='.repeat(80));

    console.log('\n📝 DATOS ACTUALES:');
    console.log(`   🏢 Nombre: ${this.gymConfig.name}`);
    console.log(`   💬 Tagline: ${this.gymConfig.tagline || 'N/A'}`);
    console.log(`   📝 Descripción: ${this.gymConfig.description}`);

    console.log('\n(Presiona Enter para mantener el valor actual)\n');

    const updates = {};

    const newName = await this.askQuestion(`🏢 Nuevo nombre [${this.gymConfig.name}]: `);
    if (newName.trim()) updates.gymName = newName.trim();

    const newTagline = await this.askQuestion(`💬 Nuevo tagline [${this.gymConfig.tagline}]: `);
    if (newTagline.trim()) updates.gymTagline = newTagline.trim();

    const newDescription = await this.askQuestion(`📝 Nueva descripción [${this.gymConfig.description}]: `);
    if (newDescription.trim()) updates.gymDescription = newDescription.trim();

    if (Object.keys(updates).length === 0) {
      console.log('❌ No se realizaron cambios');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const confirm = await this.askQuestion('\n✅ ¿Guardar cambios? (s/n): ');
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Cambios cancelados');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    try {
      const response = await axios.put(
        `${this.baseURL}/api/gym/config`,
        updates,
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log('\n✅ Información actualizada exitosamente');
        await this.loadAllGymData();
      } else {
        console.log('\n❌ Error actualizando:', response.data.message);
      }

    } catch (error) {
      console.error('\n❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ 5. EDITAR COLORES DEL TEMA
  async editThemeColors() {
    console.log('\n🎨 EDITAR COLORES DEL TEMA');
    console.log('='.repeat(80));

    console.log('\n🎨 Formato: #RRGGBB (ejemplo: #3498db)');
    console.log('(Presiona Enter para mantener el color actual)\n');

    const updates = {};

    const newPrimary = await this.askQuestion('🔵 Color primario: ');
    if (newPrimary.trim() && /^#[0-9A-F]{6}$/i.test(newPrimary.trim())) {
      updates.primaryColor = newPrimary.trim();
    }

    const newSecondary = await this.askQuestion('🟣 Color secundario: ');
    if (newSecondary.trim() && /^#[0-9A-F]{6}$/i.test(newSecondary.trim())) {
      updates.secondaryColor = newSecondary.trim();
    }

    const newSuccess = await this.askQuestion('🟢 Color éxito: ');
    if (newSuccess.trim() && /^#[0-9A-F]{6}$/i.test(newSuccess.trim())) {
      updates.successColor = newSuccess.trim();
    }

    const newWarning = await this.askQuestion('🟡 Color advertencia: ');
    if (newWarning.trim() && /^#[0-9A-F]{6}$/i.test(newWarning.trim())) {
      updates.warningColor = newWarning.trim();
    }

    const newDanger = await this.askQuestion('🔴 Color peligro: ');
    if (newDanger.trim() && /^#[0-9A-F]{6}$/i.test(newDanger.trim())) {
      updates.dangerColor = newDanger.trim();
    }

    if (Object.keys(updates).length === 0) {
      console.log('❌ No se realizaron cambios válidos');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const confirm = await this.askQuestion('\n✅ ¿Guardar colores? (s/n): ');
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Cambios cancelados');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    try {
      const response = await axios.put(
        `${this.baseURL}/api/gym/config`,
        updates,
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log('\n✅ Colores actualizados exitosamente');
        console.log('\n🎨 Variables CSS generadas:');
        Object.entries(updates).forEach(([key, value]) => {
          console.log(`   --${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`);
        });
        await this.loadAllGymData();
      } else {
        console.log('\n❌ Error actualizando:', response.data.message);
      }

    } catch (error) {
      console.error('\n❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ 6. VER INFORMACIÓN MULTIMEDIA
  async showMultimediaInfo() {
    console.log('\n🖼️  INFORMACIÓN MULTIMEDIA');
    console.log('='.repeat(80));

    if (!this.gymConfig.multimedia) {
      console.log('❌ Información multimedia no disponible');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const mm = this.gymConfig.multimedia;

    console.log('\n📊 ESTADO GENERAL:');
    console.log(`   ${mm.hasAnyMedia ? '✅' : '❌'} Contenido multimedia disponible`);
    console.log(`   ${mm.hasLogo ? '✅' : '❌'} Logo configurado`);
    console.log(`   ${mm.hasVideo ? '✅' : '❌'} Video hero configurado`);
    console.log(`   ${mm.hasHeroImage ? '✅' : '❌'} Imagen hero configurada`);

    if (mm.hasLogo && this.gymConfig.logo?.url) {
      console.log('\n🏢 LOGO:');
      console.log(`   URL: ${this.gymConfig.logo.url}`);
      console.log(`   Alt: ${this.gymConfig.logo.alt}`);
    }

    if (mm.hasVideo && this.gymConfig.hero?.videoUrl) {
      console.log('\n🎬 VIDEO HERO:');
      console.log(`   URL: ${this.gymConfig.hero.videoUrl}`);
      if (this.gymConfig.hero.videoConfig) {
        console.log(`   Autoplay: ${this.gymConfig.hero.videoConfig.autoplay ? 'Sí' : 'No'}`);
        console.log(`   Silenciado: ${this.gymConfig.hero.videoConfig.muted ? 'Sí' : 'No'}`);
        console.log(`   Loop: ${this.gymConfig.hero.videoConfig.loop ? 'Sí' : 'No'}`);
        console.log(`   Controles: ${this.gymConfig.hero.videoConfig.controls ? 'Sí' : 'No'}`);
      }
    }

    if (mm.hasHeroImage && this.gymConfig.hero?.imageUrl) {
      console.log('\n🖼️  IMAGEN HERO:');
      console.log(`   URL: ${this.gymConfig.hero.imageUrl}`);
      console.log(`   Tipo: ${mm.imageType || 'N/A'}`);
    }

    console.log('\n💡 TIP: Usa el endpoint /api/gym-media para gestionar archivos multimedia');

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ 7. VER INFORMACIÓN DE CONTACTO
  async showContactInfo() {
    console.log('\n📞 INFORMACIÓN DE CONTACTO');
    console.log('='.repeat(80));

    if (!this.contactInfo) {
      console.log('❌ Información de contacto no disponible');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    console.log('\n📱 CONTACTO:');
    console.log(`   📞 Teléfono: ${this.contactInfo.phone || 'N/A'}`);
    console.log(`   📧 Email: ${this.contactInfo.email || 'N/A'}`);
    console.log(`   💬 WhatsApp: ${this.contactInfo.whatsapp || 'N/A'}`);

    console.log('\n📍 UBICACIÓN:');
    console.log(`   Dirección: ${this.contactInfo.address || 'N/A'}`);
    if (this.contactInfo.location) {
      console.log(`   Latitud: ${this.contactInfo.location.lat || 'N/A'}`);
      console.log(`   Longitud: ${this.contactInfo.location.lng || 'N/A'}`);
      console.log(`   Google Maps: ${this.contactInfo.location.mapsUrl || 'N/A'}`);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ 8. EDITAR INFORMACIÓN DE CONTACTO
  async editContactInfo() {
    console.log('\n✏️  EDITAR INFORMACIÓN DE CONTACTO');
    console.log('='.repeat(80));

    console.log('\n📝 DATOS ACTUALES:');
    console.log(`   📞 Teléfono: ${this.contactInfo?.phone || 'N/A'}`);
    console.log(`   📧 Email: ${this.contactInfo?.email || 'N/A'}`);
    console.log(`   📍 Dirección: ${this.contactInfo?.address || 'N/A'}`);

    console.log('\n(Presiona Enter para mantener el valor actual)\n');

    const updates = {};

    const newPhone = await this.askQuestion(`📞 Nuevo teléfono [${this.contactInfo?.phone}]: `);
    if (newPhone.trim()) updates.phone = newPhone.trim();

    const newEmail = await this.askQuestion(`📧 Nuevo email [${this.contactInfo?.email}]: `);
    if (newEmail.trim()) updates.email = newEmail.trim();

    const newAddress = await this.askQuestion(`📍 Nueva dirección [${this.contactInfo?.address}]: `);
    if (newAddress.trim()) updates.address = newAddress.trim();

    const newCity = await this.askQuestion(`🏙️  Ciudad [${this.contactInfo?.city || 'N/A'}]: `);
    if (newCity.trim()) updates.city = newCity.trim();

    const newMapsUrl = await this.askQuestion(`🗺️  URL de Google Maps [opcional]: `);
    if (newMapsUrl.trim()) updates.mapsUrl = newMapsUrl.trim();

    if (Object.keys(updates).length === 0) {
      console.log('❌ No se realizaron cambios');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const confirm = await this.askQuestion('\n✅ ¿Guardar cambios en la información de contacto? (s/n): ');
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Cambios cancelados');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    try {
      const response = await axios.put(
        `${this.baseURL}/api/gym/contact`,
        updates,
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log('\n✅ Información de contacto actualizada exitosamente');
        await this.loadAllGymData();
      } else {
        console.log('\n❌ Error actualizando:', response.data.message);
      }

    } catch (error) {
      console.error('\n❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ 9. VER TODAS LAS REDES SOCIALES
  async showAllSocialMedia() {
    console.log('\n📱 TODAS LAS REDES SOCIALES');
    console.log('='.repeat(80));

    if (!this.socialMedia || Object.keys(this.socialMedia).length === 0) {
      console.log('❌ No hay redes sociales configuradas');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    console.log('\n');
    Object.entries(this.socialMedia).forEach(([platform, data]) => {
      if (data && typeof data === 'object') {
        const statusIcon = data.active ? '✅' : '❌';
        const platformIcon = this.getPlatformIcon(platform);
        
        console.log(`${statusIcon} ${platformIcon} ${platform.toUpperCase()}`);
        console.log(`   URL: ${data.url}`);
        console.log(`   Handle: ${data.handle || 'N/A'}`);
        console.log(`   Estado: ${data.active ? 'Activa' : 'Inactiva'}`);
        console.log('');
      }
    });

    const activeCount = Object.values(this.socialMedia).filter(s => s?.active).length;
    const totalCount = Object.keys(this.socialMedia).length;

    console.log(`📊 Total: ${totalCount} redes`);
    console.log(`   ✅ Activas: ${activeCount}`);
    console.log(`   ❌ Inactivas: ${totalCount - activeCount}`);

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ 10. GESTIONAR RED SOCIAL
  async manageSocialMedia() {
    console.log('\n➕ GESTIONAR RED SOCIAL');
    console.log('='.repeat(80));

    console.log('\n📱 Plataformas disponibles:');
    console.log('   1. Instagram');
    console.log('   2. Facebook');
    console.log('   3. YouTube');
    console.log('   4. WhatsApp');
    console.log('   5. TikTok');
    console.log('   6. Twitter');

    const choice = await this.askQuestion('\n📱 Selecciona plataforma (1-6, 0 para cancelar): ');

    const platforms = ['instagram', 'facebook', 'youtube', 'whatsapp', 'tiktok', 'twitter'];
    const platformIndex = parseInt(choice) - 1;

    if (choice === '0') return;

    if (platformIndex < 0 || platformIndex >= platforms.length) {
      console.log('❌ Plataforma inválida');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const platform = platforms[platformIndex];
    console.log(`\n📱 Configurando: ${platform.toUpperCase()}`);

    // Verificar si ya existe
    let existingSocial = null;
    try {
      const checkResponse = await axios.get(
        `${this.baseURL}/api/gym/social-media/${platform}`
      );
      if (checkResponse.data.success) {
        existingSocial = checkResponse.data.data;
        console.log('\n📋 Red social existente encontrada:');
        console.log(`   URL: ${existingSocial.url}`);
        console.log(`   Handle: ${existingSocial.handle || 'N/A'}`);
        console.log(`   Estado: ${existingSocial.isActive ? 'Activa' : 'Inactiva'}`);
        console.log('\n(Presiona Enter para mantener el valor actual)\n');
      }
    } catch (error) {
      console.log('\n📋 Esta red social no existe aún. Creando nueva...\n');
    }

    const url = await this.askQuestion(`🔗 URL [${existingSocial?.url || 'requerida'}]: `);
    if (!url.trim() && !existingSocial) {
      console.log('❌ URL es requerida para crear una nueva red social');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const handle = await this.askQuestion(`👤 Handle/Usuario [${existingSocial?.handle || 'opcional'}]: `);
    
    const isActiveInput = await this.askQuestion(`✅ ¿Activar? (s/n) [${existingSocial?.isActive ? 's' : 'n'}]: `);
    let isActive = existingSocial?.isActive !== false; // default true
    if (isActiveInput.trim()) {
      isActive = isActiveInput.toLowerCase() === 's';
    }

    const requestData = {
      platform,
      url: url.trim() || existingSocial?.url,
      handle: handle.trim() || existingSocial?.handle || null,
      isActive
    };

    const confirm = await this.askQuestion(`\n✅ ¿Guardar cambios en ${platform}? (s/n): `);
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Operación cancelada');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/api/gym/social-media`,
        requestData,
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log(`\n✅ Red social ${platform} ${existingSocial ? 'actualizada' : 'creada'} exitosamente`);
        await this.loadAllGymData();
      } else {
        console.log('\n❌ Error:', response.data.message);
      }

    } catch (error) {
      console.error('\n❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ 11. ACTIVAR/DESACTIVAR RED SOCIAL
  async toggleSocialMedia() {
    console.log('\n🔄 ACTIVAR/DESACTIVAR RED SOCIAL');
    console.log('='.repeat(80));

    if (!this.socialMedia || Object.keys(this.socialMedia).length === 0) {
      console.log('❌ No hay redes sociales configuradas');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    console.log('\n📱 Redes sociales:');
    const platforms = Object.keys(this.socialMedia);
    platforms.forEach((platform, index) => {
      const data = this.socialMedia[platform];
      const status = data?.active ? '✅ ACTIVA' : '❌ INACTIVA';
      console.log(`   ${index + 1}. ${this.getPlatformIcon(platform)} ${platform} - ${status}`);
    });

    const choice = await this.askQuestion('\n📱 Selecciona red social (0 para cancelar): ');
    const platformIndex = parseInt(choice) - 1;

    if (choice === '0') return;

    if (platformIndex < 0 || platformIndex >= platforms.length) {
      console.log('❌ Selección inválida');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const platform = platforms[platformIndex];
    const currentStatus = this.socialMedia[platform]?.active;
    const newStatus = currentStatus ? 'desactivar' : 'activar';

    const confirm = await this.askQuestion(`\n✅ ¿${newStatus.toUpperCase()} "${platform}"? (s/n): `);
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Operación cancelada');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    try {
      const response = await axios.patch(
        `${this.baseURL}/api/gym/social-media/${platform}/toggle`,
        {},
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log(`\n✅ Red social ${platform} ${newStatus}da exitosamente`);
        console.log(`   Estado actual: ${response.data.data.isActive ? 'ACTIVA' : 'INACTIVA'}`);
        await this.loadAllGymData();
      } else {
        console.log('\n❌ Error:', response.data.message);
      }

    } catch (error) {
      console.error('\n❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ 12. VER ESTADÍSTICAS
  async showStatistics() {
    console.log('\n📊 ESTADÍSTICAS DEL GYM');
    console.log('='.repeat(80));

    if (this.stats.length === 0) {
      console.log('❌ No hay estadísticas disponibles');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    console.log('\n📈 MÉTRICAS PRINCIPALES:\n');
    this.stats.forEach(stat => {
      console.log(`   ${this.getColorIcon(stat.color)} ${stat.number} ${stat.label}`);
      if (stat.description) {
        console.log(`      ${stat.description}`);
      }
    });

    console.log(`\n📊 Total: ${this.stats.length} estadísticas activas`);
    console.log('\n💡 TIP: Usa test-statistics-manager.js para gestionar estadísticas');

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ 13. VER SERVICIOS
  async showServices() {
    console.log('\n🏋️  SERVICIOS DEL GYM');
    console.log('='.repeat(80));

    if (this.services.length === 0) {
      console.log('❌ No hay servicios disponibles');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    console.log('\n');
    this.services.forEach((service, index) => {
      const statusIcon = service.active ? '✅' : '❌';
      console.log(`${statusIcon} ${index + 1}. ${service.title}`);
      console.log(`   📝 ${service.description}`);
      if (service.features && service.features.length > 0) {
        console.log(`   ✨ Características:`);
        service.features.forEach(feature => {
          console.log(`      • ${feature}`);
        });
      }
      console.log('');
    });

    const activeCount = this.services.filter(s => s.active).length;
    console.log(`📊 Total: ${this.services.length} servicios`);
    console.log(`   ✅ Activos: ${activeCount}`);
    console.log(`   ❌ Inactivos: ${this.services.length - activeCount}`);

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ 14. VER PLANES DE MEMBRESÍA
  async showMembershipPlans() {
    console.log('\n💳 PLANES DE MEMBRESÍA');
    console.log('='.repeat(80));

    if (this.plans.length === 0) {
      console.log('❌ No hay planes disponibles');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    console.log('\n');
    this.plans.forEach((plan, index) => {
      const popularIcon = plan.popular ? '⭐' : '  ';
      const activeIcon = plan.active ? '✅' : '❌';
      
      console.log(`${activeIcon} ${popularIcon} ${index + 1}. ${plan.name}`);
      console.log(`   💰 Precio: ${plan.currency} ${plan.price}/${plan.duration}`);
      
      if (plan.originalPrice && plan.originalPrice > plan.price) {
        const discount = plan.discountPercentage || 0;
        console.log(`   🏷️  Precio original: ${plan.currency} ${plan.originalPrice} (${discount}% OFF)`);
      }
      
      if (plan.features && plan.features.length > 0) {
        console.log(`   ✨ Incluye:`);
        plan.features.forEach(feature => {
          console.log(`      ✓ ${feature}`);
        });
      }
      console.log('');
    });

    const activeCount = this.plans.filter(p => p.active).length;
    const popularPlan = this.plans.find(p => p.popular);
    
    console.log(`📊 Total: ${this.plans.length} planes`);
    console.log(`   ✅ Activos: ${activeCount}`);
    if (popularPlan) {
      console.log(`   ⭐ Más popular: ${popularPlan.name}`);
    }

    console.log('\n💡 TIP: Usa test-membership-plans-manager.js para gestionar planes');

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ 15. REINICIALIZAR DATOS POR DEFECTO
  async reinitializeDefaults() {
    console.log('\n🌱 REINICIALIZAR DATOS POR DEFECTO');
    console.log('='.repeat(80));
    console.log('⚠️  ADVERTENCIA: Esto recreará los datos por defecto del sistema');
    console.log('   Algunos datos existentes podrían ser sobrescritos');

    const confirm = await this.askQuestion('\n✅ ¿Continuar con la reinicialización? (escribe "REINICIAR"): ');
    
    if (confirm !== 'REINICIAR') {
      console.log('❌ Operación cancelada');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/api/gym/initialize`,
        {},
        { headers: { 'Authorization': `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log('\n✅ Datos por defecto reinicializados exitosamente');
        console.log('\n📋 Datos creados:');
        console.log('   ✅ Configuración básica');
        console.log('   ✅ Información de contacto');
        console.log('   ✅ Estadísticas');
        console.log('   ✅ Servicios');
        console.log('   ✅ Planes de membresía');
        console.log('   ✅ Testimonios');
        console.log('   ✅ Redes sociales');
        console.log('   ✅ Navegación');
        console.log('   ✅ Contenido promocional');
        console.log('   ✅ Configuración de branding');
        
        await this.loadAllGymData();
      } else {
        console.log('\n❌ Error:', response.data.message);
      }

    } catch (error) {
      console.error('\n❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ 16. EXPORTAR CONFIGURACIÓN
  async exportConfiguration() {
    console.log('\n📤 EXPORTAR CONFIGURACIÓN COMPLETA');
    console.log('='.repeat(80));

    const fullConfig = {
      timestamp: new Date().toISOString(),
      gymName: this.gymConfig?.name,
      configuration: {
        basic: {
          name: this.gymConfig?.name,
          tagline: this.gymConfig?.tagline,
          description: this.gymConfig?.description
        },
        contact: this.contactInfo,
        socialMedia: this.socialMedia,
        multimedia: this.gymConfig?.multimedia
      },
      content: {
        statistics: this.stats,
        services: this.services,
        membershipPlans: this.plans
      },
      summary: {
        totalStats: this.stats.length,
        totalServices: this.services.length,
        totalPlans: this.plans.length,
        totalSocialMedia: Object.keys(this.socialMedia).length
      }
    };

    console.log('\n📋 CONFIGURACIÓN COMPLETA:');
    console.log(JSON.stringify(fullConfig, null, 2));

    console.log('\n💾 Para guardar en archivo, ejecuta:');
    console.log('   node test-gym-info-manager.js --export > gym-config-export.json');

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ✅ FUNCIONES AUXILIARES
  getPlatformIcon(platform) {
    const icons = {
      'instagram': '📷',
      'facebook': '📘',
      'youtube': '📹',
      'whatsapp': '💬',
      'tiktok': '🎵',
      'twitter': '🐦'
    };
    return icons[platform] || '🌐';
  }

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
  console.log('\n🏢 Elite Fitness Club - Gestor de Información del Gym v1.0 ✅\n');
  
  console.log('🎯 FUNCIONALIDADES:');
  console.log('  📋 Ver configuración completa del gimnasio');
  console.log('  ✏️  Editar información básica (nombre, descripción)');
  console.log('  🎨 Editar colores del tema');
  console.log('  📞 Ver/Editar información de contacto');
  console.log('  📱 Gestionar redes sociales (crear, editar, activar/desactivar)');
  console.log('  📊 Ver estadísticas, servicios y planes');
  console.log('  🌱 Reinicializar datos por defecto');
  console.log('  📤 Exportar configuración completa\n');
  
  console.log('📡 ENDPOINTS PRINCIPALES:');
  console.log('  GET  /api/gym/config               - Configuración básica');
  console.log('  PUT  /api/gym/config               - Actualizar config');
  console.log('  GET  /api/gym/contact              - Info de contacto');
  console.log('  PUT  /api/gym/contact              - Actualizar contacto');
  console.log('  GET  /api/gym/social-media         - Redes sociales');
  console.log('  GET  /api/gym/social-media/all     - Todas las redes (admin)');
  console.log('  POST /api/gym/social-media         - Crear/actualizar red');
  console.log('  PATCH /api/gym/social-media/:platform/toggle - Toggle');
  console.log('  GET  /api/gym/stats                - Estadísticas');
  console.log('  GET  /api/gym/services             - Servicios');
  console.log('  GET  /api/gym/membership-plans     - Planes');
  console.log('  POST /api/gym/initialize           - Reinicializar\n');
  
  console.log('🚀 USO:');
  console.log('  node test-gym-info-manager.js        # Gestor interactivo');
  console.log('  node test-gym-info-manager.js --help # Esta ayuda');
  console.log('  node test-gym-info-manager.js --export > config.json # Exportar\n');
  
  console.log('📋 REQUISITOS:');
  console.log('  • Servidor en puerto 5000');
  console.log('  • Usuario admin: admin@gym.com / Admin123!');
  console.log('  • Endpoints del gym configurados\n');
  
  console.log('💡 TESTS COMPLEMENTARIOS:');
  console.log('  • test-statistics-manager.js   - Gestionar estadísticas');
  console.log('  • test-membership-plans-manager.js - Gestionar planes');
  console.log('  • test-schedule-manager.js     - Gestionar horarios\n');
}

// ✅ FUNCIÓN PRINCIPAL
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  if (args.includes('--export')) {
    // Modo silencioso para exportación
    const manager = new GymInfoManager();
    await manager.loginAdmin();
    await manager.loadAllGymData();
    await manager.exportConfiguration();
    manager.rl.close();
    return;
  }
  
  const manager = new GymInfoManager();
  await manager.start();
}

// ✅ EJECUTAR
if (require.main === module) {
  main().catch(error => {
    console.error('\n🚨 ERROR CRÍTICO:', error.message);
    process.exit(1);
  });
}

module.exports = { GymInfoManager };