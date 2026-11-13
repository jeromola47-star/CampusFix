const router = require('express').Router();
const { query } = require('express-validator');
const { ServiceRequest, User, Category, Assignment, AuditLog, sequelize } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { audit } = require('../utils/helpers');

router.use(protect, authorize('admin'));

router.get('/summary', async (req, res, next) => {
  try {
    const rows = await ServiceRequest.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status'], raw: true,
    });
    const byStatus = { Pending: 0, Assigned: 0, 'In Progress': 0, Completed: 0 };
    rows.forEach((r) => { byStatus[r.status] = Number(r.count); });
    res.json({ total: Object.values(byStatus).reduce((a, b) => a + b, 0), byStatus });
  } catch (err) { next(err); }
});

// Quote values and neutralise spreadsheet formulas
const cell = (v) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

router.get('/export.csv', async (req, res, next) => {
  try {
    const requests = await ServiceRequest.findAll({
      include: [
        { model: User, as: 'requester', attributes: ['name', 'email'] },
        { model: Category, attributes: ['name'] },
        { model: Assignment, include: [{ model: User, as: 'officer', attributes: ['name'] }] },
      ],
      order: [['id', 'ASC']],
    });
    const header = ['ID', 'Title', 'Category', 'Location', 'Priority', 'Status', 'Requester', 'Requester email', 'Assigned officer', 'Created', 'Updated'];
    const lines = requests.map((r) => [
      r.id, r.title, r.Category && r.Category.name, r.location, r.priority, r.status,
      r.requester && r.requester.name, r.requester && r.requester.email,
      r.Assignment && r.Assignment.officer && r.Assignment.officer.name,
      r.createdAt.toISOString(), r.updatedAt.toISOString(),
    ].map(cell).join(','));
    await audit(req.user.id, 'EXPORT_CSV', 'ServiceRequest', null, `${requests.length} rows exported`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="campusfix-requests.csv"');
    res.send([header.map(cell).join(','), ...lines].join('\n'));
  } catch (err) { next(err); }
});

router.get('/audit', [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })], validate,
  async (req, res, next) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 15;
      const { rows, count } = await AuditLog.findAndCountAll({
        include: [{ model: User, attributes: ['id', 'name'] }],
        order: [['id', 'DESC']], limit, offset: (page - 1) * limit,
      });
      res.json({ data: rows, page, limit, total: count, pages: Math.max(1, Math.ceil(count / limit)) });
    } catch (err) { next(err); }
  });

module.exports = router;
