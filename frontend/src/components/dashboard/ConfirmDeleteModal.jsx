import './ConfirmDeleteModal.css';

export default function ConfirmDeleteModal({ isOpen, title, message, taskTitle, onConfirm, onClose, confirmLabel = 'Delete' }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close modal">✕</button>
        </div>
        <div className="modal-body" style={{ padding: 'var(--space-5)' }}>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: taskTitle ? 'var(--space-3)' : '0' }}>
            {message}
          </p>
          {taskTitle && (
            <p style={{ fontWeight: 600, fontSize: 'var(--text-md)', color: 'var(--color-text-primary)' }}>
              "{taskTitle}"
            </p>
          )}
        </div>
        <div className="modal-actions" style={{ 
          padding: 'var(--space-4) var(--space-5)', 
          background: 'var(--color-bg-alt)', 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: 'var(--space-3)' 
        }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
