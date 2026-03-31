const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const REQUIRED_DB_VARS = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const REQUIRED_AUTH_VARS = ['JWT_SECRET'];

function validateEnv() {
  const missing = [...REQUIRED_DB_VARS, ...REQUIRED_AUTH_VARS].filter((key) => {
    const v = process.env[key];
    return v === undefined || v === '';
  });
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. Copy .env.example to .env and set values.`
    );
  }
}

validateEnv();

const port = parseInt(process.env.PORT, 10);
const dbPort = parseInt(process.env.DB_PORT, 10);

const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number.isFinite(port) && port > 0 ? port : 5000,
  db: {
    host: process.env.DB_HOST,
    port: Number.isFinite(dbPort) ? dbPort : 5432,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn,
  },
};
