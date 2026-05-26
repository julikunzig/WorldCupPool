/**
 * Migración corregida para fases eliminatorias
 */
require('../config/env');
const { query, pool } = require('../config/database');

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Agregar columna stage si no existe
    await client.query(`
      ALTER TABLE matches ADD COLUMN IF NOT EXISTS stage VARCHAR(30) NOT NULL DEFAULT 'group'
    `);
    console.log('✅ Columna stage OK');

    // 2. Agregar columna published si no existe
    await client.query(`
      ALTER TABLE matches ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT TRUE
    `);
    console.log('✅ Columna published OK');

    // 3. Hacer group_id nullable
    await client.query(`
      ALTER TABLE matches ALTER COLUMN group_id DROP NOT NULL
    `);
    console.log('✅ group_id nullable OK');

    // 4. Eliminar constraint de jornada y crear uno nuevo
    await client.query(`ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_jornada_check`);
    await client.query(`
      ALTER TABLE matches ADD CONSTRAINT matches_jornada_check CHECK (jornada BETWEEN 1 AND 20)
    `);
    console.log('✅ CHECK jornada OK');

    // 5. Crear tabla knockout_phases
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
    console.log('✅ Tabla knockout_phases OK');

    // 6. Insertar fases
    await client.query(`
      INSERT INTO knockout_phases (stage, label, match_count) VALUES
        ('round_of_16',  'Dieciseisavos de Final', 16),
        ('quarterfinal', 'Cuartos de Final',         8),
        ('semifinal',    'Semifinal',                 2),
        ('third_place',  'Tercer y Cuarto Puesto',    1),
        ('final',        'Final',                     1)
      ON CONFLICT (stage) DO NOTHING
    `);
    console.log('✅ Fases insertadas OK');

    await client.query('COMMIT');
    console.log('\n✅ Migración completada exitosamente');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

run();
