// src/controllers/StoreProductController.js
const { 
  StoreProduct, 
  StoreCategory, 
  StoreBrand, 
  StoreProductImage,
  StoreCart,
  StoreOrderItem 
} = require('../models');
const { Op } = require('sequelize');

class StoreProductController {

  // ✅ Generar SKU automático
  generateSKU(name, categorySlug) {
    const namePrefix = name.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
    const categoryPrefix = categorySlug ? categorySlug.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, '') : 'PRD';
    const timestamp = Date.now().toString().slice(-4);
    return `${categoryPrefix}-${namePrefix}-${timestamp}`;
  }

  // ✅ Obtener todos los productos (admin view - incluye inactivos)
  async getAllProducts(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search, 
        category, 
        brand, 
        status, 
        featured,
        lowStock,
        sortBy = 'name',
        sortOrder = 'ASC'
      } = req.query;
      
      const offset = (page - 1) * limit;
      const where = {};

      // Filtros
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { sku: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (category) where.categoryId = category;
      if (brand) where.brandId = brand;
      if (status) where.isActive = status === 'active';
      if (featured) where.isFeatured = featured === 'true';
      
      if (lowStock === 'true') {
        where.stockQuantity = { [Op.lte]: StoreProduct.sequelize.col('min_stock') };
      }

      const { count, rows } = await StoreProduct.findAndCountAll({
        where,
        include: [
          { 
            model: StoreCategory,
            as: 'category',
            attributes: ['id', 'name', 'slug'] 
          },
          { 
            model: StoreBrand,
            as: 'brand',
            attributes: ['id', 'name'] 
          },
          { 
            model: StoreProductImage,
            as: 'images',
            where: { isPrimary: true },
            required: false,
            limit: 1
          }
        ],
        order: [[sortBy, sortOrder.toUpperCase()]],
        limit: parseInt(limit),
        offset,
        distinct: true
      });

      // Agregar información calculada
      const productsWithInfo = rows.map(product => ({
        ...product.toJSON(),
        discountPercentage: product.getDiscountPercentage(),
        inStock: product.isInStock(),
        lowStock: product.isLowStock()
      }));

      res.json({
        success: true,
        data: {
          products: productsWithInfo,
          pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener productos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos',
        error: error.message
      });
    }
  }

  // ✅ Obtener producto por ID (admin view)
  async getProductById(req, res) {
    try {
      const { id } = req.params;

      const product = await StoreProduct.findByPk(id, {
        include: [
          { model: StoreCategory, as: 'category' },
          { model: StoreBrand, as: 'brand' },
          { 
            model: StoreProductImage,
            as: 'images',
            order: [['isPrimary', 'DESC'], ['displayOrder', 'ASC']]
          }
        ]
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      const productWithInfo = {
        ...product.toJSON(),
        discountPercentage: product.getDiscountPercentage(),
        inStock: product.isInStock(),
        lowStock: product.isLowStock()
      };

      res.json({
        success: true,
        data: { product: productWithInfo }
      });
    } catch (error) {
      console.error('Error al obtener producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener producto',
        error: error.message
      });
    }
  }

  // ✅ Crear nuevo producto
  async createProduct(req, res) {
    try {
      const {
        name,
        description,
        price,
        originalPrice,
        categoryId,
        brandId,
        sku,
        stockQuantity,
        minStock,
        isFeatured,
        weight,
        dimensions,
        allowOnlinePayment,
        allowCardPayment,
        allowCashOnDelivery,
        deliveryTime
      } = req.body;

      // Validaciones obligatorias
      if (!name || !price || !categoryId || !stockQuantity === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Campos requeridos: name, price, categoryId, stockQuantity'
        });
      }

      // Verificar que la categoría existe
      const category = await StoreCategory.findByPk(categoryId);
      if (!category || !category.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Categoría no válida o inactiva'
        });
      }

      // Verificar marca si se proporciona
      if (brandId) {
        const brand = await StoreBrand.findByPk(brandId);
        if (!brand || !brand.isActive) {
          return res.status(400).json({
            success: false,
            message: 'Marca no válida o inactiva'
          });
        }
      }

      // Generar SKU si no se proporciona
      let finalSKU = sku;
      if (!finalSKU) {
        finalSKU = this.generateSKU(name, category.slug);
        
        // Verificar que el SKU generado no exista
        let skuExists = await StoreProduct.findOne({ where: { sku: finalSKU } });
        let counter = 1;
        while (skuExists) {
          finalSKU = `${this.generateSKU(name, category.slug)}-${counter}`;
          skuExists = await StoreProduct.findOne({ where: { sku: finalSKU } });
          counter++;
        }
      } else {
        // Verificar que el SKU no exista
        const existingProduct = await StoreProduct.findOne({ where: { sku: finalSKU } });
        if (existingProduct) {
          return res.status(400).json({
            success: false,
            message: 'Ya existe un producto con ese SKU'
          });
        }
      }

      // Validar precios
      if (originalPrice && originalPrice <= price) {
        return res.status(400).json({
          success: false,
          message: 'El precio original debe ser mayor al precio actual'
        });
      }

      // Crear producto
      const product = await StoreProduct.create({
        name: name.trim(),
        description: description?.trim() || null,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        categoryId: parseInt(categoryId),
        brandId: brandId ? parseInt(brandId) : null,
        sku: finalSKU,
        stockQuantity: parseInt(stockQuantity),
        minStock: minStock !== undefined ? parseInt(minStock) : 5,
        isFeatured: Boolean(isFeatured),
        isActive: true,
        weight: weight ? parseFloat(weight) : null,
        dimensions: dimensions || null,
        allowOnlinePayment: allowOnlinePayment !== false,
        allowCardPayment: allowCardPayment !== false,
        allowCashOnDelivery: allowCashOnDelivery !== false,
        deliveryTime: deliveryTime?.trim() || '1-2 días hábiles',
        rating: 0,
        reviewsCount: 0
      });

      // Obtener producto completo con relaciones
      const productWithRelations = await StoreProduct.findByPk(product.id, {
        include: [
          { model: StoreCategory, as: 'category' },
          { model: StoreBrand, as: 'brand' }
        ]
      });

      console.log(`✅ Producto creado: ${product.name} (${product.sku})`);

      res.status(201).json({
        success: true,
        message: 'Producto creado exitosamente',
        data: { product: productWithRelations }
      });
    } catch (error) {
      console.error('Error al crear producto:', error);
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un producto con ese SKU'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error al crear producto',
        error: error.message
      });
    }
  }

  // ✅ Actualizar producto
  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const product = await StoreProduct.findByPk(id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      // Verificar SKU único si se está cambiando
      if (updateData.sku && updateData.sku !== product.sku) {
        const existingProduct = await StoreProduct.findOne({
          where: { 
            sku: updateData.sku,
            id: { [Op.ne]: id }
          }
        });

        if (existingProduct) {
          return res.status(400).json({
            success: false,
            message: 'Ya existe un producto con ese SKU'
          });
        }
      }

      // Verificar categoría si se está cambiando
      if (updateData.categoryId && updateData.categoryId !== product.categoryId) {
        const category = await StoreCategory.findByPk(updateData.categoryId);
        if (!category || !category.isActive) {
          return res.status(400).json({
            success: false,
            message: 'Categoría no válida o inactiva'
          });
        }
      }

      // Verificar marca si se está cambiando
      if (updateData.brandId && updateData.brandId !== product.brandId) {
        const brand = await StoreBrand.findByPk(updateData.brandId);
        if (!brand || !brand.isActive) {
          return res.status(400).json({
            success: false,
            message: 'Marca no válida o inactiva'
          });
        }
      }

      // Validar precios
      if (updateData.originalPrice && updateData.price) {
        if (parseFloat(updateData.originalPrice) <= parseFloat(updateData.price)) {
          return res.status(400).json({
            success: false,
            message: 'El precio original debe ser mayor al precio actual'
          });
        }
      }

      // Verificar si se puede desactivar el producto
      if (updateData.isActive === false && product.isActive === true) {
        // Verificar si está en carritos activos
        const cartItems = await StoreCart.count({
          where: { productId: id }
        });

        if (cartItems > 0) {
          return res.status(400).json({
            success: false,
            message: `No se puede desactivar. El producto está en ${cartItems} carritos activos.`
          });
        }
      }

      // Actualizar producto
      await product.update(updateData);

      // Obtener producto actualizado con relaciones
      const updatedProduct = await StoreProduct.findByPk(id, {
        include: [
          { model: StoreCategory, as: 'category' },
          { model: StoreBrand, as: 'brand' },
          { model: StoreProductImage, as: 'images' }
        ]
      });

      console.log(`✅ Producto actualizado: ${updatedProduct.name} (${updatedProduct.sku})`);

      res.json({
        success: true,
        message: 'Producto actualizado exitosamente',
        data: { product: updatedProduct }
      });
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar producto',
        error: error.message
      });
    }
  }

  // ✅ Eliminar producto (soft delete)
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;

      const product = await StoreProduct.findByPk(id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      // Verificar si se puede eliminar
      const [cartItems, orderItems] = await Promise.all([
        StoreCart.count({ where: { productId: id } }),
        StoreOrderItem.count({ where: { productId: id } })
      ]);

      if (cartItems > 0) {
        return res.status(400).json({
          success: false,
          message: `No se puede eliminar. El producto está en ${cartItems} carritos activos.`
        });
      }

      if (orderItems > 0) {
        // Si tiene órdenes, solo desactivar
        product.isActive = false;
        await product.save();
        
        return res.json({
          success: true,
          message: 'Producto desactivado (tiene órdenes asociadas)'
        });
      }

      // Si no tiene dependencias, desactivar
      product.isActive = false;
      await product.save();

      console.log(`🗑️ Producto desactivado: ${product.name} (${product.sku})`);

      res.json({
        success: true,
        message: 'Producto desactivado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar producto',
        error: error.message
      });
    }
  }

  // ✅ Actualizar stock
  async updateStock(req, res) {
    try {
      const { id } = req.params;
      const { stockQuantity, operation = 'set', reason } = req.body;

      if (stockQuantity === undefined) {
        return res.status(400).json({
          success: false,
          message: 'stockQuantity es requerido'
        });
      }

      const product = await StoreProduct.findByPk(id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      const oldStock = product.stockQuantity;
      let newStock;

      switch (operation) {
        case 'set':
          newStock = parseInt(stockQuantity);
          break;
        case 'add':
          newStock = oldStock + parseInt(stockQuantity);
          break;
        case 'subtract':
          newStock = oldStock - parseInt(stockQuantity);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Operación no válida. Use: set, add, subtract'
          });
      }

      if (newStock < 0) {
        return res.status(400).json({
          success: false,
          message: 'El stock no puede ser negativo'
        });
      }

      product.stockQuantity = newStock;
      await product.save();

      console.log(`📦 Stock actualizado para ${product.name}: ${oldStock} → ${newStock} (${operation})`);

      res.json({
        success: true,
        message: 'Stock actualizado exitosamente',
        data: {
          product: {
            id: product.id,
            name: product.name,
            sku: product.sku,
            oldStock,
            newStock,
            operation,
            reason
          }
        }
      });
    } catch (error) {
      console.error('Error al actualizar stock:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar stock',
        error: error.message
      });
    }
  }

  // ✅ Actualizar múltiples stocks (bulk update)
  async bulkUpdateStock(req, res) {
    try {
      const { updates } = req.body; // [{ id, stockQuantity, operation }]

      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un array de actualizaciones'
        });
      }

      const results = [];
      const errors = [];

      await StoreProduct.sequelize.transaction(async (transaction) => {
        for (const update of updates) {
          try {
            const { id, stockQuantity, operation = 'set' } = update;
            
            const product = await StoreProduct.findByPk(id, { transaction });
            if (!product) {
              errors.push({ id, error: 'Producto no encontrado' });
              continue;
            }

            const oldStock = product.stockQuantity;
            let newStock;

            switch (operation) {
              case 'set':
                newStock = parseInt(stockQuantity);
                break;
              case 'add':
                newStock = oldStock + parseInt(stockQuantity);
                break;
              case 'subtract':
                newStock = oldStock - parseInt(stockQuantity);
                break;
              default:
                errors.push({ id, error: 'Operación no válida' });
                continue;
            }

            if (newStock < 0) {
              errors.push({ id, error: 'Stock no puede ser negativo' });
              continue;
            }

            product.stockQuantity = newStock;
            await product.save({ transaction });

            results.push({
              id: product.id,
              name: product.name,
              sku: product.sku,
              oldStock,
              newStock,
              operation
            });

          } catch (error) {
            errors.push({ id: update.id, error: error.message });
          }
        }
      });

      console.log(`📦 Stock actualizado masivamente: ${results.length} éxitos, ${errors.length} errores`);

      res.json({
        success: errors.length === 0,
        message: `${results.length} productos actualizados, ${errors.length} errores`,
        data: {
          updated: results,
          errors
        }
      });
    } catch (error) {
      console.error('Error en actualización masiva de stock:', error);
      res.status(500).json({
        success: false,
        message: 'Error en actualización masiva',
        error: error.message
      });
    }
  }

  // ✅ Productos con poco stock
  async getLowStockProducts(req, res) {
    try {
      const products = await StoreProduct.findAll({
        where: {
          isActive: true,
          stockQuantity: { [Op.lte]: StoreProduct.sequelize.col('min_stock') }
        },
        include: [
          { model: StoreCategory, as: 'category', attributes: ['id', 'name'] },
          { model: StoreBrand, as: 'brand', attributes: ['id', 'name'] }
        ],
        order: [['stockQuantity', 'ASC']]
      });

      res.json({
        success: true,
        data: { products }
      });
    } catch (error) {
      console.error('Error al obtener productos con poco stock:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos con poco stock',
        error: error.message
      });
    }
  }

  // ✅ Estadísticas de productos
  async getProductStats(req, res) {
    try {
      const [stats, lowStockCount] = await Promise.all([
        StoreProduct.findOne({
          attributes: [
            [StoreProduct.sequelize.fn('COUNT', StoreProduct.sequelize.col('id')), 'totalProducts'],
            [StoreProduct.sequelize.fn('COUNT', StoreProduct.sequelize.literal('CASE WHEN "is_active" = true THEN 1 END')), 'activeProducts'],
            [StoreProduct.sequelize.fn('COUNT', StoreProduct.sequelize.literal('CASE WHEN "is_featured" = true THEN 1 END')), 'featuredProducts'],
            [StoreProduct.sequelize.fn('COUNT', StoreProduct.sequelize.literal('CASE WHEN "stock_quantity" = 0 THEN 1 END')), 'outOfStock'],
            [StoreProduct.sequelize.fn('SUM', StoreProduct.sequelize.col('stockQuantity')), 'totalStock'],
            [StoreProduct.sequelize.fn('AVG', StoreProduct.sequelize.col('price')), 'averagePrice']
          ]
        }),
        StoreProduct.count({
          where: {
            isActive: true,
            stockQuantity: { [Op.lte]: StoreProduct.sequelize.col('min_stock') }
          }
        })
      ]);

      res.json({
        success: true,
        data: {
          totalProducts: parseInt(stats?.dataValues?.totalProducts || 0),
          activeProducts: parseInt(stats?.dataValues?.activeProducts || 0),
          featuredProducts: parseInt(stats?.dataValues?.featuredProducts || 0),
          outOfStock: parseInt(stats?.dataValues?.outOfStock || 0),
          lowStock: lowStockCount,
          totalStock: parseInt(stats?.dataValues?.totalStock || 0),
          averagePrice: parseFloat(stats?.dataValues?.averagePrice || 0)
        }
      });
    } catch (error) {
      console.error('Error al obtener estadísticas de productos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }

  // ✅ Duplicar producto
  async duplicateProduct(req, res) {
    try {
      const { id } = req.params;
      const { newName, newSku } = req.body;

      const originalProduct = await StoreProduct.findByPk(id);
      if (!originalProduct) {
        return res.status(404).json({
          success: false,
          message: 'Producto original no encontrado'
        });
      }

      // Verificar SKU único
      if (newSku) {
        const existingProduct = await StoreProduct.findOne({ where: { sku: newSku } });
        if (existingProduct) {
          return res.status(400).json({
            success: false,
            message: 'Ya existe un producto con ese SKU'
          });
        }
      }

      // Crear datos del nuevo producto
      const productData = originalProduct.toJSON();
      delete productData.id;
      delete productData.createdAt;
      delete productData.updatedAt;
      
      productData.name = newName || `${originalProduct.name} (Copia)`;
      productData.sku = newSku || this.generateSKU(productData.name, 'COPY');
      productData.stockQuantity = 0;
      productData.isFeatured = false;

      // Crear producto duplicado
      const duplicatedProduct = await StoreProduct.create(productData);

      console.log(`📋 Producto duplicado: ${duplicatedProduct.name} (${duplicatedProduct.sku})`);

      res.status(201).json({
        success: true,
        message: 'Producto duplicado exitosamente',
        data: { product: duplicatedProduct }
      });
    } catch (error) {
      console.error('Error al duplicar producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al duplicar producto',
        error: error.message
      });
    }
  }
}

module.exports = new StoreProductController();