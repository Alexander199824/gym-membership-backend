// src/services/membershipService.js - NUEVO ARCHIVO
const { Membership, MembershipPlans, GymTimeSlots, PromotionCodes } = require('../models');

class MembershipService {
  
  // Validar restricciones de horario según plan
  static async validateScheduleForPlan(planId, selectedSchedule) {
    const plan = await MembershipPlans.findByPk(planId);
    if (!plan) {
      throw new Error('Plan no encontrado');
    }
    
    const errors = [];
    
    for (const [dayOfWeek, timeSlotIds] of Object.entries(selectedSchedule)) {
      // Validar día permitido
      if (!plan.allowedDays.includes(dayOfWeek)) {
        errors.push({
          field: 'day',
          day: dayOfWeek,
          message: `El plan no permite reservas los ${dayOfWeek}`
        });
        continue;
      }
      
      // Validar límite de slots por día
      if (timeSlotIds.length > plan.maxSlotsPerDay) {
        errors.push({
          field: 'slotsPerDay',
          day: dayOfWeek,
          message: `Máximo ${plan.maxSlotsPerDay} horario(s) por día`
        });
      }
      
      // Validar restricciones específicas de horario
      if (plan.timeRestrictions && plan.timeRestrictions[dayOfWeek]) {
        const allowedSlots = plan.timeRestrictions[dayOfWeek].map(id => parseInt(id));
        const invalidSlots = timeSlotIds.filter(id => !allowedSlots.includes(parseInt(id)));
        
        if (invalidSlots.length > 0) {
          errors.push({
            field: 'timeRestriction',
            day: dayOfWeek,
            invalidSlots,
            message: 'Horarios no permitidos para este plan'
          });
        }
      }
      
      // Validar disponibilidad de cupos
      for (const timeSlotId of timeSlotIds) {
        const slot = await GymTimeSlots.findByPk(timeSlotId);
        if (!slot || slot.currentReservations >= slot.capacity) {
          errors.push({
            field: 'capacity',
            day: dayOfWeek,
            timeSlotId,
            message: `Sin cupos disponibles en ${slot?.openTime || 'horario'}`
          });
        }
      }
    }
    
    // Validar límite semanal
    const totalReservations = Object.values(selectedSchedule)
      .reduce((total, slots) => total + slots.length, 0);
      
    if (totalReservations > plan.maxReservationsPerWeek) {
      errors.push({
        field: 'weeklyLimit',
        message: `Máximo ${plan.maxReservationsPerWeek} reservas por semana`
      });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // Aplicar código promocional
  static async applyPromotionCode(userId, planId, promotionCode) {
    const promotion = await PromotionCodes.findOne({
      where: { code: promotionCode.toUpperCase(), isActive: true }
    });
    
    if (!promotion || !promotion.isValid()) {
      return {
        success: false,
        message: 'Código promocional inválido o expirado'
      };
    }
    
    const canUse = await promotion.canBeUsedBy(userId);
    if (!canUse) {
      return {
        success: false,
        message: 'Ya has usado este código promocional'
      };
    }
    
    if (promotion.applicablePlans && !promotion.applicablePlans.includes(planId)) {
      return {
        success: false,
        message: 'Este código no aplica al plan seleccionado'
      };
    }
    
    const plan = await MembershipPlans.findByPk(planId);
    let discount = 0;
    let freeDaysToAdd = 0;
    
    switch (promotion.type) {
      case 'percentage':
        discount = (plan.price * promotion.value) / 100;
        break;
      case 'fixed_amount':
        discount = Math.min(promotion.value, plan.price);
        break;
      case 'free_days':
        freeDaysToAdd = promotion.freeDays || 0;
        break;
      case 'gift':
        discount = plan.price;
        break;
    }
    
    return {
      success: true,
      promotion: {
        id: promotion.id,
        code: promotion.code,
        name: promotion.name,
        type: promotion.type,
        discount: parseFloat(discount.toFixed(2)),
        freeDaysToAdd,
        finalPrice: Math.max(0, plan.price - discount)
      }
    };
  }
}

module.exports = MembershipService;