// src/services/stripeService.js - Servicio completo de Stripe
const stripe = require('stripe');

class StripeService {
  constructor() {
    // ✅ Verificar si Stripe está configurado correctamente
    this.isConfigured = this.checkConfiguration();
    
    if (this.isConfigured) {
      try {
        this.stripe = stripe(process.env.STRIPE_SECRET_KEY);
        console.log(`✅ Stripe inicializado en modo ${process.env.STRIPE_MODE || 'test'}`);
      } catch (error) {
        console.error('❌ Error al inicializar Stripe:', error.message);
        this.isConfigured = false;
        this.stripe = null;
      }
    } else {
      console.warn('⚠️ Stripe no configurado - Los pagos con tarjeta no estarán disponibles');
      this.stripe = null;
    }
  }

  // ✅ Verificar configuración de Stripe
  checkConfiguration() {
    const required = [
      'STRIPE_SECRET_KEY',
      'STRIPE_PUBLISHABLE_KEY'
    ];

    const missing = required.filter(key => !process.env[key] || process.env[key].startsWith('sk_test_51234'));
    
    if (missing.length > 0) {
      console.warn('⚠️ Configuración de Stripe incompleta:', missing.join(', '));
      return false;
    }

    return process.env.STRIPE_ENABLED !== 'false';
  }

  // ✅ REPARACIÓN CRÍTICA: Crear Payment Intent (método que faltaba)
  async createPaymentIntent(paymentData) {
    if (!this.isConfigured) {
      throw new Error('Stripe no está configurado');
    }

    try {
      const {
        amount,
        currency = process.env.STRIPE_CURRENCY || 'gtq',
        metadata = {},
        description,
        receipt_email,
        setup_future_usage
      } = paymentData;

      // Validar amount
      if (!amount || amount <= 0) {
        throw new Error('Amount debe ser un número positivo');
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount), // Ya viene en centavos desde el controlador
        currency,
        metadata: {
          gymSystem: 'elite-fitness-club',
          ...metadata
        },
        description,
        receipt_email,
        setup_future_usage,
        automatic_payment_methods: {
          enabled: true
        }
      });

      console.log(`✅ Payment Intent creado: ${paymentIntent.id} - ${amount/100} ${currency.toUpperCase()}`);

      return {
        success: true,
        paymentIntent,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount, // Mantener en centavos como espera el controlador
        currency: paymentIntent.currency
      };
    } catch (error) {
      console.error('❌ Error al crear Payment Intent:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // ✅ Crear Payment Intent para membresías
  async createMembershipPaymentIntent(membershipData, userInfo) {
    if (!this.isConfigured) {
      throw new Error('Stripe no está configurado');
    }

    try {
      const amount = Math.round(membershipData.price * 100); // Convertir a centavos
      
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency: process.env.STRIPE_CURRENCY || 'usd',
        metadata: {
          type: 'membership',
          membershipType: membershipData.type,
          userId: userInfo.id,
          userEmail: userInfo.email,
          userName: userInfo.name,
          gymSystem: 'elite-fitness-club'
        },
        description: `Membresía ${membershipData.type} - ${userInfo.name}`,
        receipt_email: userInfo.email,
        setup_future_usage: 'off_session' // Para futuros pagos automáticos
      });

      return {
        success: true,
        paymentIntent,
        clientSecret: paymentIntent.client_secret,
        amount: amount / 100,
        currency: paymentIntent.currency
      };
    } catch (error) {
      console.error('Error al crear Payment Intent para membresía:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ✅ Crear Payment Intent para pagos diarios
  async createDailyPaymentIntent(dailyData, clientInfo) {
    if (!this.isConfigured) {
      throw new Error('Stripe no está configurado');
    }

    try {
      const amount = Math.round(dailyData.amount * 100);
      
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency: process.env.STRIPE_CURRENCY || 'usd',
        metadata: {
          type: 'daily_payment',
          dailyCount: dailyData.count || 1,
          clientName: clientInfo.name || 'Cliente',
          clientPhone: clientInfo.phone || '',
          gymSystem: 'elite-fitness-club'
        },
        description: `Pago diario (${dailyData.count || 1} entrada${dailyData.count > 1 ? 's' : ''}) - ${clientInfo.name || 'Cliente'}`,
        receipt_email: clientInfo.email
      });

      return {
        success: true,
        paymentIntent,
        clientSecret: paymentIntent.client_secret,
        amount: amount / 100,
        currency: paymentIntent.currency
      };
    } catch (error) {
      console.error('Error al crear Payment Intent para pago diario:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ✅ Crear Payment Intent para productos de tienda
  async createStorePaymentIntent(orderData, customerInfo) {
    if (!this.isConfigured) {
      throw new Error('Stripe no está configurado');
    }

    try {
      const amount = Math.round(orderData.totalAmount * 100);
      
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency: process.env.STRIPE_CURRENCY || 'usd',
        metadata: {
          type: 'store_purchase',
          orderId: orderData.orderId || '',
          orderNumber: orderData.orderNumber || '',
          itemCount: orderData.itemCount || 0,
          customerName: customerInfo.name || 'Cliente',
          gymSystem: 'elite-fitness-club'
        },
        description: `Compra de productos - Orden ${orderData.orderNumber || 'N/A'}`,
        receipt_email: customerInfo.email,
        shipping: customerInfo.address ? {
          name: customerInfo.name,
          address: {
            line1: customerInfo.address.street,
            city: customerInfo.address.city,
            state: customerInfo.address.state,
            postal_code: customerInfo.address.zipCode,
            country: customerInfo.address.country || 'US'
          }
        } : undefined
      });

      return {
        success: true,
        paymentIntent,
        clientSecret: paymentIntent.client_secret,
        amount: amount / 100,
        currency: paymentIntent.currency
      };
    } catch (error) {
      console.error('Error al crear Payment Intent para tienda:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ✅ Confirmar pago y obtener detalles
  async confirmPayment(paymentIntentId) {
    if (!this.isConfigured) {
      throw new Error('Stripe no está configurado');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      return {
        success: true,
        paymentIntent,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
        paymentMethod: paymentIntent.payment_method
      };
    } catch (error) {
      console.error('Error al confirmar pago:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ✅ Obtener detalles del método de pago
  async getPaymentMethodDetails(paymentMethodId) {
    if (!this.isConfigured) {
      throw new Error('Stripe no está configurado');
    }

    try {
      const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);
      
      return {
        success: true,
        paymentMethod,
        type: paymentMethod.type,
        card: paymentMethod.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          exp_month: paymentMethod.card.exp_month,
          exp_year: paymentMethod.card.exp_year,
          country: paymentMethod.card.country
        } : null
      };
    } catch (error) {
      console.error('Error al obtener detalles del método de pago:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ✅ Crear reembolso
  async createRefund(paymentIntentId, amount = null, reason = 'requested_by_customer') {
    if (!this.isConfigured) {
      throw new Error('Stripe no está configurado');
    }

    try {
      const refundData = {
        payment_intent: paymentIntentId,
        reason
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }

      const refund = await this.stripe.refunds.create(refundData);
      
      return {
        success: true,
        refund,
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      };
    } catch (error) {
      console.error('Error al crear reembolso:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ✅ Validar webhook de Stripe
  async validateWebhook(body, signature) {
    if (!this.isConfigured) {
      throw new Error('Stripe no está configurado');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      return {
        success: true,
        event
      };
    } catch (error) {
      console.error('Error al validar webhook:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ✅ Obtener configuración pública para el frontend
  getPublicConfig() {
    return {
      enabled: this.isConfigured,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      currency: process.env.STRIPE_CURRENCY || 'usd',
      country: process.env.STRIPE_COUNTRY || 'US',
      mode: process.env.STRIPE_MODE || 'test'
    };
  }

  // ✅ Convertir Payment Intent en datos para el modelo Payment
  formatPaymentData(paymentIntent, additionalData = {}) {
    const metadata = paymentIntent.metadata || {};
    
    return {
      amount: paymentIntent.amount / 100,
      paymentMethod: 'card',
      paymentType: this.getPaymentTypeFromMetadata(metadata),
      status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending',
      cardTransactionId: paymentIntent.id,
      cardLast4: null, // Se actualiza después con detalles del método de pago
      description: paymentIntent.description,
      paymentDate: new Date(paymentIntent.created * 1000),
      ...additionalData
    };
  }

  // ✅ Determinar tipo de pago basado en metadata
  getPaymentTypeFromMetadata(metadata) {
    switch (metadata.type) {
      case 'membership':
        return 'membership';
      case 'daily_payment':
        return metadata.dailyCount > 1 ? 'bulk_daily' : 'daily';
      case 'store_purchase':
        return 'store_online';
      default:
        return 'other';
    }
  }
}

// ✅ Exportar instancia singleton
module.exports = new StripeService();