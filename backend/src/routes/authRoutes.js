const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  signup,
  login,
  getMe,
  googleLogin,
  signupValidation,
  loginValidation
} = require('../controllers/authController');

router.post('/signup', signupValidation, signup);
router.post('/login', loginValidation, login);
router.post('/google', googleLogin);
router.get('/me', auth, getMe);

module.exports = router;
