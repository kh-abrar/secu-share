// models/ShareLink.js
const mongoose = require('mongoose');

const shareLinkSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, index: true },
  file: { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  scope: { type: String, enum: ['public', 'restricted'], default: 'public', index: true },
  allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  allowedEmails: [{ type: String }],

  passwordHash: { type: String, default: null },

  expiresAt: { type: Date, default: null, index: true },
  accessCount: { type: Number, default: 0 },
  maxAccess: { type: Number, default: null },

  revokedAt: { type: Date, default: null, index: true },

  seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  encryptionType: { type: String, default: null },
  iv: { type: String, default: null },
  encryptedKey: { type: String, default: null },
}, { timestamps: true });

shareLinkSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $ne: null } } }
);

shareLinkSchema.index({ file: 1, createdBy: 1 });
shareLinkSchema.index({ scope: 1, createdBy: 1 });

module.exports = mongoose.model('ShareLink', shareLinkSchema);
