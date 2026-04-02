/**
 * Runs once per test file, after the test framework is installed.
 * Jest sets NODE_ENV=test before loading any module.
 *
 * Ensure app config loads `.env.test` (see src/config/index.js) with credentials
 * for a dedicated PostgreSQL database — never point tests at production.
 */
process.env.NODE_ENV = 'test';
