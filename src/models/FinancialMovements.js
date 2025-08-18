// src/models/FinancialMovements.js - MODELO CORREGIDO PARA SEQUELIZE CLI
'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FinancialMovements extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // ✅ Asociación con User
      FinancialMovements.belongsTo(models.User, {
        foreignKey: 'registeredBy',
        as: 'registeredByUser',
        allowNull: true
      });
    }

    // ✅ MÉTODO ESTÁTICO CORREGIDO: Crear desde cualquier pago
    static async createFromAnyPayment(payment) {
      console.log('💰 Creando movimiento financiero desde pago:', payment.id);
      
      try {
        // ✅ VALIDACIÓN: Verificar que payment existe y tiene los campos necesarios
        if (!payment || !payment.id || !payment.amount) {
          console.warn('⚠️ Payment inválido para crear movimiento financiero:', payment);
          return null;
        }

        // ✅ Determinar categoría según tipo de pago
        let category = 'other_income';
        if (payment.paymentType?.includes('membership')) {
          category = 'membership_payment';
        } else if (payment.paymentType?.includes('daily')) {
          category = 'daily_payment';
        } else if (payment.paymentType?.includes('store')) {
          category = 'products_sale';
        }

        // ✅ Determinar si es automático
        const isAutomatic = !payment.registeredBy || payment.paymentType?.includes('store');

        // ✅ Crear movimiento con validaciones apropiadas
        const movementData = {
          type: 'income',
          category: category,
          description: payment.description || `Pago ${payment.paymentType} - ID: ${payment.id}`,
          amount: parseFloat(payment.amount) || 0,
          paymentMethod: payment.paymentMethod || 'card',
          referenceId: payment.id,
          referenceType: 'payment',
          registeredBy: payment.registeredBy || null,
          isAutomatic: isAutomatic,
          movementDate: payment.paymentDate || new Date(),
          notes: payment.notes || `Movimiento generado automáticamente desde pago ${payment.id}`
        };

        console.log('📝 Datos del movimiento a crear:', {
          category: movementData.category,
          amount: movementData.amount,
          isAutomatic: movementData.isAutomatic,
          hasRegisteredBy: !!movementData.registeredBy
        });

        // ✅ REPARACIÓN CRÍTICA: Usar this para el contexto correcto de Sequelize
        const movement = await this.create(movementData);
        
        console.log('✅ Movimiento financiero creado exitosamente:', movement.id);
        return movement;
        
      } catch (error) {
        console.error('❌ Error al crear movimiento financiero:', error.message);
        
        // ✅ REPARACIÓN: Log más detallado del error
        if (error.name === 'SequelizeValidationError') {
          console.error('📋 Errores de validación:', error.errors?.map(e => e.message));
        } else if (error.name === 'SequelizeDatabaseError') {
          console.error('🗄️ Error de base de datos:', error.parent?.message);
        }
        
        // ✅ NO HACER THROW - Devolver null para que no rompa el flujo principal
        return null;
      }
    }

    // ✅ MÉTODO ESTÁTICO CORREGIDO: Crear movimiento automático para invitados
    static async createAutomaticForGuest(paymentData) {
      console.log('🎫 Creando movimiento automático para invitado');
      
      try {
        // ✅ VALIDACIÓN: Verificar datos mínimos
        if (!paymentData || !paymentData.amount) {
          console.warn('⚠️ PaymentData inválido para invitado:', paymentData);
          return null;
        }

        const movementData = {
          type: 'income',
          category: 'products_sale',
          description: `Venta online (invitado) - ${paymentData.description || 'Compra online'}`,
          amount: parseFloat(paymentData.amount) || 0,
          paymentMethod: paymentData.paymentMethod || 'card',
          referenceId: paymentData.referenceId || null,
          referenceType: 'payment',
          registeredBy: null,
          isAutomatic: true,
          movementDate: new Date(),
          notes: `Movimiento automático - Pago de invitado: ${paymentData.paymentIntentId || 'N/A'}`
        };

        const movement = await this.create(movementData);
        
        console.log('✅ Movimiento automático para invitado creado:', movement.id);
        return movement;
        
      } catch (error) {
        console.error('❌ Error al crear movimiento para invitado:', error.message);
        return null;
      }
    }

    // ✅ MÉTODO ESTÁTICO: Buscar movimientos sin asignar
    static async findUnassignedAutomatic(limit = 20) {
      try {
        return await this.findAll({
          where: {
            isAutomatic: true,
            registeredBy: null
          },
          order: [['createdAt', 'DESC']],
          limit: limit
        });
      } catch (error) {
        console.error('❌ Error finding unassigned movements:', error);
        return [];
      }
    }

    // ✅ MÉTODO ESTÁTICO: Adoptar movimiento automático
    static async adoptAutomaticMovement(movementId, userId) {
      try {
        const movement = await this.findByPk(movementId);
        
        if (!movement) {
          throw new Error('Movimiento financiero no encontrado');
        }
        
        if (!movement.isAutomatic) {
          throw new Error('Solo se pueden adoptar movimientos automáticos');
        }
        
        if (movement.registeredBy) {
          throw new Error('Este movimiento ya tiene un usuario asignado');
        }
        
        movement.registeredBy = userId;
        await movement.save();
        
        return movement;
      } catch (error) {
        console.error('❌ Error adopting movement:', error);
        throw error;
      }
    }

    // ✅ NUEVO: Método helper para validar antes de crear
    static async createSafely(movementData) {
      try {
        // Validaciones básicas
        if (!movementData.amount || movementData.amount <= 0) {
          throw new Error('Amount must be positive');
        }
        
        if (!movementData.type || !['income', 'expense'].includes(movementData.type)) {
          throw new Error('Type must be income or expense');
        }
        
        if (!movementData.category) {
          throw new Error('Category is required');
        }
        
        if (!movementData.description || movementData.description.length < 5) {
          throw new Error('Description must be at least 5 characters');
        }

        return await this.create(movementData);
      } catch (error) {
        console.error('❌ Error in createSafely:', error.message);
        throw error;
      }
    }
  }

  // ✅ DEFINIR EL MODELO CON VALIDACIONES
  FinancialMovements.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    type: {
      type: DataTypes.ENUM('income', 'expense'),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'El tipo de movimiento es requerido'
        }
      }
    },
    category: {
      type: DataTypes.ENUM(
        // Ingresos
        'membership_payment', 'daily_payment', 'personal_training', 'products_sale', 'other_income',
        // Egresos  
        'rent', 'utilities', 'equipment_purchase', 'equipment_maintenance', 'staff_salary',
        'cleaning_supplies', 'marketing', 'insurance', 'taxes', 'other_expense'
      ),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'La categoría es requerida'
        }
      }
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'La descripción es requerida'
        },
        len: {
          args: [5, 500],
          msg: 'La descripción debe tener entre 5 y 500 caracteres'
        }
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'El monto debe ser positivo'
        },
        notEmpty: {
          msg: 'El monto es requerido'
        }
      }
    },
    movementDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    paymentMethod: {
      type: DataTypes.ENUM('cash', 'card', 'transfer', 'check', 'online'),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    receiptUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: {
          msg: 'La URL del comprobante debe ser válida'
        }
      }
    },
    referenceId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    referenceType: {
      type: DataTypes.ENUM('payment', 'store_order', 'membership', 'manual'),
      allowNull: true
    },
    // ✅ Campo para determinar si es automático
    isAutomatic: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    // ✅ registeredBy puede ser null para pagos automáticos
    registeredBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'FinancialMovements',
    tableName: 'financial_movements',
    timestamps: true,
    
    // ✅ VALIDACIONES PERSONALIZADAS CORREGIDAS
    validate: {
      // ✅ Solo requerir registeredBy para movimientos manuales
      manualMovementsRequireUser() {
        if (!this.isAutomatic && !this.registeredBy) {
          throw new Error('Los movimientos manuales requieren un usuario que los registre');
        }
      }
    }
  });

  return FinancialMovements;
};