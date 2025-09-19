// src/controllers/OrderManagementController.js - GESTIÓN MEJORADA DE ÓRDENES
const { 
  StoreOrder, 
  StoreOrderItem, 
  StoreProduct,
  User, 
  TransferConfirmation,
  FinancialMovements 
} = require('../models');
const { Op } = require('sequelize');

class OrderManagementController {

  // ✅ Confirmar orden manualmente
  async confirmOrder(req, res) {
    try {
      const { orderId } = req.params;
      const { estimatedDelivery, estimatedPickup, notes } = req.body;

      // Solo staff puede confirmar órdenes
      if (!['admin', 'colaborador'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Solo el personal puede confirmar órdenes'
        });
      }

      const order = await StoreOrder.findByPk(orderId, {
        include: [
          { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { association: 'items' }
        ]
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada'
        });
      }

      if (order.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `No se puede confirmar una orden con estado: ${order.status}`
        });
      }

      const transaction = await StoreOrder.sequelize.transaction();

      try {
        // Actualizar orden
        const updateData = {
          status: 'confirmed',
          confirmedBy: req.user.id,
          confirmedAt: new Date(),
          requiresConfirmation: false
        };

        // Agregar fechas estimadas según el tipo
        if (order.deliveryType === 'pickup' && estimatedPickup) {
          updateData.pickupDate = new Date(estimatedPickup);
        } else if (order.isDeliveryOrder() && estimatedDelivery) {
          updateData.estimatedDelivery = new Date(estimatedDelivery);
        }

        if (notes) {
          updateData.notes = order.notes ? 
            `${order.notes}\n\n✅ Confirmada por ${req.user.getFullName()}: ${notes}` :
            `✅ Confirmada por ${req.user.getFullName()}: ${notes}`;
        }

        await order.update(updateData, { transaction });

        await transaction.commit();

        console.log(`✅ Orden confirmada: ${order.orderNumber} - Por: ${req.user.getFullName()}`);

        res.json({
          success: true,
          message: 'Orden confirmada exitosamente',
          data: { 
            order: {
              id: order.id,
              orderNumber: order.orderNumber,
              status: order.status,
              deliveryType: order.deliveryType,
              confirmedBy: req.user.getFullName(),
              confirmedAt: new Date(),
              estimatedDelivery: updateData.estimatedDelivery,
              pickupDate: updateData.pickupDate
            }
          }
        });

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } catch (error) {
      console.error('Error al confirmar orden:', error);
      res.status(500).json({
        success: false,
        message: 'Error al confirmar orden',
        error: error.message
      });
    }
  }

  // ✅ Confirmar transferencia para órdenes online
  async confirmTransferPayment(req, res) {
    try {
      const { orderId } = req.params;
      const { voucherDetails, bankReference, notes } = req.body;

      // Solo admin puede confirmar transferencias
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden confirmar transferencias'
        });
      }

      const order = await StoreOrder.findByPk(orderId, {
        include: [
          { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { association: 'items' }
        ]
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada'
        });
      }

      if (order.paymentMethod !== 'transfer_on_delivery') {
        return res.status(400).json({
          success: false,
          message: 'Esta orden no es por transferencia'
        });
      }

      if (order.transferConfirmed) {
        return res.status(400).json({
          success: false,
          message: 'Esta transferencia ya está confirmada'
        });
      }

      const transaction = await StoreOrder.sequelize.transaction();

      try {
        // Actualizar orden
        await order.update({
          paymentStatus: 'paid',
          transferConfirmed: true,
          transferConfirmedBy: req.user.id,
          transferConfirmedAt: new Date(),
          transferVoucherDetails: voucherDetails,
          status: order.status === 'pending' ? 'confirmed' : order.status,
          notes: notes ? 
            `${order.notes || ''}\n\n✅ Transferencia confirmada por ${req.user.getFullName()}: ${notes}`.trim() :
            `${order.notes || ''}\n\n✅ Transferencia confirmada por ${req.user.getFullName()}`.trim()
        }, { transaction });

        // Crear confirmación de transferencia
        await TransferConfirmation.create({
          orderId: order.id,
          voucherDescription: voucherDetails,
          bankReference: bankReference,
          transferAmount: order.totalAmount,
          confirmedBy: req.user.id,
          confirmedAt: new Date(),
          notes
        }, { transaction });

        // Crear movimiento financiero
        await FinancialMovements.create({
          type: 'income',
          category: 'store_transfer_confirmed',
          description: `Transferencia confirmada - Orden ${order.orderNumber}`,
          amount: order.totalAmount,
          paymentMethod: 'transfer',
          referenceId: order.id,
          referenceType: 'store_order',
          registeredBy: req.user.id
        }, { transaction });

        await transaction.commit();

        console.log(`✅ Transferencia de orden confirmada: ${order.orderNumber} - Q${order.totalAmount} - Por: ${req.user.getFullName()}`);

        res.json({
          success: true,
          message: 'Transferencia confirmada exitosamente',
          data: { 
            order: {
              id: order.id,
              orderNumber: order.orderNumber,
              paymentStatus: order.paymentStatus,
              transferConfirmed: true,
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
      console.error('Error al confirmar transferencia de orden:', error);
      res.status(500).json({
        success: false,
        message: 'Error al confirmar transferencia',
        error: error.message
      });
    }
  }

  // ✅ Obtener órdenes con transferencias pendientes
  async getPendingTransfers(req, res) {
    try {
      // Solo staff puede ver transferencias pendientes
      if (!['admin', 'colaborador'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Solo el personal puede ver transferencias pendientes'
        });
      }

      const pendingOrders = await StoreOrder.findAll({
        where: {
          paymentMethod: 'transfer_on_delivery',
          transferConfirmed: false,
          status: { [Op.ne]: 'cancelled' }
        },
        include: [
          { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { association: 'items' }
        ],
        order: [['createdAt', 'ASC']]
      });

      const formattedOrders = pendingOrders.map(order => {
        const hoursWaiting = (new Date() - order.createdAt) / (1000 * 60 * 60);
        
        return {
          id: order.id,
          orderNumber: order.orderNumber,
          totalAmount: parseFloat(order.totalAmount),
          deliveryType: order.deliveryType,
          status: order.status,
          createdAt: order.createdAt,
          hoursWaiting: Math.round(hoursWaiting * 10) / 10,
          priority: hoursWaiting > 24 ? 'high' : hoursWaiting > 12 ? 'medium' : 'normal',
          customer: order.getClientInfo(),
          itemsCount: order.items.length,
          shippingAddress: order.shippingAddress,
          canConfirm: req.user.role === 'admin'
        };
      });

      res.json({
        success: true,
        data: { 
          orders: formattedOrders,
          total: formattedOrders.length,
          userRole: req.user.role
        }
      });

    } catch (error) {
      console.error('Error al obtener transferencias pendientes de órdenes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener transferencias pendientes',
        error: error.message
      });
    }
  }

  // ✅ Dashboard de órdenes
  async getOrdersDashboard(req, res) {
    try {
      // Solo staff puede ver el dashboard
      if (!['admin', 'colaborador'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Solo el personal puede ver el dashboard de órdenes'
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [
        pendingConfirmation,
        readyForPickup,
        packedForShipping,
        pendingTransfers,
        ordersToday,
        revenueToday,
        lowStockCount
      ] = await Promise.all([
        StoreOrder.count({ 
          where: { 
            status: 'pending', 
            requiresConfirmation: true 
          } 
        }),
        
        StoreOrder.count({ 
          where: { 
            status: 'ready_pickup', 
            deliveryType: 'pickup' 
          } 
        }),
        
        StoreOrder.count({ 
          where: { 
            status: 'packed', 
            deliveryType: { [Op.in]: ['delivery', 'express'] }
          } 
        }),
        
        StoreOrder.count({ 
          where: { 
            paymentMethod: 'transfer_on_delivery', 
            transferConfirmed: false,
            status: { [Op.ne]: 'cancelled' }
          } 
        }),
        
        StoreOrder.count({
          where: { 
            createdAt: { [Op.between]: [today, tomorrow] }
          }
        }),

        StoreOrder.sum('totalAmount', {
          where: {
            createdAt: { [Op.between]: [today, tomorrow] },
            status: { [Op.in]: ['delivered', 'picked_up'] }
          }
        }),

        StoreProduct.count({
          where: {
            stockQuantity: { [Op.lte]: StoreProduct.sequelize.col('min_stock') },
            isActive: true
          }
        })
      ]);

      // Órdenes recientes
      const recentOrders = await StoreOrder.findAll({
        include: [
          { association: 'user', attributes: ['firstName', 'lastName'], required: false }
        ],
        order: [['createdAt', 'DESC']],
        limit: 10
      });

      const formattedRecentOrders = recentOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        deliveryType: order.deliveryType,
        totalAmount: parseFloat(order.totalAmount),
        createdAt: order.createdAt,
        customer: order.getClientInfo(),
        needsAction: order.needsTransferValidation() || (order.status === 'pending' && order.requiresConfirmation)
      }));

      res.json({
        success: true,
        data: {
          summary: {
            pendingConfirmation,
            readyForPickup,
            packedForShipping,
            pendingTransfers,
            ordersToday,
            revenueToday: revenueToday || 0,
            lowStockCount
          },
          recentOrders: formattedRecentOrders,
          userRole: req.user.role
        }
      });

    } catch (error) {
      console.error('Error al obtener dashboard de órdenes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener dashboard',
        error: error.message
      });
    }
  }

  // ✅ Obtener órdenes por tipo de entrega
  async getOrdersByDeliveryType(req, res) {
    try {
      const { deliveryType, status, page = 1, limit = 20 } = req.query;

      if (!deliveryType) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere especificar el tipo de entrega (pickup, delivery, express)'
        });
      }

      const offset = (page - 1) * limit;
      const where = { deliveryType };
      
      if (status) where.status = status;

      const { count, rows } = await StoreOrder.findAndCountAll({
        where,
        include: [
          { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { association: 'items' },
          { association: 'confirmer', attributes: ['firstName', 'lastName'], required: false }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      const formattedOrders = rows.map(order => {
        const needsAction = order.needsTransferValidation() || 
                           (order.status === 'pending' && order.requiresConfirmation);

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          deliveryType: order.deliveryType,
          totalAmount: parseFloat(order.totalAmount),
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          createdAt: order.createdAt,
          estimatedDelivery: order.estimatedDelivery,
          pickupDate: order.pickupDate,
          pickupTimeSlot: order.pickupTimeSlot,
          customer: order.getClientInfo(),
          itemsCount: order.items.length,
          confirmer: order.confirmer ? {
            name: `${order.confirmer.firstName} ${order.confirmer.lastName}`
          } : null,
          needsAction,
          canConfirm: needsAction && ['admin', 'colaborador'].includes(req.user.role)
        };
      });

      res.json({
        success: true,
        data: {
          orders: formattedOrders,
          pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit),
            limit: parseInt(limit)
          },
          filters: {
            deliveryType,
            status
          }
        }
      });

    } catch (error) {
      console.error('Error al obtener órdenes por tipo de entrega:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener órdenes',
        error: error.message
      });
    }
  }

  // ✅ Actualizar estado de orden con validaciones específicas
  async updateOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { status, notes, trackingNumber } = req.body;

      // Solo staff puede actualizar estados
      if (!['admin', 'colaborador'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Solo el personal puede actualizar estados de órdenes'
        });
      }

      const order = await StoreOrder.findByPk(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada'
        });
      }

      // Validaciones según el nuevo estado
      const validTransitions = this.getValidStatusTransitions(order.status, order.deliveryType);
      if (!validTransitions.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Transición inválida de ${order.status} a ${status} para tipo ${order.deliveryType}`
        });
      }

      const transaction = await StoreOrder.sequelize.transaction();

      try {
        // Preparar actualización
        const updateData = {
          status,
          processedBy: req.user.id
        };

        if (notes) {
          updateData.notes = order.notes ? 
            `${order.notes}\n\n[${new Date().toLocaleString()}] ${req.user.getFullName()}: ${notes}` :
            `[${new Date().toLocaleString()}] ${req.user.getFullName()}: ${notes}`;
        }

        if (trackingNumber) updateData.trackingNumber = trackingNumber;

        // Acciones específicas según el estado
        if (status === 'delivered') {
          updateData.deliveryDate = new Date();
          updateData.paymentStatus = 'paid';
        } else if (status === 'picked_up') {
          updateData.deliveryDate = new Date();
          updateData.paymentStatus = 'paid';
        } else if (status === 'ready_pickup') {
          // Notificar al cliente que está listo para recoger
          updateData.notes = updateData.notes || order.notes || '';
          updateData.notes += `\n\n📦 Orden lista para recoger el ${new Date().toLocaleDateString()}`;
        }

        await order.update(updateData, { transaction });

        // Crear movimiento financiero si se completó la entrega
        if (['delivered', 'picked_up'].includes(status)) {
          try {
            const existingMovement = await FinancialMovements.findOne({
              where: {
                referenceId: order.id,
                referenceType: 'store_order',
                category: 'store_sale_completed'
              },
              transaction
            });

            if (!existingMovement) {
              await FinancialMovements.create({
                type: 'income',
                category: 'store_sale_completed',
                description: `Venta completada - Orden ${order.orderNumber} (${order.deliveryType})`,
                amount: order.totalAmount,
                paymentMethod: order.paymentMethod === 'transfer_on_delivery' ? 'transfer' : 
                              order.paymentMethod.includes('cash') ? 'cash' : 'card',
                referenceId: order.id,
                referenceType: 'store_order',
                registeredBy: req.user.id
              }, { transaction });
            }
          } catch (financialError) {
            console.warn('⚠️ Error al crear movimiento financiero:', financialError.message);
          }
        }

        await transaction.commit();

        console.log(`✅ Estado de orden actualizado: ${order.orderNumber} → ${status} - Por: ${req.user.getFullName()}`);

        res.json({
          success: true,
          message: 'Estado de orden actualizado exitosamente',
          data: { 
            order: {
              id: order.id,
              orderNumber: order.orderNumber,
              status: status,
              deliveryType: order.deliveryType,
              updatedBy: req.user.getFullName(),
              updatedAt: new Date(),
              trackingNumber: updateData.trackingNumber
            }
          }
        });

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } catch (error) {
      console.error('Error al actualizar estado de orden:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar orden',
        error: error.message
      });
    }
  }

  // ✅ MÉTODO AUXILIAR: Transiciones válidas de estado
  getValidStatusTransitions(currentStatus, deliveryType) {
    const transitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['preparing', 'cancelled'],
      'preparing': deliveryType === 'pickup' 
        ? ['ready_pickup', 'cancelled']
        : ['packed', 'cancelled'],
      'ready_pickup': ['picked_up', 'cancelled'], // Solo para pickup
      'packed': ['shipped', 'cancelled'], // Solo para delivery
      'shipped': ['delivered', 'cancelled'], // Solo para delivery
      'delivered': ['refunded'], // Estado final para delivery
      'picked_up': ['refunded'], // Estado final para pickup
      'cancelled': [], // Estado final
      'refunded': [] // Estado final
    };

    return transitions[currentStatus] || [];
  }

  // ✅ Obtener estadísticas de órdenes
  async getOrderStats(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      let dateRange = {};
      if (startDate || endDate) {
        dateRange.createdAt = {};
        if (startDate) dateRange.createdAt[Op.gte] = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          dateRange.createdAt[Op.lte] = end;
        }
      } else {
        // Por defecto, último mes
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateRange.createdAt = { [Op.gte]: monthAgo };
      }

      const stats = await StoreOrder.getOrderStats(30);
      
      // Estadísticas adicionales por delivery type y payment method
      const [deliveryStats, paymentStats] = await Promise.all([
        StoreOrder.findAll({
          attributes: [
            'deliveryType',
            [StoreOrder.sequelize.fn('COUNT', StoreOrder.sequelize.col('id')), 'count'],
            [StoreOrder.sequelize.fn('SUM', StoreOrder.sequelize.col('totalAmount')), 'revenue']
          ],
          where: dateRange,
          group: ['deliveryType']
        }),

        StoreOrder.findAll({
          attributes: [
            'paymentMethod',
            [StoreOrder.sequelize.fn('COUNT', StoreOrder.sequelize.col('id')), 'count'],
            [StoreOrder.sequelize.fn('SUM', StoreOrder.sequelize.col('totalAmount')), 'revenue']
          ],
          where: dateRange,
          group: ['paymentMethod']
        })
      ]);

      const formattedStats = {
        ...stats,
        byDeliveryType: deliveryStats.map(item => ({
          type: item.deliveryType,
          count: parseInt(item.dataValues.count),
          revenue: parseFloat(item.dataValues.revenue || 0)
        })),
        byPaymentMethod: paymentStats.map(item => ({
          method: item.paymentMethod,
          count: parseInt(item.dataValues.count),
          revenue: parseFloat(item.dataValues.revenue || 0)
        }))
      };

      res.json({
        success: true,
        data: formattedStats
      });

    } catch (error) {
      console.error('Error al obtener estadísticas de órdenes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }
}

module.exports = new OrderManagementController();