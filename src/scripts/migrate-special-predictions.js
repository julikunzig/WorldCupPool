/**
 * Migración: crea tabla para pronósticos especiales (goleador, campeón, subcampeón, tercer lugar)
 */
require('../config/env');
const { pool } = require('../config/database');

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Tabla de pronósticos especiales por usuario
    await client.query(`
      CREATE TABLE IF NOT EXISTS special_predictions (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        goleador    VARCHAR(100),
        champion    INTEGER REFERENCES teams(id),
        runner_up   INTEGER REFERENCES teams(id),
        third_place INTEGER REFERENCES teams(id),
        points_champion   SMALLINT NOT NULL DEFAULT 0,
        points_runner_up  SMALLINT NOT NULL DEFAULT 0,
        points_third      SMALLINT NOT NULL DEFAULT 0,
        total_bonus       SMALLINT NOT NULL DEFAULT 0,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id)
      )
    `);
    console.log('✅ Tabla special_predictions creada');

    // Tabla de resultados reales del torneo (registrada por admin)
    await client.query(`
      CREATE TABLE IF NOT EXISTS tournament_results (
        id          SERIAL PRIMARY KEY,
        goleador    VARCHAR(100),
        champion    INTEGER REFERENCES teams(id),
        runner_up   INTEGER REFERENCES teams(id),
        third_place INTEGER REFERENCES teams(id),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla tournament_results creada');

    // Insertar fila vacía de resultados si no existe
    await client.query(`
      INSERT INTO tournament_results (id) VALUES (1)
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('✅ Fila de resultados inicializada');

    // Trigger para updated_at
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_special_predictions_updated_at') THEN
          CREATE TRIGGER trg_special_predictions_updated_at
            BEFORE UPDATE ON special_predictions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$
    `);
    console.log('✅ Trigger creado');

    await client.query('COMMIT');
    console.log('\n✅ Migración completada');
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
