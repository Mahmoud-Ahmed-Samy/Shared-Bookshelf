import { useEffect, memo } from 'react';

const SHORTCUTS = [
  { keys: '/', description: 'Focus search bar' },
  { keys: 'Esc', description: 'Clear search / close modal' },
  { keys: '?', description: 'Open keyboard shortcuts' },
  { keys: 'Ctrl + Enter', description: 'Save book note' },
];

function KeyboardHelp({ onClose }) {
  useEffect(() => {
    const handler = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="nf-kbhelp-backdrop" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onClick={onClose}>
      <div className="nf-kbhelp-panel" onClick={(e) => e.stopPropagation()}>
        <div className="nf-kbhelp-header">
          <h2 className="nf-kbhelp-title">Keyboard shortcuts</h2>
          <button type="button" className="nf-kbhelp-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <ul className="nf-kbhelp-list" role="list">
          {SHORTCUTS.map(({ keys, description }) => (
            <li className="nf-kbhelp-row" key={keys}>
              <kbd className="nf-kbd">{keys}</kbd>
              <span className="nf-kbhelp-desc">{description}</span>
            </li>
          ))}
        </ul>
        <p className="nf-kbhelp-hint">Press <kbd className="nf-kbd">?</kbd> or <kbd className="nf-kbd">Esc</kbd> to close</p>
      </div>
    </div>
  );
}

export default memo(KeyboardHelp);
