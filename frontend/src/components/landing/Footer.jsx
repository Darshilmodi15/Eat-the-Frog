import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Footer.css';

export default function Footer() {
  const { isAuthenticated } = useAuth();

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-cta">
          <h2 className="footer-cta-title">Ready to eat the frog?</h2>
          <p className="footer-cta-text">
            Stop procrastinating. Start with what matters most.
          </p>
          <Link to={isAuthenticated ? '/dashboard' : '/signup'} className="btn btn-primary btn-lg">
            {isAuthenticated ? 'Go to Dashboard' : 'Get started — it\'s free'}
          </Link>
        </div>

        <div className="footer-bottom">
          <div className="footer-brand">
            <span className="footer-logo">🐸</span>
            <span className="footer-brand-text">Eat The Frog</span>
          </div>
          <p className="footer-copy">
            © {new Date().getFullYear()} Eat The Frog. Built by Darshil Modi.
          </p>
          <div className="footer-links">
            <a href="https://github.com/Darshilmodi15/Task-Management-" target="_blank" rel="noopener noreferrer" className="footer-link">
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
