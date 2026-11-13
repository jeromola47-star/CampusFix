const multer = require('multer');

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5 MB or smaller' : 'Upload failed: ' + err.message;
    return res.status(400).json({ message });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Request body is not valid JSON' });
  if (err.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ message: 'A record with that value already exists' });
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(409).json({ message: 'This record is linked to other data and cannot be changed or removed' });
  }
  if (err.status && err.status < 500) return res.status(err.status).json({ message: err.message });
  console.error(err);
  return res.status(500).json({ message: 'Something went wrong on the server' });
};
