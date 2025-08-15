const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename: { type: String, required: true },         // S3 key
  originalName: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  path: { type: String, required: true },             // S3 URL
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isPublic: { type: Boolean, default: false },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // aiSummary: { type: String, default: null },
  encryptionType: {type: String, default: null},
  iv: {type: String, default: null},
  encryptedKey: {type: String, default: null}
}, {
  timestamps: true,
});

module.exports = mongoose.model('File', fileSchema);
