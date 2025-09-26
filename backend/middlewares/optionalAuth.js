// middlewares/optionalAuth.js
const jwt = require('jsonwebtoken');

module.exports = function optionalAuth(req, _res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = payload.sub || payload.id;
      req.userEmail = payload.email;
    } catch {}
  }
  next();
};
