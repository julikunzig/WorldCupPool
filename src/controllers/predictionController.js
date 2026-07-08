/**
 * @module controllers/predictionController
 * @description Controladores para endpoints de predicciones.
 */

const logger = require('../config/logger');
const predictionService = require('../services/predictionService');
const predictionRepository = require('../repositories/predictionRepository');

/**
 * GET /predictions/my
 * Obtiene todas las predicciones del usuario autenticado
 */
const getMyPredictions = async (req, res, next) => {
  try {
    logger.info('Endpoint: GET /predictions/my', { userId: req.user.id });

    const { query } = require('../config/database');

    const predictions = await predictionService.getUserPredictions(req.user.id);
    const globalDeadline = await predictionService.getGlobalDeadline();
    const canEditGlobal = new Date() < new Date(globalDeadline);

    // Intentar obtener deadlines por fase (puede fallar si la columna no existe)
    let phaseDeadlines = {};
    try {
      const phasesResult = await query(
        `SELECT stage, prediction_deadline FROM knockout_phases WHERE published = TRUE`
      );
      phasesResult.rows.forEach(r => {
        if (r.prediction_deadline) phaseDeadlines[r.stage] = r.prediction_deadline;
      });
    } catch {
      // Si falla, usar solo el deadline global
    }

    res.status(200).json({
      success: true,
      data: {
        predictions,
        canEdit: canEditGlobal,
        deadline: globalDeadline,
        phaseDeadlines,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /predictions
 * Crea una nueva predicción
 */
const createPrediction = async (req, res, next) => {
  try {
    const { match_id, home_goals, away_goals } = req.body;

    logger.info('Endpoint: POST /predictions', {
      userId: req.user.id,
      matchId: match_id,
    });

    const prediction = await predictionService.createPrediction(
      req.user.id,
      parseInt(match_id),
      parseInt(home_goals),
      parseInt(away_goals),
      req.clientInfo
    );

    res.status(201).json({
      success: true,
      message: 'Predicción guardada',
      data: prediction,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /predictions/:id
 * Actualiza una predicción existente
 */
const updatePrediction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { home_goals, away_goals } = req.body;

    logger.info('Endpoint: PUT /predictions/:id', {
      userId: req.user.id,
      predictionId: id,
    });

    const prediction = await predictionService.updatePrediction(
      req.user.id,
      parseInt(id),
      parseInt(home_goals),
      parseInt(away_goals),
      req.clientInfo
    );

    res.status(200).json({
      success: true,
      message: 'Predicción actualizada',
      data: prediction,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /predictions/leaderboard
 * Obtiene la tabla de posiciones
 */
const getLeaderboard = async (req, res, next) => {
  try {
    logger.info('Endpoint: GET /predictions/leaderboard', { userId: req.user?.id });

    const leaderboard = await predictionService.getLeaderboard();

    res.status(200).json({
      success: true,
      data: leaderboard,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /predictions/leaderboard/me
 * Obtiene la posición del usuario autenticado en la tabla
 */
const getMyPosition = async (req, res, next) => {
  try {
    logger.info('Endpoint: GET /predictions/leaderboard/me', { userId: req.user.id });

    const position = await predictionService.getUserPosition(req.user.id);

    res.status(200).json({
      success: true,
      data: position,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /predictions/user/:userId  (solo admin)
 * Obtiene predicciones de un usuario específico
 */
const getUserPredictions = async (req, res, next) => {
  try {
    const { userId } = req.params;
    logger.info('Endpoint: GET /predictions/user/:userId', {
      adminId: req.user.id,
      targetUserId: userId,
    });

    const predictions = await predictionService.getUserPredictions(parseInt(userId));

    res.status(200).json({
      success: true,
      data: predictions,
    });
  } catch (err) {
    next(err);
  }
};

// Etiquetas legibles de cada fase (usadas en reportes)
const STAGE_LABELS = {
  group:        'Fase de Grupos',
  round_of_16:  'Dieciseisavos de Final',
  round_of_8:   'Octavos de Final',
  quarterfinal: 'Cuartos de Final',
  semifinal:    'Semifinal',
  third_place:  'Tercer y Cuarto Puesto',
  final:        'Final',
};

// Orden lógico de las fases para reportes
const STAGE_ORDER = [
  'group', 'round_of_16', 'round_of_8', 'quarterfinal',
  'semifinal', 'third_place', 'final',
];

/**
 * GET /predictions/report  (solo admin)
 * Query params opcionales:
 *   - stage: filtrar por fase específica (group, round_of_16, ..., final)
 *
 * Devuelve todas las predicciones (incluye eliminatorias) con detalles del partido,
 * la fase y los puntos obtenidos.
 */
const getFullReport = async (req, res, next) => {
  try {
    const { stage } = req.query;
    logger.info('Endpoint: GET /predictions/report', { adminId: req.user.id, stage });

    const { query } = require('../config/database');

    const params = [];
    let stageFilter = '';
    if (stage && STAGE_ORDER.includes(stage)) {
      params.push(stage);
      stageFilter = `AND m.stage = $${params.length}`;
    }

    const result = await query(`
      SELECT
        u.id            AS user_id,
        u.nombre        AS usuario,
        u.email         AS email,
        m.stage         AS stage,
        COALESCE(g.name, kp.label) AS grupo,
        m.jornada,
        ht.flag || ' ' || ht.name  AS local,
        at.flag || ' ' || at.name  AS visitante,
        p.home_goals    AS pred_local,
        p.away_goals    AS pred_visitante,
        m.real_home_goals,
        m.real_away_goals,
        m.is_finished,
        p.points_winner,
        p.points_score,
        p.total_points,
        m.match_date
      FROM predictions p
      JOIN users    u  ON p.user_id      = u.id
      JOIN matches  m  ON p.match_id     = m.id
      JOIN teams    ht ON m.home_team_id = ht.id
      JOIN teams    at ON m.away_team_id = at.id
      LEFT JOIN groups          g  ON m.group_id = g.id
      LEFT JOIN knockout_phases kp ON kp.stage   = m.stage
      WHERE u.role != 'admin' ${stageFilter}
      ORDER BY u.nombre ASC, m.match_date ASC
    `, params);

    // Enriquecer cada fila con la etiqueta legible de la fase
    const rows = result.rows.map(r => ({
      ...r,
      stage_label: STAGE_LABELS[r.stage] || r.stage,
    }));

    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /predictions/report/summary  (solo admin)
 * Devuelve el consolidado de puntos por usuario y por fase.
 *
 * Estructura:
 * {
 *   stages: [{ stage, label }, ...],
 *   users:  [{
 *     user_id, nombre, email,
 *     by_stage: { group: {points, correct_scores, correct_winners, predictions}, ... },
 *     match_points, bonus_points, total_points
 *   }, ...]
 * }
 */
const getReportSummary = async (req, res, next) => {
  try {
    logger.info('Endpoint: GET /predictions/report/summary', { adminId: req.user.id });
    const { query } = require('../config/database');

    // Puntos y estadísticas por usuario y fase
    const perStage = await query(`
      SELECT
        u.id           AS user_id,
        u.nombre,
        u.email,
        m.stage        AS stage,
        COUNT(p.id)::int                                       AS predictions,
        COALESCE(SUM(p.total_points), 0)::int                  AS points,
        SUM(CASE WHEN p.points_winner = 2 THEN 1 ELSE 0 END)::int AS correct_winners,
        SUM(CASE WHEN p.points_score  = 1 THEN 1 ELSE 0 END)::int AS correct_scores
      FROM users u
      LEFT JOIN predictions p ON p.user_id = u.id
      LEFT JOIN matches     m ON p.match_id = m.id
      WHERE u.is_active = TRUE AND u.role != 'admin'
      GROUP BY u.id, u.nombre, u.email, m.stage
      ORDER BY u.nombre ASC
    `);

    // Puntos de predicciones especiales (bonus) por usuario
    const bonusRes = await query(`
      SELECT user_id, COALESCE(total_bonus, 0)::int AS bonus_points
      FROM special_predictions
    `).catch(() => ({ rows: [] }));

    const bonusByUser = {};
    bonusRes.rows.forEach(r => { bonusByUser[r.user_id] = r.bonus_points; });

    // Agrupar por usuario
    const usersMap = {};
    perStage.rows.forEach(r => {
      if (!usersMap[r.user_id]) {
        usersMap[r.user_id] = {
          user_id: r.user_id,
          nombre:  r.nombre,
          email:   r.email,
          by_stage: {},
          match_points: 0,
        };
      }
      // Si el usuario no tiene predicciones, la fase viene como NULL
      if (r.stage) {
        usersMap[r.user_id].by_stage[r.stage] = {
          predictions:     r.predictions,
          points:          r.points,
          correct_winners: r.correct_winners,
          correct_scores:  r.correct_scores,
        };
        usersMap[r.user_id].match_points += r.points;
      }
    });

    // Añadir bonus y total, ordenar por total desc
    const users = Object.values(usersMap).map(u => {
      const bonus = bonusByUser[u.user_id] || 0;
      return {
        ...u,
        bonus_points: bonus,
        total_points: u.match_points + bonus,
      };
    }).sort((a, b) => b.total_points - a.total_points);

    const stages = STAGE_ORDER.map(s => ({ stage: s, label: STAGE_LABELS[s] }));

    res.status(200).json({
      success: true,
      data: { stages, users },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyPredictions,
  createPrediction,
  updatePrediction,
  getLeaderboard,
  getMyPosition,
  getUserPredictions,
  getFullReport,
  getReportSummary,
};
