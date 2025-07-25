// src/controllers/gymController.js - ACTUALIZADO con todos los endpoints para el frontend
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
  

  // ✅ Obtener toda la configuración del gym para el frontend
  async getGymInfo(req, res) {
    try {
      // ✅ Obtener toda la información necesaria para la landing page
      const [
        configuration,
        contactInfo,
        hours,
        statistics,
        services,
        membershipPlans
      ] = await Promise.all([
        GymConfiguration.getConfig(),
        GymContactInfo.getContactInfo(),
        GymHours.getWeeklySchedule(),
        GymStatistics.getActiveStats(),
        GymServices.getActiveServices(),
        MembershipPlans.getActivePlans()
      ]);

      // ✅ Verificar si el gym está abierto ahora
      const isOpenNow = await GymHours.isOpenNow();

      res.json({
        success: true,
        data: {
          // Información básica del gym
          configuration,
          contactInfo,
          hours,
          statistics,
          services,
          membershipPlans: membershipPlans.map(plan => ({
            ...plan.toJSON(),
            discountPercentage: plan.getDiscountPercentage()
          })),
          isOpenNow,
          
          // ✅ Variables CSS para el frontend
          cssVariables: configuration.generateCSSVariables(),
          
          // ✅ DATOS ADICIONALES que el frontend espera (estáticos por ahora)
          testimonials: [
            {
              id: 1,
              name: 'María González',
              role: 'Empresaria',
              text: 'Elite Fitness cambió mi vida completamente. Los entrenadores son excepcionales y las instalaciones de primera clase.',
              rating: 5,
              isFeatured: true
            },
            {
              id: 2,
              name: 'Carlos Mendoza',
              role: 'Ingeniero',
              text: 'Después de años buscando el gimnasio perfecto, finalmente lo encontré. Totalmente recomendado.',
              rating: 5,
              isFeatured: true
            },
            {
              id: 3,
              name: 'Ana Patricia López',
              role: 'Doctora',
              text: 'Como médico, aprecio la limpieza y profesionalismo de Elite Fitness.',
              rating: 5,
              isFeatured: true
            }
          ],
          
          socialMedia: {
            instagram: {
              url: 'https://instagram.com/elitefitness',
              handle: '@elitefitness',
              active: true
            },
            facebook: {
              url: 'https://facebook.com/elitefitness',
              handle: 'Elite Fitness Club',
              active: true
            },
            youtube: {
              url: 'https://youtube.com/elitefitness',
              handle: 'Elite Fitness',
              active: true
            },
            whatsapp: {
              url: 'https://wa.me/50255555555',
              handle: 'WhatsApp',
              active: true
            }
          },
          
          sectionsContent: {
            hero: {
              title: 'Bienvenido a Elite Fitness Club',
              subtitle: 'Transforma tu cuerpo, eleva tu mente',
              description: 'El mejor gimnasio de Guatemala',
              ctaButtons: [
                {
                  text: 'Primera Semana GRATIS',
                  type: 'primary',
                  action: 'register',
                  icon: 'gift'
                },
                {
                  text: 'Ver Tienda',
                  type: 'secondary',
                  action: 'store',
                  icon: 'shopping-cart'
                }
              ]
            },
            store: {
              title: 'Productos premium para tu entrenamiento',
              subtitle: 'Descubre nuestra selección de suplementos, ropa deportiva y accesorios',
              benefits: [
                { text: 'Envío gratis +Q200', icon: 'truck', color: 'green' },
                { text: 'Garantía de calidad', icon: 'shield', color: 'blue' },
                { text: 'Productos originales', icon: 'award', color: 'purple' }
              ]
            },
            services: {
              title: 'Todo lo que necesitas para alcanzar tus metas',
              subtitle: 'Servicios profesionales diseñados para llevarte al siguiente nivel'
            },
            plans: {
              title: 'Elige tu plan ideal',
              subtitle: 'Planes diseñados para diferentes objetivos y estilos de vida',
              guarantee: 'Garantía de satisfacción 30 días'
            },
            testimonials: {
              title: 'Lo que dicen nuestros miembros',
              subtitle: 'Testimonios reales de nuestra comunidad fitness'
            },
            contact: {
              title: '¿Listo para comenzar?',
              subtitle: 'Únete a Elite Fitness Club y comienza tu transformación hoy mismo'
            }
          },
          
          navigation: {
            header: [
              { text: 'Inicio', href: '#inicio', active: true },
              { text: 'Servicios', href: '#servicios', active: true },
              { text: 'Planes', href: '#planes', active: true },
              { text: 'Tienda', href: '#tienda', active: true },
              { text: 'Contacto', href: '#contacto', active: true }
            ],
            footer: {
              links: [
                { text: 'Inicio', href: '#inicio' },
                { text: 'Servicios', href: '#servicios' },
                { text: 'Planes', href: '#planes' },
                { text: 'Tienda', href: '#tienda' }
              ],
              store_links: [
                { text: 'Suplementos', href: '/store?category=suplementos' },
                { text: 'Ropa Deportiva', href: '/store?category=ropa' },
                { text: 'Accesorios', href: '/store?category=accesorios' },
                { text: 'Equipamiento', href: '/store?category=equipamiento' }
              ]
            }
          },
          
          promotionalContent: {
            main_offer: {
              title: 'Primera Semana GRATIS',
              subtitle: 'Para nuevos miembros',
              description: 'Conoce nuestras instalaciones sin compromiso'
            },
            cta_card: {
              title: '🎉 Primera Semana GRATIS',
              benefits: [
                'Evaluación física completa',
                'Plan de entrenamiento personalizado',
                'Acceso a todas las instalaciones',
                'Sin compromisos'
              ],
              buttons: [
                {
                  text: '🚀 Registrarse GRATIS',
                  type: 'primary',
                  action: 'register'
                },
                {
                  text: 'Ya soy miembro',
                  type: 'secondary',
                  action: 'login'
                }
              ]
            },
            features: [
              {
                title: 'Entrenamiento personalizado',
                description: 'Planes únicos para cada persona'
              },
              {
                title: 'Equipos de última generación',
                description: 'Tecnología fitness avanzada'
              },
              {
                title: 'Resultados garantizados',
                description: 'Ve cambios reales en tu cuerpo'
              },
              {
                title: 'Comunidad fitness elite',
                description: 'Conecta con personas motivadas'
              }
            ],
            motivational: {
              title: '¡Consejo del día!',
              message: 'La constancia es la clave del éxito. Cada día que entrenas te acercas más a tu objetivo. ¡Sigue así y verás resultados increíbles!'
            }
          },
          
          formsConfig: {
            contact_form: {
              title: 'Contáctanos',
              fields: [
                { name: 'name', label: 'Nombre', type: 'text', required: true },
                { name: 'email', label: 'Email', type: 'email', required: true },
                { name: 'phone', label: 'Teléfono', type: 'tel', required: false },
                { name: 'message', label: 'Mensaje', type: 'textarea', required: true }
              ],
              submitText: 'Enviar mensaje'
            },
            newsletter: {
              title: 'Mantente informado',
              description: 'Recibe tips, ofertas y novedades',
              placeholder: 'Tu email aquí...',
              submitText: 'Suscribirse'
            }
          },
          
          systemMessages: {
            loading: {
              default: 'Cargando...',
              products: 'Cargando productos...',
              services: 'Cargando servicios...'
            },
            empty_states: {
              no_products: 'No se encontraron productos',
              no_testimonials: 'No hay testimonios disponibles'
            },
            errors: {
              connection: 'Error de conexión. Intenta nuevamente.',
              general: 'Algo salió mal. Contacta al soporte.'
            },
            success: {
              contact_sent: 'Mensaje enviado exitosamente',
              subscribed: '¡Te has suscrito correctamente!'
            }
          },
          
          branding: {
            colors: {
              primary: '#14b8a6',
              secondary: '#ec4899',
              success: '#22c55e',
              warning: '#f59e0b'
            },
            fonts: {
              primary: 'Inter',
              headings: 'Inter'
            },
            logo_variants: {
              main: '/uploads/logos/logo-main.png',
              white: '/uploads/logos/logo-white.png',
              dark: '/uploads/logos/logo-dark.png',
              icon: '/uploads/logos/logo-icon.png'
            },
            favicons: {
              ico: '/uploads/favicons/favicon.ico',
              png: '/uploads/favicons/favicon.png'
            }
          },
          
          featuredProducts: [
            {
              id: 1,
              name: 'Whey Protein Gold Standard',
              description: 'Proteína de suero aislada premium - 2.5kg',
              price: 399,
              originalPrice: 459,
              image: '/uploads/products/protein.jpg',
              category: 'suplementos',
              rating: 4.9,
              reviews: 342,
              badge: 'Más vendido',
              featured: true
            },
            {
              id: 2,
              name: 'Playera Deportiva Dri-FIT',
              description: 'Playera transpirable para entrenamientos intensos',
              price: 89.99,
              originalPrice: 120.00,
              image: '/uploads/products/shirt.jpg',
              category: 'ropa',
              rating: 4.5,
              reviews: 89,
              featured: true
            }
          ]
        }
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



  // ✅ ENDPOINTS ESPECÍFICOS PARA EL FRONTEND

  // Configuración general del gym
  async getConfiguration(req, res) {
    try {
      const configuration = await GymConfiguration.getConfig();
      const cssVariables = await GymBrandingConfig.generateCSSVariables();
      
      res.json({
        success: true,
        data: {
          configuration,
          cssVariables
        }
      });
    } catch (error) {
      console.error('Error al obtener configuración:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener configuración',
        error: error.message
      });
    }
  }

  // Estadísticas públicas
  async getStatistics(req, res) {
    try {
      const statistics = await GymStatistics.getActiveStats();
      
      // ✅ Formatear para el frontend según el formato esperado
      const formattedStats = {};
      statistics.forEach(stat => {
        formattedStats[stat.statKey] = stat.statValue;
      });
      
      res.json({
        success: true,
        data: formattedStats
      });
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }

  // Servicios del gimnasio
  async getServices(req, res) {
    try {
      const services = await GymServices.getActiveServices();
      
      res.json({
        success: true,
        data: services
      });
    } catch (error) {
      console.error('Error al obtener servicios:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener servicios',
        error: error.message
      });
    }
  }

  // Planes de membresía
  async getMembershipPlans(req, res) {
    try {
      const plans = await MembershipPlans.getActivePlans();
      
      // ✅ Agregar información de descuento calculada
      const plansWithDiscounts = plans.map(plan => ({
        ...plan.toJSON(),
        discountPercentage: plan.getDiscountPercentage()
      }));
      
      res.json({
        success: true,
        data: plansWithDiscounts
      });
    } catch (error) {
      console.error('Error al obtener planes de membresía:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener planes de membresía',
        error: error.message
      });
    }
  }

  // Testimonios
  async getTestimonials(req, res) {
    try {
      const testimonials = await GymTestimonials.getActiveTestimonials();
      
      res.json({
        success: true,
        data: testimonials
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

  // Información de contacto
  async getContactInfo(req, res) {
    try {
      const contactInfo = await GymContactInfo.getContactInfo();
      
      // ✅ Formatear para el frontend
      const formattedContact = {
        phone: contactInfo.phone,
        email: contactInfo.email,
        address: contactInfo.address,
        addressFull: contactInfo.address,
        whatsapp: contactInfo.phone, // Usar el mismo teléfono por defecto
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
      };
      
      res.json({
        success: true,
        data: formattedContact
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

  // Redes sociales
  async getSocialMedia(req, res) {
    try {
      const socialMedia = await GymSocialMedia.getSocialMediaObject();
      
      res.json({
        success: true,
        data: socialMedia
      });
    } catch (error) {
      console.error('Error al obtener redes sociales:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener redes sociales',
        error: error.message
      });
    }
  }

  // Productos destacados (para la sección tienda)
  async getFeaturedProducts(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 8;
      const products = await StoreProduct.getFeaturedProducts(limit);
      
      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('Error al obtener productos destacados:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos destacados',
        error: error.message
      });
    }
  }

  // Contenido de secciones
  async getSectionsContent(req, res) {
    try {
      const sectionsContent = await GymSectionsContent.getAllSectionsContent();
      
      res.json({
        success: true,
        data: sectionsContent
      });
    } catch (error) {
      console.error('Error al obtener contenido de secciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener contenido de secciones',
        error: error.message
      });
    }
  }

  // Navegación
  async getNavigation(req, res) {
    try {
      const navigation = await GymNavigation.getAllNavigation();
      
      res.json({
        success: true,
        data: navigation
      });
    } catch (error) {
      console.error('Error al obtener navegación:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener navegación',
        error: error.message
      });
    }
  }

  // Contenido promocional
  async getPromotionalContent(req, res) {
    try {
      const promotionalContent = await GymPromotionalContent.getAllActivePromotionalContent();
      
      res.json({
        success: true,
        data: promotionalContent
      });
    } catch (error) {
      console.error('Error al obtener contenido promocional:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener contenido promocional',
        error: error.message
      });
    }
  }

  // Configuración de formularios
  async getFormsConfig(req, res) {
    try {
      const formsConfig = await GymFormsConfig.getAllFormsConfig();
      
      res.json({
        success: true,
        data: formsConfig
      });
    } catch (error) {
      console.error('Error al obtener configuración de formularios:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener configuración de formularios',
        error: error.message
      });
    }
  }

  // Mensajes del sistema
  async getSystemMessages(req, res) {
    try {
      const locale = req.query.locale || 'es';
      const systemMessages = await GymSystemMessages.getAllSystemMessages(locale);
      
      res.json({
        success: true,
        data: systemMessages
      });
    } catch (error) {
      console.error('Error al obtener mensajes del sistema:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener mensajes del sistema',
        error: error.message
      });
    }
  }

  // Configuración de branding
  async getBranding(req, res) {
    try {
      const brandingConfig = await GymBrandingConfig.getAllBrandingConfig();
      const cssVariables = await GymBrandingConfig.generateCSSVariables();
      
      res.json({
        success: true,
        data: {
          branding: brandingConfig,
          cssVariables
        }
      });
    } catch (error) {
      console.error('Error al obtener configuración de branding:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener configuración de branding',
        error: error.message
      });
    }
  }

  // ✅ MÉTODOS ADMINISTRATIVOS EXISTENTES (mantener los existentes)

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

      // ✅ Actualizar campos proporcionados
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

  // ✅ Inicializar todos los datos por defecto
  async initializeDefaultData(req, res) {
    try {
      console.log('🔄 Inicializando todos los datos por defecto del gym...');

      // ✅ Crear datos por defecto en paralelo
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

      // ✅ Asegurar que existan configuración y contacto
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

  // ✅ Obtener horarios
  async getHours(req, res) {
    try {
      const hours = await GymHours.getWeeklySchedule();
      const isOpenNow = await GymHours.isOpenNow();
      
      res.json({
        success: true,
        data: { 
          hours,
          isOpenNow
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

  // ✅ Endpoint para obtener galería/media (placeholder)
  async getMedia(req, res) {
    try {
      // ✅ Por ahora devolver estructura básica
      const media = {
        hero_video: "/uploads/videos/hero.mp4",
        gallery: [
          {
            id: 1,
            type: "image",
            url: "/uploads/gallery/gym1.jpg",
            alt: "Área de pesas",
            featured: true
          }
        ],
        promotional_videos: [
          {
            id: 1,
            title: "Tour Virtual Elite Fitness",
            url: "/uploads/videos/tour.mp4",
            thumbnail: "/uploads/videos/tour-thumb.jpg"
          }
        ]
      };
      
      res.json({
        success: true,
        data: media
      });
    } catch (error) {
      console.error('Error al obtener media:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener media',
        error: error.message
      });
    }
  }
}

module.exports = new GymController();