import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTasks } from '../../context/TaskContext';
import './Sidebar.css';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const { filter, setFilter, stats } = useTasks();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      navigate('/');
    }
  };

  const handleFilterClick = (f) => {
    setFilter(f);
    onClose?.();
  };

  const navItems = [
    { key: 'all', label: 'All Tasks', icon: '📋', count: stats.total },
    { key: 'pending', label: 'Pending', icon: '⏳', count: stats.pending },
    { key: 'completed', label: 'Completed', icon: '✅', count: stats.completed },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <Link to="/" className="sidebar-brand">
          <span className="sidebar-logo">🐸</span>
          <span className="sidebar-brand-text">Eat The Frog</span>
        </Link>
        <button className="sidebar-close btn btn-ghost" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className="sidebar-user">
        <div className="sidebar-avatar">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">{user?.name || 'User'}</span>
          <span className="sidebar-user-email">{user?.email || ''}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <span className="sidebar-nav-label">Tasks</span>
        {navItems.map(item => (
          <button
            key={item.key}
            className={`sidebar-nav-item ${filter === item.key ? 'sidebar-nav-active' : ''}`}
            onClick={() => handleFilterClick(item.key)}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            <span className="sidebar-nav-text">{item.label}</span>
            <span className="sidebar-nav-count">{item.count}</span>
          </button>
        ))}

        {stats.overdue > 0 && (
          <div className="sidebar-overdue">
            <span className="sidebar-nav-icon">🔴</span>
            <span className="sidebar-nav-text">Overdue</span>
            <span className="sidebar-nav-count sidebar-nav-count-danger">{stats.overdue}</span>
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-logout btn btn-ghost" onClick={handleLogout}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 14H3.33C2.97 14 2.63 13.86 2.37 13.63C2.12 13.39 2 13.08 2 12.67V3.33C2 2.92 2.12 2.61 2.37 2.37C2.63 2.14 2.97 2 3.33 2H6M11 11.33L14 8L11 4.67M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Log out
        </button>
      </div>
    </aside>
  );
}
