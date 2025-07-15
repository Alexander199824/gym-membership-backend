// test-system.js
const axios = require('axios');

class SystemTester {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.token = null;
    this.testUserId = null;
    this.testMembershipId = null;
  }

  async runTests() {
    console.log('🧪 Iniciando pruebas completas del sistema...\n');
    
    try {
      await this.testHealthCheck();
      await this.testAdminLogin();
      await this.testUserCreation();
      await this.testMembershipCreation();
      await this.testPaymentRegistration();
      await this.testImageUpload();
      await this.testReports();
      
      console.log('\n✅ ¡Todas las pruebas pasaron exitosamente!');
      console.log('🎉 El sistema está funcionando correctamente');
      console.log('\n📊 Resumen de funcionalidades probadas:');
      console.log('   ✅ API Health Check');
      console.log('   ✅ Autenticación y JWT');
      console.log('   ✅ Gestión de usuarios');
      console.log('   ✅ Sistema de membresías');
      console.log('   ✅ Registro de pagos');
      console.log('   ✅ Endpoints de archivos (configuración validada)');
      console.log('   ✅ Reportes administrativos');
      
      console.log('\n💡 Servicios opcionales para configurar más tarde:');
      console.log('   📧 Email (notificaciones)');
      console.log('   📱 WhatsApp (notificaciones)');
      console.log('   ☁️ Cloudinary (subida de imágenes)');
      console.log('   🔐 Google OAuth (login con Google)');
    } catch (error) {
      console.error('\n❌ Error en las pruebas:', error.message);
      if (error.response) {
        console.error('   Response data:', error.response.data);
        console.error('   Status:', error.response.status);
      }
      process.exit(1);
    }
  }

  async testHealthCheck() {
    console.log('1. 🔍 Probando health check...');
    
    const response = await axios.get(`${this.baseURL}/api/health`);
    
    if (response.data.success) {
      console.log('   ✅ Health check OK');
      console.log(`   📡 API Version: ${response.headers['x-api-version'] || 'N/A'}`);
    } else {
      throw new Error('Health check falló');
    }
  }

  async testAdminLogin() {
    console.log('2. 🔐 Probando login de administrador...');
    
    const response = await axios.post(`${this.baseURL}/api/auth/login`, {
      email: 'admin@gym.com',
      password: 'Admin123!'
    });
    
    if (response.data.success && response.data.data.token) {
      this.token = response.data.data.token;
      console.log('   ✅ Login de admin exitoso');
      console.log(`   👤 Usuario: ${response.data.data.user.firstName} ${response.data.data.user.lastName}`);
      console.log(`   🔑 Rol: ${response.data.data.user.role}`);
    } else {
      throw new Error('Login de admin falló');
    }
  }

  async testUserCreation() {
    console.log('3. 👤 Probando creación de usuario...');
    
    const timestamp = Date.now();
    const userData = {
      firstName: 'Juan',
      lastName: 'Pérez',
      email: `test.user.${timestamp}@test.com`,
      password: 'Test123!',
      phone: '+50212345678',
      whatsapp: '+50212345678',
      role: 'cliente',
      dateOfBirth: '1990-01-01'
    };

    const response = await axios.post(
      `${this.baseURL}/api/users`,
      userData,
      {
        headers: { Authorization: `Bearer ${this.token}` }
      }
    );
    
    if (response.data.success) {
      this.testUserId = response.data.data.user.id;
      console.log('   ✅ Usuario creado exitosamente');
      console.log(`   📧 Email: ${userData.email}`);
      console.log(`   🆔 ID: ${this.testUserId}`);
    } else {
      throw new Error('Creación de usuario falló');
    }
  }

  async testMembershipCreation() {
    console.log('4. 🎫 Probando creación de membresía...');
    
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    
    const membershipData = {
      userId: this.testUserId,
      type: 'monthly',
      price: 250.00,
      endDate: endDate.toISOString(),
      preferredSchedule: {
        monday: ['06:00-08:00'],
        wednesday: ['18:00-20:00'],
        friday: ['06:00-08:00']
      },
      notes: 'Membresía de prueba del sistema'
    };

    const response = await axios.post(
      `${this.baseURL}/api/memberships`,
      membershipData,
      {
        headers: { Authorization: `Bearer ${this.token}` }
      }
    );
    
    if (response.data.success) {
      this.testMembershipId = response.data.data.membership.id;
      console.log('   ✅ Membresía creada exitosamente');
      console.log(`   💰 Precio: $${membershipData.price}`);
      console.log(`   📅 Vence: ${endDate.toLocaleDateString('es-ES')}`);
      console.log(`   🆔 ID: ${this.testMembershipId}`);
    } else {
      throw new Error('Creación de membresía falló');
    }
  }

  async testPaymentRegistration() {
    console.log('5. 💰 Probando registro de pago...');
    
    const paymentData = {
      userId: this.testUserId,
      membershipId: this.testMembershipId,
      amount: 250.00,
      paymentMethod: 'cash',
      paymentType: 'membership',
      description: 'Pago de prueba del sistema'
    };

    const response = await axios.post(
      `${this.baseURL}/api/payments`,
      paymentData,
      {
        headers: { Authorization: `Bearer ${this.token}` }
      }
    );
    
    if (response.data.success) {
      console.log('   ✅ Pago registrado exitosamente');
      console.log(`   💵 Monto: $${paymentData.amount}`);
      console.log(`   💳 Método: ${paymentData.paymentMethod}`);
      console.log(`   📝 Estado: ${response.data.data.payment.status}`);
    } else {
      throw new Error('Registro de pago falló');
    }
  }

  async testImageUpload() {
    console.log('6. 🖼️ Probando subida de imagen (simulada)...');
    
    // En una prueba real, aquí subirías una imagen
    // Para esta prueba, solo verificamos que el endpoint existe
    try {
      await axios.post(
        `${this.baseURL}/api/auth/profile/image`,
        {},
        {
          headers: { 
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
    } catch (error) {
      if (error.response && error.response.status === 400 && 
          error.response.data.message.includes('archivo')) {
        console.log('   ✅ Endpoint de imagen funcional (validación OK)');
      } else if (error.response && error.response.status === 503 && 
                 error.response.data.message.includes('Servicio de imágenes no configurado')) {
        console.log('   ✅ Endpoint de imagen funcional (Cloudinary no configurado - esperado)');
      } else {
        throw error;
      }
    }
  }

  async testReports() {
    console.log('7. 📊 Probando reportes administrativos...');
    
    const response = await axios.get(
      `${this.baseURL}/api/payments/reports?period=month`,
      {
        headers: { Authorization: `Bearer ${this.token}` }
      }
    );
    
    if (response.data.success) {
      console.log('   ✅ Reportes generados exitosamente');
      console.log(`   💰 Ingreso total: $${response.data.data.totalIncome || 0}`);
      console.log(`   📈 Tipos de pago disponibles: ${response.data.data.incomeByType.length}`);
    } else {
      throw new Error('Generación de reportes falló');
    }
  }
}

// Función para probar servicios externos
async function testExternalServices() {
  console.log('\n🌐 Probando configuración de servicios externos...\n');
  
  // Probar configuración de base de datos
  console.log('1. 🗄️ Probando conexión a PostgreSQL...');
  try {
    const { testConnection } = require('./src/config/database');
    await testConnection();
    console.log('   ✅ Conexión a PostgreSQL OK');
  } catch (error) {
    console.log('   ❌ Error en PostgreSQL:', error.message);
  }

  // Probar configuración de Cloudinary
  console.log('2. ☁️ Probando configuración de Cloudinary...');
  if (process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      !process.env.CLOUDINARY_CLOUD_NAME.startsWith('your_')) {
    console.log('   ✅ Variables de Cloudinary configuradas');
  } else {
    console.log('   ⚠️ Cloudinary no configurado (uploads no funcionarán)');
  }

  // Probar configuración de email
  console.log('3. 📧 Probando configuración de email...');
  if (process.env.EMAIL_USER && 
      process.env.EMAIL_PASS && 
      !process.env.EMAIL_USER.startsWith('your-')) {
    console.log('   ✅ Variables de email configuradas');
  } else {
    console.log('   ⚠️ Email no configurado (notificaciones no funcionarán)');
  }

  // Probar configuración de WhatsApp
  console.log('4. 📱 Probando configuración de WhatsApp...');
  if (process.env.TWILIO_ACCOUNT_SID && 
      process.env.TWILIO_AUTH_TOKEN && 
      process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
    console.log('   ✅ Variables de Twilio configuradas');
  } else {
    console.log('   ⚠️ Twilio no configurado (WhatsApp no funcionará)');
  }

  // Probar configuración de Google OAuth
  console.log('5. 🔐 Probando configuración de Google OAuth...');
  if (process.env.GOOGLE_CLIENT_ID && 
      process.env.GOOGLE_CLIENT_SECRET && 
      !process.env.GOOGLE_CLIENT_ID.startsWith('your_')) {
    console.log('   ✅ Variables de Google OAuth configuradas');
  } else {
    console.log('   ⚠️ Google OAuth no configurado (login con Google no funcionará)');
  }
}

// Script principal
async function main() {
  console.log('🚀 Sistema de Testing - Gym Management Backend\n');
  
  // Verificar que el servidor esté ejecutándose
  try {
    await axios.get('http://localhost:5000/api/health');
  } catch (error) {
    console.error('❌ El servidor no está ejecutándose en puerto 5000');
    console.log('💡 Ejecuta: npm run dev');
    process.exit(1);
  }

  // Probar servicios externos primero
  await testExternalServices();

  // Ejecutar pruebas de la API
  const tester = new SystemTester();
  await tester.runTests();

  console.log('\n🎯 Todas las pruebas completadas');
  console.log('📚 Revisa la documentación para más detalles');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error general:', error.message);
    process.exit(1);
  });
}

module.exports = { SystemTester, testExternalServices };