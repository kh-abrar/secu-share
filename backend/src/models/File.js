const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['file', 'folder'], required: true },
    name: { type: String, required: true },          // single path segment
    path: { type: String, required: true, default: '/' }, // parent folder, "/" or "/a/b/"

    // Files only
    storageKey: { type: String },     // object key of the encrypted blob
    mimetype: { type: String },       // as declared by the uploader (metadata only)
    size: { type: Number },           // plaintext bytes
    encryptedSize: { type: Number },  // stored bytes, counted against the quota
    // The file's AES key, wrapped with the owner's public key
    wrappedKey: { type: String },
  },
  { timestamps: true }
);

// One item per name in a folder
fileSchema.index({ owner: 1, path: 1, name: 1 }, { unique: true });
fileSchema.index({ owner: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('File', fileSchema);
