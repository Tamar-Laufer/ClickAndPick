const jwt    = require('jsonwebtoken');
const logger = require('../utils/logger');

// מאמת JWT בכל בקשה מוגנת ומוסיף את נתוני המשתמש ל-req.user
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token      = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'גישה נדחתה – נדרשת כניסה למערכת' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    logger.warn(`JWT לא תקין: ${err.message}`);
    return res.status(403).json({ message: 'טוקן לא תקין או פג תוקף' });
  }
}

module.exports = verifyToken;
