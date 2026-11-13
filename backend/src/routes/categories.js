const router = require('express').Router();
const { Category } = require('../models');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res, next) => {
  try { res.json(await Category.findAll({ order: [['name', 'ASC']] })); } catch (err) { next(err); }
});

module.exports = router;
