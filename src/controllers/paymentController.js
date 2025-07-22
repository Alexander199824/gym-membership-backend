// src/controllers/paymentController.js - CORREGIDO: Problemas de consultas de base de datos
const { Payment, User, Membership, DailyIncome, StoreOrder, StoreOrderItem, StoreProduct, FinancialMovements } = require('../models');
const { Op } = require('sequelize');
const { EmailService, WhatsAppService } = require('../services/notificationServices');

class PaymentController {
  constructor() {
    this.emailService = new EmailService();
    this.whatsappService = new WhatsAppService();
    
    // ✅ Bindear métodos al contexto de la clase
    this.sendPaymentNotifications = this.sendPaymentNotifications.bind(this);
  }

  // ✅ Crear nuevo pago
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

      // ✅ Verificar que el usuario existe (si se proporciona)
      if (userId) {
        const user = await User.findByPk(userId);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'Usuario no encontrado'
          });
        }
      }

      // ✅ Si es pago de membresía, verificar que la membresía existe
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
        registeredBy: req.user.id,
        dailyPaymentCount: paymentType === 'bulk_daily' ? dailyPaymentCount : 1,
        paymentDate: paymentDate || new Date(),
        status: paymentMethod === 'transfer' ? 'pending' : 'completed'
      };

      const payment = await Payment.create(paymentData);

      // ✅ Si es pago completado, crear movimiento financiero automáticamente
      if (payment.status === 'completed') {
        try {
          await FinancialMovements.createFromAnyPayment(payment);
        } catch (financialError) {
          console.warn('⚠️ Error al crear movimiento financiero (no crítico):', financialError.message);
        }

        // ✅ Enviar notificaciones si hay usuario
        if (userId) {
          try {
            const user = await User.findByPk(userId);
            await this.sendPaymentNotifications(payment, user);
          } catch (notificationError) {
            console.warn('⚠️ Error al enviar notificaciones de pago (no crítico):', notificationError.message);
          }
        }
      }

      // ✅ Incluir datos relacionados en la respuesta
      const paymentWithDetails = await Payment.findByPk(payment.id, {
        include: [
          { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { association: 'membership', attributes: ['id', 'type', 'endDate'] },
          { association: 'registeredByUser', attributes: ['id', 'firstName', 'lastName'] }
        ]
      });

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

  // ✅ Obtener todos los pagos con filtros
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

      // ✅ Aplicar filtros
      if (userId) where.userId = userId;
      if (paymentMethod) where.paymentMethod = paymentMethod;
      if (paymentType) where.paymentType = paymentType;
      if (status) where.status = status;

      // ✅ Filtro por rango de fechas
      if (startDate || endDate) {
        where.paymentDate = {};
        if (startDate) where.paymentDate[Op.gte] = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          where.paymentDate[Op.lte] = end;
        }
      }

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

  // ✅ Obtener pago por ID
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

  // ✅ Subir comprobante de transferencia
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

      // ✅ Verificar que es un pago por transferencia
      if (payment.paymentMethod !== 'transfer') {
        return res.status(400).json({
          success: false,
          message: 'Solo se pueden subir comprobantes para pagos por transferencia'
        });
      }

      // ✅ Verificar permisos (usuario propietario o staff)
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

  // ✅ Validar transferencia (solo admin)
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

      // ✅ Actualizar el pago
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

      // ✅ Si se aprobó, enviar notificaciones y crear movimiento financiero
      if (approved) {
        // Crear movimiento financiero
        try {
          await FinancialMovements.createFromAnyPayment(payment);
        } catch (financialError) {
          console.warn('⚠️ Error al crear movimiento financiero:', financialError.message);
        }

        // Enviar notificaciones
        if (payment.user) {
          try {
            await this.sendPaymentNotifications(payment, payment.user);
          } catch (notificationError) {
            console.warn('⚠️ Error al enviar notificaciones (no crítico):', notificationError.message);
          }
        }
        
        // ✅ Si es pago de membresía, activarla/renovarla
        if (payment.paymentType === 'membership' && payment.membership) {
          const membership = payment.membership;
          membership.status = 'active';
          
          // Si la membresía ya venció, renovar desde hoy
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

  // ✅ Obtener transferencias pendientes
  async getPendingTransfers(req, res) {
    try {
      if (!['admin', 'colaborador'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver transferencias pendientes'
        });
      }

      const pendingTransfers = await Payment.findAll({
        where: {
          paymentMethod: 'transfer',
          status: 'pending',
          transferProof: { [Op.not]: null }
        },
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

  // ✅ Registrar ingresos diarios totales
  async registerDailyIncome(req, res) {
    try {
      const {
        date,
        totalAmount,
        membershipPayments = 0,
        dailyPayments = 0,
        notes
      } = req.body;

      // ✅ Verificar si ya existe registro para esa fecha
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

  // ✅ NUEVO: Crear pago desde orden de tienda
  async createPaymentFromOrder(req, res) {
    try {
      const { orderId } = req.body;

      // ✅ Buscar la orden
      const order = await StoreOrder.findByPk(orderId, {
        include: ['user', 'items']
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada'
        });
      }

      // ✅ Solo crear pago si no existe ya
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

      // ✅ Determinar tipo de pago según método
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

      // ✅ Crear el pago
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

      // ✅ Crear movimiento financiero automáticamente
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

  // ✅ CORREGIDO: Reportes de pagos incluyendo productos
  async getEnhancedPaymentReports(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden ver reportes'
        });
      }

      const { period = 'month', startDate, endDate } = req.query;

      let dateRange = {};
      const now = new Date();

      // ✅ Definir rango de fechas
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

      // ✅ CORREGIDO: Consultas más seguras con try-catch individuales
      let totalIncome = 0;
      let incomeBySource = [];
      let paymentMethodStats = [];
      let dailyTrend = [];
      let productPerformance = [];

      try {
        // Total de ingresos
        totalIncome = await Payment.sum('amount', {
          where: {
            status: 'completed',
            paymentDate: dateRange
          }
        }) || 0;
      } catch (error) {
        console.warn('⚠️ Error al calcular ingresos totales:', error.message);
        totalIncome = 0;
      }

      try {
        // Ingresos por fuente
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
          where: {
            status: 'completed',
            paymentDate: dateRange
          },
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
        // Métodos de pago más utilizados
        paymentMethodStats = await Payment.findAll({
          attributes: [
            'paymentMethod',
            [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'total'],
            [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'count']
          ],
          where: {
            status: 'completed',
            paymentDate: dateRange
          },
          group: ['paymentMethod']
        });
      } catch (error) {
        console.warn('⚠️ Error al obtener estadísticas de métodos de pago:', error.message);
        paymentMethodStats = [];
      }

      try {
        // Tendencia diaria (últimos 30 días)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const rawDailyTrend = await Payment.findAll({
          attributes: [
            [Payment.sequelize.fn('DATE', Payment.sequelize.col('paymentDate')), 'date'],
            [Payment.sequelize.literal(`
              CASE 
                WHEN payment_type IN ('membership') THEN 'memberships'
                WHEN payment_type IN ('store_cash_delivery', 'store_card_delivery', 'store_online', 'store_transfer') THEN 'products'
                WHEN payment_type IN ('daily', 'bulk_daily') THEN 'daily'
                ELSE 'other'
              END
            `), 'source'],
            [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'total']
          ],
          where: {
            status: 'completed',
            paymentDate: { [Op.gte]: thirtyDaysAgo }
          },
          group: [
            Payment.sequelize.fn('DATE', Payment.sequelize.col('paymentDate')),
            Payment.sequelize.literal(`
              CASE 
                WHEN payment_type IN ('membership') THEN 'memberships'
                WHEN payment_type IN ('store_cash_delivery', 'store_card_delivery', 'store_online', 'store_transfer') THEN 'products'
                WHEN payment_type IN ('daily', 'bulk_daily') THEN 'daily'
                ELSE 'other'
              END
            `)
          ],
          order: [[Payment.sequelize.fn('DATE', Payment.sequelize.col('paymentDate')), 'ASC']]
        });

        dailyTrend = this.organizeDailyTrend(rawDailyTrend);
      } catch (error) {
        console.warn('⚠️ Error al obtener tendencia diaria:', error.message);
        dailyTrend = [];
      }

      // ✅ CORREGIDO: Productos más vendidos con verificación de modelos más robusta
      try {
        // Verificar disponibilidad de modelos de tienda
        const modelsAvailable = this.checkStoreModelsAvailability();
        
        if (modelsAvailable) {
          // Usar ORM en lugar de SQL crudo para mejor compatibilidad
          const orderItems = await StoreOrderItem.findAll({
            attributes: [
              'productId',
              [StoreOrderItem.sequelize.fn('SUM', StoreOrderItem.sequelize.col('quantity')), 'totalSold'],
              [StoreOrderItem.sequelize.fn('SUM', StoreOrderItem.sequelize.col('totalPrice')), 'totalRevenue']
            ],
            include: [{
              model: StoreOrder,
              as: 'order',
              where: {
                status: 'delivered',
                createdAt: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
              },
              attributes: []
            }, {
              model: StoreProduct,
              as: 'product',
              attributes: ['id', 'name'],
              required: true
            }],
            group: ['productId', 'product.id', 'product.name'],
            order: [[StoreOrderItem.sequelize.fn('SUM', StoreOrderItem.sequelize.col('quantity')), 'DESC']],
            limit: 10
          });

          productPerformance = orderItems.map(item => ({
            id: item.productId,
            name: item.product?.name || 'Producto desconocido',
            totalSold: parseInt(item.dataValues.totalSold || 0),
            totalRevenue: parseFloat(item.dataValues.totalRevenue || 0)
          }));
        }
      } catch (error) {
        console.warn('⚠️ Error al obtener productos más vendidos (no crítico):', error.message);
        productPerformance = [];
      }

      // ✅ Respuesta con datos seguros
      res.json({
        success: true,
        data: {
          totalIncome: parseFloat(totalIncome.toFixed(2)),
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
          dailyTrend,
          topProducts: productPerformance
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

  // ✅ NUEVO: Método para verificar disponibilidad de modelos de tienda
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

  // ✅ Obtener reportes de pagos (método original mantenido por compatibilidad)
  async getPaymentReports(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden ver reportes'
        });
      }

      const { period = 'month', startDate, endDate } = req.query;

      let dateRange = {};
      const now = new Date();

      // ✅ Definir rango de fechas según el período
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

      // ✅ Total de ingresos
      const totalIncome = await Payment.sum('amount', {
        where: {
          status: 'completed',
          paymentDate: dateRange
        }
      });

      // ✅ Ingresos por tipo de pago
      const incomeByType = await Payment.findAll({
        attributes: [
          'paymentType',
          [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'total'],
          [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'count']
        ],
        where: {
          status: 'completed',
          paymentDate: dateRange
        },
        group: ['paymentType']
      });

      // ✅ Ingresos por método de pago
      const incomeByMethod = await Payment.findAll({
        attributes: [
          'paymentMethod',
          [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'total'],
          [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'count']
        ],
        where: {
          status: 'completed',
          paymentDate: dateRange
        },
        group: ['paymentMethod']
      });

      // ✅ Pagos por día (últimos 30 días para gráficas)
      const dailyPayments = await Payment.findAll({
        attributes: [
          [Payment.sequelize.fn('DATE', Payment.sequelize.col('paymentDate')), 'date'],
          [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'total'],
          [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'count']
        ],
        where: {
          status: 'completed',
          paymentDate: { [Op.gte]: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
        },
        group: [Payment.sequelize.fn('DATE', Payment.sequelize.col('paymentDate'))],
        order: [[Payment.sequelize.fn('DATE', Payment.sequelize.col('paymentDate')), 'ASC']]
      });

      res.json({
        success: true,
        data: {
          totalIncome: totalIncome || 0,
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

  // ✅ Método auxiliar para organizar tendencia diaria
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

  // ✅ Método de notificaciones mejorado
  async sendPaymentNotifications(payment, user) {
    try {
      // ✅ Verificar que los servicios estén disponibles
      if (!this.emailService || !this.whatsappService) {
        console.warn('⚠️ Servicios de notificación no disponibles');
        return;
      }

      const preferences = user.notificationPreferences || {};

      // ✅ Enviar email de confirmación
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

      // ✅ Enviar WhatsApp de confirmación
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
      // No lanzar el error para que no interrumpa el proceso principal
    }
  }
}

module.exports = new PaymentController();