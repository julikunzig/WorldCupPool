/**
 * @module env
 * @description Validación y carga de variables de entorno al inicio.
 * La aplicación falla rápido si faltan variables críticas.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const REQUIRED_VARS = [
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'JWT_SECRET',
];

const validateEnv = () => {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`[ENV] Variables de entorno faltantes: ${missing.join(', ')}`);
    console.error('[ENV] Copia .env.example a .env y completa los valores.');
    process.exit(1);
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.error('[ENV] JWT_SECRET debe tener al menos 32 caracteres.');
    process.exit(1);
  }
};

validateEnv();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT) || 3000,
  APP_NAME: process.env.APP_NAME || 'Polla Mundial 2026',
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  PREDICTION_DEADLINE: new Date(process.env.PREDICTION_DEADLINE || '2026-06-10T23:59:59'),
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@polla2026.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin2026!',
};
