import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './ProfileSetup.css';

export default function ProfileSetupForm() {
  const { user, completeProfileSetup } = useAuth();
  const navigate = useNavigate();
  const [workspaceType, setWorkspaceType] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!workspaceType) {
      setError('Please select a workspace type.');
      return;
    }

    setLoading(true);
    try {
      await completeProfileSetup(workspaceType, phoneNumber || null);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Profile setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await completeProfileSetup('personal', null);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-setup-page">
      <div className="profile-setup-card">
        <div className="profile-setup-header">
          <div className="profile-setup-logo">
            <span>🐸</span>
            <span className="profile-setup-logo-text">Eat The Frog</span>
          </div>
          <p className="profile-setup-welcome">Welcome aboard{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!</p>
          <h1 className="profile-setup-title">Set up your workspace</h1>
          <p className="profile-setup-subtitle">
            Just a quick step to personalize your experience. You can always change these later.
          </p>
        </div>

        {error && <div className="profile-setup-error">{error}</div>}

        <form className="profile-setup-form" onSubmit={handleSubmit}>
          {/* Workspace Type Selection */}
          <div className="workspace-type-group">
            <label className="workspace-type-label">Workspace Type</label>
            <div className="workspace-type-options">
              <button
                type="button"
                className={`workspace-type-option ${workspaceType === 'personal' ? 'selected' : ''}`}
                onClick={() => { setWorkspaceType('personal'); setError(''); }}
                id="workspace-personal"
              >
                <div className="workspace-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <span className="workspace-type-name">Personal</span>
                <span className="workspace-type-desc">For individual productivity</span>
              </button>

              <button
                type="button"
                className={`workspace-type-option ${workspaceType === 'organization' ? 'selected' : ''}`}
                onClick={() => { setWorkspaceType('organization'); setError(''); }}
                id="workspace-organization"
              >
                <div className="workspace-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <span className="workspace-type-name">Organization</span>
                <span className="workspace-type-desc">For teams and companies</span>
              </button>
            </div>
          </div>

          {/* Phone Number (Optional) */}
          <div className="form-group phone-group">
            <label className="form-label" htmlFor="profile-phone">
              Phone Number <span className="optional-badge">optional</span>
            </label>
            <input
              id="profile-phone"
              type="tel"
              className="form-input"
              placeholder="+1 (555) 000-0000"
              value={phoneNumber}
              onChange={(e) => { setPhoneNumber(e.target.value); setError(''); }}
              autoComplete="tel"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg profile-setup-submit"
            disabled={loading || !workspaceType}
            id="profile-setup-continue"
          >
            {loading ? 'Setting up...' : 'Continue to Dashboard'}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>

        <div className="profile-setup-skip">
          <button
            type="button"
            className="profile-setup-skip-btn"
            onClick={handleSkip}
            disabled={loading}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
