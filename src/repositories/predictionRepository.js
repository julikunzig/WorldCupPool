/**
 * @module repositories/predictionRepository
 * @description Capa de acceso a datos para predicciones.
 */

const { query } = require('../config/database');
const logger = require('../config/logger');
const { NotFoundError, ConflictError } = require('../utils/errors');

/**
 * Obtiene una predicción por ID
 */
const findById = async (id) => {
  const result = await query(
    `SELECT id, user_id, match_id, home_goals, away_goals,
            points_winner, points_score, total_points, created_at, updated_at
     FROM predictions WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Obtiene la predicción de un usuario para un partido específico
 */
const findByUserAndMatch = async (userId, matchId) => {
  const result = await query(
    `SELECT id, user_id, match_id, home_goals, away_goals,
            points_winner, points_score, total_points, created_at, updated_at
     FROM predictions WHERE user_id = $1 AND match_id = $2`,
    [userId, matchId]
  );
  return result.rows[0] || null;
};

/**
 * Obtiene todas las predicciones de un usuario
 */
const findByUser = async (userId) => {
  const result = await query(
    `SELECT p.id, p.user_id, p.match_id, p.home_goals, p.away_goals,
            p.points_winner, p.points_score, p.total_points, p.created_at, p.updated_at,
            m.match_date, m.jornada,
            ht.name as home_team_name, ht.flag as home_team_flag,
            at.name as away_team_name, at.flag as away_team_flag,
            m.real_home_goals, m.real_away_goals, m.is_finished
     FROM predictions p
     JOIN matches m ON p.match_id = m.id
     JOIN teams ht ON m.home_team_id = ht.id
     JOIN teams at ON m.away_team_id = at.id
     WHERE p.user_id = $1
     ORDER BY m.match_date ASC`,
    [userId]
  );
  return result.rows;
};

/**
 * Obtiene todas las predicciones para un partido
 */
const findByMatch = async (matchId) => {
  const result = await query(
    `SELECT p.id, p.user_id, p.match_id, p.home_goals, p.away_goals,
            p.points_winner, p.points_score, p.total_points, p.created_at, p.updated_at,
            u.nombre, u.username
     FROM predictions p
     JOIN users u ON p.user_id = u.id
     WHERE p.match_id = $1
     ORDER BY u.nombre ASC`,
    [matchId]
  );
  return result.rows;
};

/**
 * Crea una nueva predicción
 */
const create = async (predictionData) => {
  const { user_id, match_id, home_goals, away_goals } = predictionData;

  // Verificar que no exista predicción previa
  const existing = await findByUserAndMatch(user_id, match_id);
  if (existing) {
    throw new ConflictError('Ya existe una predicción para este partido');
  }

  const result = await query(
    `INSERT INTO predictions (user_id, match_id, home_goals, away_goals)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, match_id, home_goals, away_goals,
               points_winner, points_score, total_points, created_at`,
    [user_id, match_id, home_goals, away_goals]
  );

  logger.info('Predicción creada', {
    predictionId: result.rows[0].id,
    userId: user_id,
    matchId: match_id,
  });

  return result.rows[0];
};

/**
 * Actualiza una predicción existente
 */
const update = async (id, updates) => {
  const prediction = await findById(id);
  if (!prediction) {
    throw new NotFoundError('Predicción', id);
  }

  const fields = [];
  const values = [];
  let paramCount = 1;

  if (updates.home_goals !== undefined) {
    fields.push(`home_goals = $${paramCount++}`);
    values.push(updates.home_goals);
  }
  if (updates.away_goals !== undefined) {
    fields.push(`away_goals = $${paramCount++}`);
    values.push(updates.away_goals);
  }

  if (fields.length === 0) {
    return prediction;
  }

  values.push(id);
  const result = await query(
    `UPDATE predictions SET ${fields.join(', ')} WHERE id = $${paramCount}
     RETURNING id, user_id, match_id, home_goals, away_goals,
               points_winner, points_score, total_points, created_at, updated_at`,
    values
  );

  logger.info('Predicción actualizada', { predictionId: id });
  return result.rows[0];
};

/**
 * Actualiza los puntos de una predicción (después de que admin registra marcador real)
 */
const updatePoints = async (id, pointsWinner, pointsScore) => {
  const totalPoints = pointsWinner + pointsScore;

  const result = await query(
    `UPDATE predictions 
     SET points_winner = $1, points_score = $2, total_points = $3
     WHERE id = $4
     RETURNING id, user_id, match_id, home_goals, away_goals,
               points_winner, points_score, total_points, created_at, updated_at`,
    [pointsWinner, pointsScore, totalPoints, id]
  );

  logger.debug('Puntos de predicción actualizados', {
    predictionId: id,
    totalPoints,
  });

  return result.rows[0];
};

/**
 * Obtiene todas las predicciones de un partido para calcular puntos
 */
const findByMatchForScoring = async (matchId) => {
  const result = await query(
    `SELECT p.id, p.user_id, p.home_goals, p.away_goals
     FROM predictions p
     WHERE p.match_id = $1`,
    [matchId]
  );
  return result.rows;
};

module.exports = {
  findById,
  findByUserAndMatch,
  findByUser,
  findByMatch,
  create,
  update,
  updatePoints,
  findByMatchForScoring,
};
