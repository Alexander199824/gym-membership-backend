// src/controllers/testimonialController.js - NUEVO ARCHIVO (SIN modificar modelo)
const { GymTestimonials, User } = require('../models');
const { Op } = require('sequelize');

class TestimonialController {

  // ✅ Crear testimonio (solo clientes autenticados)
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

      // Verificar si ya tiene un testimonio (activo o pendiente)
      const existingTestimonial = await GymTestimonials.findOne({
        where: { name: userName }
      });

      if (existingTestimonial) {
        return res.status(400).json({
          success: false,
          message: '¡Gracias por tu interés! Ya has compartido tu experiencia con nosotros.',
          data: {
            thankYouMessage: '¡Valoramos mucho tu opinión y la tenemos en cuenta para seguir mejorando!'
          }
        });
      }

      // Crear testimonio con isActive: false (pendiente hasta aprobación)
      const testimonial = await GymTestimonials.create({
        name: userName,
        role: role || 'Miembro',
        text,
        rating,
        imageUrl: '', // Vacío por defecto
        isFeatured: false,
        isActive: false, // ✅ Pendiente hasta que admin apruebe (CAMPO EXISTENTE)
        displayOrder: 999 // Al final hasta que admin lo ordene
      });

      console.log(`📝 Cliente ${userName} envió testimonio (ID: ${testimonial.id})`);

      res.status(201).json({
        success: true,
        message: '¡Gracias por compartir tu experiencia! Tu testimonio es muy importante para nosotros.',
        data: {
          thankYouMessage: '¡Valoramos tu opinión y la utilizaremos para seguir brindando el mejor servicio!',
          testimonial: {
            id: testimonial.id,
            rating: testimonial.rating,
            submittedAt: testimonial.createdAt
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

  // ✅ Ver mis testimonios (cliente) - Solo mostrar los activos
  async getMyTestimonials(req, res) {
    try {

        

      const userName = req.user.firstName();

      // Buscar testimonios del usuario por nombre (solo activos - los publicados)
      const testimonials = await GymTestimonials.findAll({
        where: { 
          name: userName,
          isActive: true  // ✅ Solo mostrar los que están publicados
        },
        order: [['createdAt', 'DESC']]
      });

      const formattedTestimonials = testimonials.map(t => ({
        id: t.id,
        text: t.text,
        rating: t.rating,
        role: t.role,
        status: 'Publicado',
        featured: t.isFeatured,
        submittedAt: t.createdAt,
        publishedAt: t.updatedAt,
        canEdit: false,     // No editable una vez publicado
        canDelete: false    // No eliminable una vez publicado
      }));

      // Verificar si tiene algún testimonio pendiente
      const pendingCount = await GymTestimonials.count({
        where: { 
          name: userName,
          isActive: false
        }
      });

      res.json({
        success: true,
        data: {
          testimonials: formattedTestimonials,
          total: formattedTestimonials.length,
          hasActiveTestimonial: testimonials.length > 0,
          hasPendingTestimonial: pendingCount > 0,
          canSubmitNew: testimonials.length === 0 && pendingCount === 0,
          thankYouMessage: pendingCount > 0 ? 
            "¡Gracias por tu testimonio! Estamos revisando tu comentario." :
            formattedTestimonials.length > 0 ? 
            "¡Gracias por compartir tu experiencia! Tu testimonio está publicado." : 
            "Comparte tu experiencia con Elite Fitness y ayuda a otros a conocer nuestros servicios."
        }
      });

    } catch (error) {
      console.error('Error al obtener testimonios del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener testimonios',
        error: error.message
      });
    }
  }

  // ✅ ADMIN: Obtener testimonios pendientes (isActive: false)
  async getPendingTestimonials(req, res) {
    try {
      const testimonials = await GymTestimonials.findAll({
        where: { isActive: false },
        order: [['createdAt', 'DESC']]
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
            submittedAt: t.createdAt,
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

  // ✅ ADMIN: Aprobar testimonio (cambiar isActive a true)
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
      testimonial.isActive = true;      // ✅ PUBLICAR (campo existente)
      testimonial.isFeatured = featured;

      if (displayOrder !== undefined) {
        testimonial.displayOrder = displayOrder;
      }

      await testimonial.save();

      console.log(`✅ Admin ${req.user.firstName()} aprobó testimonio de ${testimonial.name} (ID: ${id})`);

      res.json({
        success: true,
        message: 'Testimonio aprobado y publicado exitosamente',
        data: {
          testimonial: {
            id: testimonial.id,
            name: testimonial.name,
            status: 'Publicado',
            featured: testimonial.isFeatured,
            publishedAt: testimonial.updatedAt
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

  // ✅ ADMIN: Marcar como no público (NO publicar - dejar isActive: false)
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
            note: 'El cliente no verá que su testimonio no fue publicado',
            customerExperience: 'Positiva - Cliente solo recibió agradecimiento'
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

  // ✅ ADMIN: Ver testimonios no publicados (para análisis)
  async getTestimonialsForAnalysis(req, res) {
    try {
      // Obtener testimonios con isActive: false que no han sido aprobados
      // (son los que se crearon pero nunca se aprobaron)
      const testimonials = await GymTestimonials.findAll({
        where: { isActive: false },
        order: [['createdAt', 'DESC']]
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
            submittedAt: t.createdAt,
            status: 'No publicado - Disponible para análisis',
            customerExperience: 'Positiva - Cliente recibió agradecimiento por su participación'
          })),
          total: testimonials.length,
          purpose: 'Análisis para mejoras del servicio',
          note: 'Estos comentarios son valiosos para identificar áreas de mejora'
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

  // ✅ ADMIN: Estadísticas de testimonios
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

      res.json({
        success: true,
        data: {
          summary: {
            total,
            published,
            pending,
            notPublished: pending, // Los que no se publicaron
            averageRating: parseFloat(avgRating[0]?.dataValues?.avgRating || 0).toFixed(1)
          },
          percentages: {
            publishedRate: total > 0 ? ((published / total) * 100).toFixed(1) + '%' : '0%',
            pendingRate: total > 0 ? ((pending / total) * 100).toFixed(1) + '%' : '0%'
          },
          insights: {
            needsAttention: pending > 5,
            goodRating: parseFloat(avgRating[0]?.dataValues?.avgRating || 0) >= 4.0,
            hasAnalysisData: pending > 0,
            positiveCustomerExperience: true // Siempre verdadero con este sistema
          },
          customerExperience: {
            note: 'Todos los clientes reciben una experiencia positiva independientemente del estado de su testimonio',
            approach: 'Los testimonios no publicados están disponibles para análisis sin que el cliente lo sepa'
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