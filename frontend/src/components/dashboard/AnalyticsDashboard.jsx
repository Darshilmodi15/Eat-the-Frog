import { useState, useEffect } from 'react';
import api from '../../services/api';
import './AnalyticsDashboard.css';

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('personal'); // 'personal' | 'organization'

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/tasks/analytics');
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch productivity analytics.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="analytics-loading-container">
        <div className="spinner"></div>
        <p>Analyzing your productivity data...</p>
      </div>
    );
  }

  if (error) {
    return <div className="analytics-error-container">{error}</div>;
  }

  if (!data) return null;

  const currentWorkspaceStats = activeWorkspaceTab === 'organization' ? data.organization : data.personal;

  return (
    <div className="analytics-dashboard animate-fade-in">
      {/* Motivational Feedback Header */}
      <div className="analytics-motivational-card">
        <div className="analytics-motivational-icon">🐸</div>
        <div className="analytics-motivational-content">
          <h3 className="analytics-motivational-title">Productivity Insights</h3>
          <p className="analytics-motivational-desc">{data.motivationalFeedback}</p>
        </div>
      </div>

      <div className="analytics-workspace-toggle-bar">
        <button
          className={`analytics-workspace-tab ${activeWorkspaceTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveWorkspaceTab('personal')}
          id="analytics-personal-tab"
        >
          👤 Personal Workspace
        </button>
        <button
          className={`analytics-workspace-tab ${activeWorkspaceTab === 'organization' ? 'active' : ''}`}
          onClick={() => setActiveWorkspaceTab('organization')}
          id="analytics-org-tab"
        >
          🏢 Organization Workspace
        </button>
      </div>

      {/* Core Metrics Grid */}
      <div className="analytics-metrics-grid">
        <div className="analytics-metric-card">
          <span className="metric-label">Total Tasks</span>
          <span className="metric-value">{currentWorkspaceStats.total}</span>
        </div>
        <div className="analytics-metric-card">
          <span className="metric-label">Completed</span>
          <span className="metric-value text-success">{currentWorkspaceStats.completed}</span>
        </div>
        <div className="analytics-metric-card">
          <span className="metric-label">Pending</span>
          <span className="metric-value text-warning">{currentWorkspaceStats.pending}</span>
        </div>
        <div className="analytics-metric-card">
          <span className="metric-label">Overdue</span>
          <span className={`metric-value ${currentWorkspaceStats.overdue > 0 ? 'text-danger' : ''}`}>
            {currentWorkspaceStats.overdue}
          </span>
        </div>
        <div className="analytics-metric-card completion-rate-card">
          <span className="metric-label">Completion Rate</span>
          <div className="completion-rate-circle-wrapper">
            <span className="metric-value">{currentWorkspaceStats.completionRate}%</span>
          </div>
          <div className="analytics-progress-bar-wrapper" style={{ marginTop: 'var(--space-2)' }}>
            <div
              className="analytics-progress-bar-fill bg-success"
              style={{ width: `${currentWorkspaceStats.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      <div className="analytics-row-section">
        {/* Streak and Insights Left Column */}
        <div className="analytics-col-left">
          {/* Streaks Panel */}
          <div className="analytics-streak-panel">
            <h4 className="analytics-panel-title">Productivity Streaks</h4>
            <div className="streak-stats-row">
              <div className="streak-stat-box">
                <span className="streak-stat-emoji">🔥</span>
                <div className="streak-stat-info">
                  <span className="streak-stat-label">Current Streak</span>
                  <span className="streak-stat-value">{data.streak.current} Day{data.streak.current !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="streak-stat-box">
                <span className="streak-stat-emoji">🏆</span>
                <div className="streak-stat-info">
                  <span className="streak-stat-label">Longest Streak</span>
                  <span className="streak-stat-value">{data.streak.longest} Day{data.streak.longest !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
            <div className="streak-explanation">
              Complete at least one task per day to keep your streak alive!
            </div>
          </div>

          {/* Insight Engine */}
          <div className="analytics-insights-panel">
            <h4 className="analytics-panel-title">Coach Insights</h4>
            {data.insights.length > 0 ? (
              <div className="insights-list">
                {data.insights.map((insight, idx) => (
                  <div key={idx} className="insight-item">
                    <span className="insight-icon">💡</span>
                    <span className="insight-text">{insight}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-insights">Complete tasks to begin generating productivity insights.</p>
            )}
          </div>
        </div>

        {/* Performance Trends Right Column */}
        <div className="analytics-col-right">
          {/* Weekly Performance List */}
          <div className="analytics-trends-panel">
            <h4 className="analytics-panel-title">Weekly Performance</h4>
            <div className="weekly-list">
              {data.weeklyPerformance.map((wk, idx) => (
                <div key={idx} className="weekly-row-item">
                  <div className="weekly-row-header">
                    <span className="weekly-row-label">{wk.weekLabel}</span>
                    <span className="weekly-row-stats">
                      {wk.completed}/{wk.created} Tasks ({wk.completionRate}%)
                    </span>
                  </div>
                  <div className="analytics-progress-bar-wrapper">
                    <div
                      className="analytics-progress-bar-fill"
                      style={{ width: `${wk.completionRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Trend List */}
          <div className="analytics-trends-panel">
            <h4 className="analytics-panel-title">Monthly Trends</h4>
            <div className="monthly-list">
              {data.monthlyPerformance.map((mo, idx) => (
                <div key={idx} className="monthly-row-item">
                  <div className="monthly-row-header">
                    <span className="monthly-row-label">{mo.monthLabel}</span>
                    <span className="monthly-row-stats">
                      {mo.completed} Completed / {mo.created} Created
                    </span>
                  </div>
                  <div className="monthly-trend-visual">
                    <span className="monthly-trend-bar-label">Completion:</span>
                    <div className="analytics-progress-bar-wrapper flex-grow-1" style={{ maxWidth: '120px' }}>
                      <div
                        className="analytics-progress-bar-fill bg-info"
                        style={{ width: `${mo.completionRate}%` }}
                      />
                    </div>
                    <span className="monthly-trend-percent">{mo.completionRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
