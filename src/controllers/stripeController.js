// src/controllers/stripeController.js - COMPLETAMENTE REPARADO
const stripeService = require('../services/stripeService');
const paymentController = require('./paymentController');
const { User, Membership, Payment, StoreOrder, FinancialMovements } = require('../models');

// ✅ IMPORTAR EmailService para notificaciones
const { EmailService } = require('../services/notificationServices');

class StripeController {

  constructor() {
    // ✅ REPARACIÓN CRÍTICA: Inicializar EmailService
    this.emailService = new EmailService();
    
    // ✅ REPARACIÓN CRÍTICA: Bind methods to ensure proper 'this' context
    this.confirmPayment = this.confirmPayment.bind(this);
    this.processPaymentByType = this.processPaymentByType.bind(this);
    this.sendPurchaseConfirmationEmail = this.sendPurchaseConfirmationEmail.bind(this);
    this.sendNotifications = this.sendNotifications.bind(this);
  }

  // ✅ Obtener configuración pública para el frontend
  async getPublicConfig(req, res) {
    try {
      const config = stripeService.getPublicConfig();
      
      res.json({
        success: true,
        data: {
          stripe: config,
          message: config.enabled ? 'Stripe habilitado' : 'Stripe no configurado'
        }
      });
    } catch (error) {
      console.error('Error al obtener configuración de Stripe:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener configuración de pagos',
        error: error.message
      });
    }
  }

  // ✅ Crear Payment Intent para membresía
  async createMembershipPaymentIntent(req, res) {
    try {
      const { membershipId, membershipType, price } = req.body;
      const user = req.user;

      // ✅ Verificar que la membresía existe si se proporciona ID
      let membership = null;
      if (membershipId) {
        membership = await Membership.findByPk(membershipId);
        if (!membership) {
          return res.status(404).json({
            success: false,
            message: 'Membresía no encontrada'
          });
        }
      }

      // ✅ Datos de la membresía
      const membershipData = {
        type: membershipType || membership?.type || 'monthly',
        price: price || membership?.price || 0
      };

      // ✅ Información del usuario
      const userInfo = {
        id: user.id,
        name: user.getFullName(),
        email: user.email
      };

      // ✅ Crear Payment Intent en Stripe
      const result = await stripeService.createMembershipPaymentIntent(membershipData, userInfo);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Error al crear intención de pago',
          error: result.error
        });
      }

      res.json({
        success: true,
        message: 'Intención de pago creada exitosamente',
        data: {
          clientSecret: result.clientSecret,
          paymentIntentId: result.paymentIntent.id,
          amount: result.amount,
          currency: result.currency,
          membership: membershipData,
          user: {
            id: user.id,
            name: user.getFullName(),
            email: user.email
          }
        }
      });
    } catch (error) {
      console.error('Error al crear Payment Intent para membresía:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar solicitud de pago',
        error: error.message
      });
    }
  }

  // ✅ Crear Payment Intent para pago diario
  async createDailyPaymentIntent(req, res) {
    try {
      const { amount, dailyCount = 1, clientInfo } = req.body;
      const user = req.user; // Puede ser null para usuarios no registrados

      // ✅ Datos del pago diario
      const dailyData = {
        amount: parseFloat(amount),
        count: parseInt(dailyCount)
      };

      // ✅ Información del cliente
      const finalClientInfo = {
        name: user ? user.getFullName() : (clientInfo?.name || 'Cliente'),
        email: user ? user.email : clientInfo?.email,
        phone: user ? user.phone : clientInfo?.phone
      };

      // ✅ Crear Payment Intent en Stripe
      const result = await stripeService.createDailyPaymentIntent(dailyData, finalClientInfo);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Error al crear intención de pago',
          error: result.error
        });
      }

      res.json({
        success: true,
        message: 'Intención de pago diario creada exitosamente',
        data: {
          clientSecret: result.clientSecret,
          paymentIntentId: result.paymentIntent.id,
          amount: result.amount,
          currency: result.currency,
          dailyData,
          clientInfo: finalClientInfo,
          isRegisteredUser: !!user
        }
      });
    } catch (error) {
      console.error('Error al crear Payment Intent para pago diario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar solicitud de pago diario',
        error: error.message
      });
    }
  }

  // ✅ Crear Payment Intent para productos de tienda
  async createStorePaymentIntent(req, res) {
    try {
      const { orderId, sessionId } = req.body;
      const user = req.user;

      // ✅ Buscar la orden
      let order;
      if (orderId) {
        order = await StoreOrder.findByPk(orderId, {
          include: ['user', 'items']
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'ID de orden requerido'
        });
      }

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada'
        });
      }

      // ✅ Verificar permisos CORREGIDO: Permitir usuarios invitados
      if (user && order.userId && order.userId !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para pagar esta orden'
        });
      }

      // ✅ Datos de la orden
      const orderData = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: parseFloat(order.totalAmount),
        itemCount: order.items?.length || 0
      };

      // ✅ Información del cliente CORREGIDO: Manejar usuarios invitados
      const customerInfo = {
        name: order.user ? order.user.getFullName() : (order.customerInfo?.name || 'Cliente Invitado'),
        email: order.user ? order.user.email : order.customerInfo?.email,
        address: order.shippingAddress
      };

      // ✅ Crear Payment Intent en Stripe
      const result = await stripeService.createStorePaymentIntent(orderData, customerInfo);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Error al crear intención de pago',
          error: result.error
        });
      }

      res.json({
        success: true,
        message: 'Intención de pago para tienda creada exitosamente',
        data: {
          clientSecret: result.clientSecret,
          paymentIntentId: result.paymentIntent.id,
          amount: result.amount,
          currency: result.currency,
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            itemsCount: order.items?.length || 0
          },
          customer: customerInfo
        }
      });
    } catch (error) {
      console.error('Error al crear Payment Intent para tienda:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar solicitud de pago de tienda',
        error: error.message
      });
    }
  }

  // ✅ REPARACIÓN CRÍTICA: Confirmar pago exitoso
  async confirmPayment(req, res) {
    try {
      const { paymentIntentId } = req.body;
      const user = req.user; // Puede ser null para invitados

      console.log('💳 Iniciando confirmación de pago Stripe:', {
        paymentIntentId,
        hasUser: !!user,
        userId: user?.id
      });

      // ✅ Obtener detalles del pago de Stripe
      const stripeResult = await stripeService.confirmPayment(paymentIntentId);

      if (!stripeResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Error al confirmar pago con Stripe',
          error: stripeResult.error
        });
      }

      const paymentIntent = stripeResult.paymentIntent;

      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({
          success: false,
          message: 'El pago no ha sido completado exitosamente',
          status: paymentIntent.status
        });
      }

      console.log('✅ Pago confirmado en Stripe:', paymentIntent.id);

      // ✅ Obtener detalles del método de pago
      let cardDetails = null;
      if (paymentIntent.payment_method) {
        try {
          const paymentMethodResult = await stripeService.getPaymentMethodDetails(paymentIntent.payment_method);
          if (paymentMethodResult.success) {
            cardDetails = paymentMethodResult.card;
          }
        } catch (cardError) {
          console.warn('⚠️ Error obteniendo detalles de tarjeta:', cardError.message);
        }
      }

      // ✅ REPARACIÓN CRÍTICA: Formatear datos para el modelo Payment
      const paymentData = stripeService.formatPaymentData(paymentIntent, {
        userId: user?.id || null,
        registeredBy: user?.id || null,
        cardLast4: cardDetails?.last4 || null
      });

      console.log('📝 Datos del pago a crear:', {
        userId: paymentData.userId,
        registeredBy: paymentData.registeredBy,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod
      });

      // ✅ REPARACIÓN CRÍTICA: Procesar información específica del tipo de pago
      const metadata = paymentIntent.metadata || {};
      await this.processPaymentByType(paymentData, metadata, user);

      // ✅ Crear registro en la base de datos
      const payment = await Payment.create(paymentData);
      console.log('✅ Pago creado en base de datos:', payment.id);

      // ✅ REPARACIÓN CRÍTICA: Crear movimiento financiero con validación
      try {
        if (FinancialMovements && typeof FinancialMovements.createFromAnyPayment === 'function') {
          await FinancialMovements.createFromAnyPayment(payment);
          console.log('✅ Movimiento financiero creado exitosamente');
        } else {
          console.warn('⚠️ FinancialMovements.createFromAnyPayment no disponible');
        }
      } catch (financialError) {
        console.warn('⚠️ Error al crear movimiento financiero (no crítico):', financialError.message);
      }

      // ✅ NUEVA REPARACIÓN: Enviar email de confirmación
      await this.sendPurchaseConfirmationEmail(payment, user, metadata);

      // ✅ REPARACIÓN CRÍTICA: Enviar notificaciones apropiadas
      await this.sendNotifications(payment, user, metadata);

      res.json({
        success: true,
        message: 'Pago confirmado y registrado exitosamente',
        data: {
          payment: {
            id: payment.id,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
            paymentType: payment.paymentType,
            status: payment.status,
            cardLast4: payment.cardLast4,
            paymentDate: payment.paymentDate
          },
          stripe: {
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status
          }
        }
      });

    } catch (error) {
      console.error('❌ Error al confirmar pago:', error);
      res.status(500).json({
        success: false,
        message: 'Error al confirmar pago',
        error: error.message
      });
    }
  }

  // ✅ REPARACIÓN CRÍTICA: Procesar pago según su tipo
  async processPaymentByType(paymentData, metadata, user) {
    console.log('🔄 Procesando pago por tipo:', metadata.type);
    
    try {
      switch (metadata.type) {
        case 'membership':
          if (metadata.userId) {
            paymentData.userId = metadata.userId;
            paymentData.paymentType = 'membership';
            // Actualizar membresía si es necesario
            if (metadata.membershipId) {
              const membership = await Membership.findByPk(metadata.membershipId);
              if (membership) {
                membership.status = 'active';
                await membership.save();
              }
            }
          }
          break;

        case 'daily_payment':
          paymentData.paymentType = 'daily';
          if (!user && metadata.clientName) {
            paymentData.anonymousClientInfo = {
              name: metadata.clientName,
              phone: metadata.clientPhone || null,
              email: metadata.clientEmail || null
            };
          }
          paymentData.dailyPaymentCount = parseInt(metadata.dailyCount) || 1;
          break;

        case 'store_purchase':
          paymentData.paymentType = 'store_online';
          if (metadata.orderId) {
            paymentData.referenceId = metadata.orderId;
            paymentData.referenceType = 'store_order';
            
            // Actualizar estado de la orden
            try {
              const order = await StoreOrder.findByPk(metadata.orderId);
              if (order) {
                order.paymentStatus = 'paid';
                order.status = 'confirmed';
                await order.save();
                console.log('✅ Orden actualizada a estado confirmed:', order.id);
              }
            } catch (orderError) {
              console.warn('⚠️ Error al actualizar orden:', orderError.message);
            }
          }
          break;

        default:
          console.log('ℹ️ Tipo de pago no específico, usando valores por defecto');
          paymentData.paymentType = paymentData.paymentType || 'store_online';
      }

      console.log('✅ Pago procesado por tipo:', {
        type: metadata.type,
        paymentType: paymentData.paymentType,
        hasReference: !!paymentData.referenceId
      });

    } catch (error) {
      console.error('❌ Error procesando pago por tipo:', error);
      throw error;
    }
  }

  // ✅ NUEVA REPARACIÓN: Enviar email de confirmación de compra
  async sendPurchaseConfirmationEmail(payment, user, metadata) {
    console.log('📧 Enviando email de confirmación de compra');
    
    try {
      let emailData = null;
      
      if (user) {
        // Usuario registrado
        emailData = {
          to: user.email,
          name: user.getFullName(),
          isRegistered: true
        };
      } else if (metadata.customerEmail || payment.anonymousClientInfo?.email) {
        // Usuario invitado
        emailData = {
          to: metadata.customerEmail || payment.anonymousClientInfo.email,
          name: metadata.customerName || payment.anonymousClientInfo?.name || 'Cliente',
          isRegistered: false
        };
      }
      
      if (emailData && this.emailService && this.emailService.isConfigured) {
        console.log(`📧 Enviando confirmación a: ${emailData.to} (${emailData.isRegistered ? 'registrado' : 'invitado'})`);
        
        // Generar email de confirmación
        const emailTemplate = this.emailService.generatePaymentConfirmationEmail(
          { email: emailData.to, getFullName: () => emailData.name }, 
          payment
        );
        
        const emailResult = await this.emailService.sendEmail({
          to: emailData.to,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text
        });
        
        if (emailResult.success) {
          console.log('✅ Email de confirmación enviado exitosamente:', emailResult.messageId);
        } else {
          console.warn('⚠️ Error al enviar email de confirmación:', emailResult.error);
        }
      } else {
        console.log('ℹ️ No se puede enviar email: EmailService no configurado o email no disponible');
      }
      
    } catch (emailError) {
      console.warn('⚠️ Error al enviar email de confirmación (no crítico):', emailError.message);
    }
  }

  // ✅ REPARACIÓN CRÍTICA: Enviar notificaciones apropiadas
  async sendNotifications(payment, user, metadata) {
    console.log('📧 Enviando notificaciones de pago');
    
    try {
      if (user) {
        // ✅ Usuario registrado - usar sistema de notificaciones existente
        console.log('👤 Enviando notificaciones a usuario registrado');
        await paymentController.sendPaymentNotifications(payment, user);
        console.log('✅ Notificaciones enviadas a usuario registrado');
        
      } else {
        // ✅ Usuario invitado - log de información para notificación manual
        console.log('🎫 Preparando notificación para usuario invitado');
        
        const guestEmail = metadata.customerEmail || payment.anonymousClientInfo?.email;
        const guestName = metadata.customerName || payment.anonymousClientInfo?.name || 'Cliente';
        
        if (guestEmail) {
          console.log('📧 Datos para notificación de invitado:', {
            to: guestEmail,
            name: guestName,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
            orderId: metadata.orderId,
            paymentId: payment.id
          });
          
          // ✅ Email de confirmación ya enviado en sendPurchaseConfirmationEmail
          console.log('✅ Email de confirmación manejado por sendPurchaseConfirmationEmail');
          
        } else {
          console.log('ℹ️ No se encontró email para notificar a usuario invitado');
        }
      }
      
    } catch (notificationError) {
      console.warn('⚠️ Error al enviar notificaciones (no crítico):', notificationError.message);
    }
  }

  // ✅ Manejar webhook de Stripe
  async handleWebhook(req, res) {
    try {
      const signature = req.headers['stripe-signature'];
      
      if (!signature) {
        return res.status(400).json({
          success: false,
          message: 'Signature de webhook faltante'
        });
      }

      // ✅ Validar webhook
      const result = await stripeService.validateWebhook(req.body, signature);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Webhook inválido',
          error: result.error
        });
      }

      const event = result.event;

      // ✅ Procesar diferentes tipos de eventos
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        
        case 'payment_intent.canceled':
          await this.handlePaymentCanceled(event.data.object);
          break;
        
        default:
          console.log(`Evento de webhook no manejado: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error al procesar webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar webhook',
        error: error.message
      });
    }
  }

  // ✅ Manejar pago exitoso desde webhook
  async handlePaymentSucceeded(paymentIntent) {
    try {
      // Verificar si ya existe el pago en nuestra BD
      const existingPayment = await Payment.findOne({
        where: { cardTransactionId: paymentIntent.id }
      });

      if (existingPayment) {
        console.log('Pago ya registrado:', paymentIntent.id);
        return;
      }

      console.log('Procesando pago exitoso desde webhook:', paymentIntent.id);
    } catch (error) {
      console.error('Error al manejar pago exitoso:', error);
    }
  }

  // ✅ Manejar pago fallido
  async handlePaymentFailed(paymentIntent) {
    try {
      console.log('Pago fallido:', paymentIntent.id);
      
      const payment = await Payment.findOne({
        where: { cardTransactionId: paymentIntent.id }
      });

      if (payment) {
        payment.status = 'failed';
        await payment.save();
      }
    } catch (error) {
      console.error('Error al manejar pago fallido:', error);
    }
  }

  // ✅ Manejar pago cancelado
  async handlePaymentCanceled(paymentIntent) {
    try {
      console.log('Pago cancelado:', paymentIntent.id);
      
      const payment = await Payment.findOne({
        where: { cardTransactionId: paymentIntent.id }
      });

      if (payment) {
        payment.status = 'cancelled';
        await payment.save();
      }
    } catch (error) {
      console.error('Error al manejar pago cancelado:', error);
    }
  }

  // ✅ Crear reembolso
  async createRefund(req, res) {
    try {
      const { paymentId, amount, reason } = req.body;

      const payment = await Payment.findByPk(paymentId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado'
        });
      }

      if (!payment.cardTransactionId) {
        return res.status(400).json({
          success: false,
          message: 'Este pago no se puede reembolsar (no es pago con tarjeta)'
        });
      }

      const result = await stripeService.createRefund(
        payment.cardTransactionId, 
        amount, 
        reason
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Error al crear reembolso',
          error: result.error
        });
      }

      payment.status = 'refunded';
      payment.notes = payment.notes 
        ? `${payment.notes}\n\nReembolso: ${result.refundId}`
        : `Reembolso: ${result.refundId}`;
      await payment.save();

      res.json({
        success: true,
        message: 'Reembolso creado exitosamente',
        data: {
          refund: {
            id: result.refundId,
            amount: result.amount,
            status: result.status
          },
          payment: {
            id: payment.id,
            status: payment.status
          }
        }
      });
    } catch (error) {
      console.error('Error al crear reembolso:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar reembolso',
        error: error.message
      });
    }
  }

  // ✅ Obtener detalles de un pago de Stripe
  async getPaymentDetails(req, res) {
    try {
      const { paymentIntentId } = req.params;

      const result = await stripeService.confirmPayment(paymentIntentId);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado en Stripe',
          error: result.error
        });
      }

      res.json({
        success: true,
        data: {
          stripePayment: result,
          localPayment: await Payment.findOne({
            where: { cardTransactionId: paymentIntentId }
          })
        }
      });
    } catch (error) {
      console.error('Error al obtener detalles del pago:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener detalles del pago',
        error: error.message
      });
    }
  }

  // ✅ Obtener lista de pagos de Stripe
  async getStripePayments(req, res) {
    try {
      const { limit = 20 } = req.query;

      const payments = await Payment.findAll({
        where: {
          paymentMethod: 'card',
          cardTransactionId: { [require('sequelize').Op.not]: null }
        },
        include: [
          { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ],
        order: [['paymentDate', 'DESC']],
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: {
          payments,
          total: payments.length
        }
      });
    } catch (error) {
      console.error('Error al obtener pagos de Stripe:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener pagos de Stripe',
        error: error.message
      });
    }
  }

  // ✅ Verificar estado del servicio
  async getServiceStatus(req, res) {
    try {
      const config = stripeService.getPublicConfig();
      
      res.json({
        success: true,
        data: {
          enabled: config.enabled,
          mode: config.mode,
          currency: config.currency,
          message: config.enabled 
            ? `Stripe habilitado en modo ${config.mode}` 
            : 'Stripe no configurado'
        }
      });
    } catch (error) {
      console.error('Error al verificar estado del servicio:', error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar estado del servicio',
        error: error.message
      });
    }
  }
}

module.exports = new StripeController();