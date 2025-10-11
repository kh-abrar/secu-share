// middlewares/optionalAuth.js
module.exports = function optionalAuth(req, _res, next) {
  const user = req.session?.user;
  if (user) {
    req.userId = user.id;
    req.userEmail = user.email;
  }
  next();
};
