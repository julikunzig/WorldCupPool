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

    const predictions = await predictionService.getUserPredictions(req.user.id);
    const canEdit = await predictionService.canEditPredictions();
    const deadline = await predictionService.getDeadline();

    res.status(200).json({
      success: true,
      data: {
        predictions,
        canEdit,
        deadline,
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

/**
 * GET /predictions/report  (solo admin)
 * Obtiene todas las predicciones de todos los usuarios con sus marcadores
 */
const getFullReport = async (req, res, next) => {
  try {
    logger.info('Endpoint: GET /predictions/report', { adminId: req.user.id });

    const { query } = require('../config/database');
    const result = await query(`
      SELECT
        u.nombre        AS usuario,
        u.email         AS email,
        g.name          AS grupo,
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
      JOIN groups   g  ON m.group_id     = g.id
      WHERE u.role != 'admin'
      ORDER BY u.nombre ASC, m.match_date ASC
    `);

    res.status(200).json({
      success: true,
      data: result.rows,
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
};
