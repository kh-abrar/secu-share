// models/File.js
const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  type: { type: String, enum: ['file', 'folder'], default: 'file', required: true },

  // For both files & folders
  name: { type: String, required: true }, // base name e.g. "report.pdf" or "Photos"
  path: { type: String, required: true, default: '/' }, // parent dir (ends with "/")

  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // File-only
  filename: { type: String },     // S3 key
  originalName: { type: String },
  mimetype: { type: String },
  size: { type: Number },

  // Sharing / encryption
  isPublic: { type: Boolean, default: false },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  encryptionType: { type: String, default: null },
  iv: { type: String, default: null },
  encryptedKey: { type: String, default: null },
  accessLevel: { type: String, enum: ['private', 'shared', 'public'], default: 'private' },
}, { timestamps: true });

// Uniqueness: one item per folder by name
fileSchema.index({ owner: 1, path: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('File', fileSchema);
