/**
 * @module controllers/authController
 * @description Controladores para endpoints de autenticación.
 */

const logger = require('../config/logger');
const authService = require('../services/authService');

/**
 * POST /auth/register
 * Registra un nuevo usuario
 */
const register = async (req, res, next) => {
  try {
    const { nombre, email, telefono, password } = req.body;

    logger.info('Endpoint: POST /auth/register', { email });

    const result = await authService.register(
      { nombre, email, telefono, password },
      req.clientInfo
    );

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/login
 * Autentica un usuario
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    logger.info('Endpoint: POST /auth/login', { email });

    const result = await authService.login(email, password, req.clientInfo);

    res.status(200).json({
      success: true,
      message: 'Login exitoso',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /auth/profile
 * Obtiene el perfil del usuario autenticado
 */
const getProfile = async (req, res, next) => {
  try {
    logger.info('Endpoint: GET /auth/profile', { userId: req.user.id });

    const user = await authService.getProfile(req.user.id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/change-password
 * Cambia la contraseña del usuario autenticado
 */
const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    logger.info('Endpoint: POST /auth/change-password', { userId: req.user.id });

    await authService.changePassword(req.user.id, oldPassword, newPassword, req.clientInfo);

    res.status(200).json({
      success: true,
      message: 'Contraseña cambiada exitosamente',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/set-password
 * Establece nueva contraseña en el primer login (sin requerir contraseña anterior)
 */
const setFirstPassword = async (req, res, next) => {
  try {
    const { newPassword, confirmPassword } = req.body;

    logger.info('Endpoint: POST /auth/set-password', { userId: req.user.id });

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: { message: 'La contraseña debe tener al menos 6 caracteres' } });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, error: { message: 'Las contraseñas no coinciden' } });
    }

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    const userRepository = require('../repositories/userRepository');
    await userRepository.update(req.user.id, { password_hash, must_change_password: false });

    logger.info('Primera contraseña establecida', { userId: req.user.id });

    res.status(200).json({
      success: true,
      message: 'Contraseña establecida exitosamente',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  changePassword,
  setFirstPassword,
};
