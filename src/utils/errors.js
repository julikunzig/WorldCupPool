/**
 * @module errors
 * @description Clases de error personalizadas para manejo consistente de excepciones.
 */

/**
 * Error base de la aplicación
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Error de validación (400)
 */
class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400);
    this.name = 'ValidationError';
    this.details = details;
  }
}

/**
 * Error de autenticación (401)
 */
class AuthenticationError extends AppError {
  constructor(message = 'No autenticado') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Error de autorización (403)
 */
class AuthorizationError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Error de recurso no encontrado (404)
 */
class NotFoundError extends AppError {
  constructor(resource = 'Recurso', id = null) {
    const message = id ? `${resource} con ID ${id} no encontrado` : `${resource} no encontrado`;
    super(message, 404);
    this.name = 'NotFoundError';
    this.resource = resource;
  }
}

/**
 * Error de conflicto (409)
 */
class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Error de recurso ya existe (409)
 */
class DuplicateError extends ConflictError {
  constructor(field, value) {
    super(`${field} "${value}" ya existe`);
    this.name = 'DuplicateError';
    this.field = field;
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DuplicateError,
};
