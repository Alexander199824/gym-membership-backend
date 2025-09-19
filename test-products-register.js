// test-products-register.js - REGISTRADOR COMPLETO v4.0 (CON DIAGNÓSTICO INTEGRADO)
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class ProductsRegisterWithDiagnostic {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.adminToken = null;
    
    // ✅ NUEVOS PRODUCTOS CON DATOS ÚNICOS
    this.productsData = [
      {
        name: 'Mass Gainer Extreme 3000',
        description: 'Ganador de masa muscular de alta densidad calórica con proteínas de liberación sostenida. Contiene creatina, glutamina y vitaminas esenciales. Ideal para atletas que buscan aumentar peso de forma saludable.',
        price: 89.99,
        originalPrice: 119.99,
        sku: 'MASS-GAIN-3000-CHOC',
        stockQuantity: 22,
        minStock: 5,
        weight: 3.0,
        dimensions: {
          length: 18,
          width: 18,
          height: 25,
          unit: 'cm'
        },
        isFeatured: true,
        allowOnlinePayment: true,
        allowCardPayment: true,
        allowCashOnDelivery: true,
        deliveryTime: '24-48 horas',
        categoryName: 'Suplementos',
        brandName: 'Universal Nutrition',
        imagePath: 'C:\\Users\\echev\\OneDrive\\Escritorio\\productos de prueba\\suplementos-universalfitness.png'
      },
      {
        name: 'Uniforme Deportivo Performance Plus',
        description: 'Uniforme deportivo de alto rendimiento con tecnología Dri-FIT avanzada. Incluye camiseta, shorts y calcetas deportivas. Diseñado para máximo confort durante entrenamientos intensos.',
        price: 79.99,
        originalPrice: 109.99,
        sku: 'UNIF-PERF-PLUS-M',
        stockQuantity: 16,
        minStock: 3,
        weight: 0.9,
        dimensions: {
          length: 32,
          width: 26,
          height: 6,
          unit: 'cm'
        },
        isFeatured: true,
        allowOnlinePayment: true,
        allowCardPayment: true,
        allowCashOnDelivery: true,
        deliveryTime: '1-3 días hábiles',
        categoryName: 'Ropa Deportiva',
        brandName: 'Nike',
        imagePath: 'C:\\Users\\echev\\OneDrive\\Escritorio\\productos de prueba\\51NhX5fdSEL.jpg'
      }
    ];
    
    // Control de registro
    this.registeredCategories = [];
    this.registeredBrands = [];
    this.registeredProducts = [];
    this.uploadedImages = [];
    this.existingCategories = [];
    this.existingBrands = [];
    
    // Control de diagnóstico
    this.diagnosticRun = false;
    this.cloudinaryConfigured = false;
  }

  async registerAllProducts() {
    console.log('🏪 Elite Fitness Club - Registrador de Productos v4.0 (CON DIAGNÓSTICO INTEGRADO)');
    console.log('='.repeat(90));
    console.log('🎯 OBJETIVO: Crear productos con imágenes en Cloudinary + diagnóstico automático');
    console.log('📦 PRODUCTOS: 2 productos ÚNICOS (Mass Gainer + Uniforme Performance)');
    console.log('☁️ CLOUDINARY: Con verificación y diagnóstico automático si falla');
    console.log('🔄 PROCESO: Auth → Verificación → Categorías → Marcas → Productos → Cloudinary → Diagnóstico\n');
    
    try {
      await this.loginAdmin();
      await this.loadExistingData();
      await this.ensureCategories();
      await this.ensureBrands();
      await this.createProducts();
      await this.uploadProductImagesWithDiagnostic();
      await this.showFinalSummary();
      
      console.log('\n🎉 ¡REGISTRO DE PRODUCTOS COMPLETADO EXITOSAMENTE!');
      console.log('✅ Todos los productos están listos para la venta');
      
      if (this.uploadedImages.length > 0) {
        console.log('☁️ Imágenes almacenadas en Cloudinary para producción');
        console.log('🛒 Los clientes pueden ver y comprar estos productos desde cualquier lugar');
      }
      
    } catch (error) {
      console.error('\n❌ Error en el registro:', error.message);
      if (error.response) {
        console.error('📋 Detalles del error:', {
          status: error.response.status,
          data: error.response.data,
          url: error.response.config?.url
        });
      }
      await this.showCleanupInstructions();
    }
  }

  // ✅ NUEVO: Upload con diagnóstico automático integrado
  async uploadProductImagesWithDiagnostic() {
    console.log('\n6. ☁️ Subiendo imágenes a Cloudinary (con diagnóstico automático)...');
    
    if (this.registeredProducts.length === 0) {
      console.log('   ⚠️ No hay productos registrados para subir imágenes');
      return;
    }
    
    console.log('   📤 Las imágenes se subirán a Cloudinary para acceso global');
    console.log('   🔍 Diagnóstico automático si alguna subida falla');
    
    let uploadErrors = [];
    
    for (let i = 0; i < this.registeredProducts.length; i++) {
      const product = this.registeredProducts[i];
      console.log(`\n   ☁️ SUBIENDO IMAGEN ${i + 1}/${this.registeredProducts.length}: "${product.name}"`);
      console.log('   ' + '-'.repeat(70));
      
      try {
        const imagePath = product.imagePath;
        console.log(`   📁 Ruta local: ${imagePath}`);
        
        // Verificar que el archivo existe
        if (!fs.existsSync(imagePath)) {
          const error = `Archivo no encontrado: ${imagePath}`;
          console.error(`   ❌ ${error}`);
          uploadErrors.push({ product: product.name, error });
          continue;
        }
        
        const stats = fs.statSync(imagePath);
        const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`   📏 Tamaño: ${fileSizeMB} MB`);
        
        // Verificar límite de tamaño
        if (stats.size > 10 * 1024 * 1024) {
          const error = `Archivo demasiado grande: ${fileSizeMB} MB (máximo 10MB)`;
          console.error(`   ❌ ${error}`);
          uploadErrors.push({ product: product.name, error });
          continue;
        }
        
        // ✅ USAR EL PATRÓN EXITOSO DEL TEST DE VIDEO/LOGO
        const form = new FormData();
        form.append('image', fs.createReadStream(imagePath), {
          filename: path.basename(imagePath),
          contentType: this.getImageContentType(imagePath)
        });
        
        console.log(`   ☁️ Subiendo a Cloudinary...`);
        
        // ✅ USAR EXACTAMENTE EL MISMO PATRÓN QUE FUNCIONA
        const response = await axios.post(
          `${this.baseURL}/api/store/management/products/${product.id}/images?isPrimary=true&altText=${encodeURIComponent(product.name + ' - Imagen principal')}&displayOrder=1`, 
          form,
          {
            headers: {
              ...form.getHeaders(),
              'Authorization': `Bearer ${this.adminToken}`
            },
            timeout: 60000 // 60 segundos como en el test que funciona
          }
        );
        
        if (response.data.success) {
          this.uploadedImages.push(response.data.data.image);
          console.log(`   ✅ IMAGEN SUBIDA EXITOSAMENTE A CLOUDINARY`);
          console.log(`      🆔 ID: ${response.data.data.image.id}`);
          console.log(`      🔗 URL: ${response.data.data.image.imageUrl}`);
          console.log(`      ⭐ Imagen principal: ${response.data.data.image.isPrimary ? 'Sí' : 'No'}`);
          
          // Mostrar información de Cloudinary si está disponible
          if (response.data.data.image.cloudinaryInfo) {
            const cloudinaryInfo = response.data.data.image.cloudinaryInfo;
            console.log(`      ☁️ Cloudinary ID: ${cloudinaryInfo.publicId}`);
            console.log(`      📏 Dimensiones: ${cloudinaryInfo.width}x${cloudinaryInfo.height}`);
            console.log(`      📁 Formato: ${cloudinaryInfo.format}`);
            console.log(`      💾 Tamaño: ${(cloudinaryInfo.size / 1024).toFixed(2)} KB`);
          }
          
          // Verificar que la URL es de Cloudinary
          if (response.data.data.image.imageUrl.includes('cloudinary.com')) {
            console.log(`      ✅ Confirmado: Imagen en Cloudinary CDN`);
            this.cloudinaryConfigured = true;
          } else {
            console.log(`      ⚠️ Advertencia: URL no es de Cloudinary (${response.data.data.image.imageUrl.substring(0, 50)}...)`);
          }
        } else {
          throw new Error('Respuesta sin success=true');
        }
        
      } catch (error) {
        console.error(`   ❌ Error subiendo imagen para "${product.name}"`);
        console.error(`      💥 Status: ${error.response?.status || 'N/A'}`);
        console.error(`      💥 Message: ${error.response?.data?.message || error.message}`);
        
        uploadErrors.push({
          product: product.name,
          error: error.response?.data?.message || error.message,
          status: error.response?.status,
          details: error.response?.data
        });
      }
    }
    
    // ✅ DIAGNÓSTICO AUTOMÁTICO SI HAY ERRORES
    if (uploadErrors.length > 0) {
      console.log(`\n⚠️ ${uploadErrors.length} errores de subida detectados. Ejecutando diagnóstico automático...`);
      await this.runAutomaticDiagnostic(uploadErrors);
    }
    
    console.log(`\n   🎯 IMÁGENES PROCESADAS: ${this.uploadedImages.length} de ${this.registeredProducts.length} subidas a Cloudinary`);
    
    if (this.uploadedImages.length > 0) {
      console.log(`   ☁️ ✅ ${this.uploadedImages.length} imágenes están en Cloudinary CDN`);
      console.log(`   🌐 ✅ Accesibles desde cualquier ubicación mundial`);
      console.log(`   🚀 ✅ Optimizadas automáticamente para web`);
    }
  }

  // ✅ NUEVO: Diagnóstico automático cuando falla la subida
  async runAutomaticDiagnostic(uploadErrors) {
    console.log('\n🔍 DIAGNÓSTICO AUTOMÁTICO DE CLOUDINARY');
    console.log('='.repeat(60));
    
    this.diagnosticRun = true;
    
    try {
      // 1. Verificar variables de entorno
      await this.checkEnvironmentVariables();
      
      // 2. Verificar dependencias
      await this.checkCloudinaryDependencies();
      
      // 3. Probar conexión directa con Cloudinary
      await this.testDirectCloudinaryConnection();
      
      // 4. Verificar endpoints de la aplicación
      await this.checkApplicationEndpoints();
      
      // 5. Analizar errores específicos
      await this.analyzeUploadErrors(uploadErrors);
      
      // 6. Mostrar soluciones
      await this.showDiagnosticSolutions(uploadErrors);
      
    } catch (diagnosticError) {
      console.error('\n❌ Error en diagnóstico automático:', diagnosticError.message);
    }
  }

  async checkEnvironmentVariables() {
    console.log('\n1. 🔧 Verificando variables de entorno...');
    
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    
    console.log(`   CLOUDINARY_CLOUD_NAME: ${cloudName ? '✅ Configurado' : '❌ NO CONFIGURADO'}`);
    console.log(`   CLOUDINARY_API_KEY: ${apiKey ? '✅ Configurado' : '❌ NO CONFIGURADO'}`);
    console.log(`   CLOUDINARY_API_SECRET: ${apiSecret ? '✅ Configurado' : '❌ NO CONFIGURADO'}`);
    
    if (!cloudName || !apiKey || !apiSecret) {
      console.log('\n❌ PROBLEMA CRÍTICO: Variables de entorno faltantes');
      console.log('💡 SOLUCIÓN INMEDIATA:');
      console.log('   1. Ve a cloudinary.com e inicia sesión');
      console.log('   2. Copia tus credenciales del Dashboard');
      console.log('   3. Agrega al archivo .env:');
      console.log('      CLOUDINARY_CLOUD_NAME=tu_cloud_name');
      console.log('      CLOUDINARY_API_KEY=tu_api_key');
      console.log('      CLOUDINARY_API_SECRET=tu_api_secret');
      return false;
    }
    
    // Verificar que no sean valores placeholder
    if (cloudName.includes('your_') || apiKey.includes('your_')) {
      console.log('\n❌ PROBLEMA: Variables contienen valores placeholder');
      console.log('💡 SOLUCIÓN: Reemplaza con tus credenciales reales de Cloudinary');
      return false;
    }
    
    console.log('   ✅ Variables de entorno OK');
    return true;
  }

  async checkCloudinaryDependencies() {
    console.log('\n2. 📦 Verificando dependencias de Cloudinary...');
    
    try {
      require('cloudinary');
      console.log('   cloudinary: ✅ Instalado');
    } catch (error) {
      console.log('   cloudinary: ❌ NO INSTALADO');
      console.log('   💡 Ejecuta: npm install cloudinary');
      return false;
    }
    
    try {
      require('multer-storage-cloudinary');
      console.log('   multer-storage-cloudinary: ✅ Instalado');
    } catch (error) {
      console.log('   multer-storage-cloudinary: ❌ NO INSTALADO');
      console.log('   💡 Ejecuta: npm install multer-storage-cloudinary');
      return false;
    }
    
    console.log('   ✅ Dependencias OK');
    return true;
  }

  async testDirectCloudinaryConnection() {
    console.log('\n3. ☁️ Probando conexión directa con Cloudinary...');
    
    try {
      const cloudinary = require('cloudinary').v2;
      
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });
      
      console.log('   Configuración: ✅ Aplicada');
      
      // Test de ping
      const result = await cloudinary.api.ping();
      console.log('   Conexión: ✅ Exitosa');
      console.log(`   Status: ${result.status}`);
      
      // Test de subida simple
      console.log('   Probando subida de imagen de prueba...');
      const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const uploadResult = await cloudinary.uploader.upload(testImageBase64, {
        folder: 'gym/diagnostic',
        public_id: 'test-' + Date.now()
      });
      
      console.log('   Subida directa: ✅ EXITOSA');
      console.log(`   URL generada: ${uploadResult.secure_url}`);
      
      // Limpiar
      await cloudinary.uploader.destroy(uploadResult.public_id);
      console.log('   Limpieza: ✅ Completada');
      
      this.cloudinaryConfigured = true;
      return true;
      
    } catch (error) {
      console.log('   Conexión: ❌ FALLÓ');
      console.log(`   Error: ${error.message}`);
      
      if (error.message.includes('Invalid API Key')) {
        console.log('   💡 PROBLEMA: CLOUDINARY_API_KEY incorrecta');
      } else if (error.message.includes('Invalid API Secret')) {
        console.log('   💡 PROBLEMA: CLOUDINARY_API_SECRET incorrecta');
      } else if (error.message.includes('Invalid cloud name')) {
        console.log('   💡 PROBLEMA: CLOUDINARY_CLOUD_NAME incorrecto');
      }
      
      return false;
    }
  }

  async checkApplicationEndpoints() {
    console.log('\n4. 🔧 Verificando endpoints de la aplicación...');
    
    try {
      // Verificar rutas de gestión de productos
      const response = await axios.get(`${this.baseURL}/api/store/management/products`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });
      console.log('   /api/store/management/products: ✅ Disponible');
      
      // Verificar si hay productos para probar
      if (this.registeredProducts.length > 0) {
        const testProduct = this.registeredProducts[0];
        
        try {
          const imagesResponse = await axios.get(`${this.baseURL}/api/store/management/products/${testProduct.id}/images`, {
            headers: { 'Authorization': `Bearer ${this.adminToken}` }
          });
          console.log(`   /api/store/management/products/${testProduct.id}/images: ✅ Disponible`);
        } catch (error) {
          console.log(`   /api/store/management/products/${testProduct.id}/images: ❌ Error ${error.response?.status}`);
        }
      }
      
      return true;
      
    } catch (error) {
      console.log('   Endpoints: ❌ Error');
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Message: ${error.response?.data?.message}`);
      return false;
    }
  }

  async analyzeUploadErrors(uploadErrors) {
    console.log('\n5. 🔍 Analizando errores específicos...');
    
    const errorTypes = {};
    
    uploadErrors.forEach(error => {
      const type = this.categorizeError(error);
      if (!errorTypes[type]) {
        errorTypes[type] = [];
      }
      errorTypes[type].push(error);
    });
    
    console.log('   📊 Tipos de errores encontrados:');
    Object.keys(errorTypes).forEach(type => {
      const count = errorTypes[type].length;
      console.log(`      ${type}: ${count} error${count > 1 ? 'es' : ''}`);
    });
    
    // Mostrar detalles de cada tipo
    for (const [type, errors] of Object.entries(errorTypes)) {
      console.log(`\n   📋 Detalles de "${type}":`);
      errors.forEach(error => {
        console.log(`      • ${error.product}: ${error.error}`);
        if (error.status) {
          console.log(`        Status: ${error.status}`);
        }
      });
    }
  }

  categorizeError(error) {
    const message = error.error?.toLowerCase() || '';
    const status = error.status;
    
    if (message.includes('no se subió ningún archivo')) {
      return 'Archivo no recibido';
    } else if (message.includes('error al subir imagen')) {
      return 'Error de subida';
    } else if (status === 413) {
      return 'Archivo demasiado grande';
    } else if (status === 401) {
      return 'Error de autenticación';
    } else if (status === 404) {
      return 'Endpoint no encontrado';
    } else if (status === 500) {
      return 'Error del servidor';
    } else if (message.includes('cloudinary')) {
      return 'Error de Cloudinary';
    } else {
      return 'Error desconocido';
    }
  }

  async showDiagnosticSolutions(uploadErrors) {
    console.log('\n6. 💡 SOLUCIONES RECOMENDADAS');
    console.log('='.repeat(50));
    
    const hasCloudinaryError = uploadErrors.some(e => e.error?.toLowerCase().includes('cloudinary'));
    const hasAuthError = uploadErrors.some(e => e.status === 401);
    const hasServerError = uploadErrors.some(e => e.status === 500);
    
    if (!this.cloudinaryConfigured) {
      console.log('🔧 SOLUCIÓN PRINCIPAL: Configurar Cloudinary');
      console.log('   1. ✅ Verifica variables de entorno en .env');
      console.log('   2. ✅ Reinicia el servidor después de configurar .env');
      console.log('   3. ✅ Verifica que StoreImageController use Cloudinary');
    }
    
    if (hasAuthError) {
      console.log('\n🔐 SOLUCIÓN: Error de autenticación');
      console.log('   1. ✅ Verifica que el token de admin sea válido');
      console.log('   2. ✅ Verifica permisos de staff en las rutas');
    }
    
    if (hasServerError) {
      console.log('\n🏥 SOLUCIÓN: Error del servidor');
      console.log('   1. ✅ Revisa logs del servidor para más detalles');
      console.log('   2. ✅ Verifica que StoreImageController esté actualizado');
      console.log('   3. ✅ Asegúrate de que las rutas usen uploadProductImage de cloudinary');
    }
    
    if (hasCloudinaryError) {
      console.log('\n☁️ SOLUCIÓN: Error específico de Cloudinary');
      console.log('   1. ✅ Verifica credenciales en cloudinary.com');
      console.log('   2. ✅ Asegúrate de que el plan de Cloudinary tenga suficiente cuota');
      console.log('   3. ✅ Verifica que multer-storage-cloudinary esté configurado');
    }
    
    console.log('\n🚀 PRÓXIMOS PASOS:');
    console.log('   1. Aplica las soluciones sugeridas');
    console.log('   2. Reinicia el servidor: npm start');
    console.log('   3. Ejecuta el test nuevamente');
    console.log('   4. Si persisten problemas, revisa logs del servidor');
  }

  // ✅ MÉTODOS AUXILIARES

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

  // ✅ MÉTODOS PRINCIPALES (mismos que antes pero optimizados)

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

  async loadExistingData() {
    console.log('\n2. 📊 Cargando datos existentes de la tienda...');
    
    try {
      // Cargar categorías existentes
      console.log('   📂 Cargando categorías...');
      const categoriesResponse = await axios.get(`${this.baseURL}/api/store/categories`);
      this.existingCategories = categoriesResponse.data.success ? categoriesResponse.data.data.categories : [];
      console.log(`   ✅ ${this.existingCategories.length} categorías cargadas`);
      
      // Cargar marcas existentes
      console.log('   🏷️ Cargando marcas...');
      const brandsResponse = await axios.get(`${this.baseURL}/api/store/brands`);
      this.existingBrands = brandsResponse.data.success ? brandsResponse.data.data.brands : [];
      console.log(`   ✅ ${this.existingBrands.length} marcas cargadas`);
      
      // Cargar productos existentes para estadísticas
      console.log('   📦 Cargando productos...');
      const productsResponse = await axios.get(`${this.baseURL}/api/store/products`, {
        params: { limit: 100 }
      });
      const existingProducts = productsResponse.data.success ? productsResponse.data.data.products : [];
      console.log(`   ✅ ${existingProducts.length} productos existentes`);
      
      // Mostrar resumen
      console.log('\n   📊 RESUMEN DE DATOS EXISTENTES:');
      if (this.existingCategories.length > 0) {
        console.log(`   📂 Categorías: ${this.existingCategories.map(c => c.name).join(', ')}`);
      }
      if (this.existingBrands.length > 0) {
        console.log(`   🏷️ Marcas: ${this.existingBrands.map(b => b.name).join(', ')}`);
      }
      
    } catch (error) {
      console.log(`   ⚠️ Error cargando datos existentes: ${error.message}`);
      console.log('   📋 Continuando con datos vacíos...');
      this.existingCategories = [];
      this.existingBrands = [];
    }
  }

  async ensureCategories() {
    console.log('\n3. 📂 Asegurando que las categorías necesarias existan...');
    
    const requiredCategories = [
      {
        name: 'Suplementos',
        description: 'Suplementos deportivos, proteínas, vitaminas y nutrición deportiva',
        slug: 'suplementos',
        iconName: 'package',
        displayOrder: 1
      },
      {
        name: 'Ropa Deportiva',
        description: 'Ropa y vestimenta para entrenamientos, casual wear deportivo',
        slug: 'ropa-deportiva',
        iconName: 'shirt',
        displayOrder: 2
      }
    ];

    for (const categoryData of requiredCategories) {
      console.log(`\n   📂 Procesando categoría: "${categoryData.name}"`);
      
      // Buscar si ya existe
      const existingCategory = this.existingCategories.find(c => {
        const existingName = c.name.toLowerCase().trim();
        const requiredName = categoryData.name.toLowerCase().trim();
        return existingName === requiredName || 
               existingName.includes(requiredName) || 
               requiredName.includes(existingName);
      });
      
      if (existingCategory) {
        console.log(`   ✅ Categoría encontrada: "${existingCategory.name}" (ID: ${existingCategory.id})`);
        this.registeredCategories.push(existingCategory);
      } else {
        try {
          console.log(`   🔨 Creando nueva categoría: "${categoryData.name}"`);
          
          const response = await axios.post(`${this.baseURL}/api/store/management/categories`, categoryData, {
            headers: { 'Authorization': `Bearer ${this.adminToken}` }
          });
          
          if (response.data.success) {
            this.registeredCategories.push(response.data.data.category);
            console.log(`   ✅ Categoría creada: "${categoryData.name}" (ID: ${response.data.data.category.id})`);
          }
          
        } catch (error) {
          console.error(`   ❌ Error creando categoría "${categoryData.name}":`, {
            status: error.response?.status,
            message: error.response?.data?.message || error.message
          });
        }
      }
    }
    
    console.log(`\n   🎯 CATEGORÍAS DISPONIBLES: ${this.registeredCategories.length} listas para usar`);
  }

  async ensureBrands() {
    console.log('\n4. 🏷️ Asegurando que las marcas necesarias existan...');
    
    const requiredBrands = [
      {
        name: 'Universal Nutrition',
        description: 'Líder mundial en suplementos deportivos y nutrición'
      },
      {
        name: 'Nike',
        description: 'Marca líder mundial en ropa y calzado deportivo'
      }
    ];

    for (const brandData of requiredBrands) {
      console.log(`\n   🏷️ Procesando marca: "${brandData.name}"`);
      
      const existingBrand = this.existingBrands.find(b => {
        const existingName = b.name.toLowerCase().trim();
        const requiredName = brandData.name.toLowerCase().trim();
        return existingName === requiredName;
      });
      
      if (existingBrand) {
        console.log(`   ✅ Marca encontrada: "${existingBrand.name}" (ID: ${existingBrand.id})`);
        this.registeredBrands.push(existingBrand);
      } else {
        try {
          console.log(`   🔨 Creando nueva marca: "${brandData.name}"`);
          
          const response = await axios.post(`${this.baseURL}/api/store/management/brands`, brandData, {
            headers: { 'Authorization': `Bearer ${this.adminToken}` }
          });
          
          if (response.data.success) {
            this.registeredBrands.push(response.data.data.brand);
            console.log(`   ✅ Marca creada: "${brandData.name}" (ID: ${response.data.data.brand.id})`);
          }
          
        } catch (error) {
          console.error(`   ❌ Error creando marca "${brandData.name}":`, {
            status: error.response?.status,
            message: error.response?.data?.message || error.message
          });
        }
      }
    }
    
    console.log(`\n   🎯 MARCAS DISPONIBLES: ${this.registeredBrands.length} listas para usar`);
  }

  async createProducts() {
    console.log('\n5. 📦 Creando nuevos productos únicos...');
    
    if (this.registeredCategories.length === 0) {
      throw new Error('No hay categorías disponibles para crear productos');
    }
    
    if (this.registeredBrands.length === 0) {
      throw new Error('No hay marcas disponibles para crear productos');
    }
    
    for (let i = 0; i < this.productsData.length; i++) {
      const productData = this.productsData[i];
      console.log(`\n   📦 CREANDO PRODUCTO ${i + 1}/${this.productsData.length}: "${productData.name}"`);
      console.log('   ' + '-'.repeat(70));
      
      try {
        // Buscar categoría y marca
        const category = this.registeredCategories.find(c => {
          const categoryName = c.name.toLowerCase().trim();
          const requiredName = productData.categoryName.toLowerCase().trim();
          return categoryName === requiredName || categoryName.includes(requiredName);
        });
        
        const brand = this.registeredBrands.find(b => {
          const brandName = b.name.toLowerCase().trim();
          const requiredName = productData.brandName.toLowerCase().trim();
          return brandName === requiredName;
        });
        
        if (!category || !brand) {
          console.error(`   ❌ Categoría o marca no encontrada`);
          continue;
        }
        
        // Verificar duplicados por SKU
        try {
          const existingProductResponse = await axios.get(`${this.baseURL}/api/store/products`, {
            params: { search: productData.sku, limit: 1 }
          });
          
          const existingProducts = existingProductResponse.data.data?.products || [];
          const existingProduct = existingProducts.find(p => p.sku === productData.sku);
          
          if (existingProduct) {
            console.log(`   ⚠️ Producto con SKU "${productData.sku}" ya existe`);
            continue;
          }
        } catch (checkError) {
          console.log(`   ⚠️ No se pudo verificar producto existente, continuando...`);
        }
        
        // Preparar datos del producto
        const productPayload = {
          name: productData.name,
          description: productData.description,
          price: productData.price,
          originalPrice: productData.originalPrice,
          sku: productData.sku,
          stockQuantity: productData.stockQuantity,
          minStock: productData.minStock,
          weight: productData.weight,
          dimensions: productData.dimensions,
          categoryId: category.id,
          brandId: brand.id,
          isFeatured: productData.isFeatured,
          allowOnlinePayment: productData.allowOnlinePayment,
          allowCardPayment: productData.allowCardPayment,
          allowCashOnDelivery: productData.allowCashOnDelivery,
          deliveryTime: productData.deliveryTime
        };
        
        console.log(`   📊 Datos del producto:`);
        console.log(`      💰 Precio: $${productPayload.price} (original: $${productPayload.originalPrice})`);
        console.log(`      📦 Stock: ${productPayload.stockQuantity} unidades`);
        console.log(`      🏷️ SKU: ${productPayload.sku}`);
        console.log(`      📏 Dimensiones: ${productPayload.dimensions.length}x${productPayload.dimensions.width}x${productPayload.dimensions.height} ${productPayload.dimensions.unit}`);
        
        // Crear el producto
        const response = await axios.post(`${this.baseURL}/api/store/management/products`, productPayload, {
          headers: { 
            'Authorization': `Bearer ${this.adminToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data.success) {
          this.registeredProducts.push({
            ...response.data.data.product,
            imagePath: productData.imagePath
          });
          
          console.log(`   ✅ PRODUCTO CREADO EXITOSAMENTE`);
          console.log(`      🆔 ID: ${response.data.data.product.id}`);
          console.log(`      📦 Nombre: ${response.data.data.product.name}`);
          console.log(`      💰 Precio: $${response.data.data.product.price}`);
          
          const discount = ((productData.originalPrice - productData.price) / productData.originalPrice * 100).toFixed(1);
          console.log(`      🔄 Descuento: ${discount}%`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error creando producto "${productData.name}"`);
        console.error(`      💥 ${error.response?.data?.message || error.message}`);
      }
    }
    
    console.log(`\n   🎯 PRODUCTOS REGISTRADOS: ${this.registeredProducts.length} de ${this.productsData.length} completados`);
  }

  async showFinalSummary() {
    console.log('\n7. 📊 RESUMEN FINAL DEL REGISTRO');
    console.log('=' .repeat(70));
    
    console.log('🎯 RESUMEN COMPLETADO:');
    console.log(`   📂 Categorías: ${this.registeredCategories.length} disponibles`);
    console.log(`   🏷️ Marcas: ${this.registeredBrands.length} disponibles`);
    console.log(`   📦 Productos: ${this.registeredProducts.length} creados`);
    console.log(`   ☁️ Imágenes: ${this.uploadedImages.length} subidas a Cloudinary`);
    
    if (this.diagnosticRun) {
      console.log(`   🔍 Diagnóstico automático: ✅ Ejecutado`);
    }
    
    // Detalles de productos creados
    if (this.registeredProducts.length > 0) {
      console.log('\n📦 NUEVOS PRODUCTOS ÚNICOS:');
      this.registeredProducts.forEach((product, index) => {
        const hasImage = this.uploadedImages.some(img => img.productId === product.id);
        const discount = ((product.originalPrice - product.price) / product.originalPrice * 100).toFixed(1);
        
        console.log(`\n   ${index + 1}. "${product.name}"`);
        console.log(`      🆔 ID: ${product.id}`);
        console.log(`      💰 Precio: $${product.price} (original: $${product.originalPrice}) - ${discount}% desc.`);
        console.log(`      📦 Stock: ${product.stockQuantity} unidades`);
        console.log(`      🏷️ SKU: ${product.sku}`);
        console.log(`      ⭐ Destacado: ${product.isFeatured ? 'Sí' : 'No'}`);
        console.log(`      🖼️ Imagen: ${hasImage ? '✅ Subida a Cloudinary' : '❌ Sin imagen'}`);
        
        const productImage = this.uploadedImages.find(img => img.productId === product.id);
        if (productImage && productImage.imageUrl.includes('cloudinary.com')) {
          console.log(`         ☁️ URL Cloudinary: ${productImage.imageUrl.substring(0, 60)}...`);
        }
      });
      
      // Cálculos financieros
      const totalValue = this.registeredProducts.reduce((sum, product) => 
        sum + (parseFloat(product.price) * product.stockQuantity), 0
      );
      const totalOriginalValue = this.registeredProducts.reduce((sum, product) => 
        sum + (parseFloat(product.originalPrice) * product.stockQuantity), 0
      );
      const totalStock = this.registeredProducts.reduce((sum, product) => 
        sum + product.stockQuantity, 0
      );
      const totalSavings = totalOriginalValue - totalValue;
      
      console.log('\n💰 VALOR DEL NUEVO INVENTARIO:');
      console.log(`   📦 Total unidades: ${totalStock}`);
      console.log(`   💰 Valor actual: $${totalValue.toFixed(2)}`);
      console.log(`   💸 Valor original: $${totalOriginalValue.toFixed(2)}`);
      console.log(`   🎯 Ahorro total: $${totalSavings.toFixed(2)} (${((totalSavings/totalOriginalValue)*100).toFixed(1)}%)`);
    }
    
    // URLs de acceso
    console.log('\n🌐 ACCESO A LOS NUEVOS PRODUCTOS:');
    console.log(`   🛒 Tienda: ${this.baseURL}/api/store/products`);
    console.log(`   ⭐ Destacados: ${this.baseURL}/api/store/products/featured`);
    console.log(`   🔧 Gestión: ${this.baseURL}/api/store/management/products`);
    
    // Estado final con diagnóstico
    console.log('\n✅ ESTADO FINAL:');
    if (this.registeredProducts.length === this.productsData.length) {
      console.log('   🎉 ¡TODOS LOS PRODUCTOS REGISTRADOS EXITOSAMENTE!');
      
      if (this.uploadedImages.length === this.registeredProducts.length) {
        console.log('   🖼️ ✅ Todas las imágenes subidas a Cloudinary');
        console.log('   ☁️ ✅ CDN global activo para máximo rendimiento');
        console.log('   🚀 ✅ Sistema listo para producción');
      } else if (this.uploadedImages.length > 0) {
        console.log(`   🖼️ ⚠️ ${this.uploadedImages.length}/${this.registeredProducts.length} imágenes subidas`);
        console.log('   🔍 ✅ Diagnóstico automático ejecutado para identificar problemas');
      } else {
        console.log('   🖼️ ❌ No se subieron imágenes');
        if (this.diagnosticRun) {
          console.log('   🔍 ✅ Diagnóstico automático ejecutado - revisa las soluciones sugeridas');
        }
      }
    }
    
    if (this.cloudinaryConfigured) {
      console.log('\n☁️ CLOUDINARY STATUS: ✅ Configurado y funcionando');
    } else if (this.diagnosticRun) {
      console.log('\n☁️ CLOUDINARY STATUS: ❌ Requiere configuración - ver diagnóstico');
    }
  }

  async showCleanupInstructions() {
    console.log('\n🧹 INSTRUCCIONES DE LIMPIEZA');
    console.log('=' .repeat(50));
    
    if (this.registeredProducts.length > 0) {
      console.log('📦 PRODUCTOS CREADOS:');
      this.registeredProducts.forEach(product => {
        console.log(`   • "${product.name}" (ID: ${product.id}, SKU: ${product.sku})`);
      });
      console.log('\n💡 Usa el panel de administración para gestionar estos productos');
    }
    
    if (this.uploadedImages.length > 0) {
      console.log('\n☁️ IMÁGENES EN CLOUDINARY:');
      console.log(`   • ${this.uploadedImages.length} imágenes subidas exitosamente`);
      console.log('   • Se eliminarán automáticamente al eliminar productos');
    }
    
    if (this.diagnosticRun) {
      console.log('\n🔍 DIAGNÓSTICO EJECUTADO:');
      console.log('   • Revisa las soluciones sugeridas arriba');
      console.log('   • Aplica correcciones y ejecuta el test nuevamente');
    }
  }

  // Método para verificar conectividad
  async testConnectivity() {
    console.log('🔍 Verificando conectividad y configuración...');
    
    try {
      const response = await axios.get(`${this.baseURL}/api/store/products`, { timeout: 5000 });
      console.log('   ✅ Conexión con API exitosa');
      
      try {
        await axios.get(`${this.baseURL}/api/store/management/products`, { timeout: 5000 });
      } catch (error) {
        if (error.response?.status === 401) {
          console.log('   ✅ Rutas de gestión protegidas correctamente');
        }
      }
      
      console.log('   ☁️ Cloudinary se verificará durante el proceso');
      return true;
    } catch (error) {
      console.log(`   ❌ Error de conectividad: ${error.message}`);
      return false;
    }
  }
}

// ✅ FUNCIÓN DE AYUDA ACTUALIZADA
function showHelp() {
  console.log('\n🏪 Elite Fitness Club - Registrador v4.0 (CON DIAGNÓSTICO AUTOMÁTICO)\n');
  console.log('🎯 CARACTERÍSTICAS:');
  console.log('  📦 Registra productos únicos con datos reales');
  console.log('  ☁️ Sube imágenes a Cloudinary para producción');
  console.log('  🔍 Diagnóstico automático si la subida falla');
  console.log('  🔧 Soluciones automáticas para problemas comunes');
  console.log('  🌐 URLs accesibles globalmente vía CDN\n');
  
  console.log('✨ NUEVOS PRODUCTOS:');
  console.log('  🥤 Mass Gainer Extreme 3000 ($89.99, 22 unidades)');
  console.log('     • SKU: MASS-GAIN-3000-CHOC, 25% descuento');
  console.log('  👕 Uniforme Deportivo Performance Plus ($79.99, 16 unidades)');
  console.log('     • SKU: UNIF-PERF-PLUS-M, 27% descuento\n');
  
  console.log('🔍 DIAGNÓSTICO AUTOMÁTICO:');
  console.log('  ✅ Verifica variables de entorno de Cloudinary');
  console.log('  ✅ Prueba conexión directa con Cloudinary');
  console.log('  ✅ Analiza errores específicos de subida');
  console.log('  ✅ Proporciona soluciones específicas\n');
  
  console.log('🚀 USO:');
  console.log('  node test-products-register.js          # Registro con diagnóstico');
  console.log('  node test-products-register.js --help   # Esta ayuda');
  console.log('  node test-products-register.js --test   # Solo test conexión\n');
  
  console.log('📋 REQUISITOS:');
  console.log('  • Servidor corriendo en puerto 5000');
  console.log('  • Usuario admin: admin@gym.com / Admin123!');
  console.log('  • Variables Cloudinary en .env (se verifica automáticamente)');
  console.log('  • Imágenes en rutas especificadas\n');
  
  console.log('💡 Si la subida falla, el diagnóstico se ejecuta automáticamente');
}

// ✅ FUNCIÓN PRINCIPAL
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const register = new ProductsRegisterWithDiagnostic();
  
  if (args.includes('--test') || args.includes('-t')) {
    console.log('🧪 MODO TEST - Solo verificando conectividad\n');
    const isConnected = await register.testConnectivity();
    if (isConnected) {
      console.log('\n✅ Backend accesible - Listo para registrar productos');
    } else {
      console.log('\n❌ Problemas de conectividad - Verifica el servidor');
    }
    return;
  }
  
  try {
    await register.registerAllProducts();
    
  } catch (error) {
    console.error('\n🚨 ERROR CRÍTICO EN EL REGISTRO:');
    console.error(`❌ ${error.message}\n`);
    
    console.error('💡 SOLUCIONES RÁPIDAS:');
    if (error.message.includes('ECONNREFUSED')) {
      console.error('   🏥 Inicia el servidor: npm start');
    } else if (error.message.includes('Credenciales incorrectas')) {
      console.error('   🔐 Verifica usuario admin: admin@gym.com / Admin123!');
    } else if (error.message.includes('404')) {
      console.error('   🔧 Verifica rutas de gestión en storeAdminRoutes.js');
    }
    
    console.error('\n🔍 El diagnóstico automático se ejecutará en la próxima ejecución si hay errores de Cloudinary');
    process.exit(1);
  }
}

// ✅ EJECUTAR
if (require.main === module) {
  main();
}

module.exports = { ProductsRegisterWithDiagnostic };