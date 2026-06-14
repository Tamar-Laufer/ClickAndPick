function checkRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'גישה נדחתה – לא מחובר' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'אין הרשאה לפעולה זו' });
    }
    next();
  };
}

module.exports = checkRole;
