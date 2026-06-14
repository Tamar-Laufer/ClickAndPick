const path = require('path');
const winston = require('winston');

const LOG_DIR = path.join(__dirname, '..', '..', 'logs');

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) =>
      `[${timestamp}] ${level.toUpperCase()}: ${message}`
    )
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(LOG_DIR, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(LOG_DIR, 'combined.log') }),
  ],
});

module.exports = logger;
