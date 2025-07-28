// src/routes/brandingRoutes.js - NUEVO: Rutas para configuración de branding
const express = require('express');
const gymController = require('../controllers/gymController');

const router = express.Router();

// ✅ RUTAS PÚBLICAS para branding

// Configuración de tema/branding
router.get('/theme', gymController.getBrandingTheme);

module.exports = router;