import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTasks } from '../../context/TaskContext';
import SettingsModal from './SettingsModal';
import './Sidebar.css';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const { filter, setFilter, stats, workspace, setWorkspace } = useTasks();
  const navigate = useNavigate();
  
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

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
    { key: 'overdue', label: 'Overdue', icon: '🔴', count: stats.overdue, isDanger: true },
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

      {/* Workspace Switcher */}
      <div className="workspace-switcher-container">
        <button
          className="workspace-switcher-btn"
          onClick={() => setShowWorkspaceDropdown(prev => !prev)}
          id="workspace-switcher"
        >
          <div className="workspace-switcher-info">
            <span className="workspace-switcher-label">Workspace</span>
            <span className="workspace-switcher-name">
              {workspace === 'organization' ? 'Organization' : 'Personal'}
            </span>
          </div>
          <svg className={`workspace-switcher-chevron ${showWorkspaceDropdown ? 'open' : ''}`} width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {showWorkspaceDropdown && (
          <div className="workspace-dropdown">
            <button
              className={`workspace-dropdown-item ${workspace === 'personal' ? 'active' : ''}`}
              onClick={() => {
                setWorkspace('personal');
                setShowWorkspaceDropdown(false);
              }}
              id="switcher-personal"
            >
              <span className="workspace-dropdown-icon">👤</span>
              <div className="workspace-dropdown-text">
                <span className="workspace-dropdown-title">Personal Workspace</span>
                <span className="workspace-dropdown-desc">Individual space</span>
              </div>
            </button>
            <button
              className={`workspace-dropdown-item ${workspace === 'organization' ? 'active' : ''}`}
              onClick={() => {
                setWorkspace('organization');
                setShowWorkspaceDropdown(false);
              }}
              id="switcher-organization"
            >
              <span className="workspace-dropdown-icon">🏢</span>
              <div className="workspace-dropdown-text">
                <span className="workspace-dropdown-title">Organization Workspace</span>
                <span className="workspace-dropdown-desc">Work and teams</span>
              </div>
            </button>
          </div>
        )}
      </div>

      <div className="sidebar-user">
        <div className="sidebar-avatar">
          {user?.avatar || user?.name?.[0]?.toUpperCase() || 'U'}
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
            <span className={`sidebar-nav-count ${item.isDanger && filter !== item.key ? 'sidebar-nav-count-danger' : ''}`}>
              {item.count}
            </span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button 
          className="sidebar-settings btn btn-ghost" 
          onClick={() => {
            setShowSettingsModal(true);
            onClose?.();
          }}
          id="sidebar-settings-btn"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Settings
        </button>
        
        <button className="sidebar-logout btn btn-ghost" onClick={handleLogout}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 14H3.33C2.97 14 2.63 13.86 2.37 13.63C2.12 13.39 2 13.08 2 12.67V3.33C2 2.92 2.12 2.61 2.37 2.37C2.63 2.14 2.97 2 3.33 2H6M11 11.33L14 8L11 4.67M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Log out
        </button>
      </div>

      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
    </aside>
  );
}
