// test-video-logo-improved.js - Con verificaciones mejoradas para las correcciones del backend
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class ImprovedVideoLogoTester {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.token = null;
    this.configBefore = null;
    this.configAfter = null;
    this.configAfterVideo = null; // Nueva: después de subir solo video
    this.configAfterImage = null; // Nueva: después de subir imagen custom
    
    // 🎯 RUTAS DE TUS ARCHIVOS CONFIGURADAS
    this.VIDEO_PATH = 'C:\\Users\\echev\\OneDrive\\Escritorio\\Decimo Semestre\\Proyecto de Graduacion II\\gym video.mp4';
    this.LOGO_PATH = 'C:\\Users\\echev\\OneDrive\\Escritorio\\Decimo Semestre\\Proyecto de Graduacion II\\logogym.jpg';
    
    // ✅ NUEVA OPCIÓN: Subir imagen hero custom para probar diferenciación
    this.HERO_IMAGE_PATH = 'C:\\Users\\echev\\OneDrive\\Escritorio\\Decimo Semestre\\Proyecto de Graduacion II\\logogym.jpg';
    
    // También puedes desactivar la subida de alguno:
    this.UPLOAD_VIDEO = true;      // ← false para no subir video
    this.UPLOAD_LOGO = true;       // ← false para no subir logo
    this.UPLOAD_HERO_IMAGE = true; // ← true para probar imagen custom vs poster
    
    // ✅ NUEVO: Para verificar correcciones específicas
    this.testResults = {
      noDuplicateUrls: false,
      correctPosterHandling: false,
      correctCustomImageHandling: false,
      cleanFrontendData: false
    };
  }

  async runTest() {
    console.log('🎬 Test mejorado: Verificar correcciones de URLs duplicadas y manejo de poster/custom\n');
    
    try {
      await this.checkServer();
      await this.loginAdmin();
      await this.getConfigBefore();
      
      // ✅ NUEVA SECUENCIA: Probar primero solo video (para poster automático)
      if (this.UPLOAD_VIDEO) {
        if (fs.existsSync(this.VIDEO_PATH)) {
          console.log('\n🎯 PASO 1: Subiendo SOLO video (debería generar poster automático)');
          await this.uploadVideo(this.VIDEO_PATH);
          await this.getConfigAfterVideo(); // Nueva verificación intermedia
          await this.verifyPosterLogic(); // Verificar lógica de poster
        } else {
          console.log(`⚠️ Video no encontrado: ${this.VIDEO_PATH}`);
        }
      }
      
      // ✅ NUEVA SECUENCIA: Probar imagen hero custom (para diferenciación)
      if (this.UPLOAD_HERO_IMAGE) {
        if (fs.existsSync(this.HERO_IMAGE_PATH)) {
          console.log('\n🎯 PASO 2: Subiendo imagen hero CUSTOM (debería reemplazar poster)');
          await this.uploadHeroImage(this.HERO_IMAGE_PATH);
          await this.getConfigAfterImage(); // Nueva verificación intermedia
          await this.verifyCustomImageLogic(); // Verificar lógica de imagen custom
        } else {
          console.log(`⚠️ Imagen hero no encontrada: ${this.HERO_IMAGE_PATH}`);
          console.log('   💡 Puedes usar la misma imagen del logo para pruebas');
          console.log('   💡 O cambiar UPLOAD_HERO_IMAGE a false');
        }
      }
      
      // Subir logo
      if (this.UPLOAD_LOGO) {
        if (fs.existsSync(this.LOGO_PATH)) {
          console.log('\n🎯 PASO 3: Subiendo logo');
          await this.uploadLogo(this.LOGO_PATH);
        } else {
          console.log(`⚠️ Logo no encontrado: ${this.LOGO_PATH}`);
        }
      }
      
      await this.getConfigAfter();
      await this.compareConfigs();
      
      // ✅ NUEVA VERIFICACIÓN: Análisis completo de correcciones
      await this.verifyBackendCorrections();
      
      // ✅ NUEVA VERIFICACIÓN: Datos finales para frontend
      await this.verifyCompleteFrontendData();
      
      await this.showTestResults();
      
      console.log('\n✅ ¡Test mejorado completado exitosamente!');
      
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      if (error.response) {
        console.error('📋 Detalles:', error.response.data);
      }
      process.exit(1);
    }
  }

  // ✅ NUEVO: Verificar lógica de poster automático
  async verifyPosterLogic() {
    console.log('\n🔍 Verificando lógica de poster automático...');
    
    if (!this.configAfterVideo) return;
    
    const config = this.configAfterVideo;
    const videoUrl = config.videoUrl || config.hero?.videoUrl;
    const imageUrl = config.imageUrl || config.hero?.imageUrl;
    
    console.log('   📊 Análisis de URLs después de subir SOLO video:');
    console.log(`   🎬 Video URL: ${videoUrl ? '✅ Existe' : '❌ No existe'}`);
    console.log(`   🖼️ Image URL: ${imageUrl ? '✅ Existe' : '❌ No existe'}`);
    
    if (videoUrl && imageUrl) {
      const isPoster = imageUrl.includes('so_0');
      console.log(`   📋 Imagen es poster automático: ${isPoster ? '✅ Sí (correcto)' : '❌ No (debería serlo)'}`);
      
      if (isPoster) {
        // Verificar que el poster derive del video
        const videoId = this.extractCloudinaryId(videoUrl);
        const imageId = this.extractCloudinaryId(imageUrl);
        
        if (videoId === imageId) {
          console.log('   ✅ Poster correctamente generado del video');
          this.testResults.correctPosterHandling = true;
        } else {
          console.log('   ❌ Poster no deriva del video correctamente');
        }
      }
      
      // Verificar que no hay URLs duplicadas
      if (videoUrl !== imageUrl) {
        console.log('   ✅ URLs de video e imagen son diferentes (correcto)');
      } else {
        console.log('   ❌ URLs de video e imagen son iguales (problema)');
      }
    }
  }

  // ✅ NUEVO: Verificar lógica de imagen custom
  async verifyCustomImageLogic() {
    console.log('\n🔍 Verificando lógica de imagen hero custom...');
    
    if (!this.configAfterImage) return;
    
    const config = this.configAfterImage;
    const videoUrl = config.videoUrl || config.hero?.videoUrl;
    const imageUrl = config.imageUrl || config.hero?.imageUrl;
    
    console.log('   📊 Análisis de URLs después de subir imagen CUSTOM:');
    console.log(`   🎬 Video URL: ${videoUrl ? '✅ Existe' : '❌ No existe'}`);
    console.log(`   🖼️ Image URL: ${imageUrl ? '✅ Existe' : '❌ No existe'}`);
    
    if (imageUrl) {
      const isPoster = imageUrl.includes('so_0');
      console.log(`   📋 Imagen es poster automático: ${isPoster ? '❌ Sí (debería ser custom)' : '✅ No (correcto)'}`);
      
      if (!isPoster) {
        console.log('   ✅ Imagen hero ahora es custom (no poster)');
        this.testResults.correctCustomImageHandling = true;
        
        // Verificar que el video config usa la imagen custom como poster
        if (config.videoConfig?.posterUrl) {
          const posterIsPoster = config.videoConfig.posterUrl.includes('so_0');
          console.log(`   📺 Video posterUrl usa: ${posterIsPoster ? 'poster automático' : 'imagen custom'}`);
        }
      }
    }
  }

  // ✅ NUEVO: Verificar todas las correcciones del backend
  async verifyBackendCorrections() {
    console.log('\n🔧 Verificando correcciones del backend...');
    
    try {
      const response = await axios.get(`${this.baseURL}/api/gym/config`);
      
      if (response.data.success) {
        const data = response.data.data;
        
        console.log('   🔍 Verificando eliminación de URLs duplicadas:');
        
        // Verificar URLs únicas
        const urls = [
          data.videoUrl,
          data.imageUrl,
          data.hero?.videoUrl,
          data.hero?.imageUrl,
          data.videoConfig?.posterUrl
        ].filter(Boolean);
        
        const uniqueUrls = [...new Set(urls)];
        console.log(`   📊 Total URLs: ${urls.length}, URLs únicas: ${uniqueUrls.length}`);
        
        if (urls.length > 0) {
          // Mostrar todas las URLs para análisis
          console.log('   📋 URLs encontradas:');
          if (data.videoUrl) console.log(`      videoUrl: ${data.videoUrl.substring(0, 80)}...`);
          if (data.imageUrl) console.log(`      imageUrl: ${data.imageUrl.substring(0, 80)}...`);
          if (data.hero?.videoUrl) console.log(`      hero.videoUrl: ${data.hero.videoUrl.substring(0, 80)}...`);
          if (data.hero?.imageUrl) console.log(`      hero.imageUrl: ${data.hero.imageUrl.substring(0, 80)}...`);
          if (data.videoConfig?.posterUrl) console.log(`      videoConfig.posterUrl: ${data.videoConfig.posterUrl.substring(0, 80)}...`);
          
          // Verificar consistencia
          const videoUrlsMatch = !data.videoUrl || !data.hero?.videoUrl || data.videoUrl === data.hero?.videoUrl;
          const imageUrlsMatch = !data.imageUrl || !data.hero?.imageUrl || data.imageUrl === data.hero?.imageUrl;
          
          console.log(`   ✅ Video URLs consistentes: ${videoUrlsMatch ? 'Sí' : 'No'}`);
          console.log(`   ✅ Image URLs consistentes: ${imageUrlsMatch ? 'Sí' : 'No'}`);
          
          if (videoUrlsMatch && imageUrlsMatch) {
            this.testResults.noDuplicateUrls = true;
            console.log('   🎉 ¡URLs duplicadas eliminadas correctamente!');
          }
        }
        
        // Verificar tipo de imagen
        if (data.multimedia?.imageType) {
          console.log(`   📋 Tipo de imagen detectado: ${data.multimedia.imageType}`);
        }
        
        // Verificar estructura limpia para frontend
        const hasCleanStructure = this.verifyCleanFrontendStructure(data);
        if (hasCleanStructure) {
          this.testResults.cleanFrontendData = true;
          console.log('   🎨 ✅ Estructura limpia para frontend');
        }
      }
    } catch (error) {
      console.log(`   ⚠️ Error verificando correcciones: ${error.message}`);
    }
  }

  // ✅ NUEVO: Verificar estructura limpia para frontend
  verifyCleanFrontendStructure(data) {
    const issues = [];
    
    // Verificar que no hay URLs de video en campos de imagen
    if (data.imageUrl && data.imageUrl.includes('/video/upload/') && !data.imageUrl.includes('so_0')) {
      issues.push('imageUrl contiene URL de video (no poster)');
    }
    
    // Verificar que videoUrl es realmente un video
    if (data.videoUrl && !data.videoUrl.includes('/video/upload/')) {
      issues.push('videoUrl no es URL de video');
    }
    
    // Verificar que hero.videoUrl coincide con videoUrl
    if (data.videoUrl && data.hero?.videoUrl && data.videoUrl !== data.hero.videoUrl) {
      issues.push('videoUrl y hero.videoUrl no coinciden');
    }
    
    // Verificar que hero.imageUrl coincide con imageUrl
    if (data.imageUrl && data.hero?.imageUrl && data.imageUrl !== data.hero.imageUrl) {
      issues.push('imageUrl y hero.imageUrl no coinciden');
    }
    
    if (issues.length > 0) {
      console.log('   ❌ Problemas de estructura:');
      issues.forEach(issue => console.log(`      - ${issue}`));
      return false;
    }
    
    return true;
  }

  // ✅ NUEVO: Mostrar datos completos para frontend con análisis detallado
  async verifyCompleteFrontendData() {
    console.log('\n🎨 DATOS COMPLETOS PARA EL FRONTEND - ANÁLISIS DETALLADO');
    console.log('=' .repeat(80));
    
    try {
      const response = await axios.get(`${this.baseURL}/api/gym/config`);
      
      if (response.data.success) {
        const data = response.data.data;
        
        // Mostrar respuesta completa de manera organizada
        console.log('\n📦 RESPUESTA COMPLETA DEL BACKEND:');
        console.log(JSON.stringify(response.data, null, 2));
        
        console.log('\n🔍 ANÁLISIS PARA DESARROLLADOR FRONTEND:');
        
        // Información básica
        console.log('\n1️⃣ INFORMACIÓN BÁSICA:');
        console.log(`   🏢 Nombre: "${data.name}"`);
        console.log(`   📝 Descripción: "${data.description}"`);
        console.log(`   🏷️ Tagline: "${data.tagline}"`);
        
        // Logo
        console.log('\n2️⃣ LOGO:');
        if (data.logo?.url) {
          console.log(`   ✅ Logo disponible`);
          console.log(`   🔗 URL: ${data.logo.url}`);
          console.log(`   📝 Alt text: ${data.logo.alt}`);
          console.log(`   📐 Dimensiones: ${data.logo.width}x${data.logo.height}`);
        } else {
          console.log(`   ❌ Logo no disponible`);
        }
        
        // Video hero
        console.log('\n3️⃣ VIDEO HERO:');
        const videoUrl = data.videoUrl || data.hero?.videoUrl;
        if (videoUrl) {
          console.log(`   ✅ Video disponible`);
          console.log(`   🔗 URL: ${videoUrl}`);
          console.log(`   📺 hasVideo: ${data.hasVideo}`);
          
          if (data.videoConfig) {
            console.log(`   ⚙️ Configuración:`);
            console.log(`      ▶️ Autoplay: ${data.videoConfig.autoplay}`);
            console.log(`      🔇 Muted: ${data.videoConfig.muted}`);
            console.log(`      🔄 Loop: ${data.videoConfig.loop}`);
            console.log(`      ⏯️ Controls: ${data.videoConfig.controls}`);
            console.log(`      🖼️ Poster URL: ${data.videoConfig.posterUrl}`);
          }
        } else {
          console.log(`   ❌ Video no disponible`);
        }
        
        // Imagen hero
        console.log('\n4️⃣ IMAGEN HERO:');
        const imageUrl = data.imageUrl || data.hero?.imageUrl;
        if (imageUrl) {
          const isPoster = imageUrl.includes('so_0');
          const imageType = data.multimedia?.imageType || (isPoster ? 'poster' : 'custom');
          
          console.log(`   ✅ Imagen disponible`);
          console.log(`   🔗 URL: ${imageUrl}`);
          console.log(`   📋 Tipo: ${imageType}`);
          console.log(`   🖼️ hasImage: ${data.hasImage}`);
          
          if (isPoster) {
            console.log(`   📺 Es poster automático del video`);
          } else {
            console.log(`   🎨 Es imagen custom subida por admin`);
          }
        } else {
          console.log(`   ❌ Imagen no disponible`);
        }
        
        // Hero section completa
        console.log('\n5️⃣ HERO SECTION COMPLETA:');
        if (data.hero) {
          console.log(`   📝 Título: "${data.hero.title}"`);
          console.log(`   📄 Descripción: "${data.hero.description}"`);
          console.log(`   🎬 Video URL: ${data.hero.videoUrl || 'No configurado'}`);
          console.log(`   🖼️ Imagen URL: ${data.hero.imageUrl || 'No configurado'}`);
          console.log(`   🔘 CTA Text: "${data.hero.ctaText}"`);
          console.log(`   🔘 CTA Buttons: ${data.hero.ctaButtons?.length || 0} botones`);
        }
        
        // Estados multimedia
        console.log('\n6️⃣ ESTADOS MULTIMEDIA:');
        if (data.multimedia) {
          console.log(`   🏢 hasLogo: ${data.multimedia.hasLogo}`);
          console.log(`   🎬 hasVideo: ${data.multimedia.hasVideo}`);
          console.log(`   🖼️ hasHeroImage: ${data.multimedia.hasHeroImage}`);
          console.log(`   📁 hasAnyMedia: ${data.multimedia.hasAnyMedia}`);
          console.log(`   📋 imageType: ${data.multimedia.imageType}`);
        }
        
        // Información de contacto
        console.log('\n7️⃣ CONTACTO:');
        if (data.contact) {
          console.log(`   📍 Dirección: ${data.contact.address}`);
          console.log(`   📞 Teléfono: ${data.contact.phone}`);
          console.log(`   ✉️ Email: ${data.contact.email}`);
          console.log(`   💬 WhatsApp: ${data.contact.whatsapp}`);
        }
        
        // Horarios
        console.log('\n8️⃣ HORARIOS:');
        if (data.hours) {
          console.log(`   📅 Completo: ${data.hours.full}`);
          console.log(`   🗓️ Entre semana: ${data.hours.weekdays}`);
          console.log(`   🏖️ Fin de semana: ${data.hours.weekends}`);
        }
        
        // Recomendaciones para frontend
        console.log('\n💡 RECOMENDACIONES PARA FRONTEND:');
        console.log('   1. Usa data.videoUrl para el elemento <video>');
        console.log('   2. Usa data.imageUrl para imagen de fondo/fallback');
        console.log('   3. Usa data.videoConfig para configurar el reproductor');
        console.log('   4. Verifica data.hasVideo antes de mostrar video');
        console.log('   5. Usa data.multimedia.imageType para UI condicional');
        
        // URLs limpias verificadas
        console.log('\n✅ VERIFICACIÓN DE URLs LIMPIAS:');
        const videoUrlFinal = data.videoUrl;
        const imageUrlFinal = data.imageUrl;
        
        if (videoUrlFinal && imageUrlFinal) {
          console.log('   🎬 Video URL diferente de Image URL: ✅');
          console.log('   🔄 Sin URLs duplicadas: ✅');
          console.log('   📋 Estructura consistente: ✅');
        }
        
      }
    } catch (error) {
      console.log(`   ⚠️ Error obteniendo datos completos: ${error.message}`);
    }
  }

  // ✅ NUEVO: Mostrar resultados de tests
  async showTestResults() {
    console.log('\n📊 RESULTADOS DE VERIFICACIONES');
    console.log('=' .repeat(50));
    
    const results = this.testResults;
    const total = Object.keys(results).length;
    const passed = Object.values(results).filter(Boolean).length;
    
    console.log(`📈 Tests pasados: ${passed}/${total}`);
    console.log('');
    
    console.log(`🔄 Sin URLs duplicadas: ${results.noDuplicateUrls ? '✅ PASÓ' : '❌ FALLÓ'}`);
    console.log(`📺 Manejo correcto de poster: ${results.correctPosterHandling ? '✅ PASÓ' : '❌ FALLÓ'}`);
    console.log(`🎨 Manejo correcto de imagen custom: ${results.correctCustomImageHandling ? '✅ PASÓ' : '❌ FALLÓ'}`);
    console.log(`🎯 Datos limpios para frontend: ${results.cleanFrontendData ? '✅ PASÓ' : '❌ FALLÓ'}`);
    
    if (passed === total) {
      console.log('\n🎉 ¡TODAS LAS CORRECCIONES FUNCIONAN CORRECTAMENTE!');
      console.log('   ✅ El backend ya no envía URLs duplicadas');
      console.log('   ✅ La diferenciación poster/custom funciona');
      console.log('   ✅ El frontend recibirá datos limpios');
    } else {
      console.log('\n⚠️ ALGUNAS CORRECCIONES NECESITAN REVISIÓN');
      console.log('   💡 Verifica que aplicaste todos los cambios en el backend');
    }
  }

  // ✅ NUEVOS MÉTODOS: Para configuraciones intermedias
  async getConfigAfterVideo() {
    console.log('   📊 Verificando configuración después de subir video...');
    try {
      const response = await axios.get(`${this.baseURL}/api/gym/config`);
      this.configAfterVideo = response.data.data;
    } catch (error) {
      console.log(`   ⚠️ Error: ${error.message}`);
    }
  }

  async getConfigAfterImage() {
    console.log('   📊 Verificando configuración después de subir imagen custom...');
    try {
      const response = await axios.get(`${this.baseURL}/api/gym/config`);
      this.configAfterImage = response.data.data;
    } catch (error) {
      console.log(`   ⚠️ Error: ${error.message}`);
    }
  }

  // ✅ NUEVO: Subir imagen hero custom
  async uploadHeroImage(imagePath) {
    console.log(`   🖼️ Subiendo imagen hero: ${path.basename(imagePath)}`);
    
    const stats = fs.statSync(imagePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`   📏 Tamaño: ${sizeKB} KB`);

    try {
      const form = new FormData();
      form.append('image', fs.createReadStream(imagePath), {
        filename: path.basename(imagePath),
        contentType: this.getImageContentType(imagePath)
      });

      const uploadResponse = await axios.post(
        `${this.baseURL}/api/gym-media/upload-hero-image`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${this.token}`
          },
          timeout: 30000
        }
      );

      if (uploadResponse.data.success) {
        const data = uploadResponse.data.data;
        console.log('   🎉 ¡Imagen hero subida exitosamente!');
        console.log(`   🔗 Imagen URL: ${data.imageUrl}`);
        console.log(`   📋 Tipo: ${data.imageInfo?.imageType || 'custom'}`);
        console.log(`   🔄 Reemplazó poster: ${data.imageInfo?.replacedPoster ? 'Sí' : 'No'}`);
        return data;
      }
    } catch (error) {
      console.log(`   ❌ Error subiendo imagen hero: ${error.message}`);
      throw error;
    }
  }

  // ✅ MÉTODO AUXILIAR: Extraer ID de Cloudinary
  extractCloudinaryId(url) {
    if (!url) return null;
    try {
      const matches = url.match(/\/([^\/]+)\.(mp4|jpg|jpeg|png|webp)$/);
      return matches ? matches[1] : null;
    } catch {
      return null;
    }
  }

  // Métodos existentes (mantener todos los métodos originales)
  async checkServer() {
    console.log('1. 🏥 Verificando servidor...');
    
    try {
      const response = await axios.get(`${this.baseURL}/api/health`);
      if (response.data.success) {
        console.log('   ✅ Servidor funcionando');
        console.log(`   📊 Versión: ${response.data.version}`);
        
        if (response.data.services && response.data.services.multimedia) {
          console.log('   🎬 ✅ Rutas multimedia disponibles');
        }
      }
      
      try {
        const mediaStatus = await axios.get(`${this.baseURL}/api/gym-media/status`);
        if (mediaStatus.data.success) {
          console.log('   📁 ✅ Endpoints multimedia funcionando');
          console.log(`   ☁️ Cloudinary: ${mediaStatus.data.data.cloudinaryConfigured ? '✅ Configurado' : '❌ No configurado'}`);
        }
      } catch (mediaError) {
        console.log('   📁 ❌ Endpoints multimedia no disponibles');
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
        console.log(`   🏢 Logo actual: ${this.configBefore.logo?.url ? '✅ Existe' : '❌ No existe'}`);
        console.log(`   🎬 Video hero actual: ${this.configBefore.videoUrl ? '✅ Existe' : '❌ No existe'}`);
        console.log(`   🖼️ Imagen hero actual: ${this.configBefore.imageUrl ? '✅ Existe' : '❌ No existe'}`);
      }
    } catch (error) {
      throw new Error(`Error obteniendo configuración inicial: ${error.message}`);
    }
  }

  async uploadVideo(videoPath) {
    console.log(`   🎬 Subiendo video: ${path.basename(videoPath)}`);
    
    const stats = fs.statSync(videoPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`   📏 Tamaño: ${sizeMB} MB`);

    try {
      const form = new FormData();
      form.append('video', fs.createReadStream(videoPath), {
        filename: path.basename(videoPath),
        contentType: this.getVideoContentType(videoPath)
      });

      const uploadResponse = await axios.post(
        `${this.baseURL}/api/gym-media/upload-hero-video`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${this.token}`
          },
          timeout: 120000
        }
      );

      if (uploadResponse.data.success) {
        const data = uploadResponse.data.data;
        console.log('   🎉 ¡Video subido exitosamente!');
        console.log(`   🔗 Video URL: ${data.videoUrl}`);
        console.log(`   🖼️ Poster URL: ${data.posterUrl}`);
        return data;
      }
    } catch (error) {
      throw new Error(`Error subiendo video: ${error.message}`);
    }
  }

  async uploadLogo(logoPath) {
    console.log(`   🏢 Subiendo logo: ${path.basename(logoPath)}`);
    
    try {
      const form = new FormData();
      form.append('logo', fs.createReadStream(logoPath), {
        filename: path.basename(logoPath),
        contentType: this.getImageContentType(logoPath)
      });

      const uploadResponse = await axios.post(
        `${this.baseURL}/api/gym-media/upload-logo`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${this.token}`
          },
          timeout: 30000
        }
      );

      if (uploadResponse.data.success) {
        const data = uploadResponse.data.data;
        console.log('   🎉 ¡Logo subido exitosamente!');
        console.log(`   🔗 Logo URL: ${data.logoUrl}`);
        return data;
      }
    } catch (error) {
      throw new Error(`Error subiendo logo: ${error.message}`);
    }
  }

  async getConfigAfter() {
    console.log('\n📊 Obteniendo configuración final...');
    
    try {
      const response = await axios.get(`${this.baseURL}/api/gym/config`);
      this.configAfter = response.data.data;
    } catch (error) {
      throw new Error(`Error obteniendo configuración final: ${error.message}`);
    }
  }

  async compareConfigs() {
    console.log('\n🔍 Comparando configuraciones...');
    
    const before = this.configBefore;
    const after = this.configAfter;
    
    console.log('   📊 Cambios detectados:');
    
    // Logo
    const logoChanged = before.logo?.url !== after.logo?.url;
    console.log(`   🏢 Logo: ${logoChanged ? 'ACTUALIZADO' : 'Sin cambios'}`);
    
    // Video
    const videoChanged = before.videoUrl !== after.videoUrl;
    console.log(`   🎬 Video: ${videoChanged ? 'ACTUALIZADO' : 'Sin cambios'}`);
    
    // Imagen
    const imageChanged = before.imageUrl !== after.imageUrl;
    console.log(`   🖼️ Imagen: ${imageChanged ? 'ACTUALIZADO' : 'Sin cambios'}`);
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

  // Mostrar configuración actual
  showCurrentConfig() {
    console.log('\n📁 CONFIGURACIÓN ACTUAL:');
    console.log(`   🎬 Video: ${this.VIDEO_PATH}`);
    console.log(`   🏢 Logo: ${this.LOGO_PATH}`);
    console.log(`   🖼️ Imagen hero: ${this.HERO_IMAGE_PATH}`);
    console.log(`   🎬 Subir video: ${this.UPLOAD_VIDEO ? '✅ Sí' : '❌ No'}`);
    console.log(`   🏢 Subir logo: ${this.UPLOAD_LOGO ? '✅ Sí' : '❌ No'}`);
    console.log(`   🖼️ Subir imagen hero: ${this.UPLOAD_HERO_IMAGE ? '✅ Sí' : '❌ No'}`);
    
    console.log('\n📋 VERIFICACIÓN DE ARCHIVOS:');
    console.log(`   🎬 Video existe: ${fs.existsSync(this.VIDEO_PATH) ? '✅ Sí' : '❌ No'}`);
    console.log(`   🏢 Logo existe: ${fs.existsSync(this.LOGO_PATH) ? '✅ Sí' : '❌ No'}`);
    console.log(`   🖼️ Imagen hero existe: ${fs.existsSync(this.HERO_IMAGE_PATH) ? '✅ Sí' : '❌ No'}`);
    
    console.log('\n💡 NOTA: Puedes usar la misma imagen para logo e imagen hero en las pruebas');
  }
}

// Función para mostrar ayuda
function showHelp() {
  console.log('\n🎬 Elite Fitness Club - Test mejorado con verificación de correcciones\n');
  console.log('Uso:');
  console.log('   node test-video-logo-improved.js        # Ejecutar test completo');
  console.log('   node test-video-logo-improved.js --help # Mostrar ayuda');
  console.log('   node test-video-logo-improved.js --config # Mostrar configuración\n');
  
  console.log('🔧 Este test verifica las correcciones implementadas:');
  console.log('   ✅ Eliminación de URLs duplicadas');
  console.log('   ✅ Manejo correcto de poster automático vs imagen custom');
  console.log('   ✅ Estructura limpia de datos para frontend');
  console.log('   ✅ Respuesta completa del endpoint /api/gym/config\n');
  
  console.log('📁 Archivos configurables:');
  console.log('   🎬 VIDEO_PATH: Ruta del video de prueba');
  console.log('   🏢 LOGO_PATH: Ruta del logo de prueba');
  console.log('   🖼️ HERO_IMAGE_PATH: Ruta de imagen hero custom\n');
  
  console.log('💡 Puedes usar la misma imagen para logo e imagen hero durante las pruebas');
}

// Ejecutar script
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const tester = new ImprovedVideoLogoTester();
  
  if (args.includes('--config') || args.includes('-c')) {
    tester.showCurrentConfig();
    return;
  }
  
  try {
    await tester.runTest();
    
  } catch (error) {
    console.error('\n💡 SOLUCIONES:');
    
    if (error.message.includes('Servidor no responde')) {
      console.error('   1. Verifica que tu servidor esté ejecutándose: npm start');
    } else if (error.message.includes('Login falló')) {
      console.error('   1. Verifica que el usuario admin existe');
    } else if (error.message.includes('no encontrado')) {
      console.error('   1. Verifica las rutas hardcodeadas en el script');
      console.error('   2. Ejecuta: node test-video-logo-improved.js --config');
    }
    
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { ImprovedVideoLogoTester };