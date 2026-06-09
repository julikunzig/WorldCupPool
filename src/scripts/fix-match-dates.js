/**
 * Actualiza las fechas de los partidos según el documento oficial.
 * Horas en hora local de Miami (EDT = UTC-4)
 * No elimina datos, solo actualiza match_date.
 */
require('../config/env');
const { pool } = require('../config/database');

// [grupo, jornada, home_idx, away_idx, fecha_miami_EDT]
// Índices basados en el orden de TEAMS en seed-db:
// A: 0=México, 1=Sudáfrica, 2=Corea del Sur, 3=República Checa
// B: 0=Canadá, 1=Bosnia, 2=Catar, 3=Suiza
// C: 0=Brasil, 1=Marruecos, 2=Haití, 3=Escocia
// D: 0=Estados Unidos, 1=Paraguay, 2=Australia, 3=Turquía
// E: 0=Alemania, 1=Curazao, 2=Costa de Marfil, 3=Ecuador
// F: 0=Países Bajos, 1=Japón, 2=Suecia, 3=Túnez
// G: 0=Bélgica, 1=Egipto, 2=Irán, 3=Nueva Zelanda
// H: 0=España, 1=Cabo Verde, 2=Arabia Saudita, 3=Uruguay
// I: 0=Francia, 1=Senegal, 2=Iraq, 3=Noruega
// J: 0=Argentina, 1=Argelia, 2=Austria, 3=Jordania
// K: 0=Portugal, 1=RD Congo, 2=Uzbekistán, 3=Colombia
// L: 0=Inglaterra, 1=Croacia, 2=Ghana, 3=Panamá

const DATES = [
  // GRUPO A
  ['A', 1, 0, 1, '2026-06-11T15:00:00-04:00'],  // México vs Sudáfrica 3:00 PM
  ['A', 1, 2, 3, '2026-06-11T22:00:00-04:00'],  // Corea del Sur vs República Checa 10:00 PM
  ['A', 2, 3, 1, '2026-06-18T12:00:00-04:00'],  // República Checa vs Sudáfrica 12:00 PM
  ['A', 2, 0, 2, '2026-06-18T21:00:00-04:00'],  // México vs Corea del Sur 9:00 PM
  ['A', 3, 3, 0, '2026-06-24T21:00:00-04:00'],  // República Checa vs México 9:00 PM
  ['A', 3, 1, 2, '2026-06-24T21:00:00-04:00'],  // Sudáfrica vs Corea del Sur 9:00 PM
  // GRUPO B
  ['B', 1, 0, 1, '2026-06-12T15:00:00-04:00'],  // Canadá vs Bosnia 3:00 PM
  ['B', 1, 2, 3, '2026-06-13T15:00:00-04:00'],  // Catar vs Suiza 3:00 PM
  ['B', 2, 3, 1, '2026-06-18T15:00:00-04:00'],  // Suiza vs Bosnia 3:00 PM
  ['B', 2, 0, 2, '2026-06-18T18:00:00-04:00'],  // Canadá vs Catar 6:00 PM
  ['B', 3, 3, 0, '2026-06-24T15:00:00-04:00'],  // Suiza vs Canadá 3:00 PM
  ['B', 3, 1, 2, '2026-06-24T15:00:00-04:00'],  // Bosnia vs Catar 3:00 PM
  // GRUPO C
  ['C', 1, 0, 1, '2026-06-13T18:00:00-04:00'],  // Brasil vs Marruecos 6:00 PM
  ['C', 1, 2, 3, '2026-06-13T21:00:00-04:00'],  // Haití vs Escocia 9:00 PM
  ['C', 2, 3, 1, '2026-06-19T18:00:00-04:00'],  // Escocia vs Marruecos 6:00 PM
  ['C', 2, 0, 2, '2026-06-19T21:00:00-04:00'],  // Brasil vs Haití 9:00 PM
  ['C', 3, 3, 0, '2026-06-24T18:00:00-04:00'],  // Escocia vs Brasil 6:00 PM
  ['C', 3, 1, 2, '2026-06-24T18:00:00-04:00'],  // Marruecos vs Haití 6:00 PM
  // GRUPO D
  ['D', 1, 0, 1, '2026-06-12T21:00:00-04:00'],  // Estados Unidos vs Paraguay 9:00 PM
  ['D', 1, 2, 3, '2026-06-14T00:00:00-04:00'],  // Australia vs Turquía 12:00 AM (14 de junio)
  ['D', 2, 0, 2, '2026-06-19T15:00:00-04:00'],  // Estados Unidos vs Australia 3:00 PM
  ['D', 2, 3, 1, '2026-06-20T00:00:00-04:00'],  // Turquía vs Paraguay 12:00 AM (20 de junio)
  ['D', 3, 3, 0, '2026-06-25T22:00:00-04:00'],  // Turquía vs Estados Unidos 10:00 PM
  ['D', 3, 1, 2, '2026-06-25T22:00:00-04:00'],  // Paraguay vs Australia 10:00 PM
  // GRUPO E
  ['E', 1, 0, 1, '2026-06-14T13:00:00-04:00'],  // Alemania vs Curazao 1:00 PM
  ['E', 1, 2, 3, '2026-06-14T19:00:00-04:00'],  // Costa de Marfil vs Ecuador 7:00 PM
  ['E', 2, 0, 2, '2026-06-20T16:00:00-04:00'],  // Alemania vs Costa de Marfil 4:00 PM
  ['E', 2, 3, 1, '2026-06-20T22:00:00-04:00'],  // Ecuador vs Curazao 10:00 PM
  ['E', 3, 3, 0, '2026-06-25T16:00:00-04:00'],  // Ecuador vs Alemania 4:00 PM
  ['E', 3, 1, 2, '2026-06-25T16:00:00-04:00'],  // Curazao vs Costa de Marfil 4:00 PM
  // GRUPO F
  ['F', 1, 0, 1, '2026-06-14T16:00:00-04:00'],  // Países Bajos vs Japón 4:00 PM
  ['F', 1, 2, 3, '2026-06-14T22:00:00-04:00'],  // Suecia vs Túnez 10:00 PM
  ['F', 2, 0, 2, '2026-06-20T13:00:00-04:00'],  // Países Bajos vs Suecia 1:00 PM
  ['F', 2, 3, 1, '2026-06-21T00:00:00-04:00'],  // Túnez vs Japón 12:00 AM (21 de junio)
  ['F', 3, 1, 2, '2026-06-25T19:00:00-04:00'],  // Japón vs Suecia 7:00 PM
  ['F', 3, 3, 0, '2026-06-25T19:00:00-04:00'],  // Túnez vs Países Bajos 7:00 PM
  // GRUPO G
  ['G', 1, 0, 1, '2026-06-15T15:00:00-04:00'],  // Bélgica vs Egipto 3:00 PM
  ['G', 1, 2, 3, '2026-06-15T21:00:00-04:00'],  // Irán vs Nueva Zelanda 9:00 PM
  ['G', 2, 0, 2, '2026-06-21T15:00:00-04:00'],  // Bélgica vs Irán 3:00 PM
  ['G', 2, 3, 1, '2026-06-21T21:00:00-04:00'],  // Nueva Zelanda vs Egipto 9:00 PM
  ['G', 3, 1, 2, '2026-06-26T23:00:00-04:00'],  // Egipto vs Irán 11:00 PM
  ['G', 3, 3, 0, '2026-06-26T23:00:00-04:00'],  // Nueva Zelanda vs Bélgica 11:00 PM
  // GRUPO H
  ['H', 1, 0, 1, '2026-06-15T12:00:00-04:00'],  // España vs Cabo Verde 12:00 PM
  ['H', 1, 2, 3, '2026-06-15T18:00:00-04:00'],  // Arabia Saudita vs Uruguay 6:00 PM
  ['H', 2, 0, 2, '2026-06-21T12:00:00-04:00'],  // España vs Arabia Saudita 12:00 PM
  ['H', 2, 3, 1, '2026-06-21T18:00:00-04:00'],  // Uruguay vs Cabo Verde 6:00 PM
  ['H', 3, 1, 2, '2026-06-26T20:00:00-04:00'],  // Cabo Verde vs Arabia Saudita 8:00 PM
  ['H', 3, 3, 0, '2026-06-26T20:00:00-04:00'],  // Uruguay vs España 8:00 PM
  // GRUPO I
  ['I', 1, 0, 1, '2026-06-16T15:00:00-04:00'],  // Francia vs Senegal 3:00 PM
  ['I', 1, 2, 3, '2026-06-16T18:00:00-04:00'],  // Iraq vs Noruega 6:00 PM
  ['I', 2, 0, 2, '2026-06-22T17:00:00-04:00'],  // Francia vs Iraq 5:00 PM
  ['I', 2, 3, 1, '2026-06-22T20:00:00-04:00'],  // Noruega vs Senegal 8:00 PM
  ['I', 3, 3, 0, '2026-06-26T15:00:00-04:00'],  // Noruega vs Francia 3:00 PM
  ['I', 3, 1, 2, '2026-06-26T15:00:00-04:00'],  // Senegal vs Iraq 3:00 PM
  // GRUPO J
  ['J', 1, 0, 1, '2026-06-16T21:00:00-04:00'],  // Argentina vs Argelia 9:00 PM
  ['J', 1, 2, 3, '2026-06-17T00:00:00-04:00'],  // Austria vs Jordania 12:00 AM (17 de junio)
  ['J', 2, 0, 2, '2026-06-22T13:00:00-04:00'],  // Argentina vs Austria 1:00 PM
  ['J', 2, 3, 1, '2026-06-22T23:00:00-04:00'],  // Jordania vs Argelia 11:00 PM
  ['J', 3, 1, 2, '2026-06-27T22:00:00-04:00'],  // Argelia vs Austria 10:00 PM
  ['J', 3, 3, 0, '2026-06-27T22:00:00-04:00'],  // Jordania vs Argentina 10:00 PM
  // GRUPO K
  ['K', 1, 0, 1, '2026-06-17T13:00:00-04:00'],  // Portugal vs RD Congo 1:00 PM
  ['K', 1, 2, 3, '2026-06-17T22:00:00-04:00'],  // Uzbekistán vs Colombia 10:00 PM
  ['K', 2, 0, 2, '2026-06-23T13:00:00-04:00'],  // Portugal vs Uzbekistán 1:00 PM
  ['K', 2, 3, 1, '2026-06-23T22:00:00-04:00'],  // Colombia vs RD Congo 10:00 PM
  ['K', 3, 3, 0, '2026-06-27T19:30:00-04:00'],  // Colombia vs Portugal 7:30 PM
  ['K', 3, 1, 2, '2026-06-27T19:30:00-04:00'],  // RD Congo vs Uzbekistán 7:30 PM
  // GRUPO L
  ['L', 1, 0, 1, '2026-06-17T16:00:00-04:00'],  // Inglaterra vs Croacia 4:00 PM
  ['L', 1, 2, 3, '2026-06-17T19:00:00-04:00'],  // Ghana vs Panamá 7:00 PM
  ['L', 2, 0, 2, '2026-06-23T16:00:00-04:00'],  // Inglaterra vs Ghana 4:00 PM
  ['L', 2, 3, 1, '2026-06-23T19:00:00-04:00'],  // Panamá vs Croacia 7:00 PM
  ['L', 3, 3, 0, '2026-06-27T17:00:00-04:00'],  // Panamá vs Inglaterra 5:00 PM
  ['L', 3, 1, 2, '2026-06-27T17:00:00-04:00'],  // Croacia vs Ghana 5:00 PM
];

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Obtener mapa de grupos
    const groupsRes = await client.query('SELECT id, name FROM groups');
    const groupMap = {};
    groupsRes.rows.forEach(g => { groupMap[g.name.trim()] = g.id; });

    // Obtener equipos por grupo (ordenados por id para mantener índices)
    const teamsRes = await client.query('SELECT id, group_id FROM teams ORDER BY id');
    const teamsByGroup = {};
    teamsRes.rows.forEach(t => {
      if (!teamsByGroup[t.group_id]) teamsByGroup[t.group_id] = [];
      teamsByGroup[t.group_id].push(t.id);
    });

    let updated = 0;
    let notFound = 0;
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
      else notFound++;
    }

    await client.query('COMMIT');
    console.log(`✅ ${updated} partidos actualizados`);
    if (notFound > 0) console.log(`⚠️  ${notFound} partidos no encontrados`);
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
