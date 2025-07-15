// src/services/notificationServices.js
const nodemailer = require('nodemailer');
const twilio = require('twilio');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({ // CORREGIDO: createTransport (sin 'er')
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendEmail({ to, subject, html, text }) {
    try {
      if (!process.env.NOTIFICATION_EMAIL_ENABLED || process.env.NOTIFICATION_EMAIL_ENABLED !== 'true') {
        console.log('📧 Email deshabilitado en configuración');
        return { success: false, message: 'Email deshabilitado' };
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html,
        text
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email enviado:', result.messageId);
      
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Error al enviar email:', error);
      return { success: false, error: error.message };
    }
  }

  // Templates de email
  generateWelcomeEmail(user) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">¡Bienvenido al Gimnasio!</h2>
        <p>Hola <strong>${user.getFullName()}</strong>,</p>
        <p>¡Bienvenido a nuestra familia fitness! Estamos emocionados de tenerte con nosotros.</p>
        <p>Tu cuenta ha sido creada exitosamente. Ahora puedes:</p>
        <ul>
          <li>Ver el estado de tu membresía</li>
          <li>Programar tus horarios</li>
          <li>Recibir recordatorios de vencimiento</li>
        </ul>
        <p style="margin-top: 30px;">¡Nos vemos en el gym!</p>
        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #7f8c8d;">
          Este es un mensaje automático, por favor no responder a este email.
        </p>
      </div>
    `;
    
    return {
      subject: '¡Bienvenido al Gimnasio!',
      html,
      text: `¡Bienvenido ${user.getFullName()}! Tu cuenta ha sido creada exitosamente.`
    };
  }

  generateMembershipExpiringEmail(user, membership) {
    const daysLeft = membership.daysUntilExpiration();
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">⚠️ Tu membresía está por vencer</h2>
        <p>Hola <strong>${user.getFullName()}</strong>,</p>
        <p>Tu membresía ${membership.type === 'monthly' ? 'mensual' : 'diaria'} vence en <strong>${daysLeft} día${daysLeft !== 1 ? 's' : ''}</strong>.</p>
        <p><strong>Fecha de vencimiento:</strong> ${new Date(membership.endDate).toLocaleDateString('es-ES')}</p>
        <p>Para continuar disfrutando de nuestras instalaciones, renueva tu membresía antes de la fecha de vencimiento.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/renovar-membresia" 
             style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">
            Renovar Membresía
          </a>
        </div>
        <p>¡Te esperamos!</p>
      </div>
    `;
    
    return {
      subject: `⚠️ Tu membresía vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`,
      html,
      text: `Tu membresía vence en ${daysLeft} días. Renueva antes del ${new Date(membership.endDate).toLocaleDateString('es-ES')}.`
    };
  }

  generateMembershipExpiredEmail(user, membership) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">🚨 Tu membresía ha vencido</h2>
        <p>Hola <strong>${user.getFullName()}</strong>,</p>
        <p>Tu membresía ${membership.type === 'monthly' ? 'mensual' : 'diaria'} venció el <strong>${new Date(membership.endDate).toLocaleDateString('es-ES')}</strong>.</p>
        <p>Para continuar usando nuestras instalaciones, renueva tu membresía hoy mismo.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/renovar-membresia" 
             style="background-color: #e74c3c; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">
            Renovar Ahora
          </a>
        </div>
        <p>¡Te esperamos de vuelta!</p>
      </div>
    `;
    
    return {
      subject: '🚨 Tu membresía ha vencido - Renueva ahora',
      html,
      text: `Tu membresía venció el ${new Date(membership.endDate).toLocaleDateString('es-ES')}. Renueva para continuar.`
    };
  }

  generatePaymentConfirmationEmail(user, payment) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">✅ Pago confirmado</h2>
        <p>Hola <strong>${user.getFullName()}</strong>,</p>
        <p>Hemos confirmado tu pago de <strong>$${payment.amount}</strong> por ${payment.paymentType === 'membership' ? 'membresía mensual' : 'entrada diaria'}.</p>
        <p><strong>Método de pago:</strong> ${this.getPaymentMethodName(payment.paymentMethod)}</p>
        <p><strong>Fecha:</strong> ${new Date(payment.paymentDate).toLocaleDateString('es-ES')}</p>
        ${payment.paymentType === 'membership' ? '<p>Tu membresía ha sido renovada exitosamente.</p>' : ''}
        <p>¡Gracias por confiar en nosotros!</p>
      </div>
    `;
    
    return {
      subject: '✅ Pago confirmado - Gracias',
      html,
      text: `Pago confirmado: $${payment.amount} por ${payment.paymentType === 'membership' ? 'membresía' : 'entrada diaria'}.`
    };
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

class WhatsAppService {
  constructor() {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    } else {
      console.warn('⚠️ Twilio no configurado - WhatsApp no funcionará');
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
        console.log('📱 Cliente de Twilio no configurado');
        return { success: false, message: 'Cliente de Twilio no configurado' };
      }

      // Formatear número de teléfono
      const formattedTo = this.formatPhoneNumber(to);
      
      const result = await this.client.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM,
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
    // Remover espacios y caracteres especiales
    let cleaned = phone.replace(/\D/g, '');
    
    // Si no tiene código de país, asumir Guatemala (+502)
    if (cleaned.length === 8) {
      cleaned = '502' + cleaned;
    }
    
    // Agregar + si no lo tiene
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }

  // Templates de WhatsApp
  generateWelcomeMessage(user) {
    return `¡Hola ${user.getFullName()}! 🏋️‍♂️

¡Bienvenido al gimnasio! Estamos emocionados de tenerte en nuestra familia fitness.

Tu cuenta ha sido creada exitosamente. ¡Nos vemos en el gym! 💪`;
  }

  generateMembershipExpiringMessage(user, membership) {
    const daysLeft = membership.daysUntilExpiration();
    return `⚠️ Hola ${user.getFullName()}!

Tu membresía ${membership.type === 'monthly' ? 'mensual' : 'diaria'} vence en *${daysLeft} día${daysLeft !== 1 ? 's' : ''}*.

📅 Fecha de vencimiento: ${new Date(membership.endDate).toLocaleDateString('es-ES')}

Renueva tu membresía para seguir entrenando con nosotros. ¡Te esperamos! 🏃‍♀️`;
  }

  generateMembershipExpiredMessage(user, membership) {
    return `🚨 Hola ${user.getFullName()}!

Tu membresía ${membership.type === 'monthly' ? 'mensual' : 'diaria'} venció el *${new Date(membership.endDate).toLocaleDateString('es-ES')}*.

Renueva tu membresía hoy mismo para continuar entrenando. ¡Te extrañamos! 💙`;
  }

  generatePaymentConfirmationMessage(user, payment) {
    return `✅ ¡Pago confirmado!

Hola ${user.getFullName()}, hemos confirmado tu pago de *$${payment.amount}* por ${payment.paymentType === 'membership' ? 'membresía mensual' : 'entrada diaria'}.

${payment.paymentType === 'membership' ? '¡Tu membresía ha sido renovada! 🎉' : '¡Disfruta tu entrenamiento! 💪'}

¡Gracias por confiar en nosotros!`;
  }

  generatePromotionMessage(user, promotion) {
    return `🎉 ¡Oferta especial para ti!

Hola ${user.getFullName()}, tenemos una promoción increíble:

${promotion}

¡No dejes pasar esta oportunidad! 🏃‍♂️💨`;
  }

  generateMotivationalMessage(user) {
    const messages = [
      `💪 ¡Hola ${user.getFullName()}! Recuerda que cada día es una nueva oportunidad para ser mejor. ¡Te esperamos en el gym!`,
      `🏋️‍♀️ ${user.getFullName()}, tu cuerpo puede hacerlo. ¡Es tu mente la que tienes que convencer! ¡Vamos!`,
      `🔥 ¡${user.getFullName()}! El único entrenamiento malo es el que no haces. ¡Nos vemos hoy!`,
      `⭐ Hola ${user.getFullName()}, cada repetición te acerca más a tu mejor versión. ¡Sigue así!`
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }
}

module.exports = {
  EmailService,
  WhatsAppService
};