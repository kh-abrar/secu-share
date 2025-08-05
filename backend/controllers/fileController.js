const pdfParse = require('pdf-parse');
const File = require('../models/File');
const OpenAI = require('openai'); // ✅ FIXED
const { s3, deleteFileFromS3 } = require('../config/s3');

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
    });

    await fileDoc.save();

    // PDF summarization
    if (req.file.mimetype === 'application/pdf' && process.env.OPENAI_API_KEY) {
      try {
        const s3File = await s3.getObject({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: req.file.key,
        }).promise();

        const pdfBuffer = s3File.Body;
        const pdfData = await pdfParse(pdfBuffer);
        const text = pdfData.text;

        const inputText = text.length > 10000 ? text.substring(0, 10000) : text;

        const completion = await openai.createChatCompletion({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'Summarize the following PDF text:' },
            { role: 'user', content: inputText },
          ],
          temperature: 0.5,
        });

        fileDoc.aiSummary = completion.data.choices[0].message.content;
        await fileDoc.save();
      } catch (aiError) {
        console.error('OpenAI summarization failed:', aiError.message);
      }
    }

    res.status(201).json(fileDoc);
  } catch (error) {
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
    res.status(500).json({ message: 'Server error' });
  }
};
