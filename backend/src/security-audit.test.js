const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Mock Google OAuth before requiring authController and routes
const { OAuth2Client } = require('google-auth-library');
OAuth2Client.prototype.verifyIdToken = async function(options) {
  const token = options.idToken;
  if (token === 'valid-google-token-local-email') {
    return {
      getPayload: () => ({
        sub: 'google-12345',
        email: 'test_local@example.com',
        name: 'Google User',
        picture: 'http://pic.com'
      })
    };
  }
  if (token === 'valid-google-token-google-email') {
    return {
      getPayload: () => ({
        sub: 'google-67890',
        email: 'test_google@example.com',
        name: 'Google User',
        picture: 'http://pic.com'
      })
    };
  }
  throw new Error('Invalid Google token');
};

// Import models, middleware and routes
const User = require('./models/User');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');

const TEST_PORT = 5009;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

let server;
const testEmails = ['test_local@example.com', 'test_google@example.com'];

// Helper to make API requests using built-in fetch (or standard http/https fallback)
async function apiRequest(method, endpoint, body = null, token = null) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options = {
    method,
    headers
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // No json response
  }
  return { status: res.status, data };
}

async function setup() {
  console.log('--- Setting up Test Environment ---');
  // Connect to DB
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/eatthefrog');
  console.log('Connected to MongoDB.');

  // Clean up test database users
  await User.deleteMany({ email: { $in: testEmails } });
  console.log('Cleaned up previous test users.');

  // Start Express server
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/tasks', taskRoutes);

  return new Promise((resolve) => {
    server = app.listen(TEST_PORT, () => {
      console.log(`Test server running on port ${TEST_PORT}`);
      resolve();
    });
  });
}

async function teardown() {
  console.log('\n--- Tearing Down Test Environment ---');
  // Clean up database
  await User.deleteMany({ email: { $in: testEmails } });
  console.log('Cleaned up test users.');
  
  // Close database & server connections
  await mongoose.connection.close();
  console.log('Database connection closed.');

  if (server) {
    await new Promise((resolve) => server.close(resolve));
    console.log('Test server stopped.');
  }
}

async function runTests() {
  let passedCount = 0;
  let failedCount = 0;

  const assertEqual = (actual, expected, message) => {
    if (actual === expected) {
      passedCount++;
      console.log(`  ✅ [PASS] ${message}`);
    } else {
      failedCount++;
      console.error(`  ❌ [FAIL] ${message} (Expected: ${expected}, Got: ${actual})`);
    }
  };

  const assertNotEqual = (actual, expected, message) => {
    if (actual !== expected) {
      passedCount++;
      console.log(`  ✅ [PASS] ${message}`);
    } else {
      failedCount++;
      console.error(`  ❌ [FAIL] ${message} (Expected different from: ${expected}, Got: ${actual})`);
    }
  };

  const assertExists = (val, message) => {
    if (val !== undefined && val !== null && val !== '') {
      passedCount++;
      console.log(`  ✅ [PASS] ${message}`);
    } else {
      failedCount++;
      console.error(`  ❌ [FAIL] ${message} (Value is missing: ${val})`);
    }
  };

  console.log('\n======================================================');
  console.log('       RUNNING SECURITY AND AUTHENTICATION TESTS       ');
  console.log('======================================================\n');

  // --- CATEGORY 1: Route Protection & JWT Validation ---
  console.log('1. Route Protection & JWT Validation:');
  
  // Test 1: Access /api/tasks without token
  let res = await apiRequest('GET', '/tasks');
  assertEqual(res.status, 401, 'Reject access to /api/tasks when no token is provided');
  assertEqual(res.data?.message, 'Access denied. No token provided.', 'Return correct error message for missing token');

  // Test 2: Access /api/tasks with invalid token
  res = await apiRequest('GET', '/tasks', null, 'invalid_token_xyz');
  assertEqual(res.status, 401, 'Reject access to /api/tasks with invalid token');
  assertEqual(res.data?.message, 'Invalid token.', 'Return correct error message for invalid token');

  // Test 3: Access /api/tasks with expired token
  const expiredToken = jwt.sign({ userId: new mongoose.Types.ObjectId() }, process.env.JWT_SECRET, { expiresIn: '-1s' });
  res = await apiRequest('GET', '/tasks', null, expiredToken);
  assertEqual(res.status, 401, 'Reject access to /api/tasks with expired token');
  assertEqual(res.data?.message, 'Token expired. Please log in again.', 'Return correct error message for expired token');

  // Test 4: Access /api/auth/me without token
  res = await apiRequest('GET', '/auth/me');
  assertEqual(res.status, 401, 'Reject access to /api/auth/me when no token is provided');

  // Test 5: Access /api/auth/me with invalid token
  res = await apiRequest('GET', '/auth/me', null, 'invalid_token_xyz');
  assertEqual(res.status, 401, 'Reject access to /api/auth/me with invalid token');


  // --- CATEGORY 2: Auth Provider Enforcement (Local Account Creation & Login) ---
  console.log('\n2. Local Auth & Password Hashing:');

  // Test 6: Create local user test_local@example.com
  res = await apiRequest('POST', '/auth/signup', {
    name: 'Local User',
    email: 'test_local@example.com',
    password: 'password123'
  });
  assertEqual(res.status, 201, 'Successfully signup new local user');
  assertExists(res.data?.token, 'JWT token is returned upon signup');

  const localToken = res.data?.token;

  // Test 7: Verify user document in DB
  const dbUserLocal = await User.findOne({ email: 'test_local@example.com' });
  assertExists(dbUserLocal, 'User document exists in MongoDB');
  assertEqual(dbUserLocal.authProvider, 'local', 'User authProvider is set to "local"');
  assertNotEqual(dbUserLocal.passwordHash, 'password123', 'Password hash in database is not stored in plaintext');
  const isBcryptHash = dbUserLocal.passwordHash.startsWith('$2a$') || dbUserLocal.passwordHash.startsWith('$2b$');
  assertEqual(isBcryptHash, true, `Password is hashed using bcrypt (starts with bcrypt prefix)`);

  // Test 8: Register duplicate local user
  res = await apiRequest('POST', '/auth/signup', {
    name: 'Local User 2',
    email: 'test_local@example.com',
    password: 'anotherpassword'
  });
  assertEqual(res.status, 409, 'Prevent duplicate signup for local account');
  assertEqual(res.data?.message, 'An account with this email already exists.', 'Return correct error message for duplicate email');

  // Test 9: Attempt Google login using the same local email
  res = await apiRequest('POST', '/auth/google', {
    credential: 'valid-google-token-local-email'
  });
  assertEqual(res.status, 403, 'Deny Google OAuth login for account registered via local password');
  assertEqual(
    res.data?.message,
    'This account was created using Email & Password. Please log in using your password.',
    'Return strict enforcement warning to continue with email/password'
  );
  assertEqual(res.data?.token, undefined, 'Ensure no JWT token is issued for provider mismatch');

  // Test 10: Attempt local login with incorrect password
  res = await apiRequest('POST', '/auth/login', {
    email: 'test_local@example.com',
    password: 'wrongpassword'
  });
  assertEqual(res.status, 401, 'Deny password login with incorrect credentials');
  assertEqual(res.data?.message, 'Invalid email or password.', 'Return correct error message for incorrect credentials');

  // Test 11: Attempt local login with correct password
  res = await apiRequest('POST', '/auth/login', {
    email: 'test_local@example.com',
    password: 'password123'
  });
  assertEqual(res.status, 200, 'Allow password login with correct credentials');
  assertExists(res.data?.token, 'JWT token is returned upon successful login');


  // --- CATEGORY 3: Auth Provider Enforcement (Google OAuth Account Creation & Login) ---
  console.log('\n3. Google OAuth & Enforcements:');

  // Test 12: Create google user test_google@example.com
  res = await apiRequest('POST', '/auth/google', {
    credential: 'valid-google-token-google-email'
  });
  assertEqual(res.status, 200, 'Successfully create / login user via Google OAuth');
  assertExists(res.data?.token, 'JWT token is returned upon Google login');

  const googleToken = res.data?.token;

  // Test 13: Verify google user document in DB
  const dbUserGoogle = await User.findOne({ email: 'test_google@example.com' });
  assertExists(dbUserGoogle, 'Google user document exists in MongoDB');
  assertEqual(dbUserGoogle.authProvider, 'google', 'User authProvider is set to "google"');
  assertEqual(dbUserGoogle.passwordHash, undefined, 'Ensure Google OAuth user has no passwordHash in MongoDB');
  assertExists(dbUserGoogle.googleId, 'Ensure Google OAuth user has a valid googleId in MongoDB');

  // Test 14: Attempt Email/Password login using the google email
  res = await apiRequest('POST', '/auth/login', {
    email: 'test_google@example.com',
    password: 'somepassword123'
  });
  assertEqual(res.status, 403, 'Deny password login for account registered via Google OAuth');
  assertEqual(
    res.data?.message,
    'This account was created using Google. Please continue with Google Sign-In.',
    'Return strict enforcement warning to continue with Google'
  );
  assertEqual(res.data?.token, undefined, 'Ensure no JWT token is issued for provider mismatch');

  // Test 15: Attempt Email/Password signup using the same google email
  res = await apiRequest('POST', '/auth/signup', {
    name: 'Google User Attempt Local',
    email: 'test_google@example.com',
    password: 'password123'
  });
  assertEqual(res.status, 409, 'Prevent duplicate signup of local account with email belonging to Google account');
  assertEqual(
    res.data?.message,
    'This account was created using Google. Please continue with Google Sign-In.',
    'Return Google redirect warning message'
  );

  // Test 16: Attempt Google login again (log in)
  res = await apiRequest('POST', '/auth/google', {
    credential: 'valid-google-token-google-email'
  });
  assertEqual(res.status, 200, 'Allow Google log in for registered Google user');
  assertExists(res.data?.token, 'JWT token is returned');


  // --- CATEGORY 4: Session Validation & Protected Routes ---
  console.log('\n4. Session Validation & Dashboard Data access:');

  // Test 17: Fetch /api/auth/me with valid local user token
  res = await apiRequest('GET', '/auth/me', null, localToken);
  assertEqual(res.status, 200, 'Allow accessing /api/auth/me with valid token');
  assertEqual(res.data?.user?.email, 'test_local@example.com', 'Retrieve authenticated user details successfully');

  // Test 18: Fetch /api/auth/me with valid google user token
  res = await apiRequest('GET', '/auth/me', null, googleToken);
  assertEqual(res.status, 200, 'Allow accessing /api/auth/me with valid Google user token');
  assertEqual(res.data?.user?.email, 'test_google@example.com', 'Retrieve authenticated Google user details successfully');

  // Test 19: Fetch /api/tasks with valid token
  res = await apiRequest('GET', '/tasks', null, localToken);
  assertEqual(res.status, 200, 'Allow accessing /api/tasks with valid token');

  console.log('\n======================================================');
  console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

async function main() {
  try {
    await setup();
    await runTests();
  } catch (error) {
    console.error('Fatal test error:', error);
    await teardown();
    process.exit(1);
  }
}

main();
