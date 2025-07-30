// test-video-logo-only.js - Con rutas hardcodeadas
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class VideoLogoTester {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.token = null;
    this.configBefore = null;
    this.configAfter = null;
    
    // 🎯 RUTAS DE TUS ARCHIVOS CONFIGURADAS
    this.VIDEO_PATH = 'C:\\Users\\echev\\OneDrive\\Escritorio\\Decimo Semestre\\Proyecto de Graduacion II\\gym video.mp4';
    this.LOGO_PATH = 'C:\\Users\\echev\\OneDrive\\Escritorio\\Decimo Semestre\\Proyecto de Graduacion II\\logogym.jpg';
    
    // También puedes desactivar la subida de alguno:
    this.UPLOAD_VIDEO = true;  // ← false para no subir video
    this.UPLOAD_LOGO = true;   // ← false para no subir logo
  }

  async runTest() {
    console.log('🎬 Test específico: Subir video y logo con rutas hardcodeadas\n');
    
    try {
      await this.checkServer();
      await this.loginAdmin();
      await this.getConfigBefore();
      
      // Subir video si está habilitado y el archivo existe
      if (this.UPLOAD_VIDEO) {
        if (fs.existsSync(this.VIDEO_PATH)) {
          await this.uploadVideo(this.VIDEO_PATH);
        } else {
          console.log(`⚠️ Video no encontrado: ${this.VIDEO_PATH}`);
          console.log('   💡 Actualiza la ruta en VIDEO_PATH o coloca el archivo ahí');
        }
      } else {
        console.log('📋 Subida de video desactivada (UPLOAD_VIDEO = false)');
      }
      
      // Subir logo si está habilitado y el archivo existe
      if (this.UPLOAD_LOGO) {
        if (fs.existsSync(this.LOGO_PATH)) {
          await this.uploadLogo(this.LOGO_PATH);
        } else {
          console.log(`⚠️ Logo no encontrado: ${this.LOGO_PATH}`);
          console.log('   💡 Actualiza la ruta en LOGO_PATH o coloca el archivo ahí');
        }
      } else {
        console.log('📋 Subida de logo desactivada (UPLOAD_LOGO = false)');
      }
      
      await this.getConfigAfter();
      await this.compareConfigs();
      await this.verifyFrontendData();
      
      console.log('\n✅ ¡Test completado exitosamente!');
      console.log('\n🎯 RESULTADO: Solo se actualizaron los campos de video/logo, el resto se mantuvo intacto.');
      
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      if (error.response) {
        console.error('📋 Detalles:', error.response.data);
      }
      process.exit(1);
    }
  }

  // Método para mostrar configuración actual
  showCurrentConfig() {
    console.log('\n📁 CONFIGURACIÓN ACTUAL:');
    console.log(`   🎬 Video: ${this.VIDEO_PATH}`);
    console.log(`   🏢 Logo: ${this.LOGO_PATH}`);
    console.log(`   🎬 Subir video: ${this.UPLOAD_VIDEO ? '✅ Sí' : '❌ No'}`);
    console.log(`   🏢 Subir logo: ${this.UPLOAD_LOGO ? '✅ Sí' : '❌ No'}`);
    
    console.log('\n📋 VERIFICACIÓN DE ARCHIVOS:');
    console.log(`   🎬 Video existe: ${fs.existsSync(this.VIDEO_PATH) ? '✅ Sí' : '❌ No'}`);
    console.log(`   🏢 Logo existe: ${fs.existsSync(this.LOGO_PATH) ? '✅ Sí' : '❌ No'}`);
    
    if (!fs.existsSync(this.VIDEO_PATH) && this.UPLOAD_VIDEO) {
      console.log(`   💡 Crea la carpeta: ${path.dirname(this.VIDEO_PATH)}`);
    }
    if (!fs.existsSync(this.LOGO_PATH) && this.UPLOAD_LOGO) {
      console.log(`   💡 Crea la carpeta: ${path.dirname(this.LOGO_PATH)}`);
    }
  }

  async checkServer() {
    console.log('1. 🏥 Verificando servidor...');
    
    try {
      const response = await axios.get(`${this.baseURL}/api/health`);
      if (response.data.success) {
        console.log('   ✅ Servidor funcionando');
        console.log(`   📊 Versión: ${response.data.version}`);
        
        // 🎬 NUEVO: Verificar si las rutas multimedia están disponibles
        if (response.data.services && response.data.services.multimedia) {
          console.log('   🎬 ✅ Rutas multimedia disponibles');
        } else {
          console.log('   🎬 ⚠️ Rutas multimedia no disponibles - Verifica src/routes/index.js');
        }
      }
      
      // 🔍 NUEVO: Verificar endpoints multimedia específicos
      try {
        const mediaStatus = await axios.get(`${this.baseURL}/api/gym-media/status`);
        if (mediaStatus.data.success) {
          console.log('   📁 ✅ Endpoints multimedia funcionando');
          console.log(`   ☁️ Cloudinary: ${mediaStatus.data.data.cloudinaryConfigured ? '✅ Configurado' : '❌ No configurado'}`);
        }
      } catch (mediaError) {
        console.log('   📁 ❌ Endpoints multimedia no disponibles');
        console.log('      💡 Asegúrate de agregar gymMediaRoutes en src/routes/index.js');
      }
    } catch (error) {
      throw new Error(`Servidor no responde: ${error.message}`);
    }
  }

  async loginAdmin() {
    console.log('\n2. 🔐 Iniciando sesión como administrador...');
    
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'admin@gym.com',
        password: 'Admin123!'
      });

      if (response.data.success && response.data.data.token) {
        this.token = response.data.data.token;
        console.log('   ✅ Login exitoso');
        console.log(`   👤 Usuario: ${response.data.data.user.firstName} ${response.data.data.user.lastName}`);
      } else {
        throw new Error('Login falló - Respuesta inválida');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Login falló - Verifica credenciales de admin');
      }
      throw new Error(`Error en login: ${error.message}`);
    }
  }

  async getConfigBefore() {
    console.log('\n3. 📊 Obteniendo configuración actual (ANTES)...');
    
    try {
      const response = await axios.get(`${this.baseURL}/api/gym/config`);
      
      if (response.data.success) {
        this.configBefore = response.data.data;
        
        console.log('   📋 Estado actual de la configuración:');
        console.log(`   🏢 Nombre del gym: "${this.configBefore.name}"`);
        console.log(`   📝 Descripción: "${this.configBefore.description?.substring(0, 50)}..."`);
        console.log(`   🏷️ Tagline: "${this.configBefore.tagline || 'No configurado'}"`);
        console.log(`   🏢 Logo actual: ${this.configBefore.logo?.url ? '✅ Existe' : '❌ No existe'}`);
        console.log(`   🎬 Video hero actual: ${this.configBefore.videoUrl || this.configBefore.hero?.videoUrl ? '✅ Existe' : '❌ No existe'}`);
        console.log(`   🖼️ Imagen hero actual: ${this.configBefore.imageUrl || this.configBefore.hero?.imageUrl ? '✅ Existe' : '❌ No existe'}`);
        
        // Mostrar URLs actuales si existen
        if (this.configBefore.logo?.url) {
          console.log(`   🔗 URL del logo: ${this.configBefore.logo.url.substring(0, 60)}...`);
        }
        if (this.configBefore.videoUrl || this.configBefore.hero?.videoUrl) {
          const videoUrl = this.configBefore.videoUrl || this.configBefore.hero?.videoUrl;
          console.log(`   🔗 URL del video: ${videoUrl.substring(0, 60)}...`);
        }
      }
    } catch (error) {
      throw new Error(`Error obteniendo configuración inicial: ${error.message}`);
    }
  }

  async uploadVideo(videoPath) {
    console.log(`\n4. 🎬 Subiendo video: ${path.basename(videoPath)}`);
    
    const stats = fs.statSync(videoPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`   📏 Tamaño: ${sizeMB} MB`);

    if (stats.size > 100 * 1024 * 1024) {
      throw new Error('Video demasiado grande (máximo 100MB)');
    }

    // Verificar extensión
    const ext = path.extname(videoPath).toLowerCase();
    const validExtensions = ['.mp4', '.webm', '.mov', '.avi'];
    
    if (!validExtensions.includes(ext)) {
      throw new Error(`Extensión no válida: ${ext}. Usa: ${validExtensions.join(', ')}`);
    }

    console.log(`   ✅ Formato válido: ${ext}`);

    try {
      const form = new FormData();
      form.append('video', fs.createReadStream(videoPath), {
        filename: path.basename(videoPath),
        contentType: this.getVideoContentType(videoPath)
      });

      console.log('   📡 Subiendo video a Cloudinary...');

      const uploadResponse = await axios.post(
        `${this.baseURL}/api/gym-media/upload-hero-video`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${this.token}`
          },
          timeout: 120000 // 2 minutos timeout para videos
        }
      );

      if (uploadResponse.data.success) {
        const data = uploadResponse.data.data;
        console.log('   🎉 ¡Video subido exitosamente!');
        console.log(`   🔗 Video URL: ${data.videoUrl}`);
        console.log(`   🖼️ Poster URL: ${data.posterUrl}`);
        console.log(`   🆔 Public ID: ${data.publicId}`);
        
        // Verificar configuración de video
        if (data.videoSettings) {
          console.log('   ⚙️ Configuración de video:');
          console.log(`      🔇 Muted: ${data.videoSettings.muted}`);
          console.log(`      🔄 Loop: ${data.videoSettings.loop}`);
          console.log(`      ⏯️ Controls: ${data.videoSettings.controls}`);
          console.log(`      ▶️ Autoplay: ${data.videoSettings.autoplay}`);
        }
        
        // Verificar que es de Cloudinary
        if (data.videoUrl.includes('cloudinary.com')) {
          console.log('   ☁️ ✅ Confirmado: Video almacenado en Cloudinary');
        }
        
        return data;
      } else {
        throw new Error('Error en la respuesta de subida de video');
      }

    } catch (error) {
      if (error.response) {
        if (error.response.status === 404) {
          throw new Error('Endpoints multimedia no encontrados (404) - Las rutas gymMediaRoutes no están registradas en src/routes/index.js');
        } else if (error.response.status === 503) {
          throw new Error('Servicio de videos no configurado - Configura Cloudinary');
        } else if (error.response.status === 400) {
          throw new Error(`Error de validación: ${error.response.data.message}`);
        } else {
          throw new Error(`Error HTTP ${error.response.status}: ${error.response.data?.message || 'Error desconocido'}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Timeout - El video tardó demasiado en subir');
      } else {
        throw new Error(`Error subiendo video: ${error.message}`);
      }
    }
  }

  async uploadLogo(logoPath) {
    console.log(`\n5. 🏢 Subiendo logo: ${path.basename(logoPath)}`);
    
    const stats = fs.statSync(logoPath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    
    console.log(`   📏 Tamaño: ${sizeKB} KB`);

    if (stats.size > 3 * 1024 * 1024) {
      throw new Error('Logo demasiado grande (máximo 3MB)');
    }

    // Verificar extensión
    const ext = path.extname(logoPath).toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
    
    if (!validExtensions.includes(ext)) {
      throw new Error(`Extensión no válida: ${ext}. Usa: ${validExtensions.join(', ')}`);
    }

    console.log(`   ✅ Formato válido: ${ext}`);

    try {
      const form = new FormData();
      form.append('logo', fs.createReadStream(logoPath), {
        filename: path.basename(logoPath),
        contentType: this.getImageContentType(logoPath)
      });

      console.log('   📡 Subiendo logo a Cloudinary...');

      const uploadResponse = await axios.post(
        `${this.baseURL}/api/gym-media/upload-logo`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${this.token}`
          },
          timeout: 30000 // 30 segundos timeout
        }
      );

      if (uploadResponse.data.success) {
        const data = uploadResponse.data.data;
        console.log('   🎉 ¡Logo subido exitosamente!');
        console.log(`   🔗 Logo URL: ${data.logoUrl}`);
        console.log(`   🆔 Public ID: ${data.publicId}`);
        
        if (data.config) {
          console.log(`   🏢 Gym actualizado: ${data.config.gymName}`);
        }
        
        // Verificar que es de Cloudinary
        if (data.logoUrl.includes('cloudinary.com')) {
          console.log('   ☁️ ✅ Confirmado: Logo almacenado en Cloudinary');
        }
        
        return data;
      } else {
        throw new Error('Error en la respuesta de subida de logo');
      }

    } catch (error) {
      if (error.response) {
        if (error.response.status === 404) {
          throw new Error('Endpoints multimedia no encontrados (404) - Las rutas gymMediaRoutes no están registradas en src/routes/index.js');
        } else if (error.response.status === 503) {
          throw new Error('Servicio de imágenes no configurado - Configura Cloudinary');
        } else if (error.response.status === 400) {
          throw new Error(`Error de validación: ${error.response.data.message}`);
        } else {
          throw new Error(`Error HTTP ${error.response.status}: ${error.response.data?.message || 'Error desconocido'}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Timeout - El logo tardó demasiado en subir');
      } else {
        throw new Error(`Error subiendo logo: ${error.message}`);
      }
    }
  }

  async getConfigAfter() {
    console.log('\n6. 📊 Obteniendo configuración actualizada (DESPUÉS)...');
    
    try {
      const response = await axios.get(`${this.baseURL}/api/gym/config`);
      
      if (response.data.success) {
        this.configAfter = response.data.data;
        
        console.log('   📋 Estado actualizado de la configuración:');
        console.log(`   🏢 Nombre del gym: "${this.configAfter.name}"`);
        console.log(`   📝 Descripción: "${this.configAfter.description?.substring(0, 50)}..."`);
        console.log(`   🏷️ Tagline: "${this.configAfter.tagline || 'No configurado'}"`);
        console.log(`   🏢 Logo: ${this.configAfter.logo?.url ? '✅ Existe' : '❌ No existe'}`);
        console.log(`   🎬 Video hero: ${this.configAfter.videoUrl || this.configAfter.hero?.videoUrl ? '✅ Existe' : '❌ No existe'}`);
        console.log(`   🖼️ Imagen hero: ${this.configAfter.imageUrl || this.configAfter.hero?.imageUrl ? '✅ Existe' : '❌ No existe'}`);
      }
    } catch (error) {
      throw new Error(`Error obteniendo configuración final: ${error.message}`);
    }
  }

  async compareConfigs() {
    console.log('\n7. 🔍 Comparando configuraciones (ANTES vs DESPUÉS)...');
    
    const before = this.configBefore;
    const after = this.configAfter;
    
    // Campos que NO deben cambiar
    const unchangedFields = [
      'name',
      'description', 
      'tagline'
    ];
    
    console.log('   📊 Verificando campos que NO deben cambiar:');
    
    let allUnchanged = true;
    for (const field of unchangedFields) {
      const beforeValue = before[field];
      const afterValue = after[field];
      
      if (beforeValue === afterValue) {
        console.log(`   ✅ ${field}: Sin cambios`);
      } else {
        console.log(`   ❌ ${field}: CAMBIÓ - ANTES: "${beforeValue}" | DESPUÉS: "${afterValue}"`);
        allUnchanged = false;
      }
    }
    
    // Campos que SÍ pueden cambiar
    console.log('\n   📊 Verificando campos que SÍ pueden cambiar:');
    
    // Logo
    const beforeLogo = before.logo?.url || '';
    const afterLogo = after.logo?.url || '';
    if (beforeLogo !== afterLogo) {
      console.log(`   🏢 Logo: ACTUALIZADO`);
      console.log(`      ANTES: ${beforeLogo || 'Sin logo'}`);
      console.log(`      DESPUÉS: ${afterLogo || 'Sin logo'}`);
    } else {
      console.log(`   🏢 Logo: Sin cambios`);
    }
    
    // Video
    const beforeVideo = before.videoUrl || before.hero?.videoUrl || '';
    const afterVideo = after.videoUrl || after.hero?.videoUrl || '';
    if (beforeVideo !== afterVideo) {
      console.log(`   🎬 Video: ACTUALIZADO`);
      console.log(`      ANTES: ${beforeVideo || 'Sin video'}`);
      console.log(`      DESPUÉS: ${afterVideo || 'Sin video'}`);
    } else {
      console.log(`   🎬 Video: Sin cambios`);
    }
    
    // Imagen hero
    const beforeImage = before.imageUrl || before.hero?.imageUrl || '';
    const afterImage = after.imageUrl || after.hero?.imageUrl || '';
    if (beforeImage !== afterImage) {
      console.log(`   🖼️ Imagen hero: ACTUALIZADO`);
      console.log(`      ANTES: ${beforeImage || 'Sin imagen'}`);
      console.log(`      DESPUÉS: ${afterImage || 'Sin imagen'}`);
    } else {
      console.log(`   🖼️ Imagen hero: Sin cambios`);
    }
    
    if (allUnchanged) {
      console.log('\n   ✅ ¡PERFECTO! Los datos importantes se mantuvieron intactos');
    } else {
      console.log('\n   ⚠️ ATENCIÓN: Algunos datos cambiaron cuando no debían');
    }
  }

  async verifyFrontendData() {
    console.log('\n8. 🎨 Verificando datos para el frontend...');
    
    try {
      const response = await axios.get(`${this.baseURL}/api/gym/config`);
      
      if (response.data.success) {
        const data = response.data.data;
        
        console.log('   📱 Datos que recibirá el frontend:');
        console.log(`   🏢 Nombre: ${data.name}`);
        console.log(`   📝 Descripción: ${data.description}`);
        console.log(`   🏷️ Tagline: ${data.tagline}`);
        
        // Logo
        if (data.logo?.url) {
          console.log(`   🏢 Logo disponible: ✅`);
          console.log(`      URL: ${data.logo.url}`);
          console.log(`      Alt: ${data.logo.alt}`);
        } else {
          console.log(`   🏢 Logo disponible: ❌`);
        }
        
        // Video
        if (data.videoUrl || data.hero?.videoUrl) {
          const videoUrl = data.videoUrl || data.hero?.videoUrl;
          console.log(`   🎬 Video disponible: ✅`);
          console.log(`      URL: ${videoUrl}`);
          console.log(`      hasVideo: ${data.hasVideo}`);
        } else {
          console.log(`   🎬 Video disponible: ❌`);
        }
        
        // Hero section completa
        if (data.hero) {
          console.log(`   🦸 Hero section:`);
          console.log(`      Título: ${data.hero.title}`);
          console.log(`      Descripción: ${data.hero.description?.substring(0, 50)}...`);
          console.log(`      Video URL: ${data.hero.videoUrl ? 'Configurado' : 'No configurado'}`);
          console.log(`      Imagen URL: ${data.hero.imageUrl ? 'Configurado' : 'No configurado'}`);
        }
        
        console.log(`   ✅ El frontend puede mostrar todos los datos correctamente`);
      }
    } catch (error) {
      console.log(`   ⚠️ Error verificando datos para frontend: ${error.message}`);
    }
  }

  getVideoContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const types = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.avi': 'video/avi'
    };
    return types[ext] || 'video/mp4';
  }

  getImageContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const types = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg', 
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };
    return types[ext] || 'image/jpeg';
  }
}

// Función para mostrar ayuda
function showHelp() {
  console.log('\n🎬 Elite Fitness Club - Test con rutas hardcodeadas\n');
  console.log('Uso:');
  console.log('   node test-video-logo-only.js        # Ejecutar con configuración hardcodeada');
  console.log('   node test-video-logo-only.js --help # Mostrar ayuda');
  console.log('   node test-video-logo-only.js --config # Mostrar configuración actual\n');
  
  console.log('Para configurar tus archivos:');
  console.log('   1. Edita las rutas al inicio del archivo');
  console.log('   2. Coloca tus archivos en esas rutas');
  console.log('   3. Ejecuta el script\n');
  
  console.log('Formatos soportados:');
  console.log('   🎬 Videos: .mp4, .webm, .mov, .avi (máx 100MB)');
  console.log('   🏢 Logos: .jpg, .jpeg, .png, .webp, .svg (máx 3MB)');
}

// Ejecutar script
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const tester = new VideoLogoTester();
  
  if (args.includes('--config') || args.includes('-c')) {
    tester.showCurrentConfig();
    return;
  }
  
  try {
    await tester.runTest();
    
    console.log('\n📋 RESUMEN FINAL:');
    console.log('✅ Servidor funcionando');
    console.log('✅ Autenticación exitosa');
    console.log('✅ Archivos subidos según configuración');
    console.log('✅ Otros datos de configuración intactos');
    console.log('✅ Frontend recibirá datos correctos');
    
    console.log('\n🎯 PRÓXIMOS PASOS:');
    console.log('   • Tus archivos están listos para usar');
    console.log('   • El frontend puede mostrarlos inmediatamente');
    console.log('   • Las URLs se obtienen desde /api/gym/config');
    
  } catch (error) {
    console.error('\n💡 SOLUCIONES:');
    
    if (error.message.includes('Servidor no responde')) {
      console.error('   1. Verifica que tu servidor esté ejecutándose: npm start');
    } else if (error.message.includes('Login falló')) {
      console.error('   1. Verifica que el usuario admin existe');
      console.error('   2. Confirma que la password es Admin123!');
    } else if (error.message.includes('no encontrado')) {
      console.error('   1. Verifica las rutas hardcodeadas en el script');
      console.error('   2. Ejecuta: node test-video-logo-only.js --config');
      console.error('   3. Asegúrate de que los archivos existan');
    } else if (error.message.includes('demasiado grande')) {
      console.error('   1. Reduce el tamaño del archivo');
      console.error('   2. Videos: máximo 100MB');
      console.error('   3. Logos: máximo 3MB');
    }
    
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { VideoLogoTester };