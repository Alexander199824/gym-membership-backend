// src/controllers/StoreBrandController.js - CON UPLOAD DE IMÁGENES
const { StoreBrand, StoreProduct } = require('../models');
const { Op } = require('sequelize');
const { deleteFile } = require('../config/cloudinary'); // ✅ IMPORTAR FUNCIÓN DE ELIMINACIÓN

class StoreBrandController {

  // ✅ OBTENER TODAS LAS MARCAS (sin cambios)
  async getAllBrands(req, res) {
    try {
      const { page = 1, limit = 20, search, status } = req.query;
      const offset = (page - 1) * limit;
      const where = {};

      console.log('🏷️ Obteniendo marcas con filtros:', { page, limit, search, status });

      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (status && status !== 'all') {
        where.isActive = status === 'active';
      }

      const { count, rows } = await StoreBrand.findAndCountAll({
        where,
        attributes: [
          'id', 'name', 'logoUrl', 'description', 'isActive', 'createdAt', 'updatedAt'
        ],
        order: [['name', 'ASC']],
        limit: parseInt(limit),
        offset,
        distinct: true
      });

      console.log(`✅ Marcas obtenidas: ${rows.length} de ${count} total`);

      const brandsWithCount = await Promise.all(
        rows.map(async (brand) => {
          try {
            const productCount = await StoreProduct.count({
              where: { 
                brandId: brand.id,
                isActive: true
              }
            });

            return {
              ...brand.toJSON(),
              productCount
            };
          } catch (error) {
            console.warn(`⚠️ Error contando productos para marca ${brand.id}:`, error.message);
            return {
              ...brand.toJSON(),
              productCount: 0
            };
          }
        })
      );

      console.log('✅ Conteo de productos agregado a las marcas');

      res.json({
        success: true,
        data: {
          brands: brandsWithCount,
          pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('❌ Error al obtener marcas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener marcas',
        error: error.message
      });
    }
  }

  // ✅ OBTENER MARCA POR ID (sin cambios)
  async getBrandById(req, res) {
    try {
      const { id } = req.params;

      console.log(`🔍 Obteniendo marca ID: ${id}`);

      const brand = await StoreBrand.findByPk(id, {
        include: [{
          model: StoreProduct,
          as: 'products',
          where: { isActive: true },
          required: false,
          attributes: ['id', 'name', 'sku', 'price', 'stockQuantity', 'isActive'],
          order: [['name', 'ASC']]
        }]
      });

      if (!brand) {
        return res.status(404).json({
          success: false,
          message: 'Marca no encontrada'
        });
      }

      console.log(`✅ Marca encontrada: ${brand.name}`);

      res.json({
        success: true,
        data: { brand }
      });
    } catch (error) {
      console.error('❌ Error al obtener marca:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener marca',
        error: error.message
      });
    }
  }

  // ✅ CREAR NUEVA MARCA - ACTUALIZADO PARA MANEJAR UPLOAD
  async createBrand(req, res) {
    try {
      const { name, description, logoUrl } = req.body;

      console.log('➕ Creando nueva marca:', { 
        name, 
        description, 
        logoUrl: logoUrl || 'null/empty',
        hasUploadedFile: !!req.file,
        fileInfo: req.file ? {
          originalName: req.file.originalname,
          cloudinaryUrl: req.file.secure_url,
          publicId: req.file.public_id
        } : null
      });

      // Validaciones básicas
      if (!name || name.trim().length === 0) {
        console.log('❌ Nombre de marca vacío');
        return res.status(400).json({
          success: false,
          message: 'El nombre de la marca es requerido'
        });
      }

      // Verificar que no exista una marca con el mismo nombre
      const existingBrand = await StoreBrand.findOne({
        where: { name: { [Op.iLike]: name.trim() } }
      });

      if (existingBrand) {
        console.log('❌ Marca duplicada encontrada');
        return res.status(400).json({
          success: false,
          message: 'Ya existe una marca con ese nombre'
        });
      }

      // ✅ DETERMINAR LOGO URL - PRIORIDAD: archivo subido > URL manual > null
      let finalLogoUrl = null;
      
      if (req.file && req.file.secure_url) {
        // Si se subió un archivo a Cloudinary, usar esa URL
        finalLogoUrl = req.file.secure_url;
        console.log('📸 Usando logo subido a Cloudinary:', finalLogoUrl);
      } else if (logoUrl && logoUrl.trim()) {
        // Si no hay archivo pero hay URL manual, usar esa
        finalLogoUrl = logoUrl.trim();
        console.log('🔗 Usando URL manual:', finalLogoUrl);
      }

      // ✅ Preparar datos para crear la marca
      const brandData = {
        name: name.trim(),
        description: description && description.trim() ? description.trim() : null,
        logoUrl: finalLogoUrl,
        isActive: true
      };

      console.log('📋 Datos de marca a crear:', brandData);

      // Crear marca
      const brand = await StoreBrand.create(brandData);

      console.log(`✅ Marca creada exitosamente: ${brand.name} (ID: ${brand.id})`);

      res.status(201).json({
        success: true,
        message: 'Marca creada exitosamente',
        data: { 
          brand,
          uploadInfo: req.file ? {
            uploadedToCloudinary: true,
            originalName: req.file.originalname,
            cloudinaryPublicId: req.file.public_id
          } : null
        }
      });
    } catch (error) {
      console.error('❌ Error al crear marca:', error);
      
      // ✅ Si hay error y se subió archivo, intentar limpiarlo de Cloudinary
      if (req.file && req.file.public_id) {
        console.log('🧹 Limpiando archivo de Cloudinary debido a error...');
        try {
          await deleteFile(req.file.public_id);
          console.log('✅ Archivo limpiado de Cloudinary');
        } catch (cleanupError) {
          console.warn('⚠️ No se pudo limpiar archivo de Cloudinary:', cleanupError.message);
        }
      }
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una marca con ese nombre'
        });
      }

      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map(err => ({
          field: err.path,
          message: err.message
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Error de validación en base de datos',
          errors: validationErrors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error al crear marca',
        error: error.message
      });
    }
  }

  // ✅ ACTUALIZAR MARCA - ACTUALIZADO PARA MANEJAR UPLOAD
  async updateBrand(req, res) {
    try {
      const { id } = req.params;
      const { name, description, logoUrl, isActive } = req.body;

      console.log(`✏️ Actualizando marca ID: ${id}`, {
        hasUploadedFile: !!req.file,
        fileInfo: req.file ? {
          originalName: req.file.originalname,
          cloudinaryUrl: req.file.secure_url,
          publicId: req.file.public_id
        } : null
      });

      const brand = await StoreBrand.findByPk(id);
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: 'Marca no encontrada'
        });
      }

      // Validar nombre único (si se está cambiando)
      if (name && name.trim() !== brand.name) {
        const existingBrand = await StoreBrand.findOne({
          where: { 
            name: { [Op.iLike]: name.trim() },
            id: { [Op.ne]: id }
          }
        });

        if (existingBrand) {
          return res.status(400).json({
            success: false,
            message: 'Ya existe una marca con ese nombre'
          });
        }
      }

      // Verificar si se puede desactivar (no tiene productos activos)
      if (isActive === false && brand.isActive === true) {
        const activeProducts = await StoreProduct.count({
          where: { 
            brandId: id,
            isActive: true 
          }
        });

        if (activeProducts > 0) {
          return res.status(400).json({
            success: false,
            message: `No se puede desactivar la marca. Tiene ${activeProducts} productos activos.`
          });
        }
      }

      // ✅ MANEJAR LOGO - GUARDAR REFERENCIA AL LOGO ANTERIOR
      const oldLogoUrl = brand.logoUrl;
      let oldCloudinaryPublicId = null;

      // Extraer public_id del logo anterior si es de Cloudinary
      if (oldLogoUrl && oldLogoUrl.includes('cloudinary.com')) {
        try {
          // Formato típico: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/gym/brand-logos/filename.jpg
          const matches = oldLogoUrl.match(/\/gym\/brand-logos\/([^/]+)\./);
          if (matches) {
            oldCloudinaryPublicId = `gym/brand-logos/${matches[1]}`;
          }
        } catch (error) {
          console.warn('⚠️ No se pudo extraer public_id del logo anterior:', error.message);
        }
      }

      // ✅ ACTUALIZAR CAMPOS
      if (name) brand.name = name.trim();
      if (description !== undefined) brand.description = description?.trim() || null;
      if (isActive !== undefined) brand.isActive = isActive;

      // ✅ ACTUALIZAR LOGO - PRIORIDAD: archivo subido > URL manual > mantener actual
      if (req.file && req.file.secure_url) {
        // Se subió un nuevo archivo
        brand.logoUrl = req.file.secure_url;
        console.log('📸 Logo actualizado con archivo subido:', req.file.secure_url);
      } else if (logoUrl !== undefined) {
        // Se proporcionó URL manual (puede ser vacía para eliminar)
        brand.logoUrl = logoUrl?.trim() || null;
        console.log('🔗 Logo actualizado con URL manual:', brand.logoUrl);
      }
      // Si no hay ni archivo ni logoUrl en el body, mantener el actual

      await brand.save();

      // ✅ LIMPIAR LOGO ANTERIOR DE CLOUDINARY SI SE CAMBIÓ
      if (oldCloudinaryPublicId && brand.logoUrl !== oldLogoUrl) {
        console.log('🧹 Limpiando logo anterior de Cloudinary:', oldCloudinaryPublicId);
        try {
          const deleteResult = await deleteFile(oldCloudinaryPublicId);
          if (deleteResult.success) {
            console.log('✅ Logo anterior eliminado de Cloudinary');
          } else {
            console.warn('⚠️ No se pudo eliminar logo anterior:', deleteResult.error);
          }
        } catch (cleanupError) {
          console.warn('⚠️ Error limpiando logo anterior:', cleanupError.message);
        }
      }

      console.log(`✅ Marca actualizada: ${brand.name} (ID: ${brand.id})`);

      res.json({
        success: true,
        message: 'Marca actualizada exitosamente',
        data: { 
          brand,
          uploadInfo: req.file ? {
            uploadedToCloudinary: true,
            originalName: req.file.originalname,
            cloudinaryPublicId: req.file.public_id,
            replacedPreviousLogo: !!oldCloudinaryPublicId
          } : null
        }
      });
    } catch (error) {
      console.error('❌ Error al actualizar marca:', error);
      
      // ✅ Si hay error y se subió archivo, intentar limpiarlo
      if (req.file && req.file.public_id) {
        console.log('🧹 Limpiando archivo nuevo de Cloudinary debido a error...');
        try {
          await deleteFile(req.file.public_id);
          console.log('✅ Archivo nuevo limpiado de Cloudinary');
        } catch (cleanupError) {
          console.warn('⚠️ No se pudo limpiar archivo nuevo:', cleanupError.message);
        }
      }
      
      res.status(500).json({
        success: false,
        message: 'Error al actualizar marca',
        error: error.message
      });
    }
  }

  // ✅ ELIMINAR MARCA - ACTUALIZADO PARA LIMPIAR CLOUDINARY
  async deleteBrand(req, res) {
    try {
      const { id } = req.params;

      console.log(`🗑️ Desactivando marca ID: ${id}`);

      const brand = await StoreBrand.findByPk(id);
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: 'Marca no encontrada'
        });
      }

      // Verificar que no tenga productos activos
      const activeProducts = await StoreProduct.count({
        where: { 
          brandId: id,
          isActive: true 
        }
      });

      if (activeProducts > 0) {
        return res.status(400).json({
          success: false,
          message: `No se puede eliminar la marca. Tiene ${activeProducts} productos activos. Desactívelos primero.`
        });
      }

      // ✅ EXTRAER PUBLIC_ID ANTES DE DESACTIVAR
      let cloudinaryPublicId = null;
      if (brand.logoUrl && brand.logoUrl.includes('cloudinary.com')) {
        try {
          const matches = brand.logoUrl.match(/\/gym\/brand-logos\/([^/]+)\./);
          if (matches) {
            cloudinaryPublicId = `gym/brand-logos/${matches[1]}`;
          }
        } catch (error) {
          console.warn('⚠️ No se pudo extraer public_id:', error.message);
        }
      }

      // Soft delete
      brand.isActive = false;
      await brand.save();

      // ✅ LIMPIAR LOGO DE CLOUDINARY (OPCIONAL)
      if (cloudinaryPublicId) {
        console.log('🧹 Limpiando logo de Cloudinary:', cloudinaryPublicId);
        try {
          const deleteResult = await deleteFile(cloudinaryPublicId);
          if (deleteResult.success) {
            console.log('✅ Logo eliminado de Cloudinary');
            // Limpiar URL de la base de datos también
            brand.logoUrl = null;
            await brand.save();
          } else {
            console.warn('⚠️ No se pudo eliminar logo de Cloudinary:', deleteResult.error);
          }
        } catch (cleanupError) {
          console.warn('⚠️ Error limpiando logo:', cleanupError.message);
        }
      }

      console.log(`✅ Marca desactivada: ${brand.name} (ID: ${brand.id})`);

      res.json({
        success: true,
        message: 'Marca desactivada exitosamente'
      });
    } catch (error) {
      console.error('❌ Error al eliminar marca:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar marca',
        error: error.message
      });
    }
  }

  // ✅ REACTIVAR MARCA (sin cambios)
  async activateBrand(req, res) {
    try {
      const { id } = req.params;

      console.log(`🔄 Reactivando marca ID: ${id}`);

      const brand = await StoreBrand.findByPk(id);
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: 'Marca no encontrada'
        });
      }

      brand.isActive = true;
      await brand.save();

      console.log(`✅ Marca reactivada: ${brand.name} (ID: ${brand.id})`);

      res.json({
        success: true,
        message: 'Marca reactivada exitosamente',
        data: { brand }
      });
    } catch (error) {
      console.error('❌ Error al reactivar marca:', error);
      res.status(500).json({
        success: false,
        message: 'Error al reactivar marca',
        error: error.message
      });
    }
  }

  // ✅ BUSCAR MARCAS (sin cambios)
  async searchBrands(req, res) {
    try {
      const { q } = req.query;

      if (!q || q.trim().length < 2) {
        return res.json({
          success: true,
          data: { brands: [] }
        });
      }

      console.log(`🔍 Buscando marcas: "${q}"`);

      const brands = await StoreBrand.findAll({
        where: {
          name: { [Op.iLike]: `%${q.trim()}%` },
          isActive: true
        },
        attributes: ['id', 'name', 'logoUrl'],
        order: [['name', 'ASC']],
        limit: 10
      });

      console.log(`✅ ${brands.length} marcas encontradas`);

      res.json({
        success: true,
        data: { brands }
      });
    } catch (error) {
      console.error('❌ Error al buscar marcas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al buscar marcas',
        error: error.message
      });
    }
  }

  // ✅ ESTADÍSTICAS DE MARCA (sin cambios)
  async getBrandStats(req, res) {
    try {
      console.log('📊 Obteniendo estadísticas de marcas...');

      const [totalBrands, activeBrands, inactiveBrands] = await Promise.all([
        StoreBrand.count(),
        StoreBrand.count({ where: { isActive: true } }),
        StoreBrand.count({ where: { isActive: false } })
      ]);

      console.log('✅ Estadísticas calculadas:', {
        total: totalBrands,
        activas: activeBrands,
        inactivas: inactiveBrands
      });

      res.json({
        success: true,
        data: {
          totalBrands,
          activeBrands,
          inactiveBrands
        }
      });
    } catch (error) {
      console.error('❌ Error al obtener estadísticas de marcas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }
}

module.exports = new StoreBrandController();