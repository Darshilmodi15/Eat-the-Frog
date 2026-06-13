import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Hero.css';

export default function Hero() {
  const { isAuthenticated } = useAuth();

  // ── Interactive Demo Dashboard State ──
  const [demoTasks, setDemoTasks] = useState([
    { id: 1, title: 'Finalize project proposal', priority: 'high', label: 'High', date: 'Jun 8', completed: true },
    { id: 2, title: 'Review API documentation', priority: 'medium', label: 'Med', date: 'Jun 12', completed: false },
    { id: 3, title: 'Deploy staging environment', priority: 'high', label: 'High', date: 'Jun 10', completed: false },
    { id: 4, title: 'Set up CI/CD pipeline', priority: 'low', label: 'Low', date: 'Jun 7', completed: true }
  ]);

  const [pendingCount, setPendingCount] = useState(5);
  const [doneCount, setDoneCount] = useState(7);

  const toggleDemoTask = (id) => {
    setDemoTasks(prev => prev.map(task => {
      if (task.id === id) {
        const nextCompleted = !task.completed;
        if (nextCompleted) {
          setPendingCount(p => p - 1);
          setDoneCount(d => d + 1);
        } else {
          setPendingCount(p => p + 1);
          setDoneCount(d => d - 1);
        }
        return { ...task, completed: nextCompleted };
      }
      return task;
    }));
  };

  // ── Hover Tilt Effect State & Handlers ──
  const cardRef = useRef(null);
  const [tiltStyle, setTiltStyle] = useState({
    transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
    transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)'
  });

  const handleMouseMove = (e) => {
    if (window.innerWidth <= 1024) return;
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Subtle maximum tilt of 6 degrees for standard premium feel
    const rotateX = ((centerY - y) / centerY) * 6;
    const rotateY = ((x - centerX) / centerX) * 6;

    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
      transition: 'transform 0.1s cubic-bezier(0.25, 1, 0.5, 1)'
    });
  };

  const handleMouseLeave = () => {
    if (window.innerWidth <= 1024) return;
    setTiltStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)'
    });
  };

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
              <div className="hero-avatar avatar-1">D</div>
              <div className="hero-avatar avatar-2">A</div>
              <div className="hero-avatar avatar-3">M</div>
              <div className="hero-avatar avatar-4">S</div>
            </div>
            <p className="hero-social-text">
              Join productive people who eat the frog daily
            </p>
          </div>
        </div>

        <div className="hero-visual">
          <div 
            className="hero-dashboard-preview"
            ref={cardRef}
            style={tiltStyle}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
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
                  <span className="preview-stat-num">{pendingCount + doneCount}</span>
                  <span className="preview-stat-label">Total</span>
                </div>
                <div className="preview-stat">
                  <span className="preview-stat-num" style={{color: 'var(--color-warning)'}}>{pendingCount}</span>
                  <span className="preview-stat-label">Pending</span>
                </div>
                <div className="preview-stat">
                  <span className="preview-stat-num" style={{color: 'var(--color-success)'}}>{doneCount}</span>
                  <span className="preview-stat-label">Done</span>
                </div>
              </div>
              <div className="preview-tasks">
                {demoTasks.map(task => (
                  <div className={`preview-task ${task.completed ? 'completed' : ''}`} key={task.id}>
                    <button
                      type="button"
                      className={`preview-task-check ${task.completed ? 'checked' : ''}`}
                      onClick={() => toggleDemoTask(task.id)}
                      aria-checked={task.completed}
                      aria-label={`Toggle task: ${task.title}`}
                      role="checkbox"
                    />
                    <div className="preview-task-info">
                      <span className={`preview-task-title ${task.completed ? 'completed-text' : ''}`}>
                        {task.title}
                      </span>
                      <span className="preview-task-meta">
                        <span className={`badge badge-${task.priority}`} style={{fontSize: '9px', padding: '1px 6px'}}>
                          {task.label}
                        </span>
                        {task.date}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
