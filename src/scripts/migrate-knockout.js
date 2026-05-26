/**
 * Migración: agrega soporte para fases eliminatorias
 * - Agrega columna 'stage' a matches
 * - Hace group_id nullable
 * - Amplía el CHECK de jornada
 * - Crea tabla knockout_phases para controlar publicación
 */
require('../config/env');
const { query, pool } = require('../config/database');
const logger = require('../config/logger');

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Agregar columna stage si no existe
    await client.query(`
      ALTER TABLE matches
      ADD COLUMN IF NOT EXISTS stage VARCHAR(30) NOT NULL DEFAULT 'group'
    `);
    logger.info('✅ Columna stage agregada');

    // 2. Agregar columna published para controlar visibilidad
    await client.query(`
      ALTER TABLE matches
      ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT TRUE
    `);
    logger.info('✅ Columna published agregada');

    // 3. Hacer group_id nullable (para eliminatorias no hay grupo)
    await client.query(`
      ALTER TABLE matches
      ALTER COLUMN group_id DROP NOT NULL
    `);
    logger.info('✅ group_id ahora es nullable');

    // 4. Eliminar el CHECK de jornada y agregar uno más amplio
    await client.query(`
      ALTER TABLE matches
      DROP CONSTRAINT IF EXISTS matches_jornada_check
    `);
    await client.query(`
      ALTER TABLE matches
      ADD CONSTRAINT matches_jornada_check CHECK (jornada BETWEEN 1 AND 20)
    `);
    logger.info('✅ CHECK de jornada ampliado');

    // 5. Crear tabla knockout_phases para controlar las fases
    await client.query(`
      CREATE TABLE IF NOT EXISTS knockout_phases (
        id          SERIAL PRIMARY KEY,
        stage       VARCHAR(30) NOT NULL UNIQUE,
        label       VARCHAR(50) NOT NULL,
        match_count SMALLINT    NOT NULL,
        published   BOOLEAN     NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Insertar las fases eliminatorias
    await client.query(`
      INSERT INTO knockout_phases (stage, label, match_count) VALUES
        ('round_of_16',  'Dieciseisavos de Final', 16),
        ('quarterfinal', 'Cuartos de Final',        8),
        ('semifinal',    'Semifinal',                2),
        ('third_place',  'Tercer y Cuarto Puesto',   1),
        ('final',        'Final',                    1)
      ON CONFLICT (stage) DO NOTHING
    `);
    logger.info('✅ Tabla knockout_phases creada con fases');

    await client.query('COMMIT');
    console.log('✅ Migración de eliminatorias completada');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Error en migración', { error: err.message });
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

run();
