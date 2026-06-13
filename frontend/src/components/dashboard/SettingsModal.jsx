import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import './SettingsModal.css';

export default function SettingsModal({ onClose }) {
  const { user, updatePreferences, uploadAvatar, deleteAccount, logout } = useAuth();
  const { theme, changeTheme } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'appearance' | 'workspace' | 'notifications' | 'account'
  const [name, setName] = useState(user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [defaultWorkspace, setDefaultWorkspace] = useState(user?.defaultWorkspace || 'last_active');
  const [notifications, setNotifications] = useState({
    emailReminders: user?.notificationPreferences?.emailReminders || false,
    overdueAlerts: user?.notificationPreferences?.overdueAlerts || false,
    dailySummary: user?.notificationPreferences?.dailySummary || false,
    weeklyReview: user?.notificationPreferences?.weeklyReview || false
  });

  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const avatarOptions = ['🐸', '🦉', '🦊', '🦁', '🖋️', '📖', '☕', '💼', '🎯', '⏳'];

  const handleProfileSave = async (e) => {
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
        phoneNumber: phoneNumber || null
      });
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    setLoading(true);
    try {
      await updatePreferences({
        defaultWorkspace,
        notificationPreferences: notifications
      });
      setSuccess('Preferences updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update preferences.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPG, PNG and WEBP files are allowed.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('File size cannot exceed 2MB.');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const data = await uploadAvatar(formData);
      setAvatar(data.user.avatar);
      setSuccess('Profile picture updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload profile picture.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const data = await updatePreferences({ avatar: null });
      setAvatar('');
      setSuccess('Profile picture removed.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove profile picture.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEmojiAvatar = async (emoji) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const data = await updatePreferences({ avatar: emoji });
      setAvatar(emoji);
      setSuccess('Avatar emoji updated.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update avatar.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutClick = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      onClose();
      navigate('/');
    }
  };

  const handleDeleteAccountClick = async (e) => {
    e.preventDefault();
    if (deleteConfirmText !== 'DELETE') return;

    setLoading(true);
    setError('');
    try {
      await deleteAccount();
      onClose();
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete account.');
    } finally {
      setLoading(false);
    }
  };

  const isImageAvatar = avatar && (avatar.startsWith('/') || avatar.startsWith('http') || avatar.startsWith('data:'));

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <form onSubmit={handleProfileSave} className="settings-tab-form">
            <div className="settings-section">
              <h3 className="settings-section-title">Profile Picture</h3>
              
              <div className="settings-avatar-management">
                <div className="settings-avatar-preview">
                  {isImageAvatar ? (
                    <img src={avatar} alt="Avatar Preview" className="settings-avatar-preview-img" />
                  ) : (
                    avatar || name[0]?.toUpperCase() || 'U'
                  )}
                </div>
                <div className="settings-avatar-actions">
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleFileUpload}
                    id="avatar-file-input"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => fileInputRef.current.click()}
                    disabled={loading}
                    id="upload-avatar-btn"
                  >
                    Upload Photo
                  </button>
                  {avatar && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm settings-remove-avatar-btn"
                      onClick={handleRemoveAvatar}
                      disabled={loading}
                      id="remove-avatar-btn"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="settings-avatar-emojis">
                <span className="settings-avatar-subtitle">Or choose an emoji:</span>
                <div className="avatar-options-grid">
                  {avatarOptions.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`avatar-option-btn ${avatar === emoji ? 'active' : ''}`}
                      onClick={() => handleSelectEmojiAvatar(emoji)}
                      disabled={loading}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="settings-section">
              <h3 className="settings-section-title">Personal Details</h3>
              <div className="form-group">
                <label className="form-label" htmlFor="settings-name">Full Name</label>
                <input
                  id="settings-name"
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
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
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Auth Provider</label>
                <div className="auth-provider-badge">
                  {user?.authProvider === 'google' ? 'Google OAuth' : 'Email & Password'}
                </div>
              </div>
            </div>

            <div className="settings-tab-actions">
              <button type="submit" className="btn btn-primary" disabled={loading} id="settings-save-profile-btn">
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        );

      case 'appearance':
        return (
          <div className="settings-tab-content">
            <div className="settings-section">
              <h3 className="settings-section-title">Theme</h3>
              <p className="settings-section-desc">Select how Eat The Frog looks on your device.</p>
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
          </div>
        );

      case 'workspace':
        return (
          <form onSubmit={handlePreferencesSave} className="settings-tab-form">
            <div className="settings-section">
              <h3 className="settings-section-title">Workspace Settings</h3>
              <div className="form-group">
                <label className="form-label">Current Active Workspace</label>
                <div className="current-workspace-badge">
                  {user?.lastWorkspace === 'organization' ? '🏢 Organization Workspace' : '👤 Personal Workspace'}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="default-workspace-select">Default Workspace on Login</label>
                <select
                  id="default-workspace-select"
                  className="form-select"
                  value={defaultWorkspace}
                  onChange={(e) => setDefaultWorkspace(e.target.value)}
                >
                  <option value="last_active">Last Active Workspace</option>
                  <option value="personal">Personal Workspace</option>
                  <option value="organization">Organization Workspace</option>
                </select>
                <span className="form-group-helper">Choose which workspace loads automatically when you log in.</span>
              </div>
            </div>

            <div className="settings-tab-actions">
              <button type="submit" className="btn btn-primary" disabled={loading} id="settings-save-workspace-btn">
                {loading ? 'Saving...' : 'Save Workspace Preference'}
              </button>
            </div>
          </form>
        );

      case 'notifications':
        return (
          <form onSubmit={handlePreferencesSave} className="settings-tab-form">
            <div className="settings-section">
              <h3 className="settings-section-title">Notification Preferences</h3>
              <p className="settings-section-desc">Choose which reminders you would like to receive. (Reminders can be configured but are non-sending in V1).</p>
              
              <div className="notification-preferences-list">
                <label className="notification-preference-item">
                  <input
                    type="checkbox"
                    checked={notifications.emailReminders}
                    onChange={() => handleNotificationChange('emailReminders')}
                    className="form-checkbox"
                  />
                  <div className="notification-preference-text">
                    <span className="notification-preference-title">Email Reminders</span>
                    <span className="notification-preference-desc">Receive email alerts for scheduled tasks.</span>
                  </div>
                </label>

                <label className="notification-preference-item">
                  <input
                    type="checkbox"
                    checked={notifications.overdueAlerts}
                    onChange={() => handleNotificationChange('overdueAlerts')}
                    className="form-checkbox"
                  />
                  <div className="notification-preference-text">
                    <span className="notification-preference-title">Overdue Alerts</span>
                    <span className="notification-preference-desc">Get notified immediately when tasks miss their deadlines.</span>
                  </div>
                </label>

                <label className="notification-preference-item">
                  <input
                    type="checkbox"
                    checked={notifications.dailySummary}
                    onChange={() => handleNotificationChange('dailySummary')}
                    className="form-checkbox"
                  />
                  <div className="notification-preference-text">
                    <span className="notification-preference-title">Daily Summary</span>
                    <span className="notification-preference-desc">A morning digest of your top priorities for the day.</span>
                  </div>
                </label>

                <label className="notification-preference-item">
                  <input
                    type="checkbox"
                    checked={notifications.weeklyReview}
                    onChange={() => handleNotificationChange('weeklyReview')}
                    className="form-checkbox"
                  />
                  <div className="notification-preference-text">
                    <span className="notification-preference-title">Weekly Review</span>
                    <span className="notification-preference-desc">A Sunday digest summarizing completion metrics and streaks.</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="settings-tab-actions">
              <button type="submit" className="btn btn-primary" disabled={loading} id="settings-save-notifications-btn">
                {loading ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        );

      case 'account':
        return (
          <div className="settings-tab-content">
            <div className="settings-section">
              <h3 className="settings-section-title text-danger">Account Controls</h3>
              <p className="settings-section-desc">Manage session access or permanently remove your profile data.</p>
              
              <div className="settings-account-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-logout"
                  onClick={handleLogoutClick}
                  id="settings-logout-btn"
                >
                  Logout
                </button>
                
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    className="btn btn-danger btn-delete-account-trigger"
                    onClick={() => setShowDeleteConfirm(true)}
                    id="settings-delete-account-trigger"
                  >
                    Delete Account
                  </button>
                ) : (
                  <div className="settings-delete-account-box animate-fade-in">
                    <h4 className="delete-box-title">Delete Account?</h4>
                    <p className="delete-box-desc">
                      This action is permanent and cannot be undone. All your tasks, subtasks, settings, profile uploads, and workspace configurations will be permanently destroyed.
                    </p>
                    <div className="form-group">
                      <label className="form-label" htmlFor="delete-confirm-input">
                        Type <strong>DELETE</strong> to continue:
                      </label>
                      <input
                        id="delete-confirm-input"
                        type="text"
                        className="form-input delete-confirm-input"
                        placeholder="DELETE"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                    <div className="delete-box-buttons">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText('');
                        }}
                        disabled={loading}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        disabled={deleteConfirmText !== 'DELETE' || loading}
                        onClick={handleDeleteAccountClick}
                        id="settings-delete-account-btn"
                      >
                        {loading ? 'Deleting...' : 'Delete Account'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const handleNotificationChange = (key) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
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

        <div className="settings-modal-body">
          <div className="settings-modal-sidebar">
            <button
              type="button"
              className={`settings-sidebar-tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => { setActiveTab('profile'); setError(''); setSuccess(''); }}
              id="tab-profile"
            >
              <span className="settings-tab-icon">👤</span>
              <span className="settings-tab-label">Profile</span>
            </button>
            <button
              type="button"
              className={`settings-sidebar-tab ${activeTab === 'appearance' ? 'active' : ''}`}
              onClick={() => { setActiveTab('appearance'); setError(''); setSuccess(''); }}
              id="tab-appearance"
            >
              <span className="settings-tab-icon">☀</span>
              <span className="settings-tab-label">Appearance</span>
            </button>
            <button
              type="button"
              className={`settings-sidebar-tab ${activeTab === 'workspace' ? 'active' : ''}`}
              onClick={() => { setActiveTab('workspace'); setError(''); setSuccess(''); }}
              id="tab-workspace"
            >
              <span className="settings-tab-icon">🏢</span>
              <span className="settings-tab-label">Workspace</span>
            </button>
            <button
              type="button"
              className={`settings-sidebar-tab ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => { setActiveTab('notifications'); setError(''); setSuccess(''); }}
              id="tab-notifications"
            >
              <span className="settings-tab-icon">🔔</span>
              <span className="settings-tab-label">Notifications</span>
            </button>
            <button
              type="button"
              className={`settings-sidebar-tab ${activeTab === 'account' ? 'active' : ''}`}
              onClick={() => { setActiveTab('account'); setError(''); setSuccess(''); setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
              id="tab-account"
            >
              <span className="settings-tab-icon">⚙</span>
              <span className="settings-tab-label">Account</span>
            </button>
          </div>
          <div className="settings-modal-content-area">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
