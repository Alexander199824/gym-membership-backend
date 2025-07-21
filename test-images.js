// simple-cloudinary-test.js - Script autónomo para probar Cloudinary
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class SimpleCloudinaryTest {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.token = null;
  }

  async runTest() {
    console.log('📸 Probando configuración de Cloudinary en Elite Fitness Club...\n');
    
    try {
      await this.checkServer();
      await this.checkServices();
      await this.loginAdmin();
      
      // Preguntar si quiere probar subida real
      const args = process.argv.slice(2);
      const imagePath = args.find(arg => !arg.startsWith('--'));
      
      if (imagePath) {
        await this.testImageUpload(imagePath);
      } else if (args.includes('--upload')) {
        console.log('💡 Para probar subida de imagen ejecuta:');
        console.log('   node simple-cloudinary-test.js ruta/a/tu/imagen.jpg');
      }
      
      console.log('\n✅ ¡Prueba completada exitosamente!');
      
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
        console.log('   ✅ Servidor funcionando correctamente');
        console.log(`   📊 Versión: ${response.data.version}`);
      }
    } catch (error) {
      throw new Error(`Servidor no responde en ${this.baseURL}: ${error.message}`);
    }
  }

  async checkServices() {
    console.log('\n2. ☁️ Verificando servicios de Cloudinary...');
    
    try {
      const response = await axios.get(`${this.baseURL}/api/auth/services`);
      
      if (response.data.success) {
        const services = response.data.data;
        
        console.log('   📋 Estado de servicios:');
        console.log(`   ${services.imageUpload ? '✅' : '❌'} Subida de imágenes: ${services.imageUpload ? 'CONFIGURADO' : 'NO CONFIGURADO'}`);
        console.log(`   ${services.googleOAuth ? '✅' : '⚠️'} Google OAuth: ${services.googleOAuth ? 'Configurado' : 'No configurado'}`);
        console.log(`   ${services.emailNotifications ? '✅' : '⚠️'} Email: ${services.emailNotifications ? 'Configurado' : 'No configurado'}`);
        console.log(`   ${services.whatsappNotifications ? '✅' : '⚠️'} WhatsApp: ${services.whatsappNotifications ? 'Configurado' : 'No configurado'}`);
        
        if (!services.imageUpload) {
          console.log('\n   ❌ PROBLEMA: Cloudinary no está configurado');
          console.log('   💡 Para configurar Cloudinary:');
          console.log('   1. Ve a https://cloudinary.com/');
          console.log('   2. Crea una cuenta gratuita');
          console.log('   3. En tu Dashboard, copia los valores de "Account Details"');
          console.log('   4. Agrega a tu archivo .env:');
          console.log('      CLOUDINARY_CLOUD_NAME=tu_cloud_name');
          console.log('      CLOUDINARY_API_KEY=tu_api_key');
          console.log('      CLOUDINARY_API_SECRET=tu_api_secret');
          console.log('   5. Reinicia tu servidor: npm start');
          console.log('   6. Ejecuta este script de nuevo');
          throw new Error('Cloudinary no configurado - Sigue las instrucciones arriba');
        }
        
        console.log('   🎉 ¡Cloudinary está configurado correctamente!');
        this.cloudinaryAvailable = true;
        
      } else {
        throw new Error('Error obteniendo información de servicios');
      }
    } catch (error) {
      if (error.message.includes('Cloudinary no configurado')) {
        throw error;
      }
      throw new Error(`Error verificando servicios: ${error.message}`);
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
        console.log(`   🎯 Rol: ${response.data.data.user.role}`);
      } else {
        throw new Error('Login falló - Respuesta inválida');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Login falló - Credenciales incorrectas. Verifica que existe el usuario admin con password Admin123!');
      }
      throw new Error(`Error en login: ${error.message}`);
    }
  }

  async testImageUpload(imagePath) {
    console.log(`\n4. 📤 Probando subida de imagen: ${path.basename(imagePath)}`);
    
    // Verificar que la imagen existe
    if (!fs.existsSync(imagePath)) {
      throw new Error(`La imagen no existe: ${imagePath}`);
    }

    const stats = fs.statSync(imagePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`   📏 Tamaño: ${sizeKB} KB (${sizeMB} MB)`);

    if (stats.size > 5 * 1024 * 1024) {
      throw new Error('Imagen demasiado grande (máximo 5MB)');
    }

    // Verificar extensión
    const ext = path.extname(imagePath).toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    if (!validExtensions.includes(ext)) {
      throw new Error(`Extensión no válida: ${ext}. Usa: ${validExtensions.join(', ')}`);
    }

    console.log(`   ✅ Formato válido: ${ext}`);

    try {
      // Subir imagen de perfil
      const form = new FormData();
      form.append('image', fs.createReadStream(imagePath), {
        filename: path.basename(imagePath),
        contentType: this.getContentType(imagePath)
      });

      console.log('   📡 Subiendo a Cloudinary...');

      const uploadResponse = await axios.post(
        `${this.baseURL}/api/auth/profile/image`,
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
        const imageUrl = uploadResponse.data.data.profileImage;
        console.log('   🎉 ¡Imagen subida exitosamente!');
        console.log(`   🔗 URL en Cloudinary: ${imageUrl}`);
        
        // Verificar que es realmente de Cloudinary
        if (imageUrl.includes('cloudinary.com')) {
          console.log('   ☁️ ✅ Confirmado: Almacenada en Cloudinary');
        } else if (imageUrl.includes('res.cloudinary.com')) {
          console.log('   ☁️ ✅ Confirmado: URL de Cloudinary CDN');
        } else {
          console.log('   ⚠️ La URL no parece ser de Cloudinary');
        }
        
        console.log('\n   📊 Información adicional:');
        console.log(`   🆔 Usuario: ${uploadResponse.data.data.user.firstName} ${uploadResponse.data.data.user.lastName}`);
        console.log(`   📧 Email: ${uploadResponse.data.data.user.email}`);
        
        return imageUrl;
      } else {
        throw new Error('Error en la respuesta de subida');
      }

    } catch (error) {
      if (error.response) {
        if (error.response.status === 503) {
          throw new Error('Servicio de imágenes no configurado en el servidor');
        } else if (error.response.status === 400) {
          throw new Error(`Error de validación: ${error.response.data.message}`);
        } else {
          throw new Error(`Error HTTP ${error.response.status}: ${error.response.data?.message || 'Error desconocido'}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Timeout - La subida tardó demasiado. Intenta con una imagen más pequeña.');
      } else {
        throw new Error(`Error subiendo imagen: ${error.message}`);
      }
    }
  }

  getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const types = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    return types[ext] || 'image/jpeg';
  }

  async getSystemInfo() {
    console.log('\n5. 📊 Obteniendo información del sistema...');
    
    try {
      const response = await axios.get(
        `${this.baseURL}/api/admin/system-info`,
        { headers: { Authorization: `Bearer ${this.token}` } }
      );

      if (response.data.success) {
        const info = response.data.data;
        console.log('   🛠️ Servicios del sistema:');
        Object.entries(info.services).forEach(([service, status]) => {
          const icon = status ? '✅' : '❌';
          console.log(`      ${icon} ${service}: ${status ? 'Activo' : 'Inactivo'}`);
        });
        
        console.log('   ⚙️ Información del servidor:');
        console.log(`      🟢 Node.js: ${info.server.nodeVersion}`);
        console.log(`      📈 Uptime: ${Math.floor(info.server.uptime / 60)} minutos`);
        console.log(`      🌍 Entorno: ${info.server.environment}`);
      }
    } catch (error) {
      console.log('   ⚠️ No se pudo obtener información detallada del sistema');
    }
  }
}

// Función para mostrar ayuda
function showHelp() {
  console.log('\n📸 Elite Fitness Club - Prueba de Cloudinary\n');
  console.log('Uso:');
  console.log('   node simple-cloudinary-test.js                    # Verificar configuración');
  console.log('   node simple-cloudinary-test.js imagen.jpg         # Probar subida de imagen');
  console.log('   node simple-cloudinary-test.js --help             # Mostrar ayuda\n');
  
  console.log('Ejemplos:');
  console.log('   node simple-cloudinary-test.js                    # Solo verificar');
  console.log('   node simple-cloudinary-test.js ./foto.jpg         # Subir foto.jpg');
  console.log('   node simple-cloudinary-test.js "C:\\Users\\Usuario\\Desktop\\imagen.png"');
  console.log('   node simple-cloudinary-test.js /Users/usuario/Desktop/foto.jpeg\n');
  
  console.log('Formatos soportados: .jpg, .jpeg, .png, .gif, .webp');
  console.log('Tamaño máximo: 5MB\n');
}

// Ejecutar script
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const tester = new SimpleCloudinaryTest();
  
  try {
    await tester.runTest();
    
    // Si llegamos aquí sin errores, mostrar resumen final
    console.log('\n📋 RESUMEN:');
    console.log('✅ Servidor funcionando');
    console.log('✅ Cloudinary configurado');
    console.log('✅ Autenticación exitosa');
    
    if (args.length > 0 && !args[0].startsWith('--')) {
      console.log('✅ Imagen subida correctamente');
    }
    
    console.log('\n🎯 Próximos pasos:');
    console.log('   • Tu sistema de imágenes está listo');
    console.log('   • Puedes subir imágenes desde tu aplicación');
    console.log('   • Las imágenes se almacenan en Cloudinary automáticamente');
    
    if (args.length === 0) {
      console.log('\n💡 Para probar subida real ejecuta:');
      console.log('   node simple-cloudinary-test.js ruta/a/tu/imagen.jpg');
    }
    
  } catch (error) {
    console.error('\n💡 SOLUCIONES SUGERIDAS:');
    
    if (error.message.includes('Servidor no responde')) {
      console.error('   1. Verifica que tu servidor esté ejecutándose: npm start');
      console.error('   2. Confirma la URL del servidor (http://localhost:5000)');
    } else if (error.message.includes('Cloudinary no configurado')) {
      console.error('   1. Obtén credenciales en https://cloudinary.com/');
      console.error('   2. Agrega las variables a tu .env');
      console.error('   3. Reinicia el servidor');
    } else if (error.message.includes('Login falló')) {
      console.error('   1. Verifica que el usuario admin existe');
      console.error('   2. Confirma que la password es Admin123!');
      console.error('   3. Ejecuta npm start para crear el usuario admin automáticamente');
    }
    
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { SimpleCloudinaryTest };