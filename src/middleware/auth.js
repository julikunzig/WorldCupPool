/**
 * @module middleware/auth
 * @description Middleware de autenticación y autorización.
 */

const logger = require('../config/logger');
const { extractTokenFromHeader, verifyToken } = require('../utils/jwt');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');

/**
 * Middleware: Verifica que el usuario esté autenticado
 * Extrae el token del header Authorization y lo valida
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      logger.warn('Intento de acceso sin token', {
        path: req.path,
        ip: req.ip,
      });
      throw new AuthenticationError('Token no proporcionado');
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    logger.debug('Usuario autenticado', { userId: decoded.id, path: req.path });
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware: Verifica que el usuario sea administrador
 * Debe ejecutarse después de authenticate
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return next(new AuthenticationError('No autenticado'));
  }

  if (req.user.role !== 'admin') {
    logger.warn('Intento de acceso admin sin permisos', {
      userId: req.user.id,
      path: req.path,
    });
    return next(new AuthorizationError('Se requieren permisos de administrador'));
  }

  logger.debug('Acceso admin verificado', { userId: req.user.id });
  next();
};

/**
 * Middleware: Verifica que el usuario sea el propietario del recurso o admin
 * Útil para endpoints como GET /users/:id
 */
const requireOwnerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return next(new AuthenticationError('No autenticado'));
  }

  const resourceUserId = parseInt(req.params.userId || req.params.id);
  const isOwner = req.user.id === resourceUserId;
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    logger.warn('Intento de acceso a recurso sin permisos', {
      userId: req.user.id,
      resourceUserId,
      path: req.path,
    });
    return next(new AuthorizationError('No tienes permiso para acceder a este recurso'));
  }

  logger.debug('Acceso a recurso verificado', { userId: req.user.id, resourceUserId });
  next();
};

module.exports = {
  authenticate,
  requireAdmin,
  requireOwnerOrAdmin,
};
