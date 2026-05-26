/**
 * @module routes/predictionRoutes
 * @description Rutas de predicciones.
 */

const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/predictions/leaderboard  (requiere autenticación)
router.get('/leaderboard', authenticate, predictionController.getLeaderboard);

// GET /api/predictions/leaderboard/me  (requiere autenticación)
router.get('/leaderboard/me', authenticate, predictionController.getMyPosition);

// GET /api/predictions/report  (solo admin)
router.get('/report', authenticate, requireAdmin, predictionController.getFullReport);

// GET /api/predictions/my  (requiere autenticación)
router.get('/my', authenticate, predictionController.getMyPredictions);

// POST /api/predictions  (requiere autenticación)
router.post('/', authenticate, predictionController.createPrediction);

// PUT /api/predictions/:id  (requiere autenticación)
router.put('/:id', authenticate, predictionController.updatePrediction);

// GET /api/predictions/user/:userId  (solo admin)
router.get('/user/:userId', authenticate, requireAdmin, predictionController.getUserPredictions);

module.exports = router;
