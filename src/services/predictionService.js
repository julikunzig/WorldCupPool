/**
 * @module services/predictionService
 * @description Lógica de negocio para predicciones y cálculo de puntos.
 */

const logger = require('../config/logger');
const predictionRepository = require('../repositories/predictionRepository');
const matchRepository = require('../repositories/matchRepository');
const userRepository = require('../repositories/userRepository');
const settingsRepository = require('../repositories/settingsRepository');
const { query, withTransaction } = require('../config/database');
const { validatePrediction } = require('../utils/validators');
const { NotFoundError, ConflictError } = require('../utils/errors');
const { logAudit } = require('../middleware/audit');

/**
 * Verifica si el usuario puede editar predicciones (lee de DB)
 */
const canEditPredictions = async () => {
  try {
    const setting = await settingsRepository.get('prediction_deadline');
    const deadline = new Date(setting ? setting.value : (process.env.PREDICTION_DEADLINE || '2026-06-10T23:59:00'));
    return new Date() < deadline;
  } catch {
    // Fallback al .env si falla la DB
    const deadline = new Date(process.env.PREDICTION_DEADLINE || '2026-06-10T23:59:00');
    return new Date() < deadline;
  }
};

/**
 * Obtiene la fecha límite actual
 */
const getDeadline = async () => {
  try {
    const setting = await settingsRepository.get('prediction_deadline');
    return setting ? setting.value : (process.env.PREDICTION_DEADLINE || '2026-06-10T23:59:00');
  } catch {
    return process.env.PREDICTION_DEADLINE || '2026-06-10T23:59:00';
  }
};

/**
 * Crea una nueva predicción
 */
const createPrediction = async (userId, matchId, homeGoals, awayGoals, clientInfo) => {
  logger.info('Creando predicción', { userId, matchId });

  // Verificar deadline
  if (!await canEditPredictions()) {
    throw new ConflictError('La fecha límite para hacer predicciones ha pasado');
  }

  // Validar datos
  validatePrediction({ home_goals: homeGoals, away_goals: awayGoals });

  // Verificar que el partido existe
  const match = await matchRepository.findById(matchId);
  if (!match) {
    throw new NotFoundError('Partido', matchId);
  }

  // Verificar que el partido no ha comenzado
  if (new Date() > new Date(match.match_date)) {
    throw new ConflictError('No puedes hacer predicciones para un partido que ya comenzó');
  }

  // Crear predicción
  const prediction = await predictionRepository.create({
    user_id: userId,
    match_id: matchId,
    home_goals: homeGoals,
    away_goals: awayGoals,
  });

  // Auditoría
  await logAudit({
    userId,
    action: 'CREATE_PREDICTION',
    entity: 'predictions',
    entityId: prediction.id,
    newData: { matchId, homeGoals, awayGoals },
    ...clientInfo,
  });

  return prediction;
};

/**
 * Actualiza una predicción existente
 */
const updatePrediction = async (userId, predictionId, homeGoals, awayGoals, clientInfo) => {
  logger.info('Actualizando predicción', { userId, predictionId });

  // Verificar deadline
  if (!await canEditPredictions()) {
    throw new ConflictError('La fecha límite para editar predicciones ha pasado');
  }

  // Validar datos
  validatePrediction({ home_goals: homeGoals, away_goals: awayGoals });

  // Obtener predicción
  const prediction = await predictionRepository.findById(predictionId);
  if (!prediction) {
    throw new NotFoundError('Predicción', predictionId);
  }

  // Verificar que pertenece al usuario
  if (prediction.user_id !== userId) {
    throw new ConflictError('No puedes editar predicciones de otro usuario');
  }

  // Verificar que el partido no ha comenzado
  const match = await matchRepository.findById(prediction.match_id);
  if (new Date() > new Date(match.match_date)) {
    throw new ConflictError('No puedes editar predicciones para un partido que ya comenzó');
  }

  // Actualizar
  const oldData = {
    homeGoals: prediction.home_goals,
    awayGoals: prediction.away_goals,
  };

  const updated = await predictionRepository.update(predictionId, {
    home_goals: homeGoals,
    away_goals: awayGoals,
  });

  // Auditoría
  await logAudit({
    userId,
    action: 'UPDATE_PREDICTION',
    entity: 'predictions',
    entityId: predictionId,
    oldData,
    newData: { homeGoals, awayGoals },
    ...clientInfo,
  });

  return updated;
};

/**
 * Obtiene todas las predicciones de un usuario
 */
const getUserPredictions = async (userId) => {
  const predictions = await predictionRepository.findByUser(userId);
  return predictions;
};

/**
 * Calcula los puntos para una predicción basado en el marcador real
 * Reglas:
 * - 2 puntos por acertar ganador o empate
 * - 1 punto adicional por acertar el marcador exacto
 */
const calculatePoints = (predictedHome, predictedAway, realHome, realAway) => {
  let pointsWinner = 0;
  let pointsScore = 0;

  // Determinar resultado predicho
  const predictedResult =
    predictedHome > predictedAway ? 'home' : predictedHome < predictedAway ? 'away' : 'draw';

  // Determinar resultado real
  const realResult = realHome > realAway ? 'home' : realHome < realAway ? 'away' : 'draw';

  // 2 puntos por acertar ganador/empate
  if (predictedResult === realResult) {
    pointsWinner = 2;
  }

  // 1 punto adicional por marcador exacto
  if (predictedHome === realHome && predictedAway === realAway) {
    pointsScore = 1;
  }

  return { pointsWinner, pointsScore };
};

/**
 * Registra el marcador real de un partido y calcula puntos para todas las predicciones
 * Solo admin puede hacer esto
 */
const registerRealScore = async (matchId, homeGoals, awayGoals, clientInfo) => {
  logger.info('Registrando marcador real', { matchId, homeGoals, awayGoals });

  // Validar datos
  validatePrediction({ home_goals: homeGoals, away_goals: awayGoals });

  // Usar transacción para garantizar consistencia
  return await withTransaction(async (client) => {
    // Actualizar partido
    const match = await matchRepository.updateRealScore(matchId, homeGoals, awayGoals);

    // Obtener todas las predicciones para este partido
    const predictions = await predictionRepository.findByMatchForScoring(matchId);

    // Calcular y actualizar puntos para cada predicción
    for (const prediction of predictions) {
      const { pointsWinner, pointsScore } = calculatePoints(
        prediction.home_goals,
        prediction.away_goals,
        homeGoals,
        awayGoals
      );

      await predictionRepository.updatePoints(prediction.id, pointsWinner, pointsScore);
    }

    // Auditoría
    await logAudit({
      userId: clientInfo.userId,
      action: 'REGISTER_REAL_SCORE',
      entity: 'matches',
      entityId: matchId,
      newData: { homeGoals, awayGoals, predictionsScored: predictions.length },
      ...clientInfo,
    });

    logger.info('Marcador real registrado y puntos calculados', {
      matchId,
      predictionsScored: predictions.length,
    });

    return {
      match,
      predictionsScored: predictions.length,
    };
  });
};

/**
 * Obtiene la tabla de posiciones
 */
const getLeaderboard = async () => {
  const result = await query(
    `SELECT 
       u.id, u.nombre, u.username, u.email,
       COUNT(DISTINCT p.match_id) as matches_predicted,
       SUM(p.total_points) as total_points,
       SUM(CASE WHEN p.points_winner = 2 THEN 1 ELSE 0 END) as correct_winners,
       SUM(CASE WHEN p.points_score = 1 THEN 1 ELSE 0 END) as correct_scores
     FROM users u
     LEFT JOIN predictions p ON u.id = p.user_id
     WHERE u.is_active = TRUE AND u.role != 'admin'
     GROUP BY u.id, u.nombre, u.username, u.email
     ORDER BY total_points DESC NULLS LAST, u.nombre ASC`
  );

  return result.rows.map((row, index) => ({
    position: index + 1,
    ...row,
    total_points: row.total_points || 0,
    matches_predicted: row.matches_predicted || 0,
    correct_winners: row.correct_winners || 0,
    correct_scores: row.correct_scores || 0,
  }));
};

/**
 * Obtiene la posición de un usuario específico en la tabla
 */
const getUserPosition = async (userId) => {
  const leaderboard = await getLeaderboard();
  const position = leaderboard.find((row) => row.id === userId);
  return position || null;
};

module.exports = {
  createPrediction,
  updatePrediction,
  getUserPredictions,
  registerRealScore,
  getLeaderboard,
  getUserPosition,
  canEditPredictions,
  getDeadline,
  calculatePoints,
};
