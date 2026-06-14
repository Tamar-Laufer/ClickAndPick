const jwt    = require('jsonwebtoken');
const logger = require('../utils/logger');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token      = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'גישה נדחתה – נדרשת כניסה למערכת' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn(`JWT לא תקין: ${err.message}`);
    return res.status(403).json({ message: 'טוקן לא תקין או פג תוקף' });
  }
}

module.exports = verifyToken;
