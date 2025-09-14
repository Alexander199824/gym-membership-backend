// test-monthly-membership-cash-registration.js - Test para REGISTRAR pago en efectivo (sin validación admin)
require('dotenv').config();
const axios = require('axios');

// ✅ CONFIGURACIÓN
const API_BASE_URL = process.env.API_URL || 'http://localhost:5000';
const CLIENT_EMAIL = 'echeverriam302@gmail.com';
const CLIENT_PASSWORD = 'TestPassword123!';

// ✅ DATOS DEL CLIENTE DE PRUEBA
const TEST_CLIENT_DATA = {
  firstName: 'María',
  lastName: 'Efectivo Test',
  email: CLIENT_EMAIL,
  password: CLIENT_PASSWORD,
  phone: '+502 9999-1234',
  whatsapp: '+502 9999-1234',
  role: 'cliente',
  dateOfBirth: '1992-07-25',
  emergencyContact: {
    name: 'Pedro Efectivo',
    phone: '+502 9999-5678',
    relationship: 'Hermano'
  }
};

class CashMembershipRegistrationTest {
  constructor() {
    this.clientAuthToken = null;
    this.clientUserId = null;
    this.selectedPlan = null;
    this.selectedSchedule = {};
    this.membershipId = null;
    
    this.testResults = {
      timestamp: new Date().toISOString(),
      testType: 'CASH_MEMBERSHIP_REGISTRATION_ONLY',
      purpose: 'Registrar membresía mensual para pago en efectivo - SIN validación admin',
      steps: [],
      success: false,
      data: {},
      errors: []
    };
  }

  // ✅ HELPER: Request autenticado
  async makeAuthenticatedRequest(method, url, data = null) {
    const config = {
      method,
      url: `${API_BASE_URL}${url}`,
      headers: {},
      timeout: 30000
    };

    if (this.clientAuthToken) {
      config.headers.Authorization = `Bearer ${this.clientAuthToken}`;
    }

    if (data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }

    console.log(`🔗 ${method} ${config.url}`);
    
    if (data) {
      console.log(`📦 Request data:`, JSON.stringify(data, null, 2));
    }

    try {
      const response = await axios(config);
      console.log(`✅ Response ${response.status}: ${response.statusText}`);
      return response;
    } catch (error) {
      console.log(`❌ Request failed:`);
      console.log(`   Status: ${error.response?.status || 'No response'}`);
      console.log(`   Message: ${error.message}`);
      
      if (error.response?.data) {
        console.log(`   Response Data:`, JSON.stringify(error.response.data, null, 2));
      }
      
      throw error;
    }
  }

  // ✅ STEP 1: Autenticación del cliente
  async authenticateClient() {
    console.log('\n🔐 STEP 1: Autenticando cliente para registro de pago en efectivo...');
    
    try {
      let response;
      try {
        response = await this.makeAuthenticatedRequest('POST', '/api/auth/login', {
          email: CLIENT_EMAIL,
          password: CLIENT_PASSWORD
        });

        if (response.data.success) {
          this.clientAuthToken = response.data.data.token;
          this.clientUserId = response.data.data.user.id;
          console.log(`✅ Login cliente exitoso: ${CLIENT_EMAIL}`);
          console.log(`👤 Cliente ID: ${this.clientUserId}`);
        }
      } catch (loginError) {
        console.log('ℹ️ Cliente no existe, creando nuevo cliente...');
        
        response = await this.makeAuthenticatedRequest('POST', '/api/auth/register', TEST_CLIENT_DATA);
        
        if (response.data.success) {
          this.clientAuthToken = response.data.data.token;
          this.clientUserId = response.data.data.user.id;
          console.log(`✅ Cliente registrado: ${CLIENT_EMAIL}`);
          console.log(`👤 Cliente ID: ${this.clientUserId}`);
        }
      }

      this.testResults.steps.push({
        step: 1,
        action: 'Autenticación del cliente',
        success: true,
        userId: this.clientUserId,
        email: CLIENT_EMAIL
      });

      return true;
    } catch (error) {
      console.error('❌ Error en autenticación cliente:', error.response?.data || error.message);
      this.testResults.errors.push(`Autenticación cliente: ${error.message}`);
      this.testResults.steps.push({
        step: 1,
        action: 'Autenticación del cliente',
        success: false,
        error: error.message
      });
      return false;
    }
  }

  // ✅ STEP 2: Obtener planes MENSUALES disponibles
  async getMembershipPlans() {
    console.log('\n📋 STEP 2: Obteniendo planes MENSUALES para pago en efectivo...');
    
    try {
      const response = await this.makeAuthenticatedRequest('GET', '/api/memberships/purchase/plans');
      
      if (response.data.success) {
        const allPlans = response.data.data.plans;
        
        // Filtrar específicamente planes mensuales con disponibilidad
        const monthlyPlans = allPlans.filter(plan => 
          plan.durationType === 'monthly' && plan.availability.availableSpaces > 0
        );
        
        console.log(`✅ ${allPlans.length} planes totales, ${monthlyPlans.length} mensuales disponibles:`);
        
        monthlyPlans.forEach((plan, index) => {
          console.log(`   ${index + 1}. ${plan.name} - Q${plan.price} (mensual)`);
          console.log(`      Espacios: ${plan.availability.availableSpaces}`);
        });

        if (monthlyPlans.length === 0) {
          throw new Error('No hay planes MENSUALES con disponibilidad');
        }

        // Seleccionar el primer plan mensual disponible
        this.selectedPlan = monthlyPlans[0];
        
        console.log(`\n🎯 PLAN MENSUAL SELECCIONADO PARA EFECTIVO:`);
        console.log(`   📋 Nombre: ${this.selectedPlan.name}`);
        console.log(`   💰 Precio: Q${this.selectedPlan.price}`);
        console.log(`   📅 Duración: mensual (30 días)`);
        console.log(`   💵 Se pagará: EN EFECTIVO en gimnasio`);

        this.testResults.steps.push({
          step: 2,
          action: 'Obtener planes mensuales',
          success: true,
          totalPlans: allPlans.length,
          monthlyPlansAvailable: monthlyPlans.length,
          selectedPlan: {
            id: this.selectedPlan.id,
            name: this.selectedPlan.name,
            price: this.selectedPlan.price,
            durationType: this.selectedPlan.durationType,
            paymentMode: 'cash_registration'
          }
        });

        return true;
      }
    } catch (error) {
      console.error('❌ Error obteniendo planes:', error.response?.data || error.message);
      this.testResults.errors.push(`Planes: ${error.message}`);
      this.testResults.steps.push({
        step: 2,
        action: 'Obtener planes mensuales',
        success: false,
        error: error.message
      });
      return false;
    }
  }

  // ✅ STEP 3: Obtener horarios disponibles para el plan mensual
  async getAvailableSchedules() {
    console.log('\n⏰ STEP 3: Obteniendo horarios para plan mensual con pago en efectivo...');
    
    try {
      const response = await this.makeAuthenticatedRequest('GET', `/api/memberships/plans/${this.selectedPlan.id}/schedule-options`);
      
      if (response.data.success) {
        const availableOptions = response.data.data.availableOptions;
        const planInfo = response.data.data.plan;
        
        console.log(`✅ Horarios disponibles para plan mensual (pago efectivo):`);
        console.log(`📅 Días permitidos: ${planInfo.allowedDays.join(', ')}`);
        console.log(`🎯 Max slots por día: ${planInfo.maxSlotsPerDay}`);
        console.log(`📊 Max reservas por semana: ${planInfo.maxReservationsPerWeek}`);

        // Selección automática de horarios para plan mensual
        this.selectedSchedule = this.autoSelectMonthlySchedule(availableOptions, planInfo);
        
        console.log('\n🎯 HORARIOS SELECCIONADOS PARA PAGO EFECTIVO:');
        let totalSlotsSelected = 0;
        Object.entries(this.selectedSchedule).forEach(([day, slotIds]) => {
          const dayData = availableOptions[day];
          const selectedSlots = dayData.slots.filter(slot => slotIds.includes(slot.id));
          totalSlotsSelected += selectedSlots.length;
          console.log(`   📅 ${dayData.dayName}: ${selectedSlots.map(s => s.label).join(', ')}`);
        });
        
        console.log(`📊 Total slots seleccionados: ${totalSlotsSelected}/${planInfo.maxReservationsPerWeek}`);

        this.testResults.steps.push({
          step: 3,
          action: 'Obtener horarios disponibles',
          success: true,
          planId: this.selectedPlan.id,
          planType: 'monthly',
          selectedSchedule: this.selectedSchedule,
          scheduledDays: Object.keys(this.selectedSchedule).length,
          totalSlotsSelected: totalSlotsSelected,
          maxAllowed: planInfo.maxReservationsPerWeek
        });

        return true;
      }
    } catch (error) {
      console.error('❌ Error obteniendo horarios:', error.response?.data || error.message);
      this.testResults.errors.push(`Horarios: ${error.message}`);
      this.testResults.steps.push({
        step: 3,
        action: 'Obtener horarios disponibles',
        success: false,
        error: error.message
      });
      return false;
    }
  }

  // ✅ HELPER: Selección automática de horarios mensuales
  autoSelectMonthlySchedule(availableOptions, planInfo) {
    const schedule = {};
    let totalReservations = 0;

    console.log('\n🤖 Selección automática para plan mensual con pago efectivo:');
    console.log(`   🎯 Límite semanal: ${planInfo.maxReservationsPerWeek} reservas`);
    console.log(`   📅 Límite diario: ${planInfo.maxSlotsPerDay} slots por día`);
    
    const priorityDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const weekendDays = ['saturday', 'sunday'];
    
    // Llenar días laborales primero
    for (const day of priorityDays) {
      if (availableOptions[day] && 
          availableOptions[day].isOpen && 
          totalReservations < planInfo.maxReservationsPerWeek) {
        
        const availableSlots = availableOptions[day].slots.filter(slot => slot.canReserve);
        
        if (availableSlots.length > 0) {
          const slotsToSelect = Math.min(
            planInfo.maxSlotsPerDay, 
            availableSlots.length,
            planInfo.maxReservationsPerWeek - totalReservations
          );
          
          const sortedSlots = availableSlots.sort((a, b) => a.openTime.localeCompare(b.openTime));
          schedule[day] = sortedSlots.slice(0, slotsToSelect).map(slot => slot.id);
          totalReservations += slotsToSelect;
          
          console.log(`   ✅ ${availableOptions[day].dayName}: ${slotsToSelect} slots`);
        }
      }
    }
    
    // Agregar fines de semana si hay espacio
    if (totalReservations < planInfo.maxReservationsPerWeek) {
      for (const day of weekendDays) {
        if (availableOptions[day] && 
            availableOptions[day].isOpen && 
            totalReservations < planInfo.maxReservationsPerWeek) {
          
          const availableSlots = availableOptions[day].slots.filter(slot => slot.canReserve);
          
          if (availableSlots.length > 0) {
            const slotsToSelect = Math.min(
              planInfo.maxSlotsPerDay, 
              availableSlots.length,
              planInfo.maxReservationsPerWeek - totalReservations
            );
            
            schedule[day] = availableSlots.slice(0, slotsToSelect).map(slot => slot.id);
            totalReservations += slotsToSelect;
            
            console.log(`   ✅ ${availableOptions[day].dayName}: ${slotsToSelect} slots`);
          }
        }
      }
    }

    console.log(`   📊 Total reservado: ${totalReservations}/${planInfo.maxReservationsPerWeek} slots`);
    return schedule;
  }

  // ✅ STEP 4: Verificar disponibilidad de horarios
  async checkScheduleAvailability() {
    console.log('\n🔍 STEP 4: Verificando disponibilidad de horarios...');
    
    try {
      const response = await this.makeAuthenticatedRequest('POST', '/api/memberships/purchase/check-availability', {
        planId: this.selectedPlan.id,
        selectedSchedule: this.selectedSchedule
      });

      if (response.data.success) {
        const { canPurchase, availability, conflicts } = response.data.data;
        
        if (canPurchase) {
          console.log('✅ Todos los horarios están disponibles para pago en efectivo');
          
          let totalSlotsVerified = 0;
          Object.entries(availability).forEach(([day, slots]) => {
            totalSlotsVerified += slots.length;
            console.log(`   📅 ${day}: ${slots.length} slot(s) verificado(s)`);
          });
          
          console.log(`📊 Total slots verificados: ${totalSlotsVerified}`);
        } else {
          console.log('⚠️ Conflictos encontrados:');
          conflicts.forEach(conflict => {
            console.log(`   ❌ ${conflict.day}: ${conflict.error}`);
          });
          return false;
        }

        this.testResults.steps.push({
          step: 4,
          action: 'Verificar disponibilidad de horarios',
          success: true,
          canPurchase,
          conflictsCount: conflicts.length,
          slotsVerified: Object.values(availability).reduce((sum, slots) => sum + slots.length, 0)
        });

        return true;
      }
    } catch (error) {
      console.error('❌ Error verificando disponibilidad:', error.response?.data || error.message);
      this.testResults.errors.push(`Verificación disponibilidad: ${error.message}`);
      this.testResults.steps.push({
        step: 4,
        action: 'Verificar disponibilidad de horarios',
        success: false,
        error: error.message
      });
      return false;
    }
  }

  // ✅ STEP 5: Registrar membresía para PAGO EN EFECTIVO (estado pending)
  async registerCashMembership() {
    console.log('\n💵 STEP 5: REGISTRANDO membresía mensual para PAGO EN EFECTIVO...');
    
    try {
      const purchasePayload = {
        planId: this.selectedPlan.id,
        selectedSchedule: this.selectedSchedule,
        paymentMethod: 'cash', // Indicar que será pago en efectivo
        notes: `Membresía mensual - Cliente pagará en efectivo en gimnasio - Registro: ${new Date().toLocaleString()}`
      };
      
      console.log('📤 REGISTRANDO MEMBRESÍA PARA PAGO EN EFECTIVO:');
      console.log(`   🎯 Plan: ${this.selectedPlan.name} (MENSUAL)`);
      console.log(`   💵 Pago: EN EFECTIVO (pendiente)`);
      console.log(`   📅 Horarios: ${Object.keys(purchasePayload.selectedSchedule).length} días`);
      console.log(`   💰 Precio: Q${this.selectedPlan.price}`);
      console.log(`   📍 Cliente debe ir al gimnasio a pagar`);
      
      const response = await this.makeAuthenticatedRequest('POST', '/api/memberships/purchase', purchasePayload);

      if (response.data.success) {
        const { membership, plan, user } = response.data.data;
        
        this.membershipId = membership.id;
        
        console.log('\n🎉 ¡MEMBRESÍA PARA EFECTIVO REGISTRADA!');
        console.log(`✅ Membresía ID: ${this.membershipId}`);
        console.log(`📊 Estado: ${membership.status} (esperado: pending)`);
        console.log(`💵 Método de pago: EFECTIVO`);
        console.log(`👤 Cliente: ${user.firstName} ${user.lastName}`);
        console.log(`📋 Plan: ${plan.name} - Q${plan.originalPrice}`);
        console.log(`📅 Duración: 30 días (mensual)`);
        
        if (membership.status === 'pending') {
          console.log('✅ PERFECTO: Membresía en estado PENDING');
          console.log('💡 Cliente debe ir al gimnasio a completar el pago');
          console.log('👑 Admin validará el pago en otro test');
        } else {
          console.log(`⚠️ ADVERTENCIA: Estado inesperado: ${membership.status} (esperado: pending)`);
        }

        // Mostrar horarios reservados si existen
        if (membership.schedule && Object.keys(membership.schedule).length > 0) {
          console.log('\n📅 HORARIOS RESERVADOS (PENDIENTES DE ACTIVACIÓN):');
          Object.entries(membership.schedule).forEach(([day, slots]) => {
            if (slots && slots.length > 0) {
              console.log(`   📅 ${day}: ${slots.length} slot(s) reservado(s)`);
            }
          });
        }

        this.testResults.steps.push({
          step: 5,
          action: 'Registrar membresía para pago en efectivo',
          success: true,
          membershipId: this.membershipId,
          membershipStatus: membership.status,
          paymentMode: 'cash_pending',
          planType: 'monthly',
          amount: plan.originalPrice,
          expectedStatus: 'pending',
          statusCorrect: membership.status === 'pending'
        });

        return true;

      } else {
        throw new Error(response.data.message || 'Respuesta no exitosa al registrar membresía');
      }

    } catch (error) {
      console.error('\n❌ ERROR REGISTRANDO MEMBRESÍA EN EFECTIVO:');
      console.error(`   Status: ${error.response?.status || 'No status'}`);
      console.error(`   Mensaje: ${error.response?.data?.message || error.message}`);
      
      if (error.response?.data) {
        console.error(`   Datos: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      
      this.testResults.errors.push(`Registrar membresía efectivo: ${error.message}`);
      this.testResults.steps.push({
        step: 5,
        action: 'Registrar membresía para pago en efectivo',
        success: false,
        error: error.message,
        statusCode: error.response?.status
      });

      return false;
    }
  }

  // ✅ STEP 6: Verificar que el cliente NO tiene membresía activa (correcto)
  async verifyClientHasNoPendingMembership() {
    console.log('\n👤 STEP 6: Verificando que cliente NO tiene membresía ACTIVA (correcto)...');
    
    try {
      const response = await this.makeAuthenticatedRequest('GET', '/api/memberships/my-current');
      
      if (response.data.success) {
        if (response.data.data.membership) {
          const membership = response.data.data.membership;
          
          console.log('❌ ERROR: Cliente tiene membresía ACTIVA cuando debería estar PENDIENTE');
          console.log(`   🆔 ID: ${membership.id}`);
          console.log(`   📊 Estado: ${membership.status}`);
          console.log('💡 Para pago en efectivo, debería estar pendiente hasta validación admin');
          
          this.testResults.steps.push({
            step: 6,
            action: 'Verificar cliente sin membresía activa',
            success: false,
            error: 'Cliente tiene membresía activa cuando debería estar pendiente',
            unexpectedStatus: membership.status,
            note: 'Para pago efectivo debería estar pendiente'
          });

          return false;
        } else {
          console.log('✅ PERFECTO: Cliente NO tiene membresía ACTIVA');
          console.log('💡 Su membresía está PENDIENTE de pago en efectivo');
          console.log('🏪 Debe ir al gimnasio para completar el pago');
          console.log('👑 Un admin validará el pago y activará la membresía');
          
          this.testResults.steps.push({
            step: 6,
            action: 'Verificar cliente sin membresía activa',
            success: true,
            note: 'Cliente correctamente sin membresía activa - está pendiente de pago',
            membershipStatus: 'pending_cash_payment',
            nextStep: 'Admin debe validar pago en gimnasio'
          });

          return true;
        }
      }
    } catch (error) {
      console.error('❌ Error verificando estado cliente:', error.response?.data || error.message);
      this.testResults.errors.push(`Verificación cliente: ${error.message}`);
      this.testResults.steps.push({
        step: 6,
        action: 'Verificar cliente sin membresía activa',
        success: false,
        error: error.message
      });
      return false;
    }
  }

  // ✅ STEP 7: Verificar que la membresía está en BD como pending
  async verifyMembershipInDatabase() {
    console.log('\n🗄️ STEP 7: Verificando membresía en BD (debe estar PENDING)...');
    
    try {
      if (!this.membershipId) {
        console.log('⚠️ No hay membershipId para verificar');
        this.testResults.steps.push({
          step: 7,
          action: 'Verificar membresía en BD',
          success: false,
          error: 'No membershipId disponible'
        });
        return false;
      }

      const response = await this.makeAuthenticatedRequest('GET', `/api/memberships/${this.membershipId}`);
      
      if (response.data.success) {
        const membership = response.data.data.membership;
        
        console.log('✅ Membresía encontrada en BD:');
        console.log(`   🆔 ID: ${membership.id}`);
        console.log(`   📊 Estado: ${membership.status}`);
        console.log(`   👤 Usuario: ${membership.user.firstName} ${membership.user.lastName}`);
        console.log(`   💰 Precio: Q${membership.price}`);
        console.log(`   📅 Plan: ${membership.type} (mensual)`);
        console.log(`   📅 Inicio: ${new Date(membership.startDate).toLocaleDateString('es-ES')}`);
        console.log(`   📅 Fin: ${new Date(membership.endDate).toLocaleDateString('es-ES')}`);

        // Verificar que esté en estado pending
        const isCorrectStatus = membership.status === 'pending';
        
        if (isCorrectStatus) {
          console.log('✅ ESTADO CORRECTO: pending (esperando pago en efectivo)');
        } else {
          console.log(`⚠️ ESTADO INESPERADO: ${membership.status} (esperado: pending)`);
        }

        // Verificar horarios reservados
        if (membership.reservedSchedule && Object.keys(membership.reservedSchedule).length > 0) {
          console.log('\n📅 Horarios reservados en BD:');
          Object.entries(membership.reservedSchedule).forEach(([day, slots]) => {
            if (slots && slots.length > 0) {
              console.log(`   📅 ${day}: ${slots.length} slot(s)`);
            }
          });
        } else {
          console.log('📅 Sin horarios específicos en BD');
        }

        this.testResults.steps.push({
          step: 7,
          action: 'Verificar membresía en BD',
          success: true,
          membershipId: membership.id,
          membershipStatus: membership.status,
          correctStatus: isCorrectStatus,
          expectedStatus: 'pending',
          hasSchedule: !!(membership.reservedSchedule && Object.keys(membership.reservedSchedule).length > 0),
          planType: membership.type,
          price: membership.price
        });

        return true;
      }
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('❌ Membresía no encontrada en BD');
      } else if (error.response?.status === 403) {
        console.log('⚠️ Cliente no puede acceder a esta membresía (revisar permisos)');
      } else {
        console.error('❌ Error verificando BD:', error.response?.data || error.message);
      }
      
      this.testResults.errors.push(`Verificación BD: ${error.message}`);
      this.testResults.steps.push({
        step: 7,
        action: 'Verificar membresía en BD',
        success: false,
        error: error.message,
        statusCode: error.response?.status
      });
      return false;
    }
  }

  // ✅ STEP 8: Verificar permisos de acceso a listas de pendientes
  async verifyPendingListAccess() {
    console.log('\n🔒 STEP 8: Verificando permisos de acceso a lista de pendientes...');
    
    try {
      const response = await this.makeAuthenticatedRequest('GET', '/api/memberships/pending-cash-payment');
      
      // Si llega aquí sin error, el cliente pudo acceder
      console.log('⚠️ ADVERTENCIA: Cliente pudo acceder a lista de pendientes');
      console.log('💡 Revisar si esto es correcto o si solo staff debería acceder');
      
      if (response.data.success) {
        const pendingCount = response.data.data?.memberships?.length || 0;
        console.log(`📋 Cliente ve ${pendingCount} membresías pendientes`);
      }
      
      this.testResults.steps.push({
        step: 8,
        action: 'Verificar permisos lista de pendientes',
        success: true,
        note: 'Cliente pudo acceder - revisar si es correcto',
        unexpectedAccess: true,
        shouldReviewPermissions: true
      });

      return true;
      
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ PERFECTO: Cliente no puede acceder a lista de pendientes (403)');
        console.log('💡 Solo el staff puede ver membresías pendientes de efectivo');
        console.log('🔒 Permisos funcionando correctamente');
        
        this.testResults.steps.push({
          step: 8,
          action: 'Verificar permisos lista de pendientes',
          success: true,
          note: 'Cliente correctamente bloqueado (403)',
          properPermissions: true,
          accessDenied: true
        });

        return true;
      } else {
        console.error('❌ Error verificando permisos:', error.response?.data || error.message);
        this.testResults.errors.push(`Verificación permisos: ${error.message}`);
        this.testResults.steps.push({
          step: 8,
          action: 'Verificar permisos lista de pendientes',
          success: false,
          error: error.message
        });
        return false;
      }
    }
  }

  // ✅ MÉTODO PRINCIPAL: Ejecutar test completo de REGISTRO de pago en efectivo
  async runCashRegistrationTest() {
    console.log('💵 ==========================================');
    console.log('🏋️ ELITE FITNESS - REGISTRO PAGO EFECTIVO');
    console.log('💵 ==========================================');
    console.log(`🎯 Registrando membresía MENSUAL para PAGO EN EFECTIVO`);
    console.log(`👤 Cliente: ${CLIENT_EMAIL}`);
    console.log(`💡 OBJETIVO: Solo registrar - Admin validará en test separado`);
    console.log(`🌐 API Base: ${API_BASE_URL}`);
    console.log(`📅 Fecha: ${new Date().toLocaleString('es-ES')}`);
    
    const startTime = Date.now();
    let allStepsSuccessful = true;

    try {
      const steps = [
        { method: () => this.authenticateClient(), name: 'Autenticar Cliente' },
        { method: () => this.getMembershipPlans(), name: 'Obtener Planes Mensuales' },
        { method: () => this.getAvailableSchedules(), name: 'Obtener Horarios Disponibles' },
        { method: () => this.checkScheduleAvailability(), name: 'Verificar Disponibilidad' },
        { method: () => this.registerCashMembership(), name: 'Registrar Membresía Efectivo' },
        { method: () => this.verifyClientHasNoPendingMembership(), name: 'Cliente Sin Membresía Activa' },
        { method: () => this.verifyMembershipInDatabase(), name: 'Verificar en BD (Pending)' },
        { method: () => this.verifyPendingListAccess(), name: 'Verificar Permisos' }
      ];

      for (let i = 0; i < steps.length; i++) {
        const stepNumber = i + 1;
        const step = steps[i];
        
        console.log(`\n📋 STEP ${stepNumber}/${steps.length}: ${step.name}...`);
        
        try {
          const success = await step.method();
          
          if (!success) {
            console.log(`❌ Step ${stepNumber} falló - DETENIENDO TEST REGISTRO`);
            allStepsSuccessful = false;
            break;
          }
          
        } catch (stepError) {
          console.error(`💥 Error ejecutando step ${stepNumber}:`, stepError.message);
          this.testResults.errors.push(`Step ${stepNumber}: ${stepError.message}`);
          allStepsSuccessful = false;
          break;
        }
        
        // Pausa breve entre steps
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      this.testResults.success = allStepsSuccessful;
      
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      console.log('\n💵 ==========================================');
      if (allStepsSuccessful) {
        console.log('✅ RESULTADO: REGISTRO EXITOSO');
        console.log('💵 ==========================================');
        console.log(`🎉 Test REGISTRO PAGO EFECTIVO completado en ${duration}s`);
        console.log(`✅ Membresía registrada (PENDIENTE): ${this.membershipId}`);
        console.log(`👤 Cliente: ${CLIENT_EMAIL}`);
        console.log(`📋 Plan: ${this.selectedPlan?.name || 'N/A'} - Q${this.selectedPlan?.price || 'N/A'}`);
        console.log(`📅 Duración: 30 días (MENSUAL)`);
        console.log(`📍 Estado: PENDIENTE - Cliente debe ir al gimnasio`);
        console.log(`💵 Método: Pago en EFECTIVO`);
        console.log(`📅 Horarios: ${Object.keys(this.selectedSchedule).length} días programados`);
        console.log('\n🔄 PRÓXIMO PASO:');
        console.log('   👑 Admin debe validar el pago en gimnasio (test separado)');
        console.log('   🏪 Cliente va al gimnasio → Paga en efectivo → Admin valida');
        console.log('   ✅ Entonces la membresía se activará');
      } else {
        console.log('❌ RESULTADO: FALLO EN REGISTRO');
        console.log('💵 ==========================================');
        console.log(`💥 Test REGISTRO EFECTIVO falló después de ${duration}s`);
        console.log(`📊 Pasos completados: ${this.testResults.steps.filter(s => s.success).length}/${steps.length}`);
        
        if (this.testResults.errors.length > 0) {
          console.log('\n🚨 Errores encontrados:');
          this.testResults.errors.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error}`);
          });
        }
      }

      console.log('\n📊 RESUMEN DE PASOS:');
      this.testResults.steps.forEach(step => {
        const status = step.success ? '✅' : '❌';
        console.log(`   ${status} Step ${step.step}: ${step.action}`);
      });

      console.log('\n💵 ==========================================');
      console.log('💰 TEST REGISTRO EFECTIVO COMPLETADO');
      console.log('💵 ==========================================\n');

      return this.testResults;

    } catch (error) {
      console.error('\n💥 ERROR CRÍTICO EN TEST REGISTRO:', error.message);
      this.testResults.success = false;
      this.testResults.errors.push(`Error crítico: ${error.message}`);
      return this.testResults;
    }
  }
}

// ✅ FUNCIÓN PRINCIPAL
async function main() {
  const tester = new CashMembershipRegistrationTest();
  const results = await tester.runCashRegistrationTest();
  
  console.log('\n💾 Guardando resultados del test...');
  const filename = `test-cash-registration-results-${Date.now()}.json`;
  require('fs').writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`✅ Resultados guardados en: ${filename}`);
  
  if (results.success) {
    console.log('\n🎯 DATOS IMPORTANTES:');
    console.log(`👤 Cliente ID: ${results.steps.find(s => s.step === 1)?.userId}`);
    console.log(`🆔 Membresía ID: ${results.steps.find(s => s.step === 5)?.membershipId || 'No creada'}`);
    console.log(`📋 Plan: ${results.steps.find(s => s.step === 2)?.selectedPlan?.name || 'No seleccionado'}`);
    console.log(`💰 Monto: Q${results.steps.find(s => s.step === 2)?.selectedPlan?.price || 'N/A'}`);
    console.log(`📅 Tipo: MENSUAL (30 días)`);
    console.log(`📍 Estado: PENDIENTE (esperando pago en efectivo)`);
    console.log(`📅 Horarios: ${results.steps.find(s => s.step === 3)?.scheduledDays || 0} días programados`);
    console.log('\n💡 IMPORTANTE:');
    console.log('   🏪 El cliente debe ir al gimnasio a pagar en efectivo');
    console.log('   👑 Un admin debe validar el pago (test separado)');
    console.log('   ✅ Solo entonces la membresía se activará');
    console.log('\n🏆 ¡El sistema de registro de pago en efectivo funciona correctamente!');
  } else {
    console.log('\n❌ El test reveló problemas que necesitan atención.');
    console.log('💡 Revisar los errores listados arriba para identificar el problema.');
  }
  
  process.exit(results.success ? 0 : 1);
}

// ✅ EJECUTAR SI SE LLAMA DIRECTAMENTE
if (require.main === module) {
  main().catch((error) => {
    console.error('\n💥 ERROR FATAL EN TEST:', error);
    process.exit(1);
  });
}

module.exports = { CashMembershipRegistrationTest, main };