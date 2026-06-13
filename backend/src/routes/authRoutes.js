const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  signup,
  login,
  getMe,
  googleLogin,
  profileSetup,
  updatePreferences,
  signupValidation,
  loginValidation
} = require('../controllers/authController');

router.post('/signup', signupValidation, signup);
router.post('/login', loginValidation, login);
router.post('/google', googleLogin);
router.get('/me', auth, getMe);
router.put('/profile-setup', auth, profileSetup);
router.put('/preferences', auth, updatePreferences);

module.exports = router;
