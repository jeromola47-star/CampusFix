const router = require('express').Router();
const { body, param } = require('express-validator');
const { User, Role, Notification } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { hashPassword, publicUser, audit } = require('../utils/helpers');

const ROLES = ['student_staff', 'officer', 'admin'];
router.use(protect, authorize('admin'));

router.get('/', async (req, res, next) => {
  try {
    const users = await User.findAll({ include: Role, order: [['id', 'ASC']] });
    res.json(users.map(publicUser));
  } catch (err) { next(err); }
});

router.get('/officers', async (req, res, next) => {
  try {
    const users = await User.findAll({ include: { model: Role, where: { name: 'officer' } }, order: [['name', 'ASC']] });
    res.json(users.map(publicUser));
  } catch (err) { next(err); }
});

router.post('/', [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2 to 80 characters'),
  body('email').trim().toLowerCase().isEmail().withMessage('Enter a valid email address'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Za-z]/).withMessage('Password must contain a letter').matches(/\d/).withMessage('Password must contain a number'),
  body('role').isIn(ROLES).withMessage(`Role must be one of: ${ROLES.join(', ')}`),
], validate, async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (await User.findOne({ where: { email } })) return res.status(409).json({ message: 'An account with this email already exists' });
    const roleRow = await Role.findOne({ where: { name: role } });
    const user = await User.create({ name, email, passwordHash: await hashPassword(password), roleId: roleRow.id });
    await audit(req.user.id, 'CREATE_USER', 'User', user.id, `${email} as ${role}`);
    res.status(201).json({ id: user.id, name, email, role });
  } catch (err) { next(err); }
});

router.patch('/:id/role', param('id').isInt({ min: 1 }), body('role').isIn(ROLES).withMessage(`Role must be one of: ${ROLES.join(', ')}`),
  validate, async (req, res, next) => {
    try {
      if (Number(req.params.id) === req.user.id) return res.status(400).json({ message: 'You cannot change your own role' });
      const user = await User.findByPk(req.params.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      const roleRow = await Role.findOne({ where: { name: req.body.role } });
      await user.update({ roleId: roleRow.id });
      await audit(req.user.id, 'CHANGE_ROLE', 'User', user.id, `Role set to ${req.body.role}`);
      res.json({ message: 'Role updated', role: req.body.role });
    } catch (err) { next(err); }
  });

router.delete('/:id', param('id').isInt({ min: 1 }), validate, async (req, res, next) => {
  try {
    if (Number(req.params.id) === req.user.id) return res.status(400).json({ message: 'You cannot delete your own account' });
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await Notification.destroy({ where: { userId: user.id } });
    await user.destroy();
    await audit(req.user.id, 'DELETE_USER', 'User', Number(req.params.id), user.email);
    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
