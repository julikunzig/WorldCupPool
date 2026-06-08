/**
 * Actualiza las fechas de los partidos de fase de grupos a hora Miami EDT (UTC-4)
 * No elimina datos, solo actualiza las fechas.
 */
require('../config/env');
const { pool } = require('../config/database');

// Fechas correctas en hora Miami EDT (UTC-4)
// Formato: [grupo, jornada, local_idx, away_idx, nueva_fecha]
const DATES = [
  // GRUPO A
  ['A', 1, 0, 1, '2026-06-11T18:00:00-04:00'],
  ['A', 1, 2, 3, '2026-06-11T10:00:00-04:00'],
  ['A', 2, 3, 1, '2026-06-18T12:00:00-04:00'],
  ['A', 2, 0, 2, '2026-06-18T21:00:00-04:00'],
  ['A', 3, 3, 0, '2026-06-24T21:00:00-04:00'],
  ['A', 3, 1, 2, '2026-06-24T21:00:00-04:00'],
  // GRUPO B
  ['B', 1, 0, 1, '2026-06-12T15:00:00-04:00'],
  ['B', 1, 2, 3, '2026-06-18T15:00:00-04:00'],
  ['B', 2, 3, 1, '2026-06-18T18:00:00-04:00'],
  ['B', 2, 0, 2, '2026-06-18T18:00:00-04:00'],
  ['B', 3, 3, 0, '2026-06-24T15:00:00-04:00'],
  ['B', 3, 1, 2, '2026-06-24T15:00:00-04:00'],
  // GRUPO C
  ['C', 1, 0, 1, '2026-06-13T18:00:00-04:00'],
  ['C', 1, 2, 3, '2026-06-13T15:00:00-04:00'],
  ['C', 2, 3, 1, '2026-06-19T18:00:00-04:00'],
  ['C', 2, 0, 2, '2026-06-19T21:00:00-04:00'],
  ['C', 3, 3, 0, '2026-06-24T18:00:00-04:00'],
  ['C', 3, 1, 2, '2026-06-24T18:00:00-04:00'],
  // GRUPO D
  ['D', 1, 0, 1, '2026-06-12T21:00:00-04:00'],
  ['D', 1, 2, 3, '2026-06-13T15:00:00-04:00'],
  ['D', 2, 0, 2, '2026-06-19T15:00:00-04:00'],
  ['D', 2, 3, 1, '2026-06-19T18:00:00-04:00'],
  ['D', 3, 3, 0, '2026-06-25T22:00:00-04:00'],
  ['D', 3, 1, 2, '2026-06-25T22:00:00-04:00'],
  // GRUPO E
  ['E', 1, 0, 1, '2026-06-14T15:00:00-04:00'],
  ['E', 1, 2, 3, '2026-06-14T19:00:00-04:00'],
  ['E', 2, 0, 2, '2026-06-20T16:00:00-04:00'],
  ['E', 2, 3, 1, '2026-06-20T22:00:00-04:00'],
  ['E', 3, 3, 0, '2026-06-25T16:00:00-04:00'],
  ['E', 3, 1, 2, '2026-06-25T16:00:00-04:00'],
  // GRUPO F
  ['F', 1, 0, 1, '2026-06-14T16:00:00-04:00'],
  ['F', 1, 2, 3, '2026-06-14T22:00:00-04:00'],
  ['F', 2, 0, 2, '2026-06-20T13:00:00-04:00'],
  ['F', 2, 3, 1, '2026-06-20T22:00:00-04:00'],
  ['F', 3, 1, 2, '2026-06-25T12:00:00-04:00'],
  ['F', 3, 3, 0, '2026-06-25T12:00:00-04:00'],
  // GRUPO G
  ['G', 1, 0, 1, '2026-06-15T15:00:00-04:00'],
  ['G', 1, 2, 3, '2026-06-15T21:00:00-04:00'],
  ['G', 2, 0, 2, '2026-06-21T15:00:00-04:00'],
  ['G', 2, 3, 1, '2026-06-21T21:00:00-04:00'],
  ['G', 3, 1, 2, '2026-06-26T21:00:00-04:00'],
  ['G', 3, 3, 0, '2026-06-26T21:00:00-04:00'],
  // GRUPO H
  ['H', 1, 0, 1, '2026-06-15T12:00:00-04:00'],
  ['H', 1, 2, 3, '2026-06-15T18:00:00-04:00'],
  ['H', 2, 0, 2, '2026-06-21T12:00:00-04:00'],
  ['H', 2, 3, 1, '2026-06-21T18:00:00-04:00'],
  ['H', 3, 1, 2, '2026-06-26T18:00:00-04:00'],
  ['H', 3, 3, 0, '2026-06-26T18:00:00-04:00'],
  // GRUPO I
  ['I', 1, 0, 1, '2026-06-16T15:00:00-04:00'],
  ['I', 1, 2, 3, '2026-06-16T18:00:00-04:00'],
  ['I', 2, 0, 2, '2026-06-22T15:00:00-04:00'],
  ['I', 2, 3, 1, '2026-06-22T15:00:00-04:00'],
  ['I', 3, 3, 0, '2026-06-26T15:00:00-04:00'],
  ['I', 3, 1, 2, '2026-06-26T15:00:00-04:00'],
  // GRUPO J
  ['J', 1, 0, 1, '2026-06-16T21:00:00-04:00'],
  ['J', 1, 2, 3, '2026-06-16T12:00:00-04:00'],
  ['J', 2, 0, 2, '2026-06-22T13:00:00-04:00'],
  ['J', 2, 3, 1, '2026-06-22T22:00:00-04:00'],
  ['J', 3, 1, 2, '2026-06-27T22:00:00-04:00'],
  ['J', 3, 3, 0, '2026-06-27T22:00:00-04:00'],
  // GRUPO K
  ['K', 1, 0, 1, '2026-06-17T13:00:00-04:00'],
  ['K', 1, 2, 3, '2026-06-17T22:00:00-04:00'],
  ['K', 2, 0, 2, '2026-06-23T13:00:00-04:00'],
  ['K', 2, 3, 1, '2026-06-23T16:00:00-04:00'],
  ['K', 3, 3, 0, '2026-06-27T19:30:00-04:00'],
  ['K', 3, 1, 2, '2026-06-27T19:30:00-04:00'],
  // GRUPO L
  ['L', 1, 0, 1, '2026-06-17T16:00:00-04:00'],
  ['L', 1, 2, 3, '2026-06-17T19:00:00-04:00'],
  ['L', 2, 0, 2, '2026-06-23T16:00:00-04:00'],
  ['L', 2, 3, 1, '2026-06-23T19:00:00-04:00'],
  ['L', 3, 3, 0, '2026-06-27T15:00:00-04:00'],
  ['L', 3, 1, 2, '2026-06-27T15:00:00-04:00'],
];

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Obtener mapa de grupos
    const groupsRes = await client.query('SELECT id, name FROM groups');
    const groupMap = {};
    groupsRes.rows.forEach(g => { groupMap[g.name.trim()] = g.id; });

    // Obtener equipos por grupo
    const teamsRes = await client.query('SELECT id, group_id FROM teams ORDER BY id');
    const teamsByGroup = {};
    teamsRes.rows.forEach(t => {
      if (!teamsByGroup[t.group_id]) teamsByGroup[t.group_id] = [];
      teamsByGroup[t.group_id].push(t.id);
    });

    let updated = 0;
    for (const [groupName, jornada, homeIdx, awayIdx, newDate] of DATES) {
      const groupId = groupMap[groupName];
      if (!groupId) { console.log(`Grupo ${groupName} no encontrado`); continue; }

      const teams = teamsByGroup[groupId];
      if (!teams || teams.length < 4) { console.log(`Grupo ${groupName} no tiene 4 equipos`); continue; }

      const homeTeamId = teams[homeIdx];
      const awayTeamId = teams[awayIdx];

      const res = await client.query(
        `UPDATE matches SET match_date = $1
         WHERE group_id = $2 AND home_team_id = $3 AND away_team_id = $4`,
        [newDate, groupId, homeTeamId, awayTeamId]
      );

      if (res.rowCount > 0) updated++;
    }

    await client.query('COMMIT');
    console.log(`✅ ${updated} partidos actualizados con hora Miami EDT`);
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
