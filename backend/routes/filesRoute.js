const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const authMiddleware = require('../middlewares/authMiddleware');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { s3Client } = require('../config/s3');
const path = require('path');
const rateLimit = require('express-rate-limit');

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many upload attempts, please try again later.',
});

const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET,
    acl: 'private',
    key: (req, file, cb) => {
      const filename = `uploads/${Date.now()}-${file.originalname}`;
      cb(null, filename);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
  }),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '100000000') },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    return extname && mimetype ? cb(null, true) : cb(new Error('Invalid file type'));
  },
});

router.post('/upload', authMiddleware, uploadLimiter, upload.single('file'), fileController.uploadFile);
router.get('/', authMiddleware, fileController.getUserFiles);
router.delete('/:id', authMiddleware, fileController.deleteFile);
router.get('/download/:id', authMiddleware, fileController.downloadFile);
router.post('/share', authMiddleware, fileController.shareWithUser);
router.post('/unshare', authMiddleware, fileController.unshareWithUser);
router.get('/shared-with-me', authMiddleware, fileController.getSharedWithMe);


module.exports = router;