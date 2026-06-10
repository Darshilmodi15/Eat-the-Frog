import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '24px',
      textAlign: 'center',
      background: 'var(--color-bg)'
    }}>
      <span style={{ fontSize: '64px', marginBottom: '16px' }}>🐸</span>
      <h1 style={{ 
        fontFamily: 'var(--font-serif)', 
        fontSize: 'var(--text-4xl)', 
        fontWeight: 700,
        marginBottom: '8px'
      }}>
        404
      </h1>
      <p style={{ 
        color: 'var(--color-text-secondary)', 
        marginBottom: '24px',
        fontSize: 'var(--text-lg)'
      }}>
        This page doesn't exist. The frog has hopped away.
      </p>
      <Link to="/" className="btn btn-primary">
        Go back home
      </Link>
    </div>
  );
}
