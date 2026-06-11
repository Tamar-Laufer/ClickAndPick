'use strict';

require('dotenv').config();
const http = require('http');
const app = require('./app');
const logger = require('./utils/logger');
const { connectMongo } = require('../database/db');
const { startCronJobs } = require('./jobs/cronJobs');

// הצ'אט בזמן-אמת מטופל בשירות C++ נפרד (realtime-service-cpp, פורט 8080).
// שרת ה-Node מוקדש כולו ל-REST API ול-MongoDB.
const server = http.createServer(app);

// ========================================
// הפעלה
// ========================================
const PORT = process.env.PORT || 5000;

async function start() {
  await connectMongo();
  startCronJobs(); // תזמון משימת תזכורת ההחזרה היומית
  server.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
}

start();

// כיבוי מסודר (graceful shutdown)
process.on('SIGINT', async () => {
  await require('../database/db').disconnectMongo();
  process.exit(0);
});
