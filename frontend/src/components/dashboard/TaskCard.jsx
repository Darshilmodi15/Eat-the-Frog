import { useState } from 'react';
import { isOverdue, getDueDateLabel } from '../../utils/dateUtils';
import { useTasks } from '../../context/TaskContext';
import './TaskCard.css';

export default function TaskCard({ task, onToggle, onEdit, onDelete, isSelected, onSelect, isSelectionMode, isDraggable, dragEvents }) {
  const { updateTask } = useTasks();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState('');

  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const overdue = !task.completed && isOverdue(task.dueDate);
  const dueDateLabel = getDueDateLabel(task.dueDate);

  const handleToggleParent = async () => {
    if (task.subtasks && task.subtasks.length > 0) {
      const allCompleted = task.subtasks.every(s => s.completed);
      // Toggle all subtasks to the opposite of allCompleted
      const updatedSubtasks = task.subtasks.map(s => {
        const subDoc = s.toObject ? s.toObject() : s;
        return { ...subDoc, completed: !allCompleted };
      });
      await updateTask(task._id, { subtasks: updatedSubtasks });
    } else {
      await onToggle(task._id, task.completed);
    }
  };

  const handleToggleSubtask = async (subtaskIndex) => {
    const updatedSubtasks = task.subtasks.map((s, idx) => {
      const subDoc = s.toObject ? s.toObject() : s;
      if (idx === subtaskIndex) {
        return { ...subDoc, completed: !subDoc.completed };
      }
      return subDoc;
    });
    await updateTask(task._id, { subtasks: updatedSubtasks });
  };

  const handleDeleteSubtask = async (subtaskIndex) => {
    const updatedSubtasks = task.subtasks.filter((_, idx) => idx !== subtaskIndex).map(s => {
      return s.toObject ? s.toObject() : s;
    });
    await updateTask(task._id, { subtasks: updatedSubtasks });
  };

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    const newSubtask = {
      title: newSubtaskTitle.trim(),
      completed: false,
      dueDate: newSubtaskDueDate ? new Date(newSubtaskDueDate).toISOString() : null
    };

    const updatedSubtasks = [...(task.subtasks || []).map(s => s.toObject ? s.toObject() : s), newSubtask];
    await updateTask(task._id, { subtasks: updatedSubtasks });
    setNewSubtaskTitle('');
    setNewSubtaskDueDate('');
  };

  return (
    <div 
      className={`task-card ${task.completed ? 'task-completed' : ''} ${overdue ? 'task-overdue' : ''}`}
      draggable={isDraggable}
      {...dragEvents}
    >
      {isDraggable && (
        <div className="task-card-grip" title="Drag to reorder">
          ⋮⋮
        </div>
      )}
      <button
        className={`task-expand-btn ${isExpanded ? 'expanded' : ''}`}
        onClick={() => setIsExpanded(prev => !prev)}
        aria-label={isExpanded ? 'Collapse steps' : 'Expand steps'}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {isSelectionMode ? (
        <button
          className={`task-card-select-btn ${isSelected ? 'selected' : ''}`}
          onClick={onSelect}
          aria-label={isSelected ? 'Deselect task' : 'Select task'}
          role="checkbox"
          aria-checked={isSelected}
        />
      ) : (
        <button
          className={`checkbox ${task.completed ? 'checked' : ''}`}
          onClick={handleToggleParent}
          aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
        />
      )}

      <div className="task-card-body">
        <div className="task-card-top">
          <h3 className={`task-card-title ${task.completed ? 'task-title-done' : ''}`}>
            {task.title}
          </h3>
          <div className="task-card-actions">
            <button className="btn btn-ghost btn-icon task-action-btn" onClick={() => onEdit(task)} aria-label="Edit task">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M10.5 1.75l1.75 1.75L4.5 11.25H2.75V9.5L10.5 1.75z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className="btn btn-ghost btn-icon task-action-btn task-delete-btn" onClick={() => onDelete(task)} aria-label="Delete task">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 3.5h10M5.25 3.5V2.25h3.5V3.5M5.75 6v4M8.25 6v4M3.5 3.5l.5 8h6l.5-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {task.description && (
          <p className="task-card-desc">{task.description}</p>
        )}

        {/* Progress Bar */}
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="task-progress-container">
            <div className="task-progress-bar-wrapper">
              <div 
                className="task-progress-bar-fill" 
                style={{ width: `${task.progress || 0}%` }}
              />
            </div>
            <span className="task-progress-text">
              {task.progress || 0}% Complete ({task.subtasks.filter(s => s.completed).length}/{task.subtasks.length})
            </span>
          </div>
        )}

        {/* Collapsed steps summary */}
        {task.subtasks && task.subtasks.length > 0 && !isExpanded && (
          <div className="task-card-subtasks-summary" style={{ 
            fontSize: 'var(--text-xs)', 
            color: 'var(--color-text-tertiary)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-1)',
            marginTop: 'var(--space-2)'
          }}>
            <span>📋</span>
            <span>
              {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} steps complete
            </span>
          </div>
        )}

        {/* Expanded subtask list */}
        {isExpanded && (
          <div className="task-subtasks-section animate-fade-in">
            {task.subtasks && task.subtasks.length > 0 && (
              <div className="task-subtasks-list">
                {task.subtasks.map((subtask, idx) => {
                  const subOverdue = !subtask.completed && isOverdue(subtask.dueDate);
                  return (
                    <div key={subtask._id || idx} className="task-subsubtask-item">
                      <button
                        type="button"
                        className={`checkbox checkbox-sm ${subtask.completed ? 'checked' : ''}`}
                        onClick={() => handleToggleSubtask(idx)}
                        aria-label={subtask.completed ? 'Mark step incomplete' : 'Mark step complete'}
                      />
                      <span className={`task-subtask-title ${subtask.completed ? 'completed' : ''}`}>
                        {subtask.title}
                      </span>
                      {subtask.dueDate && (
                        <span className={`task-subtask-due ${subOverdue ? 'overdue' : ''}`}>
                          {getDueDateLabel(subtask.dueDate)}
                        </span>
                      )}
                      <button
                        type="button"
                        className="subtask-item-delete-btn"
                        onClick={() => handleDeleteSubtask(idx)}
                        aria-label="Delete step"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <form onSubmit={handleAddSubtask} className="task-subtask-add-form">
              <input
                type="text"
                className="form-input form-input-sm subtask-input"
                placeholder="Add a step..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                required
              />
              <input
                type="date"
                className="form-input form-input-sm subtask-date-input"
                value={newSubtaskDueDate}
                onChange={(e) => setNewSubtaskDueDate(e.target.value)}
                min={getTodayDateString()}
                aria-label="Step due date"
              />
              <button type="submit" className="btn btn-secondary btn-sm">
                Add
              </button>
            </form>
          </div>
        )}

        <div className="task-card-meta">
          <span className={`badge badge-${task.priority}`}>{task.priority}</span>
          <span className={`task-card-due ${overdue ? 'task-due-overdue' : ''}`}>
            {overdue && '⚠ '}{dueDateLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
