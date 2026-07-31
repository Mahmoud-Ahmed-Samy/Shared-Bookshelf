import { memo, useState, useRef, useEffect } from 'react';

function BookNote({ note = '', onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const handleSave = () => {
    onChange(draft.trim());
    setEditing(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setDraft(note);
      setEditing(false);
    }
    if (event.key === 'Enter' && event.ctrlKey) handleSave();
  };

  if (!editing) {
    return (
      <div className="nf-book-note">
        {note ? (
          <p className="nf-book-note-text" onClick={() => { setDraft(note); setEditing(true); }} title="Click to edit">
            <span className="nf-book-note-icon" aria-hidden="true">📝</span> {note}
          </p>
        ) : (
          <button type="button" className="nf-book-note-add" onClick={() => { setDraft(''); setEditing(true); }}>
            + Add note
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="nf-book-note nf-book-note--editing">
      <textarea
        ref={textareaRef}
        className="nf-book-note-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Your personal note… (Ctrl+Enter to save)"
        rows={3}
        maxLength={500}
      />
      <div className="nf-book-note-actions">
        <button type="button" className="nf-btn-edit" onClick={handleSave}>Save</button>
        <button type="button" className="nf-btn-secondary" onClick={() => { setDraft(note); setEditing(false); }}>Cancel</button>
      </div>
    </div>
  );
}

export default memo(BookNote);
