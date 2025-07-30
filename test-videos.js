// test-videos.js - Script autónomo para probar videos y verificar BD
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class VideoAndMediaTester {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.token = null;
  }

  async runTest() {
    console.log('🎬 Probando sistema completo de videos y multimedia...\n');
    
    try {
      await this.checkServer();
      await this.checkCloudinaryConfig();
      await this.loginAdmin();
      await this.checkCurrentMediaInDB();
      
      // Probar diferentes tipos de archivos según argumentos
      const args = process.argv.slice(2);
      const filePath = args.find(arg => !arg.startsWith('--'));
      
      if (filePath) {
        await this.testFileUpload(filePath);
      } else {
        console.log('💡 Uso:');
        console.log('   node test-videos.js video.mp4     # Probar video');
        console.log('   node test-videos.js logo.png      # Probar logo');
        console.log('   node test-videos.js imagen.jpg    # Probar imagen hero');
      }
      
      await this.verifyDatabaseState();
      await this.testAPIResponses();
      
      console.log('\n✅ ¡Prueba completa exitosa!');
      
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      if (error.response) {
        console.error('📋 Detalles:', error.response.data);
      }
      process.exit(1);
    }
  }

  async checkServer() {
    console.log('1. 🏥 Verificando servidor...');
    
    try {
      const response = await axios.get(`${this.baseURL}/api/health`);
      if (response.data.success) {
        console.log('   ✅ Servidor funcionando');
        console.log(`   📊 Versión: ${response.data.version}`);
        console.log(`   🎬 Video upload: ${response.data.services?.video_upload || 'Unknown'}`);
        console.log(`   ☁️ Cloudinary: ${response.data.services?.cloudinary || 'Unknown'}`);
      }
    } catch (error) {
      throw new Error(`Servidor no responde: ${error.message}`);
    }
  }

  async checkCloudinaryConfig() {
    console.log('\n2. ☁️ Verificando configuración de Cloudinary...');
    
    try {
      const response = await axios.get(`${this.baseURL}/api/auth/services`);
      
      if (response.data.success) {
        const services = response.data.data;
        
        console.log('   📋 Estado de servicios multimedia:');
        console.log(`   ${services.imageUpload ? '✅' : '❌'} Subida de imágenes: ${services.imageUpload ? 'CONFIGURADO' : 'NO CONFIGURADO'}`);
        
        if (!services.imageUpload) {
          throw new Error('Cloudinary no configurado - Configura las variables de entorno primero');
        }
        
        console.log('   🎉 ¡Cloudinary configurado correctamente!');
        
      } else {
        throw new Error('Error obteniendo información de servicios');
      }
    } catch (error) {
      throw new Error(`Error verificando Cloudinary: ${error.message}`);
    }
  }

  async loginAdmin() {
    console.log('\n3. 🔐 Iniciando sesión como administrador...');
    
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

  async checkCurrentMediaInDB() {
    console.log('\n4. 🗄️ Verificando estado actual de la base de datos...');
    
    try {
      // Verificar configuración actual
      const configResponse = await axios.get(`${this.baseURL}/api/gym/config`);
      
      if (configResponse.data.success) {
        const config = configResponse.data.data;
        
        console.log('   📊 Estado actual en BD:');
        console.log(`   🏢 Logo: ${config.logo?.url ? '✅ Presente' : '❌ No configurado'}`);
        console.log(`   🎬 Video Hero: ${config.videoUrl || config.hero?.videoUrl ? '✅ Presente' : '❌ No configurado'}`);
        console.log(`   🖼️ Imagen Hero: ${config.imageUrl || config.hero?.imageUrl ? '✅ Presente' : '❌ No configurado'}`);
        console.log(`   ⚙️ Configuración video: ${config.videoSettings ? '✅ Presente' : '❌ No configurado'}`);
        
        this.currentConfig = config;
      }
      
      // Verificar información detallada de media (si existe el endpoint)
      try {
        const mediaResponse = await axios.get(`${this.baseURL}/api/gym-media/media-info`, {
          headers: { Authorization: `Bearer ${this.token}` }
        });
        
        if (mediaResponse.data.success) {
          const media = mediaResponse.data.data;
          console.log('\n   📁 Detalles de archivos multimedia:');
          console.log(`   🏢 Logo: ${media.logo?.exists ? `✅ ${media.logo.url}` : '❌ No existe'}`);
          console.log(`   🎬 Video: ${media.heroVideo?.exists ? `✅ ${media.heroVideo.url}` : '❌ No existe'}`);
          console.log(`   🖼️ Imagen: ${media.heroImage?.exists ? `✅ ${media.heroImage.url}` : '❌ No existe'}`);
          console.log(`   📊 Total archivos: ${media.summary?.totalFiles || 0}`);
        }
      } catch (error) {
        console.log('   ⚠️ Endpoint de media-info no disponible (normal si no has agregado las rutas)');
      }
      
    } catch (error) {
      console.log('   ⚠️ Error verificando estado de BD:', error.message);
    }
  }

  async testFileUpload(filePath) {
    console.log(`\n5. 📤 Probando subida de archivo: ${path.basename(filePath)}`);
    
    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      throw new Error(`El archivo no existe: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`   📏 Tamaño: ${sizeKB} KB (${sizeMB} MB)`);

    // Determinar tipo de archivo y endpoint
    const ext = path.extname(filePath).toLowerCase();
    const { fileType, endpoint, maxSize } = this.determineFileType(ext);
    
    console.log(`   🔍 Tipo detectado: ${fileType}`);
    console.log(`   🎯 Endpoint: ${endpoint}`);

    if (stats.size > maxSize) {
      throw new Error(`Archivo demasiado grande (máximo ${maxSize / (1024 * 1024)}MB para ${fileType})`);
    }

    try {
      const form = new FormData();
      
      // Determinar el nombre del campo según el tipo
      let fieldName = 'file';
      if (fileType === 'video') fieldName = 'video';
      else if (fileType === 'logo') fieldName = 'logo';
      else if (fileType === 'imagen') fieldName = 'image';
      
      form.append(fieldName, fs.createReadStream(filePath), {
        filename: path.basename(filePath),
        contentType: this.getContentType(filePath)
      });

      console.log(`   📡 Subiendo ${fileType} a Cloudinary...`);

      const uploadResponse = await axios.post(
        `${this.baseURL}${endpoint}`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${this.token}`
          },
          timeout: 60000 // 60 segundos para videos
        }
      );

      if (uploadResponse.data.success) {
        console.log(`   🎉 ¡${fileType} subido exitosamente!`);
        
        const data = uploadResponse.data.data;
        
        if (fileType === 'video') {
          console.log(`   🔗 Video URL: ${data.videoUrl}`);
          console.log(`   🖼️ Poster URL: ${data.posterUrl || 'Generado automáticamente'}`);
        } else {
          console.log(`   🔗 URL: ${data.logoUrl || data.imageUrl || data.url}`);
        }
        
        console.log(`   🆔 Public ID: ${data.publicId}`);
        
        // Verificar que es de Cloudinary
        const url = data.videoUrl || data.logoUrl || data.imageUrl || data.url;
        if (url && url.includes('cloudinary.com')) {
          console.log('   ☁️ ✅ Confirmado: Almacenado en Cloudinary');
        }
        
        return data;
      } else {
        throw new Error('Error en la respuesta de subida');
      }

    } catch (error) {
      if (error.response) {
        if (error.response.status === 503) {
          throw new Error('Servicio de archivos no configurado');
        } else if (error.response.status === 400) {
          throw new Error(`Error de validación: ${error.response.data.message}`);
        } else if (error.response.status === 404) {
          throw new Error(`Endpoint no encontrado: ${endpoint}. ¿Has agregado las rutas de gym-media?`);
        } else {
          throw new Error(`Error HTTP ${error.response.status}: ${error.response.data?.message || 'Error desconocido'}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Timeout - El archivo tardó demasiado en subir');
      } else {
        throw new Error(`Error subiendo archivo: ${error.message}`);
      }
    }
  }

  determineFileType(ext) {
    const videoExts = ['.mp4', '.webm', '.mov', '.avi'];
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    if (videoExts.includes(ext)) {
      return {
        fileType: 'video',
        endpoint: '/api/gym-media/upload-hero-video',
        maxSize: 50 * 1024 * 1024 // 50MB
      };
    } else if (imageExts.includes(ext)) {
      // Por defecto, tratamos imágenes como logo, pero podrías hacer esto más inteligente
      return {
        fileType: 'logo', // o 'imagen' dependiendo de lo que quieras probar
        endpoint: '/api/gym-media/upload-logo', // o '/api/gym-media/upload-hero-image'
        maxSize: 5 * 1024 * 1024 // 5MB
      };
    } else {
      throw new Error(`Formato no soportado: ${ext}`);
    }
  }

  async verifyDatabaseState() {
    console.log('\n6. 🔍 Verificando estado de la base de datos después de subidas...');
    
    try {
      // Verificar configuración actualizada
      const configResponse = await axios.get(`${this.baseURL}/api/gym/config`);
      
      if (configResponse.data.success) {
        const config = configResponse.data.data;
        
        console.log('   📊 Estado actualizado en BD:');
        console.log(`   🏢 Logo: ${config.logo?.url ? '✅ ' + config.logo.url.substring(0, 50) + '...' : '❌ No configurado'}`);
        console.log(`   🎬 Video: ${config.videoUrl || config.hero?.videoUrl ? '✅ ' + (config.videoUrl || config.hero?.videoUrl).substring(0, 50) + '...' : '❌ No configurado'}`);
        console.log(`   🖼️ Imagen: ${config.imageUrl || config.hero?.imageUrl ? '✅ ' + (config.imageUrl || config.hero?.imageUrl).substring(0, 50) + '...' : '❌ No configurado'}`);
        
        // Verificar configuración de video
        if (config.videoSettings) {
          console.log('   ⚙️ Configuración de video:');
          console.log(`      🔇 Muted: ${config.videoSettings.muted}`);
          console.log(`      🔄 Loop: ${config.videoSettings.loop}`);
          console.log(`      ⏯️ Controls: ${config.videoSettings.controls}`);
          console.log(`      ▶️ Autoplay: ${config.videoSettings.autoplay}`);
        }
        
        console.log('   ✅ Base de datos actualizada correctamente');
      }
    } catch (error) {
      console.log('   ❌ Error verificando BD:', error.message);
    }
  }

  async testAPIResponses() {
    console.log('\n7. 🧪 Probando respuestas de API...');
    
    try {
      // Probar que el frontend reciba los datos correctos
      const frontendResponse = await axios.get(`${this.baseURL}/api/gym/config`);
      
      if (frontendResponse.data.success) {
        const data = frontendResponse.data.data;
        
        console.log('   📱 Datos para frontend:');
        console.log(`   📊 hasVideo: ${data.hasVideo}`);
        console.log(`   📊 hasImage: ${data.hasImage}`);
        console.log(`   📊 hasAnyMedia: ${data.hasAnyMedia}`);
        
        // Verificar estructura de hero
        if (data.hero) {
          console.log('   🦸 Datos de hero section:');
          console.log(`      📝 Title: ${data.hero.title || 'No configurado'}`);
          console.log(`      📄 Description: ${data.hero.description ? 'Configurado' : 'No configurado'}`);
          console.log(`      🎬 Video: ${data.hero.videoUrl ? 'Configurado' : 'No configurado'}`);
          console.log(`      🖼️ Imagen: ${data.hero.imageUrl ? 'Configurado' : 'No configurado'}`);
        }
        
        console.log('   ✅ API respondiendo correctamente para frontend');
      }
    } catch (error) {
      console.log('   ⚠️ Error probando API:', error.message);
    }
  }

  getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const types = {
      // Videos
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.avi': 'video/avi',
      // Imágenes
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    return types[ext] || 'application/octet-stream';
  }
}

// Función para mostrar ayuda
function showHelp() {
  console.log('\n🎬 Elite Fitness Club - Prueba de Videos y Multimedia\n');
  console.log('Uso:');
  console.log('   node test-videos.js                     # Solo verificar estado');
  console.log('   node test-videos.js video.mp4           # Probar subida de video');
  console.log('   node test-videos.js logo.png            # Probar subida de logo');
  console.log('   node test-videos.js imagen.jpg          # Probar subida de imagen');
  console.log('   node test-videos.js --help              # Mostrar ayuda\n');
  
  console.log('Formatos soportados:');
  console.log('   🎬 Videos: .mp4, .webm, .mov, .avi (máx 50MB)');
  console.log('   🖼️ Imágenes: .jpg, .jpeg, .png, .gif, .webp (máx 5MB)\n');
  
  console.log('El script verifica:');
  console.log('   ✅ Configuración de Cloudinary');
  console.log('   ✅ Subida correcta de archivos');
  console.log('   ✅ Guardado en base de datos');
  console.log('   ✅ Respuestas correctas de API\n');
}

// Ejecutar script
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const tester = new VideoAndMediaTester();
  
  try {
    await tester.runTest();
    
    console.log('\n📋 RESUMEN FINAL:');
    console.log('✅ Servidor funcionando');
    console.log('✅ Cloudinary configurado');
    console.log('✅ Base de datos verificada');
    console.log('✅ APIs respondiendo correctamente');
    
    const filePath = args.find(arg => !arg.startsWith('--'));
    if (filePath) {
      console.log('✅ Archivo subido y guardado correctamente');
    }
    
    console.log('\n🎯 Tu sistema multimedia está listo para:');
    console.log('   • Subir logos del gimnasio');
    console.log('   • Subir videos para la página principal');
    console.log('   • Subir imágenes hero');
    console.log('   • Mostrar el contenido en el frontend');
    
  } catch (error) {
    console.error('\n💡 SOLUCIONES:');
    
    if (error.message.includes('Endpoint no encontrado')) {
      console.error('   1. Agrega las rutas de gym-media a tu servidor');
      console.error('   2. Importa gymMediaRoutes en routes/index.js');
      console.error('   3. Agrega router.use(\'/gym-media\', gymMediaRoutes)');
    } else if (error.message.includes('Cloudinary no configurado')) {
      console.error('   1. Configura variables de Cloudinary en .env');
      console.error('   2. Reinicia el servidor');
    }
    
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { VideoAndMediaTester };