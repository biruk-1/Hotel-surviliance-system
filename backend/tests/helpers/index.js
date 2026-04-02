'use strict';
/**
 * Unified helper entry-point for tests.
 *
 * Import everything from here rather than from individual helper files:
 *
 *   const {
 *     // seed
 *     IDS, EMAILS, PASSWORD,
 *     seedAll, seedHotels, seedUsers, seedGuests, seedStays, seedBlacklist, seedAlerts,
 *     createHotel, createUser, createGuest, createStay, createBlacklistEntry, createAlert,
 *
 *     // cleanup
 *     truncateAll, deleteFrom, deleteAll, withIsolation,
 *     beforeEachClean, afterEachClean, beforeAllClean, afterAllClean,
 *
 *     // integration env
 *     isIntegrationEnvConfigured, ensureSchema,
 *
 *     // app factory
 *     getTestApp,
 *   } = require('../helpers');
 */

module.exports = {
  ...require('./seed'),
  ...require('./cleanup'),
  ...require('./integrationDb'),
  ...require('./testApp'),
};
