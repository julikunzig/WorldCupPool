/**
 * Script para limpiar la base de datos (eliminar todos los usuarios)
 */

require('../config/env');
const { query } = require('../config/database');
const logger = require('../config/logger');

const cleanDatabase = async () => {
  try {
    logger.info('Limpiando base de datos...');

    // Eliminar todas las predicciones
    await query('DELETE FROM predictions');
    logger.info('✅ Predicciones eliminadas');

    // Intentar eliminar logs de auditoría si existen
    try {
      await query('DELETE FROM audit_logs');
      logger.info('✅ Logs de auditoría eliminados');
    } catch (err) {
      logger.warn('Tabla audit_logs no existe, continuando...');
    }

    // Eliminar todos los usuarios excepto el admin
    await query('DELETE FROM users WHERE role != $1', ['admin']);
    logger.info('✅ Usuarios eliminados (excepto admin)');

    console.log('✅ Base de datos limpiada exitosamente');
    console.log('El usuario admin@polla2026.com sigue disponible');
    process.exit(0);
  } catch (err) {
    logger.error('Error al limpiar base de datos', { error: err.message });
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
};

cleanDatabase();
