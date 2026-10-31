// Express 5 forwards rejected promises to the error handler, so handlers just throw.
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const badRequest = (msg, details) => new HttpError(400, msg, details);
const unauthorized = (msg = 'Authentication required') => new HttpError(401, msg);
const forbidden = (msg = 'Forbidden') => new HttpError(403, msg);
const notFound = (msg = 'Not found') => new HttpError(404, msg);
const conflict = (msg, details) => new HttpError(409, msg, details);
const gone = (msg) => new HttpError(410, msg);

module.exports = { HttpError, badRequest, unauthorized, forbidden, notFound, conflict, gone };
