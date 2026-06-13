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

const TEST_PORT = 5011;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

let server;
const testEmail = 'filtering_test_user@example.com';

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
  console.log('--- Setting up Filtering Audit Test Environment ---');
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
  console.log('   TASK FILTERING & OVERDUE STATUS AUDIT TESTS');
  console.log('======================================================\n');

  // Setup: Create test user
  let res = await apiRequest('POST', '/auth/signup', {
    name: 'Filter Tester', email: testEmail, password: 'password123'
  });
  assertEqual(res.status, 201, 'Create test user');
  const token = res.data?.token;

  // Let's create our test cases
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // 1. Pending + Future
  res = await apiRequest('POST', '/tasks', {
    title: 'Task Pending Future', priority: 'medium', dueDate: tomorrow.toISOString()
  }, token);
  assertEqual(res.status, 201, 'Create Task 1: Pending & Future');
  const task1Id = res.data?.task?._id;

  // 2. Completed + Future
  res = await apiRequest('POST', '/tasks', {
    title: 'Task Completed Future', priority: 'medium', dueDate: tomorrow.toISOString()
  }, token);
  assertEqual(res.status, 201, 'Create Task 2: Completed & Future');
  const task2Id = res.data?.task?._id;
  await apiRequest('PUT', `/tasks/${task2Id}`, { completed: true }, token);

  // 3. Pending + Past (Overdue)
  res = await apiRequest('POST', '/tasks', {
    title: 'Task Pending Past', priority: 'high', dueDate: yesterday.toISOString()
  }, token);
  assertEqual(res.status, 201, 'Create Task 3: Pending & Past (Overdue)');
  const task3Id = res.data?.task?._id;

  // 4. Completed + Past (Completed Overdue)
  res = await apiRequest('POST', '/tasks', {
    title: 'Task Completed Past', priority: 'low', dueDate: yesterday.toISOString()
  }, token);
  assertEqual(res.status, 201, 'Create Task 4: Completed & Past');
  const task4Id = res.data?.task?._id;
  await apiRequest('PUT', `/tasks/${task4Id}`, { completed: true }, token);

  // ══════════════════════════════════════
  // FILTER VERIFICATION
  // ══════════════════════════════════════

  // A. All Tasks (should return 4 tasks)
  res = await apiRequest('GET', '/tasks', null, token);
  assertEqual(res.status, 200, 'Fetch all tasks returns 200');
  assertEqual(res.data?.tasks?.length, 4, 'Total tasks count is 4');

  // B. Pending Tasks (should return Task 1 and Task 3)
  res = await apiRequest('GET', '/tasks?status=pending', null, token);
  assertEqual(res.status, 200, 'Fetch pending tasks returns 200');
  assertEqual(res.data?.tasks?.length, 2, 'Pending tasks count is 2');
  const pendingTitles = res.data?.tasks?.map(t => t.title) || [];
  assertEqual(pendingTitles.includes('Task Pending Future'), true, 'Pending list includes Task 1');
  assertEqual(pendingTitles.includes('Task Pending Past'), true, 'Pending list includes Task 3');

  // C. Completed Tasks (should return Task 2 and Task 4)
  res = await apiRequest('GET', '/tasks?status=completed', null, token);
  assertEqual(res.status, 200, 'Fetch completed tasks returns 200');
  assertEqual(res.data?.tasks?.length, 2, 'Completed tasks count is 2');
  const completedTitles = res.data?.tasks?.map(t => t.title) || [];
  assertEqual(completedTitles.includes('Task Completed Future'), true, 'Completed list includes Task 2');
  assertEqual(completedTitles.includes('Task Completed Past'), true, 'Completed list includes Task 4');

  // D. Overdue Tasks (should return ONLY Task 3)
  res = await apiRequest('GET', '/tasks?status=overdue', null, token);
  assertEqual(res.status, 200, 'Fetch overdue tasks returns 200');
  assertEqual(res.data?.tasks?.length, 1, 'Overdue tasks count is 1');
  assertEqual(res.data?.tasks?.[0]?.title, 'Task Pending Past', 'Overdue task is exactly Task 3');

  // E. Edge Case: Completing overdue task removes it from overdue list
  res = await apiRequest('PUT', `/tasks/${task3Id}`, { completed: true }, token);
  assertEqual(res.status, 200, 'Task 3 marked completed');

  res = await apiRequest('GET', '/tasks?status=overdue', null, token);
  assertEqual(res.data?.tasks?.length, 0, 'Overdue tasks count is now 0 after completion');

  res = await apiRequest('GET', '/tasks?status=completed', null, token);
  assertEqual(res.data?.tasks?.length, 3, 'Completed tasks count increased to 3');

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
