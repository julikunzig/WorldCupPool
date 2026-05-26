/**
 * @module middleware/audit
 * @description Middleware para registrar acciones en la bitácora de auditoría.
 */

const logger = require('../config/logger');
const { query } = require('../config/database');

/**
 * Registra una acción en la tabla audit_log
 * @param {Object} options - Opciones de auditoría
 * @param {number} options.userId - ID del usuario que realiza la acción
 * @param {string} options.action - Tipo de acción (CREATE, UPDATE, DELETE, LOGIN, etc.)
 * @param {string} options.entity - Tipo de entidad (users, predictions, matches, etc.)
 * @param {number} options.entityId - ID de la entidad afectada
 * @param {Object} options.oldData - Datos anteriores (para UPDATE/DELETE)
 * @param {Object} options.newData - Datos nuevos (para CREATE/UPDATE)
 * @param {string} options.ipAddress - Dirección IP del cliente
 * @param {string} options.userAgent - User-Agent del cliente
 */
const logAudit = async (options) => {
  try {
    const {
      userId,
      action,
      entity,
      entityId,
      oldData = null,
      newData = null,
      ipAddress,
      userAgent,
    } = options;

    await query(
      `INSERT INTO audit_log 
       (user_id, action, entity, entity_id, old_data, new_data, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId || null,
        action,
        entity || null,
        entityId || null,
        oldData ? JSON.stringify(oldData) : null,
        newData ? JSON.stringify(newData) : null,
        ipAddress || null,
        userAgent || null,
      ]
    );

    logger.debug('Acción registrada en auditoría', {
      userId,
      action,
      entity,
      entityId,
    });
  } catch (err) {
    logger.error('Error al registrar auditoría', {
      error: err.message,
      action: options.action,
    });
    // No lanzar error, solo loguear para no interrumpir la operación principal
  }
};

/**
 * Middleware: Extrae información del cliente (IP, User-Agent)
 * y la adjunta a req para uso en auditoría
 */
const captureClientInfo = (req, res, next) => {
  req.clientInfo = {
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
  };
  next();
};

module.exports = {
  logAudit,
  captureClientInfo,
};
