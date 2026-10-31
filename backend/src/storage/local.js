// Stores objects as files under a base directory. Keys are server-generated
// ("<ownerId>/<uuid>"), but are still confined to the base directory defensively.
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

function createLocalStorage({ dir }) {
  const base = path.resolve(dir);
  fs.mkdirSync(base, { recursive: true });

  const resolveKey = (key) => {
    const full = path.resolve(base, key);
    if (!full.startsWith(base + path.sep)) throw new Error(`Invalid storage key: ${key}`);
    return full;
  };

  return {
    async putFile(key, srcPath) {
      const dest = resolveKey(key);
      await fs.promises.mkdir(path.dirname(dest), { recursive: true });
      await fs.promises.copyFile(srcPath, dest);
    },

    async getStream(key) {
      const full = resolveKey(key);
      const { size } = await fs.promises.stat(full);
      return { stream: fs.createReadStream(full), size };
    },

    async copy(srcKey, destKey) {
      const dest = resolveKey(destKey);
      await fs.promises.mkdir(path.dirname(dest), { recursive: true });
      await pipeline(fs.createReadStream(resolveKey(srcKey)), fs.createWriteStream(dest));
    },

    async deleteMany(keys) {
      await Promise.all(keys.map((k) => fs.promises.rm(resolveKey(k), { force: true })));
    },
  };
}

module.exports = { createLocalStorage };
