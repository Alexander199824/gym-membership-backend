// src/services/notificationServices.js - CORREGIDO: Gmail con nodemailer
const nodemailer = require('nodemailer');
const twilio = require('twilio');

class EmailService {
  constructor() {
    // Verificar que las credenciales de Gmail sean válidas
    const hasValidGmailConfig = 
      process.env.GMAIL_USER &&
      process.env.GMAIL_APP_PASSWORD &&
      process.env.GMAIL_USER !== 'yourEmail@email.com' && // No es placeholder
      process.env.GMAIL_APP_PASSWORD !== 'yourPassword' && // No es placeholder
      process.env.GMAIL_APP_PASSWORD.length > 10; // Validación básica de longitud

    if (hasValidGmailConfig) {
      try {
        // ✅ CORREGIDO: createTransport (no createTransporter)
        this.transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 465,
          secure: true, // true para 465, false para otros puertos
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
          },
          // Configuraciones adicionales para Gmail
          pool: true, // Pool de conexiones para mejor performance
          maxConnections: 5,
          maxMessages: 10,
          rateDelta: 1000, // 1 segundo entre emails
          rateLimit: 5 // máximo 5 emails por segundo
        });
        
        this.isConfigured = true;
        console.log('✅ Gmail Email Service inicializado correctamente');
        console.log(`   📧 Usuario configurado: ${process.env.GMAIL_USER}`);
        
        // Verificar configuración sin enviar email de prueba
        this.verifyConfiguration(false); // false = no enviar email de prueba
      } catch (error) {
        console.error('❌ Error al inicializar Gmail:', error.message);
        this.transporter = null;
        this.isConfigured = false;
      }
    } else {
      console.warn('⚠️ Gmail no configurado correctamente - Las notificaciones por email no funcionarán');
      
      // Diagnóstico detallado
      if (!process.env.GMAIL_USER) {
        console.warn('   ❌ GMAIL_USER no configurado');
      } else if (process.env.GMAIL_USER === 'yourEmail@email.com') {
        console.warn('   ❌ GMAIL_USER todavía tiene el valor placeholder');
      }
      
      if (!process.env.GMAIL_APP_PASSWORD) {
        console.warn('   ❌ GMAIL_APP_PASSWORD no configurado');
      } else if (process.env.GMAIL_APP_PASSWORD === 'yourPassword') {
        console.warn('   ❌ GMAIL_APP_PASSWORD todavía tiene el valor placeholder');
      } else if (process.env.GMAIL_APP_PASSWORD.length <= 10) {
        console.warn('   ❌ GMAIL_APP_PASSWORD parece ser demasiado corto (no es una App Password)');
      }
      
      console.warn('   💡 Configura GMAIL_USER y GMAIL_APP_PASSWORD correctamente');
      this.transporter = null;
      this.isConfigured = false;
    }
  }

  // ✅ MEJORADO: Verificar configuración de Gmail con control de email de prueba
  async verifyConfiguration(sendTestEmail = false) {
    try {
      if (!this.transporter) {
        console.warn('⚠️ No hay transporter de Gmail para verificar');
        return false;
      }

      console.log('🔍 Verificando configuración de Gmail...');
      
      // Verificar que la conexión funcione
      const isVerified = await this.transporter.verify();
      
      if (isVerified) {
        console.log('✅ Configuración de Gmail verificada exitosamente');
        console.log('   📧 SMTP Gmail conectado correctamente');
        
        // ✅ CORREGIDO: Solo enviar email de prueba si se solicita explícitamente
        if (sendTestEmail) {
          await this.sendTestEmail();
        }
        
        return true;
      } else {
        console.warn('⚠️ Error al verificar configuración de Gmail');
        this.isConfigured = false;
        return false;
      }
    } catch (error) {
      console.error('❌ Error al verificar configuración de Gmail:', error.message);
      
      // Diagnóstico específico del error
      if (error.code === 'EAUTH') {
        console.error('   🚨 Error de autenticación:');
        console.error('      - Verifica que GMAIL_USER sea correcto');
        console.error('      - Verifica que GMAIL_APP_PASSWORD sea una App Password válida');
        console.error('      - Asegúrate de que 2FA esté habilitado en Gmail');
      } else if (error.code === 'ECONNECTION') {
        console.error('   🚨 Error de conexión con Gmail SMTP');
      } else if (error.code === 'ETIMEDOUT') {
        console.error('   🚨 Timeout conectando con Gmail');
      }
      
      this.isConfigured = false;
      return false;
    }
  }

  // ✅ NUEVO: Enviar email de prueba para verificar funcionamiento
  async sendTestEmail() {
    try {
      if (!this.isConfigured || !this.transporter) {
        return { success: false, message: 'Gmail no configurado' };
      }

      const testEmail = {
        from: {
          name: process.env.GMAIL_SENDER_NAME || 'Elite Fitness Club',
          address: process.env.GMAIL_USER
        },
        to: process.env.GMAIL_USER, // Enviarse a sí mismo
        subject: '✅ Test de configuración Gmail - Elite Fitness Club',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">✅ Gmail configurado correctamente</h2>
            <p>Este es un email de prueba para verificar que la configuración de Gmail está funcionando correctamente.</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h3>📋 Información de configuración:</h3>
              <ul>
                <li><strong>Usuario:</strong> ${process.env.GMAIL_USER}</li>
                <li><strong>Servidor:</strong> smtp.gmail.com:465</li>
                <li><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</li>
                <li><strong>Sistema:</strong> Elite Fitness Club Management</li>
              </ul>
            </div>
            <p>Si recibes este email, ¡las notificaciones funcionarán correctamente! 🎉</p>
          </div>
        `,
        text: `✅ Gmail configurado correctamente para Elite Fitness Club. Email de prueba enviado el ${new Date().toLocaleString('es-ES')}`
      };

      const result = await this.transporter.sendMail(testEmail);
      console.log('✅ Email de prueba enviado exitosamente:', result.messageId);
      console.log('   📬 Revisa la bandeja de entrada de', process.env.GMAIL_USER);
      
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Error al enviar email de prueba:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendEmail({ to, subject, html, text, attachments = null }) {
    try {
      if (!process.env.NOTIFICATION_EMAIL_ENABLED || process.env.NOTIFICATION_EMAIL_ENABLED !== 'true') {
        console.log('📧 Email deshabilitado en configuración (NOTIFICATION_EMAIL_ENABLED=false)');
        return { success: false, message: 'Email deshabilitado en configuración' };
      }

      if (!this.isConfigured || !this.transporter) {
        console.warn('📧 Gmail no configurado correctamente - no se puede enviar email');
        return { success: false, message: 'Gmail no configurado correctamente' };
      }

      // Preparar el email
      const mailOptions = {
        from: {
          name: process.env.GMAIL_SENDER_NAME || 'Elite Fitness Club',
          address: process.env.GMAIL_USER
        },
        to: to,
        subject: subject,
        text: text || undefined,
        html: html || undefined,
        attachments: attachments || undefined
      };

      console.log(`📤 Enviando email a: ${to}`);
      console.log(`📄 Asunto: ${subject}`);

      // Enviar email a través de Gmail
      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email enviado exitosamente vía Gmail:', result.messageId);
      console.log(`   📧 A: ${to}`);
      console.log(`   📄 Asunto: ${subject}`);
      
      return { 
        success: true, 
        messageId: result.messageId,
        provider: 'gmail',
        response: result.response,
        to: to,
        subject: subject
      };
    } catch (error) {
      console.error('❌ Error al enviar email vía Gmail:', error);
      
      // Manejar errores específicos de Gmail/SMTP
      let errorMessage = error.message;
      let errorCode = error.code;
      
      if (error.code === 'EAUTH') {
        errorMessage = 'Error de autenticación con Gmail. Verifica las credenciales.';
        console.error('   🔑 Verifica GMAIL_USER y GMAIL_APP_PASSWORD');
      } else if (error.code === 'ECONNECTION') {
        errorMessage = 'Error de conexión con el servidor de Gmail.';
        console.error('   🌐 Problema de conectividad con smtp.gmail.com');
      } else if (error.responseCode === 550) {
        errorMessage = 'Email rechazado por el destinatario.';
        console.error('   📭 El email fue rechazado:', to);
      } else if (error.code === 'EMESSAGE') {
        errorMessage = 'Error en el contenido del mensaje.';
        console.error('   📝 Revisa el contenido del email');
      }
      
      return { 
        success: false, 
        error: errorMessage,
        errorCode: errorCode,
        provider: 'gmail',
        to: to,
        subject: subject
      };
    }
  }

  // Templates de email optimizados para Gmail (MANTIENEN EL DISEÑO ORIGINAL)
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
            <p>📧 Email: ${process.env.GMAIL_USER} | 📞 Tel: ${process.env.GYM_PHONE || 'Contacta recepción'}</p>
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
          .footer { background-color: #ecf0f1; padding: 15px; text-align: center; font-size: 12px; color: #7f8c8d; }
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
              <li>📧 Email: ${process.env.GMAIL_USER}</li>
              <li>🏢 Visítanos en recepción</li>
            </ul>
            
            <p><strong>¡Te esperamos para seguir entrenando juntos! 💪</strong></p>
          </div>
          <div class="footer">
            <p>Elite Fitness Club - Tu mejor versión te está esperando</p>
            <p>📧 ${process.env.GMAIL_USER} | 📞 ${process.env.GYM_PHONE || 'Contacta recepción'}</p>
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
          .footer { background-color: #ecf0f1; padding: 15px; text-align: center; font-size: 12px; color: #7f8c8d; }
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
          <div class="footer">
            <p>Elite Fitness Club - Tu mejor versión te está esperando</p>
            <p>📧 ${process.env.GMAIL_USER} | 📞 ${process.env.GYM_PHONE || 'Contacta recepción'}</p>
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
    console.log('📧 Generando email de confirmación de compra...');
    console.log('👤 Usuario:', user ? user.email || user.getFullName?.() || 'Usuario' : 'Invitado');
    console.log('💰 Pago:', {
      id: payment.id,
      amount: payment.amount,
      paymentType: payment.paymentType,
      paymentMethod: payment.paymentMethod
    });

    // ✅ Determinar tipo de pago para personalizar el mensaje
    let paymentTypeName = 'Compra';
    let paymentIcon = '🛍️';
    let paymentDescription = 'Tu compra';

    switch (payment.paymentType) {
      case 'membership':
        paymentTypeName = 'Membresía mensual';
        paymentIcon = '🎫';
        paymentDescription = 'Tu membresía';
        break;
      case 'daily':
        paymentTypeName = 'Entrada diaria';
        paymentIcon = '🏃‍♂️';
        paymentDescription = 'Tu entrada diaria';
        break;
      case 'store_online':
      case 'store_cash_delivery':
      case 'store_card_delivery':
        paymentTypeName = 'Productos de tienda';
        paymentIcon = '🛍️';
        paymentDescription = 'Tu compra de productos';
        break;
      default:
        paymentTypeName = 'Pago';
        paymentIcon = '💳';
        paymentDescription = 'Tu pago';
    }

    // ✅ HTML mejorado para email de confirmación
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>✅ Confirmación de compra - Elite Fitness Club</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #27ae60 0%, #229954 100%); color: #ffffff; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .success-box { background-color: #d4edda; border: 2px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .payment-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; background-color: #27ae60; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
          .footer { background-color: #ecf0f1; padding: 20px; text-align: center; font-size: 12px; color: #7f8c8d; }
          .highlight { background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107; }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header de confirmación exitosa -->
          <div class="header">
            <h1>${paymentIcon} ¡Compra confirmada!</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">
              ${paymentDescription} ha sido procesada exitosamente
            </p>
          </div>

          <!-- Contenido principal -->
          <div class="content">
            
            <!-- Mensaje de éxito -->
            <div class="success-box">
              <h2 style="color: #155724; margin: 0 0 15px 0;">
                ✅ ¡Pago confirmado exitosamente!
              </h2>
              <p style="color: #155724; margin: 0; font-size: 16px;">
                Hola <strong>${user ? (user.getFullName?.() || user.email || 'Cliente') : 'Cliente'}</strong>, 
                hemos confirmado tu pago. ¡Gracias por tu compra!
              </p>
            </div>

            <!-- Detalles del pago -->
            <div class="payment-details">
              <h3 style="color: #2c3e50; margin: 0 0 15px 0;">📋 Detalles del pago</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #495057; font-weight: bold;">💰 Monto:</td>
                  <td style="padding: 8px 0; color: #2c3e50; font-size: 18px; font-weight: bold;">$${payment.amount}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #495057; font-weight: bold;">${paymentIcon} Concepto:</td>
                  <td style="padding: 8px 0; color: #2c3e50;">${paymentTypeName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #495057; font-weight: bold;">💳 Método de pago:</td>
                  <td style="padding: 8px 0; color: #2c3e50;">${this.getPaymentMethodName(payment.paymentMethod)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #495057; font-weight: bold;">📅 Fecha:</td>
                  <td style="padding: 8px 0; color: #2c3e50;">${new Date(payment.paymentDate || new Date()).toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</td>
                </tr>
                ${payment.paymentType === 'membership' ? 
                  '<tr><td style="padding: 8px 0; color: #495057; font-weight: bold;">🔄 Estado:</td><td style="padding: 8px 0; color: #27ae60; font-weight: bold;">✅ Membresía renovada exitosamente</td></tr>' : 
                  ''}
                ${payment.cardLast4 ? 
                  `<tr><td style="padding: 8px 0; color: #495057; font-weight: bold;">💳 Tarjeta:</td><td style="padding: 8px 0; color: #2c3e50;">**** **** **** ${payment.cardLast4}</td></tr>` : 
                  ''}
                ${payment.id ? 
                  `<tr><td style="padding: 8px 0; color: #495057; font-weight: bold;">🆔 ID de pago:</td><td style="padding: 8px 0; color: #6c757d; font-size: 12px;">${payment.id}</td></tr>` : 
                  ''}
              </table>
            </div>

            <!-- Información específica según tipo de pago -->
            ${this.generateSpecificPaymentInfo(payment)}

            <!-- Próximos pasos -->
            <div class="highlight">
              <h3 style="color: #856404; margin: 0 0 10px 0;">📋 Próximos pasos</h3>
              ${this.generateNextStepsInfo(payment)}
            </div>

            <!-- Botón de acción -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || '#'}" class="button">
                🏠 Ir a mi cuenta
              </a>
            </div>

            <!-- Información de contacto -->
            <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0c5460; margin: 0 0 10px 0;">📞 ¿Necesitas ayuda?</h3>
              <p style="color: #0c5460; margin: 0;">
                Si tienes alguna pregunta sobre este pago, no dudes en contactarnos:
              </p>
              <ul style="color: #0c5460; margin: 10px 0;">
                <li>📧 Email: ${process.env.GMAIL_USER || 'info@elitefitnessclub.com'}</li>
                <li>📞 Teléfono: ${process.env.GYM_PHONE || 'Contacta recepción'}</li>
                <li>🏢 Visítanos en recepción</li>
                <li>💬 WhatsApp: Responde a este email</li>
              </ul>
            </div>

            <!-- Mensaje de agradecimiento -->
            <div style="text-align: center; margin: 30px 0;">
              <h3 style="color: #2c3e50;">🙏 ¡Gracias por confiar en Elite Fitness Club!</h3>
              <p style="color: #6c757d;">
                Estamos comprometidos en ayudarte a alcanzar tus objetivos fitness.
              </p>
            </div>

          </div>

          <!-- Footer -->
          <div class="footer">
            <p><strong>Elite Fitness Club</strong> - Tu mejor versión te está esperando</p>
            <p>📧 ${process.env.GMAIL_USER || 'info@elitefitnessclub.com'} | 📞 ${process.env.GYM_PHONE || 'Contacta recepción'}</p>
            <p>Este es un email automático de confirmación de pago. Por favor no respondas a este mensaje.</p>
            <p>© ${new Date().getFullYear()} Elite Fitness Club. Todos los derechos reservados.</p>
          </div>

        </div>
      </body>
      </html>
    `;

    // ✅ Texto plano mejorado
    const text = `✅ ¡PAGO CONFIRMADO! - Elite Fitness Club

Hola ${user ? (user.getFullName?.() || user.email || 'Cliente') : 'Cliente'},

¡Hemos confirmado tu pago exitosamente! Gracias por tu compra.

📋 DETALLES DEL PAGO:
💰 Monto: $${payment.amount}
${paymentIcon} Concepto: ${paymentTypeName}
💳 Método: ${this.getPaymentMethodName(payment.paymentMethod)}
📅 Fecha: ${new Date(payment.paymentDate || new Date()).toLocaleString('es-ES')}
${payment.cardLast4 ? `💳 Tarjeta: **** **** **** ${payment.cardLast4}` : ''}
${payment.id ? `🆔 ID: ${payment.id}` : ''}

${this.generateSpecificPaymentInfoText(payment)}

📞 CONTACTO:
📧 Email: ${process.env.GMAIL_USER || 'info@elitefitnessclub.com'}
📞 Teléfono: ${process.env.GYM_PHONE || 'Contacta recepción'}

🙏 ¡Gracias por confiar en Elite Fitness Club!

---
Elite Fitness Club - Tu mejor versión te está esperando
© ${new Date().getFullYear()} Elite Fitness Club`;

    console.log('✅ Email de confirmación generado exitosamente');

    return {
      subject: `✅ Pago confirmado - ${paymentTypeName} - Elite Fitness Club`,
      html,
      text
    };
  }

  // ✅ NUEVO: Generar información específica según tipo de pago (HTML)
  generateSpecificPaymentInfo(payment) {
    switch (payment.paymentType) {
      case 'membership':
        return `
          <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #0c5460; margin: 0 0 15px 0;">🎫 Tu membresía está activa</h3>
            <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
              <li>✅ Ya puedes acceder a todas las instalaciones</li>
              <li>🏋️‍♂️ Disfruta de todos los equipos y áreas</li>
              <li>👥 Únete a las clases grupales disponibles</li>
              <li>📱 Revisa tu membresía en tu perfil online</li>
            </ul>
          </div>
        `;
      case 'daily':
        return `
          <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #0c5460; margin: 0 0 15px 0;">🏃‍♂️ Tu entrada diaria está confirmada</h3>
            <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
              <li>✅ Puedes acceder al gimnasio hoy</li>
              <li>💪 Disfruta tu entrenamiento al máximo</li>
              <li>🔄 Considera una membresía mensual para ahorrar</li>
              <li>💡 Pregunta por nuestras promociones especiales</li>
            </ul>
          </div>
        `;
      case 'store_online':
      case 'store_cash_delivery':
      case 'store_card_delivery':
        return `
          <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #0c5460; margin: 0 0 15px 0;">🛍️ Tu pedido está siendo procesado</h3>
            <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
              <li>📦 Prepararemos tu pedido en las próximas horas</li>
              <li>📱 Te contactaremos cuando esté listo</li>
              <li>🚚 Recibirás actualizaciones del estado del envío</li>
              <li>💡 Guarda este email como comprobante</li>
            </ul>
          </div>
        `;
      default:
        return `
          <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #0c5460; margin: 0 0 15px 0;">💳 Pago procesado exitosamente</h3>
            <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
              <li>✅ Tu pago ha sido confirmado y registrado</li>
              <li>📧 Guarda este email como comprobante</li>
              <li>📞 Contacta si tienes alguna pregunta</li>
            </ul>
          </div>
        `;
    }
  }

  // ✅ NUEVO: Generar próximos pasos según tipo de pago
  generateNextStepsInfo(payment) {
    switch (payment.paymentType) {
      case 'membership':
        return `
          <div style="color: #856404;">
            <p><strong>🎯 ¡Ya puedes entrenar!</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Visita el gimnasio con tu documento de identidad</li>
              <li>Revisa los horarios de clases grupales</li>
              <li>Programa tu rutina de entrenamiento</li>
              <li>Explora todas las instalaciones disponibles</li>
            </ul>
          </div>
        `;
      case 'daily':
        return `
          <div style="color: #856404;">
            <p><strong>🏃‍♂️ ¡Disfruta tu entrenamiento de hoy!</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Presenta este comprobante en recepción</li>
              <li>Aprovecha todas las instalaciones hoy</li>
              <li>Pregunta por las clases grupales del día</li>
              <li>Considera una membresía mensual para ahorrar</li>
            </ul>
          </div>
        `;
      case 'store_online':
      case 'store_cash_delivery':
      case 'store_card_delivery':
        return `
          <div style="color: #856404;">
            <p><strong>📦 ¡Tu pedido está en proceso!</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Recibirás actualizaciones por WhatsApp/SMS</li>
              <li>Te contactaremos para coordinar la entrega</li>
              <li>Ten tu documento de identidad listo</li>
              <li>Verifica que la dirección sea correcta</li>
            </ul>
          </div>
        `;
      default:
        return `
          <div style="color: #856404;">
            <p><strong>✅ ¡Todo está listo!</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Tu pago ha sido procesado exitosamente</li>
              <li>Guarda este comprobante para tus records</li>
              <li>Contacta si tienes alguna pregunta</li>
            </ul>
          </div>
        `;
    }
  }

  // ✅ NUEVO: Generar información específica para texto plano
  generateSpecificPaymentInfoText(payment) {
    switch (payment.paymentType) {
      case 'membership':
        return `
🎫 TU MEMBRESÍA ESTÁ ACTIVA:
✅ Ya puedes acceder a todas las instalaciones
🏋️‍♂️ Disfruta de todos los equipos y áreas
👥 Únete a las clases grupales disponibles
📱 Revisa tu membresía en tu perfil online`;
      case 'daily':
        return `
🏃‍♂️ TU ENTRADA DIARIA CONFIRMADA:
    ✅ Puedes acceder al gimnasio hoy
    💪 Disfruta tu entrenamiento al máximo
    🔄 Considera una membresía mensual para ahorrar`;
          case 'store_online':
          case 'store_cash_delivery':
          case 'store_card_delivery':
            return `
    🛍️ TU PEDIDO EN PROCESO:
    📦 Prepararemos tu pedido en las próximas horas
    📱 Te contactaremos cuando esté listo
    🚚 Recibirás actualizaciones del envío`;
          default:
            return `
    💳 PAGO PROCESADO:
    ✅ Tu pago ha sido confirmado y registrado
    📧 Guarda este email como comprobante`;
        }
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

  // Método para obtener estadísticas básicas (mejorado)
  async getEmailStats() {
    try {
      if (!this.isConfigured) {
        return { success: false, message: 'Gmail no configurado' };
      }

      // Información básica del servicio
      return {
        success: true,
        stats: {
          provider: 'Gmail',
          senderEmail: process.env.GMAIL_USER,
          senderName: process.env.GMAIL_SENDER_NAME || 'Elite Fitness Club',
          configured: true,
          verified: this.isConfigured,
          host: 'smtp.gmail.com',
          port: 465,
          secure: true
        }
      };
    } catch (error) {
      console.error('Error al obtener estadísticas de Gmail:', error);
      return { success: false, error: error.message };
    }
  }

  // NUEVO: Método para enviar email con archivo adjunto
  async sendEmailWithAttachment({ to, subject, html, text, attachmentPath, attachmentName }) {
    try {
      const attachments = attachmentPath ? [{
        filename: attachmentName || 'archivo.pdf',
        path: attachmentPath
      }] : null;

      return await this.sendEmail({ to, subject, html, text, attachments });
    } catch (error) {
      console.error('Error al enviar email con adjunto:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ NUEVO: Método para probar el servicio manualmente
  async testEmailService() {
    try {
      console.log('🧪 Iniciando prueba manual del servicio de Gmail...');
      
      if (!this.isConfigured) {
        console.log('❌ No se puede probar: Gmail no configurado');
        return { success: false, message: 'Gmail no configurado' };
      }

      // Verificar conexión (con email de prueba)
      const verifyResult = await this.verifyConfiguration(true); // true = enviar email de prueba
      if (!verifyResult) {
        console.log('❌ No se puede probar: Error en verificación');
        return { success: false, message: 'Error en verificación de configuración' };
      }

      // Enviar email de prueba
      const testResult = await this.sendTestEmail();
      
      if (testResult.success) {
        console.log('✅ Prueba del servicio Gmail completada exitosamente');
        console.log('   📧 Email de prueba enviado a:', process.env.GMAIL_USER);
        console.log('   📬 Revisa tu bandeja de entrada para confirmar');
        return {
          success: true,
          message: 'Servicio Gmail funcionando correctamente',
          details: {
            messageId: testResult.messageId,
            testEmailSent: true,
            recipientEmail: process.env.GMAIL_USER
          }
        };
      } else {
        console.log('❌ Fallo en envío de email de prueba:', testResult.error);
        return {
          success: false,
          message: 'Error al enviar email de prueba',
          error: testResult.error
        };
      }
    } catch (error) {
      console.error('❌ Error en prueba del servicio Gmail:', error);
      return {
        success: false,
        message: 'Error en prueba del servicio',
        error: error.message
      };
    }
  }
}

// WhatsAppService se mantiene igual (sin cambios)
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