/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js', '**/*.spec.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  globalTeardown: '<rootDir>/tests/teardown.js',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/socket/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30_000,
  verbose: true,
};
