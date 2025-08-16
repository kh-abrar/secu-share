const express = require('express');
const router = express.Router();
const shareController = require('../controllers/shareController');
const authMiddleware = require('../middlewares/authMiddleware');

// Authenticated routes
router.post('/create', authMiddleware, shareController.createShareLink);
router.delete('/delete/:token', authMiddleware, shareController.deleteShareLink);

// Public access to shared file
router.get('/access/:token', shareController.accessShareLink);

module.exports = router;