// src/controllers/StoreBrandController.js
const { StoreBrand, StoreProduct } = require('../models');
const { Op } = require('sequelize');

class StoreBrandController {

  // ✅ Obtener todas las marcas (admin view - incluye inactivas)
  async getAllBrands(req, res) {
    try {
      const { page = 1, limit = 20, search, status } = req.query;
      const offset = (page - 1) * limit;
      const where = {};

      // Filtro por búsqueda
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Filtro por estado
      if (status) {
        where.isActive = status === 'active';
      }

      const { count, rows } = await StoreBrand.findAndCountAll({
        where,
        include: [{
          model: StoreProduct,
          as: 'products',
          attributes: [],
          required: false
        }],
        attributes: [
          'id', 'name', 'logoUrl', 'description', 'isActive', 'createdAt', 'updatedAt',
          [StoreBrand.sequelize.fn('COUNT', StoreBrand.sequelize.col('products.id')), 'productCount']
        ],
        group: ['StoreBrand.id'],
        order: [['name', 'ASC']],
        limit: parseInt(limit),
        offset,
        distinct: true
      });

      // Procesar resultados para incluir conteo de productos
      const brandsWithCount = rows.map(brand => ({
        ...brand.toJSON(),
        productCount: parseInt(brand.dataValues.productCount || 0)
      }));

      res.json({
        success: true,
        data: {
          brands: brandsWithCount,
          pagination: {
            total: count.length, // count es array cuando usamos group
            page: parseInt(page),
            pages: Math.ceil(count.length / limit),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener marcas:', error);
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

      const brand = await StoreBrand.findByPk(id, {
        include: [{
          model: StoreProduct,
          as: 'products',
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

      res.json({
        success: true,
        data: { brand }
      });
    } catch (error) {
      console.error('Error al obtener marca:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener marca',
        error: error.message
      });
    }
  }

  // ✅ Crear nueva marca
  async createBrand(req, res) {
    try {
      const { name, description, logoUrl } = req.body;

      // Validaciones
      if (!name) {
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
        return res.status(400).json({
          success: false,
          message: 'Ya existe una marca con ese nombre'
        });
      }

      // Crear marca
      const brand = await StoreBrand.create({
        name: name.trim(),
        description: description?.trim() || null,
        logoUrl: logoUrl?.trim() || null,
        isActive: true
      });

      console.log(`✅ Marca creada: ${brand.name} (ID: ${brand.id})`);

      res.status(201).json({
        success: true,
        message: 'Marca creada exitosamente',
        data: { brand }
      });
    } catch (error) {
      console.error('Error al crear marca:', error);
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una marca con ese nombre'
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
      console.error('Error al actualizar marca:', error);
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

      console.log(`🗑️ Marca desactivada: ${brand.name} (ID: ${brand.id})`);

      res.json({
        success: true,
        message: 'Marca desactivada exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar marca:', error);
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
      console.error('Error al reactivar marca:', error);
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

      const brands = await StoreBrand.findAll({
        where: {
          name: { [Op.iLike]: `%${q.trim()}%` },
          isActive: true
        },
        attributes: ['id', 'name', 'logoUrl'],
        order: [['name', 'ASC']],
        limit: 10
      });

      res.json({
        success: true,
        data: { brands }
      });
    } catch (error) {
      console.error('Error al buscar marcas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al buscar marcas',
        error: error.message
      });
    }
  }

  // ✅ Estadísticas de marca
  async getBrandStats(req, res) {
    try {
      const stats = await StoreBrand.findOne({
        attributes: [
          [StoreBrand.sequelize.fn('COUNT', StoreBrand.sequelize.col('StoreBrand.id')), 'totalBrands'],
          [StoreBrand.sequelize.fn('COUNT', StoreBrand.sequelize.literal('CASE WHEN "StoreBrand"."is_active" = true THEN 1 END')), 'activeBrands'],
          [StoreBrand.sequelize.fn('COUNT', StoreBrand.sequelize.literal('CASE WHEN "StoreBrand"."is_active" = false THEN 1 END')), 'inactiveBrands']
        ]
      });

      res.json({
        success: true,
        data: {
          totalBrands: parseInt(stats?.dataValues?.totalBrands || 0),
          activeBrands: parseInt(stats?.dataValues?.activeBrands || 0),
          inactiveBrands: parseInt(stats?.dataValues?.inactiveBrands || 0)
        }
      });
    } catch (error) {
      console.error('Error al obtener estadísticas de marcas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }
}

module.exports = new StoreBrandController();