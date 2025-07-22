// src/services/notificationServices.js - MIGRADO A BREVO
const brevo = require('@getbrevo/brevo');
const twilio = require('twilio');

class EmailService {
  constructor() {
    // Verificar que las credenciales de Brevo sean válidas
    const hasValidBrevoConfig = 
      process.env.BREVO_API_KEY &&
      process.env.BREVO_SENDER_EMAIL &&
      process.env.BREVO_API_KEY !== 'tu_api_key_de_brevo_aqui' && // No es placeholder
      process.env.BREVO_API_KEY.length > 10; // Validación básica de longitud

    if (hasValidBrevoConfig) {
      try {
        // Configurar cliente de Brevo
        this.brevoApi = new brevo.TransactionalEmailsApi();
        
        // Configurar API key
        const brevoApiKey = brevoApi.authentications['apiKey'];
        brevoApiKey.apiKey = process.env.BREVO_API_KEY;
        
        this.brevoApi = brevoApi;
        this.isConfigured = true;
        
        console.log('✅ Brevo Email Service inicializado correctamente');
        
        // Verificar configuración haciendo una llamada de prueba
        this.verifyConfiguration();
      } catch (error) {
        console.warn('⚠️ Error al inicializar Brevo:', error.message);
        this.brevoApi = null;
        this.isConfigured = false;
      }
    } else {
      console.warn('⚠️ Brevo no configurado correctamente - Las notificaciones por email no funcionarán');
      console.warn('   Variables requeridas: BREVO_API_KEY, BREVO_SENDER_EMAIL');
      this.brevoApi = null;
      this.isConfigured = false;
    }
  }

  // Verificar configuración de Brevo
  async verifyConfiguration() {
    try {
      // Verificar que la API key sea válida
      await this.brevoApi.getAccount();
      console.log('✅ Configuración de Brevo verificada exitosamente');
    } catch (error) {
      console.warn('⚠️ Error al verificar configuración de Brevo:', error.message);
      this.isConfigured = false;
    }
  }

  async sendEmail({ to, subject, html, text, templateId = null, templateParams = {} }) {
    try {
      if (!process.env.NOTIFICATION_EMAIL_ENABLED || process.env.NOTIFICATION_EMAIL_ENABLED !== 'true') {
        console.log('📧 Email deshabilitado en configuración');
        return { success: false, message: 'Email deshabilitado' };
      }

      if (!this.isConfigured || !this.brevoApi) {
        console.log('📧 Brevo no configurado correctamente');
        return { success: false, message: 'Brevo no configurado correctamente' };
      }

      // Preparar el email
      const emailData = {
        sender: {
          name: process.env.BREVO_SENDER_NAME || 'Elite Fitness Club',
          email: process.env.BREVO_SENDER_EMAIL
        },
        to: [
          {
            email: to,
            name: to.split('@')[0] // Usar parte del email como nombre si no se proporciona
          }
        ],
        subject: subject
      };

      // Si se especifica un template ID, usar template
      if (templateId) {
        emailData.templateId = templateId;
        emailData.params = templateParams;
      } else {
        // Usar contenido HTML/texto personalizado
        if (html) emailData.htmlContent = html;
        if (text) emailData.textContent = text;
      }

      // Enviar email a través de Brevo
      const result = await this.brevoApi.sendTransacEmail(emailData);
      
      console.log('✅ Email enviado vía Brevo:', result.messageId);
      
      return { 
        success: true, 
        messageId: result.messageId,
        provider: 'brevo'
      };
    } catch (error) {
      console.error('❌ Error al enviar email vía Brevo:', error);
      
      // Manejar errores específicos de Brevo
      if (error.response) {
        const errorMessage = error.response.body?.message || error.response.text || error.message;
        console.error('   Detalles del error:', errorMessage);
        return { success: false, error: errorMessage, provider: 'brevo' };
      }
      
      return { success: false, error: error.message, provider: 'brevo' };
    }
  }

  // Templates de email optimizados para Brevo
  generateWelcomeEmail(user) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>¡Bienvenido al Gimnasio!</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background-color: #2c3e50; color: #ffffff; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .button { display: inline-block; background-color: #3498db; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { background-color: #ecf0f1; padding: 20px; text-align: center; font-size: 12px; color: #7f8c8d; }
          .highlight { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏋️‍♂️ ¡Bienvenido a Elite Fitness Club!</h1>
          </div>
          <div class="content">
            <h2>¡Hola ${user.getFullName()}!</h2>
            <p>¡Bienvenido a nuestra familia fitness! Estamos emocionados de tenerte con nosotros en este increíble viaje hacia una vida más saludable.</p>
            
            <div class="highlight">
              <h3>✅ Tu cuenta ha sido creada exitosamente</h3>
              <p>Ahora puedes disfrutar de todos nuestros servicios:</p>
              <ul>
                <li>📊 Ver el estado de tu membresía en tiempo real</li>
                <li>📅 Programar y gestionar tus horarios de entrenamiento</li>
                <li>🔔 Recibir recordatorios automáticos de vencimiento</li>
                <li>🛍️ Acceder a nuestra tienda de productos fitness</li>
                <li>💰 Gestionar tus pagos de forma segura</li>
              </ul>
            </div>

            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || '#'}" class="button">Acceder a Mi Cuenta</a>
            </p>
            
            <p>Si tienes alguna pregunta, no dudes en contactarnos. ¡Estamos aquí para ayudarte a alcanzar tus objetivos!</p>
            
            <p style="margin-top: 30px;"><strong>¡Nos vemos en el gym! 💪</strong></p>
          </div>
          <div class="footer">
            <p>Este es un mensaje automático de Elite Fitness Club</p>
            <p>Si no puedes ver este email correctamente, <a href="#">visualízalo en tu navegador</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return {
      subject: '🏋️‍♂️ ¡Bienvenido a Elite Fitness Club!',
      html,
      text: `¡Bienvenido ${user.getFullName()}! Tu cuenta en Elite Fitness Club ha sido creada exitosamente. ¡Nos vemos en el gym!`
    };
  }

  generateMembershipExpiringEmail(user, membership) {
    const daysLeft = membership.daysUntilExpiration();
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>⚠️ Tu membresía está por vencer</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background-color: #e74c3c; color: #ffffff; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .alert-box { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .button { display: inline-block; background-color: #e74c3c; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .info-box { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Tu membresía está por vencer</h1>
          </div>
          <div class="content">
            <h2>¡Hola ${user.getFullName()}!</h2>
            
            <div class="alert-box">
              <h3>🚨 Atención: Tu membresía ${membership.type === 'monthly' ? 'mensual' : 'diaria'} vence en <strong>${daysLeft} día${daysLeft !== 1 ? 's' : ''}</strong></h3>
            </div>
            
            <div class="info-box">
              <p><strong>📅 Fecha de vencimiento:</strong> ${new Date(membership.endDate).toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
              <p><strong>💰 Precio actual:</strong> $${membership.price}</p>
              <p><strong>🏋️‍♂️ Tipo de membresía:</strong> ${membership.type === 'monthly' ? 'Mensual' : 'Diaria'}</p>
            </div>
            
            <p>Para continuar disfrutando de nuestras instalaciones y servicios sin interrupciones, renueva tu membresía antes de la fecha de vencimiento.</p>
            
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/renovar-membresia?id=${membership.id}" class="button">🔄 Renovar Membresía Ahora</a>
            </p>
            
            <p>¿Necesitas ayuda? Contáctanos:</p>
            <ul>
              <li>📞 Teléfono: ${process.env.GYM_PHONE || 'Contacta recepción'}</li>
              <li>📧 Email: ${process.env.GYM_EMAIL || 'info@gym.com'}</li>
              <li>🏢 Visítanos en recepción</li>
            </ul>
            
            <p><strong>¡Te esperamos para seguir entrenando juntos! 💪</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return {
      subject: `⚠️ Tu membresía vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''} - Renueva ahora`,
      html,
      text: `Hola ${user.getFullName()}, tu membresía vence en ${daysLeft} días (${new Date(membership.endDate).toLocaleDateString('es-ES')}). Renueva para continuar entrenando con nosotros.`
    };
  }

  generateMembershipExpiredEmail(user, membership) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🚨 Tu membresía ha vencido</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background-color: #c0392b; color: #ffffff; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .expired-box { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .button { display: inline-block; background-color: #e74c3c; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .comeback-box { background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 Tu membresía ha vencido</h1>
          </div>
          <div class="content">
            <h2>¡Hola ${user.getFullName()}!</h2>
            
            <div class="expired-box">
              <h3>⏰ Tu membresía ${membership.type === 'monthly' ? 'mensual' : 'diaria'} venció el <strong>${new Date(membership.endDate).toLocaleDateString('es-ES')}</strong></h3>
            </div>
            
            <p>Sabemos que el fitness es importante para ti, y queremos que regreses a entrenar lo antes posible.</p>
            
            <div class="comeback-box">
              <h3>🎯 ¿Por qué renovar ahora?</h3>
              <ul>
                <li>🏋️‍♂️ Mantén tu rutina de ejercicios sin interrupciones</li>
                <li>💪 No pierdas el progreso que has logrado</li>
                <li>👥 Sigue siendo parte de nuestra comunidad fitness</li>
                <li>🆕 Accede a nuevos equipos y clases</li>
              </ul>
            </div>
            
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/renovar-membresia?id=${membership.id}" class="button">💳 Renovar Ahora</a>
            </p>
            
            <p>Si tienes alguna pregunta o necesitas ayuda con tu renovación, no dudes en contactarnos. ¡Estamos aquí para apoyarte!</p>
            
            <p><strong>¡Te extrañamos y esperamos verte pronto de vuelta! 💙</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return {
      subject: '🚨 Tu membresía ha vencido - ¡Te extrañamos!',
      html,
      text: `Hola ${user.getFullName()}, tu membresía venció el ${new Date(membership.endDate).toLocaleDateString('es-ES')}. Renueva para continuar entrenando. ¡Te extrañamos!`
    };
  }

  generatePaymentConfirmationEmail(user, payment) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>✅ Pago confirmado</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background-color: #27ae60; color: #ffffff; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .success-box { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .payment-details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .button { display: inline-block; background-color: #27ae60; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ ¡Pago confirmado!</h1>
          </div>
          <div class="content">
            <h2>¡Hola ${user.getFullName()}!</h2>
            
            <div class="success-box">
              <h3>🎉 Hemos confirmado tu pago exitosamente</h3>
            </div>
            
            <div class="payment-details">
              <h3>📋 Detalles del pago:</h3>
              <p><strong>💰 Monto:</strong> $${payment.amount}</p>
              <p><strong>🏷️ Concepto:</strong> ${payment.paymentType === 'membership' ? 'Membresía mensual' : 'Entrada diaria'}</p>
              <p><strong>💳 Método de pago:</strong> ${this.getPaymentMethodName(payment.paymentMethod)}</p>
              <p><strong>📅 Fecha:</strong> ${new Date(payment.paymentDate).toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
              ${payment.paymentType === 'membership' ? '<p><strong>🔄 Estado:</strong> Tu membresía ha sido renovada exitosamente</p>' : ''}
            </div>
            
            ${payment.paymentType === 'membership' ? 
              '<p>¡Excelente! Tu membresía ha sido renovada y ya puedes continuar disfrutando de todas nuestras instalaciones y servicios.</p>' :
              '<p>¡Perfecto! Tu pago diario ha sido procesado. ¡Disfruta tu entrenamiento de hoy!</p>'
            }
            
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/mi-cuenta" class="button">Ver Mi Cuenta</a>
            </p>
            
            <p>Si tienes alguna pregunta sobre este pago, no dudes en contactarnos.</p>
            
            <p><strong>¡Gracias por confiar en Elite Fitness Club! 💪</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return {
      subject: '✅ Pago confirmado - ¡Gracias por tu confianza!',
      html,
      text: `Pago confirmado: $${payment.amount} por ${payment.paymentType === 'membership' ? 'membresía' : 'entrada diaria'}. Método: ${this.getPaymentMethodName(payment.paymentMethod)}. ¡Gracias!`
    };
  }

  getPaymentMethodName(method) {
    const methods = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      transfer: 'Transferencia bancaria',
      online: 'Pago en línea'
    };
    return methods[method] || method;
  }

  // Método para obtener estadísticas de Brevo (opcional)
  async getEmailStats() {
    try {
      if (!this.isConfigured) {
        return { success: false, message: 'Brevo no configurado' };
      }

      // Obtener estadísticas básicas de la cuenta
      const account = await this.brevoApi.getAccount();
      
      return {
        success: true,
        stats: {
          provider: 'Brevo',
          accountEmail: account.email,
          plan: account.plan || 'Unknown'
        }
      };
    } catch (error) {
      console.error('Error al obtener estadísticas de Brevo:', error);
      return { success: false, error: error.message };
    }
  }
}

class WhatsAppService {
  constructor() {
    // El servicio de WhatsApp permanece igual usando Twilio
    const hasValidCredentials = 
      process.env.TWILIO_ACCOUNT_SID && 
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_ACCOUNT_SID.startsWith('AC') &&
      process.env.TWILIO_ACCOUNT_SID !== 'your_twilio_account_sid';

    if (hasValidCredentials) {
      try {
        this.client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        console.log('✅ Cliente de Twilio (WhatsApp) inicializado correctamente');
      } catch (error) {
        console.warn('⚠️ Error al inicializar Twilio:', error.message);
        this.client = null;
      }
    } else {
      console.warn('⚠️ Twilio no configurado correctamente - WhatsApp no funcionará');
      if (process.env.TWILIO_ACCOUNT_SID && !process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
        console.warn('   TWILIO_ACCOUNT_SID debe comenzar con "AC"');
      }
      this.client = null;
    }
  }

  async sendWhatsApp({ to, message }) {
    try {
      if (!process.env.NOTIFICATION_WHATSAPP_ENABLED || process.env.NOTIFICATION_WHATSAPP_ENABLED !== 'true') {
        console.log('📱 WhatsApp deshabilitado en configuración');
        return { success: false, message: 'WhatsApp deshabilitado' };
      }

      if (!this.client) {
        console.log('📱 Cliente de Twilio no disponible');
        return { success: false, message: 'Cliente de Twilio no configurado correctamente' };
      }

      const formattedTo = this.formatPhoneNumber(to);
      
      const result = await this.client.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
        to: `whatsapp:${formattedTo}`,
        body: message
      });

      console.log('✅ WhatsApp enviado:', result.sid);
      return { success: true, messageId: result.sid };
    } catch (error) {
      console.error('❌ Error al enviar WhatsApp:', error);
      return { success: false, error: error.message };
    }
  }

  formatPhoneNumber(phone) {
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 8) {
      cleaned = '502' + cleaned; // Código de Guatemala
    }
    
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }

  // Templates de WhatsApp (permanecen igual)
  generateWelcomeMessage(user) {
    return `¡Hola ${user.getFullName()}! 🏋️‍♂️

¡Bienvenido al Elite Fitness Club! Estamos emocionados de tenerte en nuestra familia fitness.

Tu cuenta ha sido creada exitosamente. ¡Nos vemos en el gym! 💪

🔗 Accede a tu cuenta: ${process.env.FRONTEND_URL || 'Visita nuestra recepción'}`;
  }

  generateMembershipExpiringMessage(user, membership) {
    const daysLeft = membership.daysUntilExpiration();
    return `⚠️ Hola ${user.getFullName()}!

Tu membresía ${membership.type === 'monthly' ? 'mensual' : 'diaria'} vence en *${daysLeft} día${daysLeft !== 1 ? 's' : ''}*.

📅 Fecha de vencimiento: ${new Date(membership.endDate).toLocaleDateString('es-ES')}

Renueva tu membresía para seguir entrenando con nosotros. ¡Te esperamos! 🏃‍♀️

💳 Renovar: ${process.env.FRONTEND_URL}/renovar-membresia`;
  }

  generateMembershipExpiredMessage(user, membership) {
    return `🚨 Hola ${user.getFullName()}!

Tu membresía ${membership.type === 'monthly' ? 'mensual' : 'diaria'} venció el *${new Date(membership.endDate).toLocaleDateString('es-ES')}*.

Renueva tu membresía hoy mismo para continuar entrenando. ¡Te extrañamos! 💙

💳 Renovar ahora: ${process.env.FRONTEND_URL}/renovar-membresia`;
  }

  generatePaymentConfirmationMessage(user, payment) {
    return `✅ ¡Pago confirmado!

Hola ${user.getFullName()}, hemos confirmado tu pago de *$${payment.amount}* por ${payment.paymentType === 'membership' ? 'membresía mensual' : 'entrada diaria'}.

📅 Fecha: ${new Date(payment.paymentDate).toLocaleDateString('es-ES')}
💳 Método: ${this.getPaymentMethodName(payment.paymentMethod)}

${payment.paymentType === 'membership' ? '🎉 ¡Tu membresía ha sido renovada!' : '💪 ¡Disfruta tu entrenamiento!'}

¡Gracias por confiar en Elite Fitness Club!`;
  }

  generatePromotionMessage(user, promotion) {
    return `🎉 ¡Oferta especial para ti!

Hola ${user.getFullName()}, tenemos una promoción increíble:

${promotion}

¡No dejes pasar esta oportunidad! 🏃‍♂️💨

Para más info visítanos o escríbenos.`;
  }

  generateMotivationalMessage(user) {
    const messages = [
      `💪 ¡Hola ${user.getFullName()}! Recuerda que cada día es una nueva oportunidad para ser mejor. ¡Te esperamos en el gym!`,
      `🏋️‍♀️ ${user.getFullName()}, tu cuerpo puede hacerlo. ¡Es tu mente la que tienes que convencer! ¡Vamos!`,
      `🔥 ¡${user.getFullName()}! El único entrenamiento malo es el que no haces. ¡Nos vemos hoy!`,
      `⭐ Hola ${user.getFullName()}, cada repetición te acerca más a tu mejor versión. ¡Sigue así!`,
      `🎯 ${user.getFullName()}, el éxito no es solo el destino, es el viaje. ¡Sigue entrenando!`,
      `💯 ¡${user.getFullName()}! Los límites están solo en tu mente. ¡Rómpelos hoy en el gym!`
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }

  getPaymentMethodName(method) {
    const methods = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      transfer: 'Transferencia',
      online: 'Pago en línea'
    };
    return methods[method] || method;
  }
}

module.exports = {
  EmailService,
  WhatsAppService
};