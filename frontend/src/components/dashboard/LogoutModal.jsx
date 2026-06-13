import './LogoutModal.css';

export default function LogoutModal({ isOpen, onConfirm, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content logout-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Log Out</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close modal">✕</button>
        </div>
        <div className="modal-body logout-modal-body">
          <p>Are you sure you want to log out of Eat The Frog?</p>
        </div>
        <div className="modal-actions logout-modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
