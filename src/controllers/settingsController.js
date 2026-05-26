/**
 * @module controllers/settingsController
 * @description Controladores para configuración del sistema.
 */

const logger = require('../config/logger');
const settingsRepository = require('../repositories/settingsRepository');

/**
 * GET /api/settings  (público - solo lectura)
 * Devuelve la configuración pública (fecha límite de predicciones)
 */
const getPublicSettings = async (req, res, next) => {
  try {
    const deadline = await settingsRepository.get('prediction_deadline');
    res.status(200).json({
      success: true,
      data: {
        prediction_deadline: deadline ? deadline.value : '2026-06-10T23:59:00',
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/settings/all  (solo admin)
 * Devuelve toda la configuración
 */
const getAllSettings = async (req, res, next) => {
  try {
    logger.info('Endpoint: GET /settings/all', { adminId: req.user.id });
    const settings = await settingsRepository.getAll();
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/settings/:key  (solo admin)
 * Actualiza un valor de configuración
 */
const updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    logger.info('Endpoint: PUT /settings/:key', { adminId: req.user.id, key, value });

    if (!value) {
      return res.status(400).json({ success: false, error: { message: 'El valor es requerido' } });
    }

    // Validar formato de fecha si es prediction_deadline
    if (key === 'prediction_deadline') {
      const d = new Date(value);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ success: false, error: { message: 'Formato de fecha inválido' } });
      }
    }

    const setting = await settingsRepository.set(key, value);
    logger.info('Configuración actualizada', { adminId: req.user.id, key, value });

    res.status(200).json({
      success: true,
      message: 'Configuración actualizada',
      data: setting,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPublicSettings, getAllSettings, updateSetting };
