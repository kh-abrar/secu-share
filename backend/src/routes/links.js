// Share links owned by the current user
const express = require('express');
const { z } = require('zod');
const ShareLink = require('../models/ShareLink');
const { requireAuth } = require('../middlewares/auth');
const { validate, objectId } = require('../lib/validate');
const { notFound } = require('../lib/errors');
const { linkDto } = require('../services/serializers');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const links = await ShareLink.find({ owner: req.user._id })
    .populate('file', 'name mimetype size wrappedKey')
    .sort({ createdAt: -1 })
    .lean();
  res.json({
    links: links
      .filter((l) => l.file)
      .map((l) => ({
        ...linkDto(l),
        file: { _id: String(l.file._id), name: l.file.name, mimetype: l.file.mimetype, size: l.file.size, wrappedKey: l.file.wrappedKey },
      })),
  });
});

// Revoking deletes the link: its token stops working immediately
router.delete('/:id', validate({ params: z.object({ id: objectId }) }), async (req, res) => {
  const { deletedCount } = await ShareLink.deleteOne({ _id: req.valid.params.id, owner: req.user._id });
  if (!deletedCount) throw notFound('Link not found');
  res.json({ ok: true });
});

module.exports = router;
