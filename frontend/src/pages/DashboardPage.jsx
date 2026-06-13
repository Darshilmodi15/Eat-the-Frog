import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import StatsBar from '../components/dashboard/StatsBar';
import FilterBar from '../components/dashboard/FilterBar';
import TaskList from '../components/dashboard/TaskList';
import AddTaskForm from '../components/dashboard/AddTaskForm';
import EditTaskModal from '../components/dashboard/EditTaskModal';
import ConfirmDeleteModal from '../components/dashboard/ConfirmDeleteModal';
import { ToastContainer } from '../components/common/Toast';
import { useTasks } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const { fetchTasks, filter, sortBy, searchQuery, deleteTask, deleteMultipleTasks } = useTasks();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Task Selection & Delete Confirmation states
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Clear selections when filter changes
  useEffect(() => {
    setSelectedTaskIds([]);
  }, [filter]);

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

  const handleSelectTask = (id) => {
    setSelectedTaskIds(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await deleteTask(taskToDelete._id);
      addToast('Task deleted successfully.');
      // Remove from selections if it was selected
      setSelectedTaskIds(prev => prev.filter(id => id !== taskToDelete._id));
    } catch (err) {
      addToast('Failed to delete task.', 'error');
    } finally {
      setTaskToDelete(null);
    }
  };

  const handleConfirmBulkDelete = async () => {
    try {
      await deleteMultipleTasks(selectedTaskIds);
      addToast(`${selectedTaskIds.length} tasks deleted successfully.`);
      setSelectedTaskIds([]);
    } catch (err) {
      addToast('Failed to delete selected tasks.', 'error');
    } finally {
      setShowBulkDeleteConfirm(false);
    }
  };

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
        onDelete={(task) => setTaskToDelete(task)}
        onShowAddForm={() => setShowAddForm(true)}
        selectedTaskIds={selectedTaskIds}
        onSelectTask={handleSelectTask}
      />

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSuccess={(msg) => addToast(msg)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!taskToDelete}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        taskTitle={taskToDelete?.title}
        onConfirm={handleConfirmDelete}
        onClose={() => setTaskToDelete(null)}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={showBulkDeleteConfirm}
        title="Delete Selected Tasks"
        message={`Are you sure you want to delete all ${selectedTaskIds.length} selected tasks? This action cannot be undone.`}
        onConfirm={handleConfirmBulkDelete}
        onClose={() => setShowBulkDeleteConfirm(false)}
        confirmLabel="Delete Selected"
      />

      {/* Floating Bulk Action Bar */}
      <div className={`bulk-action-bar ${selectedTaskIds.length > 0 ? 'visible' : ''}`}>
        <span className="bulk-action-text">{selectedTaskIds.length} tasks selected</span>
        <div className="bulk-action-buttons">
          <button type="button" className="btn btn-secondary" onClick={() => setSelectedTaskIds([])}>
            Deselect All
          </button>
          <button type="button" className="btn btn-danger bulk-action-btn-danger" onClick={() => setShowBulkDeleteConfirm(true)}>
            Delete Selected
          </button>
        </div>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </DashboardLayout>
  );
}
