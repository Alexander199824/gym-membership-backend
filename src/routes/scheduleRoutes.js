// src/routes/scheduleRoutes.js
const express = require('express');
const scheduleController = require('../controllers/scheduleController');
const { 
  updateScheduleValidator,
  addScheduleValidator,
  scheduleIdValidator,
  createDefaultScheduleValidator
} = require('../validators/scheduleValidators');
const { handleValidationErrors } = require('../middleware/validation');
const { authenticateToken, requireStaff } = require('../middleware/auth');

const router = express.Router();

// ✅ Rutas para usuarios
router.get('/my-schedule', 
  authenticateToken, 
  scheduleController.getMySchedule
);

router.put('/my-schedule', 
  authenticateToken, 
  updateScheduleValidator,
  handleValidationErrors,
  scheduleController.updateMySchedule
);

router.post('/my-schedule', 
  authenticateToken, 
  addScheduleValidator,
  handleValidationErrors,
  scheduleController.addSchedule
);

router.delete('/my-schedule/:id', 
  authenticateToken, 
  scheduleIdValidator,
  handleValidationErrors,
  scheduleController.deleteSchedule
);

router.post('/create-default', 
  authenticateToken, 
  createDefaultScheduleValidator,
  handleValidationErrors,
  scheduleController.createDefaultSchedule
);

// ✅ Rutas para análisis (staff)
router.get('/popular-times', 
  authenticateToken, 
  requireStaff, 
  scheduleController.getPopularTimes
);

router.get('/availability', 
  authenticateToken, 
  scheduleController.getGymAvailability
);

module.exports = router;