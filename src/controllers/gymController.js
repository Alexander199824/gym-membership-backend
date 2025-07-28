// src/controllers/gymController.js - ACTUALIZADO: Respuestas exactas para el frontend
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
  StoreProduct
} = require('../models');

class GymController {

  // ✅ NUEVO: Endpoint principal /api/gym/config (formato esperado por frontend)
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
        GymHours.getWeeklySchedule(),
        GymSocialMedia.getSocialMediaObject()
      ]);

      // ✅ Formatear respuesta según especificación del frontend
      const response = {
        name: configuration.gymName,
        description: configuration.gymDescription,
        tagline: configuration.gymTagline,
        logo: {
          url: configuration.logoUrl || '',
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
        hours: {
          full: "Lun-Vie 5:00-22:00, Sáb-Dom 6:00-20:00",
          weekdays: "5:00-22:00",
          weekends: "6:00-20:00"
        },
        social: socialMedia
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

  // ✅ NUEVO: Endpoint /api/content/landing (contenido de la landing page)
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

  // ✅ NUEVO: Endpoint /api/gym/services (formato esperado por frontend)
  async getServices(req, res) {
    try {
      const services = await GymServices.getActiveServices();
      
      const formattedServices = services.map(service => ({
        id: service.id,
        title: service.title,
        description: service.description,
        icon: service.iconName,
        imageUrl: "", // Por ahora vacío, se puede agregar después
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

  // ✅ NUEVO: Endpoint /api/gym/testimonials (formato esperado por frontend)
  async getTestimonials(req, res) {
    try {
      const testimonials = await GymTestimonials.getActiveTestimonials();
      
      const formattedTestimonials = testimonials.map(testimonial => ({
        id: testimonial.id,
        name: testimonial.name,
        role: testimonial.role,
        text: testimonial.text,
        rating: testimonial.rating,
        image: {
          url: testimonial.imageUrl || "",
          alt: testimonial.name,
          cloudinaryPublicId: testimonial.imageUrl ? testimonial.imageUrl.split('/').pop().split('.')[0] : ""
        },
        verified: true,
        date: testimonial.createdAt.toISOString().split('T')[0],
        active: testimonial.isActive
      }));

      res.json({
        success: true,
        data: formattedTestimonials
      });
    } catch (error) {
      console.error('Error en getTestimonials:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener testimonios',
        error: error.message
      });
    }
  }

  // ✅ NUEVO: Endpoint /api/gym/stats (formato esperado por frontend)
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
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }

  // ✅ NUEVO: Endpoint /api/branding/theme (configuración de branding)
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

  // ✅ NUEVO: Endpoint /api/promotions/active (promociones activas)
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

  // ✅ Mantener métodos existentes pero adaptados

  // Obtener información completa del gym (endpoint existente mejorado)
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

      // ✅ Formatear respuesta completa
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
        services,
        membershipPlans: membershipPlans.map(plan => ({
          ...plan.toJSON(),
          discountPercentage: plan.getDiscountPercentage()
        })),
        testimonials,
        socialMedia,
        sectionsContent,
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

  // ✅ Mantener métodos administrativos existentes
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