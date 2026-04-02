#!/usr/bin/env node
/**
 * HTTP load tests (autocannon) for GET /api/guests and POST /api/guests.
 *
 * Before running:
 *   1. Ensure backend/.env contains:
 *        PERF_SKIP_RATE_LIMIT=1     ← bypasses rate limiters on the server (dev only)
 *        PERF_EMAIL=police@hotel.com
 *        PERF_PASSWORD=your_password
 *        PERF_HOTEL_ID=<uuid>       ← auto-seeded if missing
 *   2. Restart the API server so it picks up PERF_SKIP_RATE_LIMIT=1.
 *   3. npm run perf
 *
 * See scripts/perf/README.md for full instructions.
 */
'use strict';

const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const autocannon = require('autocannon');

const BASE_URL = process.env.PERF_BASE_URL || `http://127.0.0.1:${process.env.PORT || 5001}`;
const CONNECTIONS = parseInt(process.env.PERF_CONNECTIONS || '100', 10);
/** POST /api/guests is write-heavy (transaction + audit + blacklist). Keep ≤ DB_POOL_MAX/2. */
const POST_CONNECTIONS = parseInt(process.env.PERF_POST_CONNECTIONS || '30', 10);
/** Per-request timeout in seconds for the POST scenario. */
const POST_TIMEOUT_SEC = parseInt(process.env.PERF_POST_TIMEOUT || '30', 10);
const DURATION = parseInt(process.env.PERF_DURATION || '10', 10);
const HOTEL_ID = process.env.PERF_HOTEL_ID || '11111111-1111-4111-8111-111111111111';
const PERF_EMAIL = process.env.PERF_EMAIL;
const PERF_PASSWORD = process.env.PERF_PASSWORD;

// ── Helpers ───────────────────────────────────────────────────────────────────

function httpRequest(url, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const lib = new URL(url).protocol === 'https:' ? https : http;
    const req = lib.request(
      url,
      {
        method,
        headers: {
          ...headers,
          ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let json;
          try {
            json = raw ? JSON.parse(raw) : {};
          } catch {
            json = { _raw: raw };
          }
          resolve({ statusCode: res.statusCode, body: json });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function login() {
  if (!PERF_EMAIL || !PERF_PASSWORD) {
    console.error(
      '\n[ERROR] Missing PERF_EMAIL or PERF_PASSWORD.\n' +
        'Add them to backend/.env (see scripts/perf/README.md) and restart the server.'
    );
    process.exit(1);
  }
  const res = await httpRequest(new URL('/api/auth/login', BASE_URL).href, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: PERF_EMAIL, password: PERF_PASSWORD }),
  });
  if (res.statusCode === 429) {
    console.error(
      '\n[ERROR] Login returned 429 (rate limited).\n' +
        'Set PERF_SKIP_RATE_LIMIT=1 in backend/.env and restart the server.'
    );
    process.exit(1);
  }
  if (res.statusCode !== 200 || !res.body.data?.token) {
    console.error(
      `\n[ERROR] Login failed (${res.statusCode}): ${JSON.stringify(res.body)}\n` +
        'Check PERF_EMAIL / PERF_PASSWORD in backend/.env — the user will be seeded by this script.'
    );
    process.exit(1);
  }
  return res.body.data.token;
}

/** Ensures the perf hotel and police user exist in the development database. */
async function seedPerfData() {
  // Lazy-require so dotenv has already run before the DB config validates env vars.
  const { pool } = require('../../src/config/database');
  const { hashPassword } = require('../../src/modules/auth/auth.service');

  console.log('Seeding perf test data (hotel + user)...');

  await pool.query(
    `INSERT INTO hotels (id, name, city, country)
     VALUES ($1, 'Perf Test Hotel', 'PerfCity', 'TestLand')
     ON CONFLICT (id) DO NOTHING`,
    [HOTEL_ID]
  );

  const pwdHash = await hashPassword(PERF_PASSWORD);
  await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, 'Perf Police User', 'police')
     ON CONFLICT (email) DO NOTHING`,
    [PERF_EMAIL, pwdHash]
  );

  console.log('  Hotel and police user ready.\n');
}

function printScenarioHeader(title) {
  console.log('\n' + '='.repeat(72));
  console.log(` ${title}`);
  console.log('='.repeat(72));
}

/**
 * @param {string} label
 * @param {import('autocannon').Result} result
 */
function printMetrics(label, result) {
  const total = result.requests?.total ?? 0;
  const non2xx = result.non2xx ?? 0;
  const ok = total - non2xx;
  const errRate = total > 0 ? (non2xx / total) * 100 : 0;
  const lat = result.latency ?? {};
  const thr = result.throughput ?? {};

  console.log(`  Label:              ${label}`);
  console.log(`  Duration (s):       ${result.duration}`);
  console.log(`  Connections:        ${result.connections}`);
  console.log(`  Total requests:     ${total}`);
  console.log(`  2xx responses:      ${ok}`);
  console.log(`  Non-2xx:            ${non2xx}  (${errRate.toFixed(2)}% error rate)`);
  console.log(`  Timeouts:           ${result.timeouts ?? 0}`);
  console.log(`  Errors:             ${result.errors ?? 0}  (connection/parsing)`);
  console.log(`  Latency avg (ms):   ${(lat.mean ?? 0).toFixed(2)}`);
  console.log(`  Latency p50 (ms):   ${(lat.p50 ?? 0).toFixed(2)}`);
  console.log(`  Latency p99 (ms):   ${(lat.p99 ?? 0).toFixed(2)}`);
  console.log(`  Throughput (req/s): ${(result.requests?.average ?? 0).toFixed(2)}`);
  console.log(`  Throughput (MB/s):  ${((thr.mean ?? 0) / (1024 * 1024)).toFixed(3)}`);

  if (lat.p50 > 0 && (lat.p99 ?? 0) / lat.p50 >= 20) {
    console.log('  Note: high p99 vs p50 ratio — investigate tail latency under load.');
  }

  return {
    total,
    non2xx,
    errRate,
    connectionErrors: result.errors ?? 0,
    timeouts: result.timeouts ?? 0,
  };
}

function assertHealthy(metrics, label) {
  if (metrics.total < 1) {
    console.error(
      `\n[FAIL] ${label}: no requests completed (total=0).\n` +
        '  Possible causes:\n' +
        '  • Server not running — start with: npm run dev\n' +
        '  • PERF_SKIP_RATE_LIMIT=1 not in .env / server not restarted\n' +
        '  • DB pool exhausted — increase DB_POOL_MAX or lower PERF_POST_CONNECTIONS'
    );
    return false;
  }
  if (metrics.connectionErrors > 0) {
    console.error(
      `\n[FAIL] ${label}: ${metrics.connectionErrors} connection error(s) — server may be crashing under load.`
    );
    return false;
  }
  if (metrics.errRate > 5) {
    console.error(
      `\n[FAIL] ${label}: error rate ${metrics.errRate.toFixed(2)}% exceeds 5% threshold.`
    );
    return false;
  }
  return true;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Hotel Surveillance API — load test (autocannon)');
  console.log(`Base URL:       ${BASE_URL}`);
  console.log(
    `GET:            ${CONNECTIONS} connections, ${DURATION}s\n` +
      `POST:           ${POST_CONNECTIONS} connections, ${DURATION}s, ${POST_TIMEOUT_SEC}s per-request timeout\n` +
      `Hotel ID:       ${HOTEL_ID}`
  );

  if (process.env.PERF_SKIP_RATE_LIMIT === '1') {
    console.log('Rate limiters:  BYPASSED (PERF_SKIP_RATE_LIMIT=1 — dev only).');
  } else {
    console.log(
      'Rate limiters:  ACTIVE — add PERF_SKIP_RATE_LIMIT=1 to .env and restart the server.'
    );
  }
  console.log('');

  // Seed required data (hotel + police user) into the dev database.
  await seedPerfData();

  // Authenticate once; share the token across both scenarios.
  const token = await login();
  const authHeader = { Authorization: `Bearer ${token}` };
  console.log('Authenticated successfully.\n');

  // ── Scenario 1: GET /api/guests ──────────────────────────────────────────
  const getMetrics = await new Promise((resolve) => {
    printScenarioHeader(`GET /api/guests (${CONNECTIONS} concurrent, ${DURATION}s)`);
    const instance = autocannon(
      {
        url: `${BASE_URL}/api/guests`,
        method: 'GET',
        connections: CONNECTIONS,
        duration: DURATION,
        headers: authHeader,
      },
      (err, result) => {
        if (err) { console.error('autocannon error:', err); process.exit(1); }
        resolve(
          printMetrics(`GET /api/guests (${CONNECTIONS} concurrent, ${DURATION}s)`, result)
        );
      }
    );
    autocannon.track(instance, { renderProgressBar: false });
  });

  // ── Scenario 2: POST /api/guests ─────────────────────────────────────────
  // Uses a fixed body — guests.id_number has no UNIQUE constraint, so duplicates are fine.
  // This avoids the autocannon idReplacement Content-Length mismatch bug.
  const postBody = JSON.stringify({
    fullName: 'Load Test Guest',
    idNumber: 'PERF-LOAD-TEST-001',
    hotelId: HOTEL_ID,
    checkIn: new Date().toISOString(),
  });

  const postMetrics = await new Promise((resolve) => {
    const label = `POST /api/guests (${POST_CONNECTIONS} concurrent, ${DURATION}s, ${POST_TIMEOUT_SEC}s timeout)`;
    printScenarioHeader(label);
    const instance = autocannon(
      {
        url: `${BASE_URL}/api/guests`,
        method: 'POST',
        connections: POST_CONNECTIONS,
        duration: DURATION,
        timeout: POST_TIMEOUT_SEC,
        headers: {
          ...authHeader,
          'content-type': 'application/json',
        },
        body: postBody,
      },
      (err, result) => {
        if (err) { console.error('autocannon error:', err); process.exit(1); }
        resolve(printMetrics(label, result));
      }
    );
    autocannon.track(instance, { renderProgressBar: false });
  });

  const okGet = assertHealthy(getMetrics, 'GET /api/guests');
  const okPost = assertHealthy(postMetrics, 'POST /api/guests');

  // Close the DB pool opened by seedPerfData.
  try {
    const { closePool } = require('../../src/config/database');
    await closePool();
  } catch {
    // Pool may never have been created (e.g. seed skipped silently).
  }

  if (okGet && okPost) {
    console.log('\n' + '='.repeat(72));
    console.log(' Performace testing correctly passed');
    console.log('='.repeat(72) + '\n');
    process.exit(0);
  }

  console.error('\nLoad test finished with failing thresholds. See details above.\n');
  process.exit(1);
}

main().catch((e) => {
  console.error('[FATAL]', e);
  process.exit(1);
});
