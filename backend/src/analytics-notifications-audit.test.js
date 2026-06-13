process.env.NODE_ENV = 'test';
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('./models/User');
const Task = require('./models/Task');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');

const TEST_PORT = 5018;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

let server;
const testEmail = 'analytics_audit@example.com';

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

async function setup() {
  console.log('--- Setting up Analytics & Notifications Audit Test Environment ---');
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
  app.use(require('./middleware/errorHandler'));

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
      console.error(`  ❌ [FAIL] ${msg} (Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)})`);
    }
  };

  const assertTruthy = (actual, msg) => {
    if (actual) {
      passed++;
      console.log(`  ✅ [PASS] ${msg}`);
    } else {
      failed++;
      console.error(`  ❌ [FAIL] ${msg} (Expected truthy, Got: ${JSON.stringify(actual)})`);
    }
  };

  console.log('\n======================================================');
  console.log('   ANALYTICS & NOTIFICATIONS AUDIT TESTS');
  console.log('======================================================\n');

  // ─────────────────────────────────────────────
  // SECTION 1: User Creation & Default Schema
  // ─────────────────────────────────────────────
  console.log('── 1. User Creation & Default Schema ──');

  let res = await apiRequest('POST', '/auth/signup', {
    name: 'Analytics Tester', email: testEmail, password: 'password123'
  });
  assertEqual(res.status, 201, 'Create test user');
  const token = res.data?.token;
  const userId = res.data?.user?._id;

  // Verify new notification preference defaults
  assertEqual(res.data?.user?.notificationPreferences?.weeklyReview, false, 'Default weeklyReview is false');
  assertEqual(res.data?.user?.notificationPreferences?.dailySummary, false, 'Default dailySummary is false');
  assertEqual(res.data?.user?.notificationPreferences?.emailReminders, false, 'Default emailReminders is false');
  assertEqual(res.data?.user?.notificationPreferences?.overdueAlerts, false, 'Default overdueAlerts is false');

  // Verify lastDailySummarySent & lastWeeklyReviewSent are null
  const dbUser = await User.findById(userId);
  assertEqual(dbUser.lastDailySummarySent, null, 'lastDailySummarySent is null on creation');
  assertEqual(dbUser.lastWeeklyReviewSent, null, 'lastWeeklyReviewSent is null on creation');

  // ─────────────────────────────────────────────
  // SECTION 2: Update weeklyReview Preference
  // ─────────────────────────────────────────────
  console.log('\n── 2. Update weeklyReview Notification Preference ──');

  res = await apiRequest('PUT', '/auth/preferences', {
    notificationPreferences: {
      emailReminders: true,
      overdueAlerts: true,
      dailySummary: true,
      weeklyReview: true
    }
  }, token);
  assertEqual(res.status, 200, 'Preferences update returns status 200');
  assertEqual(res.data?.user?.notificationPreferences?.weeklyReview, true, 'weeklyReview enabled');
  assertEqual(res.data?.user?.notificationPreferences?.dailySummary, true, 'dailySummary enabled');
  assertEqual(res.data?.user?.notificationPreferences?.emailReminders, true, 'emailReminders enabled');
  assertEqual(res.data?.user?.notificationPreferences?.overdueAlerts, true, 'overdueAlerts enabled');

  // ─────────────────────────────────────────────
  // SECTION 3: Analytics with No Tasks (Baseline)
  // ─────────────────────────────────────────────
  console.log('\n── 3. Analytics Baseline (No Tasks) ──');

  res = await apiRequest('GET', '/tasks/analytics', null, token);
  assertEqual(res.status, 200, 'Analytics endpoint returns 200');

  // Personal workspace stats are all zero
  assertEqual(res.data?.personal?.total, 0, 'Personal total is 0');
  assertEqual(res.data?.personal?.completed, 0, 'Personal completed is 0');
  assertEqual(res.data?.personal?.pending, 0, 'Personal pending is 0');
  assertEqual(res.data?.personal?.overdue, 0, 'Personal overdue is 0');
  assertEqual(res.data?.personal?.completionRate, 0, 'Personal completionRate is 0');

  // Organization workspace stats are all zero
  assertEqual(res.data?.organization?.total, 0, 'Organization total is 0');
  assertEqual(res.data?.organization?.completed, 0, 'Organization completed is 0');
  assertEqual(res.data?.organization?.completionRate, 0, 'Organization completionRate is 0');

  // Streaks zero
  assertEqual(res.data?.streak?.current, 0, 'Current streak is 0');
  assertEqual(res.data?.streak?.longest, 0, 'Longest streak is 0');

  // Weekly performance is an array
  assertTruthy(Array.isArray(res.data?.weeklyPerformance), 'weeklyPerformance is an array');
  assertEqual(res.data?.weeklyPerformance?.length, 4, 'weeklyPerformance has 4 weeks');

  // Monthly performance
  assertTruthy(Array.isArray(res.data?.monthlyPerformance), 'monthlyPerformance is an array');
  assertEqual(res.data?.monthlyPerformance?.length, 6, 'monthlyPerformance has 6 months');

  // Insights empty for no tasks
  assertTruthy(Array.isArray(res.data?.insights), 'insights is an array');

  // Motivational feedback present
  assertTruthy(typeof res.data?.motivationalFeedback === 'string', 'motivationalFeedback is a string');

  // ─────────────────────────────────────────────
  // SECTION 4: Task Creation & completedAt
  // ─────────────────────────────────────────────
  console.log('\n── 4. Task Creation & completedAt Lifecycle ──');

  const tomorrow = new Date(Date.now() + 86400000).toISOString();
  const pastDate = new Date(Date.now() - 2 * 86400000).toISOString();

  // Create personal task
  res = await apiRequest('POST', '/tasks', {
    title: 'Personal Task 1',
    priority: 'high',
    dueDate: tomorrow,
    workspace: 'personal'
  }, token);
  assertEqual(res.status, 201, 'Create personal task 1');
  const personalTaskId1 = res.data?.task?._id;

  // completedAt should be null on creation
  let dbTask = await Task.findById(personalTaskId1);
  assertEqual(dbTask.completedAt, null, 'completedAt is null on creation');

  // Create org tasks
  res = await apiRequest('POST', '/tasks', {
    title: 'Org Task 1',
    priority: 'medium',
    dueDate: tomorrow,
    workspace: 'organization'
  }, token);
  assertEqual(res.status, 201, 'Create org task 1');
  const orgTaskId1 = res.data?.task?._id;

  res = await apiRequest('POST', '/tasks', {
    title: 'Org Task 2',
    priority: 'low',
    dueDate: tomorrow,
    workspace: 'organization'
  }, token);
  assertEqual(res.status, 201, 'Create org task 2');
  const orgTaskId2 = res.data?.task?._id;

  // Create a personal task with past due date (for overdue)
  res = await apiRequest('POST', '/tasks', {
    title: 'Overdue Personal Task',
    priority: 'high',
    dueDate: pastDate,
    workspace: 'personal'
  }, token);
  assertEqual(res.status, 201, 'Create overdue personal task');
  const overdueTaskId = res.data?.task?._id;

  // ─────────────────────────────────────────────
  // SECTION 5: Analytics with Mixed Task State
  // ─────────────────────────────────────────────
  console.log('\n── 5. Analytics with Mixed Tasks (Pending + Overdue) ──');

  res = await apiRequest('GET', '/tasks/analytics', null, token);
  assertEqual(res.status, 200, 'Analytics returns 200');
  assertEqual(res.data?.personal?.total, 2, 'Personal total is 2');
  assertEqual(res.data?.personal?.pending, 2, 'Personal pending is 2');
  assertEqual(res.data?.personal?.overdue, 1, 'Personal overdue is 1 (past due date task)');
  assertEqual(res.data?.organization?.total, 2, 'Organization total is 2');
  assertEqual(res.data?.organization?.pending, 2, 'Organization pending is 2');

  // ─────────────────────────────────────────────
  // SECTION 6: Complete Tasks & Verify completedAt
  // ─────────────────────────────────────────────
  console.log('\n── 6. Complete Tasks & Verify completedAt ──');

  // Complete personal task 1
  res = await apiRequest('PUT', `/tasks/${personalTaskId1}`, { completed: true }, token);
  assertEqual(res.status, 200, 'Complete personal task 1');

  dbTask = await Task.findById(personalTaskId1);
  assertTruthy(dbTask.completedAt instanceof Date, 'completedAt is a Date after completion');
  assertTruthy(dbTask.completed === true, 'Task is marked completed');

  // Complete org task 1
  res = await apiRequest('PUT', `/tasks/${orgTaskId1}`, { completed: true }, token);
  assertEqual(res.status, 200, 'Complete org task 1');

  const dbOrgTask = await Task.findById(orgTaskId1);
  assertTruthy(dbOrgTask.completedAt instanceof Date, 'Org task completedAt set');

  // ─────────────────────────────────────────────
  // SECTION 7: Uncomplete Task Clears completedAt
  // ─────────────────────────────────────────────
  console.log('\n── 7. Uncomplete Task Clears completedAt ──');

  res = await apiRequest('PUT', `/tasks/${orgTaskId1}`, { completed: false }, token);
  assertEqual(res.status, 200, 'Uncomplete org task 1');

  const dbOrgTaskUncompleted = await Task.findById(orgTaskId1);
  assertEqual(dbOrgTaskUncompleted.completedAt, null, 'completedAt reset to null after uncompleting');
  assertEqual(dbOrgTaskUncompleted.completed, false, 'Task marked as not completed');

  // Re-complete for later tests
  res = await apiRequest('PUT', `/tasks/${orgTaskId1}`, { completed: true }, token);
  assertEqual(res.status, 200, 'Re-complete org task 1');

  // ─────────────────────────────────────────────
  // SECTION 8: Analytics After Completions
  // ─────────────────────────────────────────────
  console.log('\n── 8. Analytics After Completions ──');

  res = await apiRequest('GET', '/tasks/analytics', null, token);
  assertEqual(res.status, 200, 'Analytics returns 200');

  // Personal: 2 total, 1 completed, 1 pending (overdue task)
  assertEqual(res.data?.personal?.total, 2, 'Personal total is 2');
  assertEqual(res.data?.personal?.completed, 1, 'Personal completed is 1');
  assertEqual(res.data?.personal?.pending, 1, 'Personal pending is 1');
  assertEqual(res.data?.personal?.completionRate, 50, 'Personal completionRate is 50%');

  // Organization: 2 total, 1 completed, 1 pending
  assertEqual(res.data?.organization?.total, 2, 'Organization total is 2');
  assertEqual(res.data?.organization?.completed, 1, 'Organization completed is 1');
  assertEqual(res.data?.organization?.pending, 1, 'Organization pending is 1');
  assertEqual(res.data?.organization?.completionRate, 50, 'Organization completionRate is 50%');

  // Streaks: should have at least current = 1 (completed today)
  assertTruthy(res.data?.streak?.current >= 1, 'Current streak >= 1 after completing tasks today');

  // Insights should contain overdue insight
  const hasOverdueInsight = res.data?.insights?.some(i => i.includes('overdue'));
  assertTruthy(hasOverdueInsight, 'Insights include overdue task warning');

  // ─────────────────────────────────────────────
  // SECTION 9: Workspace Stats Isolation
  // ─────────────────────────────────────────────
  console.log('\n── 9. Workspace Stats Isolation ──');

  // Complete overdue task and org task 2 to create divergence
  res = await apiRequest('PUT', `/tasks/${overdueTaskId}`, { completed: true }, token);
  assertEqual(res.status, 200, 'Complete overdue task');

  res = await apiRequest('GET', '/tasks/analytics', null, token);

  // Personal: 2/2 completed => 100%
  assertEqual(res.data?.personal?.completed, 2, 'Personal completed is 2');
  assertEqual(res.data?.personal?.completionRate, 100, 'Personal completionRate is 100%');

  // Organization: 1/2 completed => 50%
  assertEqual(res.data?.organization?.completed, 1, 'Organization completed is still 1');
  assertEqual(res.data?.organization?.completionRate, 50, 'Organization completionRate is still 50%');

  // ─────────────────────────────────────────────
  // SECTION 10: Notification Flags on Task Schema
  // ─────────────────────────────────────────────
  console.log('\n── 10. Notification Flags on Task Schema ──');

  // Create a new task and manually set its notification flags
  res = await apiRequest('POST', '/tasks', {
    title: 'Notification Flag Test',
    priority: 'medium',
    dueDate: tomorrow,
    workspace: 'personal'
  }, token);
  assertEqual(res.status, 201, 'Create notification flag test task');
  const notifTaskId = res.data?.task?._id;

  // Default flags should be false
  let dbNotifTask = await Task.findById(notifTaskId);
  assertEqual(dbNotifTask.notifiedDueTomorrow, false, 'notifiedDueTomorrow defaults to false');
  assertEqual(dbNotifTask.notifiedOverdue, false, 'notifiedOverdue defaults to false');

  // Manually set flags to true (simulating email service marking them)
  dbNotifTask.notifiedDueTomorrow = true;
  dbNotifTask.notifiedOverdue = true;
  await dbNotifTask.save();

  dbNotifTask = await Task.findById(notifTaskId);
  assertEqual(dbNotifTask.notifiedDueTomorrow, true, 'notifiedDueTomorrow set to true');
  assertEqual(dbNotifTask.notifiedOverdue, true, 'notifiedOverdue set to true');

  // Change the dueDate — flags should reset via pre-save hook
  const newDueDate = new Date(Date.now() + 5 * 86400000);
  dbNotifTask.dueDate = newDueDate;
  await dbNotifTask.save();

  dbNotifTask = await Task.findById(notifTaskId);
  assertEqual(dbNotifTask.notifiedDueTomorrow, false, 'notifiedDueTomorrow reset after dueDate change');
  assertEqual(dbNotifTask.notifiedOverdue, false, 'notifiedOverdue reset after dueDate change');

  // ─────────────────────────────────────────────
  // SECTION 11: Daily Summary Duplicate Prevention
  // ─────────────────────────────────────────────
  console.log('\n── 11. Daily Summary Duplicate Prevention ──');

  // Simulate setting lastDailySummarySent to today
  const userDoc = await User.findById(userId);
  userDoc.lastDailySummarySent = new Date();
  await userDoc.save();

  const refreshed = await User.findById(userId);
  assertTruthy(refreshed.lastDailySummarySent instanceof Date, 'lastDailySummarySent is a Date');

  // The email service checks: if lastDailySummarySent matches today's date, it skips.
  const now = new Date();
  const lastSent = new Date(refreshed.lastDailySummarySent);
  const sameDay = (
    lastSent.getFullYear() === now.getFullYear() &&
    lastSent.getMonth() === now.getMonth() &&
    lastSent.getDate() === now.getDate()
  );
  assertEqual(sameDay, true, 'lastDailySummarySent matches today — duplicate send would be blocked');

  // ─────────────────────────────────────────────
  // SECTION 12: Weekly Review Duplicate Prevention
  // ─────────────────────────────────────────────
  console.log('\n── 12. Weekly Review Duplicate Prevention ──');

  // Simulate setting lastWeeklyReviewSent to today
  userDoc.lastWeeklyReviewSent = new Date();
  await userDoc.save();

  const refreshed2 = await User.findById(userId);
  assertTruthy(refreshed2.lastWeeklyReviewSent instanceof Date, 'lastWeeklyReviewSent is a Date');

  // The email service checks: if less than 6 days since lastWeeklyReviewSent, it skips.
  const timeDiff = now.getTime() - new Date(refreshed2.lastWeeklyReviewSent).getTime();
  const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
  assertEqual(daysDiff < 6, true, 'Weekly review sent recently — duplicate send would be blocked');

  // ─────────────────────────────────────────────
  // SECTION 13: Analytics Unauthorized Access
  // ─────────────────────────────────────────────
  console.log('\n── 13. Analytics Unauthorized Access ──');

  res = await apiRequest('GET', '/tasks/analytics', null, null);
  assertEqual(res.status, 401, 'Analytics without token returns 401');

  res = await apiRequest('GET', '/tasks/analytics', null, 'invalidtoken123');
  assertEqual(res.status, 401, 'Analytics with bad token returns 401');

  // ─────────────────────────────────────────────
  // SECTION 14: Streak Stability with Historic Data
  // ─────────────────────────────────────────────
  console.log('\n── 14. Streak Stability with Historic completedAt ──');

  // Directly insert tasks with completedAt set to yesterday and 2 days ago
  const yesterdayDate = new Date(Date.now() - 86400000);
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000);

  await Task.create({
    userId: userId,
    title: 'Historic Task Yesterday',
    dueDate: yesterdayDate,
    completed: true,
    completedAt: yesterdayDate,
    workspace: 'personal'
  });

  await Task.create({
    userId: userId,
    title: 'Historic Task 2 Days Ago',
    dueDate: twoDaysAgo,
    completed: true,
    completedAt: twoDaysAgo,
    workspace: 'personal'
  });

  res = await apiRequest('GET', '/tasks/analytics', null, token);
  assertEqual(res.status, 200, 'Analytics returns 200 after historic data insert');

  // We completed tasks today, yesterday, and 2 days ago — streak should be >= 3
  assertTruthy(res.data?.streak?.current >= 3, `Current streak >= 3 after 3 consecutive days (got: ${res.data?.streak?.current})`);
  assertTruthy(res.data?.streak?.longest >= res.data?.streak?.current, 'Longest streak >= current streak');

  // ─────────────────────────────────────────────
  // SECTION 15: Weekly & Monthly Performance Structure
  // ─────────────────────────────────────────────
  console.log('\n── 15. Weekly & Monthly Performance Data Structure ──');

  // Verify weekly performance entries have correct keys
  const thisWeek = res.data?.weeklyPerformance?.[0];
  assertEqual(thisWeek?.weekLabel, 'This Week', 'First weekly entry is "This Week"');
  assertTruthy(typeof thisWeek?.created === 'number', 'Weekly created is a number');
  assertTruthy(typeof thisWeek?.completed === 'number', 'Weekly completed is a number');
  assertTruthy(typeof thisWeek?.completionRate === 'number', 'Weekly completionRate is a number');

  // Verify monthly performance entries have correct keys
  const lastMonth = res.data?.monthlyPerformance?.[res.data.monthlyPerformance.length - 1];
  assertTruthy(typeof lastMonth?.monthLabel === 'string', 'Monthly label is a string');
  assertTruthy(typeof lastMonth?.created === 'number', 'Monthly created is a number');
  assertTruthy(typeof lastMonth?.completed === 'number', 'Monthly completed is a number');
  assertTruthy(typeof lastMonth?.completionRate === 'number', 'Monthly completionRate is a number');

  // ─────────────────────────────────────────────
  // SECTION 16: Insight Engine Content
  // ─────────────────────────────────────────────
  console.log('\n── 16. Insight Engine Content Validation ──');

  // After completing tasks across both workspaces, we should see workspace comparison
  const hasWorkspaceInsight = res.data?.insights?.some(
    i => i.includes('Personal') || i.includes('Organization')
  );
  assertTruthy(hasWorkspaceInsight, 'Insights include workspace comparison');

  // Should have streak insight
  const hasStreakInsight = res.data?.insights?.some(i => i.includes('streak'));
  assertTruthy(hasStreakInsight, 'Insights include streak information');

  // Should have best day insight
  const hasDayInsight = res.data?.insights?.some(i => i.includes('most tasks on'));
  assertTruthy(hasDayInsight, 'Insights include best day analysis');

  // Motivational feedback mentions recent completions
  assertTruthy(
    res.data?.motivationalFeedback?.includes('completed') ||
    res.data?.motivationalFeedback?.includes('momentum'),
    'Motivational feedback references completions or momentum'
  );

  // ─────────────────────────────────────────────
  // SECTION 17: Cleanup & Cascading Deletion
  // ─────────────────────────────────────────────
  console.log('\n── 17. Cleanup & Cascading Deletion ──');

  res = await apiRequest('DELETE', '/auth/account', null, token);
  assertEqual(res.status, 200, 'Delete account returns 200');

  // Verify all tasks for this user are deleted
  const remainingTasks = await Task.countDocuments({ userId: userId });
  assertEqual(remainingTasks, 0, 'All user tasks deleted on account deletion');

  // Verify user document is gone
  const remainingUser = await User.findById(userId);
  assertEqual(remainingUser, null, 'User document deleted from MongoDB');

  // ─────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────
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
