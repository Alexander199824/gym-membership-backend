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


// ✅ CORREGIDO: getPayments() ahora filtra completados por defecto para historial
async getPayments(req, res) {
  try {
    const {
      userId,
      paymentMethod,
      paymentType,
      status, // Si no se especifica, será 'completed' por defecto
      startDate,
      endDate,
      page = 1,
      limit = 20,
      includeAll = false // ✅ NUEVO: Para ver todos los estados
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
      // ✅ CORREGIDO: Cliente solo ve SUS propios pagos
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

    // ✅ NUEVO: Filtro de status por defecto
    if (includeAll === 'true') {
      // Si se especifica includeAll=true, mostrar todos los estados
      if (status) where.status = status;
      console.log('📋 Mostrando todos los estados de pago');
    } else {
      // ✅ POR DEFECTO: Solo mostrar pagos completados en historial
      where.status = status || 'completed';
      console.log(`📋 Filtrando pagos con status: ${where.status}`);
    }

    // Aplicar otros filtros
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (paymentType) where.paymentType = paymentType;

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

    console.log(`✅ ${req.user.role} obtuvo ${rows.length} pagos (total: ${count}) - Status: ${where.status}`);

    res.json({
      success: true,
      data: {
        payments: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        },
        filters: {
          status: where.status,
          includeAll: includeAll === 'true',
          userRole: req.user.role
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
// ✅ NUEVO: Obtener pagos en efectivo pendientes (solo staff)
async getPendingCashPayments(req, res) {
  try {
    if (!['admin', 'colaborador'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo el personal puede ver pagos en efectivo pendientes'
      });
    }

    const { Payment, Membership } = require('../models');
    const { Op } = require('sequelize');
    
    let whereClause = {
      paymentMethod: 'cash',
      status: 'pending'
    };

    // Colaborador solo ve sus registros
    if (req.user.role === 'colaborador') {
      whereClause.registeredBy = req.user.id;
    }

    const pendingCashPayments = await Payment.findAll({
      where: whereClause,
      include: [
        {
          association: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
          required: false
        },
        {
          association: 'membership',
          attributes: ['id', 'type', 'startDate', 'endDate', 'reservedSchedule'],
          required: false,
          include: [
            {
              association: 'plan',
              attributes: ['id', 'planName'],
              required: false
            }
          ]
        },
        {
          association: 'registeredByUser',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'ASC']] // Los más antiguos primero
    });

    // Formatear con información adicional
    const formattedPayments = await Promise.all(
      pendingCashPayments.map(async (payment) => {
        const hoursWaiting = (new Date() - payment.createdAt) / (1000 * 60 * 60);
        
        // Obtener horarios detallados si es membresía
        let detailedSchedule = {};
        if (payment.membership && payment.membership.reservedSchedule) {
          try {
            const membership = payment.membership;
            detailedSchedule = await membership.getDetailedSchedule();
          } catch (scheduleError) {
            console.warn('⚠️ Error obteniendo horarios:', scheduleError.message);
            detailedSchedule = {};
          }
        }

        return {
          id: payment.id,
          amount: parseFloat(payment.amount),
          paymentType: payment.paymentType,
          description: payment.description,
          notes: payment.notes,
          createdAt: payment.createdAt,
          paymentDate: payment.paymentDate,
          
          // Información del cliente
          client: payment.user ? {
            id: payment.user.id,
            name: `${payment.user.firstName} ${payment.user.lastName}`,
            email: payment.user.email,
            phone: payment.user.phone,
            type: 'registered'
          } : payment.getClientInfo(),
          
          // Información de la membresía (si aplica)
          membership: payment.membership ? {
            id: payment.membership.id,
            type: payment.membership.type,
            plan: payment.membership.plan ? {
              id: payment.membership.plan.id,
              name: payment.membership.plan.planName
            } : null,
            schedule: detailedSchedule,
            hasSchedule: Object.keys(detailedSchedule).length > 0
          } : null,
          
          // Información de quien registró
          registeredBy: payment.registeredByUser ? {
            name: `${payment.registeredByUser.firstName} ${payment.registeredByUser.lastName}`
          } : { name: 'Sistema' },
          
          // Métricas de tiempo
          hoursWaiting: Math.round(hoursWaiting * 10) / 10,
          priority: hoursWaiting > 48 ? 'critical' : 
                   hoursWaiting > 24 ? 'high' : 
                   hoursWaiting > 12 ? 'medium' : 'normal',
          
          // Acciones disponibles
          canActivate: true,
          canCancel: true
        };
      })
    );

    // Calcular estadísticas
    const totalAmount = formattedPayments.reduce((sum, p) => sum + p.amount, 0);
    const oldestHours = formattedPayments.length > 0 ? 
      Math.max(...formattedPayments.map(p => p.hoursWaiting)) : 0;
    
    // Agrupar por prioridad
    const groupedByPriority = {
      critical: formattedPayments.filter(p => p.priority === 'critical'),
      high: formattedPayments.filter(p => p.priority === 'high'),
      medium: formattedPayments.filter(p => p.priority === 'medium'),
      normal: formattedPayments.filter(p => p.priority === 'normal')
    };

    console.log(`✅ ${req.user.role} obtuvo ${formattedPayments.length} pagos en efectivo pendientes`);

    res.json({
      success: true,
      data: {
        payments: formattedPayments,
        total: formattedPayments.length,
        summary: {
          totalAmount,
          oldestHours: Math.round(oldestHours * 10) / 10,
          averageWaitingHours: formattedPayments.length > 0 ? 
            formattedPayments.reduce((sum, p) => sum + p.hoursWaiting, 0) / formattedPayments.length : 0
        },
        groupedByPriority,
        userRole: req.user.role
      }
    });

  } catch (error) {
    console.error('Error al obtener pagos en efectivo pendientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pagos en efectivo pendientes',
      error: error.message
    });
  }
}


// Habilitar membresía pagada en efectivo (solo staff en gym)

async activateCashMembership(req, res) {
  try {
    const { membershipId, paymentId } = req.body; // ✅ NUEVO: Aceptar paymentId también
    
    if (!['admin', 'colaborador'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo el personal puede activar membresías en efectivo'
      });
    }
    
    const { Membership, Payment, FinancialMovements } = require('../models');
    
    // ✅ NUEVO: Buscar por membershipId o paymentId
    let membership, payment;
    
    if (membershipId) {
      // Método original: buscar membresía y luego su pago pendiente
      membership = await Membership.findByPk(membershipId, {
        include: [
          { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { association: 'plan', attributes: ['planName', 'price'] },
          { 
            association: 'payments', 
            where: { status: 'pending', paymentMethod: 'cash' },
            required: false 
          }
        ]
      });
      
      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Membresía no encontrada'
        });
      }
      
      // Buscar pago pendiente de efectivo
      payment = membership.payments && membership.payments.length > 0 
        ? membership.payments[0] 
        : null;
        
      if (!payment) {
        return res.status(400).json({
          success: false,
          message: 'No se encontró pago pendiente en efectivo para esta membresía'
        });
      }
      
    } else if (paymentId) {
      // ✅ NUEVO: Método directo por paymentId
      payment = await Payment.findByPk(paymentId, {
        include: [
          {
            association: 'membership',
            include: [
              { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
              { association: 'plan', attributes: ['planName', 'price'] }
            ]
          }
        ]
      });
      
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado'
        });
      }
      
      membership = payment.membership;
      
      if (!membership) {
        return res.status(400).json({
          success: false,
          message: 'Pago no está asociado a una membresía'
        });
      }
      
    } else {
      return res.status(400).json({
        success: false,
        message: 'Se requiere membershipId o paymentId'
      });
    }
    
    // ✅ VALIDACIONES
    if (payment.paymentMethod !== 'cash') {
      return res.status(400).json({
        success: false,
        message: 'El pago no es en efectivo'
      });
    }
    
    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `El pago ya está ${payment.status}`
      });
    }
    
    if (membership.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'La membresía ya está activa'
      });
    }
    
    const transaction = await Membership.sequelize.transaction();
    
    try {
      // ✅ 1. Activar membresía
      membership.status = 'active';
      await membership.save({ transaction });
      
      // ✅ 2. Completar pago
      payment.status = 'completed';
      payment.notes = payment.notes 
        ? `${payment.notes}\n\nPago en efectivo confirmado por ${req.user.getFullName()} en gimnasio`
        : `Pago en efectivo confirmado por ${req.user.getFullName()} en gimnasio`;
      await payment.save({ transaction });
      
      // ✅ 3. Crear movimiento financiero
      await FinancialMovements.createFromAnyPayment(payment, { transaction });
      
      // ✅ 4. Reservar horarios si los hay
      if (membership.reservedSchedule && Object.keys(membership.reservedSchedule).length > 0) {
        const { GymTimeSlots } = require('../models');
        
        for (const [day, slots] of Object.entries(membership.reservedSchedule)) {
          if (Array.isArray(slots) && slots.length > 0) {
            for (const slotObj of slots) {
              const slotId = typeof slotObj === 'object' ? slotObj.slotId : slotObj;
              if (slotId) {
                try {
                  await GymTimeSlots.increment('currentReservations', {
                    by: 1,
                    where: { id: slotId },
                    transaction
                  });
                  console.log(`✅ Horario reservado: ${day} slot ${slotId}`);
                } catch (slotError) {
                  console.warn(`⚠️ Error reservando slot ${slotId}:`, slotError.message);
                }
              }
            }
          }
        }
      }
      
      await transaction.commit();
      
      console.log(`✅ Membresía activada: ${membership.id} - Pago: ${payment.id} - Q${payment.amount}`);
      
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
            paymentMethod: payment.paymentMethod,
            status: payment.status
          },
          confirmedBy: {
            id: req.user.id,
            name: req.user.getFullName(),
            timestamp: new Date()
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

// ✅ NUEVO: Dashboard de pagos pendientes

// ✅ ACTUALIZADO: Dashboard de pagos pendientes unificado
async getPendingDashboard(req, res) {
  try {
    if (!['admin', 'colaborador'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo el personal puede acceder al dashboard'
      });
    }

    const { Payment } = require('../models');
    const { Op } = require('sequelize');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Base query filters por rol
    let baseWhere = {};
    if (req.user.role === 'colaborador') {
      baseWhere.registeredBy = req.user.id;
    }

    const [
      pendingTransfers,
      pendingCashPayments,
      todayValidations,
      todayCompletedPayments
    ] = await Promise.all([
      // ✅ 1. Transferencias pendientes CON comprobante
      Payment.findAll({
        where: {
          ...baseWhere,
          paymentMethod: 'transfer',
          status: 'pending',
          transferProof: { [Op.not]: null }
        },
        include: [
          { 
            association: 'user', 
            attributes: ['firstName', 'lastName'],
            required: false 
          }
        ],
        order: [['createdAt', 'ASC']]
      }),

      // ✅ 2. Pagos en efectivo pendientes (NUEVO)
      Payment.findAll({
        where: {
          ...baseWhere,
          paymentMethod: 'cash',
          status: 'pending'
        },
        include: [
          { 
            association: 'user', 
            attributes: ['firstName', 'lastName'],
            required: false 
          },
          {
            association: 'membership',
            attributes: ['id', 'type'],
            required: false
          }
        ],
        order: [['createdAt', 'ASC']]
      }),

      // ✅ 3. Validaciones de hoy
      Payment.findAll({
        where: {
          transferValidatedAt: { [Op.between]: [today, tomorrow] },
          ...(req.user.role === 'colaborador' && { transferValidatedBy: req.user.id })
        },
        attributes: ['transferValidated']
      }),

      // ✅ 4. Pagos completados hoy (NUEVO para métricas)
      Payment.count({
        where: {
          ...baseWhere,
          status: 'completed',
          paymentDate: { [Op.between]: [today, tomorrow] }
        }
      })
    ]);

    // Calcular estadísticas de transferencias
    const transfersAmount = pendingTransfers.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const oldestTransfer = pendingTransfers.length > 0 ? pendingTransfers[0] : null;
    const transferHours = oldestTransfer ? 
      (new Date() - oldestTransfer.createdAt) / (1000 * 60 * 60) : 0;

    // Calcular estadísticas de efectivo
    const cashAmount = pendingCashPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const oldestCash = pendingCashPayments.length > 0 ? pendingCashPayments[0] : null;
    const cashHours = oldestCash ? 
      (new Date() - oldestCash.createdAt) / (1000 * 60 * 60) : 0;

    // Validaciones de hoy
    const approved = todayValidations.filter(v => v.transferValidated === true).length;
    const rejected = todayValidations.filter(v => v.transferValidated === false).length;

    // ✅ NUEVO: Items urgentes unificados (más de 24 horas)
    const urgentItems = [];
    
    // Transferencias urgentes
    pendingTransfers.forEach(transfer => {
      const hours = (new Date() - transfer.createdAt) / (1000 * 60 * 60);
      if (hours > 24) {
        urgentItems.push({
          type: 'transfer',
          paymentType: 'transfer_validation',
          id: transfer.id,
          clientName: transfer.user ? 
            `${transfer.user.firstName} ${transfer.user.lastName}` : 
            transfer.getClientInfo().name,
          amount: parseFloat(transfer.amount),
          hoursWaiting: Math.round(hours * 10) / 10,
          priority: hours > 48 ? 'critical' : 'high',
          action: 'validate_transfer',
          hasProof: !!transfer.transferProof
        });
      }
    });

    // Pagos en efectivo urgentes
    pendingCashPayments.forEach(payment => {
      const hours = (new Date() - payment.createdAt) / (1000 * 60 * 60);
      if (hours > 24) {
        urgentItems.push({
          type: 'cash_payment',
          paymentType: payment.paymentType,
          id: payment.id,
          clientName: payment.user ? 
            `${payment.user.firstName} ${payment.user.lastName}` : 
            payment.getClientInfo().name,
          amount: parseFloat(payment.amount),
          hoursWaiting: Math.round(hours * 10) / 10,
          priority: hours > 48 ? 'critical' : 'high',
          action: 'confirm_cash_payment',
          membershipId: payment.membership?.id || null
        });
      }
    });

    // Ordenar por prioridad y tiempo
    urgentItems.sort((a, b) => {
      if (a.priority === 'critical' && b.priority !== 'critical') return -1;
      if (b.priority === 'critical' && a.priority !== 'critical') return 1;
      return b.hoursWaiting - a.hoursWaiting;
    });

    // ✅ NUEVO: Actividad reciente unificada
    const recentActivity = await Payment.findAll({
      where: {
        [Op.or]: [
          // Transferencias validadas
          {
            transferValidatedAt: { [Op.not]: null },
            ...(req.user.role === 'colaborador' && { transferValidatedBy: req.user.id })
          },
          // Pagos en efectivo completados hoy
          {
            paymentMethod: 'cash',
            status: 'completed',
            updatedAt: { [Op.gte]: today },
            ...baseWhere
          }
        ]
      },
      include: [
        { association: 'user', attributes: ['firstName', 'lastName'], required: false },
        { association: 'transferValidator', attributes: ['firstName', 'lastName'], required: false }
      ],
      order: [['updatedAt', 'DESC']],
      limit: 10
    });

    const formattedActivity = recentActivity.map(payment => {
      if (payment.transferValidatedAt) {
        return {
          action: payment.transferValidated ? 'transfer_approved' : 'transfer_rejected',
          clientName: payment.user ? 
            `${payment.user.firstName} ${payment.user.lastName}` : 
            payment.getClientInfo().name,
          amount: parseFloat(payment.amount),
          timestamp: payment.transferValidatedAt,
          performedBy: payment.transferValidator ? 
            `${payment.transferValidator.firstName} ${payment.transferValidator.lastName}` :
            'Sistema'
        };
      } else {
        return {
          action: 'cash_payment_confirmed',
          clientName: payment.user ? 
            `${payment.user.firstName} ${payment.user.lastName}` : 
            payment.getClientInfo().name,
          amount: parseFloat(payment.amount),
          timestamp: payment.updatedAt,
          performedBy: 'Staff en gimnasio'
        };
      }
    });

    res.json({
      success: true,
      data: {
        summary: {
          pendingTransfers: {
            count: pendingTransfers.length,
            totalAmount: transfersAmount,
            oldestHours: Math.round(transferHours * 10) / 10
          },
          pendingCashPayments: { // ✅ NUEVO
            count: pendingCashPayments.length,
            totalAmount: cashAmount,
            oldestHours: Math.round(cashHours * 10) / 10
          },
          todayActivity: { // ✅ ACTUALIZADO
            transferValidations: {
              approved,
              rejected,
              total: approved + rejected
            },
            completedPayments: todayCompletedPayments
          },
          totalPendingActions: pendingTransfers.length + pendingCashPayments.length // ✅ NUEVO
        },
        urgentItems,
        recentActivity: formattedActivity,
        userRole: req.user.role,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error al obtener dashboard de pagos pendientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener dashboard',
      error: error.message
    });
  }
}
// AGREGAR ESTE MÉTODO al paymentController.js después del método getPendingDashboard

// ✅ NUEVO: Obtener estadísticas de pagos
async getPaymentStatistics(req, res) {
  try {
    const { startDate, endDate } = req.query;
    
    if (!['admin', 'colaborador'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo el personal puede ver estadísticas de pagos'
      });
    }

    const { Payment } = require('../models');
    const { Op } = require('sequelize');

    // Establecer rango de fechas
    let dateRange = {};
    if (startDate || endDate) {
      dateRange.paymentDate = {};
      if (startDate) dateRange.paymentDate[Op.gte] = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateRange.paymentDate[Op.lte] = end;
      }
    } else {
      // Por defecto, último mes
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateRange.paymentDate = { [Op.gte]: monthAgo };
    }

    // Base query para pagos completados
    const baseWhere = {
      status: 'completed',
      ...dateRange
    };

    // Si es colaborador, solo sus pagos
    if (req.user.role === 'colaborador') {
      baseWhere.registeredBy = req.user.id;
    }

    try {
      // Calcular estadísticas básicas
      const [
        totalIncome,
        totalPayments,
        averagePayment,
        incomeByMethodData
      ] = await Promise.all([
        // Total de ingresos
        Payment.sum('amount', { where: baseWhere }) || 0,
        
        // Total de pagos
        Payment.count({ where: baseWhere }),
        
        // Promedio de pago
        Payment.findOne({
          attributes: [[Payment.sequelize.fn('AVG', Payment.sequelize.col('amount')), 'avg']],
          where: baseWhere
        }),
        
        // Ingresos por método
        Payment.findAll({
          attributes: [
            'paymentMethod',
            [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'total'],
            [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'count']
          ],
          where: baseWhere,
          group: ['paymentMethod']
        })
      ]);

      // Formatear datos
      const stats = {
        totalIncome: parseFloat(totalIncome) || 0,
        totalPayments: totalPayments || 0,
        averagePayment: parseFloat(averagePayment?.dataValues?.avg) || 0,
        incomeByMethod: incomeByMethodData.map(item => ({
          method: item.paymentMethod,
          total: parseFloat(item.dataValues.total),
          count: parseInt(item.dataValues.count),
          percentage: totalIncome > 0 ? ((parseFloat(item.dataValues.total) / totalIncome) * 100).toFixed(1) : '0'
        }))
      };

      console.log(`✅ ${req.user.role} obtuvo estadísticas: $${stats.totalIncome} (${stats.totalPayments} pagos)`);

      res.json({
        success: true,
        data: stats
      });

    } catch (statsError) {
      console.error('Error al calcular estadísticas específicas:', statsError);
      
      // Devolver estadísticas vacías si hay error
      res.json({
        success: true,
        data: {
          totalIncome: 0,
          totalPayments: 0,
          averagePayment: 0,
          incomeByMethod: []
        }
      });
    }

  } catch (error) {
    console.error('Error al obtener estadísticas de pagos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de pagos',
      error: error.message,
      // Fallback data para evitar errores en frontend
      data: {
        totalIncome: 0,
        totalPayments: 0,
        averagePayment: 0,
        incomeByMethod: []
      }
    });
  }
}


}

module.exports = new PaymentController();