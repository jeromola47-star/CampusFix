const fs = require('fs');
const path = require('path');
const router = require('express').Router();
const { body, param, query } = require('express-validator');
const { Op } = require('sequelize');
const { ServiceRequest, User, Role, Category, Assignment, StatusLog } = require('../models');
const { isPostgres } = require('../db');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uploadImage, UPLOAD_DIR } = require('../middleware/upload');
const { notify, audit } = require('../utils/helpers');

const PRIORITIES = ['Low', 'Medium', 'High'];
const STATUSES = ['Pending', 'Assigned', 'In Progress', 'Completed'];
const OFFICER_STATUSES = ['In Progress', 'Completed'];

const requesterInclude = { model: User, as: 'requester', attributes: ['id', 'name', 'email'] };
const categoryInclude = { model: Category, attributes: ['id', 'name'] };
const assignmentInclude = () => ({ model: Assignment, include: [{ model: User, as: 'officer', attributes: ['id', 'name'] }] });

const loadRequest = (id) =>
  ServiceRequest.findByPk(id, {
    include: [
      requesterInclude, categoryInclude, assignmentInclude(),
      { model: StatusLog, as: 'logs', include: [{ model: User, as: 'changedBy', attributes: ['id', 'name'] }] },
    ],
    order: [[{ model: StatusLog, as: 'logs' }, 'id', 'ASC']],
  });

const rules = (optional) => {
  const wrap = (chain) => (optional ? chain.optional() : chain);
  return [
    wrap(body('title')).trim().isLength({ min: 3, max: 120 }).withMessage('Title must be 3 to 120 characters'),
    wrap(body('description')).trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be 10 to 2000 characters'),
    wrap(body('location')).trim().notEmpty().withMessage('Location is required').isLength({ max: 120 }).withMessage('Location is too long'),
    wrap(body('priority')).isIn(PRIORITIES).withMessage('Priority must be Low, Medium or High'),
    wrap(body('categoryId')).isInt({ min: 1 }).withMessage('Choose a valid category'),
  ];
};

const idRule = param('id').isInt({ min: 1 }).withMessage('Invalid request id');

function canView(user, request) {
  if (user.role === 'admin') return true;
  if (user.role === 'student_staff') return request.userId === user.id;
  if (user.role === 'officer') return !!request.Assignment && request.Assignment.officerId === user.id;
  return false;
}

// Create a request (with optional image)
router.post('/', protect, authorize('student_staff', 'admin'), uploadImage, rules(false), validate, async (req, res, next) => {
  try {
    const { title, description, location, priority, categoryId } = req.body;
    if (!(await Category.findByPk(categoryId))) {
      return res.status(400).json({ message: 'Validation failed', errors: [{ field: 'categoryId', message: 'Category does not exist' }] });
    }
    const created = await ServiceRequest.create({
      title, description, location, priority, categoryId, userId: req.user.id, status: 'Pending',
      imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
    });
    await StatusLog.create({ requestId: created.id, changedById: req.user.id, oldStatus: null, newStatus: 'Pending', comment: 'Request submitted' });
    const admins = await User.findAll({ include: { model: Role, where: { name: 'admin' } } });
    await Promise.all(admins.map((a) => notify(a.id, `New request #${created.id}: ${title}`)));
    await audit(req.user.id, 'CREATE_REQUEST', 'ServiceRequest', created.id, title);
    res.status(201).json(await loadRequest(created.id));
  } catch (err) { next(err); }
});

// List requests: search, filters and pagination, scoped by role
router.get('/', protect, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(STATUSES),
  query('priority').optional().isIn(PRIORITIES),
], validate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.priority) where.priority = req.query.priority;
    if (req.query.category) where.categoryId = req.query.category;
    if (req.query.search && req.query.search.trim()) {
      const like = isPostgres ? Op.iLike : Op.like; // iLike exists only on PostgreSQL
      const term = `%${req.query.search.trim()}%`;
      where[Op.or] = [{ title: { [like]: term } }, { description: { [like]: term } }, { location: { [like]: term } }];
    }
    if (req.user.role === 'student_staff') where.userId = req.user.id;

    const assignInc = assignmentInclude();
    if (req.user.role === 'officer') {
      assignInc.required = true;
      assignInc.where = { officerId: req.user.id };
    }
    const { rows, count } = await ServiceRequest.findAndCountAll({
      where,
      include: [requesterInclude, categoryInclude, assignInc],
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
      limit,
      offset: (page - 1) * limit,
      distinct: true, // count each request once even with joins
    });
    res.json({ data: rows, page, limit, total: count, pages: Math.max(1, Math.ceil(count / limit)) });
  } catch (err) { next(err); }
});

// One request with its status history
router.get('/:id', protect, idRule, validate, async (req, res, next) => {
  try {
    const request = await loadRequest(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (!canView(req.user, request)) return res.status(403).json({ message: 'You cannot view this request' });
    res.json(request);
  } catch (err) { next(err); }
});

// Edit: owner while Pending, or admin
router.put('/:id', protect, authorize('student_staff', 'admin'), uploadImage, idRule, rules(true), validate, async (req, res, next) => {
  try {
    const request = await ServiceRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (req.user.role !== 'admin' && (request.userId !== req.user.id || request.status !== 'Pending')) {
      return res.status(403).json({ message: 'You can only edit your own request while it is Pending' });
    }
    if (req.body.categoryId && !(await Category.findByPk(req.body.categoryId))) {
      return res.status(400).json({ message: 'Validation failed', errors: [{ field: 'categoryId', message: 'Category does not exist' }] });
    }
    ['title', 'description', 'location', 'priority', 'categoryId'].forEach((f) => {
      if (req.body[f] !== undefined) request[f] = req.body[f];
    });
    if (req.file) request.imageUrl = `/uploads/${req.file.filename}`;
    await request.save();
    await audit(req.user.id, 'UPDATE_REQUEST', 'ServiceRequest', request.id, request.title);
    res.json(await loadRequest(request.id));
  } catch (err) { next(err); }
});

router.delete('/:id', protect, authorize('admin'), idRule, validate, async (req, res, next) => {
  try {
    const request = await ServiceRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    await Assignment.destroy({ where: { requestId: request.id } });
    await StatusLog.destroy({ where: { requestId: request.id } });
    if (request.imageUrl) fs.unlink(path.join(UPLOAD_DIR, path.basename(request.imageUrl)), () => {});
    await request.destroy();
    await audit(req.user.id, 'DELETE_REQUEST', 'ServiceRequest', Number(req.params.id), request.title);
    res.json({ message: 'Request deleted' });
  } catch (err) { next(err); }
});

// Assign (or reassign) a request to a maintenance officer
router.patch('/:id/assign', protect, authorize('admin'), idRule,
  body('officerId').isInt({ min: 1 }).withMessage('officerId is required'), validate, async (req, res, next) => {
    try {
      const request = await ServiceRequest.findByPk(req.params.id);
      if (!request) return res.status(404).json({ message: 'Request not found' });
      if (request.status === 'Completed') return res.status(400).json({ message: 'A completed request cannot be reassigned' });
      const officer = await User.findByPk(req.body.officerId, { include: Role });
      if (!officer || officer.Role.name !== 'officer') {
        return res.status(400).json({ message: 'Selected user is not a maintenance officer' });
      }
      const existing = await Assignment.findOne({ where: { requestId: request.id } });
      if (existing) await existing.update({ officerId: officer.id, assignedById: req.user.id });
      else await Assignment.create({ requestId: request.id, officerId: officer.id, assignedById: req.user.id });

      const oldStatus = request.status;
      await request.update({ status: 'Assigned' });
      await StatusLog.create({ requestId: request.id, changedById: req.user.id, oldStatus, newStatus: 'Assigned', comment: `Assigned to ${officer.name}` });
      await notify(officer.id, `You have been assigned request #${request.id}: ${request.title}`);
      await notify(request.userId, `Your request #${request.id} was assigned to ${officer.name}`);
      await audit(req.user.id, 'ASSIGN_REQUEST', 'ServiceRequest', request.id, `Assigned to ${officer.name}`);
      res.json({ message: `Assigned to ${officer.name}`, status: 'Assigned' });
    } catch (err) { next(err); }
  });

// Update status: assigned officer (In Progress / Completed) or admin (any status)
router.patch('/:id/status', protect, authorize('officer', 'admin'), idRule,
  body('status').isIn(STATUSES).withMessage(`Status must be one of: ${STATUSES.join(', ')}`),
  body('comment').optional({ nullable: true }).isLength({ max: 255 }).withMessage('Comment is too long'),
  validate, async (req, res, next) => {
    try {
      const { status, comment } = req.body;
      const request = await ServiceRequest.findByPk(req.params.id, { include: [Assignment] });
      if (!request) return res.status(404).json({ message: 'Request not found' });
      if (req.user.role === 'officer') {
        if (!request.Assignment || request.Assignment.officerId !== req.user.id) {
          return res.status(403).json({ message: 'This request is not assigned to you' });
        }
        if (!OFFICER_STATUSES.includes(status)) {
          return res.status(403).json({ message: 'Officers can only set In Progress or Completed' });
        }
      }
      if (request.status === status) return res.status(400).json({ message: `Request is already ${status}` });
      const oldStatus = request.status;
      await request.update({ status });
      await StatusLog.create({ requestId: request.id, changedById: req.user.id, oldStatus, newStatus: status, comment: comment || null });
      await notify(request.userId, `Your request #${request.id} is now ${status}`);
      await audit(req.user.id, 'UPDATE_STATUS', 'ServiceRequest', request.id, `${oldStatus} to ${status}`);
      res.json(await loadRequest(request.id));
    } catch (err) { next(err); }
  });

module.exports = router;
