/**
 * @module routes/settingsRoutes
 */

const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/settings  (requiere autenticación)
router.get('/', authenticate, settingsController.getPublicSettings);

// GET /api/settings/all  (solo admin)
router.get('/all', authenticate, requireAdmin, settingsController.getAllSettings);

// PUT /api/settings/:key  (solo admin)
router.put('/:key', authenticate, requireAdmin, settingsController.updateSetting);

module.exports = router;
