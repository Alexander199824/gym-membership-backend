// src/validators/flexibleScheduleValidators.js - NUEVO: Validadores específicos
const { body, param } = require('express-validator');

// ✅ VALIDADOR: Configuración completa de horarios flexibles
const flexibleScheduleValidator = [
  body('section')
    .equals('schedule')
    .withMessage('Esta función solo maneja la sección de horarios'),
    
  body('data')
    .isObject()
    .withMessage('Los datos deben ser un objeto'),
    
  body('data.hours')
    .isObject()
    .withMessage('Los horarios deben ser un objeto'),
    
  // Validar cada día de la semana
  body('data.hours.monday')
    .optional()
    .custom(validateDaySchedule),
  body('data.hours.tuesday')
    .optional()
    .custom(validateDaySchedule),
  body('data.hours.wednesday')
    .optional()
    .custom(validateDaySchedule),
  body('data.hours.thursday')
    .optional()
    .custom(validateDaySchedule),
  body('data.hours.friday')
    .optional()
    .custom(validateDaySchedule),
  body('data.hours.saturday')
    .optional()
    .custom(validateDaySchedule),
  body('data.hours.sunday')
    .optional()
    .custom(validateDaySchedule)
];

// ✅ FUNCIÓN HELPER: Validar estructura de día
function validateDaySchedule(dayData) {
  if (!dayData || typeof dayData !== 'object') {
    throw new Error('Los datos del día deben ser un objeto');
  }
  
  if (typeof dayData.isOpen !== 'boolean') {
    throw new Error('El campo isOpen debe ser un booleano');
  }
  
  if (dayData.isOpen) {
    if (!Array.isArray(dayData.timeSlots)) {
      throw new Error('timeSlots debe ser un array cuando el día está abierto');
    }
    
    if (dayData.timeSlots.length === 0) {
      throw new Error('Debe haber al menos una franja horaria si el día está abierto');
    }
    
    // Validar cada franja horaria
    for (let i = 0; i < dayData.timeSlots.length; i++) {
      const slot = dayData.timeSlots[i];
      
      if (!slot.open || !slot.close) {
        throw new Error(`Franja ${i + 1}: Horas de apertura y cierre son requeridas`);
      }
      
      if (!isValidTimeFormat(slot.open) || !isValidTimeFormat(slot.close)) {
        throw new Error(`Franja ${i + 1}: Formato de hora inválido (debe ser HH:MM)`);
      }
      
      if (slot.open >= slot.close) {
        throw new Error(`Franja ${i + 1}: La hora de apertura debe ser anterior a la de cierre`);
      }
      
      if (slot.capacity && (slot.capacity < 1 || slot.capacity > 500)) {
        throw new Error(`Franja ${i + 1}: La capacidad debe estar entre 1 y 500`);
      }
      
      if (slot.reservations && slot.reservations < 0) {
        throw new Error(`Franja ${i + 1}: Las reservas no pueden ser negativas`);
      }
      
      if (slot.reservations && slot.capacity && slot.reservations > slot.capacity) {
        throw new Error(`Franja ${i + 1}: Las reservas no pueden exceder la capacidad`);
      }
      
      if (slot.label && slot.label.length > 100) {
        throw new Error(`Franja ${i + 1}: La etiqueta no puede exceder 100 caracteres`);
      }
    }
    
    // Validar que no hay solapamiento de franjas
    validateNoTimeOverlap(dayData.timeSlots);
  }
  
  return true;
}

// ✅ FUNCIÓN HELPER: Validar formato de tiempo
function isValidTimeFormat(timeStr) {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeStr);
}

// ✅ FUNCIÓN HELPER: Validar que no hay solapamiento
function validateNoTimeOverlap(timeSlots) {
  for (let i = 0; i < timeSlots.length; i++) {
    for (let j = i + 1; j < timeSlots.length; j++) {
      const slot1 = timeSlots[i];
      const slot2 = timeSlots[j];
      
      // Convertir horas a minutos para comparación
      const slot1Start = timeToMinutes(slot1.open);
      const slot1End = timeToMinutes(slot1.close);
      const slot2Start = timeToMinutes(slot2.open);
      const slot2End = timeToMinutes(slot2.close);
      
      // Verificar solapamiento
      if ((slot1Start < slot2End && slot1End > slot2Start)) {
        throw new Error(`Solapamiento detectado entre franjas: ${slot1.open}-${slot1.close} y ${slot2.open}-${slot2.close}`);
      }
    }
  }
}

// ✅ FUNCIÓN HELPER: Convertir tiempo a minutos
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// ✅ VALIDADOR: Parámetro de día
const dayValidator = [
  param('day')
    .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .withMessage('Día de la semana inválido')
];

// ✅ VALIDADOR: Índice de franja
const slotIndexValidator = [
  param('slotIndex')
    .isInt({ min: 0, max: 50 })
    .withMessage('Índice de franja debe ser un número entre 0 y 50')
];

// ✅ VALIDADOR: Datos de franja horaria
const timeSlotValidator = [
  body('open')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Formato de hora de apertura inválido (HH:MM)'),
    
  body('close')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Formato de hora de cierre inválido (HH:MM)')
    .custom((closeTime, { req }) => {
      if (closeTime <= req.body.open) {
        throw new Error('La hora de cierre debe ser posterior a la hora de apertura');
      }
      return true;
    }),
    
  body('capacity')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('La capacidad debe estar entre 1 y 500'),
    
  body('reservations')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Las reservas deben ser un número positivo')
    .custom((reservations, { req }) => {
      if (req.body.capacity && reservations > req.body.capacity) {
        throw new Error('Las reservas no pueden exceder la capacidad');
      }
      return true;
    }),
    
  body('label')
    .optional()
    .isLength({ max: 100 })
    .withMessage('La etiqueta no puede exceder 100 caracteres')
    .trim()
];

// ✅ VALIDADOR: Actualización de campo específico
const updateFieldValidator = [
  body('field')
    .isIn(['open', 'close', 'capacity', 'reservations', 'label'])
    .withMessage('Campo inválido. Campos permitidos: open, close, capacity, reservations, label'),
    
  body('value')
    .notEmpty()
    .withMessage('Valor requerido')
    .custom((value, { req }) => {
      const field = req.body.field;
      
      switch (field) {
        case 'open':
        case 'close':
          if (!isValidTimeFormat(value)) {
            throw new Error('Formato de hora inválido (debe ser HH:MM)');
          }
          break;
          
        case 'capacity':
          const capacity = parseInt(value);
          if (isNaN(capacity) || capacity < 1 || capacity > 500) {
            throw new Error('La capacidad debe ser un número entre 1 y 500');
          }
          break;
          
        case 'reservations':
          const reservations = parseInt(value);
          if (isNaN(reservations) || reservations < 0) {
            throw new Error('Las reservas deben ser un número positivo');
          }
          break;
          
        case 'label':
          if (typeof value !== 'string' || value.length > 100) {
            throw new Error('La etiqueta debe ser texto de máximo 100 caracteres');
          }
          break;
      }
      
      return true;
    })
];

// ✅ VALIDADOR: Capacidad global
const globalCapacityValidator = [
  body('capacity')
    .isInt({ min: 1, max: 500 })
    .withMessage('La capacidad debe estar entre 1 y 500')
];

// ✅ VALIDADOR: Consulta de disponibilidad
const availabilityQueryValidator = [
  body('day')
    .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .withMessage('Día de la semana inválido'),
    
  body('time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Formato de hora inválido (HH:MM)')
];

// ✅ VALIDADOR PERSONALIZADO: Horarios de negocio
const businessHoursValidator = [
  body('data.hours')
    .custom((hours) => {
      // Verificar que al menos un día esté abierto
      const hasOpenDays = Object.values(hours).some(day => 
        day && day.isOpen && day.timeSlots && day.timeSlots.length > 0
      );
      
      if (!hasOpenDays) {
        throw new Error('Debe haber al menos un día con horarios configurados');
      }
      
      // Verificar horarios razonables (no más de 18 horas por día)
      Object.entries(hours).forEach(([dayName, dayData]) => {
        if (dayData && dayData.isOpen && dayData.timeSlots) {
          const totalMinutes = dayData.timeSlots.reduce((total, slot) => {
            const startMinutes = timeToMinutes(slot.open);
            const endMinutes = timeToMinutes(slot.close);
            return total + (endMinutes - startMinutes);
          }, 0);
          
          if (totalMinutes > 18 * 60) { // 18 horas = 1080 minutos
            throw new Error(`${dayName}: El total de horas no puede exceder 18 horas por día`);
          }
        }
      });
      
      return true;
    })
];

// ✅ VALIDADOR AVANZADO: Coherencia de datos
const dataConsistencyValidator = [
  body('data.hours')
    .custom(async (hours, { req }) => {
      // Verificar capacidades realistas
      const totalCapacity = Object.values(hours).reduce((total, dayData) => {
        if (dayData && dayData.isOpen && dayData.timeSlots) {
          return total + dayData.timeSlots.reduce((dayTotal, slot) => 
            dayTotal + (slot.capacity || 0), 0
          );
        }
        return total;
      }, 0);
      
      if (totalCapacity > 5000) {
        throw new Error('La capacidad total semanal parece excesiva (>5000). Verificar datos.');
      }
      
      // Verificar patrones sospechosos
      let hasReasonableHours = false;
      Object.entries(hours).forEach(([dayName, dayData]) => {
        if (dayData && dayData.isOpen && dayData.timeSlots) {
          dayData.timeSlots.forEach(slot => {
            const startHour = parseInt(slot.open.split(':')[0]);
            const endHour = parseInt(slot.close.split(':')[0]);
            
            // Verificar horarios dentro de rango razonable (5:00 - 23:00)
            if (startHour >= 5 && endHour <= 23) {
              hasReasonableHours = true;
            }
          });
        }
      });
      
      if (!hasReasonableHours) {
        console.warn('⚠️ Advertencia: Horarios fuera del rango típico de gimnasios');
      }
      
      return true;
    })
];

module.exports = {
  flexibleScheduleValidator,
  dayValidator,
  slotIndexValidator,
  timeSlotValidator,
  updateFieldValidator,
  globalCapacityValidator,
  availabilityQueryValidator,
  businessHoursValidator,
  dataConsistencyValidator,
  
  // Funciones helper exportadas para uso en otros validadores
  validateDaySchedule,
  isValidTimeFormat,
  validateNoTimeOverlap,
  timeToMinutes
};