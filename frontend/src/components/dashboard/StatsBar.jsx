import { useTasks } from '../../context/TaskContext';
import './StatsBar.css';

export default function StatsBar() {
  const { stats } = useTasks();

  const items = [
    { label: 'Total Tasks', value: stats.total, icon: '📋', className: '' },
    { label: 'Pending', value: stats.pending, icon: '⏳', className: 'stat-warning' },
    { label: 'Completed', value: stats.completed, icon: '✅', className: 'stat-success' },
    { label: 'Overdue', value: stats.overdue, icon: '🔴', className: 'stat-danger' }
  ];

  return (
    <div className="stats-bar">
      {items.map((item, i) => (
        <div className={`stat-card ${item.className}`} key={i}>
          <div className="stat-icon">{item.icon}</div>
          <div className="stat-info">
            <span className="stat-value">{item.value}</span>
            <span className="stat-label">{item.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
