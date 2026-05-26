# 🏆 Polla Mundial 2026

Aplicación web completa para hacer predicciones del Mundial 2026 y competir con amigos.

## 📋 Características

### Para Usuarios
- ✅ Registro y autenticación segura (JWT + bcrypt)
- ⚽ Hacer predicciones de todos los partidos del torneo
- 📅 Editar predicciones hasta el 10 de junio de 2026
- 🏆 Ver tabla de posiciones en tiempo real
- 📊 Ver estadísticas personales
- 👤 Gestión de perfil y cambio de contraseña

### Para Administradores
- 📝 Registrar marcadores reales de los partidos
- 🎯 Cálculo automático de puntos para todos los usuarios
- 👥 Ver todos los usuarios registrados
- 📈 Ver predicciones de todos los usuarios

### Sistema de Puntos
- **2 puntos** por acertar ganador o empate
- **1 punto adicional** por acertar el marcador exacto
- **0 puntos** si no aciertas el resultado

## 🛠️ Stack Tecnológico

### Backend
- **Node.js** + **Express** - Servidor y API REST
- **PostgreSQL** - Base de datos relacional
- **JWT** - Autenticación
- **bcrypt** - Hash de contraseñas
- **Winston** - Sistema de logging (bitácora)
- **Helmet** - Seguridad HTTP
- **Rate Limiting** - Protección contra abuso

### Frontend
- **HTML5** + **CSS3** + **JavaScript Vanilla**
- **Diseño Mobile-First** - 100% responsive
- **CSS Grid** + **Flexbox**
- Sin frameworks - Rápido y ligero

## 🚀 Instalación y Configuración

### Requisitos Previos
- Node.js 16+ 
- PostgreSQL 12+
- npm o yarn

### Paso 1: Clonar e Instalar Dependencias

```bash
# Instalar dependencias
npm install
```

### Paso 2: Configurar PostgreSQL

1. Crear la base de datos:
```sql
CREATE DATABASE polla_mundial;
```

2. Crear un usuario (opcional):
```sql
CREATE USER polla_user WITH PASSWORD 'tu_password';
GRANT ALL PRIVILEGES ON DATABASE polla_mundial TO polla_user;
```

### Paso 3: Configurar Variables de Entorno

1. Copiar el archivo de ejemplo:
```bash
cp .env.example .env
```

2. Editar `.env` con tus valores:
```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=polla_mundial
DB_USER=postgres
DB_PASSWORD=tu_password_aqui

# JWT (cambiar en producción)
JWT_SECRET=tu_clave_secreta_muy_larga_y_segura_minimo_32_caracteres

# Admin por defecto
ADMIN_EMAIL=admin@polla2026.com
ADMIN_PASSWORD=Admin2026!

# Fecha límite para predicciones
PREDICTION_DEADLINE=2026-06-10T23:59:59
```

### Paso 4: Crear Tablas y Datos Iniciales

```bash
# Crear todas las tablas
npm run setup-db

# Cargar grupos, equipos, partidos y usuario admin
npm run seed-db
```

### Paso 5: Iniciar el Servidor

```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm start
```

La aplicación estará disponible en: **http://localhost:3000**

## 📱 Uso de la Aplicación

### Primera Vez

1. Abre http://localhost:3000 en tu navegador
2. Regístrate con tu información
3. Inicia sesión
4. Comienza a hacer tus predicciones

### Usuario Administrador

**Credenciales por defecto:**
- Email: `admin@polla2026.com`
- Password: `Admin2026!`

**⚠️ IMPORTANTE:** Cambia estas credenciales en producción editando el archivo `.env`

### Hacer Predicciones

1. Ve a la pestaña "Predicciones"
2. Ingresa los marcadores que crees que tendrá cada partido
3. Haz clic en "Guardar Predicción"
4. Puedes editar tus predicciones hasta el 10 de junio de 2026

### Ver Tabla de Posiciones

1. Ve a la pestaña "Tabla"
2. Verás tu posición y la de todos los usuarios
3. Se actualiza automáticamente cuando el admin registra resultados

### Panel de Administración

1. Inicia sesión como admin
2. Ve a la pestaña "Admin"
3. Ingresa los marcadores reales de los partidos
4. El sistema calculará automáticamente los puntos de todos

## 📂 Estructura del Proyecto

```
polla-mundial-2026/
├── src/
│   ├── config/           # Configuración (DB, logger, env)
│   ├── controllers/      # Controladores de rutas
│   ├── middleware/       # Middleware (auth, errors, audit)
│   ├── repositories/     # Capa de acceso a datos
│   ├── routes/           # Definición de rutas
│   ├── services/         # Lógica de negocio
│   ├── scripts/          # Scripts de setup y seed
│   ├── utils/            # Utilidades (validators, jwt, errors)
│   └── server.js         # Servidor principal
├── public/
│   ├── css/
│   │   └── styles.css    # Estilos responsive
│   ├── js/
│   │   ├── api.js        # Cliente API
│   │   ├── auth.js       # Autenticación
│   │   ├── predictions.js # Vista predicciones
│   │   ├── leaderboard.js # Vista tabla
│   │   ├── profile.js    # Vista perfil
│   │   ├── admin.js      # Vista admin
│   │   └── app.js        # App principal
│   └── index.html        # HTML principal
├── logs/                 # Logs de la aplicación
├── .env                  # Variables de entorno (no subir a git)
├── .env.example          # Ejemplo de variables
├── package.json
└── README.md
```

## 🔒 Seguridad

- ✅ Contraseñas hasheadas con bcrypt (10 rounds)
- ✅ Autenticación JWT con expiración
- ✅ Rate limiting en endpoints sensibles
- ✅ Helmet para headers de seguridad HTTP
- ✅ Validación de inputs en frontend y backend
- ✅ Queries parametrizadas (prevención SQL injection)
- ✅ CORS configurado
- ✅ Bitácora de auditoría completa

## 📊 Base de Datos

### Tablas Principales

- **users** - Usuarios del sistema
- **groups** - Grupos del torneo (A-L)
- **teams** - Selecciones participantes
- **matches** - Partidos del torneo
- **predictions** - Predicciones de usuarios
- **audit_log** - Bitácora de auditoría

### Diagrama de Relaciones

```
users (1) ──── (N) predictions (N) ──── (1) matches
                                              │
                                              ├── (1) groups
                                              ├── (1) teams (home)
                                              └── (1) teams (away)
```

## 📝 Logs y Bitácora

Los logs se guardan en la carpeta `logs/`:

- **app-YYYY-MM-DD.log** - Log general de la aplicación
- **error-YYYY-MM-DD.log** - Solo errores
- **http-YYYY-MM-DD.log** - Peticiones HTTP

La tabla `audit_log` registra:
- Registros y logins
- Creación/actualización de predicciones
- Registro de marcadores reales por admin
- Cambios de contraseña

## 🌐 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/profile` - Obtener perfil
- `POST /api/auth/change-password` - Cambiar contraseña

### Partidos
- `GET /api/matches` - Listar todos los partidos
- `GET /api/matches/:id` - Obtener un partido
- `PUT /api/matches/:id/score` - Registrar marcador real (admin)

### Predicciones
- `GET /api/predictions/my` - Mis predicciones
- `POST /api/predictions` - Crear predicción
- `PUT /api/predictions/:id` - Actualizar predicción
- `GET /api/predictions/leaderboard` - Tabla de posiciones

### Usuarios (Admin)
- `GET /api/users` - Listar usuarios
- `GET /api/users/:id` - Obtener usuario
- `PUT /api/users/:id/deactivate` - Desactivar usuario

## 🎨 Responsive Design

La aplicación está optimizada para:
- 📱 **Móviles** (320px+)
- 📱 **Tablets** (640px+)
- 💻 **Desktop** (1024px+)

Diseño mobile-first con CSS Grid y Flexbox.

## 🐛 Troubleshooting

### Error: "No se pudo conectar a PostgreSQL"
- Verifica que PostgreSQL esté corriendo
- Revisa las credenciales en `.env`
- Asegúrate de que la base de datos existe

### Error: "JWT_SECRET debe tener al menos 32 caracteres"
- Edita `.env` y pon una clave más larga en `JWT_SECRET`

### Los logs no se crean
- Verifica permisos de escritura en la carpeta del proyecto
- La carpeta `logs/` se crea automáticamente

### No puedo editar predicciones
- Verifica que no haya pasado la fecha límite (10 junio 2026)
- Verifica que el partido no haya comenzado

## 📄 Licencia

Este proyecto es de código abierto para fines educativos.

## 👨‍💻 Autor

Desarrollado con ❤️ para la Polla Mundial 2026

---

**¡Buena suerte con tus predicciones! 🏆⚽**
