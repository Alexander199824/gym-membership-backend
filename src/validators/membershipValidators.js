// src/validators/membershipValidators.js - COMPLETO: Todos los validadores existentes + nuevos

const { body, param, query } = require('express-validator');

// =============== VALIDADORES EXISTENTES MANTENIDOS ===============

// Validador para crear membresía (EXISTENTE)
const createMembershipValidator = [
  body('userId')
    .notEmpty()
    .withMessage('ID de usuario es requerido')
    .isUUID()
    .withMessage('ID de usuario inválido'),
    
  body('type')
    .isIn(['monthly', 'daily'])
    .withMessage('Tipo de membresía inválido'),
    
  body('price')
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número positivo'),
    
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha de inicio inválido'),
    
  body('endDate')
    .isISO8601()
    .withMessage('Formato de fecha de fin inválido')
    .custom((endDate, { req }) => {
      const startDate = new Date(req.body.startDate || new Date());
      if (new Date(endDate) <= startDate) {
        throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
      }
      return true;
    }),
    
  body('preferredSchedule')
    .optional()
    .isObject()
    .withMessage('Horarios preferidos deben ser un objeto'),
    
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Las notas no pueden exceder 500 caracteres')
];

// Validador para actualizar membresía (EXISTENTE)
const updateMembershipValidator = [
  param('id')
    .isUUID()
    .withMessage('ID de membresía inválido'),
    
  body('type')
    .optional()
    .isIn(['monthly', 'daily'])
    .withMessage('Tipo de membresía inválido'),
    
  body('status')
    .optional()
    .isIn(['active', 'expired', 'suspended', 'cancelled'])
    .withMessage('Estado de membresía inválido'),
    
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número positivo'),
    
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha de fin inválido'),
    
  body('preferredSchedule')
    .optional()
    .isObject()
    .withMessage('Horarios preferidos deben ser un objeto')
];

// =============== NUEVOS VALIDADORES PARA SISTEMA DE COMPRA ===============

// Validador para compra de membresía
const purchaseMembershipValidator = [
  body('planId')
    .isInt({ min: 1 })
    .withMessage('ID de plan requerido y válido'),
  
  body('selectedSchedule')
    .optional()
    .isObject()
    .withMessage('Los horarios seleccionados deben ser un objeto')
    .custom((value) => {
      if (!value) return true;
      
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      for (const [day, timeSlots] of Object.entries(value)) {
        if (!validDays.includes(day)) {
          throw new Error(`Día inválido: ${day}. Debe ser uno de: ${validDays.join(', ')}`);
        }
        
        if (!Array.isArray(timeSlots)) {
          throw new Error(`Los horarios para ${day} deben ser un array`);
        }
        
        for (const slotId of timeSlots) {
          if (!Number.isInteger(slotId) || slotId <= 0) {
            throw new Error(`ID de franja horaria inválido para ${day}: ${slotId}`);
          }
        }
      }
      
      return true;
    }),
  
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'transfer', 'pending'])
    .withMessage('Método de pago inválido'),
  
  body('userId')
    .optional()
    .isUUID()
    .withMessage('User ID debe ser un UUID válido'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Las notas no pueden exceder 500 caracteres')
    .trim()
];

// Validador para verificación de disponibilidad de horarios
const checkScheduleAvailabilityValidator = [
  body('planId')
    .isInt({ min: 1 })
    .withMessage('ID de plan requerido y válido'),
  
  body('selectedSchedule')
    .isObject()
    .withMessage('Horarios seleccionados requeridos')
    .custom((value) => {
      if (!value || Object.keys(value).length === 0) {
        throw new Error('Debe seleccionar al menos un horario');
      }
      
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      let totalSlots = 0;
      
      for (const [day, timeSlots] of Object.entries(value)) {
        if (!validDays.includes(day)) {
          throw new Error(`Día inválido: ${day}`);
        }
        
        if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
          throw new Error(`Debe seleccionar al menos una franja para ${day}`);
        }
        
        for (const slotId of timeSlots) {
          if (!Number.isInteger(slotId) || slotId <= 0) {
            throw new Error(`ID de franja horaria inválido: ${slotId}`);
          }
        }
        
        totalSlots += timeSlots.length;
      }
      
      if (totalSlots > 14) { // Máximo 2 franjas por día
        throw new Error('No puedes seleccionar más de 14 franjas horarias por semana');
      }
      
      return true;
    })
];

// Validador para actualización de horarios de membresía
const updateMembershipScheduleValidator = [
  param('id')
    .isUUID()
    .withMessage('ID de membresía debe ser un UUID válido'),
  
  body('selectedSchedule')
    .isObject()
    .withMessage('Horarios seleccionados requeridos')
    .custom((value) => {
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      for (const [day, timeSlots] of Object.entries(value)) {
        if (!validDays.includes(day)) {
          throw new Error(`Día inválido: ${day}`);
        }
        
        if (timeSlots && !Array.isArray(timeSlots)) {
          throw new Error(`Los horarios para ${day} deben ser un array`);
        }
        
        if (timeSlots) {
          for (const slotId of timeSlots) {
            if (!Number.isInteger(slotId) || slotId <= 0) {
              throw new Error(`ID de franja horaria inválido para ${day}: ${slotId}`);
            }
          }
        }
      }
      
      return true;
    }),
  
  body('replaceAll')
    .optional()
    .isBoolean()
    .withMessage('replaceAll debe ser verdadero o falso')
];

// Validador para renovación de membresía con horarios
const renewMembershipWithScheduleValidator = [
  param('id')
    .isUUID()
    .withMessage('ID de membresía debe ser un UUID válido'),
  
  body('additionalDays')
    .isInt({ min: 1, max: 365 })
    .withMessage('Los días adicionales deben estar entre 1 y 365'),
  
  body('newSchedule')
    .optional()
    .isObject()
    .withMessage('El nuevo horario debe ser un objeto')
    .custom((value) => {
      if (!value) return true;
      
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      for (const [day, timeSlots] of Object.entries(value)) {
        if (!validDays.includes(day)) {
          throw new Error(`Día inválido: ${day}`);
        }
        
        if (timeSlots && !Array.isArray(timeSlots)) {
          throw new Error(`Los horarios para ${day} deben ser un array`);
        }
        
        if (timeSlots) {
          for (const slotId of timeSlots) {
            if (!Number.isInteger(slotId) || slotId <= 0) {
              throw new Error(`ID de franja horaria inválido: ${slotId}`);
            }
          }
        }
      }
      
      return true;
    }),
  
  body('price')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('El precio debe ser un número positivo')
];

// Validador para consulta de estadísticas con días
const membershipStatsValidator = [
  query('days')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Los días deben estar entre 1 y 30'),
  
  query('includeSchedules')
    .optional()
    .isBoolean()
    .withMessage('includeSchedules debe ser verdadero o falso')
];

// Validador para proceso de deducción diaria (solo admin)
const dailyDeductionValidator = [
  body('forceRun')
    .optional()
    .isBoolean()
    .withMessage('forceRun debe ser verdadero o falso'),
  
  body('dryRun')
    .optional()
    .isBoolean()
    .withMessage('dryRun debe ser verdadero o falso')
];

// =============== VALIDADORES PARA STRIPE MEMBERSHIPS ===============

// Validador para crear Payment Intent de membresía
const createMembershipPaymentIntentValidator = [
  body('planId')
    .isInt({ min: 1 })
    .withMessage('ID de plan requerido y válido'),
  
  body('selectedSchedule')
    .optional()
    .isObject()
    .withMessage('Los horarios seleccionados deben ser un objeto'),
  
  body('userId')
    .optional()
    .isUUID()
    .withMessage('User ID debe ser un UUID válido')
];

// Validador para confirmar pago de membresía
const confirmMembershipPaymentValidator = [
  body('paymentIntentId')
    .notEmpty()
    .withMessage('Payment Intent ID requerido')
    .isLength({ min: 10 })
    .withMessage('Payment Intent ID inválido')
];

// Validador para reembolso de membresía
const refundMembershipValidator = [
  body('paymentId')
    .isUUID()
    .withMessage('Payment ID requerido y válido'),
  
  body('reason')
    .optional()
    .isLength({ min: 5, max: 500 })
    .withMessage('La razón debe tener entre 5 y 500 caracteres')
    .trim(),
  
  body('partialAmount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('El monto parcial debe ser positivo')
    .custom((value, { req }) => {
      if (value && req.body.fullRefund) {
        throw new Error('No puedes especificar monto parcial y reembolso completo al mismo tiempo');
      }
      return true;
    }),
  
  body('fullRefund')
    .optional()
    .isBoolean()
    .withMessage('fullRefund debe ser verdadero o falso')
];

// =============== VALIDADORES PARA CONSULTAS Y REPORTES ===============

// Validador para estadísticas de pagos de membresías
const membershipPaymentStatsValidator = [
  query('period')
    .optional()
    .isIn(['week', 'month', 'quarter', 'year', 'custom'])
    .withMessage('Período inválido'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de inicio inválida')
    .custom((value, { req }) => {
      if (req.query.period === 'custom' && !value) {
        throw new Error('Fecha de inicio requerida para período personalizado');
      }
      return true;
    }),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de fin inválida')
    .custom((value, { req }) => {
      if (req.query.period === 'custom' && !value) {
        throw new Error('Fecha de fin requerida para período personalizado');
      }
      
      if (value && req.query.startDate && new Date(value) <= new Date(req.query.startDate)) {
        throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
      }
      
      return true;
    })
];

// Validador para obtener historial de pagos
const membershipPaymentHistoryValidator = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe estar entre 1 y 100'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número positivo'),
  
  query('status')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'cancelled', 'refunded'])
    .withMessage('Estado de pago inválido')
];

// =============== MIDDLEWARE PERSONALIZADOS ===============

// Middleware para verificar que el usuario puede comprar membresías
const canPurchaseMembership = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { Membership } = require('../models');
    
    // Verificar si ya tiene una membresía activa
    const existingMembership = await Membership.findOne({
      where: {
        userId,
        status: 'active'
      }
    });
    
    if (existingMembership) {
      return res.status(400).json({
        success: false,
        message: 'Ya tienes una membresía activa',
        existingMembership: {
          id: existingMembership.id,
          type: existingMembership.type,
          endDate: existingMembership.endDate,
          remainingDays: existingMembership.remainingDays
        }
      });
    }
    
    next();
  } catch (error) {
    console.error('Error verificando membresía existente:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar estado de membresía',
      error: error.message
    });
  }
};

// Middleware para verificar capacidad de horarios
const verifyScheduleCapacity = async (req, res, next) => {
  try {
    const { selectedSchedule } = req.body;
    
    if (!selectedSchedule || Object.keys(selectedSchedule).length === 0) {
      return next(); // Si no hay horarios, continuar
    }
    
    const { GymTimeSlots } = require('../models');
    const conflicts = [];
    
    for (const [day, timeSlotIds] of Object.entries(selectedSchedule)) {
      if (Array.isArray(timeSlotIds)) {
        for (const timeSlotId of timeSlotIds) {
          const slot = await GymTimeSlots.findByPk(timeSlotId);
          
          if (!slot) {
            conflicts.push({
              day,
              timeSlotId,
              error: 'Franja horaria no encontrada'
            });
            continue;
          }
          
          if (slot.currentReservations >= slot.capacity) {
            conflicts.push({
              day,
              timeSlotId,
              error: 'Sin capacidad disponible',
              capacity: slot.capacity,
              currentReservations: slot.currentReservations
            });
          }
        }
      }
    }
    
    if (conflicts.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${conflicts.length} horarios seleccionados no están disponibles`,
        conflicts
      });
    }
    
    next();
  } catch (error) {
    console.error('Error verificando capacidad de horarios:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar disponibilidad de horarios',
      error: error.message
    });
  }
};

// Middleware para verificar que el plan existe y está activo
const verifyActivePlan = async (req, res, next) => {
  try {
    const { planId } = req.body;
    const { MembershipPlans } = require('../models');
    
    const plan = await MembershipPlans.findByPk(planId);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan de membresía no encontrado'
      });
    }
    
    if (!plan.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Este plan de membresía no está disponible actualmente'
      });
    }
    
    // Agregar plan a la request para uso posterior
    req.membershipPlan = plan;
    next();
  } catch (error) {
    console.error('Error verificando plan de membresía:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar plan de membresía',
      error: error.message
    });
  }
};

// =============== EXPORTAR VALIDADORES ===============

module.exports = {
  // Validadores existentes (mantenidos)
  createMembershipValidator,
  updateMembershipValidator,
  
  // Nuevos validadores para sistema de compra
  purchaseMembershipValidator,
  checkScheduleAvailabilityValidator,
  updateMembershipScheduleValidator,
  renewMembershipWithScheduleValidator,
  membershipStatsValidator,
  dailyDeductionValidator,
  
  // Validadores para Stripe
  createMembershipPaymentIntentValidator,
  confirmMembershipPaymentValidator,
  refundMembershipValidator,
  membershipPaymentStatsValidator,
  membershipPaymentHistoryValidator,
  
  // Middleware personalizados
  canPurchaseMembership,
  verifyScheduleCapacity,
  verifyActivePlan
};