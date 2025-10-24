// routes/shareRoute.js
const express = require('express');
const router = express.Router();
const shareController = require('../controllers/shareController');
const authMiddleware = require('../middlewares/authMiddleware');
const optionalAuth = require('../middlewares/optionalAuth');

// Authenticated routes
router.post('/create', authMiddleware, shareController.createShareLink);
router.delete('/delete/:token', authMiddleware, shareController.deleteShareLink);
router.post('/protected', authMiddleware, shareController.createProtectedShareLink);
router.post('/add-to-account/:token', authMiddleware, shareController.addSharedFileToAccount);
router.get('/unseen', authMiddleware, shareController.getUnseenSharedFiles);

// Public access to shared file (optionally with Bearer token)
router.get('/access/:token', optionalAuth, shareController.accessShareLink);

module.exports = router;
