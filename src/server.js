/**
 * @module server
 * @description Servidor principal de la aplicación.
 * Configura Express, middleware, rutas y manejo de errores.
 */

require('./config/env');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const logger = require('./config/logger');
const { testConnection } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { captureClientInfo } = require('./middleware/audit');

// Rutas
const authRoutes = require('./routes/authRoutes');
const matchRoutes = require('./routes/matchRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const userRoutes = require('./routes/userRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

// ─── Configuración ────────────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ─── Middleware de seguridad ──────────────────────────────────────────────────

// Helmet: headers de seguridad HTTP
app.use(
  helmet({
    contentSecurityPolicy: false, // Desactivar para desarrollo, ajustar en producción
  })
);

// CORS: permitir peticiones desde el frontend
app.use(
  cors({
    origin: NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
    credentials: true,
  })
);

// Rate limiting: prevenir abuso
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: 'Demasiadas peticiones desde esta IP, intenta de nuevo más tarde',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Rate limiting más estricto para autenticación
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Demasiados intentos de login, intenta de nuevo más tarde',
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ─── Middleware general ───────────────────────────────────────────────────────

// Compresión de respuestas
app.use(compression());

// Parseo de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging HTTP con Morgan
app.use(morgan('combined', { stream: logger.stream }));

// Captura información del cliente para auditoría
app.use(captureClientInfo);

// ─── Archivos estáticos (frontend) ────────────────────────────────────────────

app.use(express.static(path.join(__dirname, '../public')));

// ─── Rutas de la API ──────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Polla Mundial 2026 API',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);

// ─── Ruta catch-all para SPA ──────────────────────────────────────────────────

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ─── Manejo de errores ────────────────────────────────────────────────────────

app.use(errorHandler);

// ─── Inicio del servidor ──────────────────────────────────────────────────────

const startServer = async () => {
  try {
    // Verificar conexión a base de datos
    logger.info('Verificando conexión a PostgreSQL...');
    const connected = await testConnection();
    if (!connected) {
      logger.error('No se pudo conectar a PostgreSQL. Abortando inicio.');
      process.exit(1);
    }

    // Iniciar servidor
    app.listen(PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║          🏆  POLLA MUNDIAL 2026  🏆                       ║
║                                                           ║
║  Servidor iniciado exitosamente                          ║
║  Entorno: ${NODE_ENV.padEnd(47)}║
║  Puerto: ${PORT.toString().padEnd(48)}║
║  URL: http://localhost:${PORT.toString().padEnd(36)}║
║                                                           ║
║  API Health: http://localhost:${PORT}/api/health${' '.repeat(17)}║
║  Logs: logs/app-*.log                                    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    logger.error('Error fatal al iniciar servidor', {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1);
  }
};

// ─── Manejo de señales de terminación ─────────────────────────────────────────

process.on('SIGTERM', () => {
  logger.info('SIGTERM recibido, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT recibido, cerrando servidor...');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesa rechazada no manejada', {
    reason,
    promise,
  });
});

process.on('uncaughtException', (err) => {
  logger.error('Excepción no capturada', {
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

// ─── Iniciar ──────────────────────────────────────────────────────────────────

startServer();
