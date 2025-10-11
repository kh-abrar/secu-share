// middlewares/authMiddleware.js
module.exports = function authMiddleware(req, res, next) {
  const user = req.session?.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  req.userId = user.id;
  req.userEmail = user.email;
  next();
};
