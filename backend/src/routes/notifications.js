const router = require('express').Router();
const { param } = require('express-validator');
const { Notification } = require('../models');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const data = await Notification.findAll({ where: { userId: req.user.id }, order: [['id', 'DESC']], limit: 100 });
    res.json({ data, unread: data.filter((n) => !n.isRead).length });
  } catch (err) { next(err); }
});

router.patch('/read-all', async (req, res, next) => {
  try {
    await Notification.update({ isRead: true }, { where: { userId: req.user.id, isRead: false } });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) { next(err); }
});

router.patch('/:id/read', param('id').isInt({ min: 1 }), validate, async (req, res, next) => {
  try {
    const n = await Notification.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!n) return res.status(404).json({ message: 'Notification not found' });
    await n.update({ isRead: true });
    res.json(n);
  } catch (err) { next(err); }
});

module.exports = router;
