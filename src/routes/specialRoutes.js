const express = require('express');
const router = express.Router();
const specialController = require('../controllers/specialController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/special/my
router.get('/my', authenticate, specialController.getMySpecial);

// POST /api/special/my
router.post('/my', authenticate, specialController.saveMySpecial);

// GET /api/special/results
router.get('/results', authenticate, specialController.getResults);

// PUT /api/special/results (admin)
router.put('/results', authenticate, requireAdmin, specialController.saveResults);

// GET /api/special/all (admin)
router.get('/all', authenticate, requireAdmin, specialController.getAllSpecial);

module.exports = router;
