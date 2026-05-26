/**
 * @module services/authService
 * @description Lógica de negocio para autenticación y registro.
 */

const bcrypt = require('bcryptjs');
const logger = require('../config/logger');
const userRepository = require('../repositories/userRepository');
const { generateToken } = require('../utils/jwt');
const { validateUserRegistration } = require('../utils/validators');
const { AuthenticationError, DuplicateError } = require('../utils/errors');
const { logAudit } = require('../middleware/audit');

/**
 * Registra un nuevo usuario
 */
const register = async (userData, clientInfo) => {
  logger.info('Intento de registro', { email: userData.email });

  // Validar datos
  validateUserRegistration(userData);

  // Hash de contraseña
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(userData.password, salt);

  // Crear usuario (usar email como username)
  const user = await userRepository.create({
    nombre: userData.nombre,
    email: userData.email,
    telefono: userData.telefono,
    password_hash,
  });

  // Auditoría
  await logAudit({
    userId: user.id,
    action: 'REGISTER',
    entity: 'users',
    entityId: user.id,
    newData: { email: user.email },
    ...clientInfo,
  });

  logger.info('Usuario registrado exitosamente', { userId: user.id, email: user.email });

  // Generar token
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      role: user.role,
      must_change_password: user.must_change_password,
    },
    token,
  };
};

/**
 * Autentica un usuario (login)
 */
const login = async (email, password, clientInfo) => {
  logger.info('Intento de login', { email });

  // Buscar usuario con contraseña
  const user = await userRepository.findByEmailWithPassword(email);
  if (!user) {
    logger.warn('Login fallido: usuario no encontrado', { email });
    throw new AuthenticationError('Email o contraseña incorrectos');
  }

  if (!user.is_active) {
    logger.warn('Login fallido: usuario inactivo', { userId: user.id });
    throw new AuthenticationError('Usuario desactivado');
  }

  // Verificar contraseña
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    logger.warn('Login fallido: contraseña incorrecta', { userId: user.id });

    // Auditoría de intento fallido
    await logAudit({
      userId: user.id,
      action: 'LOGIN_FAILED',
      entity: 'users',
      entityId: user.id,
      newData: { reason: 'invalid_password' },
      ...clientInfo,
    });

    throw new AuthenticationError('Email o contraseña incorrectos');
  }

  // Auditoría de login exitoso
  await logAudit({
    userId: user.id,
    action: 'LOGIN',
    entity: 'users',
    entityId: user.id,
    ...clientInfo,
  });

  logger.info('Login exitoso', { userId: user.id, email });

  // Generar token
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      nombre: user.nombre,
      username: user.username,
      email: user.email,
      role: user.role,
      must_change_password: user.must_change_password,
    },
    token,
  };
};

/**
 * Obtiene el perfil del usuario autenticado
 */
const getProfile = async (userId) => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new AuthenticationError('Usuario no encontrado');
  }

  return user;
};

/**
 * Cambia la contraseña de un usuario
 */
const changePassword = async (userId, oldPassword, newPassword, clientInfo) => {
  logger.info('Intento de cambio de contraseña', { userId });

  const user = await userRepository.findByEmailWithPassword(
    (await userRepository.findById(userId)).email
  );

  if (!user) {
    throw new AuthenticationError('Usuario no encontrado');
  }

  // Verificar contraseña antigua
  const isPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);
  if (!isPasswordValid) {
    logger.warn('Cambio de contraseña fallido: contraseña antigua incorrecta', { userId });
    throw new AuthenticationError('Contraseña actual incorrecta');
  }

  // Hash de nueva contraseña
  const salt = await bcrypt.genSalt(10);
  const newPasswordHash = await bcrypt.hash(newPassword, salt);

  // Actualizar
  await userRepository.update(userId, { password_hash: newPasswordHash });

  // Auditoría
  await logAudit({
    userId,
    action: 'CHANGE_PASSWORD',
    entity: 'users',
    entityId: userId,
    ...clientInfo,
  });

  logger.info('Contraseña cambiada exitosamente', { userId });
};

module.exports = {
  register,
  login,
  getProfile,
  changePassword,
};
