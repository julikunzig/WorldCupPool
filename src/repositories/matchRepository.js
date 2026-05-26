/**
 * @module repositories/matchRepository
 * @description Capa de acceso a datos para partidos (grupos + eliminatorias).
 */

const { query } = require('../config/database');
const logger = require('../config/logger');
const { NotFoundError } = require('../utils/errors');

// ── Helpers ───────────────────────────────────────────────────────────────────

const SELECT_MATCH = `
  SELECT
    m.id, m.group_id, m.stage, m.jornada, m.match_date, m.published,
    m.home_team_id, m.away_team_id,
    m.real_home_goals, m.real_away_goals, m.is_finished,
    ht.name  AS home_team_name, ht.flag AS home_team_flag,
    at.name  AS away_team_name, at.flag AS away_team_flag,
    COALESCE(g.name, '') AS group_name,
    m.created_at, m.updated_at
  FROM matches m
  JOIN teams  ht ON m.home_team_id = ht.id
  JOIN teams  at ON m.away_team_id = at.id
  LEFT JOIN groups g ON m.group_id = g.id
`;

// ── Queries ───────────────────────────────────────────────────────────────────

const findById = async (id) => {
  const result = await query(`${SELECT_MATCH} WHERE m.id = $1`, [id]);
  return result.rows[0] || null;
};

const findByGroup = async (groupId) => {
  const result = await query(
    `${SELECT_MATCH} WHERE m.group_id = $1 ORDER BY m.match_date ASC`,
    [groupId]
  );
  return result.rows;
};

/** Todos los partidos publicados (grupos + eliminatorias visibles) */
const findAll = async () => {
  const result = await query(
    `${SELECT_MATCH} WHERE m.published = TRUE ORDER BY m.match_date ASC`
  );
  return result.rows;
};

/** Todos los partidos sin filtro de publicación (para admin) */
const findAllAdmin = async () => {
  const result = await query(`${SELECT_MATCH} ORDER BY m.match_date ASC`);
  return result.rows;
};

const findByJornada = async (jornada) => {
  const result = await query(
    `${SELECT_MATCH} WHERE m.jornada = $1 ORDER BY m.match_date ASC`,
    [jornada]
  );
  return result.rows;
};

/** Partidos de una fase eliminatoria */
const findByStage = async (stage) => {
  const result = await query(
    `${SELECT_MATCH} WHERE m.stage = $1 ORDER BY m.match_date ASC`,
    [stage]
  );
  return result.rows;
};

/** Crear partido de grupos (comportamiento original) */
const create = async (matchData) => {
  const { group_id, jornada, match_date, home_team_id, away_team_id } = matchData;
  const result = await query(
    `INSERT INTO matches (group_id, jornada, match_date, home_team_id, away_team_id, stage, published)
     VALUES ($1, $2, $3, $4, $5, 'group', TRUE)
     RETURNING id, group_id, stage, jornada, match_date, home_team_id, away_team_id,
               real_home_goals, real_away_goals, is_finished, published, created_at`,
    [group_id, jornada, match_date, home_team_id, away_team_id]
  );
  logger.info('Partido de grupos creado', { matchId: result.rows[0].id });
  return result.rows[0];
};

/** Crear partido de fase eliminatoria */
const createKnockout = async (matchData) => {
  const { stage, match_date, home_team_id, away_team_id, jornada = 1 } = matchData;
  const result = await query(
    `INSERT INTO matches (stage, jornada, match_date, home_team_id, away_team_id, published)
     VALUES ($1, $2, $3, $4, $5, FALSE)
     RETURNING id, group_id, stage, jornada, match_date, home_team_id, away_team_id,
               real_home_goals, real_away_goals, is_finished, published, created_at`,
    [stage, jornada, match_date, home_team_id, away_team_id]
  );
  logger.info('Partido eliminatorio creado', { matchId: result.rows[0].id, stage });
  return result.rows[0];
};

/** Publicar todos los partidos de una fase */
const publishStage = async (stage) => {
  const result = await query(
    `UPDATE matches SET published = TRUE WHERE stage = $1
     RETURNING id`,
    [stage]
  );
  logger.info('Fase publicada', { stage, count: result.rowCount });
  return result.rowCount;
};

const updateRealScore = async (id, homeGoals, awayGoals) => {
  const match = await findById(id);
  if (!match) throw new NotFoundError('Partido', id);

  const result = await query(
    `UPDATE matches
     SET real_home_goals = $1, real_away_goals = $2, is_finished = TRUE
     WHERE id = $3
     RETURNING id, group_id, stage, jornada, match_date, home_team_id, away_team_id,
               real_home_goals, real_away_goals, is_finished, created_at, updated_at`,
    [homeGoals, awayGoals, id]
  );
  logger.info('Marcador real actualizado', { matchId: id, homeGoals, awayGoals });
  return result.rows[0];
};

const findFinished = async () => {
  const result = await query(
    `${SELECT_MATCH} WHERE m.is_finished = TRUE ORDER BY m.match_date ASC`
  );
  return result.rows;
};

/** Obtener fases eliminatorias con su estado */
const getKnockoutPhases = async () => {
  const result = await query(
    `SELECT kp.id, kp.stage, kp.label, kp.match_count, kp.published,
            COUNT(m.id)                               AS created_count,
            COUNT(CASE WHEN m.is_finished THEN 1 END) AS finished_count
     FROM knockout_phases kp
     LEFT JOIN matches m ON m.stage = kp.stage
     GROUP BY kp.id, kp.stage, kp.label, kp.match_count, kp.published
     ORDER BY kp.id ASC`
  );
  return result.rows;
};

/** Publicar una fase en knockout_phases */
const publishKnockoutPhase = async (stage) => {
  await query(
    `UPDATE knockout_phases SET published = TRUE WHERE stage = $1`,
    [stage]
  );
  const count = await publishStage(stage);
  return count;
};

module.exports = {
  findById,
  findByGroup,
  findAll,
  findAllAdmin,
  findByJornada,
  findByStage,
  create,
  createKnockout,
  publishStage,
  publishKnockoutPhase,
  updateRealScore,
  findFinished,
  getKnockoutPhases,
};
