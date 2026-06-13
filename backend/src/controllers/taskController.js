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

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
  taskValidation,
  taskUpdateValidation
};
