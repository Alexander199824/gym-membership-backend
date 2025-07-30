// src/controllers/gymController.js - CORREGIDO COMPLETO: Respuestas exactas para el frontend

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
  constructor() {
    // ✅ BINDEAR todos los métodos al contexto de la clase
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
  }

 // ✅ ENDPOINT: /api/gym/config (configuración principal) - CORREGIDO FINAL
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

      // ✅ CORREGIDO: Leer datos reales de video/imagen de la BD
      const logoUrl = configuration.logoUrl || '';
      const heroVideoUrl = configuration.heroVideoUrl || '';
      const heroImageUrl = configuration.heroImageUrl || '';
      
      // ✅ NUEVO: Obtener configuración completa usando métodos del modelo
      const videoConfig = configuration.getVideoConfig();
      const heroData = configuration.getHeroData();
      const multimedia = configuration.hasMultimedia();

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
        hours: {
          full: "Lun-Vie 5:00-22:00, Sáb-Dom 6:00-20:00",
          weekdays: "5:00-22:00",
          weekends: "6:00-20:00"
        },
        social: socialMedia,
        
        // ✅ NUEVO: Hero section con datos reales de la BD
        hero: {
          title: heroData.title,
          description: heroData.description,
          imageUrl: heroImageUrl,  // ✅ URL REAL de la BD
          videoUrl: heroVideoUrl,  // ✅ URL REAL de la BD
          ctaText: heroData.ctaText,
          ctaButtons: heroData.ctaButtons
        },
        
        // ✅ NUEVO: Campos top-level con datos reales de la BD
        videoUrl: heroVideoUrl,     // ✅ URL REAL de la BD
        imageUrl: heroImageUrl,     // ✅ URL REAL de la BD
        hasVideo: !!heroVideoUrl,   // ✅ Estado real basado en BD
        hasImage: !!heroImageUrl,   // ✅ Estado real basado en BD
        
        // ✅ NUEVO: Configuración completa de video
        videoConfig: videoConfig.available ? {
          autoplay: configuration.videoAutoplay || false,
          muted: configuration.videoMuted !== false,
          loop: configuration.videoLoop !== false,
          controls: configuration.videoControls !== false,
          posterUrl: heroImageUrl
        } : null,
        
        // ✅ NUEVO: Estado multimedia completo
        multimedia: {
          hasLogo: multimedia.hasLogo,
          hasVideo: multimedia.hasVideo,
          hasHeroImage: multimedia.hasHeroImage,
          hasAnyMedia: multimedia.hasAnyMedia
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