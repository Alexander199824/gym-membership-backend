// src/controllers/servicesController.js - CRUD COMPLETO de servicios del gimnasio
// ✅ CORREGIDO: Sin el ORDER BY problemático

const { GymServices } = require('../models');
const { validationResult } = require('express-validator');

class ServicesController {
  constructor() {
    // Bindear todos los métodos
    this.getAllServices = this.getAllServices.bind(this);
    this.getActiveServices = this.getActiveServices.bind(this);
    this.getServiceById = this.getServiceById.bind(this);
    this.createService = this.createService.bind(this);
    this.updateService = this.updateService.bind(this);
    this.deleteService = this.deleteService.bind(this);
    this.toggleServiceStatus = this.toggleServiceStatus.bind(this);
    this.reorderServices = this.reorderServices.bind(this);
    this.duplicateService = this.duplicateService.bind(this);
    this.getServicesStats = this.getServicesStats.bind(this);
    this.seedDefaultServices = this.seedDefaultServices.bind(this);
  }

  // ✅ GET ALL (Admin) - Todos los servicios incluyendo inactivos
  async getAllServices(req, res) {
    try {
      const services = await GymServices.findAll({
        order: [['displayOrder', 'ASC']] // ⚠️ QUITADO: ['createdAt', 'DESC']
      });

      const formattedServices = services.map(service => ({
        id: service.id,
        title: service.title,
        description: service.description,
        iconName: service.iconName,
        imageUrl: service.imageUrl || '',
        features: service.features || [],
        displayOrder: service.displayOrder,
        isActive: service.isActive,
        createdAt: service.createdAt,
        updatedAt: service.updatedAt
      }));

      res.json({
        success: true,
        data: formattedServices,
        total: formattedServices.length,
        message: 'Servicios obtenidos exitosamente'
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

  // ✅ GET ACTIVE (Público) - Solo servicios activos para el frontend
  async getActiveServices(req, res) {
    try {
      const services = await GymServices.getActiveServices();

      const formattedServices = services.map(service => ({
        id: service.id,
        title: service.title,
        description: service.description,
        icon: service.iconName,
        imageUrl: service.imageUrl || '',
        features: service.features || [],
        active: service.isActive,
        order: service.displayOrder
      }));

      res.json({
        success: true,
        data: formattedServices,
        total: formattedServices.length
      });
    } catch (error) {
      console.error('Error al obtener servicios activos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener servicios activos',
        error: error.message
      });
    }
  }

  // ✅ GET BY ID (Admin)
  async getServiceById(req, res) {
    try {
      const { id } = req.params;

      const service = await GymServices.findByPk(id);

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Servicio no encontrado'
        });
      }

      res.json({
        success: true,
        data: {
          id: service.id,
          title: service.title,
          description: service.description,
          iconName: service.iconName,
          imageUrl: service.imageUrl || '',
          features: service.features || [],
          displayOrder: service.displayOrder,
          isActive: service.isActive,
          createdAt: service.createdAt,
          updatedAt: service.updatedAt
        }
      });
    } catch (error) {
      console.error('Error al obtener servicio:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener servicio',
        error: error.message
      });
    }
  }

  // ✅ CREATE (Admin)
  async createService(req, res) {
    try {
      // Validar errores
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Errores de validación',
          errors: errors.array()
        });
      }

      const {
        title,
        description,
        iconName,
        imageUrl,
        features,
        displayOrder,
        isActive
      } = req.body;

      // Verificar si ya existe un servicio con el mismo título
      const existingService = await GymServices.findOne({
        where: { title }
      });

      if (existingService) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un servicio con ese título'
        });
      }

      // Determinar el orden de visualización
      let finalDisplayOrder = displayOrder;
      if (finalDisplayOrder === undefined || finalDisplayOrder === null) {
        const maxOrder = await GymServices.max('displayOrder');
        finalDisplayOrder = (maxOrder || 0) + 1;
      }

      // Crear el servicio
      const newService = await GymServices.create({
        title,
        description: description || '',
        iconName: iconName || 'dumbbell',
        imageUrl: imageUrl || '',
        features: features || [],
        displayOrder: finalDisplayOrder,
        isActive: isActive !== false
      });

      res.status(201).json({
        success: true,
        message: 'Servicio creado exitosamente',
        data: {
          id: newService.id,
          title: newService.title,
          description: newService.description,
          iconName: newService.iconName,
          imageUrl: newService.imageUrl,
          features: newService.features,
          displayOrder: newService.displayOrder,
          isActive: newService.isActive
        }
      });
    } catch (error) {
      console.error('Error al crear servicio:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear servicio',
        error: error.message
      });
    }
  }

  // ✅ UPDATE (Admin)
  async updateService(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Errores de validación',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const {
        title,
        description,
        iconName,
        imageUrl,
        features,
        displayOrder,
        isActive
      } = req.body;

      const service = await GymServices.findByPk(id);

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Servicio no encontrado'
        });
      }

      // Verificar título único (si se está cambiando)
      if (title && title !== service.title) {
        const existingService = await GymServices.findOne({
          where: { title }
        });

        if (existingService) {
          return res.status(400).json({
            success: false,
            message: 'Ya existe un servicio con ese título'
          });
        }
      }

      // Actualizar campos
      if (title !== undefined) service.title = title;
      if (description !== undefined) service.description = description;
      if (iconName !== undefined) service.iconName = iconName;
      if (imageUrl !== undefined) service.imageUrl = imageUrl;
      if (features !== undefined) service.features = features;
      if (displayOrder !== undefined) service.displayOrder = displayOrder;
      if (isActive !== undefined) service.isActive = isActive;

      await service.save();

      res.json({
        success: true,
        message: 'Servicio actualizado exitosamente',
        data: {
          id: service.id,
          title: service.title,
          description: service.description,
          iconName: service.iconName,
          imageUrl: service.imageUrl,
          features: service.features,
          displayOrder: service.displayOrder,
          isActive: service.isActive
        }
      });
    } catch (error) {
      console.error('Error al actualizar servicio:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar servicio',
        error: error.message
      });
    }
  }

  // ✅ DELETE (Admin)
  async deleteService(req, res) {
    try {
      const { id } = req.params;

      const service = await GymServices.findByPk(id);

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Servicio no encontrado'
        });
      }

      const serviceName = service.title;
      await service.destroy();

      res.json({
        success: true,
        message: `Servicio "${serviceName}" eliminado exitosamente`
      });
    } catch (error) {
      console.error('Error al eliminar servicio:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar servicio',
        error: error.message
      });
    }
  }

  // ✅ TOGGLE STATUS (Admin)
  async toggleServiceStatus(req, res) {
    try {
      const { id } = req.params;

      const service = await GymServices.findByPk(id);

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Servicio no encontrado'
        });
      }

      service.isActive = !service.isActive;
      await service.save();

      res.json({
        success: true,
        message: `Servicio ${service.isActive ? 'activado' : 'desactivado'} exitosamente`,
        data: {
          id: service.id,
          title: service.title,
          isActive: service.isActive
        }
      });
    } catch (error) {
      console.error('Error al cambiar estado del servicio:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cambiar estado del servicio',
        error: error.message
      });
    }
  }

  // ✅ REORDER (Admin) - Cambiar orden de múltiples servicios
  async reorderServices(req, res) {
    try {
      const { services } = req.body;

      if (!Array.isArray(services) || services.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un array de servicios con id y displayOrder'
        });
      }

      // Actualizar orden de cada servicio
      const updatePromises = services.map(({ id, displayOrder }) =>
        GymServices.update(
          { displayOrder },
          { where: { id } }
        )
      );

      await Promise.all(updatePromises);

      // Obtener servicios reordenados
      const reorderedServices = await GymServices.findAll({
        order: [['displayOrder', 'ASC']]
      });

      res.json({
        success: true,
        message: 'Servicios reordenados exitosamente',
        data: reorderedServices.map(s => ({
          id: s.id,
          title: s.title,
          displayOrder: s.displayOrder
        }))
      });
    } catch (error) {
      console.error('Error al reordenar servicios:', error);
      res.status(500).json({
        success: false,
        message: 'Error al reordenar servicios',
        error: error.message
      });
    }
  }

  // ✅ DUPLICATE (Admin)
  async duplicateService(req, res) {
    try {
      const { id } = req.params;

      const originalService = await GymServices.findByPk(id);

      if (!originalService) {
        return res.status(404).json({
          success: false,
          message: 'Servicio no encontrado'
        });
      }

      // Crear título único
      let newTitle = `${originalService.title} (Copia)`;
      let counter = 1;
      
      while (await GymServices.findOne({ where: { title: newTitle } })) {
        counter++;
        newTitle = `${originalService.title} (Copia ${counter})`;
      }

      // Obtener el máximo displayOrder
      const maxOrder = await GymServices.max('displayOrder');

      // Crear duplicado
      const duplicatedService = await GymServices.create({
        title: newTitle,
        description: originalService.description,
        iconName: originalService.iconName,
        imageUrl: originalService.imageUrl,
        features: originalService.features,
        displayOrder: (maxOrder || 0) + 1,
        isActive: false // Crear desactivado por seguridad
      });

      res.status(201).json({
        success: true,
        message: 'Servicio duplicado exitosamente',
        data: {
          id: duplicatedService.id,
          title: duplicatedService.title,
          description: duplicatedService.description,
          iconName: duplicatedService.iconName,
          imageUrl: duplicatedService.imageUrl,
          features: duplicatedService.features,
          displayOrder: duplicatedService.displayOrder,
          isActive: duplicatedService.isActive
        }
      });
    } catch (error) {
      console.error('Error al duplicar servicio:', error);
      res.status(500).json({
        success: false,
        message: 'Error al duplicar servicio',
        error: error.message
      });
    }
  }

  // ✅ STATS (Admin)
  async getServicesStats(req, res) {
    try {
      const [total, active, inactive] = await Promise.all([
        GymServices.count(),
        GymServices.count({ where: { isActive: true } }),
        GymServices.count({ where: { isActive: false } })
      ]);

      // Servicios más populares (basado en displayOrder - los primeros son más importantes)
      const topServices = await GymServices.findAll({
        where: { isActive: true },
        order: [['displayOrder', 'ASC']],
        limit: 3
      });

      // Servicios con más características
      const servicesWithFeatures = await GymServices.findAll({
        where: { isActive: true }
      });

      const avgFeaturesCount = servicesWithFeatures.reduce((acc, service) => 
        acc + (service.features?.length || 0), 0
      ) / (servicesWithFeatures.length || 1);

      res.json({
        success: true,
        data: {
          total,
          active,
          inactive,
          activePercentage: total > 0 ? ((active / total) * 100).toFixed(1) : 0,
          topServices: topServices.map(s => ({
            id: s.id,
            title: s.title,
            features: s.features?.length || 0
          })),
          averageFeaturesPerService: Math.round(avgFeaturesCount),
          servicesWithImages: servicesWithFeatures.filter(s => s.imageUrl).length,
          servicesWithoutImages: servicesWithFeatures.filter(s => !s.imageUrl).length
        }
      });
    } catch (error) {
      console.error('Error al obtener estadísticas de servicios:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }

  // ✅ SEED DEFAULTS (Admin)
  async seedDefaultServices(req, res) {
    try {
      await GymServices.seedDefaultServices();

      const services = await GymServices.findAll({
        order: [['displayOrder', 'ASC']]
      });

      res.json({
        success: true,
        message: 'Servicios por defecto creados exitosamente',
        data: services.map(s => ({
          id: s.id,
          title: s.title,
          iconName: s.iconName
        }))
      });
    } catch (error) {
      console.error('Error al crear servicios por defecto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear servicios por defecto',
        error: error.message
      });
    }
  }
}

module.exports = new ServicesController();