process.env.NODE_ENV = 'test';
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('./models/User');
const Task = require('./models/Task');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');

const TEST_PORT = 5015;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

let server;
const testEmail = 'settings_tester@example.com';

// Helper to make JSON API requests
async function apiRequest(method, endpoint, body = null, token = null) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  let data = null;
  try { data = await res.json(); } catch (e) {}
  return { status: res.status, data };
}

// Helper to make multipart FormData API requests (for file uploads)
async function apiMultipartRequest(endpoint, formData, token = null) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = {
    method: 'POST',
    headers,
    body: formData
  };

  const res = await fetch(url, options);
  let data = null;
  try { data = await res.json(); } catch (e) {}
  return { status: res.status, data };
}

async function setup() {
  console.log('--- Setting up Settings, Profile & Preference Audit Test Environment ---');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  // Clean up test users and their tasks
  const users = await User.find({ email: testEmail });
  const userIds = users.map(u => u._id);
  
  // Unlink any custom test avatars from disk
  for (const user of users) {
    if (user.avatar && user.avatar.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', user.avatar);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  await Task.deleteMany({ userId: { $in: userIds } });
  await User.deleteMany({ email: testEmail });
  console.log('Cleaned up previous test data.');

  const app = express();
  app.use(express.json());
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
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
  console.log('\n--- Tearing Down ---');
  const users = await User.find({ email: testEmail });
  const userIds = users.map(u => u._id);
  
  for (const user of users) {
    if (user.avatar && user.avatar.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', user.avatar);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  await Task.deleteMany({ userId: { $in: userIds } });
  await User.deleteMany({ email: testEmail });
  console.log('Cleaned up test data.');

  await mongoose.connection.close();
  console.log('Database connection closed.');
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    console.log('Test server stopped.');
  }
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  const assertEqual = (actual, expected, msg) => {
    if (actual === expected) {
      passed++;
      console.log(`  ✅ [PASS] ${msg}`);
    } else {
      failed++;
      console.error(`  ❌ [FAIL] ${msg} (Expected: ${expected}, Got: ${actual})`);
    }
  };

  console.log('\n======================================================');
  console.log('   SETTINGS, PROFILE & PREFERENCES AUDIT TESTS');
  console.log('======================================================\n');

  // Test 1: Create test user and verify default settings schema fields
  let res = await apiRequest('POST', '/auth/signup', {
    name: 'Settings User', email: testEmail, password: 'password123'
  });
  assertEqual(res.status, 201, 'Create test user');
  const token = res.data?.token;
  const user = res.data?.user;

  assertEqual(user?.defaultWorkspace, 'last_active', 'Default workspace preference is "last_active"');
  assertEqual(user?.notificationPreferences?.emailReminders, false, 'Default emailReminders is false');
  assertEqual(user?.notificationPreferences?.overdueAlerts, false, 'Default overdueAlerts is false');
  assertEqual(user?.notificationPreferences?.dailySummary, false, 'Default dailySummary is false');

  // Test 2: Update preferences (Name, Phone, Workspace Preference, Notifications)
  res = await apiRequest('PUT', '/auth/preferences', {
    name: 'Jane Doe',
    phoneNumber: '+919876543210',
    defaultWorkspace: 'organization',
    notificationPreferences: {
      emailReminders: true,
      overdueAlerts: true,
      dailySummary: false
    }
  }, token);

  assertEqual(res.status, 200, 'Preferences update returns status 200');
  const updatedUser = res.data?.user;
  assertEqual(updatedUser?.name, 'Jane Doe', 'Name updated successfully');
  assertEqual(updatedUser?.phoneNumber, '+919876543210', 'Phone number updated successfully');
  assertEqual(updatedUser?.defaultWorkspace, 'organization', 'Default workspace preference changed to "organization"');
  assertEqual(updatedUser?.notificationPreferences?.emailReminders, true, 'emailReminders enabled');
  assertEqual(updatedUser?.notificationPreferences?.overdueAlerts, true, 'overdueAlerts enabled');
  assertEqual(updatedUser?.notificationPreferences?.dailySummary, false, 'dailySummary remains disabled');

  // Verify /auth/me returns the updated state
  res = await apiRequest('GET', '/auth/me', null, token);
  assertEqual(res.status, 200, 'Fetch me returns status 200');
  assertEqual(res.data?.user?.name, 'Jane Doe', 'GET /me name matches');
  assertEqual(res.data?.user?.phoneNumber, '+919876543210', 'GET /me phone matches');
  assertEqual(res.data?.user?.defaultWorkspace, 'organization', 'GET /me defaultWorkspace matches');
  assertEqual(res.data?.user?.notificationPreferences?.emailReminders, true, 'GET /me emailReminders matches');

  // Test 3: Upload Profile Picture Avatar
  const formData = new FormData();
  // Create a mock image file
  const fileContent = Buffer.from('mock png content');
  const blob = new Blob([fileContent], { type: 'image/png' });
  formData.append('avatar', blob, 'avatar.png');

  res = await apiMultipartRequest('/auth/avatar', formData, token);
  assertEqual(res.status, 200, 'Avatar upload returns status 200');
  
  const avatarPath = res.data?.user?.avatar;
  assertEqual(avatarPath?.startsWith('/uploads/avatar-'), true, 'Avatar path matches upload prefix');

  // Check if file exists on disk
  const absoluteAvatarPath = path.join(__dirname, '..', avatarPath);
  assertEqual(fs.existsSync(absoluteAvatarPath), true, 'Avatar file exists on disk');

  // Test 4: Remove Avatar deletes file from disk
  res = await apiRequest('PUT', '/auth/preferences', {
    avatar: null
  }, token);
  assertEqual(res.status, 200, 'Preferences remove avatar returns 200');
  assertEqual(res.data?.user?.avatar, null, 'User avatar set to null');
  assertEqual(fs.existsSync(absoluteAvatarPath), false, 'Old avatar file deleted from disk');

  // Test 5: Re-upload avatar, create tasks, and delete account cleanly
  const formData2 = new FormData();
  const blob2 = new Blob([Buffer.from('second mock image')], { type: 'image/webp' });
  formData2.append('avatar', blob2, 'avatar2.webp');

  res = await apiMultipartRequest('/auth/avatar', formData2, token);
  assertEqual(res.status, 200, 'Re-upload avatar returns 200');
  const newAvatarPath = res.data?.user?.avatar;
  const newAbsoluteAvatarPath = path.join(__dirname, '..', newAvatarPath);
  assertEqual(fs.existsSync(newAbsoluteAvatarPath), true, 'New avatar file exists on disk');

  // Create a task for this user
  res = await apiRequest('POST', '/tasks', {
    title: 'Settings Test Task',
    priority: 'medium',
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    workspace: 'personal'
  }, token);
  assertEqual(res.status, 201, 'Create task for testing account deletion');
  const taskId = res.data?.task?._id;

  // Verify task exists in MongoDB
  let dbTask = await Task.findById(taskId);
  assertEqual(!!dbTask, true, 'Task exists in MongoDB');

  // Delete the user account
  res = await apiRequest('DELETE', '/auth/account', null, token);
  assertEqual(res.status, 200, 'Delete account returns 200');

  // Verify User document is deleted
  const dbUser = await User.findOne({ email: testEmail });
  assertEqual(dbUser, null, 'User document deleted from MongoDB');

  // Verify all tasks for this user are deleted
  const userTasksCount = await Task.countDocuments({ userId: user._id });
  assertEqual(userTasksCount, 0, 'All user tasks deleted from MongoDB');

  // Verify avatar file is deleted from disk
  assertEqual(fs.existsSync(newAbsoluteAvatarPath), false, 'Avatar file deleted on account deletion');

  // Test 6: Accessing endpoints after deletion fails
  res = await apiRequest('GET', '/auth/me', null, token);
  assertEqual(res.status, 401, 'Accessing getMe with old token rejected');

  res = await apiRequest('GET', '/tasks', null, token);
  assertEqual(res.status, 401, 'Accessing getTasks with old token rejected');

  console.log('\n======================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  return { passed, failed };
}

async function main() {
  let exitCode = 1;
  try {
    await setup();
    const { failed } = await runTests();
    exitCode = failed > 0 ? 1 : 0;
  } catch (error) {
    console.error('Fatal test error:', error);
  } finally {
    await teardown();
    process.exit(exitCode);
  }
}

main();
