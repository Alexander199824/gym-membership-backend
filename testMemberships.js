// testMemberships.js - Test COMPLETO y FUNCIONAL de Membresías
// Ejecutar con: node testMemberships.js
// NOTA: El servidor debe estar corriendo en http://localhost:5000

const readline = require('readline');
const axios = require('axios');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ✅ CONFIGURACIÓN DE LOGIN AUTOMÁTICO
const AUTO_LOGIN = {
  enabled: true,
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

function formatDateOnly(date) {
  return new Date(date).toLocaleDateString('es-GT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function getAxiosConfig() {
  return {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  };
}

// ============================================================
// 🆕 FUNCIÓN PARA LISTAR Y SELECCIONAR USUARIO CLIENTE
// ============================================================
async function selectClientFromList(title = 'SELECCIONAR CLIENTE') {
  showHeader(title);
  
  try {
    console.log(colors.cyan + 'Obteniendo lista de clientes...' + colors.reset);
    const response = await axios.get(`${API_BASE_URL}/users`, {
      ...getAxiosConfig(),
      params: { role: 'cliente', limit: 100 }
    });
    
    if (!response.data.success || response.data.data.users.length === 0) {
      console.log(colors.yellow + '\n⚠️  No hay clientes disponibles' + colors.reset);
      return null;
    }
    
    const clients = response.data.data.users;
    
    console.log('\n' + colors.green + `✅ ${clients.length} clientes encontrados` + colors.reset + '\n');
    console.log('─'.repeat(70));
    
    clients.forEach((client, index) => {
      const statusIcon = client.isActive ? '✓' : '✗';
      const statusColor = client.isActive ? colors.green : colors.red;
      
      console.log(`${colors.bright}${index + 1}.${colors.reset} ${client.firstName} ${client.lastName}`);
      console.log(`   Email: ${client.email}`);
      console.log(`   Estado: ${statusColor}${statusIcon}${colors.reset} | Teléfono: ${client.phone || 'N/A'}`);
      
      if (client.memberships && client.memberships.length > 0) {
        const activeMembership = client.memberships.find(m => m.status === 'active');
        if (activeMembership) {
          console.log(`   ⚠️  ${colors.yellow}Ya tiene membresía activa${colors.reset}`);
        }
      }
      
      console.log(`   ID: ${client.id.substring(0, 13)}...`);
      console.log('');
    });
    
    console.log('─'.repeat(70));
    console.log(`${colors.cyan}0.${colors.reset} Crear nuevo cliente`);
    const choice = await question('\nSelecciona el número del cliente: ');
    
    if (choice === '0') {
      return await createNewClient();
    }
    
    const selectedIndex = parseInt(choice) - 1;
    
    if (selectedIndex < 0 || selectedIndex >= clients.length) {
      console.log(colors.yellow + '\n⚠️  Selección inválida' + colors.reset);
      return null;
    }
    
    const selectedClient = clients[selectedIndex];
    console.log('\n' + colors.green + `✅ Cliente seleccionado: ${selectedClient.firstName} ${selectedClient.lastName}` + colors.reset);
    
    return selectedClient;
    
  } catch (error) {
    handleAPIError(error);
    return null;
  }
}

// ============================================================
// 🆕 CREAR NUEVO CLIENTE (RÁPIDO)
// ============================================================
async function createNewClient() {
  showHeader('➕ CREAR NUEVO CLIENTE');
  
  const firstName = await question('Nombre: ');
  const lastName = await question('Apellido: ');
  const email = await question('Email: ');
  const phone = await question('Teléfono: ');
  const whatsapp = await question('WhatsApp (opcional): ') || phone;
  
  if (!firstName || !lastName || !email) {
    console.log(colors.red + '❌ Nombre, apellido y email son requeridos' + colors.reset);
    return null;
  }
  
  const clientData = {
    firstName,
    lastName,
    email: email.toLowerCase(),
    phone,
    whatsapp,
    role: 'cliente'
  };
  
  try {
    console.log(`\n${colors.cyan}Creando cliente...${colors.reset}`);
    const response = await axios.post(`${API_BASE_URL}/users`, clientData, getAxiosConfig());
    
    if (response.data.success) {
      const client = response.data.data.user;
      console.log('\n' + colors.green + '✅ Cliente creado exitosamente!' + colors.reset);
      console.log(`Nombre: ${client.firstName} ${client.lastName}`);
      console.log(`Email: ${client.email}`);
      return client;
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
      return null;
    }
  } catch (error) {
    handleAPIError(error);
    return null;
  }
}

// ============================================================
// 🆕 FUNCIÓN PARA LISTAR Y SELECCIONAR MEMBRESÍA
// ============================================================
async function selectMembershipFromList(filterStatus = null, title = 'SELECCIONAR MEMBRESÍA') {
  showHeader(title);
  
  try {
    const params = { limit: 50 };
    if (filterStatus) {
      params.status = filterStatus;
      console.log(colors.cyan + `Filtrando por estado: ${filterStatus}` + colors.reset + '\n');
    }
    
    console.log(colors.cyan + 'Obteniendo lista de membresías...' + colors.reset);
    const response = await axios.get(`${API_BASE_URL}/memberships`, {
      ...getAxiosConfig(),
      params
    });
    
    if (!response.data.success || response.data.data.memberships.length === 0) {
      console.log(colors.yellow + '\n⚠️  No hay membresías disponibles' + colors.reset);
      return null;
    }
    
    const memberships = response.data.data.memberships;
    
    console.log('\n' + colors.green + `✅ ${memberships.length} membresías encontradas` + colors.reset + '\n');
    console.log('─'.repeat(70));
    
    memberships.forEach((membership, index) => {
      const statusColors = {
        active: colors.green,
        pending: colors.yellow,
        expired: colors.red,
        cancelled: colors.red
      };
      
      const typeIcons = {
        daily: '📅',
        monthly: '📆',
        annual: '🗓️'
      };
      
      console.log(`${colors.bright}${index + 1}.${colors.reset} ${membership.user.firstName} ${membership.user.lastName}`);
      console.log(`   Tipo: ${typeIcons[membership.type] || '📋'} ${membership.type}`);
      console.log(`   Estado: ${statusColors[membership.status]}${membership.status}${colors.reset}`);
      console.log(`   Precio: Q${membership.price}`);
      console.log(`   Inicio: ${formatDateOnly(membership.startDate)}`);
      console.log(`   Fin: ${formatDateOnly(membership.endDate)}`);
      
      if (membership.remainingDays !== undefined) {
        console.log(`   Días restantes: ${membership.remainingDays}`);
      }
      
      console.log(`   ID: ${membership.id.substring(0, 13)}...`);
      console.log('');
    });
    
    console.log('─'.repeat(70));
    const choice = await question('\nSelecciona el número de la membresía (0 para cancelar): ');
    
    const selectedIndex = parseInt(choice) - 1;
    
    if (choice === '0' || selectedIndex < 0 || selectedIndex >= memberships.length) {
      console.log(colors.yellow + '\n⚠️  Operación cancelada' + colors.reset);
      return null;
    }
    
    const selectedMembership = memberships[selectedIndex];
    console.log('\n' + colors.green + `✅ Membresía seleccionada para ${selectedMembership.user.firstName} ${selectedMembership.user.lastName}` + colors.reset);
    
    return selectedMembership;
    
  } catch (error) {
    handleAPIError(error);
    return null;
  }
}

async function showMenu() {
  clearScreen();
  showHeader('💳 TEST DE API REST - MEMBRESÍAS');
  
  if (!authToken) {
    console.log(colors.red + '⚠️  NO AUTENTICADO' + colors.reset);
    console.log('\n  1. Login' + (AUTO_LOGIN.enabled ? ' (Automático)' : ''));
    console.log('  0. Salir');
  } else {
    console.log(colors.green + `✅ Autenticado como: ${currentUser?.email || 'Usuario'}` + colors.reset);
    console.log(colors.cyan + `Rol: ${currentUser?.role || 'N/A'}` + colors.reset);
    
    console.log('\n' + colors.blue + '📋 CONSULTAR (GET):' + colors.reset);
    console.log('  2. GET /api/memberships - Ver todas las membresías');
    console.log('  3. GET /api/memberships/:id - Ver membresía por ID (con lista)');
    console.log('  4. GET /api/memberships/plans - Ver planes disponibles');
    console.log('  5. GET /api/memberships/expired - Ver membresías vencidas');
    console.log('  6. GET /api/memberships/expiring-soon - Próximas a vencer');
    console.log('  7. GET /api/memberships/pending-cash-payment - Pendientes de pago');
    console.log('  8. GET /api/memberships/stats - Ver estadísticas');
    
    console.log('\n' + colors.green + '➕ CREAR (POST):' + colors.reset);
    console.log('  9. POST /api/memberships - Crear membresía (seleccionar cliente)');
    console.log('  10. POST /api/memberships/purchase - Comprar membresía (cliente)');
    
    console.log('\n' + colors.yellow + '✏️  ACTUALIZAR (PATCH):' + colors.reset);
    console.log('  11. PATCH /api/memberships/:id - Actualizar membresía (con lista)');
    console.log('  12. POST /api/memberships/:id/renew - Renovar membresía (con lista)');
    console.log('  13. PATCH /api/memberships/:id/schedule - Cambiar horarios (con lista)');
    
    console.log('\n' + colors.red + '🗑️  ELIMINAR/CANCELAR (DELETE/POST):' + colors.reset);
    console.log('  14. POST /api/memberships/:id/cancel - Cancelar membresía (con lista)');
    
    console.log('\n' + colors.magenta + '🔧 OPERACIONES ESPECIALES:' + colors.reset);
    console.log('  15. Ver detalle completo de membresía (con lista)');
    console.log('  16. Ver historial de pagos de membresía (con lista)');
    console.log('  17. Listar membresías por estado');
    console.log('  18. Buscar membresías de un cliente específico');
    
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
// 1. LOGIN
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
        console.log(colors.red + '❌ Error: No se pudo extraer token o usuario' + colors.reset);
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
        await question('\nPresiona Enter para continuar...');
      }
    } catch (error) {
      console.log(colors.red + '❌ Error en autenticación automática: ' + error.message + colors.reset);
      await question('\nPresiona Enter para continuar...');
    }
  }
}

// ============================================================
// 2. GET ALL MEMBERSHIPS
// ============================================================
async function getAllMemberships() {
  showHeader('📋 GET /api/memberships - TODAS LAS MEMBRESÍAS');
  
  console.log('Parámetros opcionales:');
  const page = await question('Página (default: 1): ') || '1';
  const limit = await question('Límite (default: 20): ') || '20';
  
  console.log('\nFiltros opcionales:');
  console.log('Estados: active, pending, expired, cancelled');
  const status = await question('Filtrar por estado: ');
  
  console.log('Tipos: daily, monthly, annual');
  const type = await question('Filtrar por tipo: ');
  
  const search = await question('Buscar cliente (nombre/email): ');
  
  try {
    const params = { page, limit };
    if (status) params.status = status;
    if (type) params.type = type;
    if (search) params.search = search;
    
    console.log(`\n${colors.cyan}Enviando GET a /api/memberships...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/memberships`, {
      ...getAxiosConfig(),
      params
    });
    
    if (response.data.success) {
      const memberships = response.data.data.memberships;
      const pagination = response.data.data.pagination;
      
      console.log('\n' + colors.green + '✅ Respuesta exitosa' + colors.reset);
      console.log(`Total de membresías: ${pagination.total}`);
      console.log(`Página ${pagination.page} de ${pagination.pages}`);
      console.log(`Mostrando ${memberships.length} membresías:\n`);
      
      memberships.forEach((membership, index) => {
        const statusColors = {
          active: colors.green,
          pending: colors.yellow,
          expired: colors.red,
          cancelled: colors.red
        };
        
        console.log(`${index + 1}. ${colors.bright}${membership.user.firstName} ${membership.user.lastName}${colors.reset}`);
        console.log(`   Cliente: ${membership.user.email}`);
        console.log(`   Estado: ${statusColors[membership.status]}${membership.status}${colors.reset}`);
        console.log(`   Tipo: ${membership.type} | Precio: Q${membership.price}`);
        console.log(`   Inicio: ${formatDateOnly(membership.startDate)}`);
        console.log(`   Fin: ${formatDateOnly(membership.endDate)}`);
        
        if (membership.remainingDays !== undefined) {
          console.log(`   Días restantes: ${membership.remainingDays}`);
        }
        
        console.log(`   ID: ${membership.id.substring(0, 8)}...`);
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
// 3. GET MEMBERSHIP BY ID
// ============================================================
async function getMembershipById() {
  const membership = await selectMembershipFromList(null, '🔍 BUSCAR MEMBRESÍA POR ID');
  
  if (!membership) {
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Enviando GET a /api/memberships/${membership.id}...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/memberships/${membership.id}`, getAxiosConfig());
    
    if (response.data.success) {
      const membershipData = response.data.data.membership;
      
      console.log('\n' + colors.green + '✅ Membresía encontrada' + colors.reset);
      console.log(colors.bright + 'DETALLES COMPLETOS' + colors.reset);
      console.log('─'.repeat(60));
      console.log(JSON.stringify(membershipData, null, 2));
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 4. GET MEMBERSHIP PLANS
// ============================================================
async function getMembershipPlans() {
  showHeader('📋 GET /api/memberships/plans - PLANES DISPONIBLES');
  
  try {
    console.log(`\n${colors.cyan}Enviando GET a /api/memberships/plans...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/memberships/plans`, getAxiosConfig());
    
    if (response.data.success) {
      const plans = response.data.data;
      
      console.log('\n' + colors.green + `✅ ${plans.length} planes disponibles` + colors.reset + '\n');
      
      plans.forEach((plan, index) => {
        console.log(`${colors.bright}${index + 1}. ${plan.name}${colors.reset}`);
        console.log(`   Precio: ${colors.green}Q${plan.price}${colors.reset}`);
        if (plan.originalPrice && plan.originalPrice !== plan.price) {
          console.log(`   Precio original: Q${plan.originalPrice} (${plan.discountPercentage}% descuento)`);
        }
        console.log(`   Duración: ${plan.duration}`);
        console.log(`   Popular: ${plan.popular ? '⭐ Sí' : 'No'}`);
        console.log(`   Estado: ${plan.active ? colors.green + 'Activo' : colors.red + 'Inactivo'}${colors.reset}`);
        
        if (plan.features && plan.features.length > 0) {
          console.log('   Características:');
          plan.features.slice(0, 3).forEach(feature => {
            console.log(`     • ${feature}`);
          });
        }
        
        console.log(`   ID: ${plan.id}`);
        console.log('');
      });
      
      console.log('Respuesta completa:');
      console.log(JSON.stringify(plans, null, 2));
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 5. GET EXPIRED MEMBERSHIPS
// ============================================================
async function getExpiredMemberships() {
  showHeader('⚠️  GET /api/memberships/expired - MEMBRESÍAS VENCIDAS');
  
  console.log('Filtros opcionales:');
  const days = await question('Días vencidas (0=hoy, 7=última semana, default: 0): ') || '0';
  
  try {
    console.log(`\n${colors.cyan}Enviando GET a /api/memberships/expired...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/memberships/expired`, {
      ...getAxiosConfig(),
      params: { days }
    });
    
    if (response.data.success) {
      const memberships = response.data.data.memberships;
      const total = response.data.data.total;
      
      console.log('\n' + colors.green + `✅ ${total} membresías vencidas` + colors.reset);
      console.log(`Filtro: ${days === '0' ? 'Vencen hoy' : `Vencidas hace ${days} días o menos`}\n`);
      
      if (memberships.length > 0) {
        memberships.forEach((membership, index) => {
          console.log(`${index + 1}. ${colors.bright}${membership.user.firstName} ${membership.user.lastName}${colors.reset}`);
          console.log(`   Email: ${membership.user.email}`);
          console.log(`   Teléfono: ${membership.user.phone || 'N/A'}`);
          console.log(`   WhatsApp: ${membership.user.whatsapp || 'N/A'}`);
          console.log(`   Tipo: ${membership.type}`);
          console.log(`   Fecha vencimiento: ${colors.red}${formatDateOnly(membership.endDate)}${colors.reset}`);
          console.log(`   ID: ${membership.id.substring(0, 8)}...`);
          console.log('');
        });
      } else {
        console.log(colors.cyan + 'No hay membresías vencidas en este rango' + colors.reset);
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
// 6. GET EXPIRING SOON
// ============================================================
async function getExpiringSoonMemberships() {
  showHeader('⏰ GET /api/memberships/expiring-soon - PRÓXIMAS A VENCER');
  
  const days = await question('Días hacia adelante (default: 7): ') || '7';
  
  try {
    console.log(`\n${colors.cyan}Enviando GET a /api/memberships/expiring-soon...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/memberships/expiring-soon`, {
      ...getAxiosConfig(),
      params: { days }
    });
    
    if (response.data.success) {
      const memberships = response.data.data.memberships;
      const total = response.data.data.total;
      
      console.log('\n' + colors.green + `✅ ${total} membresías próximas a vencer` + colors.reset);
      console.log(`Filtro: Próximos ${days} días\n`);
      
      if (memberships.length > 0) {
        memberships.forEach((membership, index) => {
          const daysLeft = Math.ceil((new Date(membership.endDate) - new Date()) / (1000 * 60 * 60 * 24));
          
          console.log(`${index + 1}. ${colors.bright}${membership.user.firstName} ${membership.user.lastName}${colors.reset}`);
          console.log(`   Email: ${membership.user.email}`);
          console.log(`   Tipo: ${membership.type}`);
          console.log(`   Vence en: ${colors.yellow}${daysLeft} día(s)${colors.reset}`);
          console.log(`   Fecha: ${formatDateOnly(membership.endDate)}`);
          console.log(`   Contacto: ${membership.user.whatsapp || membership.user.phone || 'N/A'}`);
          console.log('');
        });
      } else {
        console.log(colors.cyan + 'No hay membresías próximas a vencer' + colors.reset);
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
// 7. GET PENDING CASH PAYMENT
// ============================================================
async function getPendingCashPaymentMemberships() {
  showHeader('💵 GET /api/memberships/pending-cash-payment - PENDIENTES DE PAGO');
  
  try {
    console.log(`\n${colors.cyan}Enviando GET a /api/memberships/pending-cash-payment...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/memberships/pending-cash-payment`, getAxiosConfig());
    
    if (response.data.success) {
      const memberships = response.data.data.memberships;
      const total = response.data.data.total;
      
      console.log('\n' + colors.green + `✅ ${total} membresías pendientes de pago en efectivo` + colors.reset + '\n');
      
      if (memberships.length > 0) {
        memberships.forEach((membership, index) => {
          console.log(`${index + 1}. ${colors.bright}${membership.user.name}${colors.reset}`);
          console.log(`   Email: ${membership.user.email}`);
          console.log(`   Teléfono: ${membership.user.phone || 'N/A'}`);
          console.log(`   Plan: ${membership.plan.name}`);
          console.log(`   Precio: ${colors.yellow}Q${membership.price}${colors.reset}`);
          console.log(`   Tiempo esperando: ${colors.yellow}${membership.hoursWaiting.toFixed(1)} horas${colors.reset}`);
          console.log(`   Creada: ${formatDate(membership.createdAt)}`);
          console.log(`   ID: ${membership.id.substring(0, 8)}...`);
          console.log('');
        });
      } else {
        console.log(colors.cyan + '✅ No hay membresías pendientes de pago' + colors.reset);
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
// 8. GET MEMBERSHIP STATS
// ============================================================
async function getMembershipStats() {
  showHeader('📊 GET /api/memberships/stats - ESTADÍSTICAS');
  
  try {
    console.log(`\n${colors.cyan}Enviando GET a /api/memberships/stats...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/memberships/stats`, getAxiosConfig());
    
    if (response.data.success) {
      const stats = response.data.data;
      
      console.log('\n' + colors.green + '✅ Estadísticas obtenidas' + colors.reset + '\n');
      
      if (stats.role === 'admin') {
        console.log(colors.bright + 'ESTADÍSTICAS GENERALES (ADMIN)' + colors.reset);
        console.log('─'.repeat(60));
        console.log(`Membresías activas: ${colors.green}${stats.activeMemberships}${colors.reset}`);
        console.log(`Próximas a vencer esta semana: ${colors.yellow}${stats.expiringThisWeek}${colors.reset}`);
        console.log(`Vencidas sin renovar: ${colors.red}${stats.expiredMemberships}${colors.reset}`);
        console.log(`Ingresos mensuales: ${colors.green}Q${stats.monthlyIncome}${colors.reset}`);
        
        if (stats.membershipsByType) {
          console.log('\nDistribución por tipo:');
          Object.keys(stats.membershipsByType).forEach(type => {
            console.log(`  ${type}: ${stats.membershipsByType[type]}`);
          });
        }
      } else if (stats.role === 'colaborador') {
        console.log(colors.bright + 'ESTADÍSTICAS DE COLABORADOR' + colors.reset);
        console.log('─'.repeat(60));
        console.log(`Membresías activas: ${stats.activeMemberships}`);
        console.log(`Próximas a vencer: ${stats.expiringThisWeek}`);
        console.log(`Vencidas: ${stats.expiredMemberships}`);
        
        if (stats.membershipsByType) {
          console.log('\nDistribución por tipo:');
          Object.keys(stats.membershipsByType).forEach(type => {
            console.log(`  ${type}: ${stats.membershipsByType[type]}`);
          });
        }
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
// 9. CREATE MEMBERSHIP - CORREGIDO COMPLETAMENTE
// ============================================================
async function createMembership() {
  showHeader('➕ POST /api/memberships - CREAR MEMBRESÍA');
  
  // Paso 1: Seleccionar o crear cliente
  console.log(colors.cyan + 'Paso 1: Seleccionar cliente\n' + colors.reset);
  const client = await selectClientFromList('SELECCIONAR CLIENTE PARA LA MEMBRESÍA');
  
  if (!client) {
    console.log(colors.red + '❌ No se seleccionó cliente' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  // Paso 2: Obtener planes de la base de datos (con durationType correcto)
  console.log(`\n${colors.cyan}Paso 2: Obtener planes disponibles\n${colors.reset}`);
  
  try {
    // ✅ Usar endpoint de planes activos del modelo MembershipPlans
    const plansResponse = await axios.get(`${API_BASE_URL}/membership-plans/active`, getAxiosConfig());
    
    if (!plansResponse.data.success) {
      console.log(colors.red + '❌ No se pudieron obtener los planes' + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const plans = plansResponse.data.data;
    
    if (!plans || plans.length === 0) {
      console.log(colors.red + '❌ No hay planes activos disponibles' + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    console.log('Planes disponibles:');
    plans.forEach((plan, index) => {
      console.log(`${index + 1}. ${plan.name} - Q${plan.price} (${plan.duration})`);
    });
    
    const planChoice = await question('\nSelecciona el plan (1-' + plans.length + '): ');
    const selectedPlan = plans[parseInt(planChoice) - 1];
    
    if (!selectedPlan) {
      console.log(colors.red + '❌ Plan inválido' + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    // ✅ Obtener el plan completo de la base de datos para tener el durationType correcto
    const planDetailResponse = await axios.get(
      `${API_BASE_URL}/membership-plans/${selectedPlan.id}`, 
      getAxiosConfig()
    );
    
    let durationType = 'monthly'; // default
    
    if (planDetailResponse.data.success) {
      const planDetail = planDetailResponse.data.data.plan;
      durationType = planDetail.durationType || 'monthly';
      console.log(`\n✅ Tipo de duración obtenido: ${durationType}`);
    }
    
    // Paso 3: Configurar fechas
    console.log(`\n${colors.cyan}Paso 3: Configurar fechas${colors.reset}`);
    console.log(`Plan seleccionado: ${selectedPlan.name}`);
    
    const startDateInput = await question('Fecha de inicio (YYYY-MM-DD, Enter para hoy): ');
    const startDate = startDateInput || new Date().toISOString().split('T')[0];
    
    const endDateInput = await question('Fecha de fin (YYYY-MM-DD, Enter para calcular automáticamente): ');
    let endDate = endDateInput;
    
    if (!endDate) {
      // Calcular fecha de fin según el tipo de plan
      const start = new Date(startDate);
      const durationDays = {
        'daily': 1,
        'weekly': 7,
        'monthly': 30,
        'quarterly': 90,
        'annual': 365
      };
      
      const days = durationDays[durationType] || 30;
      const end = new Date(start);
      end.setDate(end.getDate() + days);
      endDate = end.toISOString().split('T')[0];
    }
    
    console.log(`\nFecha inicio: ${startDate}`);
    console.log(`Fecha fin: ${endDate}`);
    
    // Paso 4: Información adicional
    console.log(`\n${colors.cyan}Paso 4: Información adicional (opcional)${colors.reset}`);
    const notes = await question('Notas: ');
    const autoRenew = await question('Auto-renovar (s/n): ');
    
    // ✅ DATOS CORRECTOS SEGÚN EL VALIDADOR
    const membershipData = {
      userId: client.id,
      planId: selectedPlan.id,
      type: durationType, // ✅ Tipo correcto desde la BD
      price: parseFloat(selectedPlan.price),
      startDate,
      endDate,
      notes: notes || undefined,
      autoRenew: autoRenew.toLowerCase() === 's'
    };
    
    console.log('\n' + colors.cyan + 'Datos a enviar:' + colors.reset);
    console.log(JSON.stringify(membershipData, null, 2));
    
    const confirm = await question('\n¿Confirmar creación? (s/n): ');
    
    if (confirm.toLowerCase() !== 's') {
      console.log('Operación cancelada');
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    console.log(`\n${colors.cyan}Enviando POST a /api/memberships...${colors.reset}`);
    const response = await axios.post(`${API_BASE_URL}/memberships`, membershipData, getAxiosConfig());
    
    if (response.data.success) {
      const membership = response.data.data.membership;
      
      console.log('\n' + colors.green + '✅ Membresía creada exitosamente!' + colors.reset);
      console.log(`ID: ${membership.id}`);
      console.log(`Cliente: ${membership.user.firstName} ${membership.user.lastName}`);
      console.log(`Tipo: ${membership.type}`);
      console.log(`Estado: ${membership.status}`);
      console.log(`Precio: Q${membership.price}`);
      console.log(`Inicio: ${formatDateOnly(membership.startDate)}`);
      console.log(`Fin: ${formatDateOnly(membership.endDate)}`);
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 10. PURCHASE MEMBERSHIP
// ============================================================
async function purchaseMembership() {
  showHeader('🛒 POST /api/memberships/purchase - COMPRAR MEMBRESÍA');
  
  console.log(colors.yellow + 'Esta opción simula la compra desde la perspectiva del cliente' + colors.reset);
  
  try {
    const plansResponse = await axios.get(`${API_BASE_URL}/memberships/plans`, getAxiosConfig());
    
    if (!plansResponse.data.success) {
      console.log(colors.red + '❌ No se pudieron obtener los planes' + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const plans = plansResponse.data.data;
    
    console.log('\nPlanes disponibles para compra:');
    plans.forEach((plan, index) => {
      console.log(`${index + 1}. ${plan.name} - ${colors.green}Q${plan.price}${colors.reset} (${plan.duration})`);
      if (plan.features && plan.features.length > 0) {
        console.log(`   Características: ${plan.features.slice(0, 2).join(', ')}`);
      }
    });
    
    const planChoice = await question('\nSelecciona el plan: ');
    const selectedPlan = plans[parseInt(planChoice) - 1];
    
    if (!selectedPlan) {
      console.log(colors.red + '❌ Plan inválido' + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    console.log(`\nPlan seleccionado: ${selectedPlan.name} - Q${selectedPlan.price}`);
    
    console.log('\nMétodos de pago:');
    console.log('  1. cash (Efectivo en gimnasio)');
    console.log('  2. card (Tarjeta)');
    console.log('  3. transfer (Transferencia)');
    
    const paymentChoice = await question('Selecciona método (1-3): ');
    const paymentMethods = ['cash', 'card', 'transfer'];
    const paymentMethod = paymentMethods[parseInt(paymentChoice) - 1] || 'cash';
    
    const purchaseData = {
      planId: selectedPlan.id,
      selectedSchedule: {},
      paymentMethod,
      notes: 'Compra desde test'
    };
    
    console.log('\nDatos de compra:');
    console.log(JSON.stringify(purchaseData, null, 2));
    
    const confirm = await question('\n¿Confirmar compra? (s/n): ');
    
    if (confirm.toLowerCase() !== 's') {
      console.log('Compra cancelada');
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    console.log(`\n${colors.cyan}Enviando POST a /api/memberships/purchase...${colors.reset}`);
    const response = await axios.post(`${API_BASE_URL}/memberships/purchase`, purchaseData, getAxiosConfig());
    
    if (response.data.success) {
      const result = response.data.data;
      
      console.log('\n' + colors.green + '✅ Compra procesada!' + colors.reset);
      console.log(colors.cyan + response.data.message + colors.reset);
      
      if (result.membership) {
        console.log('\nDetalles de membresía:');
        console.log(`ID: ${result.membership.id}`);
        console.log(`Estado: ${result.membership.status}`);
        console.log(`Inicio: ${formatDateOnly(result.membership.startDate)}`);
        console.log(`Fin: ${formatDateOnly(result.membership.endDate)}`);
      }
      
      if (result.payment) {
        console.log('\nDetalles de pago:');
        console.log(`ID: ${result.payment.id}`);
        console.log(`Monto: Q${result.payment.amount}`);
        console.log(`Método: ${result.payment.paymentMethod}`);
        console.log(`Estado: ${result.payment.status}`);
      }
      
      if (result.requiresCashPayment) {
        console.log('\n' + colors.yellow + '⚠️  IMPORTANTE: Debes completar el pago en efectivo en el gimnasio' + colors.reset);
      }
      
      if (result.requiresTransferProof) {
        console.log('\n' + colors.yellow + '⚠️  IMPORTANTE: Debes subir el comprobante de transferencia' + colors.reset);
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
// 11. UPDATE MEMBERSHIP
// ============================================================
async function updateMembership() {
  const membership = await selectMembershipFromList('active', '✏️  ACTUALIZAR MEMBRESÍA');
  
  if (!membership) {
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  console.log('\nCampos actualizables (deja en blanco para mantener):\n');
  
  console.log('Estados: active, pending, expired, cancelled');
  const status = await question(`Estado (actual: ${membership.status}): `);
  
  const price = await question(`Precio (actual: Q${membership.price}): `);
  const notes = await question('Notas adicionales: ');
  
  const updateData = {};
  if (status) updateData.status = status;
  if (price) updateData.price = parseFloat(price);
  if (notes) updateData.notes = notes;
  
  if (Object.keys(updateData).length === 0) {
    console.log(colors.yellow + '⚠️  No se especificaron cambios' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Enviando PATCH a /api/memberships/${membership.id}...${colors.reset}`);
    console.log('Datos:', JSON.stringify(updateData, null, 2));
    
    const response = await axios.patch(`${API_BASE_URL}/memberships/${membership.id}`, updateData, getAxiosConfig());
    
    if (response.data.success) {
      console.log('\n' + colors.green + '✅ Membresía actualizada exitosamente!' + colors.reset);
      console.log(JSON.stringify(response.data.data.membership, null, 2));
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 12. RENEW MEMBERSHIP
// ============================================================
async function renewMembership() {
  const membership = await selectMembershipFromList(null, '🔄 RENOVAR MEMBRESÍA');
  
  if (!membership) {
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  console.log(`\nMembresía actual:`);
  console.log(`Cliente: ${membership.user.firstName} ${membership.user.lastName}`);
  console.log(`Estado: ${membership.status}`);
  console.log(`Fecha fin actual: ${formatDateOnly(membership.endDate)}`);
  
  const months = await question('\nMeses a agregar (default: 1): ') || '1';
  const price = await question('Precio de renovación (opcional): ');
  
  const renewData = { months: parseInt(months) };
  if (price) renewData.price = parseFloat(price);
  
  const confirm = await question(`\n¿Renovar por ${months} mes(es)? (s/n): `);
  
  if (confirm.toLowerCase() !== 's') {
    console.log('Renovación cancelada');
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Enviando POST a /api/memberships/${membership.id}/renew...${colors.reset}`);
    const response = await axios.post(`${API_BASE_URL}/memberships/${membership.id}/renew`, renewData, getAxiosConfig());
    
    if (response.data.success) {
      const result = response.data.data;
      
      console.log('\n' + colors.green + '✅ Membresía renovada exitosamente!' + colors.reset);
      console.log(`Meses agregados: ${result.monthsAdded}`);
      console.log(`Nueva fecha fin: ${formatDateOnly(result.newEndDate)}`);
      console.log(`Estado: ${result.membership.status}`);
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 13. CHANGE SCHEDULE
// ============================================================
async function changeMembershipSchedule() {
  const membership = await selectMembershipFromList('active', '📅 CAMBIAR HORARIOS DE MEMBRESÍA');
  
  if (!membership) {
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  console.log(`\nMembresía: ${membership.user.firstName} ${membership.user.lastName}`);
  console.log('Para cambiar horarios, necesitas especificar el formato JSON');
  console.log('Ejemplo: { "monday": [1, 2], "wednesday": [3] }');
  
  const scheduleInput = await question('\nIngresa nuevo horario (JSON) o Enter para omitir: ');
  
  if (!scheduleInput) {
    console.log('Operación cancelada');
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    let selectedSchedule;
    try {
      selectedSchedule = JSON.parse(scheduleInput);
    } catch (parseError) {
      console.log(colors.red + '❌ Error: JSON inválido' + colors.reset);
      console.log('Detalle:', parseError.message);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const scheduleData = {
      selectedSchedule,
      replaceAll: true
    };
    
    console.log('\nDatos a enviar:');
    console.log(JSON.stringify(scheduleData, null, 2));
    
    const confirm = await question('\n¿Confirmar cambio de horarios? (s/n): ');
    
    if (confirm.toLowerCase() !== 's') {
      console.log('Cambio cancelado');
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    console.log(`\n${colors.cyan}Enviando PATCH a /api/memberships/${membership.id}/schedule...${colors.reset}`);
    const response = await axios.patch(`${API_BASE_URL}/memberships/${membership.id}/schedule`, scheduleData, getAxiosConfig());
    
    if (response.data.success) {
      console.log('\n' + colors.green + '✅ Horarios actualizados exitosamente!' + colors.reset);
      console.log(JSON.stringify(response.data.data, null, 2));
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 14. CANCEL MEMBERSHIP
// ============================================================
async function cancelMembership() {
  const membership = await selectMembershipFromList('active', '🗑️  CANCELAR MEMBRESÍA');
  
  if (!membership) {
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  console.log(`\n${colors.red}⚠️  ADVERTENCIA: Esta acción cancelará la membresía${colors.reset}`);
  console.log(`Cliente: ${membership.user.firstName} ${membership.user.lastName}`);
  console.log(`Tipo: ${membership.type}`);
  console.log(`Estado actual: ${membership.status}`);
  
  const reason = await question('\nMotivo de cancelación: ');
  
  const confirm = await question(colors.red + '\n¿CONFIRMAR CANCELACIÓN? (escribe "CANCELAR"): ' + colors.reset);
  
  if (confirm !== 'CANCELAR') {
    console.log(colors.yellow + 'Cancelación abortada' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Enviando POST a /api/memberships/${membership.id}/cancel...${colors.reset}`);
    const response = await axios.post(`${API_BASE_URL}/memberships/${membership.id}/cancel`, { reason }, getAxiosConfig());
    
    if (response.data.success) {
      console.log('\n' + colors.green + '✅ Membresía cancelada exitosamente' + colors.reset);
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
// 15-18. OPERACIONES ESPECIALES (sin cambios - funcionan correctamente)
// ============================================================
async function viewCompleteMembershipDetails() {
  const membership = await selectMembershipFromList(null, '🔍 VER DETALLE COMPLETO DE MEMBRESÍA');
  
  if (!membership) {
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Obteniendo membresía completa...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/memberships/${membership.id}`, getAxiosConfig());
    
    if (response.data.success) {
      const membershipData = response.data.data.membership;
      
      console.log('\n' + colors.green + '✅ Membresía encontrada' + colors.reset);
      console.log(colors.bright + `${membershipData.user.firstName} ${membershipData.user.lastName}` + colors.reset);
      console.log('─'.repeat(60));
      console.log(JSON.stringify(membershipData, null, 2));
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

async function viewMembershipPayments() {
  const membership = await selectMembershipFromList(null, '💰 VER HISTORIAL DE PAGOS');
  
  if (!membership) {
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Obteniendo historial de pagos...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/memberships/${membership.id}`, getAxiosConfig());
    
    if (response.data.success) {
      const membershipData = response.data.data.membership;
      
      if (membershipData.payments && membershipData.payments.length > 0) {
        console.log('\n' + colors.green + `✅ ${membershipData.payments.length} pagos encontrados` + colors.reset);
        console.log(`Membresía de: ${membershipData.user.firstName} ${membershipData.user.lastName}\n`);
        
        let totalAmount = 0;
        
        membershipData.payments.forEach((payment, index) => {
          const statusColors = {
            completed: colors.green,
            pending: colors.yellow,
            failed: colors.red,
            cancelled: colors.red
          };
          
          console.log(`${index + 1}. ${colors.bright}Q${payment.amount}${colors.reset}`);
          console.log(`   Tipo: ${payment.paymentType}`);
          console.log(`   Estado: ${statusColors[payment.status]}${payment.status}${colors.reset}`);
          console.log(`   Método: ${payment.paymentMethod}`);
          console.log(`   Fecha: ${formatDate(payment.paymentDate)}`);
          console.log('');
          
          if (payment.status === 'completed') {
            totalAmount += parseFloat(payment.amount);
          }
        });
        
        console.log('─'.repeat(60));
        console.log(`${colors.bright}Total pagado: ${colors.green}Q${totalAmount.toFixed(2)}${colors.reset}`);
      } else {
        console.log(colors.yellow + '\n⚠️  No hay pagos registrados' + colors.reset);
      }
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

async function listMembershipsByStatus() {
  showHeader('📋 LISTAR MEMBRESÍAS POR ESTADO');
  
  console.log('Estados disponibles:');
  console.log('  1. active');
  console.log('  2. pending');
  console.log('  3. expired');
  console.log('  4. cancelled');
  console.log('  5. todas');
  
  const choice = await question('\nSelecciona (1-5): ');
  const statuses = ['active', 'pending', 'expired', 'cancelled', null];
  const selectedStatus = statuses[parseInt(choice) - 1];
  
  try {
    const params = { limit: 100 };
    if (selectedStatus) params.status = selectedStatus;
    
    console.log(`\n${colors.cyan}Obteniendo membresías...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/memberships`, {
      ...getAxiosConfig(),
      params
    });
    
    if (response.data.success) {
      const memberships = response.data.data.memberships;
      
      console.log('\n' + colors.green + `✅ ${memberships.length} membresías encontradas` + colors.reset + '\n');
      
      const byStatus = memberships.reduce((acc, membership) => {
        if (!acc[membership.status]) acc[membership.status] = [];
        acc[membership.status].push(membership);
        return acc;
      }, {});
      
      Object.keys(byStatus).forEach(status => {
        const statusColors = {
          active: colors.green,
          pending: colors.yellow,
          expired: colors.red,
          cancelled: colors.red
        };
        
        console.log(colors.bright + `\n${status.toUpperCase()} (${byStatus[status].length})` + colors.reset);
        console.log('─'.repeat(60));
        
        byStatus[status].forEach((membership, index) => {
          console.log(`${index + 1}. ${membership.user.firstName} ${membership.user.lastName}`);
          console.log(`   Tipo: ${membership.type} | Precio: Q${membership.price}`);
          console.log(`   Fin: ${formatDateOnly(membership.endDate)}`);
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

async function searchMembershipsByClient() {
  showHeader('🔍 BUSCAR MEMBRESÍAS DE UN CLIENTE');
  
  const client = await selectClientFromList('SELECCIONAR CLIENTE');
  
  if (!client) {
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Buscando membresías de ${client.firstName} ${client.lastName}...${colors.reset}`);
    
    const response = await axios.get(`${API_BASE_URL}/memberships`, {
      ...getAxiosConfig(),
      params: { userId: client.id, limit: 50 }
    });
    
    if (response.data.success) {
      const memberships = response.data.data.memberships;
      
      console.log('\n' + colors.green + `✅ ${memberships.length} membresías encontradas` + colors.reset);
      console.log(`Cliente: ${client.firstName} ${client.lastName}\n`);
      
      if (memberships.length > 0) {
        memberships.forEach((membership, index) => {
          const statusColors = {
            active: colors.green,
            pending: colors.yellow,
            expired: colors.red,
            cancelled: colors.red
          };
          
          console.log(`${index + 1}. ${colors.bright}${membership.type}${colors.reset}`);
          console.log(`   Estado: ${statusColors[membership.status]}${membership.status}${colors.reset}`);
          console.log(`   Precio: Q${membership.price}`);
          console.log(`   Inicio: ${formatDateOnly(membership.startDate)}`);
          console.log(`   Fin: ${formatDateOnly(membership.endDate)}`);
          console.log('');
        });
      } else {
        console.log(colors.yellow + 'Este cliente no tiene membresías registradas' + colors.reset);
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
    }
    
    if (error.response.status === 400) {
      console.log(colors.yellow + '\n⚠️  Datos inválidos o faltantes.' + colors.reset);
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
    console.log(colors.bright + colors.cyan + '\n💳 Test de API REST - Membresías' + colors.reset);
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
        case '1': await login(); break;
        case '2': await getAllMemberships(); break;
        case '3': await getMembershipById(); break;
        case '4': await getMembershipPlans(); break;
        case '5': await getExpiredMemberships(); break;
        case '6': await getExpiringSoonMemberships(); break;
        case '7': await getPendingCashPaymentMemberships(); break;
        case '8': await getMembershipStats(); break;
        case '9': await createMembership(); break;
        case '10': await purchaseMembership(); break;
        case '11': await updateMembership(); break;
        case '12': await renewMembership(); break;
        case '13': await changeMembershipSchedule(); break;
        case '14': await cancelMembership(); break;
        case '15': await viewCompleteMembershipDetails(); break;
        case '16': await viewMembershipPayments(); break;
        case '17': await listMembershipsByStatus(); break;
        case '18': await searchMembershipsByClient(); break;
        case '19': await checkServer(); break;
        case '20': await logout(); break;
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