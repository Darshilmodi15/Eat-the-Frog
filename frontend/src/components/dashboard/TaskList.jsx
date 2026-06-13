import TaskCard from './TaskCard';
import EmptyState from '../common/EmptyState';
import LoadingSpinner from '../common/LoadingSpinner';
import { useTasks } from '../../context/TaskContext';

export default function TaskList({ onEdit, onDelete, onShowAddForm, selectedTaskIds, onSelectTask, isSelectionMode }) {
  const { tasks, loading, error, toggleComplete, filter, searchQuery } = useTasks();

  if (loading) {
    return <LoadingSpinner text="Loading tasks..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Something went wrong"
        message={error}
      />
    );
  }

  if (tasks.length === 0) {
    let emptyTitle = "No tasks yet";
    let emptyMessage = "Add your first task and start eating the frog. Tackle the hardest one first!";
    let emptyIcon = "🐸";
    let showAction = true;

    if (searchQuery) {
      emptyTitle = "No tasks found";
      emptyMessage = `No tasks match search "${searchQuery}"`;
      emptyIcon = "🔍";
      showAction = false;
    } else if (filter === 'pending') {
      emptyTitle = "No pending tasks.";
      emptyMessage = "All tasks completed! Great job.";
      emptyIcon = "⏳";
      showAction = false;
    } else if (filter === 'completed') {
      emptyTitle = "No completed tasks.";
      emptyMessage = "Complete some tasks to see them here!";
      emptyIcon = "✅";
      showAction = false;
    } else if (filter === 'overdue') {
      emptyTitle = "No overdue tasks.";
      emptyMessage = "You have no overdue tasks.";
      emptyIcon = "🎉";
      showAction = false;
    }

    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        message={emptyMessage}
        action={showAction ? { label: '+ Add your first task', onClick: onShowAddForm } : undefined}
      />
    );
  }

  return (
    <div className="task-list stagger-children">
      {tasks.map(task => (
        <TaskCard
          key={task._id}
          task={task}
          onToggle={toggleComplete}
          onEdit={onEdit}
          onDelete={onDelete}
          isSelected={selectedTaskIds?.includes(task._id)}
          onSelect={() => onSelectTask(task._id)}
          isSelectionMode={isSelectionMode}
        />
      ))}
    </div>
  );
}
