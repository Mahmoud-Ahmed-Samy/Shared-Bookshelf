import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  fetchAllBooksWithParams,
  fetchActivity,
  createBook,
  updateBook,
  deleteBook,
  requestEditAccess,
  fetchPendingEditRequests,
  approveEditRequest,
  denyEditRequest,
  getStoredToken,
  setUnauthorizedHandler,
  storeToken,
} from './api';
import BookList from './components/BookList';
import BookForm from './components/BookForm';
import BookFilters from './components/BookFilters';
import BookFormModal from './components/BookFormModal';
import LoginPage from './components/LoginPage';
import StatsBar from './components/StatsBar';
import ActivityFeed from './components/ActivityFeed';
import KeyboardHelp from './components/KeyboardHelp';
import { sfx } from './sound';
import { music } from './music';
import { findCoverUrl } from './coverSearch';
import './netflix.css';

function SoundIcon({ on, className }) {
  return (
    <span className={className} aria-hidden="true">
      {on ? '🔊' : '🔇'}
    </span>
  );
}

function decodeEmailFromToken(token) {
  if (!token) return null;

  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const parsed = JSON.parse(window.atob(padded));
    return typeof parsed.sub === 'string' ? parsed.sub : null;
  } catch (_) {
    return null;
  }
}

function decodeUsernameFromToken(token) {
  if (!token) return null;

  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const parsed = JSON.parse(window.atob(padded));
    return typeof parsed.username === 'string' && parsed.username.trim() ? parsed.username : null;
  } catch (_) {
    return null;
  }
}

function decodeRoleFromToken(token) {
  if (!token) return 'USER';

  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const parsed = JSON.parse(window.atob(padded));
    return typeof parsed.role === 'string' ? parsed.role : 'USER';
  } catch (_) {
    return 'USER';
  }
}

function lsGet(key) {
  try { return JSON.parse(window.localStorage.getItem(key) ?? 'null') ?? {}; } catch (_) { return {}; }
}
function lsSet(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
}

function exportBooksAsFile(books, format) {
  let content, mime, ext;
  if (format === 'csv') {
    const header = 'id,title,author,genre,year,owner,verified';
    const rows = books.map((b) =>
      [b.id, b.title, b.author, b.genre, b.year, b.ownerUsername, b.foundOnline]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );
    content = [header, ...rows].join('\n');
    mime = 'text/csv';
    ext = 'csv';
  } else {
    content = JSON.stringify(books, null, 2);
    mime = 'application/json';
    ext = 'json';
  }
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bookshelf-export.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

function App() {
  const [books, setBooks] = useState([]);
  const [activityEvents, setActivityEvents] = useState([]);
  const [editingBook, setEditingBook] = useState(null);
  const [error, setError] = useState(null);
  const [booksError, setBooksError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [centerMessage, setCenterMessage] = useState(null);
  const [centerType, setCenterType] = useState(null);
  const [pendingDeleteBook, setPendingDeleteBook] = useState(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filterYearFrom, setFilterYearFrom] = useState('1450');
  const [filterYearTo, setFilterYearTo] = useState('2026');
  const [filterExactYear, setFilterExactYear] = useState('');
  const [filterExactYearInput, setFilterExactYearInput] = useState('');
  const [filterTrusted, setFilterTrusted] = useState(false);
  const [filterMine, setFilterMine] = useState(false);
  const [filterReadingStatus, setFilterReadingStatus] = useState('');
  const [sortField, setSortField] = useState('title');
  const [sortDirection, setSortDirection] = useState('asc');
  const [visibleCount, setVisibleCount] = useState(24);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [profileOwner, setProfileOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [token, setToken] = useState(getStoredToken);
  const [isGuest, setIsGuest] = useState(false);
  const [readingStatuses, setReadingStatuses] = useState(() => lsGet('bookshelf.readingStatuses'));
  const [starRatings, setStarRatings] = useState(() => lsGet('bookshelf.starRatings'));
  const [bookNotes, setBookNotes] = useState(() => lsGet('bookshelf.bookNotes'));
  const [isBookFormOpen, setIsBookFormOpen] = useState(false);
  const [pendingRequestsByBookId, setPendingRequestsByBookId] = useState({});
  const [expandedRequestBooks, setExpandedRequestBooks] = useState({});
  const loadBooksRequestId = useRef(0);

  const currentUserEmail = useMemo(() => decodeEmailFromToken(token), [token]);
  const currentUserUsername = useMemo(() => decodeUsernameFromToken(token), [token]);
  const currentUserRole = useMemo(() => decodeRoleFromToken(token), [token]);
  const isLoggedIn = Boolean(token && currentUserEmail);
  const isAdmin = currentUserRole === 'ADMIN';
  const currentDisplayName = currentUserUsername || (currentUserEmail ? currentUserEmail.split('@')[0] : 'Unknown user');

  const bookKey = useCallback((bookId) => `${currentUserEmail || 'guest'}:${bookId}`, [currentUserEmail]);

  const setReadingStatus = useCallback((bookId, status) => {
    setReadingStatuses((prev) => {
      const next = { ...prev, [bookKey(bookId)]: status };
      lsSet('bookshelf.readingStatuses', next);
      return next;
    });
  }, [bookKey]);

  const setStarRating = useCallback((bookId, rating) => {
    setStarRatings((prev) => {
      const next = { ...prev, [bookKey(bookId)]: rating };
      lsSet('bookshelf.starRatings', next);
      return next;
    });
  }, [bookKey]);

  const setBookNote = useCallback((bookId, note) => {
    setBookNotes((prev) => {
      const next = { ...prev, [bookKey(bookId)]: note };
      lsSet('bookshelf.bookNotes', next);
      return next;
    });
  }, [bookKey]);

  const showCentered = useCallback((msg, type = 'success', ms = 2200) => {
    setCenterMessage(msg);
    setCenterType(type);
    if (type === 'error') setError(msg);
    else setSuccess(msg);
    const timer = window.setTimeout(() => {
      setCenterMessage(null);
      setCenterType(null);
    }, ms);
    return () => window.clearTimeout(timer);
  }, []);

  const handleSessionExpired = useCallback(() => {
    storeToken(null);
    setToken(null);
    setIsGuest(false);
    setEditingBook(null);
    setIsBookFormOpen(false);
    setExpandedRequestBooks({});
    setPendingRequestsByBookId({});
    showCentered('Your session expired. Please log in again.', 'error', 3200);
  }, [showCentered]);

  useEffect(() => {
    setUnauthorizedHandler(handleSessionExpired);
    return () => setUnauthorizedHandler(null);
  }, [handleSessionExpired]);

  const enrichBooks = useCallback(async (data) => {
    return Promise.all(
      data.map(async (book) => {
        if (book.coverUrl) return book;
        try {
          const coverUrl = await findCoverUrl(book.title, book.author);
          return { ...book, coverUrl: coverUrl ?? null };
        } catch (_) {
          return { ...book, coverUrl: null };
        }
      })
    );
  }, []);

  const loadBooks = useCallback(async () => {
    const requestId = ++loadBooksRequestId.current;
    setLoading(true);
    setBooksError(null);
    try {
      const data = await fetchAllBooksWithParams({
        query: debouncedQuery.trim() || null,
        yearFrom: filterExactYear ? null : filterYearFrom,
        yearTo: filterExactYear ? null : filterYearTo,
        exactYear: filterExactYear || null,
        trusted: filterTrusted,
        sortField,
        sortDirection,
      });

      if (loadBooksRequestId.current !== requestId) {
        return;
      }

      setBooks(data);
      setError(null);
      setBooksError(null);

      void enrichBooks(data)
        .then((booksWithCovers) => {
          if (loadBooksRequestId.current === requestId) {
            setBooks(booksWithCovers);
          }
        })
        .catch(() => {
        });
    } catch (err) {
      if (loadBooksRequestId.current === requestId) {
        setBooksError(err.message || 'Unable to load books.');
      }
    } finally {
      if (loadBooksRequestId.current === requestId) {
        setLoading(false);
      }
    }
  }, [
    debouncedQuery,
    enrichBooks,
    filterExactYear,
    filterTrusted,
    filterYearFrom,
    filterYearTo,
    sortDirection,
    sortField,
  ]);

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      setActivityEvents(await fetchActivity());
    } catch (_) {
      // Activity feed errors are non-critical — silently skip
    } finally {
      setActivityLoading(false);
    }
  }, []);

  const refreshAfterMutation = useCallback(async () => {
    await Promise.all([loadBooks(), loadActivity()]);
  }, [loadActivity, loadBooks]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!isLoggedIn && !isGuest) return;
    loadBooks();
    loadActivity();
  }, [isLoggedIn, isGuest, loadBooks, loadActivity]);

  useEffect(() => {
    if (error) {
      sfx.error();
      const timer = window.setTimeout(() => setError(null), 4000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = window.setTimeout(() => setSuccess(null), 3200);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [success]);

  useEffect(() => {
    // Try immediate autoplay; browsers may block until a user gesture occurs
    music.start();
    setMusicOn(music.playing);

    if (!music.playing) {
      // Blocked — start on first interaction then remove the listeners
      const unlock = () => {
        music.start();
        setMusicOn(music.playing);
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
      return () => {
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      };
    }
    return undefined;
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.repeat) return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (e.key === '?' && !isTyping) {
        e.preventDefault();
        setShowKeyboardHelp((v) => !v);
      }
      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        document.querySelector('.nf-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Deep-link: ?book=<id> scrolls to and highlights that card on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bookId = params.get('book');
    if (!bookId) return;
    const tryScroll = (attempts = 0) => {
      const el = document.getElementById(`book-${bookId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('nf-card--highlighted');
        setTimeout(() => el.classList.remove('nf-card--highlighted'), 3000);
      } else if (attempts < 10) {
        setTimeout(() => tryScroll(attempts + 1), 400);
      }
    };
    tryScroll();
  }, []);

  useEffect(() => {
    function onError(event) {
      showCentered('An unexpected error occurred. Please refresh the page.', 'error', 6000);
      console.error('Global error captured', event);
    }

    function onRejection(event) {
      showCentered('Something went wrong. Please refresh the page.', 'error', 6000);
      console.error('Unhandled rejection', event);
    }

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, [showCentered]);

  useEffect(() => {
    setVisibleCount(24);
  }, [debouncedQuery, filterYearFrom, filterYearTo, filterExactYear, filterTrusted, filterMine, filterReadingStatus, profileOwner, sortField, sortDirection]);

  const hasYearFilter = (filterYearFrom && filterYearFrom !== '1450') || (filterYearTo && filterYearTo !== '2026') || Boolean(filterExactYear);
  const isFiltered = Boolean(debouncedQuery.trim() || hasYearFilter || filterTrusted || filterMine || filterReadingStatus);
  const showResetButton = Boolean(hasYearFilter || filterTrusted || filterMine || filterReadingStatus || profileOwner);

  const filteredBooks = useMemo(() => {
    let result = books;
    if (filterMine && currentUserUsername) {
      const normalized = currentUserUsername.toLowerCase();
      result = result.filter((book) => (book.ownerUsername || '').toLowerCase() === normalized);
    }
    if (profileOwner) {
      const normalized = profileOwner.toLowerCase();
      result = result.filter((book) => (book.ownerUsername || '').toLowerCase() === normalized);
    }
    if (filterReadingStatus) {
      result = result.filter((book) => (readingStatuses[bookKey(book.id)] || '') === filterReadingStatus);
    }
    return result;
  }, [books, filterMine, currentUserUsername, profileOwner, filterReadingStatus, readingStatuses, bookKey]);

  const visibleBooks = useMemo(() => filteredBooks.slice(0, visibleCount), [filteredBooks, visibleCount]);
  const hasMore = filteredBooks.length > visibleCount;

  const resetFilters = useCallback(() => {
    setQuery('');
    setFilterYearFrom('1450');
    setFilterYearTo('2026');
    setFilterExactYear('');
    setFilterExactYearInput('');
    setFilterTrusted(false);
    setFilterMine(false);
    setFilterReadingStatus('');
    setProfileOwner(null);
    setSortField('title');
    setSortDirection('asc');
  }, []);

  const handleToggleMusic = useCallback(() => {
    const nowPlaying = music.toggle();
    setMusicOn(nowPlaying);
  }, []);

  const handleAddBookClick = useCallback(() => {
    if (!isLoggedIn) return;
    setEditingBook(null);
    setIsBookFormOpen(true);
  }, [isLoggedIn]);

  const handleAddBook = useCallback(async (newBook) => {
    try {
      await createBook(newBook);
      await refreshAfterMutation();
      setIsBookFormOpen(false);
      sfx.success();
      showCentered(`"${newBook.title}" was added to your shelf.`, 'success');
    } catch (err) {
      showCentered(err.message || 'Unable to add book.', 'error');
    }
  }, [refreshAfterMutation, showCentered]);

  useEffect(() => {
    if (!filterExactYearInput) {
      if (filterExactYear) {
        setFilterExactYear('');
      }
      return undefined;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const parsed = Number(filterExactYearInput);
      if (!Number.isFinite(parsed) || parsed < 1450 || parsed > 2026) {
        showCentered('Exact year must be a whole number between 1450 and 2026.', 'error', 2600);
        setFilterExactYearInput('');
        setFilterExactYear('');
      } else {
        setFilterExactYear(String(Math.trunc(parsed)));
      }
    }, 2000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [filterExactYearInput, showCentered, filterExactYear]);

  const handleUpdateBook = useCallback(async (id, bookData) => {
    try {
      await updateBook(id, bookData);
      await refreshAfterMutation();
      setEditingBook(null);
      setIsBookFormOpen(false);
      sfx.success();
      showCentered(`Changes to "${bookData.title}" were saved.`, 'success');
    } catch (err) {
      showCentered(err.message || 'Unable to update book.', 'error');
    }
  }, [refreshAfterMutation, showCentered]);

  const handleDeleteClick = useCallback((id) => {
    const book = books.find((item) => item.id === id);
    setPendingDeleteBook(book || { id });
  }, [books]);

  const confirmDeleteBook = useCallback(async () => {
    if (!pendingDeleteBook?.id) return;

    try {
      await deleteBook(pendingDeleteBook.id);
      setEditingBook((current) => (current?.id === pendingDeleteBook?.id ? null : current));
      await refreshAfterMutation();
      showCentered(pendingDeleteBook.title ? `"${pendingDeleteBook.title}" was removed from your shelf.` : 'Book removed.', 'success');
    } catch (err) {
      showCentered(err.message || 'Unable to delete book.', 'error');
    } finally {
      setPendingDeleteBook(null);
    }
  }, [pendingDeleteBook, refreshAfterMutation, showCentered]);

  const cancelDeleteBook = useCallback(() => {
    setPendingDeleteBook(null);
  }, []);

  const handleEditClick = useCallback((book) => {
    if (!isLoggedIn) return;
    setEditingBook(book);
    setIsBookFormOpen(true);
  }, [isLoggedIn]);

  const handleCancelEdit = useCallback(() => {
    setEditingBook(null);
    setIsBookFormOpen(false);
  }, []);

  const handleLogout = useCallback(() => {
    storeToken(null);
    setToken(null);
    setIsGuest(false);
    setEditingBook(null);
    setIsBookFormOpen(false);
    setExpandedRequestBooks({});
    setPendingRequestsByBookId({});
    showCentered('You have been logged out.', 'success');
  }, [showCentered]);

  const handleRequestEdit = useCallback(async (book) => {
    try {
      await requestEditAccess(book.id);
      await refreshAfterMutation();
      showCentered(`Edit request sent for "${book.title}".`, 'success');
    } catch (err) {
      showCentered(err.message || 'Unable to send edit request.', 'error');
    }
  }, [refreshAfterMutation, showCentered]);

  const handleTogglePendingRequests = useCallback(async (bookId) => {
    if (expandedRequestBooks[bookId]) {
      setExpandedRequestBooks((current) => ({ ...current, [bookId]: false }));
      return;
    }

    try {
      const requests = await fetchPendingEditRequests(bookId);
      setPendingRequestsByBookId((current) => ({ ...current, [bookId]: requests }));
      setExpandedRequestBooks((current) => ({ ...current, [bookId]: true }));
    } catch (err) {
      showCentered(err.message || 'Unable to load pending requests.', 'error');
    }
  }, [expandedRequestBooks, showCentered]);

  const handleApproveRequest = useCallback(async (bookId, requestId) => {
    try {
      await approveEditRequest(bookId, requestId);
      const requests = await fetchPendingEditRequests(bookId);
      setPendingRequestsByBookId((current) => ({ ...current, [bookId]: requests }));
      await refreshAfterMutation();
      showCentered('Edit request approved.', 'success');
    } catch (err) {
      showCentered(err.message || 'Unable to approve request.', 'error');
    }
  }, [refreshAfterMutation, showCentered]);

  const handleDenyRequest = useCallback(async (bookId, requestId) => {
    try {
      await denyEditRequest(bookId, requestId);
      const requests = await fetchPendingEditRequests(bookId);
      setPendingRequestsByBookId((current) => ({ ...current, [bookId]: requests }));
      await refreshAfterMutation();
      showCentered('Edit request denied.', 'success');
    } catch (err) {
      showCentered(err.message || 'Unable to deny request.', 'error');
    }
  }, [refreshAfterMutation, showCentered]);

  const handleLoginSuccess = useCallback((newToken) => {
    setToken(newToken);
    setIsGuest(false);
    showCentered('You are now logged in.', 'success');
  }, [showCentered]);

  // This is a no-op — LoginPage handles tab switching internally after registration
  const handleRegisterSuccess = useCallback(() => {}, []);

  const handleGuestAccess = useCallback(() => {
    setIsGuest(true);
  }, []);

  // Show login/register page when not authenticated and not in guest mode
  if (!isLoggedIn && !isGuest) {
    return (
      <>
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onRegisterSuccess={handleRegisterSuccess}
          onGuestAccess={handleGuestAccess}
          musicOn={musicOn}
          onToggleMusic={handleToggleMusic}
        />
        {centerMessage && (
          <div className="nf-centered-overlay" role="alert" aria-live="assertive">
            <div className={`nf-centered-banner ${centerType || 'success'}`}>{centerMessage}</div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="nf-app">
      <div className="nf-ambient" aria-hidden="true">
        <span className="nf-blob nf-blob-1" />
        <span className="nf-blob nf-blob-2" />
        <span className="nf-blob nf-blob-3" />
      </div>

      <header className="nf-header">
        <h1 className="nf-logo">BOOKSHELF</h1>
        <p className="nf-tagline">Unlimited books, wherever you are.</p>
        <button
          className="nf-music-toggle"
          onClick={handleToggleMusic}
          aria-pressed={musicOn}
          aria-label={musicOn ? 'Turn off sound' : 'Turn on sound'}
        >
          <SoundIcon on={musicOn} className="nf-music-icon" />
        </button>
      </header>

      <div className="nf-content">
        <div className="nf-toolbar">
          <div className="nf-toolbar-row">
            <div className="nf-search-wrap">
              <input
                className={`nf-search-input ${query ? 'nf-search-input--active' : ''}`}
                type="text"
                placeholder="Search id, title, author, genre, or owner username"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button className="nf-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
                  ✕
                </button>
              )}
            </div>
            <div className="nf-toolbar-actions">
              {isLoggedIn ? (
                <>
                  <div className="nf-session-pill">Signed in as {currentDisplayName}</div>
                  <button type="button" className="nf-action-btn" onClick={handleAddBookClick}>
                    Add a Book
                  </button>
                  <button
                    type="button"
                    className="nf-btn-secondary"
                    title="Export library"
                    onClick={() => exportBooksAsFile(filteredBooks, 'json')}
                    aria-label="Export library as JSON"
                  >
                    ↓ Export
                  </button>
                  <button type="button" className="nf-btn-secondary nf-header-logout" onClick={handleLogout}>
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <div className="nf-session-pill nf-session-pill--muted">Browsing as guest</div>
                  <button
                    type="button"
                    className="nf-btn-secondary"
                    title="Export library"
                    onClick={() => exportBooksAsFile(filteredBooks, 'json')}
                    aria-label="Export library as JSON"
                  >
                    ↓ Export
                  </button>
                  <button type="button" className="nf-action-btn" onClick={() => setIsGuest(false)}>
                    Login
                  </button>
                </>
              )}
              <button
                type="button"
                className="nf-btn-secondary"
                onClick={() => setShowKeyboardHelp(true)}
                aria-label="Keyboard shortcuts"
                title="Keyboard shortcuts (?)"
              >
                ?
              </button>
            </div>
          </div>
        </div>

        <div className="nf-shell">
          <div className="nf-main-column">
            {!booksError && <StatsBar books={books} currentUserUsername={currentUserUsername} isLoggedIn={isLoggedIn} />}
            {profileOwner && !booksError && (
              <div className="nf-profile-banner">
                <span>Showing books by <strong>{profileOwner}</strong></span>
                <button type="button" className="nf-profile-banner-close" onClick={() => setProfileOwner(null)} aria-label="Clear owner filter">✕</button>
              </div>
            )}
            {!booksError && (
              <BookFilters
                filterYearFrom={filterYearFrom}
                filterYearTo={filterYearTo}
                filterExactYearInput={filterExactYearInput}
                filterExactYear={filterExactYear}
                filterTrusted={filterTrusted}
                filterMine={filterMine}
                filterReadingStatus={filterReadingStatus}
                showMineToggle={isLoggedIn}
                sortField={sortField}
                sortDirection={sortDirection}
                onYearFromChange={setFilterYearFrom}
                onYearToChange={setFilterYearTo}
                onExactYearInputChange={setFilterExactYearInput}
                onToggleTrusted={() => setFilterTrusted((current) => !current)}
                onToggleMine={() => setFilterMine((current) => !current)}
                onReadingStatusChange={setFilterReadingStatus}
                onSortFieldChange={setSortField}
                onToggleSortDirection={() => setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}
              />
            )}
            {showResetButton && !booksError && (
              <div className="nf-filter-actions">
                <button type="button" className="nf-filter-reset" onClick={resetFilters}>Reset filters</button>
              </div>
            )}

            {booksError && !loading && (
              <div className="nf-load-error" role="alert">
                <div className="nf-load-error-text">
                  <strong>Couldn't load the library.</strong>
                  <span>{booksError}</span>
                </div>
                <button type="button" className="nf-load-error-retry" onClick={loadBooks}>
                  Retry
                </button>
              </div>
            )}

            <BookList
              books={visibleBooks}
              isLoading={loading}
              hasError={Boolean(booksError)}
              isSearching={isFiltered}
              isLoggedIn={isLoggedIn}
              isAdmin={isAdmin}
              currentUserUsername={currentUserUsername}
              currentUserEmail={currentUserEmail}
              pendingRequestsByBookId={pendingRequestsByBookId}
              expandedRequestBooks={expandedRequestBooks}
              readingStatuses={readingStatuses}
              starRatings={starRatings}
              bookNotes={bookNotes}
              bookKey={bookKey}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              onRequestEdit={handleRequestEdit}
              onTogglePendingRequests={handleTogglePendingRequests}
              onApproveRequest={handleApproveRequest}
              onDenyRequest={handleDenyRequest}
              onReadingStatusChange={setReadingStatus}
              onStarRatingChange={setStarRating}
              onBookNoteChange={setBookNote}
              onOwnerClick={(owner) => { setProfileOwner(owner); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            />
            {hasMore && (
              <div className="nf-show-more-wrap">
                <button
                  type="button"
                  className="nf-show-more-btn"
                  onClick={() => setVisibleCount((current) => current + 24)}
                >
                  Show more ({filteredBooks.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </div>

          <div className="nf-side-column">
            {isLoggedIn && (
              <section className="nf-sidebar-panel nf-auth-panel">
                <div className="nf-sidebar-kicker">Session</div>
                <h2 className="nf-sidebar-title">Signed in</h2>
                <p className="nf-sidebar-copy">
                  {isAdmin
                    ? 'Admin access is active. You can edit, delete, and manage requests for every book.'
                    : 'You can create books you own, approve requests on your titles, and edit approved shared books.'}
                </p>
                <div className="nf-session-pill nf-session-pill--wide">{currentDisplayName}</div>
              </section>
            )}

            <ActivityFeed events={activityEvents} isLoading={activityLoading} />
          </div>
        </div>
      </div>

      {isLoggedIn && (
        <BookFormModal
          isOpen={isBookFormOpen}
          title={editingBook ? 'Edit book' : 'Add book'}
          onClose={handleCancelEdit}
        >
          <BookForm
            editingBook={editingBook}
            onAddBook={handleAddBook}
            onUpdateBook={handleUpdateBook}
            onCancelEdit={handleCancelEdit}
            onShowMessage={showCentered}
          />
        </BookFormModal>
      )}

      {showKeyboardHelp && <KeyboardHelp onClose={() => setShowKeyboardHelp(false)} />}

      {(centerMessage || pendingDeleteBook) && (
        <div className="nf-centered-overlay" role="dialog" aria-live="assertive" aria-modal="true">
          <div className={`nf-centered-banner ${pendingDeleteBook ? 'nf-centered-banner--confirm' : centerType || 'success'}`}>
            {pendingDeleteBook ? (
              <div className="nf-confirm-delete">
                <div className="nf-confirm-delete-title">Delete this book?</div>
                <div className="nf-confirm-delete-copy">This action will remove {pendingDeleteBook.title || 'this book'} from your shelf.</div>
                <div className="nf-confirm-delete-actions">
                  <button type="button" className="nf-btn-secondary" onClick={cancelDeleteBook}>Cancel</button>
                  <button type="button" className="nf-btn-primary" onClick={confirmDeleteBook}>Delete</button>
                </div>
              </div>
            ) : centerMessage}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
