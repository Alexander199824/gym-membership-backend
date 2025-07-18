// src/routes/gymRoutes.js 
const express = require('express');
const gymController = require('../controllers/gymController');
const { 
  updateConfigurationValidator,
  updateContactInfoValidator,
  updateHoursValidator,
  updateStatisticsValidator
} = require('../validators/gymValidators');
const { handleValidationErrors } = require('../middleware/validation');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ✅ Rutas públicas (para landing page)
router.get('/info', gymController.getGymInfo);
router.get('/config', gymController.getConfiguration);
router.get('/contact', gymController.getContactInfo);
router.get('/hours', gymController.getHours);
router.get('/statistics', gymController.getStatistics);
router.get('/services', gymController.getServices);
router.get('/plans', gymController.getMembershipPlans);

// ✅ Rutas administrativas (solo admin)
router.put('/config', 
  authenticateToken, 
  requireAdmin, 
  updateConfigurationValidator,
  handleValidationErrors,
  gymController.updateConfiguration
);

router.put('/contact', 
  authenticateToken, 
  requireAdmin, 
  updateContactInfoValidator,
  handleValidationErrors,
  gymController.updateContactInfo
);

router.put('/hours', 
  authenticateToken, 
  requireAdmin, 
  updateHoursValidator,
  handleValidationErrors,
  gymController.updateHours
);

router.put('/statistics', 
  authenticateToken, 
  requireAdmin, 
  updateStatisticsValidator,
  handleValidationErrors,
  gymController.updateStatistics
);

router.post('/initialize', 
  authenticateToken, 
  requireAdmin, 
  gymController.initializeDefaultData
);

module.exports = router;