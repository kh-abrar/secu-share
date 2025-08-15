const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const authMiddleware = require('../middlewares/authMiddleware');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { s3Client } = require('../config/s3');
const path = require('path');

// Setup multer-S3 for AWS SDK v3
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET,
    acl: 'private',
    key: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      const filename = `uploads/${Date.now()}-${file.originalname}`;
      cb(null, filename);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
  }),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10000000') }, // 10MB default
  fileFilter: (req, file, cb) => {
    // Optional: Add file type validation
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// Routes
router.post('/upload', authMiddleware, upload.single('file'), fileController.uploadFile);
router.get('/', authMiddleware, fileController.getUserFiles);
router.delete('/:id', authMiddleware, fileController.deleteFile);
router.get('/download/:id', authMiddleware, fileController.downloadFile);

module.exports = router;