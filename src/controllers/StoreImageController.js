// src/controllers/StoreImageController.js - CON CLOUDINARY
const { StoreProduct, StoreProductImage } = require('../models');
const { 
  uploadProductImage, 
  deleteFile, 
  generateImageSizes,
  isCloudinaryConfigured 
} = require('../config/cloudinary');

class StoreImageController {

  constructor() {
    console.log('📸 StoreImageController iniciado con Cloudinary');
    
    // Verificar configuración de Cloudinary al inicializar
    if (!isCloudinaryConfigured()) {
      console.warn('⚠️ Cloudinary no está configurado correctamente para productos');
    }
  }

  // ✅ Obtener configuración de multer (ya viene de cloudinary.js)
  getMulterConfig() {
    return uploadProductImage;
  }

  // ✅ Subir imagen de producto (ACTUALIZADO para Cloudinary)
  async uploadProductImage(req, res) {
    try {
      const { id: productId } = req.params;
      const { isPrimary = false, altText, displayOrder } = req.query;

      console.log('📸 Subiendo imagen a Cloudinary para producto:', productId);

      // Verificar que el producto existe
      const product = await StoreProduct.findByPk(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      // Verificar que se subió un archivo
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se subió ningún archivo'
        });
      }

      console.log('✅ Archivo subido a Cloudinary:', {
        public_id: req.file.public_id,
        secure_url: req.file.secure_url,
        bytes: req.file.bytes,
        format: req.file.format
      });

      // URL de Cloudinary (secure_url es HTTPS)
      const imageUrl = req.file.secure_url;
      const publicId = req.file.public_id;

      // Si es imagen primaria, desmarcar las demás como primarias
      if (isPrimary === 'true') {
        await StoreProductImage.update(
          { isPrimary: false },
          { where: { productId } }
        );
      }

      // Obtener el siguiente displayOrder si no se proporciona
      let finalDisplayOrder = displayOrder;
      if (!finalDisplayOrder) {
        const maxOrder = await StoreProductImage.max('displayOrder', {
          where: { productId }
        });
        finalDisplayOrder = (maxOrder || 0) + 1;
      }

      // Crear registro de imagen con URL de Cloudinary
      const productImage = await StoreProductImage.create({
        productId: parseInt(productId),
        imageUrl, // URL de Cloudinary
        altText: altText || product.name,
        isPrimary: isPrimary === 'true',
        displayOrder: parseInt(finalDisplayOrder),
        publicId // Guardar publicId para poder eliminar después
      });

      // Generar múltiples tamaños automáticamente
      const imageSizes = generateImageSizes(imageUrl);

      console.log(`📸 Imagen subida para producto ${product.name}: ${req.file.filename}`);

      res.status(201).json({
        success: true,
        message: 'Imagen subida exitosamente a Cloudinary',
        data: { 
          image: {
            ...productImage.toJSON(),
            imageSizes, // URLs en diferentes tamaños
            cloudinaryInfo: {
              publicId: req.file.public_id,
              format: req.file.format,
              size: req.file.bytes,
              width: req.file.width,
              height: req.file.height
            }
          }
        }
      });
    } catch (error) {
      console.error('Error al subir imagen:', error);
      
      // Con Cloudinary no necesitamos limpiar archivos locales
      // El archivo ya está en Cloudinary si llegó hasta aquí
      
      res.status(500).json({
        success: false,
        message: 'Error al subir imagen',
        error: error.message
      });
    }
  }

  // ✅ Subir múltiples imágenes (ACTUALIZADO para Cloudinary)
  async uploadMultipleImages(req, res) {
    try {
      const { id: productId } = req.params;

      console.log('📸 Subiendo múltiples imágenes a Cloudinary para producto:', productId);

      // Verificar que el producto existe
      const product = await StoreProduct.findByPk(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      // Verificar que se subieron archivos
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se subieron archivos'
        });
      }

      console.log(`📤 Procesando ${req.files.length} archivos subidos a Cloudinary`);

      const uploadedImages = [];
      const errors = [];

      // Obtener el siguiente displayOrder
      let maxOrder = await StoreProductImage.max('displayOrder', {
        where: { productId }
      });
      maxOrder = maxOrder || 0;

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        
        try {
          const imageUrl = file.secure_url; // URL de Cloudinary
          const publicId = file.public_id;
          
          const productImage = await StoreProductImage.create({
            productId: parseInt(productId),
            imageUrl,
            altText: product.name,
            isPrimary: false,
            displayOrder: maxOrder + i + 1,
            publicId // Guardar para poder eliminar después
          });

          // Generar tamaños múltiples
          const imageSizes = generateImageSizes(imageUrl);

          uploadedImages.push({
            ...productImage.toJSON(),
            imageSizes,
            cloudinaryInfo: {
              publicId: file.public_id,
              format: file.format,
              size: file.bytes,
              width: file.width,
              height: file.height
            }
          });

        } catch (imageError) {
          errors.push({
            filename: file.original_filename || file.public_id,
            error: imageError.message
          });
        }
      }

      console.log(`✅ ${uploadedImages.length} imágenes subidas para producto ${product.name}`);

      res.status(201).json({
        success: errors.length === 0,
        message: `${uploadedImages.length} imágenes subidas, ${errors.length} errores`,
        data: {
          images: uploadedImages,
          errors
        }
      });
    } catch (error) {
      console.error('Error al subir múltiples imágenes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al subir imágenes',
        error: error.message
      });
    }
  }

  // ✅ Obtener imágenes de un producto
  async getProductImages(req, res) {
    try {
      const { id: productId } = req.params;

      const images = await StoreProductImage.findAll({
        where: { productId },
        order: [['isPrimary', 'DESC'], ['displayOrder', 'ASC']]
      });

      // Agregar tamaños múltiples a cada imagen
      const imagesWithSizes = images.map(image => ({
        ...image.toJSON(),
        imageSizes: generateImageSizes(image.imageUrl)
      }));

      res.json({
        success: true,
        data: { images: imagesWithSizes }
      });
    } catch (error) {
      console.error('Error al obtener imágenes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener imágenes',
        error: error.message
      });
    }
  }

  // ✅ Actualizar imagen
  async updateProductImage(req, res) {
    try {
      const { productId, imageId } = req.params;
      const { altText, isPrimary, displayOrder } = req.body;

      const image = await StoreProductImage.findOne({
        where: { id: imageId, productId }
      });

      if (!image) {
        return res.status(404).json({
          success: false,
          message: 'Imagen no encontrada'
        });
      }

      // Si se marca como primaria, desmarcar las demás
      if (isPrimary === true) {
        await StoreProductImage.update(
          { isPrimary: false },
          { 
            where: { 
              productId,
              id: { [require('sequelize').Op.ne]: imageId }
            }
          }
        );
      }

      // Actualizar imagen
      if (altText !== undefined) image.altText = altText;
      if (isPrimary !== undefined) image.isPrimary = isPrimary;
      if (displayOrder !== undefined) image.displayOrder = parseInt(displayOrder);

      await image.save();

      console.log(`✅ Imagen actualizada: ${imageId}`);

      // Incluir tamaños múltiples en la respuesta
      const imageWithSizes = {
        ...image.toJSON(),
        imageSizes: generateImageSizes(image.imageUrl)
      };

      res.json({
        success: true,
        message: 'Imagen actualizada exitosamente',
        data: { image: imageWithSizes }
      });
    } catch (error) {
      console.error('Error al actualizar imagen:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar imagen',
        error: error.message
      });
    }
  }

  // ✅ Eliminar imagen (ACTUALIZADO para Cloudinary)
  async deleteProductImage(req, res) {
    try {
      const { productId, imageId } = req.params;

      const image = await StoreProductImage.findOne({
        where: { id: imageId, productId }
      });

      if (!image) {
        return res.status(404).json({
          success: false,
          message: 'Imagen no encontrada'
        });
      }

      // Extraer publicId de la URL de Cloudinary
      let publicId = image.publicId;
      if (!publicId) {
        // Fallback: extraer de la URL si no se guardó el publicId
        publicId = this.extractPublicIdFromUrl(image.imageUrl);
      }

      console.log(`🗑️ Eliminando imagen de Cloudinary: ${publicId}`);

      // Eliminar de la base de datos
      await image.destroy();

      // Eliminar de Cloudinary
      if (publicId) {
        try {
          const deleteResult = await deleteFile(publicId);
          if (deleteResult.success) {
            console.log(`✅ Archivo eliminado de Cloudinary: ${publicId}`);
          } else {
            console.warn(`⚠️ No se pudo eliminar de Cloudinary: ${deleteResult.error}`);
          }
        } catch (cloudinaryError) {
          console.warn(`⚠️ Error eliminando de Cloudinary: ${cloudinaryError.message}`);
        }
      } else {
        console.warn(`⚠️ No se pudo determinar el publicId para eliminar: ${image.imageUrl}`);
      }

      console.log(`🗑️ Imagen eliminada: ${imageId}`);

      res.json({
        success: true,
        message: 'Imagen eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar imagen:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar imagen',
        error: error.message
      });
    }
  }

  // ✅ Reordenar imágenes
  async reorderImages(req, res) {
    try {
      const { id: productId } = req.params;
      const { imageOrders } = req.body; // [{ id: 1, displayOrder: 1 }, { id: 2, displayOrder: 2 }]

      if (!Array.isArray(imageOrders)) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un array de órdenes de imágenes'
        });
      }

      // Actualizar en una transacción
      await StoreProductImage.sequelize.transaction(async (transaction) => {
        for (const item of imageOrders) {
          await StoreProductImage.update(
            { displayOrder: item.displayOrder },
            { 
              where: { 
                id: item.id,
                productId 
              },
              transaction 
            }
          );
        }
      });

      console.log(`🔄 ${imageOrders.length} imágenes reordenadas para producto ${productId}`);

      res.json({
        success: true,
        message: 'Imágenes reordenadas exitosamente'
      });
    } catch (error) {
      console.error('Error al reordenar imágenes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al reordenar imágenes',
        error: error.message
      });
    }
  }

  // ✅ Establecer imagen primaria
  async setPrimaryImage(req, res) {
    try {
      const { productId, imageId } = req.params;

      const image = await StoreProductImage.findOne({
        where: { id: imageId, productId }
      });

      if (!image) {
        return res.status(404).json({
          success: false,
          message: 'Imagen no encontrada'
        });
      }

      // Desmarcar todas las imágenes como primarias
      await StoreProductImage.update(
        { isPrimary: false },
        { where: { productId } }
      );

      // Marcar la imagen seleccionada como primaria
      image.isPrimary = true;
      await image.save();

      console.log(`⭐ Imagen primaria establecida: ${imageId}`);

      // Incluir tamaños múltiples en la respuesta
      const imageWithSizes = {
        ...image.toJSON(),
        imageSizes: generateImageSizes(image.imageUrl)
      };

      res.json({
        success: true,
        message: 'Imagen primaria establecida exitosamente',
        data: { image: imageWithSizes }
      });
    } catch (error) {
      console.error('Error al establecer imagen primaria:', error);
      res.status(500).json({
        success: false,
        message: 'Error al establecer imagen primaria',
        error: error.message
      });
    }
  }

  // ✅ Optimizar imagen (usando transformaciones de Cloudinary)
  async optimizeImage(req, res) {
    try {
      const { productId, imageId } = req.params;
      const { width = 800, height = 600, quality = 80 } = req.query;

      const image = await StoreProductImage.findOne({
        where: { id: imageId, productId }
      });

      if (!image) {
        return res.status(404).json({
          success: false,
          message: 'Imagen no encontrada'
        });
      }

      // Con Cloudinary, la optimización se hace on-the-fly via URL
      // Generar URL optimizada
      const baseUrl = image.imageUrl.split('/upload/')[0] + '/upload/';
      const imagePath = image.imageUrl.split('/upload/')[1];
      
      const optimizedUrl = `${baseUrl}w_${width},h_${height},c_fill,q_${quality}/${imagePath}`;

      console.log(`🔧 URL optimizada generada para imagen ${imageId}: ${optimizedUrl}`);

      res.json({
        success: true,
        message: 'URL optimizada generada exitosamente',
        data: {
          originalUrl: image.imageUrl,
          optimizedUrl,
          transformation: {
            width: parseInt(width),
            height: parseInt(height),
            quality: parseInt(quality),
            crop: 'fill'
          }
        }
      });
    } catch (error) {
      console.error('Error al optimizar imagen:', error);
      res.status(500).json({
        success: false,
        message: 'Error al optimizar imagen',
        error: error.message
      });
    }
  }

  // ✅ Limpiar imágenes huérfanas (ACTUALIZADO para Cloudinary)
  async cleanupOrphanImages(req, res) {
    try {
      const orphanImages = await StoreProductImage.findAll({
        include: [{
          model: StoreProduct,
          as: 'product',
          required: false
        }],
        where: {
          '$product.id$': null
        }
      });

      const deletedFiles = [];
      const errors = [];

      console.log(`🧹 Iniciando limpieza de ${orphanImages.length} imágenes huérfanas`);

      for (const image of orphanImages) {
        try {
          // Extraer publicId
          let publicId = image.publicId;
          if (!publicId) {
            publicId = this.extractPublicIdFromUrl(image.imageUrl);
          }

          if (publicId) {
            // Eliminar de Cloudinary
            try {
              const deleteResult = await deleteFile(publicId);
              if (deleteResult.success) {
                deletedFiles.push(publicId);
              } else {
                console.warn(`No se pudo eliminar de Cloudinary: ${publicId}`);
              }
            } catch (cloudinaryError) {
              console.warn(`Error eliminando de Cloudinary: ${cloudinaryError.message}`);
            }
          }

          // Eliminar registro de BD
          await image.destroy();
        } catch (error) {
          errors.push({
            imageId: image.id,
            error: error.message
          });
        }
      }

      console.log(`🧹 Limpieza completada: ${deletedFiles.length} archivos eliminados`);

      res.json({
        success: true,
        message: `Limpieza completada: ${deletedFiles.length} imágenes huérfanas eliminadas`,
        data: {
          deletedFiles,
          errors
        }
      });
    } catch (error) {
      console.error('Error en limpieza de imágenes:', error);
      res.status(500).json({
        success: false,
        message: 'Error en limpieza de imágenes',
        error: error.message
      });
    }
  }

  // ✅ Estadísticas de imágenes
  async getImageStats(req, res) {
    try {
      const [stats, productsWithoutImages] = await Promise.all([
        StoreProductImage.findOne({
          attributes: [
            [StoreProductImage.sequelize.fn('COUNT', StoreProductImage.sequelize.col('id')), 'totalImages'],
            [StoreProductImage.sequelize.fn('COUNT', StoreProductImage.sequelize.literal('CASE WHEN "is_primary" = true THEN 1 END')), 'primaryImages']
          ]
        }),
        StoreProduct.count({
          where: {
            isActive: true
          },
          include: [{
            model: StoreProductImage,
            as: 'images',
            required: false
          }],
          having: StoreProduct.sequelize.literal('COUNT("images"."id") = 0')
        })
      ]);

      res.json({
        success: true,
        data: {
          totalImages: parseInt(stats?.dataValues?.totalImages || 0),
          primaryImages: parseInt(stats?.dataValues?.primaryImages || 0),
          productsWithoutImages,
          cloudinaryEnabled: isCloudinaryConfigured()
        }
      });
    } catch (error) {
      console.error('Error al obtener estadísticas de imágenes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }

  // ✅ MÉTODOS AUXILIARES

  // Extraer publicId de URL de Cloudinary
  extractPublicIdFromUrl(cloudinaryUrl) {
    if (!cloudinaryUrl) return null;
    try {
      // Extraer el publicId de una URL de Cloudinary
      // Ejemplo: https://res.cloudinary.com/demo/image/upload/v1234567890/gym/products/sample.jpg
      const matches = cloudinaryUrl.match(/\/([^\/]+)\.[a-z]+$/);
      return matches ? matches[1] : null;
    } catch {
      return null;
    }
  }

  // Generar URLs con transformaciones específicas
  generateTransformedUrl(originalUrl, transformations) {
    if (!originalUrl) return null;
    
    const baseUrl = originalUrl.split('/upload/')[0] + '/upload/';
    const imagePath = originalUrl.split('/upload/')[1];
    
    return `${baseUrl}${transformations}/${imagePath}`;
  }

  // Obtener información de imagen desde Cloudinary
  async getCloudinaryImageInfo(publicId) {
    try {
      const { getFileInfo } = require('../config/cloudinary');
      return await getFileInfo(publicId);
    } catch (error) {
      console.error('Error obteniendo info de Cloudinary:', error);
      return null;
    }
  }
}

module.exports = new StoreImageController();