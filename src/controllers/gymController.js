// src/controllers/gymController.js - COMPLETO: Controller con todas las extensiones integradas

const { 
  GymConfiguration, 
  GymContactInfo, 
  GymHours, 
  GymStatistics, 
  GymServices, 
  MembershipPlans,
  GymTestimonials,
  GymSocialMedia,
  GymSectionsContent,
  GymNavigation,
  GymPromotionalContent,
  GymFormsConfig,
  GymSystemMessages,
  GymBrandingConfig,
  StoreProduct,
  GymTimeSlots
} = require('../models');

class GymController {
  constructor() {
    // ✅ BINDEAR todos los métodos al contexto de la clase (EXISTENTES)
    this.getGymConfig = this.getGymConfig.bind(this);
    this.getLandingContent = this.getLandingContent.bind(this);
    this.getServices = this.getServices.bind(this);
    this.getTestimonials = this.getTestimonials.bind(this);
    this.getStatistics = this.getStatistics.bind(this);
    this.getBrandingTheme = this.getBrandingTheme.bind(this);
    this.getActivePromotions = this.getActivePromotions.bind(this);
    this.getGymInfo = this.getGymInfo.bind(this);
    this.updateConfiguration = this.updateConfiguration.bind(this);
    this.initializeDefaultData = this.initializeDefaultData.bind(this);
    this.getContactInfo = this.getContactInfo.bind(this);
    this.getHours = this.getHours.bind(this);
    this.getMembershipPlans = this.getMembershipPlans.bind(this);
    
    // ✅ BINDEAR todos los métodos NUEVOS agregados
    this.getGymConfigForEditor = this.getGymConfigForEditor.bind(this);
    this.updateFlexibleSchedule = this.updateFlexibleSchedule.bind(this);
    this.getCapacityMetrics = this.getCapacityMetrics.bind(this);
    this.toggleDayOpen = this.toggleDayOpen.bind(this);
    this.addTimeSlot = this.addTimeSlot.bind(this);
    this.removeTimeSlot = this.removeTimeSlot.bind(this);
    this.updateTimeSlot = this.updateTimeSlot.bind(this);
    this.duplicateTimeSlot = this.duplicateTimeSlot.bind(this);
    this.applyCapacityToAllSlots = this.applyCapacityToAllSlots.bind(this);
    this.generateHoursString = this.generateHoursString.bind(this);
  }

  // ✅ ENDPOINT: /api/gym/config - VERSIÓN EXTENDIDA con soporte flexible
  async getGymConfig(req, res) {
    try {
      const [
        configuration,
        contactInfo,
        hours,
        socialMedia
      ] = await Promise.all([
        GymConfiguration.getConfig(),
        GymContactInfo.getContactInfo(),
        // ✅ DECISIÓN: Usar horarios flexibles o tradicionales según configuración
        req.query.flexible === 'true' 
          ? GymHours.getFlexibleSchedule() 
          : GymHours.getWeeklySchedule(),
        GymSocialMedia.getSocialMediaObject()
      ]);

      // ✅ Leer URLs reales de la BD
      const logoUrl = configuration.logoUrl || '';
      const heroVideoUrl = configuration.heroVideoUrl || '';
      const heroImageUrl = configuration.heroImageUrl || '';
      
      // ✅ Determinar tipo de imagen
      const isImageFromPoster = heroImageUrl && heroImageUrl.includes('so_0');
      const hasCustomImage = heroImageUrl && !isImageFromPoster;
      
      const response = {
        name: configuration.gymName,
        description: configuration.gymDescription,
        tagline: configuration.gymTagline,
        
        logo: {
          url: logoUrl,
          alt: `${configuration.gymName} Logo`,
          width: 200,
          height: 80
        },
        
        contact: {
          address: contactInfo.address || '',
          phone: contactInfo.phone || '',
          email: contactInfo.email || '',
          whatsapp: contactInfo.phone || ''
        },
        
        // ✅ Horarios adaptativos
        hours: req.query.flexible === 'true' ? {
          ...hours,
          full: this.generateHoursString(hours)
        } : {
          full: "Lun-Vie 5:00-22:00, Sáb-Dom 6:00-20:00",
          weekdays: "5:00-22:00",
          weekends: "6:00-20:00"
        },
        
        social: socialMedia,
        
        // ✅ HERO: Toda la información multimedia SOLO AQUÍ
        hero: {
          title: configuration.heroTitle || configuration.gymName,
          description: configuration.heroDescription || configuration.gymDescription,
          ctaText: "Comienza Hoy",
          ctaButtons: [
            {
              text: "Primera Semana GRATIS",
              type: "primary",
              action: "register",
              icon: "gift"
            },
            {
              text: "Ver Tienda",
              type: "secondary",
              action: "store",
              icon: "shopping-cart"
            }
          ],
          
          // 🎬 URLs SOLO UNA VEZ cada una
          videoUrl: heroVideoUrl,           
          imageUrl: heroImageUrl,           
          hasVideo: !!heroVideoUrl,         
          hasImage: !!heroImageUrl,         
          
          // ✅ Configuración de video (solo si hay video)
          videoConfig: heroVideoUrl ? {
            autoplay: configuration.videoAutoplay || false,
            muted: configuration.videoMuted !== false,
            loop: configuration.videoLoop !== false,
            controls: configuration.videoControls !== false,
            posterUrl: heroImageUrl || ''
          } : null
        },
        
        // ✅ ESTADOS GENERALES: Solo booleans, no URLs
        multimedia: {
          hasLogo: !!logoUrl,
          hasVideo: !!heroVideoUrl,
          hasHeroImage: !!heroImageUrl,
          hasAnyMedia: !!(logoUrl || heroVideoUrl || heroImageUrl),
          imageType: hasCustomImage ? 'custom' : (isImageFromPoster ? 'poster' : 'none')
        }
      };

      res.json({
        success: true,
        data: response,
        message: "Configuración obtenida exitosamente",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error en getGymConfig:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener configuración del gym',
        error: error.message
      });
    }
  }

  // ✅ NUEVO: Obtener configuración completa para ContentEditor
  async getGymConfigForEditor(req, res) {
    try {
      const [
        configuration,
        contactInfo,
        hours,
        socialMedia,
        stats
      ] = await Promise.all([
        GymConfiguration.getConfig(),
        GymContactInfo.getContactInfo(),
        GymHours.getFlexibleSchedule(), // ✅ Usar horarios flexibles
        GymSocialMedia.getSocialMediaObject(),
        GymStatistics.getActiveStats()
      ]);

      // ✅ Formatear estadísticas
      const formattedStats = {
        members: 500,
        trainers: 8,
        experience: 10,
        satisfaction: 95
      };

      if (stats && stats.length > 0) {
        stats.forEach(stat => {
          switch(stat.statKey) {
            case 'members_count':
              formattedStats.members = parseInt(stat.statValue.replace(/\D/g, '')) || 500;
              break;
            case 'trainers_count':
              formattedStats.trainers = parseInt(stat.statValue.replace(/\D/g, '')) || 8;
              break;
            case 'experience_years':
              formattedStats.experience = parseInt(stat.statValue.replace(/\D/g, '')) || 10;
              break;
            case 'satisfaction_rate':
              formattedStats.satisfaction = parseInt(stat.statValue.replace(/\D/g, '')) || 95;
              break;
          }
        });
      }

      // ✅ Estructura exacta que espera ContentEditor.js
      const response = {
        data: {
          name: configuration.gymName,
          tagline: configuration.gymTagline || 'Tu mejor versión te espera',
          description: configuration.gymDescription,
          
          contact: {
            phone: contactInfo.phone || '+502 1234-5678',
            email: contactInfo.email || 'info@elitegym.com',
            address: contactInfo.address || 'Avenida Principal 123',
            city: contactInfo.city || 'Guatemala',
            zipCode: contactInfo.zipCode || '01001'
          },
          
          social: {
            facebook: { 
              url: socialMedia.facebook?.url || 'https://facebook.com/gym', 
              active: socialMedia.facebook?.active !== false 
            },
            instagram: { 
              url: socialMedia.instagram?.url || 'https://instagram.com/gym', 
              active: socialMedia.instagram?.active !== false 
            },
            twitter: { 
              url: socialMedia.twitter?.url || 'https://twitter.com/gym', 
              active: socialMedia.twitter?.active !== false 
            },
            youtube: { 
              url: socialMedia.youtube?.url || 'https://youtube.com/@gym', 
              active: socialMedia.youtube?.active !== false 
            },
            whatsapp: { 
              url: socialMedia.whatsapp?.url || 'https://wa.me/502XXXXXXXX', 
              active: socialMedia.whatsapp?.active !== false 
            }
          },
          
          // ✅ ESTRUCTURA CRÍTICA: Horarios flexibles tal como los espera ContentEditor
          hours: {
            ...hours,
            // ✅ Agregar string completo para compatibilidad
            full: this.generateHoursString(hours)
          },
          
          stats: formattedStats
        }
      };

      res.json({
        success: true,
        data: response.data,
        message: "Configuración obtenida exitosamente para editor",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error en getGymConfigForEditor:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener configuración para editor',
        error: error.message
      });
    }
  }

  // ✅ NUEVO: Actualizar horarios flexibles desde ContentEditor
  async updateFlexibleSchedule(req, res) {
    try {
      const { section, data } = req.body;

      if (section !== 'schedule') {
        return res.status(400).json({
          success: false,
          message: 'Esta función solo maneja la sección de horarios'
        });
      }

      const { hours } = data;
      if (!hours) {
        return res.status(400).json({
          success: false,
          message: 'Datos de horarios requeridos'
        });
      }

      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

      // ✅ Procesar cada día
      for (const day of days) {
        if (hours[day] && day !== 'full') {
          const dayData = hours[day];
          
          // Obtener o crear el registro del día
          let daySchedule = await GymHours.findOne({ where: { dayOfWeek: day } });
          if (!daySchedule) {
            daySchedule = await GymHours.create({
              dayOfWeek: day,
              isClosed: !dayData.isOpen,
              useFlexibleSchedule: true
            });
          } else {
            daySchedule.isClosed = !dayData.isOpen;
            daySchedule.useFlexibleSchedule = true;
            await daySchedule.save();
          }

          // ✅ Eliminar franjas existentes para este día
          await GymTimeSlots.update(
            { isActive: false },
            { where: { gymHoursId: daySchedule.id } }
          );

          // ✅ Crear nuevas franjas si el día está abierto
          if (dayData.isOpen && dayData.timeSlots && dayData.timeSlots.length > 0) {
            for (let index = 0; index < dayData.timeSlots.length; index++) {
              const slot = dayData.timeSlots[index];
              
              // Validar capacidad
              if (slot.capacity && (slot.capacity < 1 || slot.capacity > 500)) {
                return res.status(400).json({ 
                  success: false,
                  error: `Capacidad debe estar entre 1 y 500 para ${day}` 
                });
              }

              await GymTimeSlots.create({
                gymHoursId: daySchedule.id,
                openTime: slot.open,
                closeTime: slot.close,
                capacity: slot.capacity || 30,
                currentReservations: slot.reservations || 0,
                slotLabel: slot.label || '',
                displayOrder: index,
                isActive: true
              });
            }
          }
        }
      }

      // ✅ Obtener horarios actualizados
      const updatedSchedule = await GymHours.getFlexibleSchedule();
      const metrics = await GymHours.getCapacityMetrics();

      res.json({
        success: true,
        message: 'Horarios actualizados exitosamente',
        data: {
          hours: {
            ...updatedSchedule,
            full: this.generateHoursString(updatedSchedule)
          },
          metrics
        }
      });
    } catch (error) {
      console.error('Error al actualizar horarios flexibles:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar horarios',
        error: error.message
      });
    }
  }

  // ✅ NUEVO: Obtener métricas de capacidad
  async getCapacityMetrics(req, res) {
    try {
      const metrics = await GymHours.getCapacityMetrics();
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error al obtener métricas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener métricas de capacidad',
        error: error.message
      });
    }
  }

  // ✅ NUEVO: Funciones específicas para cada operación
  async toggleDayOpen(req, res) {
    try {
      const { day } = req.params;
      const updatedDay = await GymHours.toggleDayOpen(day);
      
      res.json({
        success: true,
        message: `Día ${day} ${updatedDay.isClosed ? 'cerrado' : 'abierto'}`,
        data: { day, isOpen: !updatedDay.isClosed }
      });
    } catch (error) {
      console.error('Error al alternar día:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async addTimeSlot(req, res) {
    try {
      const { day } = req.params;
      const slotData = req.body;
      
      const newSlot = await GymHours.addTimeSlot(day, slotData);
      
      res.json({
        success: true,
        message: 'Franja horaria agregada',
        data: { slot: newSlot.toFrontendFormat() }
      });
    } catch (error) {
      console.error('Error al agregar franja:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async removeTimeSlot(req, res) {
    try {
      const { day, slotIndex } = req.params;
      
      const removedSlot = await GymHours.removeTimeSlot(day, parseInt(slotIndex));
      
      res.json({
        success: true,
        message: 'Franja horaria eliminada',
        data: { slotIndex: parseInt(slotIndex) }
      });
    } catch (error) {
      console.error('Error al eliminar franja:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateTimeSlot(req, res) {
    try {
      const { day, slotIndex } = req.params;
      const { field, value } = req.body;
      
      const updatedSlot = await GymHours.updateTimeSlot(day, parseInt(slotIndex), field, value);
      
      res.json({
        success: true,
        message: 'Franja horaria actualizada',
        data: { slot: updatedSlot.toFrontendFormat() }
      });
    } catch (error) {
      console.error('Error al actualizar franja:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async duplicateTimeSlot(req, res) {
    try {
      const { day, slotIndex } = req.params;
      
      const duplicatedSlot = await GymHours.duplicateTimeSlot(day, parseInt(slotIndex));
      
      res.json({
        success: true,
        message: 'Franja horaria duplicada',
        data: { slot: duplicatedSlot.toFrontendFormat() }
      });
    } catch (error) {
      console.error('Error al duplicar franja:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async applyCapacityToAllSlots(req, res) {
    try {
      const { capacity } = req.body;
      
      if (!capacity || capacity < 1 || capacity > 500) {
        return res.status(400).json({
          success: false,
          message: 'La capacidad debe estar entre 1 y 500'
        });
      }
      
      const updatedCount = await GymHours.applyCapacityToAllSlots(capacity);
      
      res.json({
        success: true,
        message: `Capacidad aplicada a todas las franjas`,
        data: { 
          capacity, 
          updatedSlots: updatedCount[0] || 0
        }
      });
    } catch (error) {
      console.error('Error al aplicar capacidad:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // ✅ HELPER: Generar string de horarios para compatibilidad
  generateHoursString(hoursObj) {
    const dayNames = {
      monday: 'Lun',
      tuesday: 'Mar', 
      wednesday: 'Mié',
      thursday: 'Jue',
      friday: 'Vie',
      saturday: 'Sáb',
      sunday: 'Dom'
    };

    const parts = [];
    Object.entries(hoursObj).forEach(([day, data]) => {
      if (day !== 'full' && data.isOpen && data.timeSlots && data.timeSlots.length > 0) {
        const slots = data.timeSlots.map(slot => {
          const slotStr = `${slot.open}-${slot.close}`;
          return slot.label ? `${slotStr} (${slot.label})` : slotStr;
        }).join(', ');
        
        parts.push(`${dayNames[day]}: ${slots}`);
      }
    });

    return parts.join(' | ') || 'Horarios no configurados';
  }

  // ✅ ENDPOINT: /api/content/landing (contenido de la landing page)
  async getLandingContent(req, res) {
    try {
      const sectionsContent = await GymSectionsContent.getAllSectionsContent();

      const response = {
        hero: sectionsContent.hero || {
          title: "Transforma tu cuerpo y mente",
          description: "Únete a Elite Fitness y descubre tu mejor versión...",
          imageUrl: "",
          videoUrl: "",
          ctaText: "Comienza Hoy"
        },
        services: sectionsContent.services || {
          title: "Todo lo que necesitas para alcanzar tus metas",
          subtitle: "Servicios profesionales diseñados para llevarte al siguiente nivel"
        },
        store: sectionsContent.store || {
          title: "Productos premium para tu entrenamiento",
          subtitle: "Descubre nuestra selección de suplementos...",
          benefits: [
            { text: "Envío gratis +Q200", icon: "truck" },
            { text: "Garantía de calidad", icon: "shield" }
          ]
        }
      };

      res.json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Error en getLandingContent:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener contenido de landing',
        error: error.message
      });
    }
  }

  // ✅ ENDPOINT: /api/gym/services (formato esperado por frontend)
  async getServices(req, res) {
    try {
      const services = await GymServices.getActiveServices();
      
      const formattedServices = services.map(service => ({
        id: service.id,
        title: service.title,
        description: service.description,
        icon: service.iconName,
        imageUrl: service.imageUrl || "", // Usar la URL de la BD (vacía por defecto)
        features: service.features || [],
        active: service.isActive,
        order: service.displayOrder
      }));

      res.json({
        success: true,
        data: formattedServices
      });
    } catch (error) {
      console.error('Error en getServices:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener servicios',
        error: error.message
      });
    }
  }

  // ✅ ENDPOINT: /api/gym/testimonials (CORREGIDO - Sin error 500)
  async getTestimonials(req, res) {
    try {
      const testimonials = await GymTestimonials.getActiveTestimonials();
      
      // ✅ CORRECCIÓN PRINCIPAL: Manejo seguro de campos undefined/null
      const formattedTestimonials = testimonials.map(testimonial => {
        // Manejo seguro de fechas
        let createdAt;
        try {
          createdAt = testimonial.createdAt || testimonial.created_at || new Date();
          if (typeof createdAt === 'string') {
            createdAt = new Date(createdAt);
          }
        } catch (dateError) {
          createdAt = new Date();
        }

        return {
          id: testimonial.id || Math.random(),
          name: testimonial.name || 'Usuario Anónimo',
          role: testimonial.role || 'Miembro',
          text: testimonial.text || '',
          rating: testimonial.rating || 5,
          image: {
            url: testimonial.imageUrl || "", // Usar la URL de la BD (vacía por defecto)
            alt: testimonial.name || 'Usuario',
            cloudinaryPublicId: testimonial.imageUrl 
              ? testimonial.imageUrl.split('/').pop().split('.')[0] 
              : ""
          },
          verified: true,
          // ✅ CORRECCIÓN: Manejo seguro de fecha
          date: createdAt instanceof Date && !isNaN(createdAt.getTime())
            ? createdAt.toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
          active: testimonial.isActive !== false
        };
      });

      res.json({
        success: true,
        data: formattedTestimonials,
        total: formattedTestimonials.length
      });
    } catch (error) {
      console.error('Error en getTestimonials:', error);
      
      // ✅ FALLBACK: Datos por defecto si falla la BD
      const fallbackTestimonials = [
        {
          id: 1,
          name: 'María González',
          role: 'Empresaria',
          text: 'Elite Fitness cambió mi vida completamente. Los entrenadores son excepcionales y las instalaciones de primera clase.',
          rating: 5,
          image: { url: "", alt: 'María González', cloudinaryPublicId: "" },
          verified: true,
          date: new Date().toISOString().split('T')[0],
          active: true
        },
        {
          id: 2,
          name: 'Carlos Mendoza',
          role: 'Ingeniero',
          text: 'Después de años buscando el gimnasio perfecto, finalmente lo encontré. Totalmente recomendado.',
          rating: 5,
          image: { url: "", alt: 'Carlos Mendoza', cloudinaryPublicId: "" },
          verified: true,
          date: new Date().toISOString().split('T')[0],
          active: true
        },
        {
          id: 3,
          name: 'Ana Patricia López',
          role: 'Doctora',
          text: 'Como médico, aprecio la limpieza y profesionalismo de Elite Fitness.',
          rating: 5,
          image: { url: "", alt: 'Ana Patricia López', cloudinaryPublicId: "" },
          verified: true,
          date: new Date().toISOString().split('T')[0],
          active: true
        }
      ];

      res.json({
        success: true,
        data: fallbackTestimonials,
        total: fallbackTestimonials.length,
        message: 'Usando datos por defecto',
        fallback: true
      });
    }
  }

  // ✅ ENDPOINT: /api/gym/stats (formato esperado por frontend)
  async getStatistics(req, res) {
    try {
      const statistics = await GymStatistics.getActiveStats();
      
      // Convertir a formato que espera el frontend
      const formattedStats = {
        members: 0,
        trainers: 0,
        experience: 0,
        satisfaction: 0,
        facilities: 0,
        customStats: []
      };

      statistics.forEach(stat => {
        switch(stat.statKey) {
          case 'members_count':
            formattedStats.members = parseInt(stat.statValue.replace(/\D/g, '')) || 0;
            break;
          case 'trainers_count':
            formattedStats.trainers = parseInt(stat.statValue.replace(/\D/g, '')) || 0;
            break;
          case 'experience_years':
            formattedStats.experience = parseInt(stat.statValue.replace(/\D/g, '')) || 0;
            break;
          case 'satisfaction_rate':
            formattedStats.satisfaction = parseInt(stat.statValue.replace(/\D/g, '')) || 0;
            break;
          case 'equipment_count':
            formattedStats.facilities = parseInt(stat.statValue.replace(/\D/g, '')) || 0;
            break;
          default:
            formattedStats.customStats.push({
              label: stat.statKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              value: parseInt(stat.statValue.replace(/\D/g, '')) || 0,
              icon: "Trophy"
            });
        }
      });

      res.json({
        success: true,
        data: formattedStats
      });
    } catch (error) {
      console.error('Error en getStatistics:', error);
      
      // ✅ FALLBACK: Estadísticas por defecto
      res.json({
        success: true,
        data: {
          members: 500,
          trainers: 15,
          experience: 10,
          satisfaction: 98,
          facilities: 50,
          customStats: []
        },
        fallback: true
      });
    }
  }

  // ✅ ENDPOINT: /api/branding/theme (configuración de branding)
  async getBrandingTheme(req, res) {
    try {
      const branding = await GymBrandingConfig.getAllBrandingConfig();
      const cssVariables = await GymBrandingConfig.generateCSSVariables();

      res.json({
        success: true,
        data: {
          colors: branding.colors || {
            primary: "#14b8a6",
            secondary: "#ec4899",
            success: "#22c55e",
            warning: "#f59e0b"
          },
          fonts: branding.fonts || {
            primary: "Inter",
            headings: "Inter"
          },
          logo_variants: branding.logo_variants || {
            main: "/uploads/logos/logo-main.png",
            white: "/uploads/logos/logo-white.png",
            dark: "/uploads/logos/logo-dark.png",
            icon: "/uploads/logos/logo-icon.png"
          },
          favicons: branding.favicons || {
            ico: "/uploads/favicons/favicon.ico",
            png: "/uploads/favicons/favicon.png"
          },
          customCSS: ".hero { background: linear-gradient(...) }",
          cssVariables
        }
      });
    } catch (error) {
      console.error('Error en getBrandingTheme:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener configuración de branding',
        error: error.message
      });
    }
  }

  // ✅ ENDPOINT: /api/promotions/active (promociones activas)
  async getActivePromotions(req, res) {
    try {
      const promotions = await GymPromotionalContent.getAllActivePromotionalContent();

      const response = {
        freeWeekActive: true,
        promotionalText: "Primera Semana GRATIS",
        badge: "🔥 OFERTA ESPECIAL",
        ctaButtons: [
          {
            text: "🔥 Semana GRATIS",
            type: "primary",
            action: "register",
            icon: "gift",
            color: "#ef4444"
          }
        ],
        bannerPromo: {
          active: true,
          text: "🎉 Promoción especial: Primera semana GRATIS",
          backgroundColor: "#fef3c7",
          textColor: "#92400e"
        },
        ...promotions
      };

      res.json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Error en getActivePromotions:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener promociones activas',
        error: error.message
      });
    }
  }

  // ✅ Información de contacto
  async getContactInfo(req, res) {
    try {
      const contactInfo = await GymContactInfo.getContactInfo();
      
      res.json({
        success: true,
        data: {
          phone: contactInfo.phone,
          email: contactInfo.email,
          address: contactInfo.address,
          whatsapp: contactInfo.phone,
          location: {
            lat: contactInfo.latitude || 14.599512,
            lng: contactInfo.longitude || -90.513843,
            mapsUrl: contactInfo.mapsUrl
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener información de contacto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener información de contacto',
        error: error.message
      });
    }
  }

  // ✅ Horarios del gimnasio
  async getHours(req, res) {
    try {
      const hours = await GymHours.getWeeklySchedule();
      const isOpenNow = await GymHours.isOpenNow();
      
      res.json({
        success: true,
        data: {
          weeklySchedule: hours,
          isOpenNow,
          summary: {
            weekday: "Lunes a Viernes: 5:00 AM - 10:00 PM",
            weekend: "Sábados y Domingos: 6:00 AM - 8:00 PM",
            full: "Lun-Vie: 5AM-10PM | Sáb-Dom: 6AM-8PM"
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener horarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener horarios',
        error: error.message
      });
    }
  }

  // ✅ Planes de membresía (formato correcto para el frontend)
  async getMembershipPlans(req, res) {
    try {
      const plans = await MembershipPlans.getActivePlans();
      
      // ✅ Formatear planes según especificación del frontend
      const formattedPlans = plans.map(plan => ({
        id: plan.id,
        name: plan.planName,
        price: parseFloat(plan.price),
        originalPrice: plan.originalPrice ? parseFloat(plan.originalPrice) : null,
        currency: 'GTQ',
        duration: plan.durationType === 'monthly' ? 'mes' : 
                  plan.durationType === 'daily' ? 'día' : 'año',
        popular: plan.isPopular,
        iconName: plan.iconName,
        color: '#3b82f6',
        features: plan.features || [],
        benefits: plan.features ? plan.features.map(feature => ({
          text: feature,
          included: true
        })) : [],
        active: plan.isActive,
        order: plan.displayOrder,
        discountPercentage: plan.getDiscountPercentage ? plan.getDiscountPercentage() : 0
      }));
      
      res.json({
        success: true,
        data: formattedPlans
      });
    } catch (error) {
      console.error('Error al obtener planes de membresía:', error);
      
      // ✅ FALLBACK: Planes por defecto
      res.json({
        success: true,
        data: [
          {
            id: 1,
            name: "Plan Básico",
            price: 150,
            originalPrice: null,
            currency: 'GTQ',
            duration: 'mes',
            popular: false,
            iconName: "User",
            color: '#3b82f6',
            features: ["Acceso al gimnasio", "Uso de equipos básicos"],
            benefits: [
              { text: "Acceso al gimnasio", included: true },
              { text: "Uso de equipos básicos", included: true }
            ],
            active: true,
            order: 1,
            discountPercentage: 0
          },
          {
            id: 2,
            name: "Plan Premium",
            price: 250,
            originalPrice: 300,
            currency: 'GTQ',
            duration: 'mes',
            popular: true,
            iconName: "Star",
            color: '#3b82f6',
            features: ["Todo lo del plan básico", "Clases grupales", "Entrenador personal"],
            benefits: [
              { text: "Todo lo del plan básico", included: true },
              { text: "Clases grupales", included: true },
              { text: "Entrenador personal", included: true }
            ],
            active: true,
            order: 2,
            discountPercentage: 17
          }
        ],
        fallback: true
      });
    }
  }

  // ✅ Obtener información completa del gym
  async getGymInfo(req, res) {
    try {
      const [
        configuration,
        contactInfo,
        hours,
        statistics,
        services,
        membershipPlans,
        testimonials,
        socialMedia,
        sectionsContent,
        navigation,
        promotionalContent,
        branding
      ] = await Promise.all([
        GymConfiguration.getConfig(),
        GymContactInfo.getContactInfo(),
        GymHours.getWeeklySchedule(),
        GymStatistics.getActiveStats(),
        GymServices.getActiveServices(),
        MembershipPlans.getActivePlans(),
        GymTestimonials.getFeaturedTestimonials(3),
        GymSocialMedia.getSocialMediaObject(),
        GymSectionsContent.getAllSectionsContent(),
        GymNavigation.getAllNavigation(),
        GymPromotionalContent.getAllActivePromotionalContent(),
        GymBrandingConfig.getAllBrandingConfig()
      ]);

      const isOpenNow = await GymHours.isOpenNow();

      // ✅ Formatear respuesta completa con URLs de BD
      const response = {
        configuration: {
          name: configuration.gymName,
          description: configuration.gymDescription,
          tagline: configuration.gymTagline,
          logo: {
            url: configuration.logoUrl || '',
            alt: `${configuration.gymName} Logo`
          }
        },
        contactInfo: {
          phone: contactInfo.phone,
          email: contactInfo.email,
          address: contactInfo.address,
          whatsapp: contactInfo.phone,
          hours: {
            weekday: "Lunes a Viernes: 5:00 AM - 10:00 PM",
            weekend: "Sábados y Domingos: 6:00 AM - 8:00 PM",
            full: "Lun-Vie: 5AM-10PM | Sáb-Dom: 6AM-8PM"
          },
          location: {
            lat: contactInfo.latitude || 14.599512,
            lng: contactInfo.longitude || -90.513843,
            mapsUrl: contactInfo.mapsUrl
          }
        },
        statistics,
        services: services.map(service => ({
          ...service.toJSON(),
          imageUrl: service.imageUrl || "" // Usar URL de BD (vacía por defecto)
        })),
        membershipPlans: membershipPlans.map(plan => ({
          ...plan.toJSON(),
          discountPercentage: plan.getDiscountPercentage ? plan.getDiscountPercentage() : 0
        })),
        testimonials: testimonials.map(testimonial => ({
          ...testimonial.toJSON(),
          image: {
            url: testimonial.imageUrl || "", // Usar URL de BD (vacía por defecto)
            alt: testimonial.name
          }
        })),
        socialMedia,
        sectionsContent: {
          ...sectionsContent,
          hero: {
            ...sectionsContent.hero,
            imageUrl: sectionsContent.hero?.imageUrl || "", // URL de BD
            videoUrl: sectionsContent.hero?.videoUrl || ""  // URL de BD
          }
        },
        navigation,
        promotionalContent,
        branding,
        isOpenNow,
        cssVariables: await GymBrandingConfig.generateCSSVariables()
      };

      res.json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Error al obtener información del gym:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener información del gym',
        error: error.message
      });
    }
  }

  // ✅ Actualizar configuración
  async updateConfiguration(req, res) {
    try {
      const {
        gymName,
        gymTagline,
        gymDescription,
        logoUrl,
        primaryColor,
        secondaryColor,
        successColor,
        warningColor,
        dangerColor
      } = req.body;

      const configuration = await GymConfiguration.getConfig();

      if (gymName !== undefined) configuration.gymName = gymName;
      if (gymTagline !== undefined) configuration.gymTagline = gymTagline;
      if (gymDescription !== undefined) configuration.gymDescription = gymDescription;
      if (logoUrl !== undefined) configuration.logoUrl = logoUrl;
      if (primaryColor !== undefined) configuration.primaryColor = primaryColor;
      if (secondaryColor !== undefined) configuration.secondaryColor = secondaryColor;
      if (successColor !== undefined) configuration.successColor = successColor;
      if (warningColor !== undefined) configuration.warningColor = warningColor;
      if (dangerColor !== undefined) configuration.dangerColor = dangerColor;

      await configuration.save();

      const cssVariables = await GymBrandingConfig.generateCSSVariables();

      res.json({
        success: true,
        message: 'Configuración actualizada exitosamente',
        data: {
          configuration,
          cssVariables
        }
      });
    } catch (error) {
      console.error('Error al actualizar configuración:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar configuración',
        error: error.message
      });
    }
  }

  // ✅ Inicializar datos por defecto
  async initializeDefaultData(req, res) {
    try {
      console.log('🔄 Inicializando todos los datos por defecto del gym...');

      await Promise.all([
        GymStatistics.seedDefaultStats(),
        GymServices.seedDefaultServices(),
        MembershipPlans.seedDefaultPlans(),
        GymTestimonials.seedDefaultTestimonials(),
        GymSocialMedia.seedDefaultSocialMedia(),
        GymSectionsContent.seedDefaultContent(),
        GymNavigation.seedDefaultNavigation(),
        GymPromotionalContent.seedDefaultPromotionalContent(),
        GymFormsConfig.seedDefaultFormsConfig(),
        GymSystemMessages.seedDefaultSystemMessages(),
        GymBrandingConfig.seedDefaultBrandingConfig()
      ]);

      await Promise.all([
        GymConfiguration.getConfig(),
        GymContactInfo.getContactInfo(),
        GymHours.getWeeklySchedule()
      ]);

      console.log('✅ Todos los datos por defecto inicializados');

      res.json({
        success: true,
        message: 'Todos los datos por defecto inicializados correctamente'
      });
    } catch (error) {
      console.error('Error al inicializar datos por defecto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al inicializar datos por defecto',
        error: error.message
      });
    }
  }
}

module.exports = new GymController();