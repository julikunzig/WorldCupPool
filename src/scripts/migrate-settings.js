/**
 * Migración: crea tabla settings con la fecha límite de predicciones
 */
require('../config/env');
const { query } = require('../config/database');

const run = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS settings (
        key         VARCHAR(100) PRIMARY KEY,
        value       TEXT         NOT NULL,
        description TEXT,
        updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla settings creada');

    // Insertar valor por defecto (fecha límite de predicciones)
    await query(`
      INSERT INTO settings (key, value, description)
      VALUES ('prediction_deadline', '2026-06-10T23:59:00', 'Fecha y hora límite para editar predicciones')
      ON CONFLICT (key) DO NOTHING
    `);
    console.log('✅ Valor por defecto insertado');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

run();
