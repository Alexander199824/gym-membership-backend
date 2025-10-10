// testMembershipsSimple.js - Test COMPLETO con Confirmación Automática y Horarios
// Ejecutar con: node testMembershipsSimple.js
// NOTA: El servidor debe estar corriendo en http://localhost:5000
//
// FUNCIONALIDADES:
// ✅ Crear membresías y confirmarlas automáticamente usando el flujo existente
// ✅ Asignar horarios de asistencia para membresías de 1 día (Admin/Colaborador)
// ✅ Verificar pago completado y movimiento financiero
// ✅ Ver membresías por estado (active, pending, expired, cancelled)
// ✅ Ver membresías próximas a vencer
// ✅ Ver membresías vencidas
// ✅ Verificar última membresía creada

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
    role: 'cliente',
    password: 'Cliente123!' // Password por defecto
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

async function showMenu() {
  clearScreen();
  showHeader('💳 TEST MEMBRESÍAS - CONFIRMACIÓN AUTOMÁTICA + HORARIOS');
  
  if (!authToken) {
    console.log(colors.red + '⚠️  NO AUTENTICADO' + colors.reset);
    console.log('\n  1. Login' + (AUTO_LOGIN.enabled ? ' (Automático)' : ''));
    console.log('  0. Salir');
  } else {
    console.log(colors.green + `✅ Autenticado como: ${currentUser?.email || 'Usuario'}` + colors.reset);
    console.log(colors.cyan + `Rol: ${currentUser?.role || 'N/A'}` + colors.reset);
    
    console.log('\n' + colors.green + '➕ CREAR MEMBRESÍA:' + colors.reset);
    console.log('  2. Crear membresía con confirmación automática');
    
    console.log('\n' + colors.blue + '📋 CONSULTAR:' + colors.reset);
    console.log('  3. Ver membresías por estado');
    console.log('  4. Ver membresías próximas a vencer');
    console.log('  5. Ver membresías vencidas');
    console.log('  6. Ver todas las membresías');
    
    console.log('\n' + colors.magenta + '💰 VERIFICAR:' + colors.reset);
    console.log('  7. Ver movimientos financieros recientes');
    console.log('  8. Verificar última membresía creada');
    
    console.log('\n' + colors.cyan + '⚙️  SISTEMA:' + colors.reset);
    console.log('  9. Verificar conexión al servidor');
    console.log('  10. Logout');
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
      }
    }
  } catch (error) {
    console.log(colors.red + '❌ Error de conexión' + colors.reset);
    handleAPIError(error);
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
// 2. CREAR MEMBRESÍA CON CONFIRMACIÓN AUTOMÁTICA Y HORARIOS
// ============================================================
async function createMembershipWithAutoConfirm() {
  showHeader('➕ CREAR MEMBRESÍA CON CONFIRMACIÓN AUTOMÁTICA');
  
  if (!['admin', 'colaborador'].includes(currentUser?.role)) {
    console.log(colors.red + '❌ Solo admin/colaborador pueden crear membresías' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  console.log(colors.cyan + 'Paso 1: Seleccionar cliente\n' + colors.reset);
  const client = await selectClientFromList('SELECCIONAR CLIENTE');
  
  if (!client) {
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  console.log(`\n${colors.cyan}Paso 2: Obtener planes disponibles\n${colors.reset}`);
  
  try {
    const plansResponse = await axios.get(`${API_BASE_URL}/memberships/plans`, getAxiosConfig());
    
    if (!plansResponse.data.success || !plansResponse.data.data || plansResponse.data.data.length === 0) {
      console.log(colors.red + '❌ No hay planes disponibles' + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const plans = plansResponse.data.data;
    
    console.log('Planes disponibles:');
    plans.forEach((plan, index) => {
      console.log(`${index + 1}. ${plan.name} - ${colors.green}Q${plan.price}${colors.reset} (${plan.duration})`);
    });
    
    const planChoice = await question('\nSelecciona el plan: ');
    const selectedPlan = plans[parseInt(planChoice) - 1];
    
    if (!selectedPlan) {
      console.log(colors.red + '❌ Plan inválido' + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    console.log(`\n${colors.cyan}Paso 3: Configurar fechas${colors.reset}`);
    
    const startDateInput = await question('Fecha inicio (YYYY-MM-DD, Enter=hoy): ');
    const startDate = startDateInput || new Date().toISOString().split('T')[0];
    
    // Calcular fecha de fin automáticamente
    const start = new Date(startDate);
    const durationDays = { daily: 1, weekly: 7, monthly: 30, quarterly: 90, annual: 365 };
    const days = durationDays[selectedPlan.duration] || 30;
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    const endDate = end.toISOString().split('T')[0];
    
    console.log(`${colors.green}✓${colors.reset} Inicio: ${startDate}`);
    console.log(`${colors.green}✓${colors.reset} Fin: ${endDate} (${days} días)`);
    
    // ✅ Si es membresía diaria, pedir horario de asistencia
    let scheduleData = null;
    if (selectedPlan.duration === 'daily') {
      console.log(`\n${colors.cyan}═══ ASIGNACIÓN DE HORARIO (Membresía de 1 día) ═══${colors.reset}`);
      
      // Obtener día de la semana de la fecha de inicio
      const startDateObj = new Date(startDate + 'T12:00:00'); // Agregar hora para evitar problemas de zona horaria
      const dayOfWeek = startDateObj.getDay(); // 0=Domingo, 1=Lunes, etc.
      const daysNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      
      console.log(`\n${colors.bright}Día de asistencia:${colors.reset} ${daysNames[dayOfWeek]} (${startDate})`);
      console.log('\nHorarios disponibles:');
      console.log('  1. Mañana (06:00 - 12:00)');
      console.log('  2. Mediodía (12:00 - 15:00)');
      console.log('  3. Tarde (15:00 - 18:00)');
      console.log('  4. Noche (18:00 - 22:00)');
      console.log('  5. Personalizado');
      
      const scheduleChoice = await question('\nSelecciona el horario: ');
      
      let preferredStartTime, preferredEndTime;
      
      switch(scheduleChoice) {
        case '1':
          preferredStartTime = '06:00';
          preferredEndTime = '12:00';
          break;
        case '2':
          preferredStartTime = '12:00';
          preferredEndTime = '15:00';
          break;
        case '3':
          preferredStartTime = '15:00';
          preferredEndTime = '18:00';
          break;
        case '4':
          preferredStartTime = '18:00';
          preferredEndTime = '22:00';
          break;
        case '5':
          preferredStartTime = await question('Hora inicio (HH:MM): ');
          preferredEndTime = await question('Hora fin (HH:MM): ');
          break;
        default:
          console.log(colors.yellow + '⚠️  Horario inválido, usando horario de mañana por defecto' + colors.reset);
          preferredStartTime = '06:00';
          preferredEndTime = '12:00';
      }
      
      console.log(`\n${colors.green}✓${colors.reset} Horario seleccionado: ${preferredStartTime} - ${preferredEndTime}`);
      
      const workoutTypeInput = await question('\nTipo de entrenamiento (cardio/strength/mixed, Enter=mixed): ');
      const workoutType = workoutTypeInput || 'mixed';
      
      scheduleData = {
        userId: client.id, // ✅ INCLUIR userId
        dayOfWeek,
        preferredStartTime,
        preferredEndTime,
        workoutType,
        priority: 5, // Alta prioridad para membresías de 1 día
        notes: `Horario para membresía de 1 día - ${startDate}`
      };
      
      console.log(`${colors.green}✓${colors.reset} Tipo: ${workoutType}`);
    }
    
    const notes = await question('\nNotas (opcional): ');
    
    // ✅ PASO 1: Crear membresía usando el flujo de COMPRA (para que cree el pago)
    const purchaseData = {
      planId: selectedPlan.id,
      selectedSchedule: {},
      paymentMethod: 'cash', // ✅ Esto creará un pago pendiente
      userId: client.id, // Para staff
      notes: notes || `Membresía creada por ${currentUser.role}`
    };
    
    console.log('\n' + colors.cyan + '📋 Resumen:' + colors.reset);
    console.log('─'.repeat(70));
    console.log(`Cliente: ${colors.bright}${client.firstName} ${client.lastName}${colors.reset}`);
    console.log(`Plan: ${selectedPlan.name}`);
    console.log(`Precio: ${colors.green}Q${selectedPlan.price}${colors.reset}`);
    console.log(`Duración: ${days} días`);
    console.log(`Inicio: ${startDate} | Fin: ${endDate}`);
    
    if (scheduleData) {
      const daysNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      console.log(`\n${colors.cyan}Horario de asistencia:${colors.reset}`);
      console.log(`  Día: ${daysNames[scheduleData.dayOfWeek]}`);
      console.log(`  Horario: ${scheduleData.preferredStartTime} - ${scheduleData.preferredEndTime}`);
      console.log(`  Tipo: ${scheduleData.workoutType}`);
    }
    
    console.log('─'.repeat(70));
    
    const confirm = await question('\n¿Confirmar creación? (s/n): ');
    
    if (confirm.toLowerCase() !== 's') {
      console.log(colors.yellow + 'Operación cancelada' + colors.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    console.log(`\n${colors.cyan}═══ INICIANDO PROCESO DE CREACIÓN Y CONFIRMACIÓN ═══${colors.reset}\n`);
    
    // ✅ PASO 1: Crear membresía con pago pendiente
    console.log(`${colors.cyan}[1/3]${colors.reset} Creando membresía...`);
    const purchaseResponse = await axios.post(
      `${API_BASE_URL}/memberships/purchase`, 
      purchaseData, 
      getAxiosConfig()
    );
    
    if (!purchaseResponse.data.success) {
      console.log(colors.red + '❌ Error al crear membresía' + colors.reset);
      console.log(purchaseResponse.data.message);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const membershipData = purchaseResponse.data.data;
    console.log(colors.green + '      ✅ Membresía creada (pendiente)' + colors.reset);
    console.log(`      ID: ${membershipData.membership.id.substring(0, 13)}...`);
    console.log(`      Estado: ${colors.yellow}pending${colors.reset}`);
    
    // Esperar un momento
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // ✅ PASO 2: Confirmar pago en efectivo (activar membresía)
    console.log(`\n${colors.cyan}[2/3]${colors.reset} Confirmando pago en efectivo...`);
    
    const confirmPaymentData = {
      membershipId: membershipData.membership.id
    };
    
    const confirmResponse = await axios.post(
      `${API_BASE_URL}/payments/activate-cash-membership`,
      confirmPaymentData,
      getAxiosConfig()
    );
    
    if (!confirmResponse.data.success) {
      console.log(colors.red + '❌ Error al confirmar pago' + colors.reset);
      console.log(confirmResponse.data.message);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const confirmedData = confirmResponse.data.data;
    console.log(colors.green + '      ✅ Pago confirmado' + colors.reset);
    console.log(`      ID Pago: ${confirmedData.payment.id.substring(0, 13)}...`);
    console.log(`      Estado: ${colors.green}${confirmedData.payment.status}${colors.reset}`);
    
    // Esperar un momento
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // ✅ PASO 2.5: Registrar horario si es membresía diaria
    let scheduleCreated = null;
    if (scheduleData) {
      console.log(`\n${colors.cyan}[2.5/3]${colors.reset} Registrando horario de asistencia...`);
      
      try {
        // ✅ Usar el endpoint de admin/colaborador directamente
        const scheduleResponse = await axios.post(
          `${API_BASE_URL}/schedules/users/schedule`,
          scheduleData,
          getAxiosConfig()
        );
        
        if (scheduleResponse.data.success) {
          scheduleCreated = scheduleResponse.data.data.schedule;
          console.log(colors.green + '      ✅ Horario registrado' + colors.reset);
          console.log(`      Día: ${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][scheduleData.dayOfWeek]}`);
          console.log(`      Horario: ${scheduleData.preferredStartTime} - ${scheduleData.preferredEndTime}`);
        }
      } catch (scheduleError) {
        console.log(colors.yellow + '      ⚠️  No se pudo registrar el horario automáticamente' + colors.reset);
        console.log(`      Error: ${scheduleError.response?.data?.message || scheduleError.message}`);
        console.log(colors.cyan + '      💡 El horario puede registrarse manualmente después' + colors.reset);
      }
      
      // Esperar un momento
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // ✅ PASO 3: Verificar que todo se creó correctamente
    console.log(`\n${colors.cyan}[3/3]${colors.reset} Verificando creación completa...`);
    
    // Verificar membresía
    const membershipCheck = await axios.get(
      `${API_BASE_URL}/memberships/${membershipData.membership.id}`,
      getAxiosConfig()
    );
    
    const finalMembership = membershipCheck.data.data.membership;
    console.log(colors.green + '      ✅ Membresía verificada' + colors.reset);
    console.log(`      Estado: ${colors.green}${finalMembership.status}${colors.reset}`);
    
    // Verificar movimiento financiero
    const financialCheck = await axios.get(
      `${API_BASE_URL}/financial/movements`,
      { ...getAxiosConfig(), params: { limit: 5 } }
    );
    
    let financialMovementFound = false;
    if (financialCheck.data.success) {
      const movements = financialCheck.data.data.movements;
      const relatedMovement = movements.find(m => 
        parseFloat(m.amount) === parseFloat(selectedPlan.price) &&
        m.type === 'income' &&
        m.category === 'membership_payment'
      );
      
      if (relatedMovement) {
        financialMovementFound = true;
        console.log(colors.green + '      ✅ Movimiento financiero creado' + colors.reset);
        console.log(`      ID: ${relatedMovement.id.substring(0, 13)}...`);
        console.log(`      Monto: Q${relatedMovement.amount}`);
      }
    }
    
    // ✅ RESULTADO FINAL
    console.log('\n' + '═'.repeat(70));
    console.log(colors.green + colors.bright + '🎉 ¡PROCESO COMPLETADO EXITOSAMENTE!' + colors.reset);
    console.log('═'.repeat(70));
    
    console.log(`\n${colors.bright}Detalles de la membresía:${colors.reset}`);
    console.log(`  Cliente: ${finalMembership.user.firstName} ${finalMembership.user.lastName}`);
    console.log(`  Email: ${finalMembership.user.email}`);
    console.log(`  Plan: ${selectedPlan.name}`);
    console.log(`  Precio: ${colors.green}Q${finalMembership.price}${colors.reset}`);
    console.log(`  Estado: ${colors.green}${finalMembership.status}${colors.reset}`);
    console.log(`  Inicio: ${formatDate(finalMembership.startDate)}`);
    console.log(`  Fin: ${formatDate(finalMembership.endDate)}`);
    console.log(`  ID Membresía: ${finalMembership.id}`);
    
    console.log(`\n${colors.bright}Verificación:${colors.reset}`);
    console.log(`  ${colors.green}✅${colors.reset} Membresía creada y activa`);
    console.log(`  ${colors.green}✅${colors.reset} Pago registrado y completado`);
    console.log(`  ${financialMovementFound ? colors.green + '✅' : colors.yellow + '⚠️'}${colors.reset} Movimiento financiero ${financialMovementFound ? 'creado' : 'no encontrado en últimos 5'}`);
    
    if (selectedPlan.duration === 'daily') {
      console.log(`  ${scheduleCreated ? colors.green + '✅' : colors.yellow + '⚠️'}${colors.reset} Horario de asistencia ${scheduleCreated ? 'registrado' : 'no registrado'}`);
      
      if (scheduleCreated) {
        const daysNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        console.log(`\n${colors.bright}Horario asignado:${colors.reset}`);
        console.log(`  Día: ${daysNames[scheduleCreated.dayOfWeek]}`);
        console.log(`  Horario: ${scheduleCreated.preferredStartTime} - ${scheduleCreated.preferredEndTime}`);
        console.log(`  Tipo: ${scheduleCreated.workoutType}`);
      }
    }
    
    console.log('\n' + '═'.repeat(70));
    
  } catch (error) {
    console.log('\n' + colors.red + '❌ ERROR EN EL PROCESO' + colors.reset);
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 3. VER MEMBRESÍAS POR ESTADO
// ============================================================
async function viewMembershipsByStatus() {
  showHeader('📋 VER MEMBRESÍAS POR ESTADO');
  
  console.log('Estados disponibles:');
  console.log('  1. active (Activas)');
  console.log('  2. pending (Pendientes)');
  console.log('  3. expired (Vencidas)');
  console.log('  4. cancelled (Canceladas)');
  
  const choice = await question('\nSelecciona el estado: ');
  const statuses = ['active', 'pending', 'expired', 'cancelled'];
  const selectedStatus = statuses[parseInt(choice) - 1];
  
  if (!selectedStatus) {
    console.log(colors.red + '❌ Estado inválido' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Obteniendo membresías con estado: ${selectedStatus}...${colors.reset}`);
    
    const response = await axios.get(`${API_BASE_URL}/memberships`, {
      ...getAxiosConfig(),
      params: { status: selectedStatus, limit: 50 }
    });
    
    if (response.data.success) {
      const memberships = response.data.data.memberships;
      const total = response.data.data.pagination.total;
      
      console.log('\n' + colors.green + `✅ ${total} membresías encontradas con estado: ${selectedStatus}` + colors.reset);
      
      if (memberships.length === 0) {
        console.log(colors.yellow + '\nNo hay membresías con este estado' + colors.reset);
      } else {
        console.log('\n' + '─'.repeat(70));
        
        memberships.forEach((m, i) => {
          const statusColor = {
            active: colors.green,
            pending: colors.yellow,
            expired: colors.red,
            cancelled: colors.red
          }[m.status] || colors.reset;
          
          console.log(`\n${colors.bright}${i + 1}. ${m.user.firstName} ${m.user.lastName}${colors.reset}`);
          console.log(`   Email: ${m.user.email}`);
          console.log(`   Tipo: ${m.type} | Estado: ${statusColor}${m.status}${colors.reset}`);
          console.log(`   Precio: Q${m.price}`);
          console.log(`   Inicio: ${formatDate(m.startDate)} | Fin: ${formatDate(m.endDate)}`);
          
          if (m.remainingDays !== undefined) {
            console.log(`   Días restantes: ${m.remainingDays}`);
          }
          
          console.log(`   ID: ${m.id.substring(0, 13)}...`);
        });
        
        console.log('\n' + '─'.repeat(70));
      }
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 4. VER MEMBRESÍAS PRÓXIMAS A VENCER
// ============================================================
async function viewExpiringSoonMemberships() {
  showHeader('⏰ MEMBRESÍAS PRÓXIMAS A VENCER');
  
  const daysInput = await question('Días hacia adelante (default: 7): ');
  const days = daysInput || '7';
  
  try {
    console.log(`\n${colors.cyan}Obteniendo membresías que vencen en los próximos ${days} días...${colors.reset}`);
    
    const response = await axios.get(`${API_BASE_URL}/memberships/expiring-soon`, {
      ...getAxiosConfig(),
      params: { days }
    });
    
    if (response.data.success) {
      const memberships = response.data.data.memberships;
      const total = response.data.data.total;
      
      console.log('\n' + colors.green + `✅ ${total} membresías próximas a vencer` + colors.reset);
      
      if (memberships.length === 0) {
        console.log(colors.yellow + '\n✓ No hay membresías próximas a vencer' + colors.reset);
      } else {
        console.log('\n' + '─'.repeat(70));
        
        memberships.forEach((m, i) => {
          const endDate = new Date(m.endDate);
          const today = new Date();
          const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
          
          const urgencyColor = daysLeft <= 2 ? colors.red : 
                              daysLeft <= 5 ? colors.yellow : colors.green;
          
          console.log(`\n${colors.bright}${i + 1}. ${m.user.firstName} ${m.user.lastName}${colors.reset}`);
          console.log(`   Email: ${m.user.email}`);
          console.log(`   Tipo: ${m.type}`);
          console.log(`   Vence: ${formatDate(m.endDate)}`);
          console.log(`   Días restantes: ${urgencyColor}${daysLeft}${colors.reset}`);
          console.log(`   ID: ${m.id.substring(0, 13)}...`);
        });
        
        console.log('\n' + '─'.repeat(70));
      }
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 5. VER MEMBRESÍAS VENCIDAS
// ============================================================
async function viewExpiredMemberships() {
  showHeader('⚠️  MEMBRESÍAS VENCIDAS');
  
  const daysInput = await question('Días vencidas (0=hoy, 7=última semana, default: 0): ');
  const days = daysInput || '0';
  
  try {
    console.log(`\n${colors.cyan}Obteniendo membresías vencidas...${colors.reset}`);
    
    const response = await axios.get(`${API_BASE_URL}/memberships/expired`, {
      ...getAxiosConfig(),
      params: { days }
    });
    
    if (response.data.success) {
      const memberships = response.data.data.memberships;
      const total = response.data.data.total;
      
      console.log('\n' + colors.green + `✅ ${total} membresías vencidas` + colors.reset);
      
      if (memberships.length === 0) {
        console.log(colors.yellow + '\n✓ No hay membresías vencidas' + colors.reset);
      } else {
        console.log('\n' + '─'.repeat(70));
        
        memberships.forEach((m, i) => {
          const endDate = new Date(m.endDate);
          const today = new Date();
          const daysExpired = Math.ceil((today - endDate) / (1000 * 60 * 60 * 24));
          
          console.log(`\n${colors.bright}${i + 1}. ${m.user.firstName} ${m.user.lastName}${colors.reset}`);
          console.log(`   Email: ${m.user.email}`);
          console.log(`   Teléfono: ${m.user.phone || 'N/A'}`);
          console.log(`   Tipo: ${m.type}`);
          console.log(`   Vencida el: ${colors.red}${formatDate(m.endDate)}${colors.reset}`);
          console.log(`   Hace: ${colors.red}${daysExpired} día(s)${colors.reset}`);
          console.log(`   ID: ${m.id.substring(0, 13)}...`);
        });
        
        console.log('\n' + '─'.repeat(70));
        console.log(colors.yellow + '\n💡 Tip: Estas membresías necesitan renovación' + colors.reset);
      }
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 6. VER TODAS LAS MEMBRESÍAS
// ============================================================
async function viewAllMemberships() {
  showHeader('📋 TODAS LAS MEMBRESÍAS');
  
  const pageInput = await question('Página (default: 1): ');
  const page = pageInput || '1';
  
  try {
    console.log(`\n${colors.cyan}Obteniendo membresías...${colors.reset}`);
    
    const response = await axios.get(`${API_BASE_URL}/memberships`, {
      ...getAxiosConfig(),
      params: { page, limit: 20 }
    });
    
    if (response.data.success) {
      const memberships = response.data.data.memberships;
      const pagination = response.data.data.pagination;
      
      console.log('\n' + colors.green + `✅ Página ${pagination.page} de ${pagination.pages}` + colors.reset);
      console.log(`Total: ${pagination.total} membresías`);
      console.log('\n' + '─'.repeat(70));
      
      memberships.forEach((m, i) => {
        const statusColor = {
          active: colors.green,
          pending: colors.yellow,
          expired: colors.red,
          cancelled: colors.red
        }[m.status] || colors.reset;
        
        console.log(`\n${colors.bright}${((pagination.page - 1) * pagination.limit) + i + 1}. ${m.user.firstName} ${m.user.lastName}${colors.reset}`);
        console.log(`   Estado: ${statusColor}${m.status}${colors.reset} | Tipo: ${m.type}`);
        console.log(`   Precio: Q${m.price} | Fin: ${formatDate(m.endDate)}`);
      });
      
      console.log('\n' + '─'.repeat(70));
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 7. VER MOVIMIENTOS FINANCIEROS RECIENTES
// ============================================================
async function viewRecentFinancialMovements() {
  showHeader('💰 MOVIMIENTOS FINANCIEROS RECIENTES');
  
  try {
    console.log(`\n${colors.cyan}Obteniendo últimos movimientos financieros...${colors.reset}`);
    
    const response = await axios.get(`${API_BASE_URL}/financial/movements`, {
      ...getAxiosConfig(),
      params: { limit: 10, type: 'income' }
    });
    
    if (response.data.success) {
      const movements = response.data.data.movements;
      
      console.log('\n' + colors.green + `✅ ${movements.length} movimientos recientes` + colors.reset);
      console.log('\n' + '─'.repeat(70));
      
      movements.forEach((m, i) => {
        console.log(`\n${colors.bright}${i + 1}. ${m.description}${colors.reset}`);
        console.log(`   Monto: ${colors.green}Q${m.amount}${colors.reset}`);
        console.log(`   Categoría: ${m.category}`);
        console.log(`   Método: ${m.paymentMethod || 'N/A'}`);
        console.log(`   Fecha: ${formatDate(m.movementDate)}`);
        console.log(`   ID: ${m.id.substring(0, 13)}...`);
      });
      
      console.log('\n' + '─'.repeat(70));
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 8. VERIFICAR ÚLTIMA MEMBRESÍA CREADA
// ============================================================
async function verifyLastMembership() {
  showHeader('🔍 VERIFICAR ÚLTIMA MEMBRESÍA CREADA');
  
  try {
    console.log(`\n${colors.cyan}Obteniendo última membresía...${colors.reset}`);
    
    const response = await axios.get(`${API_BASE_URL}/memberships`, {
      ...getAxiosConfig(),
      params: { limit: 1 }
    });
    
    if (response.data.success && response.data.data.memberships.length > 0) {
      const membership = response.data.data.memberships[0];
      
      console.log('\n' + colors.green + '✅ Última membresía creada:' + colors.reset);
      console.log('═'.repeat(70));
      console.log(`${colors.bright}Cliente:${colors.reset} ${membership.user.firstName} ${membership.user.lastName}`);
      console.log(`${colors.bright}Email:${colors.reset} ${membership.user.email}`);
      console.log(`${colors.bright}Tipo:${colors.reset} ${membership.type}`);
      console.log(`${colors.bright}Estado:${colors.reset} ${colors.green}${membership.status}${colors.reset}`);
      console.log(`${colors.bright}Precio:${colors.reset} Q${membership.price}`);
      console.log(`${colors.bright}Creada:${colors.reset} ${formatDate(membership.createdAt)}`);
      console.log(`${colors.bright}ID:${colors.reset} ${membership.id}`);
      
      // Buscar pago asociado
      console.log(`\n${colors.cyan}Buscando pago asociado...${colors.reset}`);
      
      const paymentsResponse = await axios.get(`${API_BASE_URL}/payments`, {
        ...getAxiosConfig(),
        params: { limit: 10 }
      });
      
      if (paymentsResponse.data.success) {
        const payments = paymentsResponse.data.data.payments;
        const relatedPayment = payments.find(p => 
          p.membershipId === membership.id || 
          (p.userId === membership.userId && parseFloat(p.amount) === parseFloat(membership.price))
        );
        
        if (relatedPayment) {
          console.log(colors.green + '✅ Pago encontrado:' + colors.reset);
          console.log(`   Monto: Q${relatedPayment.amount}`);
          console.log(`   Estado: ${colors.green}${relatedPayment.status}${colors.reset}`);
          console.log(`   ID: ${relatedPayment.id.substring(0, 13)}...`);
        } else {
          console.log(colors.yellow + '⚠️  No se encontró pago asociado' + colors.reset);
        }
      }
      
      console.log('\n' + '═'.repeat(70));
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 9. VERIFICAR SERVIDOR
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
      console.log('\n' + colors.yellow + '💡 El servidor parece estar apagado' + colors.reset);
      console.log('Ejecuta: npm start');
    }
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 10. LOGOUT
// ============================================================
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
      console.log(colors.yellow + '\n⚠️  Sin permisos para esta operación' + colors.reset);
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
    console.log(colors.bright + colors.cyan + '\n💳 Test de Membresías - Confirmación Automática + Horarios' + colors.reset);
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
        case '2': await createMembershipWithAutoConfirm(); break;
        case '3': await viewMembershipsByStatus(); break;
        case '4': await viewExpiringSoonMemberships(); break;
        case '5': await viewExpiredMemberships(); break;
        case '6': await viewAllMemberships(); break;
        case '7': await viewRecentFinancialMovements(); break;
        case '8': await verifyLastMembership(); break;
        case '9': await checkServer(); break;
        case '10': await logout(); break;
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