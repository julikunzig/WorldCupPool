/**
 * @module repositories/userRepository
 * @description Capa de acceso a datos para usuarios.
 * Todas las operaciones con la tabla users pasan por aquí.
 */

const { query, withTransaction } = require('../config/database');
const logger = require('../config/logger');
const { NotFoundError, DuplicateError } = require('../utils/errors');

/**
 * Obtiene un usuario por ID
 */
const findById = async (id) => {
  const result = await query(
    `SELECT id, nombre, username, email, telefono, role, is_active, created_at, updated_at
     FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Obtiene un usuario por email
 */
const findByEmail = async (email) => {
  const result = await query(
    `SELECT id, nombre, username, email, telefono, role, is_active, must_change_password, created_at, updated_at
     FROM users WHERE email = $1`,
    [email]
  );
  return result.rows[0] || null;
};

/**
 * Obtiene un usuario por username
 */
const findByUsername = async (username) => {
  const result = await query(
    `SELECT id, nombre, username, email, telefono, role, is_active, created_at, updated_at
     FROM users WHERE username = $1`,
    [username]
  );
  return result.rows[0] || null;
};

/**
 * Obtiene un usuario con su hash de contraseña (solo para autenticación)
 */
const findByEmailWithPassword = async (email) => {
  const result = await query(
    `SELECT id, nombre, username, email, password_hash, role, is_active, must_change_password, created_at
     FROM users WHERE email = $1`,
    [email]
  );
  return result.rows[0] || null;
};

/**
 * Crea un nuevo usuario
 */
const create = async (userData) => {
  const { nombre, email, telefono, password_hash, role = 'user' } = userData;

  // Verificar si email ya existe
  const existingEmail = await findByEmail(email);
  if (existingEmail) {
    throw new DuplicateError('Email', email);
  }

  const result = await query(
    `INSERT INTO users (nombre, username, email, telefono, password_hash, role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, nombre, username, email, telefono, role, is_active, created_at`,
    [nombre, email, email, telefono, password_hash, role]
  );

  logger.info('Usuario creado', { userId: result.rows[0].id, email });
  return result.rows[0];
};

/**
 * Actualiza un usuario
 */
const update = async (id, updates) => {
  const user = await findById(id);
  if (!user) {
    throw new NotFoundError('Usuario', id);
  }

  // Verificar si email ya existe (y no es el del usuario actual)
  if (updates.email && updates.email !== user.email) {
    const existing = await findByEmail(updates.email);
    if (existing) {
      throw new DuplicateError('Email', updates.email);
    }
  }

  const fields = [];
  const values = [];
  let paramCount = 1;

  if (updates.nombre !== undefined) {
    fields.push(`nombre = $${paramCount++}`);
    values.push(updates.nombre);
  }
  if (updates.email !== undefined) {
    fields.push(`email = $${paramCount++}`);
    values.push(updates.email);
  }
  if (updates.telefono !== undefined) {
    fields.push(`telefono = $${paramCount++}`);
    values.push(updates.telefono);
  }
  if (updates.password_hash !== undefined) {
    fields.push(`password_hash = $${paramCount++}`);
    values.push(updates.password_hash);
  }
  if (updates.is_active !== undefined) {
    fields.push(`is_active = $${paramCount++}`);
    values.push(updates.is_active);
  }
  if (updates.must_change_password !== undefined) {
    fields.push(`must_change_password = $${paramCount++}`);
    values.push(updates.must_change_password);
  }

  if (fields.length === 0) {
    return user;
  }

  values.push(id);
  const result = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount}
     RETURNING id, nombre, username, email, telefono, role, is_active, created_at, updated_at`,
    values
  );

  logger.info('Usuario actualizado', { userId: id });
  return result.rows[0];
};

/**
 * Obtiene todos los usuarios (paginado)
 */
const findAll = async (limit = 50, offset = 0) => {
  const result = await query(
    `SELECT id, nombre, username, email, telefono, role, is_active, created_at, updated_at
     FROM users
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  const countResult = await query('SELECT COUNT(*) as total FROM users');
  const total = parseInt(countResult.rows[0].total);

  return {
    users: result.rows,
    total,
    limit,
    offset,
  };
};

/**
 * Obtiene todos los usuarios activos
 */
const findAllActive = async () => {
  const result = await query(
    `SELECT id, nombre, username, email, telefono, role, is_active, created_at
     FROM users
     WHERE is_active = TRUE
     ORDER BY nombre ASC`
  );
  return result.rows;
};

/**
 * Desactiva un usuario (soft delete)
 */
const deactivate = async (id) => {
  const user = await findById(id);
  if (!user) {
    throw new NotFoundError('Usuario', id);
  }

  const result = await query(
    `UPDATE users SET is_active = FALSE WHERE id = $1
     RETURNING id, nombre, username, email, role, is_active, created_at, updated_at`,
    [id]
  );

  logger.info('Usuario desactivado', { userId: id });
  return result.rows[0];
};

module.exports = {
  findById,
  findByEmail,
  findByUsername,
  findByEmailWithPassword,
  create,
  update,
  findAll,
  findAllActive,
  deactivate,
};
