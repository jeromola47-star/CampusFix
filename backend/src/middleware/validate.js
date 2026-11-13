const fs = require('fs');
const { validationResult } = require('express-validator');

module.exports = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  if (req.file) fs.unlink(req.file.path, () => {}); // do not keep uploads from rejected requests
  return res.status(400).json({
    message: 'Validation failed',
    errors: result.array().map((e) => ({ field: e.path, message: e.msg })),
  });
};
