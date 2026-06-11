'use strict';

/**
 * Global test setup (runs before every test file).
 *
 *  - Provides the env the app needs (JWT secret) WITHOUT touching the real .env.
 *  - Spins up an in-memory MongoDB so tests hit a real Mongoose layer but never
 *    a real database — fast, isolated, and safe to wipe between tests.
 *  - Silences the winston logger so the test output stays readable.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '7d';

// Use the database package's Mongoose instance — the one the models are
// registered on — so test operations don't buffer against a second, unconnected
// copy. (The models resolve mongoose from database/node_modules.)
const { mongoose } = require('../../database/db');
const { MongoMemoryServer } = require('mongodb-memory-server');

// silence winston (console + file transports) for clean, fast test runs
const logger = require('../utils/logger');
logger.silent = true;

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

// full isolation: empty every collection after each test
afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
