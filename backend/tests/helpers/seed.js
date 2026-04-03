'use strict';
/**
 * Seed module — test fixtures and factory functions.
 *
 * Usage patterns
 * ──────────────
 * 1. Full suite (beforeAll):
 *      const { truncateAll } = require('./cleanup');
 *      const { seedAll } = require('./seed');
 *      beforeAll(async () => { await truncateAll(); await seedAll(); });
 *      afterAll(async  () => { await truncateAll(); });
 *
 * 2. Per-test isolation (beforeEach):
 *      const { beforeEachClean } = require('./cleanup');
 *      const { seedAll } = require('./seed');
 *      beforeEachClean();   // truncates before every test
 *      beforeEach(async () => { await seedAll(); });
 *
 * 3. One-off entities (factory functions):
 *      const { createHotel, createUser, createGuest } = require('./seed');
 *      const hotel = await createHotel({ name: 'Special Hotel' });
 *      const user  = await createUser({ role: 'police', hotelId: hotel.id });
 */

const { query } = require('../../src/config/database');
const { hashPassword } = require('../../src/modules/auth/auth.service');

// ── Fixture identifiers ───────────────────────────────────────────────────────
// All IDs are valid UUID v4 (version nibble = 4, variant bits = 8x).
// They are fixed so tests can reference them by name without database round-trips.

const IDS = {
  // Hotels
  hotelA:      '11111111-1111-4111-8111-111111111111',
  hotelB:      '22222222-2222-4222-8222-222222222222',

  // Users
  admin:       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  police:      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  hotelUserA:  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  hotelUserB:  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',

  // Guests
  guest1:      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',  // checked in at hotelA
  guest2:      'f0f0f0f0-f0f0-4f0f-8f0f-f0f0f0f0f0f0',  // checked in at hotelB
  guest3:      'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1',  // name+DOB matches blacklistA

  // Stays
  stay1:       'ffffffff-ffff-4fff-8fff-ffffffffffff',  // guest1 @ hotelA (active)
  stay2:       'e0e0e0e0-e0e0-4e0e-8e0e-e0e0e0e0e0e0',  // guest2 @ hotelB (active)

  // Alerts
  alert1:      '99999999-9999-4999-8999-999999999999',  // warning at hotelA

  // Blacklist entries
  blacklistA:  '88888888-8888-4888-8888-888888888888',  // hotelA entry — name+DOB matches guest3
  blacklistB:  '77777777-7777-4777-8777-777777777777',  // hotelB entry
};

const EMAILS = {
  admin:   'admin@api-integration.test',
  police:  'police@api-integration.test',
  hotelA:  'hotel-a@api-integration.test',
  hotelB:  'hotel-b@api-integration.test',
};

/** Password used for all seeded users. */
const PASSWORD = 'TestPass123';

// ── Individual seeders ────────────────────────────────────────────────────────
// Each function is idempotent (ON CONFLICT DO NOTHING) so they can safely be
// called on a DB that already has some of the fixture rows.

async function seedHotels() {
  await query(
    `INSERT INTO hotels (id, name, city, country)
     VALUES ($1, 'Integration Hotel A', 'CityA', 'TestLand'),
            ($2, 'Integration Hotel B', 'CityB', 'TestLand')
     ON CONFLICT (id) DO NOTHING`,
    [IDS.hotelA, IDS.hotelB]
  );
}

/** @param {string} [pwdHash]  pre-computed bcrypt hash; computed from PASSWORD when omitted */
async function seedUsers(pwdHash) {
  const hash = pwdHash ?? (await hashPassword(PASSWORD));

  // $9 is reused as the password_hash placeholder for all four rows.
  await query(
    `INSERT INTO users (id, email, password_hash, full_name, role) VALUES
       ($1, $2, $9, 'Admin User',    'admin'),
       ($3, $4, $9, 'Police User',   'police'),
       ($5, $6, $9, 'Hotel Staff A', 'hotel'),
       ($7, $8, $9, 'Hotel Staff B', 'hotel')
     ON CONFLICT (id) DO NOTHING`,
    [
      IDS.admin,     EMAILS.admin,
      IDS.police,    EMAILS.police,
      IDS.hotelUserA, EMAILS.hotelA,
      IDS.hotelUserB, EMAILS.hotelB,
      hash,
    ]
  );

  await query(
    `INSERT INTO hotel_users (user_id, hotel_id) VALUES ($1, $2), ($3, $4)
     ON CONFLICT ON CONSTRAINT hotel_users_user_hotel_uniq DO NOTHING`,
    [IDS.hotelUserA, IDS.hotelA, IDS.hotelUserB, IDS.hotelB]
  );
}

async function seedGuests() {
  await query(
    `INSERT INTO guests (id, full_name, id_number, date_of_birth, notes) VALUES
       ($1, 'Seeded Guest One',  'ID-SEED-001', '1990-05-15', NULL),
       ($2, 'Seeded Guest Two',  'ID-SEED-002', '1985-08-20', NULL),
       ($3, 'Blacklist Suspect', 'ID-SEED-003', '1978-03-10', 'name+DOB matches blacklistA')
     ON CONFLICT (id) DO NOTHING`,
    [IDS.guest1, IDS.guest2, IDS.guest3]
  );
}

async function seedStays() {
  // $7 = IDS.police used as created_by_user_id for both rows.
  await query(
    `INSERT INTO stays (id, guest_id, hotel_id, created_by_user_id, check_in, check_out, room_number, status) VALUES
       ($1, $2, $3, $7, NOW() - INTERVAL '2 days', NULL,                         '101', 'active'),
       ($4, $5, $6, $7, NOW() - INTERVAL '1 day',  NOW() + INTERVAL '3 days',    '202', 'active')
     ON CONFLICT (id) DO NOTHING`,
    [
      IDS.stay1, IDS.guest1, IDS.hotelA,
      IDS.stay2, IDS.guest2, IDS.hotelB,
      IDS.police,
    ]
  );
}

async function seedBlacklist() {
  // blacklistA: name+DOB matches guest3 so a check-in of guest3 would trigger an alert.
  await query(
    `INSERT INTO blacklist (id, hotel_id, full_name, id_number, date_of_birth, reason, created_by_user_id) VALUES
       ($1, $2, 'Blacklist Suspect', 'BL-001', '1978-03-10', 'Theft — confirmed',    $5),
       ($3, $4, 'Jane Banned',       'BL-002', '1992-11-25', 'Disturbance on site',  $5)
     ON CONFLICT (id) DO NOTHING`,
    [
      IDS.blacklistA, IDS.hotelA,
      IDS.blacklistB, IDS.hotelB,
      IDS.police,
    ]
  );
}

async function seedAlerts() {
  await query(
    `INSERT INTO alerts (id, hotel_id, stay_id, guest_id, created_by_user_id, severity, title, message) VALUES
       ($1, $2, $3, $4, $5, 'warning', 'Seeded alert', 'Review this guest''s history')
     ON CONFLICT (id) DO NOTHING`,
    [IDS.alert1, IDS.hotelA, IDS.stay1, IDS.guest1, IDS.police]
  );
}

// ── Composite seeders ─────────────────────────────────────────────────────────

/**
 * Seed the full standard fixture set in dependency order:
 *   hotels → users → guests → stays → blacklist → alerts
 *
 * Idempotent — safe to call multiple times on the same database.
 * Call cleanup.truncateAll() before this if you need a truly clean slate.
 */
async function seedAll() {
  const pwdHash = await hashPassword(PASSWORD);
  await seedHotels();
  await seedUsers(pwdHash);
  await seedGuests();
  await seedStays();
  await seedBlacklist();
  await seedAlerts();
}

// ── Factory functions — create one-off rows with optional overrides ───────────
// Factories use gen_random_uuid() / JS-generated defaults so concurrent calls
// never collide on unique constraints.

/**
 * Insert one hotel row and return it.
 * @param {Partial<{id:string, name:string, city:string, country:string}>} [overrides]
 * @returns {Promise<object>}
 */
async function createHotel(overrides = {}) {
  const { rows } = await query(
    `INSERT INTO hotels (id, name, city, country)
     VALUES (
       COALESCE($1::uuid, gen_random_uuid()),
       COALESCE($2, 'Factory Hotel'),
       COALESCE($3, 'FactoryCity'),
       COALESCE($4, 'FactoryLand')
     ) RETURNING *`,
    [
      overrides.id    ?? null,
      overrides.name  ?? null,
      overrides.city  ?? null,
      overrides.country ?? null,
    ]
  );
  return rows[0];
}

/**
 * Insert one user row (and optional hotel membership) and return it.
 * @param {Partial<{
 *   id:string, email:string, password:string,
 *   fullName:string, role:string, hotelId:string
 * }>} [overrides]
 * @returns {Promise<object>}
 */
async function createUser(overrides = {}) {
  const email = overrides.email
    ?? `user-${Date.now()}-${Math.random().toString(36).slice(2)}@factory.test`;
  const pwdHash = await hashPassword(overrides.password ?? PASSWORD);

  const { rows } = await query(
    `INSERT INTO users (id, email, password_hash, full_name, role)
     VALUES (
       COALESCE($1::uuid, gen_random_uuid()),
       $2,
       $3,
       COALESCE($4, 'Factory User'),
       COALESCE($5, 'hotel')
     ) RETURNING *`,
    [
      overrides.id       ?? null,
      email,
      pwdHash,
      overrides.fullName ?? null,
      overrides.role     ?? null,
    ]
  );

  const user = rows[0];

  if (overrides.hotelId) {
    await query(
      `INSERT INTO hotel_users (user_id, hotel_id)
       VALUES ($1, $2)
       ON CONFLICT ON CONSTRAINT hotel_users_user_hotel_uniq DO NOTHING`,
      [user.id, overrides.hotelId]
    );
  }

  return user;
}

/**
 * Insert one guest row and return it.
 * @param {Partial<{
 *   id:string, fullName:string, idNumber:string,
 *   dateOfBirth:string, phone:string, email:string, notes:string
 * }>} [overrides]
 * @returns {Promise<object>}
 */
async function createGuest(overrides = {}) {
  const idNumber = overrides.idNumber
    ?? `FAC-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const { rows } = await query(
    `INSERT INTO guests (id, full_name, id_number, date_of_birth, phone, email, notes)
     VALUES (
       COALESCE($1::uuid, gen_random_uuid()),
       COALESCE($2, 'Factory Guest'),
       $3,
       $4::date,
       $5,
       $6,
       $7
     ) RETURNING *`,
    [
      overrides.id          ?? null,
      overrides.fullName    ?? null,
      idNumber,
      overrides.dateOfBirth ?? null,
      overrides.phone       ?? null,
      overrides.email       ?? null,
      overrides.notes       ?? null,
    ]
  );
  return rows[0];
}

/**
 * Insert one stay row and return it.
 * @param {{guestId: string, hotelId: string} & Partial<{
 *   id:string, createdByUserId:string, checkIn:string,
 *   checkOut:string, roomNumber:string, status:string
 * }>} overrides
 * @returns {Promise<object>}
 */
async function createStay(overrides = {}) {
  if (!overrides.guestId) throw new TypeError('createStay: guestId is required');
  if (!overrides.hotelId) throw new TypeError('createStay: hotelId is required');

  const { rows } = await query(
    `INSERT INTO stays (id, guest_id, hotel_id, created_by_user_id, check_in, check_out, room_number, status)
     VALUES (
       COALESCE($1::uuid, gen_random_uuid()),
       $2::uuid,
       $3::uuid,
       $4::uuid,
       COALESCE($5::timestamptz, NOW()),
       $6::timestamptz,
       $7,
       COALESCE($8, 'active')
     ) RETURNING *`,
    [
      overrides.id              ?? null,
      overrides.guestId,
      overrides.hotelId,
      overrides.createdByUserId ?? null,
      overrides.checkIn         ?? null,
      overrides.checkOut        ?? null,
      overrides.roomNumber      ?? null,
      overrides.status          ?? null,
    ]
  );
  return rows[0];
}

/**
 * Insert one blacklist entry and return it.
 * @param {Partial<{
 *   id:string, hotelId:string|null, fullName:string, idNumber:string,
 *   dateOfBirth:string, reason:string, createdByUserId:string
 * }>} overrides
 * @returns {Promise<object>}
 */
async function createBlacklistEntry(overrides = {}) {
  const idNumber = overrides.idNumber
    ?? `BL-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const { rows } = await query(
    `INSERT INTO blacklist (id, hotel_id, full_name, id_number, date_of_birth, reason, created_by_user_id)
     VALUES (
       COALESCE($1::uuid, gen_random_uuid()),
       $2::uuid,
       COALESCE($3, 'Blacklisted Person'),
       $4,
       $5::date,
       $6,
       $7::uuid
     ) RETURNING *`,
    [
      overrides.id              ?? null,
      overrides.hotelId       ?? null,
      overrides.fullName        ?? null,
      idNumber,
      overrides.dateOfBirth     ?? null,
      overrides.reason          ?? null,
      overrides.createdByUserId ?? null,
    ]
  );
  return rows[0];
}

/**
 * Insert one alert and return it.
 * @param {{hotelId: string} & Partial<{
 *   id:string, stayId:string, guestId:string, createdByUserId:string,
 *   severity:string, title:string, message:string
 * }>} overrides
 * @returns {Promise<object>}
 */
async function createAlert(overrides = {}) {
  if (!overrides.hotelId) throw new TypeError('createAlert: hotelId is required');

  const { rows } = await query(
    `INSERT INTO alerts (id, hotel_id, stay_id, guest_id, created_by_user_id, severity, title, message)
     VALUES (
       COALESCE($1::uuid, gen_random_uuid()),
       $2::uuid,
       $3::uuid,
       $4::uuid,
       $5::uuid,
       COALESCE($6, 'info'),
       COALESCE($7, 'Factory Alert'),
       COALESCE($8, 'Created by test factory')
     ) RETURNING *`,
    [
      overrides.id              ?? null,
      overrides.hotelId,
      overrides.stayId          ?? null,
      overrides.guestId         ?? null,
      overrides.createdByUserId ?? null,
      overrides.severity        ?? null,
      overrides.title           ?? null,
      overrides.message         ?? null,
    ]
  );
  return rows[0];
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  // Constants
  IDS,
  EMAILS,
  PASSWORD,

  // Individual seeders (run in isolation for targeted setup)
  seedHotels,
  seedUsers,
  seedGuests,
  seedStays,
  seedBlacklist,
  seedAlerts,

  // Composite seeder
  seedAll,
  /** @deprecated use seedAll — kept for backward compatibility */
  seedBase: seedAll,

  // Factories (create one-off entities for specific test scenarios)
  createHotel,
  createUser,
  createGuest,
  createStay,
  createBlacklistEntry,
  createAlert,
};
