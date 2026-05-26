/**
 * @module repositories/settingsRepository
 * @description Acceso a la tabla settings (configuración del sistema).
 */

const { query } = require('../config/database');

/**
 * Obtiene un valor de configuración por clave
 */
const get = async (key) => {
  const result = await query(
    'SELECT key, value, description, updated_at FROM settings WHERE key = $1',
    [key]
  );
  return result.rows[0] || null;
};

/**
 * Obtiene todos los valores de configuración
 */
const getAll = async () => {
  const result = await query(
    'SELECT key, value, description, updated_at FROM settings ORDER BY key ASC'
  );
  return result.rows;
};

/**
 * Actualiza un valor de configuración
 */
const set = async (key, value) => {
  const result = await query(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_at = NOW()
     RETURNING key, value, description, updated_at`,
    [key, value]
  );
  return result.rows[0];
};

module.exports = { get, getAll, set };
