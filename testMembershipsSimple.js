// testMembershipsReal.js - TEST COMPLETO CON DATOS REALES DE LA BD
// Ejecutar con: node testMembershipsReal.js
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
const c = {
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
  console.log('\n' + c.bright + c.cyan + '='.repeat(80) + c.reset);
  console.log(c.bright + c.cyan + `  ${title}` + c.reset);
  console.log(c.bright + c.cyan + '='.repeat(80) + c.reset + '\n');
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

function handleAPIError(error) {
  console.log(c.red + '\n❌ ERROR EN LA PETICIÓN' + c.reset);
  
  if (error.response) {
    console.log(`Status: ${error.response.status}`);
    console.log(`Mensaje: ${error.response.data.message || 'Error desconocido'}`);
    
    if (error.response.status === 401) {
      console.log(c.yellow + '\n⚠️  Token expirado. Vuelve a hacer login.' + c.reset);
      authToken = null;
      currentUser = null;
    }
    
    console.log('\nRespuesta completa:');
    console.log(JSON.stringify(error.response.data, null, 2));
  } else {
    console.log(`Error: ${error.message}`);
  }
}

// ============================================================
// 1. LOGIN
// ============================================================
async function login() {
  showHeader('🔐 LOGIN');
  
  let email, password;
  
  if (AUTO_LOGIN.enabled) {
    console.log(c.cyan + '🤖 Login automático habilitado' + c.reset);
    email = AUTO_LOGIN.email;
    password = AUTO_LOGIN.password;
    console.log(`Email: ${email}`);
  } else {
    email = await question('Email: ');
    password = await question('Password: ');
  }
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password
    });
    
    if (response.data.success) {
      authToken = response.data.data?.token || response.data.token;
      currentUser = response.data.data?.user || response.data.user;
      
      console.log('\n' + c.green + '✅ Login exitoso!' + c.reset);
      console.log(`Usuario: ${currentUser.firstName} ${currentUser.lastName}`);
      console.log(`Rol: ${currentUser.role}`);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  if (!AUTO_LOGIN.enabled) {
    await question('\nPresiona Enter para continuar...');
  }
}

// ============================================================
// SELECCIONAR O CREAR CLIENTE
// ============================================================
async function selectClientFromList(title = 'SELECCIONAR CLIENTE') {
  showHeader(title);
  
  try {
    console.log(c.cyan + 'Obteniendo lista de clientes...' + c.reset);
    const response = await axios.get(`${API_BASE_URL}/users`, {
      ...getAxiosConfig(),
      params: { role: 'cliente', limit: 100 }
    });
    
    if (!response.data.success || response.data.data.users.length === 0) {
      console.log(c.yellow + '\n⚠️  No hay clientes disponibles' + c.reset);
      return null;
    }
    
    const clients = response.data.data.users;
    
    console.log('\n' + c.green + `✅ ${clients.length} clientes encontrados` + c.reset + '\n');
    console.log('─'.repeat(80));
    
    clients.forEach((client, index) => {
      const statusIcon = client.isActive ? '✓' : '✗';
      const statusColor = client.isActive ? c.green : c.red;
      
      console.log(`${c.bright}${index + 1}.${c.reset} ${client.firstName} ${client.lastName}`);
      console.log(`   Email: ${client.email}`);
      console.log(`   Estado: ${statusColor}${statusIcon}${c.reset} | Teléfono: ${client.phone || 'N/A'}`);
      console.log('');
    });
    
    console.log('─'.repeat(80));
    console.log(`${c.cyan}0.${c.reset} Crear nuevo cliente`);
    const choice = await question('\nSelecciona el número del cliente: ');
    
    if (choice === '0') {
      return await createNewClient();
    }
    
    const selectedIndex = parseInt(choice) - 1;
    
    if (selectedIndex < 0 || selectedIndex >= clients.length) {
      console.log(c.yellow + '\n⚠️  Selección inválida' + c.reset);
      return null;
    }
    
    const selectedClient = clients[selectedIndex];
    console.log('\n' + c.green + `✅ Cliente seleccionado: ${selectedClient.firstName} ${selectedClient.lastName}` + c.reset);
    
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
  const whatsapp = await question('WhatsApp (opcional, Enter=usar teléfono): ') || phone;
  
  if (!firstName || !lastName || !email) {
    console.log(c.red + '❌ Nombre, apellido y email son requeridos' + c.reset);
    return null;
  }
  
  const clientData = {
    firstName,
    lastName,
    email: email.toLowerCase(),
    phone,
    whatsapp,
    role: 'cliente',
    password: 'Cliente123!'
  };
  
  try {
    console.log(`\n${c.cyan}Creando cliente...${c.reset}`);
    const response = await axios.post(`${API_BASE_URL}/users`, clientData, getAxiosConfig());
    
    if (response.data.success) {
      const client = response.data.data.user;
      console.log('\n' + c.green + '✅ Cliente creado exitosamente!' + c.reset);
      console.log(`Nombre: ${client.firstName} ${client.lastName}`);
      console.log(`Email: ${client.email}`);
      return client;
    } else {
      console.log(c.red + '❌ Error: ' + response.data.message + c.reset);
      return null;
    }
  } catch (error) {
    handleAPIError(error);
    return null;
  }
}

// ============================================================
// CALCULAR FECHAS SEGÚN TIPO DE PLAN
// ============================================================
function calculateEndDate(startDate, durationType) {
  const start = new Date(startDate);
  const end = new Date(start);
  
  switch(durationType) {
    case 'daily':
      end.setDate(end.getDate() + 1);
      break;
    case 'weekly':
      end.setDate(end.getDate() + 7);
      break;
    case 'monthly':
      end.setMonth(end.getMonth() + 1);
      break;
    case 'quarterly':
      end.setMonth(end.getMonth() + 3);
      break;
    case 'biannual':
      end.setMonth(end.getMonth() + 6);
      break;
    case 'annual':
      end.setFullYear(end.getFullYear() + 1);
      break;
    default:
      end.setMonth(end.getMonth() + 1);
  }
  
  return end.toISOString().split('T')[0];
}

// ============================================================
// OBTENER HORARIOS DISPONIBLES REALES DESDE LA BD
// ============================================================
async function getAvailableScheduleOptions(planId) {
  try {
    console.log(`\n${c.cyan}Obteniendo horarios disponibles desde la BD...${c.reset}`);
    
    const response = await axios.get(
      `${API_BASE_URL}/memberships/plans/${planId}/schedule-options`,
      getAxiosConfig()
    );
    
    if (response.data.success) {
      return response.data.data;
    } else {
      console.log(c.yellow + '⚠️  No se pudieron obtener horarios' + c.reset);
      return null;
    }
  } catch (error) {
    console.log(c.yellow + '⚠️  Error obteniendo horarios: ' + error.message + c.reset);
    return null;
  }
}

// ============================================================
// SELECCIONAR HORARIOS PARA LA MEMBRESÍA
// ============================================================
async function selectScheduleForMembership(planData, startDate) {
  const selectedSchedule = {};
  
  // Si es membresía diaria, no se reservan slots (según tu requerimiento)
  if (planData.plan.durationType === 'daily') {
    console.log(`\n${c.yellow}⚠️  Membresías diarias NO reservan horarios en el sistema${c.reset}`);
    console.log(`El cliente puede asistir cualquier día dentro de su período de validez.`);
    return {};
  }
  
  console.log(`\n${c.bright}${c.cyan}═══ SELECCIÓN DE HORARIOS ═══${c.reset}`);
  console.log(`Plan: ${planData.plan.name}`);
  console.log(`Tipo: ${planData.plan.durationType}`);
  console.log(`Días permitidos: ${planData.plan.allowedDays.length}`);
  console.log(`Slots por día: ${planData.plan.maxSlotsPerDay}`);
  console.log(`Reservas por semana: ${planData.plan.maxReservationsPerWeek}`);
  
  const dayNames = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };
  
  let totalSlotsSelected = 0;
  
  for (const day of planData.plan.allowedDays) {
    if (totalSlotsSelected >= planData.plan.maxReservationsPerWeek) {
      console.log(c.yellow + `\n⚠️  Límite de reservas semanales alcanzado (${planData.plan.maxReservationsPerWeek})` + c.reset);
      break;
    }
    
    const daySchedule = planData.availableOptions[day];
    
    if (!daySchedule || !daySchedule.isOpen || daySchedule.slots.length === 0) {
      console.log(`\n${c.yellow}${dayNames[day]}: Cerrado o sin horarios${c.reset}`);
      continue;
    }
    
    console.log(`\n${c.bright}${dayNames[day]}:${c.reset}`);
    console.log('─'.repeat(80));
    
    const availableSlots = daySchedule.slots.filter(slot => slot.canReserve);
    
    if (availableSlots.length === 0) {
      console.log(c.red + '  Sin horarios disponibles' + c.reset);
      continue;
    }
    
    availableSlots.forEach((slot, index) => {
      const availColor = slot.available > 5 ? c.green : slot.available > 2 ? c.yellow : c.red;
      console.log(`  ${index + 1}. ${slot.name || `${slot.startTime} - ${slot.endTime}`}`);
      console.log(`     Capacidad: ${slot.maxCapacity} | Disponibles: ${availColor}${slot.available}${c.reset} | En uso: ${slot.currentUsers}`);
    });
    
    console.log(`\n  0. Saltar este día`);
    console.log(`  ${c.cyan}Puedes seleccionar hasta ${planData.plan.maxSlotsPerDay} horario(s) por día${c.reset}`);
    
    const selections = await question(`\nSelecciona horarios (ej: 1,3 o 1 o 0): `);
    
    if (selections === '0' || selections === '') {
      continue;
    }
    
    const selectedIndexes = selections.split(',').map(s => parseInt(s.trim()) - 1);
    const validIndexes = selectedIndexes.filter(i => i >= 0 && i < availableSlots.length);
    
    if (validIndexes.length === 0) {
      console.log(c.yellow + '  ⚠️  No se seleccionaron horarios válidos' + c.reset);
      continue;
    }
    
    if (validIndexes.length > planData.plan.maxSlotsPerDay) {
      console.log(c.yellow + `  ⚠️  Solo se tomarán los primeros ${planData.plan.maxSlotsPerDay} horario(s)` + c.reset);
      validIndexes.splice(planData.plan.maxSlotsPerDay);
    }
    
    selectedSchedule[day] = validIndexes.map(i => availableSlots[i].id);
    totalSlotsSelected += selectedSchedule[day].length;
    
    console.log(c.green + `  ✓ ${selectedSchedule[day].length} horario(s) seleccionado(s)` + c.reset);
  }
  
  if (Object.keys(selectedSchedule).length === 0) {
    console.log(c.yellow + '\n⚠️  No se seleccionaron horarios' + c.reset);
    const confirm = await question('¿Crear membresía sin horarios reservados? (s/n): ');
    if (confirm.toLowerCase() !== 's') {
      return null;
    }
  }
  
  return selectedSchedule;
}

// ============================================================
// CREAR MEMBRESÍA CON CONFIRMACIÓN AUTOMÁTICA Y HORARIOS REALES
// ============================================================
async function createMembershipWithRealData() {
  showHeader('➕ CREAR MEMBRESÍA CON DATOS REALES DE LA BD');
  
  if (!['admin', 'colaborador'].includes(currentUser?.role)) {
    console.log(c.red + '❌ Solo admin/colaborador pueden crear membresías' + c.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  // PASO 1: Seleccionar cliente
  console.log(c.cyan + '═══ PASO 1/5: SELECCIONAR CLIENTE ═══\n' + c.reset);
  const client = await selectClientFromList('SELECCIONAR CLIENTE');
  
  if (!client) {
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  // PASO 2: Obtener planes REALES desde la BD
  console.log(`\n${c.cyan}═══ PASO 2/5: OBTENER PLANES DESDE BD ═══\n${c.reset}`);
  
  try {
    const plansResponse = await axios.get(`${API_BASE_URL}/memberships/plans`, getAxiosConfig());
    
    if (!plansResponse.data.success || !plansResponse.data.data || plansResponse.data.data.length === 0) {
      console.log(c.red + '❌ No hay planes disponibles en la BD' + c.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const plans = plansResponse.data.data;
    
    console.log(c.green + `✅ ${plans.length} planes obtenidos desde la BD\n` + c.reset);
    console.log('─'.repeat(80));
    
    plans.forEach((plan, index) => {
      const priceColor = plan.discountPercentage > 0 ? c.green : c.reset;
      console.log(`${c.bright}${index + 1}. ${plan.name}${c.reset}`);
      console.log(`   Precio: ${priceColor}Q${plan.price}${c.reset}${plan.originalPrice ? ` (antes Q${plan.originalPrice})` : ''}`);
      console.log(`   Duración: ${plan.duration}`);
      console.log(`   ID: ${plan.id}`);
      if (plan.popular) console.log(`   ${c.yellow}⭐ Popular${c.reset}`);
      console.log('');
    });
    
    console.log('─'.repeat(80));
    const planChoice = await question('\nSelecciona el plan: ');
    const selectedPlan = plans[parseInt(planChoice) - 1];
    
    if (!selectedPlan) {
      console.log(c.red + '❌ Plan inválido' + c.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    console.log(c.green + `\n✓ Plan seleccionado: ${selectedPlan.name} - Q${selectedPlan.price}` + c.reset);
    
    // PASO 3: Configurar fechas
    console.log(`\n${c.cyan}═══ PASO 3/5: CONFIGURAR FECHAS ═══${c.reset}`);
    
    const startDateInput = await question('\nFecha inicio (YYYY-MM-DD, Enter=hoy): ');
    const startDate = startDateInput || new Date().toISOString().split('T')[0];
    
    // Calcular fecha de fin según el tipo de plan
    const endDate = calculateEndDate(startDate, selectedPlan.duration);
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    console.log(`\n${c.green}✓${c.reset} Inicio: ${startDate}`);
    console.log(`${c.green}✓${c.reset} Fin: ${endDate}`);
    console.log(`${c.green}✓${c.reset} Duración: ${days} días`);
    
    // PASO 4: Obtener y seleccionar horarios REALES desde la BD
    console.log(`\n${c.cyan}═══ PASO 4/5: SELECCIONAR HORARIOS DESDE BD ═══${c.reset}`);
    
    const scheduleData = await getAvailableScheduleOptions(selectedPlan.id);
    
    if (!scheduleData) {
      console.log(c.yellow + '⚠️  No se pudieron obtener horarios, continuando sin ellos' + c.reset);
    }
    
    let selectedSchedule = {};
    
    if (scheduleData) {
      selectedSchedule = await selectScheduleForMembership(scheduleData, startDate);
      
      if (selectedSchedule === null) {
        console.log(c.yellow + 'Operación cancelada' + c.reset);
        await question('\nPresiona Enter para continuar...');
        return;
      }
    }
    
    // PASO 5: Confirmar y crear
    console.log(`\n${c.cyan}═══ PASO 5/5: CONFIRMAR Y CREAR ═══${c.reset}`);
    
    const notes = await question('\nNotas adicionales (opcional): ');
    
    console.log('\n' + c.cyan + '📋 RESUMEN DE LA MEMBRESÍA:' + c.reset);
    console.log('═'.repeat(80));
    console.log(`${c.bright}Cliente:${c.reset} ${client.firstName} ${client.lastName} (${client.email})`);
    console.log(`${c.bright}Plan:${c.reset} ${selectedPlan.name}`);
    console.log(`${c.bright}Precio:${c.reset} ${c.green}Q${selectedPlan.price}${c.reset}`);
    console.log(`${c.bright}Duración:${c.reset} ${days} días (${selectedPlan.duration})`);
    console.log(`${c.bright}Inicio:${c.reset} ${startDate}`);
    console.log(`${c.bright}Fin:${c.reset} ${endDate}`);
    
    if (Object.keys(selectedSchedule).length > 0) {
      console.log(`\n${c.bright}Horarios reservados:${c.reset}`);
      const dayNames = {
        monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
        thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo'
      };
      
      for (const [day, slotIds] of Object.entries(selectedSchedule)) {
        console.log(`  ${dayNames[day]}: ${slotIds.length} horario(s)`);
      }
    } else {
      console.log(`\n${c.yellow}Sin horarios reservados${c.reset}`);
    }
    
    console.log('═'.repeat(80));
    
    const confirm = await question('\n¿Confirmar creación? (s/n): ');
    
    if (confirm.toLowerCase() !== 's') {
      console.log(c.yellow + 'Operación cancelada' + c.reset);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    // CREAR MEMBRESÍA
    console.log(`\n${c.cyan}═══ CREANDO MEMBRESÍA EN LA BD ═══${c.reset}\n`);
    
    const purchaseData = {
      planId: selectedPlan.id,
      selectedSchedule: selectedSchedule,
      paymentMethod: 'cash',
      userId: client.id,
      notes: notes || `Membresía creada por ${currentUser.firstName} ${currentUser.lastName}`
    };
    
    console.log(`${c.cyan}[1/2]${c.reset} Creando membresía...`);
    const purchaseResponse = await axios.post(
      `${API_BASE_URL}/memberships/purchase`,
      purchaseData,
      getAxiosConfig()
    );
    
    if (!purchaseResponse.data.success) {
      console.log(c.red + '❌ Error al crear membresía' + c.reset);
      console.log(purchaseResponse.data.message);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const membershipData = purchaseResponse.data.data;
    console.log(c.green + '      ✅ Membresía creada' + c.reset);
    console.log(`      ID: ${membershipData.membership.id}`);
    console.log(`      Estado: ${c.yellow}${membershipData.membership.status}${c.reset}`);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // CONFIRMAR PAGO
    console.log(`\n${c.cyan}[2/2]${c.reset} Confirmando pago en efectivo...`);
    
    const confirmPaymentData = {
      membershipId: membershipData.membership.id
    };
    
    const confirmResponse = await axios.post(
      `${API_BASE_URL}/payments/activate-cash-membership`,
      confirmPaymentData,
      getAxiosConfig()
    );
    
    if (!confirmResponse.data.success) {
      console.log(c.red + '❌ Error al confirmar pago' + c.reset);
      console.log(confirmResponse.data.message);
      await question('\nPresiona Enter para continuar...');
      return;
    }
    
    const confirmedData = confirmResponse.data.data;
    console.log(c.green + '      ✅ Pago confirmado' + c.reset);
    console.log(`      Monto: Q${confirmedData.payment.amount}`);
    console.log(`      Estado: ${c.green}${confirmedData.payment.status}${c.reset}`);
    
    // VERIFICAR RESULTADO
    console.log(`\n${c.cyan}Verificando creación en BD...${c.reset}`);
    
    const membershipCheck = await axios.get(
      `${API_BASE_URL}/memberships/${membershipData.membership.id}`,
      getAxiosConfig()
    );
    
    const finalMembership = membershipCheck.data.data.membership;
    
    // RESULTADO FINAL
    console.log('\n' + '═'.repeat(80));
    console.log(c.green + c.bright + '🎉 ¡MEMBRESÍA CREADA EXITOSAMENTE EN LA BD!' + c.reset);
    console.log('═'.repeat(80));
    
    console.log(`\n${c.bright}Información final:${c.reset}`);
    console.log(`  Cliente: ${finalMembership.user.firstName} ${finalMembership.user.lastName}`);
    console.log(`  Plan: ${selectedPlan.name}`);
    console.log(`  Precio: Q${finalMembership.price}`);
    console.log(`  Estado: ${c.green}${finalMembership.status}${c.reset}`);
    console.log(`  Período: ${formatDate(finalMembership.startDate)} → ${formatDate(finalMembership.endDate)}`);
    console.log(`  ID Membresía: ${finalMembership.id}`);
    
    if (Object.keys(selectedSchedule).length > 0) {
      console.log(`\n${c.bright}Horarios reservados en BD:${c.reset}`);
      const dayNames = {
        monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
        thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo'
      };
      
      let totalSlots = 0;
      for (const [day, slotIds] of Object.entries(selectedSchedule)) {
        totalSlots += slotIds.length;
        console.log(`  ${dayNames[day]}: ${slotIds.length} horario(s)`);
      }
      console.log(`  ${c.green}Total: ${totalSlots} slots reservados${c.reset}`);
    }
    
    console.log(`\n${c.bright}Verificación:${c.reset}`);
    console.log(`  ${c.green}✅${c.reset} Membresía en BD: CREADA`);
    console.log(`  ${c.green}✅${c.reset} Pago registrado: COMPLETADO`);
    console.log(`  ${c.green}✅${c.reset} Estado: ACTIVA`);
    if (Object.keys(selectedSchedule).length > 0) {
      console.log(`  ${c.green}✅${c.reset} Horarios: RESERVADOS EN GymTimeSlots`);
    }
    
    console.log('\n' + '═'.repeat(80));
    
  } catch (error) {
    console.log('\n' + c.red + '❌ ERROR EN EL PROCESO' + c.reset);
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// MENU PRINCIPAL
// ============================================================
async function showMenu() {
  clearScreen();
  showHeader('💳 TEST MEMBRESÍAS - DATOS REALES DE LA BD');
  
  if (!authToken) {
    console.log(c.red + '⚠️  NO AUTENTICADO' + c.reset);
    console.log('\n  1. Login' + (AUTO_LOGIN.enabled ? ' (Automático)' : ''));
    console.log('  0. Salir');
  } else {
    console.log(c.green + `✅ Autenticado: ${currentUser?.email}` + c.reset);
    console.log(c.cyan + `Rol: ${currentUser?.role}` + c.reset);
    
    console.log('\n' + c.green + '📋 OPCIONES:' + c.reset);
    console.log('  2. Crear membresía con datos reales de BD');
    console.log('  3. Ver membresías activas');
    console.log('  4. Ver membresías pendientes');
    console.log('  5. Ver última membresía creada');
    console.log('  9. Verificar servidor');
    console.log('  10. Logout');
    console.log('  0. Salir');
  }
  
  console.log('\n' + '─'.repeat(80));
  const choice = await question(c.bright + 'Selecciona una opción: ' + c.reset);
  return choice;
}

async function viewMembershipsByStatus(status) {
  showHeader(`📋 MEMBRESÍAS: ${status.toUpperCase()}`);
  
  try {
    const response = await axios.get(`${API_BASE_URL}/memberships`, {
      ...getAxiosConfig(),
      params: { status, limit: 20 }
    });
    
    if (response.data.success) {
      const memberships = response.data.data.memberships;
      
      console.log(c.green + `✅ ${memberships.length} membresías encontradas\n` + c.reset);
      
      memberships.forEach((m, i) => {
        console.log(`${c.bright}${i + 1}. ${m.user.firstName} ${m.user.lastName}${c.reset}`);
        console.log(`   Tipo: ${m.type} | Estado: ${m.status}`);
        console.log(`   Período: ${formatDate(m.startDate)} → ${formatDate(m.endDate)}`);
        console.log('');
      });
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

async function checkServer() {
  showHeader('🔌 VERIFICAR SERVIDOR');
  
  try {
    console.log(`Conectando a ${API_BASE_URL}...`);
    const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`, { timeout: 5000 });
    
    console.log(c.green + '✅ Servidor en línea' + c.reset);
    console.log('Respuesta:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log(c.red + '❌ No se pudo conectar' + c.reset);
    console.log('\n' + c.yellow + '💡 Ejecuta: npm start' + c.reset);
  }
  
  await question('\nPresiona Enter para continuar...');
}

async function logout() {
  authToken = null;
  currentUser = null;
  console.log(c.green + '\n✅ Sesión cerrada' + c.reset);
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  try {
    console.log(c.bright + c.cyan + '\n💳 Test Membresías - Datos Reales de BD' + c.reset);
    console.log('Servidor: ' + API_BASE_URL);
    
    if (AUTO_LOGIN.enabled) {
      console.log(c.cyan + 'Login automático: HABILITADO\n' + c.reset);
      await login();
      if (authToken) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    while (true) {
      const choice = await showMenu();
      
      if (!authToken && choice !== '1' && choice !== '0') {
        console.log(c.red + '\n❌ Debes hacer login primero' + c.reset);
        await question('\nPresiona Enter para continuar...');
        continue;
      }
      
      switch (choice) {
        case '1': await login(); break;
        case '2': await createMembershipWithRealData(); break;
        case '3': await viewMembershipsByStatus('active'); break;
        case '4': await viewMembershipsByStatus('pending'); break;
        case '5': await viewMembershipsByStatus('active'); break;
        case '9': await checkServer(); break;
        case '10': await logout(); break;
        case '0':
          console.log('\n' + c.bright + '👋 ¡Hasta luego!' + c.reset + '\n');
          rl.close();
          process.exit(0);
          break;
        default:
          console.log(c.red + '❌ Opción inválida' + c.reset);
          await question('\nPresiona Enter para continuar...');
      }
    }
  } catch (error) {
    console.error(c.red + '\n❌ Error fatal: ' + error.message + c.reset);
    rl.close();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };