const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const multer = require('multer');
const bcrypt = require('bcrypt');
const { z } = require('zod');
const { pipeline } = require('stream/promises');

const config = require('../config');
const File = require('../models/File');
const Share = require('../models/Share');
const ShareLink = require('../models/ShareLink');
const User = require('../models/User');
const storage = require('../storage');
const limits = require('../middlewares/rateLimits');
const { requireAuth } = require('../middlewares/auth');
const { validate, objectId, email, base64 } = require('../lib/validate');
const { nameSchema, pathSchema, childPath, ancestorsOf, escapeRegex } = require('../lib/paths');
const { badRequest, conflict, notFound, HttpError } = require('../lib/errors');
const { fileDto, linkDto, recipientDto } = require('../services/serializers');
const { deleteItems, storageUsed, ensureFolders } = require('../services/files');

const router = express.Router();
router.use(requireAuth);

const idParam = z.object({ id: objectId });
const wrappedKey = base64(1024);

async function findOwned(req, id, type) {
  const item = await File.findOne({ _id: id, owner: req.user._id, ...(type && { type }) });
  if (!item) throw notFound(type === 'folder' ? 'Folder not found' : 'File not found');
  return item;
}

// ---------- listing ----------

router.get('/', validate({ query: z.object({ path: pathSchema }) }), async (req, res) => {
  const items = await File.find({ owner: req.user._id, path: req.valid.query.path }).sort({ type: -1, name: 1 }).lean();

  // Share counts for all listed files in two queries (no per-item lookups)
  const ids = items.map((i) => i._id);
  const [links, shares] = await Promise.all([
    ShareLink.aggregate([{ $match: { file: { $in: ids } } }, { $group: { _id: '$file', n: { $sum: 1 } } }]),
    Share.aggregate([{ $match: { file: { $in: ids } } }, { $group: { _id: '$file', n: { $sum: 1 } } }]),
  ]);
  const linkCount = new Map(links.map((r) => [String(r._id), r.n]));
  const shareCount = new Map(shares.map((r) => [String(r._id), r.n]));

  res.json({
    items: items.map((f) =>
      fileDto(f, { linkCount: linkCount.get(String(f._id)) ?? 0, recipientCount: shareCount.get(String(f._id)) ?? 0 })
    ),
  });
});

router.get('/folders', async (req, res) => {
  const folders = await File.find({ owner: req.user._id, type: 'folder' }).sort({ path: 1, name: 1 }).lean();
  res.json({ folders: folders.map((f) => fileDto(f)) });
});

router.get('/recent', validate({ query: z.object({ limit: z.coerce.number().int().min(1).max(50).default(5) }) }), async (req, res) => {
  const files = await File.find({ owner: req.user._id, type: 'file' }).sort({ createdAt: -1 }).limit(req.valid.query.limit).lean();
  res.json({ files: files.map((f) => fileDto(f)) });
});

router.get('/stats', async (req, res) => {
  const owner = req.user._id;
  const [files, folders, used, linkedIds, sharedIds] = await Promise.all([
    File.countDocuments({ owner, type: 'file' }),
    File.countDocuments({ owner, type: 'folder' }),
    storageUsed(owner),
    ShareLink.distinct('file', { owner }),
    Share.distinct('file', { owner }),
  ]);
  const sharedFiles = new Set([...linkedIds, ...sharedIds].map(String)).size;
  res.json({ files, folders, sharedFiles, used, quota: config.STORAGE_QUOTA_BYTES });
});

// ---------- create ----------

router.post(
  '/folders',
  validate({ body: z.object({ name: nameSchema, path: pathSchema }) }),
  async (req, res) => {
    const { name, path: parent } = req.valid.body;
    const { conflict: blocked } = await ensureFolders(req.user._id, parent);
    if (blocked) throw conflict(`"${blocked}" is a file, not a folder`);
    try {
      const folder = await File.create({ owner: req.user._id, type: 'folder', name, path: parent });
      res.status(201).json(fileDto(folder));
    } catch (err) {
      if (err.code === 11000) throw conflict('An item with this name already exists here');
      throw err;
    }
  }
);

// Encrypted uploads are spooled to disk (never buffered in memory), then moved to storage.
const UPLOAD_TMP = path.join(os.tmpdir(), 'secu-share-uploads');
fs.mkdirSync(UPLOAD_TMP, { recursive: true });

// Ciphertext = plaintext + 17-byte header + 16-byte tag per chunk (chunks >= 64 KiB)
const maxEncryptedSize = config.MAX_FILE_SIZE + 17 + 16 * (Math.ceil(config.MAX_FILE_SIZE / 65536) + 1);

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_TMP,
    filename: (_req, _file, cb) => cb(null, crypto.randomUUID()),
  }),
  limits: { fileSize: maxEncryptedSize, files: 1, fields: 10, fieldSize: 4096 },
});

const uploadFields = z.object({
  name: nameSchema,
  path: pathSchema,
  mimetype: z.string().max(255).regex(/^[\w.+-]+\/[\w.+-]+$/).catch('application/octet-stream'),
  size: z.coerce.number().int().min(0).max(config.MAX_FILE_SIZE, 'File is too large'),
  wrappedKey,
});

router.post('/', limits.upload, upload.single('file'), async (req, res) => {
  const tmp = req.file?.path;
  try {
    if (!req.file) throw badRequest('No file uploaded');
    const { name, path: dir, mimetype, size, wrappedKey: key } = validateUpload(req.body);
    const owner = req.user._id;
    const encryptedSize = req.file.size;

    if ((await storageUsed(owner)) + encryptedSize > config.STORAGE_QUOTA_BYTES) {
      throw new HttpError(413, 'Storage quota exceeded');
    }
    if (await File.exists({ owner, path: dir, name })) {
      throw conflict(`"${dir}${name}" already exists`, { reason: 'exists' });
    }
    const { conflict: blocked } = await ensureFolders(owner, dir);
    if (blocked) throw conflict(`"${blocked}" is a file, not a folder`);

    const storageKey = storage.newKey(owner);
    await storage.putFile(storageKey, tmp);
    try {
      const file = await File.create({
        owner, type: 'file', name, path: dir, storageKey, mimetype, size, encryptedSize, wrappedKey: key,
      });
      res.status(201).json(fileDto(file));
    } catch (err) {
      await storage.deleteMany([storageKey]).catch(() => {});
      if (err.code === 11000) throw conflict(`"${dir}${name}" already exists`, { reason: 'exists' });
      throw err;
    }
  } finally {
    if (tmp) await fs.promises.rm(tmp, { force: true });
  }
});

function validateUpload(body) {
  const parsed = uploadFields.safeParse(body ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw badRequest(`${issue.path.join('.')}: ${issue.message}`);
  }
  return parsed.data;
}

// ---------- content ----------

// Streams the encrypted blob to the owner or a direct-share recipient.
router.get('/:id/content', validate({ params: idParam }), async (req, res) => {
  const file = await File.findOne({ _id: req.valid.params.id, type: 'file' }).lean();
  if (!file) throw notFound('File not found');

  const isOwner = String(file.owner) === String(req.user._id);
  if (!isOwner) {
    if (!req.user.emailVerified) throw notFound('File not found');
    const share = await Share.findOneAndUpdate(
      { file: file._id, recipient: req.user._id },
      { $set: { seenAt: new Date() } }
    );
    if (!share) throw notFound('File not found');
  }

  const { stream, size } = await storage.getStream(file.storageKey);
  res.set({
    'Content-Type': 'application/octet-stream',
    'Content-Length': size,
    'Cache-Control': 'private, no-store',
  });
  await pipeline(stream, res);
});

// ---------- rename / move ----------

router.patch(
  '/:id',
  validate({
    params: idParam,
    body: z.object({ name: nameSchema.optional(), path: pathSchema.optional() })
      .refine((b) => b.name !== undefined || b.path !== undefined, 'Nothing to change'),
  }),
  async (req, res) => {
    const owner = req.user._id;
    const item = await findOwned(req, req.valid.params.id);
    const newName = req.valid.body.name ?? item.name;
    const newPath = req.valid.body.path ?? item.path;
    if (newName === item.name && newPath === item.path) return res.json(fileDto(item));

    // Target folder must exist
    const ancestors = ancestorsOf(newPath);
    if (ancestors.length) {
      const parent = ancestors[ancestors.length - 1];
      if (!(await File.exists({ owner, type: 'folder', path: parent.path, name: parent.name }))) {
        throw badRequest('Destination folder does not exist');
      }
    }

    const oldFull = childPath(item.path, item.name);
    if (item.type === 'folder' && newPath.startsWith(oldFull)) {
      throw badRequest('A folder cannot be moved into itself');
    }
    if (await File.exists({ owner, path: newPath, name: newName })) {
      throw conflict('An item with this name already exists there');
    }

    item.name = newName;
    item.path = newPath;
    await item.save();

    if (item.type === 'folder') {
      const newFull = childPath(newPath, newName);
      // Rewrite the prefix of every descendant's path. Byte offsets are used because the
      // prefix is matched exactly, so its UTF-8 length is the cut point.
      await File.updateMany(
        { owner, path: { $regex: `^${escapeRegex(oldFull)}` } },
        [{ $set: { path: { $concat: [newFull, { $substrBytes: ['$path', Buffer.byteLength(oldFull), -1] }] } } }]
      );
    }
    res.json(fileDto(item));
  }
);

// ---------- delete ----------

router.delete('/:id', validate({ params: idParam }), async (req, res) => {
  const item = await findOwned(req, req.valid.params.id);
  const deleted = await deleteItems(req.user._id, [item.toObject()]);
  res.json({ deleted });
});

router.post(
  '/bulk-delete',
  validate({ body: z.object({ ids: z.array(objectId).min(1).max(500) }) }),
  async (req, res) => {
    const items = await File.find({ _id: { $in: req.valid.body.ids }, owner: req.user._id }).lean();
    const deleted = await deleteItems(req.user._id, items);
    res.json({ deleted });
  }
);

// ---------- share links ----------

const EXPIRY_MS = { '1h': 3600e3, '24h': 86400e3, '7d': 7 * 86400e3, '30d': 30 * 86400e3 };

router.get('/:id/links', validate({ params: idParam }), async (req, res) => {
  const file = await findOwned(req, req.valid.params.id, 'file');
  const links = await ShareLink.find({ file: file._id }).sort({ createdAt: -1 }).lean();
  res.json({ links: links.map(linkDto) });
});

router.post(
  '/:id/links',
  validate({
    params: idParam,
    body: z
      .object({
        scope: z.enum(['public', 'restricted']).default('public'),
        emails: z.array(email).max(50).default([]),
        password: z.string().min(4, 'Password must be at least 4 characters').max(128).optional(),
        expiresIn: z.enum(['1h', '24h', '7d', '30d', 'never']).default('7d'),
        maxDownloads: z.number().int().min(1).max(10000).nullable().default(null),
      })
      .refine((b) => b.scope === 'public' || b.emails.length > 0, 'Add at least one email for a restricted link'),
  }),
  async (req, res) => {
    const file = await findOwned(req, req.valid.params.id, 'file');
    const { scope, emails, password, expiresIn, maxDownloads } = req.valid.body;

    const link = await ShareLink.create({
      token: crypto.randomBytes(24).toString('base64url'),
      file: file._id,
      owner: req.user._id,
      scope,
      allowedEmails: scope === 'restricted' ? [...new Set(emails)] : [],
      passwordHash: password ? await bcrypt.hash(password, 10) : null,
      expiresAt: expiresIn === 'never' ? null : new Date(Date.now() + EXPIRY_MS[expiresIn]),
      maxDownloads,
    });
    res.status(201).json(linkDto(link));
  }
);

// ---------- direct shares ----------

router.get('/:id/shares', validate({ params: idParam }), async (req, res) => {
  const file = await findOwned(req, req.valid.params.id, 'file');
  const shares = await Share.find({ file: file._id }).populate('recipient', 'name email').sort({ createdAt: 1 }).lean();
  res.json({ recipients: shares.filter((s) => s.recipient).map(recipientDto) });
});

router.post(
  '/:id/shares',
  validate({ params: idParam, body: z.object({ recipientId: objectId, wrappedKey }) }),
  async (req, res) => {
    const file = await findOwned(req, req.valid.params.id, 'file');
    const { recipientId, wrappedKey: key } = req.valid.body;
    if (recipientId === String(req.user._id)) throw badRequest('You already own this file');

    const recipient = await User.findOne({ _id: recipientId, emailVerified: true }).lean();
    if (!recipient) throw notFound('No verified user with that id');

    const share = await Share.findOneAndUpdate(
      { file: file._id, recipient: recipient._id },
      { $set: { wrappedKey: key }, $setOnInsert: { owner: req.user._id } },
      { upsert: true, new: true }
    ).populate('recipient', 'name email');
    res.status(201).json(recipientDto(share));
  }
);

router.delete(
  '/:id/shares/:recipientId',
  validate({ params: z.object({ id: objectId, recipientId: objectId }) }),
  async (req, res) => {
    const file = await findOwned(req, req.valid.params.id, 'file');
    await Share.deleteOne({ file: file._id, recipient: req.valid.params.recipientId });
    res.json({ ok: true });
  }
);

module.exports = router;
