// src/models/associations.js - REPARADO
// Este archivo ya existe pero está fallando, necesita ser reparado

module.exports = (models) => {
  const { User, Membership, Payment } = models;

  // Verificar que los modelos existen antes de crear asociaciones
  if (!User || !Membership || !Payment) {
    console.log('⚠️ Algunos modelos críticos no están disponibles para asociaciones');
    return;
  }

  try {
    // ✅ AGREGAR: Asociaciones críticas que faltan
    if (Membership && User) {
      // Asociación que está causando el error
      Membership.belongsTo(User, {
        foreignKey: 'registeredBy',
        as: 'registeredByUser',
        constraints: false
      });
      console.log('✅ Asociación agregada: Membership.registeredByUser');
    }

    if (Payment && User) {
      // Asociación que está causando el error  
      Payment.belongsTo(User, {
        foreignKey: 'registeredBy',
        as: 'registeredByUser', 
        constraints: false
      });
      console.log('✅ Asociación agregada: Payment.registeredByUser');
    }

    // ✅ VERIFICAR: Asociaciones adicionales que pueden faltar
    if (Payment && User && !Payment.associations?.transferValidator) {
      Payment.belongsTo(User, {
        foreignKey: 'transferValidatedBy',
        as: 'transferValidator',
        constraints: false
      });
      console.log('✅ Asociación agregada: Payment.transferValidator');
    }

    console.log('✅ Todas las asociaciones críticas agregadas correctamente');

  } catch (error) {
    console.error('❌ Error al crear asociaciones críticas:', error.message);
  }
};