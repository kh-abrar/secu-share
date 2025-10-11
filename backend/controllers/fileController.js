// controllers/fileController.js
const pdfParse = require('pdf-parse');
const File = require('../models/File');
const User = require('../models/User');
const ShareLink = require('../models/ShareLink');
// const OpenAI = require('openai');
const { s3Client, deleteFileFromS3, getSignedUrl, uploadFileToS3 } = require('../config/s3');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const pathposix = require('path').posix;
const crypto = require('crypto');

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const BUCKET = process.env.AWS_S3_BUCKET;

/** Helpers */
function splitRelative(rel) {
  const safe = (rel || '').replace(/^\/+/, '').replace(/\\/g, '/');
  const dir = pathposix.dirname(safe);
  const base = pathposix.basename(safe);
  const normDir = dir === '.' ? '/' : `/${dir.replace(/^\/?/, '').replace(/\/?$/, '')}/`;
  return { dir: normDir, base };
}

async function ensureFolders(ownerId, fullDir) {
  if (fullDir === '/') return;
  const parts = fullDir.split('/').filter(Boolean);
  let acc = '/';
  for (const name of parts) {
    const parentPath = acc;
    const thisPath = `${acc}${name}/`;
    await File.updateOne(
      { owner: ownerId, type: 'folder', path: parentPath, name },
      { $setOnInsert: { type: 'folder' } },
      { upsert: true }
    );
    acc = thisPath;
  }
}

function s3KeyFor(ownerId, dir, base) {
  const key = `${ownerId}${dir}${base}`.replace(/\/{2,}/g, '/');
  return key.startsWith('/') ? key.slice(1) : key;
}

function parseExpiry(expiry) {
  if (!expiry || expiry === 'never') return null;
  const n = parseInt(expiry);
  if (Number.isNaN(n)) return null;
  if (expiry.endsWith('h')) return new Date(Date.now() + n * 3600 * 1000);
  if (expiry.endsWith('d')) return new Date(Date.now() + n * 24 * 3600 * 1000);
  return null;
}

/**
 * Robust parser for relativePaths supporting:
 *  - array of fields named 'relativePaths'
 *  - array of fields named 'relativePaths[]'
 *  - single string 'relativePaths'
 *  - JSON array in 'relativePathsJson' or when 'relativePaths' starts with '['
 */
function parseRelativePaths(body) {
  if (!body) return [];
  let rels = body.relativePaths;

  // If client sent as JSON string in 'relativePathsJson'
  if (!rels && typeof body.relativePathsJson === 'string') {
    try { return JSON.parse(body.relativePathsJson) || []; } catch { return []; }
  }

  // If client sent multiple parts: express will make it an array already
  if (Array.isArray(rels)) return rels;

  if (typeof rels === 'string') {
    const s = rels.trim();
    if (s.startsWith('[')) {
      try { return JSON.parse(s) || []; } catch { return []; }
    }
    // single string will be wrapped later in controller to align with files.length
    return [s];
  }

  return [];
}

/** NEW: multi-file, folder-aware + accepts both 'file' and 'files' field names */
exports.uploadMany = async (req, res) => {
  try {
    const userId = req.userId;
    const files = Array.isArray(req.files) ? req.files : [];
    const relativePathsRaw = parseRelativePaths(req.body);

    if (!files.length) return res.status(400).json({ message: 'No files uploaded' });

    // If provided, count must match. If not provided, we’ll fall back to originalname.
    if (relativePathsRaw.length && relativePathsRaw.length !== files.length) {
      return res.status(400).json({ message: 'relativePaths length mismatch' });
    }

    // Optional: parent path prefix to drop files into (e.g. current folder in UI)
    // Must start and end with '/' if present; normalize lightly
    let parentPath = req.body.parentPath || '/';
    if (!parentPath.startsWith('/')) parentPath = '/' + parentPath;
    if (!parentPath.endsWith('/')) parentPath = parentPath + '/';

    const results = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];

      // Use provided relative path or fallback to original name (flat upload)
      let rel = relativePathsRaw[i] || f.originalname;

      // If user specified a parentPath, prefix it unless rel already includes subfolders
      if (parentPath !== '/' && rel && !rel.startsWith('/')) {
        rel = (parentPath.replace(/^\//, '') + rel).replace(/\\/g, '/');
      }

      const { dir, base } = splitRelative(rel);
      if (!base || base.includes('/')) {
        return res.status(400).json({ message: `Invalid filename for index ${i}` });
      }

      await ensureFolders(userId, dir);

      const key = s3KeyFor(userId, dir, base);
      await uploadFileToS3(f.buffer, key, f.mimetype || 'application/octet-stream');

      const fileDoc = await File.create({
        type: 'file',
        name: base,
        path: dir,
        owner: userId,
        filename: key,
        originalName: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
        encryptionType: req.body.encryptionType || null,
        iv: req.body.iv || null,
        encryptedKey: req.body.encryptedKey || null,
        isPublic: false,
        accessLevel: 'private',
      });

      // // Optional tiny-PDF summary (kept commented)
      // if (f.mimetype === 'application/pdf' && f.size <= 2 * 1024 * 1024 && process.env.OPENAI_API_KEY) {
      //   try {
      //     const s3Resp = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
      //     const chunks = [];
      //     for await (const chunk of s3Resp.Body) chunks.push(chunk);
      //     const pdfData = await pdfParse(Buffer.concat(chunks));
      //     const inputText = (pdfData.text || '').slice(0, 10000);

      //     const completion = await openai.chat.completions.create({
      //       model: 'gpt-3.5-turbo',
      //       messages: [
      //         { role: 'system', content: 'Summarize the following PDF text:' },
      //         { role: 'user', content: inputText },
      //       ],
      //       temperature: 0.5,
      //     });

      //     fileDoc.aiSummary = completion.choices?.[0]?.message?.content ?? null;
      //     await fileDoc.save();
      //   } catch (aiError) {
      //     console.error('OpenAI summarization failed:', aiError.message);
      //   }
      // }

      results.push({
        id: fileDoc._id,
        name: fileDoc.name,
        path: fileDoc.path,
        filename: fileDoc.filename,
      });
    }

    // Optional: auto-create a share link based on UploadModal inputs
    const shareType = req.body.shareType; // "public" | "private"
    const emailsRaw = req.body.emails;    // JSON string when private
    const expiry = parseExpiry(req.body.expiry); // "24h" | "7d" | "never"

    let link = null;
    if (shareType === 'public' || shareType === 'private') {
      let allowedEmails = [];
      if (shareType === 'private' && emailsRaw) {
        try { allowedEmails = JSON.parse(emailsRaw) || []; } catch {}
        
        // Also share files directly with users for "Shared With Me" functionality
        if (allowedEmails.length > 0) {
          const targetUsers = await User.find({ 
            email: { $in: allowedEmails.map(e => e.toLowerCase()) } 
          });
          const targetUserIds = targetUsers.map(u => u._id);
          
          // Add users to sharedWith array for each uploaded file
          for (const result of results) {
            await File.findByIdAndUpdate(result.id, {
              $addToSet: { sharedWith: { $each: targetUserIds } }
            });
          }
        }
      }
      const token = crypto.randomBytes(32).toString('hex');
      link = await ShareLink.create({
        token,
        file: results[0]?.id, // currently links first uploaded file
        createdBy: userId,
        scope: shareType === 'public' ? 'public' : 'restricted',
        allowedEmails,
        expiresAt: expiry,
        maxAccess: null,
      });
    }

    res.status(201).json({
      created: results,
      shareLink: link
        ? {
            token: link.token,
            url: `${process.env.BASE_URL || `${req.protocol}://${req.get('host')}`}/api/share/access/${link.token}`,
            scope: link.scope,
            expiresAt: link.expiresAt,
          }
        : null,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
};

/** Unchanged APIs — with small safety fixes */
exports.getUserFiles = async (req, res) => {
  try {
    const files = await File.find({ owner: req.userId }).sort({ createdAt: -1 });
    res.json(files);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.downloadFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    const hasAccess =
      file &&
      (file.owner.toString() === req.userId.toString() ||
        (Array.isArray(file.sharedWith) && file.sharedWith.some(id => id.toString() === req.userId.toString())));

    if (!hasAccess) {
      return res.status(403).json({ message: 'File not found or access denied' });
    }

    // Stream the file directly from S3 to avoid CORS issues
    const { s3Client } = require('../config/s3');
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: file.filename,
    });

    const s3Response = await s3Client.send(command);
    
    // Set appropriate headers for download
    res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Length', file.size || s3Response.ContentLength);
    
    // Stream the file content
    s3Response.Body.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.userId });
    if (!file) return res.status(404).json({ message: 'File not found' });

    try {
      await deleteFileFromS3(file.filename);
    } catch (s3Err) {
      console.error('S3 deletion failed:', s3Err.message);
      return res.status(500).json({ message: 'S3 deletion failed' });
    }

    await File.findByIdAndDelete(req.params.id);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.shareWithUser = async (req, res) => {
  try {
    const { fileId, targetUserId, targetEmail } = req.body;

    const file = await File.findById(fileId);
    if (!file || file.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'File not found or access denied' });
    }

    let targetUser = null;
    if (targetUserId) targetUser = await User.findById(targetUserId);
    else if (targetEmail) targetUser = await User.findOne({ email: String(targetEmail).toLowerCase() });

    if (!targetUser) return res.status(404).json({ message: 'Target user not found' });

    const exists = (file.sharedWith || []).some(id => id.toString() === targetUser._id.toString());
    if (!exists) {
      file.sharedWith.push(targetUser._id);
      await file.save();
    }

    res.json({ message: `Access granted to ${targetUser.email}` });
  } catch (error) {
    console.error('Error sharing file:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.unshareWithUser = async (req, res) => {
  try {
    const { fileId, targetUserId, targetEmail } = req.body;

    const file = await File.findById(fileId);
    if (!file || file.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'File not found or access denied' });
    }

    let targetUser = null;
    if (targetUserId) targetUser = await User.findById(targetUserId);
    else if (targetEmail) targetUser = await User.findOne({ email: String(targetEmail).toLowerCase() });

    if (!targetUser) return res.status(404).json({ message: 'Target user not found' });

    const userIdStr = targetUser._id.toString();
    file.sharedWith = (file.sharedWith || []).filter(id => id.toString() !== userIdStr);
    await file.save();

    res.json({ message: `Access revoked from ${targetUser.email}` });
  } catch (error) {
    console.error('Error unsharing file:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getSharedWithMe = async (req, res) => {
  try {
    const files = await File.find({ sharedWith: req.userId })
      .populate('owner', 'name email')
      .sort({ createdAt: -1 });

    // Return in same format as other file endpoints for consistency
    const result = files.map(file => ({
      _id: file._id,
      type: file.type,
      name: file.name,
      path: file.path,
      owner: file.owner?._id || file.owner,
      ownerEmail: file.owner?.email,
      ownerName: file.owner?.name,
      filename: file.filename,
      originalName: file.originalName,
      mimetype: file.mimetype,
      size: file.size,
      isPublic: file.isPublic,
      sharedWith: file.sharedWith,
      encryptionType: file.encryptionType,
      iv: file.iv,
      encryptedKey: file.encryptedKey,
      accessLevel: file.accessLevel,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    }));

    res.json(result);
  } catch (error) {
    console.error('Shared-with-me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateFileAccess = async (req, res) => {
  try {
    const { accessLevel } = req.body;
    const file = await File.findOne({ _id: req.params.id, owner: req.userId });
    if (!file) return res.status(404).json({ message: 'File not found' });

    file.accessLevel = accessLevel;
    await file.save();

    res.json({ message: 'Access level updated', file });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.listByPath = async (req, res) => {
  try {
    let p = String(req.query.path || '/');
    if (!p.startsWith('/')) p = '/' + p;
    if (!p.endsWith('/')) p = p + '/';
    const items = await File.find({ owner: req.userId, path: p }).sort({ type: 1, name: 1 });
    
    // Add URL for image files
    const itemsWithUrls = items.map(item => {
      const itemObj = item.toObject();
      if (item.type === 'file' && item.mimetype && item.mimetype.startsWith('image/')) {
        // Use the preview endpoint for image thumbnails
        itemObj.url = `/api/files/preview/${item._id}`;
      }
      return itemObj;
    });
    
    res.json({ items: itemsWithUrls });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createFolder = async (req, res) => {
  try {
    let { name, path } = req.body || {};
    name = String(name || '').trim();
    if (!name) return res.status(400).json({ message: 'Missing name' });
    path = path || '/';
    if (!path.startsWith('/')) path = '/' + path;
    if (!path.endsWith('/')) path = path + '/';
    const doc = await File.create({ type: 'folder', name, path, owner: req.userId });
    res.status(201).json(doc);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: 'Folder already exists' });
    res.status(500).json({ message: 'Server error' });
  }
};

// Get image preview
exports.getImagePreview = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file || file.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'File not found or access denied' });
    }

    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return res.status(400).json({ message: 'File is not an image' });
    }

    // Use the existing download function which already works
    const { getSignedUrl } = require('../config/s3');
    const downloadUrl = await getSignedUrl(file.filename, 3600); // 1 hour expiry

    // Redirect to the signed URL
    res.redirect(downloadUrl);
  } catch (error) {
    console.error('Image preview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user storage usage
exports.getStorageUsage = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Calculate total file size for user
    const files = await File.find({ owner: userId, type: 'file' });
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
    
    // You can set different storage limits based on user plan
    // For now, using a default 15GB limit
    const storageLimit = 15 * 1024 * 1024 * 1024; // 15 GB
    
    res.json({
      used: totalSize,
      total: storageLimit,
      usedGB: (totalSize / (1024 * 1024 * 1024)).toFixed(2),
      totalGB: (storageLimit / (1024 * 1024 * 1024)).toFixed(2),
      percentage: ((totalSize / storageLimit) * 100).toFixed(1)
    });
  } catch (error) {
    console.error('Storage usage error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
