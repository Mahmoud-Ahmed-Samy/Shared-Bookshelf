import { useState, useEffect, useRef } from 'react'; // Mahmoud, extended by Claude
import { findBookDetails } from '../coverSearch';
import { sfx } from '../sound';

function BookForm({ editingBook, onAddBook, onUpdateBook, onCancelEdit, onShowMessage }) { // Mahmoud - props extended by Claude to support edit mode
  const [title, setTitle] = useState('');   // Mahmoud
  const [author, setAuthor] = useState(''); // Mahmoud
  const [genre, setGenre] = useState('');   // Mahmoud
  const [year, setYear] = useState('');     // Mahmoud

  // Claude - cover art is looked up automatically, no manual URL field needed
  const [coverUrl, setCoverUrl] = useState(null);
  const [coverStatus, setCoverStatus] = useState('idle'); // idle | searching | found | none
  const [matchedBook, setMatchedBook] = useState(null);
  const [coverLocked, setCoverLocked] = useState(false);
  const [suggestedTitle, setSuggestedTitle] = useState(null);
  const dismissedSuggestionRef = useRef(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);
  const titleInputRef = useRef(null);
  const previousTitleRef = useRef('');

  function normalizeTitleText(value) {
    return (value || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function normalizeGenre(value) {
    return (value || '').split(/[,;/|]+/)[0].trim();
  }
  function shouldAutoFillTitle(typedTitle, candidateTitle) {
    if (!typedTitle || !candidateTitle) return false;
    const typed = normalizeTitleText(typedTitle);
    const candidate = normalizeTitleText(candidateTitle);
    if (!typed || !candidate || typed === candidate) return false;
    return candidate.startsWith(typed) || typed.startsWith(candidate) || candidate.includes(typed) || typed.includes(candidate);
  }

  function hasEditMismatch() {
    if (!editingBook) return false;
    const originalYear = editingBook.year != null ? String(editingBook.year) : '';
    const currentYear = year.trim();
    return (
      (title.trim().toLowerCase() || '') !== (editingBook.title ?? '').trim().toLowerCase() ||
      (author.trim().toLowerCase() || '') !== (editingBook.author ?? '').trim().toLowerCase() ||
      (genre.trim().toLowerCase() || '') !== (editingBook.genre ?? '').trim().toLowerCase() ||
      (currentYear.toLowerCase() || '') !== (originalYear.toLowerCase() || '') ||
      (coverUrl || '') !== (editingBook.coverUrl || '')
    );
  }

  function isPerfectMatch(book) {
    if (!book) return false;
    return (
      title.trim().toLowerCase() === (book.title || '').trim().toLowerCase() &&
      author.trim().toLowerCase() === (book.author || '').trim().toLowerCase() &&
      genre.trim().toLowerCase() === (book.genre || '').trim().toLowerCase() &&
      year.trim() === (book.year != null ? String(book.year) : '').trim()
    );
  }

  function acceptTitleSuggestion() {
    if (!matchedBook) return;
    setTitle(matchedBook.title || suggestedTitle || title);
    setAuthor(matchedBook.author || '');
    setGenre(matchedBook.genre || '');
    setYear(matchedBook.year != null ? String(matchedBook.year) : '');
    if (matchedBook.coverUrl) {
      setCoverUrl(matchedBook.coverUrl);
      setCoverStatus('found');
    }
    setSuggestedTitle(null);
    setCoverLocked(true);
  }

  function handleCoverUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : null;
      if (!dataUrl) {
        onShowMessage?.('Could not read that image. Try a different file.', 'error', 2200);
        return;
      }
      setCoverUrl(dataUrl);
      setCoverStatus('found');
      setMatchedBook(null);
      setSuggestedTitle(null);
      setCoverLocked(true);
    };
    reader.onerror = () => {
      onShowMessage?.('Could not read that image. Try a different file.', 'error', 2200);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  // Claude - keeps the form synced with editingBook: loads the book's fields in when
  // Edit is clicked, and clears the form when edit mode ends (cancel or save).
  useEffect(() => {
    if (editingBook) {
      setTitle(editingBook.title ?? '');
      setAuthor(editingBook.author ?? '');
      setGenre(editingBook.genre ?? '');
      setYear(editingBook.year != null ? String(editingBook.year) : '');
      setCoverUrl(editingBook.coverUrl ?? null);
      setCoverStatus(editingBook.coverUrl ? 'found' : 'idle');
      setMatchedBook(null);
      setSuggestedTitle(null);
      setCoverLocked(false);
      dismissedSuggestionRef.current = null;
    } else {
      setTitle('');
      setAuthor('');
      setGenre('');
      setYear('');
      setCoverUrl(null);
      setCoverStatus('idle');
      setMatchedBook(null);
      setSuggestedTitle(null);
      setCoverLocked(false);
      dismissedSuggestionRef.current = null;
    }
  }, [editingBook]);

  useEffect(() => {
    if (editingBook) {
      titleInputRef.current?.focus();
    }
  }, [editingBook]);

  // Claude - auto cover-art lookup: waits for the person to pause typing,
  // then searches Open Library for a matching book and fills the rest.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmedTitle = title.trim();
    const trimmedAuthor = author.trim();
    const trimmedGenre = genre.trim();
    const trimmedYear = year.trim();
    const hadTitle = previousTitleRef.current.trim().length > 0;

    // If the title was filled and now is empty, reset the rest of the form.
    if (trimmedTitle.length === 0 && hadTitle) {
      previousTitleRef.current = trimmedTitle;
      if (editingBook) {
        return;
      }
      setCoverStatus('idle');
      setCoverUrl(null);
      setMatchedBook(null);
      setSuggestedTitle(null);
      setCoverLocked(false);
      setAuthor('');
      setGenre('');
      setYear('');
      return;
    }

    previousTitleRef.current = trimmedTitle;

    const editingBookFullyFilled = Boolean(editingBook && trimmedTitle && trimmedAuthor && trimmedGenre && trimmedYear);

    if (editingBook && !editingBookFullyFilled) {
      // Only perform online lookup during edit mode when the form is fully filled.
      return undefined;
    }

    if (trimmedTitle.length < 3) {
      setCoverStatus('idle');
      if (!coverLocked) {
        setCoverUrl(null);
      }
      setMatchedBook(null);
      return;
    }

    const editingBookUnchanged = editingBook && !coverLocked &&
      trimmedTitle.toLowerCase() === (editingBook.title || '').trim().toLowerCase() &&
      trimmedAuthor.toLowerCase() === (editingBook.author || '').trim().toLowerCase() &&
      trimmedGenre.toLowerCase() === (editingBook.genre || '').trim().toLowerCase() &&
      trimmedYear === (editingBook.year != null ? String(editingBook.year) : '') &&
      Boolean(coverUrl);

    if (editingBookUnchanged) {
      setMatchedBook(null);
      setSuggestedTitle(null);
      setCoverStatus(coverUrl ? 'found' : 'none');
      return;
    }

    if (coverLocked) {
      setCoverStatus(coverUrl ? 'found' : 'none');
      setMatchedBook(null);
      setSuggestedTitle(null);
      return;
    }

    if (matchedBook && trimmedTitle.toLowerCase() === matchedBook.title.toLowerCase()) {
      // If the user has changed the author to something that doesn't match
      // the matched book, discard the match and continue searching.
      if (trimmedAuthor && matchedBook.author && trimmedAuthor.toLowerCase() !== matchedBook.author.toLowerCase()) {
        setMatchedBook(null);
      } else {
        // Only refresh cover automatically while editing and only on a perfect match.
        if (editingBook && !coverLocked && matchedBook.coverUrl && isPerfectMatch(matchedBook)) {
          setCoverUrl(matchedBook.coverUrl);
          setCoverStatus('found');
        }
        return;
      }
    }

    setCoverStatus('searching');
    // wait longer to ensure user finished typing the title before auto-completing
    debounceRef.current = setTimeout(() => {
      const thisRequest = ++requestIdRef.current;
      findBookDetails(trimmedTitle, trimmedAuthor)
        .then((match) => {
          if (thisRequest !== requestIdRef.current) return; // a newer keystroke already fired
          if (match) {
            setMatchedBook(match);
            if (match.coverUrl) {
              setCoverUrl(match.coverUrl);
              setCoverStatus('found');
            } else {
              setCoverUrl(null);
              setCoverStatus('none');
            }

            if (!editingBook) {
              if (!trimmedAuthor && match.author) {
                setAuthor(match.author);
              }
              if (!trimmedGenre && match.genre) {
                setGenre(match.genre);
              }
              if (!trimmedYear && match.year != null) {
                setYear(String(match.year));
              }
            }

            // If the title only differs by casing, articles, or minor punctuation,
            // suggest the canonical title rather than replacing it automatically
            // so the user can accept it.
            function normalizeForCompare(s) {
              return (s || '')
                .toLowerCase()
                .replace(/^(the|a|an)\s+/i, '')
                .replace(/[^a-z0-9]/g, '')
                .trim();
            }
            const canonical = match.title || '';
            if (canonical && normalizeForCompare(trimmedTitle) === normalizeForCompare(canonical) && trimmedTitle !== canonical) {
              // don't show suggestion if user already dismissed it for this canonical title
              if (dismissedSuggestionRef.current !== canonical) {
                setSuggestedTitle(canonical);
              }
            } else {
              setSuggestedTitle(null);
            }
            if (shouldAutoFillTitle(trimmedTitle, match.title || '')) {
              setSuggestedTitle(match.title || trimmedTitle);
            }
            // keep suggestion lifespan in sync with matchedBook
          } else {
            setMatchedBook(null);
            const shouldKeepOriginalCover = Boolean(
              editingBook?.coverUrl &&
              !hasEditMismatch()
            );
            if (shouldKeepOriginalCover) {
              setCoverUrl(editingBook.coverUrl);
              setCoverStatus('found');
            } else {
              setCoverUrl(null);
              setCoverStatus('none');
            }
            setSuggestedTitle(null);
          }
        })
        .catch(() => {
          if (thisRequest !== requestIdRef.current) return;
          setMatchedBook(null);
          const shouldKeepOriginalCover = Boolean(
            editingBook?.coverUrl &&
            !hasEditMismatch()
          );
          if (shouldKeepOriginalCover) {
            setCoverUrl(editingBook.coverUrl);
            setCoverStatus('found');
          } else {
            setCoverUrl(null);
            setCoverStatus('idle');
          }
        });
    }, 3000);

    return () => clearTimeout(debounceRef.current);
  }, [title, author, editingBook, genre, year, matchedBook]);

  function getFormErrors() {
    const errors = [];
    if (!title.trim()) {
      errors.push('Title is required.');
    }
    if (!author.trim()) {
      errors.push('Author is required.');
    }
    if (!genre.trim()) {
      errors.push('Genre is required.');
    }
    const yearText = year.trim();
    if (!yearText) {
      errors.push('Year is required.');
    } else {
      const parsedYear = Number(yearText);
      if (!Number.isInteger(parsedYear) || String(parsedYear) !== yearText) {
        errors.push('Year must be a whole number.');
      } else if (parsedYear < 1450 || parsedYear > 2026) {
        errors.push('Year must be between 1450 and 2026.');
      }
    }
    return errors;
  }

  function isVerifiedOnlineMatch(candidate) {
    return Boolean(candidate && isPerfectMatch(candidate) && candidate.coverUrl);
  }

  async function handleSubmit(e, options = {}) {
    e.preventDefault();
    const formErrors = getFormErrors();
    if (formErrors.length > 0) {
      const requiredFieldMatch = formErrors
        .map(f => {
          const m = f.match(/^(.*) is required\.$/);
          return m ? m[1] : null;
        })
        .filter(Boolean);

      if (requiredFieldMatch.length === formErrors.length && requiredFieldMatch.length > 0) {
        const listText = requiredFieldMatch.length === 1
          ? requiredFieldMatch[0]
          : requiredFieldMatch.length === 2
            ? `${requiredFieldMatch[0]} and ${requiredFieldMatch[1]}`
            : `${requiredFieldMatch.slice(0, -1).join(', ')}, and ${requiredFieldMatch.slice(-1)}`;

        onShowMessage?.(`Please provide the following required fields: ${listText}.`, 'error', 3200);
      } else {
        onShowMessage?.(formErrors.join(' '), 'error', 3200);
      }
      return;
    }

    const trimmedTitle = title.trim();
    const normalizedGenre = normalizeGenre(genre);
    const parsedYear = Number(year);
    const exactMatch = isVerifiedOnlineMatch(matchedBook) ? matchedBook : null;
    const verifiedMatch = exactMatch ||
      (title.trim() && author.trim() && genre.trim() && year.trim()
        ? await findBookDetails(trimmedTitle, author.trim())
        : null);
    const isPerfectOnlineMatch = isVerifiedOnlineMatch(verifiedMatch);
    const isSameAsExistingOnline = Boolean(editingBook?.foundOnline && !hasEditMismatch());
    const newBook = {
      title: trimmedTitle,
      author: author.trim(),
      genre: normalizedGenre,
      year: year.trim() ? (Number.isFinite(parsedYear) ? parsedYear : null) : null,
      coverUrl,
      foundOnline: Boolean(isPerfectOnlineMatch || isSameAsExistingOnline),
      wasEdited: Boolean(editingBook?.id), // true only if updating an existing book
    };
    if (normalizedGenre !== genre.trim()) {
      setGenre(normalizedGenre);
    }

    sfx.click();

    try {
      if (editingBook && editingBook.id != null) {
        await onUpdateBook(editingBook.id, newBook);
      } else {
        await onAddBook(newBook);
        setTitle('');
        setAuthor('');
        setGenre('');
        setYear('');
        setCoverUrl(null);
        setCoverStatus('idle');
        setMatchedBook(null);
        setCoverLocked(false);
      }
    } catch (err) {
      // Surface a user-friendly message without crashing the app.
      // The parent handlers also set error state; ensure we don't rethrow.
      // eslint-disable-next-line no-console
      console.error('Failed to submit book form', err);
      onShowMessage?.(err?.message || 'Could not save the book.', 'error', 2200);
    }
  }

  const formFieldsComplete = Boolean(title.trim() && author.trim() && genre.trim() && year.trim());
  const canUploadCover = editingBook || formFieldsComplete;
  const coverVisible = Boolean(
    coverUrl && coverStatus === 'found' &&
    (
      coverLocked ||
      (matchedBook && formFieldsComplete && isPerfectMatch(matchedBook)) ||
      editingBook
    )
  );
  const coverPreviewText = 'Cover preview';

  return (
    <div className="nf-form-panel">
      <h2 className="nf-form-title">
        {/* Claude - swaps heading + button label depending on add vs edit mode */}
        {editingBook ? <>Edit <span>Book</span></> : <>Add <span>Book</span></>}
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="nf-form-body">
          {/* Claude - live cover preview, fed by the auto-lookup above */}
          <div className="nf-cover-preview-wrapper">
            <div className="nf-cover-preview">
              {coverVisible ? (
                <img src={coverUrl} alt="Cover preview" onError={() => { setCoverStatus('idle'); setCoverUrl(null); }} />
              ) : (
                <div className="nf-cover-preview-empty">
                  <span>{coverPreviewText}</span>
                </div>
              )}
            </div>
            {canUploadCover && (coverStatus === 'none' || coverStatus === 'idle' || coverStatus === 'found') && (
              <label className="nf-cover-upload-btn">
                <input type="file" accept="image/*" onChange={handleCoverUpload} />
                <span>{coverStatus === 'found' ? 'Replace cover' : 'Add cover'}</span>
              </label>
            )}
          </div>

          <div className="nf-form-grid">
            {/* Mahmoud's original 4 fields */}
            <div className="nf-field-stack">
              <input ref={titleInputRef} className="nf-input" placeholder="Title" value={title} onChange={(e) => { setTitle(e.target.value); dismissedSuggestionRef.current = null; }} />
            </div>
            <div className="nf-field-stack">
              <input className="nf-input" placeholder="Author" value={author} onChange={(e) => setAuthor(e.target.value)} />
            </div>
            {suggestedTitle && (
              <div className="nf-suggestion-row">
                <span>Suggested</span>
                <button type="button" className="nf-suggestion-accept" onClick={acceptTitleSuggestion}>
                  {suggestedTitle}
                </button>
                <button type="button" className="nf-suggestion-dismiss" onClick={() => { dismissedSuggestionRef.current = suggestedTitle; setSuggestedTitle(null); }}>
                  ✕
                </button>
              </div>
            )}
            <input className="nf-input" placeholder="Genre" value={genre} onChange={(e) => setGenre(normalizeGenre(e.target.value))} />
            <input className="nf-input" placeholder="Year" value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
        </div>
        <div className="nf-form-actions">
          <button
            type="submit"
            className="nf-btn-primary"
            onMouseEnter={() => sfx.hover()}
          >
            {editingBook ? 'Save Changes' : 'Add Book'}
          </button>
          {/* Claude - Cancel only shows up while editing */}
          {editingBook && (
            <button
              type="button"
              className="nf-btn-secondary"
              onMouseEnter={() => sfx.hover()}
              onClick={() => { sfx.click(); onCancelEdit(); }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default BookForm;
