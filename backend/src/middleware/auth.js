const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');
const { jwtSecret } = require('../utils/helpers');

// Verifies the Bearer token and attaches the current user to req.user
async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ message: 'Authentication required' });
  try {
    const payload = jwt.verify(header.slice(7), jwtSecret());
    const user = await User.findByPk(payload.id, { include: Role });
    if (!user) return res.status(401).json({ message: 'User no longer exists' });
    req.user = { id: user.id, name: user.name, email: user.email, role: user.Role.name };
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Restricts a route to the listed roles
const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role)
    ? next()
    : res.status(403).json({ message: 'You do not have permission to perform this action' });

module.exports = { protect, authorize };
