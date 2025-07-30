// src/controllers/gymMediaController.js - CONTROLADOR UNIFICADO DE MULTIMEDIA
const { 
  GymConfiguration,
  GymServices,
  GymTestimonials,
  User,
  StoreProduct,
  StoreProductImage
} = require('../models');
const { deleteFile, deleteVideo } = require('../config/cloudinary');

class GymMediaController {
  constructor() {
    // ✅ Bindear métodos al contexto
    this.uploadLogo = this.uploadLogo.bind(this);
    this.uploadHeroVideo = this.uploadHeroVideo.bind(this);
    this.uploadHeroImage = this.uploadHeroImage.bind(this);
    this.uploadServiceImage = this.uploadServiceImage.bind(this);
    this.uploadTestimonialImage = this.uploadTestimonialImage.bind(this);
    this.uploadProductImage = this.uploadProductImage.bind(this);
    this.updateUserProfileImage = this.updateUserProfileImage.bind(this);
    this.deleteMedia = this.deleteMedia.bind(this);
    this.getMediaInfo = this.getMediaInfo.bind(this);
  }

  // ✅ 1. SUBIR LOGO DEL GYM
  async uploadLogo(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se recibió ningún archivo'
        });
      }

      const logoUrl = req.file.path; // URL de Cloudinary
      const publicId = req.file.filename; // Public ID de Cloudinary

      // ✅ Actualizar configuración del gym con nueva URL
      const config = await GymConfiguration.getConfig();
      
      // Eliminar logo anterior si existe
      if (config.logoUrl) {
        const oldPublicId = this.extractPublicId(config.logoUrl);
        if (oldPublicId) {
          await deleteFile(oldPublicId);
        }
      }

      // Guardar nueva URL en BD
      config.logoUrl = logoUrl;
      await config.save();

      console.log('🏢 Logo actualizado:', logoUrl);

      res.json({
        success: true,
        message: 'Logo subido y guardado exitosamente',
        data: {
          logoUrl,
          publicId,
          config: {
            gymName: config.gymName,
            logoUrl: config.logoUrl
          }
        }
      });
    } catch (error) {
      console.error('Error al subir logo:', error);
      res.status(500).json({
        success: false,
        message: 'Error al subir logo',
        error: error.message
      });
    }
  }

  // ✅ 2. SUBIR VIDEO HERO - CORREGIDO
  async uploadHeroVideo(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se recibió ningún video'
        });
      }

      const videoUrl = req.file.path;
      const publicId = req.file.filename;
      
      // ✅ Generar poster automático del video
      const posterUrl = videoUrl.replace('/video/upload/', '/video/upload/so_0/');

      // ✅ Actualizar configuración con nueva URL
      const config = await GymConfiguration.getConfig();
      
      // Eliminar video anterior si existe
      if (config.heroVideoUrl) {
        const oldPublicId = this.extractPublicId(config.heroVideoUrl);
        if (oldPublicId) {
          await deleteVideo(oldPublicId);
        }
      }

      // ✅ CORREGIDO: Solo guardar video URL, no sobrescribir imagen hero
      config.heroVideoUrl = videoUrl;
      
      // ✅ NUEVO: Solo actualizar heroImageUrl si no existe una imagen específica
      if (!config.heroImageUrl || config.heroImageUrl.includes('so_0')) {
        // Solo usar poster si no hay imagen hero específica o si la actual es un poster
        config.heroImageUrl = posterUrl;
      }
      
      await config.save();

      console.log('🎬 Video hero actualizado:', videoUrl);
      console.log('🖼️ Poster generado:', posterUrl);

      // ✅ NUEVO: Obtener configuración completa actualizada
      const videoConfig = config.getVideoConfig();
      const heroData = config.getHeroData();

      res.json({
        success: true,
        message: 'Video hero subido y guardado exitosamente',
        data: {
          videoUrl,
          posterUrl,
          publicId,
          // ✅ NUEVO: Información completa del video
          videoInfo: {
            hasVideo: true,
            hasCustomImage: !!config.heroImageUrl && !config.heroImageUrl.includes('so_0'),
            usingPosterAsImage: config.heroImageUrl === posterUrl
          },
          // ✅ NUEVO: Configuración completa de video
          videoSettings: {
            autoplay: config.videoAutoplay,
            muted: config.videoMuted,
            loop: config.videoLoop,
            controls: config.videoControls
          },
          // ✅ NUEVO: Datos del hero actualizados
          heroData: {
            title: heroData.title,
            description: heroData.description,
            videoUrl: videoUrl,
            imageUrl: config.heroImageUrl,
            hasVideo: true,
            hasImage: !!config.heroImageUrl
          },
          // ✅ NUEVO: URLs para el frontend
          frontendData: {
            'hero.videoUrl': videoUrl,
            'hero.imageUrl': config.heroImageUrl,
            'videoUrl': videoUrl,
            'imageUrl': config.heroImageUrl,
            'hasVideo': true,
            'hasImage': !!config.heroImageUrl
          }
        }
      });
    } catch (error) {
      console.error('Error al subir video hero:', error);
      res.status(500).json({
        success: false,
        message: 'Error al subir video hero',
        error: error.message
      });
    }
  }

  // ✅ 3. SUBIR IMAGEN HERO - CORREGIDO para distinguir de poster
  async uploadHeroImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se recibió ninguna imagen'
        });
      }

      const imageUrl = req.file.path;
      const publicId = req.file.filename;

      // ✅ Actualizar configuración
      const config = await GymConfiguration.getConfig();
      
      // Eliminar imagen anterior si existe y no es un poster de video
      if (config.heroImageUrl && !config.heroImageUrl.includes('so_0')) {
        const oldPublicId = this.extractPublicId(config.heroImageUrl);
        if (oldPublicId) {
          await deleteFile(oldPublicId);
        }
      }

      // ✅ NUEVO: Guardar como imagen específica (no poster)
      config.heroImageUrl = imageUrl;
      await config.save();

      console.log('🖼️ Imagen hero actualizada:', imageUrl);

      // ✅ NUEVO: Obtener datos actualizados
      const heroData = config.getHeroData();

      res.json({
        success: true,
        message: 'Imagen hero subida y guardada exitosamente',
        data: {
          imageUrl,
          publicId,
          // ✅ NUEVO: Información de la imagen
          imageInfo: {
            hasImage: true,
            hasVideo: !!config.heroVideoUrl,
            isCustomImage: true, // No es poster de video
            replacedPoster: config.heroImageUrl !== imageUrl // Si reemplazó un poster
          },
          // ✅ NUEVO: Datos del hero actualizados
          heroData: {
            title: heroData.title,
            description: heroData.description,
            videoUrl: config.heroVideoUrl || '',
            imageUrl: imageUrl,
            hasVideo: !!config.heroVideoUrl,
            hasImage: true
          },
          // ✅ NUEVO: URLs para el frontend
          frontendData: {
            'hero.imageUrl': imageUrl,
            'hero.videoUrl': config.heroVideoUrl || '',
            'imageUrl': imageUrl,
            'videoUrl': config.heroVideoUrl || '',
            'hasImage': true,
            'hasVideo': !!config.heroVideoUrl
          }
        }
      });
    } catch (error) {
      console.error('Error al subir imagen hero:', error);
      res.status(500).json({
        success: false,
        message: 'Error al subir imagen hero',
        error: error.message
      });
    }
  }

  // ✅ 3. SUBIR IMAGEN HERO
  async uploadHeroImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se recibió ninguna imagen'
        });
      }

      const imageUrl = req.file.path;
      const publicId = req.file.filename;

      // ✅ Actualizar configuración
      const config = await GymConfiguration.getConfig();
      
      // Eliminar imagen anterior si existe
      if (config.heroImageUrl) {
        const oldPublicId = this.extractPublicId(config.heroImageUrl);
        if (oldPublicId) {
          await deleteFile(oldPublicId);
        }
      }

      config.heroImageUrl = imageUrl;
      await config.save();

      console.log('🖼️ Imagen hero actualizada:', imageUrl);

      res.json({
        success: true,
        message: 'Imagen hero subida y guardada exitosamente',
        data: {
          imageUrl,
          publicId
        }
      });
    } catch (error) {
      console.error('Error al subir imagen hero:', error);
      res.status(500).json({
        success: false,
        message: 'Error al subir imagen hero',
        error: error.message
      });
    }
  }

  // ✅ 4. SUBIR IMAGEN DE SERVICIO
  async uploadServiceImage(req, res) {
    try {
      const { serviceId } = req.params;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se recibió ninguna imagen'
        });
      }

      // Verificar que el servicio existe
      const service = await GymServices.findByPk(serviceId);
      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Servicio no encontrado'
        });
      }

      const imageUrl = req.file.path;
      const publicId = req.file.filename;

      // Eliminar imagen anterior si existe
      if (service.imageUrl) {
        const oldPublicId = this.extractPublicId(service.imageUrl);
        if (oldPublicId) {
          await deleteFile(oldPublicId);
        }
      }

      // ✅ Guardar URL en el servicio
      service.imageUrl = imageUrl;
      await service.save();

      console.log(`🏋️ Imagen de servicio "${service.title}" actualizada:`, imageUrl);

      res.json({
        success: true,
        message: 'Imagen de servicio subida y guardada exitosamente',
        data: {
          serviceId: service.id,
          serviceName: service.title,
          imageUrl,
          publicId
        }
      });
    } catch (error) {
      console.error('Error al subir imagen de servicio:', error);
      res.status(500).json({
        success: false,
        message: 'Error al subir imagen de servicio',
        error: error.message
      });
    }
  }

  // ✅ 5. SUBIR IMAGEN DE TESTIMONIO
  async uploadTestimonialImage(req, res) {
    try {
      const { testimonialId } = req.params;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se recibió ninguna imagen'
        });
      }

      // Verificar que el testimonio existe
      const testimonial = await GymTestimonials.findByPk(testimonialId);
      if (!testimonial) {
        return res.status(404).json({
          success: false,
          message: 'Testimonio no encontrado'
        });
      }

      const imageUrl = req.file.path;
      const publicId = req.file.filename;

      // Eliminar imagen anterior si existe
      if (testimonial.imageUrl) {
        const oldPublicId = this.extractPublicId(testimonial.imageUrl);
        if (oldPublicId) {
          await deleteFile(oldPublicId);
        }
      }

      // ✅ Guardar URL en el testimonio
      testimonial.imageUrl = imageUrl;
      await testimonial.save();

      console.log(`💬 Imagen de testimonio de "${testimonial.name}" actualizada:`, imageUrl);

      res.json({
        success: true,
        message: 'Imagen de testimonio subida y guardada exitosamente',
        data: {
          testimonialId: testimonial.id,
          clientName: testimonial.name,
          imageUrl,
          publicId
        }
      });
    } catch (error) {
      console.error('Error al subir imagen de testimonio:', error);
      res.status(500).json({
        success: false,
        message: 'Error al subir imagen de testimonio',
        error: error.message
      });
    }
  }

  // ✅ 6. SUBIR IMAGEN DE PRODUCTO
  async uploadProductImage(req, res) {
    try {
      const { productId } = req.params;
      const { isPrimary = false } = req.body;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se recibió ninguna imagen'
        });
      }

      // Verificar que el producto existe
      const product = await StoreProduct.findByPk(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      const imageUrl = req.file.path;
      const publicId = req.file.filename;

      // ✅ Si es imagen principal, desmarcar otras como principales
      if (isPrimary) {
        await StoreProductImage.update(
          { isPrimary: false },
          { where: { productId } }
        );
      }

      // ✅ Crear nueva imagen de producto
      const productImage = await StoreProductImage.create({
        productId: productId,
        imageUrl: imageUrl,
        altText: `${product.name} - Imagen`,
        isPrimary: isPrimary,
        displayOrder: await this.getNextDisplayOrder(productId)
      });

      console.log(`🛍️ Imagen de producto "${product.name}" agregada:`, imageUrl);

      res.json({
        success: true,
        message: 'Imagen de producto subida y guardada exitosamente',
        data: {
          productId: product.id,
          productName: product.name,
          imageId: productImage.id,
          imageUrl,
          publicId,
          isPrimary,
          displayOrder: productImage.displayOrder
        }
      });
    } catch (error) {
      console.error('Error al subir imagen de producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al subir imagen de producto',
        error: error.message
      });
    }
  }

  // ✅ 7. ACTUALIZAR IMAGEN DE PERFIL DE USUARIO
  async updateUserProfileImage(req, res) {
    try {
      const { userId } = req.params;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se recibió ninguna imagen'
        });
      }

      // Verificar que el usuario existe
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const imageUrl = req.file.path;
      const publicId = req.file.filename;

      // Eliminar imagen anterior si existe
      if (user.profileImage) {
        const oldPublicId = this.extractPublicId(user.profileImage);
        if (oldPublicId) {
          await deleteFile(oldPublicId);
        }
      }

      // ✅ Guardar nueva URL en el usuario
      user.profileImage = imageUrl;
      await user.save();

      console.log(`👤 Imagen de perfil de "${user.getFullName()}" actualizada:`, imageUrl);

      res.json({
        success: true,
        message: 'Imagen de perfil actualizada exitosamente',
        data: {
          userId: user.id,
          userName: user.getFullName(),
          profileImage: imageUrl,
          publicId
        }
      });
    } catch (error) {
      console.error('Error al actualizar imagen de perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar imagen de perfil',
        error: error.message
      });
    }
  }

  // ✅ 8. ELIMINAR ARCHIVO MULTIMEDIA
  async deleteMedia(req, res) {
    try {
      const { type, id, imageId } = req.params;

      let result = { success: false };
      let updateResult = null;

      switch (type) {
        case 'logo':
          updateResult = await this.deleteLogo();
          break;
        case 'hero-video':
          updateResult = await this.deleteHeroVideo();
          break;
        case 'hero-image':
          updateResult = await this.deleteHeroImage();
          break;
        case 'service':
          updateResult = await this.deleteServiceImage(id);
          break;
        case 'testimonial':
          updateResult = await this.deleteTestimonialImage(id);
          break;
        case 'product':
          updateResult = await this.deleteProductImage(imageId);
          break;
        case 'user-profile':
          updateResult = await this.deleteUserProfileImage(id);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Tipo de archivo no válido'
          });
      }

      if (updateResult && updateResult.success) {
        res.json({
          success: true,
          message: `${type} eliminado exitosamente`,
          data: updateResult.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: updateResult?.message || 'Error al eliminar archivo'
        });
      }
    } catch (error) {
      console.error('Error al eliminar archivo:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar archivo',
        error: error.message
      });
    }
  }

  // ✅ 9. OBTENER INFORMACIÓN DE ARCHIVOS MULTIMEDIA
  async getMediaInfo(req, res) {
    try {
      const config = await GymConfiguration.getConfig();
      const services = await GymServices.findAll({ where: { isActive: true } });
      const testimonials = await GymTestimonials.findAll({ where: { isActive: true } });

      const mediaInfo = {
        logo: {
          exists: !!config.logoUrl,
          url: config.logoUrl || '',
          publicId: config.logoUrl ? this.extractPublicId(config.logoUrl) : null
        },
        heroVideo: {
          exists: !!config.heroVideoUrl,
          url: config.heroVideoUrl || '',
          publicId: config.heroVideoUrl ? this.extractPublicId(config.heroVideoUrl) : null,
          settings: {
            autoplay: config.videoAutoplay,
            muted: config.videoMuted,
            loop: config.videoLoop,
            controls: config.videoControls
          }
        },
        heroImage: {
          exists: !!config.heroImageUrl,
          url: config.heroImageUrl || '',
          publicId: config.heroImageUrl ? this.extractPublicId(config.heroImageUrl) : null
        },
        services: services.map(service => ({
          id: service.id,
          title: service.title,
          hasImage: !!service.imageUrl,
          imageUrl: service.imageUrl || '',
          publicId: service.imageUrl ? this.extractPublicId(service.imageUrl) : null
        })),
        testimonials: testimonials.map(testimonial => ({
          id: testimonial.id,
          name: testimonial.name,
          hasImage: !!testimonial.imageUrl,
          imageUrl: testimonial.imageUrl || '',
          publicId: testimonial.imageUrl ? this.extractPublicId(testimonial.imageUrl) : null
        })),
        summary: {
          totalFiles: [config.logoUrl, config.heroVideoUrl, config.heroImageUrl]
            .filter(Boolean).length +
            services.filter(s => s.imageUrl).length +
            testimonials.filter(t => t.imageUrl).length,
          hasLogo: !!config.logoUrl,
          hasHeroVideo: !!config.heroVideoUrl,
          hasHeroImage: !!config.heroImageUrl,
          servicesWithImages: services.filter(s => s.imageUrl).length,
          testimonialsWithImages: testimonials.filter(t => t.imageUrl).length
        }
      };

      res.json({
        success: true,
        data: mediaInfo
      });
    } catch (error) {
      console.error('Error al obtener información de archivos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener información de archivos',
        error: error.message
      });
    }
  }

  // ✅ MÉTODOS AUXILIARES PRIVADOS

  extractPublicId(cloudinaryUrl) {
    if (!cloudinaryUrl) return null;
    try {
      const matches = cloudinaryUrl.match(/\/([^\/]+)\.[a-z]+$/);
      return matches ? matches[1] : null;
    } catch {
      return null;
    }
  }

  async getNextDisplayOrder(productId) {
    const lastImage = await StoreProductImage.findOne({
      where: { productId },
      order: [['displayOrder', 'DESC']]
    });
    return lastImage ? lastImage.displayOrder + 1 : 1;
  }

  // Métodos específicos de eliminación
  async deleteLogo() {
    const config = await GymConfiguration.getConfig();
    if (!config.logoUrl) {
      return { success: false, message: 'No hay logo para eliminar' };
    }

    const publicId = this.extractPublicId(config.logoUrl);
    if (publicId) {
      await deleteFile(publicId);
    }

    config.logoUrl = null;
    await config.save();

    return { success: true, data: { message: 'Logo eliminado' } };
  }

  async deleteHeroVideo() {
    const config = await GymConfiguration.getConfig();
    if (!config.heroVideoUrl) {
      return { success: false, message: 'No hay video hero para eliminar' };
    }

    const publicId = this.extractPublicId(config.heroVideoUrl);
    if (publicId) {
      await deleteVideo(publicId);
    }

    config.heroVideoUrl = null;
    await config.save();

    return { success: true, data: { message: 'Video hero eliminado' } };
  }

  async deleteHeroImage() {
    const config = await GymConfiguration.getConfig();
    if (!config.heroImageUrl) {
      return { success: false, message: 'No hay imagen hero para eliminar' };
    }

    const publicId = this.extractPublicId(config.heroImageUrl);
    if (publicId) {
      await deleteFile(publicId);
    }

    config.heroImageUrl = null;
    await config.save();

    return { success: true, data: { message: 'Imagen hero eliminada' } };
  }

  async deleteServiceImage(serviceId) {
    const service = await GymServices.findByPk(serviceId);
    if (!service || !service.imageUrl) {
      return { success: false, message: 'Servicio no encontrado o sin imagen' };
    }

    const publicId = this.extractPublicId(service.imageUrl);
    if (publicId) {
      await deleteFile(publicId);
    }

    service.imageUrl = '';
    await service.save();

    return { success: true, data: { serviceId, serviceName: service.title } };
  }

  async deleteTestimonialImage(testimonialId) {
    const testimonial = await GymTestimonials.findByPk(testimonialId);
    if (!testimonial || !testimonial.imageUrl) {
      return { success: false, message: 'Testimonio no encontrado o sin imagen' };
    }

    const publicId = this.extractPublicId(testimonial.imageUrl);
    if (publicId) {
      await deleteFile(publicId);
    }

    testimonial.imageUrl = '';
    await testimonial.save();

    return { success: true, data: { testimonialId, clientName: testimonial.name } };
  }

  async deleteProductImage(imageId) {
    const productImage = await StoreProductImage.findByPk(imageId, {
      include: ['product']
    });
    
    if (!productImage) {
      return { success: false, message: 'Imagen de producto no encontrada' };
    }

    const publicId = this.extractPublicId(productImage.imageUrl);
    if (publicId) {
      await deleteFile(publicId);
    }

    await productImage.destroy();

    return { 
      success: true, 
      data: { 
        imageId, 
        productId: productImage.productId,
        productName: productImage.product?.name 
      } 
    };
  }

  async deleteUserProfileImage(userId) {
    const user = await User.findByPk(userId);
    if (!user || !user.profileImage) {
      return { success: false, message: 'Usuario no encontrado o sin imagen de perfil' };
    }

    const publicId = this.extractPublicId(user.profileImage);
    if (publicId) {
      await deleteFile(publicId);
    }

    user.profileImage = null;
    await user.save();

    return { success: true, data: { userId, userName: user.getFullName() } };
  }
}

module.exports = new GymMediaController();