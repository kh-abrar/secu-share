// Explicit response shapes: internal fields (storage keys, hashes) never leave the API.

const userDto = (u) => ({
  id: String(u._id),
  email: u.email,
  name: u.name,
  emailVerified: !!u.emailVerified,
});

const keysDto = (u) => ({
  publicKey: u.publicKey,
  encryptedPrivateKey: u.encryptedPrivateKey,
  privateKeyIv: u.privateKeyIv,
});

const fileDto = (f, extra = {}) => ({
  _id: String(f._id),
  type: f.type,
  name: f.name,
  path: f.path,
  mimetype: f.mimetype ?? null,
  size: f.size ?? null,
  wrappedKey: f.wrappedKey ?? null,
  createdAt: f.createdAt,
  updatedAt: f.updatedAt,
  ...extra,
});

const linkDto = (l) => ({
  id: String(l._id),
  token: l.token,
  fileId: String(l.file?._id ?? l.file),
  scope: l.scope,
  allowedEmails: l.allowedEmails,
  hasPassword: !!l.passwordHash,
  expiresAt: l.expiresAt,
  maxDownloads: l.maxDownloads,
  downloadCount: l.downloadCount,
  expired: !!(l.expiresAt && l.expiresAt <= new Date()),
  createdAt: l.createdAt,
});

const recipientDto = (s) => ({
  recipientId: String(s.recipient._id),
  name: s.recipient.name,
  email: s.recipient.email,
  sharedAt: s.createdAt,
});

const sharedFileDto = (s) => ({
  shareId: String(s._id),
  ...fileDto(s.file, { wrappedKey: s.wrappedKey }),
  owner: { name: s.owner.name, email: s.owner.email },
  sharedAt: s.createdAt,
  seen: !!s.seenAt,
});

module.exports = { userDto, keysDto, fileDto, linkDto, recipientDto, sharedFileDto };
