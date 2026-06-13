import { useState } from 'react';
import { useTasks } from '../../context/TaskContext';
import './AddTaskForm.css';

export default function AddTaskForm({ onClose, onSuccess }) {
  const { createTask } = useTasks();
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
    if (!form.dueDate) {
      setError('Due date is required.');
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

      await createTask({
        title: form.title,
        description: form.description,
        priority: form.priority,
        dueDate: localDueDate.toISOString()
      });
      
      onSuccess?.('Task created successfully.');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-task-form-wrapper">
      <form className="add-task-form" onSubmit={handleSubmit}>
        <div className="add-task-form-header">
          <h3 className="add-task-form-title">New Task</h3>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close form">
            ✕
          </button>
        </div>

        {error && <div className="auth-error" style={{marginBottom: '12px'}}>{error}</div>}

        <div className="form-group">
          <label className="form-label" htmlFor="add-title">Title *</label>
          <input
            id="add-title"
            type="text"
            name="title"
            className="form-input"
            placeholder="What needs to be done?"
            value={form.title}
            onChange={handleChange}
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="add-desc">Description</label>
          <textarea
            id="add-desc"
            name="description"
            className="form-input add-task-textarea"
            placeholder="Add more details (optional)"
            value={form.description}
            onChange={handleChange}
            rows={3}
          />
        </div>

        <div className="add-task-row">
          <div className="form-group" style={{flex: 1}}>
            <label className="form-label" htmlFor="add-priority">Priority</label>
            <select
              id="add-priority"
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
            <label className="form-label" htmlFor="add-due">Due Date *</label>
            <input
              id="add-due"
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
            <label className="form-label" htmlFor="add-time">Due Time</label>
            <input
              id="add-time"
              type="time"
              name="dueTime"
              className="form-input"
              value={form.dueTime}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="add-task-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
}
