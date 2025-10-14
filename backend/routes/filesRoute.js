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
    const allowedExtensions = /\.(jpeg|jpg|png|gif|pdf|doc|docx|txt)$/i;
    const allowedMimeTypes = /^(image\/|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|text\/plain)/;
    
    const hasValidExtension = allowedExtensions.test(file.originalname);
    const hasValidMimeType = allowedMimeTypes.test(file.mimetype);
    
    if (hasValidExtension && hasValidMimeType) {
      return cb(null, true);
    } else {
      console.log(`File rejected: ${file.originalname}, mimetype: ${file.mimetype}`);
      return cb(new Error('Invalid file type'));
    }
  },
});

/**
 * Normalizer middleware:
 * - Accept both `file` and `files` field names
 * - Flatten to req.files array
 * - Normalize relativePaths:
 *    • supports multiple form parts with key 'relativePaths'
 *    • supports 'relativePaths[]'
 *    • supports 'relativePathsJson' with a JSON array string
 *    • supports single string value (will be wrapped to array in controller)
 */
function normalizeUploadFields(req, res, next) {
  const out = [];
  if (Array.isArray(req.files?.files)) out.push(...req.files.files);
  if (Array.isArray(req.files?.file)) out.push(...req.files.file);
  if (Array.isArray(req.files)) out.push(...req.files); // in case upload.any() is used elsewhere

  req.files = out;

  // Normalize relativePaths variants into req.body.relativePaths (string|array|stringified JSON)
  if (req.body && req.body['relativePaths[]'] && !req.body.relativePaths) {
    req.body.relativePaths = req.body['relativePaths[]'];
  }
  // Nothing else to do here; controller will finish parsing.
  next();
}

// Accept both single and multiple file fields; preserve folder structure via relativePaths.
router.post(
  '/upload',
  authMiddleware,
  uploadLimiter,
  upload.fields([
    { name: 'files', maxCount: 20000 }, // folder uploads can be big
    { name: 'file',  maxCount: 1 },     // single file convenience
  ]),
  normalizeUploadFields,
  fileController.uploadMany
);

router.get('/', authMiddleware, fileController.getUserFiles);
router.delete('/:id', authMiddleware, fileController.deleteFile);
router.get('/download/:id', authMiddleware, fileController.downloadFile);
router.post('/share', authMiddleware, fileController.shareWithUser);
router.post('/unshare', authMiddleware, fileController.unshareWithUser);
router.get('/shared-with-me', authMiddleware, fileController.getSharedWithMe);

// New endpoints
router.get('/list', authMiddleware, fileController.listByPath);
router.post('/folder', authMiddleware, fileController.createFolder);
router.get('/storage', authMiddleware, fileController.getStorageUsage);
router.get('/preview/:id', authMiddleware, fileController.getImagePreview);

// Move file/folder
router.put('/move', authMiddleware, fileController.moveFileOrFolder);

module.exports = router;
