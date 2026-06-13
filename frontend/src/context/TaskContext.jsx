import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { taskService } from '../services/taskService';
import { isOverdue } from '../utils/dateUtils';

const TaskContext = createContext(null);

export function TaskProvider({ children }) {
  const [tasks, setTasks] = useState([]);         // Filtered + sorted tasks for display
  const [allTasks, setAllTasks] = useState([]);    // Unfiltered tasks for stats computation
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState(() => {
    const saved = localStorage.getItem('etf_filter');
    return saved || 'all';
  }); // 'all' | 'pending' | 'completed' | 'overdue'
  const [sortBy, setSortBy] = useState('createdAt');  // 'createdAt' | 'dueDate' | 'priority'
  const [searchQuery, setSearchQuery] = useState('');

  // Track current filter/sort/search for use in CRUD callbacks
  const filterRef = useRef(filter);
  const sortByRef = useRef(sortBy);
  const searchQueryRef = useRef(searchQuery);
  filterRef.current = filter;
  sortByRef.current = sortBy;
  searchQueryRef.current = searchQuery;

  const handleSetFilter = useCallback((newFilter) => {
    setFilter(newFilter);
    localStorage.setItem('etf_filter', newFilter);
  }, []);

  // Fetch filtered tasks for display (respects current filter/sort/search)
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filterRef.current !== 'all') params.status = filterRef.current;
      if (sortByRef.current) params.sort = sortByRef.current;
      if (searchQueryRef.current) params.search = searchQueryRef.current;

      const data = await taskService.getTasks(params);
      setTasks(data.tasks);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch ALL tasks (unfiltered) for accurate stats computation
  const fetchAllStats = useCallback(async () => {
    try {
      const data = await taskService.getTasks({});
      setAllTasks(data.tasks);
    } catch (err) {
      // Stats fetch failure is non-critical; don't overwrite main error
      console.error('[TASKS] Stats fetch failed:', err);
    }
  }, []);

  // Combined fetch: display tasks + stats (called on mount and after filter/sort changes)
  const fetchAll = useCallback(async () => {
    await Promise.all([fetchTasks(), fetchAllStats()]);
  }, [fetchTasks, fetchAllStats]);

  // After any CRUD mutation, re-fetch both filtered tasks and full stats from server
  const refreshAfterMutation = useCallback(async () => {
    await Promise.all([fetchTasks(), fetchAllStats()]);
  }, [fetchTasks, fetchAllStats]);

  const createTask = useCallback(async (taskData) => {
    const data = await taskService.createTask(taskData);
    // Re-fetch from server to get correct sort position and updated stats
    await refreshAfterMutation();
    return data.task;
  }, [refreshAfterMutation]);

  const updateTask = useCallback(async (id, taskData) => {
    const data = await taskService.updateTask(id, taskData);
    // Re-fetch from server to respect filters/sorts and update stats
    await refreshAfterMutation();
    return data.task;
  }, [refreshAfterMutation]);

  const toggleComplete = useCallback(async (id, completed) => {
    const data = await taskService.updateTask(id, { completed: !completed });
    // Re-fetch: task may need to appear/disappear from filtered view, stats must update
    await refreshAfterMutation();
    return data.task;
  }, [refreshAfterMutation]);

  const deleteTask = useCallback(async (id) => {
    await taskService.deleteTask(id);
    // Re-fetch from server to update both display and stats
    await refreshAfterMutation();
  }, [refreshAfterMutation]);

  const deleteMultipleTasks = useCallback(async (ids) => {
    await Promise.all(ids.map(id => taskService.deleteTask(id)));
    // Re-fetch from server to update both display and stats
    await refreshAfterMutation();
  }, [refreshAfterMutation]);

  // Stats computed from allTasks (full unfiltered dataset) — always accurate
  // Uses the same isOverdue utility as TaskCard for consistency (Bug 4 fix)
  const stats = {
    total: allTasks.length,
    pending: allTasks.filter(t => !t.completed).length,
    completed: allTasks.filter(t => t.completed).length,
    overdue: allTasks.filter(t => !t.completed && isOverdue(t.dueDate)).length
  };

  const value = {
    tasks,
    loading,
    error,
    filter,
    sortBy,
    searchQuery,
    stats,
    setFilter: handleSetFilter,
    setSortBy,
    setSearchQuery,
    fetchTasks: fetchAll,  // DashboardPage calls this; it fetches both
    createTask,
    updateTask,
    toggleComplete,
    deleteTask,
    deleteMultipleTasks
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
