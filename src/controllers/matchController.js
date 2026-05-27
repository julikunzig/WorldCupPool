/**
 * @module controllers/matchController
 * @description Controladores para endpoints de partidos.
 */

const logger = require('../config/logger');
const matchRepository = require('../repositories/matchRepository');
const predictionService = require('../services/predictionService');
const { logAudit } = require('../middleware/audit');
const { NotFoundError } = require('../utils/errors');

/**
 * GET /matches/groups
 * Obtiene todos los grupos con sus equipos
 */
const getGroupsWithTeams = async (req, res, next) => {
  try {
    logger.info('Endpoint: GET /matches/groups');
    const { query } = require('../config/database');
    const result = await query(`
      SELECT g.id as group_id, g.name as group_name,
             t.id as team_id, t.name as team_name, t.flag as team_flag
      FROM groups g
      JOIN teams t ON t.group_id = g.id
      ORDER BY g.name ASC, t.name ASC
    `);

    // Agrupar por grupo
    const groups = {};
    result.rows.forEach(row => {
      if (!groups[row.group_id]) {
        groups[row.group_id] = { id: row.group_id, name: row.group_name, teams: [] };
      }
      groups[row.group_id].teams.push({ id: row.team_id, name: row.team_name, flag: row.team_flag });
    });

    res.status(200).json({ success: true, data: Object.values(groups) });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /matches
 * Obtiene todos los partidos publicados
 */
const getAllMatches = async (req, res, next) => {
  try {
    logger.info('Endpoint: GET /matches', { userId: req.user?.id });
    const matches = await matchRepository.findAll();
    res.status(200).json({ success: true, data: matches });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /matches/admin/all
 * Obtiene TODOS los partidos (admin, sin filtro de publicación)
 */
const getAllMatchesAdmin = async (req, res, next) => {
  try {
    logger.info('Endpoint: GET /matches/admin/all', { adminId: req.user?.id });
    const matches = await matchRepository.findAllAdmin();
    res.status(200).json({ success: true, data: matches });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /matches/knockout/published
 * Obtiene las fases eliminatorias publicadas (para usuarios)
 */
const getPublishedPhases = async (req, res, next) => {
  try {
    const { query } = require('../config/database');
    // Usar COALESCE para manejar que prediction_deadline puede no existir aún
    const result = await query(
      `SELECT stage, label,
              CASE WHEN column_name IS NOT NULL THEN prediction_deadline ELSE NULL END as prediction_deadline
       FROM knockout_phases
       LEFT JOIN (
         SELECT column_name FROM information_schema.columns
         WHERE table_name = 'knockout_phases' AND column_name = 'prediction_deadline'
       ) cols ON TRUE
       WHERE published = TRUE
       ORDER BY id ASC`
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    // Si falla, devolver array vacío para no romper el frontend
    res.status(200).json({ success: true, data: [] });
  }
};

/**
 * GET /matches/knockout/phases
 * Obtiene el estado de las fases eliminatorias
 */
const getKnockoutPhases = async (req, res, next) => {
  try {
    logger.info('Endpoint: GET /matches/knockout/phases', { adminId: req.user?.id });
    const phases = await matchRepository.getKnockoutPhases();
    res.status(200).json({ success: true, data: phases });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /matches/knockout/:stage
 * Obtiene partidos de una fase eliminatoria
 */
const getMatchesByStage = async (req, res, next) => {
  try {
    const { stage } = req.params;
    const matches = await matchRepository.findByStage(stage);
    res.status(200).json({ success: true, data: matches });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /matches/knockout
 * Crea un partido de fase eliminatoria (admin)
 */
const createKnockoutMatch = async (req, res, next) => {
  try {
    const { stage, match_date, home_team_id, away_team_id } = req.body;
    logger.info('Endpoint: POST /matches/knockout', { adminId: req.user.id, stage });

    if (!stage || !match_date || !home_team_id || !away_team_id) {
      return res.status(400).json({ success: false, error: { message: 'Faltan campos requeridos' } });
    }
    if (home_team_id === away_team_id) {
      return res.status(400).json({ success: false, error: { message: 'Los equipos deben ser diferentes' } });
    }

    const match = await matchRepository.createKnockout({ stage, match_date, home_team_id, away_team_id });
    res.status(201).json({ success: true, message: 'Partido creado', data: match });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /matches/knockout/:stage/publish
 * Publica todos los partidos de una fase (admin) con fecha límite opcional
 */
const publishKnockoutPhase = async (req, res, next) => {
  try {
    const { stage } = req.params;
    const { prediction_deadline } = req.body;
    logger.info('Endpoint: POST /matches/knockout/:stage/publish', { adminId: req.user.id, stage });

    const count = await matchRepository.publishKnockoutPhase(stage, prediction_deadline || null);
    res.status(200).json({
      success: true,
      message: `${count} partidos publicados para la fase ${stage}`,
      data: { stage, published: count },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /matches/:id
 * Obtiene un partido por ID
 */
const getMatchById = async (req, res, next) => {
  try {
    const { id } = req.params;
    logger.info('Endpoint: GET /matches/:id', { matchId: id });

    const match = await matchRepository.findById(parseInt(id));
    if (!match) throw new NotFoundError('Partido', id);

    res.status(200).json({ success: true, data: match });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /matches/group/:groupId
 * Obtiene partidos de un grupo
 */
const getMatchesByGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    logger.info('Endpoint: GET /matches/group/:groupId', { groupId });

    const matches = await matchRepository.findByGroup(parseInt(groupId));
    res.status(200).json({ success: true, data: matches });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /matches/:id/score  (solo admin)
 * Registra el marcador real de un partido
 */
const updateRealScore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { home_goals, away_goals } = req.body;

    logger.info('Endpoint: PUT /matches/:id/score', {
      matchId: id,
      adminId: req.user.id,
      home_goals,
      away_goals,
    });

    const result = await predictionService.registerRealScore(
      parseInt(id),
      parseInt(home_goals),
      parseInt(away_goals),
      { userId: req.user.id, ...req.clientInfo }
    );

    res.status(200).json({
      success: true,
      message: `Marcador registrado. ${result.predictionsScored} predicciones puntuadas.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /matches/:id/predictions  (solo admin)
 * Obtiene todas las predicciones de un partido
 */
const getMatchPredictions = async (req, res, next) => {
  try {
    const { id } = req.params;
    logger.info('Endpoint: GET /matches/:id/predictions', { matchId: id, adminId: req.user.id });

    const predictionRepository = require('../repositories/predictionRepository');
    const predictions = await predictionRepository.findByMatch(parseInt(id));

    res.status(200).json({ success: true, data: predictions });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /matches/knockout/:stage/deadline  (admin)
 * Actualiza la fecha límite de predicciones de una fase
 */
const updatePhaseDeadline = async (req, res, next) => {
  try {
    const { stage } = req.params;
    const { prediction_deadline } = req.body;
    logger.info('Endpoint: PUT /matches/knockout/:stage/deadline', { adminId: req.user.id, stage });

    if (!prediction_deadline) {
      return res.status(400).json({ success: false, error: { message: 'prediction_deadline es requerido' } });
    }

    const result = await matchRepository.updatePhaseDeadline(stage, prediction_deadline);
    res.status(200).json({ success: true, message: 'Fecha límite actualizada', data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /matches/knockout/:matchId/edit  (admin)
 * Edita equipos y fecha de un partido eliminatorio
 */
const editKnockoutMatch = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { home_team_id, away_team_id, match_date } = req.body;
    logger.info('Endpoint: PUT /matches/knockout/:matchId/edit', { adminId: req.user.id, matchId });

    if (home_team_id === away_team_id) {
      return res.status(400).json({ success: false, error: { message: 'Los equipos deben ser diferentes' } });
    }

    const { query } = require('../config/database');
    const result = await query(
      `UPDATE matches
       SET home_team_id = $1, away_team_id = $2, match_date = $3
       WHERE id = $4
       RETURNING id`,
      [home_team_id, away_team_id, match_date, parseInt(matchId)]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: { message: 'Partido no encontrado' } });
    }

    res.status(200).json({ success: true, message: 'Partido actualizado' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllMatches,
  getAllMatchesAdmin,
  getMatchById,
  getMatchesByGroup,
  getMatchesByStage,
  getGroupsWithTeams,
  getKnockoutPhases,
  getPublishedPhases,
  createKnockoutMatch,
  publishKnockoutPhase,
  updatePhaseDeadline,
  editKnockoutMatch,
  updateRealScore,
  getMatchPredictions,
};
