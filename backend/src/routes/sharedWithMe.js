// Files other users shared directly with the current user
const express = require('express');
const { z } = require('zod');
const Share = require('../models/Share');
const { requireAuth, requireVerified } = require('../middlewares/auth');
const { validate, objectId } = require('../lib/validate');
const { notFound } = require('../lib/errors');
const { sharedFileDto } = require('../services/serializers');

const router = express.Router();
router.use(requireAuth);

router.get('/', requireVerified, async (req, res) => {
  const shares = await Share.find({ recipient: req.user._id })
    .populate('file')
    .populate('owner', 'name email')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ files: shares.filter((s) => s.file && s.owner).map(sharedFileDto) });
});

// Unverified users simply have nothing new
router.get('/unseen-count', async (req, res) => {
  const count = req.user.emailVerified
    ? await Share.countDocuments({ recipient: req.user._id, seenAt: null })
    : 0;
  res.json({ count });
});

router.post('/mark-seen', requireVerified, async (req, res) => {
  await Share.updateMany({ recipient: req.user._id, seenAt: null }, { $set: { seenAt: new Date() } });
  res.json({ ok: true });
});

// Removes a file from the recipient's list (the owner's file is untouched)
router.delete('/:shareId', validate({ params: z.object({ shareId: objectId }) }), async (req, res) => {
  const { deletedCount } = await Share.deleteOne({ _id: req.valid.params.shareId, recipient: req.user._id });
  if (!deletedCount) throw notFound('Share not found');
  res.json({ ok: true });
});

module.exports = router;
