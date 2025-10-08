// testExpensesAPI.js - Pruebas de API REST para Gastos con LOGIN AUTOMÁTICO
// Ejecutar con: node testExpensesAPI.js
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

function formatCurrency(amount) {
  return `Q${parseFloat(amount).toFixed(2)}`;
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

async function showMenu() {
  clearScreen();
  showHeader('💰 TEST DE API REST - GASTOS');
  
  if (!authToken) {
    console.log(colors.red + '⚠️  NO AUTENTICADO' + colors.reset);
    console.log('\n  1. Login' + (AUTO_LOGIN.enabled ? ' (Automático)' : ''));
    console.log('  0. Salir');
  } else {
    console.log(colors.green + `✅ Autenticado como: ${currentUser?.email || 'Usuario'}` + colors.reset);
    console.log(colors.cyan + `Rol: ${currentUser?.role || 'N/A'}` + colors.reset);
    
    console.log('\n' + colors.blue + '📋 CONSULTAR (GET):' + colors.reset);
    console.log('  2. GET /api/expenses - Ver todos los gastos');
    console.log('  3. GET /api/expenses/:id - Buscar gasto por ID');
    console.log('  4. GET /api/expenses/pending/approval - Gastos pendientes');
    console.log('  5. GET /api/expenses/category/:category - Por categoría');
    console.log('  6. GET /api/expenses/recurring/upcoming - Recurrentes próximos');
    
    console.log('\n' + colors.green + '➕ CREAR (POST):' + colors.reset);
    console.log('  7. POST /api/expenses - Crear nuevo gasto');
    
    console.log('\n' + colors.yellow + '✏️  ACTUALIZAR (PUT):' + colors.reset);
    console.log('  8. PUT /api/expenses/:id - Actualizar gasto');
    
    console.log('\n' + colors.magenta + '🔄 ACCIONES (POST):' + colors.reset);
    console.log('  9. POST /api/expenses/:id/approve - Aprobar gasto');
    console.log('  10. POST /api/expenses/:id/reject - Rechazar gasto');
    console.log('  11. POST /api/expenses/:id/cancel - Cancelar gasto');
    console.log('  12. POST /api/expenses/recurring/process - Procesar recurrentes');
    
    console.log('\n' + colors.cyan + '📊 REPORTES (GET):' + colors.reset);
    console.log('  13. GET /api/expenses/stats/summary - Estadísticas');
    console.log('  14. GET /api/expenses/stats/breakdown - Breakdown categorías');
    console.log('  15. GET /api/expenses/stats/vendors - Top proveedores');
    
    console.log('\n' + colors.red + '🗑️  ELIMINAR (DELETE):' + colors.reset);
    console.log('  16. DELETE /api/expenses/:id - Eliminar gasto');
    
    console.log('\n' + colors.cyan + '⚙️  SISTEMA:' + colors.reset);
    console.log('  17. Verificar conexión al servidor');
    console.log('  18. Logout');
    console.log('  0. Salir');
  }
  
  console.log('\n' + '─'.repeat(70));
  const choice = await question(colors.bright + 'Selecciona una opción: ' + colors.reset);
  return choice;
}

// ============================================================
// 1. LOGIN - AHORA CON OPCIÓN AUTOMÁTICA
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
    
    // 🔍 Debug: Ver estructura de respuesta
    if (AUTO_LOGIN.enabled) {
      console.log('\n🔍 DEBUG - Respuesta del servidor:');
      console.log(JSON.stringify(response.data, null, 2));
    }
    
    if (response.data.success) {
      // ✅ Intentar obtener token y user de ambas estructuras posibles
      authToken = response.data.data?.token || response.data.token;
      currentUser = response.data.data?.user || response.data.user;
      
      // Validar que obtuvimos los datos
      if (authToken && currentUser) {
        console.log('\n' + colors.green + '✅ Login exitoso!' + colors.reset);
        console.log(`Usuario: ${currentUser.firstName} ${currentUser.lastName}`);
        console.log(`Email: ${currentUser.email}`);
        console.log(`Rol: ${currentUser.role}`);
        console.log(`Token: ${authToken.substring(0, 20)}...`);
      } else {
        console.log(colors.red + '❌ Error: No se pudo extraer token o usuario de la respuesta' + colors.reset);
        console.log(`Token obtenido: ${authToken ? 'Sí' : 'No'}`);
        console.log(`Usuario obtenido: ${currentUser ? 'Sí' : 'No'}`);
      }
    } else {
      console.log(colors.red + '❌ Error en login: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    console.log(colors.red + '❌ Error de conexión: ' + colors.reset);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Mensaje: ${error.response.data.message || 'Error desconocido'}`);
      
      // Mostrar estructura para debugging
      console.log('\n📋 Respuesta completa del servidor:');
      console.log(JSON.stringify(error.response.data, null, 2));
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
// FUNCIÓN PARA AUTO-LOGIN AL INICIO
// ============================================================
async function autoLoginOnStart() {
  if (AUTO_LOGIN.enabled) {
    console.log(colors.cyan + '🤖 Realizando login automático...' + colors.reset);
    
    try {
      await login();
      
      if (authToken && currentUser) {
        console.log(colors.green + '✅ Autenticación automática exitosa' + colors.reset);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Pausa de 1.5 segundos
      } else {
        console.log(colors.red + '❌ Autenticación automática falló' + colors.reset);
        console.log(colors.yellow + '💡 Usa la opción 1 del menú para intentar de nuevo' + colors.reset);
        console.log(colors.yellow + '💡 O verifica las credenciales en AUTO_LOGIN' + colors.reset);
        await question('\nPresiona Enter para continuar...');
      }
    } catch (error) {
      console.log(colors.red + '❌ Error en autenticación automática: ' + error.message + colors.reset);
      await question('\nPresiona Enter para continuar...');
    }
  }
}

// ============================================================
// 2. GET ALL EXPENSES
// ============================================================
async function getAllExpenses() {
  showHeader('📋 GET /api/expenses - TODOS LOS GASTOS');
  
  console.log('Parámetros opcionales:');
  const page = await question('Página (default: 1): ') || '1';
  const limit = await question('Límite (default: 20): ') || '20';
  const status = await question('Estado (pending/approved/paid/rejected/cancelled): ');
  const category = await question('Categoría: ');
  
  try {
    const params = { page, limit };
    if (status) params.status = status;
    if (category) params.category = category;
    
    console.log(`\n${colors.cyan}Enviando GET a /api/expenses...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/expenses`, {
      ...getAxiosConfig(),
      params
    });
    
    if (response.data.success) {
      const expenses = response.data.data;
      const pagination = response.data.pagination;
      
      console.log('\n' + colors.green + '✅ Respuesta exitosa' + colors.reset);
      console.log(`Total de gastos: ${pagination.total}`);
      console.log(`Página ${pagination.page} de ${pagination.pages}`);
      console.log(`Mostrando ${expenses.length} gastos:\n`);
      
      expenses.forEach((expense, index) => {
        const statusColors = {
          pending: colors.yellow,
          approved: colors.green,
          paid: colors.blue,
          rejected: colors.red,
          cancelled: colors.red
        };
        
        console.log(`${index + 1}. ${colors.bright}${expense.title}${colors.reset}`);
        console.log(`   ID: ${expense.id.substring(0, 8)}...`);
        console.log(`   Estado: ${statusColors[expense.status]}${expense.status}${colors.reset}`);
        console.log(`   Monto: ${colors.green}${formatCurrency(expense.amount)}${colors.reset}`);
        console.log(`   Categoría: ${expense.category}`);
        console.log(`   Fecha: ${formatDate(expense.expenseDate)}`);
        if (expense.vendor) {
          console.log(`   Proveedor: ${expense.vendor}`);
        }
        console.log('');
      });
      
      console.log(colors.cyan + 'Paginación:' + colors.reset);
      console.log(JSON.stringify(pagination, null, 2));
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 3. GET EXPENSE BY ID
// ============================================================
async function getExpenseById() {
  showHeader('🔍 GET /api/expenses/:id - BUSCAR POR ID');
  
  const id = await question('Ingresa el ID del gasto: ');
  
  if (!id) {
    console.log(colors.red + '❌ ID requerido' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Enviando GET a /api/expenses/${id}...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/expenses/${id}`, getAxiosConfig());
    
    if (response.data.success) {
      const expense = response.data.data;
      
      console.log('\n' + colors.green + '✅ Gasto encontrado' + colors.reset);
      console.log(colors.bright + expense.title + colors.reset);
      console.log('─'.repeat(60));
      console.log(JSON.stringify(expense, null, 2));
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 4. GET PENDING APPROVAL
// ============================================================
async function getPendingApproval() {
  showHeader('⏳ GET /api/expenses/pending/approval - PENDIENTES');
  
  const minAmount = await question('Monto mínimo (default: 500): ') || '500';
  
  try {
    console.log(`\n${colors.cyan}Enviando GET a /api/expenses/pending/approval...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/expenses/pending/approval`, {
      ...getAxiosConfig(),
      params: { minAmount }
    });
    
    if (response.data.success) {
      const expenses = response.data.data;
      
      console.log('\n' + colors.green + `✅ ${response.data.count} gastos pendientes` + colors.reset);
      
      if (expenses.length > 0) {
        expenses.forEach((expense, index) => {
          console.log(`\n${index + 1}. ${colors.bright}${expense.title}${colors.reset}`);
          console.log(`   ID: ${expense.id.substring(0, 8)}...`);
          console.log(`   Monto: ${colors.yellow}${formatCurrency(expense.amount)}${colors.reset}`);
          console.log(`   Registrado por: ${expense.registeredByUser?.firstName} ${expense.registeredByUser?.lastName}`);
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
// 5. GET BY CATEGORY
// ============================================================
async function getByCategory() {
  showHeader('📁 GET /api/expenses/category/:category - POR CATEGORÍA');
  
  console.log('Categorías disponibles:');
  const categories = [
    'rent', 'utilities', 'equipment_purchase', 'equipment_maintenance',
    'staff_salary', 'cleaning_supplies', 'marketing', 'insurance',
    'taxes', 'other_expense'
  ];
  
  categories.forEach((cat, index) => {
    console.log(`  ${index + 1}. ${cat}`);
  });
  
  const choice = await question('\nSelecciona categoría (número): ');
  const category = categories[parseInt(choice) - 1];
  
  if (!category) {
    console.log(colors.red + '❌ Categoría inválida' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  const startDate = await question('Fecha inicio (YYYY-MM-DD, opcional): ');
  const endDate = await question('Fecha fin (YYYY-MM-DD, opcional): ');
  
  try {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    console.log(`\n${colors.cyan}Enviando GET a /api/expenses/category/${category}...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/expenses/category/${category}`, {
      ...getAxiosConfig(),
      params
    });
    
    if (response.data.success) {
      const expenses = response.data.data;
      
      console.log('\n' + colors.green + `✅ ${response.data.count} gastos en categoría ${category}` + colors.reset);
      
      if (expenses.length > 0) {
        const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        console.log(`Monto total: ${colors.green}${formatCurrency(total)}${colors.reset}\n`);
        
        expenses.forEach((expense, index) => {
          console.log(`${index + 1}. ${expense.title} - ${formatCurrency(expense.amount)}`);
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
// 6. GET UPCOMING RECURRING
// ============================================================
async function getUpcomingRecurring() {
  showHeader('🔄 GET /api/expenses/recurring/upcoming - RECURRENTES');
  
  const daysAhead = await question('Días hacia adelante (default: 7): ') || '7';
  
  try {
    console.log(`\n${colors.cyan}Enviando GET a /api/expenses/recurring/upcoming...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/expenses/recurring/upcoming`, {
      ...getAxiosConfig(),
      params: { daysAhead }
    });
    
    if (response.data.success) {
      const expenses = response.data.data;
      
      console.log('\n' + colors.green + `✅ ${response.data.count} gastos recurrentes próximos` + colors.reset);
      
      if (expenses.length > 0) {
        expenses.forEach((expense, index) => {
          console.log(`\n${index + 1}. ${expense.title}`);
          console.log(`   Monto: ${formatCurrency(expense.amount)}`);
          console.log(`   Frecuencia: ${expense.recurringFrequency}`);
          console.log(`   Próxima fecha: ${formatDate(expense.nextRecurringDate)}`);
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
// 7. CREATE EXPENSE
// ============================================================
async function createExpense() {
  showHeader('➕ POST /api/expenses - CREAR GASTO');
  
  console.log('Ingresa los datos del nuevo gasto:\n');
  
  const title = await question('Título: ');
  if (!title) {
    console.log(colors.red + '❌ Título requerido' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  const description = await question('Descripción: ');
  const amount = await question('Monto (Q): ');
  
  if (!amount || isNaN(amount)) {
    console.log(colors.red + '❌ Monto inválido' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  console.log('\nCategorías:');
  const categories = [
    'rent', 'utilities', 'equipment_purchase', 'equipment_maintenance',
    'staff_salary', 'cleaning_supplies', 'marketing', 'insurance',
    'taxes', 'other_expense'
  ];
  categories.forEach((cat, i) => console.log(`  ${i + 1}. ${cat}`));
  
  const catChoice = await question('Selecciona categoría: ');
  const category = categories[parseInt(catChoice) - 1];
  
  if (!category) {
    console.log(colors.red + '❌ Categoría inválida' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  const vendor = await question('Proveedor (opcional): ');
  const invoiceNumber = await question('Número de factura (opcional): ');
  
  const expenseData = {
    title,
    description,
    amount: parseFloat(amount),
    category,
    vendor: vendor || undefined,
    invoiceNumber: invoiceNumber || undefined
  };
  
  try {
    console.log(`\n${colors.cyan}Enviando POST a /api/expenses...${colors.reset}`);
    console.log('Datos:', JSON.stringify(expenseData, null, 2));
    
    const response = await axios.post(`${API_BASE_URL}/expenses`, expenseData, getAxiosConfig());
    
    if (response.data.success) {
      const expense = response.data.data;
      
      console.log('\n' + colors.green + '✅ Gasto creado exitosamente!' + colors.reset);
      console.log(`ID: ${expense.id}`);
      console.log(`Título: ${expense.title}`);
      console.log(`Monto: ${formatCurrency(expense.amount)}`);
      console.log(`Estado: ${expense.status}`);
      console.log('\nRespuesta completa:');
      console.log(JSON.stringify(response.data, null, 2));
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

// ============================================================
// 8. UPDATE EXPENSE
// ============================================================
async function updateExpense() {
  showHeader('✏️  PUT /api/expenses/:id - ACTUALIZAR GASTO');
  
  const id = await question('ID del gasto a actualizar: ');
  
  if (!id) {
    console.log(colors.red + '❌ ID requerido' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  console.log('\nIngresa los campos a actualizar (deja en blanco para mantener):\n');
  
  const title = await question('Nuevo título: ');
  const description = await question('Nueva descripción: ');
  const amount = await question('Nuevo monto: ');
  const vendor = await question('Nuevo proveedor: ');
  const notes = await question('Nuevas notas: ');
  
  const updateData = {};
  if (title) updateData.title = title;
  if (description) updateData.description = description;
  if (amount && !isNaN(amount)) updateData.amount = parseFloat(amount);
  if (vendor) updateData.vendor = vendor;
  if (notes) updateData.notes = notes;
  
  if (Object.keys(updateData).length === 0) {
    console.log(colors.yellow + '⚠️  No se especificaron cambios' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Enviando PUT a /api/expenses/${id}...${colors.reset}`);
    console.log('Datos:', JSON.stringify(updateData, null, 2));
    
    const response = await axios.put(`${API_BASE_URL}/expenses/${id}`, updateData, getAxiosConfig());
    
    if (response.data.success) {
      console.log('\n' + colors.green + '✅ Gasto actualizado exitosamente!' + colors.reset);
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
// 9-16. RESTO DE FUNCIONES (sin cambios)
// ============================================================
async function approveExpense() {
  showHeader('✅ POST /api/expenses/:id/approve - APROBAR GASTO');
  
  const id = await question('ID del gasto a aprobar: ');
  
  if (!id) {
    console.log(colors.red + '❌ ID requerido' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Enviando POST a /api/expenses/${id}/approve...${colors.reset}`);
    const response = await axios.post(`${API_BASE_URL}/expenses/${id}/approve`, {}, getAxiosConfig());
    
    if (response.data.success) {
      console.log('\n' + colors.green + '✅ Gasto aprobado exitosamente!' + colors.reset);
      console.log(JSON.stringify(response.data.data, null, 2));
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

async function rejectExpense() {
  showHeader('❌ POST /api/expenses/:id/reject - RECHAZAR GASTO');
  
  const id = await question('ID del gasto a rechazar: ');
  const reason = await question('Razón del rechazo: ');
  
  if (!id) {
    console.log(colors.red + '❌ ID requerido' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Enviando POST a /api/expenses/${id}/reject...${colors.reset}`);
    const response = await axios.post(`${API_BASE_URL}/expenses/${id}/reject`, { reason }, getAxiosConfig());
    
    if (response.data.success) {
      console.log('\n' + colors.green + '✅ Gasto rechazado' + colors.reset);
      console.log(JSON.stringify(response.data.data, null, 2));
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

async function cancelExpense() {
  showHeader('🚫 POST /api/expenses/:id/cancel - CANCELAR GASTO');
  
  const id = await question('ID del gasto a cancelar: ');
  const reason = await question('Razón de cancelación: ');
  
  if (!id) {
    console.log(colors.red + '❌ ID requerido' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Enviando POST a /api/expenses/${id}/cancel...${colors.reset}`);
    const response = await axios.post(`${API_BASE_URL}/expenses/${id}/cancel`, { reason }, getAxiosConfig());
    
    if (response.data.success) {
      console.log('\n' + colors.green + '✅ Gasto cancelado' + colors.reset);
      console.log(JSON.stringify(response.data.data, null, 2));
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

async function processRecurring() {
  showHeader('🔄 POST /api/expenses/recurring/process - PROCESAR RECURRENTES');
  
  const confirm = await question('¿Procesar gastos recurrentes? (s/n): ');
  
  if (confirm.toLowerCase() !== 's') {
    console.log('Operación cancelada');
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Enviando POST a /api/expenses/recurring/process...${colors.reset}`);
    const response = await axios.post(`${API_BASE_URL}/expenses/recurring/process`, {}, getAxiosConfig());
    
    if (response.data.success) {
      console.log('\n' + colors.green + '✅ Proceso completado' + colors.reset);
      console.log(JSON.stringify(response.data, null, 2));
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

async function getStats() {
  showHeader('📊 GET /api/expenses/stats/summary - ESTADÍSTICAS');
  
  const startDate = await question('Fecha inicio (YYYY-MM-DD): ');
  const endDate = await question('Fecha fin (YYYY-MM-DD): ');
  
  if (!startDate || !endDate) {
    console.log(colors.red + '❌ Fechas requeridas' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Enviando GET a /api/expenses/stats/summary...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/expenses/stats/summary`, {
      ...getAxiosConfig(),
      params: { startDate, endDate }
    });
    
    if (response.data.success) {
      const stats = response.data.data;
      
      console.log('\n' + colors.green + '✅ Estadísticas obtenidas' + colors.reset);
      console.log(`\nTotal de gastos: ${stats.totalExpenses}`);
      console.log(`Monto total: ${formatCurrency(stats.totalAmount)}`);
      console.log(`Promedio: ${formatCurrency(stats.averageAmount)}`);
      console.log(`Máximo: ${formatCurrency(stats.maxAmount)}`);
      console.log(`Mínimo: ${formatCurrency(stats.minAmount)}`);
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

async function getBreakdown() {
  showHeader('📊 GET /api/expenses/stats/breakdown - BREAKDOWN');
  
  const startDate = await question('Fecha inicio (YYYY-MM-DD): ');
  const endDate = await question('Fecha fin (YYYY-MM-DD): ');
  
  if (!startDate || !endDate) {
    console.log(colors.red + '❌ Fechas requeridas' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Enviando GET a /api/expenses/stats/breakdown...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/expenses/stats/breakdown`, {
      ...getAxiosConfig(),
      params: { startDate, endDate }
    });
    
    if (response.data.success) {
      const breakdown = response.data.data;
      
      console.log('\n' + colors.green + '✅ Breakdown por categoría' + colors.reset + '\n');
      
      breakdown.forEach((item, index) => {
        console.log(`${index + 1}. ${item.category}`);
        console.log(`   Cantidad: ${item.count}`);
        console.log(`   Total: ${formatCurrency(item.total)}`);
      });
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

async function getTopVendors() {
  showHeader('🏆 GET /api/expenses/stats/vendors - TOP PROVEEDORES');
  
  const startDate = await question('Fecha inicio (YYYY-MM-DD): ');
  const endDate = await question('Fecha fin (YYYY-MM-DD): ');
  const limit = await question('Límite (default: 10): ') || '10';
  
  if (!startDate || !endDate) {
    console.log(colors.red + '❌ Fechas requeridas' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Enviando GET a /api/expenses/stats/vendors...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/expenses/stats/vendors`, {
      ...getAxiosConfig(),
      params: { startDate, endDate, limit }
    });
    
    if (response.data.success) {
      const vendors = response.data.data;
      
      console.log('\n' + colors.green + '✅ Top proveedores' + colors.reset + '\n');
      
      vendors.forEach((vendor, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        console.log(`${medal} ${vendor.vendor}`);
        console.log(`   Total: ${formatCurrency(vendor.totalSpent)}`);
        console.log(`   Transacciones: ${vendor.transactionCount}`);
        console.log(`   Promedio: ${formatCurrency(vendor.averageTransaction)}`);
      });
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

async function deleteExpense() {
  showHeader('🗑️  DELETE /api/expenses/:id - ELIMINAR GASTO');
  
  const id = await question('ID del gasto a ELIMINAR: ');
  
  if (!id) {
    console.log(colors.red + '❌ ID requerido' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  const confirm = await question(colors.red + '⚠️  ¿CONFIRMAR ELIMINACIÓN? (escribe "ELIMINAR"): ' + colors.reset);
  
  if (confirm !== 'ELIMINAR') {
    console.log(colors.yellow + 'Eliminación cancelada' + colors.reset);
    await question('\nPresiona Enter para continuar...');
    return;
  }
  
  try {
    console.log(`\n${colors.cyan}Enviando DELETE a /api/expenses/${id}...${colors.reset}`);
    const response = await axios.delete(`${API_BASE_URL}/expenses/${id}`, getAxiosConfig());
    
    if (response.data.success) {
      console.log('\n' + colors.green + '✅ Gasto eliminado exitosamente' + colors.reset);
      console.log(response.data.message);
    } else {
      console.log(colors.red + '❌ Error: ' + response.data.message + colors.reset);
    }
  } catch (error) {
    handleAPIError(error);
  }
  
  await question('\nPresiona Enter para continuar...');
}

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
    console.log(colors.bright + colors.cyan + '\n💰 Test de API REST - Gastos' + colors.reset);
    console.log('Servidor: ' + API_BASE_URL);
    
    // ✅ NUEVO: Intentar login automático al inicio
    if (AUTO_LOGIN.enabled) {
      console.log(colors.cyan + `Login automático: ${AUTO_LOGIN.enabled ? 'HABILITADO' : 'DESHABILITADO'}` + colors.reset);
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
          await getAllExpenses();
          break;
        case '3':
          await getExpenseById();
          break;
        case '4':
          await getPendingApproval();
          break;
        case '5':
          await getByCategory();
          break;
        case '6':
          await getUpcomingRecurring();
          break;
        case '7':
          await createExpense();
          break;
        case '8':
          await updateExpense();
          break;
        case '9':
          await approveExpense();
          break;
        case '10':
          await rejectExpense();
          break;
        case '11':
          await cancelExpense();
          break;
        case '12':
          await processRecurring();
          break;
        case '13':
          await getStats();
          break;
        case '14':
          await getBreakdown();
          break;
        case '15':
          await getTopVendors();
          break;
        case '16':
          await deleteExpense();
          break;
        case '17':
          await checkServer();
          break;
        case '18':
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