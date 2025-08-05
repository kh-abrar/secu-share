const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const authMiddleware = require('../middlewares/authMiddleware');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { s3 } = require('../config/s3');
const path = require('path');

// Setup multer-S3
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET,
    acl: 'private',
    key: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      const filename = `uploads/${Date.now()}-${file.originalname}`;
      cb(null, filename);
    },
  }),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10000000') }, // 10MB default
});

// Routes
router.post('/upload', authMiddleware, upload.single('file'), fileController.uploadFile);
router.get('/', authMiddleware, fileController.getUserFiles);
router.delete('/:id', authMiddleware, fileController.deleteFile);

module.exports = router;
