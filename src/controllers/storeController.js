// src/controllers/storeController.js - CORREGIDO imports y métodos
const { 
  StoreCategory, 
  StoreBrand, 
  StoreProduct, 
  StoreProductImage,
  StoreCart,
  StoreOrder,
  StoreOrderItem,
  User,
  FinancialMovements
} = require('../models');
const { Op } = require('sequelize');

class StoreController {

  // ✅ === PRODUCTOS ===

  // Obtener productos con filtros
  async getProducts(req, res) {
    try {
      const {
        category,
        brand,
        search,
        minPrice,
        maxPrice,
        featured,
        page = 1,
        limit = 20,
        sortBy = 'name',
        sortOrder = 'ASC'
      } = req.query;

      const offset = (page - 1) * limit;
      const where = { isActive: true };

      // ✅ Filtros
      if (category) where.categoryId = category;
      if (brand) where.brandId = brand;
      if (featured === 'true') where.isFeatured = true;

      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
        if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
      }

      // ✅ Solo productos en stock
      where.stockQuantity = { [Op.gt]: 0 };

      const { count, rows } = await StoreProduct.findAndCountAll({
        where,
        include: [
          { association: 'category', attributes: ['id', 'name', 'slug'] },
          { association: 'brand', attributes: ['id', 'name'] },
          { 
            association: 'images', 
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

      // ✅ Agregar información calculada
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

  // ✅ CORREGIDO: Productos destacados
  async getFeaturedProducts(req, res) {
    try {
      const { limit = 8 } = req.query;
      
      console.log('🌟 Obteniendo productos destacados...');

      // ✅ USAR método estático del modelo correctamente
      const products = await StoreProduct.getFeaturedProducts(parseInt(limit));

      const productsWithInfo = products.map(product => ({
        ...product.toJSON(),
        discountPercentage: product.getDiscountPercentage(),
        inStock: product.isInStock()
      }));

      console.log(`✅ ${productsWithInfo.length} productos destacados obtenidos`);

      res.json({
        success: true,
        data: { products: productsWithInfo }
      });
    } catch (error) {
      console.error('Error al obtener productos destacados:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos destacados',
        error: error.message
      });
    }
  }

  // Obtener producto por ID
  async getProductById(req, res) {
    try {
      const { id } = req.params;

      const product = await StoreProduct.findByPk(id, {
        include: [
          { association: 'category' },
          { association: 'brand' },
          { 
            association: 'images',
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

      if (!product.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Producto no disponible'
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

  // ✅ === CATEGORÍAS ===

  async getCategories(req, res) {
    try {
      const categories = await StoreCategory.getActiveCategories();

      res.json({
        success: true,
        data: { categories }
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

  // ✅ === MARCAS ===

  async getBrands(req, res) {
    try {
      const brands = await StoreBrand.findAll({
        where: { isActive: true },
        order: [['name', 'ASC']]
      });

      res.json({
        success: true,
        data: { brands }
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

  // ✅ === CARRITO CORREGIDO ===

  // ✅ CORREGIDO: Obtener carrito - Usando métodos estáticos
  async getCart(req, res) {
    try {
      const { sessionId } = req.query;
      let cartItems;

      console.log('🛒 Obteniendo carrito...', {
        hasUser: !!req.user,
        userId: req.user?.id,
        sessionId: sessionId
      });

      if (req.user) {
        // ✅ Usuario logueado - usar método estático
        cartItems = await StoreCart.getCartByUser(req.user.id);
        console.log('✅ Carrito obtenido para usuario logueado');
      } else if (sessionId) {
        // ✅ Usuario invitado - usar método estático
        cartItems = await StoreCart.getCartBySession(sessionId);
        console.log('✅ Carrito obtenido para invitado');
      } else {
        return res.status(400).json({
          success: false,
          message: 'Se requiere estar logueado o proporcionar sessionId'
        });
      }

      // ✅ Calcular totales
      const subtotal = cartItems.reduce((sum, item) => {
        return sum + (parseFloat(item.unitPrice) * item.quantity);
      }, 0);

      const taxAmount = subtotal * 0.12; // 12% IVA
      const shippingAmount = subtotal >= 300 ? 0 : 25; // Envío gratis por compras mayores a Q300
      const totalAmount = subtotal + taxAmount + shippingAmount;

      console.log(`📊 Resumen del carrito: ${cartItems.length} items, total: Q${totalAmount.toFixed(2)}`);

      res.json({
        success: true,
        data: {
          cartItems,
          summary: {
            itemsCount: cartItems.length,
            subtotal: parseFloat(subtotal.toFixed(2)),
            taxAmount: parseFloat(taxAmount.toFixed(2)),
            shippingAmount: parseFloat(shippingAmount.toFixed(2)),
            totalAmount: parseFloat(totalAmount.toFixed(2))
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener carrito:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener carrito',
        error: error.message
      });
    }
  }

  // Agregar producto al carrito
  async addToCart(req, res) {
    try {
      const { productId, quantity = 1, selectedVariants, sessionId } = req.body;

      console.log('🛒 Agregando al carrito:', {
        productId,
        quantity,
        hasUser: !!req.user,
        userId: req.user?.id,
        sessionId
      });

      // ✅ Verificar que el producto existe y está disponible
      const product = await StoreProduct.findByPk(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      if (!product.isActive || product.stockQuantity < quantity) {
        return res.status(400).json({
          success: false,
          message: 'Producto no disponible o stock insuficiente'
        });
      }

      // ✅ Determinar si es usuario logueado o invitado
      let cartData = { productId };
      
      if (req.user) {
        // Usuario logueado
        cartData.userId = req.user.id;
        cartData.sessionId = null;
        console.log('👤 Agregando para usuario logueado');
      } else if (sessionId) {
        // Usuario invitado
        cartData.userId = null;
        cartData.sessionId = sessionId;
        console.log('🎫 Agregando para usuario invitado');
      } else {
        return res.status(400).json({
          success: false,
          message: 'Se requiere estar logueado o proporcionar sessionId'
        });
      }

      // ✅ Verificar si ya existe en el carrito
      const existingCartItem = await StoreCart.findOne({ where: cartData });

      if (existingCartItem) {
        // ✅ Actualizar cantidad
        existingCartItem.quantity += parseInt(quantity);
        await existingCartItem.save();
        console.log('✅ Cantidad actualizada en item existente');
      } else {
        // ✅ Crear nuevo item
        await StoreCart.create({
          ...cartData,
          quantity: parseInt(quantity),
          selectedVariants,
          unitPrice: product.price
        });
        console.log('✅ Nuevo item agregado al carrito');
      }

      res.json({
        success: true,
        message: 'Producto agregado al carrito exitosamente'
      });
    } catch (error) {
      console.error('Error al agregar al carrito:', error);
      res.status(500).json({
        success: false,
        message: 'Error al agregar al carrito',
        error: error.message
      });
    }
  }

  // Actualizar cantidad en carrito
  async updateCartItem(req, res) {
    try {
      const { id } = req.params;
      const { quantity } = req.body;

      const cartItem = await StoreCart.findByPk(id);
      if (!cartItem) {
        return res.status(404).json({
          success: false,
          message: 'Item del carrito no encontrado'
        });
      }

      // ✅ Verificar permisos (usuario logueado o sesión coincidente)
      if (req.user) {
        if (cartItem.userId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permisos para modificar este item'
          });
        }
      } else {
        // Para usuarios invitados, verificar sessionId en query params
        const { sessionId } = req.query;
        if (!sessionId || cartItem.sessionId !== sessionId) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permisos para modificar este item'
          });
        }
      }

      // ✅ Verificar stock
      const product = await StoreProduct.findByPk(cartItem.productId);
      if (product.stockQuantity < quantity) {
        return res.status(400).json({
          success: false,
          message: 'Stock insuficiente'
        });
      }

      cartItem.quantity = parseInt(quantity);
      await cartItem.save();

      res.json({
        success: true,
        message: 'Carrito actualizado exitosamente'
      });
    } catch (error) {
      console.error('Error al actualizar carrito:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar carrito',
        error: error.message
      });
    }
  }

  // Eliminar item del carrito
  async removeFromCart(req, res) {
    try {
      const { id } = req.params;

      const cartItem = await StoreCart.findByPk(id);
      if (!cartItem) {
        return res.status(404).json({
          success: false,
          message: 'Item del carrito no encontrado'
        });
      }

      // ✅ Verificar permisos (similar al update)
      if (req.user) {
        if (cartItem.userId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permisos para eliminar este item'
          });
        }
      } else {
        const { sessionId } = req.query;
        if (!sessionId || cartItem.sessionId !== sessionId) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permisos para eliminar este item'
          });
        }
      }

      await cartItem.destroy();

      res.json({
        success: true,
        message: 'Item eliminado del carrito'
      });
    } catch (error) {
      console.error('Error al eliminar del carrito:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar del carrito',
        error: error.message
      });
    }
  }

  // ✅ === ÓRDENES ===

  // ✅ CORREGIDO: Crear orden (checkout) - con métodos estáticos
  async createOrder(req, res) {
    try {
      const {
        sessionId,
        customerInfo, // Para usuarios no logueados
        shippingAddress,
        paymentMethod,
        deliveryTimeSlot,
        notes
      } = req.body;

      console.log('📦 Creando orden...', {
        hasUser: !!req.user,
        userId: req.user?.id,
        sessionId,
        paymentMethod
      });

      // ✅ Obtener items del carrito usando métodos estáticos corregidos
      let cartItems;
      if (req.user) {
        cartItems = await StoreCart.getCartByUser(req.user.id);
        console.log('✅ Items obtenidos para usuario logueado');
      } else if (sessionId) {
        cartItems = await StoreCart.getCartBySession(sessionId);
        console.log('✅ Items obtenidos para usuario invitado');
      } else {
        return res.status(400).json({
          success: false,
          message: 'Carrito vacío o no encontrado'
        });
      }

      if (cartItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El carrito está vacío'
        });
      }

      console.log(`📋 Procesando ${cartItems.length} items del carrito`);

      // ✅ Verificar stock de todos los productos
      for (const item of cartItems) {
        if (item.product.stockQuantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Stock insuficiente para ${item.product.name}`
          });
        }
      }

      // ✅ Calcular totales
      const subtotal = cartItems.reduce((sum, item) => sum + (parseFloat(item.unitPrice) * item.quantity), 0);
      const taxAmount = subtotal * 0.12;
      const shippingAmount = subtotal >= 300 ? 0 : 25;
      const totalAmount = subtotal + taxAmount + shippingAmount;

      console.log('💰 Totales calculados:', {
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        shippingAmount: shippingAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2)
      });

      // ✅ Crear la orden
      const orderData = {
        userId: req.user?.id || null,
        orderNumber: StoreOrder.generateOrderNumber(),
        subtotal,
        taxAmount,
        shippingAmount,
        totalAmount,
        paymentMethod,
        paymentStatus: paymentMethod === 'cash_on_delivery' ? 'pending' : 'pending',
        customerInfo: req.user ? null : customerInfo,
        shippingAddress,
        deliveryTimeSlot,
        notes
      };

      const order = await StoreOrder.create(orderData);
      console.log('✅ Orden creada:', order.id);

      // ✅ Crear items de la orden
      for (const cartItem of cartItems) {
        await StoreOrderItem.create({
          orderId: order.id,
          productId: cartItem.productId,
          productName: cartItem.product.name,
          productSku: cartItem.product.sku,
          quantity: cartItem.quantity,
          unitPrice: cartItem.unitPrice,
          totalPrice: cartItem.unitPrice * cartItem.quantity,
          selectedVariants: cartItem.selectedVariants
        });

        // ✅ Reducir stock
        cartItem.product.stockQuantity -= cartItem.quantity;
        await cartItem.product.save();
      }

      console.log('✅ Items de orden creados y stock actualizado');

      // ✅ Limpiar carrito usando método estático corregido
      if (req.user) {
        await StoreCart.clearCart(req.user.id);
        console.log('✅ Carrito de usuario limpiado');
      } else {
        await StoreCart.clearCart(null, sessionId);
        console.log('✅ Carrito de invitado limpiado');
      }

      // ✅ Crear movimiento financiero si es pago completado
      if (paymentMethod !== 'cash_on_delivery') {
        try {
          await FinancialMovements.create({
            type: 'income',
            category: 'products_sale',
            description: `Venta online - Orden ${order.orderNumber}`,
            amount: totalAmount,
            paymentMethod: paymentMethod === 'online_card' ? 'card' : paymentMethod,
            referenceId: order.id,
            referenceType: 'store_order',
            registeredBy: req.user?.id || null
          });
          console.log('✅ Movimiento financiero creado');
        } catch (financialError) {
          console.warn('⚠️ Error al crear movimiento financiero:', financialError.message);
        }
      }

      // ✅ Obtener orden completa para respuesta
      const orderWithItems = await StoreOrder.findByPk(order.id, {
        include: [
          { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { 
            association: 'items',
            include: [{ association: 'product', attributes: ['id', 'name', 'sku'] }]
          }
        ]
      });

      console.log('🎉 Orden completada exitosamente:', order.orderNumber);

      res.status(201).json({
        success: true,
        message: 'Orden creada exitosamente',
        data: { order: orderWithItems }
      });
    } catch (error) {
      console.error('Error al crear orden:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear orden',
        error: error.message
      });
    }
  }

  // Obtener órdenes del usuario
  async getMyOrders(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Debes estar logueado para ver tus órdenes'
        });
      }

      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows } = await StoreOrder.findAndCountAll({
        where: { userId: req.user.id },
        include: [
          { 
            association: 'items',
            include: [{ association: 'product', attributes: ['id', 'name', 'sku'] }]
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      res.json({
        success: true,
        data: {
          orders: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener órdenes del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener órdenes',
        error: error.message
      });
    }
  }

  // ✅ Obtener orden por ID corregido
  async getOrderById(req, res) {
    try {
      const { id } = req.params;

      const order = await StoreOrder.findByPk(id, {
        include: [
          { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { association: 'processor', attributes: ['id', 'firstName', 'lastName'] },
          { 
            association: 'items',
            include: [{ association: 'product' }]
          }
        ]
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada'
        });
      }

      // ✅ Verificar permisos
      if (req.user) {
        // Si es usuario logueado
        if (req.user.role === 'cliente' && order.userId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permisos para ver esta orden'
          });
        }
        // Admin y colaborador pueden ver todas las órdenes
      } else {
        // Si no hay usuario logueado, solo puede ver órdenes sin usuario (guest orders)
        if (order.userId) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permisos para ver esta orden'
          });
        }
      }

      res.json({
        success: true,
        data: { order }
      });
    } catch (error) {
      console.error('Error al obtener orden:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener orden',
        error: error.message
      });
    }
  }

  // ✅ === ADMINISTRACIÓN (Solo staff) ===

  // Obtener todas las órdenes
  async getAllOrders(req, res) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      const where = {};

      if (status) where.status = status;

      const { count, rows } = await StoreOrder.findAndCountAll({
        where,
        include: [
          { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { association: 'items' }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      res.json({
        success: true,
        data: {
          orders: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener órdenes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener órdenes',
        error: error.message
      });
    }
  }

  // Actualizar estado de orden (MEJORADO)
  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, notes, trackingNumber } = req.body;

      const order = await StoreOrder.findByPk(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada'
        });
      }

      // ✅ Actualizar orden
      order.status = status;
      order.processedBy = req.user.id;
      if (notes) order.notes = notes;
      if (trackingNumber) order.trackingNumber = trackingNumber;
      
      if (status === 'delivered') {
        order.deliveryDate = new Date();
        order.paymentStatus = 'paid';
        
        // ✅ NUEVO: Crear pago automáticamente al entregar
        const { Payment } = require('../models');
        
        // Verificar si ya existe pago
        const existingPayment = await Payment.findOne({
          where: { 
            referenceId: order.id,
            referenceType: 'store_order'
          }
        });

        if (!existingPayment) {
          // ✅ Determinar tipo de pago
          let paymentType, paymentMethod;
          switch (order.paymentMethod) {
            case 'cash_on_delivery':
              paymentType = 'store_cash_delivery';
              paymentMethod = 'cash';
              break;
            case 'card_on_delivery':
              paymentType = 'store_card_delivery';
              paymentMethod = 'card';
              break;
            case 'online_card':
              paymentType = 'store_online';
              paymentMethod = 'card';
              break;
            case 'transfer':
              paymentType = 'store_transfer';
              paymentMethod = 'transfer';
              break;
            default:
              paymentType = 'store_other';
              paymentMethod = 'cash';
          }

          // ✅ Crear pago
          const payment = await Payment.create({
            userId: order.userId,
            amount: order.totalAmount,
            paymentMethod,
            paymentType,
            description: `Venta de productos - Orden ${order.orderNumber}`,
            notes: `Entrega completada - ${order.items?.length || 0} productos`,
            referenceId: order.id,
            referenceType: 'store_order',
            registeredBy: req.user.id,
            status: 'completed',
            paymentDate: new Date()
          });

          // ✅ Crear movimiento financiero
          try {
            await FinancialMovements.create({
              type: 'income',
              category: 'products_sale',
              description: `Venta de productos - Orden ${order.orderNumber}`,
              amount: order.totalAmount,
              paymentMethod,
              referenceId: payment.id,
              referenceType: 'payment',
              registeredBy: req.user.id
            });
            console.log(`✅ Movimiento financiero creado para orden ${order.orderNumber}`);
          } catch (financialError) {
            console.warn('⚠️ Error al crear movimiento financiero:', financialError.message);
          }
        }
      }

      await order.save();

      res.json({
        success: true,
        message: 'Estado de orden actualizado exitosamente',
        data: { order }
      });
    } catch (error) {
      console.error('Error al actualizar orden:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar orden',
        error: error.message
      });
    }
  }

  // Dashboard de tienda
  async getStoreDashboard(req, res) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // ✅ Estadísticas del día
      const [
        ordersToday,
        revenueToday,
        pendingOrders,
        lowStockProducts,
        recentOrders
      ] = await Promise.all([
        StoreOrder.count({
          where: {
            createdAt: { [Op.between]: [today, tomorrow] }
          }
        }),
        StoreOrder.sum('totalAmount', {
          where: {
            status: 'delivered',
            deliveryDate: { [Op.between]: [today, tomorrow] }
          }
        }),
        StoreOrder.count({
          where: { status: ['pending', 'confirmed'] }
        }),
        // ✅ CORREGIDO: Usar min_stock en lugar de minStock
        StoreProduct.count({
          where: {
            stockQuantity: { [Op.lte]: StoreProduct.sequelize.col('min_stock') },
            isActive: true
          }
        }),
        StoreOrder.findAll({
          include: [
            { association: 'user', attributes: ['firstName', 'lastName'] },
            { association: 'items' }
          ],
          order: [['createdAt', 'DESC']],
          limit: 10
        })
      ]);

      res.json({
        success: true,
        data: {
          ordersToday: ordersToday || 0,
          revenueToday: revenueToday || 0,
          pendingOrders: pendingOrders || 0,
          lowStockProducts: lowStockProducts || 0,
          recentOrders
        }
      });
    } catch (error) {
      console.error('Error al obtener dashboard de tienda:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener dashboard',
        error: error.message
      });
    }
  }

  // Reporte de ventas
  async getSalesReport(req, res) {
    try {
      const { startDate, endDate, groupBy = 'day' } = req.query;

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const salesData = await StoreOrder.getSalesReport(start, end);

      res.json({
        success: true,
        data: {
          period: { start, end },
          salesData: salesData.map(item => ({
            date: item.dataValues.date,
            orders: parseInt(item.dataValues.orders),
            revenue: parseFloat(item.dataValues.revenue)
          }))
        }
      });
    } catch (error) {
      console.error('Error al obtener reporte de ventas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener reporte de ventas',
        error: error.message
      });
    }
  }
}

module.exports = new StoreController();