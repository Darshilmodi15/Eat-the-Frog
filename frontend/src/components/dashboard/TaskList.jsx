import TaskCard from './TaskCard';
import EmptyState from '../common/EmptyState';
import LoadingSpinner from '../common/LoadingSpinner';
import { useTasks } from '../../context/TaskContext';

export default function TaskList({ onEdit, onShowAddForm }) {
  const { tasks, loading, error, toggleComplete, deleteTask } = useTasks();

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
    return (
      <EmptyState
        icon="🐸"
        title="No tasks yet"
        message="Add your first task and start eating the frog. Tackle the hardest one first!"
        action={{ label: '+ Add your first task', onClick: onShowAddForm }}
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
          onDelete={deleteTask}
        />
      ))}
    </div>
  );
}
