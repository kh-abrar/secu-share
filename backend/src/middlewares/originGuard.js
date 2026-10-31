// CSRF defence: browsers send Origin on every cross-origin state-changing request.
// Reject those that don't come from the app. Requests without Origin come from
// non-browser clients, which cannot carry a victim's cookies.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function createOriginGuard(isAllowedOrigin) {
  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    const origin = req.get('origin');
    if (origin && !isAllowedOrigin(origin)) {
      return res.status(403).json({ message: 'Forbidden origin' });
    }
    next();
  };
}

module.exports = { createOriginGuard };
