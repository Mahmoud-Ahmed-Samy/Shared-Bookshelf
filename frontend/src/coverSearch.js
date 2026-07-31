// Claude - looks up a book cover automatically from Open Library's free,
// no-API-key-required catalog, based on whatever title/author the user has
// typed so far. Used by BookForm so people don't have to hunt for a cover
// image URL themselves.
//
// This runs a few progressively looser searches (title+author, then title
// alone, then a free-text query) and only accepts a result whose title (and
// author, when one was typed) actually resembles what was typed. That
// validation step is the important part: Open Library's search ranks across
// all the fields you give it rather than strictly requiring every field to
// match, so a query like title="Doo" + author="Stephen King" could
// previously come back with the top-ranked book by Stephen King regardless
// of title - i.e. changing the author field could silently swap the cover
// for an unrelated book. Checking the candidate's own title before trusting
// it closes that gap, and trying looser queries afterward means a book is
// far less likely to end up without a cover just because the first, most
// specific query didn't match anything.

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// simple session-backed cache to reduce repeat lookups and provide
// consistent behavior across refreshes during a session.
const COVER_CACHE_KEY = 'bookshelf_cover_cache_v2';
let COVER_CACHE = {};
try {
  const raw = sessionStorage.getItem(COVER_CACHE_KEY);
  COVER_CACHE = raw ? JSON.parse(raw) : {};
} catch (_) {
  COVER_CACHE = {};
}

function saveCache() {
  try {
    sessionStorage.setItem(COVER_CACHE_KEY, JSON.stringify(COVER_CACHE));
  } catch (_) {}
}

// TTLs (ms) for cache entries: positive results cached longer, negatives briefly
const TTL_POSITIVE = 1000 * 60 * 60 * 24; // 24 hours
const TTL_NEGATIVE = 1000 * 60 * 5; // 5 minutes

function titleLooksLikeMatch(queryTitle, candidateTitle) {
  const q = normalize(queryTitle);
  const c = normalize(candidateTitle);
  if (!q || !c) return false;
  if (c === q || c.startsWith(q) || q.startsWith(c)) return true;

  const qWords = q.split(' ').filter((w) => w.length > 2);
  if (qWords.length === 0) return c.includes(q);
  const matched = qWords.filter((w) => c.includes(w)).length;
  return matched / qWords.length >= 0.6;
}

function authorLooksLikeMatch(queryAuthor, candidateAuthors) {
  const q = normalize(queryAuthor);
  if (!q) return true; // nothing was typed for author, so nothing to check
  if (!Array.isArray(candidateAuthors)) return false;
  return candidateAuthors.some((a) => {
    const c = normalize(a);
    return c && (c.includes(q) || q.includes(c));
  });
}

async function searchOnce(params) {
  const base = (import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:8080/api').replace(/\/+$/, '');
  const response = await fetch(`${base}/open-library/search?${params.toString()}`);
  if (!response.ok) return null;
  return response.json();
}

export async function findBookDetails(title, author) {
  const trimmedTitle = (title || '').trim();
  if (trimmedTitle.length < 3) return null;
  const trimmedAuthor = (author || '').trim();

  const cacheKey = `${trimmedTitle.toLowerCase()}||${trimmedAuthor.toLowerCase()}`;
  if (Object.prototype.hasOwnProperty.call(COVER_CACHE, cacheKey)) {
    try {
      const entry = COVER_CACHE[cacheKey];
      const age = Date.now() - (entry.ts || 0);
      if (entry.data) {
        if (age < TTL_POSITIVE) return entry.data;
        // stale positive - fall through to refresh
      } else {
        // negative cached result
        if (age < TTL_NEGATIVE) return null;
        // stale negative - fall through to refresh
      }
    } catch (_) {
      // ignore malformed entry and continue
    }
  }

  const attempts = [];

  // 1. Strict-ish: dedicated title + author fields, only when an author has
  //    actually been typed (a too-short/partial author is more likely to
  //    hurt than help, so it's skipped here rather than sent as-is).
  if (trimmedAuthor.length >= 2) {
    attempts.push(() =>
      searchOnce(
        new URLSearchParams({
          title: trimmedTitle,
          author: trimmedAuthor,
        })
      )
    );
  }

  // 2. Title only - covers the case where the author field is still
  //    partial/mistyped and was throwing off the combined search above.
  attempts.push(() =>
    searchOnce(
      new URLSearchParams({
        title: trimmedTitle,
      })
    )
  );

  for (const attempt of attempts) {
    let match;
    try {
      match = await attempt();
    } catch (_) {
      continue;
    }

    if (match) {
      COVER_CACHE[cacheKey] = { data: match, ts: Date.now() };
      saveCache();
      return match;
    }
  }

  // no match — cache a negative result briefly to avoid hammering the API
  COVER_CACHE[cacheKey] = { data: null, ts: Date.now() };
  saveCache();
  return null;
}

export async function findCoverUrl(title, author) {
  const match = await findBookDetails(title, author);
  return match?.coverUrl ?? null;
}
