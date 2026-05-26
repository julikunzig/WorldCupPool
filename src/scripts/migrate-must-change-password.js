/**
 * Migración: agrega columna must_change_password a la tabla users
 */
require('../config/env');
const { query } = require('../config/database');

const run = async () => {
  try {
    // Agregar columna si no existe
    await query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT TRUE
    `);
    console.log('✅ Columna must_change_password agregada');

    // El admin no necesita cambiar contraseña
    await query(`
      UPDATE users SET must_change_password = FALSE WHERE role = 'admin'
    `);
    console.log('✅ Admin marcado como no requiere cambio');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

run();
