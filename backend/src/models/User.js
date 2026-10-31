const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },

    // bcrypt of the client-derived auth hash. The raw password never leaves the browser.
    passwordHash: { type: String, required: true, select: false },

    // Account key pair (RSA-OAEP). The private key is encrypted in the browser with a
    // key derived from the password; the server cannot decrypt it.
    publicKey: { type: String, required: true },
    encryptedPrivateKey: { type: String, required: true },
    privateKeyIv: { type: String, required: true },

    // Bumped on password change. Sessions holding an older value are rejected, which
    // signs out every other device.
    sessionVersion: { type: Number, default: 0 },

    emailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, default: null, select: false },
    emailVerificationExpires: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

userSchema.index({ emailVerificationTokenHash: 1 }, { sparse: true });

module.exports = mongoose.model('User', userSchema);
