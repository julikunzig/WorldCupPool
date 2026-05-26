/**
 * Migración fix 2: corrige datos existentes y recrea constraints
 */
require('../config/env');
const { pool } = require('../config/database');

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Agregar stage como nullable primero
    await client.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS stage VARCHAR(30)`);
    console.log('✅ Columna stage agregada (nullable)');

    // 2. Actualizar registros existentes que no tienen stage
    const updated = await client.query(`UPDATE matches SET stage = 'group' WHERE stage IS NULL`);
    console.log(`✅ ${updated.rowCount} partidos actualizados con stage='group'`);

    // 3. Ahora hacer NOT NULL
    await client.query(`ALTER TABLE matches ALTER COLUMN stage SET NOT NULL`);
    await client.query(`ALTER TABLE matches ALTER COLUMN stage SET DEFAULT 'group'`);
    console.log('✅ stage ahora es NOT NULL DEFAULT group');

    // 4. Agregar published
    await client.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT TRUE`);
    console.log('✅ Columna published OK');

    // 5. Hacer group_id nullable
    await client.query(`ALTER TABLE matches ALTER COLUMN group_id DROP NOT NULL`);
    console.log('✅ group_id nullable OK');

    // 6. Fix constraint jornada
    await client.query(`ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_jornada_check`);
    await client.query(`ALTER TABLE matches ADD CONSTRAINT matches_jornada_check CHECK (jornada BETWEEN 1 AND 20)`);
    console.log('✅ CHECK jornada OK');

    // 7. Crear tabla knockout_phases
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

    // 8. Insertar fases
    await client.query(`
      INSERT INTO knockout_phases (stage, label, match_count) VALUES
        ('round_of_16',  'Dieciseisavos de Final', 16),
        ('quarterfinal', 'Cuartos de Final',         8),
        ('semifinal',    'Semifinal',                 2),
        ('third_place',  'Tercer y Cuarto Puesto',    1),
        ('final',        'Final',                     1)
      ON CONFLICT (stage) DO NOTHING
    `);
    console.log('✅ Fases eliminatorias insertadas');

    // 9. Crear tabla settings si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key         VARCHAR(100) PRIMARY KEY,
        value       TEXT         NOT NULL,
        description TEXT,
        updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      INSERT INTO settings (key, value, description)
      VALUES ('prediction_deadline', '2026-06-10T23:59:00', 'Fecha y hora límite para editar predicciones')
      ON CONFLICT (key) DO NOTHING
    `);
    console.log('✅ Tabla settings OK');

    // 10. Agregar must_change_password a users
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT TRUE`);
    await client.query(`UPDATE users SET must_change_password = FALSE WHERE role = 'admin'`);
    console.log('✅ Columna must_change_password OK');

    await client.query('COMMIT');
    console.log('\n✅ Todas las migraciones completadas exitosamente');
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
