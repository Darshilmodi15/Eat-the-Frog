const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
  taskValidation,
  taskUpdateValidation
} = require('../controllers/taskController');

// All task routes require authentication
router.use(auth);

router.get('/', getTasks);
router.post('/', taskValidation, createTask);
router.patch('/reorder', reorderTasks);
router.get('/:id', getTask);
router.put('/:id', taskUpdateValidation, updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
