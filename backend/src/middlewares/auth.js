// The session stores only the user id; the user is loaded per request so that
// verification status and account deletion take effect immediately.
const User = require('../models/User');
const { unauthorized, forbidden } = require('../lib/errors');

async function loadUser(req) {
  const id = req.session?.userId;
  if (!id) return null;
  const user = await User.findById(id).lean();
  if (!user) {
    req.session.userId = undefined;
    return null;
  }
  return user;
}

async function requireAuth(req, _res, next) {
  req.user = await loadUser(req);
  if (!req.user) throw unauthorized();
  next();
}

async function optionalAuth(req, _res, next) {
  req.user = await loadUser(req);
  next();
}

// Receiving shares requires a verified address: otherwise someone could register
// another person's email first and receive files meant for them.
function requireVerified(req, _res, next) {
  if (!req.user?.emailVerified) throw forbidden('Verify your email address first');
  next();
}

module.exports = { requireAuth, optionalAuth, requireVerified };
