/**
 * Script para eliminar duplicados de partidos
 */

require('../config/env');
const { query } = require('../config/database');
const logger = require('../config/logger');

const fixDuplicates = async () => {
  try {
    logger.info('Eliminando partidos duplicados...');

    // Obtener partidos duplicados
    const result = await query(`
      SELECT m.id, m.group_id, m.jornada, m.match_date, m.home_team_id, m.away_team_id,
             ROW_NUMBER() OVER (PARTITION BY group_id, jornada, home_team_id, away_team_id ORDER BY m.id) as rn
      FROM matches m
      ORDER BY m.id
    `);

    const duplicates = result.rows.filter(row => row.rn > 1);
    
    if (duplicates.length === 0) {
      console.log('✅ No hay duplicados');
      process.exit(0);
    }

    logger.info(`Encontrados ${duplicates.length} duplicados`);

    // Eliminar duplicados (mantener el primero)
    for (const dup of duplicates) {
      await query('DELETE FROM predictions WHERE match_id = $1', [dup.id]);
      await query('DELETE FROM matches WHERE id = $1', [dup.id]);
      logger.info(`Eliminado partido duplicado: ${dup.id}`);
    }

    console.log(`✅ ${duplicates.length} partidos duplicados eliminados`);
    process.exit(0);
  } catch (err) {
    logger.error('Error al eliminar duplicados', { error: err.message });
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
};

fixDuplicates();
