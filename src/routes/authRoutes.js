/**
 * @module routes/authRoutes
 * @description Rutas de autenticación.
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// GET /api/auth/profile  (requiere autenticación)
router.get('/profile', authenticate, authController.getProfile);

// POST /api/auth/change-password  (requiere autenticación)
router.post('/change-password', authenticate, authController.changePassword);

// POST /api/auth/set-password  (requiere autenticación - primer login)
router.post('/set-password', authenticate, authController.setFirstPassword);

// PUT /api/auth/profile  (requiere autenticación - actualizar perfil propio)
router.put('/profile', authenticate, authController.updateProfile);

module.exports = router;
