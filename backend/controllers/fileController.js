const pdfParse = require('pdf-parse');
const File = require('../models/File');
const OpenAI = require('openai');
const { s3Client, deleteFileFromS3, getSignedUrl } = require('../config/s3');
const { GetObjectCommand } = require('@aws-sdk/client-s3');


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
      path: req.file.location,
      owner: req.userId,
      isPublic: req.body.isPublic === 'true',
      encryptionType: req.body.encryptionType || null,
      iv: req.body.iv || null,
      encryptedKey: req.body.encryptedKey || null,
    });

    await fileDoc.save();

    // PDF summarization
    // if (req.file.mimetype === 'application/pdf' && process.env.OPENAI_API_KEY) {
    //   try {
    //     const getObjectCommand = new GetObjectCommand({
    //       Bucket: process.env.AWS_S3_BUCKET,
    //       Key: req.file.key,
    //     });

    //     const s3Response = await s3Client.send(getObjectCommand);
        
    //     // Convert stream to buffer
    //     const chunks = [];
    //     for await (const chunk of s3Response.Body) {
    //       chunks.push(chunk);
    //     }
    //     const pdfBuffer = Buffer.concat(chunks);

    //     const pdfData = await pdfParse(pdfBuffer);
    //     const text = pdfData.text;

    //     const inputText = text.length > 10000 ? text.substring(0, 10000) : text;

    //     // Updated OpenAI API call (v4+ syntax)
    //     const completion = await openai.chat.completions.create({
    //       model: 'gpt-3.5-turbo',
    //       messages: [
    //         { role: 'system', content: 'Summarize the following PDF text:' },
    //         { role: 'user', content: inputText },
    //       ],
    //       temperature: 0.5,
    //     });

    //     fileDoc.aiSummary = completion.choices[0].message.content;
    //     await fileDoc.save();
    //   } catch (aiError) {
    //     console.error('OpenAI summarization failed:', aiError.message);
    //   }
    // }

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
  try{
    const file = await File.findById(req.params.id);
    if (!file || (file.owner.toString() !== req.userId.toString() && !file.sharedWith?.includes(req.userId))) {
      return res.status(404).json({ message: 'File not found or access denied' });
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
      }
    })
    }catch(error){
      console.error('Download error:', error);
      res.status(500).json({ message: 'Server error' });
    }
}

exports.deleteFile = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.userId });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    await deleteFileFromS3(file.filename);
    await File.findByIdAndDelete(req.params.id);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};