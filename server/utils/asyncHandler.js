'use strict';

/**
 * עוטף handler אסינכרוני של נתיב כך ש-promise שנדחה מועבר ל-middleware הטיפול
 * בשגיאות של Express במקום להפיל את התהליך.
 *   router.get('/', asyncHandler(async (req, res) => { ... }))
 */
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
