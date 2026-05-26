/**
 * @module middleware/errorHandler
 * @description Middleware centralizado para manejo de errores.
 * Debe ser el último middleware registrado en Express.
 */

const logger = require('../config/logger');
const { AppError } = require('../utils/errors');

/**
 * Middleware: Maneja todos los errores de la aplicación
 * Convierte errores en respuestas JSON consistentes
 */
const errorHandler = (err, req, res, next) => {
  // Errores de la aplicación (AppError y subclases)
  if (err instanceof AppError) {
    logger.warn('Error de aplicación', {
      name: err.name,
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
    });

    return res.status(err.statusCode).json({
      success: false,
      error: {
        name: err.name,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
      timestamp: err.timestamp,
    });
  }

  // Errores de validación de Express (express-validator)
  if (err.array && typeof err.array === 'function') {
    const errors = err.array();
    logger.warn('Error de validación', {
      path: req.path,
      errors: errors.map((e) => ({ field: e.param, message: e.msg })),
    });

    return res.status(400).json({
      success: false,
      error: {
        name: 'ValidationError',
        message: 'Datos inválidos',
        details: errors.reduce((acc, e) => {
          acc[e.param] = e.msg;
          return acc;
        }, {}),
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Errores de PostgreSQL
  if (err.code && err.code.startsWith('23')) {
    // 23505 = unique violation, 23503 = foreign key violation, etc.
    logger.error('Error de base de datos (constraint)', {
      code: err.code,
      message: err.message,
      path: req.path,
    });

    let message = 'Error en la base de datos';
    if (err.code === '23505') {
      message = 'El registro ya existe (violación de unicidad)';
    } else if (err.code === '23503') {
      message = 'Referencia inválida a otro registro';
    }

    return res.status(409).json({
      success: false,
      error: {
        name: 'DatabaseError',
        message,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Errores de PostgreSQL - conexión
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    logger.error('Error de conexión a base de datos', {
      code: err.code,
      message: err.message,
    });

    return res.status(503).json({
      success: false,
      error: {
        name: 'DatabaseConnectionError',
        message: 'No se pudo conectar a la base de datos',
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Errores no controlados (500)
  logger.error('Error no controlado', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
  });

  res.status(500).json({
    success: false,
    error: {
      name: 'InternalServerError',
      message: 'Error interno del servidor',
    },
    timestamp: new Date().toISOString(),
  });
};

module.exports = errorHandler;
