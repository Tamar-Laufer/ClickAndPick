'use strict';

/**
 * אפליקציית ה-Express — נתיבים, middleware וה-error handler הגלובלי, ללא שום
 * תופעות לוואי (אין חיבור ל-DB, אין listen()).
 *
 * הופרד מ-index.js כדי שאפשר יהיה לייבא אותו ישירות ב-Supertest בבדיקות
 * האינטגרציה. החיווט של הפרודקשן (שרת HTTP + Mongo + cron) חי ב-index.js,
 * שמייבא את המודול הזה. הצ'אט בזמן-אמת מטופל בשירות C++ נפרד (פורט 8080).
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./utils/logger');

const app = express();

// ========================================
// CORS — מתיר את כתובת/כתובות הלקוח שהוגדרו, ובנוסף כל פורט localhost בפיתוח.
// ========================================
const configuredOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true; // לקוחות שאינם דפדפן (curl, supertest, שרת-לשרת)
  if (configuredOrigins.includes(origin)) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

const corsOrigin = (origin, cb) =>
  isAllowedOrigin(origin) ? cb(null, true) : cb(new Error(`Origin not allowed by CORS: ${origin}`));

// ========================================
// Middleware
// ========================================
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// הגשת תמונות שהועלו (הקבצים על הדיסק; ה-DB שומר רק את ה-URL שלהם).
// חוסמים במפורש את תת-התיקייה /uploads/audio: הקלטות קוליות הן פרטיות ומוגשות
// אך ורק דרך הנתיב המאומת GET /api/uploads/audio/:filename. בלי החסימה הזו,
// express.static היה חושף אותן לכל מי שמנחש שם קובץ.
app.use('/uploads/audio', (_req, res) => res.status(403).json({ message: 'Forbidden' }));
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
app.use('/api/messages', require('./routes/messages'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ========================================
// Error handler גלובלי — ממפה שגיאות Mongoose לתשובות HTTP נקיות
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
