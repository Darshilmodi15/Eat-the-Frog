import { useState, useEffect } from 'react';
import { useTasks } from '../../context/TaskContext';
import { formatDateForInput, formatTimeForInput } from '../../utils/dateUtils';
import './EditTaskModal.css';

export default function EditTaskModal({ task, onClose, onSuccess }) {
  const { updateTask } = useTasks();
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    dueTime: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        dueDate: formatDateForInput(task.dueDate),
        dueTime: formatTimeForInput(task.dueDate)
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
      // Construct local date-time
      let localDueDate;
      if (form.dueTime) {
        localDueDate = new Date(`${form.dueDate}T${form.dueTime}`);
      } else {
        localDueDate = new Date(`${form.dueDate}T23:59:59.999`);
      }

      await updateTask(task._id, {
        title: form.title,
        description: form.description,
        priority: form.priority,
        dueDate: localDueDate.toISOString()
      });
      
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
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close modal">✕</button>
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
              <label className="form-label">Priority</label>
              <div className="priority-selector">
                <button
                  type="button"
                  className={`priority-btn low ${form.priority === 'low' ? 'active' : ''}`}
                  onClick={() => setForm(prev => ({ ...prev, priority: 'low' }))}
                >
                  Low
                </button>
                <button
                  type="button"
                  className={`priority-btn medium ${form.priority === 'medium' ? 'active' : ''}`}
                  onClick={() => setForm(prev => ({ ...prev, priority: 'medium' }))}
                >
                  Med
                </button>
                <button
                  type="button"
                  className={`priority-btn high ${form.priority === 'high' ? 'active' : ''}`}
                  onClick={() => setForm(prev => ({ ...prev, priority: 'high' }))}
                >
                  High
                </button>
              </div>
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
                min={getTodayDateString()}
                required
              />
            </div>

            <div className="form-group" style={{flex: 1}}>
              <label className="form-label" htmlFor="edit-time">Due Time</label>
              <input
                id="edit-time"
                type="time"
                name="dueTime"
                className="form-input"
                value={form.dueTime}
                onChange={handleChange}
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
