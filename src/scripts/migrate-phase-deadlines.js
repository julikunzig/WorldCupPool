require('../config/env');
const { pool } = require('../config/database');

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE knockout_phases
      ADD COLUMN IF NOT EXISTS prediction_deadline TIMESTAMPTZ
    `);
    console.log('✅ Columna prediction_deadline agregada');

    const defaults = [
      ['round_of_16',  '2026-06-27T23:59:00'],
      ['round_of_8',   '2026-07-03T23:59:00'],
      ['quarterfinal', '2026-07-08T23:59:00'],
      ['semifinal',    '2026-07-13T23:59:00'],
      ['third_place',  '2026-07-17T23:59:00'],
      ['final',        '2026-07-18T23:59:00'],
    ];

    for (const [stage, deadline] of defaults) {
      await client.query(
        `UPDATE knockout_phases SET prediction_deadline = $1 WHERE stage = $2`,
        [deadline, stage]
      );
    }
    console.log('✅ Fechas límite asignadas');

    await client.query('COMMIT');
    console.log('✅ Migración completada');
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
