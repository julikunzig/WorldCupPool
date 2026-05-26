/**
 * @script seed-db
 * @description Carga los datos iniciales: grupos, equipos, partidos y usuario admin.
 * Ejecutar después de setup-db: node src/scripts/seed-db.js
 */

require('../config/env');
const bcrypt = require('bcryptjs');
const { pool, testConnection } = require('../config/database');
const logger = require('../config/logger');

// ─── Datos del torneo ─────────────────────────────────────────────────────────

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

const TEAMS = {
  A: [
    { name: 'México', flag: '🇲🇽' },
    { name: 'Sudáfrica', flag: '🇿🇦' },
    { name: 'Corea del Sur', flag: '🇰🇷' },
    { name: 'República Checa', flag: '🇨🇿' },
  ],
  B: [
    { name: 'Canadá', flag: '🇨🇦' },
    { name: 'Bosnia', flag: '🇧🇦' },
    { name: 'Catar', flag: '🇶🇦' },
    { name: 'Suiza', flag: '🇨🇭' },
  ],
  C: [
    { name: 'Brasil', flag: '🇧🇷' },
    { name: 'Marruecos', flag: '🇲🇦' },
    { name: 'Haití', flag: '🇭🇹' },
    { name: 'Escocia', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  ],
  D: [
    { name: 'Estados Unidos', flag: '🇺🇸' },
    { name: 'Paraguay', flag: '🇵🇾' },
    { name: 'Australia', flag: '🇦🇺' },
    { name: 'Turquía', flag: '🇹🇷' },
  ],
  E: [
    { name: 'Alemania', flag: '🇩🇪' },
    { name: 'Curazao', flag: '🇨🇼' },
    { name: 'Costa de Marfil', flag: '🇨🇮' },
    { name: 'Ecuador', flag: '🇪🇨' },
  ],
  F: [
    { name: 'Países Bajos', flag: '🇳🇱' },
    { name: 'Japón', flag: '🇯🇵' },
    { name: 'Suecia', flag: '🇸🇪' },
    { name: 'Túnez', flag: '🇹🇳' },
  ],
  G: [
    { name: 'Bélgica', flag: '🇧🇪' },
    { name: 'Egipto', flag: '🇪🇬' },
    { name: 'Irán', flag: '🇮🇷' },
    { name: 'Nueva Zelanda', flag: '🇳🇿' },
  ],
  H: [
    { name: 'España', flag: '🇪🇸' },
    { name: 'Cabo Verde', flag: '🇨🇻' },
    { name: 'Arabia Saudita', flag: '🇸🇦' },
    { name: 'Uruguay', flag: '🇺🇾' },
  ],
  I: [
    { name: 'Francia', flag: '🇫🇷' },
    { name: 'Senegal', flag: '🇸🇳' },
    { name: 'Iraq', flag: '🇮🇶' },
    { name: 'Noruega', flag: '🇳🇴' },
  ],
  J: [
    { name: 'Argentina', flag: '🇦🇷' },
    { name: 'Argelia', flag: '🇩🇿' },
    { name: 'Austria', flag: '🇦🇹' },
    { name: 'Jordania', flag: '🇯🇴' },
  ],
  K: [
    { name: 'Portugal', flag: '🇵🇹' },
    { name: 'RD Congo', flag: '🇨🇩' },
    { name: 'Uzbekistán', flag: '🇺🇿' },
    { name: 'Colombia', flag: '🇨🇴' },
  ],
  L: [
    { name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    { name: 'Croacia', flag: '🇭🇷' },
    { name: 'Ghana', flag: '🇬🇭' },
    { name: 'Panamá', flag: '🇵🇦' },
  ],
};

// Partidos: [grupo, jornada, fecha, local_idx, visitante_idx]
// idx = índice en el array TEAMS[grupo] (0-based)
const MATCHES_DATA = [
  // GRUPO A
  ['A', 1, '2026-06-11T15:00:00-06:00', 0, 1],
  ['A', 1, '2026-06-11T22:00:00-06:00', 2, 3],
  ['A', 2, '2026-06-18T12:00:00-06:00', 3, 1],
  ['A', 2, '2026-06-18T21:00:00-06:00', 0, 2],
  ['A', 3, '2026-06-24T21:00:00-06:00', 3, 0],
  ['A', 3, '2026-06-24T21:00:00-06:00', 1, 2],
  // GRUPO B
  ['B', 1, '2026-06-12T15:00:00-06:00', 0, 1],
  ['B', 1, '2026-06-13T15:00:00-06:00', 2, 3],
  ['B', 2, '2026-06-18T15:00:00-06:00', 3, 1],
  ['B', 2, '2026-06-18T18:00:00-06:00', 0, 2],
  ['B', 3, '2026-06-24T15:00:00-06:00', 3, 0],
  ['B', 3, '2026-06-24T15:00:00-06:00', 1, 2],
  // GRUPO C
  ['C', 1, '2026-06-13T18:00:00-06:00', 0, 1],
  ['C', 1, '2026-06-13T21:00:00-06:00', 2, 3],
  ['C', 2, '2026-06-19T18:00:00-06:00', 3, 1],
  ['C', 2, '2026-06-19T21:00:00-06:00', 0, 2],
  ['C', 3, '2026-06-24T18:00:00-06:00', 3, 0],
  ['C', 3, '2026-06-24T18:00:00-06:00', 1, 2],
  // GRUPO D
  ['D', 1, '2026-06-12T21:00:00-06:00', 0, 1],
  ['D', 1, '2026-06-13T00:00:00-06:00', 2, 3],
  ['D', 2, '2026-06-19T15:00:00-06:00', 0, 2],
  ['D', 2, '2026-06-19T00:00:00-06:00', 3, 1],
  ['D', 3, '2026-06-25T22:00:00-06:00', 3, 0],
  ['D', 3, '2026-06-25T22:00:00-06:00', 1, 2],
  // GRUPO E
  ['E', 1, '2026-06-14T13:00:00-06:00', 0, 1],
  ['E', 1, '2026-06-14T19:00:00-06:00', 2, 3],
  ['E', 2, '2026-06-20T16:00:00-06:00', 0, 2],
  ['E', 2, '2026-06-20T22:00:00-06:00', 3, 1],
  ['E', 3, '2026-06-25T16:00:00-06:00', 3, 0],
  ['E', 3, '2026-06-25T16:00:00-06:00', 1, 2],
  // GRUPO F
  ['F', 1, '2026-06-14T16:00:00-06:00', 0, 1],
  ['F', 1, '2026-06-14T22:00:00-06:00', 2, 3],
  ['F', 2, '2026-06-20T13:00:00-06:00', 0, 2],
  ['F', 2, '2026-06-20T00:00:00-06:00', 3, 1],
  ['F', 3, '2026-06-25T19:00:00-06:00', 1, 2],
  ['F', 3, '2026-06-25T19:00:00-06:00', 3, 0],
  // GRUPO G
  ['G', 1, '2026-06-15T15:00:00-06:00', 0, 1],
  ['G', 1, '2026-06-15T21:00:00-06:00', 2, 3],
  ['G', 2, '2026-06-21T15:00:00-06:00', 0, 2],
  ['G', 2, '2026-06-21T21:00:00-06:00', 3, 1],
  ['G', 3, '2026-06-26T23:00:00-06:00', 1, 2],
  ['G', 3, '2026-06-26T23:00:00-06:00', 3, 0],
  // GRUPO H
  ['H', 1, '2026-06-15T12:00:00-06:00', 0, 1],
  ['H', 1, '2026-06-15T18:00:00-06:00', 2, 3],
  ['H', 2, '2026-06-21T12:00:00-06:00', 0, 2],
  ['H', 2, '2026-06-21T18:00:00-06:00', 3, 1],
  ['H', 3, '2026-06-26T20:00:00-06:00', 1, 2],
  ['H', 3, '2026-06-26T20:00:00-06:00', 3, 0],
  // GRUPO I
  ['I', 1, '2026-06-16T15:00:00-06:00', 0, 1],
  ['I', 1, '2026-06-16T18:00:00-06:00', 2, 3],
  ['I', 2, '2026-06-22T17:00:00-06:00', 0, 2],
  ['I', 2, '2026-06-22T20:00:00-06:00', 3, 1],
  ['I', 3, '2026-06-26T15:00:00-06:00', 3, 0],
  ['I', 3, '2026-06-26T15:00:00-06:00', 1, 2],
  // GRUPO J
  ['J', 1, '2026-06-16T21:00:00-06:00', 0, 1],
  ['J', 1, '2026-06-16T00:00:00-06:00', 2, 3],
  ['J', 2, '2026-06-22T13:00:00-06:00', 0, 2],
  ['J', 2, '2026-06-22T23:00:00-06:00', 3, 1],
  ['J', 3, '2026-06-27T22:00:00-06:00', 1, 2],
  ['J', 3, '2026-06-27T22:00:00-06:00', 3, 0],
  // GRUPO K
  ['K', 1, '2026-06-17T13:00:00-06:00', 0, 1],
  ['K', 1, '2026-06-17T22:00:00-06:00', 2, 3],
  ['K', 2, '2026-06-23T13:00:00-06:00', 0, 2],
  ['K', 2, '2026-06-23T22:00:00-06:00', 3, 1],
  ['K', 3, '2026-06-27T19:30:00-06:00', 3, 0],
  ['K', 3, '2026-06-27T19:30:00-06:00', 1, 2],
  // GRUPO L
  ['L', 1, '2026-06-17T16:00:00-06:00', 0, 1],
  ['L', 1, '2026-06-17T19:00:00-06:00', 2, 3],
  ['L', 2, '2026-06-23T16:00:00-06:00', 0, 2],
  ['L', 2, '2026-06-23T19:00:00-06:00', 3, 1],
  ['L', 3, '2026-06-27T17:00:00-06:00', 3, 0],
  ['L', 3, '2026-06-27T17:00:00-06:00', 1, 2],
];

// ─── Función principal ────────────────────────────────────────────────────────

const run = async () => {
  logger.info('=== Iniciando seed de base de datos ===');

  const connected = await testConnection();
  if (!connected) {
    logger.error('No se pudo conectar a la base de datos. Abortando.');
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── 1. Grupos ──────────────────────────────────────────────────────────
    logger.info('Insertando grupos...');
    const groupIds = {};
    for (const groupName of GROUPS) {
      const res = await client.query(
        `INSERT INTO groups (name) VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [groupName]
      );
      groupIds[groupName] = res.rows[0].id;
    }
    logger.info(`✅ ${GROUPS.length} grupos insertados`);

    // ── 2. Equipos ─────────────────────────────────────────────────────────
    logger.info('Insertando equipos...');
    const teamIds = {};
    let teamCount = 0;
    for (const [groupName, teams] of Object.entries(TEAMS)) {
      teamIds[groupName] = [];
      for (const team of teams) {
        const res = await client.query(
          `INSERT INTO teams (name, flag, group_id) VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING
           RETURNING id`,
          [team.name, team.flag, groupIds[groupName]]
        );
        if (res.rows.length > 0) {
          teamIds[groupName].push(res.rows[0].id);
          teamCount++;
        } else {
          // Ya existe, obtener ID
          const existing = await client.query(
            'SELECT id FROM teams WHERE name = $1',
            [team.name]
          );
          teamIds[groupName].push(existing.rows[0].id);
        }
      }
    }
    logger.info(`✅ ${teamCount} equipos insertados`);

    // ── 3. Partidos ────────────────────────────────────────────────────────
    logger.info('Insertando partidos...');
    let matchCount = 0;
    for (const [groupName, jornada, date, homeIdx, awayIdx] of MATCHES_DATA) {
      const homeTeamId = teamIds[groupName][homeIdx];
      const awayTeamId = teamIds[groupName][awayIdx];

      await client.query(
        `INSERT INTO matches (group_id, jornada, match_date, home_team_id, away_team_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [groupIds[groupName], jornada, date, homeTeamId, awayTeamId]
      );
      matchCount++;
    }
    logger.info(`✅ ${matchCount} partidos insertados`);

    // ── 4. Usuario administrador ───────────────────────────────────────────
    logger.info('Creando usuario administrador...');
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin2026!';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    await client.query(
      `INSERT INTO users (nombre, username, email, password_hash, role, must_change_password)
       VALUES ($1, $2, $3, $4, 'admin', FALSE)
       ON CONFLICT (email) DO NOTHING`,
      [
        'Administrador',
        process.env.ADMIN_USERNAME || 'admin',
        process.env.ADMIN_EMAIL || 'admin@polla2026.com',
        passwordHash,
      ]
    );
    logger.info('✅ Usuario administrador creado');

    // ── 5. Fases eliminatorias ─────────────────────────────────────────────
    logger.info('Insertando fases eliminatorias...');
    await client.query(`
      INSERT INTO knockout_phases (stage, label, match_count) VALUES
        ('round_of_16',  'Dieciseisavos de Final', 16),
        ('round_of_8',   'Octavos de Final',         8),
        ('quarterfinal', 'Cuartos de Final',          4),
        ('semifinal',    'Semifinal',                 2),
        ('third_place',  'Tercer y Cuarto Puesto',    1),
        ('final',        'Final',                     1)
      ON CONFLICT (stage) DO NOTHING
    `);
    logger.info('✅ Fases eliminatorias insertadas');

    // ── 6. Configuración del sistema ───────────────────────────────────────
    logger.info('Insertando configuración inicial...');
    await client.query(`
      INSERT INTO settings (key, value, description)
      VALUES ('prediction_deadline', '2026-06-10T23:59:00', 'Fecha y hora límite para editar predicciones')
      ON CONFLICT (key) DO NOTHING
    `);
    logger.info('✅ Configuración inicial insertada');

    await client.query('COMMIT');
    logger.info('=== Seed completado exitosamente ===');
    logger.info(`
    ┌─────────────────────────────────────────┐
    │  Credenciales del administrador:        │
    │  Email: ${(process.env.ADMIN_EMAIL || 'admin@polla2026.com').padEnd(31)}│
    │  Password: ${adminPassword.padEnd(29)}│
    └─────────────────────────────────────────┘
    `);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Error en seed, rollback ejecutado', {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

run();
