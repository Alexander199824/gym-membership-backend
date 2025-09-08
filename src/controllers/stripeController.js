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

      console.log('📝 Datos finales del pago después de procesar tipo:', {
        userId: paymentData.userId,
        hasAnonymousInfo: !!paymentData.anonymousClientInfo,
        paymentType: paymentData.paymentType,
        isGuest: !paymentData.userId && !!paymentData.anonymousClientInfo
      });

      // ✅ Crear registro en la base de datos
      const payment = await Payment.create(paymentData);
      console.log('✅ Pago creado en base de datos:', payment.id);

      // ✅ REPARACIÓN CRÍTICA: Crear movimiento financiero con validación
      try {
        if (FinancialMovements && typeof FinancialMovements.createFromAnyPayment === 'function') {
          const financialMovement = await FinancialMovements.createFromAnyPayment(payment);
          if (financialMovement) {
            console.log('✅ Movimiento financiero creado exitosamente:', financialMovement.id);
          } else {
            console.warn('⚠️ Movimiento financiero no se pudo crear (método devolvió null)');
          }
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
            paymentDate: payment.paymentDate,
            isGuest: !payment.userId && !!payment.anonymousClientInfo
          },
          stripe: {
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status
          }
        }
      });

    } catch (error) {
      console.error('❌ Error al confirmar pago:', error);
      
      // ✅ MEJORAR: Mensaje de error más específico
      let errorMessage = 'Error al confirmar pago';
      
      if (error.name === 'SequelizeValidationError') {
        console.error('📋 Errores de validación:', error.errors?.map(e => e.message));
        errorMessage = 'Error de validación: ' + error.errors?.map(e => e.message).join(', ');
      } else if (error.message.includes('usuario registrado o información del cliente')) {
        errorMessage = 'Error en información del cliente para pago de invitado';
      }
      
      res.status(500).json({
        success: false,
        message: errorMessage,
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
            
            // ✅ REPARACIÓN CRÍTICA: Obtener información completa de la orden
            try {
              const order = await StoreOrder.findByPk(metadata.orderId);
              if (order) {
                // Actualizar estado de la orden
                order.paymentStatus = 'paid';
                order.status = 'confirmed';
                await order.save();
                console.log('✅ Orden actualizada a estado confirmed:', order.id);
                
                // ✅ NUEVA LÓGICA: Manejar información del cliente para invitados
                if (!order.userId && order.customerInfo) {
                  // Es un usuario invitado - usar customerInfo de la orden
                  paymentData.anonymousClientInfo = {
                    name: order.customerInfo.name,
                    email: order.customerInfo.email,
                    phone: order.customerInfo.phone
                  };
                  console.log('✅ Información de cliente invitado agregada al pago:', paymentData.anonymousClientInfo);
                } else if (order.userId) {
                  // Es un usuario registrado
                  paymentData.userId = order.userId;
                  console.log('✅ Usuario registrado asignado al pago:', order.userId);
                }
                
                // ✅ NUEVO: Guardar referencia a la orden para el email
                paymentData.orderReference = {
                  orderNumber: order.orderNumber,
                  totalAmount: order.totalAmount,
                  customerInfo: order.customerInfo,
                  shippingAddress: order.shippingAddress
                };
              }
            } catch (orderError) {
              console.warn('⚠️ Error al actualizar orden:', orderError.message);
              
              // ✅ FALLBACK: Si no se puede obtener la orden, crear info mínima para invitados
              if (!user) {
                paymentData.anonymousClientInfo = {
                  name: metadata.customerName || 'Cliente Invitado',
                  email: metadata.customerEmail || null,
                  phone: metadata.customerPhone || null
                };
                console.log('✅ Información de cliente invitado (fallback) agregada al pago');
              }
            }
          }
          break;

        default:
          console.log('ℹ️ Tipo de pago no específico, usando valores por defecto');
          paymentData.paymentType = paymentData.paymentType || 'store_online';
          
          // ✅ NUEVO: Para pagos sin tipo específico, manejar invitados
          if (!user && (metadata.customerName || metadata.customerEmail)) {
            paymentData.anonymousClientInfo = {
              name: metadata.customerName || 'Cliente',
              email: metadata.customerEmail || null,
              phone: metadata.customerPhone || null
            };
          }
      }

      console.log('✅ Pago procesado por tipo:', {
        type: metadata.type,
        paymentType: paymentData.paymentType,
        hasReference: !!paymentData.referenceId,
        hasUser: !!paymentData.userId,
        hasAnonymousInfo: !!paymentData.anonymousClientInfo,
        isGuest: !paymentData.userId && !!paymentData.anonymousClientInfo
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
          name: user.getFullName?.() || `${user.firstName} ${user.lastName}` || user.email,
          isRegistered: true
        };
      } else if (payment.anonymousClientInfo?.email) {
        // Usuario invitado
        emailData = {
          to: payment.anonymousClientInfo.email,
          name: payment.anonymousClientInfo.name || 'Cliente',
          isRegistered: false
        };
      } else if (metadata.customerEmail) {
        // Fallback a metadata
        emailData = {
          to: metadata.customerEmail,
          name: metadata.customerName || 'Cliente',
          isRegistered: false
        };
      }
      
      if (emailData && this.emailService && this.emailService.isConfigured) {
        console.log(`📧 Enviando confirmación a: ${emailData.to} (${emailData.isRegistered ? 'registrado' : 'invitado'})`);
        
        // ✅ REPARACIÓN: Crear objeto user mock para el template
        const userForTemplate = {
          email: emailData.to,
          getFullName: () => emailData.name
        };
        
        // Generar email de confirmación
        const emailTemplate = this.emailService.generatePaymentConfirmationEmail(
          userForTemplate, 
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
        console.log('📋 Datos disponibles:', {
          hasEmailService: !!this.emailService,
          isConfigured: this.emailService?.isConfigured,
          hasEmailData: !!emailData,
          userEmail: user?.email,
          anonymousEmail: payment.anonymousClientInfo?.email,
          metadataEmail: metadata.customerEmail
        });
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
        
        const guestEmail = payment.anonymousClientInfo?.email || metadata.customerEmail;
        const guestName = payment.anonymousClientInfo?.name || metadata.customerName || 'Cliente';
        
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
// AGREGAR estos métodos al stripeController.js EXISTENTE

// ✅ NUEVO: Crear Payment Intent específico para compra de membresía con horarios
async createMembershipPurchaseIntent(req, res) {
  try {
    const { planId, selectedSchedule, userId } = req.body;
    const user = req.user; // Puede ser null para invitados, pero membresías requieren login
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Debes iniciar sesión para comprar una membresía'
      });
    }
    
    const { MembershipPlans, Membership, GymTimeSlots } = require('../models');
    
    // Verificar que el plan existe
    const plan = await MembershipPlans.findByPk(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Plan de membresía no encontrado'
      });
    }
    
    // Verificar que no tenga membresía activa
    const existingMembership = await Membership.findOne({
      where: {
        userId: user.id,
        status: 'active'
      }
    });
    
    if (existingMembership) {
      return res.status(400).json({
        success: false,
        message: 'Ya tienes una membresía activa'
      });
    }
    
    // Verificar disponibilidad de horarios si se seleccionaron
    const scheduleValidation = [];
    if (selectedSchedule && Object.keys(selectedSchedule).length > 0) {
      for (const [day, timeSlotIds] of Object.entries(selectedSchedule)) {
        if (Array.isArray(timeSlotIds)) {
          for (const timeSlotId of timeSlotIds) {
            const slot = await GymTimeSlots.findByPk(timeSlotId);
            
            if (!slot || slot.currentReservations >= slot.capacity) {
              scheduleValidation.push({
                day,
                timeSlotId,
                available: false,
                reason: !slot ? 'Franja no encontrada' : 'Sin capacidad'
              });
            } else {
              scheduleValidation.push({
                day,
                timeSlotId,
                available: true,
                slot: {
                  openTime: slot.openTime,
                  closeTime: slot.closeTime,
                  label: slot.slotLabel
                }
              });
            }
          }
        }
      }
      
      const unavailableSlots = scheduleValidation.filter(v => !v.available);
      if (unavailableSlots.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Algunos horarios seleccionados no están disponibles',
          unavailableSlots
        });
      }
    }
    
    // ✅ Datos específicos para membresía
    const membershipData = {
      planId: plan.id,
      planName: plan.planName,
      durationType: plan.durationType,
      price: parseFloat(plan.price),
      originalPrice: plan.originalPrice ? parseFloat(plan.originalPrice) : null,
      discountPercentage: plan.getDiscountPercentage(),
      selectedSchedule: selectedSchedule || {},
      scheduleValidation
    };
    
    // ✅ Información del usuario
    const userInfo = {
      id: user.id,
      name: user.getFullName(),
      email: user.email,
      phone: user.phone
    };
    
    // ✅ Crear Payment Intent en Stripe con metadata específica
    const stripeResult = await stripeService.createPaymentIntent({
      amount: Math.round(membershipData.price * 100), // Centavos
      currency: 'gtq',
      metadata: {
        type: 'membership_purchase',
        planId: plan.id.toString(),
        planName: plan.planName,
        durationType: plan.durationType,
        userId: user.id,
        userName: user.getFullName(),
        userEmail: user.email,
        hasSchedule: Object.keys(selectedSchedule || {}).length > 0 ? 'true' : 'false',
        scheduleData: JSON.stringify(selectedSchedule || {}),
        timestamp: Date.now().toString()
      }
    });
    
    if (!stripeResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Error al crear intención de pago',
        error: stripeResult.error
      });
    }
    
    res.json({
      success: true,
      message: 'Intención de pago para membresía creada exitosamente',
      data: {
        clientSecret: stripeResult.clientSecret,
        paymentIntentId: stripeResult.paymentIntent.id,
        amount: stripeResult.amount,
        currency: stripeResult.currency,
        membership: membershipData,
        user: userInfo,
        schedulePreview: scheduleValidation
      }
    });
    
  } catch (error) {
    console.error('Error al crear Payment Intent para membresía:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar solicitud de pago de membresía',
      error: error.message
    });
  }
}

// ✅ MEJORAR: Confirmar pago de membresía con creación automática
async confirmMembershipPayment(req, res) {
  try {
    const { paymentIntentId } = req.body;
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario requerido para confirmar pago de membresía'
      });
    }
    
    console.log('💳 Confirmando pago de membresía:', { paymentIntentId, userId: user.id });
    
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
    
     const isTestingMode = process.env.NODE_ENV === 'development';
    
    if (paymentIntent.status !== 'succeeded') {
      if (isTestingMode) {
        console.log(`🧪 TESTING: Saltando validación de pago - Status: ${paymentIntent.status}`);
        console.log('⚠️ NOTA: En producción esto NO debe saltarse');
        console.log(`💳 Payment Intent ID: ${paymentIntent.id}`);
        
        // Simular que el pago fue exitoso para testing
        paymentIntent.status = 'succeeded';
        paymentIntent._test_mode = true;
      } else {
        return res.status(400).json({
          success: false,
          message: 'El pago no ha sido completado exitosamente',
          status: paymentIntent.status
        });
      }
    }
    
    const metadata = paymentIntent.metadata || {};
    
    // Verificar que es un pago de membresía
    if (metadata.type !== 'membership_purchase') {
      return res.status(400).json({
        success: false,
        message: 'Este pago no es para una membresía'
      });
    }
    
    console.log('✅ Pago de membresía confirmado en Stripe:', paymentIntent.id);
    
    const { 
      MembershipPlans, 
      Membership, 
      Payment, 
      FinancialMovements 
    } = require('../models');
    
    const transaction = await Membership.sequelize.transaction();
    
    try {
      // ✅ Obtener el plan de membresía
      const planId = parseInt(metadata.planId);
      const plan = await MembershipPlans.findByPk(planId);
      
      if (!plan) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Plan de membresía no encontrado'
        });
      }
      
      // ✅ Verificar que el usuario no tenga membresía activa
      const existingMembership = await Membership.findOne({
        where: {
          userId: user.id,
          status: 'active'
        }
      });
      
      if (existingMembership) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Ya tienes una membresía activa'
        });
      }
      
      // ✅ Parsear horarios seleccionados
      let selectedSchedule = {};
      try {
        selectedSchedule = metadata.scheduleData ? JSON.parse(metadata.scheduleData) : {};
      } catch (parseError) {
        console.warn('⚠️ Error parseando horarios:', parseError.message);
        selectedSchedule = {};
      }
      
      // ✅ Crear membresía con horarios
      const membershipData = {
        userId: user.id,
        type: plan.durationType,
        price: plan.price,
        startDate: new Date(),
        endDate: new Date(Date.now() + (plan.durationType === 'monthly' ? 30 : 
                         plan.durationType === 'quarterly' ? 90 : 
                         plan.durationType === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000),
        notes: `Membresía comprada online: ${plan.planName}`,
        registeredBy: user.id,
        status: 'active'
      };
      
      const membership = await Membership.createWithSchedule(
        membershipData, 
        selectedSchedule,
        { transaction }
      );
      
      console.log('✅ Membresía creada:', membership.id);
      
      // ✅ Crear registro de pago
      const paymentData = stripeService.formatPaymentData(paymentIntent, {
        userId: user.id,
        membershipId: membership.id,
        registeredBy: user.id,
        paymentType: 'membership',
        description: `Compra de membresía ${plan.planName} - Stripe`,
        notes: `Plan: ${plan.planName}, Duración: ${plan.durationType}`
      });
      
       // ✅ REPARACIÓN: Manejar modo testing
      if (paymentIntent._test_mode) {
        paymentData.notes = `${paymentData.notes} [TESTING MODE]`;
        paymentData.description = `${paymentData.description} [TEST]`;
        console.log('🧪 TESTING: Marcando pago como test mode');
      }
      
      const payment = await Payment.create(paymentData, { transaction });
      console.log('✅ Pago registrado:', payment.id);
      
      // ✅ Crear movimiento financiero
      await FinancialMovements.createFromAnyPayment(payment, { transaction });
      console.log('✅ Movimiento financiero creado');
      
      await transaction.commit();
      
      // ✅ Obtener membresía completa con horarios para respuesta
      const completeMembership = await Membership.findByPk(membership.id, {
        include: [
          { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { association: 'registeredByUser', attributes: ['id', 'firstName', 'lastName'] }
        ]
      });
      
      const detailedSchedule = await completeMembership.getDetailedSchedule();
      const summary = completeMembership.getSummary();
      
      // ✅ Enviar email de confirmación
      try {
        const membershipController = require('../controllers/membershipController');
        await membershipController.sendMembershipConfirmationEmail(
          completeMembership, 
          plan, 
          detailedSchedule
        );
        console.log('✅ Email de confirmación enviado');
      } catch (emailError) {
        console.warn('⚠️ Error enviando email de confirmación:', emailError.message);
      }
      
      console.log(`✅ Compra de membresía completada exitosamente: ${plan.planName} para ${user.getFullName()}`);
      
      res.json({
        success: true,
        message: 'Membresía comprada exitosamente',
        data: {
          membership: {
            ...completeMembership.toJSON(),
            summary,
            schedule: detailedSchedule
          },
          payment: {
            id: payment.id,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
            status: payment.status,
            paymentDate: payment.paymentDate,
            stripePaymentIntentId: paymentIntent.id
          },
          plan: {
            id: plan.id,
            name: plan.planName,
            durationType: plan.durationType,
            price: plan.price,
            discountPercentage: plan.getDiscountPercentage()
          },
          stripe: {
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status
          }
        }
      });
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error en transacción de membresía:', error);
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error al confirmar pago de membresía:', error);
    
    let errorMessage = 'Error al confirmar compra de membresía';
    
    if (error.name === 'SequelizeValidationError') {
      console.error('📋 Errores de validación:', error.errors?.map(e => e.message));
      errorMessage = 'Error de validación: ' + error.errors?.map(e => e.message).join(', ');
    } else if (error.message.includes('Ya tienes una membresía activa')) {
      errorMessage = 'Ya tienes una membresía activa';
    } else if (error.message.includes('Plan de membresía no encontrado')) {
      errorMessage = 'Plan de membresía no válido';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message
    });
  }
}

// ✅ NUEVO: Obtener historial de pagos de membresías del usuario
async getMembershipPaymentHistory(req, res) {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario requerido'
      });
    }
    
    const { Payment } = require('../models');
    const { limit = 10, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    
    // Obtener pagos de membresías del usuario
    const { count, rows } = await Payment.findAndCountAll({
      where: {
        userId: user.id,
        paymentType: 'membership',
        paymentMethod: 'card', // Solo pagos con tarjeta (Stripe)
        cardTransactionId: { [Payment.sequelize.Sequelize.Op.not]: null }
      },
      include: [
        {
          association: 'membership',
          attributes: ['id', 'type', 'startDate', 'endDate', 'status']
        }
      ],
      order: [['paymentDate', 'DESC']],
      limit: parseInt(limit),
      offset
    });
    
    // Formatear respuesta
    const formattedPayments = rows.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      status: payment.status,
      description: payment.description,
      cardLast4: payment.cardLast4,
      stripePaymentIntentId: payment.cardTransactionId,
      membership: payment.membership ? {
        id: payment.membership.id,
        type: payment.membership.type,
        startDate: payment.membership.startDate,
        endDate: payment.membership.endDate,
        status: payment.membership.status
      } : null
    }));
    
    res.json({
      success: true,
      data: {
        payments: formattedPayments,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        },
        summary: {
          totalPaid: rows.reduce((sum, p) => sum + parseFloat(p.amount), 0),
          totalTransactions: count,
          lastPayment: rows.length > 0 ? rows[0].paymentDate : null
        }
      }
    });
    
  } catch (error) {
    console.error('Error al obtener historial de pagos de membresías:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial de pagos',
      error: error.message
    });
  }
}

// ✅ NUEVO: Crear reembolso de membresía (solo admin)
async refundMembershipPayment(req, res) {
  try {
    const { paymentId, reason, partialAmount } = req.body;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden procesar reembolsos'
      });
    }
    
    const { Payment, Membership } = require('../models');
    
    // Buscar el pago de membresía
    const payment = await Payment.findByPk(paymentId, {
      include: [
        {
          association: 'membership',
          include: [{ association: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }]
        }
      ]
    });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }
    
    if (payment.paymentType !== 'membership') {
      return res.status(400).json({
        success: false,
        message: 'Este pago no es de una membresía'
      });
    }
    
    if (!payment.cardTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'Este pago no se puede reembolsar (no es pago con tarjeta)'
      });
    }
    
    if (payment.status === 'refunded') {
      return res.status(400).json({
        success: false,
        message: 'Este pago ya fue reembolsado'
      });
    }
    
    const transaction = await Payment.sequelize.transaction();
    
    try {
      // ✅ Crear reembolso en Stripe
      const refundAmount = partialAmount ? Math.round(parseFloat(partialAmount) * 100) : null;
      const stripeRefund = await stripeService.createRefund(
        payment.cardTransactionId,
        refundAmount,
        reason || 'Reembolso de membresía solicitado por administrador'
      );
      
      if (!stripeRefund.success) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Error al crear reembolso en Stripe',
          error: stripeRefund.error
        });
      }
      
      // ✅ Actualizar pago
      payment.status = 'refunded';
      payment.notes = payment.notes 
        ? `${payment.notes}\n\nReembolsado: ${reason || 'Sin razón especificada'} - Stripe Refund ID: ${stripeRefund.refundId}`
        : `Reembolsado: ${reason || 'Sin razón especificada'} - Stripe Refund ID: ${stripeRefund.refundId}`;
      await payment.save({ transaction });
      
      // ✅ Cancelar membresía si está activa
      const membership = payment.membership;
      if (membership && membership.status === 'active') {
        membership.status = 'cancelled';
        membership.notes = membership.notes 
          ? `${membership.notes}\n\nCancelada por reembolso: ${reason || 'Reembolso procesado'}`
          : `Cancelada por reembolso: ${reason || 'Reembolso procesado'}`;
        
        // Liberar horarios reservados
        if (membership.reservedSchedule) {
          for (const [day, timeSlotIds] of Object.entries(membership.reservedSchedule)) {
            if (Array.isArray(timeSlotIds)) {
              for (const timeSlotId of timeSlotIds) {
                await membership.cancelTimeSlot(day, timeSlotId);
              }
            }
          }
        }
        
        await membership.save({ transaction });
      }
      
      // ✅ Crear movimiento financiero de reembolso
      const { FinancialMovements } = require('../models');
      await FinancialMovements.create({
        type: 'expense',
        category: 'other_expense',
        description: `Reembolso de membresía - ${payment.description}`,
        amount: partialAmount || payment.amount,
        paymentMethod: 'card',
        referenceId: payment.id,
        referenceType: 'payment',
        registeredBy: req.user.id,
        notes: `Reembolso Stripe ID: ${stripeRefund.refundId}. Razón: ${reason || 'Sin razón especificada'}`
      }, { transaction });
      
      await transaction.commit();
      
      // ✅ Enviar email de notificación al usuario (opcional)
      try {
        if (membership?.user?.email && this.emailService?.isConfigured) {
          await this.emailService.sendEmail({
            to: membership.user.email,
            subject: 'Reembolso Procesado - Elite Fitness Club',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #10b981; padding: 20px; text-align: center; color: white;">
                  <h1>💰 Reembolso Procesado</h1>
                </div>
                <div style="padding: 20px;">
                  <p>Hola ${membership.user.firstName},</p>
                  <p>Tu reembolso ha sido procesado exitosamente.</p>
                  
                  <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3>Detalles del Reembolso:</h3>
                    <p><strong>Monto:</strong> Q${partialAmount || payment.amount}</p>
                    <p><strong>Método:</strong> Tarjeta terminada en ${payment.cardLast4}</p>
                    <p><strong>Razón:</strong> ${reason || 'Reembolso solicitado'}</p>
                  </div>
                  
                  <p>El reembolso aparecerá en tu estado de cuenta en 5-10 días hábiles.</p>
                  
                  <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
                  
                  <p>Saludos,<br>Elite Fitness Club</p>
                </div>
              </div>
            `,
            text: `
Reembolso Procesado

Hola ${membership.user.firstName},

Tu reembolso ha sido procesado:
- Monto: Q${partialAmount || payment.amount}
- Método: Tarjeta terminada en ${payment.cardLast4}
- Razón: ${reason || 'Reembolso solicitado'}

El reembolso aparecerá en tu estado de cuenta en 5-10 días hábiles.

Elite Fitness Club
            `
          });
        }
      } catch (emailError) {
        console.warn('⚠️ Error enviando email de reembolso:', emailError.message);
      }
      
      console.log(`✅ Reembolso procesado: ${payment.id} - Q${partialAmount || payment.amount}`);
      
      res.json({
        success: true,
        message: 'Reembolso procesado exitosamente',
        data: {
          refund: {
            id: stripeRefund.refundId,
            amount: stripeRefund.amount / 100,
            status: stripeRefund.status,
            reason: reason || 'Reembolso solicitado'
          },
          payment: {
            id: payment.id,
            status: payment.status,
            originalAmount: parseFloat(payment.amount),
            refundedAmount: partialAmount || parseFloat(payment.amount)
          },
          membership: membership ? {
            id: membership.id,
            status: membership.status,
            cancelledAt: new Date()
          } : null
        }
      });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('Error al procesar reembolso de membresía:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar reembolso',
      error: error.message
    });
  }
}


}

module.exports = new StripeController();