// src/controllers/stripeController.js - Controlador completo para Stripe - CORREGIDO
const stripeService = require('../services/stripeService');
const paymentController = require('./paymentController');
const { User, Membership, Payment, StoreOrder, FinancialMovements } = require('../models');

class StripeController {

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

  // ✅ CORREGIDO: Confirmar pago exitoso
  async confirmPayment(req, res) {
    try {
      const { paymentIntentId } = req.body;
      const user = req.user; // Puede ser null para invitados

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

      // ✅ Obtener detalles del método de pago
      let cardDetails = null;
      if (paymentIntent.payment_method) {
        const paymentMethodResult = await stripeService.getPaymentMethodDetails(paymentIntent.payment_method);
        if (paymentMethodResult.success) {
          cardDetails = paymentMethodResult.card;
        }
      }

      // ✅ CORREGIDO: Formatear datos para el modelo Payment
      const paymentData = stripeService.formatPaymentData(paymentIntent, {
        userId: user?.id || null,
        registeredBy: user?.id || null, // ✅ FIX: Usar null si no hay usuario
        cardLast4: cardDetails?.last4 || null
      });

      // ✅ CORREGIDO: Agregar información específica basada en el tipo de pago
      const metadata = paymentIntent.metadata || {};
      await this.processPaymentByType(paymentData, metadata, user);

      // ✅ Crear registro en la base de datos
      const payment = await Payment.create(paymentData);

      // ✅ CORREGIDO: Crear movimiento financiero solo si hay registeredBy
      if (payment.registeredBy) {
        try {
          await FinancialMovements.createFromAnyPayment(payment);
        } catch (financialError) {
          console.warn('⚠️ Error al crear movimiento financiero (no crítico):', financialError.message);
        }
      } else {
        console.log('ℹ️ Saltando movimiento financiero para pago sin registeredBy');
      }

      // ✅ Notificar al usuario si corresponde
      if (user) {
        try {
          await paymentController.sendPaymentNotifications(payment, user);
        } catch (notificationError) {
          console.warn('⚠️ Error al enviar notificaciones:', notificationError.message);
        }
      }

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
      console.error('Error al confirmar pago:', error);
      res.status(500).json({
        success: false,
        message: 'Error al confirmar pago',
        error: error.message
      });
    }
  }

  // ✅ CORREGIDO: Procesar pago según su tipo (ahora como método de clase)
  async processPaymentByType(paymentData, metadata, user) {
    switch (metadata.type) {
      case 'membership':
        if (metadata.userId) {
          paymentData.userId = metadata.userId;
          // Aquí podrías buscar/actualizar la membresía correspondiente
        }
        break;

      case 'daily_payment':
        if (!user && metadata.clientName) {
          paymentData.anonymousClientInfo = {
            name: metadata.clientName,
            phone: metadata.clientPhone || null
          };
        }
        paymentData.dailyPaymentCount = parseInt(metadata.dailyCount) || 1;
        break;

      case 'store_purchase':
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
            }
          } catch (orderError) {
            console.warn('⚠️ Error al actualizar orden:', orderError.message);
          }
        }
        break;
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
      // Aquí podrías procesar el pago si no se hizo en confirmPayment
    } catch (error) {
      console.error('Error al manejar pago exitoso:', error);
    }
  }

  // ✅ Manejar pago fallido
  async handlePaymentFailed(paymentIntent) {
    try {
      console.log('Pago fallido:', paymentIntent.id);
      
      // Buscar pago en BD y actualizar estado
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

      // ✅ Buscar el pago
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

      // ✅ Crear reembolso en Stripe
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

      // ✅ Actualizar estado del pago
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