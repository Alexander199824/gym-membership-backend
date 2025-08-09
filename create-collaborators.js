// create-collaborators.js - Script para crear colaboradores del gimnasio
const axios = require('axios');

class CollaboratorCreator {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.token = null;
    
    // 👥 COLABORADORES A CREAR
    this.collaborators = [
      {
        firstName: "María",
        lastName: "González",
        email: "maria.gonzalez@gimnasio.com",
        password: "MiPassword123!",
        phone: "+502 5555-1001",
        role: "colaborador"
      },
      {
        firstName: "Luis",
        lastName: "Rodríguez", 
        email: "luis.rodriguez@gimnasio.com",
        password: "Password456!",
        phone: "+502 5555-1002",
        role: "colaborador"
      }
    ];
    
    this.createdUsers = [];
  }

  async runCreation() {
    console.log('👥 Script para crear colaboradores del gimnasio\n');
    
    try {
      await this.checkServer();
      await this.loginAdmin();
      await this.createCollaborators();
      await this.verifyCollaborators();
      await this.testCollaboratorLogins();
      
      console.log('\n✅ ¡Colaboradores creados exitosamente!');
      this.showSummary();
      
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
        console.log(`   🏷️ Rol: ${response.data.data.user.role}`);
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

  async createCollaborators() {
    console.log('\n3. 👥 Creando colaboradores...');
    
    for (let i = 0; i < this.collaborators.length; i++) {
      const collaborator = this.collaborators[i];
      console.log(`\n   📝 Creando colaborador ${i + 1}/2: ${collaborator.firstName} ${collaborator.lastName}`);
      
      try {
        // Verificar si el usuario ya existe
        const existingUser = await this.checkUserExists(collaborator.email);
        if (existingUser) {
          console.log(`   ⚠️ Usuario ya existe: ${collaborator.email}`);
          this.createdUsers.push({
            ...collaborator,
            id: existingUser.id,
            alreadyExists: true
          });
          continue;
        }

        // Crear nuevo usuario
        const response = await axios.post(
          `${this.baseURL}/api/users`,
          {
            firstName: collaborator.firstName,
            lastName: collaborator.lastName,
            email: collaborator.email,
            password: collaborator.password,
            phone: collaborator.phone,
            role: collaborator.role
          },
          {
            headers: {
              'Authorization': `Bearer ${this.token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.data.success) {
          const userData = response.data.data;
          console.log('   🎉 ¡Colaborador creado exitosamente!');
          console.log(`   📧 Email: ${userData.email}`);
          console.log(`   🏷️ Rol: ${userData.role}`);
          console.log(`   🆔 ID: ${userData.id}`);
          
          this.createdUsers.push({
            ...collaborator,
            id: userData.id,
            alreadyExists: false
          });
        }

      } catch (error) {
        console.log(`   ❌ Error creando ${collaborator.firstName}: ${error.message}`);
        
        if (error.response?.status === 409) {
          console.log('   💡 El usuario probablemente ya existe');
        } else if (error.response?.data) {
          console.log(`   📋 Detalles: ${JSON.stringify(error.response.data, null, 2)}`);
        }
        
        // Continuar con el siguiente usuario
        continue;
      }
    }
  }

  async checkUserExists(email) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/users/search?q=${encodeURIComponent(email)}`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        }
      );

      if (response.data.success && response.data.data?.users?.length > 0) {
        const user = response.data.data.users.find(u => u.email === email);
        return user || null;
      }
      return null;
    } catch (error) {
      // Si hay error en la búsqueda, asumir que no existe
      return null;
    }
  }

  async verifyCollaborators() {
    console.log('\n4. 🔍 Verificando colaboradores creados...');
    
    try {
      const response = await axios.get(
        `${this.baseURL}/api/users?role=colaborador&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        }
      );

      if (response.data.success) {
        const collaborators = response.data.data.users.filter(user => 
          ['maria.gonzalez@gimnasio.com', 'luis.rodriguez@gimnasio.com'].includes(user.email)
        );

        console.log(`   📊 Colaboradores encontrados: ${collaborators.length}/2`);
        
        collaborators.forEach(collab => {
          console.log(`   ✅ ${collab.firstName} ${collab.lastName} - ${collab.email} - Rol: ${collab.role}`);
        });

        if (collaborators.length === 2) {
          console.log('   🎉 ¡Ambos colaboradores verificados!');
        }
      }
    } catch (error) {
      console.log(`   ⚠️ Error verificando colaboradores: ${error.message}`);
    }
  }

  async testCollaboratorLogins() {
    console.log('\n5. 🔐 Probando login de colaboradores...');
    
    for (const collaborator of this.collaborators) {
      console.log(`\n   🧪 Probando login: ${collaborator.firstName} ${collaborator.lastName}`);
      
      try {
        const response = await axios.post(`${this.baseURL}/api/auth/login`, {
          email: collaborator.email,
          password: collaborator.password
        });

        if (response.data.success && response.data.data.token) {
          console.log('   ✅ Login exitoso');
          console.log(`   👤 Usuario: ${response.data.data.user.firstName} ${response.data.data.user.lastName}`);
          console.log(`   🏷️ Rol: ${response.data.data.user.role}`);
          console.log(`   🔑 Token generado: ${response.data.data.token.substring(0, 20)}...`);
        }
      } catch (error) {
        console.log(`   ❌ Error en login: ${error.message}`);
        if (error.response?.status === 401) {
          console.log('   💡 Credenciales incorrectas o usuario no existe');
        }
      }
    }
  }

  showSummary() {
    console.log('\n📋 RESUMEN DE COLABORADORES CREADOS');
    console.log('=' .repeat(60));
    
    this.createdUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🔑 Password: ${user.password}`);
      console.log(`   📞 Teléfono: ${user.phone}`);
      console.log(`   🏷️ Rol: ${user.role}`);
      console.log(`   📊 Estado: ${user.alreadyExists ? 'Ya existía' : 'Creado nuevo'}`);
      console.log(`   🆔 ID: ${user.id}`);
    });

    console.log('\n💡 INSTRUCCIONES PARA USO:');
    console.log('   1. Los colaboradores pueden hacer login con sus credenciales');
    console.log('   2. Tienen permisos para gestionar usuarios, membresías, pagos y tienda');
    console.log('   3. NO tienen acceso completo de administrador');
    console.log('   4. Pueden subir archivos multimedia excepto configuración del gym');

    console.log('\n🔐 CREDENCIALES DE LOGIN:');
    this.collaborators.forEach((collab, index) => {
      console.log(`\n   Colaborador ${index + 1}:`);
      console.log(`   Email: ${collab.email}`);
      console.log(`   Password: ${collab.password}`);
    });
  }

  // Método para mostrar configuración actual
  showConfig() {
    console.log('\n📁 CONFIGURACIÓN ACTUAL:');
    console.log(`   🌐 URL Base: ${this.baseURL}`);
    console.log(`   👥 Colaboradores a crear: ${this.collaborators.length}`);
    
    console.log('\n📋 LISTA DE COLABORADORES:');
    this.collaborators.forEach((collab, index) => {
      console.log(`   ${index + 1}. ${collab.firstName} ${collab.lastName}`);
      console.log(`      📧 ${collab.email}`);
      console.log(`      🏷️ ${collab.role}`);
    });
  }
}

// Función para mostrar ayuda
function showHelp() {
  console.log('\n👥 Elite Fitness Club - Creador de Colaboradores\n');
  console.log('Uso:');
  console.log('   node create-collaborators.js           # Crear colaboradores');
  console.log('   node create-collaborators.js --help    # Mostrar ayuda');
  console.log('   node create-collaborators.js --config  # Mostrar configuración\n');
  
  console.log('👥 Colaboradores que se crearán:');
  console.log('   📧 maria.gonzalez@gimnasio.com');
  console.log('   📧 luis.rodriguez@gimnasio.com\n');
  
  console.log('🔧 Permisos de colaborador:');
  console.log('   ✅ Gestión de usuarios y membresías');
  console.log('   ✅ Gestión de pagos y reportes');
  console.log('   ✅ Gestión de tienda y productos');
  console.log('   ❌ Configuración del gimnasio (solo admin)');
}

// Ejecutar script
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const creator = new CollaboratorCreator();
  
  if (args.includes('--config') || args.includes('-c')) {
    creator.showConfig();
    return;
  }
  
  try {
    await creator.runCreation();
    
  } catch (error) {
    console.error('\n💡 SOLUCIONES:');
    
    if (error.message.includes('Servidor no responde')) {
      console.error('   1. Verifica que tu servidor esté ejecutándose: npm start');
      console.error('   2. Verifica que la URL sea correcta: http://localhost:5000');
    } else if (error.message.includes('Login falló')) {
      console.error('   1. Verifica que el usuario admin existe');
      console.error('   2. Verifica las credenciales: admin@gym.com / Admin123!');
    } else if (error.message.includes('Error creando')) {
      console.error('   1. Los usuarios pueden ya existir en la base de datos');
      console.error('   2. Verifica que el token de admin sea válido');
    }
    
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { CollaboratorCreator };