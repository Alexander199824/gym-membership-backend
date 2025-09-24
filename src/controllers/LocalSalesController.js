// src/controllers/LocalSalesController.js - CORREGIDO: Referencias de asociaciones
const { 
  LocalSale, 
  LocalSaleItem, 
  StoreProduct, 
  StoreCategory,
  StoreBrand,
  User, 
  TransferConfirmation,
  FinancialMovements 
} = require('../models');
const { Op } = require('sequelize');

class LocalSalesController {

  // ✅ Crear venta en efectivo (inmediata)
  async createCashSale(req, res) {
    try {
      const { 
        items, 
        cashReceived, 
        customerInfo, 
        discountAmount = 0, 
        notes 
      } = req.body;

      // Validaciones iniciales
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere al menos un producto'
        });
      }

      console.log('💰 Procesando venta en efectivo...', {
        empleado: req.user.getFullName(),
        items: items.length
      });

      // Calcular totales
      const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0);
      const taxAmount = subtotal * 0.12; // 12% IVA Guatemala
      const finalDiscountAmount = parseFloat(discountAmount) || 0;
      const totalAmount = subtotal + taxAmount - finalDiscountAmount;

      // Validar efectivo recibido
      const cashReceivedAmount = parseFloat(cashReceived);
      if (cashReceivedAmount < totalAmount) {
        return res.status(400).json({
          success: false,
          message: `Efectivo recibido insuficiente. Total: Q${totalAmount.toFixed(2)}, Recibido: Q${cashReceivedAmount.toFixed(2)}`
        });
      }

      // Validar stock y obtener productos
      const productIds = items.map(item => item.productId);
      const products = await StoreProduct.findAll({
        where: { id: { [Op.in]: productIds } }
      });

      for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        if (!product) {
          return res.status(404).json({
            success: false,
            message: `Producto con ID ${item.productId} no encontrado`
          });
        }

        if (!product.isActive) {
          return res.status(400).json({
            success: false,
            message: `El producto "${product.name}" no está activo`
          });
        }

        if (product.stockQuantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Stock insuficiente para "${product.name}". Disponible: ${product.stockQuantity}, Solicitado: ${item.quantity}`
          });
        }
      }

      // Iniciar transacción
      const transaction = await LocalSale.sequelize.transaction();

      try {
        // Crear venta
        const sale = await LocalSale.create({
          saleNumber: LocalSale.generateSaleNumber(),
          employeeId: req.user.id,
          workDate: new Date(),
          subtotal,
          discountAmount: finalDiscountAmount,
          taxAmount,
          totalAmount,
          paymentMethod: 'cash',
          cashReceived: cashReceivedAmount,
          changeGiven: cashReceivedAmount - totalAmount,
          customerName: customerInfo?.name || null,
          customerPhone: customerInfo?.phone || null,
          customerEmail: customerInfo?.email || null,
          status: 'completed',
          notes
        }, { transaction });

        // Crear items y actualizar stock
        for (const item of items) {
          const product = products.find(p => p.id === item.productId);
          
          await LocalSaleItem.create({
            saleId: sale.id, // ✅ CORREGIDO: usar saleId consistente
            productId: item.productId,
            productName: product.name,
            productSku: product.sku,
            productPrice: product.price,
            quantity: parseInt(item.quantity),
            unitPrice: parseFloat(item.price),
            discountPercent: item.discountPercent || 0,
            totalPrice: parseFloat(item.price) * parseInt(item.quantity)
          }, { transaction });
          
          // Reducir stock
          await product.update({
            stockQuantity: product.stockQuantity - parseInt(item.quantity)
          }, { transaction });
        }

        // Crear movimiento financiero
        await FinancialMovements.create({
          type: 'income',
          category: 'local_cash_sale',
          description: `Venta local efectivo ${sale.saleNumber}`,
          amount: totalAmount,
          paymentMethod: 'cash',
          referenceId: sale.id,
          referenceType: 'local_sale',
          registeredBy: req.user.id
        }, { transaction });

        await transaction.commit();

        console.log(`✅ Venta en efectivo creada: ${sale.saleNumber} - Q${totalAmount} - Empleado: ${req.user.getFullName()}`);

        res.json({
          success: true,
          message: 'Venta en efectivo procesada exitosamente',
          data: { 
            sale: {
              id: sale.id,
              saleNumber: sale.saleNumber,
              totalAmount: sale.totalAmount,
              cashReceived: sale.cashReceived,
              changeGiven: sale.changeGiven,
              status: sale.status
            }
          }
        });

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } catch (error) {
      console.error('Error al crear venta en efectivo:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar venta en efectivo',
        error: error.message
      });
    }
  }

  // ✅ Crear venta por transferencia (pendiente confirmación)
  async createTransferSale(req, res) {
    try {
      const { 
        items, 
        transferVoucher, 
        bankReference, 
        customerInfo, 
        discountAmount = 0, 
        notes 
      } = req.body;

      // Validaciones
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere al menos un producto'
        });
      }

      if (!transferVoucher || transferVoucher.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere descripción detallada del voucher de transferencia'
        });
      }

      console.log('🏦 Procesando venta por transferencia...', {
        empleado: req.user.getFullName(),
        items: items.length
      });

      // Calcular totales
      const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0);
      const taxAmount = subtotal * 0.12;
      const finalDiscountAmount = parseFloat(discountAmount) || 0;
      const totalAmount = subtotal + taxAmount - finalDiscountAmount;

      // Validar stock
      const productIds = items.map(item => item.productId);
      const products = await StoreProduct.findAll({
        where: { id: { [Op.in]: productIds } }
      });

      for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        if (!product) {
          return res.status(404).json({
            success: false,
            message: `Producto con ID ${item.productId} no encontrado`
          });
        }

        if (!product.isActive || product.stockQuantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Stock insuficiente para "${product.name}"`
          });
        }
      }

      // Iniciar transacción
      const transaction = await LocalSale.sequelize.transaction();

      try {
        // Crear venta (estado transfer_pending)
        const sale = await LocalSale.create({
          saleNumber: LocalSale.generateSaleNumber(),
          employeeId: req.user.id,
          workDate: new Date(),
          subtotal,
          discountAmount: finalDiscountAmount,
          taxAmount,
          totalAmount,
          paymentMethod: 'transfer',
          transferVoucher,
          bankReference,
          transferAmount: totalAmount,
          transferConfirmed: false,
          customerName: customerInfo?.name || null,
          customerPhone: customerInfo?.phone || null,
          customerEmail: customerInfo?.email || null,
          status: 'transfer_pending',
          notes
        }, { transaction });

        // Crear items y reservar stock (reducir inmediatamente)
        for (const item of items) {
          const product = products.find(p => p.id === item.productId);
          
          await LocalSaleItem.create({
            saleId: sale.id, // ✅ CORREGIDO: usar saleId consistente
            productId: item.productId,
            productName: product.name,
            productSku: product.sku,
            productPrice: product.price,
            quantity: parseInt(item.quantity),
            unitPrice: parseFloat(item.price),
            discountPercent: item.discountPercent || 0,
            totalPrice: parseFloat(item.price) * parseInt(item.quantity)
          }, { transaction });
          
          // Reducir stock inmediatamente (reservar)
          await product.update({
            stockQuantity: product.stockQuantity - parseInt(item.quantity)
          }, { transaction });
        }

        // Crear movimiento financiero pendiente
        await FinancialMovements.create({
          type: 'income',
          category: 'local_transfer_pending',
          description: `Venta local transferencia ${sale.saleNumber} (PENDIENTE)`,
          amount: totalAmount,
          paymentMethod: 'transfer',
          referenceId: sale.id,
          referenceType: 'local_sale',
          registeredBy: req.user.id
        }, { transaction });

        await transaction.commit();

        console.log(`✅ Venta por transferencia creada: ${sale.saleNumber} - Q${totalAmount} - PENDIENTE - Empleado: ${req.user.getFullName()}`);

        res.json({
          success: true,
          message: 'Venta por transferencia creada, pendiente de confirmación',
          data: { 
            sale: {
              id: sale.id,
              saleNumber: sale.saleNumber,
              totalAmount: sale.totalAmount,
              transferAmount: sale.transferAmount,
              status: sale.status,
              needsConfirmation: true
            }
          }
        });

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } catch (error) {
      console.error('Error al crear venta por transferencia:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar venta por transferencia',
        error: error.message
      });
    }
  }

  // ✅ Confirmar transferencia manualmente (solo admin)
  async confirmTransferPayment(req, res) {
    try {
      const { saleId } = req.params;
      const { notes } = req.body;

      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden confirmar transferencias'
        });
      }

      const sale = await LocalSale.findByPk(saleId);
      if (!sale) {
        return res.status(404).json({
          success: false,
          message: 'Venta no encontrada'
        });
      }

      if (sale.paymentMethod !== 'transfer') {
        return res.status(400).json({
          success: false,
          message: 'Esta venta no es por transferencia'
        });
      }

      if (sale.transferConfirmed) {
        return res.status(400).json({
          success: false,
          message: 'Esta transferencia ya está confirmada'
        });
      }

      const transaction = await LocalSale.sequelize.transaction();

      try {
        // Actualizar venta
        await sale.update({
          transferConfirmed: true,
          transferConfirmedBy: req.user.id,
          transferConfirmedAt: new Date(),
          status: 'completed',
          notes: notes ? `${sale.notes || ''}\n\n✅ Transferencia confirmada por ${req.user.getFullName()}: ${notes}`.trim() : 
                        `${sale.notes || ''}\n\n✅ Transferencia confirmada por ${req.user.getFullName()}`.trim()
        }, { transaction });

        // Crear confirmación
        await TransferConfirmation.create({
          localSaleId: sale.id,
          voucherDescription: sale.transferVoucher,
          bankReference: sale.bankReference,
          transferAmount: sale.transferAmount,
          confirmedBy: req.user.id,
          confirmedAt: new Date(),
          notes
        }, { transaction });

        // Actualizar movimiento financiero
        await FinancialMovements.update(
          { 
            category: 'local_transfer_confirmed',
            description: `Venta local transferencia ${sale.saleNumber} (CONFIRMADA)`
          },
          { 
            where: { 
              referenceId: sale.id,
              referenceType: 'local_sale'
            },
            transaction
          }
        );

        await transaction.commit();

        console.log(`✅ Transferencia confirmada: ${sale.saleNumber} - Q${sale.transferAmount} - Por: ${req.user.getFullName()}`);

        res.json({
          success: true,
          message: 'Transferencia confirmada exitosamente',
          data: { 
            sale: {
              id: sale.id,
              saleNumber: sale.saleNumber,
              status: sale.status,
              transferConfirmed: sale.transferConfirmed,
              confirmedBy: req.user.getFullName(),
              confirmedAt: new Date()
            }
          }
        });

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } catch (error) {
      console.error('Error al confirmar transferencia:', error);
      res.status(500).json({
        success: false,
        message: 'Error al confirmar transferencia',
        error: error.message
      });
    }
  }

  // ✅ Obtener transferencias pendientes
  async getPendingTransfers(req, res) {
    try {
      // Solo admin y colaborador (que vean solo las suyas)
      if (!['admin', 'colaborador'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver transferencias pendientes'
        });
      }

      let where = {
        paymentMethod: 'transfer',
        transferConfirmed: false,
        status: 'transfer_pending'
      };

      // Colaborador solo ve sus transferencias
      if (req.user.role === 'colaborador') {
        where.employeeId = req.user.id;
      }

      const pendingSales = await LocalSale.findAll({
        where,
        include: [
          { 
            association: 'employee', 
            attributes: ['id', 'firstName', 'lastName'] 
          },
          { 
            association: 'items',
            include: [{
              association: 'product', 
              attributes: ['id', 'name', 'sku']
            }]
          }
        ],
        order: [['createdAt', 'ASC']]
      });

      const formattedSales = pendingSales.map(sale => {
        const hoursWaiting = (new Date() - sale.createdAt) / (1000 * 60 * 60);
        
        return {
          id: sale.id,
          saleNumber: sale.saleNumber,
          totalAmount: parseFloat(sale.totalAmount),
          transferAmount: parseFloat(sale.transferAmount),
          transferVoucher: sale.transferVoucher,
          bankReference: sale.bankReference,
          createdAt: sale.createdAt,
          hoursWaiting: Math.round(hoursWaiting * 10) / 10,
          priority: hoursWaiting > 24 ? 'high' : hoursWaiting > 12 ? 'medium' : 'normal',
          employee: {
            name: `${sale.employee.firstName} ${sale.employee.lastName}`
          },
          customer: sale.getClientInfo(),
          itemsCount: sale.items.length,
          canConfirm: req.user.role === 'admin'
        };
      });

      res.json({
        success: true,
        data: { 
          transfers: formattedSales,
          total: formattedSales.length,
          userRole: req.user.role
        }
      });

    } catch (error) {
      console.error('Error al obtener transferencias pendientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener transferencias pendientes',
        error: error.message
      });
    }
  }

  // ✅ Búsqueda rápida de productos
  async searchProducts(req, res) {
    try {
      const { q, limit = 20 } = req.query;

      if (!q || q.length < 2) {
        return res.json({ 
          success: true, 
          data: { products: [] }
        });
      }

      const products = await StoreProduct.findAll({
        where: {
          isActive: true,
          stockQuantity: { [Op.gt]: 0 },
          [Op.or]: [
            { name: { [Op.iLike]: `%${q}%` } },
            { sku: { [Op.iLike]: `%${q}%` } }
          ]
        },
        include: [
          { association: 'category', attributes: ['id', 'name'] },
          { association: 'brand', attributes: ['id', 'name'] }
        ],
        attributes: ['id', 'name', 'sku', 'price', 'stockQuantity', 'originalPrice'],
        limit: parseInt(limit),
        order: [
          ['isFeatured', 'DESC'],
          ['name', 'ASC']
        ]
      });

      const formattedProducts = products.map(product => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: parseFloat(product.price),
        originalPrice: product.originalPrice ? parseFloat(product.originalPrice) : null,
        stockQuantity: product.stockQuantity,
        category: product.category?.name || 'Sin categoría',
        brand: product.brand?.name || 'Sin marca',
        discountPercentage: product.getDiscountPercentage(),
        inStock: product.isInStock(),
        lowStock: product.isLowStock()
      }));

      res.json({
        success: true,
        data: { products: formattedProducts }
      });

    } catch (error) {
      console.error('Error al buscar productos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al buscar productos',
        error: error.message
      });
    }
  }

  // ✅ Reporte diario - CORREGIDO
  async getDailyReport(req, res) {
    try {
      const { date = new Date().toISOString().split('T')[0] } = req.query;
      
      // Solo admin puede ver reportes de todos, colaborador solo el suyo
      let employeeId = null;
      if (req.user.role === 'colaborador') {
        employeeId = req.user.id;
      }

      const reportDate = new Date(date);
      const report = await LocalSale.getDailyReport(reportDate, employeeId);

      // Agregar información adicional
      const pendingTransfers = await LocalSale.count({
        where: {
          workDate: reportDate,
          paymentMethod: 'transfer',
          transferConfirmed: false,
          ...(employeeId && { employeeId })
        }
      });

      const topProducts = await LocalSaleItem.findAll({
        attributes: [
          'productName',
          [LocalSaleItem.sequelize.fn('SUM', LocalSaleItem.sequelize.col('quantity')), 'totalSold']
        ],
        include: [{
          association: 'sale', // ✅ CORREGIDO: usar 'sale' en lugar de 'localSale'
          attributes: [],
          where: {
            workDate: reportDate,
            status: 'completed',
            ...(employeeId && { employeeId })
          }
        }],
        group: ['productName'],
        order: [[LocalSaleItem.sequelize.fn('SUM', LocalSaleItem.sequelize.col('quantity')), 'DESC']],
        limit: 5
      });

      const enhancedReport = {
        ...report,
        pendingTransfers,
        topProducts: topProducts.map(item => ({
          productName: item.productName,
          totalSold: parseInt(item.dataValues.totalSold)
        })),
        userRole: req.user.role,
        employeeName: req.user.role === 'colaborador' ? req.user.getFullName() : null
      };

      res.json({
        success: true,
        data: enhancedReport
      });

    } catch (error) {
      console.error('Error al obtener reporte diario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener reporte diario',
        error: error.message
      });
    }
  }

  // ✅ Obtener ventas (con filtros) - CORREGIDO
  async getSales(req, res) {
    try {
      const {
        startDate,
        endDate,
        status,
        paymentMethod,
        employeeId,
        page = 1,
        limit = 20
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // Filtros de fechas
      if (startDate || endDate) {
        where.workDate = {};
        if (startDate) where.workDate[Op.gte] = new Date(startDate);
        if (endDate) where.workDate[Op.lte] = new Date(endDate);
      }

      // Otros filtros
      if (status) where.status = status;
      if (paymentMethod) where.paymentMethod = paymentMethod;
      
      // Filtro por empleado
      if (employeeId) {
        where.employeeId = employeeId;
      } else if (req.user.role === 'colaborador') {
        // Colaborador solo ve sus ventas
        where.employeeId = req.user.id;
      }

      const { count, rows } = await LocalSale.findAndCountAll({
        where,
        include: [
          { association: 'employee', attributes: ['id', 'firstName', 'lastName'] },
          { association: 'items', include: [{ association: 'product', attributes: ['id', 'name', 'sku'] }] },
          { association: 'transferConfirmedByUser', attributes: ['id', 'firstName', 'lastName'], required: false } // ✅ CORREGIDO: usar 'transferConfirmedByUser'
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      const formattedSales = rows.map(sale => {
        const hoursWaiting = sale.needsTransferConfirmation() ? 
          (new Date() - sale.createdAt) / (1000 * 60 * 60) : 0;

        return {
          id: sale.id,
          saleNumber: sale.saleNumber,
          totalAmount: parseFloat(sale.totalAmount),
          paymentMethod: sale.paymentMethod,
          status: sale.status,
          workDate: sale.workDate,
          createdAt: sale.createdAt,
          employee: sale.employee ? {
            name: `${sale.employee.firstName} ${sale.employee.lastName}`
          } : null,
          customer: sale.getClientInfo(),
          itemsCount: sale.items.length,
          transferConfirmed: sale.transferConfirmed,
          confirmer: sale.transferConfirmedByUser ? { // ✅ CORREGIDO: usar 'transferConfirmedByUser'
            name: `${sale.transferConfirmedByUser.firstName} ${sale.transferConfirmedByUser.lastName}`
          } : null,
          hoursWaiting: sale.needsTransferConfirmation() ? Math.round(hoursWaiting * 10) / 10 : null,
          needsAction: sale.needsTransferConfirmation() && req.user.role === 'admin'
        };
      });

      res.json({
        success: true,
        data: {
          sales: formattedSales,
          pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit),
            limit: parseInt(limit)
          },
          userRole: req.user.role
        }
      });

    } catch (error) {
      console.error('Error al obtener ventas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener ventas',
        error: error.message
      });
    }
  }

  // ✅ Obtener venta por ID - CORREGIDO
  async getSaleById(req, res) {
    try {
      const { id } = req.params;

      const sale = await LocalSale.findByPk(id, {
        include: [
          { association: 'employee', attributes: ['id', 'firstName', 'lastName', 'role'] },
          { 
            association: 'items',
            include: [{ association: 'product', attributes: ['id', 'name', 'sku', 'stockQuantity'] }]
          },
          { association: 'transferConfirmedByUser', attributes: ['id', 'firstName', 'lastName'], required: false }, // ✅ CORREGIDO
          { association: 'transferConfirmation', required: false }
        ]
      });

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: 'Venta no encontrada'
        });
      }

      // Validar permisos
      if (req.user.role === 'colaborador' && sale.employeeId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes ver tus propias ventas'
        });
      }

      const hoursWaiting = sale.needsTransferConfirmation() ? 
        (new Date() - sale.createdAt) / (1000 * 60 * 60) : 0;

      const formattedSale = {
        id: sale.id,
        saleNumber: sale.saleNumber,
        employeeId: sale.employeeId,
        workDate: sale.workDate,
        subtotal: parseFloat(sale.subtotal),
        discountAmount: parseFloat(sale.discountAmount),
        taxAmount: parseFloat(sale.taxAmount),
        totalAmount: parseFloat(sale.totalAmount),
        paymentMethod: sale.paymentMethod,
        status: sale.status,
        createdAt: sale.createdAt,
        updatedAt: sale.updatedAt,
        
        // Información de efectivo
        cashReceived: sale.cashReceived ? parseFloat(sale.cashReceived) : null,
        changeGiven: sale.changeGiven ? parseFloat(sale.changeGiven) : null,
        
        // Información de transferencia
        transferVoucher: sale.transferVoucher,
        bankReference: sale.bankReference,
        transferAmount: sale.transferAmount ? parseFloat(sale.transferAmount) : null,
        transferConfirmed: sale.transferConfirmed,
        transferConfirmedAt: sale.transferConfirmedAt,
        
        // Cliente
        customer: sale.getClientInfo(),
        
        // Empleado
        employee: sale.employee ? {
          id: sale.employee.id,
          name: `${sale.employee.firstName} ${sale.employee.lastName}`,
          role: sale.employee.role
        } : null,
        
        // Confirmador (si aplica) - ✅ CORREGIDO
        confirmer: sale.transferConfirmedByUser ? {
          id: sale.transferConfirmedByUser.id,
          name: `${sale.transferConfirmedByUser.firstName} ${sale.transferConfirmedByUser.lastName}`
        } : null,
        
        // Items
        items: sale.items.map(item => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unitPrice),
          discountPercent: parseFloat(item.discountPercent),
          totalPrice: parseFloat(item.totalPrice),
          product: item.product ? {
            currentStock: item.product.stockQuantity,
            isActive: item.product.isActive
          } : null
        })),
        
        // Estado y acciones
        needsTransferConfirmation: sale.needsTransferConfirmation(),
        hoursWaiting: sale.needsTransferConfirmation() ? Math.round(hoursWaiting * 10) / 10 : null,
        canConfirm: sale.needsTransferConfirmation() && req.user.role === 'admin',
        
        // Confirmación de transferencia
        transferConfirmation: sale.transferConfirmation ? {
          id: sale.transferConfirmation.id,
          voucherDescription: sale.transferConfirmation.voucherDescription,
          confirmedAt: sale.transferConfirmation.confirmedAt,
          notes: sale.transferConfirmation.notes
        } : null,
        
        notes: sale.notes
      };

      res.json({
        success: true,
        data: { sale: formattedSale }
      });

    } catch (error) {
      console.error('Error al obtener venta:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener venta',
        error: error.message
      });
    }
  }

  // ✅ Estadísticas personales (para colaborador)
  async getMyStats(req, res) {
    try {
      if (req.user.role !== 'colaborador') {
        return res.status(403).json({
          success: false,
          message: 'Este endpoint es solo para colaboradores'
        });
      }

      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());

      const [todayStats, weekStats, monthStats] = await Promise.all([
        LocalSale.getStats(today, today, req.user.id),
        LocalSale.getStats(startOfWeek, today, req.user.id),
        LocalSale.getStats(startOfMonth, today, req.user.id)
      ]);

      const pendingTransfers = await LocalSale.count({
        where: {
          employeeId: req.user.id,
          paymentMethod: 'transfer',
          transferConfirmed: false,
          status: 'transfer_pending'
        }
      });

      res.json({
        success: true,
        data: {
          employee: {
            id: req.user.id,
            name: req.user.getFullName()
          },
          today: todayStats,
          thisWeek: weekStats,
          thisMonth: monthStats,
          pendingTransfers
        }
      });

    } catch (error) {
      console.error('Error al obtener estadísticas personales:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas personales',
        error: error.message
      });
    }
  }
}

module.exports = new LocalSalesController();