import { useState, useEffect } from 'react';
import { useTasks } from '../../context/TaskContext';
import { formatDateForInput } from '../../utils/dateUtils';
import './EditTaskModal.css';

export default function EditTaskModal({ task, onClose, onSuccess }) {
  const { updateTask } = useTasks();
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        dueDate: formatDateForInput(task.dueDate)
      });
    }
  }, [task]);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }

    setLoading(true);
    try {
      await updateTask(task._id, form);
      onSuccess?.('Task updated successfully.');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update task.');
    } finally {
      setLoading(false);
    }
  };

  if (!task) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Edit Task</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        {error && <div className="auth-error" style={{marginBottom: '12px'}}>{error}</div>}

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-title">Title</label>
            <input
              id="edit-title"
              type="text"
              name="title"
              className="form-input"
              value={form.title}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-desc">Description</label>
            <textarea
              id="edit-desc"
              name="description"
              className="form-input"
              value={form.description}
              onChange={handleChange}
              rows={3}
              style={{resize: 'vertical', minHeight: '72px'}}
            />
          </div>

          <div className="modal-row">
            <div className="form-group" style={{flex: 1}}>
              <label className="form-label" htmlFor="edit-priority">Priority</label>
              <select
                id="edit-priority"
                name="priority"
                className="form-select"
                value={form.priority}
                onChange={handleChange}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="form-group" style={{flex: 1}}>
              <label className="form-label" htmlFor="edit-due">Due Date</label>
              <input
                id="edit-due"
                type="date"
                name="dueDate"
                className="form-input"
                value={form.dueDate}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
