// In-memory limits: correct for a single API instance. For several instances, plug a
// shared store (e.g. rate-limit-redis) into these limiters.
const { rateLimit } = require('express-rate-limit');
const config = require('../config');

const MIN = 60 * 1000;

const limiter = (windowMs, limit, opts = {}) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => config.NODE_ENV === 'test',
    message: { message: 'Too many requests, please try again later.' },
    ...opts,
  });

module.exports = {
  api: limiter(15 * MIN, 1500),
  // Only failed attempts count, so legitimate users are not locked out
  login: limiter(15 * MIN, 10, { skipSuccessfulRequests: true }),
  register: limiter(60 * MIN, 10),
  verificationEmail: limiter(60 * MIN, 3),
  userLookup: limiter(15 * MIN, 60),
  upload: limiter(15 * MIN, 300),
  // Guards share-link passwords against brute force
  linkAccess: limiter(15 * MIN, 30, { skipSuccessfulRequests: true }),
};
