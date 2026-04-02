/**
 * Global teardown: close the shared pg pool so Jest can exit cleanly.
 * Skips if config was never loaded (e.g. only unit tests and no `.env.test`).
 */
const REQUIRED_FOR_DB = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];

function databaseConfigLoaded() {
  return REQUIRED_FOR_DB.every((k) => process.env[k] != null && process.env[k] !== '');
}

module.exports = async function globalTeardown() {
  if (!databaseConfigLoaded()) return;
  try {
    const { closePool } = require('../src/config/database');
    await closePool();
  } catch {
    // Pool may already be ended.
  }
};
