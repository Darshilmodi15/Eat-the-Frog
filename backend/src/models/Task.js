const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Subtask title is required'],
    trim: true,
    maxlength: [150, 'Title cannot exceed 150 characters']
  },
  completed: {
    type: Boolean,
    default: false
  },
  dueDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  subtasks: {
    type: [subtaskSchema],
    default: []
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [150, 'Title cannot exceed 150 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
    default: ''
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high'],
      message: 'Priority must be low, medium, or high'
    },
    default: 'medium'
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  completed: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  },
  lastNotified: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  notifiedDueTomorrow: {
    type: Boolean,
    default: false
  },
  notifiedOverdue: {
    type: Boolean,
    default: false
  },
  workspace: {
    type: String,
    enum: ['personal', 'organization'],
    default: 'personal',
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Reset notification flags on dueDate change
taskSchema.pre('save', function(next) {
  if (this.isModified('dueDate')) {
    this.notifiedDueTomorrow = false;
    this.notifiedOverdue = false;
  }
  next();
});

// Virtual property for progress calculation
taskSchema.virtual('progress').get(function() {
  if (!this.subtasks || this.subtasks.length === 0) return 0;
  const completed = this.subtasks.filter(s => s.completed).length;
  return Math.round((completed / this.subtasks.length) * 100);
});

// Compound index for efficient querying
taskSchema.index({ userId: 1, completed: 1 });
taskSchema.index({ userId: 1, dueDate: 1 });
taskSchema.index({ userId: 1, workspace: 1 });

module.exports = mongoose.model('Task', taskSchema);
