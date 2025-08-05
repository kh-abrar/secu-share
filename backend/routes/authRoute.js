const express = require('express');
const auth = require('../middlewares/authMiddleware');
const { register, login, getMe } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', auth, getMe);

module.exports = router;
