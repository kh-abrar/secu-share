const File = require('../models/File');
const Share = require('../models/Share');
const ShareLink = require('../models/ShareLink');
const storage = require('../storage');
const logger = require('../lib/logger');
const { childPath, escapeRegex } = require('../lib/paths');

// Filter matching everything inside a folder (any depth)
const descendantsOf = (ownerId, folder) => ({
  owner: ownerId,
  path: { $regex: `^${escapeRegex(childPath(folder.path, folder.name))}` },
});

/**
 * Deletes items (and, for folders, everything inside them) together with their links,
 * direct shares and stored blobs. Database records go first so nothing stays
 * reachable; blob cleanup failures are logged, never surfaced as data loss.
 */
async function deleteItems(ownerId, items) {
  const all = [...items];
  for (const item of items) {
    if (item.type === 'folder') all.push(...(await File.find(descendantsOf(ownerId, item)).lean()));
  }

  const ids = all.map((f) => f._id);
  const keys = all.filter((f) => f.type === 'file' && f.storageKey).map((f) => f.storageKey);

  await Promise.all([
    ShareLink.deleteMany({ file: { $in: ids } }),
    Share.deleteMany({ file: { $in: ids } }),
  ]);
  await File.deleteMany({ _id: { $in: ids } });

  try {
    await storage.deleteMany(keys);
  } catch (err) {
    logger.error({ err, keys: keys.length }, 'Failed to delete stored blobs');
  }
  return all.length;
}

async function storageUsed(ownerId) {
  const [row] = await File.aggregate([
    { $match: { owner: ownerId, type: 'file' } },
    { $group: { _id: null, used: { $sum: '$encryptedSize' } } },
  ]);
  return row?.used ?? 0;
}

// Creates any missing folders along a path, e.g. "/a/b/" creates "a" and "a/b"
async function ensureFolders(ownerId, path) {
  let parent = '/';
  for (const name of path.split('/').filter(Boolean)) {
    try {
      await File.updateOne(
        { owner: ownerId, path: parent, name },
        { $setOnInsert: { type: 'folder' } },
        { upsert: true }
      );
    } catch (err) {
      if (err.code !== 11000) throw err; // concurrent creation of the same folder
    }
    const existing = await File.findOne({ owner: ownerId, path: parent, name }).select('type').lean();
    if (existing.type !== 'folder') return { conflict: `${parent}${name}` };
    parent = childPath(parent, name);
  }
  return {};
}

module.exports = { deleteItems, storageUsed, ensureFolders, descendantsOf };
