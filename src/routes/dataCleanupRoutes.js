// src/routes/dataCleanupRoutes.js
const express = require('express');
const dataCleanupController = require('../controllers/dataCleanupController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ✅ Todas las rutas requieren admin
router.use(authenticateToken);
router.use(requireAdmin);

// ✅ Resumen de datos
router.get('/summary', dataCleanupController.getDataSummary);

// ✅ Limpieza de datos
router.delete('/all', dataCleanupController.cleanAllTestData);
router.delete('/test-users', dataCleanupController.cleanTestUsers);
router.delete('/store-data', dataCleanupController.cleanStoreData);

// ✅ Reinicialización
router.post('/reset-gym-config', dataCleanupController.resetGymConfiguration);
router.post('/seed-store', dataCleanupController.seedStoreData);

module.exports = router;