// routes/fileRoute.js
const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const authMiddleware = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');
const rateLimit = require('express-rate-limit');

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many upload attempts, please try again later.',
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '100000000') },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    return extname && mimetype ? cb(null, true) : cb(new Error('Invalid file type'));
  },
});

// Supports both flat files and folders (via relativePaths[])
router.post('/upload', authMiddleware, uploadLimiter, upload.array('files'), fileController.uploadMany);

router.get('/', authMiddleware, fileController.getUserFiles);
router.delete('/:id', authMiddleware, fileController.deleteFile);
router.get('/download/:id', authMiddleware, fileController.downloadFile);
router.post('/share', authMiddleware, fileController.shareWithUser);
router.post('/unshare', authMiddleware, fileController.unshareWithUser);
router.get('/shared-with-me', authMiddleware, fileController.getSharedWithMe);

module.exports = router;
