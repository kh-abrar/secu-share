// A file shared directly with another registered (verified) user.
const mongoose = require('mongoose');

const shareSchema = new mongoose.Schema(
  {
    file: { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // The file's AES key, wrapped with the recipient's public key
    wrappedKey: { type: String, required: true },
    seenAt: { type: Date, default: null },
  },
  { timestamps: true }
);

shareSchema.index({ file: 1, recipient: 1 }, { unique: true });
shareSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Share', shareSchema);
