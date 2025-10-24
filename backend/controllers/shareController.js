// controllers/shareController.js
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const ShareLink = require('../models/ShareLink');
const File = require('../models/File');
const User = require('../models/User');
const { getSignedUrl } = require('../config/s3');

const generateToken = () => crypto.randomBytes(32).toString('hex');

exports.createShareLink = async (req, res) => {
  try {
    const { fileId, expiresIn, maxAccess, scope, emails, userIds } = req.body; // scope: 'public'|'restricted'
    const file = await File.findById(fileId);
    if (!file || file.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'File not found or access denied' });
    }

    const token = generateToken();
    const expiresAt = expiresIn ? new Date(Date.now() + parseInt(expiresIn, 10) * 1000) : null;

    let allowedEmails = [];
    let allowedUsers = [];
    if (scope === 'restricted') {
      if (emails) {
        try { allowedEmails = Array.isArray(emails) ? emails : JSON.parse(emails); } catch {}
      }
      if (userIds) {
        const ids = Array.isArray(userIds) ? userIds : [];
        allowedUsers = ids.filter(Boolean);
      }
    }

    const shareLink = await ShareLink.create({
      token,
      file: file._id,
      createdBy: req.userId,
      scope: scope === 'restricted' ? 'restricted' : 'public',
      allowedUsers,
      allowedEmails,
      expiresAt,
      maxAccess: maxAccess || null,
      encryptionType: file.encryptionType || null,
      iv: file.iv || null,
      encryptedKey: file.encryptedKey || null,
    });

    const baseUrl = process.env.FRONTEND_URL || process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    res.status(201).json({
      shareUrl: `${baseUrl}/share/${token}`,
      token,
      expiresAt,
      maxAccess,
      scope: shareLink.scope,
      allowedUsers: shareLink.allowedUsers,
      allowedEmails: shareLink.allowedEmails,
    });
  } catch (error) {
    console.error('Create share link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createProtectedShareLink = async (req, res) => {
  try {
    const { fileId, password, expiresIn, maxAccess, scope, emails, userIds } = req.body;

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    if (file.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Access denied - You do not own this file' });
    }

    const token = generateToken();
    const expiresAt = expiresIn ? new Date(Date.now() + parseInt(expiresIn, 10) * 1000) : null;
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    let allowedEmails = [];
    let allowedUsers = [];
    if (scope === 'restricted') {
      if (emails) {
        try { allowedEmails = Array.isArray(emails) ? emails : JSON.parse(emails); } catch {}
      }
      if (userIds) {
        const ids = Array.isArray(userIds) ? userIds : [];
        allowedUsers = ids.filter(Boolean);
      }
    }

    const shareLink = await ShareLink.create({
      token,
      file: file._id,
      createdBy: req.userId,
      scope: scope === 'restricted' ? 'restricted' : 'public',
      allowedUsers,
      allowedEmails,
      passwordHash,
      expiresAt,
      maxAccess: maxAccess || null,
      encryptionType: file.encryptionType || null,
      iv: file.iv || null,
      encryptedKey: file.encryptedKey || null,
    });

    const baseUrl = process.env.FRONTEND_URL || process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    res.status(201).json({
      shareUrl: `${baseUrl}/share/${token}`,
      token,
      expiresAt,
      maxAccess,
      scope: shareLink.scope,
      protected: !!password,
    });
  } catch (error) {
    console.error('Create protected share link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.accessShareLink = async (req, res) => {
  try {
    const { token } = req.params;
    const password = req.query.password || null; // GET accepts ?password=
    const userId = req.userId || null;          // set by optionalAuth if present
    const userEmail = (req.userEmail || '').toLowerCase();

    const link = await ShareLink.findOne({ token }).populate({
      path: 'file',
      populate: { path: 'owner', select: 'name email' }
    });

    if (!link || !link.file) return res.status(404).json({ message: 'Share link not found' });
    if (link.revokedAt) return res.status(410).json({ message: 'Link revoked' });

    const now = new Date();
    if (link.expiresAt && now > link.expiresAt) return res.status(410).json({ message: 'Link expired' });
    if (link.maxAccess !== null && link.accessCount >= link.maxAccess) {
      return res.status(403).json({ message: 'Max access limit reached' });
    }

    // Password check
    if (link.passwordHash) {
      if (!password) return res.status(401).json({ message: 'Password required' });
      const ok = await bcrypt.compare(password, link.passwordHash);
      if (!ok) return res.status(403).json({ message: 'Incorrect password' });
    }

    // Restricted check
    if (link.scope === 'restricted') {
      let ok = false;
      if (userId && (link.allowedUsers || []).some(u => u.toString() === userId.toString())) ok = true;
      if (!ok && userEmail && (link.allowedEmails || []).map(e => String(e).toLowerCase()).includes(userEmail)) ok = true;
      if (!ok) return res.status(403).json({ message: 'Not allowed for this link' });
    }

    link.accessCount += 1;
    
    // Mark as seen by the user if they are logged in
    if (userId && !link.seenBy.includes(userId)) {
      link.seenBy.push(userId);
    }
    
    await link.save();

    // Check if this is a folder link
    if (link.file.type === 'folder') {
      return res.status(400).json({ message: 'Folder links not implemented' });
    }

    // File download
    const signedUrl = await getSignedUrl(link.file.filename, 300);

    res.json({
      downloadUrl: signedUrl,
      metadata: {
        originalName: link.file.originalName,
        mimetype: link.file.mimetype,
        encryptionType: link.encryptionType,
        iv: link.iv,
        encryptedKey: link.encryptedKey,
        owner: { name: link.file.owner?.name, email: link.file.owner?.email },
      },
    });
  } catch (error) {
    console.error('Access shared file error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add shared file to user's account
exports.addSharedFileToAccount = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const userId = req.userId;

    // First verify access to the shared file
    const link = await ShareLink.findOne({ token }).populate('file');
    if (!link || !link.file) {
      return res.status(404).json({ message: 'Share link not found' });
    }

    // Check if link is revoked or expired
    if (link.revokedAt) {
      return res.status(410).json({ message: 'Link revoked' });
    }

    const now = new Date();
    if (link.expiresAt && now > link.expiresAt) {
      return res.status(410).json({ message: 'Link expired' });
    }

    // Password check if required
    if (link.passwordHash) {
      if (!password) {
        return res.status(401).json({ message: 'Password required' });
      }
      const ok = await bcrypt.compare(password, link.passwordHash);
      if (!ok) {
        return res.status(403).json({ message: 'Incorrect password' });
      }
    }

    // Check if user already has this file
    const existingFile = await File.findOne({
      owner: userId,
      name: link.file.name,
      path: '/'
    });

    if (existingFile) {
      return res.status(409).json({ message: 'File already exists in your account' });
    }

    // Create a copy of the file for the user
    const newFile = new File({
      type: link.file.type,
      name: link.file.name,
      path: '/', // Add to root directory
      owner: userId,
      filename: link.file.filename,
      originalName: link.file.originalName,
      mimetype: link.file.mimetype,
      size: link.file.size,
      encryptionType: link.file.encryptionType,
      iv: link.file.iv,
      encryptedKey: link.file.encryptedKey,
      isPublic: false,
      accessLevel: 'private'
    });

    await newFile.save();

    res.json({
      message: 'File added to your account successfully',
      file: {
        id: newFile._id,
        name: newFile.name,
        path: newFile.path,
        originalName: newFile.originalName,
        mimetype: newFile.mimetype,
        size: newFile.size
      }
    });
  } catch (error) {
    console.error('Add shared file to account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteShareLink = async (req, res) => {
  try {
    const { token } = req.params;
    const link = await ShareLink.findOne({ token });
    if (!link || link.createdBy.toString() !== req.userId.toString()) {
      return res.status(404).json({ message: 'Share link not found or unauthorized' });
    }

    // Soft revoke (keeps audit trail)
    link.revokedAt = new Date();
    await link.save();

    res.json({ message: 'Share link revoked' });
  } catch (error) {
    console.error('Delete share link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUnseenSharedFiles = async (req, res) => {
  try {
    const unseenLinks = await ShareLink.find({
      allowedUsers: req.userId,
      seenBy: { $ne: req.userId },
      revokedAt: null
    }).populate('file', 'name size createdAt mimetype').populate('createdBy', 'name email');

    res.json({ 
      unseen: unseenLinks.length, 
      unseenLinks: unseenLinks.map(link => ({
        token: link.token,
        file: link.file,
        createdBy: link.createdBy,
        createdAt: link.createdAt,
        expiresAt: link.expiresAt
      }))
    });
  } catch (error) {
    console.error('Get unseen shared files error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
