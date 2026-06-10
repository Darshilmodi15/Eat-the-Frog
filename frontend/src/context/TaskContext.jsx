import { createContext, useContext, useState, useCallback } from 'react';
import { taskService } from '../services/taskService';

const TaskContext = createContext(null);

export function TaskProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');       // 'all' | 'pending' | 'completed'
  const [sortBy, setSortBy] = useState('createdAt');  // 'createdAt' | 'dueDate' | 'priority'
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      if (sortBy) params.sort = sortBy;
      if (searchQuery) params.search = searchQuery;

      const data = await taskService.getTasks(params);
      setTasks(data.tasks);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, [filter, sortBy, searchQuery]);

  const createTask = useCallback(async (taskData) => {
    const data = await taskService.createTask(taskData);
    setTasks(prev => [data.task, ...prev]);
    return data.task;
  }, []);

  const updateTask = useCallback(async (id, taskData) => {
    const data = await taskService.updateTask(id, taskData);
    setTasks(prev => prev.map(t => t._id === id ? data.task : t));
    return data.task;
  }, []);

  const toggleComplete = useCallback(async (id, completed) => {
    const data = await taskService.updateTask(id, { completed: !completed });
    setTasks(prev => prev.map(t => t._id === id ? data.task : t));
    return data.task;
  }, []);

  const deleteTask = useCallback(async (id) => {
    await taskService.deleteTask(id);
    setTasks(prev => prev.filter(t => t._id !== id));
  }, []);

  // Computed stats
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => !t.completed).length,
    completed: tasks.filter(t => t.completed).length,
    overdue: tasks.filter(t => {
      if (t.completed) return false;
      return new Date(t.dueDate) < new Date();
    }).length
  };

  const value = {
    tasks,
    loading,
    error,
    filter,
    sortBy,
    searchQuery,
    stats,
    setFilter,
    setSortBy,
    setSearchQuery,
    fetchTasks,
    createTask,
    updateTask,
    toggleComplete,
    deleteTask
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
}
