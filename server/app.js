'use strict';

/**
 * The Express application — routes, middleware and the global error handler,
 * with NO side effects (no DB connection, no socket.io server, no listen()).
 *
 * Pulled out of index.js so it can be imported directly by Supertest in the
 * integration tests. Production wiring (HTTP server + socket.io + Mongo + cron)
 * lives in index.js, which requires this module.
 *
 * `req.io` is still made available to controllers exactly as before: index.js
 * registers the live socket server via `app.set('io', io)`, and the passthrough
 * middleware below hands it to each request. In tests no io is set, so `req.io`
 * is simply `null` (no controller depends on it today).
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./utils/logger');

const app = express();

// ========================================
// CORS — allow the configured client URL(s) plus any localhost port in dev.
// ========================================
const configuredOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true; // non-browser clients (curl, supertest, server-to-server)
  if (configuredOrigins.includes(origin)) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

const corsOrigin = (origin, cb) =>
  isAllowedOrigin(origin) ? cb(null, true) : cb(new Error(`Origin not allowed by CORS: ${origin}`));

// expose the corsOrigin helper so index.js can reuse it for the socket.io server
app.locals.corsOrigin = corsOrigin;

// ========================================
// Middleware
// ========================================
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// hand the real-time channel to controllers (set by index.js in production;
// absent — and harmlessly null — under test).
app.use((req, _res, next) => { req.io = req.app.get('io') || null; next(); });

// serve uploaded images (the files live on disk; the DB only stores their URL)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========================================
// Routes
// ========================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/items', require('./routes/items'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/feedback', require('./routes/feedback'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ========================================
// Global error handler — maps Mongoose errors to clean HTTP responses
// ========================================
app.use((err, _req, res, _next) => {
  let status = err.status || 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    message = `${Object.keys(err.keyValue).join(', ')} already exists`;
  } else if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'הקובץ גדול מדי (מקסימום 5MB)' : err.message;
  }

  if (status >= 500) logger.error(err.stack || err.message);
  res.status(status).json({ message });
});

module.exports = app;
