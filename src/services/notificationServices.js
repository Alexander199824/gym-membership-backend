// src/services/notificationServices.js - CON GOOGLE APPS SCRIPT (SIN EMOJIS)
const twilio = require('twilio');
const axios = require('axios');

class EmailService {
  constructor() {
    console.log('=====================================');
    console.log('[EMAIL] INICIALIZANDO EMAIL SERVICE - GOOGLE APPS SCRIPT');
    console.log('=====================================');
    
    const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    const appsScriptToken = process.env.GOOGLE_APPS_SCRIPT_TOKEN;
    const emailEnabled = process.env.NOTIFICATION_EMAIL_ENABLED;
    const senderEmail = process.env.GMAIL_USER;
    const senderName = process.env.GMAIL_SENDER_NAME || 'Elite Fitness Club';
    
    console.log('[INFO] VERIFICANDO CONFIGURACION:');
    console.log(`   [WEB] GOOGLE_APPS_SCRIPT_URL: ${appsScriptUrl ? '[OK] Configurado' : '[X] Faltante'}`);
    console.log(`   [KEY] GOOGLE_APPS_SCRIPT_TOKEN: ${appsScriptToken ? '[OK] Configurado' : '[X] Faltante'}`);
    console.log(`   [EMAIL] GMAIL_USER (sender): ${senderEmail ? '[OK] Configurado' : '[X] Faltante'}`);
    console.log(`   [NOTIF] NOTIFICATION_EMAIL_ENABLED: ${emailEnabled || 'true'}`);
    
    if (appsScriptUrl) {
      console.log(`   [WEB] Apps Script URL configurada`);
    }
    
    if (appsScriptToken) {
      console.log(`   [LOCK] Token length: ${appsScriptToken.length} caracteres`);
    }

    const hasValidConfig = 
      appsScriptUrl &&
      appsScriptToken &&
      senderEmail &&
      appsScriptUrl.includes('script.google.com') &&
      appsScriptUrl.includes('/exec') &&
      appsScriptToken.length > 20 &&
      senderEmail.includes('@');

    if (hasValidConfig) {
      this.appsScriptUrl = appsScriptUrl;
      this.appsScriptToken = appsScriptToken;
      this.senderEmail = senderEmail;
      this.senderName = senderName;
      this.isConfigured = true;
      
      console.log('[OK] Google Apps Script Email Service configurado correctamente');
      console.log(`   [EMAIL] Sender Email: ${senderEmail}`);
      console.log(`   [NAME] Sender Name: ${senderName}`);
      console.log(`   [WEB] Apps Script URL: ${appsScriptUrl.substring(0, 50)}...`);
      
      setTimeout(() => {
        this.verifyConfiguration(false);
      }, 1000);
      
    } else {
      console.warn('[!] Google Apps Script no configurado correctamente - Las notificaciones por email no funcionaran');
      
      if (!appsScriptUrl) {
        console.warn('   [X] GOOGLE_APPS_SCRIPT_URL no configurado en .env');
        console.warn('   [TIP] Agrega: GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_ID/exec');
      } else if (!appsScriptUrl.includes('script.google.com')) {
        console.warn('   [X] GOOGLE_APPS_SCRIPT_URL no parece ser una URL valida de Apps Script');
      } else if (!appsScriptUrl.includes('/exec')) {
        console.warn('   [X] GOOGLE_APPS_SCRIPT_URL debe terminar en /exec');
      }
      
      if (!appsScriptToken) {
        console.warn('   [X] GOOGLE_APPS_SCRIPT_TOKEN no configurado en .env');
        console.warn('   [TIP] Agrega: GOOGLE_APPS_SCRIPT_TOKEN=tu-token-generado');
      } else if (appsScriptToken.length <= 20) {
        console.warn('   [X] GOOGLE_APPS_SCRIPT_TOKEN parece ser demasiado corto');
      }
      
      if (!senderEmail) {
        console.warn('   [X] GMAIL_USER no configurado en .env');
        console.warn('   [TIP] Agrega: GMAIL_USER=tu-email@gmail.com');
      }
      
      console.warn('[EMAIL] =====================================');
      console.warn('[EMAIL] GUIA RAPIDA PARA CONFIGURAR APPS SCRIPT:');
      console.warn('[EMAIL] =====================================');
      console.warn('1. Ve a script.google.com');
      console.warn('2. Crea un nuevo proyecto con el codigo proporcionado');
      console.warn('3. Ejecuta setupScriptProperties() y copia el AUTH_TOKEN');
      console.warn('4. Despliega como Web App (Deploy > New deployment)');
      console.warn('5. Copia la URL de despliegue (termina en /exec)');
      console.warn('6. En .env: GOOGLE_APPS_SCRIPT_URL=tu-url');
      console.warn('7. En .env: GOOGLE_APPS_SCRIPT_TOKEN=tu-token');
      console.warn('8. En .env: GMAIL_USER=tu-email@gmail.com');
      console.warn('9. Reinicia el servidor');
      console.warn('[EMAIL] =====================================');
      
      this.isConfigured = false;
    }
    
    console.log('=====================================');
    console.log(`[EMAIL] EMAIL SERVICE STATUS: ${this.isConfigured ? '[OK] LISTO' : '[X] NO CONFIGURADO'}`);
    console.log('=====================================');
  }

  async verifyEmailConfiguration() {
    console.log('[INFO] =====================================');
    console.log('[INFO] VERIFICACION COMPLETA DE EMAIL SERVICE');
    console.log('[INFO] =====================================');
    
    try {
      if (!this.isConfigured) {
        console.log('[X] Email service no esta configurado');
        return false;
      }

      console.log('1. [OK] Configuracion basica: OK');
      
      console.log('2. [LINK] Verificando conexion con Apps Script...');
      const isVerified = await this.verifyConfiguration(false);
      
      if (isVerified) {
        console.log('2. [OK] Conexion con Apps Script: OK');
      } else {
        console.log('2. [X] Conexion con Apps Script: FAILED');
        return false;
      }
      
      console.log('3. [EMAIL] Email service completamente verificado');
      console.log('   [TIP] Usar .testEmailService() para enviar email de prueba');
      
      console.log('[INFO] =====================================');
      console.log('[INFO] VERIFICACION COMPLETADA: [OK] TODO OK');
      console.log('[INFO] =====================================');
      
      return true;
      
    } catch (error) {
      console.error('[X] Error en verificacion completa:', error.message);
      console.log('[INFO] =====================================');
      console.log('[INFO] VERIFICACION COMPLETADA: [X] ERRORES');
      console.log('[INFO] =====================================');
      return false;
    }
  }

  async verifyConfiguration(sendTestEmail = false) {
    try {
      if (!this.isConfigured) {
        console.warn('[!] No hay configuracion de Apps Script para verificar');
        return false;
      }

      console.log('[INFO] Verificando configuracion de Google Apps Script...');
      
      const response = await axios.get(this.appsScriptUrl, {
        timeout: 10000,
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.status === 200 && response.data) {
        console.log('[OK] Configuracion de Apps Script verificada exitosamente');
        console.log('   [WEB] Endpoint respondiendo correctamente');
        console.log('   [EMAIL] Service:', response.data.service || 'Online');
        
        if (sendTestEmail) {
          await this.sendTestEmail();
        }
        
        return true;
      } else {
        console.warn('[!] Error al verificar configuracion de Apps Script');
        this.isConfigured = false;
        return false;
      }
    } catch (error) {
      console.error('[X] Error al verificar configuracion de Apps Script:', error.message);
      
      if (error.code === 'ENOTFOUND') {
        console.error('   [!] URL de Apps Script no encontrada');
      } else if (error.code === 'ECONNREFUSED') {
        console.error('   [!] Conexion rechazada por Apps Script');
      } else if (error.response?.status === 401) {
        console.error('   [!] Error de autenticacion - verifica el token');
      } else if (error.response?.status === 403) {
        console.error('   [!] Acceso prohibido - verifica permisos del script');
      }
      
      this.isConfigured = false;
      return false;
    }
  }

  async sendTestEmail() {
    try {
      if (!this.isConfigured) {
        return { success: false, message: 'Apps Script no configurado' };
      }

      const testEmail = {
        to: this.senderEmail,
        subject: '[TEST] Google Apps Script - Elite Fitness Club',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #27ae60;">[OK] Google Apps Script configurado correctamente</h2>
            <p>Este es un email de prueba para verificar que la configuracion de Apps Script esta funcionando correctamente.</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h3>[INFO] Informacion de configuracion:</h3>
              <ul>
                <li><strong>Usuario:</strong> ${this.senderEmail}</li>
                <li><strong>Servicio:</strong> Google Apps Script</li>
                <li><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</li>
                <li><strong>Sistema:</strong> Elite Fitness Club Management</li>
              </ul>
            </div>
            <p>Si recibes este email, las notificaciones funcionaran correctamente!</p>
          </div>
        `,
        text: `[OK] Google Apps Script configurado correctamente para Elite Fitness Club. Email de prueba enviado el ${new Date().toLocaleString('es-ES')}`
      };

      const result = await this.sendEmail(testEmail);
      
      if (result.success) {
        console.log('[OK] Email de prueba enviado exitosamente');
        console.log('   [INBOX] Revisa la bandeja de entrada de', this.senderEmail);
        return result;
      } else {
        console.error('[X] Error al enviar email de prueba:', result.error);
        return result;
      }
    } catch (error) {
      console.error('[X] Error al enviar email de prueba:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendEmail({ to, subject, html, text, attachments = null }) {
    try {
      if (!process.env.NOTIFICATION_EMAIL_ENABLED || process.env.NOTIFICATION_EMAIL_ENABLED !== 'true') {
        console.log('[EMAIL] Email deshabilitado en configuracion (NOTIFICATION_EMAIL_ENABLED=false)');
        return { success: false, message: 'Email deshabilitado en configuracion' };
      }

      if (!this.isConfigured) {
        console.warn('[EMAIL] Apps Script no configurado correctamente - no se puede enviar email');
        return { success: false, message: 'Apps Script no configurado correctamente' };
      }

      console.log(`[SEND] Enviando email a: ${to}`);
      console.log(`[SUBJECT] Asunto: ${subject}`);

      const payload = {
        to: to,
        subject: subject,
        html: html,
        text: text || undefined,
        attachments: attachments || undefined
      };

      const response = await axios.post(
        `${this.appsScriptUrl}?token=${encodeURIComponent(this.appsScriptToken)}`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );

      if (response.status === 200 && response.data?.success) {
        console.log('[OK] Email enviado exitosamente via Apps Script');
        console.log(`   [TO] A: ${to}`);
        console.log(`   [SUBJECT] Asunto: ${subject}`);
        
        return {
          success: true,
          messageId: response.data.data?.messageId || 'apps-script-' + Date.now(),
          provider: 'google-apps-script',
          to: to,
          subject: subject,
          timestamp: response.data.timestamp
        };
      } else {
        const errorMsg = response.data?.message || 'Error desconocido';
        console.error('[X] Error al enviar email:', errorMsg);
        
        return {
          success: false,
          error: errorMsg,
          provider: 'google-apps-script',
          to: to,
          subject: subject
        };
      }

    } catch (error) {
      console.error('[X] Error al enviar email via Apps Script:', error.message);
      
      let errorMessage = error.message;
      
      if (error.code === 'ECONNREFUSED') {
        errorMessage = 'No se pudo conectar con Apps Script. Verifica la URL.';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Timeout al conectar con Apps Script.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Token de autenticacion invalido.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.message || 'Datos del email invalidos.';
      }
      
      return {
        success: false,
        error: errorMessage,
        provider: 'google-apps-script',
        to: to,
        subject: subject
      };
    }
  }

  async testEmailService() {
    try {
      console.log('[TEST] Iniciando prueba manual del servicio de Apps Script...');
      
      if (!this.isConfigured) {
        console.log('[X] No se puede probar: Apps Script no configurado');
        return { success: false, message: 'Apps Script no configurado' };
      }

      const verifyResult = await this.verifyConfiguration(false);
      if (!verifyResult) {
        console.log('[X] No se puede probar: Error en verificacion');
        return { success: false, message: 'Error en verificacion de configuracion' };
      }

      const testResult = await this.sendTestEmail();
      
      if (testResult.success) {
        console.log('[OK] Prueba del servicio Apps Script completada exitosamente');
        return {
          success: true,
          message: 'Servicio Apps Script funcionando correctamente',
          details: testResult
        };
      } else {
        console.log('[X] Fallo en envio de email de prueba:', testResult.error);
        return testResult;
      }
    } catch (error) {
      console.error('[X] Error en prueba del servicio:', error);
      return {
        success: false,
        message: 'Error en prueba del servicio',
        error: error.message
      };
    }
  }

  async getEmailStats() {
    try {
      if (!this.isConfigured) {
        return { success: false, message: 'Apps Script no configurado' };
      }

      return {
        success: true,
        stats: {
          provider: 'Google Apps Script',
          senderEmail: this.senderEmail,
          senderName: this.senderName,
          configured: true,
          verified: this.isConfigured,
          endpoint: this.appsScriptUrl.substring(0, 50) + '...'
        }
      };
    } catch (error) {
      console.error('Error al obtener estadisticas:', error);
      return { success: false, error: error.message };
    }
  }

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

  generateWelcomeEmail(user) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenido al Gimnasio</title>
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
            <h1>Bienvenido a Elite Fitness Club</h1>
          </div>
          <div class="content">
            <h2>Hola ${user.getFullName()}!</h2>
            <p>Bienvenido a nuestra familia fitness! Estamos emocionados de tenerte con nosotros en este increible viaje hacia una vida mas saludable.</p>
            
            <div class="highlight">
              <h3>[OK] Tu cuenta ha sido creada exitosamente</h3>
              <p>Ahora puedes disfrutar de todos nuestros servicios:</p>
              <ul>
                <li>Ver el estado de tu membresia en tiempo real</li>
                <li>Programar y gestionar tus horarios de entrenamiento</li>
                <li>Recibir recordatorios automaticos de vencimiento</li>
                <li>Acceder a nuestra tienda de productos fitness</li>
                <li>Gestionar tus pagos de forma segura</li>
              </ul>
            </div>

            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || '#'}" class="button">Acceder a Mi Cuenta</a>
            </p>
            
            <p>Si tienes alguna pregunta, no dudes en contactarnos. Estamos aqui para ayudarte a alcanzar tus objetivos!</p>
            
            <p style="margin-top: 30px;"><strong>Nos vemos en el gym!</strong></p>
          </div>
          <div class="footer">
            <p>Este es un mensaje automatico de Elite Fitness Club</p>
            <p>Email: ${this.senderEmail} | Tel: ${process.env.GYM_PHONE || 'Contacta recepcion'}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return {
      subject: 'Bienvenido a Elite Fitness Club',
      html,
      text: `Bienvenido ${user.getFullName()}! Tu cuenta en Elite Fitness Club ha sido creada exitosamente. Nos vemos en el gym!`
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
        <title>Tu membresia esta por vencer</title>
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
            <h1>[ALERTA] Tu membresia esta por vencer</h1>
          </div>
          <div class="content">
            <h2>Hola ${user.getFullName()}!</h2>
            
            <div class="alert-box">
              <h3>[!] Atencion: Tu membresia ${membership.type === 'monthly' ? 'mensual' : 'diaria'} vence en <strong>${daysLeft} dia${daysLeft !== 1 ? 's' : ''}</strong></h3>
            </div>
            
            <div class="info-box">
              <p><strong>Fecha de vencimiento:</strong> ${new Date(membership.endDate).toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
              <p><strong>Precio actual:</strong> $${membership.price}</p>
              <p><strong>Tipo de membresia:</strong> ${membership.type === 'monthly' ? 'Mensual' : 'Diaria'}</p>
            </div>
            
            <p>Para continuar disfrutando de nuestras instalaciones y servicios sin interrupciones, renueva tu membresia antes de la fecha de vencimiento.</p>
            
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/renovar-membresia?id=${membership.id}" class="button">Renovar Membresia Ahora</a>
            </p>
            
            <p>Necesitas ayuda? Contactanos:</p>
            <ul>
              <li>Telefono: ${process.env.GYM_PHONE || 'Contacta recepcion'}</li>
              <li>Email: ${this.senderEmail}</li>
              <li>Visitanos en recepcion</li>
            </ul>
            
            <p><strong>Te esperamos para seguir entrenando juntos!</strong></p>
          </div>
          <div class="footer">
            <p>Elite Fitness Club - Tu mejor version te esta esperando</p>
            <p>${this.senderEmail} | ${process.env.GYM_PHONE || 'Contacta recepcion'}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return {
      subject: `[ALERTA] Tu membresia vence en ${daysLeft} dia${daysLeft !== 1 ? 's' : ''} - Renueva ahora`,
      html,
      text: `Hola ${user.getFullName()}, tu membresia vence en ${daysLeft} dias (${new Date(membership.endDate).toLocaleDateString('es-ES')}). Renueva para continuar entrenando con nosotros.`
    };
  }

  generateMembershipExpiredEmail(user, membership) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tu membresia ha vencido</title>
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
            <h1>[VENCIDO] Tu membresia ha vencido</h1>
          </div>
          <div class="content">
            <h2>Hola ${user.getFullName()}!</h2>
            
            <div class="expired-box">
              <h3>Tu membresia ${membership.type === 'monthly' ? 'mensual' : 'diaria'} vencio el <strong>${new Date(membership.endDate).toLocaleDateString('es-ES')}</strong></h3>
            </div>
            
            <p>Sabemos que el fitness es importante para ti, y queremos que regreses a entrenar lo antes posible.</p>
            
            <div class="comeback-box">
              <h3>Por que renovar ahora?</h3>
              <ul>
                <li>Manten tu rutina de ejercicios sin interrupciones</li>
                <li>No pierdas el progreso que has logrado</li>
                <li>Sigue siendo parte de nuestra comunidad fitness</li>
                <li>Accede a nuevos equipos y clases</li>
              </ul>
            </div>
            
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/renovar-membresia?id=${membership.id}" class="button">Renovar Ahora</a>
            </p>
            
            <p>Si tienes alguna pregunta o necesitas ayuda con tu renovacion, no dudes en contactarnos. Estamos aqui para apoyarte!</p>
            
            <p><strong>Te extrañamos y esperamos verte pronto de vuelta!</strong></p>
          </div>
          <div class="footer">
            <p>Elite Fitness Club - Tu mejor version te esta esperando</p>
            <p>${this.senderEmail} | ${process.env.GYM_PHONE || 'Contacta recepcion'}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return {
      subject: '[VENCIDO] Tu membresia ha vencido - Te extrañamos',
      html,
      text: `Hola ${user.getFullName()}, tu membresia vencio el ${new Date(membership.endDate).toLocaleDateString('es-ES')}. Renueva para continuar entrenando. Te extrañamos!`
    };
  }

  generatePaymentConfirmationEmail(user, payment) {
    console.log('[EMAIL] Generando email de confirmacion de compra...');
    console.log('[USER] Usuario:', user ? user.email || user.getFullName?.() || 'Usuario' : 'Invitado');
    console.log('[PAY] Pago:', {
      id: payment.id,
      amount: payment.amount,
      paymentType: payment.paymentType,
      paymentMethod: payment.paymentMethod
    });

    let paymentTypeName = 'Compra';
    let paymentDescription = 'Tu compra';

    switch (payment.paymentType) {
      case 'membership':
        paymentTypeName = 'Membresia mensual';
        paymentDescription = 'Tu membresia';
        break;
      case 'daily':
        paymentTypeName = 'Entrada diaria';
        paymentDescription = 'Tu entrada diaria';
        break;
      case 'store_online':
      case 'store_cash_delivery':
      case 'store_card_delivery':
        paymentTypeName = 'Productos de tienda';
        paymentDescription = 'Tu compra de productos';
        break;
      default:
        paymentTypeName = 'Pago';
        paymentDescription = 'Tu pago';
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmacion de compra - Elite Fitness Club</title>
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
          <div class="header">
            <h1>[OK] Compra confirmada</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">
              ${paymentDescription} ha sido procesada exitosamente
            </p>
          </div>
          <div class="content">
            <div class="success-box">
              <h2 style="color: #155724; margin: 0 0 15px 0;">
                [OK] Pago confirmado exitosamente
              </h2>
              <p style="color: #155724; margin: 0; font-size: 16px;">
                Hola <strong>${user ? (user.getFullName?.() || user.email || 'Cliente') : 'Cliente'}</strong>, 
                hemos confirmado tu pago. Gracias por tu compra!
              </p>
            </div>
            <div class="payment-details">
              <h3 style="color: #2c3e50; margin: 0 0 15px 0;">Detalles del pago</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #495057; font-weight: bold;">Monto:</td>
                  <td style="padding: 8px 0; color: #2c3e50; font-size: 18px; font-weight: bold;">$${payment.amount}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #495057; font-weight: bold;">Concepto:</td>
                  <td style="padding: 8px 0; color: #2c3e50;">${paymentTypeName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #495057; font-weight: bold;">Metodo de pago:</td>
                  <td style="padding: 8px 0; color: #2c3e50;">${this.getPaymentMethodName(payment.paymentMethod)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #495057; font-weight: bold;">Fecha:</td>
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
                  '<tr><td style="padding: 8px 0; color: #495057; font-weight: bold;">Estado:</td><td style="padding: 8px 0; color: #27ae60; font-weight: bold;">[OK] Membresia renovada exitosamente</td></tr>' : 
                  ''}
                ${payment.cardLast4 ? 
                  `<tr><td style="padding: 8px 0; color: #495057; font-weight: bold;">Tarjeta:</td><td style="padding: 8px 0; color: #2c3e50;">**** **** **** ${payment.cardLast4}</td></tr>` : 
                  ''}
                ${payment.id ? 
                  `<tr><td style="padding: 8px 0; color: #495057; font-weight: bold;">ID de pago:</td><td style="padding: 8px 0; color: #6c757d; font-size: 12px;">${payment.id}</td></tr>` : 
                  ''}
              </table>
            </div>

            ${this.generateSpecificPaymentInfo(payment)}

            <div class="highlight">
              <h3 style="color: #856404; margin: 0 0 10px 0;">Proximos pasos</h3>
              ${this.generateNextStepsInfo(payment)}
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || '#'}" class="button">
                Ir a mi cuenta
              </a>
            </div>

            <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0c5460; margin: 0 0 10px 0;">Necesitas ayuda?</h3>
              <p style="color: #0c5460; margin: 0;">
                Si tienes alguna pregunta sobre este pago, no dudes en contactarnos:
              </p>
              <ul style="color: #0c5460; margin: 10px 0;">
                <li>Email: ${this.senderEmail || 'info@elitefitnessclub.com'}</li>
                <li>Telefono: ${process.env.GYM_PHONE || 'Contacta recepcion'}</li>
                <li>Visitanos en recepcion</li>
                <li>WhatsApp: Responde a este email</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <h3 style="color: #2c3e50;">Gracias por confiar en Elite Fitness Club!</h3>
              <p style="color: #6c757d;">
                Estamos comprometidos en ayudarte a alcanzar tus objetivos fitness.
              </p>
            </div>

          </div>

          <div class="footer">
            <p><strong>Elite Fitness Club</strong> - Tu mejor version te esta esperando</p>
            <p>${this.senderEmail || 'info@elitefitnessclub.com'} | ${process.env.GYM_PHONE || 'Contacta recepcion'}</p>
            <p>Este es un email automatico de confirmacion de pago. Por favor no respondas a este mensaje.</p>
            <p>Copyright ${new Date().getFullYear()} Elite Fitness Club. Todos los derechos reservados.</p>
          </div>

        </div>
      </body>
      </html>
    `;

    const text = `[OK] PAGO CONFIRMADO - Elite Fitness Club

Hola ${user ? (user.getFullName?.() || user.email || 'Cliente') : 'Cliente'},

Hemos confirmado tu pago exitosamente! Gracias por tu compra.

DETALLES DEL PAGO:
Monto: $${payment.amount}
Concepto: ${paymentTypeName}
Metodo: ${this.getPaymentMethodName(payment.paymentMethod)}
Fecha: ${new Date(payment.paymentDate || new Date()).toLocaleString('es-ES')}
${payment.cardLast4 ? `Tarjeta: **** **** **** ${payment.cardLast4}` : ''}
${payment.id ? `ID: ${payment.id}` : ''}

${this.generateSpecificPaymentInfoText(payment)}

CONTACTO:
Email: ${this.senderEmail || 'info@elitefitnessclub.com'}
Telefono: ${process.env.GYM_PHONE || 'Contacta recepcion'}

Gracias por confiar en Elite Fitness Club!

---
Elite Fitness Club - Tu mejor version te esta esperando
Copyright ${new Date().getFullYear()} Elite Fitness Club`;

    console.log('[OK] Email de confirmacion generado exitosamente');

    return {
      subject: `[OK] Pago confirmado - ${paymentTypeName} - Elite Fitness Club`,
      html,
      text
    };
  }

  generateSpecificPaymentInfo(payment) {
    switch (payment.paymentType) {
      case 'membership':
        return `
          <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #0c5460; margin: 0 0 15px 0;">Tu membresia esta activa</h3>
            <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
              <li>[OK] Ya puedes acceder a todas las instalaciones</li>
              <li>Disfruta de todos los equipos y areas</li>
              <li>Unete a las clases grupales disponibles</li>
              <li>Revisa tu membresia en tu perfil online</li>
            </ul>
          </div>
        `;
      case 'daily':
        return `
          <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #0c5460; margin: 0 0 15px 0;">Tu entrada diaria esta confirmada</h3>
            <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
              <li>[OK] Puedes acceder al gimnasio hoy</li>
              <li>Disfruta tu entrenamiento al maximo</li>
              <li>Considera una membresia mensual para ahorrar</li>
              <li>Pregunta por nuestras promociones especiales</li>
            </ul>
          </div>
        `;
      case 'store_online':
      case 'store_cash_delivery':
      case 'store_card_delivery':
        return `
          <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #0c5460; margin: 0 0 15px 0;">Tu pedido esta siendo procesado</h3>
            <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
              <li>Prepararemos tu pedido en las proximas horas</li>
              <li>Te contactaremos cuando este listo</li>
              <li>Recibiras actualizaciones del estado del envio</li>
              <li>Guarda este email como comprobante</li>
            </ul>
          </div>
        `;
      default:
        return `
          <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #0c5460; margin: 0 0 15px 0;">Pago procesado exitosamente</h3>
            <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
              <li>[OK] Tu pago ha sido confirmado y registrado</li>
              <li>Guarda este email como comprobante</li>
              <li>Contacta si tienes alguna pregunta</li>
            </ul>
          </div>
        `;
    }
  }

  generateNextStepsInfo(payment) {
    switch (payment.paymentType) {
      case 'membership':
        return `
          <div style="color: #856404;">
            <p><strong>Ya puedes entrenar!</strong></p>
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
            <p><strong>Disfruta tu entrenamiento de hoy!</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Presenta este comprobante en recepcion</li>
              <li>Aprovecha todas las instalaciones hoy</li>
              <li>Pregunta por las clases grupales del dia</li>
              <li>Considera una membresia mensual para ahorrar</li>
            </ul>
          </div>
        `;
      case 'store_online':
      case 'store_cash_delivery':
      case 'store_card_delivery':
        return `
          <div style="color: #856404;">
            <p><strong>Tu pedido esta en proceso!</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Recibiras actualizaciones por WhatsApp/SMS</li>
              <li>Te contactaremos para coordinar la entrega</li>
              <li>Ten tu documento de identidad listo</li>
              <li>Verifica que la direccion sea correcta</li>
            </ul>
          </div>
        `;
      default:
        return `
          <div style="color: #856404;">
            <p><strong>[OK] Todo esta listo!</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Tu pago ha sido procesado exitosamente</li>
              <li>Guarda este comprobante para tus records</li>
              <li>Contacta si tienes alguna pregunta</li>
            </ul>
          </div>
        `;
    }
  }

  generateSpecificPaymentInfoText(payment) {
    switch (payment.paymentType) {
      case 'membership':
        return `
TU MEMBRESIA ESTA ACTIVA:
[OK] Ya puedes acceder a todas las instalaciones
Disfruta de todos los equipos y areas
Unete a las clases grupales disponibles
Revisa tu membresia en tu perfil online`;
      case 'daily':
        return `
TU ENTRADA DIARIA CONFIRMADA:
[OK] Puedes acceder al gimnasio hoy
Disfruta tu entrenamiento al maximo
Considera una membresia mensual para ahorrar`;
      case 'store_online':
      case 'store_cash_delivery':
      case 'store_card_delivery':
        return `
TU PEDIDO EN PROCESO:
Prepararemos tu pedido en las proximas horas
Te contactaremos cuando este listo
Recibiras actualizaciones del envio`;
      default:
        return `
PAGO PROCESADO:
[OK] Tu pago ha sido confirmado y registrado
Guarda este email como comprobante`;
    }
  }

  getPaymentMethodName(method) {
    const methods = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      transfer: 'Transferencia bancaria',
      online: 'Pago en linea'
    };
    return methods[method] || method;
  }
}

class WhatsAppService {
  constructor() {
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
        console.log('[OK] Cliente de Twilio (WhatsApp) inicializado correctamente');
      } catch (error) {
        console.warn('[!] Error al inicializar Twilio:', error.message);
        this.client = null;
      }
    } else {
      console.warn('[!] Twilio no configurado correctamente - WhatsApp no funcionara');
      if (process.env.TWILIO_ACCOUNT_SID && !process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
        console.warn('   TWILIO_ACCOUNT_SID debe comenzar con "AC"');
      }
      this.client = null;
    }
  }

  async sendWhatsApp({ to, message }) {
    try {
      if (!process.env.NOTIFICATION_WHATSAPP_ENABLED || process.env.NOTIFICATION_WHATSAPP_ENABLED !== 'true') {
        console.log('[WA] WhatsApp deshabilitado en configuracion');
        return { success: false, message: 'WhatsApp deshabilitado' };
      }

      if (!this.client) {
        console.log('[WA] Cliente de Twilio no disponible');
        return { success: false, message: 'Cliente de Twilio no configurado correctamente' };
      }

      const formattedTo = this.formatPhoneNumber(to);
      
      const result = await this.client.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
        to: `whatsapp:${formattedTo}`,
        body: message
      });

      console.log('[OK] WhatsApp enviado:', result.sid);
      return { success: true, messageId: result.sid };
    } catch (error) {
      console.error('[X] Error al enviar WhatsApp:', error);
      return { success: false, error: error.message };
    }
  }

  formatPhoneNumber(phone) {
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 8) {
      cleaned = '502' + cleaned;
    }
    
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }

  generateWelcomeMessage(user) {
    return `Hola ${user.getFullName()}!

Bienvenido al Elite Fitness Club! Estamos emocionados de tenerte en nuestra familia fitness.

Tu cuenta ha sido creada exitosamente. Nos vemos en el gym!

Accede a tu cuenta: ${process.env.FRONTEND_URL || 'Visita nuestra recepcion'}`;
  }

  generateMembershipExpiringMessage(user, membership) {
    const daysLeft = membership.daysUntilExpiration();
    return `[ALERTA] Hola ${user.getFullName()}!

Tu membresia ${membership.type === 'monthly' ? 'mensual' : 'diaria'} vence en *${daysLeft} dia${daysLeft !== 1 ? 's' : ''}*.

Fecha de vencimiento: ${new Date(membership.endDate).toLocaleDateString('es-ES')}

Renueva tu membresia para seguir entrenando con nosotros. Te esperamos!

Renovar: ${process.env.FRONTEND_URL}/renovar-membresia`;
  }

  generateMembershipExpiredMessage(user, membership) {
    return `[VENCIDO] Hola ${user.getFullName()}!

Tu membresia ${membership.type === 'monthly' ? 'mensual' : 'diaria'} vencio el *${new Date(membership.endDate).toLocaleDateString('es-ES')}*.

Renueva tu membresia hoy mismo para continuar entrenando. Te extrañamos!

Renovar ahora: ${process.env.FRONTEND_URL}/renovar-membresia`;
  }

  generatePaymentConfirmationMessage(user, payment) {
    return `[OK] Pago confirmado!

Hola ${user.getFullName()}, hemos confirmado tu pago de *$${payment.amount}* por ${payment.paymentType === 'membership' ? 'membresia mensual' : 'entrada diaria'}.

Fecha: ${new Date(payment.paymentDate).toLocaleDateString('es-ES')}
Metodo: ${this.getPaymentMethodName(payment.paymentMethod)}

${payment.paymentType === 'membership' ? '[OK] Tu membresia ha sido renovada!' : 'Disfruta tu entrenamiento!'}

Gracias por confiar en Elite Fitness Club!`;
  }

  generatePromotionMessage(user, promotion) {
    return `[PROMO] Oferta especial para ti!

Hola ${user.getFullName()}, tenemos una promocion increible:

${promotion}

No dejes pasar esta oportunidad!

Para mas info visitanos o escribenos.`;
  }

  generateMotivationalMessage(user) {
    const messages = [
      `Hola ${user.getFullName()}! Recuerda que cada dia es una nueva oportunidad para ser mejor. Te esperamos en el gym!`,
      `${user.getFullName()}, tu cuerpo puede hacerlo. Es tu mente la que tienes que convencer! Vamos!`,
      `${user.getFullName()}! El unico entrenamiento malo es el que no haces. Nos vemos hoy!`,
      `Hola ${user.getFullName()}, cada repeticion te acerca mas a tu mejor version. Sigue asi!`,
      `${user.getFullName()}, el exito no es solo el destino, es el viaje. Sigue entrenando!`,
      `${user.getFullName()}! Los limites estan solo en tu mente. Rompelos hoy en el gym!`
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }

  getPaymentMethodName(method) {
    const methods = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      transfer: 'Transferencia',
      online: 'Pago en linea'
    };
    return methods[method] || method;
  }
}

module.exports = {
  EmailService,
  WhatsAppService
};