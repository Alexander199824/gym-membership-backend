// src/controllers/testimonialController.js - NUEVO ARCHIVO (SIN modificar modelo)
const { GymTestimonials, User } = require('../models');
const { Op } = require('sequelize');

// ✅ CONTROLADOR MODIFICADO - Permitir múltiples testimonios y ver pendientes

class TestimonialController {

  // ✅ CREAR TESTIMONIO - SIN restricción de "solo uno"
  async createTestimony(req, res) {
    try {
      const { text, rating, role } = req.body;
      const userId = req.user.id;
      const userName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email || `Usuario ${req.user.id}`;

      // Verificar que el usuario sea cliente
      if (req.user.role !== 'cliente') {
        return res.status(403).json({
          success: false,
          message: 'Solo los clientes pueden enviar testimonios'
        });
      }

      // ✅ REMOVIDO: La verificación de testimonio existente
      // Ahora los usuarios pueden enviar múltiples testimonios

      // Crear testimonio con isActive: false (pendiente hasta aprobación)
      const testimonial = await GymTestimonials.create({
        name: userName,
        role: role || 'Miembro',
        text,
        rating,
        imageUrl: '', // Vacío por defecto
        isFeatured: false,
        isActive: false, // ✅ Pendiente hasta que admin apruebe
        displayOrder: 999 // Al final hasta que admin lo ordene
      });

      console.log(`📝 Cliente ${userName} envió nuevo testimonio (ID: ${testimonial.id})`);

      res.status(201).json({
        success: true,
        message: '¡Gracias por compartir tu experiencia! Tu testimonio es muy importante para nosotros.',
        data: {
          thankYouMessage: '¡Valoramos tu opinión y la utilizaremos para seguir brindando el mejor servicio!',
          testimonial: {
            id: testimonial.id,
            rating: testimonial.rating,
            submittedAt: testimonial.created_at
          }
        }
      });

    } catch (error) {
      console.error('Error al crear testimonio:', error);
      res.status(500).json({
        success: false,
        message: 'Error al enviar testimonio',
        error: error.message
      });
    }
  }

  // ✅ VER MIS TESTIMONIOS - Mostrar TODOS (activos Y pendientes)
  async getMyTestimonials(req, res) {
    try {
      const userName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 
                       req.user.email || 
                       `Usuario ${req.user.id}`;

      console.log(`💬 Buscando TODOS los testimonios para usuario: ${userName} (ID: ${req.user.id})`);

      // ✅ CAMBIO CRÍTICO: Buscar TODOS los testimonios (activos Y pendientes)
      const allTestimonials = await GymTestimonials.findAll({
        where: { 
          name: userName
          // ✅ REMOVIDO: isActive: true - Ahora mostrar todos
        },
        order: [['created_at', 'DESC']] // Más recientes primero
      });

      const formattedTestimonials = allTestimonials.map(t => ({
        id: t.id,
        text: t.text,
        rating: t.rating,
        role: t.role,
        // ✅ NUEVO: Estado dinámico basado en isActive
        status: t.isActive ? 'Publicado' : 'En revisión',
        featured: t.isFeatured,
        submittedAt: t.created_at,
        publishedAt: t.isActive ? t.updated_at : null,
        canEdit: false,     // ✅ Nunca editable
        canDelete: false    // ✅ Nunca eliminable
      }));

      // ✅ NUEVO: Calcular estadísticas
      const publishedCount = allTestimonials.filter(t => t.isActive).length;
      const pendingCount = allTestimonials.filter(t => !t.isActive).length;

      console.log(`💬 Encontrados: ${publishedCount} publicados, ${pendingCount} pendientes para ${userName}`);

      res.json({
        success: true,
        data: {
          testimonials: formattedTestimonials,
          total: formattedTestimonials.length,
          publishedCount,
          pendingCount,
          hasActiveTestimonial: publishedCount > 0,
          hasPendingTestimonial: pendingCount > 0,
          canSubmitNew: true, // ✅ SIEMPRE puede enviar más testimonios
          thankYouMessage: pendingCount > 0 ? 
            `¡Gracias por tus ${allTestimonials.length} testimonios! ${pendingCount} están en revisión.` :
            publishedCount > 0 ? 
            `¡Gracias por tus ${publishedCount} testimonios publicados!` : 
            "Comparte tu experiencia con Elite Fitness y ayuda a otros a conocer nuestros servicios."
        }
      });

    } catch (error) {
      console.error('❌ Error al obtener testimonios del usuario:', error);
      console.error('📋 Stack trace completo:', error.stack);
      
      res.status(500).json({
        success: false,
        message: 'Error al obtener testimonios',
        error: error.message
      });
    }
  }

  // ✅ ADMIN: Obtener testimonios pendientes (sin cambios)
  async getPendingTestimonials(req, res) {
    try {
      const testimonials = await GymTestimonials.findAll({
        where: { isActive: false },
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          testimonials: testimonials.map(t => ({
            id: t.id,
            name: t.name,
            role: t.role,
            text: t.text,
            rating: t.rating,
            submittedAt: t.created_at,
            status: 'Pendiente de aprobación'
          })),
          total: testimonials.length
        }
      });

    } catch (error) {
      console.error('Error al obtener testimonios pendientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener testimonios pendientes',
        error: error.message
      });
    }
  }

  // ✅ ADMIN: Aprobar testimonio (sin cambios)
  async approveTestimony(req, res) {
    try {
      const { id } = req.params;
      const { featured = false, displayOrder } = req.body;

      const testimonial = await GymTestimonials.findByPk(id);

      if (!testimonial) {
        return res.status(404).json({
          success: false,
          message: 'Testimonio no encontrado'
        });
      }

      // Aprobar testimonio
      testimonial.isActive = true;
      testimonial.isFeatured = featured;

      if (displayOrder !== undefined) {
        testimonial.displayOrder = displayOrder;
      }

      await testimonial.save();

      console.log(`✅ Admin ${req.user.firstName} ${req.user.lastName} aprobó testimonio de ${testimonial.name} (ID: ${id})`);

      res.json({
        success: true,
        message: 'Testimonio aprobado y publicado exitosamente',
        data: {
          testimonial: {
            id: testimonial.id,
            name: testimonial.name,
            status: 'Publicado',
            featured: testimonial.isFeatured,
            publishedAt: testimonial.updated_at
          }
        }
      });

    } catch (error) {
      console.error('Error al aprobar testimonio:', error);
      res.status(500).json({
        success: false,
        message: 'Error al aprobar testimonio',
        error: error.message
      });
    }
  }

  // ✅ ADMIN: Marcar como no público
  async markAsNotPublic(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const testimonial = await GymTestimonials.findByPk(id);

      if (!testimonial) {
        return res.status(404).json({
          success: false,
          message: 'Testimonio no encontrado'
        });
      }

      // NO cambiar isActive (se queda en false)
      // El cliente nunca sabrá que no fue aprobado

      res.json({
        success: true,
        message: 'Testimonio marcado como no público. El cliente mantuvo una experiencia positiva.',
        data: {
          testimonial: {
            id: testimonial.id,
            name: testimonial.name,
            status: 'No público - Guardado para análisis',
            reason: reason || 'No especificada',
            note: 'El cliente sigue viendo el testimonio como "En revisión"',
            customerExperience: 'Positiva - Cliente no sabe que fue rechazado'
          }
        }
      });

    } catch (error) {
      console.error('Error al marcar testimonio como no público:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar testimonio',
        error: error.message
      });
    }
  }

  // ✅ ADMIN: Ver testimonios para análisis
  async getTestimonialsForAnalysis(req, res) {
    try {
      const testimonials = await GymTestimonials.findAll({
        where: { isActive: false },
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          testimonials: testimonials.map(t => ({
            id: t.id,
            name: t.name,
            role: t.role,
            text: t.text,
            rating: t.rating,
            submittedAt: t.created_at,
            status: 'No publicado - Disponible para análisis',
            customerExperience: 'Positiva - Cliente ve testimonio como "En revisión"'
          })),
          total: testimonials.length,
          purpose: 'Análisis para mejoras del servicio',
          note: 'Los clientes ven estos testimonios como "En revisión" independientemente de si serán aprobados'
        }
      });

    } catch (error) {
      console.error('Error al obtener testimonios para análisis:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener testimonios para análisis',
        error: error.message
      });
    }
  }

  // ✅ ADMIN: Estadísticas
  async getTestimonialStats(req, res) {
    try {
      const [total, published, pending] = await Promise.all([
        GymTestimonials.count(),
        GymTestimonials.count({ where: { isActive: true } }),
        GymTestimonials.count({ where: { isActive: false } })
      ]);

      const avgRating = await GymTestimonials.findAll({
        attributes: [
          [GymTestimonials.sequelize.fn('AVG', GymTestimonials.sequelize.col('rating')), 'avgRating']
        ],
        where: { isActive: true }
      });

      // ✅ NUEVO: Estadísticas por usuario
      const uniqueUsers = await GymTestimonials.findAll({
        attributes: ['name'],
        group: ['name']
      });

      const totalUniqueUsers = uniqueUsers.length;
      const avgTestimonialsPerUser = totalUniqueUsers > 0 ? (total / totalUniqueUsers).toFixed(1) : 0;

      res.json({
        success: true,
        data: {
          summary: {
            total,
            published,
            pending,
            totalUniqueUsers,
            avgTestimonialsPerUser,
            averageRating: parseFloat(avgRating[0]?.dataValues?.avgRating || 0).toFixed(1)
          },
          percentages: {
            publishedRate: total > 0 ? ((published / total) * 100).toFixed(1) + '%' : '0%',
            pendingRate: total > 0 ? ((pending / total) * 100).toFixed(1) + '%' : '0%'
          },
          insights: {
            allowsMultipleTestimonials: true,
            needsAttention: pending > 10,
            goodRating: parseFloat(avgRating[0]?.dataValues?.avgRating || 0) >= 4.0,
            hasAnalysisData: pending > 0,
            positiveCustomerExperience: true
          },
          customerExperience: {
            note: 'Los clientes pueden enviar múltiples testimonios y ven todos sus testimonios (publicados y en revisión)',
            approach: 'Los testimonios no publicados aparecen como "En revisión" para mantener experiencia positiva'
          }
        }
      });

    } catch (error) {
      console.error('Error al obtener estadísticas de testimonios:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }
}

module.exports = new TestimonialController();