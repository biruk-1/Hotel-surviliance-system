'use strict';
/**
 * Cleanup utilities for the test database.
 *
 * ONLY use against a dedicated test database (NODE_ENV=test, .env.test).
 * Never call these against production or staging databases.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * Quick reference
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Wipe everything:
 *   await truncateAll();
 *
 * Delete from specific tables (FK-safe order, skips missing tables):
 *   await deleteFrom(['alerts', 'stays', 'guests']);
 *
 * Wrap a block in a clean slate (truncates before + after):
 *   await withIsolation(async () => {
 *     await seedAll();
 *     // ... test logic ...
 *   });
 *
 * Per-test reset using Jest lifecycle helpers:
 *   describe('my suite', () => {
 *     beforeEachClean();   // truncateAll() before every test
 *     afterAllClean();     // truncateAll() once after the suite
 *     beforeEach(async () => { await seedAll(); });
 *     it('test 1', ...);
 *   });
 */

const { query } = require('../../src/config/database');

/**
 * Application tables in child-first (FK-safe) order.
 * TRUNCATE ... CASCADE handles any remaining FK references in a single round-trip.
 */
const ALL_TABLES = [
  'audit_logs',
  'alerts',
  'documents',
  'blacklist',
  'stays',
  'hotel_users',
  'guests',
  'users',
  'hotels',
];

/**
 * Truncate every application table.
 *
 * Uses a single TRUNCATE ... CASCADE statement for speed.
 * Falls back to per-table TRUNCATE CASCADE when any table is absent from the DB
 * (e.g. running against a schema variant that predates a migration).
 */
async function truncateAll() {
  try {
    await query(`TRUNCATE TABLE ${ALL_TABLES.join(', ')} CASCADE`);
  } catch (bulkErr) {
    if (bulkErr.code !== '42P01' /* undefined_table */) throw bulkErr;

    // One or more tables don't exist yet — truncate the ones that do.
    for (const table of ALL_TABLES) {
      try {
        await query(`TRUNCATE TABLE ${table} CASCADE`);
      } catch (tableErr) {
        if (tableErr.code !== '42P01') throw tableErr;
      }
    }
  }
}

/**
 * DELETE (not TRUNCATE) from the specified tables, in the given order.
 * Silently skips tables that don't exist in the DB (error code 42P01).
 *
 * Use this when you need targeted cleanup without touching unrelated tables.
 *
 * @param {string[]} tableNames  Table names in deletion order (children first).
 */
async function deleteFrom(tableNames) {
  for (const table of tableNames) {
    try {
      await query(`DELETE FROM ${table}`);
    } catch (err) {
      if (err.code !== '42P01') throw err;
    }
  }
}

/**
 * Delete from every application table in FK-safe order using DELETE statements.
 * Slower than truncateAll() but preserves serial sequences and is safer inside
 * a transaction if you ever need that.
 */
async function deleteAll() {
  await deleteFrom(ALL_TABLES);
}

/**
 * Run `fn` inside a clean-slate guarantee:
 *   1. Truncate all tables before `fn` runs.
 *   2. Run `fn`.
 *   3. Truncate all tables after `fn` finishes (even if it threw).
 *
 * Returns the value resolved by `fn`.
 *
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 *
 * @example
 * await withIsolation(async () => {
 *   await seedAll();
 *   const res = await request(app).get('/api/guests');
 *   expect(res.status).toBe(200);
 * });
 */
async function withIsolation(fn) {
  await truncateAll();
  try {
    return await fn();
  } finally {
    await truncateAll();
  }
}

// ── Jest lifecycle helpers ────────────────────────────────────────────────────
// Call these at the top level of a describe() block (not inside beforeEach/it).

/**
 * Register a Jest beforeEach() that calls truncateAll() before every test.
 *
 * @example
 * describe('isolated tests', () => {
 *   beforeEachClean();
 *   beforeEach(async () => { await seedAll(); });
 *   it('test A', ...);
 *   it('test B', ...);  // starts fresh even if test A wrote data
 * });
 */
function beforeEachClean() {
  beforeEach(async () => {
    await truncateAll();
  });
}

/**
 * Register a Jest afterEach() that calls truncateAll() after every test.
 * Pair with beforeEachClean() for full per-test isolation.
 */
function afterEachClean() {
  afterEach(async () => {
    await truncateAll();
  });
}

/**
 * Register a Jest beforeAll() that calls truncateAll() once before the suite.
 * Use this when the suite handles its own per-test seeding.
 */
function beforeAllClean() {
  beforeAll(async () => {
    await truncateAll();
  });
}

/**
 * Register a Jest afterAll() that calls truncateAll() once after the entire suite.
 * Pair with beforeAllClean() for suite-level isolation.
 */
function afterAllClean() {
  afterAll(async () => {
    await truncateAll();
  });
}

module.exports = {
  ALL_TABLES,
  truncateAll,
  deleteFrom,
  deleteAll,
  withIsolation,
  beforeEachClean,
  afterEachClean,
  beforeAllClean,
  afterAllClean,
};
