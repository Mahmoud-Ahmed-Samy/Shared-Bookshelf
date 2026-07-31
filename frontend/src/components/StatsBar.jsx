import { memo, useMemo } from 'react';

function StatsBar({ books, currentUserUsername, isLoggedIn }) {
  const stats = useMemo(() => {
    const total = books.length;
    const normalizedUser = (currentUserUsername || '').toLowerCase();
    const mine = normalizedUser
      ? books.filter((book) => (book.ownerUsername || '').toLowerCase() === normalizedUser).length
      : 0;
    const genres = new Set(
      books
        .map((book) => (book.genre || '').trim().toLowerCase())
        .filter(Boolean)
    ).size;
    const verified = books.filter((book) => book.foundOnline).length;

    return { total, mine, genres, verified };
  }, [books, currentUserUsername]);

  const cards = [
    { label: 'Books', value: stats.total, icon: '📚' },
    ...(isLoggedIn ? [{ label: 'Yours', value: stats.mine, icon: '👤' }] : []),
    { label: 'Genres', value: stats.genres, icon: '🏷️' },
    { label: 'Verified', value: stats.verified, icon: '✓' },
  ];

  return (
    <div className="nf-stats" role="list" aria-label="Library statistics">
      {cards.map((card) => (
        <div className="nf-stat-card" role="listitem" key={card.label}>
          <span className="nf-stat-icon" aria-hidden="true">{card.icon}</span>
          <span className="nf-stat-value">{card.value}</span>
          <span className="nf-stat-label">{card.label}</span>
        </div>
      ))}
    </div>
  );
}

export default memo(StatsBar);
