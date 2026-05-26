/**
 * @script setup-db
 * @description Crea todas las tablas, índices y restricciones de la base de datos.
 * Incluye soporte completo para fase de grupos y fases eliminatorias.
 * Ejecutar una sola vez: node src/scripts/setup-db.js
 */

require('../config/env');
const { pool, testConnection } = require('../config/database');
const logger = require('../config/logger');

const SQL_SCHEMA = `
-- ============================================================
-- EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLA: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                   SERIAL PRIMARY KEY,
  nombre               VARCHAR(100)  NOT NULL,
  username             VARCHAR(50)   UNIQUE,
  telefono             VARCHAR(20),
  email                VARCHAR(150)  NOT NULL UNIQUE,
  password_hash        VARCHAR(255)  NOT NULL,
  role                 VARCHAR(10)   NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active            BOOLEAN       NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role     ON users(role);

-- ============================================================
-- TABLA: groups (grupos del torneo)
-- ============================================================
CREATE TABLE IF NOT EXISTS groups (
  id   SERIAL PRIMARY KEY,
  name CHAR(1) NOT NULL UNIQUE
);

-- ============================================================
-- TABLA: teams (selecciones)
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(100) NOT NULL,
  flag     VARCHAR(10),
  group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_teams_group ON teams(group_id);

-- ============================================================
-- TABLA: matches (partidos - grupos y eliminatorias)
-- ============================================================
CREATE TABLE IF NOT EXISTS matches (
  id              SERIAL PRIMARY KEY,
  group_id        INTEGER      REFERENCES groups(id),
  stage           VARCHAR(30)  NOT NULL DEFAULT 'group',
  jornada         SMALLINT     NOT NULL DEFAULT 1 CHECK (jornada BETWEEN 1 AND 20),
  match_date      TIMESTAMPTZ  NOT NULL,
  home_team_id    INTEGER      NOT NULL REFERENCES teams(id),
  away_team_id    INTEGER      NOT NULL REFERENCES teams(id),
  real_home_goals SMALLINT     CHECK (real_home_goals >= 0),
  real_away_goals SMALLINT     CHECK (real_away_goals >= 0),
  is_finished     BOOLEAN      NOT NULL DEFAULT FALSE,
  published       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_different_teams CHECK (home_team_id <> away_team_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_group   ON matches(group_id);
CREATE INDEX IF NOT EXISTS idx_matches_date    ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_stage   ON matches(stage);
CREATE INDEX IF NOT EXISTS idx_matches_jornada ON matches(jornada);

-- ============================================================
-- TABLA: knockout_phases (fases eliminatorias)
-- ============================================================
CREATE TABLE IF NOT EXISTS knockout_phases (
  id          SERIAL PRIMARY KEY,
  stage       VARCHAR(30) NOT NULL UNIQUE,
  label       VARCHAR(50) NOT NULL,
  match_count SMALLINT    NOT NULL,
  published   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: predictions (pronósticos de usuarios)
-- ============================================================
CREATE TABLE IF NOT EXISTS predictions (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id      INTEGER     NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  home_goals    SMALLINT    NOT NULL CHECK (home_goals >= 0),
  away_goals    SMALLINT    NOT NULL CHECK (away_goals >= 0),
  points_winner SMALLINT    NOT NULL DEFAULT 0,
  points_score  SMALLINT    NOT NULL DEFAULT 0,
  total_points  SMALLINT    NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, match_id)
);

CREATE INDEX IF NOT EXISTS idx_predictions_user  ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match ON predictions(match_id);

-- ============================================================
-- TABLA: audit_log
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id         BIGSERIAL    PRIMARY KEY,
  user_id    INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  action     VARCHAR(100) NOT NULL,
  entity     VARCHAR(50),
  entity_id  INTEGER,
  old_data   JSONB,
  new_data   JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user    ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action  ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity  ON audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

-- ============================================================
-- TABLA: settings (configuración del sistema)
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      TEXT         NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FUNCIÓN: actualizar updated_at automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at') THEN
    CREATE TRIGGER trg_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_matches_updated_at') THEN
    CREATE TRIGGER trg_matches_updated_at
      BEFORE UPDATE ON matches
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_predictions_updated_at') THEN
    CREATE TRIGGER trg_predictions_updated_at
      BEFORE UPDATE ON predictions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
`;

const run = async () => {
  logger.info('=== Iniciando configuración de base de datos ===');

  const connected = await testConnection();
  if (!connected) {
    logger.error('No se pudo conectar a la base de datos. Abortando.');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    logger.info('Ejecutando schema SQL...');
    await client.query(SQL_SCHEMA);
    logger.info('✅ Schema creado/verificado correctamente');
  } catch (err) {
    logger.error('Error al crear el schema', { error: err.message, stack: err.stack });
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }

  logger.info('=== Configuración de base de datos completada ===');
};

run();
