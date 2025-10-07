// src/controllers/gymContactSocialController.js - GESTIÓN DE CONTACTO Y REDES SOCIALES
const { 
  GymContactInfo,
  GymSocialMedia
} = require('../models');

class GymContactSocialController {
  constructor() {
    // Bindear métodos
    this.updateContactInfo = this.updateContactInfo.bind(this);
    this.getAllSocialMedia = this.getAllSocialMedia.bind(this);
    this.getSocialMediaByPlatform = this.getSocialMediaByPlatform.bind(this);
    this.createSocialMedia = this.createSocialMedia.bind(this);
    this.updateSocialMedia = this.updateSocialMedia.bind(this);
    this.toggleSocialMedia = this.toggleSocialMedia.bind(this);
    this.deleteSocialMedia = this.deleteSocialMedia.bind(this);
    this.reorderSocialMedia = this.reorderSocialMedia.bind(this);
  }

  // ✅ ==================== CONTACTO ====================

  /**
   * PUT /api/gym/contact
   * Actualizar información de contacto del gym
   */
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

      // Obtener registro actual
      let contactInfo = await GymContactInfo.findOne();
      
      if (!contactInfo) {
        // Crear si no existe
        contactInfo = await GymContactInfo.create({
          phone: phone || '+502 1234-5678',
          email: email || 'info@elitefitness.com',
          address: address || 'Zona 10, Ciudad de Guatemala',
          addressShort: addressShort || 'Zona 10, Guatemala',
          city: city || 'Ciudad de Guatemala',
          country: country || 'Guatemala',
          mapsUrl: mapsUrl || null,
          latitude: latitude || null,
          longitude: longitude || null
        });

        console.log('📞 Información de contacto creada');
      } else {
        // Actualizar campos proporcionados
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
        console.log('📞 Información de contacto actualizada');
      }

      res.json({
        success: true,
        message: 'Información de contacto actualizada exitosamente',
        data: {
          phone: contactInfo.phone,
          email: contactInfo.email,
          address: contactInfo.address,
          addressShort: contactInfo.addressShort,
          city: contactInfo.city,
          country: contactInfo.country,
          whatsapp: contactInfo.phone,
          location: {
            lat: contactInfo.latitude,
            lng: contactInfo.longitude,
            mapsUrl: contactInfo.mapsUrl
          }
        }
      });

    } catch (error) {
      console.error('Error actualizando información de contacto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar información de contacto',
        error: error.message
      });
    }
  }

  // ✅ ==================== REDES SOCIALES ====================

  /**
   * GET /api/gym/social-media/all
   * Obtener todas las redes sociales (admin)
   */
  async getAllSocialMedia(req, res) {
    try {
      const socialMedia = await GymSocialMedia.findAll({
        order: [['displayOrder', 'ASC'], ['platform', 'ASC']]
      });

      const formattedData = socialMedia.map(sm => ({
        id: sm.id,
        platform: sm.platform,
        url: sm.url,
        handle: sm.handle,
        isActive: sm.isActive,
        displayOrder: sm.displayOrder,
        createdAt: sm.createdAt,
        updatedAt: sm.updatedAt
      }));

      res.json({
        success: true,
        data: formattedData,
        total: formattedData.length,
        active: formattedData.filter(sm => sm.isActive).length
      });

    } catch (error) {
      console.error('Error obteniendo redes sociales:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener redes sociales',
        error: error.message
      });
    }
  }

  /**
   * GET /api/gym/social-media/:platform
   * Obtener una red social específica
   */
  async getSocialMediaByPlatform(req, res) {
    try {
      const { platform } = req.params;

      const socialMedia = await GymSocialMedia.findOne({
        where: { platform: platform.toLowerCase() }
      });

      if (!socialMedia) {
        return res.status(404).json({
          success: false,
          message: `Red social ${platform} no encontrada`
        });
      }

      res.json({
        success: true,
        data: {
          id: socialMedia.id,
          platform: socialMedia.platform,
          url: socialMedia.url,
          handle: socialMedia.handle,
          isActive: socialMedia.isActive,
          displayOrder: socialMedia.displayOrder
        }
      });

    } catch (error) {
      console.error('Error obteniendo red social:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener red social',
        error: error.message
      });
    }
  }

  /**
   * POST /api/gym/social-media
   * Crear o actualizar una red social
   */
  async createSocialMedia(req, res) {
    try {
      const { platform, url, handle, isActive, displayOrder } = req.body;

      // Validar plataforma
      const validPlatforms = ['instagram', 'facebook', 'youtube', 'whatsapp', 'tiktok', 'twitter'];
      if (!platform || !validPlatforms.includes(platform.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Plataforma inválida',
          validPlatforms
        });
      }

      // Validar URL
      if (!url || !url.trim()) {
        return res.status(400).json({
          success: false,
          message: 'URL es requerida'
        });
      }

      // Verificar si ya existe
      const existing = await GymSocialMedia.findOne({
        where: { platform: platform.toLowerCase() }
      });

      let socialMedia;

      if (existing) {
        // Actualizar existente
        existing.url = url.trim();
        if (handle !== undefined) existing.handle = handle?.trim() || null;
        if (isActive !== undefined) existing.isActive = isActive;
        if (displayOrder !== undefined) existing.displayOrder = displayOrder;
        
        await existing.save();
        socialMedia = existing;
        
        console.log(`📱 Red social ${platform} actualizada`);
      } else {
        // Crear nueva
        const maxOrder = await GymSocialMedia.max('displayOrder') || 0;
        
        socialMedia = await GymSocialMedia.create({
          platform: platform.toLowerCase(),
          url: url.trim(),
          handle: handle?.trim() || null,
          isActive: isActive !== undefined ? isActive : true,
          displayOrder: displayOrder !== undefined ? displayOrder : maxOrder + 1
        });
        
        console.log(`📱 Red social ${platform} creada`);
      }

      res.json({
        success: true,
        message: `Red social ${platform} ${existing ? 'actualizada' : 'creada'} exitosamente`,
        data: {
          id: socialMedia.id,
          platform: socialMedia.platform,
          url: socialMedia.url,
          handle: socialMedia.handle,
          isActive: socialMedia.isActive,
          displayOrder: socialMedia.displayOrder
        }
      });

    } catch (error) {
      console.error('Error creando/actualizando red social:', error);
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          message: 'Esta plataforma ya existe'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error al crear/actualizar red social',
        error: error.message
      });
    }
  }

  /**
   * PUT /api/gym/social-media/:platform
   * Actualizar una red social existente
   */
  async updateSocialMedia(req, res) {
    try {
      const { platform } = req.params;
      const { url, handle, isActive, displayOrder } = req.body;

      const socialMedia = await GymSocialMedia.findOne({
        where: { platform: platform.toLowerCase() }
      });

      if (!socialMedia) {
        return res.status(404).json({
          success: false,
          message: `Red social ${platform} no encontrada`
        });
      }

      // Actualizar campos proporcionados
      if (url !== undefined) socialMedia.url = url.trim();
      if (handle !== undefined) socialMedia.handle = handle?.trim() || null;
      if (isActive !== undefined) socialMedia.isActive = isActive;
      if (displayOrder !== undefined) socialMedia.displayOrder = displayOrder;

      await socialMedia.save();

      console.log(`📱 Red social ${platform} actualizada`);

      res.json({
        success: true,
        message: `Red social ${platform} actualizada exitosamente`,
        data: {
          id: socialMedia.id,
          platform: socialMedia.platform,
          url: socialMedia.url,
          handle: socialMedia.handle,
          isActive: socialMedia.isActive,
          displayOrder: socialMedia.displayOrder
        }
      });

    } catch (error) {
      console.error('Error actualizando red social:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar red social',
        error: error.message
      });
    }
  }

  /**
   * PATCH /api/gym/social-media/:platform/toggle
   * Activar/Desactivar una red social
   */
  async toggleSocialMedia(req, res) {
    try {
      const { platform } = req.params;

      const socialMedia = await GymSocialMedia.findOne({
        where: { platform: platform.toLowerCase() }
      });

      if (!socialMedia) {
        return res.status(404).json({
          success: false,
          message: `Red social ${platform} no encontrada`
        });
      }

      // Toggle estado
      socialMedia.isActive = !socialMedia.isActive;
      await socialMedia.save();

      const status = socialMedia.isActive ? 'activada' : 'desactivada';
      console.log(`📱 Red social ${platform} ${status}`);

      res.json({
        success: true,
        message: `Red social ${platform} ${status} exitosamente`,
        data: {
          platform: socialMedia.platform,
          isActive: socialMedia.isActive,
          url: socialMedia.url,
          handle: socialMedia.handle
        }
      });

    } catch (error) {
      console.error('Error toggling red social:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cambiar estado de red social',
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/gym/social-media/:platform
   * Eliminar una red social
   */
  async deleteSocialMedia(req, res) {
    try {
      const { platform } = req.params;

      const socialMedia = await GymSocialMedia.findOne({
        where: { platform: platform.toLowerCase() }
      });

      if (!socialMedia) {
        return res.status(404).json({
          success: false,
          message: `Red social ${platform} no encontrada`
        });
      }

      const deletedData = {
        platform: socialMedia.platform,
        url: socialMedia.url
      };

      await socialMedia.destroy();

      console.log(`📱 Red social ${platform} eliminada`);

      res.json({
        success: true,
        message: `Red social ${platform} eliminada exitosamente`,
        data: deletedData
      });

    } catch (error) {
      console.error('Error eliminando red social:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar red social',
        error: error.message
      });
    }
  }

  /**
   * PUT /api/gym/social-media/reorder
   * Reordenar múltiples redes sociales
   */
  async reorderSocialMedia(req, res) {
    try {
      const { order } = req.body;

      // Validar formato: [{platform: 'instagram', displayOrder: 1}, ...]
      if (!Array.isArray(order) || order.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un array de orden válido'
        });
      }

      const updated = [];

      for (const item of order) {
        if (!item.platform || item.displayOrder === undefined) {
          continue;
        }

        const socialMedia = await GymSocialMedia.findOne({
          where: { platform: item.platform.toLowerCase() }
        });

        if (socialMedia) {
          socialMedia.displayOrder = item.displayOrder;
          await socialMedia.save();
          updated.push({
            platform: socialMedia.platform,
            displayOrder: socialMedia.displayOrder
          });
        }
      }

      console.log(`📱 ${updated.length} redes sociales reordenadas`);

      res.json({
        success: true,
        message: 'Redes sociales reordenadas exitosamente',
        data: updated
      });

    } catch (error) {
      console.error('Error reordenando redes sociales:', error);
      res.status(500).json({
        success: false,
        message: 'Error al reordenar redes sociales',
        error: error.message
      });
    }
  }
}

module.exports = new GymContactSocialController();