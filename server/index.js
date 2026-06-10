'use strict';

require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const logger = require('./utils/logger');
const { connectMongo } = require('./config/db');
const { startCronJobs } = require('./jobs/cronJobs');

const server = http.createServer(app);

// ========================================
// Socket.io (real-time channel, available on req.io)
// Reuses the CORS origin policy defined on the app.
// ========================================
const io = new Server(server, {
  cors: {
    origin: app.locals.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});
// expose io to the request pipeline (app.js reads it via req.app.get('io'))
app.set('io', io);
io.on('connection', (socket) => {
  logger.info(`client connected: ${socket.id}`);
  socket.on('disconnect', () => logger.info(`client disconnected: ${socket.id}`));
});

// ========================================
// Start
// ========================================
const PORT = process.env.PORT || 5000;

async function start() {
  await connectMongo();
  startCronJobs(); // schedule the daily return-reminder job
  server.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
}

start();

// graceful shutdown
process.on('SIGINT', async () => {
  await require('./config/db').disconnectMongo();
  process.exit(0);
});
