import { useEffect } from 'react';

function BookFormModal({ isOpen, title, onClose, children }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="nf-modal-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="nf-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="nf-modal-panel">
        <button type="button" className="nf-modal-close" onClick={onClose} aria-label="Close form">✕</button>
        {children}
      </div>
    </div>
  );
}

export default BookFormModal;
