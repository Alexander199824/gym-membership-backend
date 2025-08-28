// src/routes/membershipRoutes.js - COMPLETO: Todas las rutas existentes + nuevas funciones

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

// ✅ Ruta existente - Obtener planes de membresía
router.get('/plans', membershipController.getMembershipPlans);

// ✅ NUEVA - Obtener planes disponibles para compra con disponibilidad
router.get('/purchase/plans', membershipController.getPurchaseableePlans);

// =============== RUTAS QUE REQUIEREN AUTENTICACIÓN ===============

// ✅ RUTAS EXISTENTES MANTENIDAS

// ✅ Cliente puede ver SUS membresías, staff ve según permisos
router.get('/', 
  authenticateToken,
  membershipController.getMemberships
);

// ✅ Solo STAFF puede ver membresías vencidas - CLIENTES NO PUEDEN
router.get('/expired', 
  authenticateToken,
  requireStaff,
  membershipController.getExpiredMemberships
);

// ✅ Solo STAFF puede ver membresías próximas a vencer - CLIENTES NO PUEDEN
router.get('/expiring-soon', 
  authenticateToken,
  requireStaff,
  membershipController.getExpiringSoon
);

// ✅ Solo STAFF puede ver estadísticas - CLIENTES NO PUEDEN
router.get('/stats', 
  authenticateToken,
  requireStaff,
  membershipController.getMembershipStats
);

// =============== RUTAS NUEVAS PARA CLIENTES ===============

// 🛒 NUEVA - Verificar disponibilidad de horarios antes de comprar
router.post('/purchase/check-availability', 
  authenticateToken,
  [
    body('planId').isInt().withMessage('ID de plan requerido'),
    body('selectedSchedule').isObject().withMessage('Horarios seleccionados requeridos')
  ],
  handleValidationErrors,
  membershipController.checkScheduleAvailability
);

// 🛒 NUEVA - COMPRAR membresía (clientes) o crear con horarios (staff)
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

// 👤 NUEVA - Obtener MI membresía actual con horarios (solo clientes)
router.get('/my-current', 
  authenticateToken,
  (req, res, next) => {
    // Solo clientes pueden acceder a esta ruta específica
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

// =============== RUTAS EXISTENTES PARA STAFF ===============

// ✅ Solo STAFF puede crear membresías
router.post('/', 
  authenticateToken,
  requireStaff,
  createMembershipValidator,
  handleValidationErrors,
  membershipController.createMembership
);

// ✅ Cliente puede ver SUS membresías por ID, staff ve según permisos
router.get('/:id', 
  authenticateToken,
  membershipController.getMembershipById
);

// ✅ Solo STAFF puede actualizar membresías - CLIENTES NO PUEDEN
router.patch('/:id', 
  authenticateToken,
  requireStaff,
  updateMembershipValidator,
  handleValidationErrors,
  membershipController.updateMembership
);

// ✅ Solo STAFF puede renovar membresías - CLIENTES NO PUEDEN
router.post('/:id/renew', 
  authenticateToken,
  requireStaff,
  membershipController.renewMembership
);

// ✅ Solo STAFF puede cancelar membresías - CLIENTES NO PUEDEN
router.post('/:id/cancel', 
  authenticateToken,
  requireStaff,
  membershipController.cancelMembership
);

// =============== RUTAS PARA GESTIÓN DE HORARIOS ===============

// 📅 Cliente puede actualizar horarios de SUS membresías, staff según permisos (EXISTENTE)
router.patch('/:id/schedule', 
  authenticateToken,
  [
    param('id').isUUID().withMessage('ID de membresía inválido'),
    body('selectedSchedule').isObject().withMessage('Horarios requeridos'),
    body('replaceAll').optional().isBoolean().withMessage('replaceAll debe ser boolean')
  ],
  handleValidationErrors,
  membershipController.updateMembershipSchedule || membershipController.updateSchedule
);

// 📊 NUEVA - Obtener horarios detallados de una membresía
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
      
      // Validar permisos
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

// =============== RUTAS ADMINISTRATIVAS NUEVAS ===============

// 🔧 NUEVA - Procesar deducción diaria (solo admin - para cron jobs)
router.post('/process-daily-deduction', 
  authenticateToken,
  requireAdmin,
  membershipController.processDailyDeduction
);

// 📊 NUEVA - Obtener membresías próximas a expirar con detalles (solo staff)
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
      
      // Colaborador solo ve clientes
      if (req.user.role === 'colaborador') {
        expiringMemberships = expiringMemberships.filter(m => m.user.role === 'cliente');
      }
      
      // Obtener horarios detallados para cada una
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

// 📈 NUEVA - Estadísticas de membresías con días (solo staff)
router.get('/stats-with-days', 
  authenticateToken,
  requireStaff,
  async (req, res) => {
    try {
      const { Membership } = require('../models');
      const { Op } = require('sequelize');
      
      let baseWhere = { status: 'active' };
      
      // Colaborador solo ve clientes
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

// 🔄 NUEVA - Renovar membresía manualmente con opción de cambiar horarios (solo staff)
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
      
      // Colaborador solo puede renovar membresías de clientes
      if (req.user.role === 'colaborador' && membership.user.role !== 'cliente') {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes renovar membresías de usuarios clientes'
        });
      }
      
      const transaction = await Membership.sequelize.transaction();
      
      try {
        // Agregar días
        membership.remainingDays += parseInt(additionalDays);
        membership.totalDays += parseInt(additionalDays);
        
        // Extender fecha de fin
        const newEndDate = new Date(membership.endDate);
        newEndDate.setDate(newEndDate.getDate() + parseInt(additionalDays));
        membership.endDate = newEndDate;
        
        // Si estaba expirada, reactivar
        if (membership.status === 'expired') {
          membership.status = 'active';
        }
        
        await membership.save({ transaction });
        
        // Actualizar horarios si se proporcionan
        if (newSchedule && Object.keys(newSchedule).length > 0) {
          // Liberar horarios actuales
          if (membership.reservedSchedule) {
            for (const [day, timeSlotIds] of Object.entries(membership.reservedSchedule)) {
              if (Array.isArray(timeSlotIds)) {
                for (const timeSlotId of timeSlotIds) {
                  await membership.cancelTimeSlot(day, timeSlotId);
                }
              }
            }
          }
          
          // Reservar nuevos horarios
          for (const [day, timeSlotIds] of Object.entries(newSchedule)) {
            if (Array.isArray(timeSlotIds)) {
              for (const timeSlotId of timeSlotIds) {
                await membership.reserveTimeSlot(day, timeSlotId);
              }
            }
          }
        }
        
        // Crear registro de pago si se especifica precio
        if (price && parseFloat(price) > 0) {
          const payment = await Payment.create({
            userId: membership.userId,
            membershipId: membership.id,
            amount: parseFloat(price),
            paymentMethod: 'cash', // Asumimos efectivo para renovaciones manuales
            paymentType: 'membership',
            description: `Renovación de membresía - ${additionalDays} días adicionales`,
            registeredBy: req.user.id,
            status: 'completed'
          }, { transaction });
          
          // Crear movimiento financiero
          await FinancialMovements.createFromAnyPayment(payment, { transaction });
        }
        
        await transaction.commit();
        
        const updatedSchedule = await membership.getDetailedSchedule();
        const summary = membership.getSummary();
        
        console.log(`✅ ${req.user.role} renovó membresía ID: ${id} - ${additionalDays} días adicionales`);
        
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

// =============== VALIDADORES ADICIONALES PARA NUEVAS FUNCIONES ===============

// Validador para compra de membresía
const purchaseMembershipValidator = [
  body('planId').isInt().withMessage('ID de plan requerido'),
  body('selectedSchedule').optional().isObject().withMessage('Horarios debe ser un objeto'),
  body('paymentMethod').optional().isIn(['cash', 'card', 'transfer', 'pending']).withMessage('Método de pago inválido'),
  body('userId').optional().isUUID().withMessage('User ID debe ser UUID válido'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notas muy largas')
];

// Validador para actualización de horarios
const updateScheduleValidator = [
  param('id').isUUID().withMessage('ID de membresía inválido'),
  body('selectedSchedule').isObject().withMessage('Horarios requeridos'),
  body('replaceAll').optional().isBoolean().withMessage('replaceAll debe ser boolean')
];

module.exports = router;