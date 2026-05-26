/**
 * @module jwt
 * @description Utilidades para generar y verificar JWT tokens.
 */

const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const { AuthenticationError } = require('./errors');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Genera un JWT token para un usuario
 * @param {Object} payload - Datos a incluir en el token
 * @returns {string} Token JWT
 */
const generateToken = (payload) => {
  try {
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      algorithm: 'HS256',
    });
    logger.debug('Token JWT generado', { userId: payload.id, expiresIn: JWT_EXPIRES_IN });
    return token;
  } catch (err) {
    logger.error('Error al generar JWT', { error: err.message });
    throw new Error('No se pudo generar el token');
  }
};

/**
 * Verifica y decodifica un JWT token
 * @param {string} token - Token JWT
 * @returns {Object} Payload decodificado
 * @throws {AuthenticationError} Si el token es inválido o expiró
 */
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    });
    logger.debug('Token JWT verificado', { userId: decoded.id });
    return decoded;
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      logger.warn('Token JWT expirado', { expiredAt: err.expiredAt });
      throw new AuthenticationError('Token expirado');
    }
    if (err.name === 'JsonWebTokenError') {
      logger.warn('Token JWT inválido', { error: err.message });
      throw new AuthenticationError('Token inválido');
    }
    logger.error('Error al verificar JWT', { error: err.message });
    throw new AuthenticationError('Error al verificar token');
  }
};

/**
 * Extrae el token del header Authorization
 * @param {string} authHeader - Header Authorization (ej: "Bearer token123")
 * @returns {string|null} Token o null si no existe
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
};

module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
};
