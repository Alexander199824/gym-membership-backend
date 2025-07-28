// src/routes/promotionsRoutes.js - NUEVO: Rutas para promociones activas
const express = require('express');
const gymController = require('../controllers/gymController');

const router = express.Router();

// ✅ RUTAS PÚBLICAS para promociones

// Promociones activas
router.get('/active', gymController.getActivePromotions);

module.exports = router;