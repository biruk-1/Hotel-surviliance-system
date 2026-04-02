const { Pool } = require('pg');
const config = require('./index');
const logger = require('../utils/logger');

// Pool sizing for 400+ hotels:
// - Up to 40 server-side connections shared across requests.
// - Each hotel staff generates bursts; 40 covers ~400 hotels with light concurrency.
// - Raise DB_POOL_MAX in .env if you run multiple API processes (e.g. PM2 clusters),
//   but keep total ≤ PostgreSQL max_connections (usually 100–200 on a standard server).
const poolMax = parseInt(process.env.DB_POOL_MAX, 10);
const poolMin = parseInt(process.env.DB_POOL_MIN, 10);

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 40,
  min: Number.isFinite(poolMin) && poolMin >= 0 ? poolMin : 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Automatically return borrowed clients on statement timeout to avoid hangs.
  statement_timeout: 30000,
  query_timeout: 30000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', err);
});

pool.on('connect', () => {
  logger.info('New DB client connected to pool');
});

async function query(text, params) {
  return pool.query(text, params);
}

async function healthCheck() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    return true;
  } finally {
    client.release();
  }
}

async function closePool() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  healthCheck,
  closePool,
};
