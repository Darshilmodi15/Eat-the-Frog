import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import './SettingsModal.css';

export default function SettingsModal({ onClose }) {
  const { user, updatePreferences } = useAuth();
  const { theme, changeTheme } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const avatarOptions = ['🐸', '🦉', '🦊', '🦁', '🖋️', '📖', '☕', '💼', '🎯', '⏳'];

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }

    setLoading(true);
    try {
      await updatePreferences({
        name,
        phoneNumber: phoneNumber || null,
        avatar: avatar || null
      });
      setSuccess('Profile updated successfully.');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-modal-backdrop" onClick={onClose}>
      <div className="settings-modal-card animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h2 className="settings-modal-title">Settings</h2>
          <button className="settings-modal-close btn btn-ghost" onClick={onClose} aria-label="Close settings">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {error && <div className="settings-modal-error">{error}</div>}
        {success && <div className="settings-modal-success">{success}</div>}

        <form onSubmit={handleSave} className="settings-modal-form">
          <div className="settings-section">
            <h3 className="settings-section-title">Appearance</h3>
            <div className="theme-options-grid">
              <button
                type="button"
                className={`theme-option-card ${theme === 'light' ? 'active' : ''}`}
                onClick={() => changeTheme('light')}
                id="theme-light-btn"
              >
                <span className="theme-option-icon">☀</span>
                <span className="theme-option-label">Light</span>
              </button>

              <button
                type="button"
                className={`theme-option-card ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => changeTheme('dark')}
                id="theme-dark-btn"
              >
                <span className="theme-option-icon">🌙</span>
                <span className="theme-option-label">Dark</span>
              </button>

              <button
                type="button"
                className={`theme-option-card ${theme === 'system' ? 'active' : ''}`}
                onClick={() => changeTheme('system')}
                id="theme-system-btn"
              >
                <span className="theme-option-icon">💻</span>
                <span className="theme-option-label">System</span>
              </button>
            </div>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">Profile Info</h3>
            
            <div className="form-group">
              <label className="form-label" htmlFor="settings-name">Name</label>
              <input
                id="settings-name"
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                maxLength={60}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="settings-email">Email (Read-only)</label>
              <input
                id="settings-email"
                type="email"
                className="form-input disabled-input"
                value={user?.email || ''}
                disabled
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="settings-phone">Phone Number</label>
              <input
                id="settings-phone"
                type="tel"
                className="form-input"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">Choose Avatar</h3>
            <div className="avatar-options-grid">
              {avatarOptions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`avatar-option-btn ${avatar === emoji ? 'active' : ''}`}
                  onClick={() => setAvatar(emoji)}
                >
                  {emoji}
                </button>
              ))}
              <button
                type="button"
                className={`avatar-clear-btn ${!avatar ? 'active' : ''}`}
                onClick={() => setAvatar('')}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="settings-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} id="settings-save-btn">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
