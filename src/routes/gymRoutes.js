// src/routes/gymRoutes.js - COMPATIBLE con tu controlador actual
const express = require('express');
const gymController = require('../controllers/gymController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ✅ RUTAS PÚBLICAS (compatibles con tu controlador actual)

// Endpoint principal con toda la información básica
router.get('/info', gymController.getGymInfo);

// Endpoints específicos que YA EXISTEN en tu controlador
router.get('/config', gymController.getConfiguration);
router.get('/contact', gymController.getContactInfo);
router.get('/hours', gymController.getHours);
router.get('/statistics', gymController.getStatistics);
router.get('/services', gymController.getServices);
router.get('/plans', gymController.getMembershipPlans);

// ✅ RUTAS ADMINISTRATIVAS (solo admin) - que YA EXISTEN
router.put('/config', 
  authenticateToken, 
  requireAdmin, 
  gymController.updateConfiguration
);

router.put('/contact', 
  authenticateToken, 
  requireAdmin, 
  gymController.updateContactInfo
);

router.put('/hours', 
  authenticateToken, 
  requireAdmin, 
  gymController.updateHours
);

router.put('/statistics', 
  authenticateToken, 
  requireAdmin, 
  gymController.updateStatistics
);

// Inicializar datos por defecto
router.post('/initialize', 
  authenticateToken, 
  requireAdmin, 
  gymController.initializeDefaultData
);

// ✅ ENDPOINTS TEMPORALES con datos estáticos (hasta que agregues los modelos nuevos)

// Testimonios (datos estáticos por ahora)
router.get('/testimonials', (req, res) => {
  res.json({
    success: true,
    data: [
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
        text: 'Como médico, aprecio la limpieza y profesionalismo de Elite Fitness. Es un lugar donde realmente puedes enfocarte en tu salud.',
        rating: 5,
        isFeatured: true
      }
    ]
  });
});

// Redes sociales (datos estáticos por ahora)
router.get('/social-media', (req, res) => {
  res.json({
    success: true,
    data: {
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
    }
  });
});

// Contenido de secciones (datos estáticos por ahora)
router.get('/sections-content', (req, res) => {
  res.json({
    success: true,
    data: {
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
    }
  });
});

// Navegación (datos estáticos por ahora)
router.get('/navigation', (req, res) => {
  res.json({
    success: true,
    data: {
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
    }
  });
});

// Contenido promocional (datos estáticos por ahora)
router.get('/promotional-content', (req, res) => {
  res.json({
    success: true,
    data: {
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
    }
  });
});

// Configuración de formularios (datos estáticos por ahora)
router.get('/forms-config', (req, res) => {
  res.json({
    success: true,
    data: {
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
    }
  });
});

// Mensajes del sistema (datos estáticos por ahora)
router.get('/system-messages', (req, res) => {
  res.json({
    success: true,
    data: {
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
    }
  });
});

// Configuración de branding (datos estáticos por ahora)
router.get('/branding', (req, res) => {
  res.json({
    success: true,
    data: {
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
    }
  });
});

// Productos destacados (placeholder por ahora)
router.get('/featured-products', (req, res) => {
  res.json({
    success: true,
    data: [
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
  });
});

// Media/galería (placeholder por ahora)
router.get('/media', (req, res) => {
  res.json({
    success: true,
    data: {
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
    }
  });
});

module.exports = router;