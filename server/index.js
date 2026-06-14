'use strict';

require('dotenv').config();
const http = require('http');
const app = require('./app');
const logger = require('./utils/logger');
const { connectMongo } = require('../database/db');
const { startCronJobs } = require('./jobs/cronJobs');

const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

async function start() {
  await connectMongo();
  startCronJobs();
  server.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
}

start();

process.on('SIGINT', async () => {
  await require('../database/db').disconnectMongo();
  process.exit(0);
});
