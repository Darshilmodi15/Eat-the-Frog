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

const TEST_PORT = 5010;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

let server;
const testEmail = 'sync_test_user@example.com';
const testEmail2 = 'sync_test_user2@example.com';

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
  console.log('--- Setting up Sync Test Environment ---');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  // Clean up test users and their tasks
  const users = await User.find({ email: { $in: [testEmail, testEmail2] } });
  const userIds = users.map(u => u._id);
  await Task.deleteMany({ userId: { $in: userIds } });
  await User.deleteMany({ email: { $in: [testEmail, testEmail2] } });
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
  const users = await User.find({ email: { $in: [testEmail, testEmail2] } });
  const userIds = users.map(u => u._id);
  await Task.deleteMany({ userId: { $in: userIds } });
  await User.deleteMany({ email: { $in: [testEmail, testEmail2] } });
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

  const assertExists = (val, msg) => {
    if (val !== undefined && val !== null && val !== '') {
      passed++;
      console.log(`  ✅ [PASS] ${msg}`);
    } else {
      failed++;
      console.error(`  ❌ [FAIL] ${msg} (Value is missing: ${val})`);
    }
  };

  console.log('\n======================================================');
  console.log('   DATABASE & STATE SYNCHRONIZATION AUDIT TESTS');
  console.log('======================================================\n');

  // ── Setup: Create two test users ──
  let res = await apiRequest('POST', '/auth/signup', {
    name: 'Sync Tester', email: testEmail, password: 'password123'
  });
  assertEqual(res.status, 201, 'Create test user 1');
  const token1 = res.data?.token;
  const userId1 = res.data?.user?._id;

  res = await apiRequest('POST', '/auth/signup', {
    name: 'Sync Tester 2', email: testEmail2, password: 'password456'
  });
  assertEqual(res.status, 201, 'Create test user 2');
  const token2 = res.data?.token;

  // ══════════════════════════════════════
  // CATEGORY 1: Task Creation
  // ══════════════════════════════════════
  console.log('\n1. Task Creation:');

  res = await apiRequest('POST', '/tasks', {
    title: 'Task Alpha', priority: 'high', dueDate: '2026-06-20'
  }, token1);
  assertEqual(res.status, 201, 'Create task returns 201');
  assertExists(res.data?.task?._id, 'Created task has _id');
  assertEqual(res.data?.task?.title, 'Task Alpha', 'Created task has correct title');
  assertEqual(res.data?.task?.priority, 'high', 'Created task has correct priority');
  assertEqual(res.data?.task?.completed, false, 'Created task defaults to not completed');
  assertEqual(res.data?.task?.userId, userId1, 'Created task has correct userId');
  const taskAlphaId = res.data?.task?._id;

  // Verify in MongoDB
  const dbTask = await Task.findById(taskAlphaId);
  assertExists(dbTask, 'Task exists in MongoDB after creation');
  assertEqual(dbTask.title, 'Task Alpha', 'MongoDB title matches API response');

  // Create more tasks for later tests
  res = await apiRequest('POST', '/tasks', {
    title: 'Task Beta', priority: 'low', dueDate: '2026-06-25'
  }, token1);
  const taskBetaId = res.data?.task?._id;

  res = await apiRequest('POST', '/tasks', {
    title: 'Task Gamma', priority: 'medium', dueDate: '2026-06-15'
  }, token1);
  const taskGammaId = res.data?.task?._id;

  // Fetch all tasks — should show 3
  res = await apiRequest('GET', '/tasks', null, token1);
  assertEqual(res.status, 200, 'Fetch tasks returns 200');
  assertEqual(res.data?.tasks?.length, 3, 'User has 3 tasks after creating 3');

  // ══════════════════════════════════════
  // CATEGORY 2: Task Updates
  // ══════════════════════════════════════
  console.log('\n2. Task Updates:');

  // Edit title
  res = await apiRequest('PUT', `/tasks/${taskAlphaId}`, {
    title: 'Task Alpha Updated'
  }, token1);
  assertEqual(res.status, 200, 'Update task returns 200');
  assertEqual(res.data?.task?.title, 'Task Alpha Updated', 'Updated title in API response');

  // Verify in MongoDB
  const updatedDb = await Task.findById(taskAlphaId);
  assertEqual(updatedDb.title, 'Task Alpha Updated', 'MongoDB title updated correctly');

  // Change priority
  res = await apiRequest('PUT', `/tasks/${taskAlphaId}`, {
    priority: 'low'
  }, token1);
  assertEqual(res.data?.task?.priority, 'low', 'Priority change reflected in response');

  // Change due date
  res = await apiRequest('PUT', `/tasks/${taskAlphaId}`, {
    dueDate: '2026-07-01'
  }, token1);
  assertEqual(new Date(res.data?.task?.dueDate).toISOString().startsWith('2026-07-01'), true, 'Due date change reflected in response');

  // Toggle completion
  res = await apiRequest('PUT', `/tasks/${taskBetaId}`, {
    completed: true
  }, token1);
  assertEqual(res.data?.task?.completed, true, 'Task marked as completed');

  const completedDb = await Task.findById(taskBetaId);
  assertEqual(completedDb.completed, true, 'MongoDB completed status updated');

  // ══════════════════════════════════════
  // CATEGORY 3: Stats Consistency
  // ══════════════════════════════════════
  console.log('\n3. Stats Consistency (unfiltered fetch):');

  // Unfiltered fetch — should return all 3 tasks
  res = await apiRequest('GET', '/tasks', null, token1);
  const allTasks = res.data?.tasks;
  assertEqual(allTasks?.length, 3, 'Unfiltered fetch returns all 3 tasks');

  const pendingCount = allTasks?.filter(t => !t.completed).length;
  const completedCount = allTasks?.filter(t => t.completed).length;
  assertEqual(pendingCount, 2, 'Pending count = 2 (Alpha + Gamma)');
  assertEqual(completedCount, 1, 'Completed count = 1 (Beta)');

  // Filtered fetch — pending only
  res = await apiRequest('GET', '/tasks?status=pending', null, token1);
  assertEqual(res.data?.tasks?.length, 2, 'Filtered pending returns 2 tasks');

  // Filtered fetch — completed only
  res = await apiRequest('GET', '/tasks?status=completed', null, token1);
  assertEqual(res.data?.tasks?.length, 1, 'Filtered completed returns 1 task');

  // ══════════════════════════════════════
  // CATEGORY 4: Task Deletion
  // ══════════════════════════════════════
  console.log('\n4. Task Deletion:');

  const countBefore = await Task.countDocuments({ userId: userId1 });
  assertEqual(countBefore, 3, 'MongoDB document count is 3 before deletion');

  res = await apiRequest('DELETE', `/tasks/${taskGammaId}`, null, token1);
  assertEqual(res.status, 200, 'Delete task returns 200');
  assertEqual(res.data?.message, 'Task deleted.', 'Delete returns correct message');

  const countAfter = await Task.countDocuments({ userId: userId1 });
  assertEqual(countAfter, 2, 'MongoDB document count decreased to 2 after deletion');

  const deletedTask = await Task.findById(taskGammaId);
  assertEqual(deletedTask, null, 'Deleted task no longer exists in MongoDB (permanent delete)');

  // Fetch tasks — should show 2
  res = await apiRequest('GET', '/tasks', null, token1);
  assertEqual(res.data?.tasks?.length, 2, 'Fetch returns 2 tasks after deletion');

  // ══════════════════════════════════════
  // CATEGORY 5: User Ownership / Isolation
  // ══════════════════════════════════════
  console.log('\n5. User Ownership & Data Isolation:');

  // User 2 should see 0 tasks
  res = await apiRequest('GET', '/tasks', null, token2);
  assertEqual(res.data?.tasks?.length, 0, 'User 2 sees 0 tasks (isolation)');

  // User 2 creates their own task
  res = await apiRequest('POST', '/tasks', {
    title: 'User2 Task', priority: 'high', dueDate: '2026-06-20'
  }, token2);
  assertEqual(res.status, 201, 'User 2 can create tasks');
  const user2TaskId = res.data?.task?._id;

  // User 2 now sees 1 task
  res = await apiRequest('GET', '/tasks', null, token2);
  assertEqual(res.data?.tasks?.length, 1, 'User 2 sees only their own task');

  // User 1 still sees 2 tasks
  res = await apiRequest('GET', '/tasks', null, token1);
  assertEqual(res.data?.tasks?.length, 2, 'User 1 still sees only their 2 tasks');

  // User 1 cannot access User 2's task
  res = await apiRequest('GET', `/tasks/${user2TaskId}`, null, token1);
  assertEqual(res.status, 404, 'User 1 cannot read User 2 task (404)');

  // User 1 cannot update User 2's task
  res = await apiRequest('PUT', `/tasks/${user2TaskId}`, { title: 'Hacked' }, token1);
  assertEqual(res.status, 404, 'User 1 cannot update User 2 task (404)');

  // User 1 cannot delete User 2's task
  res = await apiRequest('DELETE', `/tasks/${user2TaskId}`, null, token1);
  assertEqual(res.status, 404, 'User 1 cannot delete User 2 task (404)');

  // ══════════════════════════════════════
  // CATEGORY 6: Field Injection Prevention
  // ══════════════════════════════════════
  console.log('\n6. Field Injection Prevention:');

  // Attempt to change userId via update
  const originalTask = await Task.findById(taskAlphaId);
  const originalUserId = originalTask.userId.toString();

  res = await apiRequest('PUT', `/tasks/${taskAlphaId}`, {
    title: 'Still Mine',
    userId: new mongoose.Types.ObjectId().toString()  // Malicious field
  }, token1);
  assertEqual(res.status, 200, 'Update succeeds (malicious userId field ignored)');

  const afterInjection = await Task.findById(taskAlphaId);
  assertEqual(afterInjection.userId.toString(), originalUserId, 'userId was NOT changed by injection attempt');
  assertEqual(afterInjection.title, 'Still Mine', 'Only whitelisted fields (title) were updated');

  // Attempt to inject _id
  res = await apiRequest('PUT', `/tasks/${taskAlphaId}`, {
    title: 'Final Title',
    _id: new mongoose.Types.ObjectId().toString()
  }, token1);
  assertEqual(res.status, 200, 'Update succeeds (_id injection ignored)');
  const afterIdInjection = await Task.findById(taskAlphaId);
  assertEqual(afterIdInjection._id.toString(), taskAlphaId, '_id was NOT changed by injection attempt');

  // ══════════════════════════════════════
  // CATEGORY 7: Response Shape Verification
  // ══════════════════════════════════════
  console.log('\n7. API Response Shape Verification:');

  // GET /tasks response shape
  res = await apiRequest('GET', '/tasks', null, token1);
  assertExists(res.data?.tasks, 'GET /tasks returns { tasks: [...] }');
  assertEqual(Array.isArray(res.data.tasks), true, 'tasks is an array');

  const sampleTask = res.data.tasks[0];
  assertExists(sampleTask._id, 'Task has _id field');
  assertExists(sampleTask.title, 'Task has title field');
  assertExists(sampleTask.priority, 'Task has priority field');
  assertExists(sampleTask.dueDate, 'Task has dueDate field');
  assertEqual(typeof sampleTask.completed, 'boolean', 'Task.completed is boolean');
  assertExists(sampleTask.userId, 'Task has userId field');
  assertExists(sampleTask.createdAt, 'Task has createdAt timestamp');
  assertExists(sampleTask.updatedAt, 'Task has updatedAt timestamp');

  // POST /tasks response shape
  res = await apiRequest('POST', '/tasks', {
    title: 'Shape Test', priority: 'low', dueDate: '2026-07-01'
  }, token1);
  assertExists(res.data?.message, 'POST /tasks returns message');
  assertExists(res.data?.task, 'POST /tasks returns task object');
  assertExists(res.data?.task?._id, 'Created task has _id');

  // PUT /tasks/:id response shape
  res = await apiRequest('PUT', `/tasks/${res.data.task._id}`, {
    title: 'Shape Test Updated'
  }, token1);
  assertExists(res.data?.message, 'PUT /tasks/:id returns message');
  assertExists(res.data?.task, 'PUT /tasks/:id returns updated task');

  // DELETE /tasks/:id response shape
  res = await apiRequest('DELETE', `/tasks/${res.data.task._id}`, null, token1);
  assertEqual(res.data?.message, 'Task deleted.', 'DELETE /tasks/:id returns message');

  // ══════════════════════════════════════
  // CATEGORY 8: Sort & Search Verification
  // ══════════════════════════════════════
  console.log('\n8. Sort & Search Verification:');

  // Search
  res = await apiRequest('GET', '/tasks?search=Final', null, token1);
  assertEqual(res.data?.tasks?.length >= 1, true, 'Search by title returns matching tasks');
  assertEqual(res.data?.tasks?.[0]?.title, 'Final Title', 'Search result matches query');

  // Sort by dueDate
  res = await apiRequest('GET', '/tasks?sort=dueDate', null, token1);
  assertEqual(res.status, 200, 'Sort by dueDate returns 200');

  // Sort by priority
  res = await apiRequest('GET', '/tasks?sort=priority', null, token1);
  assertEqual(res.status, 200, 'Sort by priority returns 200');

  // ══════════════════════════════════════
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
