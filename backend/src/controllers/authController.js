const jwt = require('jsonwebtoken');
const { validationResult, body } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

// Lazy-initialized to ensure env vars are loaded by the time it's used
let googleClient = null;
function getGoogleClient() {
  if (!googleClient) {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new Error('GOOGLE_CLIENT_ID environment variable is not set');
    }
    googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return googleClient;
}

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Validation rules
const signupValidation = [
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ max: 60 }).withMessage('Name cannot exceed 60 characters'),
  body('email').trim().isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

// POST /api/auth/signup
const signup = async (req, res, next) => {
  try {
    console.log('[AUTH] Signup request received:', { name: req.body.name, email: req.body.email });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('[AUTH] Signup validation failed:', errors.array()[0].msg);
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { name, email, password } = req.body;

    // Check if user already exists (any provider)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('[AUTH] Signup rejected — duplicate email:', email, 'provider:', existingUser.authProvider);
      if (existingUser.authProvider === 'google') {
        return res.status(409).json({ message: 'This account was created using Google. Please continue with Google Sign-In.' });
      }
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const user = await User.create({
      name,
      email,
      passwordHash: password,
      authProvider: 'local'
    });

    console.log('[AUTH] User created in DB:', { id: user._id, email: user.email, collection: 'users' });

    const token = generateToken(user._id);
    console.log('[AUTH] JWT generated for user:', user._id);

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('[AUTH] Signup error:', error.message);
    next(error);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    console.log('[AUTH] Login request received:', { email: req.body.email });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('[AUTH] Login validation failed:', errors.array()[0].msg);
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      console.log('[AUTH] Login failed — user not found:', email);
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Guard: If user signed up via Google, deny password login
    if (user.authProvider === 'google') {
      console.log('[AUTH] Login DENIED — Google-only user tried password login:', email);
      return res.status(403).json({
        message: 'This account was created using Google. Please continue with Google Sign-In.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('[AUTH] Login failed — wrong password:', email);
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = generateToken(user._id);
    console.log('[AUTH] Login successful:', { id: user._id, email: user.email });

    res.json({
      message: 'Logged in successfully.',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error.message);
    next(error);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ user: req.user });
};

// POST /api/auth/google
const googleLogin = async (req, res, next) => {
  try {
    console.log('[AUTH] Google login request received');

    const { credential } = req.body;
    if (!credential) {
      console.log('[AUTH] Google login failed — no credential token provided');
      return res.status(400).json({ message: 'Google credential token is required.' });
    }

    // Verify the token with Google
    const client = getGoogleClient();
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;
    console.log('[AUTH] Google token verified:', { email, googleId: googleId.substring(0, 6) + '...' });

    // Check if user already exists
    let user = await User.findOne({ $or: [{ googleId }, { email }] });
    let isNewUser = false;

    if (user) {
      // STRICT ENFORCEMENT: If user exists with email/password, DENY Google login
      if (user.authProvider === 'local') {
        console.log('[AUTH] Google login DENIED — email/password user tried Google login:', email);
        return res.status(403).json({
          message: 'This account was created using Email & Password. Please log in using your password.'
        });
      }

      console.log('[AUTH] Existing Google user logged in:', { id: user._id, email });
    } else {
      // New user — create with Google data (profileCompleted = false for profile setup)
      isNewUser = true;
      user = await User.create({
        name,
        email,
        googleId,
        authProvider: 'google',
        profileCompleted: false
      });
      console.log('[AUTH] New Google user created in DB:', { id: user._id, email, collection: 'users' });
    }

    const token = generateToken(user._id);
    console.log('[AUTH] JWT generated for Google user:', user._id);

    res.json({
      message: isNewUser ? 'Account created with Google successfully.' : 'Logged in with Google successfully.',
      token,
      user: user.toJSON(),
      isNewUser
    });
  } catch (error) {
    console.error('[AUTH] Google login error:', error.message);
    next(error);
  }
};

// PUT /api/auth/profile-setup
const profileSetup = async (req, res, next) => {
  try {
    const { workspaceType, phoneNumber } = req.body;

    if (!workspaceType || !['personal', 'organization'].includes(workspaceType)) {
      return res.status(400).json({ message: 'Workspace type is required. Must be "personal" or "organization".' });
    }

    // Optional phone number validation (basic)
    if (phoneNumber && typeof phoneNumber !== 'string') {
      return res.status(400).json({ message: 'Phone number must be a string.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        workspaceType,
        phoneNumber: phoneNumber || null,
        profileCompleted: true
      },
      { returnDocument: 'after', runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    console.log('[AUTH] Profile setup completed:', { id: user._id, workspaceType });

    res.json({
      message: 'Profile setup completed.',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('[AUTH] Profile setup error:', error.message);
    next(error);
  }
};

module.exports = {
  signup,
  login,
  getMe,
  googleLogin,
  profileSetup,
  signupValidation,
  loginValidation
};
