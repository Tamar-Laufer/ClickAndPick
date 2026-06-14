'use strict';

module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 60000,
  maxWorkers: 1,
  clearMocks: true,
};
