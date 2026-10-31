const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcrypt');
const { z } = require('zod');

const config = require('../config');
const User = require('../models/User');
const File = require('../models/File');
const Share = require('../models/Share');
const ShareLink = require('../models/ShareLink');
const limits = require('../middlewares/rateLimits');
const { requireAuth } = require('../middlewares/auth');
const { validate, email, base64, authHash } = require('../lib/validate');
const { badRequest, conflict, unauthorized } = require('../lib/errors');
const { userDto, keysDto } = require('../services/serializers');
const { deleteItems } = require('../services/files');
const { sendVerificationEmail } = require('../services/mailer');

const router = express.Router();

const BCRYPT_COST = 12;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
// Compared against when the email is unknown, so response time doesn't reveal accounts
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_COST);

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

const keyMaterial = {
  publicKey: base64(2000),
  encryptedPrivateKey: base64(5000),
  privateKeyIv: z.string().regex(/^[A-Za-z0-9+/]{16}$/, 'Invalid IV'), // 12 bytes
};

// Issue a fresh session id on login/logout/password change (prevents session fixation)
const regenerate = (req) => new Promise((resolve, reject) => req.session.regenerate((e) => (e ? reject(e) : resolve())));
const destroy = (req) => new Promise((resolve) => req.session.destroy(() => resolve()));

const clearSessionCookie = (res) =>
  res.clearCookie('sid', { httpOnly: true, secure: config.COOKIE_SECURE, sameSite: config.COOKIE_SAMESITE });

async function startSession(req, user) {
  await regenerate(req);
  req.session.userId = String(user._id);
}

async function issueVerification(user, log) {
  const token = crypto.randomBytes(32).toString('hex');
  await User.updateOne(
    { _id: user._id },
    { emailVerificationTokenHash: sha256(token), emailVerificationExpires: new Date(Date.now() + VERIFY_TTL_MS) }
  );
  try {
    await sendVerificationEmail(user.email, user.name, `${config.appUrl}/verify-email?token=${token}`);
  } catch (err) {
    // The account stays usable; the user can request another email
    log.error({ err }, 'Failed to send verification email');
  }
}

async function checkPassword(userId, hash) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || !(await bcrypt.compare(hash, user.passwordHash))) throw unauthorized('Incorrect password');
  return user;
}

router.post(
  '/register',
  limits.register,
  validate({
    body: z.object({
      email,
      name: z.string().trim().min(1, 'Name is required').max(80),
      authHash,
      ...keyMaterial,
    }),
  }),
  async (req, res) => {
    const { email, name, authHash, ...keys } = req.valid.body;
    if (await User.exists({ email })) throw conflict('An account with this email already exists');

    let user;
    try {
      user = await User.create({ email, name, passwordHash: await bcrypt.hash(authHash, BCRYPT_COST), ...keys });
    } catch (err) {
      if (err.code === 11000) throw conflict('An account with this email already exists');
      throw err;
    }

    await issueVerification(user, req.log);
    await startSession(req, user);
    res.status(201).json({ user: userDto(user), keys: keysDto(user) });
  }
);

router.post(
  '/login',
  limits.login,
  validate({ body: z.object({ email, authHash }) }),
  async (req, res) => {
    const { email, authHash } = req.valid.body;
    const user = await User.findOne({ email }).select('+passwordHash');
    const ok = await bcrypt.compare(authHash, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw unauthorized('Invalid email or password');

    await startSession(req, user);
    res.json({ user: userDto(user), keys: keysDto(user) });
  }
);

router.post('/logout', async (req, res) => {
  await destroy(req);
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', async (req, res) => {
  const user = req.session?.userId ? await User.findById(req.session.userId).lean() : null;
  res.json({ user: user ? userDto(user) : null });
});

// Encrypted key material, needed to re-encrypt the private key on password change
router.get('/keys', requireAuth, (req, res) => {
  res.json(keysDto(req.user));
});

router.post(
  '/verify-email',
  validate({ body: z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, 'Invalid verification link') }) }),
  async (req, res) => {
    const user = await User.findOneAndUpdate(
      { emailVerificationTokenHash: sha256(req.valid.body.token), emailVerificationExpires: { $gt: new Date() } },
      { emailVerified: true, emailVerificationTokenHash: null, emailVerificationExpires: null },
      { new: true }
    );
    if (!user) throw badRequest('This verification link is invalid or has expired');
    res.json({ ok: true, email: user.email });
  }
);

router.post('/resend-verification', requireAuth, limits.verificationEmail, async (req, res) => {
  if (req.user.emailVerified) throw badRequest('Your email is already verified');
  await issueVerification(req.user, req.log);
  res.json({ ok: true });
});

router.post(
  '/change-password',
  requireAuth,
  limits.login,
  validate({
    body: z.object({
      currentAuthHash: authHash,
      newAuthHash: authHash,
      encryptedPrivateKey: keyMaterial.encryptedPrivateKey,
      privateKeyIv: keyMaterial.privateKeyIv,
    }),
  }),
  async (req, res) => {
    const { currentAuthHash, newAuthHash, encryptedPrivateKey, privateKeyIv } = req.valid.body;
    const user = await checkPassword(req.user._id, currentAuthHash);

    user.passwordHash = await bcrypt.hash(newAuthHash, BCRYPT_COST);
    user.encryptedPrivateKey = encryptedPrivateKey;
    user.privateKeyIv = privateKeyIv;
    await user.save();

    await startSession(req, user);
    res.json({ ok: true });
  }
);

router.delete(
  '/account',
  requireAuth,
  limits.login,
  validate({ body: z.object({ authHash }) }),
  async (req, res) => {
    const user = await checkPassword(req.user._id, req.valid.body.authHash);

    const rootItems = await File.find({ owner: user._id, path: '/' }).lean();
    await deleteItems(user._id, rootItems);
    await Promise.all([
      Share.deleteMany({ $or: [{ owner: user._id }, { recipient: user._id }] }),
      ShareLink.deleteMany({ owner: user._id }),
    ]);
    await User.deleteOne({ _id: user._id });

    await destroy(req);
    clearSessionCookie(res);
    res.json({ ok: true });
  }
);

module.exports = router;
