/**
 * @module validators
 * @description Funciones de validación reutilizables para inputs.
 */

const { ValidationError } = require('./errors');

/**
 * Valida que un email sea válido
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valida que una contraseña sea fuerte
 * Requisitos: 8+ caracteres, mayúscula, minúscula, número, carácter especial
 */
const isStrongPassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

/**
 * Valida que un username sea válido
 * Requisitos: 3-20 caracteres, solo letras, números, guiones y guiones bajos
 */
const isValidUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  return usernameRegex.test(username);
};

/**
 * Valida que un teléfono sea válido (formato internacional)
 */
const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-()]/g, ''));
};

/**
 * Valida que un número sea un entero no negativo
 */
const isNonNegativeInt = (value) => {
  return Number.isInteger(value) && value >= 0;
};

/**
 * Valida que una fecha sea válida y esté en el futuro
 */
const isFutureDate = (date) => {
  const d = new Date(date);
  return d instanceof Date && !isNaN(d) && d > new Date();
};

/**
 * Valida que una fecha sea válida y esté en el pasado
 */
const isPastDate = (date) => {
  const d = new Date(date);
  return d instanceof Date && !isNaN(d) && d < new Date();
};

/**
 * Valida un objeto de registro de usuario
 */
const validateUserRegistration = (data) => {
  const errors = {};

  if (!data.nombre || data.nombre.trim().length < 2) {
    errors.nombre = 'El nombre debe tener al menos 2 caracteres';
  }

  if (!isValidEmail(data.email)) {
    errors.email = 'Email inválido';
  }

  if (data.telefono && !isValidPhone(data.telefono)) {
    errors.telefono = 'Teléfono inválido';
  }

  if (!isStrongPassword(data.password)) {
    errors.password = 'Contraseña: 8+ caracteres, mayúscula, minúscula, número y carácter especial';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Datos de registro inválidos', errors);
  }
};

/**
 * Valida un objeto de predicción
 */
const validatePrediction = (data) => {
  const errors = {};

  if (!isNonNegativeInt(data.home_goals)) {
    errors.home_goals = 'Goles locales debe ser un número no negativo';
  }

  if (!isNonNegativeInt(data.away_goals)) {
    errors.away_goals = 'Goles visitantes debe ser un número no negativo';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Predicción inválida', errors);
  }
};

module.exports = {
  isValidEmail,
  isStrongPassword,
  isValidUsername,
  isValidPhone,
  isNonNegativeInt,
  isFutureDate,
  isPastDate,
  validateUserRegistration,
  validatePrediction,
};
