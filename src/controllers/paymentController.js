// src/controllers/paymentController.js - CORREGIDO: Colaboradores Y Clientes funcionando
const { Payment, User, Membership, DailyIncome, StoreOrder, StoreOrderItem, StoreProduct, FinancialMovements } = require('../models');
const { Op } = require('sequelize');
const { EmailService, WhatsAppService } = require('../services/notificationServices');

class PaymentController {
  constructor() {
    this.emailService = new EmailService();
    this.whatsappService = new WhatsAppService();
    
    this.sendPaymentNotifications = this.sendPaymentNotifications.bind(this);
  }

  // ✅ Crear nuevo pago (sin cambios - solo staff puede crear)
  async createPayment(req, res) {
    try {
      const {
        userId,
        membershipId,
        amount,
        paymentMethod,
        paymentType,
        description,
        notes,
        dailyPaymentCount = 1,
        paymentDate,
        anonymousClientInfo
      } = req.body;

      if (userId) {
        const user = await User.findByPk(userId);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'Usuario no encontrado'
          });
        }
      }

      if (paymentType === 'membership' && membershipId) {
        const membership = await Membership.findByPk(membershipId);
        if (!membership) {
          return res.status(404).json({
            success: false,
            message: 'Membresía no encontrada'
          });
        }
      }

      const paymentData = {
        userId: userId || null,
        membershipId: paymentType === 'membership' ? membershipId : null,
        amount,
        paymentMethod,
        paymentType,
        description,
        notes,
        anonymousClientInfo: userId ? null : anonymousClientInfo,
        registeredBy: req.user.id, // Siempre registra quién creó el pago
        dailyPaymentCount: paymentType === 'bulk_daily' ? dailyPaymentCount : 1,
        paymentDate: paymentDate || new Date(),
        status: paymentMethod === 'transfer' ? 'pending' : 'completed'
      };

      const payment = await Payment.create(paymentData);

      if (payment.status === 'completed') {
        try {
          await FinancialMovements.createFromAnyPayment(payment);
        } catch (financialError) {
          console.warn('⚠️ Error al crear movimiento financiero (no crítico):', financialError.message);
        }

        if (userId) {
          try {
            const user = await User.findByPk(userId);
            await this.sendPaymentNotifications(payment, user);
          } catch (notificationError) {
            console.warn('⚠️ Error al enviar notificaciones de pago (no crítico):', notificationError.message);
          }
        }
      }

      const paymentWithDetails = await Payment.findByPk(payment.id, {
        include: [
          { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { association: 'membership', attributes: ['id', 'type', 'endDate'] },
          { association: 'registeredByUser', attributes: ['id', 'firstName', 'lastName'] }
        ]
      });

      console.log(`✅ ${req.user.role} creó pago: $${amount} (${paymentType})`);

      res.status(201).json({
        success: true,
        message: `Pago ${payment.status === 'pending' ? 'registrado, pendiente de validación' : 'registrado exitosamente'}`,
        data: { payment: paymentWithDetails }
      });
    } catch (error) {
      console.error('Error al crear pago:', error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar pago',
        error: error.message
      });
    }
  }

  // ✅ CORREGIDO: Funciona para colaborador (sus pagos del día) Y cliente (sus pagos)
  async getPayments(req, res) {
    try {
      const {
        userId,
        paymentMethod,
        paymentType,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // ✅ CORREGIDO: Lógica por rol específica
      if (req.user.role === 'colaborador') {
        // Colaborador solo ve SUS pagos del día actual
        where.registeredBy = req.user.id;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        where.paymentDate = {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        };
        
        console.log(`🔍 Colaborador ${req.user.id} filtrando: solo SUS pagos de HOY`);
      } else if (req.user.role === 'cliente') {
        // ✅ CORREGIDO: Cliente solo ve SUS propios pagos (sin restricción de fecha)
        where.userId = req.user.id;
        
        // Permitir filtros de fecha para clientes
        if (startDate || endDate) {
          where.paymentDate = {};
          if (startDate) where.paymentDate[Op.gte] = new Date(startDate);
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            where.paymentDate[Op.lte] = end;
          }
        }
        
        console.log(`🔍 Cliente ${req.user.id} filtrando: solo SUS propios pagos`);
      } else {
        // Admin puede ver todos los pagos con filtros normales
        if (userId) where.userId = userId;
        
        // Filtro por rango de fechas para admin
        if (startDate || endDate) {
          where.paymentDate = {};
          if (startDate) where.paymentDate[Op.gte] = new Date(startDate);
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            where.paymentDate[Op.lte] = end;
          }
        }
        
        console.log('🔍 Admin: acceso completo a pagos');
      }

      // Aplicar otros filtros
      if (paymentMethod) where.paymentMethod = paymentMethod;
      if (paymentType) where.paymentType = paymentType;
      if (status) where.status = status;

      const { count, rows } = await Payment.findAndCountAll({
        where,
        include: [
          { 
            association: 'user', 
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          { 
            association: 'membership', 
            attributes: ['id', 'type', 'endDate']
          },
          { 
            association: 'registeredByUser', 
            attributes: ['id', 'firstName', 'lastName', 'role']
          }
        ],
        order: [['paymentDate', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      console.log(`✅ ${req.user.role} obtuvo ${rows.length} pagos (total: ${count})`);

      res.json({
        success: true,
        data: {
          payments: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener pagos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener pagos',
        error: error.message
      });
    }
  }

  // ✅ CORREGIDO: Cliente puede ver su pago, colaborador el suyo, admin todo
  async getPaymentById(req, res) {
    try {
      const { id } = req.params;

      const payment = await Payment.findByPk(id, {
        include: [
          { 
            association: 'user', 
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
          },
          { 
            association: 'membership', 
            attributes: ['id', 'type', 'startDate', 'endDate']
          },
          { 
            association: 'registeredByUser', 
            attributes: ['id', 'firstName', 'lastName', 'role']
          },
          { 
            association: 'transferValidator', 
            attributes: ['id', 'firstName', 'lastName']
          }
        ]
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado'
        });
      }

      // ✅ CORREGIDO: Validar acceso por rol específico
      if (req.user.role === 'cliente') {
        // Cliente solo puede ver SUS propios pagos
        if (payment.userId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Solo puedes ver tus propios pagos'
          });
        }
      } else if (req.user.role === 'colaborador') {
        // Colaborador solo puede ver pagos que registró
        if (payment.registeredBy !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Solo puedes ver los pagos que registraste'
          });
        }
      }
      // Admin puede ver todo (sin restricción)

      res.json({
        success: true,
        data: { payment }
      });
    } catch (error) {
      console.error('Error al obtener pago:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener pago',
        error: error.message
      });
    }
  }

  // ✅ Subir comprobante de transferencia (sin cambios)
  async uploadTransferProof(req, res) {
    try {
      const { id } = req.params;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se recibió ningún archivo'
        });
      }

      const payment = await Payment.findByPk(id);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado'
        });
      }

      if (payment.paymentMethod !== 'transfer') {
        return res.status(400).json({
          success: false,
          message: 'Solo se pueden subir comprobantes para pagos por transferencia'
        });
      }

      // Verificar permisos (usuario propietario o staff)
      if (req.user.role === 'cliente' && payment.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes subir comprobantes de tus propios pagos'
        });
      }

      payment.transferProof = req.file.path;
      payment.status = 'pending';
      await payment.save();

      res.json({
        success: true,
        message: 'Comprobante subido exitosamente. Pendiente de validación.',
        data: {
          transferProof: payment.transferProof
        }
      });
    } catch (error) {
      console.error('Error al subir comprobante:', error);
      res.status(500).json({
        success: false,
        message: 'Error al subir comprobante',
        error: error.message
      });
    }
  }

  // ✅ Validar transferencia (solo admin - sin cambios)
  async validateTransfer(req, res) {
    try {
      const { id } = req.params;
      const { approved, notes } = req.body;

      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden validar transferencias'
        });
      }

      const payment = await Payment.findByPk(id, {
        include: ['user', 'membership']
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado'
        });
      }

      if (payment.paymentMethod !== 'transfer') {
        return res.status(400).json({
          success: false,
          message: 'Este pago no es por transferencia'
        });
      }

      payment.transferValidated = true;
      payment.transferValidatedBy = req.user.id;
      payment.transferValidatedAt = new Date();
      payment.status = approved ? 'completed' : 'failed';
      
      if (notes) {
        payment.notes = payment.notes 
          ? `${payment.notes}\n\nValidación: ${notes}`
          : `Validación: ${notes}`;
      }

      await payment.save();

      if (approved) {
        try {
          await FinancialMovements.createFromAnyPayment(payment);
        } catch (financialError) {
          console.warn('⚠️ Error al crear movimiento financiero:', financialError.message);
        }

        if (payment.user) {
          try {
            await this.sendPaymentNotifications(payment, payment.user);
          } catch (notificationError) {
            console.warn('⚠️ Error al enviar notificaciones (no crítico):', notificationError.message);
          }
        }
        
        if (payment.paymentType === 'membership' && payment.membership) {
          const membership = payment.membership;
          membership.status = 'active';
          
          if (new Date(membership.endDate) < new Date()) {
            const newEndDate = new Date();
            newEndDate.setMonth(newEndDate.getMonth() + 1);
            membership.endDate = newEndDate;
          }
          
          await membership.save();
        }
      }

      res.json({
        success: true,
        message: `Transferencia ${approved ? 'aprobada' : 'rechazada'} exitosamente`,
        data: { payment }
      });
    } catch (error) {
      console.error('Error al validar transferencia:', error);
      res.status(500).json({
        success: false,
        message: 'Error al validar transferencia',
        error: error.message
      });
    }
  }

  // ✅ CORREGIDO: Solo staff puede ver transferencias pendientes
  async getPendingTransfers(req, res) {
    try {
      if (!['admin', 'colaborador'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver transferencias pendientes'
        });
      }

      const where = {
        paymentMethod: 'transfer',
        status: 'pending',
        transferProof: { [Op.not]: null }
      };

      // Colaborador solo ve sus transferencias pendientes
      if (req.user.role === 'colaborador') {
        where.registeredBy = req.user.id;
      }

      const pendingTransfers = await Payment.findAll({
        where,
        include: [
          { 
            association: 'user', 
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
          },
          { 
            association: 'membership', 
            attributes: ['id', 'type', 'endDate']
          },
          { 
            association: 'registeredByUser', 
            attributes: ['id', 'firstName', 'lastName']
          }
        ],
        order: [['createdAt', 'ASC']]
      });

      res.json({
        success: true,
        data: { 
          transfers: pendingTransfers,
          total: pendingTransfers.length
        }
      });
    } catch (error) {
      console.error('Error al obtener transferencias pendientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener transferencias pendientes',
        error: error.message
      });
    }
  }

  // ✅ Registrar ingresos diarios totales (solo staff - sin cambios)
  async registerDailyIncome(req, res) {
    try {
      const {
        date,
        totalAmount,
        membershipPayments = 0,
        dailyPayments = 0,
        notes
      } = req.body;

      const existingIncome = await DailyIncome.findOne({
        where: { date }
      });

      if (existingIncome) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un registro de ingresos para esta fecha'
        });
      }

      const dailyIncome = await DailyIncome.create({
        date,
        totalAmount,
        membershipPayments,
        dailyPayments,
        notes,
        registeredBy: req.user.id
      });

      res.status(201).json({
        success: true,
        message: 'Ingresos diarios registrados exitosamente',
        data: { dailyIncome }
      });
    } catch (error) {
      console.error('Error al registrar ingresos diarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar ingresos diarios',
        error: error.message
      });
    }
  }

  // ✅ Crear pago desde orden de tienda (solo staff - sin cambios)
  async createPaymentFromOrder(req, res) {
    try {
      const { orderId } = req.body;

      const order = await StoreOrder.findByPk(orderId, {
        include: ['user', 'items']
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada'
        });
      }

      const existingPayment = await Payment.findOne({
        where: { 
          referenceId: orderId,
          referenceType: 'store_order'
        }
      });

      if (existingPayment) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un pago para esta orden'
        });
      }

      let paymentType, status;
      switch (order.paymentMethod) {
        case 'cash_on_delivery':
          paymentType = 'store_cash_delivery';
          status = 'completed';
          break;
        case 'card_on_delivery':
          paymentType = 'store_card_delivery';
          status = 'completed';
          break;
        case 'online_card':
          paymentType = 'store_online';
          status = 'completed';
          break;
        case 'transfer':
          paymentType = 'store_transfer';
          status = 'pending';
          break;
        default:
          paymentType = 'store_other';
          status = 'completed';
      }

      const paymentData = {
        userId: order.userId,
        amount: order.totalAmount,
        paymentMethod: order.paymentMethod === 'cash_on_delivery' ? 'cash' : 
                      order.paymentMethod === 'card_on_delivery' ? 'card' :
                      order.paymentMethod === 'online_card' ? 'card' : 'transfer',
        paymentType,
        description: `Pago de productos - Orden ${order.orderNumber}`,
        notes: `Items: ${order.items.map(item => item.productName).join(', ')}`,
        referenceId: orderId,
        referenceType: 'store_order',
        registeredBy: req.user.id,
        status
      };

      const payment = await Payment.create(paymentData);

      if (payment.status === 'completed') {
        try {
          await FinancialMovements.create({
            type: 'income',
            category: 'products_sale',
            description: `Venta de productos - Orden ${order.orderNumber}`,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
            referenceId: payment.id,
            referenceType: 'payment',
            registeredBy: req.user.id
          });
        } catch (financialError) {
          console.warn('⚠️ Error al crear movimiento financiero:', financialError.message);
        }
      }

      res.status(201).json({
        success: true,
        message: 'Pago de productos registrado exitosamente',
        data: { payment }
      });
    } catch (error) {
      console.error('Error al crear pago desde orden:', error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar pago de productos',
        error: error.message
      });
    }
  }

  // ✅ NUEVO: Reporte diario personal para colaborador
  async getMyDailyReport(req, res) {
    try {
      if (req.user.role !== 'colaborador') {
        return res.status(403).json({
          success: false,
          message: 'Este endpoint es solo para colaboradores'
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const where = {
        registeredBy: req.user.id,
        paymentDate: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        },
        status: 'completed'
      };

      const summary = await Payment.findAll({
        attributes: [
          'paymentType',
          [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'total'],
          [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'count']
        ],
        where,
        group: ['paymentType']
      });

      const totalAmount = await Payment.sum('amount', { where }) || 0;
      const totalCount = await Payment.count({ where });

      const payments = await Payment.findAll({
        where,
        include: [
          { association: 'user', attributes: ['id', 'firstName', 'lastName'] },
          { association: 'membership', attributes: ['id', 'type'] }
        ],
        order: [['paymentDate', 'DESC']],
        limit: 50
      });

      res.json({
        success: true,
        data: {
          date: today.toISOString().split('T')[0],
          collaboratorId: req.user.id,
          collaboratorName: req.user.getFullName(),
          summary: {
            totalAmount,
            totalCount,
            byType: summary.reduce((acc, item) => {
              acc[item.paymentType] = {
                total: parseFloat(item.dataValues.total),
                count: parseInt(item.dataValues.count)
              };
              return acc;
            }, {})
          },
          payments
        }
      });
    } catch (error) {
      console.error('Error al obtener reporte diario personal:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener reporte diario personal',
        error: error.message
      });
    }
  }

  // ✅ NUEVO: Estadísticas diarias personales para colaborador  
  async getMyDailyStats(req, res) {
    try {
      if (req.user.role !== 'colaborador') {
        return res.status(403).json({
          success: false,
          message: 'Este endpoint es solo para colaboradores'
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const where = {
        registeredBy: req.user.id,
        paymentDate: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        },
        status: 'completed'
      };

      const totalToday = await Payment.sum('amount', { where }) || 0;
      const countToday = await Payment.count({ where });

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const weeklyAverage = await Payment.findOne({
        attributes: [
          [Payment.sequelize.fn('AVG', Payment.sequelize.col('amount')), 'avgAmount'],
          [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'totalCount']
        ],
        where: {
          registeredBy: req.user.id,
          paymentDate: { [Op.gte]: weekAgo },
          status: 'completed'
        }
      });

      const avgDaily = parseFloat(weeklyAverage?.dataValues?.avgAmount || 0) * 7;

      res.json({
        success: true,
        data: {
          today: {
            amount: totalToday,
            count: countToday,
            date: today.toISOString().split('T')[0]
          },
          comparison: {
            weeklyAverage: avgDaily,
            percentageVsAverage: avgDaily > 0 ? ((totalToday / avgDaily) * 100).toFixed(1) : '0'
          },
          collaborator: {
            id: req.user.id,
            name: req.user.getFullName()
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener estadísticas diarias personales:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas diarias personales',
        error: error.message
      });
    }
  }

  // ✅ CORREGIDO: Reportes de pagos - Solo staff puede acceder, clientes no
  async getPaymentReports(req, res) {
    try {
      // ✅ CORREGIDO: Solo staff puede acceder, clientes NO
      if (req.user.role === 'cliente') {
        return res.status(403).json({
          success: false,
          message: 'Los clientes no tienen acceso a reportes generales'
        });
      }

      // Permitir acceso a colaboradores y admin
      if (!['admin', 'colaborador'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver reportes'
        });
      }

      const { period = 'month', startDate, endDate } = req.query;

      let dateRange = {};
      const now = new Date();

      // Colaborador solo ve datos del día actual por defecto
      if (req.user.role === 'colaborador') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateRange = { [Op.between]: [today, tomorrow] };
        
        console.log(`🔍 Colaborador ${req.user.id} consultando reporte del DÍA ACTUAL`);
      } else {
        // Admin puede especificar cualquier período
        switch (period) {
          case 'today':
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateRange = { [Op.between]: [today, tomorrow] };
            break;
            
          case 'week':
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            dateRange = { [Op.gte]: weekAgo };
            break;
            
          case 'month':
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            dateRange = { [Op.gte]: monthAgo };
            break;
            
          case 'custom':
            if (startDate && endDate) {
              const start = new Date(startDate);
              const end = new Date(endDate);
              end.setHours(23, 59, 59, 999);
              dateRange = { [Op.between]: [start, end] };
            }
            break;
        }
      }

      const baseWhere = {
        status: 'completed',
        paymentDate: dateRange
      };

      // Colaborador solo ve SUS pagos
      if (req.user.role === 'colaborador') {
        baseWhere.registeredBy = req.user.id;
      }

      const totalIncome = await Payment.sum('amount', { where: baseWhere }) || 0;

      const incomeByType = await Payment.findAll({
        attributes: [
          'paymentType',
          [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'total'],
          [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'count']
        ],
        where: baseWhere,
        group: ['paymentType']
      });

      const incomeByMethod = await Payment.findAll({
        attributes: [
          'paymentMethod',
          [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'total'],
          [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'count']
        ],
        where: baseWhere,
        group: ['paymentMethod']
      });

      const dailyPaymentsWhere = { 
        ...baseWhere,
        paymentDate: { 
          [Op.gte]: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        }
      };

      const dailyPayments = await Payment.findAll({
        attributes: [
          [Payment.sequelize.fn('DATE', Payment.sequelize.col('paymentDate')), 'date'],
          [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'total'],
          [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'count']
        ],
        where: dailyPaymentsWhere,
        group: [Payment.sequelize.fn('DATE', Payment.sequelize.col('paymentDate'))],
        order: [[Payment.sequelize.fn('DATE', Payment.sequelize.col('paymentDate')), 'ASC']]
      });

      console.log(`✅ ${req.user.role} obtuvo reporte: $${totalIncome} (${req.user.role === 'colaborador' ? 'personal del día' : 'completo'})`);

      res.json({
        success: true,
        data: {
          totalIncome: totalIncome || 0,
          period: req.user.role === 'colaborador' ? 'today' : period,
          userRole: req.user.role,
          incomeByType: incomeByType.map(item => ({
            type: item.paymentType,
            total: parseFloat(item.dataValues.total),
            count: parseInt(item.dataValues.count)
          })),
          incomeByMethod: incomeByMethod.map(item => ({
            method: item.paymentMethod,
            total: parseFloat(item.dataValues.total),
            count: parseInt(item.dataValues.count)
          })),
          dailyPayments: dailyPayments.map(item => ({
            date: item.dataValues.date,
            total: parseFloat(item.dataValues.total),
            count: parseInt(item.dataValues.count)
          }))
        }
      });
    } catch (error) {
      console.error('Error al obtener reportes de pagos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener reportes',
        error: error.message
      });
    }
  }

  // ✅ CORREGIDO: Reportes mejorados - Solo staff puede acceder
  async getEnhancedPaymentReports(req, res) {
    try {
      // ✅ CORREGIDO: Solo staff puede acceder, clientes NO
      if (req.user.role === 'cliente') {
        return res.status(403).json({
          success: false,
          message: 'Los clientes no tienen acceso a reportes generales'
        });
      }

      if (!['admin', 'colaborador'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver reportes'
        });
      }

      const { period = 'month', startDate, endDate } = req.query;

      let dateRange = {};
      const now = new Date();

      if (req.user.role === 'colaborador') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateRange = { [Op.between]: [today, tomorrow] };
      } else {
        switch (period) {
          case 'today':
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateRange = { [Op.between]: [today, tomorrow] };
            break;
          case 'week':
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            dateRange = { [Op.gte]: weekAgo };
            break;
          case 'month':
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            dateRange = { [Op.gte]: monthAgo };
            break;
          case 'custom':
            if (startDate && endDate) {
              const start = new Date(startDate);
              const end = new Date(endDate);
              end.setHours(23, 59, 59, 999);
              dateRange = { [Op.between]: [start, end] };
            }
            break;
        }
      }

      const baseWhere = {
        status: 'completed',
        paymentDate: dateRange
      };

      if (req.user.role === 'colaborador') {
        baseWhere.registeredBy = req.user.id;
      }

      let totalIncome = 0;
      let incomeBySource = [];
      let paymentMethodStats = [];

      try {
        totalIncome = await Payment.sum('amount', { where: baseWhere }) || 0;
      } catch (error) {
        console.warn('⚠️ Error al calcular ingresos totales:', error.message);
        totalIncome = 0;
      }

      try {
        incomeBySource = await Payment.findAll({
          attributes: [
            [Payment.sequelize.literal(`
              CASE 
                WHEN payment_type IN ('membership') THEN 'Membresías'
                WHEN payment_type IN ('store_cash_delivery', 'store_card_delivery', 'store_online', 'store_transfer') THEN 'Productos'
                WHEN payment_type IN ('daily', 'bulk_daily') THEN 'Pagos Diarios'
                ELSE 'Otros'
              END
            `), 'source'],
            [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'total'],
            [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'count']
          ],
          where: baseWhere,
          group: [Payment.sequelize.literal(`
            CASE 
              WHEN payment_type IN ('membership') THEN 'Membresías'
              WHEN payment_type IN ('store_cash_delivery', 'store_card_delivery', 'store_online', 'store_transfer') THEN 'Productos'
              WHEN payment_type IN ('daily', 'bulk_daily') THEN 'Pagos Diarios'
              ELSE 'Otros'
            END
          `)]
        });
      } catch (error) {
        console.warn('⚠️ Error al obtener ingresos por fuente:', error.message);
        incomeBySource = [];
      }

      try {
        paymentMethodStats = await Payment.findAll({
          attributes: [
            'paymentMethod',
            [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'total'],
            [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'count']
          ],
          where: baseWhere,
          group: ['paymentMethod']
        });
      } catch (error) {
        console.warn('⚠️ Error al obtener estadísticas de métodos de pago:', error.message);
        paymentMethodStats = [];
      }

      res.json({
        success: true,
        data: {
          totalIncome: parseFloat(totalIncome.toFixed(2)),
          userRole: req.user.role,
          period: req.user.role === 'colaborador' ? 'today' : period,
          incomeBySource: incomeBySource.map(item => ({
            source: item.dataValues.source,
            total: parseFloat(item.dataValues.total || 0),
            count: parseInt(item.dataValues.count || 0),
            percentage: totalIncome ? ((parseFloat(item.dataValues.total || 0) / totalIncome) * 100).toFixed(1) : '0'
          })),
          paymentMethodStats: paymentMethodStats.map(item => ({
            method: item.paymentMethod,
            total: parseFloat(item.dataValues.total || 0),
            count: parseInt(item.dataValues.count || 0)
          })),
          dailyTrend: [],
          topProducts: []
        }
      });
    } catch (error) {
      console.error('Error al obtener reportes mejorados:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener reportes',
        error: error.message
      });
    }
  }

  // Métodos auxiliares (sin cambios)
  organizeDailyTrend(dailyData) {
    const organized = {};
    
    dailyData.forEach(item => {
      const date = item.dataValues.date;
      const source = item.dataValues.source;
      const total = parseFloat(item.dataValues.total);
      
      if (!organized[date]) {
        organized[date] = { date, memberships: 0, products: 0, daily: 0, other: 0, total: 0 };
      }
      
      organized[date][source] = total;
      organized[date].total += total;
    });
    
    return Object.values(organized).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  checkStoreModelsAvailability() {
    try {
      return !!(StoreOrderItem && StoreOrder && StoreProduct && 
               typeof StoreOrderItem.findAll === 'function' &&
               typeof StoreOrder.findAll === 'function' &&
               typeof StoreProduct.findAll === 'function');
    } catch (error) {
      console.warn('⚠️ Modelos de tienda no disponibles:', error.message);
      return false;
    }
  }

  async sendPaymentNotifications(payment, user) {
    try {
      if (!this.emailService || !this.whatsappService) {
        console.warn('⚠️ Servicios de notificación no disponibles');
        return;
      }

      const preferences = user.notificationPreferences || {};

      if (preferences.email !== false && user.email) {
        try {
          const emailTemplate = this.emailService.generatePaymentConfirmationEmail(user, payment);
          await this.emailService.sendEmail({
            to: user.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text
          });
        } catch (emailError) {
          console.warn('⚠️ Error al enviar email de confirmación:', emailError.message);
        }
      }

      if (preferences.whatsapp !== false && user.whatsapp) {
        try {
          const message = this.whatsappService.generatePaymentConfirmationMessage(user, payment);
          await this.whatsappService.sendWhatsApp({
            to: user.whatsapp,
            message
          });
        } catch (whatsappError) {
          console.warn('⚠️ Error al enviar WhatsApp de confirmación:', whatsappError.message);
        }
      }
    } catch (error) {
      console.error('⚠️ Error general al enviar notificaciones de pago:', error.message);
    }
  }
// AGREGAR estos métodos al paymentController.js existente:

// Habilitar membresía pagada en efectivo (solo staff en gym)
async activateCashMembership(req, res) {
  try {
    const { membershipId } = req.body;
    
    if (!['admin', 'colaborador'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo el personal puede activar membresías en efectivo'
      });
    }
    
    const { Membership, Payment, FinancialMovements } = require('../models');
    
    const membership = await Membership.findByPk(membershipId, {
      include: [
        { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { association: 'plan', attributes: ['planName', 'price'] }
      ]
    });
    
    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Membresía no encontrada'
      });
    }
    
    if (membership.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `La membresía ya está ${membership.status}`
      });
    }
    
    const transaction = await Membership.sequelize.transaction();
    
    try {
      // Activar membresía
      membership.status = 'active';
      await membership.save({ transaction });
      
      // Crear registro de pago en efectivo
      const payment = await Payment.create({
        userId: membership.userId,
        membershipId: membership.id,
        amount: membership.price,
        paymentMethod: 'cash',
        paymentType: 'membership',
        description: `Pago en efectivo - ${membership.plan.planName}`,
        notes: `Activado por ${req.user.getFullName()} en gym`,
        registeredBy: req.user.id,
        status: 'completed'
      }, { transaction });
      
      // Crear movimiento financiero
      await FinancialMovements.createFromAnyPayment(payment, { transaction });
      
      await transaction.commit();
      
      res.json({
        success: true,
        message: 'Membresía activada exitosamente',
        data: {
          membership: {
            id: membership.id,
            status: membership.status,
            user: membership.user,
            plan: membership.plan
          },
          payment: {
            id: payment.id,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod
          }
        }
      });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('Error al activar membresía en efectivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al activar membresía',
      error: error.message
    });
  }
}

// Rechazar pago por transferencia
async rejectTransfer(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden rechazar transferencias'
      });
    }
    
    const { Payment, Membership } = require('../models');
    
    const payment = await Payment.findByPk(id, {
      include: ['membership']
    });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }
    
    const transaction = await Payment.sequelize.transaction();
    
    try {
      payment.status = 'failed';
      payment.transferValidated = false;
      payment.transferValidatedBy = req.user.id;
      payment.transferValidatedAt = new Date();
      payment.notes = payment.notes 
        ? `${payment.notes}\n\nRechazado: ${reason || 'Sin razón especificada'}`
        : `Rechazado: ${reason || 'Sin razón especificada'}`;
      await payment.save({ transaction });
      
      // Cancelar membresía si existe
      if (payment.membership) {
        payment.membership.status = 'cancelled';
        await payment.membership.save({ transaction });
      }
      
      await transaction.commit();
      
      res.json({
        success: true,
        message: 'Transferencia rechazada exitosamente'
      });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('Error al rechazar transferencia:', error);
    res.status(500).json({
      success: false,
      message: 'Error al rechazar transferencia',
      error: error.message
    });
  }
}


}

module.exports = new PaymentController();