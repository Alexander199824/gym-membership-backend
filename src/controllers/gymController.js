// src/controllers/gymController.js - Controlador principal para configuración del gym
const { 
  GymConfiguration, 
  GymContactInfo, 
  GymHours, 
  GymStatistics, 
  GymServices, 
  MembershipPlans 
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
          configuration,
          contactInfo,
          hours,
          statistics,
          services,
          membershipPlans,
          isOpenNow,
          // ✅ Variables CSS para el frontend
          cssVariables: configuration.generateCSSVariables()
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

  // ✅ Obtener solo configuración básica (más rápido)
  async getConfiguration(req, res) {
    try {
      const configuration = await GymConfiguration.getConfig();
      
      res.json({
        success: true,
        data: {
          configuration,
          cssVariables: configuration.generateCSSVariables()
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

  // ✅ Actualizar configuración (solo admin)
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

      res.json({
        success: true,
        message: 'Configuración actualizada exitosamente',
        data: {
          configuration,
          cssVariables: configuration.generateCSSVariables()
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

  // ✅ Obtener información de contacto
  async getContactInfo(req, res) {
    try {
      const contactInfo = await GymContactInfo.getContactInfo();
      
      res.json({
        success: true,
        data: { contactInfo }
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

  // ✅ Actualizar información de contacto
  async updateContactInfo(req, res) {
    try {
      const {
        phone,
        email,
        address,
        addressShort,
        city,
        country,
        mapsUrl,
        latitude,
        longitude
      } = req.body;

      const contactInfo = await GymContactInfo.getContactInfo();

      // ✅ Actualizar campos proporcionados
      if (phone !== undefined) contactInfo.phone = phone;
      if (email !== undefined) contactInfo.email = email;
      if (address !== undefined) contactInfo.address = address;
      if (addressShort !== undefined) contactInfo.addressShort = addressShort;
      if (city !== undefined) contactInfo.city = city;
      if (country !== undefined) contactInfo.country = country;
      if (mapsUrl !== undefined) contactInfo.mapsUrl = mapsUrl;
      if (latitude !== undefined) contactInfo.latitude = latitude;
      if (longitude !== undefined) contactInfo.longitude = longitude;

      await contactInfo.save();

      res.json({
        success: true,
        message: 'Información de contacto actualizada exitosamente',
        data: { contactInfo }
      });
    } catch (error) {
      console.error('Error al actualizar información de contacto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar información de contacto',
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

  // ✅ Actualizar horarios
  async updateHours(req, res) {
    try {
      const { hours } = req.body; // Objeto con los 7 días de la semana
      
      const updatedHours = {};
      
      for (const [day, schedule] of Object.entries(hours)) {
        const daySchedule = await GymHours.findOne({ where: { dayOfWeek: day } });
        
        if (daySchedule) {
          // ✅ Actualizar horario existente
          if (schedule.openingTime !== undefined) daySchedule.openingTime = schedule.openingTime;
          if (schedule.closingTime !== undefined) daySchedule.closingTime = schedule.closingTime;
          if (schedule.isClosed !== undefined) daySchedule.isClosed = schedule.isClosed;
          if (schedule.specialNote !== undefined) daySchedule.specialNote = schedule.specialNote;
          
          await daySchedule.save();
          updatedHours[day] = daySchedule;
        } else {
          // ✅ Crear nuevo horario
          updatedHours[day] = await GymHours.create({
            dayOfWeek: day,
            ...schedule
          });
        }
      }

      res.json({
        success: true,
        message: 'Horarios actualizados exitosamente',
        data: { hours: updatedHours }
      });
    } catch (error) {
      console.error('Error al actualizar horarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar horarios',
        error: error.message
      });
    }
  }

  // ✅ Obtener estadísticas
  async getStatistics(req, res) {
    try {
      const statistics = await GymStatistics.getActiveStats();
      
      res.json({
        success: true,
        data: { statistics }
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

  // ✅ Actualizar estadísticas
  async updateStatistics(req, res) {
    try {
      const { statistics } = req.body; // Array de estadísticas
      
      const updatedStats = [];
      
      for (const stat of statistics) {
        const [statRecord, created] = await GymStatistics.findOrCreate({
          where: { statKey: stat.statKey },
          defaults: stat
        });
        
        if (!created) {
          // ✅ Actualizar estadística existente
          if (stat.statValue !== undefined) statRecord.statValue = stat.statValue;
          if (stat.displayOrder !== undefined) statRecord.displayOrder = stat.displayOrder;
          if (stat.isActive !== undefined) statRecord.isActive = stat.isActive;
          
          await statRecord.save();
        }
        
        updatedStats.push(statRecord);
      }

      res.json({
        success: true,
        message: 'Estadísticas actualizadas exitosamente',
        data: { statistics: updatedStats }
      });
    } catch (error) {
      console.error('Error al actualizar estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar estadísticas',
        error: error.message
      });
    }
  }

  // ✅ Obtener servicios
  async getServices(req, res) {
    try {
      const services = await GymServices.getActiveServices();
      
      res.json({
        success: true,
        data: { services }
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

  // ✅ Obtener planes de membresía
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
        data: { plans: plansWithDiscounts }
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

  // ✅ Inicializar datos por defecto (útil para primera instalación)
  async initializeDefaultData(req, res) {
    try {
      console.log('🔄 Inicializando datos por defecto del gym...');

      // ✅ Crear datos por defecto en paralelo
      await Promise.all([
        GymStatistics.seedDefaultStats(),
        GymServices.seedDefaultServices(),
        MembershipPlans.seedDefaultPlans()
      ]);

      // ✅ Asegurar que existan configuración y contacto
      await Promise.all([
        GymConfiguration.getConfig(),
        GymContactInfo.getContactInfo(),
        GymHours.getWeeklySchedule()
      ]);

      console.log('✅ Datos por defecto inicializados');

      res.json({
        success: true,
        message: 'Datos por defecto inicializados correctamente'
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