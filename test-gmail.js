// test-gmail.js - Script avanzado para diagnosticar y resolver problemas de Gmail
require('dotenv').config();
const { EmailService } = require('./src/services/notificationServices');

// Lista de emails de prueba (incluye alternativas)
const TEST_EMAILS = [
  'mismaleje@miumg.edu.gt',
  'echeverriaalexander884@gmail.com',
  'alexander.echeverria884@gmail.com',
  // Agregar emails alternativos si tienes
];

async function validateEmailAddress(email) {
  console.log(`🔍 Validando dirección: ${email}`);
  
  // Validación básica de formato
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.log(`❌ Formato de email inválido: ${email}`);
    return false;
  }
  
  // Verificar dominio
  const domain = email.split('@')[1];
  if (!domain) {
    console.log(`❌ Dominio no encontrado en: ${email}`);
    return false;
  }
  
  console.log(`✅ Formato válido para: ${email}`);
  console.log(`🌐 Dominio: ${domain}`);
  
  return true;
}

async function testSMTPConnection(emailService) {
  console.log('\n🔗 Probando conexión SMTP...');
  
  try {
    // Intentar verificar la conexión SMTP directamente
    const transporter = emailService.getTransporter ? emailService.getTransporter() : null;
    
    if (transporter && transporter.verify) {
      const isConnected = await transporter.verify();
      if (isConnected) {
        console.log('✅ Conexión SMTP exitosa');
        return true;
      } else {
        console.log('❌ Fallo en verificación SMTP');
        return false;
      }
    } else {
      console.log('⚠️ No se puede verificar conexión directamente');
      return null;
    }
  } catch (error) {
    console.log(`❌ Error en conexión SMTP: ${error.message}`);
    return false;
  }
}

async function testMultipleEmails(emailService, emails) {
  console.log('\n📧 Probando múltiples direcciones de email...');
  
  const results = [];
  
  for (const email of emails) {
    console.log(`\n🎯 Probando: ${email}`);
    
    // Validar formato primero
    const isValid = await validateEmailAddress(email);
    if (!isValid) {
      results.push({ email, success: false, error: 'Formato inválido' });
      continue;
    }
    
    try {
      // Enviar email de prueba simple
      const result = await emailService.sendEmail({
        to: email,
        subject: '🧪 Prueba Simple - Elite Fitness Club',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
            <div style="background-color: white; padding: 20px; border-radius: 10px; max-width: 500px; margin: 0 auto;">
              <h2 style="color: #2c3e50;">🧪 Prueba de Email Simple</h2>
              <p>Este es un email de prueba enviado a: <strong>${email}</strong></p>
              <p>📅 Fecha: ${new Date().toLocaleString('es-ES')}</p>
              <p>🏢 Sistema: Elite Fitness Club</p>
              <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p style="margin: 0; color: #155724;">
                  ✅ <strong>¡Gmail funciona correctamente!</strong><br>
                  Si recibes este email, el sistema está operativo.
                </p>
              </div>
              <p style="font-size: 12px; color: #6c757d;">
                Enviado desde: ${process.env.GMAIL_USER}<br>
                Servidor: smtp.gmail.com
              </p>
            </div>
          </div>
        `,
        text: `🧪 Prueba Simple - Elite Fitness Club
        
Email de prueba enviado a: ${email}
Fecha: ${new Date().toLocaleString('es-ES')}
Sistema: Elite Fitness Club

✅ ¡Gmail funciona correctamente!
Si recibes este email, el sistema está operativo.

Enviado desde: ${process.env.GMAIL_USER}`
      });
      
      if (result && result.success) {
        console.log(`✅ Email enviado exitosamente a: ${email}`);
        if (result.messageId) {
          console.log(`📨 Message ID: ${result.messageId}`);
        }
        results.push({ 
          email, 
          success: true, 
          messageId: result.messageId,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log(`❌ Fallo al enviar a: ${email}`);
        console.log(`💥 Error: ${result?.error || 'Error desconocido'}`);
        results.push({ 
          email, 
          success: false, 
          error: result?.error || 'Error desconocido' 
        });
      }
      
    } catch (error) {
      console.log(`❌ Excepción al enviar a ${email}: ${error.message}`);
      results.push({ 
        email, 
        success: false, 
        error: error.message 
      });
    }
    
    // Esperar entre envíos para no sobrecargar
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}

async function testGmailConfiguration() {
  console.log('\n🏋️ ========================================');
  console.log('💪 ELITE FITNESS CLUB - DIAGNÓSTICO AVANZADO');
  console.log('🏋️ ========================================\n');

  // Mostrar variables de entorno
  console.log('🔍 Variables de entorno detectadas:');
  console.log(`   📧 GMAIL_USER: ${process.env.GMAIL_USER || 'NO CONFIGURADO'}`);
  console.log(`   🔑 GMAIL_APP_PASSWORD: ${process.env.GMAIL_APP_PASSWORD ? 
    `${process.env.GMAIL_APP_PASSWORD.substring(0, 4)}****${process.env.GMAIL_APP_PASSWORD.slice(-2)}` : 
    'NO CONFIGURADO'}`);
  console.log(`   👤 GMAIL_SENDER_NAME: ${process.env.GMAIL_SENDER_NAME || 'Elite Fitness Club'}`);
  console.log(`   🔔 NOTIFICATION_EMAIL_ENABLED: ${process.env.NOTIFICATION_EMAIL_ENABLED || 'false'}`);

  // Verificar configuración básica
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('\n❌ ERROR: Variables de Gmail no configuradas');
    console.log('\n💡 CONFIGURACIÓN REQUERIDA:');
    console.log('   Crea un archivo .env con:');
    console.log('   GMAIL_USER=tu_email@gmail.com');
    console.log('   GMAIL_APP_PASSWORD=tu_app_password_16_caracteres');
    console.log('   GMAIL_SENDER_NAME=Elite Fitness Club');
    console.log('   NOTIFICATION_EMAIL_ENABLED=true');
    return { success: false, message: 'Configuración incompleta' };
  }

  try {
    // Inicializar servicio
    console.log('\n🔄 Inicializando servicio de email...');
    const emailService = new EmailService();

    if (!emailService.isConfigured) {
      console.log('❌ EmailService no configurado');
      return { success: false, message: 'Servicio no configurado' };
    }

    console.log('✅ EmailService inicializado\n');

    // Probar conexión SMTP
    const smtpTest = await testSMTPConnection(emailService);
    if (smtpTest === false) {
      console.log('❌ Conexión SMTP falló - revisa credenciales');
      return { success: false, message: 'Fallo de conexión SMTP' };
    }

    // Datos de prueba actualizados para el nuevo email
    const memberData = {
      name: 'Alexander Echeverría',
      email: 'mismaleje@miumg.edu.gt',
      membershipType: 'Premium Elite Universitario',
      membershipId: 'EFC-UMG-2025-001',
      startDate: new Date().toLocaleDateString('es-ES'),
      trainer: 'Carlos Mendoza',
      nextClass: 'CrossFit Universitario - Mañana 8:00 AM',
      university: 'Universidad Mariano Gálvez'
    };

    // Probar múltiples emails empezando por el universitario
    console.log('🎯 Probando envío a múltiples direcciones...');
    const testResults = await testMultipleEmails(emailService, [memberData.email]);
    
    // Si el email universitario falla, probar alternativas
    if (!testResults[0]?.success) {
      console.log('\n⚠️ Email universitario falló, probando alternativas...');
      const alternativeResults = await testMultipleEmails(emailService, TEST_EMAILS.slice(1));
      testResults.push(...alternativeResults);
    }

    // Enviar email completo al email universitario
    console.log(`\n📧 Enviando email completo de bienvenida a: ${memberData.email}`);
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Elite Fitness Club - Bienvenido Estudiante UMG</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff;">
          
          <!-- Header del Gym Universitario -->
          <div style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">
              🎓 ELITE FITNESS CLUB UMG
            </h1>
            <p style="color: #fff; margin: 10px 0 0 0; font-size: 16px;">
              ¡Fitness para estudiantes universitarios!
            </p>
          </div>

          <!-- Contenido Principal -->
          <div style="padding: 40px 30px;">
            
            <!-- Mensaje de Bienvenida Universitario -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 24px;">
                🎉 ¡Bienvenido Estudiante ${memberData.name}!
              </h2>
              <p style="color: #7f8c8d; font-size: 16px; line-height: 1.6;">
                Como estudiante de la <strong>${memberData.university}</strong>, tienes acceso a 
                beneficios especiales en Elite Fitness Club. ¡Prepárate para mantenerte en forma 
                mientras estudias!
              </p>
            </div>

            <!-- Información de Membresía Universitaria -->
            <div style="background-color: #e8f4fd; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 5px solid #3498db;">
              <h3 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 18px;">
                🎓 Información de tu Membresía Universitaria
              </h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #34495e; font-weight: bold;">👤 Estudiante:</td>
                  <td style="padding: 8px 0; color: #2c3e50;">${memberData.name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #34495e; font-weight: bold;">🎓 Universidad:</td>
                  <td style="padding: 8px 0; color: #2c3e50;">${memberData.university}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #34495e; font-weight: bold;">📧 Email:</td>
                  <td style="padding: 8px 0; color: #2c3e50;">${memberData.email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #34495e; font-weight: bold;">🏆 Plan:</td>
                  <td style="padding: 8px 0; color: #2c3e50;">${memberData.membershipType}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #34495e; font-weight: bold;">🆔 ID Membresía:</td>
                  <td style="padding: 8px 0; color: #2c3e50;">${memberData.membershipId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #34495e; font-weight: bold;">📅 Fecha de Inicio:</td>
                  <td style="padding: 8px 0; color: #2c3e50;">${memberData.startDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #34495e; font-weight: bold;">🏃 Entrenador:</td>
                  <td style="padding: 8px 0; color: #2c3e50;">${memberData.trainer}</td>
                </tr>
              </table>
            </div>

            <!-- Próxima Clase Universitaria -->
            <div style="background: linear-gradient(135deg, #27ae60 0%, #229954 100%); padding: 20px; border-radius: 10px; margin-bottom: 25px; text-align: center;">
              <h3 style="color: white; margin: 0 0 10px 0; font-size: 18px;">
                🎯 Tu Próxima Clase
              </h3>
              <p style="color: white; font-size: 16px; margin: 0; font-weight: bold;">
                ${memberData.nextClass}
              </p>
              <p style="color: #d5f4e6; font-size: 14px; margin: 10px 0 0 0;">
                ¡Ideal para estudiantes! Horarios flexibles entre clases
              </p>
            </div>

            <!-- Beneficios Especiales para Estudiantes -->
            <div style="margin-bottom: 25px;">
              <h3 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 18px;">
                🎓 Beneficios Especiales para Estudiantes UMG
              </h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <ul style="color: #34495e; line-height: 1.8; padding-left: 20px; margin: 0;">
                  <li>📚 Horarios flexibles entre clases</li>
                  <li>💰 Descuento del 30% estudiante</li>
                  <li>🏋️ Acceso a zona de estudio fitness</li>
                  <li>🧘 Clases anti-estrés para exámenes</li>
                  <li>👥 Grupos de estudio activo</li>
                </ul>
                <ul style="color: #34495e; line-height: 1.8; padding-left: 20px; margin: 0;">
                  <li>📱 App con recordatorios de estudio</li>
                  <li>🥗 Menú saludable estudiante</li>
                  <li>📖 Zona de descanso y lectura</li>
                  <li>🚲 Estacionamiento de bicicletas</li>
                  <li>📶 WiFi gratuito en todo el gym</li>
                </ul>
              </div>
            </div>

            <!-- Estado del Sistema -->
            <div style="background-color: #d4edda; border: 2px solid #c3e6cb; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="color: #155724; margin: 0 0 15px 0; font-size: 18px;">
                ✅ Sistema de Notificaciones Verificado
              </h3>
              <p style="color: #155724; margin: 0 0 10px 0;">
                <strong>🎉 ¡Email enviado exitosamente a tu cuenta universitaria!</strong>
              </p>
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
                <h4 style="color: #495057; margin: 0 0 10px 0; font-size: 14px;">📊 Información Técnica:</h4>
                <ul style="color: #6c757d; font-size: 13px; margin: 0; padding-left: 20px;">
                  <li>📧 Servidor: ${process.env.GMAIL_USER}</li>
                  <li>📅 Fecha de prueba: ${new Date().toLocaleString('es-ES')}</li>
                  <li>🏢 Sistema: Elite Fitness Club Management v2.0</li>
                  <li>🎓 Destinatario: Email universitario UMG</li>
                  <li>🔔 Notificaciones: Activas para estudiantes</li>
                </ul>
              </div>
            </div>

            <!-- Horarios Especiales para Estudiantes -->
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="color: #856404; margin: 0 0 15px 0; font-size: 18px;">
                📅 Horarios Especiales para Estudiantes
              </h3>
              <div style="color: #856404; line-height: 1.6;">
                <strong>🌅 Matutino:</strong> 6:00 AM - 8:00 AM (antes de clases)<br>
                <strong>🌞 Medio día:</strong> 12:00 PM - 2:00 PM (almuerzo universitario)<br>
                <strong>🌆 Vespertino:</strong> 4:00 PM - 6:00 PM (después de clases)<br>
                <strong>🌙 Nocturno:</strong> 7:00 PM - 9:00 PM (estudios nocturnos)
              </div>
            </div>

            <!-- Call to Action Estudiante -->
            <div style="text-align: center; margin: 30px 0;">
              <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 15px 30px; border-radius: 25px; display: inline-block;">
                <strong style="font-size: 16px;">🎓 ¡Comienza tu Rutina Fitness Universitaria!</strong>
              </div>
            </div>

          </div>

          <!-- Footer -->
          <div style="background-color: #2c3e50; padding: 25px; text-align: center;">
            <h4 style="color: #ecf0f1; margin: 0 0 10px 0; font-size: 16px;">
              🎓 Elite Fitness Club UMG
            </h4>
            <p style="color: #bdc3c7; font-size: 14px; margin: 0 0 10px 0;">
              📍 Campus Universitario UMG, Zona Fitness<br>
              📞 Tel: +502 1234-5678 | 📧 info@elitefitnessclub.com
            </p>
            <p style="color: #95a5a6; font-size: 12px; margin: 0;">
              Programa especial para estudiantes de Universidad Mariano Gálvez
            </p>
          </div>

        </div>
      </body>
      </html>
    `;

    const textContent = `
🎓 ELITE FITNESS CLUB UMG - ¡Bienvenido ${memberData.name}!

Como estudiante de ${memberData.university}, tienes acceso especial a Elite Fitness Club.

📋 INFORMACIÓN DE MEMBRESÍA UNIVERSITARIA:
👤 Estudiante: ${memberData.name}
🎓 Universidad: ${memberData.university}
📧 Email: ${memberData.email}
🏆 Plan: ${memberData.membershipType}
🆔 ID: ${memberData.membershipId}
📅 Inicio: ${memberData.startDate}
🏃 Entrenador: ${memberData.trainer}

🎯 PRÓXIMA CLASE: ${memberData.nextClass}

🎓 BENEFICIOS ESPECIALES ESTUDIANTES:
• Descuento del 30% estudiante
• Horarios flexibles entre clases
• Zona de estudio fitness
• Clases anti-estrés para exámenes
• WiFi gratuito en todo el gym
• Menú saludable estudiante
• Grupos de estudio activo

📅 HORARIOS PARA ESTUDIANTES:
🌅 Matutino: 6:00 AM - 8:00 AM
🌞 Medio día: 12:00 PM - 2:00 PM
🌆 Vespertino: 4:00 PM - 6:00 PM
🌙 Nocturno: 7:00 PM - 9:00 PM

✅ ESTADO DEL SISTEMA:
Email enviado exitosamente a tu cuenta universitaria
Fecha: ${new Date().toLocaleString('es-ES')}
Servidor: ${process.env.GMAIL_USER}

🎓 Elite Fitness Club UMG
📍 Campus Universitario UMG, Zona Fitness
📞 +502 1234-5678 | 📧 info@elitefitnessclub.com
`;

    // Enviar email principal
    const emailResult = await emailService.sendEmail({
      to: memberData.email,
      subject: `🎓 ¡Bienvenido a Elite Fitness Club UMG! - Plan ${memberData.membershipType}`,
      html: htmlContent,
      text: textContent,
      headers: {
        'X-Gym-System': 'Elite Fitness Club UMG',
        'X-Student-Program': 'Universidad Mariano Galvez',
        'X-Notification-Type': 'Student-Welcome',
        'X-Priority': '1'
      }
    });

    // Evaluar resultados
    const successfulEmails = testResults.filter(r => r.success);
    const hasMainSuccess = emailResult?.success;

    if (hasMainSuccess || successfulEmails.length > 0) {
      console.log('\n🎉 ¡ÉXITO! Sistema Gmail funcionando correctamente');
      
      if (hasMainSuccess) {
        console.log(`✅ Email principal enviado a: ${memberData.email}`);
        console.log(`📬 Asunto: 🎓 ¡Bienvenido a Elite Fitness Club UMG!`);
        if (emailResult.messageId) {
          console.log(`📨 Message ID: ${emailResult.messageId}`);
        }
      }
      
      if (successfulEmails.length > 0) {
        console.log(`📧 Emails de prueba exitosos: ${successfulEmails.length}`);
        successfulEmails.forEach(email => {
          console.log(`   ✅ ${email.email}`);
        });
      }
      
      console.log('\n🎓 Revisa tu bandeja de entrada universitaria');
      console.log('📱 También revisa carpeta de spam por las dudas');
      
      return {
        success: true,
        message: 'Sistema Gmail funcionando correctamente',
        details: {
          mainEmail: hasMainSuccess ? {
            email: memberData.email,
            messageId: emailResult?.messageId,
            success: true
          } : null,
          testResults: testResults,
          successCount: successfulEmails.length + (hasMainSuccess ? 1 : 0),
          timestamp: new Date().toISOString()
        }
      };
      
    } else {
      console.log('\n❌ FALLO: No se pudo enviar a ninguna dirección');
      console.log('\n🔧 POSIBLES SOLUCIONES:');
      console.log('   1. Verifica que la App Password sea correcta');
      console.log('   2. Revisa que no haya espacios en las variables .env');
      console.log('   3. Confirma que el email universitario esté activo');
      console.log('   4. Intenta generar una nueva App Password');
      
      return {
        success: false,
        message: 'No se pudo enviar a ninguna dirección',
        details: { testResults, errors: testResults.map(r => r.error) }
      };
    }

  } catch (error) {
    console.error('\n❌ ERROR CRÍTICO:', error.message);
    console.error('💥 Stack:', error.stack);
    
    return {
      success: false,
      message: 'Error crítico inesperado',
      error: error.message
    };
  }
}

// Función mejorada para mostrar estadísticas
async function showEmailServiceStats() {
  try {
    console.log('\n📊 Estadísticas del servicio...');
    
    const emailService = new EmailService();
    if (!emailService.isConfigured) {
      console.log('⚠️ Servicio no configurado');
      return;
    }

    const stats = await emailService.getEmailStats();
    if (stats?.success) {
      console.log('\n📈 ESTADÍSTICAS ELITE FITNESS UMG:');
      console.log('┌─────────────────────────────────────────────┐');
      console.log(`│ 🏢 Proveedor: ${(stats.stats.provider || 'Gmail').padEnd(28)} │`);
      console.log(`│ 📧 Email: ${(stats.stats.senderEmail || process.env.GMAIL_USER || '').padEnd(32)} │`);
      console.log(`│ 👤 Nombre: ${(stats.stats.senderName || 'Elite Fitness Club').padEnd(31)} │`);
      console.log(`│ 🌐 Host: ${(stats.stats.host || 'smtp.gmail.com').padEnd(34)} │`);
      console.log(`│ 🔒 Seguro: ${(stats.stats.secure ? 'Sí (TLS)' : 'No').padEnd(32)} │`);
      console.log(`│ 🎓 Programa: Estudiantes UMG${' '.repeat(17)} │`);
      console.log('└─────────────────────────────────────────────┘');
    }
  } catch (error) {
    console.log('⚠️ No se pudieron obtener estadísticas');
  }
}

// Función principal
async function main() {
  const startTime = Date.now();
  
  console.log('🎓 ===============================================');
  console.log('💪 ELITE FITNESS CLUB UMG - SISTEMA EMAIL');
  console.log('🎓 ===============================================');
  console.log(`🚀 Probando Gmail con email universitario: mismaleje@miumg.edu.gt\n`);
  
  const testResult = await testGmailConfiguration();
  
  if (testResult?.success) {
    await showEmailServiceStats();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n🎯 ════════════════════════════════════════════');
    console.log('✅ RESULTADO: ÉXITO - Gmail funcionando perfectamente');
    console.log('🎯 ════════════════════════════════════════════');
    console.log(`⏱️ Tiempo: ${duration} segundos`);
    console.log(`🎓 Email universitario: mismaleje@miumg.edu.gt`);
    console.log(`📧 Emails exitosos: ${testResult.details?.successCount || 1}`);
    console.log('💡 Sistema listo para producción: npm start');
    
  } else {
    console.log('\n🎯 ════════════════════════════════════════════');
    console.log('❌ RESULTADO: FALLO - Requiere configuración');
    console.log('🎯 ════════════════════════════════════════════');
    console.log('🔧 Revisa la configuración Gmail antes de continuar');
  }
  
  console.log('\n🎓 ===============================================');
  console.log('💪 PRUEBA ELITE FITNESS UMG COMPLETADA');
  console.log('🎓 ===============================================\n');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch((error) => {
    console.error('\n💥 ERROR FATAL:', error);
    process.exit(1);
  });
}

module.exports = { 
  testGmailConfiguration, 
  showEmailServiceStats,
  testMultipleEmails,
  main 
};