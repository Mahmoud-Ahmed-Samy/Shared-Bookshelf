import { memo, useEffect, useMemo, useState } from 'react';
import { sfx } from '../sound';
import ReadingStatus from './ReadingStatus';
import StarRating from './StarRating';
import BookNote from './BookNote';

const NETFLIX_GRADIENT = 'linear-gradient(135deg, #e50914 0%, #430d1b 48%, #0b0b10 100%)';

function posterGradient() {
  return NETFLIX_GRADIENT;
}

function formatRelativeDate(isoText) {
  if (!isoText) return '';

  const timestamp = new Date(isoText);
  if (Number.isNaN(timestamp.getTime())) return '';

  const diffMinutes = Math.round((timestamp.getTime() - Date.now()) / 60000);
  const absolute = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp);

  if (Math.abs(diffMinutes) < 1) {
    return `just now (${absolute})`;
  }

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const ranges = [
    { limit: 60, divisor: 1, unit: 'minute' },
    { limit: 1440, divisor: 60, unit: 'hour' },
    { limit: 10080, divisor: 1440, unit: 'day' },
  ];

  for (const range of ranges) {
    if (Math.abs(diffMinutes) < range.limit) {
      return `${formatter.format(Math.round(diffMinutes / range.divisor), range.unit)} (${absolute})`;
    }
  }

  return `${formatter.format(Math.round(diffMinutes / 10080), 'week')} (${absolute})`;
}

const Poster = memo(function Poster({ title, coverUrl }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
    setImageFailed(false);

    if (!coverUrl) return undefined;

    let cancelled = false;
    const img = new Image();
    img.decoding = 'async';
    img.src = coverUrl;
    img.onload = () => {
      if (cancelled) return;
      if (img.naturalWidth && img.naturalHeight) setImageLoaded(true);
      else setImageFailed(true);
    };
    img.onerror = () => {
      if (cancelled) return;
      setImageFailed(true);
    };

    if (img.complete && img.naturalWidth) {
      setImageLoaded(true);
    }

    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [coverUrl]);

  if (!coverUrl || imageFailed) {
    return (
      <div className="nf-poster nf-poster-nocover" style={{ background: posterGradient(title || '') }}>
        <span className="nf-poster-title">{title}</span>
        <span className="nf-poster-nocover-msg">No cover available for this book</span>
      </div>
    );
  }

  return (
    <div className={`nf-poster nf-poster-image ${imageLoaded ? 'is-loaded' : 'is-loading'}`}>
      <img
        src={coverUrl}
        alt={`Cover of ${title}`}
        loading="lazy"
        decoding="async"
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageFailed(true)}
      />
    </div>
  );
});

function BookList({
  books,
  isLoading,
  hasError,
  isSearching,
  isLoggedIn,
  isAdmin,
  currentUserUsername,
  pendingRequestsByBookId,
  expandedRequestBooks,
  readingStatuses = {},
  starRatings = {},
  bookNotes = {},
  bookKey,
  onEdit,
  onDelete,
  onRequestEdit,
  onTogglePendingRequests,
  onApproveRequest,
  onDenyRequest,
  onReadingStatusChange,
  onStarRatingChange,
  onBookNoteChange,
  onOwnerClick,
}) {
  useEffect(() => {
    books.filter((book) => book.coverUrl).forEach((book) => {
      const image = new Image();
      image.src = book.coverUrl;
      image.decoding = 'async';
    });
  }, [books]);

  const placeholderCards = useMemo(() => Array.from({ length: 8 }, (_, index) => index), []);
  const normalizedUsername = (currentUserUsername || '').toLowerCase();

  const copyBookLink = (bookId) => {
    const url = `${window.location.origin}${window.location.pathname}?book=${bookId}`;
    navigator.clipboard?.writeText(url).then(() => sfx.success()).catch(() => {});
  };

  if (isLoading) {
    return (
      <div className="nf-grid">
        {placeholderCards.map((index) => (
          <div className="nf-card nf-card-skeleton" key={index}>
            <div className="nf-poster nf-poster-skeleton" />
            <div className="nf-card-body">
              <div className="nf-skeleton-line nf-skeleton-line-title" />
              <div className="nf-skeleton-line nf-skeleton-line-author" />
              <div className="nf-skeleton-line nf-skeleton-line-meta" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (books.length === 0) {
    if (hasError) return null;
    return (
      <div className="nf-empty">
        {isSearching ? (
          <>
            <strong>No matches</strong>
            Try adjusting your search or filters.
          </>
        ) : (
          <>
            <strong>Your shelf is empty</strong>
            Add your first book below to start your list.
          </>
        )}
      </div>
    );
  }

  return (
    <div className="nf-grid">
      {books.map((book) => {
        const ownerUsername = (book.ownerUsername || '').toLowerCase();
        const isOwner = Boolean(ownerUsername) && ownerUsername === normalizedUsername;
        const requestStatus = book.currentUserEditRequestStatus || null;
        const canModerate = isOwner || isAdmin;
        const canEdit = canModerate || requestStatus === 'APPROVED';
        const isLegacyBook = !ownerUsername;
        const isExpanded = Boolean(expandedRequestBooks[book.id]);
        const pendingRequests = pendingRequestsByBookId[book.id] || [];

        return (
          <article className="nf-card" key={book.id} id={`book-${book.id}`}>
            <Poster title={book.title} coverUrl={book.coverUrl} />
            <div className="nf-card-body">
              <div className="nf-card-title-row">
                <p className="nf-card-title">{book.title}</p>
                {book.foundOnline && <span className="nf-verified-badge" aria-label="Verified online book">✓</span>}
              </div>
              <div className="nf-card-id">
                ID: {book.id}
                <button
                  type="button"
                  className="nf-copy-link-btn"
                  onClick={() => copyBookLink(book.id)}
                  title="Copy link to this book"
                  aria-label="Copy link to this book"
                >
                  🔗
                </button>
              </div>
              <p className="nf-card-author">{book.author}</p>
              <div className="nf-card-meta">
                {book.genre ? <span className="nf-genre-pill">{book.genre}</span> : <span />}
                <span className="nf-year">{book.year}</span>
              </div>
              {book.ownerUsername ? (
                <div className="nf-card-owner">
                  Owner:{' '}
                  <button
                    type="button"
                    className="nf-owner-link"
                    onClick={() => onOwnerClick?.(book.ownerUsername)}
                    title={`View all books by ${book.ownerUsername}`}
                  >
                    {book.ownerUsername}
                  </button>
                </div>
              ) : (
                <div className="nf-card-owner">Legacy imported book</div>
              )}
              {book.lastEditedBy && book.lastEditedAt && (
                <div className="nf-card-edit-meta">
                  Last edited by {book.lastEditedBy} · {formatRelativeDate(book.lastEditedAt)}
                </div>
              )}

              <StarRating
                rating={starRatings[bookKey?.(book.id)] || 0}
                onChange={isLoggedIn ? (r) => onStarRatingChange?.(book.id, r) : undefined}
                readonly={!isLoggedIn}
              />

              {isLoggedIn && (
                <ReadingStatus
                  status={readingStatuses[bookKey?.(book.id)] || ''}
                  onChange={(status) => onReadingStatusChange?.(book.id, status)}
                />
              )}

              {isLoggedIn && (
                <BookNote
                  note={bookNotes[bookKey?.(book.id)] || ''}
                  onChange={(note) => onBookNoteChange?.(book.id, note)}
                />
              )}

              {!isLoggedIn && <div className="nf-card-status">Sign in to add, edit, or delete books.</div>}
              {isLoggedIn && isLegacyBook && <div className="nf-card-status">This older entry has no assigned owner yet.</div>}

              {isLoggedIn && (
                <>
                  {canModerate ? (
                    <>
                      <div className="nf-card-buttons">
                        <button type="button" className="nf-btn-edit" onClick={() => { sfx.click(); onEdit(book); }}>
                          Edit book
                        </button>
                        <button type="button" className="nf-btn-delete" onClick={() => { sfx.remove(); onDelete(book.id); }}>
                          Delete
                        </button>
                      </div>
                      {book.pendingEditRequestCount > 0 && (
                        <button type="button" className="nf-btn-owner-requests" onClick={() => onTogglePendingRequests(book.id)}>
                          {isExpanded ? 'Hide pending requests' : 'Pending requests'} ({book.pendingEditRequestCount})
                        </button>
                      )}
                      {isExpanded && (
                        <div className="nf-request-list">
                          {pendingRequests.length === 0 && <div className="nf-card-status">No pending requests.</div>}
                          {pendingRequests.map((request) => (
                            <div className="nf-request-item" key={request.id}>
                              <div>
                                <div className="nf-request-email">{request.requesterUsername || 'Unknown user'}</div>
                                <div className="nf-request-time">Requested {formatRelativeDate(request.createdAt)}</div>
                              </div>
                              <div className="nf-request-actions">
                                <button type="button" className="nf-btn-edit" onClick={() => onApproveRequest(book.id, request.id)}>
                                  Approve
                                </button>
                                <button type="button" className="nf-btn-delete" onClick={() => onDenyRequest(book.id, request.id)}>
                                  Deny
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="nf-card-buttons nf-card-buttons--stacked">
                      {canEdit && (
                        <button type="button" className="nf-btn-edit" onClick={() => { sfx.click(); onEdit(book); }}>
                          Edit book
                        </button>
                      )}
                      {!canEdit && requestStatus === 'PENDING' && (
                        <button type="button" className="nf-btn-owner-requests" disabled>
                          Request pending
                        </button>
                      )}
                      {!canEdit && requestStatus !== 'PENDING' && (
                        <button type="button" className="nf-btn-owner-requests" onClick={() => onRequestEdit(book)}>
                          {requestStatus === 'DENIED' ? 'Request to Edit Again' : 'Request to Edit'}
                        </button>
                      )}
                      {requestStatus === 'APPROVED' && (
                        <div className="nf-card-status">Approved editors can update this book, but only the owner can delete it.</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default BookList;
