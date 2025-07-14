// src/controllers/paymentController.js
const { Payment, User, Membership, DailyIncome } = require('../models');
const { Op } = require('sequelize');
const { EmailService, WhatsAppService } = require('../services/notificationServices');

class PaymentController {
  constructor() {
    this.emailService = new EmailService();
    this.whatsappService = new WhatsAppService();
  }

  // Crear nuevo pago
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
        paymentDate
      } = req.body;

      // Verificar que el usuario existe
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Si es pago de membresía, verificar que la membresía existe
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
        userId,
        membershipId: paymentType === 'membership' ? membershipId : null,
        amount,
        paymentMethod,
        paymentType,
        description,
        notes,
        registeredBy: req.user.id,
        dailyPaymentCount: paymentType === 'bulk_daily' ? dailyPaymentCount : 1,
        paymentDate: paymentDate || new Date(),
        status: paymentMethod === 'transfer' ? 'pending' : 'completed'
      };

      const payment = await Payment.create(paymentData);

      // Si es pago completado, enviar notificaciones
      if (payment.status === 'completed') {
        await this.sendPaymentNotifications(payment, user);
      }

      // Incluir datos relacionados en la respuesta
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

  // Obtener todos los pagos con filtros
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

      // Aplicar filtros
      if (userId) where.userId = userId;
      if (paymentMethod) where.paymentMethod = paymentMethod;
      if (paymentType) where.paymentType = paymentType;
      if (status) where.status = status;

      // Filtro por rango de fechas
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

  // Obtener pago por ID
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

  // Subir comprobante de transferencia
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

      // Verificar que es un pago por transferencia
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

  // Validar transferencia (solo admin)
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

      // Actualizar el pago
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

      // Si se aprobó, enviar notificaciones y activar membresía
      if (approved) {
        await this.sendPaymentNotifications(payment, payment.user);
        
        // Si es pago de membresía, activarla/renovarla
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

  // Obtener transferencias pendientes
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

  // Registrar ingresos diarios totales
  async registerDailyIncome(req, res) {
    try {
      const {
        date,
        totalAmount,
        membershipPayments = 0,
        dailyPayments = 0,
        notes
      } = req.body;

      // Verificar si ya existe registro para esa fecha
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

  // Obtener reportes de pagos
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

      // Definir rango de fechas según el período
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

      // Total de ingresos
      const totalIncome = await Payment.sum('amount', {
        where: {
          status: 'completed',
          paymentDate: dateRange
        }
      });

      // Ingresos por tipo de pago
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

      // Ingresos por método de pago
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

      // Pagos por día (últimos 30 días para gráficas)
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

  // Enviar notificaciones de pago
  async sendPaymentNotifications(payment, user) {
    try {
      const preferences = user.notificationPreferences || {};

      // Enviar email de confirmación
      if (preferences.email !== false && user.email) {
        const emailTemplate = this.emailService.generatePaymentConfirmationEmail(user, payment);
        await this.emailService.sendEmail({
          to: user.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text
        });
      }

      // Enviar WhatsApp de confirmación
      if (preferences.whatsapp !== false && user.whatsapp) {
        const message = this.whatsappService.generatePaymentConfirmationMessage(user, payment);
        await this.whatsappService.sendWhatsApp({
          to: user.whatsapp,
          message
        });
      }
    } catch (error) {
      console.error('Error al enviar notificaciones de pago:', error);
    }
  }
}

module.exports = new PaymentController();