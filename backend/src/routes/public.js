// Share-link access. Anyone may call these; authorizeLink enforces each link's rules.
// Passwords travel in POST bodies, never in URLs (which end up in logs and history).
const express = require('express');
const { z } = require('zod');
const { pipeline } = require('stream/promises');

const config = require('../config');
const File = require('../models/File');
const storage = require('../storage');
const limits = require('../middlewares/rateLimits');
const { optionalAuth, requireAuth } = require('../middlewares/auth');
const { validate, base64 } = require('../lib/validate');
const { conflict, HttpError } = require('../lib/errors');
const { fileDto } = require('../services/serializers');
const { authorizeLink, consumeDownload } = require('../services/links');
const { storageUsed, createFileWithinQuota } = require('../services/files');

const router = express.Router();

const tokenParam = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/, 'Invalid link') });
const passwordBody = z.object({ password: z.string().max(128).optional() });

router.use(limits.linkAccess);

// Metadata for the landing page. Does not count as a download.
router.post('/links/:token', optionalAuth, validate({ params: tokenParam, body: passwordBody }), async (req, res) => {
  const link = await authorizeLink(req.valid.params.token, { user: req.user, password: req.valid.body.password });
  res.json({
    file: { name: link.file.name, mimetype: link.file.mimetype, size: link.file.size },
    owner: { name: link.owner?.name ?? 'Unknown' },
    scope: link.scope,
    expiresAt: link.expiresAt,
    downloadsRemaining: link.maxDownloads === null ? null : link.maxDownloads - link.downloadCount,
  });
});

router.post('/links/:token/download', optionalAuth, validate({ params: tokenParam, body: passwordBody }), async (req, res) => {
  const link = await authorizeLink(req.valid.params.token, { user: req.user, password: req.valid.body.password });
  await consumeDownload(link);

  const { stream, size } = await storage.getStream(link.file.storageKey);
  res.set({ 'Content-Type': 'application/octet-stream', 'Content-Length': size, 'Cache-Control': 'private, no-store' });
  await pipeline(stream, res);
});

// Saves an independent copy into the signed-in user's files. The client re-wraps the
// file key (taken from the link fragment) with the user's own public key.
router.post(
  '/links/:token/save',
  requireAuth,
  validate({ params: tokenParam, body: passwordBody.extend({ wrappedKey: base64(1024) }) }),
  async (req, res) => {
    const { password, wrappedKey } = req.valid.body;
    const link = await authorizeLink(req.valid.params.token, { user: req.user, password });
    const owner = req.user._id;
    const src = link.file;

    if (String(src.owner) === String(owner)) throw conflict('This file is already in your account');
    if (await File.exists({ owner, path: '/', name: src.name })) {
      throw conflict(`You already have a file named "${src.name}" in your root folder`);
    }
    if ((await storageUsed(owner)) + src.encryptedSize > config.STORAGE_QUOTA_BYTES) {
      throw new HttpError(413, 'Storage quota exceeded');
    }

    await consumeDownload(link);
    const storageKey = storage.newKey(owner);
    await storage.copy(src.storageKey, storageKey);
    let copy;
    try {
      copy = await createFileWithinQuota(
        {
          owner,
          type: 'file',
          name: src.name,
          path: '/',
          storageKey,
          mimetype: src.mimetype,
          size: src.size,
          encryptedSize: src.encryptedSize,
          wrappedKey,
        },
        config.STORAGE_QUOTA_BYTES
      );
    } catch (err) {
      if (err.code === 11000) throw conflict(`You already have a file named "${src.name}" in your root folder`);
      throw err;
    }
    if (!copy) throw new HttpError(413, 'Storage quota exceeded');
    res.status(201).json(fileDto(copy));
  }
);

module.exports = router;
