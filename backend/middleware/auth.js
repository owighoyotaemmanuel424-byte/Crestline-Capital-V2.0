const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function auth(req, res, next) {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ message: 'Authentication required' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId);
    if (!user) return res.status(401).json({ message: 'Session is invalid' });
    if (user.isFrozen) return res.status(403).json({ message: 'Account is frozen' });
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired session' });
  }
}

function admin(req, res, next) {
  if (!req.user?.isAdmin) return res.status(403).json({ message: 'Admin access required' });
  next();
}

module.exports = { auth, admin };
