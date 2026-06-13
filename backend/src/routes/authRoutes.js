const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
  signup,
  login,
  getMe,
  googleLogin,
  profileSetup,
  updatePreferences,
  uploadAvatar,
  deleteAccount,
  signupValidation,
  loginValidation
} = require('../controllers/authController');

// Multer setup for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar-${req.user._id}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // limit 2MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG and WEBP files are allowed.'));
    }
  }
});

router.post('/signup', signupValidation, signup);
router.post('/login', loginValidation, login);
router.post('/google', googleLogin);
router.get('/me', auth, getMe);
router.put('/profile-setup', auth, profileSetup);
router.put('/preferences', auth, updatePreferences);

// Upload avatar
router.post('/avatar', auth, (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, uploadAvatar);

// Delete account
router.delete('/account', auth, deleteAccount);

module.exports = router;
