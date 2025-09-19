// src/controllers/StoreCategoryController.js
const { StoreCategory, StoreProduct } = require('../models');
const { Op } = require('sequelize');

class StoreCategoryController {

  // ✅ Generar slug automático
  generateSlug(name) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/[ñ]/g, 'n')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // ✅ Obtener todas las categorías (admin view - incluye inactivas)
  async getAllCategories(req, res) {
    try {
      const { page = 1, limit = 20, search, status } = req.query;
      const offset = (page - 1) * limit;
      const where = {};

      // Filtro por búsqueda
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { slug: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Filtro por estado
      if (status) {
        where.isActive = status === 'active';
      }

      const { count, rows } = await StoreCategory.findAndCountAll({
        where,
        include: [{
          model: StoreProduct,
          as: 'products',
          attributes: [],
          required: false
        }],
        attributes: [
          'id', 'name', 'slug', 'description', 'iconName', 'displayOrder', 
          'isActive', 'createdAt', 'updatedAt',
          [StoreCategory.sequelize.fn('COUNT', StoreCategory.sequelize.col('products.id')), 'productCount']
        ],
        group: ['StoreCategory.id'],
        order: [['displayOrder', 'ASC'], ['name', 'ASC']],
        limit: parseInt(limit),
        offset,
        distinct: true
      });

      // Procesar resultados para incluir conteo de productos
      const categoriesWithCount = rows.map(category => ({
        ...category.toJSON(),
        productCount: parseInt(category.dataValues.productCount || 0)
      }));

      res.json({
        success: true,
        data: {
          categories: categoriesWithCount,
          pagination: {
            total: count.length, // count es array cuando usamos group
            page: parseInt(page),
            pages: Math.ceil(count.length / limit),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener categorías:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener categorías',
        error: error.message
      });
    }
  }

  // ✅ Obtener categoría por ID
  async getCategoryById(req, res) {
    try {
      const { id } = req.params;

      const category = await StoreCategory.findByPk(id, {
        include: [{
          model: StoreProduct,
          as: 'products',
          attributes: ['id', 'name', 'sku', 'price', 'stockQuantity', 'isActive'],
          order: [['name', 'ASC']]
        }]
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }

      res.json({
        success: true,
        data: { category }
      });
    } catch (error) {
      console.error('Error al obtener categoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener categoría',
        error: error.message
      });
    }
  }

  // ✅ Crear nueva categoría
  async createCategory(req, res) {
    try {
      const { name, description, iconName, displayOrder, slug } = req.body;

      // Validaciones
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'El nombre de la categoría es requerido'
        });
      }

      // Generar slug si no se proporciona
      const finalSlug = slug ? slug.trim() : this.generateSlug(name);

      // Verificar que no exista una categoría con el mismo nombre o slug
      const existingCategory = await StoreCategory.findOne({
        where: {
          [Op.or]: [
            { name: { [Op.iLike]: name.trim() } },
            { slug: finalSlug }
          ]
        }
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una categoría con ese nombre o slug'
        });
      }

      // Obtener el siguiente displayOrder si no se proporciona
      let finalDisplayOrder = displayOrder;
      if (!finalDisplayOrder) {
        const maxOrder = await StoreCategory.max('displayOrder');
        finalDisplayOrder = (maxOrder || 0) + 1;
      }

      // Crear categoría
      const category = await StoreCategory.create({
        name: name.trim(),
        slug: finalSlug,
        description: description?.trim() || null,
        iconName: iconName?.trim() || 'package',
        displayOrder: parseInt(finalDisplayOrder),
        isActive: true
      });

      console.log(`✅ Categoría creada: ${category.name} (ID: ${category.id})`);

      res.status(201).json({
        success: true,
        message: 'Categoría creada exitosamente',
        data: { category }
      });
    } catch (error) {
      console.error('Error al crear categoría:', error);
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una categoría con ese slug'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error al crear categoría',
        error: error.message
      });
    }
  }

  // ✅ Actualizar categoría
  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { name, description, iconName, displayOrder, slug, isActive } = req.body;

      const category = await StoreCategory.findByPk(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }

      // Validar nombre y slug únicos (si se están cambiando)
      if ((name && name.trim() !== category.name) || (slug && slug !== category.slug)) {
        const finalSlug = slug ? slug.trim() : (name ? this.generateSlug(name) : category.slug);
        
        const existingCategory = await StoreCategory.findOne({
          where: {
            [Op.or]: [
              name && name.trim() !== category.name ? { name: { [Op.iLike]: name.trim() } } : null,
              finalSlug !== category.slug ? { slug: finalSlug } : null
            ].filter(Boolean),
            id: { [Op.ne]: id }
          }
        });

        if (existingCategory) {
          return res.status(400).json({
            success: false,
            message: 'Ya existe una categoría con ese nombre o slug'
          });
        }
      }

      // Verificar si se puede desactivar (no tiene productos activos)
      if (isActive === false && category.isActive === true) {
        const activeProducts = await StoreProduct.count({
          where: { 
            categoryId: id,
            isActive: true 
          }
        });

        if (activeProducts > 0) {
          return res.status(400).json({
            success: false,
            message: `No se puede desactivar la categoría. Tiene ${activeProducts} productos activos.`
          });
        }
      }

      // Actualizar campos
      if (name) {
        category.name = name.trim();
        // Auto-generar slug si no se proporciona uno nuevo
        if (!slug) {
          category.slug = this.generateSlug(name);
        }
      }
      if (slug) category.slug = slug.trim();
      if (description !== undefined) category.description = description?.trim() || null;
      if (iconName) category.iconName = iconName.trim();
      if (displayOrder !== undefined) category.displayOrder = parseInt(displayOrder);
      if (isActive !== undefined) category.isActive = isActive;

      await category.save();

      console.log(`✅ Categoría actualizada: ${category.name} (ID: ${category.id})`);

      res.json({
        success: true,
        message: 'Categoría actualizada exitosamente',
        data: { category }
      });
    } catch (error) {
      console.error('Error al actualizar categoría:', error);
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una categoría con ese slug'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error al actualizar categoría',
        error: error.message
      });
    }
  }

  // ✅ Eliminar categoría (soft delete)
  async deleteCategory(req, res) {
    try {
      const { id } = req.params;

      const category = await StoreCategory.findByPk(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }

      // Verificar que no tenga productos activos
      const activeProducts = await StoreProduct.count({
        where: { 
          categoryId: id,
          isActive: true 
        }
      });

      if (activeProducts > 0) {
        return res.status(400).json({
          success: false,
          message: `No se puede eliminar la categoría. Tiene ${activeProducts} productos activos. Desactívelos primero.`
        });
      }

      // Soft delete
      category.isActive = false;
      await category.save();

      console.log(`🗑️ Categoría desactivada: ${category.name} (ID: ${category.id})`);

      res.json({
        success: true,
        message: 'Categoría desactivada exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar categoría',
        error: error.message
      });
    }
  }

  // ✅ Reactivar categoría
  async activateCategory(req, res) {
    try {
      const { id } = req.params;

      const category = await StoreCategory.findByPk(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }

      category.isActive = true;
      await category.save();

      console.log(`✅ Categoría reactivada: ${category.name} (ID: ${category.id})`);

      res.json({
        success: true,
        message: 'Categoría reactivada exitosamente',
        data: { category }
      });
    } catch (error) {
      console.error('Error al reactivar categoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error al reactivar categoría',
        error: error.message
      });
    }
  }

  // ✅ Buscar categorías (autocomplete)
  async searchCategories(req, res) {
    try {
      const { q } = req.query;

      if (!q || q.trim().length < 2) {
        return res.json({
          success: true,
          data: { categories: [] }
        });
      }

      const categories = await StoreCategory.findAll({
        where: {
          [Op.or]: [
            { name: { [Op.iLike]: `%${q.trim()}%` } },
            { slug: { [Op.iLike]: `%${q.trim()}%` } }
          ],
          isActive: true
        },
        attributes: ['id', 'name', 'slug', 'iconName'],
        order: [['displayOrder', 'ASC'], ['name', 'ASC']],
        limit: 10
      });

      res.json({
        success: true,
        data: { categories }
      });
    } catch (error) {
      console.error('Error al buscar categorías:', error);
      res.status(500).json({
        success: false,
        message: 'Error al buscar categorías',
        error: error.message
      });
    }
  }

  // ✅ Reordenar categorías
  async reorderCategories(req, res) {
    try {
      const { categoryOrders } = req.body; // [{ id: 1, displayOrder: 1 }, { id: 2, displayOrder: 2 }]

      if (!Array.isArray(categoryOrders)) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un array de órdenes de categorías'
        });
      }

      // Actualizar en una transacción
      await StoreCategory.sequelize.transaction(async (transaction) => {
        for (const item of categoryOrders) {
          await StoreCategory.update(
            { displayOrder: item.displayOrder },
            { 
              where: { id: item.id },
              transaction 
            }
          );
        }
      });

      console.log(`✅ ${categoryOrders.length} categorías reordenadas`);

      res.json({
        success: true,
        message: 'Categorías reordenadas exitosamente'
      });
    } catch (error) {
      console.error('Error al reordenar categorías:', error);
      res.status(500).json({
        success: false,
        message: 'Error al reordenar categorías',
        error: error.message
      });
    }
  }

  // ✅ Obtener categoría por slug
  async getCategoryBySlug(req, res) {
    try {
      const { slug } = req.params;

      const category = await StoreCategory.findOne({
        where: { 
          slug,
          isActive: true 
        },
        include: [{
          model: StoreProduct,
          as: 'products',
          where: { isActive: true },
          required: false,
          attributes: ['id', 'name', 'sku', 'price', 'stockQuantity'],
          order: [['name', 'ASC']]
        }]
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }

      res.json({
        success: true,
        data: { category }
      });
    } catch (error) {
      console.error('Error al obtener categoría por slug:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener categoría',
        error: error.message
      });
    }
  }

  // ✅ Estadísticas de categorías
  async getCategoryStats(req, res) {
    try {
      const stats = await StoreCategory.findOne({
        attributes: [
          [StoreCategory.sequelize.fn('COUNT', StoreCategory.sequelize.col('StoreCategory.id')), 'totalCategories'],
          [StoreCategory.sequelize.fn('COUNT', StoreCategory.sequelize.literal('CASE WHEN "StoreCategory"."is_active" = true THEN 1 END')), 'activeCategories'],
          [StoreCategory.sequelize.fn('COUNT', StoreCategory.sequelize.literal('CASE WHEN "StoreCategory"."is_active" = false THEN 1 END')), 'inactiveCategories']
        ]
      });

      res.json({
        success: true,
        data: {
          totalCategories: parseInt(stats?.dataValues?.totalCategories || 0),
          activeCategories: parseInt(stats?.dataValues?.activeCategories || 0),
          inactiveCategories: parseInt(stats?.dataValues?.inactiveCategories || 0)
        }
      });
    } catch (error) {
      console.error('Error al obtener estadísticas de categorías:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }
}

module.exports = new StoreCategoryController();