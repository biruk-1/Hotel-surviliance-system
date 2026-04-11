'use strict';
/**
 * Integration-test environment helpers.
 *
 * Exports are kept backward-compatible with the original file so that existing
 * test files continue to work without any changes.
 *
 * Seeding / cleanup logic now lives in:
 *   tests/helpers/seed.js    — fixtures, individual seeders, factory functions
 *   tests/helpers/cleanup.js — truncateAll, deleteFrom, withIsolation, Jest helpers
 *
 * You can import from those modules directly, or use the unified entry-point:
 *   require('../helpers')    — re-exports everything
 */

const fs   = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { query, pool } = require('../../src/config/database');

// ── Re-exports from seed.js ───────────────────────────────────────────────────
const {
  IDS,
  EMAILS,
  PASSWORD,
  seedAll,
  seedBase,
  seedHotels,
  seedUsers,
  seedGuests,
  seedStays,
  seedBlacklist,
  seedAlerts,
  createHotel,
  createUser,
  createGuest,
  createStay,
  createBlacklistEntry,
  createAlert,
} = require('./seed');

// ── Re-exports from cleanup.js ────────────────────────────────────────────────
const {
  truncateAll,
  deleteFrom,
  deleteAll,
  withIsolation,
  beforeEachClean,
  afterEachClean,
  beforeAllClean,
  afterAllClean,
} = require('./cleanup');

// ── Integration env detection ─────────────────────────────────────────────────

const envTestPath = path.resolve(__dirname, '../../.env.test');

/** Returns true when a .env.test file exists, indicating the test DB is configured. */
function isIntegrationEnvConfigured() {
  return fs.existsSync(envTestPath);
}

// ── Schema management ─────────────────────────────────────────────────────────

async function hasHotelsTable() {
  const { rows } = await query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'hotels' LIMIT 1`
  );
  return rows.length > 0;
}

/**
 * Older test DBs may still require 005 (nullable hotel_id + global id_number unique).
 */
async function ensureBlacklistGlobalMigration() {
  if (!(await hasHotelsTable())) return;
  const { rows } = await query(
    `SELECT is_nullable FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'blacklist' AND column_name = 'hotel_id'
     LIMIT 1`
  );
  if (rows.length === 0 || rows[0].is_nullable === 'YES') return;
  const migPath = path.resolve(__dirname, '../../sql/migrations/005_blacklist_global.sql');
  await pool.query(fs.readFileSync(migPath, 'utf8'));
}

/**
 * Older test databases may lack columns added after the initial schema apply.
 */
async function ensureBlacklistPhoneCheckoutMigration() {
  if (!(await hasHotelsTable())) return;
  const { rows } = await query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'blacklist' AND column_name = 'phone'
     LIMIT 1`
  );
  if (rows.length > 0) return;
  const migPath = path.resolve(__dirname, '../../sql/migrations/006_blacklist_phone_checkout.sql');
  await pool.query(fs.readFileSync(migPath, 'utf8'));
}

/**
 * Ensure sql/schema.sql has been applied to the test database.
 *
 * Strategy:
 *   1. If the hotels table is missing, apply schema.sql (pool, then psql fallback).
 *   2. Always run lightweight migrations needed for older DBs (e.g. blacklist columns).
 */
async function ensureSchema() {
  if (!(await hasHotelsTable())) {
    const schemaPath = path.resolve(__dirname, '../../sql/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    const config = require('../../src/config');

    let poolErr = null;
    try {
      await pool.query(sql);
    } catch (e) {
      poolErr = e;
    }

    if (!(await hasHotelsTable())) {
      try {
        execFileSync(process.env.PSQL_PATH || 'psql', [
          '-v', 'ON_ERROR_STOP=1',
          '-h', config.db.host,
          '-p', String(config.db.port),
          '-U', config.db.user,
          '-d', config.db.name,
          '-f', schemaPath,
        ], {
          env: { ...process.env, PGPASSWORD: config.db.password },
          stdio: 'pipe',
        });
      } catch (psqlErr) {
        const hint = poolErr ? ` Pool error: ${poolErr.message}.` : '';
        throw new Error(
          `Test DB schema missing (public.hotels absent). Apply backend/sql/schema.sql to "${config.db.name}".${hint} psql: ${psqlErr.message}`
        );
      }
    }

    if (!(await hasHotelsTable())) {
      throw new Error('Schema apply did not create public.hotels. Check sql/schema.sql and DB permissions.');
    }
  }

  await ensureBlacklistGlobalMigration();
  await ensureBlacklistPhoneCheckoutMigration();
  await ensureAlertUserReadsMigration();
}

async function ensureAlertUserReadsMigration() {
  if (!(await hasHotelsTable())) return;
  const { rows } = await query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'alert_user_reads' LIMIT 1`
  );
  if (rows.length > 0) return;
  const migPath = path.resolve(__dirname, '../../sql/migrations/007_alert_user_reads.sql');
  await pool.query(fs.readFileSync(migPath, 'utf8'));
}

/**
 * Delete all rows from application tables in FK-safe order.
 * @deprecated Prefer cleanup.truncateAll() — it is faster (TRUNCATE vs DELETE)
 *             and has the same effect on a dedicated test database.
 */
async function resetDatabase() {
  await deleteFrom([
    'audit_logs', 'alert_user_reads', 'alerts', 'documents', 'blacklist',
    'stays', 'hotel_users', 'guests', 'users', 'hotels',
  ]);
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  // Fixture constants
  IDS,
  EMAILS,
  PASSWORD,

  // Composite seeders
  seedAll,
  seedBase,        // backward-compat alias → seedAll

  // Individual seeders
  seedHotels,
  seedUsers,
  seedGuests,
  seedStays,
  seedBlacklist,
  seedAlerts,

  // Factory functions
  createHotel,
  createUser,
  createGuest,
  createStay,
  createBlacklistEntry,
  createAlert,

  // Cleanup
  truncateAll,
  deleteFrom,
  deleteAll,
  resetDatabase,   // backward-compat alias → deleteAll in FK-safe order
  withIsolation,
  beforeEachClean,
  afterEachClean,
  beforeAllClean,
  afterAllClean,

  // Environment / schema helpers
  isIntegrationEnvConfigured,
  ensureSchema,
};
