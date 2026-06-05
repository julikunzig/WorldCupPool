# Guía de Despliegue — Polla Mundial 2026

## 1. Requisitos de Software

| Software | Versión recomendada | Versión mínima |
|----------|-------------------|----------------|
| **Node.js** | 22.x LTS | 18.x |
| **npm** | 10.x | 9.x |
| **PostgreSQL** | 16.x | 14.x |

### Verificar instalación

```bash
node --version    # v22.x.x
npm --version     # 10.x.x
psql --version    # psql (PostgreSQL) 16.x
```

---

## 2. Clonar el Repositorio

```bash
git clone https://github.com/julikunzig/WorldCupPool.git
cd WorldCupPool
npm install
```

---

## 3. Variables de Entorno

Crear archivo `.env` en la raíz:

```env
# =============================================
# APLICACIÓN
# =============================================
NODE_ENV=production
PORT=3000
APP_NAME=Polla Mundial 2026

# =============================================
# BASE DE DATOS POSTGRESQL
# =============================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=polla_mundial
DB_USER=tu_usuario_postgres
DB_PASSWORD=tu_password_seguro
DB_POOL_MAX=10
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=2000

# =============================================
# JWT AUTENTICACIÓN
# =============================================
JWT_SECRET=CAMBIA_ESTO_POR_UNA_CLAVE_SECRETA_DE_MINIMO_64_CARACTERES_ALEATORIA
JWT_EXPIRES_IN=24h

# =============================================
# ADMINISTRADOR POR DEFECTO
# =============================================
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@tudominio.com
ADMIN_PASSWORD=CambiaEstaPassword123!

# =============================================
# FECHA LÍMITE (configurable desde el panel admin)
# =============================================
PREDICTION_DEADLINE=2026-06-10T23:59:59

# =============================================
# LOGGING
# =============================================
LOG_LEVEL=info
LOG_DIR=logs
```

> **IMPORTANTE:** Nunca subir `.env` a Git. Usar contraseñas fuertes en producción.

---

## 4. Crear la Base de Datos

```bash
# Crear la base de datos
createdb polla_mundial

# O con psql:
psql -U tu_usuario -c "CREATE DATABASE polla_mundial;"
```

---

## 5. Script Completo de la Base de Datos

Ejecutar en orden:

```bash
# Opción A: Usar los scripts automáticos
npm run setup-db
node src/scripts/migrate-knockout-fix2.js
node src/scripts/migrate-phase-deadlines.js
node src/scripts/migrate-special-predictions.js
npm run seed-db
```

**Opción B: Script SQL manual completo** (ejecutar directamente en psql):

```sql
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
  id                   SERIAL PRIMARY KEY,
  stage                VARCHAR(30)  NOT NULL UNIQUE,
  label                VARCHAR(50)  NOT NULL,
  match_count          SMALLINT     NOT NULL,
  published            BOOLEAN      NOT NULL DEFAULT FALSE,
  prediction_deadline  TIMESTAMPTZ,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: predictions (pronósticos de partidos)
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
-- TABLA: special_predictions (goleador, campeón, subcampeón, 3er lugar)
-- ============================================================
CREATE TABLE IF NOT EXISTS special_predictions (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goleador          VARCHAR(100),
  champion          INTEGER REFERENCES teams(id),
  runner_up         INTEGER REFERENCES teams(id),
  third_place       INTEGER REFERENCES teams(id),
  points_champion   SMALLINT NOT NULL DEFAULT 0,
  points_runner_up  SMALLINT NOT NULL DEFAULT 0,
  points_third      SMALLINT NOT NULL DEFAULT 0,
  total_bonus       SMALLINT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- ============================================================
-- TABLA: tournament_results (resultados reales del torneo)
-- ============================================================
CREATE TABLE IF NOT EXISTS tournament_results (
  id          SERIAL PRIMARY KEY,
  goleador    VARCHAR(100),
  champion    INTEGER REFERENCES teams(id),
  runner_up   INTEGER REFERENCES teams(id),
  third_place INTEGER REFERENCES teams(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: audit_log (bitácora)
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
-- FUNCIÓN Y TRIGGERS: updated_at automático
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
    CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_matches_updated_at') THEN
    CREATE TRIGGER trg_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_predictions_updated_at') THEN
    CREATE TRIGGER trg_predictions_updated_at BEFORE UPDATE ON predictions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_special_predictions_updated_at') THEN
    CREATE TRIGGER trg_special_predictions_updated_at BEFORE UPDATE ON special_predictions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
```

---

## 6. Datos Iniciales Requeridos

Después de crear las tablas, insertar estos datos:

```sql
-- ============================================================
-- Fases eliminatorias
-- ============================================================
INSERT INTO knockout_phases (stage, label, match_count, prediction_deadline) VALUES
  ('round_of_16',  'Dieciseisavos de Final', 16, '2026-06-27T23:59:00'),
  ('round_of_8',   'Octavos de Final',         8, '2026-07-03T23:59:00'),
  ('quarterfinal', 'Cuartos de Final',          4, '2026-07-08T23:59:00'),
  ('semifinal',    'Semifinal',                 2, '2026-07-13T23:59:00'),
  ('third_place',  'Tercer y Cuarto Puesto',    1, '2026-07-17T23:59:00'),
  ('final',        'Final',                     1, '2026-07-18T23:59:00')
ON CONFLICT (stage) DO NOTHING;

-- ============================================================
-- Configuración del sistema
-- ============================================================
INSERT INTO settings (key, value, description)
VALUES ('prediction_deadline', '2026-06-10T23:59:00', 'Fecha límite predicciones fase de grupos y especiales')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- Fila de resultados del torneo (vacía)
-- ============================================================
INSERT INTO tournament_results (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
```

> Los 12 grupos, 48 equipos, 72 partidos y el usuario admin se crean automáticamente con `npm run seed-db`.

---

## 7. Credenciales del Administrador

Creadas automáticamente por `npm run seed-db`:

| Campo | Valor por defecto |
|-------|-------------------|
| Email | admin@tudominio.com (o el valor de `ADMIN_EMAIL` en .env) |
| Password | El valor de `ADMIN_PASSWORD` en .env |

> **Cambiar la contraseña del admin después del primer despliegue.**

---

## 8. Iniciar el Servidor

```bash
# Producción (sin auto-reinicio)
npm start

# Desarrollo (con auto-reinicio al cambiar archivos)
npm run dev
```

La aplicación estará en: `http://localhost:3000`

---

## 9. Despliegue en Producción (VPS Ubuntu/Debian)

### 9.1 Instalar dependencias del sistema

```bash
# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL 16
sudo apt-get install -y postgresql-16 postgresql-client-16

# PM2 (gestor de procesos para producción)
sudo npm install -g pm2
```

### 9.2 Configurar PostgreSQL

```bash
# Crear usuario y base de datos
sudo -u postgres psql -c "CREATE USER polla_user WITH PASSWORD 'tu_password_seguro';"
sudo -u postgres psql -c "CREATE DATABASE polla_mundial OWNER polla_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE polla_mundial TO polla_user;"
```

### 9.3 Clonar y configurar la aplicación

```bash
cd /var/www
git clone https://github.com/julikunzig/WorldCupPool.git
cd WorldCupPool
npm install --production

# Crear archivo .env (editar con los valores de producción)
cp .env.example .env
nano .env
```

### 9.4 Configurar base de datos

```bash
npm run setup-db
node src/scripts/migrate-knockout-fix2.js
node src/scripts/migrate-phase-deadlines.js
node src/scripts/migrate-special-predictions.js
npm run seed-db
```

### 9.5 Iniciar con PM2

```bash
pm2 start src/server.js --name "polla-mundial"
pm2 save
pm2 startup    # Configura inicio automático al reiniciar el servidor
```

### 9.6 Configurar Nginx como reverse proxy

```bash
sudo apt-get install -y nginx
```

Crear archivo `/etc/nginx/sites-available/polla-mundial`:

```nginx
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activar:

```bash
sudo ln -s /etc/nginx/sites-available/polla-mundial /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 9.7 HTTPS con Let's Encrypt (recomendado)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tudominio.com -d www.tudominio.com
```

---

## 10. Comandos Útiles

| Comando | Descripción |
|---------|-------------|
| `npm start` | Iniciar servidor |
| `npm run dev` | Iniciar en modo desarrollo |
| `npm run setup-db` | Crear schema de tablas |
| `npm run seed-db` | Poblar datos iniciales |
| `pm2 logs polla-mundial` | Ver logs en producción |
| `pm2 restart polla-mundial` | Reiniciar servidor |
| `pm2 stop polla-mundial` | Detener servidor |

---

## 11. Notas de Seguridad

1. Cambiar `JWT_SECRET` por una cadena aleatoria de 64+ caracteres
2. Cambiar contraseña del admin inmediatamente
3. Configurar `NODE_ENV=production`
4. Usar HTTPS obligatoriamente
5. Configurar firewall (solo puertos 80, 443 y SSH)
6. No exponer PostgreSQL a internet (solo localhost)
7. Hacer backups regulares de la base de datos:
   ```bash
   pg_dump polla_mundial > backup_$(date +%Y%m%d).sql
   ```

---

## 12. Estructura del Proyecto

```
WorldCupPool/
├── public/                    # Frontend estático
│   ├── css/styles.css
│   ├── index.html
│   └── js/
│       ├── api.js             # Cliente HTTP
│       ├── app.js             # Navegación
│       ├── auth.js            # Login
│       ├── admin.js           # Panel administración
│       ├── predictions.js     # Predicciones con tabs por fase
│       ├── groups.js          # Grupos del mundial
│       ├── special.js         # Pronósticos especiales
│       ├── leaderboard.js     # Tabla de posiciones
│       └── profile.js         # Perfil de usuario
├── src/
│   ├── config/
│   │   ├── database.js        # Pool de conexiones PostgreSQL
│   │   ├── env.js             # Validación de variables de entorno
│   │   └── logger.js          # Winston logger
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── matchController.js
│   │   ├── predictionController.js
│   │   ├── settingsController.js
│   │   ├── specialController.js
│   │   └── userController.js
│   ├── middleware/
│   │   ├── audit.js
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── repositories/
│   │   ├── matchRepository.js
│   │   ├── predictionRepository.js
│   │   ├── settingsRepository.js
│   │   └── userRepository.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── matchRoutes.js
│   │   ├── predictionRoutes.js
│   │   ├── settingsRoutes.js
│   │   ├── specialRoutes.js
│   │   └── userRoutes.js
│   ├── scripts/
│   │   ├── setup-db.js
│   │   ├── seed-db.js
│   │   ├── migrate-knockout-fix2.js
│   │   ├── migrate-phase-deadlines.js
│   │   └── migrate-special-predictions.js
│   ├── services/
│   │   ├── authService.js
│   │   └── predictionService.js
│   ├── utils/
│   │   ├── errors.js
│   │   ├── jwt.js
│   │   └── validators.js
│   └── server.js              # Punto de entrada
├── .env.example
├── .gitignore
├── DEPLOYMENT.md
├── package.json
└── package-lock.json
```
