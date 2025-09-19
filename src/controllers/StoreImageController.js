// src/controllers/StoreImageController.js
const { StoreProduct, StoreProductImage } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp'); // Para redimensionar imágenes (opcional)

class StoreImageController {

  // ✅ Configuración de multer para subida de archivos
  getMulterConfig() {
    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'uploads', 'products');
        
        // Crear directorio si no existe
        try {
          await fs.mkdir(uploadPath, { recursive: true });
        } catch (error) {
          console.error('Error creando directorio de uploads:', error);
        }
        
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const productId = req.params.id || req.params.productId;
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const filename = `product_${productId}_${timestamp}${ext}`;
        cb(null, filename);
      }
    });

    const fileFilter = (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Tipo de archivo no permitido. Solo JPEG, PNG y WebP'), false);
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
      }
    });
  }

  // ✅ Subir imagen de producto
  async uploadProductImage(req, res) {
    try {
      const { id: productId } = req.params;
      const { isPrimary = false, altText, displayOrder } = req.query;

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

      // Generar URL de la imagen
      const imageUrl = `/uploads/products/${req.file.filename}`;

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

      // Crear registro de imagen
      const productImage = await StoreProductImage.create({
        productId: parseInt(productId),
        imageUrl,
        altText: altText || product.name,
        isPrimary: isPrimary === 'true',
        displayOrder: parseInt(finalDisplayOrder)
      });

      console.log(`📸 Imagen subida para producto ${product.name}: ${req.file.filename}`);

      res.status(201).json({
        success: true,
        message: 'Imagen subida exitosamente',
        data: { image: productImage }
      });
    } catch (error) {
      console.error('Error al subir imagen:', error);
      
      // Eliminar archivo si hubo error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Error eliminando archivo:', unlinkError);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Error al subir imagen',
        error: error.message
      });
    }
  }

  // ✅ Subir múltiples imágenes
  async uploadMultipleImages(req, res) {
    try {
      const { id: productId } = req.params;

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

      const uploadedImages = [];
      const errors = [];

      try {
        // Obtener el siguiente displayOrder
        let maxOrder = await StoreProductImage.max('displayOrder', {
          where: { productId }
        });
        maxOrder = maxOrder || 0;

        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          
          try {
            const imageUrl = `/uploads/products/${file.filename}`;
            
            const productImage = await StoreProductImage.create({
              productId: parseInt(productId),
              imageUrl,
              altText: product.name,
              isPrimary: false,
              displayOrder: maxOrder + i + 1
            });

            uploadedImages.push(productImage);
          } catch (imageError) {
            errors.push({
              filename: file.filename,
              error: imageError.message
            });
          }
        }

        console.log(`📸 ${uploadedImages.length} imágenes subidas para producto ${product.name}`);

        res.status(201).json({
          success: errors.length === 0,
          message: `${uploadedImages.length} imágenes subidas, ${errors.length} errores`,
          data: {
            images: uploadedImages,
            errors
          }
        });
      } catch (error) {
        // Eliminar archivos si hubo error
        for (const file of req.files) {
          try {
            await fs.unlink(file.path);
          } catch (unlinkError) {
            console.error('Error eliminando archivo:', unlinkError);
          }
        }
        throw error;
      }
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

      res.json({
        success: true,
        data: { images }
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

      res.json({
        success: true,
        message: 'Imagen actualizada exitosamente',
        data: { image }
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

  // ✅ Eliminar imagen
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

      // Obtener la ruta del archivo
      const filename = path.basename(image.imageUrl);
      const filePath = path.join(process.cwd(), 'uploads', 'products', filename);

      // Eliminar de la base de datos
      await image.destroy();

      // Eliminar archivo físico
      try {
        await fs.unlink(filePath);
        console.log(`🗑️ Archivo eliminado: ${filename}`);
      } catch (fileError) {
        console.warn(`⚠️ No se pudo eliminar el archivo: ${filename}`, fileError.message);
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

      res.json({
        success: true,
        message: 'Imagen primaria establecida exitosamente',
        data: { image }
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

  // ✅ Optimizar imagen (redimensionar y comprimir)
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

      const filename = path.basename(image.imageUrl);
      const originalPath = path.join(process.cwd(), 'uploads', 'products', filename);
      const optimizedFilename = `optimized_${filename}`;
      const optimizedPath = path.join(process.cwd(), 'uploads', 'products', optimizedFilename);

      // Verificar que sharp esté disponible
      if (!sharp) {
        return res.status(500).json({
          success: false,
          message: 'Sharp no está disponible para optimización de imágenes'
        });
      }

      // Optimizar imagen
      await sharp(originalPath)
        .resize(parseInt(width), parseInt(height), {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: parseInt(quality) })
        .toFile(optimizedPath);

      // Reemplazar imagen original
      await fs.unlink(originalPath);
      await fs.rename(optimizedPath, originalPath);

      console.log(`🔧 Imagen optimizada: ${filename}`);

      res.json({
        success: true,
        message: 'Imagen optimizada exitosamente'
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

  // ✅ Limpiar imágenes huérfanas (sin producto asociado)
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

      for (const image of orphanImages) {
        try {
          const filename = path.basename(image.imageUrl);
          const filePath = path.join(process.cwd(), 'uploads', 'products', filename);

          // Eliminar archivo físico
          try {
            await fs.unlink(filePath);
            deletedFiles.push(filename);
          } catch (fileError) {
            console.warn(`No se pudo eliminar archivo: ${filename}`);
          }

          // Eliminar registro
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
          productsWithoutImages
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
}

module.exports = new StoreImageController();