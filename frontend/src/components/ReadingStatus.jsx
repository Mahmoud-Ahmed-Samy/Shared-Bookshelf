import { memo } from 'react';

const LABELS = { want: 'Want to Read', reading: 'Reading', finished: 'Finished' };
const NEXT = { '': 'want', want: 'reading', reading: 'finished', finished: '' };
const ICONS = { '': '📖', want: '🔖', reading: '📖', finished: '✅' };

function ReadingStatus({ status = '', onChange }) {
  const next = NEXT[status] ?? '';
  const label = LABELS[status] ?? 'Set status';

  return (
    <button
      type="button"
      className={`nf-reading-status nf-reading-status--${status || 'none'}`}
      onClick={() => onChange(next)}
      aria-label={`Reading status: ${label}. Click to change.`}
      title="Cycle reading status"
    >
      <span aria-hidden="true">{ICONS[status] ?? '📖'}</span>
      {status ? LABELS[status] : 'Set status'}
    </button>
  );
}

export default memo(ReadingStatus);
