// testUsers.js - Pruebas completas de API REST para Usuarios con SELECCIÓN MEJORADA
// Ejecutar con: node testUsers.js
// NOTA: El servidor debe estar corriendo en http://localhost:5000

const readline = require('readline');
const axios = require('axios');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ✅ CONFIGURACIÓN DE LOGIN AUTOMÁTICO
const AUTO_LOGIN = {
  enabled: true,  // ← Cambiar a false para login manual
  email: 'admin@gym.com',
  password: 'Admin123!'
};

// Configuración
const API_BASE_URL = 'http://localhost:5000/api';
let authToken = null;
let currentUser = null;

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function clearScreen() {
  console.clear();
}

function showHeader(title) {
  console.log('\n' + colors.bright + colors.cyan + '='.repeat(70) + colors.reset);
  console.log(colors.bright + colors.cyan + `  ${title}` + colors.reset);
  console.log(colors.bright + colors.cyan + '='.repeat(70) + colors.reset + '\n');
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('es-GT', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Configurar axios con token
function getAxiosConfig() {
  return {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  };
}

// ============================================================
// 🆕 FUNCIÓN PARA LISTAR Y SELECCIONAR USUARIO
// ============================================================
async function selectUserFromList(filterRole = null, title = 'SELECCIONAR USUARIO') {
  showHeader(title);
  
  try {
    const params = { limit: 100 };
    if (filterRole) {
      params.role = filterRole;
      console.log(colors.cyan + `Filtrando por rol: ${filterRole}` + colors.reset + '\n');
    }
    
    console.log(colors.cyan + 'Obteniendo lista de usuarios...' + colors.reset);
    const response = await axios.get(`${API_BASE_URL}/users`, {
      ...getAxiosConfig(),
      params
    });
    
    if (!response.data.success || response.data.data.users.length === 0) {
      console.log(colors.yellow + '\n⚠️  No hay usuarios disponibles' + colors.reset);
      return null;
    }
    
    const users = response.data.data.users;
    
    // Mostrar lista de usuarios
    console.log('\n' + colors.green + `✅ ${users.length} usuarios encontrados` + colors.reset + '\n');
    console.log('─'.repeat(70));
    
    users.forEach((user, index) => {
      const roleColors = {
        admin: colors.red,
        colaborador: colors.yellow,
        cliente: colors.blue
      };
      
      const statusIcon = user.isActive ? '✓' : '✗';
      const statusColor = user.isActive ? colors.green : colors.red;
      
      console.log(`${colors.bright}${index + 1}.${colors.reset} ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Rol: ${roleColors[user.role]}${user.role}${colors.reset} | Estado: ${statusColor}${statusIcon}${colors.reset}`);
      console.log(`   ID: ${user.id.substring(0, 13)}...`);
      console.log('');
    });
    
    console.log('─'.repeat(70));
    const choice = await question('\nSelecciona el número del usuario (0 para cancelar): ');
    
    const selectedIndex = parseInt(choice) - 1;
    
    if (choice === '0' || selectedIndex < 0 || selectedIndex >= users.length) {
      console.log(colors.yellow + '\n⚠️  Operación cancelada' + colors.reset);
      return null;
    }
    
    const selectedUser = users[selectedIndex];
    console.log('\n' + colors.green + `✅ Usuario seleccionado: ${selectedUser.firstName} ${selectedUser.lastName}` + colors.reset);
    console.log(`   Rol actual: ${selectedUser.role}`);
    
    return selectedUser;
    
  } catch (error) {
    handleAPIError(error);
    return null;
  }
}

async function showMenu() {
  clearScreen();
  showHeader('👥 TEST DE API REST - USUARIOS');
  
  if (!authToken) {
    console.log(colors.red + '⚠️  NO AUTENTICADO' + colors.reset);
    console.log('\n  1. Login' + (AUTO_LOGIN.enabled ? ' (Automático)' : ''));
    console.log('  0. Salir');
  } else {
    console.log(colors.green + `✅ Autenticado como: ${currentUser?.email || 'Usuario'}` + colors.reset);
    console.log(colors.cyan + `Rol: ${currentUser?.role || 'N/A'}` + colors.reset);
    
    console.log('\n' + colors.blue + '📋 CONSULTAR (GET):' + colors.reset);
    console.log('  2. GET /api/users - Ver todos los usuarios');
    console.log('  3. GET /api/users/:id - Buscar usuario por ID (con lista)');
    console.log('  4. GET /api/users/search - Buscar usuarios');
    console.log('  5. GET /api/users/stats - Ver estadísticas');
    console.log('  6. GET /api/users/frequent-daily-clients - Clientes frecuentes');
    
    console.log('\n' + colors.green + '➕ CREAR (POST):' + colors.reset);
    console.log('  7. POST /api/users - Crear nuevo usuario');
    console.log('  8. Crear usuario ADMIN (directo)');
    console.log('  9. Crear usuario COLABORADOR (directo)');
    console.log('  10. Crear usuario CLIENTE (directo)');
    
    console.log('\n' + colors.yellow + '✏️  ACTUALIZAR (PATCH):' + colors.reset);
    console.log('  11. PATCH /api/users/:id - Actualizar usuario (con lista)');
    console.log('  12. 🔄 Cambiar ROL de usuario (con lista)');
    console.log('  13. 🔄 Cliente → Colaborador (con lista)');
    console.log('  14. 🔄 Colaborador → Admin (con lista)');
    console.log('  15. 🔄 Activar/Desactivar usuario (con lista)');
    
    console.log('\n' + colors.red + '🗑️  ELIMINAR (DELETE):' + colors.reset);
    console.log('  16. DELETE /api/users/:id - Eliminar usuario (con lista)');
    
    console.log('\n' + colors.magenta + '🔧 OPERACIONES MASIVAS:' + colors.reset);
    console.log('  17. Listar todos los usuarios por rol');
    console.log('  18. Ver estructura completa de un usuario (con lista)');
    
    console.log('\n' + colors.cyan + '⚙️  SISTEMA:' + colors.reset);
    console.log('  19. Verificar conexión al servidor');
    console.log('  20. Logout');
    console.log('  0. Salir');
  }
  
  console.log('\n' + '─'.repeat(70));
  const choice = await question(colors.bright + 'Selecciona una opción: ' + colors.reset);
  return choice;
}

// ============================================================
// 1. LOGIN - CON OPCIÓN AUTOMÁTICA
// ============================================================
async function login() {
  showHeader('🔐 LOGIN');
  
  let email, password;
  
  if (AUTO_LOGIN.enabled) {
    console.log(colors.cyan + '🤖 Login automático habilitado' + colors.reset);
    email = AUTO_LOGIN.email;
    password = AUTO_LOGIN.password;
    console.log(`Email: ${email}`);
    console.log(`Password: ${'*'.repeat(password.length)}`);
  } else {
    email = await question('Email: ');
    password = await question('Password: ');
  }
  
  try {
    console.log('\nIntentando autenticar...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password
    });
    
    if (response.data.success) {
      authToken = response.data.data?.token || response.data.token;
      currentUser = response.data.data?.user || response.data.user;
      
      if (authToken && currentUser) {
        console.log('\n' + colors.green + '✅ Login exitoso!' + colors.reset);
        console.log(`Usuario: ${currentUser.firstName} ${currentUser.lastName}`);
        console.log(`Email: ${currentUser.email}`);
        console.log(`Rol: ${currentUser.role}`);
        console.log(`Token: ${authToken.substring(0, 20)}...`);
      } else {
        console.log(colors.red + '❌ Error: No se pudo extraer token o usuario de la respuesta' + colors.reset);
      }
    } else {
      console.log(colors.red + '❌ Error en login: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    console.log(colors.red + '❌ Error de conexión: ' + colors.reset);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Mensaje: ${error.response.data.message || 'Error desconocido'}`);
    } else if (error.request) {
      console.log('No se recibió respuesta del servidor');
      console.log('Asegúrate de que el servidor esté corriendo en http://localhost:5000');
    } else {
      console.log(`Error: ${error.message}`);
    }
  }
  
  if (!AUTO_LOGIN.enabled) {
    await question('\nPresiona Enter para continuar...');
  }
}

// ============================================================
// AUTO-LOGIN AL INICIO
// ============================================================
async function autoLoginOnStart() {
  if (AUTO_LOGIN.enabled) {
    console.log(colors.cyan + '🤖 Realizando login automático...' + colors.reset);
    
    try {
      await login();
      
      if (authToken && currentUser) {
        console.log(colors.green + '✅ Autenticación automática exitosa' + colors.reset);
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else {
        console.log(colors.red + '❌ Autenticación automática falló' + colors.reset);
        console.log(colors.yellow + '💡 Usa la opción 1 del menú para intentar de nuevo' + colors.reset);
        await question('\nPresiona Enter para continuar...');
      }
    } catch (error) {
      console.log(colors.red + '❌ Error en autenticación automática: ' + error.message + colors.reset);
      await question('\nPresiona Enter para continuar...');
    }
  }
}

// ============================================================
// 2. GET ALL USERS
// ============================================================
async function getAllUsers() {
  showHeader('📋 GET /api/users - TODOS LOS USUARIOS');
  
  console.log('Parámetros opcionales:');
  const page = await question('Página (default: 1): ') || '1';
  const limit = await question('Límite (default: 20): ') || '20';
  
  console.log('\nFiltros opcionales:');
  console.log('Roles: admin, colaborador, cliente');
  const role = await question('Filtrar por rol: ');
  
  console.log('Estado: true (activos), false (inactivos)');
  const isActive = await question('Filtrar por estado: ');
  
  const search = await question('Buscar (nombre/email): ');
  
  try {
    const params = { page, limit };
    if (role) params.role = role;
    if (isActive !== '') params.isActive = isActive;
    if (search) params.search = search;
    
    console.log(`\n${colors.cyan}Enviando GET a /api/users...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/users`, {
      ...getAxiosConfig(),
      params
    });
    
    if (response.data.success) {
      const users = response.data.data.users;
      const pagination = response.data.data.pagination;
      
      console.log('\n' + colors.green + '✅ Respuesta exitosa' + colors.reset);
      console.log(`Total de usuarios: ${pagination.total}`);
      console.log(`Página ${pagination.page} de ${pagination.pages}`);
      console.log(`Mostrando ${users.length} usuarios:\n`);
      
      users.forEach((user, index) => {
        const roleColors = {
          admin: colors.red,
          colaborador: colors.yellow,
          cliente: colors.blue
        };
        
        console.log(`${index + 1}. ${colors.bright}${user.firstName} ${user.lastName}${colors.reset}`);
        console.log(`   ID: ${user.id.substring(0, 8)}...`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Rol: ${roleColors[user.role]}${user.role}${colors.reset}`);
        console.log(`   Estado: ${user.isActive ? colors.green + 'Activo' : colors.red + 'Inactivo'}${colors.reset}`);
        console.log(`   Creado: ${formatDate(user.createdAt)}`);
        if (user.phone) console.log(`   Teléfono: ${user.phone}`);
        if (user.whatsapp) console.log(`   WhatsApp: ${user.whatsapp}`);
        console.log('');
      });
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 3. GET USER BY ID (CON LISTA)
// ============================================================
async function getUserById() {
  const user = await selectUserFromList(null, '🔍 BUSCAR USUARIO POR ID');
  
  if (!user) {
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Enviando GET a /api/users/${user.id}...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/users/${user.id}`, getAxiosConfig());
    
    if (response.data.success) {
      const userData = response.data.data.user;
      
      console.log('\n' + colors.green + '✅ Usuario encontrado' + colors.reset);
      console.log(colors.bright + userData.firstName + ' ' + userData.lastName + colors.reset);
      console.log('─'.repeat(60));
      console.log(JSON.stringify(userData, null, 2));
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 4. SEARCH USERS
// ============================================================
async function searchUsers() {
  showHeader('🔎 GET /api/users/search - BUSCAR USUARIOS');
  
  const query = await question('Término de búsqueda (nombre/email, mín 2 caracteres): ');
  
  if (!query || query.length < 2) {
    console.log(colors.red + '❌ Búsqueda debe tener al menos 2 caracteres' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  console.log('Roles: admin, colaborador, cliente');
  const role = await question('Filtrar por rol (opcional): ');
  
  try {
    const params = { q: query };
    if (role) params.role = role;
    
    console.log(`\n${colors.cyan}Enviando GET a /api/users/search...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/users/search`, {
      ...getAxiosConfig(),
      params
    });
    
    if (response.data.success) {
      const users = response.data.data.users;
      
      console.log('\n' + colors.green + `✅ ${users.length} usuarios encontrados` + colors.reset + '\n');
      
      if (users.length > 0) {
        users.forEach((user, index) => {
          console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
          console.log(`   Email: ${user.email}`);
          console.log(`   Rol: ${user.role}`);
          console.log(`   ID: ${user.id.substring(0, 8)}...`);
          console.log('');
        });
      }
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 5. GET USER STATS
// ============================================================
async function getUserStats() {
  showHeader('📊 GET /api/users/stats - ESTADÍSTICAS');
  
  try {
    console.log(`\n${colors.cyan}Enviando GET a /api/users/stats...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/users/stats`, getAxiosConfig());
    
    if (response.data.success) {
      const stats = response.data.data;
      
      console.log('\n' + colors.green + '✅ Estadísticas obtenidas' + colors.reset + '\n');
      
      if (stats.role === 'admin') {
        console.log(colors.bright + 'ESTADÍSTICAS GENERALES (ADMIN)' + colors.reset);
        console.log('─'.repeat(60));
        console.log(`Total de usuarios activos: ${stats.totalActiveUsers}`);
        console.log(`Nuevos usuarios este mes: ${stats.newUsersThisMonth}`);
        console.log(`Usuarios con membresías activas: ${stats.usersWithActiveMemberships}`);
        
        if (stats.roleStats) {
          console.log('\nDistribución por roles:');
          Object.keys(stats.roleStats).forEach(role => {
            console.log(`  ${role}: ${stats.roleStats[role]}`);
          });
        }
      } else if (stats.role === 'colaborador') {
        console.log(colors.bright + 'ESTADÍSTICAS DE COLABORADOR' + colors.reset);
        console.log('─'.repeat(60));
        console.log(`Mis clientes: ${stats.myClients}`);
        console.log(`Nuevos clientes este mes: ${stats.newClientsThisMonth}`);
        console.log(`Total clientes activos: ${stats.totalActiveClients}`);
      }
      
      console.log('\nRespuesta completa:');
      console.log(JSON.stringify(stats, null, 2));
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 6. GET FREQUENT DAILY CLIENTS
// ============================================================
async function getFrequentDailyClients() {
  showHeader('💪 GET /api/users/frequent-daily-clients - CLIENTES FRECUENTES');
  
  const days = await question('Días hacia atrás (default: 30): ') || '30';
  const minVisits = await question('Visitas mínimas (default: 10): ') || '10';
  
  try {
    console.log(`\n${colors.cyan}Enviando GET a /api/users/frequent-daily-clients...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/users/frequent-daily-clients`, {
      ...getAxiosConfig(),
      params: { days, minVisits }
    });
    
    if (response.data.success) {
      const clients = response.data.data.clients;
      const criteria = response.data.data.criteria;
      
      console.log('\n' + colors.green + `✅ ${clients.length} clientes frecuentes encontrados` + colors.reset);
      console.log(`Criterio: ${criteria.minVisits} visitas en últimos ${criteria.days} días\n`);
      
      if (clients.length > 0) {
        clients.forEach((client, index) => {
          console.log(`${index + 1}. ${client.firstName} ${client.lastName}`);
          console.log(`   Email: ${client.email}`);
          console.log(`   WhatsApp: ${client.whatsapp || 'No registrado'}`);
          console.log(`   Pagos diarios: ${client.dataValues.dailyPayments}`);
          console.log('');
        });
      }
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 7. CREATE USER
// ============================================================
async function createUser() {
  showHeader('➕ POST /api/users - CREAR USUARIO');
  
  console.log('Ingresa los datos del nuevo usuario:\n');
  
  const firstName = await question('Nombre: ');
  if (!firstName) {
    console.log(colors.red + '❌ Nombre requerido' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  const lastName = await question('Apellido: ');
  if (!lastName) {
    console.log(colors.red + '❌ Apellido requerido' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  const email = await question('Email: ');
  if (!email || !email.includes('@')) {
    console.log(colors.red + '❌ Email inválido' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  const password = await question('Password (opcional si es staff): ');
  const phone = await question('Teléfono: ');
  const whatsapp = await question('WhatsApp: ');
  
  console.log('\nRoles disponibles:');
  console.log('  1. cliente (default)');
  console.log('  2. colaborador');
  console.log('  3. admin (solo si eres admin)');
  const roleChoice = await question('Selecciona rol (1-3): ');
  
  const roles = ['cliente', 'colaborador', 'admin'];
  const role = roles[parseInt(roleChoice) - 1] || 'cliente';
  
  const dateOfBirth = await question('Fecha de nacimiento (YYYY-MM-DD, opcional): ');
  
  const userData = {
    firstName,
    lastName,
    email: email.toLowerCase(),
    phone,
    whatsapp,
    role
  };
  
  if (password) userData.password = password;
  if (dateOfBirth) userData.dateOfBirth = dateOfBirth;
  
  try {
    console.log(`\n${colors.cyan}Enviando POST a /api/users...${colors.reset}`);
    console.log('Datos:', JSON.stringify(userData, null, 2));
    
    const response = await axios.post(`${API_BASE_URL}/users`, userData, getAxiosConfig());
    
    if (response.data.success) {
      const user = response.data.data.user;
      
      console.log('\n' + colors.green + '✅ Usuario creado exitosamente!' + colors.reset);
      console.log(`ID: ${user.id}`);
      console.log(`Nombre: ${user.firstName} ${user.lastName}`);
      console.log(`Email: ${user.email}`);
      console.log(`Rol: ${user.role}`);
      console.log(`Estado: ${user.isActive ? 'Activo' : 'Inactivo'}`);
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 8-10. CREATE USER BY ROLE (DIRECTO)
// ============================================================
async function createUserByRole(role) {
  showHeader(`➕ CREAR USUARIO ${role.toUpperCase()}`);
  
  console.log(`Creando usuario con rol: ${colors.bright}${role}${colors.reset}\n`);
  
  const firstName = await question('Nombre: ');
  const lastName = await question('Apellido: ');
  const email = await question('Email: ');
  const password = await question('Password (opcional): ');
  const phone = await question('Teléfono: ');
  const whatsapp = await question('WhatsApp: ');
  
  if (!firstName || !lastName || !email) {
    console.log(colors.red + '❌ Nombre, apellido y email son requeridos' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  const userData = {
    firstName,
    lastName,
    email: email.toLowerCase(),
    phone,
    whatsapp,
    role
  };
  
  if (password) userData.password = password;
  
  try {
    console.log(`\n${colors.cyan}Creando usuario ${role}...${colors.reset}`);
    const response = await axios.post(`${API_BASE_URL}/users`, userData, getAxiosConfig());
    
    if (response.data.success) {
      const user = response.data.data.user;
      console.log('\n' + colors.green + `✅ Usuario ${role} creado!` + colors.reset);
      console.log(`ID: ${user.id}`);
      console.log(`Nombre: ${user.firstName} ${user.lastName}`);
      console.log(`Email: ${user.email}`);
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 11. UPDATE USER (CON LISTA)
// ============================================================
async function updateUser() {
  const user = await selectUserFromList(null, '✏️  ACTUALIZAR USUARIO');
  
  if (!user) {
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  console.log('\nIngresa los campos a actualizar (deja en blanco para mantener):\n');
  
  const firstName = await question(`Nuevo nombre (actual: ${user.firstName}): `);
  const lastName = await question(`Nuevo apellido (actual: ${user.lastName}): `);
  const phone = await question(`Nuevo teléfono (actual: ${user.phone || 'N/A'}): `);
  const whatsapp = await question(`Nuevo WhatsApp (actual: ${user.whatsapp || 'N/A'}): `);
  const dateOfBirth = await question('Nueva fecha de nacimiento (YYYY-MM-DD): ');
  
  const updateData = {};
  if (firstName) updateData.firstName = firstName;
  if (lastName) updateData.lastName = lastName;
  if (phone) updateData.phone = phone;
  if (whatsapp) updateData.whatsapp = whatsapp;
  if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;
  
  if (Object.keys(updateData).length === 0) {
    console.log(colors.yellow + '⚠️  No se especificaron cambios' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Enviando PATCH a /api/users/${user.id}...${colors.reset}`);
    console.log('Datos:', JSON.stringify(updateData, null, 2));
    
    const response = await axios.patch(`${API_BASE_URL}/users/${user.id}`, updateData, getAxiosConfig());
    
    if (response.data.success) {
      console.log('\n' + colors.green + '✅ Usuario actualizado exitosamente!' + colors.reset);
      console.log(JSON.stringify(response.data.data.user, null, 2));
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 12. CHANGE USER ROLE (CON LISTA)
// ============================================================
async function changeUserRole() {
  const user = await selectUserFromList(null, '🔄 CAMBIAR ROL DE USUARIO');
  
  if (!user) {
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  console.log('\nRoles disponibles:');
  console.log('  1. admin');
  console.log('  2. colaborador');
  console.log('  3. cliente');
  
  const roleChoice = await question('\nSelecciona nuevo rol (1-3): ');
  const roles = ['admin', 'colaborador', 'cliente'];
  const newRole = roles[parseInt(roleChoice) - 1];
  
  if (!newRole) {
    console.log(colors.red + '❌ Rol inválido' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  if (newRole === user.role) {
    console.log(colors.yellow + `⚠️  El usuario ya tiene el rol ${newRole}` + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  const confirm = await question(`\n⚠️  ¿Cambiar rol de ${colors.bright}${user.role}${colors.reset} a ${colors.bright}${newRole}${colors.reset}? (s/n): `);
  
  if (confirm.toLowerCase() !== 's') {
    console.log('Operación cancelada');
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Cambiando rol a ${newRole}...${colors.reset}`);
    const response = await axios.patch(`${API_BASE_URL}/users/${user.id}`, { role: newRole }, getAxiosConfig());
    
    if (response.data.success) {
      const updatedUser = response.data.data.user;
      console.log('\n' + colors.green + '✅ Rol cambiado exitosamente!' + colors.reset);
      console.log(`Usuario: ${updatedUser.firstName} ${updatedUser.lastName}`);
      console.log(`Rol anterior: ${user.role}`);
      console.log(`Nuevo rol: ${colors.bright}${updatedUser.role}${colors.reset}`);
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 13. CLIENTE → COLABORADOR (CON LISTA)
// ============================================================
async function clienteToColaborador() {
  const user = await selectUserFromList('cliente', '🔄 PROMOVER CLIENTE → COLABORADOR');
  
  if (!user) {
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  const confirm = await question(`\n⚠️  ¿Promover a ${colors.bright}${user.firstName} ${user.lastName}${colors.reset} a colaborador? (s/n): `);
  
  if (confirm.toLowerCase() !== 's') {
    console.log('Operación cancelada');
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Promoviendo a colaborador...${colors.reset}`);
    const response = await axios.patch(`${API_BASE_URL}/users/${user.id}`, { role: 'colaborador' }, getAxiosConfig());
    
    if (response.data.success) {
      const updatedUser = response.data.data.user;
      console.log('\n' + colors.green + '✅ Usuario promovido exitosamente!' + colors.reset);
      console.log(`Usuario: ${updatedUser.firstName} ${updatedUser.lastName}`);
      console.log(`Rol anterior: ${colors.blue}cliente${colors.reset}`);
      console.log(`Nuevo rol: ${colors.yellow}colaborador${colors.reset}`);
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 14. COLABORADOR → ADMIN (CON LISTA)
// ============================================================
async function colaboradorToAdmin() {
  const user = await selectUserFromList('colaborador', '🔄 PROMOVER COLABORADOR → ADMIN');
  
  if (!user) {
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  const confirm = await question(`\n⚠️  ¿Promover a ${colors.bright}${user.firstName} ${user.lastName}${colors.reset} a ADMIN? Esta es una acción importante. (s/n): `);
  
  if (confirm.toLowerCase() !== 's') {
    console.log('Operación cancelada');
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Promoviendo a admin...${colors.reset}`);
    const response = await axios.patch(`${API_BASE_URL}/users/${user.id}`, { role: 'admin' }, getAxiosConfig());
    
    if (response.data.success) {
      const updatedUser = response.data.data.user;
      console.log('\n' + colors.green + '✅ Usuario promovido a ADMIN exitosamente!' + colors.reset);
      console.log(`Usuario: ${updatedUser.firstName} ${updatedUser.lastName}`);
      console.log(`Rol anterior: ${colors.yellow}colaborador${colors.reset}`);
      console.log(`Nuevo rol: ${colors.red}admin${colors.reset}`);
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 15. ACTIVAR/DESACTIVAR USUARIO (CON LISTA)
// ============================================================
async function toggleUserActive() {
  const user = await selectUserFromList(null, '🔄 ACTIVAR/DESACTIVAR USUARIO');
  
  if (!user) {
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  console.log(`\nEstado actual: ${user.isActive ? colors.green + 'Activo' : colors.red + 'Inactivo'}${colors.reset}`);
  console.log('\n¿Qué deseas hacer?');
  console.log('  1. Activar');
  console.log('  2. Desactivar');
  
  const choice = await question('Selecciona (1-2): ');
  const isActive = choice === '1';
  
  if ((isActive && user.isActive) || (!isActive && !user.isActive)) {
    console.log(colors.yellow + `⚠️  El usuario ya está ${isActive ? 'activo' : 'inactivo'}` + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  const confirm = await question(`\n⚠️  ¿${isActive ? 'Activar' : 'Desactivar'} a ${user.firstName} ${user.lastName}? (s/n): `);
  
  if (confirm.toLowerCase() !== 's') {
    console.log('Operación cancelada');
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Cambiando estado...${colors.reset}`);
    const response = await axios.patch(`${API_BASE_URL}/users/${user.id}`, { isActive }, getAxiosConfig());
    
    if (response.data.success) {
      const updatedUser = response.data.data.user;
      console.log('\n' + colors.green + '✅ Estado cambiado exitosamente!' + colors.reset);
      console.log(`Usuario: ${updatedUser.firstName} ${updatedUser.lastName}`);
      console.log(`Estado: ${updatedUser.isActive ? colors.green + 'Activo' : colors.red + 'Inactivo'}${colors.reset}`);
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 16. DELETE USER (CON LISTA)
// ============================================================
async function deleteUser() {
  const user = await selectUserFromList(null, '🗑️  ELIMINAR USUARIO');
  
  if (!user) {
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  console.log(colors.red + '\n⚠️  ADVERTENCIA: Esta acción DESACTIVARÁ al usuario' + colors.reset);
  const confirm = await question(colors.red + '¿CONFIRMAR ELIMINACIÓN? (escribe "ELIMINAR"): ' + colors.reset);
  
  if (confirm !== 'ELIMINAR') {
    console.log(colors.yellow + 'Eliminación cancelada' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Enviando DELETE a /api/users/${user.id}...${colors.reset}`);
    const response = await axios.delete(`${API_BASE_URL}/users/${user.id}`, getAxiosConfig());
    
    if (response.data.success) {
      console.log('\n' + colors.green + '✅ Usuario desactivado exitosamente' + colors.reset);
      console.log(`Usuario: ${user.firstName} ${user.lastName}`);
      console.log(response.data.message);
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 17. LIST USERS BY ROLE
// ============================================================
async function listUsersByRole() {
  showHeader('📋 LISTAR USUARIOS POR ROL');
  
  console.log('Roles disponibles:');
  console.log('  1. admin');
  console.log('  2. colaborador');
  console.log('  3. cliente');
  console.log('  4. todos');
  
  const choice = await question('\nSelecciona (1-4): ');
  const roles = ['admin', 'colaborador', 'cliente', null];
  const selectedRole = roles[parseInt(choice) - 1];
  
  try {
    const params = { limit: 100 };
    if (selectedRole) params.role = selectedRole;
    
    console.log(`\n${colors.cyan}Obteniendo usuarios...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/users`, {
      ...getAxiosConfig(),
      params
    });
    
    if (response.data.success) {
      const users = response.data.data.users;
      
      console.log('\n' + colors.green + `✅ ${users.length} usuarios encontrados` + colors.reset + '\n');
      
      // Agrupar por rol
      const byRole = users.reduce((acc, user) => {
        if (!acc[user.role]) acc[user.role] = [];
        acc[user.role].push(user);
        return acc;
      }, {});
      
      Object.keys(byRole).forEach(role => {
        console.log(colors.bright + `\n${role.toUpperCase()} (${byRole[role].length})` + colors.reset);
        console.log('─'.repeat(60));
        
        byRole[role].forEach((user, index) => {
          console.log(`${index + 1}. ${user.firstName} ${user.lastName} - ${user.email}`);
          console.log(`   ID: ${user.id.substring(0, 8)}... | Estado: ${user.isActive ? '✓' : '✗'}`);
        });
      });
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 18. VIEW COMPLETE USER STRUCTURE (CON LISTA)
// ============================================================
async function viewCompleteUserStructure() {
  const user = await selectUserFromList(null, '🔍 VER ESTRUCTURA COMPLETA DE USUARIO');
  
  if (!user) {
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Obteniendo usuario con todas las relaciones...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/users/${user.id}`, getAxiosConfig());
    
    if (response.data.success) {
      const userData = response.data.data.user;
      
      console.log('\n' + colors.green + '✅ Usuario encontrado' + colors.reset);
      console.log(colors.bright + userData.firstName + ' ' + userData.lastName + colors.reset);
      console.log('─'.repeat(60));
      
      // Mostrar estructura completa con formato bonito
      console.log('\n' + colors.cyan + '📋 INFORMACIÓN BÁSICA' + colors.reset);
      console.log(`ID: ${userData.id}`);
      console.log(`Email: ${userData.email}`);
      console.log(`Rol: ${userData.role}`);
      console.log(`Estado: ${userData.isActive ? 'Activo' : 'Inactivo'}`);
      console.log(`Teléfono: ${userData.phone || 'No registrado'}`);
      console.log(`WhatsApp: ${userData.whatsapp || 'No registrado'}`);
      console.log(`Fecha de nacimiento: ${userData.dateOfBirth || 'No registrado'}`);
      
      if (userData.memberships && userData.memberships.length > 0) {
        console.log('\n' + colors.cyan + '💳 MEMBRESÍAS' + colors.reset);
        userData.memberships.forEach((membership, index) => {
          console.log(`${index + 1}. Estado: ${membership.status}`);
          console.log(`   Inicio: ${formatDate(membership.startDate)}`);
          console.log(`   Fin: ${formatDate(membership.endDate)}`);
        });
      }
      
      if (userData.payments && userData.payments.length > 0) {
        console.log('\n' + colors.cyan + '💰 PAGOS RECIENTES' + colors.reset);
        userData.payments.slice(0, 5).forEach((payment, index) => {
          console.log(`${index + 1}. Q${payment.amount} - ${payment.paymentType}`);
          console.log(`   Fecha: ${formatDate(payment.paymentDate)}`);
          console.log(`   Estado: ${payment.status}`);
        });
      }
      
      console.log('\n' + colors.cyan + '📄 ESTRUCTURA JSON COMPLETA' + colors.reset);
      console.log('─'.repeat(60));
      console.log(JSON.stringify(userData, null, 2));
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 19. CHECK SERVER
// ============================================================
async function checkServer() {
  showHeader('🔌 VERIFICAR CONEXIÓN AL SERVIDOR');
  
  try {
    console.log(`Intentando conectar a ${API_BASE_URL}...`);
    const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`, { timeout: 5000 });
    
    console.log(colors.green + '✅ Servidor en línea' + colors.reset);
    console.log('Respuesta:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log(colors.red + '❌ No se pudo conectar al servidor' + colors.reset);
    console.log('Asegúrate de que el servidor esté corriendo en http://localhost:5000');
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n' + colors.yellow + '💡 El servidor parece estar apagado.' + colors.reset);
      console.log('Ejecuta: npm start o node src/server.js');
    }
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 20. LOGOUT
// ============================================================
async function logout() {
  authToken = null;
  currentUser = null;
  console.log(colors.green + '\n✅ Sesión cerrada exitosamente' + colors.reset);
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// ERROR HANDLER
// ============================================================
function handleAPIError(error) {
  console.log(colors.red + '\n❌ ERROR EN LA PETICIÓN' + colors.reset);
  
  if (error.response) {
    console.log(`\nStatus: ${error.response.status}`);
    console.log(`Mensaje: ${error.response.data.message || 'Error desconocido'}`);
    
    if (error.response.status === 401) {
      console.log(colors.yellow + '\n⚠️  Token expirado o inválido. Vuelve a hacer login.' + colors.reset);
      authToken = null;
      currentUser = null;
    }
    
    if (error.response.status === 403) {
      console.log(colors.yellow + '\n⚠️  No tienes permisos para esta acción.' + colors.reset);
      console.log('Solo los ADMIN pueden realizar cambios de rol y actualizaciones.');
    }
    
    console.log('\nRespuesta completa:');
    console.log(JSON.stringify(error.response.data, null, 2));
  } else if (error.request) {
    console.log('\nNo se recibió respuesta del servidor');
    console.log('Asegúrate de que el servidor esté corriendo en http://localhost:5000');
  } else {
    console.log(`\nError: ${error.message}`);
  }
}

// ============================================================
// MAIN LOOP
// ============================================================
async function main() {
  try {
    console.log(colors.bright + colors.cyan + '\n👥 Test de API REST - Usuarios' + colors.reset);
    console.log('Servidor: ' + API_BASE_URL);
    
    if (AUTO_LOGIN.enabled) {
      console.log(colors.cyan + `Login automático: HABILITADO` + colors.reset);
    }
    console.log('');
    
    await autoLoginOnStart();
    
    while (true) {
      const choice = await showMenu();
      
      if (!authToken && choice !== '1' && choice !== '0') {
        console.log(colors.red + '\n❌ Debes hacer login primero (opción 1)' + colors.reset);
        await question('\nPresiona Enter para continuar...');
        continue;
      }
      
      switch (choice) {
        case '1':
          await login();
          break;
        case '2':
          await getAllUsers();
          break;
        case '3':
          await getUserById();
          break;
        case '4':
          await searchUsers();
          break;
        case '5':
          await getUserStats();
          break;
        case '6':
          await getFrequentDailyClients();
          break;
        case '7':
          await createUser();
          break;
        case '8':
          await createUserByRole('admin');
          break;
        case '9':
          await createUserByRole('colaborador');
          break;
        case '10':
          await createUserByRole('cliente');
          break;
        case '11':
          await updateUser();
          break;
        case '12':
          await changeUserRole();
          break;
        case '13':
          await clienteToColaborador();
          break;
        case '14':
          await colaboradorToAdmin();
          break;
        case '15':
          await toggleUserActive();
          break;
        case '16':
          await deleteUser();
          break;
        case '17':
          await listUsersByRole();
          break;
        case '18':
          await viewCompleteUserStructure();
          break;
        case '19':
          await checkServer();
          break;
        case '20':
          await logout();
          break;
        case '0':
          console.log('\n' + colors.bright + '👋 ¡Hasta luego!' + colors.reset + '\n');
          rl.close();
          process.exit(0);
          break;
        default:
          console.log(colors.red + '❌ Opción inválida' + colors.reset);
          await question('\nPresiona Enter para continuar...');
      }
    }
  } catch (error) {
    console.error(colors.red + '\n❌ Error fatal: ' + error.message + colors.reset);
    rl.close();
    process.exit(1);
  }
}

// Ejecutar
if (require.main === module) {
  main();
}

module.exports = { main };