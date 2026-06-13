import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { taskService } from '../services/taskService';
import { isOverdue } from '../utils/dateUtils';
import { useAuth } from './AuthContext';

const TaskContext = createContext(null);

export function TaskProvider({ children }) {
  const { user, isAuthenticated, updatePreferences } = useAuth() || {};
  
  const [workspace, setWorkspace] = useState(() => {
    if (user?.lastWorkspace) return user.lastWorkspace;
    const saved = localStorage.getItem('etf_workspace');
    return saved || 'personal';
  });
  
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

  // Keep workspace state in sync if user changes (e.g. login or updates)
  useEffect(() => {
    if (user?.lastWorkspace) {
      setWorkspace(user.lastWorkspace);
    }
  }, [user]);

  // Track current filter/sort/search/workspace for use in CRUD callbacks
  const filterRef = useRef(filter);
  const sortByRef = useRef(sortBy);
  const searchQueryRef = useRef(searchQuery);
  const workspaceRef = useRef(workspace);
  
  filterRef.current = filter;
  sortByRef.current = sortBy;
  searchQueryRef.current = searchQuery;
  workspaceRef.current = workspace;

  const handleSetFilter = useCallback((newFilter) => {
    setFilter(newFilter);
    localStorage.setItem('etf_filter', newFilter);
  }, []);

  const handleSetWorkspace = useCallback(async (newWorkspace) => {
    if (!['personal', 'organization'].includes(newWorkspace)) return;
    
    setWorkspace(newWorkspace);
    localStorage.setItem('etf_workspace', newWorkspace);
    
    if (isAuthenticated && updatePreferences) {
      try {
        await updatePreferences({ lastWorkspace: newWorkspace });
      } catch (err) {
        console.error('[TASKS] Failed to persist workspace choice:', err);
      }
    }
  }, [isAuthenticated, updatePreferences]);

  // Fetch filtered tasks for display (respects current filter/sort/search/workspace)
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filterRef.current !== 'all') params.status = filterRef.current;
      if (sortByRef.current) params.sort = sortByRef.current;
      if (searchQueryRef.current) params.search = searchQueryRef.current;
      params.workspace = workspaceRef.current;

      const data = await taskService.getTasks(params);
      setTasks(data.tasks);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch ALL tasks (unfiltered by workspace) for accurate stats computation across both workspaces
  const fetchAllStats = useCallback(async () => {
    try {
      const data = await taskService.getTasks({ workspace: 'all' });
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
    const data = await taskService.createTask({
      ...taskData,
      workspace: workspaceRef.current
    });
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

  // Scoped stats calculation for each workspace
  const personalTasks = allTasks.filter(t => t.workspace === 'personal');
  const organizationTasks = allTasks.filter(t => t.workspace === 'organization');

  const personalStats = {
    total: personalTasks.length,
    pending: personalTasks.filter(t => !t.completed).length,
    completed: personalTasks.filter(t => t.completed).length,
    overdue: personalTasks.filter(t => !t.completed && (isOverdue(t.dueDate) || t.subtasks?.some(s => !s.completed && isOverdue(s.dueDate)))).length
  };

  const organizationStats = {
    total: organizationTasks.length,
    pending: organizationTasks.filter(t => !t.completed).length,
    completed: organizationTasks.filter(t => t.completed).length,
    overdue: organizationTasks.filter(t => !t.completed && (isOverdue(t.dueDate) || t.subtasks?.some(s => !s.completed && isOverdue(s.dueDate)))).length
  };

  // Expose the stats block belonging to the active workspace
  const stats = workspace === 'organization' ? organizationStats : personalStats;

  const value = {
    workspace,
    setWorkspace: handleSetWorkspace,
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
