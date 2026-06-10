import { useState, useEffect, useCallback } from 'react';
import './Toast.css';

export default function Toast({ message, type = 'success', duration = 3000, onClose }) {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  const close = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(close, duration);
    return () => clearTimeout(timer);
  }, [duration, close]);

  if (!visible) return null;

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  return (
    <div className={`toast toast-${type} ${exiting ? 'toast-exit' : ''}`}>
      <span className="toast-icon">{icons[type]}</span>
      <p className="toast-message">{message}</p>
      <button className="toast-close" onClick={close}>✕</button>
    </div>
  );
}

// Toast container for managing multiple toasts
export function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
