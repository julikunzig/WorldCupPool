/**
 * @module logger
 * @description Configuración centralizada de logging con Winston.
 * Genera logs en consola (desarrollo) y archivos rotativos (producción).
 * Niveles: error > warn > info > http > debug
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const LOG_DIR = process.env.LOG_DIR || 'logs';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';

// ─── Formatos ────────────────────────────────────────────────────────────────

const timestampFormat = winston.format.timestamp({
  format: 'YYYY-MM-DD HH:mm:ss.SSS',
});

const consoleFormat = winston.format.combine(
  timestampFormat,
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

const fileFormat = winston.format.combine(
  timestampFormat,
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// ─── Transportes ─────────────────────────────────────────────────────────────

const transports = [];

// Consola siempre activa
transports.push(
  new winston.transports.Console({
    format: consoleFormat,
    silent: NODE_ENV === 'test',
  })
);

// Archivos rotativos solo fuera de test
if (NODE_ENV !== 'test') {
  // Log general (info+)
  transports.push(
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'info',
      format: fileFormat,
    })
  );

  // Log solo errores
  transports.push(
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '90d',
      level: 'error',
      format: fileFormat,
    })
  );

  // Log HTTP (acceso)
  transports.push(
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'http',
      format: fileFormat,
    })
  );
}

// ─── Instancia del logger ─────────────────────────────────────────────────────

const logger = winston.createLogger({
  level: NODE_ENV === 'development' ? 'debug' : LOG_LEVEL,
  levels: winston.config.npm.levels,
  transports,
  exitOnError: false,
});

// ─── Stream para Morgan (HTTP logging) ───────────────────────────────────────

logger.stream = {
  write: (message) => logger.http(message.trim()),
};

module.exports = logger;
