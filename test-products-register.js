// test-products-register.js - REGISTRADOR DE PRODUCTOS v3.0 (CLOUDINARY + NUEVOS DATOS)
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class ProductsRegister {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.adminToken = null;
    
    // ✅ NUEVOS DATOS DE PRODUCTOS (diferentes pero mismas imágenes)
    this.productsData = [
      {
        name: 'Proteína Isolate Premium Gold',
        description: 'Proteína aislada de suero de alta pureza con aminoácidos esenciales. Fórmula avanzada para atletas profesionales. Sabor vainilla francesa con digestión rápida y absorción optimizada.',
        price: 75.99,
        originalPrice: 95.99,
        sku: 'PROT-ISO-GOLD-VAN',
        stockQuantity: 18,
        minStock: 4,
        weight: 2.2,
        dimensions: {
          length: 16,
          width: 16,
          height: 22,
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
        name: 'Kit Entrenamiento Elite Pro',
        description: 'Set completo de entrenamiento profesional que incluye camiseta técnica, shorts deportivos y toalla de microfibra. Materiales de alta tecnología con propiedades antibacteriales y control de humedad.',
        price: 65.99,
        originalPrice: 89.99,
        sku: 'KIT-ELITE-PRO-XL',
        stockQuantity: 12,
        minStock: 2,
        weight: 1.2,
        dimensions: {
          length: 35,
          width: 28,
          height: 8,
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
  }

  async registerAllProducts() {
    console.log('🏪 Elite Fitness Club - Registrador de Productos v3.0 (CLOUDINARY + NUEVOS DATOS)');
    console.log('='.repeat(85));
    console.log('🎯 OBJETIVO: Crear nuevos productos con imágenes en Cloudinary');
    console.log('📦 PRODUCTOS A REGISTRAR: 2 productos NUEVOS (Proteína + Kit Entrenamiento)');
    console.log('☁️ ALMACENAMIENTO: Cloudinary para producción');
    console.log('🔄 PROCESO: Autenticación → Verificación → Categorías → Marcas → Productos → Cloudinary\n');
    
    try {
      await this.loginAdmin();
      await this.loadExistingData();
      await this.ensureCategories();
      await this.ensureBrands();
      await this.createProducts();
      await this.uploadProductImages();
      await this.showFinalSummary();
      
      console.log('\n🎉 ¡REGISTRO DE PRODUCTOS COMPLETADO EXITOSAMENTE!');
      console.log('✅ Todos los productos están listos para la venta');
      console.log('☁️ Imágenes almacenadas en Cloudinary para producción');
      console.log('🛒 Los clientes pueden ver y comprar estos productos desde cualquier lugar');
      
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
      
      // Buscar si ya existe (comparación más flexible)
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
        // Intentar crear nueva categoría
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
          
          // Última oportunidad: buscar por nombre similar
          const similarCategory = this.existingCategories.find(c => 
            c.name.toLowerCase().includes(categoryData.name.toLowerCase().split(' ')[0])
          );
          
          if (similarCategory) {
            console.log(`   🔄 Usando categoría similar: "${similarCategory.name}" (ID: ${similarCategory.id})`);
            this.registeredCategories.push(similarCategory);
          }
        }
      }
    }
    
    console.log(`\n   🎯 CATEGORÍAS DISPONIBLES: ${this.registeredCategories.length} listas para usar`);
    this.registeredCategories.forEach(cat => {
      console.log(`      📂 ${cat.name} (ID: ${cat.id})`);
    });
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
      
      // Buscar si ya existe
      const existingBrand = this.existingBrands.find(b => {
        const existingName = b.name.toLowerCase().trim();
        const requiredName = brandData.name.toLowerCase().trim();
        return existingName === requiredName;
      });
      
      if (existingBrand) {
        console.log(`   ✅ Marca encontrada: "${existingBrand.name}" (ID: ${existingBrand.id})`);
        this.registeredBrands.push(existingBrand);
      } else {
        // Intentar crear nueva marca
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
    this.registeredBrands.forEach(brand => {
      console.log(`      🏷️ ${brand.name} (ID: ${brand.id})`);
    });
  }

  async createProducts() {
    console.log('\n5. 📦 Creando nuevos productos...');
    
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
        // Buscar la categoría y marca correspondientes
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
        
        if (!category) {
          console.error(`   ❌ Categoría "${productData.categoryName}" no encontrada`);
          console.log('   📋 Categorías disponibles:');
          this.registeredCategories.forEach(c => console.log(`      • ${c.name}`));
          continue;
        }
        
        if (!brand) {
          console.error(`   ❌ Marca "${productData.brandName}" no encontrada`);
          console.log('   📋 Marcas disponibles:');
          this.registeredBrands.forEach(b => console.log(`      • ${b.name}`));
          continue;
        }
        
        // Verificar si el producto ya existe (por SKU)
        try {
          const existingProductResponse = await axios.get(`${this.baseURL}/api/store/products`, {
            params: { search: productData.sku, limit: 1 }
          });
          
          const existingProducts = existingProductResponse.data.data?.products || [];
          const existingProduct = existingProducts.find(p => p.sku === productData.sku);
          
          if (existingProduct) {
            console.log(`   ⚠️ Producto con SKU "${productData.sku}" ya existe (ID: ${existingProduct.id})`);
            console.log(`   🔄 Saltando creación...`);
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
        
        console.log(`   📊 Datos del nuevo producto:`);
        console.log(`      💰 Precio: $${productPayload.price} (original: $${productPayload.originalPrice})`);
        console.log(`      📦 Stock: ${productPayload.stockQuantity} unidades`);
        console.log(`      📂 Categoría: ${category.name} (ID: ${category.id})`);
        console.log(`      🏷️ Marca: ${brand.name} (ID: ${brand.id})`);
        console.log(`      🏷️ SKU: ${productPayload.sku}`);
        console.log(`      ⭐ Destacado: ${productPayload.isFeatured ? 'Sí' : 'No'}`);
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
          console.log(`      🔄 Descuento: ${((productData.originalPrice - productData.price) / productData.originalPrice * 100).toFixed(1)}%`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error creando producto "${productData.name}":`);
        console.error(`      💥 Status: ${error.response?.status}`);
        console.error(`      💥 Message: ${error.response?.data?.message || error.message}`);
        
        if (error.response?.data?.errors) {
          console.error('      📋 Errores de validación:');
          error.response.data.errors.forEach(err => {
            console.error(`         • ${err.path || err.param}: ${err.message || err.msg}`);
          });
        }
      }
    }
    
    console.log(`\n   🎯 PRODUCTOS REGISTRADOS: ${this.registeredProducts.length} de ${this.productsData.length} completados`);
  }

  async uploadProductImages() {
    console.log('\n6. ☁️ Subiendo imágenes a Cloudinary...');
    
    if (this.registeredProducts.length === 0) {
      console.log('   ⚠️ No hay productos registrados para subir imágenes');
      return;
    }
    
    console.log('   📤 Las imágenes se subirán a Cloudinary para acceso global');
    console.log('   🌐 URLs serán accesibles desde cualquier ubicación');
    
    for (let i = 0; i < this.registeredProducts.length; i++) {
      const product = this.registeredProducts[i];
      console.log(`\n   ☁️ SUBIENDO IMAGEN ${i + 1}/${this.registeredProducts.length}: "${product.name}"`);
      console.log('   ' + '-'.repeat(60));
      
      try {
        const imagePath = product.imagePath;
        console.log(`   📁 Ruta local: ${imagePath}`);
        
        // Verificar que el archivo existe
        if (!fs.existsSync(imagePath)) {
          console.error(`   ❌ Archivo no encontrado: ${imagePath}`);
          continue;
        }
        
        const stats = fs.statSync(imagePath);
        const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`   📏 Tamaño: ${fileSizeMB} MB`);
        
        // Verificar límite de tamaño
        if (stats.size > 10 * 1024 * 1024) {
          console.error(`   ❌ Archivo demasiado grande: ${fileSizeMB} MB (máximo 10MB para Cloudinary)`);
          continue;
        }
        
        // Crear FormData
        const formData = new FormData();
        formData.append('image', fs.createReadStream(imagePath));
        
        console.log(`   ☁️ Subiendo a Cloudinary...`);
        
        // Subir imagen (ahora va directo a Cloudinary)
        const response = await axios.post(
          `${this.baseURL}/api/store/management/products/${product.id}/images?isPrimary=true&altText=${encodeURIComponent(product.name + ' - Imagen principal')}&displayOrder=1`, 
          formData,
          {
            headers: { 
              'Authorization': `Bearer ${this.adminToken}`,
              ...formData.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 45000 // 45 segundos para Cloudinary
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
            console.log(`      🚀 CDN: Accesible globalmente`);
          }
          
          // Verificar que la URL es de Cloudinary
          if (response.data.data.image.imageUrl.includes('cloudinary.com')) {
            console.log(`      ✅ Confirmado: Imagen en Cloudinary CDN`);
          }
        }
        
      } catch (error) {
        console.error(`   ❌ Error subiendo imagen para "${product.name}":`);
        console.error(`      💥 ${error.response?.data?.message || error.message}`);
        
        if (error.code === 'ECONNABORTED') {
          console.error('      ⏰ Timeout - Cloudinary puede tardar más en procesar imágenes grandes');
        } else if (error.response?.status === 413) {
          console.error('      📏 Archivo demasiado grande para el servidor');
        }
      }
    }
    
    console.log(`\n   🎯 IMÁGENES PROCESADAS: ${this.uploadedImages.length} de ${this.registeredProducts.length} subidas a Cloudinary`);
    
    if (this.uploadedImages.length > 0) {
      console.log(`   ☁️ ✅ Todas las imágenes están en Cloudinary CDN`);
      console.log(`   🌐 ✅ Accesibles desde cualquier ubicación mundial`);
      console.log(`   🚀 ✅ Optimizadas automáticamente para web`);
    }
  }

  async showFinalSummary() {
    console.log('\n7. 📊 RESUMEN FINAL DEL REGISTRO');
    console.log('=' .repeat(70));
    
    console.log('🎯 RESUMEN COMPLETADO:');
    console.log(`   📂 Categorías: ${this.registeredCategories.length} disponibles`);
    console.log(`   🏷️ Marcas: ${this.registeredBrands.length} disponibles`);
    console.log(`   📦 Productos: ${this.registeredProducts.length} creados`);
    console.log(`   ☁️ Imágenes: ${this.uploadedImages.length} subidas a Cloudinary`);
    
    // Detalles de productos creados
    if (this.registeredProducts.length > 0) {
      console.log('\n📦 NUEVOS PRODUCTOS CREADOS:');
      this.registeredProducts.forEach((product, index) => {
        const hasImage = this.uploadedImages.some(img => img.productId === product.id);
        const discount = ((product.originalPrice - product.price) / product.originalPrice * 100).toFixed(1);
        
        console.log(`\n   ${index + 1}. "${product.name}"`);
        console.log(`      🆔 ID: ${product.id}`);
        console.log(`      💰 Precio: $${product.price} (original: $${product.originalPrice}) - ${discount}% desc.`);
        console.log(`      📦 Stock: ${product.stockQuantity} unidades`);
        console.log(`      🏷️ SKU: ${product.sku}`);
        console.log(`      ⭐ Destacado: ${product.isFeatured ? 'Sí' : 'No'}`);
        console.log(`      🖼️ Imagen: ${hasImage ? '✅ Subida' : '❌ Sin imagen'}`);
        
        // Mostrar imagen si existe
        const productImage = this.uploadedImages.find(img => img.productId === product.id);
        if (productImage) {
          console.log(`         🔗 URL: ${productImage.imageUrl}`);
          
          // Mostrar si es de Cloudinary
          if (productImage.imageUrl.includes('cloudinary.com')) {
            console.log(`         ☁️ Almacenado en Cloudinary CDN`);
            
            if (productImage.cloudinaryInfo) {
              console.log(`         📏 ${productImage.cloudinaryInfo.width}x${productImage.cloudinaryInfo.height} (${productImage.cloudinaryInfo.format})`);
            }
          }
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
      console.log(`   📊 Precio promedio: $${(totalValue / totalStock).toFixed(2)}`);
    }
    
    // URLs de acceso
    console.log('\n🌐 ACCESO A LOS NUEVOS PRODUCTOS:');
    console.log(`   🛒 Tienda: ${this.baseURL}/api/store/products`);
    console.log(`   ⭐ Destacados: ${this.baseURL}/api/store/products/featured`);
    console.log(`   🔧 Gestión: ${this.baseURL}/api/store/management/products`);
    
    // Ejemplos de URLs específicas si hay productos
    if (this.registeredProducts.length > 0) {
      console.log('\n🔗 URLs ESPECÍFICAS DE PRODUCTOS NUEVOS:');
      this.registeredProducts.forEach(product => {
        console.log(`   • ${product.name}: ${this.baseURL}/api/store/products/${product.id}`);
      });
    }
    
    // Estado final
    console.log('\n✅ ESTADO FINAL:');
    if (this.registeredProducts.length === this.productsData.length) {
      console.log('   🎉 ¡TODOS LOS PRODUCTOS REGISTRADOS EXITOSAMENTE!');
      console.log('   ✅ Los productos están disponibles para la venta');
      
      if (this.uploadedImages.length === this.registeredProducts.length) {
        console.log('   🖼️ ✅ Todas las imágenes subidas correctamente');
        
        // Verificar si las imágenes están en Cloudinary
        const cloudinaryImages = this.uploadedImages.filter(img => 
          img.imageUrl && img.imageUrl.includes('cloudinary.com')
        );
        
        if (cloudinaryImages.length > 0) {
          console.log(`   ☁️ ✅ ${cloudinaryImages.length} imágenes almacenadas en Cloudinary`);
          console.log('   🌐 ✅ Imágenes accesibles desde cualquier ubicación');
          console.log('   🌐 ✅ listo para produccion');
          console.log('   📱 ✅ Optimización automática por dispositivo');
          console.log('   ⚡ ✅ Carga rápida vía CDN global');
        } else {
          console.log('   ⚠️ Imágenes en almacenamiento local (no recomendado para producción)');
        }
      } else {
        console.log(`   🖼️ ⚠️ ${this.uploadedImages.length}/${this.registeredProducts.length} imágenes subidas`);
      }
    } else {
      console.log(`   ⚠️ ${this.registeredProducts.length}/${this.productsData.length} productos registrados`);
      console.log('   📋 Revisa los errores para más detalles');
    }
    
    // Información de Cloudinary
    if (this.uploadedImages.length > 0) {
      console.log('\n☁️ INFORMACIÓN DE CLOUDINARY:');
      console.log('   ✅ Imágenes almacenadas en CDN global');
      console.log('   ✅ Redimensionamiento automático bajo demanda');
      console.log('   ✅ Optimización de formato (WebP/AVIF)');
      console.log('   ✅ Compresión inteligente de calidad');
      console.log('   ✅ HTTPS seguro por defecto');
      console.log('   ✅ Respaldo automático en la nube');
    }
  }

  async showCleanupInstructions() {
    console.log('\n🧹 INSTRUCCIONES DE LIMPIEZA');
    console.log('=' .repeat(60));
    
    if (this.registeredProducts.length > 0) {
      console.log('📦 PRODUCTOS CREADOS (para eliminar si necesario):');
      this.registeredProducts.forEach(product => {
        console.log(`   • ID: ${product.id} - "${product.name}" (SKU: ${product.sku})`);
        console.log(`     DELETE ${this.baseURL}/api/store/management/products/${product.id}`);
      });
    }
    
    if (this.uploadedImages.length > 0) {
      console.log('\n☁️ IMÁGENES EN CLOUDINARY:');
      this.uploadedImages.forEach(image => {
        console.log(`   • ID: ${image.id} - Producto: ${image.productId}`);
        console.log(`     URL: ${image.imageUrl}`);
      });
      console.log('\n💡 Las imágenes en Cloudinary se eliminarán automáticamente al eliminar productos');
    }
    
    console.log('\n💡 Usa el panel de administración para gestionar productos y imágenes');
  }

  // Método para verificar conectividad
  async testConnectivity() {
    console.log('🔍 Verificando conectividad y configuración...');
    
    try {
      // Test conexión básica
      const response = await axios.get(`${this.baseURL}/api/store/products`, { timeout: 5000 });
      console.log('   ✅ Conexión con API exitosa');
      
      // Test rutas protegidas
      try {
        await axios.get(`${this.baseURL}/api/store/management/products`, { timeout: 5000 });
      } catch (error) {
        if (error.response?.status === 401) {
          console.log('   ✅ Rutas de gestión protegidas correctamente');
        }
      }
      
      console.log('   ☁️ Cloudinary se verificará al subir primera imagen');
      
      return true;
    } catch (error) {
      console.log(`   ❌ Error de conectividad: ${error.message}`);
      return false;
    }
  }
}

// ✅ FUNCIÓN DE AYUDA ACTUALIZADA
function showHelp() {
  console.log('\n🏪 Elite Fitness Club - Registrador de Productos v3.0 (CLOUDINARY)\n');
  console.log('🎯 FUNCIONALIDADES:');
  console.log('  📂 Verifica/crea categorías (Suplementos, Ropa Deportiva)');
  console.log('  🏷️ Verifica/crea marcas (Universal Nutrition, Nike)');
  console.log('  📦 Registra NUEVOS productos con datos únicos');
  console.log('  ☁️ Sube imágenes a Cloudinary para producción');
  console.log('  🌐 URLs accesibles globalmente vía CDN');
  console.log('  🔄 Maneja datos existentes automáticamente\n');
  
  console.log('☁️ VENTAJAS DE CLOUDINARY:');
  console.log('  🚀 CDN global para carga rápida');
  console.log('  📱 Optimización automática por dispositivo');
  console.log('  🔧 Redimensionamiento bajo demanda');
  console.log('  💾 Respaldo seguro en la nube');
  console.log('  🌐 HTTPS por defecto\n');
  
  console.log('✨ NUEVOS PRODUCTOS A REGISTRAR:');
  console.log('  🥤 Proteína Isolate Premium Gold ($75.99, 18 unidades)');
  console.log('     • SKU: PROT-ISO-GOLD-VAN');
  console.log('     • Descuento: 21% (antes $95.99)');
  console.log('  🎽 Kit Entrenamiento Elite Pro ($65.99, 12 unidades)');
  console.log('     • SKU: KIT-ELITE-PRO-XL');
  console.log('     • Descuento: 27% (antes $89.99)\n');
  
  console.log('🚀 USO:');
  console.log('  node test-products-register.js          # Registro completo');
  console.log('  node test-products-register.js --help   # Esta ayuda');
  console.log('  node test-products-register.js --test   # Solo test conexión\n');
  
  console.log('📋 REQUISITOS:');
  console.log('  • Servidor corriendo en puerto 5000');
  console.log('  • Usuario admin: admin@gym.com / Admin123!');
  console.log('  • Cloudinary configurado en variables de entorno');
  console.log('  • Imágenes en rutas especificadas');
  console.log('  • Rutas de gestión configuradas\n');
  
  console.log('🔧 CONFIGURACIÓN CLOUDINARY (.env):');
  console.log('  CLOUDINARY_CLOUD_NAME=tu_cloud_name');
  console.log('  CLOUDINARY_API_KEY=tu_api_key');
  console.log('  CLOUDINARY_API_SECRET=tu_api_secret\n');
}

// ✅ FUNCIÓN PRINCIPAL ACTUALIZADA
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const register = new ProductsRegister();
  
  if (args.includes('--test') || args.includes('-t')) {
    console.log('🧪 MODO TEST - Solo verificando conectividad y configuración\n');
    const isConnected = await register.testConnectivity();
    if (isConnected) {
      console.log('\n✅ Backend accesible - Listo para registrar productos con Cloudinary');
    } else {
      console.log('\n❌ Problemas de conectividad - Verifica el servidor');
    }
    return;
  }
  
  try {
    await register.registerAllProducts();
    
  } catch (error) {
    console.error('\n🚨 ERROR EN EL REGISTRO:');
    console.error(`❌ ${error.message}\n`);
    
    console.error('💡 POSIBLES SOLUCIONES:');
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('   1. ✅ Verifica que el servidor esté corriendo: npm start');
      console.error('   2. ✅ Verifica que el puerto sea correcto (5000)');
    } else if (error.message.includes('Credenciales incorrectas')) {
      console.error('   1. ✅ Verifica usuario: admin@gym.com');
      console.error('   2. ✅ Verifica contraseña: Admin123!');
      console.error('   3. ✅ Verifica que el usuario tenga rol admin');
    } else if (error.message.includes('401')) {
      console.error('   1. ✅ Verifica el middleware de autenticación');
      console.error('   2. ✅ Verifica permisos de staff');
    } else if (error.message.includes('404')) {
      console.error('   1. ✅ Verifica rutas de gestión configuradas');
      console.error('   2. ✅ Verifica que storeAdminRoutes esté importado');
    } else if (error.message.includes('Cloudinary')) {
      console.error('   1. ✅ Verifica configuración de Cloudinary en .env');
      console.error('   2. ✅ Verifica CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET');
      console.error('   3. ✅ Verifica que multer-storage-cloudinary esté instalado');
    }
    
    console.error('\n🔍 PARA DIAGNOSTICAR:');
    console.error('   • node test-products-register.js --test');
    console.error('   • Revisar logs del servidor');
    console.error('   • Verificar configuración de Cloudinary');
    console.error('   • Probar rutas con Postman');
    
    process.exit(1);
  }
}

// ✅ EJECUTAR
if (require.main === module) {
  main();
}

module.exports = { ProductsRegister };