/**
 * @module routes/userRoutes
 * @description Rutas de usuarios (admin).
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/users  (solo admin)
router.get('/', authenticate, requireAdmin, userController.getAllUsers);

// POST /api/users  (solo admin)
router.post('/', authenticate, requireAdmin, userController.createUser);

// GET /api/users/:id  (solo admin)
router.get('/:id', authenticate, requireAdmin, userController.getUserById);

// PUT /api/users/:id  (solo admin)
router.put('/:id', authenticate, requireAdmin, userController.updateUser);

// POST /api/users/:id/reset-password  (solo admin)
router.post('/:id/reset-password', authenticate, requireAdmin, userController.resetUserPassword);

// PUT /api/users/:id/deactivate  (solo admin)
router.put('/:id/deactivate', authenticate, requireAdmin, userController.deactivateUser);

module.exports = router;
