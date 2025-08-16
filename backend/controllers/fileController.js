const pdfParse = require('pdf-parse');
const File = require('../models/File');
const User = require('../models/User');
const OpenAI = require('openai');
const {
  s3Client,
  deleteFileFromS3,
  getSignedUrl
} = require('../config/s3');
const {
  GetObjectCommand
} = require('@aws-sdk/client-s3');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileDoc = new File({
      filename: req.file.key,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: `s3://${process.env.AWS_S3_BUCKET}/${req.file.key}`,
      owner: req.userId,
      isPublic: req.body.isPublic === 'true',
      encryptionType: req.body.encryptionType || null,
      iv: req.body.iv || null,
      encryptedKey: req.body.encryptedKey || null,
    });

    await fileDoc.save();

    // Optional: PDF summarization
    if (
      req.file.mimetype === 'application/pdf' &&
      req.file.size <= 2 * 1024 * 1024 &&
      process.env.OPENAI_API_KEY
    ) {
      try {
        const getObjectCommand = new GetObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: req.file.key,
        });

        const s3Response = await s3Client.send(getObjectCommand);
        const chunks = [];
        for await (const chunk of s3Response.Body) {
          chunks.push(chunk);
        }
        const pdfBuffer = Buffer.concat(chunks);
        const pdfData = await pdfParse(pdfBuffer);

        const inputText = pdfData.text.slice(0, 10000);

        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'Summarize the following PDF text:' },
            { role: 'user', content: inputText },
          ],
          temperature: 0.5,
        });

        fileDoc.aiSummary = completion.choices[0].message.content;
        await fileDoc.save();
      } catch (aiError) {
        console.error('OpenAI summarization failed:', aiError.message);
      }
    }

    res.status(201).json(fileDoc);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
};

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
        (Array.isArray(file.sharedWith) && file.sharedWith.includes(req.userId)));

    if (!hasAccess) {
      return res.status(403).json({ message: 'File not found or access denied' });
    }

    const signedUrl = await getSignedUrl(file.filename, 300);
    res.json({
      downloadUrl: signedUrl,
      metadata: {
        encryptionType: file.encryptionType,
        iv: file.iv,
        encryptedKey: file.encryptedKey,
        originalName: file.originalName,
        mimetype: file.mimetype,
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.userId });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

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

    if (targetUserId) {
      targetUser = await User.findById(targetUserId);
    } else if (targetEmail) {
      targetUser = await User.findOne({ email: targetEmail.toLowerCase() });
    }

    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    if (!file.sharedWith.includes(targetUser._id)) {
      file.sharedWith.push(targetUser._id);
      await file.save();
    }

    res.json({ message: `Access granted to ${targetUser.email}` });
  } catch (error) {
    console.error('Error sharing file:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

exports.unshareWithUser = async (req, res) => {
  try {
    const { fileId, targetUserId, targetEmail } = req.body;

    const file = await File.findById(fileId);
    if (!file || file.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'File not found or access denied' });
    }

    let targetUser = null;
    if (targetUserId) {
      targetUser = await User.findById(targetUserId);
    } else if (targetEmail) {
      targetUser = await User.findOne({ email: targetEmail.toLowerCase() });
    }

    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    const userIdStr = targetUser._id.toString();
    file.sharedWith = file.sharedWith.filter(id => id.toString() !== userIdStr);
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
      .populate('owner', 'name email') // Fetch owner name & email
      .sort({ createdAt: -1 });

    const result = files.map(file => ({
      id: file._id,
      originalName: file.originalName,
      mimetype: file.mimetype,
      size: file.size,
      createdAt: file.createdAt,
      encryptionType: file.encryptionType,
      iv: file.iv,
      encryptedKey: file.encryptedKey,
      aiSummary: file.aiSummary || null,
      owner: {
        id: file.owner._id,
        name: file.owner.name,
        email: file.owner.email,
      }
    }));

    res.json(result);
  } catch (error) {
    console.error('Shared-with-me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
