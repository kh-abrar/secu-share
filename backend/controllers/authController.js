const User = require('../models/User');
const rateLimit = require('express-rate-limit');

// Register user
exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({ email, password, name });
    await user.save();

    req.session.user = { id: user._id.toString(), email: user.email, name: user.name };

    res.status(201).json({
      id: user._id, 
      email: user.email, 
      name: user.name
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Login rate limiter
exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts. Please try again after 15 minutes.',
});

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await user.comparePassword(password || '');
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    req.session.user = { id: user._id.toString(), email: user.email, name: user.name };
    res.json({ id: user._id, email: user.email, name: user.name });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sid');
    res.json({ ok: true });
  });
};

// Get current user
exports.me = (req, res) => {
  const u = req.session?.user;
  if (!u) return res.status(200).json(null);
  res.json(u);
};
  