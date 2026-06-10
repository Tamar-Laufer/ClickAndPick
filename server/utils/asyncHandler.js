'use strict';

/**
 * Wrap an async route handler so rejected promises are forwarded to Express'
 * error middleware instead of crashing the process.
 *   router.get('/', asyncHandler(async (req, res) => { ... }))
 */
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
