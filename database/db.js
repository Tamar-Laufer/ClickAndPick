'use strict';

const mongoose = require('mongoose');
const logger = require('../server/utils/logger');


async function connectMongo() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/click_and_pick';

  mongoose.set('strictQuery', true);

  mongoose.connection.on('error', (err) => logger.error(`MongoDB error: ${err.message}`));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    });
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }

  await Promise.all([
    require('./models/User').syncIndexes(),
    require('./models/Item').syncIndexes(),
    require('./models/Booking').syncIndexes(),
    require('./models/Category').syncIndexes(), // אינדקס ייחודי על Category.value
  ]).catch((err) => logger.error(`Index sync failed: ${err.message}`));

  return mongoose.connection;
}

async function disconnectMongo() {
  await mongoose.disconnect();
}

module.exports = { connectMongo, disconnectMongo, mongoose };
