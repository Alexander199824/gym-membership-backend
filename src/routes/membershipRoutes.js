// src/routes/membershipRoutes.js - REPARADO: Agregada ruta faltante para pending-cash-payment

const express = require('express');
const membershipController = require('../controllers/membershipController');
const {
  createMembershipValidator,
  updateMembershipValidator
} = require('../validators/membershipValidators');
const { handleValidationErrors } = require('../middleware/validation');
const { authenticateToken, requireStaff, requireAdmin } = require('../middleware/auth');
const { body, param, query } = require('express-validator');

const router = express.Router();

// =============== RUTAS PÚBLICAS (sin autenticación) ===============

// ✅ Obtener planes de membresía
router.get('/plans', membershipController.getMembershipPlans);

// ✅ Obtener planes disponibles para compra con disponibilidad
router.get('/purchase/plans', membershipController.getPurchaseableePlans);

// ✅ Obtener opciones de horario por plan
router.get('/plans/:planId/schedule-options',
  authenticateToken,
  membershipController.getAvailableScheduleOptions
);

// =============== RUTAS ESPECÍFICAS PARA CLIENTES (van PRIMERO para evitar conflictos) ===============

// 📅 VER MIS HORARIOS ACTUALES (solo clientes)
router.get('/my-schedule',
  authenticateToken,
  (req, res, next) => {
    if (req.user.role !== 'cliente') {
      return res.status(403).json({
        success: false,
        message: 'Esta función es solo para clientes'
      });
    }
    next();
  },
  membershipController.getMySchedule
);

// 📊 ESTADÍSTICAS DE MIS HORARIOS (solo clientes)
router.get('/my-schedule/stats',
  authenticateToken,
  (req, res, next) => {
    if (req.user.role !== 'cliente') {
      return res.status(403).json({
        success: false,
        message: 'Esta función es solo para clientes'
      });
    }
    next();
  },
  membershipController.getMyScheduleStats
);

// 🔍 VER OPCIONES DISPONIBLES PARA CAMBIAR (solo clientes)
router.get('/my-schedule/available-options',
  authenticateToken,
  (req, res, next) => {
    if (req.user.role !== 'cliente') {
      return res.status(403).json({
        success: false,
        message: 'Esta función es solo para clientes'
      });
    }
    next();
  },
  [
    query('day').optional().isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
      .withMessage('Día de la semana inválido')
  ],
  handleValidationErrors,
  membershipController.getMyAvailableOptions
);

// 📜 HISTORIAL DE CAMBIOS (solo clientes)
router.get('/my-schedule/change-history',
  authenticateToken,
  (req, res, next) => {
    if (req.user.role !== 'cliente') {
      return res.status(403).json({
        success: false,
        message: 'Esta función es solo para clientes'
      });
    }
    next();
  },
  async (req, res) => {
    try {
      res.json({
        success: true,
        data: {
          message: 'Historial de cambios próximamente disponible',
          currentDate: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener historial',
        error: error.message
      });
    }
  }
);

// 🔍 PREVISUALIZAR CAMBIO DE HORARIOS (sin confirmar - solo clientes)
router.post('/my-schedule/preview-change',
  authenticateToken,
  (req, res, next) => {
    if (req.user.role !== 'cliente') {
      return res.status(403).json({
        success: false,
        message: 'Esta función es solo para clientes'
      });
    }
    next();
  },
  [
    body('changes').isObject().withMessage('Cambios requeridos')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { changes } = req.body;
      const { Membership, GymTimeSlots } = require('../models');
      
      const membership = await Membership.findOne({
        where: {
          userId: req.user.id,
          status: 'active'
        }
      });

      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'No tienes una membresía activa'
        });
      }

      const currentSchedule = await membership.getDetailedSchedule();
      const preview = {};
      const conflicts = [];

      for (const [day, newSlotIds] of Object.entries(changes)) {
        if (!Array.isArray(newSlotIds)) continue;

        const currentDaySlots = currentSchedule[day] || [];
        const currentSlotIds = currentDaySlots.map(slot => slot.id);
        
        const newSlotDetails = [];
        for (const slotId of newSlotIds) {
          const slot = await GymTimeSlots.findByPk(slotId);
          
          if (!slot) {
            conflicts.push({ day, slotId, reason: 'Slot no encontrado' });
            continue;
          }
          
          const isCurrentlyMine = currentSlotIds.includes(slotId);
          const available = isCurrentlyMine ? 
            slot.capacity - slot.currentReservations + 1 : 
            slot.capacity - slot.currentReservations;
          
          if (available <= 0 && !isCurrentlyMine) {
            conflicts.push({ 
              day, 
              slotId, 
              reason: 'Sin capacidad disponible',
              timeRange: `${slot.openTime.slice(0, 5)}-${slot.closeTime.slice(0, 5)}`
            });
          } else {
            newSlotDetails.push({
              id: slot.id,
              timeRange: `${slot.openTime.slice(0, 5)} - ${slot.closeTime.slice(0, 5)}`,
              available,
              isCurrentlyMine
            });
          }
        }

        preview[day] = {
          current: currentDaySlots.map(slot => ({
            id: slot.id,
            timeRange: `${slot.openTime.slice(0, 5)} - ${slot.closeTime.slice(0, 5)}`,
            willKeep: newSlotIds.includes(slot.id)
          })),
          new: newSlotDetails,
          willRelease: currentSlotIds.filter(id => !newSlotIds.includes(id)).length,
          willReserve: newSlotIds.filter(id => !currentSlotIds.includes(id)).length
        };
      }

      res.json({
        success: true,
        data: {
          preview,
          conflicts,
          canProceed: conflicts.length === 0,
          summary: {
            totalConflicts: conflicts.length,
            daysToChange: Object.keys(changes).length
          }
        }
      });

    } catch (error) {
      console.error('Error en preview de cambio:', error);
      res.status(500).json({
        success: false,
        message: 'Error al previsualizar cambios',
        error: error.message
      });
    }
  }
);

// ✏️ CAMBIAR MIS HORARIOS (solo clientes)
router.post('/my-schedule/change',
  authenticateToken,
  (req, res, next) => {
    if (req.user.role !== 'cliente') {
      return res.status(403).json({
        success: false,
        message: 'Esta función es solo para clientes'
      });
    }
    next();
  },
  [
    body('changeType').isIn(['single_day', 'multiple_days', 'full_week'])
      .withMessage('Tipo de cambio inválido'),
    body('changes').isObject()
      .withMessage('Debes especificar los cambios'),
    body('replaceAll').optional().isBoolean()
      .withMessage('replaceAll debe ser boolean'),
    body('changes').custom((changes) => {
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      for (const [day, slots] of Object.entries(changes)) {
        if (!validDays.includes(day)) {
          throw new Error(`Día inválido: ${day}`);
        }
        
        if (!Array.isArray(slots)) {
          throw new Error(`Los slots del ${day} deben ser un array`);
        }
        
        for (const slotId of slots) {
          if (!Number.isInteger(slotId) || slotId <= 0) {
            throw new Error(`ID de slot inválido en ${day}: ${slotId}`);
          }
        }
      }
      
      return true;
    })
  ],
  handleValidationErrors,
  membershipController.changeMySchedule
);

// 🗑️ CANCELAR UN HORARIO ESPECÍFICO (solo clientes)
router.delete('/my-schedule/:day/:slotId',
  authenticateToken,
  (req, res, next) => {
    if (req.user.role !== 'cliente') {
      return res.status(403).json({
        success: false,
        message: 'Esta función es solo para clientes'
      });
    }
    next();
  },
  [
    param('day').isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
      .withMessage('Día de la semana inválido'),
    param('slotId').isInt({ min: 1 })
      .withMessage('ID de slot inválido')
  ],
  handleValidationErrors,
  membershipController.cancelMyTimeSlot
);

// =============== RUTAS GENERALES QUE REQUIEREN AUTENTICACIÓN ===============

// 👤 Obtener MI membresía actual con horarios (solo clientes)
router.get('/my-current',
  authenticateToken,
  (req, res, next) => {
    if (req.user.role !== 'cliente') {
      return res.status(403).json({
        success: false,
        message: 'Esta ruta es solo para clientes'
      });
    }
    next();
  },
  membershipController.getMyCurrentMembership
);

// ✅ Cliente puede ver SUS membresías, staff ve según permisos
router.get('/',
  authenticateToken,
  membershipController.getMemberships
);

// =============== RUTAS PARA COMPRAS ===============

// 🛒 Verificar disponibilidad de horarios antes de comprar
router.post('/purchase/check-availability',
  authenticateToken,
  [
    body('planId').isInt().withMessage('ID de plan requerido'),
    body('selectedSchedule').isObject().withMessage('Horarios seleccionados requeridos')
  ],
  handleValidationErrors,
  membershipController.checkScheduleAvailability
);

// 🛒 COMPRAR membresía (clientes) o crear con horarios (staff)
router.post('/purchase',
  authenticateToken,
  [
    body('planId').isInt().withMessage('ID de plan requerido'),
    body('selectedSchedule').optional().isObject().withMessage('Horarios debe ser un objeto'),
    body('paymentMethod').optional().isIn(['cash', 'card', 'transfer', 'pending']).withMessage('Método de pago inválido'),
    body('userId').optional().isUUID().withMessage('User ID debe ser UUID válido'),
    body('notes').optional().isLength({ max: 500 }).withMessage('Notas muy largas')
  ],
  handleValidationErrors,
  membershipController.purchaseMembership
);

// =============== RUTAS SOLO PARA STAFF (ESPECÍFICAS PRIMERO) ===============

// 🔥 RUTA FALTANTE AGREGADA - Membresías pendientes de pago en efectivo (solo staff)
router.get('/pending-cash-payment',
  authenticateToken,
  requireStaff,
  membershipController.getPendingCashMemberships
);

// ✅ Solo STAFF puede ver membresías vencidas
router.get('/expired',
  authenticateToken,
  requireStaff,
  membershipController.getExpiredMemberships
);

// ✅ Solo STAFF puede ver membresías próximas a vencer
router.get('/expiring-soon',
  authenticateToken,
  requireStaff,
  membershipController.getExpiringSoon
);

// 📊 Obtener membresías próximas a expirar con detalles (solo staff)
router.get('/expiring-detailed',
  authenticateToken,
  requireStaff,
  [
    query('days').optional().isInt({ min: 1, max: 30 }).withMessage('Días debe estar entre 1 y 30')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { days = 7 } = req.query;
      const { Membership } = require('../models');

      let expiringMemberships = await Membership.getExpiringMemberships(parseInt(days));

      if (req.user.role === 'colaborador') {
        expiringMemberships = expiringMemberships.filter(m => m.user.role === 'cliente');
      }

      const detailedMemberships = await Promise.all(
        expiringMemberships.map(async (membership) => {
          const schedule = await membership.getDetailedSchedule();
          const summary = membership.getSummary();

          return {
            ...membership.toJSON(),
            schedule,
            summary
          };
        })
      );

      res.json({
        success: true,
        data: {
          memberships: detailedMemberships,
          total: detailedMemberships.length,
          daysFilter: parseInt(days)
        }
      });
    } catch (error) {
      console.error('Error al obtener membresías próximas a expirar:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener membresías próximas a expirar',
        error: error.message
      });
    }
  }
);

// ✅ Solo STAFF puede ver estadísticas
router.get('/stats',
  authenticateToken,
  requireStaff,
  membershipController.getMembershipStats
);

// 📈 Estadísticas de membresías con días (solo staff)
router.get('/stats-with-days',
  authenticateToken,
  requireStaff,
  async (req, res) => {
    try {
      const { Membership } = require('../models');
      const { Op } = require('sequelize');

      let baseWhere = { status: 'active' };

      if (req.user.role === 'colaborador') {
        baseWhere['$user.role$'] = 'cliente';
      }

      const [
        totalActive,
        totalDaysRemaining,
        averageDaysRemaining,
        expiringThisWeek,
        expiringNextWeek,
        membershipsWithoutSchedule
      ] = await Promise.all([
        Membership.count({
          where: baseWhere,
          include: req.user.role === 'colaborador' ? [{
            association: 'user',
            where: { role: 'cliente' },
            attributes: []
          }] : []
        }),

        Membership.sum('remainingDays', {
          where: baseWhere,
          include: req.user.role === 'colaborador' ? [{
            association: 'user',
            where: { role: 'cliente' },
            attributes: []
          }] : []
        }),

        Membership.findAll({
          attributes: [
            [Membership.sequelize.fn('AVG', Membership.sequelize.col('remaining_days')), 'avgDays']
          ],
          where: baseWhere,
          include: req.user.role === 'colaborador' ? [{
            association: 'user',
            where: { role: 'cliente' },
            attributes: []
          }] : [],
          raw: true
        }),

        Membership.count({
          where: {
            ...baseWhere,
            remainingDays: { [Op.between]: [1, 7] }
          },
          include: req.user.role === 'colaborador' ? [{
            association: 'user',
            where: { role: 'cliente' },
            attributes: []
          }] : []
        }),

        Membership.count({
          where: {
            ...baseWhere,
            remainingDays: { [Op.between]: [8, 14] }
          },
          include: req.user.role === 'colaborador' ? [{
            association: 'user',
            where: { role: 'cliente' },
            attributes: []
          }] : []
        }),

        Membership.count({
          where: {
            ...baseWhere,
            [Op.or]: [
              { reservedSchedule: null },
              { reservedSchedule: {} }
            ]
          },
          include: req.user.role === 'colaborador' ? [{
            association: 'user',
            where: { role: 'cliente' },
            attributes: []
          }] : []
        })
      ]);

      res.json({
        success: true,
        data: {
          totalActive,
          totalDaysRemaining: totalDaysRemaining || 0,
          averageDaysRemaining: parseFloat(averageDaysRemaining[0]?.avgDays || 0).toFixed(1),
          expiringThisWeek,
          expiringNextWeek,
          membershipsWithoutSchedule,
          scheduleAdoptionRate: totalActive > 0
            ? (((totalActive - membershipsWithoutSchedule) / totalActive) * 100).toFixed(1)
            : '0',
          role: req.user.role
        }
      });
    } catch (error) {
      console.error('Error al obtener estadísticas con días:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }
);

// ✅ Solo STAFF puede crear membresías
router.post('/',
  authenticateToken,
  requireStaff,
  createMembershipValidator,
  handleValidationErrors,
  membershipController.createMembership
);

// =============== RUTAS POR ID (van al final para evitar conflictos) ===============

// Cliente puede ver SUS membresías por ID, staff ve según permisos
router.get('/:id',
  authenticateToken,
  membershipController.getMembershipById
);

// Obtener horarios detallados de una membresía específica
router.get('/:id/schedule-details',
  authenticateToken,
  [
    param('id').isUUID().withMessage('ID de membresía inválido')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { Membership } = require('../models');

      const membership = await Membership.findByPk(id, {
        include: [{ association: 'user', attributes: ['id', 'role'] }]
      });

      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Membresía no encontrada'
        });
      }

      if (req.user.role === 'cliente' && membership.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes ver tus propios horarios'
        });
      } else if (req.user.role === 'colaborador' && membership.user.role !== 'cliente') {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes ver horarios de usuarios clientes'
        });
      }

      const detailedSchedule = await membership.getDetailedSchedule();
      const summary = membership.getSummary();

      res.json({
        success: true,
        data: {
          membershipId: membership.id,
          schedule: detailedSchedule,
          summary,
          hasSchedule: Object.keys(detailedSchedule).length > 0
        }
      });
    } catch (error) {
      console.error('Error al obtener horarios detallados:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener horarios',
        error: error.message
      });
    }
  }
);

// Solo STAFF puede actualizar membresías
router.patch('/:id',
  authenticateToken,
  requireStaff,
  updateMembershipValidator,
  handleValidationErrors,
  membershipController.updateMembership
);

// ✅ ÚNICA RUTA PARA CAMBIO DE HORARIOS POR ID (método técnico para staff)
router.patch('/:id/schedule',
  authenticateToken,
  [
    param('id').isUUID().withMessage('ID de membresía inválido'),
    body('selectedSchedule').optional().isObject().withMessage('Horarios debe ser un objeto'),
    body('removeSlots').optional().isArray().withMessage('removeSlots debe ser un array'),
    body('replaceAll').optional().isBoolean().withMessage('replaceAll debe ser boolean')
  ],
  handleValidationErrors,
  membershipController.changeSchedule // Tu método técnico original
);

// Solo STAFF puede renovar membresías
router.post('/:id/renew',
  authenticateToken,
  requireStaff,
  membershipController.renewMembership
);

// Renovar membresía con opción de cambiar horarios (solo staff)
router.post('/:id/renew-with-schedule',
  authenticateToken,
  requireStaff,
  [
    param('id').isUUID().withMessage('ID de membresía inválido'),
    body('additionalDays').isInt({ min: 1, max: 365 }).withMessage('Días adicionales entre 1 y 365'),
    body('newSchedule').optional().isObject().withMessage('Nuevo horario debe ser un objeto'),
    body('price').optional().isNumeric().withMessage('Precio debe ser numérico')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { additionalDays, newSchedule, price } = req.body;
      const { Membership, Payment, FinancialMovements } = require('../models');

      const membership = await Membership.findByPk(id, {
        include: [{ association: 'user', attributes: ['id', 'role', 'firstName', 'lastName', 'email'] }]
      });

      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Membresía no encontrada'
        });
      }

      if (req.user.role === 'colaborador' && membership.user.role !== 'cliente') {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes renovar membresías de usuarios clientes'
        });
      }

      const transaction = await Membership.sequelize.transaction();

      try {
        membership.remainingDays += parseInt(additionalDays);
        membership.totalDays += parseInt(additionalDays);

        const newEndDate = new Date(membership.endDate);
        newEndDate.setDate(newEndDate.getDate() + parseInt(additionalDays));
        membership.endDate = newEndDate;

        if (membership.status === 'expired') {
          membership.status = 'active';
        }

        await membership.save({ transaction });

        if (newSchedule && Object.keys(newSchedule).length > 0) {
          if (membership.reservedSchedule) {
            for (const [day, timeSlotIds] of Object.entries(membership.reservedSchedule)) {
              if (Array.isArray(timeSlotIds)) {
                for (const timeSlotId of timeSlotIds) {
                  await membership.cancelTimeSlot(day, timeSlotId);
                }
              }
            }
          }

          for (const [day, timeSlotIds] of Object.entries(newSchedule)) {
            if (Array.isArray(timeSlotIds)) {
              for (const timeSlotId of timeSlotIds) {
                await membership.reserveTimeSlot(day, timeSlotId);
              }
            }
          }
        }

        if (price && parseFloat(price) > 0) {
          const payment = await Payment.create({
            userId: membership.userId,
            membershipId: membership.id,
            amount: parseFloat(price),
            paymentMethod: 'cash',
            paymentType: 'membership',
            description: `Renovación de membresía - ${additionalDays} días adicionales`,
            registeredBy: req.user.id,
            status: 'completed'
          }, { transaction });

          await FinancialMovements.createFromAnyPayment(payment, { transaction });
        }

        await transaction.commit();

        const updatedSchedule = await membership.getDetailedSchedule();
        const summary = membership.getSummary();

        res.json({
          success: true,
          message: `Membresía renovada exitosamente - ${additionalDays} días adicionales`,
          data: {
            membership: {
              ...membership.toJSON(),
              schedule: updatedSchedule,
              summary
            },
            renewal: {
              additionalDays: parseInt(additionalDays),
              newEndDate: membership.endDate,
              scheduleUpdated: !!(newSchedule && Object.keys(newSchedule).length > 0),
              paymentCreated: !!(price && parseFloat(price) > 0)
            }
          }
        });

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } catch (error) {
      console.error('Error al renovar membresía con horarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error al renovar membresía',
        error: error.message
      });
    }
  }
);

// Solo STAFF puede cancelar membresías
router.post('/:id/cancel',
  authenticateToken,
  requireStaff,
  membershipController.cancelMembership
);

// =============== RUTAS ADMINISTRATIVAS ===============

// Procesar deducción diaria (solo admin)
router.post('/process-daily-deduction',
  authenticateToken,
  requireAdmin,
  membershipController.processDailyDeduction
);

module.exports = router;