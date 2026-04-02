/**
 * Express app factory for tests — no HTTP listen, no Socket.io bootstrap.
 * Use with supertest: request(getTestApp()).get('/api/health')
 */
function getTestApp() {
  return require('../../src/app');
}

module.exports = {
  getTestApp,
};
