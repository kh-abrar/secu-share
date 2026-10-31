// A link to a single file: /share/<token>#<file key>.
// The decryption key lives only in the URL fragment, which browsers never send to the
// server; the token (path) is what the server checks access against.
const mongoose = require('mongoose');

const shareLinkSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true },
    file: { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // public: anyone with the link; restricted: signed-in, verified users whose email is listed
    scope: { type: String, enum: ['public', 'restricted'], default: 'public' },
    allowedEmails: [{ type: String, lowercase: true, trim: true }],

    passwordHash: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    maxDownloads: { type: Number, default: null },
    downloadCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

shareLinkSchema.index({ file: 1 });
shareLinkSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model('ShareLink', shareLinkSchema);
