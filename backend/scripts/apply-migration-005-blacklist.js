#!/usr/bin/env node
/**
 * Applies sql/migrations/005_blacklist_global.sql using DB credentials from .env
 * (same as the API). Run from backend/:  npm run migrate:blacklist
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { pool, query } = require('../src/config/database');

async function run() {
  const sqlPath = path.join(__dirname, '../sql/migrations/005_blacklist_global.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await query(sql);
  // eslint-disable-next-line no-console
  console.log('OK: Applied 005_blacklist_global.sql (global blacklist, nullable hotel_id).');
}

run()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
