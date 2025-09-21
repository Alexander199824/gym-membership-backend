// src/controllers/StoreBrandController.js - COMPLETO CORREGIDO
const { StoreBrand, StoreProduct } = require('../models');
const { Op } = require('sequelize');

class StoreBrandController {

  // ✅ CORREGIDO: Obtener todas las marcas (admin view - incluye inactivas)
  async getAllBrands(req, res) {
    try {
      const { page = 1, limit = 20, search, status } = req.query;
      const offset = (page - 1) * limit;
      const where = {};

      console.log('🏷️ Obteniendo marcas con filtros:', { page, limit, search, status });

      // Filtro por búsqueda
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Filtro por estado
      if (status && status !== 'all') {
        where.isActive = status === 'active';
      }

      // ✅ SOLUCION 1: Obtener marcas sin el conteo primero
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

      // ✅ SOLUCION 2: Obtener el conteo de productos para cada marca por separado
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

  // ✅ Obtener marca por ID
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

  // ✅ CORREGIDO: Crear nueva marca
  async createBrand(req, res) {
    try {
      const { name, description, logoUrl } = req.body;

      console.log('➕ Creando nueva marca:', { 
        name, 
        description, 
        logoUrl: logoUrl || 'null/empty',
        body: req.body 
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

      // ✅ Preparar datos para crear la marca
      const brandData = {
        name: name.trim(),
        description: description && description.trim() ? description.trim() : null,
        logoUrl: logoUrl && logoUrl.trim() ? logoUrl.trim() : null,
        isActive: true
      };

      console.log('📋 Datos de marca a crear:', brandData);

      // Crear marca
      const brand = await StoreBrand.create(brandData);

      console.log(`✅ Marca creada exitosamente: ${brand.name} (ID: ${brand.id})`);

      res.status(201).json({
        success: true,
        message: 'Marca creada exitosamente',
        data: { brand }
      });
    } catch (error) {
      console.error('❌ Error al crear marca:', error);
      
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

  // ✅ Actualizar marca
  async updateBrand(req, res) {
    try {
      const { id } = req.params;
      const { name, description, logoUrl, isActive } = req.body;

      console.log(`✏️ Actualizando marca ID: ${id}`);

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

      // Actualizar campos
      if (name) brand.name = name.trim();
      if (description !== undefined) brand.description = description?.trim() || null;
      if (logoUrl !== undefined) brand.logoUrl = logoUrl?.trim() || null;
      if (isActive !== undefined) brand.isActive = isActive;

      await brand.save();

      console.log(`✅ Marca actualizada: ${brand.name} (ID: ${brand.id})`);

      res.json({
        success: true,
        message: 'Marca actualizada exitosamente',
        data: { brand }
      });
    } catch (error) {
      console.error('❌ Error al actualizar marca:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar marca',
        error: error.message
      });
    }
  }

  // ✅ Eliminar marca (soft delete)
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

      // Soft delete
      brand.isActive = false;
      await brand.save();

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

  // ✅ Reactivar marca
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

  // ✅ Buscar marcas (autocomplete)
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

  // ✅ CORREGIDO: Estadísticas de marca
  async getBrandStats(req, res) {
    try {
      console.log('📊 Obteniendo estadísticas de marcas...');

      // ✅ Método más simple y confiable
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