process.env.NODE_ENV = 'test';
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('./models/User');
const Task = require('./models/Task');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');

const TEST_PORT = 5013;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

let server;
const testEmail = 'workspace_theme_tester@example.com';

// Helper to make API requests
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

// Mimic the server.js migration runner
const runMigration = async () => {
  try {
    const result = await Task.updateMany(
      { workspace: { $exists: false } },
      { $set: { workspace: 'personal' } }
    );
    return result.modifiedCount;
  } catch (err) {
    console.error('[MIGRATION TEST ERROR]', err.message);
    return 0;
  }
};

async function setup() {
  console.log('--- Setting up Workspace & Theme Audit Test Environment ---');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  // Clean up test users and their tasks
  const users = await User.find({ email: testEmail });
  const userIds = users.map(u => u._id);
  await Task.deleteMany({ userId: { $in: userIds } });
  await User.deleteMany({ email: testEmail });
  console.log('Cleaned up previous test data.');

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
  console.log('\n--- Tearing Down ---');
  const users = await User.find({ email: testEmail });
  const userIds = users.map(u => u._id);
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
  console.log('   WORKSPACE & THEME ARCHITECTURE AUDIT TESTS');
  console.log('======================================================\n');

  // Test 1: User creation defaults theme and workspace preferences
  let res = await apiRequest('POST', '/auth/signup', {
    name: 'Workspace Tester', email: testEmail, password: 'password123'
  });
  assertEqual(res.status, 201, 'Create test user');
  const token = res.data?.token;
  const user = res.data?.user;

  assertEqual(user?.theme, 'system', 'Default theme preference is "system"');
  assertEqual(user?.lastWorkspace, 'personal', 'Default lastWorkspace preference is "personal"');
  assertEqual(user?.avatar, null, 'Default avatar is null');

  // Test 2: PUT /api/auth/preferences updates user settings correctly
  res = await apiRequest('PUT', '/auth/preferences', {
    theme: 'dark',
    lastWorkspace: 'organization',
    name: 'Updated Name',
    phoneNumber: '+15551234567',
    avatar: '🦉'
  }, token);

  assertEqual(res.status, 200, 'Preferences update endpoint returns status 200');
  const updatedUser = res.data?.user;
  assertEqual(updatedUser?.theme, 'dark', 'Saved theme preference is "dark"');
  assertEqual(updatedUser?.lastWorkspace, 'organization', 'Saved lastWorkspace preference is "organization"');
  assertEqual(updatedUser?.name, 'Updated Name', 'Saved name is "Updated Name"');
  assertEqual(updatedUser?.phoneNumber, '+15551234567', 'Saved phone is "+15551234567"');
  assertEqual(updatedUser?.avatar, '🦉', 'Saved avatar is "🦉"');

  // Verify GET /auth/me returns the updated preferences
  res = await apiRequest('GET', '/auth/me', null, token);
  assertEqual(res.status, 200, 'Fetch me returns 200');
  assertEqual(res.data?.user?.theme, 'dark', 'GET /me returns correct saved theme');
  assertEqual(res.data?.user?.lastWorkspace, 'organization', 'GET /me returns correct saved workspace');

  // Test 3: Workspace isolation & creation scoping
  // Create task in personal workspace
  res = await apiRequest('POST', '/tasks', {
    title: 'Personal Workspace Task',
    priority: 'medium',
    dueDate: new Date().toISOString(),
    workspace: 'personal'
  }, token);
  assertEqual(res.status, 201, 'Create Personal Workspace Task');
  const task1Id = res.data?.task?._id;

  // Create task in organization workspace
  res = await apiRequest('POST', '/tasks', {
    title: 'Organization Workspace Task',
    priority: 'high',
    dueDate: new Date().toISOString(),
    workspace: 'organization'
  }, token);
  assertEqual(res.status, 201, 'Create Organization Workspace Task');
  const task2Id = res.data?.task?._id;

  // Fetch only personal tasks (should return exactly 1 task)
  res = await apiRequest('GET', '/tasks?workspace=personal', null, token);
  assertEqual(res.status, 200, 'Fetch personal tasks returns 200');
  assertEqual(res.data?.tasks?.length, 1, 'Personal task count is exactly 1');
  assertEqual(res.data?.tasks?.[0]?._id, task1Id, 'Returned task belongs to Personal');

  // Fetch only organization tasks (should return exactly 1 task)
  res = await apiRequest('GET', '/tasks?workspace=organization', null, token);
  assertEqual(res.status, 200, 'Fetch organization tasks returns 200');
  assertEqual(res.data?.tasks?.length, 1, 'Organization task count is exactly 1');
  assertEqual(res.data?.tasks?.[0]?._id, task2Id, 'Returned task belongs to Organization');

  // Fetch all tasks for stats calculations (should return both tasks)
  res = await apiRequest('GET', '/tasks?workspace=all', null, token);
  assertEqual(res.status, 200, 'Fetch all tasks for stats returns 200');
  assertEqual(res.data?.tasks?.length, 2, 'Unscoped task count returns all user tasks (2)');

  // Test 4: Existing user migration strategy
  // Bypass mongoose schemas to insert raw task document directly without workspace field
  const rawTaskId = new mongoose.Types.ObjectId();
  const db = mongoose.connection.db;
  await db.collection('tasks').insertOne({
    _id: rawTaskId,
    userId: new mongoose.Types.ObjectId(updatedUser.id),
    title: 'Legacy Untagged Task',
    description: 'Legacy task without workspace field',
    priority: 'medium',
    dueDate: new Date(),
    completed: false,
    order: 10,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Check that task is inserted and lacks workspace field
  let rawTask = await db.collection('tasks').findOne({ _id: rawTaskId });
  assertEqual(rawTask.workspace, undefined, 'Inserted task lacks "workspace" property');

  // Run migration
  const migratedCount = await runMigration();
  assertEqual(migratedCount >= 1, true, 'At least 1 task was modified by startup migration');

  // Check task again
  rawTask = await db.collection('tasks').findOne({ _id: rawTaskId });
  assertEqual(rawTask.workspace, 'personal', 'Migrated task has workspace set to "personal"');

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
