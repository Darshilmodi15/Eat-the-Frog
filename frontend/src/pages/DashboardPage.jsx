import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import StatsBar from '../components/dashboard/StatsBar';
import FilterBar from '../components/dashboard/FilterBar';
import TaskList from '../components/dashboard/TaskList';
import AddTaskForm from '../components/dashboard/AddTaskForm';
import EditTaskModal from '../components/dashboard/EditTaskModal';
import { ToastContainer } from '../components/common/Toast';
import { useTasks } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const { fetchTasks, filter, sortBy, searchQuery } = useTasks();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Re-fetch on mount and whenever filter/sort/search changes
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks, filter, sortBy, searchQuery]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <DashboardLayout>
      <div className="dashboard-header-section">
        <div>
          <h1 style={{ 
            fontFamily: 'var(--font-serif)', 
            fontSize: 'var(--text-2xl)', 
            fontWeight: 700, 
            marginBottom: '4px' 
          }}>
            {getGreeting()}, {user?.name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            Here's what's on your plate today. Eat the frog first!
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(prev => !prev)}>
          {showAddForm ? 'Cancel' : '+ Add Task'}
        </button>
      </div>

      <StatsBar />

      {showAddForm && (
        <AddTaskForm
          onClose={() => setShowAddForm(false)}
          onSuccess={(msg) => addToast(msg)}
        />
      )}

      <FilterBar />

      <TaskList
        onEdit={(task) => setEditingTask(task)}
        onShowAddForm={() => setShowAddForm(true)}
      />

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSuccess={(msg) => addToast(msg)}
        />
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </DashboardLayout>
  );
}
