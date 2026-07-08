/**
 * @module controllers/specialController
 * @description Controladores para pronósticos especiales (goleador, campeón, etc.)
 */

const logger = require('../config/logger');
const { query } = require('../config/database');

/**
 * GET /api/special/my - Obtiene los pronósticos especiales del usuario
 */
const getMySpecial = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT sp.*,
              ct.name AS champion_name, ct.flag AS champion_flag,
              rt.name AS runner_up_name, rt.flag AS runner_up_flag,
              tt.name AS third_place_name, tt.flag AS third_place_flag
       FROM special_predictions sp
       LEFT JOIN teams ct ON sp.champion = ct.id
       LEFT JOIN teams rt ON sp.runner_up = rt.id
       LEFT JOIN teams tt ON sp.third_place = tt.id
       WHERE sp.user_id = $1`,
      [req.user.id]
    );
    res.status(200).json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/special/my - Crea o actualiza los pronósticos especiales
 */
const saveMySpecial = async (req, res, next) => {
  try {
    const { goleador, champion, runner_up, third_place } = req.body;
    logger.info('Saving special predictions', { userId: req.user.id });

    // Verificar fecha límite de fase de grupos
    const settingsRepository = require('../repositories/settingsRepository');
    const setting = await settingsRepository.get('prediction_deadline');
    const deadline = new Date(setting ? setting.value : (process.env.PREDICTION_DEADLINE || '2026-06-10T23:59:00'));
    if (new Date() > deadline) {
      return res.status(409).json({ success: false, error: { message: 'La fecha límite para ingresar pronósticos especiales ha pasado' } });
    }

    const result = await query(
      `INSERT INTO special_predictions (user_id, goleador, champion, runner_up, third_place)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         goleador = EXCLUDED.goleador,
         champion = EXCLUDED.champion,
         runner_up = EXCLUDED.runner_up,
         third_place = EXCLUDED.third_place,
         updated_at = NOW()
       RETURNING *`,
      [req.user.id, goleador || null, champion || null, runner_up || null, third_place || null]
    );

    res.status(200).json({ success: true, message: 'Pronósticos guardados', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/special/results - Obtiene los resultados reales del torneo
 */
const getResults = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT tr.*,
              ct.name AS champion_name, ct.flag AS champion_flag,
              rt.name AS runner_up_name, rt.flag AS runner_up_flag,
              tt.name AS third_place_name, tt.flag AS third_place_flag
       FROM tournament_results tr
       LEFT JOIN teams ct ON tr.champion = ct.id
       LEFT JOIN teams rt ON tr.runner_up = rt.id
       LEFT JOIN teams tt ON tr.third_place = tt.id
       WHERE tr.id = 1`
    );
    res.status(200).json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/special/results - Admin registra los resultados reales del torneo
 */
const saveResults = async (req, res, next) => {
  try {
    const { goleador, champion, runner_up, third_place } = req.body;
    logger.info('Admin saving tournament results', { adminId: req.user.id });

    // Actualizar resultados
    await query(
      `UPDATE tournament_results
       SET goleador = $1, champion = $2, runner_up = $3, third_place = $4, updated_at = NOW()
       WHERE id = 1`,
      [goleador || null, champion || null, runner_up || null, third_place || null]
    );

    // Calcular puntos para todos los usuarios
    // Campeón = 5 pts, Subcampeón = 3 pts, Tercer lugar = 3 pts
    const POINTS_CHAMPION   = 5;
    const POINTS_RUNNER_UP  = 3;
    const POINTS_THIRD_PLACE = 3;

    const allPredictions = await query(`SELECT * FROM special_predictions`);

    for (const pred of allPredictions.rows) {
      let pChamp = 0, pRunner = 0, pThird = 0;

      if (champion    && pred.champion    === champion)    pChamp  = POINTS_CHAMPION;
      if (runner_up   && pred.runner_up   === runner_up)   pRunner = POINTS_RUNNER_UP;
      if (third_place && pred.third_place === third_place) pThird  = POINTS_THIRD_PLACE;

      const totalBonus = pChamp + pRunner + pThird;

      await query(
        `UPDATE special_predictions
         SET points_champion = $1, points_runner_up = $2, points_third = $3, total_bonus = $4
         WHERE id = $5`,
        [pChamp, pRunner, pThird, totalBonus, pred.id]
      );
    }

    logger.info('Tournament results saved and points calculated');
    res.status(200).json({
      success: true,
      message: `Resultados guardados. ${allPredictions.rowCount} usuarios puntuados.`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/special/all - Admin ve todos los pronósticos especiales
 */
const getAllSpecial = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT sp.*, u.nombre, u.email,
              ct.name AS champion_name, ct.flag AS champion_flag,
              rt.name AS runner_up_name, rt.flag AS runner_up_flag,
              tt.name AS third_place_name, tt.flag AS third_place_flag
       FROM special_predictions sp
       JOIN users u ON sp.user_id = u.id
       LEFT JOIN teams ct ON sp.champion = ct.id
       LEFT JOIN teams rt ON sp.runner_up = rt.id
       LEFT JOIN teams tt ON sp.third_place = tt.id
       WHERE u.role != 'admin'
       ORDER BY u.nombre ASC`
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMySpecial, saveMySpecial, getResults, saveResults, getAllSpecial };
