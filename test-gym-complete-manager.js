// test-gym-complete-manager.js - GESTOR COMPLETO: Info Gym, Contacto, Redes Sociales y Servicios ✅
const axios = require('axios');
const readline = require('readline');
require('dotenv').config();

class GymCompleteManager {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.adminToken = null;
    this.gymConfig = null;
    this.contactInfo = null;
    this.socialMedia = {};
    this.services = [];
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.log('🏢 Elite Fitness Club - Gestor Completo de Información ✅');
    console.log('='.repeat(80));
    console.log('📋 GESTIÓN: Información básica, contacto, redes sociales y servicios');
    console.log('🎯 CRUD COMPLETO: Crear, Ver, Actualizar y Eliminar servicios\n');
    
    try {
      await this.loginAdmin();
      await this.loadAllData();
      await this.showMainMenu();
      
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      if (error.response) {
        console.error('📋 Detalles:', {
          status: error.response.status,
          data: error.response.data
        });
      }
    } finally {
      this.rl.close();
    }
  }

  // ==================== AUTENTICACIÓN ====================
  async loginAdmin() {
    console.log('🔐 Autenticando como administrador...');
    
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'admin@gym.com',
        password: 'Admin123!'
      });

      if (response.data.success && response.data.data.token) {
        this.adminToken = response.data.data.token;
        console.log('✅ Autenticación exitosa');
        console.log(`👤 ${response.data.data.user.firstName} ${response.data.data.user.lastName}\n`);
      } else {
        throw new Error('Respuesta de login inválida');
      }
    } catch (error) {
      throw new Error(`Autenticación falló: ${error.message}`);
    }
  }

  // ==================== CARGAR DATOS ====================
  async loadAllData() {
    console.log('📥 Cargando información del gimnasio...');
    
    try {
      // Configuración básica
      const configRes = await axios.get(`${this.baseURL}/api/gym/config`);
      if (configRes.data.success) {
        this.gymConfig = configRes.data.data;
        console.log('   ✅ Configuración básica');
      }

      // Información de contacto
      const contactRes = await axios.get(`${this.baseURL}/api/gym/contact`);
      if (contactRes.data.success) {
        this.contactInfo = contactRes.data.data;
        console.log('   ✅ Información de contacto');
      }

      // Redes sociales
      const socialRes = await axios.get(`${this.baseURL}/api/gym/social-media`);
      if (socialRes.data.success) {
        this.socialMedia = socialRes.data.data;
        console.log('   ✅ Redes sociales');
      }

      // Servicios
      const servicesRes = await axios.get(`${this.baseURL}/api/gym/services`);
      if (servicesRes.data.success) {
        this.services = servicesRes.data.data;
        console.log('   ✅ Servicios');
      }

      console.log('\n✅ Datos cargados correctamente\n');
      
    } catch (error) {
      console.log(`❌ Error cargando datos: ${error.message}`);
      throw error;
    }
  }

  // ==================== MENÚ PRINCIPAL ====================
  async showMainMenu() {
    console.log('\n' + '='.repeat(80));
    console.log('🏢 GESTOR COMPLETO - MENÚ PRINCIPAL');
    console.log('='.repeat(80));
    
    console.log('\n📋 INFORMACIÓN DEL GIMNASIO:');
    console.log('  1. 🏢 Ver información completa del gym');
    console.log('  2. ✏️  Editar información básica (nombre, tagline, descripción)');
    console.log('  3. 📞 Ver/Editar información de contacto');
    
    console.log('\n📱 REDES SOCIALES:');
    console.log('  4. 📱 Ver todas las redes sociales');
    console.log('  5. ➕ Agregar nueva red social');
    console.log('  6. ✏️  Editar red social existente');
    console.log('  7. 🗑️  Eliminar red social');
    console.log('  8. 🔄 Activar/Desactivar red social');
    
    console.log('\n🏋️  SERVICIOS (CRUD COMPLETO):');
    console.log('  9. 📋 Ver todos los servicios');
    console.log('  10. ➕ Crear nuevo servicio');
    console.log('  11. ✏️  Editar servicio existente');
    console.log('  12. 🗑️  Eliminar servicio');
    console.log('  13. 🔄 Activar/Desactivar servicio');
    
    console.log('\n🔧 UTILIDADES:');
    console.log('  14. 🔄 Recargar todos los datos');
    console.log('  15. 📊 Ver resumen completo');
    console.log('  0. 🚪 Salir');
    
    const choice = await this.askQuestion('\n🏢 Selecciona una opción (0-15): ');
    
    switch (choice.trim()) {
      case '1': await this.showCompleteInfo(); break;
      case '2': await this.editBasicInfo(); break;
      case '3': await this.manageContactInfo(); break;
      case '4': await this.showAllSocialMedia(); break;
      case '5': await this.createSocialMedia(); break;
      case '6': await this.editSocialMedia(); break;
      case '7': await this.deleteSocialMedia(); break;
      case '8': await this.toggleSocialMedia(); break;
      case '9': await this.showAllServices(); break;
      case '10': await this.createService(); break;
      case '11': await this.editService(); break;
      case '12': await this.deleteService(); break;
      case '13': await this.toggleService(); break;
      case '14': await this.reloadAllData(); break;
      case '15': await this.showCompleteSummary(); break;
      case '0':
        console.log('\n👋 ¡Hasta luego!');
        return;
      default:
        console.log('\n❌ Opción inválida');
    }
    
    await this.showMainMenu();
  }

  // ==================== 1. VER INFORMACIÓN COMPLETA ====================
  async showCompleteInfo() {
    console.log('\n' + '='.repeat(80));
    console.log('🏢 INFORMACIÓN COMPLETA DEL GIMNASIO');
    console.log('='.repeat(80));

    console.log('\n📝 INFORMACIÓN BÁSICA:');
    console.log(`   Nombre: ${this.gymConfig?.name || 'N/A'}`);
    console.log(`   Tagline: ${this.gymConfig?.tagline || 'N/A'}`);
    console.log(`   Descripción: ${this.gymConfig?.description || 'N/A'}`);

    console.log('\n📞 INFORMACIÓN DE CONTACTO:');
    console.log(`   📍 Dirección: ${this.contactInfo?.address || 'N/A'}`);
    console.log(`   📱 Teléfono: ${this.contactInfo?.phone || 'N/A'}`);
    console.log(`   📧 Email: ${this.contactInfo?.email || 'N/A'}`);
    console.log(`   💬 WhatsApp: ${this.contactInfo?.whatsapp || this.contactInfo?.phone || 'N/A'}`);
    
    if (this.contactInfo?.location) {
      console.log(`   🗺️  Google Maps: ${this.contactInfo.location.mapsUrl || 'N/A'}`);
    }

    console.log('\n📱 REDES SOCIALES:');
    if (Object.keys(this.socialMedia).length > 0) {
      Object.entries(this.socialMedia).forEach(([platform, data]) => {
        if (data && typeof data === 'object') {
          const icon = data.active ? '✅' : '❌';
          console.log(`   ${icon} ${this.getPlatformIcon(platform)} ${platform}: ${data.url}`);
          if (data.handle) console.log(`      Handle: ${data.handle}`);
        }
      });
    } else {
      console.log('   ❌ No hay redes sociales configuradas');
    }

    console.log('\n🏋️  SERVICIOS:');
    if (this.services.length > 0) {
      this.services.forEach((service, index) => {
        const icon = service.active ? '✅' : '❌';
        console.log(`   ${icon} ${index + 1}. ${service.title}`);
      });
      console.log(`\n   Total: ${this.services.length} servicios`);
    } else {
      console.log('   ❌ No hay servicios configurados');
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ==================== 2. EDITAR INFORMACIÓN BÁSICA ====================
  async editBasicInfo() {
    console.log('\n' + '='.repeat(80));
    console.log('✏️  EDITAR INFORMACIÓN BÁSICA DEL GIMNASIO');
    console.log('='.repeat(80));

    console.log('\n📝 DATOS ACTUALES:');
    console.log(`   Nombre: ${this.gymConfig?.name || 'N/A'}`);
    console.log(`   Tagline: ${this.gymConfig?.tagline || 'N/A'}`);
    console.log(`   Descripción: ${this.gymConfig?.description || 'N/A'}`);

    console.log('\n💡 Presiona Enter para mantener el valor actual\n');

    const updates = {};

    const name = await this.askQuestion(`🏢 Nombre [${this.gymConfig?.name}]: `);
    if (name.trim()) updates.gymName = name.trim();

    const tagline = await this.askQuestion(`💬 Tagline [${this.gymConfig?.tagline}]: `);
    if (tagline.trim()) updates.gymTagline = tagline.trim();

    const description = await this.askQuestion(`📝 Descripción [${this.gymConfig?.description}]: `);
    if (description.trim()) updates.gymDescription = description.trim();

    if (Object.keys(updates).length === 0) {
      console.log('\n❌ No se realizaron cambios');
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
        { headers: { Authorization: `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log('\n✅ Información básica actualizada exitosamente');
        await this.loadAllData();
      } else {
        console.log('\n❌ Error:', response.data.message);
      }
    } catch (error) {
      console.error('\n❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ==================== 3. GESTIONAR CONTACTO ====================
  async manageContactInfo() {
    console.log('\n' + '='.repeat(80));
    console.log('📞 GESTIONAR INFORMACIÓN DE CONTACTO');
    console.log('='.repeat(80));

    console.log('\n📋 DATOS ACTUALES:');
    console.log(`   📍 Dirección: ${this.contactInfo?.address || 'N/A'}`);
    console.log(`   📱 Teléfono: ${this.contactInfo?.phone || 'N/A'}`);
    console.log(`   📧 Email: ${this.contactInfo?.email || 'N/A'}`);
    console.log(`   🗺️  Google Maps: ${this.contactInfo?.location?.mapsUrl || 'N/A'}`);

    console.log('\n💡 Presiona Enter para mantener el valor actual\n');

    const updates = {};

    const address = await this.askQuestion(`📍 Dirección [${this.contactInfo?.address}]: `);
    if (address.trim()) updates.address = address.trim();

    const phone = await this.askQuestion(`📱 Teléfono [${this.contactInfo?.phone}]: `);
    if (phone.trim()) updates.phone = phone.trim();

    const email = await this.askQuestion(`📧 Email [${this.contactInfo?.email}]: `);
    if (email.trim()) updates.email = email.trim();

    const mapsUrl = await this.askQuestion(`🗺️  Google Maps URL [actual]: `);
    if (mapsUrl.trim()) updates.mapsUrl = mapsUrl.trim();

    if (Object.keys(updates).length === 0) {
      console.log('\n❌ No se realizaron cambios');
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
        `${this.baseURL}/api/gym/contact`,
        updates,
        { headers: { Authorization: `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log('\n✅ Información de contacto actualizada exitosamente');
        await this.loadAllData();
      } else {
        console.log('\n❌ Error:', response.data.message);
      }
    } catch (error) {
      console.error('\n❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ==================== 4. VER REDES SOCIALES ====================
  async showAllSocialMedia() {
    console.log('\n' + '='.repeat(80));
    console.log('📱 TODAS LAS REDES SOCIALES');
    console.log('='.repeat(80));

    if (Object.keys(this.socialMedia).length === 0) {
      console.log('\n❌ No hay redes sociales configuradas');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    console.log('\n');
    Object.entries(this.socialMedia).forEach(([platform, data]) => {
      if (data && typeof data === 'object') {
        const icon = data.active ? '✅ ACTIVA' : '❌ INACTIVA';
        console.log(`${this.getPlatformIcon(platform)} ${platform.toUpperCase()} - ${icon}`);
        console.log(`   URL: ${data.url}`);
        console.log(`   Handle: ${data.handle || 'N/A'}`);
        console.log('');
      }
    });

    const active = Object.values(this.socialMedia).filter(s => s?.active).length;
    console.log(`📊 Total: ${Object.keys(this.socialMedia).length} redes`);
    console.log(`   ✅ Activas: ${active}`);
    console.log(`   ❌ Inactivas: ${Object.keys(this.socialMedia).length - active}`);

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ==================== 5. CREAR RED SOCIAL ====================
  async createSocialMedia() {
    console.log('\n' + '='.repeat(80));
    console.log('➕ CREAR NUEVA RED SOCIAL');
    console.log('='.repeat(80));

    console.log('\n📱 Plataformas disponibles:');
    const platforms = ['instagram', 'facebook', 'youtube', 'whatsapp', 'tiktok', 'twitter'];
    platforms.forEach((p, i) => {
      console.log(`   ${i + 1}. ${this.getPlatformIcon(p)} ${p.charAt(0).toUpperCase() + p.slice(1)}`);
    });

    const choice = await this.askQuestion('\n📱 Selecciona plataforma (1-6, 0 cancelar): ');
    const index = parseInt(choice) - 1;

    if (choice === '0') return;
    if (index < 0 || index >= platforms.length) {
      console.log('❌ Plataforma inválida');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const platform = platforms[index];
    console.log(`\n📱 Creando: ${platform.toUpperCase()}\n`);

    const url = await this.askQuestion('🔗 URL (requerida): ');
    if (!url.trim()) {
      console.log('❌ URL es requerida');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const handle = await this.askQuestion('👤 Handle/Usuario (opcional): ');
    
    const activeInput = await this.askQuestion('✅ ¿Activar ahora? (s/n) [s]: ');
    const isActive = activeInput.toLowerCase() !== 'n';

    const confirm = await this.askQuestion(`\n✅ ¿Crear red social "${platform}"? (s/n): `);
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Operación cancelada');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/api/gym/social-media`,
        {
          platform,
          url: url.trim(),
          handle: handle.trim() || null,
          isActive
        },
        { headers: { Authorization: `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log(`\n✅ Red social "${platform}" creada exitosamente`);
        await this.loadAllData();
      } else {
        console.log('\n❌ Error:', response.data.message);
      }
    } catch (error) {
      console.error('\n❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ==================== 6. EDITAR RED SOCIAL ====================
  async editSocialMedia() {
    console.log('\n' + '='.repeat(80));
    console.log('✏️  EDITAR RED SOCIAL');
    console.log('='.repeat(80));

    if (Object.keys(this.socialMedia).length === 0) {
      console.log('\n❌ No hay redes sociales para editar');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    console.log('\n📱 Redes sociales disponibles:');
    const platforms = Object.keys(this.socialMedia);
    platforms.forEach((p, i) => {
      const data = this.socialMedia[p];
      const status = data?.active ? '✅' : '❌';
      console.log(`   ${i + 1}. ${status} ${this.getPlatformIcon(p)} ${p}`);
    });

    const choice = await this.askQuestion('\n📱 Selecciona red social (0 cancelar): ');
    const index = parseInt(choice) - 1;

    if (choice === '0') return;
    if (index < 0 || index >= platforms.length) {
      console.log('❌ Selección inválida');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const platform = platforms[index];
    const current = this.socialMedia[platform];

    console.log(`\n✏️  Editando: ${platform.toUpperCase()}`);
    console.log('💡 Presiona Enter para mantener el valor actual\n');

    const url = await this.askQuestion(`🔗 URL [${current.url}]: `);
    const handle = await this.askQuestion(`👤 Handle [${current.handle || 'N/A'}]: `);

    const updates = {};
    if (url.trim()) updates.url = url.trim();
    if (handle.trim()) updates.handle = handle.trim();

    if (Object.keys(updates).length === 0) {
      console.log('\n❌ No se realizaron cambios');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const confirm = await this.askQuestion(`\n✅ ¿Guardar cambios en "${platform}"? (s/n): `);
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Cambios cancelados');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    try {
      const response = await axios.put(
        `${this.baseURL}/api/gym/social-media/${platform}`,
        updates,
        { headers: { Authorization: `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log(`\n✅ Red social "${platform}" actualizada exitosamente`);
        await this.loadAllData();
      } else {
        console.log('\n❌ Error:', response.data.message);
      }
    } catch (error) {
      console.error('\n❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ==================== 7. ELIMINAR RED SOCIAL ====================
  async deleteSocialMedia() {
    console.log('\n' + '='.repeat(80));
    console.log('🗑️  ELIMINAR RED SOCIAL');
    console.log('='.repeat(80));

    if (Object.keys(this.socialMedia).length === 0) {
      console.log('\n❌ No hay redes sociales para eliminar');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    console.log('\n📱 Redes sociales:');
    const platforms = Object.keys(this.socialMedia);
    platforms.forEach((p, i) => {
      console.log(`   ${i + 1}. ${this.getPlatformIcon(p)} ${p}: ${this.socialMedia[p].url}`);
    });

    const choice = await this.askQuestion('\n🗑️  Selecciona red social a eliminar (0 cancelar): ');
    const index = parseInt(choice) - 1;

    if (choice === '0') return;
    if (index < 0 || index >= platforms.length) {
      console.log('❌ Selección inválida');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const platform = platforms[index];

    console.log(`\n⚠️  Estás a punto de ELIMINAR la red social "${platform}"`);
    const confirm = await this.askQuestion('⚠️  ¿Confirmar eliminación? (escribe "ELIMINAR"): ');
    
    if (confirm !== 'ELIMINAR') {
      console.log('❌ Eliminación cancelada');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    try {
      const response = await axios.delete(
        `${this.baseURL}/api/gym/social-media/${platform}`,
        { headers: { Authorization: `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log(`\n✅ Red social "${platform}" eliminada exitosamente`);
        await this.loadAllData();
      } else {
        console.log('\n❌ Error:', response.data.message);
      }
    } catch (error) {
      console.error('\n❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ==================== 8. TOGGLE RED SOCIAL ====================
  async toggleSocialMedia() {
    console.log('\n' + '='.repeat(80));
    console.log('🔄 ACTIVAR/DESACTIVAR RED SOCIAL');
    console.log('='.repeat(80));

    if (Object.keys(this.socialMedia).length === 0) {
      console.log('\n❌ No hay redes sociales configuradas');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    console.log('\n📱 Redes sociales:');
    const platforms = Object.keys(this.socialMedia);
    platforms.forEach((p, i) => {
      const status = this.socialMedia[p]?.active ? '✅ ACTIVA' : '❌ INACTIVA';
      console.log(`   ${i + 1}. ${this.getPlatformIcon(p)} ${p} - ${status}`);
    });

    const choice = await this.askQuestion('\n🔄 Selecciona red social (0 cancelar): ');
    const index = parseInt(choice) - 1;

    if (choice === '0') return;
    if (index < 0 || index >= platforms.length) {
      console.log('❌ Selección inválida');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const platform = platforms[index];
    const currentStatus = this.socialMedia[platform]?.active;
    const action = currentStatus ? 'desactivar' : 'activar';

    const confirm = await this.askQuestion(`\n✅ ¿${action.toUpperCase()} "${platform}"? (s/n): `);
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Operación cancelada');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    try {
      const response = await axios.patch(
        `${this.baseURL}/api/gym/social-media/${platform}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        const newStatus = response.data.data.isActive ? 'ACTIVADA' : 'DESACTIVADA';
        console.log(`\n✅ Red social "${platform}" ${newStatus} exitosamente`);
        await this.loadAllData();
      } else {
        console.log('\n❌ Error:', response.data.message);
      }
    } catch (error) {
      console.error('\n❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ==================== 9. VER SERVICIOS ====================
  async showAllServices() {
    console.log('\n' + '='.repeat(80));
    console.log('🏋️  TODOS LOS SERVICIOS');
    console.log('='.repeat(80));

    if (this.services.length === 0) {
      console.log('\n❌ No hay servicios configurados');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    console.log('\n');
    this.services.forEach((service, index) => {
      const icon = service.active ? '✅' : '❌';
      console.log(`${icon} ${index + 1}. ${service.title}`);
      console.log(`   📝 ${service.description}`);
      console.log(`   🎯 Icono: ${service.icon}`);
      
      if (service.features && service.features.length > 0) {
        console.log('   ✨ Características:');
        service.features.forEach(f => console.log(`      • ${f}`));
      }
      console.log('');
    });

    const active = this.services.filter(s => s.active).length;
    console.log(`📊 Total: ${this.services.length} servicios`);
    console.log(`   ✅ Activos: ${active}`);
    console.log(`   ❌ Inactivos: ${this.services.length - active}`);

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ==================== 10. CREAR SERVICIO ====================
  async createService() {
    console.log('\n' + '='.repeat(80));
    console.log('➕ CREAR NUEVO SERVICIO');
    console.log('='.repeat(80));

    console.log('\n📝 Ingresa los datos del nuevo servicio:\n');

    const title = await this.askQuestion('🏷️  Título (requerido): ');
    if (!title.trim()) {
      console.log('❌ El título es requerido');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const description = await this.askQuestion('📝 Descripción (requerida): ');
    if (!description.trim()) {
      console.log('❌ La descripción es requerida');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const icon = await this.askQuestion('🎯 Icono [Dumbbell]: ');

    console.log('\n✨ Características (opcional):');
    console.log('   Ingresa una por línea, línea vacía para terminar\n');
    
    const features = [];
    let featureNum = 1;
    while (true) {
      const feature = await this.askQuestion(`   ${featureNum}. `);
      if (!feature.trim()) break;
      features.push(feature.trim());
      featureNum++;
    }

    const activeInput = await this.askQuestion('\n✅ ¿Activar servicio? (s/n) [s]: ');
    const isActive = activeInput.toLowerCase() !== 'n';

    const confirm = await this.askQuestion('\n✅ ¿Crear este servicio? (s/n): ');
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Creación cancelada');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    try {
      // Nota: Necesitarás crear este endpoint en el backend
      const response = await axios.post(
        `${this.baseURL}/api/gym-services`,
        {
          title: title.trim(),
          description: description.trim(),
          iconName: icon.trim() || 'Dumbbell',
          features: features.length > 0 ? features : null,
          isActive
        },
        { headers: { Authorization: `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log('\n✅ Servicio creado exitosamente');
        await this.loadAllData();
      } else {
        console.log('\n❌ Error:', response.data.message);
      }
    } catch (error) {
      console.error('\n❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ==================== 11. EDITAR SERVICIO ====================
  async editService() {
    console.log('\n' + '='.repeat(80));
    console.log('✏️  EDITAR SERVICIO');
    console.log('='.repeat(80));

    if (this.services.length === 0) {
      console.log('\n❌ No hay servicios para editar');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    console.log('\n🏋️  Servicios disponibles:');
    this.services.forEach((s, i) => {
      const icon = s.active ? '✅' : '❌';
      console.log(`   ${i + 1}. ${icon} ${s.title}`);
    });

    const choice = await this.askQuestion('\n✏️  Selecciona servicio (0 cancelar): ');
    const index = parseInt(choice) - 1;

    if (choice === '0') return;
    if (index < 0 || index >= this.services.length) {
      console.log('❌ Selección inválida');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const service = this.services[index];
    console.log(`\n✏️  Editando: ${service.title}`);
    console.log('💡 Presiona Enter para mantener el valor actual\n');

    const title = await this.askQuestion(`🏷️  Título [${service.title}]: `);
    const description = await this.askQuestion(`📝 Descripción [${service.description}]: `);
    const icon = await this.askQuestion(`🎯 Icono [${service.icon}]: `);

    const updates = {};
    if (title.trim()) updates.title = title.trim();
    if (description.trim()) updates.description = description.trim();
    if (icon.trim()) updates.iconName = icon.trim();

    if (Object.keys(updates).length === 0) {
      console.log('\n❌ No se realizaron cambios');
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
        `${this.baseURL}/api/gym-services/${service.id}`,
        updates,
        { headers: { Authorization: `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log('\n✅ Servicio actualizado exitosamente');
        await this.loadAllData();
      } else {
        console.log('\n❌ Error:', response.data.message);
      }
    } catch (error) {
      console.error('\n❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ==================== 12. ELIMINAR SERVICIO ====================
  async deleteService() {
    console.log('\n' + '='.repeat(80));
    console.log('🗑️  ELIMINAR SERVICIO');
    console.log('='.repeat(80));

    if (this.services.length === 0) {
      console.log('\n❌ No hay servicios para eliminar');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    console.log('\n🏋️  Servicios:');
    this.services.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.title}`);
    });

    const choice = await this.askQuestion('\n🗑️  Selecciona servicio a eliminar (0 cancelar): ');
    const index = parseInt(choice) - 1;

    if (choice === '0') return;
    if (index < 0 || index >= this.services.length) {
      console.log('❌ Selección inválida');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const service = this.services[index];

    console.log(`\n⚠️  Estás a punto de ELIMINAR el servicio "${service.title}"`);
    const confirm = await this.askQuestion('⚠️  ¿Confirmar eliminación? (escribe "ELIMINAR"): ');
    
    if (confirm !== 'ELIMINAR') {
      console.log('❌ Eliminación cancelada');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    try {
      const response = await axios.delete(
        `${this.baseURL}/api/gym-services/${service.id}`,
        { headers: { Authorization: `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        console.log(`\n✅ Servicio "${service.title}" eliminado exitosamente`);
        await this.loadAllData();
      } else {
        console.log('\n❌ Error:', response.data.message);
      }
    } catch (error) {
      console.error('\n❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ==================== 13. TOGGLE SERVICIO ====================
  async toggleService() {
    console.log('\n' + '='.repeat(80));
    console.log('🔄 ACTIVAR/DESACTIVAR SERVICIO');
    console.log('='.repeat(80));

    if (this.services.length === 0) {
      console.log('\n❌ No hay servicios configurados');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    console.log('\n🏋️  Servicios:');
    this.services.forEach((s, i) => {
      const status = s.active ? '✅ ACTIVO' : '❌ INACTIVO';
      console.log(`   ${i + 1}. ${s.title} - ${status}`);
    });

    const choice = await this.askQuestion('\n🔄 Selecciona servicio (0 cancelar): ');
    const index = parseInt(choice) - 1;

    if (choice === '0') return;
    if (index < 0 || index >= this.services.length) {
      console.log('❌ Selección inválida');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    const service = this.services[index];
    const action = service.active ? 'desactivar' : 'activar';

    const confirm = await this.askQuestion(`\n✅ ¿${action.toUpperCase()} "${service.title}"? (s/n): `);
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Operación cancelada');
      await this.askQuestion('\n⏎ Presiona Enter para continuar...');
      return;
    }

    try {
      const response = await axios.patch(
        `${this.baseURL}/api/gym-services/${service.id}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        const newStatus = response.data.data.isActive ? 'ACTIVADO' : 'DESACTIVADO';
        console.log(`\n✅ Servicio "${service.title}" ${newStatus} exitosamente`);
        await this.loadAllData();
      } else {
        console.log('\n❌ Error:', response.data.message);
      }
    } catch (error) {
      console.error('\n❌ Error:', error.response?.data?.message || error.message);
    }

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ==================== 14. RECARGAR DATOS ====================
  async reloadAllData() {
    console.log('\n🔄 Recargando todos los datos...');
    try {
      await this.loadAllData();
      console.log('✅ Datos recargados exitosamente');
    } catch (error) {
      console.log(`❌ Error recargando: ${error.message}`);
    }
    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ==================== 15. RESUMEN COMPLETO ====================
  async showCompleteSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN COMPLETO DEL GIMNASIO');
    console.log('='.repeat(80));

    console.log('\n🏢 INFORMACIÓN BÁSICA:');
    console.log(`   Nombre: ${this.gymConfig?.name || 'N/A'}`);
    console.log(`   Tagline: ${this.gymConfig?.tagline || 'N/A'}`);

    console.log('\n📞 CONTACTO:');
    console.log(`   Teléfono: ${this.contactInfo?.phone || 'N/A'}`);
    console.log(`   Email: ${this.contactInfo?.email || 'N/A'}`);
    console.log(`   Dirección: ${this.contactInfo?.address || 'N/A'}`);

    console.log('\n📱 REDES SOCIALES:');
    const socialCount = Object.keys(this.socialMedia).length;
    const activeSocial = Object.values(this.socialMedia).filter(s => s?.active).length;
    console.log(`   Total: ${socialCount} redes`);
    console.log(`   Activas: ${activeSocial}`);
    console.log(`   Inactivas: ${socialCount - activeSocial}`);

    console.log('\n🏋️  SERVICIOS:');
    const activeServices = this.services.filter(s => s.active).length;
    console.log(`   Total: ${this.services.length} servicios`);
    console.log(`   Activos: ${activeServices}`);
    console.log(`   Inactivos: ${this.services.length - activeServices}`);

    console.log('\n📊 ESTADO GENERAL:');
    const hasContact = !!(this.contactInfo?.phone && this.contactInfo?.email);
    const hasSocial = socialCount > 0;
    const hasServices = this.services.length > 0;
    
    console.log(`   Contacto: ${hasContact ? '✅ Completo' : '⚠️  Incompleto'}`);
    console.log(`   Redes Sociales: ${hasSocial ? '✅ Configuradas' : '❌ Sin configurar'}`);
    console.log(`   Servicios: ${hasServices ? '✅ Configurados' : '❌ Sin configurar'}`);

    await this.askQuestion('\n⏎ Presiona Enter para continuar...');
  }

  // ==================== UTILIDADES ====================
  getPlatformIcon(platform) {
    const icons = {
      instagram: '📷',
      facebook: '📘',
      youtube: '📹',
      whatsapp: '💬',
      tiktok: '🎵',
      twitter: '🐦',
      linkedin: '💼'
    };
    return icons[platform] || '🌐';
  }

  askQuestion(question) {
    return new Promise(resolve => {
      this.rl.question(question, answer => resolve(answer));
    });
  }
}

// ==================== FUNCIÓN PRINCIPAL ====================
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('\n🏢 Elite Fitness Club - Gestor Completo de Información\n');
    console.log('📋 GESTIONA:');
    console.log('  • Información básica del gimnasio');
    console.log('  • Información de contacto (dirección, teléfono, email)');
    console.log('  • Redes sociales (CRUD completo)');
    console.log('  • Servicios (CRUD completo)\n');
    console.log('🚀 USO:');
    console.log('  node test-gym-complete-manager.js        # Iniciar gestor');
    console.log('  node test-gym-complete-manager.js --help # Ver ayuda\n');
    return;
  }
  
  const manager = new GymCompleteManager();
  await manager.start();
}

// ==================== EJECUTAR ====================
if (require.main === module) {
  main().catch(error => {
    console.error('\n🚨 ERROR CRÍTICO:', error.message);
    process.exit(1);
  });
}

module.exports = { GymCompleteManager };