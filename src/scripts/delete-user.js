/**
 * Script para eliminar un usuario por email
 * Uso: node src/scripts/delete-user.js <email>
 */

require('../config/env');
const { query } = require('../config/database');
const logger = require('../config/logger');

const deleteUserByEmail = async (email) => {
  try {
    logger.info('Eliminando usuario...', { email });

    // Buscar el usuario
    const findResult = await query(
      'SELECT id, nombre, email FROM users WHERE email = $1',
      [email]
    );

    if (findResult.rows.length === 0) {
      logger.warn('Usuario no encontrado', { email });
      console.log(`❌ Usuario con email ${email} no encontrado`);
      process.exit(0);
    }

    const user = findResult.rows[0];

    // Eliminar predicciones del usuario
    await query('DELETE FROM predictions WHERE user_id = $1', [user.id]);
    logger.info('Predicciones eliminadas', { userId: user.id });

    // Eliminar logs de auditoría del usuario
    await query('DELETE FROM audit_logs WHERE user_id = $1', [user.id]);
    logger.info('Logs de auditoría eliminados', { userId: user.id });

    // Eliminar el usuario
    await query('DELETE FROM users WHERE id = $1', [user.id]);
    logger.info('Usuario eliminado', { userId: user.id, email });

    console.log(`✅ Usuario ${user.nombre} (${email}) eliminado exitosamente`);
    process.exit(0);
  } catch (err) {
    logger.error('Error al eliminar usuario', { error: err.message });
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
};

const email = process.argv[2];
if (!email) {
  console.error('❌ Debes proporcionar un email');
  console.error('Uso: node src/scripts/delete-user.js <email>');
  process.exit(1);
}

deleteUserByEmail(email);
