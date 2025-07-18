// src/models/index.js
const User = require('./User');
const Membership = require('./Membership');
const Payment = require('./Payment');
const DailyIncome = require('./DailyIncome');
const Notification = require('./Notification');
const StoreCategory = require('./StoreCategory');
const StoreBrand = require('./StoreBrand');
const StoreProduct = require('./StoreProduct');
const StoreProductImage = require('./StoreProductImage');
const StoreOrder = require('./StoreOrder');
const StoreOrderItem = require('./StoreOrderItem');
const StoreCart = require('./StoreCart');

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

// StoreCategory - StoreProduct
StoreCategory.hasMany(StoreProduct, { foreignKey: 'categoryId', as: 'products' });
StoreProduct.belongsTo(StoreCategory, { foreignKey: 'categoryId', as: 'category' });

// StoreBrand - StoreProduct
StoreBrand.hasMany(StoreProduct, { foreignKey: 'brandId', as: 'products' });
StoreProduct.belongsTo(StoreBrand, { foreignKey: 'brandId', as: 'brand' });

// StoreProduct - StoreProductImage
StoreProduct.hasMany(StoreProductImage, { foreignKey: 'productId', as: 'images' });
StoreProductImage.belongsTo(StoreProduct, { foreignKey: 'productId', as: 'product' });

// User - StoreOrder
User.hasMany(StoreOrder, { foreignKey: 'userId', as: 'storeOrders' });
StoreOrder.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User - StoreOrder (procesado por)
User.hasMany(StoreOrder, { foreignKey: 'processedBy', as: 'processedOrders' });
StoreOrder.belongsTo(User, { foreignKey: 'processedBy', as: 'processor' });

// StoreOrder - StoreOrderItem
StoreOrder.hasMany(StoreOrderItem, { foreignKey: 'orderId', as: 'items' });
StoreOrderItem.belongsTo(StoreOrder, { foreignKey: 'orderId', as: 'order' });

// StoreProduct - StoreOrderItem
StoreProduct.hasMany(StoreOrderItem, { foreignKey: 'productId', as: 'orderItems' });
StoreOrderItem.belongsTo(StoreProduct, { foreignKey: 'productId', as: 'product' });

// User - StoreCart
User.hasMany(StoreCart, { foreignKey: 'userId', as: 'cartItems' });
StoreCart.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// StoreProduct - StoreCart
StoreProduct.hasMany(StoreCart, { foreignKey: 'productId', as: 'cartItems' });
StoreCart.belongsTo(StoreProduct, { foreignKey: 'productId', as: 'product' });

// ✅ ACTUALIZAR la exportación final
module.exports = {
  // Modelos existentes
  User,
  Membership,
  Payment,
  DailyIncome,
  Notification,
  GymConfiguration,
  GymContactInfo,
  GymHours,
  GymStatistics,
  GymServices,
  MembershipPlans,
  FinancialMovements,
  UserSchedulePreferences,
  
  // ✅ Nuevos modelos de tienda
  StoreCategory,
  StoreBrand,
  StoreProduct,
  StoreProductImage,
  StoreOrder,
  StoreOrderItem,
  StoreCart
};

