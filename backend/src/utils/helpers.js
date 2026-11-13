const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Notification, AuditLog } = require('../models');

const hashPassword = (pw) => bcrypt.hash(pw, process.env.NODE_ENV === 'test' ? 4 : 12);
const jwtSecret = () => process.env.JWT_SECRET || 'dev-secret-change-me';

const signToken = (user, roleName) =>
  jwt.sign({ id: user.id, name: user.name, role: roleName }, jwtSecret(), { expiresIn: '2h' });

const publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.Role ? u.Role.name : undefined, createdAt: u.createdAt,
});

const notify = (userId, message) => Notification.create({ userId, message });
const audit = (userId, action, entity, entityId, details) =>
  AuditLog.create({ userId, action, entity, entityId, details });

module.exports = { hashPassword, jwtSecret, signToken, publicUser, notify, audit };
