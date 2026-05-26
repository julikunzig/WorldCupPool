/**
 * Corrige las fases eliminatorias con los conteos correctos
 */
require('../config/env');
const { pool } = require('../config/database');

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Eliminar fases existentes y recrear con los valores correctos
    await client.query(`DELETE FROM knockout_phases`);
    console.log('✅ Fases anteriores eliminadas');

    await client.query(`
      INSERT INTO knockout_phases (stage, label, match_count) VALUES
        ('round_of_16',  'Dieciseisavos de Final',  16),
        ('round_of_8',   'Octavos de Final',          8),
        ('quarterfinal', 'Cuartos de Final',           4),
        ('semifinal',    'Semifinal',                  2),
        ('third_place',  'Tercer y Cuarto Puesto',     1),
        ('final',        'Final',                      1)
    `);
    console.log('✅ Fases recreadas correctamente');

    await client.query('COMMIT');
    console.log('\n✅ Listo');
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
