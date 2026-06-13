const { validationResult, body } = require('express-validator');
const Task = require('../models/Task');

// Validation rules
const taskValidation = [
  body('title').trim().notEmpty().withMessage('Title is required')
    .isLength({ max: 150 }).withMessage('Title cannot exceed 150 characters'),
  body('priority').optional().isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  body('dueDate').notEmpty().withMessage('Due date is required')
    .isISO8601().withMessage('Invalid date format')
    .custom((value) => {
      if (process.env.NODE_ENV === 'test') return true;
      const dueDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dueDate < today) {
        throw new Error('Due date cannot be in the past');
      }
      return true;
    }),
  body('description').optional().trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters')
];

const taskUpdateValidation = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty')
    .isLength({ max: 150 }).withMessage('Title cannot exceed 150 characters'),
  body('priority').optional().isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  body('dueDate').optional().isISO8601().withMessage('Invalid date format')
    .custom((value) => {
      if (process.env.NODE_ENV === 'test') return true;
      const dueDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dueDate < today) {
        throw new Error('Due date cannot be in the past');
      }
      return true;
    }),
  body('description').optional().trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
  body('completed').optional().isBoolean().withMessage('Completed must be a boolean')
];

// GET /api/tasks
const getTasks = async (req, res, next) => {
  try {
    const { status, sort, search, workspace } = req.query;
    const filter = { userId: req.user._id };

    // Workspace filter
    const targetWorkspace = workspace || req.user.lastWorkspace || 'personal';
    if (targetWorkspace !== 'all') {
      filter.workspace = targetWorkspace;
    }

    // Status filter
    if (status === 'pending') filter.completed = false;
    if (status === 'completed') filter.completed = true;
    if (status === 'overdue') {
      filter.completed = false;
      filter.$or = [
        { dueDate: { $lt: new Date() } },
        { 'subtasks': { $elemMatch: { completed: false, dueDate: { $lt: new Date() } } } }
      ];
    }

    // Search filter
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort options
    let sortObj = { order: 1, createdAt: -1 };
    if (sort === 'dueDate') sortObj = { dueDate: 1 };
    if (sort === '-dueDate') sortObj = { dueDate: -1 };
    if (sort === 'priority') {
      // Custom sort: high > medium > low
      sortObj = { priority: -1, dueDate: 1 };
    }
    if (sort === 'createdAt') sortObj = { createdAt: -1 };

    const tasks = await Task.find(filter).sort(sortObj);

    // If sorting by priority, do a manual sort since string sort doesn't work right
    if (sort === 'priority') {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    }

    res.json({ tasks });
  } catch (error) {
    next(error);
  }
};

// GET /api/tasks/:id
const getTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }
    res.json({ task });
  } catch (error) {
    next(error);
  }
};

// POST /api/tasks
const createTask = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { title, description, priority, dueDate, workspace } = req.body;

    if (workspace && !['personal', 'organization'].includes(workspace)) {
      return res.status(400).json({ message: 'Workspace must be personal or organization' });
    }

    const targetWorkspace = workspace || req.user.lastWorkspace || 'personal';

    // Get the highest order number for this user's tasks in this workspace
    const lastTask = await Task.findOne({ userId: req.user._id, workspace: targetWorkspace }).sort({ order: -1 });
    const order = lastTask ? lastTask.order + 1 : 0;

    const task = await Task.create({
      userId: req.user._id,
      title,
      description: description || '',
      priority: priority || 'medium',
      dueDate,
      order,
      workspace: targetWorkspace
    });

    res.status(201).json({ message: 'Task created.', task });
  } catch (error) {
    next(error);
  }
};

// PUT /api/tasks/:id
const updateTask = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const existingTask = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!existingTask) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    // Whitelist allowed fields — prevents userId, _id, order, etc. injection
    const allowedFields = ['title', 'description', 'priority', 'dueDate', 'completed', 'subtasks'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Auto-management of subtasks completion status
    if (updates.subtasks !== undefined) {
      const subtasks = updates.subtasks || [];
      if (subtasks.length > 0) {
        updates.completed = subtasks.every(s => s.completed);
      }
    } else if (updates.completed !== undefined) {
      if (existingTask.subtasks && existingTask.subtasks.length > 0) {
        updates.subtasks = existingTask.subtasks.map(s => {
          const subDoc = s.toObject ? s.toObject() : s;
          return { ...subDoc, completed: updates.completed };
        });
      }
    }

    // Set completedAt depending on completed transitions
    const targetCompleted = updates.completed !== undefined ? updates.completed : existingTask.completed;
    if (targetCompleted !== existingTask.completed) {
      updates.completedAt = targetCompleted ? new Date() : null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update.' });
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: updates },
      { returnDocument: 'after', runValidators: true }
    );

    res.json({ message: 'Task updated.', task });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/tasks/:id
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }
    res.json({ message: 'Task deleted.' });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/tasks/reorder
const reorderTasks = async (req, res, next) => {
  try {
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ message: 'orderedIds must be an array.' });
    }

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id, userId: req.user._id },
        update: { $set: { order: index } }
      }
    }));

    await Task.bulkWrite(bulkOps);
    res.json({ message: 'Tasks reordered.' });
  } catch (error) {
    next(error);
  }
};

// GET /api/tasks/analytics
const getAnalytics = async (req, res, next) => {
  try {
    const allTasks = await Task.find({ userId: req.user._id });

    // 1. Core Metrics Personal
    const personalTasks = allTasks.filter(t => t.workspace === 'personal');
    const pTotal = personalTasks.length;
    const pCompleted = personalTasks.filter(t => t.completed).length;
    const pPending = personalTasks.filter(t => !t.completed).length;
    const pOverdue = personalTasks.filter(t => !t.completed && (t.dueDate < new Date() || t.subtasks?.some(s => !s.completed && s.dueDate < new Date()))).length;
    const pCompletionRate = pTotal > 0 ? Math.round((pCompleted / pTotal) * 100) : 0;

    // 2. Core Metrics Organization
    const orgTasks = allTasks.filter(t => t.workspace === 'organization');
    const oTotal = orgTasks.length;
    const oCompleted = orgTasks.filter(t => t.completed).length;
    const oPending = orgTasks.filter(t => !t.completed).length;
    const oOverdue = orgTasks.filter(t => !t.completed && (t.dueDate < new Date() || t.subtasks?.some(s => !s.completed && s.dueDate < new Date()))).length;
    const oCompletionRate = oTotal > 0 ? Math.round((oCompleted / oTotal) * 100) : 0;

    // 3. Streak Calculations
    const completedTasks = allTasks.filter(t => t.completed && t.completedAt);
    const completedDates = completedTasks.map(t => {
      const date = new Date(t.completedAt);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });
    const uniqueDates = Array.from(new Set(completedDates)).sort((a, b) => b.localeCompare(a)); // desc

    let currentStreak = 0;
    if (uniqueDates.length > 0) {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const yesterday = new Date(Date.now() - 86400000);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

      let checkDate = null;
      if (uniqueDates.includes(todayStr)) {
        checkDate = today;
      } else if (uniqueDates.includes(yesterdayStr)) {
        checkDate = yesterday;
      }

      if (checkDate) {
        currentStreak = 1;
        let running = true;
        let prevDate = new Date(checkDate.getTime());
        while (running) {
          prevDate.setDate(prevDate.getDate() - 1);
          const prevStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
          if (uniqueDates.includes(prevStr)) {
            currentStreak++;
          } else {
            running = false;
          }
        }
      }
    }

    let longestStreak = 0;
    if (uniqueDates.length > 0) {
      const sortedDatesAsc = Array.from(new Set(completedDates)).sort((a, b) => a.localeCompare(b));
      let tempStreak = 1;
      longestStreak = 1;
      for (let i = 1; i < sortedDatesAsc.length; i++) {
        const d1 = new Date(sortedDatesAsc[i - 1]);
        const d2 = new Date(sortedDatesAsc[i]);
        const diffTime = Math.abs(d2 - d1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
          }
          tempStreak = 1;
        }
      }
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    }

    // 4. Weekly Performance (last 4 weeks)
    const weeklyPerformance = [];
    const now = new Date();
    for (let i = 0; i < 4; i++) {
      const rangeEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const rangeStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      
      const createdCount = allTasks.filter(t => t.createdAt >= rangeStart && t.createdAt < rangeEnd).length;
      const completedCount = allTasks.filter(t => t.completed && t.completedAt >= rangeStart && t.completedAt < rangeEnd).length;
      const overdueCount = allTasks.filter(t => !t.completed && t.dueDate < rangeEnd && t.dueDate >= rangeStart).length;
      const completionRate = createdCount > 0 ? Math.round((completedCount / createdCount) * 100) : 0;
      
      weeklyPerformance.push({
        weekLabel: i === 0 ? 'This Week' : `${i} Wk${i > 1 ? 's' : ''} Ago`,
        created: createdCount,
        completed: completedCount,
        overdue: overdueCount,
        completionRate
      });
    }

    // 5. Monthly Performance (last 6 months)
    const monthlyPerformance = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      
      const rangeStart = new Date(year, month, 1);
      const rangeEnd = new Date(year, month + 1, 1);
      
      const createdCount = allTasks.filter(t => t.createdAt >= rangeStart && t.createdAt < rangeEnd).length;
      const completedCount = allTasks.filter(t => t.completed && t.completedAt >= rangeStart && t.completedAt < rangeEnd).length;
      const completionRate = createdCount > 0 ? Math.round((completedCount / createdCount) * 100) : 0;
      const monthLabel = d.toLocaleString('en-US', { month: 'short' });
      
      monthlyPerformance.unshift({
        monthLabel,
        created: createdCount,
        completed: completedCount,
        completionRate
      });
    }

    // 6. Best Day calculation
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const completedCountsByDay = [0, 0, 0, 0, 0, 0, 0];
    completedTasks.forEach(t => {
      const day = new Date(t.completedAt).getDay();
      completedCountsByDay[day]++;
    });
    
    let maxDayIndex = 1;
    let maxCount = completedCountsByDay[1];
    for (let i = 0; i < 7; i++) {
      if (completedCountsByDay[i] > maxCount) {
        maxCount = completedCountsByDay[i];
        maxDayIndex = i;
      }
    }
    const bestDay = daysOfWeek[maxDayIndex];

    // 7. Insight Engine
    const insights = [];
    if (completedTasks.length > 0) {
      insights.push(`You complete most tasks on ${bestDay}s.`);
    }
    if (pTotal > 0 && oTotal > 0) {
      if (oCompletionRate > pCompletionRate) {
        insights.push('Organization workspace has a higher completion rate.');
      } else if (pCompletionRate > oCompletionRate) {
        insights.push('Personal workspace has a higher completion rate.');
      }
    }
    const totalOverdue = allTasks.filter(t => !t.completed && (t.dueDate < new Date() || t.subtasks?.some(s => !s.completed && s.dueDate < new Date()))).length;
    if (totalOverdue > 0) {
      insights.push(`You currently have ${totalOverdue} overdue task${totalOverdue > 1 ? 's' : ''}.`);
    }
    if (currentStreak > 0) {
      insights.push(`Your productivity streak is ${currentStreak} day${currentStreak > 1 ? 's' : ''}.`);
    }

    // 8. Motivational Feedback
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCompleted = allTasks.filter(t => t.completed && t.completedAt >= oneWeekAgo).length;
    let motivationalFeedback = 'Keep up the momentum! Remember, do the most important task first.';
    if (recentCompleted > 0) {
      motivationalFeedback = `Great work! You completed ${recentCompleted} task${recentCompleted > 1 ? 's' : ''} this week.`;
    }
    if (currentStreak >= 3) {
      motivationalFeedback += ` Current streak: ${currentStreak} days! 🔥`;
    }

    res.json({
      personal: {
        total: pTotal,
        completed: pCompleted,
        pending: pPending,
        overdue: pOverdue,
        completionRate: pCompletionRate
      },
      organization: {
        total: oTotal,
        completed: oCompleted,
        pending: oPending,
        overdue: oOverdue,
        completionRate: oCompletionRate
      },
      streak: {
        current: currentStreak,
        longest: longestStreak
      },
      weeklyPerformance,
      monthlyPerformance,
      insights,
      motivationalFeedback
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
  getAnalytics,
  taskValidation,
  taskUpdateValidation
};
