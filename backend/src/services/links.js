const bcrypt = require('bcrypt');
const ShareLink = require('../models/ShareLink');
const { HttpError, notFound, gone, forbidden } = require('../lib/errors');

/**
 * Loads a link by token and enforces every access rule. Throws on denial.
 * The order matters: nothing about the file is revealed before the password check.
 */
async function authorizeLink(token, { user, password }) {
  const link = await ShareLink.findOne({ token }).populate('file').populate('owner', 'name');
  if (!link || !link.file) throw notFound('This link does not exist or was revoked');
  if (link.expiresAt && link.expiresAt <= new Date()) throw gone('This link has expired');
  if (link.maxDownloads !== null && link.downloadCount >= link.maxDownloads) {
    throw gone('This link has reached its download limit');
  }

  if (link.scope === 'restricted') {
    if (!user) throw new HttpError(401, 'Sign in to open this link', { reason: 'login_required' });
    if (!link.allowedEmails.includes(user.email)) throw forbidden('This link was not shared with your account');
    if (!user.emailVerified) {
      throw forbidden('Verify your email address to open files shared with you');
    }
  }

  if (link.passwordHash) {
    if (!password) throw new HttpError(401, 'This link is password protected', { reason: 'password_required' });
    if (!(await bcrypt.compare(password, link.passwordHash))) {
      throw new HttpError(401, 'Incorrect password', { reason: 'password_incorrect' });
    }
  }

  return link;
}

// Atomically counts one download, so concurrent requests can't exceed maxDownloads
async function consumeDownload(link) {
  const updated = await ShareLink.findOneAndUpdate(
    {
      _id: link._id,
      $or: [{ maxDownloads: null }, { $expr: { $lt: ['$downloadCount', '$maxDownloads'] } }],
    },
    { $inc: { downloadCount: 1 } },
    { new: true }
  );
  if (!updated) throw gone('This link has reached its download limit');
  return updated;
}

module.exports = { authorizeLink, consumeDownload };
