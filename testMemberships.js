// testMemberships.js - Test COMPLETO con Gestión de Pagos Pendientes
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
// FUNCIONES AUXILIARES
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
    
    console.log('\n' + colors.yellow + '💰 GESTIÓN DE PAGOS PENDIENTES (Admin):' + colors.reset);
    console.log('  21. Dashboard de pagos pendientes');
    console.log('  22. Confirmar pago en efectivo (activar membresía)');
    console.log('  23. Validar comprobante de transferencia');
    console.log('  24. Rechazar comprobante de transferencia');
    
    console.log('\n' + colors.cyan + '⚙️  SISTEMA:' + colors.reset);
    console.log('  25. Verificar conexión al servidor');
    console.log('  26. Logout');
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
      }
    }
  } catch (error) {
    console.log(colors.red + '❌ Error de conexión' + colors.reset);
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
      }
    } catch (error) {
      console.log(colors.red + '❌ Error en autenticación automática' + colors.reset);
      await question('\nPresiona Enter para continuar...');
    }
  }
}

// ============================================================
// 2-8. CONSULTAR (implementaciones completas)
// ============================================================
async function getAllMemberships() {
  showHeader('📋 GET /api/memberships - TODAS LAS MEMBRESÍAS');
  
  const page = await question('Página (default: 1): ') || '1';
  const limit = await question('Límite (default: 20): ') || '20';
  
  console.log('\nFiltros opcionales:');
  console.log('Estados: active, pending, expired, cancelled');
  const status = await question('Filtrar por estado: ');
  
  console.log('Tipos: daily, monthly, annual');
  const type = await question('Filtrar por tipo: ');
  
  try {
    const params = { page, limit };
    if (status) params.status = status;
    if (type) params.type = type;
    
    console.log(`\n${colors.cyan}Enviando GET a /api/memberships...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/memberships`, {
      ...getAxiosConfig(),
      params
    });
    
    if (response.data.success) {
      const memberships = response.data.data.memberships;
      const pagination = response.data.data.pagination;
      
      console.log('\n' + colors.green + '✅ Respuesta exitosa' + colors.reset);
      console.log(`Total: ${pagination.total} | Página ${pagination.page} de ${pagination.pages}`);
      console.log(`Mostrando ${memberships.length} membresías:\n`);
      
      memberships.forEach((membership, index) => {
        const statusColors = {
          active: colors.green,
          pending: colors.yellow,
          expired: colors.red,
          cancelled: colors.red
        };
        
        console.log(`${index + 1}. ${colors.bright}${membership.user.firstName} ${membership.user.lastName}${colors.reset}`);
        console.log(`   Estado: ${statusColors[membership.status]}${membership.status}${colors.reset} | Tipo: ${membership.type}`);
        console.log(`   Precio: Q${membership.price} | Fin: ${formatDateOnly(membership.endDate)}`);
        console.log('');
      });
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

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
      console.log('\n' + colors.green + '✅ Membresía encontrada' + colors.reset);
      console.log(JSON.stringify(response.data.data.membership, null, 2));
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

async function getMembershipPlans() {
  showHeader('📋 PLANES DISPONIBLES');
  
  try {
    console.log(`\n${colors.cyan}Enviando GET a /api/memberships/plans...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/memberships/plans`, getAxiosConfig());
    
    if (response.data.success) {
      const plans = response.data.data;
      
      console.log('\n' + colors.green + `✅ ${plans.length} planes disponibles` + colors.reset + '\n');
      
      plans.forEach((plan, index) => {
        console.log(`${colors.bright}${index + 1}. ${plan.name}${colors.reset}`);
        console.log(`   Precio: ${colors.green}Q${plan.price}${colors.reset} | Duración: ${plan.duration}`);
        console.log(`   Popular: ${plan.popular ? '⭐' : 'No'}`);
        console.log('');
      });
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

async function getExpiredMemberships() {
  showHeader('⚠️  MEMBRESÍAS VENCIDAS');
  
  const days = await question('Días vencidas (0=hoy, default: 0): ') || '0';
  
  try {
    const response = await axios.get(`${API_BASE_URL}/memberships/expired`, {
      ...getAxiosConfig(),
      params: { days }
    });
    
    if (response.data.success) {
      const memberships = response.data.data.memberships;
      
      console.log('\n' + colors.green + `✅ ${memberships.length} membresías vencidas` + colors.reset + '\n');
      
      memberships.forEach((m, i) => {
        console.log(`${i + 1}. ${m.user.firstName} ${m.user.lastName} - ${m.type}`);
        console.log(`   Vencida: ${formatDateOnly(m.endDate)}`);
      });
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

async function getExpiringSoonMemberships() {
  showHeader('⏰ PRÓXIMAS A VENCER');
  
  const days = await question('Días hacia adelante (default: 7): ') || '7';
  
  try {
    const response = await axios.get(`${API_BASE_URL}/memberships/expiring-soon`, {
      ...getAxiosConfig(),
      params: { days }
    });
    
    if (response.data.success) {
      const memberships = response.data.data.memberships;
      
      console.log('\n' + colors.green + `✅ ${memberships.length} próximas a vencer` + colors.reset + '\n');
      
      memberships.forEach((m, i) => {
        const daysLeft = Math.ceil((new Date(m.endDate) - new Date()) / (1000 * 60 * 60 * 24));
        console.log(`${i + 1}. ${m.user.firstName} ${m.user.lastName}`);
        console.log(`   Vence en: ${colors.yellow}${daysLeft} día(s)${colors.reset}`);
      });
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

async function getPendingCashPaymentMemberships() {
  showHeader('💵 PENDIENTES DE PAGO');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/memberships/pending-cash-payment`, getAxiosConfig());
    
    if (response.data.success) {
      const memberships = response.data.data.memberships;
      
      console.log('\n' + colors.green + `✅ ${memberships.length} pendientes de pago` + colors.reset + '\n');
      
      memberships.forEach((m, i) => {
        console.log(`${i + 1}. ${m.user.name}`);
        console.log(`   Plan: ${m.plan.name} - Q${m.price}`);
        console.log(`   Esperando: ${colors.yellow}${m.hoursWaiting.toFixed(1)}h${colors.reset}`);
      });
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

async function getMembershipStats() {
  showHeader('📊 ESTADÍSTICAS');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/memberships/stats`, getAxiosConfig());
    
    if (response.data.success) {
      const stats = response.data.data;
      
      console.log('\n' + colors.green + '✅ Estadísticas obtenidas' + colors.reset + '\n');
      console.log(JSON.stringify(stats, null, 2));
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 9. CREATE MEMBERSHIP - CORREGIDO
// ============================================================
async function createMembership() {
  showHeader('➕ CREAR MEMBRESÍA');
  
  console.log(colors.cyan + 'Paso 1: Seleccionar cliente\n' + colors.reset);
  const client = await selectClientFromList('SELECCIONAR CLIENTE');
  
  if (!client) {
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  console.log(`\n${colors.cyan}Paso 2: Obtener planes\n${colors.reset}`);
  
  try {
    const plansResponse = await axios.get(`${API_BASE_URL}/membership-plans/active`, getAxiosConfig());
    
    if (!plansResponse.data.success || !plansResponse.data.data || plansResponse.data.data.length === 0) {
      console.log(colors.red + '❌ No hay planes disponibles' + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const plans = plansResponse.data.data;
    
    console.log('Planes disponibles:');
    plans.forEach((plan, index) => {
      console.log(`${index + 1}. ${plan.name} - Q${plan.price} (${plan.duration})`);
    });
    
    const planChoice = await question('\nSelecciona el plan: ');
    const selectedPlan = plans[parseInt(planChoice) - 1];
    
    if (!selectedPlan) {
      console.log(colors.red + '❌ Plan inválido' + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    // Obtener durationType del plan completo
    const planDetailResponse = await axios.get(
      `${API_BASE_URL}/membership-plans/${selectedPlan.id}`, 
      getAxiosConfig()
    );
    
    let durationType = 'monthly';
    
    if (planDetailResponse.data.success) {
      const planDetail = planDetailResponse.data.data.plan;
      durationType = planDetail.durationType || 'monthly';
    }
    
    console.log(`\n${colors.cyan}Paso 3: Fechas${colors.reset}`);
    
    const startDateInput = await question('Fecha inicio (YYYY-MM-DD, Enter=hoy): ');
    const startDate = startDateInput || new Date().toISOString().split('T')[0];
    
    const endDateInput = await question('Fecha fin (YYYY-MM-DD, Enter=auto): ');
    let endDate = endDateInput;
    
    if (!endDate) {
      const start = new Date(startDate);
      const durationDays = { daily: 1, weekly: 7, monthly: 30, quarterly: 90, annual: 365 };
      const days = durationDays[durationType] || 30;
      const end = new Date(start);
      end.setDate(end.getDate() + days);
      endDate = end.toISOString().split('T')[0];
    }
    
    console.log(`Inicio: ${startDate} | Fin: ${endDate}`);
    
    const notes = await question('\nNotas (opcional): ');
    const autoRenew = await question('Auto-renovar (s/n): ');
    
    const membershipData = {
      userId: client.id,
      planId: selectedPlan.id,
      type: durationType,
      price: parseFloat(selectedPlan.price),
      startDate,
      endDate,
      notes: notes || undefined,
      autoRenew: autoRenew.toLowerCase() === 's'
    };
    
    console.log('\n' + colors.cyan + 'Datos:' + colors.reset);
    console.log(JSON.stringify(membershipData, null, 2));
    
    const confirm = await question('\n¿Confirmar? (s/n): ');
    
    if (confirm.toLowerCase() !== 's') {
      console.log('Cancelado');
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const response = await axios.post(`${API_BASE_URL}/memberships`, membershipData, getAxiosConfig());
    
    if (response.data.success) {
      const membership = response.data.data.membership;
      
      console.log('\n' + colors.green + '✅ Membresía creada!' + colors.reset);
      console.log(`Cliente: ${membership.user.firstName} ${membership.user.lastName}`);
      console.log(`Tipo: ${membership.type} | Estado: ${membership.status}`);
      console.log(`Precio: Q${membership.price}`);
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
  showHeader('🛒 COMPRAR MEMBRESÍA');
  
  try {
    const plansResponse = await axios.get(`${API_BASE_URL}/memberships/plans`, getAxiosConfig());
    
    if (!plansResponse.data.success) {
      console.log(colors.red + '❌ Error obteniendo planes' + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const plans = plansResponse.data.data;
    
    console.log('\nPlanes:');
    plans.forEach((plan, index) => {
      console.log(`${index + 1}. ${plan.name} - Q${plan.price}`);
    });
    
    const planChoice = await question('\nSelecciona: ');
    const selectedPlan = plans[parseInt(planChoice) - 1];
    
    if (!selectedPlan) {
      console.log(colors.red + '❌ Inválido' + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    console.log('\nMétodos de pago:');
    console.log('  1. cash (Efectivo - requiere confirmación admin)');
    console.log('  2. card (Tarjeta - activación inmediata)');
    console.log('  3. transfer (Transferencia - requiere validación admin)');
    
    const paymentChoice = await question('Selecciona: ');
    const paymentMethods = ['cash', 'card', 'transfer'];
    const paymentMethod = paymentMethods[parseInt(paymentChoice) - 1] || 'cash';
    
    const purchaseData = {
      planId: selectedPlan.id,
      selectedSchedule: {},
      paymentMethod,
      notes: 'Compra desde test'
    };
    
    const confirm = await question('\n¿Confirmar compra? (s/n): ');
    
    if (confirm.toLowerCase() !== 's') {
      console.log('Cancelado');
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const response = await axios.post(`${API_BASE_URL}/memberships/purchase`, purchaseData, getAxiosConfig());
    
    if (response.data.success) {
      const result = response.data.data;
      
      console.log('\n' + colors.green + '✅ Compra procesada!' + colors.reset);
      console.log(colors.cyan + response.data.message + colors.reset);
      
      if (result.requiresCashPayment) {
        console.log('\n' + colors.yellow + '⚠️  IMPORTANTE: Debes pagar en efectivo en el gimnasio' + colors.reset);
        console.log('El admin confirmará el pago y activará tu membresía');
      }
      
      if (result.requiresTransferProof) {
        console.log('\n' + colors.yellow + '⚠️  IMPORTANTE: Debes subir comprobante de transferencia' + colors.reset);
        console.log('El admin validará el comprobante y activará tu membresía');
      }
      
      if (result.membership) {
        console.log(`\nEstado membresía: ${result.membership.status}`);
        console.log(`ID: ${result.membership.id}`);
      }
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 11-14. ACTUALIZAR/RENOVAR/CAMBIAR/CANCELAR (implementaciones básicas)
// ============================================================
async function updateMembership() {
  const membership = await selectMembershipFromList('active', '✏️  ACTUALIZAR');
  
  if (!membership) {
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  const status = await question(`Estado (actual: ${membership.status}): `);
  const price = await question(`Precio (actual: Q${membership.price}): `);
  
  const updateData = {};
  if (status) updateData.status = status;
  if (price) updateData.price = parseFloat(price);
  
  if (Object.keys(updateData).length === 0) {
    console.log(colors.yellow + '⚠️  Sin cambios' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    const response = await axios.patch(`${API_BASE_URL}/memberships/${membership.id}`, updateData, getAxiosConfig());
    
    if (response.data.success) {
      console.log('\n' + colors.green + '✅ Actualizada!' + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

async function renewMembership() {
  const membership = await selectMembershipFromList(null, '🔄 RENOVAR');
  
  if (!membership) {
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  const months = await question('\nMeses a agregar (default: 1): ') || '1';
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/memberships/${membership.id}/renew`, 
      { months: parseInt(months) }, 
      getAxiosConfig()
    );
    
    if (response.data.success) {
      console.log('\n' + colors.green + '✅ Renovada!' + colors.reset);
      console.log(`Nueva fecha: ${formatDateOnly(response.data.data.newEndDate)}`);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

async function changeMembershipSchedule() {
  const membership = await selectMembershipFromList('active', '📅 CAMBIAR HORARIOS');
  
  if (!membership) {
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  console.log('\nFormato JSON: { "monday": [1, 2], "wednesday": [3] }');
  const scheduleInput = await question('Horario (JSON): ');
  
  if (!scheduleInput) {
    console.log('Cancelado');
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    const selectedSchedule = JSON.parse(scheduleInput);
    
    const response = await axios.patch(
      `${API_BASE_URL}/memberships/${membership.id}/schedule`, 
      { selectedSchedule, replaceAll: true }, 
      getAxiosConfig()
    );
    
    if (response.data.success) {
      console.log('\n' + colors.green + '✅ Horarios actualizados!' + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

async function cancelMembership() {
  const membership = await selectMembershipFromList('active', '🗑️  CANCELAR');
  
  if (!membership) {
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  const reason = await question('\nMotivo: ');
  const confirm = await question(colors.red + '¿CONFIRMAR? (escribe "CANCELAR"): ' + colors.reset);
  
  if (confirm !== 'CANCELAR') {
    console.log('Abortado');
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/memberships/${membership.id}/cancel`, 
      { reason }, 
      getAxiosConfig()
    );
    
    if (response.data.success) {
      console.log('\n' + colors.green + '✅ Cancelada!' + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 15-18. OPERACIONES ESPECIALES (básicas)
// ============================================================
async function viewCompleteMembershipDetails() {
  const membership = await selectMembershipFromList(null, '🔍 DETALLE COMPLETO');
  
  if (!membership) {
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    const response = await axios.get(`${API_BASE_URL}/memberships/${membership.id}`, getAxiosConfig());
    
    if (response.data.success) {
      console.log('\n' + colors.green + '✅ Detalles' + colors.reset);
      console.log(JSON.stringify(response.data.data.membership, null, 2));
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

async function viewMembershipPayments() {
  const membership = await selectMembershipFromList(null, '💰 HISTORIAL DE PAGOS');
  
  if (!membership) {
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    const response = await axios.get(`${API_BASE_URL}/memberships/${membership.id}`, getAxiosConfig());
    
    if (response.data.success) {
      const payments = response.data.data.membership.payments || [];
      
      console.log('\n' + colors.green + `✅ ${payments.length} pagos` + colors.reset + '\n');
      
      payments.forEach((p, i) => {
        console.log(`${i + 1}. Q${p.amount} - ${p.status}`);
        console.log(`   Método: ${p.paymentMethod} | Fecha: ${formatDate(p.paymentDate)}`);
      });
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

async function listMembershipsByStatus() {
  showHeader('📋 LISTAR POR ESTADO');
  
  console.log('Estados:');
  console.log('  1. active');
  console.log('  2. pending');
  console.log('  3. expired');
  console.log('  4. cancelled');
  
  const choice = await question('\nSelecciona: ');
  const statuses = ['active', 'pending', 'expired', 'cancelled'];
  const status = statuses[parseInt(choice) - 1];
  
  try {
    const response = await axios.get(`${API_BASE_URL}/memberships`, {
      ...getAxiosConfig(),
      params: { status, limit: 50 }
    });
    
    if (response.data.success) {
      const memberships = response.data.data.memberships;
      
      console.log('\n' + colors.green + `✅ ${memberships.length} encontradas` + colors.reset + '\n');
      
      memberships.forEach((m, i) => {
        console.log(`${i + 1}. ${m.user.firstName} ${m.user.lastName} - ${m.type}`);
      });
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

async function searchMembershipsByClient() {
  showHeader('🔍 BUSCAR POR CLIENTE');
  
  const client = await selectClientFromList('CLIENTE');
  
  if (!client) {
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    const response = await axios.get(`${API_BASE_URL}/memberships`, {
      ...getAxiosConfig(),
      params: { userId: client.id }
    });
    
    if (response.data.success) {
      const memberships = response.data.data.memberships;
      
      console.log('\n' + colors.green + `✅ ${memberships.length} membresías` + colors.reset + '\n');
      
      memberships.forEach((m, i) => {
        console.log(`${i + 1}. ${m.type} - ${m.status}`);
        console.log(`   Q${m.price} | ${formatDateOnly(m.endDate)}`);
      });
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 21-24. GESTIÓN DE PAGOS PENDIENTES (NUEVAS FUNCIONES)
// ============================================================

// 21. DASHBOARD DE PAGOS PENDIENTES
async function getPendingPaymentsDashboard() {
  showHeader('💰 DASHBOARD DE PAGOS PENDIENTES');
  
  if (currentUser.role !== 'admin' && currentUser.role !== 'colaborador') {
    console.log(colors.red + '❌ Solo el personal puede ver este dashboard' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Obteniendo dashboard...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/financial/pending-dashboard`, getAxiosConfig());
    
    if (response.data.success) {
      const data = response.data.data;
      
      console.log('\n' + colors.green + '✅ Dashboard de Pagos Pendientes' + colors.reset);
      console.log('═'.repeat(70) + '\n');
      
      // Resumen
      console.log(colors.bright + '📊 RESUMEN' + colors.reset);
      console.log('─'.repeat(70));
      
      console.log(colors.yellow + '\n💸 Transferencias Pendientes:' + colors.reset);
      console.log(`   Cantidad: ${data.summary.pendingTransfers.count}`);
      console.log(`   Monto total: ${colors.green}Q${data.summary.pendingTransfers.totalAmount.toFixed(2)}${colors.reset}`);
      console.log(`   Más antigua: ${data.summary.pendingTransfers.oldestHours.toFixed(1)} horas`);
      
      console.log(colors.yellow + '\n💵 Membresías Pendientes (Efectivo):' + colors.reset);
      console.log(`   Cantidad: ${data.summary.pendingCashMemberships.count}`);
      console.log(`   Monto total: ${colors.green}Q${data.summary.pendingCashMemberships.totalAmount.toFixed(2)}${colors.reset}`);
      console.log(`   Más antigua: ${data.summary.pendingCashMemberships.oldestHours.toFixed(1)} horas`);
      
      console.log(colors.cyan + '\n✅ Validaciones de Hoy:' + colors.reset);
      console.log(`   Aprobadas: ${colors.green}${data.summary.todayValidations.approved}${colors.reset}`);
      console.log(`   Rechazadas: ${colors.red}${data.summary.todayValidations.rejected}${colors.reset}`);
      console.log(`   Total procesadas: ${data.summary.todayValidations.totalProcessed}`);
      
      // Items urgentes
      if (data.urgentItems && data.urgentItems.length > 0) {
        console.log('\n' + colors.red + colors.bright + '⚠️  ITEMS URGENTES (>24 horas)' + colors.reset);
        console.log('─'.repeat(70));
        
        data.urgentItems.forEach((item, index) => {
          const priorityIcon = item.priority === 'critical' ? '🔴' : '🟡';
          console.log(`\n${priorityIcon} ${index + 1}. ${item.clientName}`);
          console.log(`   Tipo: ${item.type === 'transfer' ? 'Transferencia' : 'Membresía en efectivo'}`);
          console.log(`   Monto: ${colors.green}Q${item.amount}${colors.reset}`);
          console.log(`   Esperando: ${colors.yellow}${item.hoursWaiting} horas${colors.reset}`);
          console.log(`   Prioridad: ${item.priority === 'critical' ? colors.red + 'CRÍTICA' : colors.yellow + 'ALTA'}${colors.reset}`);
        });
      }
      
      // Actividad reciente
      if (data.recentActivity && data.recentActivity.length > 0) {
        console.log('\n' + colors.cyan + '📋 ACTIVIDAD RECIENTE' + colors.reset);
        console.log('─'.repeat(70));
        
        data.recentActivity.slice(0, 5).forEach((activity, index) => {
          const actionIcon = activity.action === 'transfer_approved' ? '✅' : '❌';
          const actionText = activity.action === 'transfer_approved' ? 'Aprobó' : 'Rechazó';
          
          console.log(`\n${actionIcon} ${activity.performedBy} ${actionText}`);
          console.log(`   Cliente: ${activity.clientName}`);
          console.log(`   Monto: Q${activity.amount}`);
          console.log(`   Fecha: ${formatDate(activity.timestamp)}`);
        });
      }
      
      console.log('\n' + '═'.repeat(70));
      
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// 22. CONFIRMAR PAGO EN EFECTIVO
async function confirmCashPayment() {
  showHeader('💵 CONFIRMAR PAGO EN EFECTIVO');
  
  if (currentUser.role !== 'admin' && currentUser.role !== 'colaborador') {
    console.log(colors.red + '❌ Solo el personal puede confirmar pagos' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    // Obtener membresías pendientes de pago en efectivo
    console.log(colors.cyan + 'Obteniendo membresías pendientes de pago...' + colors.reset);
    const response = await axios.get(`${API_BASE_URL}/memberships/pending-cash-payment`, getAxiosConfig());
    
    if (!response.data.success || response.data.data.memberships.length === 0) {
      console.log(colors.yellow + '\n⚠️  No hay membresías pendientes de pago en efectivo' + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const memberships = response.data.data.memberships;
    
    console.log('\n' + colors.green + `✅ ${memberships.length} membresías pendientes` + colors.reset + '\n');
    console.log('─'.repeat(70));
    
    memberships.forEach((membership, index) => {
      console.log(`${colors.bright}${index + 1}.${colors.reset} ${membership.user.name}`);
      console.log(`   Email: ${membership.user.email}`);
      console.log(`   Plan: ${membership.plan.name}`);
      console.log(`   Precio: ${colors.yellow}Q${membership.price}${colors.reset}`);
      console.log(`   Esperando: ${colors.yellow}${membership.hoursWaiting.toFixed(1)} horas${colors.reset}`);
      console.log(`   ID Membresía: ${membership.id.substring(0, 13)}...`);
      console.log('');
    });
    
    console.log('─'.repeat(70));
    const choice = await question('\nSelecciona membresía a confirmar (0=cancelar): ');
    
    if (choice === '0') {
      console.log('Operación cancelada');
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const selectedIndex = parseInt(choice) - 1;
    
    if (selectedIndex < 0 || selectedIndex >= memberships.length) {
      console.log(colors.red + '❌ Selección inválida' + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const selectedMembership = memberships[selectedIndex];
    
    console.log(`\n${colors.cyan}Confirmando pago para: ${selectedMembership.user.name}${colors.reset}`);
    console.log(`Monto: Q${selectedMembership.price}`);
    
    const confirm = await question('\n¿Confirmar que SE RECIBIÓ el pago en efectivo? (s/n): ');
    
    if (confirm.toLowerCase() !== 's') {
      console.log('Confirmación cancelada');
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    // Buscar el pago asociado a la membresía
    const paymentResponse = await axios.get(`${API_BASE_URL}/payments`, {
      ...getAxiosConfig(),
      params: { 
        membershipId: selectedMembership.id,
        status: 'pending',
        paymentMethod: 'cash'
      }
    });
    
    if (!paymentResponse.data.success || !paymentResponse.data.data.payments || paymentResponse.data.data.payments.length === 0) {
      console.log(colors.red + '❌ No se encontró el pago pendiente asociado' + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const payment = paymentResponse.data.data.payments[0];
    
    // Marcar pago como completado
    const updateResponse = await axios.patch(
      `${API_BASE_URL}/payments/${payment.id}`,
      { status: 'completed' },
      getAxiosConfig()
    );
    
    if (updateResponse.data.success) {
      // Activar la membresía
      const membershipUpdateResponse = await axios.patch(
        `${API_BASE_URL}/memberships/${selectedMembership.id}`,
        { status: 'active' },
        getAxiosConfig()
      );
      
      if (membershipUpdateResponse.data.success) {
        console.log('\n' + colors.green + '✅ Pago confirmado y membresía activada!' + colors.reset);
        console.log(`Cliente: ${selectedMembership.user.name}`);
        console.log(`Monto: Q${selectedMembership.price}`);
        console.log(`Estado membresía: ${colors.green}ACTIVA${colors.reset}`);
      } else {
        console.log('\n' + colors.yellow + '⚠️  Pago confirmado pero error al activar membresía' + colors.reset);
      }
    } else {
      console.log(colors.red + '❌ Error al confirmar pago' + colors.reset);
    }
    
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// 23. VALIDAR COMPROBANTE DE TRANSFERENCIA
async function validateTransferProof() {
  showHeader('✅ VALIDAR COMPROBANTE DE TRANSFERENCIA');
  
  if (currentUser.role !== 'admin' && currentUser.role !== 'colaborador') {
    console.log(colors.red + '❌ Solo el personal puede validar transferencias' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    // Obtener pagos pendientes por transferencia
    console.log(colors.cyan + 'Obteniendo transferencias pendientes...' + colors.reset);
    const response = await axios.get(`${API_BASE_URL}/payments`, {
      ...getAxiosConfig(),
      params: { 
        status: 'pending',
        paymentMethod: 'transfer'
      }
    });
    
    if (!response.data.success || !response.data.data.payments || response.data.data.payments.length === 0) {
      console.log(colors.yellow + '\n⚠️  No hay transferencias pendientes de validación' + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const payments = response.data.data.payments.filter(p => p.transferProof);
    
    if (payments.length === 0) {
      console.log(colors.yellow + '\n⚠️  No hay transferencias con comprobante cargado' + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    console.log('\n' + colors.green + `✅ ${payments.length} transferencias pendientes` + colors.reset + '\n');
    console.log('─'.repeat(70));
    
    payments.forEach((payment, index) => {
      console.log(`${colors.bright}${index + 1}.${colors.reset} ${payment.user ? payment.user.firstName + ' ' + payment.user.lastName : 'Cliente'}`);
      console.log(`   Monto: ${colors.yellow}Q${payment.amount}${colors.reset}`);
      console.log(`   Tipo: ${payment.paymentType}`);
      console.log(`   Fecha: ${formatDate(payment.paymentDate)}`);
      console.log(`   Comprobante: ${payment.transferProof ? '📄 Sí' : '❌ No'}`);
      console.log(`   ID Pago: ${payment.id.substring(0, 13)}...`);
      console.log('');
    });
    
    console.log('─'.repeat(70));
    const choice = await question('\nSelecciona transferencia a validar (0=cancelar): ');
    
    if (choice === '0') {
      console.log('Operación cancelada');
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const selectedIndex = parseInt(choice) - 1;
    
    if (selectedIndex < 0 || selectedIndex >= payments.length) {
      console.log(colors.red + '❌ Selección inválida' + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const selectedPayment = payments[selectedIndex];
    
    console.log(`\n${colors.cyan}Validando transferencia de: ${selectedPayment.user ? selectedPayment.user.firstName : 'Cliente'}${colors.reset}`);
    console.log(`Monto: Q${selectedPayment.amount}`);
    console.log(`Comprobante: ${selectedPayment.transferProof}`);
    
    const confirm = await question('\n¿APROBAR esta transferencia? (s/n): ');
    
    if (confirm.toLowerCase() !== 's') {
      console.log('Validación cancelada');
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    // Aprobar transferencia
    const validateResponse = await axios.post(
      `${API_BASE_URL}/payments/${selectedPayment.id}/validate-transfer`,
      { validated: true },
      getAxiosConfig()
    );
    
    if (validateResponse.data.success) {
      console.log('\n' + colors.green + '✅ Transferencia validada y aprobada!' + colors.reset);
      console.log(`Cliente: ${selectedPayment.user ? selectedPayment.user.firstName + ' ' + selectedPayment.user.lastName : 'Cliente'}`);
      console.log(`Monto: Q${selectedPayment.amount}`);
      console.log(`Estado: ${colors.green}COMPLETADO${colors.reset}`);
      
      // Si es membresía, activarla
      if (selectedPayment.membershipId) {
        console.log('\n' + colors.cyan + 'Activando membresía asociada...' + colors.reset);
        const membershipResponse = await axios.patch(
          `${API_BASE_URL}/memberships/${selectedPayment.membershipId}`,
          { status: 'active' },
          getAxiosConfig()
        );
        
        if (membershipResponse.data.success) {
          console.log(colors.green + '✅ Membresía activada' + colors.reset);
        }
      }
    } else {
      console.log(colors.red + '❌ Error al validar transferencia' + colors.reset);
    }
    
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// 24. RECHAZAR COMPROBANTE DE TRANSFERENCIA
async function rejectTransferProof() {
  showHeader('❌ RECHAZAR COMPROBANTE DE TRANSFERENCIA');
  
  if (currentUser.role !== 'admin' && currentUser.role !== 'colaborador') {
    console.log(colors.red + '❌ Solo el personal puede rechazar transferencias' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    // Obtener pagos pendientes por transferencia
    console.log(colors.cyan + 'Obteniendo transferencias pendientes...' + colors.reset);
    const response = await axios.get(`${API_BASE_URL}/payments`, {
      ...getAxiosConfig(),
      params: { 
        status: 'pending',
        paymentMethod: 'transfer'
      }
    });
    
    if (!response.data.success || !response.data.data.payments || response.data.data.payments.length === 0) {
      console.log(colors.yellow + '\n⚠️  No hay transferencias pendientes' + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const payments = response.data.data.payments.filter(p => p.transferProof);
    
    if (payments.length === 0) {
      console.log(colors.yellow + '\n⚠️  No hay transferencias con comprobante' + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    console.log('\n' + colors.green + `✅ ${payments.length} transferencias pendientes` + colors.reset + '\n');
    console.log('─'.repeat(70));
    
    payments.forEach((payment, index) => {
      console.log(`${colors.bright}${index + 1}.${colors.reset} ${payment.user ? payment.user.firstName + ' ' + payment.user.lastName : 'Cliente'}`);
      console.log(`   Monto: Q${payment.amount}`);
      console.log(`   Comprobante: ${payment.transferProof}`);
      console.log('');
    });
    
    console.log('─'.repeat(70));
    const choice = await question('\nSelecciona transferencia a RECHAZAR (0=cancelar): ');
    
    if (choice === '0') {
      console.log('Operación cancelada');
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const selectedIndex = parseInt(choice) - 1;
    
    if (selectedIndex < 0 || selectedIndex >= payments.length) {
      console.log(colors.red + '❌ Selección inválida' + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const selectedPayment = payments[selectedIndex];
    
    console.log(`\n${colors.red}Rechazando transferencia de: ${selectedPayment.user ? selectedPayment.user.firstName : 'Cliente'}${colors.reset}`);
    console.log(`Monto: Q${selectedPayment.amount}`);
    
    const reason = await question('\nMotivo del rechazo: ');
    
    if (!reason) {
      console.log(colors.yellow + '⚠️  Debes proporcionar un motivo' + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const confirm = await question(colors.red + '\n¿CONFIRMAR RECHAZO? (s/n): ' + colors.reset);
    
    if (confirm.toLowerCase() !== 's') {
      console.log('Rechazo cancelado');
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    // Rechazar transferencia
    const rejectResponse = await axios.post(
      `${API_BASE_URL}/payments/${selectedPayment.id}/validate-transfer`,
      { validated: false, reason },
      getAxiosConfig()
    );
    
    if (rejectResponse.data.success) {
      console.log('\n' + colors.red + '❌ Transferencia rechazada' + colors.reset);
      console.log(`Motivo: ${reason}`);
      console.log(`El cliente deberá subir un nuevo comprobante`);
    } else {
      console.log(colors.red + '❌ Error al rechazar transferencia' + colors.reset);
    }
    
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 25-26. SISTEMA
// ============================================================
async function checkServer() {
  showHeader('🔌 VERIFICAR SERVIDOR');
  
  try {
    console.log(`Conectando a ${API_BASE_URL}...`);
    const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`, { timeout: 5000 });
    
    console.log(colors.green + '✅ Servidor en línea' + colors.reset);
    console.log('Respuesta:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log(colors.red + '❌ No se pudo conectar' + colors.reset);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n' + colors.yellow + '💡 Servidor apagado' + colors.reset);
      console.log('Ejecuta: npm start');
    }
  }
  
  await question('\nPresiona Enter para continuar...');
}

async function logout() {
  authToken = null;
  currentUser = null;
  console.log(colors.green + '\n✅ Sesión cerrada' + colors.reset);
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
      console.log(colors.yellow + '\n⚠️  Token expirado. Vuelve a hacer login.' + colors.reset);
      authToken = null;
      currentUser = null;
    }
    
    if (error.response.status === 403) {
      console.log(colors.yellow + '\n⚠️  Sin permisos' + colors.reset);
    }
    
    if (error.response.status === 400) {
      console.log(colors.yellow + '\n⚠️  Datos inválidos' + colors.reset);
    }
    
    console.log('\nRespuesta completa:');
    console.log(JSON.stringify(error.response.data, null, 2));
  } else if (error.request) {
    console.log('\nSin respuesta del servidor');
    console.log('Verifica que el servidor esté en http://localhost:5000');
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
        console.log(colors.red + '\n❌ Debes hacer login primero' + colors.reset);
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
        // NUEVAS OPCIONES DE GESTIÓN DE PAGOS
        case '21': await getPendingPaymentsDashboard(); break;
        case '22': await confirmCashPayment(); break;
        case '23': await validateTransferProof(); break;
        case '24': await rejectTransferProof(); break;
        // SISTEMA
        case '25': await checkServer(); break;
        case '26': await logout(); break;
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