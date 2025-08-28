// src/routes/gymRoutes.js - COMPLETO: Con todas las rutas integradas

const express = require('express');
const gymController = require('../controllers/gymController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ✅ IMPORTAR Rate Limiter de forma segura
let developmentLimiter;
try {
  const rateLimiterModule = require('../middleware/rateLimiter');
  developmentLimiter = rateLimiterModule.developmentLimiter || rateLimiterModule.generalLimiter;
} catch (error) {
  console.warn('⚠️ Rate limiter no disponible, continuando sin límites');
  // Middleware dummy que no hace nada
  developmentLimiter = (req, res, next) => next();
}

// ✅ APLICAR Rate Limiter solo si está disponible
if (developmentLimiter && typeof developmentLimiter === 'function') {
  router.use(developmentLimiter);
}

// ✅ ========== VALIDACIONES PARA NUEVAS RUTAS ==========
const { body, param } = require('express-validator');

// Middleware de manejo de errores de validación básico (si no existe)
const handleValidationErrors = (req, res, next) => {
  try {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: errors.array()
      });
    }
    next();
  } catch (error) {
    next();
  }
};

const timeSlotValidator = [
  body('open')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Formato de hora de apertura inválido (HH:MM)'),
  body('close')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Formato de hora de cierre inválido (HH:MM)')
    .custom((closeTime, { req }) => {
      if (closeTime <= req.body.open) {
        throw new Error('La hora de cierre debe ser posterior a la hora de apertura');
      }
      return true;
    }),
  body('capacity')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('La capacidad debe estar entre 1 y 500'),
  body('reservations')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Las reservas deben ser un número positivo'),
  body('label')
    .optional()
    .isLength({ max: 100 })
    .withMessage('La etiqueta no puede exceder 100 caracteres')
];

const dayValidator = [
  param('day')
    .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .withMessage('Día de la semana inválido')
];

const slotIndexValidator = [
  param('slotIndex')
    .isInt({ min: 0 })
    .withMessage('Índice de franja debe ser un número positivo')
];

// ✅ RUTAS PÚBLICAS ESPECÍFICAS (según especificación del frontend)

// Endpoint principal con toda la información básica
router.get('/info', gymController.getGymInfo);

// ✅ ENDPOINTS específicos que el frontend espera
router.get('/config', gymController.getGymConfig);           // GET /api/gym/config (con soporte flexible)
router.get('/services', gymController.getServices);         // GET /api/gym/services  
router.get('/testimonials', gymController.getTestimonials); // GET /api/gym/testimonials
router.get('/stats', gymController.getStatistics);          // GET /api/gym/stats

// ✅ NUEVAS RUTAS que el frontend necesita
router.get('/membership-plans', gymController.getMembershipPlans); // NUEVA
router.get('/promotions', gymController.getActivePromotions);      // NUEVA  
router.get('/promotional-content', gymController.getActivePromotions); // ALIAS
router.get('/branding', gymController.getBrandingTheme);           // NUEVA
router.get('/content', gymController.getLandingContent);           // NUEVA (sin /api)

// ✅ Endpoints existentes CORREGIDOS
router.get('/contact', gymController.getContactInfo);
router.get('/hours', gymController.getHours);
router.get('/plans', gymController.getMembershipPlans); // Alias para compatibility
router.get('/membership-plans', gymController.getMembershipPlans);

// ✅ ========== NUEVAS RUTAS PARA HORARIOS FLEXIBLES ==========

// RUTA ESPECÍFICA para ContentEditor.js
router.get('/config/editor', gymController.getGymConfigForEditor);

// Actualizar configuración completa (para ContentEditor)
router.put('/config/flexible', 
  authenticateToken, 
  requireAdmin, 
  gymController.updateFlexibleSchedule
);

// Métricas de capacidad
router.get('/capacity/metrics', 
  authenticateToken, 
  requireAdmin, 
  gymController.getCapacityMetrics
);

// ✅ ========== OPERACIONES ESPECÍFICAS DE HORARIOS ==========

// Alternar día abierto/cerrado
router.post('/hours/:day/toggle', 
  authenticateToken, 
  requireAdmin,
  dayValidator,
  handleValidationErrors,
  gymController.toggleDayOpen
);

// Agregar franja horaria (CON VALIDACIÓN)
router.post('/hours/:day/slots', 
  authenticateToken, 
  requireAdmin,
  dayValidator,
  timeSlotValidator,
  handleValidationErrors,
  gymController.addTimeSlot
);

// Eliminar franja horaria (CON VALIDACIÓN)
router.delete('/hours/:day/slots/:slotIndex', 
  authenticateToken, 
  requireAdmin,
  dayValidator,
  slotIndexValidator,
  handleValidationErrors,
  gymController.removeTimeSlot
);

// Actualizar franja horaria (CON VALIDACIÓN)
router.patch('/hours/:day/slots/:slotIndex', 
  authenticateToken, 
  requireAdmin,
  dayValidator,
  slotIndexValidator,
  [
    body('field').isIn(['open', 'close', 'capacity', 'reservations', 'label']).withMessage('Campo inválido'),
    body('value').notEmpty().withMessage('Valor requerido')
  ],
  handleValidationErrors,
  gymController.updateTimeSlot
);

// Duplicar franja horaria (CON VALIDACIÓN)
router.post('/hours/:day/slots/:slotIndex/duplicate', 
  authenticateToken, 
  requireAdmin,
  dayValidator,
  slotIndexValidator,
  handleValidationErrors,
  gymController.duplicateTimeSlot
);

// Aplicar capacidad a todas las franjas (CON VALIDACIÓN)
router.post('/hours/capacity/apply-all', 
  authenticateToken, 
  requireAdmin,
  [
    body('capacity').isInt({ min: 1, max: 500 }).withMessage('La capacidad debe estar entre 1 y 500')
  ],
  handleValidationErrors,
  gymController.applyCapacityToAllSlots
);

// ✅ ========== ENDPOINTS PARA CONSULTA ==========

// Obtener horarios flexibles completos
router.get('/hours/flexible', async (req, res) => {
  try {
    const { GymHours } = require('../models');
    const flexibleSchedule = await GymHours.getFlexibleSchedule();
    const metrics = await GymHours.getCapacityMetrics();
    
    res.json({
      success: true,
      data: {
        hours: flexibleSchedule,
        metrics: metrics
      }
    });
  } catch (error) {
    console.error('Error al obtener horarios flexibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener horarios flexibles',
      error: error.message
    });
  }
});

// Obtener disponibilidad en tiempo real
router.get('/availability', async (req, res) => {
  try {
    const { day, time } = req.query;
    
    if (!day) {
      return res.status(400).json({
        success: false,
        message: 'Parámetro day es requerido'
      });
    }
    
    const { GymHours, GymTimeSlots } = require('../models');
    
    const daySchedule = await GymHours.findOne({ 
      where: { dayOfWeek: day },
      include: [{
        model: GymTimeSlots,
        as: 'timeSlots',
        where: { isActive: true },
        required: false,
        order: [['displayOrder', 'ASC'], ['openTime', 'ASC']]
      }]
    });
    
    if (!daySchedule || daySchedule.isClosed) {
      return res.json({
        success: true,
        data: {
          day,
          isOpen: false,
          message: 'El gimnasio está cerrado este día'
        }
      });
    }
    
    let availableSlots = [];
    if (daySchedule.timeSlots) {
      availableSlots = daySchedule.timeSlots.map(slot => ({
        ...slot.toFrontendFormat(),
        isAvailableNow: time ? (time >= slot.openTime.slice(0, 5) && time <= slot.closeTime.slice(0, 5)) : false
      }));
    }
    
    res.json({
      success: true,
      data: {
        day,
        isOpen: true,
        slots: availableSlots,
        currentTime: time || new Date().toTimeString().slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener disponibilidad',
      error: error.message
    });
  }
});

// ✅ RUTAS ADMINISTRATIVAS (solo admin)
router.put('/config', 
  authenticateToken, 
  requireAdmin, 
  gymController.updateConfiguration
);

// Inicializar datos por defecto
router.post('/initialize', 
  authenticateToken, 
  requireAdmin, 
  gymController.initializeDefaultData
);

// ✅ NAVEGACIÓN
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

// ✅ REDES SOCIALES
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

// ✅ CONTENIDO DE SECCIONES
router.get('/sections-content', (req, res) => {
  res.json({
    success: true,
    data: {
      hero: {
        title: 'Bienvenido a Elite Fitness Club',
        subtitle: 'Transforma tu cuerpo, eleva tu mente',
        description: 'El mejor gimnasio de Guatemala',
        imageUrl: '', // Vacío por defecto
        videoUrl: '', // Vacío por defecto
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

// ✅ CONFIGURACIÓN DE FORMULARIOS
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

// ✅ MENSAJES DEL SISTEMA  
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

module.exports = router;