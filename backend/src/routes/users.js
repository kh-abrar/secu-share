const express = require('express');
const { z } = require('zod');
const User = require('../models/User');
const limits = require('../middlewares/rateLimits');
const { requireAuth } = require('../middlewares/auth');
const { validate, email } = require('../lib/validate');
const { notFound } = require('../lib/errors');

const router = express.Router();
router.use(requireAuth);

// Public key of a verified user, so the client can share a file key with them
router.get('/lookup', limits.userLookup, validate({ query: z.object({ email }) }), async (req, res) => {
  const user = await User.findOne({ email: req.valid.query.email, emailVerified: true })
    .select('name email publicKey')
    .lean();
  if (!user) throw notFound('No verified SecuShare account uses this email');
  res.json({ id: String(user._id), name: user.name, email: user.email, publicKey: user.publicKey });
});

module.exports = router;
