// src/routes/contentRoutes.js - NUEVO: Rutas específicas para contenido dinámico
const express = require('express');
const gymController = require('../controllers/gymController');

const router = express.Router();

// ✅ RUTAS PÚBLICAS específicas para contenido (según guía del frontend)

// Contenido de la landing page
router.get('/landing', gymController.getLandingContent);

module.exports = router;