const crypto = require('crypto');
const ShareLink = require('../models/ShareLink');
const File = require('../models/File');
const { getSignedUrl } = require('../config/s3');
const bcrypt = require('bcrypt');

const generateToken = () => crypto.randomBytes(32).toString('hex');

exports.createShareLink = async (req, res) => {
  try {
    const { fileId, expiresIn, maxAccess } = req.body;
    const file = await File.findById(fileId);
    if (!file || file.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'File not found or access denied' });
    }

    const token = generateToken();
    const expiresAt = expiresIn ? new Date(Date.now() + parseInt(expiresIn) * 1000) : null;

    const shareLink = new ShareLink({
      token,
      file: file._id,
      createdBy: req.userId,
      expiresAt,
      maxAccess: maxAccess || null,
      encryptionType: file.encryptionType || null,
      iv: file.iv || null,
      encryptedKey: file.encryptedKey || null,
    });
    await shareLink.save();

    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;

    res.status(201).json({
      shareUrl: `${baseUrl}/api/share/access/${token}`,
      token,
      expiresAt,
      maxAccess,
    });
  } catch (error) {
    console.error('Create share link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.accessShareLink = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const userId = req.userId; // if user is logged in, this will be set by auth middleware

    const link = await ShareLink.findOne({ token }).populate({
      path: 'file',
      populate: { path: 'owner', select: 'name email' }
    });

    if (!link || !link.file) {
      return res.status(404).json({ message: 'Share link not found' });
    }

    const now = new Date();
    if (link.expiresAt && now > link.expiresAt) {
      return res.status(410).json({ message: 'Link expired' });
    }

    if (link.maxAccess !== null && link.accessCount >= link.maxAccess) {
      return res.status(403).json({ message: 'Max access limit reached' });
    }

    // 🔐 Check password protection
    if (link.passwordHash) {
      if (!password) {
        return res.status(401).json({ message: 'Password required' });
      }
      const isMatch = await bcrypt.compare(password, link.passwordHash);
      if (!isMatch) {
        return res.status(403).json({ message: 'Incorrect password' });
      }
    }

    // ✅ Optionally add to sharedWith if user is logged in
    if (userId && !link.file.sharedWith.includes(userId)) {
      link.file.sharedWith.push(userId);
      await link.file.save();
    }

    link.accessCount += 1;
    await link.save();

    const signedUrl = await getSignedUrl(link.file.filename, 300);

    res.json({
      downloadUrl: signedUrl,
      metadata: {
        originalName: link.file.originalName,
        mimetype: link.file.mimetype,
        encryptionType: link.encryptionType,
        iv: link.iv,
        encryptedKey: link.encryptedKey,
        owner: {
          name: link.file.owner?.name,
          email: link.file.owner?.email,
        },
        sharedWithMe: !!userId,
      },
    });
  } catch (error) {
    console.error('Access shared file error:', error);
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

    await ShareLink.deleteOne({ token });
    res.json({ message: 'Share link deleted' });
  } catch (error) {
    console.error('Delete share link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createProtectedShareLink = async (req, res) => {
  try {
    const { fileId, password, expiresIn, maxAccess } = req.body;

    const file = await File.findById(fileId);
    if (!file || file.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'File not found or access denied' });
    }

    const token = generateToken();
    const expiresAt = expiresIn ? new Date(Date.now() + parseInt(expiresIn) * 1000) : null;

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    const shareLink = new ShareLink({
      token,
      file: file._id,
      createdBy: req.userId,
      expiresAt,
      maxAccess: maxAccess || null,
      encryptionType: file.encryptionType || null,
      iv: file.iv || null,
      encryptedKey: file.encryptedKey || null,
      passwordHash,
    });

    await shareLink.save();

    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;

    res.status(201).json({
      shareUrl: `${baseUrl}/api/share/access/${token}`,
      token,
      expiresAt,
      maxAccess,
      protected: !!password,
    });
  } catch (error) {
    console.error('Create protected share link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
