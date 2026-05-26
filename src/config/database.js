/**
 * @module database
 * @description Pool de conexiones PostgreSQL con manejo de errores y logging.
 * Usa pg.Pool para reutilización eficiente de conexiones.
 */

const { Pool } = require('pg');
const logger = require('./logger');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'polla_mundial',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: parseInt(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT) || 2000,
});

// ─── Eventos del pool ─────────────────────────────────────────────────────────

pool.on('connect', (client) => {
  logger.debug('Nueva conexión establecida con PostgreSQL', {
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
  });
});

pool.on('error', (err, client) => {
  logger.error('Error inesperado en cliente PostgreSQL inactivo', {
    error: err.message,
    stack: err.stack,
  });
});

pool.on('remove', () => {
  logger.debug('Conexión removida del pool');
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Ejecuta una query con logging automático de duración y errores.
 * @param {string} text - SQL query
 * @param {Array} params - Parámetros parametrizados (previene SQL injection)
 * @returns {Promise<pg.QueryResult>}
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Query ejecutada', {
      query: text.substring(0, 100),
      duration: `${duration}ms`,
      rows: result.rowCount,
    });
    return result;
  } catch (err) {
    const duration = Date.now() - start;
    logger.error('Error en query SQL', {
      query: text.substring(0, 200),
      error: err.message,
      duration: `${duration}ms`,
    });
    throw err;
  }
};

/**
 * Obtiene un cliente del pool para transacciones manuales.
 * IMPORTANTE: siempre llamar client.release() en finally.
 * @returns {Promise<pg.PoolClient>}
 */
const getClient = () => pool.connect();

/**
 * Ejecuta un bloque de código dentro de una transacción.
 * Hace rollback automático si ocurre un error.
 * @param {Function} callback - async (client) => { ... }
 * @returns {Promise<any>}
 */
const withTransaction = async (callback) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    logger.debug('Transacción iniciada');
    const result = await callback(client);
    await client.query('COMMIT');
    logger.debug('Transacción confirmada (COMMIT)');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.warn('Transacción revertida (ROLLBACK)', { error: err.message });
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Verifica la conectividad con la base de datos.
 * @returns {Promise<boolean>}
 */
const testConnection = async () => {
  try {
    const result = await query('SELECT NOW() AS current_time');
    logger.info('Conexión a PostgreSQL verificada', {
      serverTime: result.rows[0].current_time,
    });
    return true;
  } catch (err) {
    logger.error('No se pudo conectar a PostgreSQL', { error: err.message });
    return false;
  }
};

module.exports = { query, getClient, withTransaction, testConnection, pool };
