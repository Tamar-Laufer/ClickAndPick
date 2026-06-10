'use strict';

/** Jest configuration for the backend integration tests (Node + Supertest). */
module.exports = {
  testEnvironment: 'node',
  // tests/setup.js boots an in-memory MongoDB and wires global hooks
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  // first run downloads the mongodb-memory-server binary — give it room
  testTimeout: 30000,
  // each suite manages its own DB lifecycle; run serially for a shared instance
  maxWorkers: 1,
  clearMocks: true,
};
