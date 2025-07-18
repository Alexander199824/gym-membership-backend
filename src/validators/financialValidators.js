// src/validators/financialValidators.js
const { body, query } = require('express-validator');

const createFinancialMovementValidator = [
  body('type')
    .isIn(['income', 'expense'])
    .withMessage('Tipo de movimiento inválido'),
    
  body('category')
    .isIn([
      // Ingresos
      'membership_payment', 'daily_payment', 'personal_training', 'products_sale', 'other_income',
      // Egresos
      'rent', 'utilities', 'equipment_purchase', 'equipment_maintenance', 'staff_salary', 
      'cleaning_supplies', 'marketing', 'insurance', 'taxes', 'other_expense'
    ])
    .withMessage('Categoría de movimiento inválida'),
    
  body('description')
    .notEmpty()
    .withMessage('La descripción es requerida')
    .isLength({ min: 5, max: 500 })
    .withMessage('La descripción debe tener entre 5 y 500 caracteres')
    .trim(),
    
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('El monto debe ser un número positivo'),
    
  body('movementDate')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha inválido'),
    
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'transfer', 'check', 'online'])
    .withMessage('Método de pago inválido'),
    
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las notas no pueden exceder 1000 caracteres')
    .trim(),
    
  body('receiptUrl')
    .optional()
    .isURL()
    .withMessage('La URL del comprobante debe ser válida')
];

const financialReportValidator = [
  query('period')
    .optional()
    .isIn(['today', 'week', 'month', 'quarter', 'year', 'custom'])
    .withMessage('Período de reporte inválido'),
    
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha de inicio inválido'),
    
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha de fin inválido')
    .custom((endDate, { req }) => {
      if (req.query.startDate && endDate <= req.query.startDate) {
        throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
      }
      return true;
    })
];

const incomeVsExpensesValidator = [
  query('groupBy')
    .optional()
    .isIn(['week', 'month'])
    .withMessage('Agrupación inválida (week o month)')
];

module.exports = {
  createFinancialMovementValidator,
  financialReportValidator,
  incomeVsExpensesValidator
};