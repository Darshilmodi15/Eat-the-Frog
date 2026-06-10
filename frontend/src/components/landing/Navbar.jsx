import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { isAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="navbar-logo">🐸</span>
          <span className="navbar-brand-text">Eat The Frog</span>
        </Link>

        <div className={`navbar-links ${menuOpen ? 'navbar-links-open' : ''}`}>
          <a href="#features" className="navbar-link" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="#how-it-works" className="navbar-link" onClick={() => setMenuOpen(false)}>How It Works</a>
          <a href="#preview" className="navbar-link" onClick={() => setMenuOpen(false)}>Preview</a>
          
          <div className="navbar-auth">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn btn-primary" onClick={() => setMenuOpen(false)}>
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost navbar-login-btn" onClick={() => setMenuOpen(false)}>
                  Log In
                </Link>
                <Link to="/signup" className="btn btn-primary" onClick={() => setMenuOpen(false)}>
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>

        <button 
          className={`navbar-hamburger ${menuOpen ? 'navbar-hamburger-open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </nav>
  );
}
