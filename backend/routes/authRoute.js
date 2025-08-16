const express = require('express');
const auth = require('../middlewares/authMiddleware');
const { register, login, loginLimiter, logout, getMe } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/me', auth, getMe);

module.exports = router;
