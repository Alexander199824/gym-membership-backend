// src/services/dailyMembershipService.js - NUEVO: Servicio para deducción automática de días
const cron = require('node-cron');
const { Membership } = require('../models');
const { EmailService } = require('./notificationServices');

class DailyMembershipService {
  constructor() {
    this.isRunning = false;
    this.emailService = new EmailService();
    
    // Configurar cron job para ejecutarse diariamente a las 00:05
    this.cronJob = cron.schedule('5 0 * * *', async () => {
      await this.processDailyDeduction();
    }, {
      scheduled: false, // No iniciar automáticamente
      timezone: 'America/Guatemala'
    });
    
    console.log('✅ Servicio de deducción diaria de membresías inicializado');
  }
  
  // ✅ Iniciar el servicio automático
  start() {
    if (!this.isRunning) {
      this.cronJob.start();
      this.isRunning = true;
      console.log('🕒 Servicio de deducción diaria INICIADO - Se ejecutará diariamente a las 00:05');
    }
  }
  
  // ✅ Detener el servicio
  stop() {
    if (this.isRunning) {
      this.cronJob.stop();
      this.isRunning = false;
      console.log('⏹️ Servicio de deducción diaria DETENIDO');
    }
  }
  
  // ✅ Procesar deducción diaria principal
  async processDailyDeduction() {
    console.log('🕒 Iniciando proceso de deducción diaria...');
    const startTime = Date.now();
    
    try {
      // Obtener todas las membresías activas que deben procesar
      const activeMemberships = await Membership.findAll({
        where: {
          status: 'active',
          autoDeductDays: true,
          remainingDays: { [Membership.sequelize.Sequelize.Op.gt]: 0 }
        },
        include: [
          { 
            association: 'user', 
            attributes: ['id', 'firstName', 'lastName', 'email', 'notificationPreferences']
          }
        ]
      });
      
      console.log(`📊 Encontradas ${activeMemberships.length} membresías activas para procesar`);
      
      let processed = 0;
      let expired = 0;
      let notifications = 0;
      let errors = 0;
      
      // Procesar cada membresía
      for (const membership of activeMemberships) {
        try {
          const wasDeducted = await membership.deductDay();
          
          if (wasDeducted) {
            processed++;
            
            // Si llegó a 0, incrementar contador de expiradas
            if (membership.remainingDays === 0) {
              expired++;
              console.log(`❌ Membresía ${membership.id} EXPIRÓ (usuario: ${membership.user.firstName})`);
            }
            
            // Enviar notificaciones si es necesario
            if (membership.needsExpirationNotification()) {
              try {
                await this.sendExpirationNotification(membership);
                notifications++;
              } catch (notificationError) {
                console.warn(`⚠️ Error enviando notificación a ${membership.user.email}:`, notificationError.message);
              }
            }
          }
          
        } catch (membershipError) {
          console.error(`❌ Error procesando membresía ${membership.id}:`, membershipError.message);
          errors++;
        }
      }
      
      const duration = Date.now() - startTime;
      
      // Log del resumen
      console.log('📊 RESUMEN DEL PROCESO DIARIO:');
      console.log(`   ✅ Membresías procesadas: ${processed}`);
      console.log(`   ❌ Membresías expiradas: ${expired}`);
      console.log(`   📧 Notificaciones enviadas: ${notifications}`);
      console.log(`   ⚠️ Errores: ${errors}`);
      console.log(`   ⏱️ Tiempo: ${duration}ms`);
      
      // Enviar reporte diario a administradores si hay actividad
      if (processed > 0 || expired > 0) {
        await this.sendDailyReportToAdmins({
          processed,
          expired,
          notifications,
          errors,
          duration,
          totalMemberships: activeMemberships.length
        });
      }
      
      return {
        success: true,
        processed,
        expired,
        notifications,
        errors,
        duration
      };
      
    } catch (error) {
      console.error('❌ Error en proceso de deducción diaria:', error);
      
      // Enviar alerta de error crítico a administradores
      await this.sendCriticalErrorAlert(error);
      
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }
  
  // ✅ Ejecutar proceso manualmente (para testing)
  async runManually() {
    console.log('🔧 Ejecutando proceso de deducción diaria MANUALMENTE...');
    return await this.processDailyDeduction();
  }
  
  // ✅ Enviar notificación de próximo vencimiento
  async sendExpirationNotification(membership) {
    if (!this.emailService.isConfigured) {
      console.log('ℹ️ Servicio de email no configurado - omitiendo notificación');
      return false;
    }
    
    const user = membership.user;
    const daysLeft = membership.remainingDays;
    const userPreferences = user.notificationPreferences || {};
    
    // Verificar si el usuario quiere recibir notificaciones
    if (userPreferences.membershipReminders === false) {
      console.log(`ℹ️ Usuario ${user.email} tiene notificaciones de membresía deshabilitadas`);
      return false;
    }
    
    // Determinar urgencia basada en días restantes
    let urgencyLevel = 'info';
    let urgencyColor = '#10b981';
    let urgencyText = 'Recordatorio';
    
    if (daysLeft <= 1) {
      urgencyLevel = 'critical';
      urgencyColor = '#ef4444';
      urgencyText = '🚨 URGENTE';
    } else if (daysLeft <= 3) {
      urgencyLevel = 'warning';
      urgencyColor = '#f59e0b';
      urgencyText = '⚠️ IMPORTANTE';
    }
    
    const emailTemplate = {
      subject: `${urgencyText} - Tu membresía expira en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, ${urgencyColor} 0%, ${urgencyLevel === 'critical' ? '#dc2626' : urgencyLevel === 'warning' ? '#d97706' : '#059669'} 100%); padding: 30px; text-align: center; color: white;">
            <h1>${urgencyText}</h1>
            <h2>Tu membresía expira en ${daysLeft} día${daysLeft === 1 ? '' : 's'}</h2>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2>Hola ${user.firstName},</h2>
            
            ${daysLeft === 1 ? 
              '<p style="color: #dc2626; font-weight: bold; font-size: 18px;">⏰ ¡Tu membresía expira MAÑANA!</p>' :
              `<p>Tu membresía de Elite Fitness Club expira en <strong>${daysLeft} días</strong>.</p>`
            }
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${urgencyColor};">
              <h3 style="margin-top: 0; color: ${urgencyLevel === 'critical' ? '#dc2626' : '#374151'};">📊 Estado Actual</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Días Restantes:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee; color: ${urgencyColor}; font-weight: bold;">${daysLeft}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Estado:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">Activa</td></tr>
                <tr><td style="padding: 8px;"><strong>Tipo:</strong></td><td style="padding: 8px;">${membership.type}</td></tr>
              </table>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="font-size: 18px; color: #374151; margin-bottom: 20px;">¡No pierdas tu progreso fitness!</p>
              <a href="#renovar" style="display: inline-block; background: ${urgencyColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 5px; font-weight: bold;">
                🔄 Renovar Ahora
              </a>
              <a href="#contacto" style="display: inline-block; background: #6b7280; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 5px;">
                📞 Contactar
              </a>
            </div>
            
            ${daysLeft <= 3 ? `
            <div style="background: #fee2e2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #dc2626; margin-top: 0;">🚨 ¡Acción Inmediata Necesaria!</h3>
              <p style="color: #991b1b;">Para evitar la interrupción de tu rutina, renueva tu membresía lo antes posible. Después del vencimiento perderás:</p>
              <ul style="color: #991b1b;">
                <li>Acceso a las instalaciones</li>
                <li>Tus horarios reservados</li>
                <li>Tu progreso registrado</li>
              </ul>
            </div>
            ` : `
            <div style="background: white; padding: 20px; border-radius: 8px;">
              <h3 style="color: ${urgencyColor}; margin-top: 0;">💪 Mantén tu Rutina Activa</h3>
              <ul style="color: #4b5563; line-height: 1.6;">
                <li>Conserva tus horarios reservados</li>
                <li>Mantén tu progreso y estadísticas</li>
                <li>Continúa con tu plan de entrenamiento</li>
                <li>Aprovecha descuentos por renovación temprana</li>
              </ul>
            </div>
            `}
            
            <div style="text-align: center; margin: 30px 0; padding: 20px; background: #e0f2fe; border-radius: 8px;">
              <p style="color: #0277bd; margin: 0; font-weight: bold;">💬 ¿Necesitas ayuda?</p>
              <p style="margin: 5px 0;"><strong>📞 WhatsApp:</strong> +502 1234-5678</p>
              <p style="margin: 5px 0;"><strong>📧 Email:</strong> info@elitefitness.com</p>
              <p style="margin: 5px 0;"><strong>🏢 Visítanos:</strong> Lun-Vie 5AM-10PM</p>
            </div>
          </div>
          
          <div style="background: #1f2937; color: #9ca3af; text-align: center; padding: 20px;">
            <p style="margin: 0;">Elite Fitness Club - Manteniendo tu mejor versión activa</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">© 2024 Elite Fitness Club. Este email fue enviado automáticamente.</p>
          </div>
        </div>
      `,
      text: `
${urgencyText} - Membresía expira en ${daysLeft} día${daysLeft === 1 ? '' : 's'}

Hola ${user.firstName},

${daysLeft === 1 ? 
  '⏰ ¡Tu membresía expira MAÑANA!' :
  `Tu membresía expira en ${daysLeft} días.`
}

Estado Actual:
- Días Restantes: ${daysLeft}
- Estado: Activa
- Tipo: ${membership.type}

¡No pierdas tu progreso fitness! Renueva tu membresía para continuar.

Contacto:
📞 WhatsApp: +502 1234-5678
📧 Email: info@elitefitness.com

Elite Fitness Club
      `
    };
    
    try {
      const result = await this.emailService.sendEmail({
        to: user.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text
      });
      
      console.log(`✅ Notificación de vencimiento enviada a ${user.email} (${daysLeft} días, ${urgencyLevel})`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error enviando notificación de vencimiento a ${user.email}:`, error.message);
      return false;
    }
  }
  
  // ✅ Enviar reporte diario a administradores
  async sendDailyReportToAdmins(stats) {
    try {
      if (!this.emailService.isConfigured) {
        console.log('ℹ️ No se puede enviar reporte diario - email no configurado');
        return;
      }
      
      const { User } = require('../models');
      const admins = await User.findAll({
        where: { 
          role: 'admin', 
          isActive: true,
          notificationPreferences: {
            email: true
          }
        },
        attributes: ['email', 'firstName']
      });
      
      if (admins.length === 0) {
        console.log('ℹ️ No hay administradores para enviar reporte diario');
        return;
      }
      
      const today = new Date().toLocaleDateString('es-GT');
      const totalMemberships = stats.totalMemberships;
      const percentageProcessed = totalMemberships > 0 ? ((stats.processed / totalMemberships) * 100).toFixed(1) : '0';
      
      const reportHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3730a3 100%); padding: 30px; text-align: center; color: white;">
            <h1>📊 Reporte Diario de Membresías</h1>
            <p style="font-size: 18px; margin: 0;">${today}</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #1e40af; margin-top: 0;">📈 Resumen de Procesamiento</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Total Membresías Activas:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${totalMemberships}</td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Membresías Procesadas:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${stats.processed} (${percentageProcessed}%)</td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Membresías Expiradas Hoy:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: #dc2626; font-weight: bold;">${stats.expired}</td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Notificaciones Enviadas:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${stats.notifications}</td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Errores:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: ${stats.errors > 0 ? '#dc2626' : '#059669'};">${stats.errors}</td></tr>
                <tr><td style="padding: 10px;"><strong>Tiempo de Ejecución:</strong></td><td style="padding: 10px; text-align: right;">${stats.duration}ms</td></tr>
              </table>
            </div>
            
            ${stats.expired > 0 ? `
            <div style="background: #fee2e2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #dc2626; margin-top: 0;">⚠️ Atención: Membresías Expiradas</h3>
              <p style="color: #991b1b;">Hoy expiraron <strong>${stats.expired}</strong> membresías. Se recomienda contactar a estos clientes para ofrecerles renovación.</p>
            </div>
            ` : ''}
            
            ${stats.errors > 0 ? `
            <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #d97706; margin-top: 0;">🔧 Errores Detectados</h3>
              <p style="color: #92400e;">Se detectaron <strong>${stats.errors}</strong> errores durante el procesamiento. Revisar logs del sistema.</p>
            </div>
            ` : ''}
            
            <div style="background: white; padding: 20px; border-radius: 8px;">
              <h3 style="color: #059669; margin-top: 0;">✅ Próximos Pasos Recomendados</h3>
              <ul style="color: #374151;">
                <li>Revisar clientes con membresías próximas a expirar</li>
                <li>Preparar campañas de renovación para la próxima semana</li>
                <li>Verificar disponibilidad de horarios para nuevas membresías</li>
                ${stats.errors > 0 ? '<li style="color: #dc2626;"><strong>Revisar y corregir errores en logs del sistema</strong></li>' : ''}
              </ul>
            </div>
          </div>
          
          <div style="background: #1f2937; color: #9ca3af; text-align: center; padding: 20px;">
            <p style="margin: 0;">Elite Fitness Club - Sistema de Gestión de Membresías</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">Reporte generado automáticamente a las ${new Date().toLocaleTimeString('es-GT')}</p>
          </div>
        </div>
      `;
      
      // Enviar a todos los administradores
      for (const admin of admins) {
        await this.emailService.sendEmail({
          to: admin.email,
          subject: `📊 Reporte Diario Membresías - ${today}`,
          html: reportHtml,
          text: `
Reporte Diario de Membresías - ${today}

Resumen:
- Total Activas: ${totalMemberships}
- Procesadas: ${stats.processed} (${percentageProcessed}%)
- Expiradas Hoy: ${stats.expired}
- Notificaciones: ${stats.notifications}
- Errores: ${stats.errors}
- Tiempo: ${stats.duration}ms

Elite Fitness Club - Sistema de Gestión
          `
        });
      }
      
      console.log(`✅ Reporte diario enviado a ${admins.length} administradores`);
      
    } catch (error) {
      console.error('❌ Error enviando reporte diario a admins:', error.message);
    }
  }
  
  // ✅ Enviar alerta de error crítico
  async sendCriticalErrorAlert(error) {
    try {
      if (!this.emailService.isConfigured) return;
      
      const { User } = require('../models');
      const admins = await User.findAll({
        where: { role: 'admin', isActive: true },
        attributes: ['email', 'firstName']
      });
      
      const alertHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #dc2626;">
          <div style="background: #dc2626; padding: 20px; text-align: center; color: white;">
            <h1>🚨 ERROR CRÍTICO - Sistema de Membresías</h1>
            <p style="font-size: 18px; margin: 0;">Falló el proceso de deducción diaria</p>
          </div>
          
          <div style="padding: 20px; background: #fee2e2;">
            <h3 style="color: #dc2626;">Error Detectado:</h3>
            <pre style="background: white; padding: 15px; border-radius: 4px; border: 1px solid #fecaca; overflow-x: auto;">${error.message}</pre>
            
            <p style="color: #991b1b; font-weight: bold;">ACCIÓN REQUERIDA:</p>
            <ul style="color: #991b1b;">
              <li>Revisar logs del sistema inmediatamente</li>
              <li>Ejecutar proceso manual si es necesario</li>
              <li>Verificar estado de la base de datos</li>
              <li>Contactar soporte técnico si el problema persiste</li>
            </ul>
            
            <div style="text-align: center; margin: 20px 0;">
              <p style="color: #374151;">Timestamp: ${new Date().toISOString()}</p>
            </div>
          </div>
        </div>
      `;
      
      for (const admin of admins) {
        await this.emailService.sendEmail({
          to: admin.email,
          subject: '🚨 ERROR CRÍTICO - Sistema de Membresías',
          html: alertHtml,
          text: `
ERROR CRÍTICO - Sistema de Membresías

Falló el proceso de deducción diaria.

Error: ${error.message}

ACCIÓN REQUERIDA:
- Revisar logs del sistema
- Ejecutar proceso manual
- Contactar soporte técnico

Timestamp: ${new Date().toISOString()}
          `
        });
      }
      
      console.log(`🚨 Alerta crítica enviada a ${admins.length} administradores`);
      
    } catch (alertError) {
      console.error('❌ Error enviando alerta crítica:', alertError.message);
    }
  }
  
  // ✅ Obtener estado del servicio
  getStatus() {
    return {
      isRunning: this.isRunning,
      cronExpression: '5 0 * * *', // Diariamente a las 00:05
      timezone: 'America/Guatemala',
      lastExecution: this.lastExecution || null,
      emailService: this.emailService.isConfigured
    };
  }
}

// ✅ Exportar singleton
const dailyMembershipService = new DailyMembershipService();

module.exports = dailyMembershipService;