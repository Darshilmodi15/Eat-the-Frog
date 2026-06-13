import { isOverdue, getDueDateLabel } from '../../utils/dateUtils';
import './TaskCard.css';

export default function TaskCard({ task, onToggle, onEdit, onDelete, isSelected, onSelect }) {
  const overdue = !task.completed && isOverdue(task.dueDate);
  const dueDateLabel = getDueDateLabel(task.dueDate);

  return (
    <div className={`task-card ${task.completed ? 'task-completed' : ''} ${overdue ? 'task-overdue' : ''}`}>
      <button
        className={`task-card-select-btn ${isSelected ? 'selected' : ''}`}
        onClick={onSelect}
        aria-label={isSelected ? 'Deselect task' : 'Select task'}
        role="checkbox"
        aria-checked={isSelected}
      />

      <button
        className={`checkbox ${task.completed ? 'checked' : ''}`}
        onClick={() => onToggle(task._id, task.completed)}
        aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
      />

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

        {task.subtasks && task.subtasks.length > 0 && (
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
              {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} subtasks
            </span>
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
