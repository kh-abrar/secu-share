const multer = require('multer');
const { HttpError } = require('../lib/errors');

// Never leak internal error details to clients; log them instead.
function errorHandler(err, req, res, _next) {
  // e.g. a client disconnecting mid-download: nothing more can be sent
  if (res.headersSent) {
    req.log?.warn({ err }, 'Error after response started');
    return res.destroy();
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message, ...(err.details && { details: err.details }) });
  }
  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : err.message });
  }
  // body-parser errors (malformed JSON, payload too large) carry a 4xx status
  if (err.status >= 400 && err.status < 500 && err.expose) {
    return res.status(err.status).json({ message: err.message });
  }
  req.log?.error({ err }, 'Unhandled error');
  res.status(500).json({ message: 'Server error' });
}

function notFoundHandler(_req, res) {
  res.status(404).json({ message: 'Not found' });
}

module.exports = { errorHandler, notFoundHandler };
