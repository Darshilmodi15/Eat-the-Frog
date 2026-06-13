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

const TEST_PORT = 5014;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

let server;
const testEmail = 'subtask_tester@example.com';

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

async function setup() {
  console.log('--- Setting up Subtask & Hierarchy Audit Test Environment ---');
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
  console.log('   SUBTASK & HIERARCHY ACCURACY AUDIT TESTS');
  console.log('======================================================\n');

  // Setup: Create test user
  let res = await apiRequest('POST', '/auth/signup', {
    name: 'Subtask Tester', email: testEmail, password: 'password123'
  });
  assertEqual(res.status, 201, 'Create test user');
  const token = res.data?.token;

  // Test 1: Create parent task and check progress defaults
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  res = await apiRequest('POST', '/tasks', {
    title: 'Learn MongoDB Parent',
    priority: 'medium',
    dueDate: tomorrow.toISOString(),
    workspace: 'personal'
  }, token);
  assertEqual(res.status, 201, 'Create Parent Task');
  const parentId = res.data?.task?._id;
  assertEqual(res.data?.task?.progress, 0, 'Initial parent progress is 0%');
  assertEqual(res.data?.task?.completed, false, 'Initial parent is not completed');

  // Test 2: Add subtasks and verify progress calculation
  res = await apiRequest('PUT', `/tasks/${parentId}`, {
    subtasks: [
      { title: 'Install MongoDB', completed: false },
      { title: 'CRUD Operations', completed: false }
    ]
  }, token);

  assertEqual(res.status, 200, 'Add 2 subtasks');
  assertEqual(res.data?.task?.progress, 0, 'Progress remains 0% with 2 incomplete steps');
  assertEqual(res.data?.task?.completed, false, 'Parent is not completed');

  // Test 3: Complete 1 subtask and check progress (50%)
  res = await apiRequest('PUT', `/tasks/${parentId}`, {
    subtasks: [
      { title: 'Install MongoDB', completed: true },
      { title: 'CRUD Operations', completed: false }
    ]
  }, token);

  assertEqual(res.status, 200, 'Complete first subtask');
  assertEqual(res.data?.task?.progress, 50, 'Progress updates dynamically to 50%');
  assertEqual(res.data?.task?.completed, false, 'Parent remains incomplete');

  // Test 4: Complete all subtasks and check auto-completion of parent
  res = await apiRequest('PUT', `/tasks/${parentId}`, {
    subtasks: [
      { title: 'Install MongoDB', completed: true },
      { title: 'CRUD Operations', completed: true }
    ]
  }, token);

  assertEqual(res.status, 200, 'Complete second subtask');
  assertEqual(res.data?.task?.progress, 100, 'Progress reaches 100%');
  assertEqual(res.data?.task?.completed, true, 'Parent task auto-completes successfully');

  // Test 5: Uncheck subtask and verify parent un-completion
  res = await apiRequest('PUT', `/tasks/${parentId}`, {
    subtasks: [
      { title: 'Install MongoDB', completed: true },
      { title: 'CRUD Operations', completed: false }
    ]
  }, token);

  assertEqual(res.status, 200, 'Uncheck second subtask');
  assertEqual(res.data?.task?.progress, 50, 'Progress falls back to 50%');
  assertEqual(res.data?.task?.completed, false, 'Parent task auto-uncompletes successfully');

  // Test 6: Toggle parent explicitly and verify all subtasks toggled
  res = await apiRequest('PUT', `/tasks/${parentId}`, {
    completed: true
  }, token);

  assertEqual(res.status, 200, 'Complete parent task checkbox directly');
  assertEqual(res.data?.task?.completed, true, 'Parent task completed');
  assertEqual(res.data?.task?.progress, 100, 'Progress goes to 100%');
  const allSubtaskCompleted = res.data?.task?.subtasks?.every(s => s.completed);
  assertEqual(allSubtaskCompleted, true, 'All child subtasks are auto-completed collectively');

  // Test 7: Subtask overdue filters
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // Set one subtask due date in the past and uncomplete it
  res = await apiRequest('PUT', `/tasks/${parentId}`, {
    subtasks: [
      { title: 'Install MongoDB', completed: true },
      { title: 'CRUD Operations', completed: false, dueDate: yesterday.toISOString() }
    ]
  }, token);

  assertEqual(res.status, 200, 'Set subtask due date to past (overdue)');
  assertEqual(res.data?.task?.completed, false, 'Parent is incomplete');

  // Fetch overdue tasks: parent should show up because of overdue subtask
  res = await apiRequest('GET', '/tasks?status=overdue', null, token);
  assertEqual(res.status, 200, 'Fetch overdue tasks returns 200');
  assertEqual(res.data?.tasks?.length, 1, 'Overdue list contains exactly 1 task');
  assertEqual(res.data?.tasks?.[0]?._id, parentId, 'Overdue parent task matches ID');

  // Complete the overdue subtask: parent should no longer show in overdue
  res = await apiRequest('PUT', `/tasks/${parentId}`, {
    subtasks: [
      { title: 'Install MongoDB', completed: true },
      { title: 'CRUD Operations', completed: true, dueDate: yesterday.toISOString() }
    ]
  }, token);

  assertEqual(res.status, 200, 'Complete overdue subtask');
  res = await apiRequest('GET', '/tasks?status=overdue', null, token);
  assertEqual(res.data?.tasks?.length, 0, 'Overdue list is empty after complete');

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
