/**
 * @module controllers/userController
 * @description Controladores para endpoints de usuarios (admin).
 */

const bcrypt = require('bcryptjs');
const logger = require('../config/logger');
const userRepository = require('../repositories/userRepository');
const { ValidationError } = require('../utils/errors');

/**
 * GET /users  (solo admin)
 * Obtiene todos los usuarios
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    logger.info('Endpoint: GET /users', { adminId: req.user.id });

    const result = await userRepository.findAll(parseInt(limit), parseInt(offset));

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /users/:id  (solo admin)
 * Obtiene un usuario por ID
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    logger.info('Endpoint: GET /users/:id', { adminId: req.user.id, targetUserId: id });

    const user = await userRepository.findById(parseInt(id));
    if (!user) {
      const { NotFoundError } = require('../utils/errors');
      throw new NotFoundError('Usuario', id);
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /users/:id/deactivate  (solo admin)
 * Desactiva un usuario
 */
const deactivateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    logger.info('Endpoint: PUT /users/:id/deactivate', {
      adminId: req.user.id,
      targetUserId: id,
    });

    const user = await userRepository.deactivate(parseInt(id));

    res.status(200).json({
      success: true,
      message: 'Usuario desactivado',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /users  (solo admin)
 * Crea un nuevo usuario
 */
const createUser = async (req, res, next) => {
  try {
    const { nombre, email, telefono, password } = req.body;

    logger.info('Endpoint: POST /users', { adminId: req.user.id, email });

    if (!nombre || nombre.trim().length < 2) {
      throw new ValidationError('El nombre debe tener al menos 2 caracteres');
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ValidationError('Email inválido');
    }
    if (!password || password.length < 6) {
      throw new ValidationError('La contraseña debe tener al menos 6 caracteres');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const user = await userRepository.create({
      nombre: nombre.trim(),
      email: email.toLowerCase().trim(),
      telefono: telefono || null,
      password_hash,
    });

    logger.info('Usuario creado por admin', { adminId: req.user.id, userId: user.id });

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /users/:id  (solo admin)
 * Actualiza datos de un usuario
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, email, telefono } = req.body;

    logger.info('Endpoint: PUT /users/:id', { adminId: req.user.id, targetUserId: id });

    const updates = {};
    if (nombre !== undefined) {
      if (nombre.trim().length < 2) throw new ValidationError('El nombre debe tener al menos 2 caracteres');
      updates.nombre = nombre.trim();
    }
    if (email !== undefined) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError('Email inválido');
      updates.email = email.toLowerCase().trim();
    }
    if (telefono !== undefined) updates.telefono = telefono || null;

    const user = await userRepository.update(parseInt(id), updates);

    logger.info('Usuario actualizado por admin', { adminId: req.user.id, userId: id });

    res.status(200).json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /users/:id/reset-password  (solo admin)
 * Resetea la contraseña de un usuario
 */
const resetUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    logger.info('Endpoint: POST /users/:id/reset-password', {
      adminId: req.user.id,
      targetUserId: id,
    });

    if (!password || password.length < 6) {
      throw new ValidationError('La contraseña debe tener al menos 6 caracteres');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    await userRepository.update(parseInt(id), { password_hash });

    logger.info('Contraseña reseteada por admin', { adminId: req.user.id, userId: id });

    res.status(200).json({
      success: true,
      message: 'Contraseña reseteada exitosamente',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  deactivateUser,
  createUser,
  updateUser,
  resetUserPassword,
};
