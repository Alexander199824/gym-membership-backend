// src/models/index.js
const User = require('./User');
const Membership = require('./Membership');
const Payment = require('./Payment');
const DailyIncome = require('./DailyIncome');
const Notification = require('./Notification');

// Relaciones User - Membership (Un usuario puede tener múltiples membresías)
User.hasMany(Membership, { foreignKey: 'userId', as: 'memberships' });
Membership.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Relaciones User - Payment (Un usuario puede tener múltiples pagos)
User.hasMany(Payment, { foreignKey: 'userId', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Relaciones Membership - Payment (Una membresía puede tener múltiples pagos)
Membership.hasMany(Payment, { foreignKey: 'membershipId', as: 'payments' });
Payment.belongsTo(Membership, { foreignKey: 'membershipId', as: 'membership' });

// Relaciones de auditoría - User - User (Quien registró a quien)
User.hasMany(User, { foreignKey: 'createdBy', as: 'createdUsers' });
User.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Relaciones de auditoría - User - Membership (Quien registró la membresía)
User.hasMany(Membership, { foreignKey: 'registeredBy', as: 'registeredMemberships' });
Membership.belongsTo(User, { foreignKey: 'registeredBy', as: 'registeredByUser' });

// Relaciones de auditoría - User - Payment (Quien registró el pago)
User.hasMany(Payment, { foreignKey: 'registeredBy', as: 'registeredPayments' });
Payment.belongsTo(User, { foreignKey: 'registeredBy', as: 'registeredByUser' });

// Relaciones de validación - User - Payment (Quien validó transferencia)
User.hasMany(Payment, { foreignKey: 'transferValidatedBy', as: 'validatedTransfers' });
Payment.belongsTo(User, { foreignKey: 'transferValidatedBy', as: 'transferValidator' });

// Relaciones User - DailyIncome
User.hasMany(DailyIncome, { foreignKey: 'registeredBy', as: 'registeredIncomes' });
DailyIncome.belongsTo(User, { foreignKey: 'registeredBy', as: 'registeredByUser' });

// Relaciones User - Notification
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Relaciones Membership - Notification
Membership.hasMany(Notification, { foreignKey: 'membershipId', as: 'notifications' });
Notification.belongsTo(Membership, { foreignKey: 'membershipId', as: 'membership' });

// Relaciones Payment - Notification
Payment.hasMany(Notification, { foreignKey: 'paymentId', as: 'notifications' });
Notification.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });

module.exports = {
  User,
  Membership,
  Payment,
  DailyIncome,
  Notification
};