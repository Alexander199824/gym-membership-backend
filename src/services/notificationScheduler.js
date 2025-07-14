// src/services/notificationScheduler.js
const cron = require('node-cron');
const { Membership, User, Notification } = require('../models');
const { EmailService, WhatsAppService } = require('./notificationServices');
const { Op } = require('sequelize');

class NotificationScheduler {
  constructor() {
    this.emailService = new EmailService();
    this.whatsappService = new WhatsAppService();
    this.isRunning = false;
  }

  // Iniciar todos los trabajos programados
  start() {
    if (this.isRunning) {
      console.log('⚠️ El programador de notificaciones ya está ejecutándose');
      return;
    }

    console.log('🔄 Iniciando programador de notificaciones...');

    // Verificar membresías vencidas y próximas a vencer - cada día a las 8:00 AM
    cron.schedule('0 8 * * *', () => {
      this.sendMembershipReminders();
    });

    // Notificar membresías vencidas al personal - cada día a las 7:00 AM
    cron.schedule('0 7 * * *', () => {
      this.notifyStaffExpiredMemberships();
    });

    // Enviar ofertas a clientes frecuentes - cada lunes a las 10:00 AM
    cron.schedule('0 10 * * 1', () => {
      this.sendPromotionsToFrequentClients();
    });

    // Enviar mensajes motivacionales - martes y jueves a las 6:00 PM
    cron.schedule('0 18 * * 2,4', () => {
      this.sendMotivationalMessages();
    });

    // Limpiar notificaciones antiguas - cada domingo a las 2:00 AM
    cron.schedule('0 2 * * 0', () => {
      this.cleanupOldNotifications();
    });

    this.isRunning = true;
    console.log('✅ Programador de notificaciones iniciado');
  }

  // Parar todos los trabajos programados
  stop() {
    cron.getTasks().forEach(task => task.destroy());
    this.isRunning = false;
    console.log('⏹️ Programador de notificaciones detenido');
  }

  // Enviar recordatorios de membresías
  async sendMembershipReminders() {
    try {
      console.log('📅 Enviando recordatorios de membresías...');

      // Membresías que vencen en 7, 3 y 1 día
      const reminderDays = [7, 3, 1];

      for (const days of reminderDays) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);
        targetDate.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const expiringSoon = await Membership.findAll({
          where: {
            status: 'active',
            endDate: {
              [Op.between]: [targetDate, nextDay]
            }
          },
          include: [{
            model: User,
            as: 'user',
            where: { isActive: true }
          }]
        });

        for (const membership of expiringSoon) {
          await this.sendMembershipExpiringNotification(membership, days);
        }
      }

      // Membresías que ya vencieron
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const expiredMemberships = await Membership.findAll({
        where: {
          status: 'active',
          endDate: { [Op.lt]: today }
        },
        include: [{
          model: User,
          as: 'user',
          where: { isActive: true }
        }]
      });

      for (const membership of expiredMemberships) {
        await this.sendMembershipExpiredNotification(membership);
        
        // Actualizar estado de la membresía
        membership.status = 'expired';
        await membership.save();
      }

      console.log(`✅ Recordatorios enviados: ${expiringSoon.length + expiredMemberships.length} notificaciones`);
    } catch (error) {
      console.error('❌ Error al enviar recordatorios:', error);
    }
  }

  // Notificar al personal sobre membresías vencidas
  async notifyStaffExpiredMemberships() {
    try {
      console.log('👥 Notificando al personal sobre membresías vencidas...');

      // Obtener staff activo
      const staff = await User.findAll({
        where: {
          role: { [Op.in]: ['admin', 'colaborador'] },
          isActive: true
        }
      });

      if (staff.length === 0) return;

      // Obtener membresías vencidas hoy
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const expiredToday = await Membership.findAll({
        where: {
          status: 'active',
          endDate: {
            [Op.between]: [today, tomorrow]
          }
        },
        include: ['user']
      });

      // Obtener membresías vencidas hace varios días
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const expiredSeveral = await Membership.findAll({
        where: {
          status: 'expired',
          endDate: {
            [Op.between]: [threeDaysAgo, today]
          }
        },
        include: ['user']
      });

      // Crear mensaje para el staff
      const message = this.createStaffExpiredMembershipsMessage(expiredToday, expiredSeveral);

      // Enviar a cada miembro del staff
      for (const staffMember of staff) {
        const preferences = staffMember.notificationPreferences || {};

        if (preferences.email !== false && staffMember.email) {
          await this.emailService.sendEmail({
            to: staffMember.email,
            subject: '📋 Reporte diario - Membresías vencidas',
            html: message.html,
            text: message.text
          });
        }

        if (preferences.whatsapp !== false && staffMember.whatsapp) {
          await this.whatsappService.sendWhatsApp({
            to: staffMember.whatsapp,
            message: message.whatsapp
          });
        }
      }

      console.log(`✅ Personal notificado: ${staff.length} miembros`);
    } catch (error) {
      console.error('❌ Error al notificar al personal:', error);
    }
  }

  // Enviar promociones a clientes frecuentes
  async sendPromotionsToFrequentClients() {
    try {
      console.log('🎉 Enviando promociones a clientes frecuentes...');

      // Buscar clientes que pagan por día frecuentemente (últimos 30 días, mínimo 8 visitas)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const frequentClients = await User.findAll({
        include: [{
          model: Payment,
          as: 'payments',
          where: {
            paymentType: 'daily',
            paymentDate: { [Op.gte]: thirtyDaysAgo },
            status: 'completed'
          },
          attributes: []
        }],
        attributes: [
          'id', 'firstName', 'lastName', 'email', 'whatsapp', 'notificationPreferences',
          [User.sequelize.fn('COUNT', User.sequelize.col('payments.id')), 'dailyPayments']
        ],
        group: ['User.id'],
        having: User.sequelize.where(
          User.sequelize.fn('COUNT', User.sequelize.col('payments.id')),
          '>=',
          8
        ),
        where: { isActive: true }
      });

      const promotionMessage = `¡Oferta especial! 🎯

Hemos notado que vienes frecuentemente al gimnasio. ¡Te queremos premiar!

✨ OFERTA EXCLUSIVA ✨
Cambia a membresía mensual y obtén:
• 20% de descuento en tu primer mes
• Acceso a clases grupales
• Horarios preferenciales

¡Esta oferta es solo para ti! Válida hasta fin de mes.

¿Te interesa? Responde a este mensaje o acércate a recepción.`;

      for (const client of frequentClients) {
        const preferences = client.notificationPreferences || {};

        if (preferences.promotions !== false) {
          if (preferences.email !== false && client.email) {
            await this.emailService.sendEmail({
              to: client.email,
              subject: '🎉 Oferta especial solo para ti',
              html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                      <h2 style="color: #e74c3c;">🎯 ¡Oferta Exclusiva!</h2>
                      <p>Hola <strong>${client.getFullName()}</strong>,</p>
                      <p>Hemos notado que vienes frecuentemente al gimnasio. ¡Te queremos premiar!</p>
                      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #2c3e50;">✨ OFERTA EXCLUSIVA ✨</h3>
                        <p>Cambia a membresía mensual y obtén:</p>
                        <ul>
                          <li>20% de descuento en tu primer mes</li>
                          <li>Acceso a clases grupales</li>
                          <li>Horarios preferenciales</li>
                        </ul>
                      </div>
                      <p><strong>¡Esta oferta es solo para ti! Válida hasta fin de mes.</strong></p>
                      <p>¿Te interesa? Responde a este mensaje o acércate a recepción.</p>
                    </div>`,
              text: promotionMessage
            });
          }

          if (preferences.whatsapp !== false && client.whatsapp) {
            await this.whatsappService.sendWhatsApp({
              to: client.whatsapp,
              message: promotionMessage
            });
          }
        }
      }

      console.log(`✅ Promociones enviadas a ${frequentClients.length} clientes frecuentes`);
    } catch (error) {
      console.error('❌ Error al enviar promociones:', error);
    }
  }

  // Enviar mensajes motivacionales
  async sendMotivationalMessages() {
    try {
      console.log('💪 Enviando mensajes motivacionales...');

      // Obtener clientes con membresías activas
      const activeMembers = await User.findAll({
        include: [{
          model: Membership,
          as: 'memberships',
          where: { status: 'active' },
          required: true
        }],
        where: { isActive: true }
      });

      let sentCount = 0;

      for (const member of activeMembers) {
        const preferences = member.notificationPreferences || {};

        if (preferences.motivationalMessages !== false) {
          if (preferences.whatsapp !== false && member.whatsapp) {
            const message = this.whatsappService.generateMotivationalMessage(member);
            await this.whatsappService.sendWhatsApp({
              to: member.whatsapp,
              message
            });
            sentCount++;
          }
        }
      }

      console.log(`✅ Mensajes motivacionales enviados a ${sentCount} miembros`);
    } catch (error) {
      console.error('❌ Error al enviar mensajes motivacionales:', error);
    }
  }

  // Limpiar notificaciones antiguas
  async cleanupOldNotifications() {
    try {
      console.log('🗑️ Limpiando notificaciones antiguas...');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deletedCount = await Notification.destroy({
        where: {
          createdAt: { [Op.lt]: thirtyDaysAgo },
          status: { [Op.in]: ['sent', 'failed'] }
        }
      });

      console.log(`✅ ${deletedCount} notificaciones antiguas eliminadas`);
    } catch (error) {
      console.error('❌ Error al limpiar notificaciones:', error);
    }
  }

  // Métodos auxiliares para enviar notificaciones específicas
  async sendMembershipExpiringNotification(membership, daysLeft) {
    try {
      const user = membership.user;
      const preferences = user.notificationPreferences || {};

      // Verificar si no se ha enviado notificación reciente
      const recentNotification = await Notification.findOne({
        where: {
          userId: user.id,
          membershipId: membership.id,
          type: 'membership_expiring',
          createdAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Últimas 24 horas
        }
      });

      if (recentNotification) return;

      if (preferences.membershipReminders !== false) {
        // Email
        if (preferences.email !== false && user.email) {
          const emailTemplate = this.emailService.generateMembershipExpiringEmail(user, membership);
          await this.emailService.sendEmail({
            to: user.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text
          });
        }

        // WhatsApp
        if (preferences.whatsapp !== false && user.whatsapp) {
          const message = this.whatsappService.generateMembershipExpiringMessage(user, membership);
          await this.whatsappService.sendWhatsApp({
            to: user.whatsapp,
            message
          });
        }

        // Registrar notificación
        await Notification.create({
          userId: user.id,
          membershipId: membership.id,
          type: 'membership_expiring',
          channel: 'both',
          status: 'sent',
          title: `Membresía vence en ${daysLeft} días`,
          message: `Tu membresía vence el ${new Date(membership.endDate).toLocaleDateString('es-ES')}`,
          sentAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error al enviar notificación de vencimiento:', error);
    }
  }

  async sendMembershipExpiredNotification(membership) {
    try {
      const user = membership.user;
      const preferences = user.notificationPreferences || {};

      if (preferences.membershipReminders !== false) {
        // Email
        if (preferences.email !== false && user.email) {
          const emailTemplate = this.emailService.generateMembershipExpiredEmail(user, membership);
          await this.emailService.sendEmail({
            to: user.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text
          });
        }

        // WhatsApp
        if (preferences.whatsapp !== false && user.whatsapp) {
          const message = this.whatsappService.generateMembershipExpiredMessage(user, membership);
          await this.whatsappService.sendWhatsApp({
            to: user.whatsapp,
            message
          });
        }

        // Registrar notificación
        await Notification.create({
          userId: user.id,
          membershipId: membership.id,
          type: 'membership_expired',
          channel: 'both',
          status: 'sent',
          title: 'Membresía vencida',
          message: `Tu membresía venció el ${new Date(membership.endDate).toLocaleDateString('es-ES')}`,
          sentAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error al enviar notificación de vencimiento:', error);
    }
  }

  createStaffExpiredMembershipsMessage(expiredToday, expiredSeveral) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">📋 Reporte Diario - Membresías Vencidas</h2>
        
        <h3 style="color: #e74c3c;">🚨 Vencen hoy (${expiredToday.length})</h3>
        ${expiredToday.length > 0 ? 
          '<ul>' + expiredToday.map(m => 
            `<li><strong>${m.user.getFullName()}</strong> - ${m.user.email} - ${m.user.phone || 'Sin teléfono'}</li>`
          ).join('') + '</ul>' 
          : '<p>No hay membresías que venzan hoy.</p>'}
        
        <h3 style="color: #f39c12;">⏰ Vencidas hace varios días (${expiredSeveral.length})</h3>
        ${expiredSeveral.length > 0 ? 
          '<ul>' + expiredSeveral.map(m => 
            `<li><strong>${m.user.getFullName()}</strong> - Venció: ${new Date(m.endDate).toLocaleDateString('es-ES')}</li>`
          ).join('') + '</ul>' 
          : '<p>No hay membresías vencidas pendientes.</p>'}
        
        <p style="margin-top: 30px;">Recuerda contactar a estos clientes para renovar sus membresías.</p>
      </div>
    `;

    const whatsapp = `📋 *Reporte Diario - Membresías*

🚨 *Vencen hoy (${expiredToday.length}):*
${expiredToday.map(m => `• ${m.user.getFullName()}`).join('\n') || 'Ninguna'}

⏰ *Vencidas hace días (${expiredSeveral.length}):*
${expiredSeveral.map(m => `• ${m.user.getFullName()} (${new Date(m.endDate).toLocaleDateString('es-ES')})`).join('\n') || 'Ninguna'}

Recuerda contactar a estos clientes. 💪`;

    return {
      html,
      text: whatsapp,
      whatsapp
    };
  }
}

// Exportar instancia singleton
module.exports = new NotificationScheduler();