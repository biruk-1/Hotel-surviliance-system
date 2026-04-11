#!/usr/bin/env node
/**
 * Applies blacklist-related migrations that older databases may be missing.
 * Idempotent: safe to run multiple times.
 *
 * - 005_blacklist_global.sql — nullable hotel_id, global id_number unique
 * - 006_blacklist_phone_checkout.sql — phone + checkout_date columns
 * - 007_alert_user_reads.sql — per-user seen state for alert badges
 *
 * Uses DB credentials from backend/.env (same as the API).
 * Run from backend/:  npm run migrate
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { pool, query } = require('../src/config/database');

async function tableExists(name) {
  const { rows } = await query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
    [name]
  );
  return rows.length > 0;
}

async function columnExists(table, column) {
  const { rows } = await query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2 LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function hotelIdIsNullableOnBlacklist() {
  const { rows } = await query(
    `SELECT is_nullable FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'blacklist' AND column_name = 'hotel_id'
     LIMIT 1`
  );
  return rows.length > 0 && rows[0].is_nullable === 'YES';
}

async function run() {
  if (!(await tableExists('blacklist'))) {
    // eslint-disable-next-line no-console
    console.log('Skip: public.blacklist does not exist (apply sql/schema.sql first).');
    return;
  }

  if (!(await hotelIdIsNullableOnBlacklist())) {
    const p = path.join(__dirname, '../sql/migrations/005_blacklist_global.sql');
    // eslint-disable-next-line no-console
    console.log('Applying', path.basename(p), '…');
    await query(fs.readFileSync(p, 'utf8'));
    // eslint-disable-next-line no-console
    console.log('OK: 005_blacklist_global.sql');
  } else {
    // eslint-disable-next-line no-console
    console.log('Skip: 005 already applied (blacklist.hotel_id is nullable).');
  }

  if (!(await columnExists('blacklist', 'phone'))) {
    const p = path.join(__dirname, '../sql/migrations/006_blacklist_phone_checkout.sql');
    // eslint-disable-next-line no-console
    console.log('Applying', path.basename(p), '…');
    await query(fs.readFileSync(p, 'utf8'));
    // eslint-disable-next-line no-console
    console.log('OK: 006_blacklist_phone_checkout.sql');
  } else {
    // eslint-disable-next-line no-console
    console.log('Skip: 006 already applied (blacklist.phone exists).');
  }

  if (!(await tableExists('alert_user_reads'))) {
    const p = path.join(__dirname, '../sql/migrations/007_alert_user_reads.sql');
    // eslint-disable-next-line no-console
    console.log('Applying', path.basename(p), '…');
    await query(fs.readFileSync(p, 'utf8'));
    // eslint-disable-next-line no-console
    console.log('OK: 007_alert_user_reads.sql');
  } else {
    // eslint-disable-next-line no-console
    console.log('Skip: 007 already applied (alert_user_reads exists).');
  }

  // eslint-disable-next-line no-console
  console.log('Done. Restart the API if it was running.');
}

run()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
