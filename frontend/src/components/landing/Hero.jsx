import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Hero.css';

export default function Hero() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot"></span>
            Built for people who ship
          </div>

          <h1 className="hero-title">
            Tackle your hardest<br />
            task <span className="hero-title-accent">first.</span>
          </h1>

          <p className="hero-subtitle">
            A focused task manager built on one proven principle: do the most important 
            thing before anything else. No clutter, no distractions — just you and your work.
          </p>

          <div className="hero-actions">
            <Link to={isAuthenticated ? '/dashboard' : '/signup'} className="btn btn-primary btn-lg">
              {isAuthenticated ? 'Open Dashboard' : 'Start for free'}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <a href="#preview" className="btn btn-secondary btn-lg">
              See how it works
            </a>
          </div>

          <div className="hero-social-proof">
            <div className="hero-avatars">
              <div className="hero-avatar" style={{background: '#E8CDB5'}}>D</div>
              <div className="hero-avatar" style={{background: '#C5D5E8'}}>A</div>
              <div className="hero-avatar" style={{background: '#D5E8C5'}}>M</div>
              <div className="hero-avatar" style={{background: '#E8D5C5'}}>S</div>
            </div>
            <p className="hero-social-text">
              Join productive people who eat the frog daily
            </p>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-dashboard-preview">
            <div className="preview-header">
              <div className="preview-dots">
                <span style={{background: '#B23A3A'}}></span>
                <span style={{background: '#C58B00'}}></span>
                <span style={{background: '#2F7D32'}}></span>
              </div>
              <span className="preview-title">Dashboard — My Tasks</span>
            </div>
            <div className="preview-body">
              <div className="preview-stat-row">
                <div className="preview-stat">
                  <span className="preview-stat-num">12</span>
                  <span className="preview-stat-label">Total</span>
                </div>
                <div className="preview-stat">
                  <span className="preview-stat-num" style={{color: 'var(--color-warning)'}}>5</span>
                  <span className="preview-stat-label">Pending</span>
                </div>
                <div className="preview-stat">
                  <span className="preview-stat-num" style={{color: 'var(--color-success)'}}>7</span>
                  <span className="preview-stat-label">Done</span>
                </div>
              </div>
              <div className="preview-tasks">
                <div className="preview-task">
                  <div className="preview-task-check checked"></div>
                  <div className="preview-task-info">
                    <span className="preview-task-title completed-text">Finalize project proposal</span>
                    <span className="preview-task-meta">
                      <span className="badge badge-high" style={{fontSize: '9px', padding: '1px 6px'}}>High</span>
                      Jun 8
                    </span>
                  </div>
                </div>
                <div className="preview-task">
                  <div className="preview-task-check"></div>
                  <div className="preview-task-info">
                    <span className="preview-task-title">Review API documentation</span>
                    <span className="preview-task-meta">
                      <span className="badge badge-medium" style={{fontSize: '9px', padding: '1px 6px'}}>Med</span>
                      Jun 12
                    </span>
                  </div>
                </div>
                <div className="preview-task">
                  <div className="preview-task-check"></div>
                  <div className="preview-task-info">
                    <span className="preview-task-title">Deploy staging environment</span>
                    <span className="preview-task-meta">
                      <span className="badge badge-high" style={{fontSize: '9px', padding: '1px 6px'}}>High</span>
                      Jun 10
                    </span>
                  </div>
                </div>
                <div className="preview-task">
                  <div className="preview-task-check checked"></div>
                  <div className="preview-task-info">
                    <span className="preview-task-title completed-text">Set up CI/CD pipeline</span>
                    <span className="preview-task-meta">
                      <span className="badge badge-low" style={{fontSize: '9px', padding: '1px 6px'}}>Low</span>
                      Jun 7
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
