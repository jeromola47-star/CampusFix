const router = require('express').Router();
const bcrypt = require('bcrypt');
const { body } = require('express-validator');
const { User, Role } = require('../models');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { hashPassword, signToken, publicUser, audit } = require('../utils/helpers');

const passwordRule = body('password')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  .matches(/[A-Za-z]/).withMessage('Password must contain a letter')
  .matches(/\d/).withMessage('Password must contain a number');

const registerRules = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2 to 80 characters'),
  body('email').trim().toLowerCase().isEmail().withMessage('Enter a valid email address'),
  passwordRule,
];

// Public registration ALWAYS creates a Student/Staff account; any role in the body is ignored.
router.post('/register', registerRules, validate, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (await User.findOne({ where: { email } })) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }
    const role = await Role.findOne({ where: { name: 'student_staff' } });
    const user = await User.create({ name, email, passwordHash: await hashPassword(password), roleId: role.id });
    await audit(user.id, 'REGISTER', 'User', user.id, `New account ${email}`);
    res.status(201).json({ token: signToken(user, role.name), user: { id: user.id, name, email, role: role.name } });
  } catch (err) { next(err); }
});

router.post('/login', [
  body('email').trim().toLowerCase().isEmail().withMessage('Enter a valid email address'),
  body('password').notEmpty().withMessage('Password is required'),
], validate, async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { email: req.body.email }, include: Role });
    const valid = user && (await bcrypt.compare(req.body.password, user.passwordHash));
    if (!valid) return res.status(401).json({ message: 'Invalid email or password' });
    await audit(user.id, 'LOGIN', 'User', user.id, 'User logged in');
    res.json({ token: signToken(user, user.Role.name), user: publicUser(user) });
  } catch (err) { next(err); }
});

router.get('/me', protect, (req, res) => res.json({ user: req.user }));

module.exports = router;
