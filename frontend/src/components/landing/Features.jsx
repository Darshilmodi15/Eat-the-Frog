import './Features.css';

const features = [
  {
    icon: '🐸',
    title: 'Eat The Frog',
    description: 'Prioritize your hardest, most impactful tasks. Tackle the big one first and watch everything else fall into place.'
  },
  {
    icon: '🔒',
    title: 'Your Space, Your Tasks',
    description: 'Private accounts with secure login. Your tasks are yours alone — organized, protected, and always accessible.'
  },
  {
    icon: '📊',
    title: 'Smart Filters & Sorting',
    description: 'Slice your task list by status, priority, or due date. Find exactly what needs your attention in seconds.'
  },
  {
    icon: '📧',
    title: 'Overdue Reminders',
    description: 'Never let a deadline slip. Automatic email notifications remind you when tasks need immediate attention.'
  },
  {
    icon: '📱',
    title: 'Works Everywhere',
    description: 'Desktop, tablet, or phone — your dashboard adapts perfectly. Install it as an app on your home screen.'
  },
  {
    icon: '⚡',
    title: 'Built to Be Fast',
    description: 'No bloat, no unnecessary features. Just a clean, fast tool that loads instantly and stays out of your way.'
  }
];

export default function Features() {
  return (
    <section className="features" id="features">
      <div className="features-inner">
        <div className="features-header">
          <span className="features-label">Features</span>
          <h2 className="features-title">Everything you need,<br />nothing you don't.</h2>
          <p className="features-subtitle">
            Built around the philosophy that focus beats complexity. Every feature exists to help you get things done.
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature, i) => (
            <div className="feature-card animate-fade-in-up" key={i} style={{ animationDelay: `${i * 100}ms` }}>
              <span className="feature-icon">{feature.icon}</span>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
