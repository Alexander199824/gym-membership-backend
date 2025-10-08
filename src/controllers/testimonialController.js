// src/controllers/testimonialController.js - COMPLETO CON TODAS LAS FUNCIONALIDADES
const { GymTestimonials, User } = require('../models');
const { Op } = require('sequelize');

class TestimonialController {

  // ========== FUNCIONALIDAD EXISTENTE (CLIENTES) ==========

  // Crear testimonio (clientes)
  async createTestimony(req, res) {
    try {
      const { text, rating, role } = req.body;
      const userId = req.user.id;
      const userName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 
                       req.user.email || 
                       `Usuario ${req.user.id}`;

      if (req.user.role !== 'cliente') {
        return res.status(403).json({
          success: false,
          message: 'Solo los clientes pueden enviar testimonios'
        });
      }

      const testimonial = await GymTestimonials.create({
        name: userName,
        role: role || 'Miembro',
        text,
        rating,
        imageUrl: '',
        isFeatured: false,
        isActive: false,
        displayOrder: 999
      });

      console.log(`Cliente ${userName} envió nuevo testimonio (ID: ${testimonial.id})`);

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

  // Ver mis testimonios (clientes)
  async getMyTestimonials(req, res) {
    try {
      const userName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 
                       req.user.email || 
                       `Usuario ${req.user.id}`;

      console.log(`Buscando TODOS los testimonios para usuario: ${userName} (ID: ${req.user.id})`);

      const allTestimonials = await GymTestimonials.findAll({
        where: { name: userName },
        order: [['created_at', 'DESC']]
      });

      const formattedTestimonials = allTestimonials.map(t => ({
        id: t.id,
        text: t.text,
        rating: t.rating,
        role: t.role,
        status: t.isActive ? 'Publicado' : 'En revisión',
        featured: t.isFeatured,
        submittedAt: t.created_at,
        publishedAt: t.isActive ? t.updated_at : null,
        canEdit: false,
        canDelete: false
      }));

      const publishedCount = allTestimonials.filter(t => t.isActive).length;
      const pendingCount = allTestimonials.filter(t => !t.isActive).length;

      console.log(`Encontrados: ${publishedCount} publicados, ${pendingCount} pendientes para ${userName}`);

      res.json({
        success: true,
        data: {
          testimonials: formattedTestimonials,
          total: formattedTestimonials.length,
          publishedCount,
          pendingCount,
          hasActiveTestimonial: publishedCount > 0,
          hasPendingTestimonial: pendingCount > 0,
          canSubmitNew: true,
          thankYouMessage: pendingCount > 0 ? 
            `¡Gracias por tus ${allTestimonials.length} testimonios! ${pendingCount} están en revisión.` :
            publishedCount > 0 ? 
            `¡Gracias por tus ${publishedCount} testimonios publicados!` : 
            "Comparte tu experiencia con Elite Fitness y ayuda a otros a conocer nuestros servicios."
        }
      });

    } catch (error) {
      console.error('Error al obtener testimonios del usuario:', error);
      console.error('Stack trace completo:', error.stack);
      
      res.status(500).json({
        success: false,
        message: 'Error al obtener testimonios',
        error: error.message
      });
    }
  }

  // ========== FUNCIONALIDAD EXISTENTE (ADMIN - GESTIÓN) ==========

  // Ver testimonios pendientes (admin)
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

  // Aprobar testimonio (admin)
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

      testimonial.isActive = true;
      testimonial.isFeatured = featured;

      if (displayOrder !== undefined) {
        testimonial.displayOrder = displayOrder;
      }

      await testimonial.save();

      console.log(`Admin ${req.user.firstName} ${req.user.lastName} aprobó testimonio de ${testimonial.name} (ID: ${id})`);

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

  // Marcar como no público (admin)
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

  // Ver testimonios para análisis (admin)
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

  // Estadísticas (admin)
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

      const uniqueUsers = await GymTestimonials.findAll({
        attributes: ['name'],
        group: ['name']
      });

      const totalUniqueUsers = uniqueUsers.length;
      const avgTestimonialsPerUser = totalUniqueUsers > 0 ? (total / totalUniqueUsers).toFixed(1) : 0;

      // Contar destacados
      const featured = await GymTestimonials.count({ 
        where: { 
          isActive: true,
          isFeatured: true 
        } 
      });

      // Distribución por rating
      const ratingDistribution = await GymTestimonials.findAll({
        attributes: [
          'rating',
          [GymTestimonials.sequelize.fn('COUNT', GymTestimonials.sequelize.col('rating')), 'count']
        ],
        where: { isActive: true },
        group: ['rating'],
        order: [['rating', 'DESC']],
        raw: true
      });

      const averageRating = parseFloat(avgRating[0]?.dataValues?.avgRating || 0).toFixed(1);

      res.json({
        success: true,
        data: {
          summary: {
            total,
            published,
            pending,
            featured,
            totalUniqueUsers,
            avgTestimonialsPerUser,
            averageRating
          },
          percentages: {
            publishedRate: total > 0 ? ((published / total) * 100).toFixed(1) + '%' : '0%',
            pendingRate: total > 0 ? ((pending / total) * 100).toFixed(1) + '%' : '0%',
            featuredRate: published > 0 ? ((featured / published) * 100).toFixed(1) + '%' : '0%'
          },
          ratingDistribution: ratingDistribution.map(r => ({
            rating: r.rating,
            count: parseInt(r.count)
          })),
          insights: {
            allowsMultipleTestimonials: true,
            needsAttention: pending > 10,
            goodRating: parseFloat(averageRating) >= 4.0,
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

  // ========== NUEVAS FUNCIONES CRUD (ADMIN) ==========

  // LISTAR TODOS con filtros y paginación (Admin)
  async getAllTestimonials(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        isActive, 
        isFeatured,
        minRating,
        search,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }
      if (isFeatured !== undefined) {
        where.isFeatured = isFeatured === 'true';
      }
      if (minRating) {
        where.rating = { [Op.gte]: parseInt(minRating) };
      }
      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { role: { [Op.like]: `%${search}%` } },
          { text: { [Op.like]: `%${search}%` } }
        ];
      }

      // Mapear campos camelCase a snake_case para la BD
      const fieldMapping = {
        'createdAt': 'created_at',
        'updatedAt': 'updated_at',
        'displayOrder': 'display_order',
        'isFeatured': 'is_featured',
        'isActive': 'is_active',
        'name': 'name',
        'rating': 'rating'
      };

      const dbSortField = fieldMapping[sortBy] || sortBy;
      
      let orderClause = [[dbSortField, sortOrder]];
      if (sortBy !== 'displayOrder') {
        orderClause.unshift(['is_featured', 'DESC'], ['display_order', 'ASC']);
      }

      const { count, rows } = await GymTestimonials.findAndCountAll({
        where,
        order: orderClause,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      const totalPages = Math.ceil(count / limit);

      res.json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Error al obtener testimonios:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener testimonios',
        error: error.message
      });
    }
  }

  // OBTENER POR ID (Admin)
  async getTestimonialById(req, res) {
    try {
      const { id } = req.params;

      const testimonial = await GymTestimonials.findByPk(id);

      if (!testimonial) {
        return res.status(404).json({
          success: false,
          message: 'Testimonio no encontrado'
        });
      }

      res.json({
        success: true,
        data: testimonial
      });
    } catch (error) {
      console.error('Error al obtener testimonio:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener testimonio',
        error: error.message
      });
    }
  }

  // CREAR TESTIMONIO ADMIN (Admin) - Directamente aprobado
  async createTestimonialAdmin(req, res) {
    try {
      const {
        name,
        role,
        text,
        rating,
        imageUrl,
        isFeatured,
        isActive,
        displayOrder
      } = req.body;

      if (!name || !text) {
        return res.status(400).json({
          success: false,
          message: 'Nombre y texto son requeridos'
        });
      }

      if (rating && (rating < 1 || rating > 5)) {
        return res.status(400).json({
          success: false,
          message: 'El rating debe estar entre 1 y 5'
        });
      }

      const testimonial = await GymTestimonials.create({
        name,
        role: role || 'Miembro',
        text,
        rating: rating || 5,
        imageUrl: imageUrl || '',
        isFeatured: isFeatured || false,
        isActive: isActive !== false,
        displayOrder: displayOrder || 0
      });

      console.log(`Admin ${req.user.firstName} ${req.user.lastName} creó testimonio (ID: ${testimonial.id})`);

      res.status(201).json({
        success: true,
        message: 'Testimonio creado exitosamente',
        data: testimonial
      });
    } catch (error) {
      console.error('Error al crear testimonio:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear testimonio',
        error: error.message
      });
    }
  }

  // ACTUALIZAR TESTIMONIO (Admin)
  async updateTestimonial(req, res) {
    try {
      const { id } = req.params;
      const {
        name,
        role,
        text,
        rating,
        imageUrl,
        isFeatured,
        isActive,
        displayOrder
      } = req.body;

      const testimonial = await GymTestimonials.findByPk(id);

      if (!testimonial) {
        return res.status(404).json({
          success: false,
          message: 'Testimonio no encontrado'
        });
      }

      if (rating !== undefined && (rating < 1 || rating > 5)) {
        return res.status(400).json({
          success: false,
          message: 'El rating debe estar entre 1 y 5'
        });
      }

      if (name !== undefined) testimonial.name = name;
      if (role !== undefined) testimonial.role = role;
      if (text !== undefined) testimonial.text = text;
      if (rating !== undefined) testimonial.rating = rating;
      if (imageUrl !== undefined) testimonial.imageUrl = imageUrl;
      if (isFeatured !== undefined) testimonial.isFeatured = isFeatured;
      if (isActive !== undefined) testimonial.isActive = isActive;
      if (displayOrder !== undefined) testimonial.displayOrder = displayOrder;

      await testimonial.save();

      console.log(`Admin ${req.user.firstName} ${req.user.lastName} actualizó testimonio (ID: ${id})`);

      res.json({
        success: true,
        message: 'Testimonio actualizado exitosamente',
        data: testimonial
      });
    } catch (error) {
      console.error('Error al actualizar testimonio:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar testimonio',
        error: error.message
      });
    }
  }

  // ELIMINAR TESTIMONIO (Admin)
  async deleteTestimonial(req, res) {
    try {
      const { id } = req.params;

      const testimonial = await GymTestimonials.findByPk(id);

      if (!testimonial) {
        return res.status(404).json({
          success: false,
          message: 'Testimonio no encontrado'
        });
      }

      const testimonialName = testimonial.name;
      await testimonial.destroy();

      console.log(`Admin ${req.user.firstName} ${req.user.lastName} eliminó testimonio de ${testimonialName} (ID: ${id})`);

      res.json({
        success: true,
        message: 'Testimonio eliminado exitosamente',
        data: { id, name: testimonialName }
      });
    } catch (error) {
      console.error('Error al eliminar testimonio:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar testimonio',
        error: error.message
      });
    }
  }

  // TOGGLE ACTIVO/INACTIVO (Admin)
  async toggleActive(req, res) {
    try {
      const { id } = req.params;

      const testimonial = await GymTestimonials.findByPk(id);

      if (!testimonial) {
        return res.status(404).json({
          success: false,
          message: 'Testimonio no encontrado'
        });
      }

      testimonial.isActive = !testimonial.isActive;
      await testimonial.save();

      console.log(`Admin ${req.user.firstName} ${req.user.lastName} ${testimonial.isActive ? 'activó' : 'desactivó'} testimonio (ID: ${id})`);

      res.json({
        success: true,
        message: `Testimonio ${testimonial.isActive ? 'activado' : 'desactivado'} exitosamente`,
        data: {
          id: testimonial.id,
          name: testimonial.name,
          isActive: testimonial.isActive
        }
      });
    } catch (error) {
      console.error('Error al cambiar estado del testimonio:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cambiar estado del testimonio',
        error: error.message
      });
    }
  }

  // TOGGLE DESTACADO (Admin)
  async toggleFeatured(req, res) {
    try {
      const { id } = req.params;

      const testimonial = await GymTestimonials.findByPk(id);

      if (!testimonial) {
        return res.status(404).json({
          success: false,
          message: 'Testimonio no encontrado'
        });
      }

      testimonial.isFeatured = !testimonial.isFeatured;
      await testimonial.save();

      console.log(`Admin ${req.user.firstName} ${req.user.lastName} ${testimonial.isFeatured ? 'marcó como destacado' : 'desmarcó'} testimonio (ID: ${id})`);

      res.json({
        success: true,
        message: `Testimonio ${testimonial.isFeatured ? 'marcado como destacado' : 'desmarcado'}`,
        data: {
          id: testimonial.id,
          name: testimonial.name,
          isFeatured: testimonial.isFeatured
        }
      });
    } catch (error) {
      console.error('Error al cambiar estado destacado:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cambiar estado destacado',
        error: error.message
      });
    }
  }

  // REORDENAR TESTIMONIOS (Admin)
  async reorderTestimonials(req, res) {
    try {
      const { testimonials } = req.body;

      if (!Array.isArray(testimonials)) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un array de testimonios con {id, displayOrder}'
        });
      }

      const updatePromises = testimonials.map(item =>
        GymTestimonials.update(
          { displayOrder: item.displayOrder },
          { where: { id: item.id } }
        )
      );

      await Promise.all(updatePromises);

      console.log(`Admin ${req.user.firstName} ${req.user.lastName} reordenó ${testimonials.length} testimonios`);

      res.json({
        success: true,
        message: 'Testimonios reordenados exitosamente',
        data: { updated: testimonials.length }
      });
    } catch (error) {
      console.error('Error al reordenar testimonios:', error);
      res.status(500).json({
        success: false,
        message: 'Error al reordenar testimonios',
        error: error.message
      });
    }
  }

  // ========== ENDPOINTS PÚBLICOS ==========

  // Obtener testimonios activos (público)
  async getActiveTestimonials(req, res) {
    try {
      const { limit } = req.query;
      
      const query = {
        where: { isActive: true },
        order: [
          ['is_featured', 'DESC'],
          ['display_order', 'ASC'],
          ['created_at', 'DESC']
        ]
      };

      if (limit) {
        query.limit = parseInt(limit);
      }

      const testimonials = await GymTestimonials.findAll(query);

      const formattedTestimonials = testimonials.map(testimonial => ({
        id: testimonial.id,
        name: testimonial.name,
        role: testimonial.role || 'Miembro',
        text: testimonial.text,
        rating: testimonial.rating,
        image: {
          url: testimonial.imageUrl || "",
          alt: testimonial.name,
          cloudinaryPublicId: testimonial.imageUrl 
            ? testimonial.imageUrl.split('/').pop().split('.')[0] 
            : ""
        },
        verified: true,
        isFeatured: testimonial.isFeatured,
        date: testimonial.created_at instanceof Date 
          ? testimonial.created_at.toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      }));

      res.json({
        success: true,
        data: formattedTestimonials,
        total: formattedTestimonials.length
      });
    } catch (error) {
      console.error('Error al obtener testimonios activos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener testimonios activos',
        error: error.message
      });
    }
  }

  // Obtener testimonios destacados (público)
  async getFeaturedTestimonials(req, res) {
    try {
      const { limit = 3 } = req.query;

      const testimonials = await GymTestimonials.findAll({
        where: { 
          isActive: true, 
          isFeatured: true 
        },
        order: [['display_order', 'ASC']],
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: testimonials,
        total: testimonials.length
      });
    } catch (error) {
      console.error('Error al obtener testimonios destacados:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener testimonios destacados',
        error: error.message
      });
    }
  }
}

module.exports = new TestimonialController();