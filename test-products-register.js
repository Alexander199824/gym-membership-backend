// test-products-register.js - REGISTRADOR COMPLETO DE PRODUCTOS v1.0 (DESDE CERO)
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class ProductsRegister {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.adminToken = null;
    
    // Datos de productos a registrar
    this.productsData = [
      {
        name: 'Nitro Tech Whey Protein',
        description: 'Proteína de suero de leche premium con tecnología de aislamiento avanzada. Ideal para el desarrollo muscular y recuperación post-entrenamiento. Sabor chocolate.',
        price: 89.99,
        comparePrice: 109.99,
        sku: 'NT-WHEY-CHOC-2LB',
        stockQuantity: 25,
        minStock: 5,
        weight: 2.0,
        dimensions: '15x15x20',
        isFeatured: true,
        isActive: true,
        tags: ['proteína', 'suplemento', 'músculo', 'recuperación'],
        variants: {
          sabor: ['Chocolate', 'Vainilla', 'Fresa'],
          tamaño: ['2 lbs', '4 lbs', '8 lbs']
        },
        nutritionalInfo: {
          porcion: '30g',
          proteina: '24g',
          carbohidratos: '3g',
          grasas: '1g',
          calorias: '120'
        },
        categoryName: 'Suplementos',
        brandName: 'Universal Nutrition',
        imagePath: 'C:\\Users\\echev\\OneDrive\\Escritorio\\productos de prueba\\suplementos-universalfitness.png'
      },
      {
        name: 'Conjunto Deportivo Hombre Premium',
        description: 'Conjunto deportivo de alta calidad para hombre, incluye camiseta y pantalón. Material transpirable y de secado rápido. Perfecto para entrenamientos intensos y uso casual.',
        price: 45.99,
        comparePrice: 65.99,
        sku: 'CD-HOMBRE-PREM-L',
        stockQuantity: 15,
        minStock: 3,
        weight: 0.8,
        dimensions: '30x25x5',
        isFeatured: true,
        isActive: true,
        tags: ['ropa', 'conjunto', 'deportivo', 'hombre', 'entrenamiento'],
        variants: {
          talla: ['S', 'M', 'L', 'XL', 'XXL'],
          color: ['Negro', 'Gris', 'Azul Marino']
        },
        materialInfo: {
          composicion: '90% Poliéster, 10% Elastano',
          cuidado: 'Lavar en máquina máx 30°C',
          origen: 'China'
        },
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
  }

  async registerAllProducts() {
    console.log('🏪 REGISTRADOR COMPLETO DE PRODUCTOS - DESDE CERO v1.0');
    console.log('='.repeat(80));
    console.log('🎯 OBJETIVO: Crear productos completos con categorías, marcas e imágenes');
    console.log('📦 PRODUCTOS A REGISTRAR: 2 productos (Suplemento + Ropa deportiva)');
    console.log('🔄 PROCESO COMPLETO: Categorías → Marcas → Productos → Imágenes\n');
    
    try {
      await this.loginAdmin();
      await this.showExistingData();
      await this.createCategories();
      await this.createBrands();
      await this.createProducts();
      await this.uploadProductImages();
      await this.showFinalSummary();
      
      console.log('\n🎉 ¡REGISTRO DE PRODUCTOS COMPLETADO EXITOSAMENTE!');
      console.log('✅ Todos los productos están listos para la venta');
      console.log('🛒 Los clientes ya pueden ver y comprar estos productos');
      
    } catch (error) {
      console.error('\n❌ Error en el registro:', error.message);
      if (error.response) {
        console.error('📋 Detalles del error:', error.response.data);
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
      }
    } catch (error) {
      throw new Error(`Autenticación falló: ${error.message}`);
    }
  }

  async showExistingData() {
    console.log('\n2. 📊 Verificando datos existentes en la tienda...');
    
    try {
      // Obtener categorías existentes
      const categoriesResponse = await axios.get(`${this.baseURL}/api/store/categories`);
      const existingCategories = categoriesResponse.data.success ? categoriesResponse.data.data.categories : [];
      
      // Obtener marcas existentes
      const brandsResponse = await axios.get(`${this.baseURL}/api/store/brands`);
      const existingBrands = brandsResponse.data.success ? brandsResponse.data.data.brands : [];
      
      // Obtener productos existentes
      const productsResponse = await axios.get(`${this.baseURL}/api/store/products`, {
        params: { limit: 100 }
      });
      const existingProducts = productsResponse.data.success ? productsResponse.data.data.products : [];
      
      console.log('   📊 DATOS ACTUALES DE LA TIENDA:');
      console.log(`   📂 Categorías: ${existingCategories.length} registradas`);
      console.log(`   🏷️  Marcas: ${existingBrands.length} registradas`);
      console.log(`   📦 Productos: ${existingProducts.length} registrados`);
      
      if (existingCategories.length > 0) {
        console.log(`   📂 Categorías existentes: ${existingCategories.map(c => c.name).join(', ')}`);
      }
      
      if (existingBrands.length > 0) {
        console.log(`   🏷️  Marcas existentes: ${existingBrands.map(b => b.name).join(', ')}`);
      }
      
      console.log('   ✅ Verificación completada');
      
    } catch (error) {
      console.log('   ⚠️ No se pudieron obtener datos existentes, continuando...');
    }
  }

  async createCategories() {
    console.log('\n3. 📂 Creando/Verificando categorías necesarias...');
    
    const categoriesToCreate = [
      {
        name: 'Suplementos',
        description: 'Suplementos deportivos, proteínas, vitaminas y nutrición deportiva',
        slug: 'suplementos',
        isActive: true,
        displayOrder: 1,
        metaTitle: 'Suplementos Deportivos - Elite Fitness Club',
        metaDescription: 'Los mejores suplementos deportivos para tu entrenamiento'
      },
      {
        name: 'Ropa Deportiva',
        description: 'Ropa y vestimenta para entrenamientos, casual wear deportivo',
        slug: 'ropa-deportiva',
        isActive: true,
        displayOrder: 2,
        metaTitle: 'Ropa Deportiva - Elite Fitness Club',
        metaDescription: 'Ropa deportiva de calidad para hombres y mujeres'
      }
    ];

    for (const categoryData of categoriesToCreate) {
      try {
        console.log(`\n   📂 Creando categoría: "${categoryData.name}"`);
        
        const response = await axios.post(`${this.baseURL}/api/admin/store/categories`, categoryData, {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        });
        
        if (response.data.success) {
          this.registeredCategories.push(response.data.data.category);
          console.log(`   ✅ Categoría "${categoryData.name}" creada exitosamente`);
          console.log(`   🆔 ID: ${response.data.data.category.id}`);
          console.log(`   🔗 Slug: ${response.data.data.category.slug}`);
        }
        
      } catch (error) {
        if (error.response?.status === 400 && error.response.data.message?.includes('ya existe')) {
          console.log(`   ⚠️ Categoría "${categoryData.name}" ya existe, obteniendo datos...`);
          
          try {
            const existingResponse = await axios.get(`${this.baseURL}/api/store/categories`);
            const existingCategory = existingResponse.data.data.categories.find(c => c.name === categoryData.name);
            if (existingCategory) {
              this.registeredCategories.push(existingCategory);
              console.log(`   ✅ Usando categoría existente: ${existingCategory.id}`);
            }
          } catch (getError) {
            console.log(`   ❌ No se pudo obtener la categoría existente`);
          }
        } else {
          console.error(`   ❌ Error creando categoría "${categoryData.name}": ${error.response?.data?.message || error.message}`);
        }
      }
    }
    
    console.log(`\n   🎯 CATEGORÍAS DISPONIBLES: ${this.registeredCategories.length} listas para usar`);
  }

  async createBrands() {
    console.log('\n4. 🏷️ Creando/Verificando marcas necesarias...');
    
    const brandsToCreate = [
      {
        name: 'Universal Nutrition',
        description: 'Líder mundial en suplementos deportivos y nutrición',
        website: 'https://www.universalnutrition.com',
        country: 'USA',
        isActive: true,
        displayOrder: 1
      },
      {
        name: 'Nike',
        description: 'Marca líder mundial en ropa y calzado deportivo',
        website: 'https://www.nike.com',
        country: 'USA',
        isActive: true,
        displayOrder: 2
      }
    ];

    for (const brandData of brandsToCreate) {
      try {
        console.log(`\n   🏷️ Creando marca: "${brandData.name}"`);
        
        const response = await axios.post(`${this.baseURL}/api/admin/store/brands`, brandData, {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        });
        
        if (response.data.success) {
          this.registeredBrands.push(response.data.data.brand);
          console.log(`   ✅ Marca "${brandData.name}" creada exitosamente`);
          console.log(`   🆔 ID: ${response.data.data.brand.id}`);
          console.log(`   🌐 Website: ${response.data.data.brand.website}`);
        }
        
      } catch (error) {
        if (error.response?.status === 400 && error.response.data.message?.includes('ya existe')) {
          console.log(`   ⚠️ Marca "${brandData.name}" ya existe, obteniendo datos...`);
          
          try {
            const existingResponse = await axios.get(`${this.baseURL}/api/store/brands`);
            const existingBrand = existingResponse.data.data.brands.find(b => b.name === brandData.name);
            if (existingBrand) {
              this.registeredBrands.push(existingBrand);
              console.log(`   ✅ Usando marca existente: ${existingBrand.id}`);
            }
          } catch (getError) {
            console.log(`   ❌ No se pudo obtener la marca existente`);
          }
        } else {
          console.error(`   ❌ Error creando marca "${brandData.name}": ${error.response?.data?.message || error.message}`);
        }
      }
    }
    
    console.log(`\n   🎯 MARCAS DISPONIBLES: ${this.registeredBrands.length} listas para usar`);
  }

  async createProducts() {
    console.log('\n5. 📦 Creando productos completos...');
    
    for (let i = 0; i < this.productsData.length; i++) {
      const productData = this.productsData[i];
      console.log(`\n   📦 CREANDO PRODUCTO ${i + 1}/${this.productsData.length}: "${productData.name}"`);
      console.log('   ' + '-'.repeat(60));
      
      try {
        // Buscar la categoría y marca correspondientes
        const category = this.registeredCategories.find(c => c.name === productData.categoryName);
        const brand = this.registeredBrands.find(b => b.name === productData.brandName);
        
        if (!category) {
          throw new Error(`Categoría "${productData.categoryName}" no encontrada`);
        }
        
        if (!brand) {
          throw new Error(`Marca "${productData.brandName}" no encontrada`);
        }
        
        // Preparar datos del producto
        const productPayload = {
          name: productData.name,
          description: productData.description,
          price: productData.price,
          comparePrice: productData.comparePrice,
          sku: productData.sku,
          stockQuantity: productData.stockQuantity,
          minStock: productData.minStock,
          weight: productData.weight,
          dimensions: productData.dimensions,
          categoryId: category.id,
          brandId: brand.id,
          isFeatured: productData.isFeatured,
          isActive: productData.isActive,
          tags: productData.tags,
          variants: productData.variants,
          nutritionalInfo: productData.nutritionalInfo,
          materialInfo: productData.materialInfo
        };
        
        console.log(`   📊 Datos del producto preparados:`);
        console.log(`      💰 Precio: $${productPayload.price} (compare: $${productPayload.comparePrice})`);
        console.log(`      📦 Stock: ${productPayload.stockQuantity} unidades`);
        console.log(`      📂 Categoría: ${category.name} (ID: ${category.id})`);
        console.log(`      🏷️ Marca: ${brand.name} (ID: ${brand.id})`);
        console.log(`      🏷️ SKU: ${productPayload.sku}`);
        console.log(`      ⭐ Destacado: ${productPayload.isFeatured ? 'Sí' : 'No'}`);
        
        // Crear el producto
        const response = await axios.post(`${this.baseURL}/api/admin/store/products`, productPayload, {
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
          console.log(`      🆔 ID del producto: ${response.data.data.product.id}`);
          console.log(`      📦 Nombre: ${response.data.data.product.name}`);
          console.log(`      💰 Precio: $${response.data.data.product.price}`);
          console.log(`      📊 Stock inicial: ${response.data.data.product.stockQuantity}`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error creando producto "${productData.name}":`);
        console.error(`      💥 ${error.response?.data?.message || error.message}`);
        
        if (error.response?.data?.errors) {
          console.error('      📋 Errores de validación:');
          Object.entries(error.response.data.errors).forEach(([field, message]) => {
            console.error(`         • ${field}: ${message}`);
          });
        }
      }
    }
    
    console.log(`\n   🎯 PRODUCTOS REGISTRADOS: ${this.registeredProducts.length} de ${this.productsData.length} completados`);
  }

  async uploadProductImages() {
    console.log('\n6. 🖼️ Subiendo imágenes de productos...');
    
    if (this.registeredProducts.length === 0) {
      console.log('   ⚠️ No hay productos registrados para subir imágenes');
      return;
    }
    
    for (let i = 0; i < this.registeredProducts.length; i++) {
      const product = this.registeredProducts[i];
      console.log(`\n   🖼️ SUBIENDO IMAGEN ${i + 1}/${this.registeredProducts.length}: "${product.name}"`);
      console.log('   ' + '-'.repeat(50));
      
      try {
        const imagePath = product.imagePath;
        console.log(`   📁 Ruta de imagen: ${imagePath}`);
        
        // Verificar que el archivo existe
        if (!fs.existsSync(imagePath)) {
          throw new Error(`Archivo de imagen no encontrado: ${imagePath}`);
        }
        
        const stats = fs.statSync(imagePath);
        console.log(`   📏 Tamaño del archivo: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        
        // Crear FormData para subir la imagen
        const formData = new FormData();
        formData.append('image', fs.createReadStream(imagePath));
        formData.append('productId', product.id);
        formData.append('isPrimary', 'true');
        formData.append('displayOrder', '1');
        formData.append('altText', `${product.name} - Imagen principal`);
        
        console.log(`   📤 Subiendo imagen para producto ID: ${product.id}...`);
        
        const response = await axios.post(
          `${this.baseURL}/api/admin/store/products/${product.id}/images`, 
          formData,
          {
            headers: { 
              'Authorization': `Bearer ${this.adminToken}`,
              ...formData.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
          }
        );
        
        if (response.data.success) {
          this.uploadedImages.push(response.data.data.image);
          console.log(`   ✅ IMAGEN SUBIDA EXITOSAMENTE`);
          console.log(`      🆔 ID de imagen: ${response.data.data.image.id}`);
          console.log(`      🔗 URL: ${response.data.data.image.imageUrl}`);
          console.log(`      ⭐ Imagen principal: ${response.data.data.image.isPrimary ? 'Sí' : 'No'}`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error subiendo imagen para "${product.name}":`);
        console.error(`      💥 ${error.response?.data?.message || error.message}`);
        
        if (error.code === 'ENOENT') {
          console.error('      📁 Verifica que la ruta del archivo sea correcta');
        } else if (error.response?.status === 413) {
          console.error('      📏 El archivo es demasiado grande');
        }
      }
    }
    
    console.log(`\n   🎯 IMÁGENES SUBIDAS: ${this.uploadedImages.length} de ${this.registeredProducts.length} completadas`);
  }

  async showFinalSummary() {
    console.log('\n7. 📊 RESUMEN FINAL DEL REGISTRO');
    console.log('=' .repeat(60));
    
    // Resumen general
    console.log('🎯 RESUMEN DE REGISTRO COMPLETADO:');
    console.log(`   📂 Categorías: ${this.registeredCategories.length} preparadas`);
    console.log(`   🏷️ Marcas: ${this.registeredBrands.length} preparadas`);
    console.log(`   📦 Productos: ${this.registeredProducts.length} creados`);
    console.log(`   🖼️ Imágenes: ${this.uploadedImages.length} subidas`);
    
    // Detalles de categorías
    if (this.registeredCategories.length > 0) {
      console.log('\n📂 CATEGORÍAS REGISTRADAS:');
      this.registeredCategories.forEach((category, index) => {
        console.log(`   ${index + 1}. ${category.name} (ID: ${category.id})`);
        console.log(`      🔗 Slug: ${category.slug}`);
      });
    }
    
    // Detalles de marcas
    if (this.registeredBrands.length > 0) {
      console.log('\n🏷️ MARCAS REGISTRADAS:');
      this.registeredBrands.forEach((brand, index) => {
        console.log(`   ${index + 1}. ${brand.name} (ID: ${brand.id})`);
        if (brand.website) {
          console.log(`      🌐 Website: ${brand.website}`);
        }
      });
    }
    
    // Detalles de productos
    if (this.registeredProducts.length > 0) {
      console.log('\n📦 PRODUCTOS REGISTRADOS:');
      this.registeredProducts.forEach((product, index) => {
        const hasImage = this.uploadedImages.some(img => img.productId === product.id);
        
        console.log(`\n   ${index + 1}. "${product.name}"`);
        console.log(`      🆔 ID: ${product.id}`);
        console.log(`      💰 Precio: $${product.price} ${product.comparePrice ? `(antes: $${product.comparePrice})` : ''}`);
        console.log(`      📦 Stock: ${product.stockQuantity} unidades`);
        console.log(`      🏷️ SKU: ${product.sku}`);
        console.log(`      ⭐ Destacado: ${product.isFeatured ? 'Sí' : 'No'}`);
        console.log(`      🖼️ Imagen: ${hasImage ? '✅ Subida' : '❌ Sin imagen'}`);
        
        // Mostrar imagen si existe
        const productImage = this.uploadedImages.find(img => img.productId === product.id);
        if (productImage) {
          console.log(`         🔗 URL: ${productImage.imageUrl}`);
        }
      });
    }
    
    // Cálculos financieros
    if (this.registeredProducts.length > 0) {
      const totalValue = this.registeredProducts.reduce((sum, product) => 
        sum + (parseFloat(product.price) * product.stockQuantity), 0
      );
      const totalStock = this.registeredProducts.reduce((sum, product) => 
        sum + product.stockQuantity, 0
      );
      
      console.log('\n💰 VALOR TOTAL DEL INVENTARIO REGISTRADO:');
      console.log(`   📦 Total de unidades: ${totalStock}`);
      console.log(`   💰 Valor total: $${totalValue.toFixed(2)}`);
      console.log(`   📊 Precio promedio: $${(totalValue / totalStock).toFixed(2)} por unidad`);
    }
    
    // URLs de acceso
    console.log('\n🌐 ACCESO A LOS PRODUCTOS:');
    console.log(`   🛒 Tienda: ${this.baseURL}/store`);
    console.log(`   📱 API Productos: ${this.baseURL}/api/store/products`);
    console.log(`   ⭐ Destacados: ${this.baseURL}/api/store/products/featured`);
    
    // Estado final
    console.log('\n✅ ESTADO FINAL:');
    if (this.registeredProducts.length === this.productsData.length) {
      console.log('   🎉 ¡TODOS LOS PRODUCTOS REGISTRADOS EXITOSAMENTE!');
      console.log('   ✅ Los productos ya están disponibles para la venta');
      console.log('   🛒 Los clientes pueden ver y comprar estos productos');
      
      if (this.uploadedImages.length === this.registeredProducts.length) {
        console.log('   🖼️ ✅ Todas las imágenes subidas correctamente');
      } else {
        console.log('   🖼️ ⚠️ Algunas imágenes no se subieron');
      }
    } else {
      console.log('   ⚠️ No todos los productos se registraron correctamente');
      console.log('   📋 Revisa los errores anteriores para más detalles');
    }
  }

  async showCleanupInstructions() {
    console.log('\n🧹 INSTRUCCIONES DE LIMPIEZA (EN CASO DE ERROR)');
    console.log('=' .repeat(60));
    
    if (this.registeredProducts.length > 0) {
      console.log('📦 PRODUCTOS CREADOS (para eliminar si es necesario):');
      this.registeredProducts.forEach(product => {
        console.log(`   • ID: ${product.id} - "${product.name}"`);
      });
    }
    
    if (this.registeredCategories.length > 0) {
      console.log('\n📂 CATEGORÍAS CREADAS:');
      this.registeredCategories.forEach(category => {
        console.log(`   • ID: ${category.id} - "${category.name}"`);
      });
    }
    
    if (this.registeredBrands.length > 0) {
      console.log('\n🏷️ MARCAS CREADAS:');
      this.registeredBrands.forEach(brand => {
        console.log(`   • ID: ${brand.id} - "${brand.name}"`);
      });
    }
    
    console.log('\n💡 Para limpiar datos de prueba:');
    console.log('   1. Elimina productos desde el panel de admin');
    console.log('   2. Elimina categorías no utilizadas');
    console.log('   3. Elimina marcas no utilizadas');
  }
}

// ✅ FUNCIÓN DE AYUDA
function showHelp() {
  console.log('\n🏪 Elite Fitness Club - Registrador de Productos v1.0\n');
  console.log('🎯 REGISTRO COMPLETO DE PRODUCTOS:');
  console.log('  📂 Crea categorías necesarias (Suplementos, Ropa Deportiva)');
  console.log('  🏷️ Crea marcas necesarias (Universal Nutrition, Nike)');
  console.log('  📦 Registra productos completos con todos sus datos');
  console.log('  🖼️ Sube imágenes reales de los productos');
  console.log('  📊 Genera inventario listo para la venta\n');
  
  console.log('✨ PRODUCTOS A REGISTRAR:');
  console.log('  🥤 Nitro Tech Whey Protein (Suplemento)');
  console.log('     • Precio: $89.99, Stock: 25 unidades');
  console.log('     • Imagen: suplementos-universalfitness.png');
  console.log('  👕 Conjunto Deportivo Hombre (Ropa)');
  console.log('     • Precio: $45.99, Stock: 15 unidades');
  console.log('     • Imagen: 51NhX5fdSEL.jpg\n');
  
  console.log('🚀 USO:');
  console.log('  node test-products-register.js        # Registrar productos');
  console.log('  node test-products-register.js --help # Mostrar esta ayuda\n');
  
  console.log('📋 REQUISITOS:');
  console.log('  • Servidor backend ejecutándose (npm start)');
  console.log('  • Usuario admin creado (admin@gym.com)');
  console.log('  • Imágenes en las rutas especificadas');
  console.log('  • Endpoints de admin configurados\n');
}

// ✅ FUNCIÓN PRINCIPAL
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const register = new ProductsRegister();
  
  try {
    await register.registerAllProducts();
    
  } catch (error) {
    console.error('\n🚨 ERROR EN EL REGISTRO:');
    console.error(`❌ ${error.message}\n`);
    
    console.error('💡 POSIBLES SOLUCIONES:');
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('Network Error')) {
      console.error('   1. ✅ Verifica que tu servidor esté ejecutándose: npm start');
      console.error('   2. ✅ Verifica que el puerto sea el correcto (5000)');
    } else if (error.message.includes('Autenticación falló')) {
      console.error('   1. ✅ Verifica que el usuario admin existe: admin@gym.com');
      console.error('   2. ✅ Verifica la contraseña: Admin123!');
    } else if (error.message.includes('404') || error.message.includes('endpoint')) {
      console.error('   1. ✅ Verifica que las rutas de admin estén configuradas');
      console.error('   2. ✅ Verifica que el middleware requireStaff funcione');
    } else if (error.message.includes('archivo no encontrado')) {
      console.error('   1. ✅ Verifica las rutas de las imágenes');
      console.error('   2. ✅ Asegúrate de que los archivos existan');
    }
    
    process.exit(1);
  }
}

// ✅ EJECUTAR SI SE LLAMA DIRECTAMENTE
if (require.main === module) {
  main();
}

module.exports = { ProductsRegister };