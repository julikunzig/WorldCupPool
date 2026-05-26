# Guía de Despliegue — Polla Mundial 2026

## Requisitos de Software

### Node.js
- **Versión recomendada:** 22.x LTS (probado con v22.22.2)
- **Versión mínima:** 18.x
- Descarga: https://nodejs.org/

```bash
# Verificar versión instalada
node --version
npm --version
```

### PostgreSQL
- **Versión recomendada:** 16.x
- **Versión mínima:** 14.x
- Descarga: https://www.postgresql.org/download/

```bash
# Verificar versión instalada
psql --version
```

---

## Dependencias de la Aplicación

Todas las dependencias se instalan automáticamente con `npm install`.

| Paquete | Versión | Descripción |
|---------|---------|-------------|
| express | ^4.19.2 | Framework web |
| pg | ^8.11.3 | Cliente PostgreSQL |
| bcryptjs | ^2.4.3 | Hash de contraseñas |
| jsonwebtoken | ^9.0.2 | Autenticación JWT |
| helmet | ^7.1.0 | Headers de seguridad |
| cors | ^2.8.5 | Control de CORS |
| compression | ^1.7.4 | Compresión de respuestas |
| morgan | ^1.10.0 | Logging HTTP |
| express-rate-limit | ^7.2.0 | Rate limiting |
| dotenv | ^16.4.5 | Variables de entorno |
| winston | ^3.13.0 | Sistema de logs |
| winston-daily-rotate-file | ^5.0.0 | Rotación de logs |

---

## Pasos de Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/WorldCupPool.git
cd WorldCupPool
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copiar el archivo de ejemplo y completar los valores:

```bash
cp .env.example .env
```

Editar `.env` con los valores correctos (ver sección Variables de Entorno).

### 4. Crear la base de datos

```bash
createdb polla_mundial
```

O desde psql:

```sql
CREATE DATABASE polla_mundial;
```

### 5. Crear el schema de la base de datos

```bash
npm run setup-db
```

### 6. Ejecutar migraciones adicionales

```bash
node src/scripts/migrate-knockout-fix2.js
node src/scripts/migrate-knockout-phases-fix.js
```

### 7. Poblar datos iniciales

```bash
npm run seed-db
```

Esto crea:
- 12 grupos (A–L)
- 48 equipos con banderas
- 72 partidos de fase de grupos
- Usuario administrador

### 8. Iniciar el servidor

```bash
# Producción
npm start

# Desarrollo (con auto-reinicio)
npm run dev
```

---

## Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

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
DB_PASSWORD=tu_password_postgres
DB_POOL_MAX=10
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=2000

# =============================================
# JWT AUTENTICACIÓN
# =============================================
JWT_SECRET=cambia_esto_por_una_clave_secreta_de_minimo_32_caracteres
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# =============================================
# ADMINISTRADOR POR DEFECTO
# =============================================
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@polla2026.com
ADMIN_PASSWORD=Admin2026!

# =============================================
# FECHA LÍMITE DE PREDICCIONES (configurable desde el panel admin)
# =============================================
PREDICTION_DEADLINE=2026-06-10T23:59:59

# =============================================
# LOGGING
# =============================================
LOG_LEVEL=info
LOG_DIR=logs
```

> **Importante:** Nunca subir el archivo `.env` a Git. Ya está incluido en `.gitignore`.

---

## Schema Completo de la Base de Datos

```sql
-- EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USUARIOS
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

-- GRUPOS DEL TORNEO
CREATE TABLE IF NOT EXISTS groups (
  id   SERIAL PRIMARY KEY,
  name CHAR(1) NOT NULL UNIQUE
);

-- EQUIPOS
CREATE TABLE IF NOT EXISTS teams (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(100) NOT NULL,
  flag     VARCHAR(10),
  group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL
);

-- PARTIDOS (grupos + eliminatorias)
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

-- FASES ELIMINATORIAS
CREATE TABLE IF NOT EXISTS knockout_phases (
  id          SERIAL PRIMARY KEY,
  stage       VARCHAR(30) NOT NULL UNIQUE,
  label       VARCHAR(50) NOT NULL,
  match_count SMALLINT    NOT NULL,
  published   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PREDICCIONES
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

-- AUDITORÍA
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

-- CONFIGURACIÓN DEL SISTEMA
CREATE TABLE IF NOT EXISTS settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      TEXT         NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

### Datos iniciales requeridos (knockout_phases y settings)

Estos se insertan automáticamente con `npm run seed-db`, pero si necesitas hacerlo manualmente:

```sql
-- Fases eliminatorias
INSERT INTO knockout_phases (stage, label, match_count) VALUES
  ('round_of_16',  'Dieciseisavos de Final', 16),
  ('round_of_8',   'Octavos de Final',         8),
  ('quarterfinal', 'Cuartos de Final',          4),
  ('semifinal',    'Semifinal',                 2),
  ('third_place',  'Tercer y Cuarto Puesto',    1),
  ('final',        'Final',                     1)
ON CONFLICT (stage) DO NOTHING;

-- Configuración: fecha límite de predicciones
INSERT INTO settings (key, value, description)
VALUES ('prediction_deadline', '2026-06-10T23:59:00', 'Fecha y hora límite para editar predicciones')
ON CONFLICT (key) DO NOTHING;
```

---

## Credenciales del Administrador por Defecto

Creadas automáticamente por `npm run seed-db`:

| Campo | Valor |
|-------|-------|
| Email | admin@polla2026.com |
| Password | Admin2026! |

> **Cambiar la contraseña del admin en producción** desde el panel de administración.

---

## Estructura del Proyecto

```
WorldCupPool/
├── public/                 # Frontend estático
│   ├── css/styles.css
│   ├── index.html
│   └── js/
│       ├── api.js          # Cliente HTTP
│       ├── app.js          # Inicialización y navegación
│       ├── auth.js         # Login y cambio de contraseña
│       ├── admin.js        # Panel de administración
│       ├── predictions.js  # Vista de predicciones
│       ├── groups.js       # Vista de grupos del mundial
│       ├── leaderboard.js  # Tabla de posiciones
│       └── profile.js      # Perfil de usuario
├── src/
│   ├── config/             # Configuración (DB, logger, env)
│   ├── controllers/        # Controladores de rutas
│   ├── middleware/         # Auth, errores, auditoría
│   ├── repositories/       # Acceso a datos
│   ├── routes/             # Definición de rutas
│   ├── scripts/            # Scripts de DB
│   └── server.js           # Punto de entrada
├── .env.example
├── package.json
└── DEPLOYMENT.md
```

---

## Despliegue en Producción (VPS/Cloud)

### Opción A: Servidor VPS (Ubuntu/Debian)

```bash
# 1. Instalar Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Instalar PostgreSQL 16
sudo apt-get install -y postgresql-16

# 3. Instalar PM2 (gestor de procesos)
npm install -g pm2

# 4. Clonar y configurar
git clone https://github.com/TU_USUARIO/WorldCupPool.git
cd WorldCupPool
npm install
cp .env.example .env
# Editar .env con los valores de producción

# 5. Configurar base de datos
sudo -u postgres createdb polla_mundial
npm run setup-db
node src/scripts/migrate-knockout-fix2.js
node src/scripts/migrate-knockout-phases-fix.js
npm run seed-db

# 6. Iniciar con PM2
pm2 start src/server.js --name "polla-mundial"
pm2 save
pm2 startup
```

### Opción B: Railway / Render / Heroku

1. Conectar el repositorio de GitHub
2. Configurar las variables de entorno en el panel de la plataforma
3. Agregar un addon de PostgreSQL
4. Configurar el comando de build: `npm install`
5. Configurar el comando de start: `npm start`

---

## Notas de Seguridad para Producción

1. Cambiar `JWT_SECRET` por una cadena aleatoria de al menos 64 caracteres
2. Cambiar la contraseña del administrador inmediatamente
3. Configurar `NODE_ENV=production`
4. Usar HTTPS (configurar un reverse proxy con Nginx + Let's Encrypt)
5. Configurar firewall para exponer solo los puertos 80 y 443
